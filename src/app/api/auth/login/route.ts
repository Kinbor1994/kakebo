import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface LoginRequestBody {
  email?: string;
  password?: string;
}

export async function POST(req: Request) {
  try {
    const body: LoginRequestBody = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query user
    const users = await sql`
      SELECT id, email, password_hash, name
      FROM users
      WHERE email = ${trimmedEmail}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    const user = users[0];
    const isPasswordValid = await verifyPassword(password, user.password_hash as string);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    const userId = user.id as string;
    const token = await createSessionToken({
      userId,
      email: user.email as string,
      name: user.name as string,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        userId,
        email: user.email,
        name: user.name,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la connexion' },
      { status: 500 }
    );
  }
}
