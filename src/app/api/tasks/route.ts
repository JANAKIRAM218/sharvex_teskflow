import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const assignedTo = searchParams.get('assignedTo') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';

    const where: Prisma.TaskWhereInput = {};

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // Employees can only see their own tasks
    if (user.role === 'employee') {
      where.assignedTo = user.id;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    const total = await db.task.count({ where });
    const tasks = await db.task.findMany({
      where,
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
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, assignedTo, priority, deadline } = body;

    if (!title || !assignedTo) {
      return NextResponse.json({ error: 'Title and assigned employee are required' }, { status: 400 });
    }

    // Verify employee exists
    const employee = await db.employee.findUnique({ where: { id: assignedTo } });
    if (!employee) {
      return NextResponse.json({ error: 'Assigned employee not found' }, { status: 404 });
    }

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        assignedTo,
        assignedBy: user.id,
        priority: priority || 'medium',
        deadline: deadline ? new Date(deadline) : null,
        status: 'pending',
        progress: 0,
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            department: true,
            designation: true,
          },
        },
      },
    });

    // Create notification for assigned employee
    await db.notification.create({
      data: {
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${title}"`,
        type: 'task',
        userId: assignedTo,
        userRole: 'employee',
        relatedId: task.id,
        isRead: false,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
