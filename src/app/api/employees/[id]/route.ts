import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
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
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        assignedTasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const { password: _password, ...employeeData } = employee;

    return NextResponse.json({ employee: employeeData });
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fullName, department, designation, profileImage, status, performanceScore, password } = body;

    // If the user is an employee, they can only update their own profile
    if (user.role === 'employee') {
      if (user.id !== id) {
        return NextResponse.json({ error: 'Unauthorized - Can only update your own profile' }, { status: 403 });
      }
    }

    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Build update data - employees can only update certain fields
    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined && user.role === 'admin') updateData.fullName = fullName;
    if (department !== undefined && user.role === 'admin') updateData.department = department;
    if (designation !== undefined) updateData.designation = designation;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (status !== undefined && user.role === 'admin') updateData.status = status;
    if (performanceScore !== undefined && user.role === 'admin') updateData.performanceScore = performanceScore;
    if (password && typeof password === 'string' && password.length >= 6) {
      const { hashPassword } = await import('@/lib/auth');
      updateData.password = await hashPassword(password);
    }

    const employee = await db.employee.update({
      where: { id },
      data: updateData,
    });

    const { password: _password, ...employeeData } = employee;

    return NextResponse.json({ employee: employeeData });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await db.employee.delete({ where: { id } });

    return NextResponse.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
