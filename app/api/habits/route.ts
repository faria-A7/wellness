import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getMoodMeta, moodScoreToLabel } from '@/lib/moods';
import { NextResponse } from 'next/server';

const HABIT_COLORS = ['emerald', 'sky', 'violet', 'rose', 'amber', 'teal', 'indigo', 'pink'] as const;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`);

const isDateKey = (value: string | null) => {
  if (!value || !DATE_KEY_PATTERN.test(value)) return false;

  return toDateKey(parseDateKey(value)) === value;
};

const addDays = (dateKey: string, days: number) => {
  return toDateKey(new Date(parseDateKey(dateKey).getTime() + days * DAY_MS));
};

const daysBetween = (startDateKey: string, endDateKey: string) => {
  return Math.round((parseDateKey(endDateKey).getTime() - parseDateKey(startDateKey).getTime()) / DAY_MS);
};

const dateRange = (startDateKey: string, endDateKey: string) => {
  const length = daysBetween(startDateKey, endDateKey) + 1;

  if (length <= 0) return [];

  return Array.from({ length }, (_, index) => addDays(startDateKey, index));
};

const latestDateKey = (...dateKeys: string[]) => [...dateKeys].sort().at(-1) ?? toDateKey(new Date());

const average = (scores: number[]) => {
  if (scores.length === 0) return null;

  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1));
};

const normalizeColor = (color: unknown) => {
  return typeof color === 'string' && HABIT_COLORS.includes(color as (typeof HABIT_COLORS)[number])
    ? color
    : 'emerald';
};

const normalizeEmoji = (emoji: unknown) => {
  if (typeof emoji !== 'string') return '🌱';

  return emoji.trim().slice(0, 12) || '🌱';
};

const normalizeName = (name: unknown) => {
  if (typeof name !== 'string') return '';

  return name.trim().slice(0, 80);
};

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const today = searchParams.get('date');
    const dateKey = today && isDateKey(today) ? today : toDateKey(new Date());
    const monthStartKey = `${dateKey.slice(0, 7)}-01`;
    const lastSevenStartKey = addDays(dateKey, -6);
    const insightStartKey = addDays(dateKey, -29);
    const earliestCompletionKey = [monthStartKey, lastSevenStartKey, insightStartKey].sort()[0];

    const habits = await prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        completions: {
          where: {
            date: {
              gte: earliestCompletionKey,
              lte: dateKey,
            },
          },
          select: {
            date: true,
          },
        },
      },
    });
    const moods = await prisma.mood.findMany({
      where: {
        userId,
        createdAt: {
          gte: parseDateKey(insightStartKey),
          lte: new Date(`${dateKey}T23:59:59.999Z`),
        },
      },
      select: {
        mood: true,
        createdAt: true,
      },
    });

    const moodBuckets = moods.reduce((buckets, mood) => {
      const moodDateKey = toDateKey(mood.createdAt);
      const bucket = buckets.get(moodDateKey) ?? { total: 0, count: 0 };

      bucket.total += getMoodMeta(mood.mood).score;
      bucket.count += 1;
      buckets.set(moodDateKey, bucket);

      return buckets;
    }, new Map<string, { total: number; count: number }>());
    const moodScoresByDate = new Map(
      Array.from(moodBuckets.entries()).map(([key, bucket]) => [
        key,
        Number((bucket.total / bucket.count).toFixed(1)),
      ]),
    );
    const lastSevenKeys = dateRange(lastSevenStartKey, dateKey);

    const formattedHabits = habits.map((habit) => {
      const completionDates = new Set(habit.completions.map((completion) => completion.date));
      const createdDateKey = toDateKey(habit.createdAt);
      const monthTrackingStartKey = latestDateKey(monthStartKey, createdDateKey);
      const monthlyPossibleDays = monthTrackingStartKey > dateKey
        ? 0
        : daysBetween(monthTrackingStartKey, dateKey) + 1;
      const monthlyCompletedDays = habit.completions.filter((completion) => {
        return completion.date >= monthTrackingStartKey && completion.date <= dateKey;
      }).length;
      const insightTrackingStartKey = latestDateKey(insightStartKey, createdDateKey);
      const insightDates = insightTrackingStartKey > dateKey ? [] : dateRange(insightTrackingStartKey, dateKey);
      const completedScores: number[] = [];
      const missedScores: number[] = [];

      insightDates.forEach((currentDateKey) => {
        const score = moodScoresByDate.get(currentDateKey);

        if (score === undefined) return;

        if (completionDates.has(currentDateKey)) {
          completedScores.push(score);
        } else {
          missedScores.push(score);
        }
      });

      const completedAverage = average(completedScores);
      const missedAverage = average(missedScores);

      return {
        id: habit.id,
        name: habit.name,
        emoji: habit.emoji,
        frequency: habit.frequency,
        color: habit.color,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
        completedToday: completionDates.has(dateKey),
        completionRateThisMonth: monthlyPossibleDays
          ? Math.round((monthlyCompletedDays / monthlyPossibleDays) * 100)
          : 0,
        lastSevenDays: lastSevenKeys.map((key) => ({
          date: key,
          completed: completionDates.has(key),
        })),
        moodInsight: completedAverage !== null && missedAverage !== null
          ? {
              completedAverage,
              completedMood: moodScoreToLabel(completedAverage),
              missedAverage,
              missedMood: moodScoreToLabel(missedAverage),
              delta: Number((completedAverage - missedAverage).toFixed(1)),
            }
          : null,
      };
    });
    const completedToday = formattedHabits.filter((habit) => habit.completedToday).length;

    return NextResponse.json({
      habits: formattedHabits,
      today: dateKey,
      summary: {
        total: formattedHabits.length,
        completed: completedToday,
      },
    });
  } catch (error) {
    console.error('Habit Load Error:', error);
    return NextResponse.json({ error: 'Failed to load habits' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = normalizeName(body.name);

    if (!name) {
      return NextResponse.json({ error: 'Habit name is required' }, { status: 400 });
    }

    const habit = await prisma.habit.create({
      data: {
        userId,
        name,
        emoji: normalizeEmoji(body.emoji),
        frequency: 'Daily',
        color: normalizeColor(body.color),
      },
    });

    return NextResponse.json({ success: true, habit });
  } catch (error) {
    console.error('Habit Create Error:', error);
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = Number(body.id);
    const name = normalizeName(body.name);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid habit' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Habit name is required' }, { status: 400 });
    }

    const existingHabit = await prisma.habit.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existingHabit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    const habit = await prisma.habit.update({
      where: { id },
      data: {
        name,
        emoji: normalizeEmoji(body.emoji),
        color: normalizeColor(body.color),
      },
    });

    return NextResponse.json({ success: true, habit });
  } catch (error) {
    console.error('Habit Update Error:', error);
    return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid habit' }, { status: 400 });
    }

    const result = await prisma.habit.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Habit Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
  }
}
