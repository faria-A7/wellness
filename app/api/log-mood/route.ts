import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma'; // Import our new singleton
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 5, 1), 20);
    const skip = (page - 1) * limit;

    const [moods, total] = await prisma.$transaction([
      prisma.mood.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.mood.count({
        where: { userId },
      }),
    ]);

    return NextResponse.json({
      moods,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to load mood history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('API route /log-mood was hit');

  const authResult = await auth();
  console.log('Clerk auth() result:', authResult);

  const { userId } = authResult;

  console.log('Extracted userId:', userId);

  // If userId is null, Clerk couldn't verify the session
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { mood, note } = body;

    const newMood = await prisma.mood.create({
      data: {
        userId, // Always use the verified ID from Clerk, not the client
        mood,
        note: note || null,
      },
    });

    return NextResponse.json({ success: true, mood: newMood });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to log mood' }, { status: 500 });
  }
}
