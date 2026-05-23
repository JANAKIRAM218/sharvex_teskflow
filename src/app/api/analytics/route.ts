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

    // Only admin can view full analytics; employees see limited data
    const isAdmin = user.role === 'admin';

    // Total counts
    const totalEmployees = await db.employee.count();
    const totalTasks = await db.task.count();
    const activeTasks = await db.task.count({ where: { status: 'in-progress' } });
    const completedTasks = await db.task.count({ where: { status: 'completed' } });
    const pendingTasks = await db.task.count({ where: { status: 'pending' } });

    // Tasks by status
    const tasksByStatusRaw = await db.task.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const tasksByStatus: Record<string, number> = {};
    for (const item of tasksByStatusRaw) {
      tasksByStatus[item.status] = item._count.status;
    }

    // Tasks by priority
    const tasksByPriorityRaw = await db.task.groupBy({
      by: ['priority'],
      _count: { priority: true },
    });

    const tasksByPriority: Record<string, number> = {};
    for (const item of tasksByPriorityRaw) {
      tasksByPriority[item.priority] = item._count.priority;
    }

    // Employee performance rankings
    const employeePerformance = await db.employee.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        fullName: true,
        department: true,
        performanceScore: true,
        profileImage: true,
        _count: {
          select: { assignedTasks: true },
        },
      },
      orderBy: { performanceScore: 'desc' },
      take: 10,
    });

    // Weekly task completion data (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const completed = await db.task.count({
        where: {
          status: 'completed',
          updatedAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });

      const created = await db.task.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
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
    const departmentDist = await db.employee.groupBy({
      by: ['department'],
      _count: { department: true },
    });

    const departments = departmentDist.map((d) => ({
      department: d.department,
      count: d._count.department,
    }));

    // For employees: only return their own task stats
    if (!isAdmin) {
      const myTasks = await db.task.count({ where: { assignedTo: user.id } });
      const myCompleted = await db.task.count({ where: { assignedTo: user.id, status: 'completed' } });
      const myPending = await db.task.count({ where: { assignedTo: user.id, status: 'pending' } });
      const myInProgress = await db.task.count({ where: { assignedTo: user.id, status: 'in-progress' } });

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
