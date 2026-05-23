import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

export async function POST(request: Request) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const originalName = file.name;
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `${basename}-${timestamp}-${randomStr}${ext}`;

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Write file
    const filepath = path.join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    // Determine file type
    const mimeType = file.type || 'application/octet-stream';
    let fileType = 'other';
    if (mimeType.startsWith('image/')) {
      fileType = 'image';
    } else if (mimeType.startsWith('video/')) {
      fileType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      fileType = 'audio';
    } else if (mimeType.includes('pdf')) {
      fileType = 'pdf';
    } else if (mimeType.includes('document') || mimeType.includes('word') || ext === '.doc' || ext === '.docx') {
      fileType = 'document';
    } else if (mimeType.includes('sheet') || mimeType.includes('excel') || ext === '.xls' || ext === '.xlsx') {
      fileType = 'spreadsheet';
    } else if (mimeType.includes('zip') || mimeType.includes('compressed') || ext === '.zip' || ext === '.rar') {
      fileType = 'archive';
    } else if (mimeType.startsWith('text/') || ext === '.txt' || ext === '.csv') {
      fileType = 'text';
    }

    const url = `/uploads/${filename}`;

    return NextResponse.json({
      filename: originalName,
      storedFilename: filename,
      url,
      fileType,
      mimeType,
      size: file.size,
    }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
