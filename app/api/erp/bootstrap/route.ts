import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, parseUserPermissions } from '@/lib/auth';
import {
  formatToEnglishBusiness,
  formatToEnglishCategory,
  formatToEnglishDescription,
  formatToEnglishAccount,
  formatToEnglishParty,
  formatToEnglishDesignation,
} from '@/lib/erp-types';

export const dynamic = 'force-dynamic';

function serializeDocs(docs: Record<string, unknown>[]) {
  return docs.map((d) => {
    const { _id, ...rest } = d;
    const out: Record<string, unknown> = { id: String(_id) };
    for (const [k, v] of Object.entries(rest)) {
      if (k === 'passwordHash') continue;
      if (v instanceof Date) {
        out[k] = v.toISOString();
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const ownerFilter = { ownerId: sessionUser.ownerId };

    const [
      businesses,
      accounts,
      journalEntries,
      inventoryItems,
      stockMovements,
      stakeholders,
      poultryBatches,
      livestockRecords,
      fishCycles,
      transportOps,
      notifications,
      auditLogs,
      erpUsers,
    ] = await Promise.all([
      db.collection('businesses').find(ownerFilter).toArray(),
      db.collection('accounts').find(ownerFilter).toArray(),
      db.collection('journal_entries').find(ownerFilter).sort({ createdAt: -1 }).toArray(),
      db.collection('inventory').find(ownerFilter).toArray(),
      db.collection('stock_movements').find(ownerFilter).sort({ createdAt: -1 }).toArray(),
      db.collection('stakeholders').find(ownerFilter).toArray(),
      db.collection('poultry_batches').find(ownerFilter).toArray(),
      db.collection('livestock_records').find(ownerFilter).toArray(),
      db.collection('fish_cycles').find(ownerFilter).toArray(),
      db.collection('transport_ops').find(ownerFilter).toArray(),
      db.collection('notifications').find(ownerFilter).sort({ createdAt: -1 }).toArray(),
      db.collection('audit_logs').find(ownerFilter).sort({ createdAt: -1 }).limit(200).toArray(),
      db.collection('users').find({ $or: [ownerFilter, { email: sessionUser.email }] }).toArray(),
    ]);

    const isSuperAdmin = sessionUser.role === 'super_admin';

    // Auto-propagate user's photoUrl to any past journal entries or audit logs where actorPhoto is empty
    if (sessionUser.photoUrl) {
      const matchCrit = isSuperAdmin
        ? {
            $or: [
              { actorEmail: sessionUser.email },
              { actorName: sessionUser.displayName },
              { actorRole: 'super_admin' },
              { actorName: 'sahin miah' },
            ],
            actorPhoto: { $in: ['', null, undefined] } as unknown as never,
          }
        : {
            $or: [{ actorEmail: sessionUser.email }, { actorName: sessionUser.displayName }],
            actorPhoto: { $in: ['', null, undefined] } as unknown as never,
          };

      db.collection('journal_entries')
        .updateMany(matchCrit as never, { $set: { actorPhoto: sessionUser.photoUrl } })
        .catch(() => {});
      db.collection('audit_logs')
        .updateMany(matchCrit as never, { $set: { actorPhoto: sessionUser.photoUrl } })
        .catch(() => {});
    }
    const assignedIds =
      sessionUser.assignedBusinesses === 'ALL'
        ? null
        : sessionUser.assignedBusinesses
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

    const filterByBiz = (docs: Record<string, unknown>[], allowAllTag = false) => {
      const serialized = serializeDocs(docs);
      if (isSuperAdmin || !assignedIds) return serialized;
      return serialized.filter((item) => {
        const bid = String(item.businessId || item.id || '');
        if (allowAllTag && bid === 'ALL') return true;
        return assignedIds.includes(bid);
      });
    };

    const perms = parseUserPermissions(sessionUser.permissionsJson);
    const canManageUsers = isSuperAdmin || Boolean(perms.canManageUsers);

    const rawFilteredBusinesses = serializeDocs(businesses as Record<string, unknown>[]).filter(
      (b) => isSuperAdmin || !assignedIds || assignedIds.includes(String(b.id))
    );

    // Deduplicate businesses by code or templateType (ensures Truck & Transport never appears twice)
    const seenBizKeys = new Set<string>();
    const filteredBusinesses: Record<string, unknown>[] = [];
    for (const b of rawFilteredBusinesses) {
      const isTransport =
        b.templateType === 'transport' ||
        String(b.name || '').toLowerCase().includes('transport') ||
        String(b.nameBn || '').includes('ট্রাক') ||
        String(b.code || '').toUpperCase().startsWith('BIZ-TRAN');

      const key = isTransport
        ? 'SINGLE_TRANSPORT_BUSINESS_KEY'
        : String(b.code || b.templateType || b.name || b.id).trim().toUpperCase();

      if (seenBizKeys.has(key) || String(b.code || '').toUpperCase() === 'BIZ-TRAN-06') {
        const deleteId = b._id || b.id;
        if (deleteId) {
          db.collection('businesses').deleteOne({ _id: deleteId as unknown as never }).catch(() => {});
        }
        continue;
      }
      seenBizKeys.add(key);
      filteredBusinesses.push(b);
    }

    // Clean up any historical duplicate transport records directly from DB
    db.collection('businesses').deleteMany({ code: 'BIZ-TRAN-06' }).catch(() => {});

    const visibleUsers = canManageUsers
      ? serializeDocs(erpUsers as Record<string, unknown>[])
      : serializeDocs(erpUsers as Record<string, unknown>[]).filter(
          (u) => String(u.id) === sessionUser.id
        );

    const sanitizedBusinesses = filteredBusinesses.map((b) => ({
      ...b,
      name: formatToEnglishBusiness(String(b.name || ''), String(b.id || b._id || '')),
      nameBn: formatToEnglishBusiness(String(b.name || ''), String(b.id || b._id || '')),
    }));

    const sanitizedAccounts = serializeDocs(accounts as Record<string, unknown>[]).map((a) => ({
      ...a,
      name: formatToEnglishAccount(String(a.name || ''), String(a.code || '')),
    }));

    const sanitizedStakeholders = filterByBiz(stakeholders as Record<string, unknown>[]).map((s) => ({
      ...s,
      businessName: formatToEnglishBusiness(String(s.businessName || ''), String(s.businessId || '')),
      designationOrCategory: formatToEnglishDesignation(String(s.designationOrCategory || '')),
    }));

    const sanitizedJournalEntries = filterByBiz(journalEntries as Record<string, unknown>[], true).map((j) => ({
      ...j,
      businessName: formatToEnglishBusiness(String(j.businessName || ''), String(j.businessId || '')),
      category: formatToEnglishCategory(String(j.category || '')),
      description: formatToEnglishDescription(String(j.description || ''), String(j.category || '')),
      counterpartyName: formatToEnglishParty(String(j.counterpartyName || '')),
      debitAccountName: formatToEnglishAccount(String(j.debitAccountName || '')),
      creditAccountName: formatToEnglishAccount(String(j.creditAccountName || '')),
      actorDesignation: formatToEnglishDesignation(String(j.actorDesignation || '')),
    }));

    const sanitizedUsers = visibleUsers.map((u) => ({
      ...u,
      designation: formatToEnglishDesignation(String(u.designation || '')),
    }));

    return NextResponse.json({
      ok: true,
      user: sessionUser,
      data: {
        businesses: sanitizedBusinesses,
        accounts: sanitizedAccounts,
        journalEntries: sanitizedJournalEntries,
        inventoryItems: filterByBiz(inventoryItems as Record<string, unknown>[]),
        stockMovements: filterByBiz(stockMovements as Record<string, unknown>[]),
        stakeholders: sanitizedStakeholders,
        poultryBatches: filterByBiz(poultryBatches as Record<string, unknown>[]),
        livestockRecords: filterByBiz(livestockRecords as Record<string, unknown>[]),
        fishCycles: filterByBiz(fishCycles as Record<string, unknown>[]),
        transportOps: filterByBiz(transportOps as Record<string, unknown>[]),
        notifications: filterByBiz(notifications as Record<string, unknown>[], true),
        auditLogs: isSuperAdmin
          ? serializeDocs(auditLogs as Record<string, unknown>[])
          : filterByBiz(auditLogs as Record<string, unknown>[], true),
        erpUsers: sanitizedUsers,
      },
    });
  } catch (err) {
    console.error('ERP bootstrap error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load ERP data from MongoDB.' },
      { status: 500 }
    );
  }
}
