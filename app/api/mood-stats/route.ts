import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getMoodMeta, moodScoreToLabel } from '@/lib/moods';
import { NextResponse } from 'next/server';

type MoodRecord = {
  mood: string;
  createdAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const averageScore = (entries: MoodRecord[]) => {
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, entry) => sum + getMoodMeta(entry.mood).score, 0);
  return Number((total / entries.length).toFixed(1));
};

const buildTrend = (entries: MoodRecord[], days: number) => {
  const today = startOfDay(new Date());
  const firstDay = new Date(today.getTime() - (days - 1) * DAY_MS);
  const buckets = new Map<string, { total: number; count: number }>();

  entries.forEach((entry) => {
    const entryDay = startOfDay(entry.createdAt);

    if (entryDay < firstDay || entryDay > today) {
      return;
    }

    const key = dateKey(entryDay);
    const bucket = buckets.get(key) ?? { total: 0, count: 0 };
    bucket.total += getMoodMeta(entry.mood).score;
    bucket.count += 1;
    buckets.set(key, bucket);
  });

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(firstDay.getTime() + index * DAY_MS);
    const bucket = buckets.get(dateKey(date));
    const score = bucket ? Number((bucket.total / bucket.count).toFixed(1)) : null;

    return {
      date: dateKey(date),
      label: days <= 7
        ? date.toLocaleDateString('en-US', { weekday: 'short' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score,
      mood: moodScoreToLabel(score),
      count: bucket?.count ?? 0,
    };
  });
};

const findMostCommonMood = (entries: MoodRecord[]) => {
  if (entries.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    counts.set(entry.mood, (counts.get(entry.mood) ?? 0) + 1);
  });

  const [mood, count] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  const meta = getMoodMeta(mood);

  return {
    mood,
    emoji: meta.emoji,
    count,
    percentage: Math.round((count / entries.length) * 100),
  };
};

const findBestDayThisWeek = (entries: MoodRecord[]) => {
  const today = startOfDay(new Date());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS);
  const buckets = new Map<string, { total: number; count: number; dayIndex: number }>();

  entries.forEach((entry) => {
    const entryDay = startOfDay(entry.createdAt);

    if (entryDay < weekStart || entryDay > weekEnd) {
      return;
    }

    const key = entryDay.toLocaleDateString('en-US', { weekday: 'long' });
    const bucket = buckets.get(key) ?? {
      total: 0,
      count: 0,
      dayIndex: entryDay.getDay(),
    };
    bucket.total += getMoodMeta(entry.mood).score;
    bucket.count += 1;
    buckets.set(key, bucket);
  });

  if (buckets.size === 0) {
    return null;
  }

  const [day, bucket] = Array.from(buckets.entries()).sort((a, b) => {
    const scoreDifference = b[1].total / b[1].count - a[1].total / a[1].count;
    if (scoreDifference !== 0) return scoreDifference;
    return b[1].count - a[1].count;
  })[0];
  const score = Number((bucket.total / bucket.count).toFixed(1));

  return {
    day,
    score,
    mood: moodScoreToLabel(score),
    count: bucket.count,
  };
};

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const moods = await prisma.mood.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        mood: true,
        createdAt: true,
      },
    });

    const monthMoods = moods.filter((entry) => entry.createdAt >= monthStart);
    const overallAverage = averageScore(moods);
    const monthAverage = averageScore(monthMoods);
    const mostCommonMood = findMostCommonMood(moods);
    const distribution = Array.from(
      moods.reduce((counts, entry) => {
        counts.set(entry.mood, (counts.get(entry.mood) ?? 0) + 1);
        return counts;
      }, new Map<string, number>()),
    )
      .map(([mood, count]) => {
        const meta = getMoodMeta(mood);

        return {
          mood,
          emoji: meta.emoji,
          count,
          percentage: moods.length ? Math.round((count / moods.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalLogged: moods.length,
      averageScore: overallAverage,
      averageMood: moodScoreToLabel(overallAverage),
      averageScoreThisMonth: monthAverage,
      averageMoodThisMonth: moodScoreToLabel(monthAverage),
      mostCommonMood,
      bestDayThisWeek: findBestDayThisWeek(moods),
      weeklyTrend: buildTrend(moods, 7),
      monthlyTrend: buildTrend(moods, 30),
      distribution,
    });
  } catch (error) {
    console.error('Mood Stats Error:', error);
    return NextResponse.json({ error: 'Failed to load mood statistics' }, { status: 500 });
  }
}
