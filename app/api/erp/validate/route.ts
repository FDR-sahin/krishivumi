import { NextRequest, NextResponse } from 'next/server';
import { BusinessInputSchema, JournalEntryInputSchema } from '@/lib/erp-types';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 60;
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'local';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Rate limit enforced.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { entityType, payload, userRole } = body;

    if (entityType === 'business') {
      if (userRole && userRole !== 'super_admin') {
        return NextResponse.json(
          { ok: false, error: 'RBAC Violation: Only Super Admin can create or modify business entities.' },
          { status: 403 }
        );
      }
      const parsed = BusinessInputSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true, validated: parsed.data });
    }

    if (entityType === 'journal_entry') {
      if (userRole === 'employee') {
        return NextResponse.json(
          { ok: false, error: 'RBAC Violation: Standard employees cannot post central ledger entries.' },
          { status: 403 }
        );
      }
      const parsed = JournalEntryInputSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') },
          { status: 400 }
        );
      }
      if (parsed.data.debitAccountId === parsed.data.creditAccountId) {
        return NextResponse.json(
          { ok: false, error: 'Double-Entry Error: Debit and Credit accounts cannot be identical.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true, validated: parsed.data });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request payload.' },
      { status: 400 }
    );
  }
}
