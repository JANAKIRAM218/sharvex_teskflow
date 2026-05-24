import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Admin, Employee, ChatMessage } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') || 'general';
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before') || '';

    const where: any = { roomId };
    if (before) {
      where.createdAt = { $lt: new Date(before) };
    }

    const messagesRaw = await ChatMessage.find(where)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const messages = messagesRaw.map((msg) => ({
      id: msg._id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderRole: msg.senderRole,
      content: msg.content,
      roomId: msg.roomId,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    }));

    // Return in chronological order
    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
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
      const admin = await Admin.findById(user.id);
      senderName = admin?.name || 'Admin';
    } else {
      const employee = await Employee.findById(user.id);
      senderName = employee?.fullName || 'Employee';
    }

    const newMessage = await ChatMessage.create({
      senderId: user.id,
      senderName,
      senderRole: user.role,
      content: content.trim(),
      roomId: roomId || 'general',
    });

    const message = {
      id: newMessage._id,
      senderId: newMessage.senderId,
      senderName: newMessage.senderName,
      senderRole: newMessage.senderRole,
      content: newMessage.content,
      roomId: newMessage.roomId,
      createdAt: newMessage.createdAt,
      updatedAt: newMessage.updatedAt,
    };

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Send chat message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
