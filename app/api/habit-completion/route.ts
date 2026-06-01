import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const isDateKey = (value: unknown) => {
  if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return false;

  return toDateKey(new Date(`${value}T00:00:00.000Z`)) === value;
};

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const habitId = Number(body.habitId);
    const date = body.date;
    const completed = Boolean(body.completed);

    if (!Number.isInteger(habitId) || habitId <= 0) {
      return NextResponse.json({ error: 'Invalid habit' }, { status: 400 });
    }

    if (!isDateKey(date)) {
      return NextResponse.json({ error: 'Invalid completion date' }, { status: 400 });
    }

    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
      select: { id: true },
    });

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    if (completed) {
      await prisma.habitCompletion.upsert({
        where: {
          habitId_date: {
            habitId,
            date,
          },
        },
        create: {
          habitId,
          userId,
          date,
        },
        update: {
          completedAt: new Date(),
        },
      });
    } else {
      await prisma.habitCompletion.deleteMany({
        where: {
          habitId,
          userId,
          date,
        },
      });
    }

    return NextResponse.json({ success: true, completed });
  } catch (error) {
    console.error('Habit Completion Error:', error);
    return NextResponse.json({ error: 'Failed to update habit completion' }, { status: 500 });
  }
}
