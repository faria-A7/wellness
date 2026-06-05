import { auth } from '@clerk/nextjs/server';
import { InferenceClient } from '@huggingface/inference';
import { prisma } from '@/lib/prisma';
import { getMoodMeta, moodScoreToLabel } from '@/lib/moods';
import { NextResponse } from 'next/server';

type InsightRange = '7' | '30' | '90' | 'custom';

type MoodEntry = {
  mood: string;
  note: string | null;
  createdAt: Date;
};

type DailyMood = {
  date: string;
  averageScore: number;
  mood: string;
  notes: string[];
};

type HabitCorrelation = {
  habitId: number;
  habitName: string;
  emoji: string;
  moodWhenDone: number | null;
  moodWhenSkipped: number | null;
  doneMood: string;
  skippedMood: string;
  completedMoodDays: number;
  skippedMoodDays: number;
};

type RawInsight = {
  id: number;
  rangeLabel: string;
  startDate: string;
  endDate: string;
  result: unknown;
  createdAt: Date;
};

type InsightResult = {
  mainInsight: string;
  patterns: Array<{
    type: string;
    emoji: string;
    title: string;
    body: string;
  }>;
  suggestions: string[];
  summary: string;
  habitCorrelations: HabitCorrelation[];
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_HF_MODEL = 'openai/gpt-oss-120b:groq';

const ensureAiInsightTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AiInsight" (
      "id" SERIAL NOT NULL,
      "userId" TEXT NOT NULL,
      "rangeLabel" TEXT NOT NULL,
      "startDate" TEXT NOT NULL,
      "endDate" TEXT NOT NULL,
      "result" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiInsight_userId_createdAt_idx" ON "AiInsight"("userId", "createdAt");
  `);
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(year, month - 1, day);
};

const isDateKey = (value: unknown) => {
  if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return false;

  return toDateKey(parseDateKey(value)) === value;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
};

const average = (scores: number[]) => {
  if (scores.length === 0) return null;

  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1));
};

const formatRangeLabel = (range: InsightRange, startDate: string, endDate: string) => {
  if (range === '7') return 'Last 7 days';
  if (range === '30') return 'Last 30 days';
  if (range === '90') return 'Last 90 days';

  return `${startDate} to ${endDate}`;
};

const resolveRange = (body: Record<string, unknown>) => {
  const range = (body.range === '7' || body.range === '30' || body.range === '90' || body.range === 'custom')
    ? body.range
    : '30';
  const today = startOfDay(new Date());

  if (range !== 'custom') {
    const days = Number(range);
    const start = addDays(today, -(days - 1));

    return {
      range,
      start,
      end: today,
      startDate: toDateKey(start),
      endDate: toDateKey(today),
      rangeLabel: formatRangeLabel(range, toDateKey(start), toDateKey(today)),
    };
  }

  if (!isDateKey(body.startDate) || !isDateKey(body.endDate)) {
    throw new Error('Choose a valid custom start and end date.');
  }

  const start = parseDateKey(String(body.startDate));
  const end = parseDateKey(String(body.endDate));

  if (start > end) {
    throw new Error('Custom start date must be before the end date.');
  }

  if (end > today) {
    throw new Error('Custom range cannot end in the future.');
  }

  return {
    range,
    start,
    end,
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    rangeLabel: formatRangeLabel(range, toDateKey(start), toDateKey(end)),
  };
};

const buildDailyMoods = (moods: MoodEntry[]) => {
  const buckets = moods.reduce((map, mood) => {
    const key = toDateKey(mood.createdAt);
    const bucket = map.get(key) ?? { scores: [] as number[], notes: [] as string[] };

    bucket.scores.push(getMoodMeta(mood.mood).score);

    if (mood.note?.trim()) {
      bucket.notes.push(mood.note.trim().slice(0, 260));
    }

    map.set(key, bucket);
    return map;
  }, new Map<string, { scores: number[]; notes: string[] }>());

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]): DailyMood => {
      const averageScore = average(bucket.scores) ?? 3;

      return {
        date,
        averageScore,
        mood: moodScoreToLabel(averageScore),
        notes: bucket.notes.slice(0, 4),
      };
    });
};

const buildHabitCorrelations = async (
  userId: string,
  startDate: string,
  endDate: string,
  dailyMoods: DailyMood[],
) => {
  const habits = await prisma.habit.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      completions: {
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { date: true },
      },
    },
  });

  return habits
    .map((habit): HabitCorrelation => {
      const completedDates = new Set(habit.completions.map((completion) => completion.date));
      const createdDateKey = toDateKey(habit.createdAt);
      const completedScores: number[] = [];
      const skippedScores: number[] = [];

      dailyMoods.forEach((day) => {
        if (day.date < createdDateKey) return;

        if (completedDates.has(day.date)) {
          completedScores.push(day.averageScore);
        } else {
          skippedScores.push(day.averageScore);
        }
      });

      const moodWhenDone = average(completedScores);
      const moodWhenSkipped = average(skippedScores);

      return {
        habitId: habit.id,
        habitName: habit.name,
        emoji: habit.emoji,
        moodWhenDone,
        moodWhenSkipped,
        doneMood: moodScoreToLabel(moodWhenDone),
        skippedMood: moodScoreToLabel(moodWhenSkipped),
        completedMoodDays: completedScores.length,
        skippedMoodDays: skippedScores.length,
      };
    })
    .filter((correlation) => correlation.completedMoodDays > 0 || correlation.skippedMoodDays > 0);
};

const extractJsonText = (content: string) => {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

const normalizeAiResult = (value: unknown): Omit<InsightResult, 'habitCorrelations'> => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Hugging Face returned an invalid insight format.');
  }

  const result = value as Partial<Omit<InsightResult, 'habitCorrelations'>>;
  const patterns = Array.isArray(result.patterns) ? result.patterns : [];
  const suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];

  if (
    typeof result.mainInsight !== 'string'
    || typeof result.summary !== 'string'
    || patterns.length === 0
    || suggestions.length === 0
  ) {
    throw new Error('Hugging Face returned incomplete insight JSON.');
  }

  return {
    mainInsight: result.mainInsight,
    summary: result.summary,
    patterns: patterns.slice(0, 4).map((pattern) => ({
      type: typeof pattern.type === 'string' ? pattern.type : 'Mood Pattern',
      emoji: typeof pattern.emoji === 'string' ? pattern.emoji : '✨',
      title: typeof pattern.title === 'string' ? pattern.title : 'Pattern noticed',
      body: typeof pattern.body === 'string' ? pattern.body : '',
    })),
    suggestions: suggestions.filter((suggestion): suggestion is string => typeof suggestion === 'string').slice(0, 4),
  };
};

const requestAiInsight = async (
  rangeLabel: string,
  dailyMoods: DailyMood[],
  habitCorrelations: HabitCorrelation[],
) => {
  const token = process.env.HF_TOKEN || process.env.HF_API_KEY;

  if (!token) {
    throw new Error('HF_TOKEN is not configured. Add it to your environment before generating AI insights.');
  }

  const client = new InferenceClient(token);
  const chatCompletion = await client.chatCompletion({
    model: process.env.HF_MODEL || DEFAULT_HF_MODEL,
    messages: [
      {
        role: 'system',
        content: [
          'You write warm, personal wellness reflections for a mood tracking app.',
          'Sound like a thoughtful friend reviewing a journal, not a clinician.',
          'Use only the supplied data. Be specific, practical, and gentle.',
          'Do not diagnose, mention therapy as a certainty, or make medical claims.',
          'If the data is sparse, say that clearly and give small logging suggestions.',
          'Return valid JSON only, with no markdown.',
          'The JSON shape must be: {"mainInsight":"1-2 warm paragraphs","patterns":[{"type":"Best Day Pattern","emoji":"🌤️","title":"Short title","body":"2-3 sentences"}],"suggestions":["short actionable suggestion"],"summary":"one sentence preview"}.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          rangeLabel,
          moodScale: '1 low to 5 high',
          dailyMoods,
          habitCorrelations,
          requestedCards: [
            'Best Day Pattern',
            'Challenging Day Pattern',
            'Mood Trigger',
            'Positive Trigger',
            'Trend Direction',
            'Logging Consistency',
          ],
        }),
      },
    ],
    max_tokens: 1400,
    temperature: 0.7,
  });

  const content = chatCompletion.choices[0]?.message.content;
  const text = typeof content === 'string' ? content : '';

  if (!text.trim()) {
    throw new Error('Hugging Face returned an empty insight response.');
  }

  return normalizeAiResult(JSON.parse(extractJsonText(text)));
};

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureAiInsightTable();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 20);
    const insights = await prisma.$queryRawUnsafe<RawInsight[]>(
      `
        SELECT
          "id",
          "rangeLabel",
          "startDate",
          "endDate",
          "result",
          "createdAt"
        FROM "AiInsight"
        WHERE "userId" = $1
        ORDER BY "createdAt" DESC
        LIMIT $2
      `,
      userId,
      limit,
    );

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('AI Insight History Error:', error);
    return NextResponse.json({ error: 'Failed to load AI insight history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureAiInsightTable();

    const body = await request.json().catch(() => ({}));
    const range = resolveRange(body);
    const moods = await prisma.mood.findMany({
      where: {
        userId,
        createdAt: {
          gte: range.start,
          lte: new Date(`${range.endDate}T23:59:59.999`),
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        mood: true,
        note: true,
        createdAt: true,
      },
    });

    if (moods.length < 2) {
      return NextResponse.json(
        { error: 'Log at least two moods in this range before generating an AI insight.' },
        { status: 400 },
      );
    }

    const dailyMoods = buildDailyMoods(moods);
    const habitCorrelations = await buildHabitCorrelations(userId, range.startDate, range.endDate, dailyMoods);
    const aiResult = await requestAiInsight(range.rangeLabel, dailyMoods, habitCorrelations);
    const result: InsightResult = {
      ...aiResult,
      habitCorrelations,
    };
    const [savedInsight] = await prisma.$queryRawUnsafe<RawInsight[]>(
      `
        INSERT INTO "AiInsight" ("userId", "rangeLabel", "startDate", "endDate", "result")
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING "id", "rangeLabel", "startDate", "endDate", "result", "createdAt"
      `,
      userId,
      range.rangeLabel,
      range.startDate,
      range.endDate,
      JSON.stringify(result),
    );

    return NextResponse.json({
      insight: {
        id: savedInsight.id,
        rangeLabel: savedInsight.rangeLabel,
        startDate: savedInsight.startDate,
        endDate: savedInsight.endDate,
        result: savedInsight.result,
        createdAt: savedInsight.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate AI insight.';
    const status = message.includes('HF_TOKEN') || message.includes('Hugging Face') ? 500 : 400;

    console.error('AI Insight Generate Error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
