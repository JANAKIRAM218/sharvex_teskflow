import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Admin, Employee } from '@/lib/models';
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

    if (user.role === 'admin') {
      const admin = await Admin.findById(user.id).select('name email role createdAt').lean();
      if (!admin) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, createdAt: admin.createdAt } });
    }

    if (user.role === 'employee') {
      const employee = await Employee.findById(user.id).select(
        'fullName username employeeCode department designation profileImage performanceScore status joiningDate createdAt'
      ).lean();
      if (!employee) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ user: { id: employee._id, fullName: employee.fullName, username: employee.username, employeeCode: employee.employeeCode, department: employee.department, designation: employee.designation, profileImage: employee.profileImage, performanceScore: employee.performanceScore, status: employee.status, joiningDate: employee.joiningDate, createdAt: employee.createdAt, role: 'employee' } });
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
