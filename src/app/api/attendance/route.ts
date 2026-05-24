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
    const employeeId = searchParams.get('employeeId') || '';
    const date = searchParams.get('date') || '';

    const where: Prisma.AttendanceWhereInput = {};

    // Employees can only see their own attendance
    if (user.role === 'employee') {
      where.employeeId = user.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
      where.date = {
        gte: startOfDay,
        lt: endOfDay,
      };
    }

    const records = await db.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            department: true,
            profileImage: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Get attendance error:', error);
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
    const { employeeId } = body;
    const targetEmployeeId = user.role === 'employee' ? user.id : employeeId;

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Check if employee exists
    const employee = await db.employee.findUnique({ where: { id: targetEmployeeId } });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if already clocked in today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const existingRecord = await db.attendance.findFirst({
      where: {
        employeeId: targetEmployeeId,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (existingRecord) {
      return NextResponse.json({ error: 'Already clocked in today' }, { status: 400 });
    }

    const attendance = await db.attendance.create({
      data: {
        employeeId: targetEmployeeId,
        clockIn: new Date(),
        date: new Date(),
        status: 'present',
      },
    });

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error) {
    console.error('Clock in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId } = body;
    const targetEmployeeId = user.role === 'employee' ? user.id : employeeId;

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Find today's attendance record
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const existingRecord = await db.attendance.findFirst({
      where: {
        employeeId: targetEmployeeId,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: 'No clock-in record found for today' }, { status: 404 });
    }

    if (existingRecord.clockOut) {
      return NextResponse.json({ error: 'Already clocked out today' }, { status: 400 });
    }

    const attendance = await db.attendance.update({
      where: { id: existingRecord.id },
      data: { clockOut: new Date() },
    });

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Clock out error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
