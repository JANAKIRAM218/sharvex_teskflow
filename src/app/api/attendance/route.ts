import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Employee, Attendance } from '@/lib/models';
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
    const employeeId = searchParams.get('employeeId') || '';
    const date = searchParams.get('date') || '';

    const where: any = {};

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
        $gte: startOfDay,
        $lt: endOfDay,
      };
    }

    const recordsRaw = await Attendance.find(where)
      .sort({ date: -1 })
      .populate('employeeId', 'fullName department profileImage')
      .lean();

    const records = recordsRaw.map((rec) => ({
      id: rec._id,
      employeeId: rec.employeeId && typeof rec.employeeId === 'object' ? (rec.employeeId as any)._id : rec.employeeId,
      clockIn: rec.clockIn,
      clockOut: rec.clockOut,
      date: rec.date,
      status: rec.status,
      employee: rec.employeeId && typeof rec.employeeId === 'object' ? {
        id: (rec.employeeId as any)._id,
        fullName: (rec.employeeId as any).fullName,
        department: (rec.employeeId as any).department,
        profileImage: (rec.employeeId as any).profileImage,
      } : null,
    }));

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Get attendance error:', error);
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
    const { employeeId } = body;
    const targetEmployeeId = user.role === 'employee' ? user.id : employeeId;

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Check if employee exists
    const employee = await Employee.findById(targetEmployeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if already clocked in today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const existingRecord = await Attendance.findOne({
      employeeId: targetEmployeeId,
      date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    if (existingRecord) {
      return NextResponse.json({ error: 'Already clocked in today' }, { status: 400 });
    }

    const newRecord = await Attendance.create({
      employeeId: targetEmployeeId,
      clockIn: new Date(),
      date: new Date(),
      status: 'present',
    });

    const attendance = {
      id: newRecord._id,
      employeeId: newRecord.employeeId,
      clockIn: newRecord.clockIn,
      clockOut: newRecord.clockOut,
      date: newRecord.date,
      status: newRecord.status,
    };

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error) {
    console.error('Clock in error:', error);
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
    const { employeeId } = body;
    const targetEmployeeId = user.role === 'employee' ? user.id : employeeId;

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Find today's attendance record
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const existingRecord = await Attendance.findOne({
      employeeId: targetEmployeeId,
      date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: 'No clock-in record found for today' }, { status: 404 });
    }

    if (existingRecord.clockOut) {
      return NextResponse.json({ error: 'Already clocked out today' }, { status: 400 });
    }

    const updatedRecord = await Attendance.findByIdAndUpdate(
      existingRecord._id,
      { clockOut: new Date() },
      { new: true }
    );

    const attendance = {
      id: updatedRecord._id,
      employeeId: updatedRecord.employeeId,
      clockIn: updatedRecord.clockIn,
      clockOut: updatedRecord.clockOut,
      date: updatedRecord.date,
      status: updatedRecord.status,
    };

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Clock out error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
