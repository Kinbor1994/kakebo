import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET_RAW = process.env.JWT_SECRET || 'default-fallback-secret-kakeibo-32-chars';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET_RAW);
const COOKIE_NAME = 'kakeibo_session';

export interface AuthSessionUser {
  userId: string;
  email: string;
  name?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: AuthSessionUser): Promise<string> {
  return new SignJWT({
    userId: user.userId,
    email: user.email,
    name: user.name || '',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<AuthSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY, {
      algorithms: ['HS256'],
    });

    if (!payload.userId || !payload.email) {
      return null;
    }

    return {
      userId: String(payload.userId),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : undefined,
    };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(): Promise<AuthSessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
