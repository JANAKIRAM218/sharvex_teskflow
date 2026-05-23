import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, employeeCode, password } = await request.json();

    if (!username || !employeeCode || !password) {
      return NextResponse.json({ error: 'Username, employee code, and password are required' }, { status: 400 });
    }

    const employee = await db.employee.findFirst({
      where: { username, employeeCode },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (employee.status !== 'active') {
      return NextResponse.json({ error: 'Account is inactive. Please contact admin.' }, { status: 403 });
    }

    const isValid = await comparePassword(password, employee.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken({
      id: employee.id,
      role: 'employee',
      username: employee.username,
      employeeCode: employee.employeeCode,
    });

    return NextResponse.json({
      token,
      user: {
        id: employee.id,
        fullName: employee.fullName,
        username: employee.username,
        employeeCode: employee.employeeCode,
        role: 'employee',
        department: employee.department,
        designation: employee.designation,
        profileImage: employee.profileImage,
        performanceScore: employee.performanceScore,
      },
    });
  } catch (error) {
    console.error('Employee login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
