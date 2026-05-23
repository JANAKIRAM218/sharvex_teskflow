import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, hashPassword, generateEmployeeCode, generateUsername, generateDefaultPassword } from '@/lib/auth';
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
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';

    const where: Prisma.EmployeeWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { username: { contains: search } },
        { employeeCode: { contains: search } },
        { designation: { contains: search } },
      ];
    }

    if (department) {
      where.department = department;
    }

    if (status) {
      where.status = status;
    }

    const total = await db.employee.count({ where });
    const employees = await db.employee.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        username: true,
        employeeCode: true,
        department: true,
        designation: true,
        profileImage: true,
        joiningDate: true,
        status: true,
        performanceScore: true,
        createdAt: true,
        _count: {
          select: { assignedTasks: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

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
    const user = getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, department, designation, joiningDate, performanceScore, profileImage } = body;

    if (!fullName || !department || !designation) {
      return NextResponse.json({ error: 'Full name, department, and designation are required' }, { status: 400 });
    }

    const employeeCount = await db.employee.count();
    const username = generateUsername(fullName);
    const employeeCode = generateEmployeeCode(employeeCount);
    const defaultPassword = generateDefaultPassword();
    const hashedPassword = await hashPassword(defaultPassword);

    const employee = await db.employee.create({
      data: {
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
      },
    });

    // Create notification for the new employee
    await db.notification.create({
      data: {
        title: 'Welcome to Task Platform',
        message: `Welcome ${fullName}! Your account has been created successfully.`,
        type: 'info',
        userId: employee.id,
        userRole: 'employee',
        isRead: false,
      },
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
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
