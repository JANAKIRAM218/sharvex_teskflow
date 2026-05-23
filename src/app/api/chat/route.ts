import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

export async function GET(request: Request) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') || 'general';
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before') || '';

    const where: { roomId: string; createdAt?: { lt: Date } } = { roomId };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const messages = await db.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Return in chronological order
    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, roomId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Get sender name based on role
    let senderName = '';
    if (user.role === 'admin') {
      const admin = await db.admin.findUnique({ where: { id: user.id } });
      senderName = admin?.name || 'Admin';
    } else {
      const employee = await db.employee.findUnique({ where: { id: user.id } });
      senderName = employee?.fullName || 'Employee';
    }

    const message = await db.chatMessage.create({
      data: {
        senderId: user.id,
        senderName,
        senderRole: user.role,
        content: content.trim(),
        roomId: roomId || 'general',
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Send chat message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
