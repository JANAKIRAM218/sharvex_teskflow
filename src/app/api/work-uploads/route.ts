import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// GET - List work uploads for an employee
export async function GET(request: Request) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || user.id;
    const taskId = searchParams.get('taskId');

    // Employees can only see their own uploads
    if (user.role === 'employee' && user.id !== employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = { employeeId };
    if (taskId) where.taskId = taskId;

    const uploads = await db.workUpload.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { fullName: true, employeeCode: true },
        },
      },
    });

    return NextResponse.json({ uploads });
  } catch (error) {
    console.error('Get work uploads error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a work upload
export async function POST(request: Request) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const employeeId = formData.get('employeeId') as string || user.id;
    const taskId = formData.get('taskId') as string | null;
    const title = formData.get('title') as string || '';
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string || 'general';

    // Employees can only upload for themselves
    if (user.role === 'employee' && user.id !== employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!file && !title) {
      return NextResponse.json({ error: 'Title or file is required' }, { status: 400 });
    }

    let fileUrl = '';
    let fileName = '';
    let fileType = '';
    let fileSize = 0;

    if (file) {
      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const ext = path.extname(file.name);
      const uniqueName = `work-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(uploadsDir, uniqueName);

      // Write file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      fileUrl = `/uploads/${uniqueName}`;
      fileName = file.name;
      fileType = file.type || ext.replace('.', '') || 'unknown';
      fileSize = file.size;
    }

    const upload = await db.workUpload.create({
      data: {
        employeeId,
        taskId: taskId || null,
        title: title || fileName,
        description,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        category,
      },
    });

    return NextResponse.json({ upload }, { status: 201 });
  } catch (error) {
    console.error('Create work upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
