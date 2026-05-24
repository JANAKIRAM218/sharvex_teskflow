import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { WorkUpload } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const upload = await WorkUpload.findById(id);

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Employees can only delete their own uploads
    if (user.role === 'employee' && upload.employeeId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await WorkUpload.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Upload deleted successfully' });
  } catch (error) {
    console.error('Delete work upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
