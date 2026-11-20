import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import { signSessionToken, buildSessionCookieOptions, AuthenticatedErpUser } from '@/lib/auth';
import { UserRole } from '@/lib/erp-types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userDoc = await db.collection('users').findOne({ email });

    if (!userDoc || !userDoc.passwordHash) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, String(userDoc.passwordHash));
    if (!validPassword) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (userDoc.status !== 'active') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Your account is currently suspended or inactive. Contact your Super Admin.',
        },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();
    await db
      .collection('users')
      .updateOne({ _id: userDoc._id }, { $set: { lastLoginAt: nowIso, updatedAt: new Date() } });

    const uid = String(userDoc._id);
    const ownerId = String(userDoc.ownerId);
    const role = userDoc.role as UserRole;

    // Log login action to audit_logs for timeline and monthly tracking
    db.collection('audit_logs')
      .insertOne({
        action: 'USER_LOGIN',
        module: 'Authentication & Session',
        businessId: String(userDoc.assignedBusinesses || 'ALL'),
        details: `User "${userDoc.displayName}" (${userDoc.email}) logged in successfully as [${role}]`,
        severity: 'info',
        actorEmail: String(userDoc.email),
        actorName: String(userDoc.displayName || userDoc.email),
        actorRole: role,
        actorPhoto: userDoc.photoUrl ? String(userDoc.photoUrl) : '',
        actorDesignation: userDoc.designation ? String(userDoc.designation) : role,
        ownerId,
        createdAt: new Date(),
      })
      .catch(() => {});

    const token = await signSessionToken({
      userId: uid,
      ownerId,
      email: String(userDoc.email),
      role,
    });

    const userView: AuthenticatedErpUser = {
      id: uid,
      uid: String(userDoc.uid || uid),
      ownerId,
      email: String(userDoc.email),
      displayName: String(userDoc.displayName),
      role,
      assignedBusinesses: String(userDoc.assignedBusinesses || 'ALL'),
      permissionsJson: String(userDoc.permissionsJson || '{}'),
      status: userDoc.status,
      mfaEnabled: Boolean(userDoc.mfaEnabled),
      lastLoginAt: nowIso,
      phone: userDoc.phone ? String(userDoc.phone) : undefined,
      photoUrl: userDoc.photoUrl ? String(userDoc.photoUrl) : undefined,
      nidNumber: userDoc.nidNumber ? String(userDoc.nidNumber) : undefined,
      designation: userDoc.designation ? String(userDoc.designation) : undefined,
      address: userDoc.address ? String(userDoc.address) : undefined,
      emergencyContact: userDoc.emergencyContact ? String(userDoc.emergencyContact) : undefined,
    };

    const res = NextResponse.json({ ok: true, user: userView });
    res.cookies.set({ ...buildSessionCookieOptions(), value: token });
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { ok: false, error: 'Authentication failed.' },
      { status: 500 }
    );
  }
}
