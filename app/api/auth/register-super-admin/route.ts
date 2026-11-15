import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import { signSessionToken, buildSessionCookieOptions, AuthenticatedErpUser } from '@/lib/auth';
import { seedInitialErpDataIfEmptyMongo } from '@/lib/erp-seed';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const displayName = String(body.displayName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!displayName || displayName.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid full name (at least 2 characters).' },
        { status: 400 }
      );
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Strict Single-Super-Admin Lock
    const existingSuperAdmin = await db.collection('users').findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'A Super Admin account already exists. Only one Super Admin is permitted. Please sign in instead.',
        },
        { status: 403 }
      );
    }

    const existingEmail = await db.collection('users').findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { ok: false, error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uid = `usr-sa-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();

    const fullPermissions = JSON.stringify({
      canView: true,
      canCreate: true,
      canEdit: true,
      canDeleteRecords: true,
      canApprove: true,
      canExportPrint: true,
      canCreateBusiness: true,
      canManageUsers: true,
      canViewConsolidatedProfit: true,
      canPostAccounting: true,
      canReverseTransactions: true,
      canManageInventory: true,
      allowedModules: [
        'dashboard',
        'poultry',
        'cattle',
        'goat',
        'fish',
        'transport',
        'accounting',
        'inventory',
        'stakeholders',
        'reports',
        'rbac',
      ],
    });

    const userDoc = {
      _id: uid,
      uid,
      ownerId: uid,
      email: email.slice(0, 160),
      displayName: displayName.slice(0, 120),
      passwordHash,
      role: 'super_admin' as const,
      assignedBusinesses: 'ALL',
      permissionsJson: fullPermissions,
      status: 'active' as const,
      mfaEnabled: true,
      lastLoginAt: now.toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.collection('users').insertOne(userDoc as unknown as never);
    } catch (insertErr: unknown) {
      const code = (insertErr as { code?: number })?.code;
      if (code === 11000) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Super Admin account has already been initialized. Public signup is locked.',
          },
          { status: 403 }
        );
      }
      throw insertErr;
    }

    await seedInitialErpDataIfEmptyMongo(uid, email);

    const token = await signSessionToken({
      userId: uid,
      ownerId: uid,
      email,
      role: 'super_admin',
    });

    const userView: AuthenticatedErpUser = {
      id: uid,
      uid,
      ownerId: uid,
      email,
      displayName: userDoc.displayName,
      role: 'super_admin',
      assignedBusinesses: 'ALL',
      permissionsJson: fullPermissions,
      status: 'active',
      mfaEnabled: true,
      lastLoginAt: userDoc.lastLoginAt,
    };

    const res = NextResponse.json({ ok: true, user: userView });
    res.cookies.set({ ...buildSessionCookieOptions(), value: token });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Register Super Admin error:', message);
    return NextResponse.json(
      { ok: false, error: `Failed to create Super Admin account: ${message}` },
      { status: 500 }
    );
  }
}
