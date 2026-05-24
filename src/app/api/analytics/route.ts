import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Employee, Task } from '@/lib/models';
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

    // Only admin can view full analytics; employees see limited data
    const isAdmin = user.role === 'admin';

    // Total counts
    const totalEmployees = await Employee.countDocuments();
    const totalTasks = await Task.countDocuments();
    const activeTasks = await Task.countDocuments({ status: 'in-progress' });
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const pendingTasks = await Task.countDocuments({ status: 'pending' });

    // Tasks by status
    const tasksByStatusRaw = await Task.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const tasksByStatus: Record<string, number> = {};
    for (const item of tasksByStatusRaw) {
      if (item._id) {
        tasksByStatus[item._id] = item.count;
      }
    }

    // Tasks by priority
    const tasksByPriorityRaw = await Task.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]);

    const tasksByPriority: Record<string, number> = {};
    for (const item of tasksByPriorityRaw) {
      if (item._id) {
        tasksByPriority[item._id] = item.count;
      }
    }

    // Employee performance rankings
    const activeEmployees = await Employee.find({ status: 'active' })
      .select('fullName department performanceScore profileImage')
      .sort({ performanceScore: -1 })
      .limit(10)
      .lean();

    const employeePerformance = await Promise.all(
      activeEmployees.map(async (emp) => {
        const assignedCount = await Task.countDocuments({ assignedTo: emp._id });
        return {
          id: emp._id,
          fullName: emp.fullName,
          department: emp.department,
          performanceScore: emp.performanceScore,
          profileImage: emp.profileImage,
          _count: {
            assignedTasks: assignedCount,
          },
        };
      })
    );

    // Weekly task completion data (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const completed = await Task.countDocuments({
        status: 'completed',
        updatedAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      });

      const created = await Task.countDocuments({
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      });

      weeklyData.push({
        date: startOfDay.toISOString().split('T')[0],
        day: startOfDay.toLocaleDateString('en-US', { weekday: 'short' }),
        completed,
        created,
      });
    }

    // Department distribution
    const departmentDist = await Employee.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } }
    ]);

    const departments = departmentDist.map((d) => ({
      department: d._id,
      count: d.count,
    }));

    // For employees: only return their own task stats
    if (!isAdmin) {
      const myTasks = await Task.countDocuments({ assignedTo: user.id });
      const myCompleted = await Task.countDocuments({ assignedTo: user.id, status: 'completed' });
      const myPending = await Task.countDocuments({ assignedTo: user.id, status: 'pending' });
      const myInProgress = await Task.countDocuments({ assignedTo: user.id, status: 'in-progress' });

      return NextResponse.json({
        totalEmployees,
        totalTasks: myTasks,
        activeTasks: myInProgress,
        completedTasks: myCompleted,
        pendingTasks: myPending,
        tasksByStatus: {
          pending: myPending,
          'in-progress': myInProgress,
          completed: myCompleted,
        },
        weeklyData,
      });
    }

    return NextResponse.json({
      totalEmployees,
      totalTasks,
      activeTasks,
      completedTasks,
      pendingTasks,
      tasksByStatus,
      tasksByPriority,
      employeePerformance,
      weeklyData,
      departments,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
