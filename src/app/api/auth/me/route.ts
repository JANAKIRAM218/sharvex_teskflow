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

    if (user.role === 'admin') {
      const admin = await db.admin.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      if (!admin) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ user: admin });
    }

    if (user.role === 'employee') {
      const employee = await db.employee.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          fullName: true,
          username: true,
          employeeCode: true,
          department: true,
          designation: true,
          profileImage: true,
          performanceScore: true,
          status: true,
          joiningDate: true,
          createdAt: true,
        },
      });
      if (!employee) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ user: { ...employee, role: 'employee' } });
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
