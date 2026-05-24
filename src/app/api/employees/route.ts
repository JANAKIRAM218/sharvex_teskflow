import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Employee, Task, Notification } from '@/lib/models';
import { verifyToken, hashPassword, generateEmployeeCode, generateUsername, generateDefaultPassword } from '@/lib/auth';

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
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};

    if (search) {
      where.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) {
      where.department = department;
    }

    if (status) {
      where.status = status;
    }

    const total = await Employee.countDocuments(where);
    const employeesRaw = await Employee.find(where)
      .select('fullName username employeeCode department designation profileImage joiningDate status performanceScore createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const employees = await Promise.all(
      employeesRaw.map(async (emp) => {
        const assignedTasksCount = await Task.countDocuments({ assignedTo: emp._id });
        return {
          id: emp._id,
          fullName: emp.fullName,
          username: emp.username,
          employeeCode: emp.employeeCode,
          department: emp.department,
          designation: emp.designation,
          profileImage: emp.profileImage,
          joiningDate: emp.joiningDate,
          status: emp.status,
          performanceScore: emp.performanceScore,
          createdAt: emp.createdAt,
          _count: { assignedTasks: assignedTasksCount },
        };
      })
    );

    return NextResponse.json({
      employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get employees error:', error);
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
    const { fullName, department, designation, joiningDate, performanceScore, profileImage } = body;

    if (!fullName || !department || !designation) {
      return NextResponse.json({ error: 'Full name, department, and designation are required' }, { status: 400 });
    }

    const employeeCount = await Employee.countDocuments();
    const username = generateUsername(fullName);
    const employeeCode = generateEmployeeCode(employeeCount);
    const defaultPassword = generateDefaultPassword();
    const hashedPassword = await hashPassword(defaultPassword);

    const employee = await Employee.create({
      fullName,
      username,
      employeeCode,
      password: hashedPassword,
      department,
      designation,
      profileImage: profileImage || null,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      performanceScore: performanceScore || 0,
      status: 'active',
    });

    // Create notification for the new employee
    await Notification.create({
      title: 'Welcome to Task Platform',
      message: `Welcome ${fullName}! Your account has been created successfully.`,
      type: 'info',
      userId: employee._id,
      userRole: 'employee',
      isRead: false,
    });

    return NextResponse.json({
      employee: {
        id: employee._id,
        fullName: employee.fullName,
        username: employee.username,
        employeeCode: employee.employeeCode,
        department: employee.department,
        designation: employee.designation,
        status: employee.status,
      },
      credentials: {
        username,
        employeeCode,
        password: defaultPassword,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
