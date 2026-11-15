import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const superAdminCount = await db.collection('users').countDocuments({ role: 'super_admin' });
    const sessionUser = await getSessionUser();

    return NextResponse.json({
      ok: true,
      hasSuperAdmin: superAdminCount > 0,
      user: sessionUser,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Auth status error:', message);
    return NextResponse.json(
      {
        ok: false,
        hasSuperAdmin: false,
        user: null,
        error: `Database connection error: ${message}`,
      },
      { status: 500 }
    );
  }
}
