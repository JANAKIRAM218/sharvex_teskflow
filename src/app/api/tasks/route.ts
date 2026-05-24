import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Employee, Task, Notification } from '@/lib/models';
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const assignedTo = searchParams.get('assignedTo') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';

    const where: any = {};

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

    const total = await Task.countDocuments(where);
    const tasksRaw = await Task.find(where)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('assignedTo', 'fullName department designation profileImage')
      .lean();

    const tasks = tasksRaw.map((task) => ({
      id: task._id,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo && typeof task.assignedTo === 'object' ? (task.assignedTo as any)._id : task.assignedTo,
      assignedBy: task.assignedBy,
      priority: task.priority,
      deadline: task.deadline,
      progress: task.progress,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      employee: task.assignedTo && typeof task.assignedTo === 'object' ? {
        id: (task.assignedTo as any)._id,
        fullName: (task.assignedTo as any).fullName,
        department: (task.assignedTo as any).department,
        designation: (task.assignedTo as any).designation,
        profileImage: (task.assignedTo as any).profileImage,
      } : null,
    }));

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
    await connectToDatabase();
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
    const employee = await Employee.findById(assignedTo);
    if (!employee) {
      return NextResponse.json({ error: 'Assigned employee not found' }, { status: 404 });
    }

    const newTask = await Task.create({
      title,
      description: description || null,
      assignedTo,
      assignedBy: user.id,
      priority: priority || 'medium',
      deadline: deadline ? new Date(deadline) : null,
      status: 'pending',
      progress: 0,
    });

    // Create notification for assigned employee
    await Notification.create({
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${title}"`,
      type: 'task',
      userId: assignedTo,
      userRole: 'employee',
      relatedId: newTask._id,
      isRead: false,
    });

    const task = {
      id: newTask._id,
      title: newTask.title,
      description: newTask.description,
      assignedTo: newTask.assignedTo,
      assignedBy: newTask.assignedBy,
      priority: newTask.priority,
      deadline: newTask.deadline,
      progress: newTask.progress,
      status: newTask.status,
      createdAt: newTask.createdAt,
      updatedAt: newTask.updatedAt,
      employee: {
        id: employee._id,
        fullName: employee.fullName,
        department: employee.department,
        designation: employee.designation,
      },
    };

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
