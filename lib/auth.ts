import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { getDb } from './mongodb';
import { UserRole } from './erp-types';

export const SESSION_COOKIE_NAME = 'kv_session';

function getJwtSecret(): Uint8Array {
  const raw =
    process.env.JWT_SECRET ||
    crypto
      .createHash('sha256')
      .update(process.env.MONGO_URI || 'krishivumi-enterprise-dev-secret-key')
      .digest('hex');
  return new TextEncoder().encode(raw);
}

export interface SessionPayload {
  userId: string;
  ownerId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedErpUser {
  id: string;
  uid: string;
  ownerId: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedBusinesses: string;
  permissionsJson: string;
  status: 'active' | 'suspended' | 'invited';
  mfaEnabled: boolean;
  lastLoginAt: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.ownerId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      ownerId: payload.ownerId,
      email: payload.email,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<AuthenticatedErpUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = await verifySessionToken(token);
  if (!decoded) return null;

  const db = await getDb();
  const doc = await db.collection('users').findOne({ _id: decoded.userId as unknown as never });
  if (!doc) return null;
  if (doc.status !== 'active') return null;

  return {
    id: String(doc._id),
    uid: String(doc.uid || doc._id),
    ownerId: String(doc.ownerId),
    email: String(doc.email),
    displayName: String(doc.displayName),
    role: doc.role as UserRole,
    assignedBusinesses: String(doc.assignedBusinesses || 'ALL'),
    permissionsJson: String(doc.permissionsJson || '{}'),
    status: doc.status,
    mfaEnabled: Boolean(doc.mfaEnabled),
    lastLoginAt: String(doc.lastLoginAt || ''),
  };
}

export function buildSessionCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function parseUserPermissions(permissionsJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(permissionsJson || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
