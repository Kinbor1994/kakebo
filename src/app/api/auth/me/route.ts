import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { sql } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getAuthenticatedUser();

    if (!sessionUser) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const users = await sql`
      SELECT id, email, name, created_at
      FROM users
      WHERE id = ${sessionUser.userId}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = users[0];

    return NextResponse.json({
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
