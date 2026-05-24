import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'taskplatform-secret-key-2024';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export function generateToken(payload: { id: string; role: string; email?: string; username?: string; employeeCode?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { id: string; role: string; email?: string; username?: string; employeeCode?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

export function generateEmployeeCode(existingCount: number): string {
  return `EMP${1001 + existingCount}`;
}

export function generateUsername(fullName: string): string {
  const nameParts = fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  const randomNum = Math.floor(10 + Math.random() * 90);
  return `${nameParts}${randomNum}`;
}

export function generateDefaultPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
