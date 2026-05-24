import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const task = await db.task.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            department: true,
            designation: true,
            profileImage: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Employees can only view their own tasks
    if (user.role === 'employee' && task.assignedTo !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, priority, deadline, progress, status } = body;

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Employees can only update progress and status of their own tasks
    if (user.role === 'employee') {
      if (existing.assignedTo !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const task = await db.task.update({
        where: { id },
        data: {
          ...(progress !== undefined && { progress }),
          ...(status !== undefined && { status }),
        },
        include: {
          employee: {
            select: { id: true, fullName: true },
          },
        },
      });

      // Notify admin if task is completed
      if (status === 'completed' && existing.status !== 'completed') {
        await db.notification.create({
          data: {
            title: 'Task Completed',
            message: `${task.employee.fullName} has completed the task: "${existing.title}"`,
            type: 'task',
            userId: existing.assignedBy,
            userRole: 'admin',
            relatedId: id,
            isRead: false,
          },
        });
      }

      return NextResponse.json({ task });
    }

    // Admin can update all fields
    const task = await db.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(progress !== undefined && { progress }),
        ...(status !== undefined && { status }),
      },
      include: {
        employee: {
          select: { id: true, fullName: true, department: true, designation: true },
        },
      },
    });

    // Notify employee if task details changed
    if (title !== undefined || priority !== undefined || deadline !== undefined || status !== undefined) {
      const changes: string[] = [];
      if (title !== undefined) changes.push('title');
      if (priority !== undefined) changes.push('priority');
      if (deadline !== undefined) changes.push('deadline');
      if (status !== undefined) changes.push('status');

      await db.notification.create({
        data: {
          title: 'Task Updated',
          message: `Your task "${existing.title}" has been updated. Changes: ${changes.join(', ')}`,
          type: 'task',
          userId: existing.assignedTo,
          userRole: 'employee',
          relatedId: id,
          isRead: false,
        },
      });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await db.task.delete({ where: { id } });

    // Notify employee
    await db.notification.create({
      data: {
        title: 'Task Deleted',
        message: `The task "${existing.title}" has been deleted.`,
        type: 'task',
        userId: existing.assignedTo,
        userRole: 'employee',
        isRead: false,
      },
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
