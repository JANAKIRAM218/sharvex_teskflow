import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Employee, Task, Comment, Attachment, Notification } from '@/lib/models';
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
    await connectToDatabase();
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const task = await Task.findById(id)
      .populate('assignedTo', 'fullName department designation profileImage')
      .lean();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Employees can only view their own tasks
    if (user.role === 'employee' && task.assignedTo !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comments = await Comment.find({ taskId: id })
      .sort({ createdAt: -1 })
      .lean();

    const attachments = await Attachment.find({ taskId: id })
      .sort({ createdAt: -1 })
      .lean();

    const taskData = {
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
      comments: comments.map((c) => ({
        id: c._id,
        content: c.content,
        authorId: c.authorId,
        authorName: c.authorName,
        authorRole: c.authorRole,
        taskId: c.taskId,
        createdAt: c.createdAt,
      })),
      attachments: attachments.map((a) => ({
        id: a._id,
        filename: a.filename,
        url: a.url,
        fileType: a.fileType,
        taskId: a.taskId,
        uploadedBy: a.uploadedBy,
        createdAt: a.createdAt,
      })),
    };

    return NextResponse.json({ task: taskData });
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
    await connectToDatabase();
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, priority, deadline, progress, status } = body;

    const existing = await Task.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Employees can only update progress and status of their own tasks
    if (user.role === 'employee') {
      if (existing.assignedTo !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const finalStatus = status !== undefined ? status : existing.status;
      const finalProgress = finalStatus === 'completed' ? 100 : (progress !== undefined ? progress : existing.progress);

      const updatedTask = await Task.findByIdAndUpdate(
        id,
        {
          progress: finalProgress,
          ...(status !== undefined && { status }),
        },
        { new: true }
      ).populate('assignedTo', 'fullName department designation profileImage').lean();

      // Recalculate performance score
      if (updatedTask && updatedTask.assignedTo) {
        const empId = typeof updatedTask.assignedTo === 'object' ? (updatedTask.assignedTo as any)._id : updatedTask.assignedTo;
        const tasks = await Task.find({ assignedTo: empId }).select('progress').lean();
        const score = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length) : 0;
        await Employee.findByIdAndUpdate(empId, { performanceScore: score });
      }

      const employeeObj = await Employee.findById(existing.assignedTo).select('fullName').lean();

      // Notify admin if task is completed
      if (status === 'completed' && existing.status !== 'completed') {
        await Notification.create({
          title: 'Task Completed',
          message: `${employeeObj?.fullName || 'Employee'} has completed the task: "${existing.title}"`,
          type: 'task',
          userId: existing.assignedBy,
          userRole: 'admin',
          relatedId: id,
          isRead: false,
        });
      }

      const task = {
        id: updatedTask._id,
        title: updatedTask.title,
        description: updatedTask.description,
        assignedTo: updatedTask.assignedTo && typeof updatedTask.assignedTo === 'object' ? (updatedTask.assignedTo as any)._id : updatedTask.assignedTo,
        assignedBy: updatedTask.assignedBy,
        priority: updatedTask.priority,
        deadline: updatedTask.deadline,
        progress: updatedTask.progress,
        status: updatedTask.status,
        createdAt: updatedTask.createdAt,
        updatedAt: updatedTask.updatedAt,
        employee: updatedTask.assignedTo && typeof updatedTask.assignedTo === 'object' ? {
          id: (updatedTask.assignedTo as any)._id,
          fullName: (updatedTask.assignedTo as any).fullName,
        } : null,
      };

      return NextResponse.json({ task });
    }

    // Admin can update all fields
    const finalStatus = status !== undefined ? status : existing.status;
    const finalProgress = finalStatus === 'completed' ? 100 : (progress !== undefined ? progress : existing.progress);

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        progress: finalProgress,
        ...(status !== undefined && { status }),
      },
      { new: true }
    ).populate('assignedTo', 'fullName department designation profileImage').lean();

    // Recalculate performance score
    if (updatedTask && updatedTask.assignedTo) {
      const empId = typeof updatedTask.assignedTo === 'object' ? (updatedTask.assignedTo as any)._id : updatedTask.assignedTo;
      const tasks = await Task.find({ assignedTo: empId }).select('progress').lean();
      const score = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length) : 0;
      await Employee.findByIdAndUpdate(empId, { performanceScore: score });
    }

    // Notify employee if task details changed
    if (title !== undefined || priority !== undefined || deadline !== undefined || status !== undefined) {
      const changes: string[] = [];
      if (title !== undefined) changes.push('title');
      if (priority !== undefined) changes.push('priority');
      if (deadline !== undefined) changes.push('deadline');
      if (status !== undefined) changes.push('status');

      await Notification.create({
        title: 'Task Updated',
        message: `Your task "${existing.title}" has been updated. Changes: ${changes.join(', ')}`,
        type: 'task',
        userId: existing.assignedTo,
        userRole: 'employee',
        relatedId: id,
        isRead: false,
      });
    }

    const task = {
      id: updatedTask._id,
      title: updatedTask.title,
      description: updatedTask.description,
      assignedTo: updatedTask.assignedTo && typeof updatedTask.assignedTo === 'object' ? (updatedTask.assignedTo as any)._id : updatedTask.assignedTo,
      assignedBy: updatedTask.assignedBy,
      priority: updatedTask.priority,
      deadline: updatedTask.deadline,
      progress: updatedTask.progress,
      status: updatedTask.status,
      createdAt: updatedTask.createdAt,
      updatedAt: updatedTask.updatedAt,
      employee: updatedTask.assignedTo && typeof updatedTask.assignedTo === 'object' ? {
        id: (updatedTask.assignedTo as any)._id,
        fullName: (updatedTask.assignedTo as any).fullName,
        department: (updatedTask.assignedTo as any).department,
        designation: (updatedTask.assignedTo as any).designation,
      } : null,
    };

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
    await connectToDatabase();
    const user = getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await Task.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await Task.findByIdAndDelete(id);

    // Recalculate performance score for the employee
    if (existing.assignedTo) {
      const tasks = await Task.find({ assignedTo: existing.assignedTo }).select('progress').lean();
      const score = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length) : 0;
      await Employee.findByIdAndUpdate(existing.assignedTo, { performanceScore: score });
    }

    // Replicate Prisma Cascade Deletes
    await Comment.deleteMany({ taskId: id });
    await Attachment.deleteMany({ taskId: id });

    // Notify employee
    await Notification.create({
      title: 'Task Deleted',
      message: `The task "${existing.title}" has been deleted.`,
      type: 'task',
      userId: existing.assignedTo,
      userRole: 'employee',
      isRead: false,
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
