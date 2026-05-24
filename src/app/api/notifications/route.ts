import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Notification } from '@/lib/models';
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
    const userId = searchParams.get('userId') || user.id;
    const userRole = searchParams.get('userRole') || user.role;

    // Employees can only see their own notifications
    if (user.role === 'employee' && userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: any = {
      userId,
      userRole,
    };

    const notificationsRaw = await Notification.find(where)
      .sort({ createdAt: -1 })
      .lean();

    const notifications = notificationsRaw.map((n) => ({
      id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      userId: n.userId,
      userRole: n.userRole,
      isRead: n.isRead,
      relatedId: n.relatedId,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll, userId } = body;

    if (markAll && userId) {
      // Employees can only mark their own notifications
      const targetUserId = user.role === 'employee' ? user.id : userId;

      await Notification.updateMany(
        { userId: targetUserId, isRead: false },
        { isRead: true }
      );

      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (notificationId) {
      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }

      // Employees can only mark their own notifications
      if (user.role === 'employee' && notification.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await Notification.findByIdAndUpdate(notificationId, { isRead: true });

      return NextResponse.json({ message: 'Notification marked as read' });
    }

    return NextResponse.json({ error: 'Provide notificationId or markAll with userId' }, { status: 400 });
  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
