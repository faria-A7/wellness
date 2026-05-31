import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const CSV_HEADERS = ['mood', 'note', 'createdAt'];

const escapeCsvValue = (value: string | Date | null) => {
  const rawValue = value instanceof Date ? value.toISOString() : value ?? '';
  const safeValue = /^[=+\-@\t\r]/.test(rawValue) ? `'${rawValue}` : rawValue;

  return `"${safeValue.replace(/"/g, '""')}"`;
};

const dateStamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const moods = await prisma.mood.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        mood: true,
        note: true,
        createdAt: true,
      },
    });

    const rows = moods.map((entry) => [
      escapeCsvValue(entry.mood),
      escapeCsvValue(entry.note),
      escapeCsvValue(entry.createdAt),
    ].join(','));
    const csv = `\uFEFF${[CSV_HEADERS.join(','), ...rows].join('\n')}\n`;

    return new NextResponse(csv, {
      headers: {
        'Content-Disposition': `attachment; filename="wellness-moods-${dateStamp()}.csv"`,
        'Content-Type': 'text/csv; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Mood Export Error:', error);
    return NextResponse.json({ error: 'Failed to export mood data' }, { status: 500 });
  }
}
