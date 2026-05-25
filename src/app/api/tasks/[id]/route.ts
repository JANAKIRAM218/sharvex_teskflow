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
    const assignedToIds: string[] = Array.isArray(task.assignedTo)
      ? task.assignedTo.map((emp: any) => typeof emp === 'object' && emp ? emp._id : emp)
      : (task.assignedTo ? [task.assignedTo] : []);

    if (user.role === 'employee' && !assignedToIds.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comments = await Comment.find({ taskId: id })
      .sort({ createdAt: -1 })
      .lean();

    const attachments = await Attachment.find({ taskId: id })
      .sort({ createdAt: -1 })
      .lean();

    const isArray = Array.isArray(task.assignedTo);
    const employees = isArray
      ? task.assignedTo.map((emp: any) => typeof emp === 'object' && emp ? {
          id: emp._id,
          fullName: emp.fullName,
          department: emp.department,
          designation: emp.designation,
          profileImage: emp.profileImage,
        } : { id: emp })
      : (task.assignedTo && typeof task.assignedTo === 'object' ? [{
          id: (task.assignedTo as any)._id,
          fullName: (task.assignedTo as any).fullName,
          department: (task.assignedTo as any).department,
          designation: (task.assignedTo as any).designation,
          profileImage: (task.assignedTo as any).profileImage,
        }] : []);

    const firstEmployee = employees[0] || null;
    const firstAssigneeId = isArray
      ? (task.assignedTo[0] && typeof task.assignedTo[0] === 'object' ? (task.assignedTo[0] as any)._id : task.assignedTo[0])
      : (task.assignedTo && typeof task.assignedTo === 'object' ? (task.assignedTo as any)._id : task.assignedTo);

    const taskData = {
      id: task._id,
      title: task.title,
      description: task.description,
      assignedTo: firstAssigneeId || '',
      assignedBy: task.assignedBy,
      priority: task.priority,
      deadline: task.deadline,
      progress: task.progress,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      employee: firstEmployee,
      employees,
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
    const { title, description, priority, deadline, progress, status, assignedTo } = body;

    const existing = await Task.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const prevAssigneeIds: string[] = Array.isArray(existing.assignedTo)
      ? existing.assignedTo
      : (existing.assignedTo ? [existing.assignedTo] : []);

    // Employees can only update progress and status of their own tasks
    if (user.role === 'employee') {
      if (!prevAssigneeIds.includes(user.id)) {
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

      // Recalculate performance score for all co-assignees
      if (updatedTask && updatedTask.assignedTo) {
        const empIds: string[] = Array.isArray(updatedTask.assignedTo)
          ? updatedTask.assignedTo.map((emp: any) => typeof emp === 'object' && emp ? emp._id : emp)
          : [updatedTask.assignedTo];

        for (const empId of empIds) {
          const tasks = await Task.find({ assignedTo: empId }).select('progress').lean();
          const score = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length) : 0;
          await Employee.findByIdAndUpdate(empId, { performanceScore: score });
        }
      }

      // Notify admin if task is completed
      if (status === 'completed' && existing.status !== 'completed') {
        const employeeObj = await Employee.findById(user.id).select('fullName').lean();
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

      const isArray = Array.isArray(updatedTask.assignedTo);
      const employees = isArray
        ? updatedTask.assignedTo.map((emp: any) => typeof emp === 'object' && emp ? {
            id: emp._id,
            fullName: emp.fullName,
          } : { id: emp })
        : (updatedTask.assignedTo && typeof updatedTask.assignedTo === 'object' ? [{
            id: (updatedTask.assignedTo as any)._id,
            fullName: (updatedTask.assignedTo as any).fullName,
          }] : []);

      const firstEmployee = employees[0] || null;
      const firstAssigneeId = isArray
        ? (updatedTask.assignedTo[0] && typeof updatedTask.assignedTo[0] === 'object' ? (updatedTask.assignedTo[0] as any)._id : updatedTask.assignedTo[0])
        : (updatedTask.assignedTo && typeof updatedTask.assignedTo === 'object' ? (updatedTask.assignedTo as any)._id : updatedTask.assignedTo);

      const task = {
        id: updatedTask._id,
        title: updatedTask.title,
        description: updatedTask.description,
        assignedTo: firstAssigneeId || '',
        assignedBy: updatedTask.assignedBy,
        priority: updatedTask.priority,
        deadline: updatedTask.deadline,
        progress: updatedTask.progress,
        status: updatedTask.status,
        createdAt: updatedTask.createdAt,
        updatedAt: updatedTask.updatedAt,
        employee: firstEmployee,
        employees,
      };

      return NextResponse.json({ task });
    }

    // Admin can update all fields
    const finalStatus = status !== undefined ? status : existing.status;
    const finalProgress = finalStatus === 'completed' ? 100 : (progress !== undefined ? progress : existing.progress);

    let newAssigneeIds = prevAssigneeIds;
    if (assignedTo !== undefined) {
      newAssigneeIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        progress: finalProgress,
        ...(status !== undefined && { status }),
        assignedTo: newAssigneeIds,
      },
      { new: true }
    ).populate('assignedTo', 'fullName department designation profileImage').lean();

    // Recalculate performance score for all previous and new assignees
    const allAssigneesToUpdate = Array.from(new Set([...prevAssigneeIds, ...newAssigneeIds]));
    for (const empId of allAssigneesToUpdate) {
      const tasks = await Task.find({ assignedTo: empId }).select('progress').lean();
      const score = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length) : 0;
      await Employee.findByIdAndUpdate(empId, { performanceScore: score });
    }

    // Send notifications to newly assigned employees and removed employees
    const newlyAssigned = newAssigneeIds.filter((x) => !prevAssigneeIds.includes(x));
    const removedAssignees = prevAssigneeIds.filter((x) => !newAssigneeIds.includes(x));

    if (newlyAssigned.length > 0) {
      await Notification.insertMany(
        newlyAssigned.map((empId) => ({
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${updatedTask.title}"`,
          type: 'task',
          userId: empId,
          userRole: 'employee',
          relatedId: id,
          isRead: false,
        }))
      );
    }

    if (removedAssignees.length > 0) {
      await Notification.insertMany(
        removedAssignees.map((empId) => ({
          title: 'Task Unassigned',
          message: `You have been unassigned from the task: "${existing.title}"`,
          type: 'task',
          userId: empId,
          userRole: 'employee',
          isRead: false,
        }))
      );
    }

    // Notify retained employees of details changes
    const retainedAssignees = newAssigneeIds.filter((x) => prevAssigneeIds.includes(x));
    if (retainedAssignees.length > 0 && (title !== undefined || priority !== undefined || deadline !== undefined || status !== undefined)) {
      const changes: string[] = [];
      if (title !== undefined) changes.push('title');
      if (priority !== undefined) changes.push('priority');
      if (deadline !== undefined) changes.push('deadline');
      if (status !== undefined) changes.push('status');

      await Notification.insertMany(
        retainedAssignees.map((empId) => ({
          title: 'Task Updated',
          message: `Your task "${existing.title}" has been updated. Changes: ${changes.join(', ')}`,
          type: 'task',
          userId: empId,
          userRole: 'employee',
          relatedId: id,
          isRead: false,
        }))
      );
    }

    const isArray = Array.isArray(updatedTask.assignedTo);
    const employees = isArray
      ? updatedTask.assignedTo.map((emp: any) => typeof emp === 'object' && emp ? {
          id: emp._id,
          fullName: emp.fullName,
          department: emp.department,
          designation: emp.designation,
          profileImage: emp.profileImage,
        } : { id: emp })
      : (updatedTask.assignedTo && typeof updatedTask.assignedTo === 'object' ? [{
          id: (updatedTask.assignedTo as any)._id,
          fullName: (updatedTask.assignedTo as any).fullName,
          department: (updatedTask.assignedTo as any).department,
          designation: (updatedTask.assignedTo as any).designation,
          profileImage: (updatedTask.assignedTo as any).profileImage,
        }] : []);

    const firstEmployee = employees[0] || null;
    const firstAssigneeId = isArray
      ? (updatedTask.assignedTo[0] && typeof updatedTask.assignedTo[0] === 'object' ? (updatedTask.assignedTo[0] as any)._id : updatedTask.assignedTo[0])
      : (updatedTask.assignedTo && typeof updatedTask.assignedTo === 'object' ? (updatedTask.assignedTo as any)._id : updatedTask.assignedTo);

    const task = {
      id: updatedTask._id,
      title: updatedTask.title,
      description: updatedTask.description,
      assignedTo: firstAssigneeId || '',
      assignedBy: updatedTask.assignedBy,
      priority: updatedTask.priority,
      deadline: updatedTask.deadline,
      progress: updatedTask.progress,
      status: updatedTask.status,
      createdAt: updatedTask.createdAt,
      updatedAt: updatedTask.updatedAt,
      employee: firstEmployee,
      employees,
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

    // Recalculate performance score for all employees assigned to the deleted task
    const assigneeIds: string[] = Array.isArray(existing.assignedTo)
      ? existing.assignedTo
      : (existing.assignedTo ? [existing.assignedTo] : []);

    for (const empId of assigneeIds) {
      const tasks = await Task.find({ assignedTo: empId }).select('progress').lean();
      const score = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length) : 0;
      await Employee.findByIdAndUpdate(empId, { performanceScore: score });
    }

    // Replicate Prisma Cascade Deletes
    await Comment.deleteMany({ taskId: id });
    await Attachment.deleteMany({ taskId: id });

    // Notify all employees assigned to the deleted task
    if (assigneeIds.length > 0) {
      await Notification.insertMany(
        assigneeIds.map((empId) => ({
          title: 'Task Deleted',
          message: `The task "${existing.title}" has been deleted.`,
          type: 'task',
          userId: empId,
          userRole: 'employee',
          isRead: false,
        }))
      );
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
