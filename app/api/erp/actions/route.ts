import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, parseUserPermissions } from '@/lib/auth';
import { seedInitialErpDataIfEmptyMongo } from '@/lib/erp-seed';
import { UserRole } from '@/lib/erp-types';

function cleanId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${Date.now()}-${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '');
}

function cap(val: unknown, max: number): string {
  return String(val ?? '').trim().slice(0, max);
}

async function writeAuditLog(params: {
  action: string;
  module: string;
  businessId: string;
  details: string;
  severity?: 'info' | 'warning' | 'critical';
  actorEmail: string;
  actorName?: string;
  actorRole?: string;
  actorPhoto?: string;
  actorDesignation?: string;
  ownerId: string;
}) {
  const db = await getDb();
  const id = cleanId('aud');
  await db.collection('audit_logs').insertOne({
    _id: id,
    action: cap(params.action, 100),
    module: cap(params.module, 64),
    businessId: cap(params.businessId || 'ALL', 128),
    details: cap(params.details, 500),
    severity: params.severity || 'info',
    actorEmail: cap(params.actorEmail || 'system@krishivumi.bd', 160),
    actorName: cap(params.actorName || '', 120),
    actorRole: cap(params.actorRole || '', 40),
    actorPhoto: cap(params.actorPhoto || '', 200000),
    actorDesignation: cap(params.actorDesignation || '', 100),
    ownerId: params.ownerId,
    createdAt: new Date(),
  } as unknown as never);
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, payload } = body as { action: string; payload: Record<string, unknown> };
    if (!action) {
      return NextResponse.json({ ok: false, error: 'Missing action.' }, { status: 400 });
    }

    const db = await getDb();
    const ownerId = sessionUser.ownerId;
    const actorEmail = sessionUser.email;
    const isSuperAdmin = sessionUser.role === 'super_admin';
    const isSuperManager = sessionUser.role === 'super_manager';
    const isBusinessManager = sessionUser.role === 'business_manager';
    const perms = parseUserPermissions(sessionUser.permissionsJson);
    const now = new Date();

    const checkBusinessAccess = (businessId?: string) => {
      if (isSuperAdmin || isSuperManager || sessionUser.assignedBusinesses === 'ALL') return true;
      if (!businessId || businessId === 'ALL') return false;
      const allowed = sessionUser.assignedBusinesses.split(',').map((s) => s.trim());
      return allowed.includes(businessId);
    };

    switch (action) {
      case 'seedInitialErpDataIfEmpty': {
        const seeded = await seedInitialErpDataIfEmptyMongo(ownerId, actorEmail);
        return NextResponse.json({ ok: true, result: seeded });
      }

      case 'logAuditEvent': {
        await writeAuditLog({
          action: cap(payload.action, 100),
          module: cap(payload.module, 64),
          businessId: cap(payload.businessId || 'ALL', 128),
          details: cap(payload.details, 500),
          severity: (payload.severity as 'info' | 'warning' | 'critical') || 'info',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'createDynamicBusiness': {
        if (!isSuperAdmin) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: Only the Super Admin can create new businesses.' },
            { status: 403 }
          );
        }
        const input = payload.input as Record<string, unknown>;
        const id = cleanId('biz');
        await db.collection('businesses').insertOne({
          _id: id,
          code: cap(input.code || `BIZ-${Date.now().toString().slice(-4)}`, 32),
          name: cap(input.name, 120),
          nameBn: cap(input.nameBn || input.name, 120),
          category: cap(input.category, 64),
          templateType: input.templateType || 'custom',
          description: cap(input.description, 500),
          iconName: cap(input.iconName || 'Building2', 40),
          location: cap(input.location || 'Dhaka, Bangladesh', 160),
          contactPhone: cap(input.contactPhone || '+880 1711-000000', 40),
          managerName: cap(input.managerName || 'Unassigned', 100),
          status: input.status || 'active',
          enabledModules: cap(input.enabledModules || 'accounting,inventory,reports', 600),
          customFieldsSpec: cap(input.customFieldsSpec || '', 1500),
          currency: cap(input.currency || 'BDT', 10),
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        await writeAuditLog({
          action: 'CREATE_BUSINESS',
          module: 'Business Registry',
          businessId: id,
          details: `Created dynamic business "${input.name}" (${input.templateType}) in ${input.location}`,
          severity: 'info',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true, result: id });
      }

      case 'updateDynamicBusinessStatus': {
        if (!isSuperAdmin) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: Only Super Admin can update business status.' },
            { status: 403 }
          );
        }
        const business = payload.business as { id: string; name: string };
        const newStatus = payload.newStatus as string;
        await db
          .collection('businesses')
          .updateOne(
            { _id: business.id as unknown as never, ownerId },
            { $set: { status: newStatus, updatedAt: now } }
          );
        await writeAuditLog({
          action: 'UPDATE_BUSINESS_STATUS',
          module: 'Business Registry',
          businessId: business.id,
          details: `Updated status of "${business.name}" to ${newStatus}`,
          severity: newStatus === 'archived' ? 'warning' : 'info',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'assignBusinessManager': {
        if (!isSuperAdmin && !isSuperManager) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: Only Super Admin and Super Manager can appoint business managers.' },
            { status: 403 }
          );
        }
        const { businessId, managerName, managerPhone } = payload as {
          businessId: string;
          managerName: string;
          managerPhone?: string;
        };
        const biz = await db.collection('businesses').findOne({ _id: businessId as unknown as never, ownerId });
        if (!biz) {
          return NextResponse.json({ ok: false, error: 'Business unit not found.' }, { status: 404 });
        }
        await db.collection('businesses').updateOne(
          { _id: businessId as unknown as never, ownerId },
          {
            $set: {
              managerName: cap(managerName, 120),
              contactPhone: cap(managerPhone || biz.contactPhone, 40),
              updatedAt: now,
            },
          }
        );
        await writeAuditLog({
          action: 'APPOINT_BUSINESS_MANAGER',
          module: 'Business & Team Management',
          businessId,
          details: `Appointed "${managerName}" as manager for "${biz.name}" by ${sessionUser.displayName || sessionUser.email} (${sessionUser.role})`,
          severity: 'info',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'postDoubleEntryTransaction': {
        if (sessionUser.role === 'employee' && !perms.canPostAccounting) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: You do not have accounting posting permission.' },
            { status: 403 }
          );
        }
        const input = payload.input as Record<string, unknown>;
        const bizId = cap(input.businessId, 128);
        if (bizId !== 'ALL' && !checkBusinessAccess(bizId)) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: You do not have access to this business.' },
            { status: 403 }
          );
        }
        const amount = Math.max(0, Number(input.amount) || 0);
        const entryId = cleanId('je');

        await db.collection('journal_entries').insertOne({
          _id: entryId,
          referenceNo: cap(input.referenceNo || `JV-${Date.now().toString().slice(-6)}`, 64),
          date: cap(input.date, 32),
          businessId: bizId,
          businessName: cap(input.businessName, 120),
          transactionType: input.transactionType,
          category: cap(input.category, 80),
          description: cap(input.description, 400),
          debitAccountId: cap(input.debitAccountId, 128),
          debitAccountName: cap(input.debitAccountName, 120),
          creditAccountId: cap(input.creditAccountId, 128),
          creditAccountName: cap(input.creditAccountName, 120),
          amount,
          paymentStatus: input.paymentStatus || 'paid',
          dueAmount: Math.max(0, Number(input.dueAmount) || 0),
          counterpartyName: cap(input.counterpartyName || 'Internal / Direct', 120),
          status: 'posted',
          reversedByEntryId: '',
          actorEmail: sessionUser.email,
          actorName: sessionUser.displayName || sessionUser.email,
          actorRole: sessionUser.role,
          actorDesignation: sessionUser.designation || (sessionUser.role === 'super_admin' ? 'Super Admin' : sessionUser.role === 'super_manager' ? 'General Manager' : 'Officer'),
          actorPhoto: sessionUser.photoUrl || '',
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        const debitAcc = await db
          .collection('accounts')
          .findOne({ _id: cap(input.debitAccountId, 128) as unknown as never, ownerId });
        const creditAcc = await db
          .collection('accounts')
          .findOne({ _id: cap(input.creditAccountId, 128) as unknown as never, ownerId });

        if (debitAcc) {
          const isDebitNormal =
            debitAcc.accountType === 'asset' || debitAcc.accountType === 'expense';
          const delta = isDebitNormal ? amount : -amount;
          await db
            .collection('accounts')
            .updateOne(
              { _id: debitAcc._id },
              { $set: { balance: Number(debitAcc.balance) + delta, updatedAt: now } }
            );
        }

        if (creditAcc) {
          const isDebitNormal =
            creditAcc.accountType === 'asset' || creditAcc.accountType === 'expense';
          const delta = isDebitNormal ? -amount : amount;
          await db
            .collection('accounts')
            .updateOne(
              { _id: creditAcc._id },
              { $set: { balance: Number(creditAcc.balance) + delta, updatedAt: now } }
            );
        }

        await writeAuditLog({
          action: 'POST_JOURNAL_ENTRY',
          module: 'Central Accounting',
          businessId: bizId,
          details: `Posted ${String(input.transactionType).toUpperCase()} (${input.referenceNo}) for BDT ${amount}: DR ${input.debitAccountName} / CR ${input.creditAccountName}`,
          severity: 'info',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'reversePostedJournalEntry': {
        if (!isSuperAdmin && !perms.canReverseTransactions) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: Only authorized admins can reverse journal entries.' },
            { status: 403 }
          );
        }
        const reqEntry = payload.entry as { id: string };
        const entry = await db
          .collection('journal_entries')
          .findOne({ _id: reqEntry.id as unknown as never, ownerId });
        if (!entry || entry.status === 'reversed') {
          return NextResponse.json({ ok: true });
        }

        const reversalId = cleanId('je-rev');
        await db.collection('journal_entries').updateOne(
          { _id: entry._id },
          { $set: { status: 'reversed', reversedByEntryId: reversalId, updatedAt: now } }
        );

        await db.collection('journal_entries').insertOne({
          _id: reversalId,
          referenceNo: cap(`REV-${entry.referenceNo}`, 64),
          date: new Date().toISOString().split('T')[0],
          businessId: entry.businessId,
          businessName: entry.businessName,
          transactionType: 'reversal',
          category: cap(`Reversal of ${entry.referenceNo}`, 80),
          description: cap(`Counter-entry reversing ${entry.referenceNo}: ${entry.description}`, 400),
          debitAccountId: entry.creditAccountId,
          debitAccountName: entry.creditAccountName,
          creditAccountId: entry.debitAccountId,
          creditAccountName: entry.debitAccountName,
          amount: Number(entry.amount),
          paymentStatus: 'paid',
          dueAmount: 0,
          counterpartyName: entry.counterpartyName,
          status: 'posted',
          reversedByEntryId: String(entry._id),
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        const origDebitAcc = await db
          .collection('accounts')
          .findOne({ _id: entry.debitAccountId as unknown as never, ownerId });
        const origCreditAcc = await db
          .collection('accounts')
          .findOne({ _id: entry.creditAccountId as unknown as never, ownerId });

        const amt = Number(entry.amount);
        if (origDebitAcc) {
          const isDebitNormal =
            origDebitAcc.accountType === 'asset' || origDebitAcc.accountType === 'expense';
          const delta = isDebitNormal ? -amt : amt;
          await db
            .collection('accounts')
            .updateOne(
              { _id: origDebitAcc._id },
              { $set: { balance: Number(origDebitAcc.balance) + delta, updatedAt: now } }
            );
        }
        if (origCreditAcc) {
          const isDebitNormal =
            origCreditAcc.accountType === 'asset' || origCreditAcc.accountType === 'expense';
          const delta = isDebitNormal ? amt : -amt;
          await db
            .collection('accounts')
            .updateOne(
              { _id: origCreditAcc._id },
              { $set: { balance: Number(origCreditAcc.balance) + delta, updatedAt: now } }
            );
        }

        await writeAuditLog({
          action: 'REVERSE_JOURNAL_ENTRY',
          module: 'Central Accounting',
          businessId: String(entry.businessId),
          details: `Reversed transaction ${entry.referenceNo} via counter-entry REV-${entry.referenceNo} (BDT ${amt})`,
          severity: 'warning',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'createInventoryItemWithMovement': {
        const input = payload.input as Record<string, unknown>;
        const bizId = cap(input.businessId, 128);
        if (!checkBusinessAccess(bizId)) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }
        const itemId = cleanId('inv');
        const movId = cleanId('mov');
        const qty = Math.max(0, Number(input.quantity) || 0);
        const unitCost = Math.max(0, Number(input.unitCost) || 0);

        await db.collection('inventory').insertOne({
          _id: itemId,
          sku: cap(input.sku, 64),
          barcode: cap(input.barcode || `894${Date.now().toString().slice(-9)}`, 64),
          name: cap(input.name, 140),
          category: input.category,
          businessId: bizId,
          businessName: cap(input.businessName, 120),
          warehouse: cap(input.warehouse || 'Central Agro Warehouse', 100),
          unit: cap(input.unit || 'KG', 24),
          quantity: qty,
          reorderLevel: Math.max(0, Number(input.reorderLevel) || 0),
          unitCost,
          sellingPrice: Math.max(0, Number(input.sellingPrice) || 0),
          expiryDate: cap(input.expiryDate || '', 32),
          supplierName: cap(input.supplierName || 'Direct Vendor', 120),
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        await db.collection('stock_movements').insertOne({
          _id: movId,
          itemId,
          itemName: cap(input.name, 140),
          businessId: bizId,
          movementType: 'purchase',
          quantity: qty,
          unitCost,
          sourceLocation: cap(input.supplierName || 'Supplier Opening', 100),
          destinationLocation: cap(input.warehouse || 'Central Agro Warehouse', 100),
          notes: 'Initial stock registration',
          date: new Date().toISOString().split('T')[0],
          ownerId,
          createdAt: now,
        } as unknown as never);

        await writeAuditLog({
          action: 'CREATE_INVENTORY_ITEM',
          module: 'Inventory',
          businessId: bizId,
          details: `Added SKU ${input.sku} (${input.name}) — Qty: ${qty} ${input.unit}`,
          severity: 'info',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'recordStockMovement': {
        const reqItem = payload.item as { id: string };
        const item = await db
          .collection('inventory')
          .findOne({ _id: reqItem.id as unknown as never, ownerId });
        if (!item) {
          return NextResponse.json({ ok: false, error: 'Inventory item not found' }, { status: 404 });
        }
        if (!checkBusinessAccess(String(item.businessId))) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }
        const movementType = payload.movementType as
          | 'purchase'
          | 'consumption'
          | 'sale'
          | 'transfer'
          | 'adjustment';
        const quantity = Number(payload.quantity) || 0;
        const sourceLocation = String(payload.sourceLocation || '');
        const destinationLocation = String(payload.destinationLocation || '');
        const notes = String(payload.notes || '');

        const delta =
          movementType === 'purchase'
            ? Math.abs(quantity)
            : movementType === 'consumption' || movementType === 'sale'
            ? -Math.abs(quantity)
            : quantity;
        const newQty = Math.max(0, Number(item.quantity) + delta);
        const movId = cleanId('mov');

        await db.collection('inventory').updateOne(
          { _id: item._id },
          {
            $set: {
              quantity: newQty,
              warehouse:
                movementType === 'transfer' ? cap(destinationLocation, 100) : item.warehouse,
              updatedAt: now,
            },
          }
        );

        await db.collection('stock_movements').insertOne({
          _id: movId,
          itemId: String(item._id),
          itemName: item.name,
          businessId: item.businessId,
          movementType,
          quantity: Math.abs(quantity),
          unitCost: item.unitCost,
          sourceLocation: cap(sourceLocation || item.warehouse, 100),
          destinationLocation: cap(destinationLocation || item.warehouse, 100),
          notes: cap(notes || `${movementType} recorded`, 300),
          date: new Date().toISOString().split('T')[0],
          ownerId,
          createdAt: now,
        } as unknown as never);

        await writeAuditLog({
          action: 'STOCK_MOVEMENT',
          module: 'Inventory',
          businessId: String(item.businessId),
          details: `${movementType.toUpperCase()} ${Math.abs(quantity)} ${item.unit} of ${item.name} (New Stock: ${newQty})`,
          severity: newQty <= Number(item.reorderLevel) ? 'warning' : 'info',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'createPoultryBatchRecord': {
        const input = payload.input as Record<string, unknown>;
        const bizId = cap(input.businessId, 128);
        if (!checkBusinessAccess(bizId)) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }
        const id = cleanId('poultry');
        await db.collection('poultry_batches').insertOne({
          ...input,
          _id: id,
          batchCode: cap(input.batchCode, 40),
          businessId: bizId,
          chickPurchaseDate: cap(input.chickPurchaseDate, 32),
          shedNumber: cap(input.shedNumber, 40),
          supplierName: cap(input.supplierName, 120),
          gradeBreakdown: cap(input.gradeBreakdown, 200),
          vaccineScheduleNotes: cap(input.vaccineScheduleNotes, 300),
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        await writeAuditLog({
          action: 'CREATE_POULTRY_BATCH',
          module: 'Poultry Management',
          businessId: bizId,
          details: `Created poultry batch ${input.batchCode} (${input.chickenType}, ${input.initialQuantity} birds)`,
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'updatePoultryBatchDailyRecord': {
        const reqBatch = payload.batch as { id: string; businessId: string; batchCode: string };
        const updates = payload.updates as Record<string, unknown>;
        const existing = await db
          .collection('poultry_batches')
          .findOne({ _id: reqBatch.id as unknown as never, ownerId });
        if (!existing) {
          return NextResponse.json({ ok: false, error: 'Batch not found' }, { status: 404 });
        }
        if (!checkBusinessAccess(String(existing.businessId))) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }
        await db.collection('poultry_batches').updateOne(
          { _id: existing._id },
          {
            $set: {
              mortalityCount: updates.mortalityCount ?? existing.mortalityCount,
              sickBirdsCount: updates.sickBirdsCount ?? existing.sickBirdsCount,
              soldBirdsCount: updates.soldBirdsCount ?? existing.soldBirdsCount,
              starterFeedKg: updates.starterFeedKg ?? existing.starterFeedKg,
              growerFeedKg: updates.growerFeedKg ?? existing.growerFeedKg,
              finisherFeedKg: updates.finisherFeedKg ?? existing.finisherFeedKg,
              feedCost: updates.feedCost ?? existing.feedCost,
              medicineCost: updates.medicineCost ?? existing.medicineCost,
              labourAndUtilityCost: updates.labourAndUtilityCost ?? existing.labourAndUtilityCost,
              otherExpense: updates.otherExpense ?? existing.otherExpense,
              totalSoldKg: updates.totalSoldKg ?? existing.totalSoldKg,
              gradeBreakdown: cap(updates.gradeBreakdown ?? existing.gradeBreakdown, 200),
              pricePerKg: updates.pricePerKg ?? existing.pricePerKg,
              totalSalesRevenue: updates.totalSalesRevenue ?? existing.totalSalesRevenue,
              outstandingDue: updates.outstandingDue ?? existing.outstandingDue,
              vaccineScheduleNotes: cap(
                updates.vaccineScheduleNotes ?? existing.vaccineScheduleNotes,
                300
              ),
              status: updates.status ?? existing.status,
              updatedAt: now,
            },
          }
        );
        await writeAuditLog({
          action: 'UPDATE_POULTRY_BATCH',
          module: 'Poultry Management',
          businessId: String(existing.businessId),
          details: `Updated batch ${existing.batchCode} operational metrics`,
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'createLivestockAnimalRecord': {
        const input = payload.input as Record<string, unknown>;
        const bizId = cap(input.businessId, 128);
        if (!checkBusinessAccess(bizId)) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }
        const id = cleanId('live');
        const species = String(input.species || 'cattle');
        await db.collection('livestock_records').insertOne({
          ...input,
          _id: id,
          animalTag: cap(input.animalTag, 40),
          businessId: bizId,
          name: cap(input.name, 80),
          breed: cap(input.breed, 80),
          purchaseDate: cap(input.purchaseDate, 32),
          vaccinationHistory: cap(input.vaccinationHistory, 300),
          breedingAndOffspringNotes: cap(input.breedingAndOffspringNotes, 300),
          parentTag: cap(input.parentTag || 'Foundation Stock', 40),
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        await writeAuditLog({
          action: `CREATE_${species.toUpperCase()}_RECORD`,
          module: species === 'cattle' ? 'Cattle Management' : 'Goat Management',
          businessId: bizId,
          details: `Registered ${species} tag ${input.animalTag} (${input.breed})`,
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'updateLivestockAnimalRecord': {
        const reqAnimal = payload.animal as { id: string };
        const updates = payload.updates as Record<string, unknown>;
        const existing = await db
          .collection('livestock_records')
          .findOne({ _id: reqAnimal.id as unknown as never, ownerId });
        if (!existing) {
          return NextResponse.json({ ok: false, error: 'Livestock record not found' }, { status: 404 });
        }
        if (!checkBusinessAccess(String(existing.businessId))) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }
        await db.collection('livestock_records').updateOne(
          { _id: existing._id },
          {
            $set: {
              ageMonths: updates.ageMonths ?? existing.ageMonths,
              currentWeightKg: updates.currentWeightKg ?? existing.currentWeightKg,
              healthStatus: updates.healthStatus ?? existing.healthStatus,
              feedCost: updates.feedCost ?? existing.feedCost,
              medicineAndVetCost: updates.medicineAndVetCost ?? existing.medicineAndVetCost,
              vaccinationHistory: cap(
                updates.vaccinationHistory ?? existing.vaccinationHistory,
                300
              ),
              breedingAndOffspringNotes: cap(
                updates.breedingAndOffspringNotes ?? existing.breedingAndOffspringNotes,
                300
              ),
              totalMilkLiters: updates.totalMilkLiters ?? existing.totalMilkLiters,
              milkSalesRevenue: updates.milkSalesRevenue ?? existing.milkSalesRevenue,
              animalSalePrice: updates.animalSalePrice ?? existing.animalSalePrice,
              status: updates.status ?? existing.status,
              updatedAt: now,
            },
          }
        );
        const species = String(existing.species || 'cattle');
        await writeAuditLog({
          action: `UPDATE_${species.toUpperCase()}_RECORD`,
          module: species === 'cattle' ? 'Cattle Management' : 'Goat Management',
          businessId: String(existing.businessId),
          details: `Updated ${existing.animalTag} weight/milk/health profile`,
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'createFishCycleRecord': {
        const input = payload.input as Record<string, unknown>;
        const bizId = cap(input.businessId, 128);
        if (!checkBusinessAccess(bizId)) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }
        const id = cleanId('fish');
        await db.collection('fish_cycles').insertOne({
          ...input,
          _id: id,
          cycleCode: cap(input.cycleCode, 40),
          pondId: cap(input.pondId, 40),
          pondName: cap(input.pondName, 80),
          businessId: bizId,
          location: cap(input.location, 120),
          waterQualityNotes: cap(input.waterQualityNotes, 200),
          fishSpecies: cap(input.fishSpecies, 160),
          stockingDate: cap(input.stockingDate, 32),
          harvestDate: cap(input.harvestDate || 'Scheduled', 32),
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        await writeAuditLog({
          action: 'CREATE_FISH_CYCLE',
          module: 'Fish Management',
          businessId: bizId,
          details: `Started aquaculture cycle ${input.cycleCode} in ${input.pondName} (${input.fishSpecies})`,
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'updateFishCycleRecord': {
        const reqCycle = payload.cycle as { id: string };
        const updates = payload.updates as Record<string, unknown>;
        const existing = await db
          .collection('fish_cycles')
          .findOne({ _id: reqCycle.id as unknown as never, ownerId });
        if (!existing) {
          return NextResponse.json({ ok: false, error: 'Fish cycle not found' }, { status: 404 });
        }
        if (!checkBusinessAccess(String(existing.businessId))) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }
        await db.collection('fish_cycles').updateOne(
          { _id: existing._id },
          {
            $set: {
              waterQualityNotes: cap(
                updates.waterQualityNotes ?? existing.waterQualityNotes,
                200
              ),
              mortalityCount: updates.mortalityCount ?? existing.mortalityCount,
              feedCost: updates.feedCost ?? existing.feedCost,
              medicineAndLimeCost: updates.medicineAndLimeCost ?? existing.medicineAndLimeCost,
              labourCost: updates.labourCost ?? existing.labourCost,
              harvestDate: cap(updates.harvestDate ?? existing.harvestDate, 32),
              harvestWeightKg: updates.harvestWeightKg ?? existing.harvestWeightKg,
              totalSalesRevenue: updates.totalSalesRevenue ?? existing.totalSalesRevenue,
              status: updates.status ?? existing.status,
              updatedAt: now,
            },
          }
        );
        await writeAuditLog({
          action: 'UPDATE_FISH_CYCLE',
          module: 'Fish Management',
          businessId: String(existing.businessId),
          details: `Updated pond ${existing.pondId} (${existing.cycleCode}) feed/water/harvest records`,
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'createTransportOpRecord': {
        const input = payload.input as Record<string, unknown>;
        const bizId = cap(input.businessId, 128);
        if (!checkBusinessAccess(bizId)) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }
        const id = cleanId('trp');
        await db.collection('transport_ops').insertOne({
          ...input,
          _id: id,
          tripOrVehicleCode: cap(input.tripOrVehicleCode, 40),
          businessId: bizId,
          registrationNumber: cap(input.registrationNumber, 60),
          vehicleType: cap(input.vehicleType, 60),
          driverName: cap(input.driverName, 100),
          origin: cap(input.origin, 100),
          destination: cap(input.destination, 100),
          cargoDetails: cap(input.cargoDetails, 200),
          customerName: cap(input.customerName, 120),
          maintenanceDetails: cap(input.maintenanceDetails, 240),
          insuranceExpiry: cap(input.insuranceExpiry, 32),
          fitnessExpiry: cap(input.fitnessExpiry, 32),
          taxTokenExpiry: cap(input.taxTokenExpiry, 32),
          nextServiceDate: cap(input.nextServiceDate, 32),
          date: cap(input.date, 32),
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        await writeAuditLog({
          action: 'CREATE_TRANSPORT_OP',
          module: 'Transport Management',
          businessId: bizId,
          details: `Logged transport record ${input.tripOrVehicleCode} for vehicle ${input.registrationNumber}`,
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'updateTransportOpRecord': {
        const reqOp = payload.op as { id: string };
        const updates = payload.updates as Record<string, unknown>;
        const existing = await db
          .collection('transport_ops')
          .findOne({ _id: reqOp.id as unknown as never, ownerId });
        if (!existing) {
          return NextResponse.json({ ok: false, error: 'Transport record not found' }, { status: 404 });
        }
        if (!checkBusinessAccess(String(existing.businessId))) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }
        await db.collection('transport_ops').updateOne(
          { _id: existing._id },
          {
            $set: {
              driverName: cap(updates.driverName ?? existing.driverName, 100),
              fuelCost: updates.fuelCost ?? existing.fuelCost,
              tollCost: updates.tollCost ?? existing.tollCost,
              driverAllowance: updates.driverAllowance ?? existing.driverAllowance,
              maintenanceCost: updates.maintenanceCost ?? existing.maintenanceCost,
              maintenanceDetails: cap(
                updates.maintenanceDetails ?? existing.maintenanceDetails,
                240
              ),
              tripRevenue: updates.tripRevenue ?? existing.tripRevenue,
              outstandingDue: updates.outstandingDue ?? existing.outstandingDue,
              insuranceExpiry: cap(updates.insuranceExpiry ?? existing.insuranceExpiry, 32),
              fitnessExpiry: cap(updates.fitnessExpiry ?? existing.fitnessExpiry, 32),
              taxTokenExpiry: cap(updates.taxTokenExpiry ?? existing.taxTokenExpiry, 32),
              nextServiceDate: cap(updates.nextServiceDate ?? existing.nextServiceDate, 32),
              status: updates.status ?? existing.status,
              updatedAt: now,
            },
          }
        );
        await writeAuditLog({
          action: 'UPDATE_TRANSPORT_OP',
          module: 'Transport Management',
          businessId: String(existing.businessId),
          details: `Updated transport/vehicle ${existing.tripOrVehicleCode} (${existing.registrationNumber})`,
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'createStakeholderRecord': {
        const input = payload.input as Record<string, unknown>;
        let bizId = cap(input.businessId, 128);

        // Business Manager can ONLY create staff for their own assigned business!
        if (isBusinessManager) {
          bizId = sessionUser.assignedBusinesses;
          if (!bizId || bizId === 'ALL') {
            return NextResponse.json(
              { ok: false, error: 'RBAC Denied: Business manager must have a specific assigned business unit.' },
              { status: 403 }
            );
          }
          if (input.stakeholderType && input.stakeholderType !== 'employee') {
            return NextResponse.json(
              { ok: false, error: 'RBAC Denied: Business managers can only hire/register employees for their own unit.' },
              { status: 403 }
            );
          }
        } else if (bizId !== 'ALL' && !checkBusinessAccess(bizId)) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }

        const id = cleanId('stk');
        const stkType = String(input.stakeholderType || 'employee');
        const joiningDate = cap(input.joiningDate || input.appointedAt || now.toISOString().split('T')[0], 32);
        const salaryEffectiveFrom = cap(input.salaryEffectiveFrom || joiningDate, 32);

        await db.collection('stakeholders').insertOne({
          ...input,
          _id: id,
          code: cap(input.code, 40),
          name: cap(input.name, 120),
          phone: cap(input.phone, 40),
          email: cap(input.email, 120),
          address: cap(input.address, 240),
          businessId: bizId,
          businessName: cap(input.businessName, 120),
          designationOrCategory: cap(input.designationOrCategory, 100),
          monthlySalaryOrCreditLimit: Number(input.monthlySalaryOrCreditLimit) || 0,
          outstandingBalance: Number(input.outstandingBalance) || 0,
          appointedBy: sessionUser.displayName || sessionUser.email,
          appointedByRole: sessionUser.role,
          appointedAt: now.toISOString(),
          joiningDate,
          salaryEffectiveFrom,
          photoUrl: cap(input.photoUrl || '', 200000),
          nidNumber: cap(input.nidNumber || '', 50),
          emergencyContact: cap(input.emergencyContact || '', 60),
          status: input.status || 'active',
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        await writeAuditLog({
          action: `CREATE_${stkType.toUpperCase()}`,
          module: 'Stakeholder & HR',
          businessId: bizId,
          details: `Added ${stkType} ${input.name} (${input.code}) appointed by ${sessionUser.displayName || sessionUser.email} (${sessionUser.role})`,
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true, result: id });
      }

      case 'updateStakeholderRecord': {
        const { stakeholderId, updates } = payload as {
          stakeholderId: string;
          updates: Record<string, unknown>;
        };
        const existing = await db
          .collection('stakeholders')
          .findOne({ _id: stakeholderId as unknown as never, ownerId });
        if (!existing) {
          return NextResponse.json({ ok: false, error: 'Stakeholder not found.' }, { status: 404 });
        }

        // Business Manager can only update their own business employees
        if (isBusinessManager && existing.businessId !== sessionUser.assignedBusinesses) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: You can only update employees of your assigned business.' },
            { status: 403 }
          );
        }

        const safeUpdates: Record<string, unknown> = {
          updatedAt: now,
        };
        if (updates.name) safeUpdates.name = cap(updates.name, 120);
        if (updates.phone) safeUpdates.phone = cap(updates.phone, 40);
        if (updates.email !== undefined) safeUpdates.email = cap(updates.email, 120);
        if (updates.address !== undefined) safeUpdates.address = cap(updates.address, 240);
        if (updates.designationOrCategory) safeUpdates.designationOrCategory = cap(updates.designationOrCategory, 100);
        if (updates.monthlySalaryOrCreditLimit !== undefined) safeUpdates.monthlySalaryOrCreditLimit = Number(updates.monthlySalaryOrCreditLimit) || 0;
        if (updates.joiningDate !== undefined) safeUpdates.joiningDate = cap(updates.joiningDate, 32);
        if (updates.salaryEffectiveFrom !== undefined) safeUpdates.salaryEffectiveFrom = cap(updates.salaryEffectiveFrom, 32);
        if (updates.photoUrl !== undefined) safeUpdates.photoUrl = cap(updates.photoUrl, 200000);
        if (updates.nidNumber !== undefined) safeUpdates.nidNumber = cap(updates.nidNumber, 50);
        if (updates.emergencyContact !== undefined) safeUpdates.emergencyContact = cap(updates.emergencyContact, 60);
        if (updates.status) safeUpdates.status = updates.status;

        await db
          .collection('stakeholders')
          .updateOne({ _id: existing._id }, { $set: safeUpdates });

        await writeAuditLog({
          action: 'UPDATE_STAKEHOLDER',
          module: 'Stakeholder & HR',
          businessId: existing.businessId,
          details: `Updated ${existing.stakeholderType} "${existing.name}" by ${sessionUser.displayName}`,
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'deleteStakeholderRecord': {
        const { stakeholderId } = payload as { stakeholderId: string };
        const existing = await db
          .collection('stakeholders')
          .findOne({ _id: stakeholderId as unknown as never, ownerId });
        if (!existing) {
          return NextResponse.json({ ok: true });
        }

        // Business Manager can only delete/terminate their own business employees
        if (isBusinessManager && existing.businessId !== sessionUser.assignedBusinesses) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: You can only terminate employees of your assigned business.' },
            { status: 403 }
          );
        }

        await db.collection('stakeholders').deleteOne({ _id: existing._id });

        await writeAuditLog({
          action: 'TERMINATE_EMPLOYEE_STAKEHOLDER',
          module: 'Stakeholder & HR',
          businessId: existing.businessId,
          details: `Terminated / Removed employee "${existing.name}" (${existing.code}) by ${sessionUser.displayName} (${sessionUser.role})`,
          severity: 'warning',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'markNotificationAsRead': {
        const notification = payload.notification as { id: string };
        await db
          .collection('notifications')
          .updateOne(
            { _id: notification.id as unknown as never, ownerId },
            { $set: { isRead: true, updatedAt: now } }
          );
        return NextResponse.json({ ok: true });
      }

      case 'createNotificationRecord': {
        const input = payload.input as Record<string, unknown>;
        const id = cleanId('ntf');
        await db.collection('notifications').insertOne({
          _id: id,
          title: cap(input.title, 140),
          message: cap(input.message, 400),
          category: cap(input.category || 'system', 60),
          priority: cap(input.priority || 'medium', 20),
          businessId: cap(input.businessId || 'ALL', 128),
          isRead: false,
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);
        return NextResponse.json({ ok: true, result: id });
      }

      case 'createErpUserAccount': {
        // Permissions check: Super Admin, Super Manager, or Business Manager (for employee only)
        if (!isSuperAdmin && !isSuperManager && !isBusinessManager) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: You do not have permission to create user accounts.' },
            { status: 403 }
          );
        }
        const input = payload.input as {
          email: string;
          displayName: string;
          password?: string;
          role: string;
          assignedBusinesses: string;
          permissionsJson: string;
          status?: string;
          mfaEnabled?: boolean;
          phone?: string;
          monthlySalary?: number;
        };

        const normalizedEmail = cap(input.email, 160).toLowerCase();
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
          return NextResponse.json({ ok: false, error: 'Valid email is required.' }, { status: 400 });
        }

        // Strictly protect Super Admin uniqueness
        if (input.role === 'super_admin') {
          return NextResponse.json(
            {
              ok: false,
              error:
                'Security Policy: Only ONE Super Admin (Owner) can exist. Assign Super Manager, Business Manager or Employee role instead.',
            },
            { status: 403 }
          );
        }

        // Business Manager can ONLY create 'employee' under their own business
        if (isBusinessManager && input.role !== 'employee') {
          return NextResponse.json(
            {
              ok: false,
              error: 'RBAC Denied: Business Managers can only hire/create Employee accounts for their own unit.',
            },
            { status: 403 }
          );
        }

        // Super Manager can create 'business_manager' or 'employee', but not 'super_manager' or 'super_admin'
        if (isSuperManager && input.role === 'super_manager') {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: Only Super Admin (Owner) can appoint a Super Manager.' },
            { status: 403 }
          );
        }

        const safeRole: UserRole =
          input.role === 'super_manager' && isSuperAdmin
            ? 'super_manager'
            : input.role === 'business_manager' && (isSuperAdmin || isSuperManager)
            ? 'business_manager'
            : 'employee';

        const assignedBiz = isBusinessManager
          ? sessionUser.assignedBusinesses
          : cap(input.assignedBusinesses || 'ALL', 1000);

        const existingEmail = await db.collection('users').findOne({ email: normalizedEmail });
        if (existingEmail) {
          return NextResponse.json(
            { ok: false, error: `User with email "${normalizedEmail}" already exists.` },
            { status: 409 }
          );
        }

        const rawPassword = String(input.password || '').trim() || 'Krishi@1234';
        if (rawPassword.length < 6) {
          return NextResponse.json(
            { ok: false, error: 'Password must be at least 6 characters.' },
            { status: 400 }
          );
        }
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const newUserId = cleanId('usr');
        await db.collection('users').insertOne({
          _id: newUserId,
          uid: newUserId,
          email: normalizedEmail,
          displayName: cap(input.displayName, 120),
          passwordHash,
          role: safeRole,
          assignedBusinesses: assignedBiz,
          permissionsJson: cap(input.permissionsJson || '{}', 4000),
          status: input.status || 'active',
          mfaEnabled: Boolean(input.mfaEnabled ?? true),
          phone: cap(input.phone || '', 40),
          photoUrl: cap((input as Record<string, unknown>).photoUrl || '', 200000),
          nidNumber: cap((input as Record<string, unknown>).nidNumber || '', 50),
          designation: cap((input as Record<string, unknown>).designation || '', 100),
          address: cap((input as Record<string, unknown>).address || '', 240),
          emergencyContact: cap((input as Record<string, unknown>).emergencyContact || '', 60),
          monthlySalary: Number(input.monthlySalary) || 0,
          appointedBy: sessionUser.displayName || sessionUser.email,
          appointedByRole: sessionUser.role,
          lastLoginAt: '',
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        await writeAuditLog({
          action: 'CREATE_USER_ACCESS',
          module: 'User & RBAC Security',
          businessId: assignedBiz,
          details: `Created ERP user "${input.displayName}" (${normalizedEmail}) with role [${safeRole}] and business [${assignedBiz}] appointed by ${sessionUser.displayName} (${sessionUser.role})`,
          severity: 'info',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true, result: newUserId });
      }

      case 'updateErpUserPermissions': {
        const targetUser = payload.targetUser as { id: string };
        const updates = payload.updates as {
          displayName?: string;
          role?: string;
          assignedBusinesses?: string;
          permissionsJson?: string;
          status?: string;
          mfaEnabled?: boolean;
          password?: string;
          phone?: string;
          photoUrl?: string;
          nidNumber?: string;
          designation?: string;
          address?: string;
          emergencyContact?: string;
          monthlySalary?: number;
        };

        const existingUser = await db
          .collection('users')
          .findOne({ _id: targetUser.id as unknown as never, ownerId });
        if (!existingUser) {
          return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 });
        }

        // Permissions boundary checks:
        if (isBusinessManager) {
          if (existingUser.role !== 'employee' || existingUser.assignedBusinesses !== sessionUser.assignedBusinesses) {
            return NextResponse.json(
              { ok: false, error: 'RBAC Denied: You can only edit employees of your own business.' },
              { status: 403 }
            );
          }
        } else if (isSuperManager) {
          if (existingUser.role === 'super_admin' || existingUser.role === 'super_manager') {
            return NextResponse.json(
              { ok: false, error: 'RBAC Denied: Super Manager cannot modify Super Admin or other Super Managers.' },
              { status: 403 }
            );
          }
        } else if (!isSuperAdmin && !perms.canManageUsers) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: You do not have permission to edit user permissions.' },
            { status: 403 }
          );
        }

        // Protect sole super_admin integrity
        if (existingUser.role === 'super_admin' && updates.role && updates.role !== 'super_admin') {
          return NextResponse.json(
            { ok: false, error: 'Cannot downgrade the sole Super Admin account.' },
            { status: 403 }
          );
        }
        if (existingUser.role !== 'super_admin' && updates.role === 'super_admin') {
          return NextResponse.json(
            {
              ok: false,
              error: 'Security Policy: Only ONE Super Admin is permitted in the system.',
            },
            { status: 403 }
          );
        }

        let targetRole = existingUser.role;
        if (isSuperAdmin && updates.role) {
          targetRole = updates.role;
        } else if (isSuperManager && updates.role) {
          targetRole = updates.role === 'business_manager' ? 'business_manager' : 'employee';
        }

        const setFields: Record<string, unknown> = {
          displayName: cap(updates.displayName ?? existingUser.displayName, 120),
          role: existingUser.role === 'super_admin' ? 'super_admin' : targetRole,
          assignedBusinesses: isBusinessManager
            ? existingUser.assignedBusinesses
            : cap(updates.assignedBusinesses ?? existingUser.assignedBusinesses, 1000),
          permissionsJson: cap(updates.permissionsJson ?? existingUser.permissionsJson, 4000),
          status:
            existingUser.role === 'super_admin'
              ? 'active'
              : updates.status ?? existingUser.status,
          mfaEnabled: Boolean(updates.mfaEnabled ?? existingUser.mfaEnabled),
          updatedAt: now,
        };

        if (updates.phone !== undefined) setFields.phone = cap(updates.phone, 40);
        if (updates.photoUrl !== undefined) setFields.photoUrl = cap(updates.photoUrl, 200000);
        if (updates.nidNumber !== undefined) setFields.nidNumber = cap(updates.nidNumber, 50);
        if (updates.designation !== undefined) setFields.designation = cap(updates.designation, 100);
        if (updates.address !== undefined) setFields.address = cap(updates.address, 240);
        if (updates.emergencyContact !== undefined) setFields.emergencyContact = cap(updates.emergencyContact, 60);
        if (updates.monthlySalary !== undefined) setFields.monthlySalary = Number(updates.monthlySalary) || 0;

        if (updates.password && updates.password.trim().length >= 6) {
          setFields.passwordHash = await bcrypt.hash(updates.password.trim(), 10);
        }

        await db
          .collection('users')
          .updateOne({ _id: existingUser._id }, { $set: setFields });

        await writeAuditLog({
          action: 'UPDATE_USER_PERMISSIONS',
          module: 'User & RBAC Security',
          businessId: String(setFields.assignedBusinesses),
          details: `Updated user "${setFields.displayName}" (${existingUser.email}) -> Role: ${setFields.role}, Status: ${setFields.status} by ${sessionUser.displayName}`,
          severity: 'warning',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'deleteErpUserAccount': {
        const targetUser = payload.targetUser as { id: string };
        const existingUser = await db
          .collection('users')
          .findOne({ _id: targetUser.id as unknown as never, ownerId });
        if (!existingUser) {
          return NextResponse.json({ ok: true });
        }

        if (existingUser.role === 'super_admin' || String(existingUser._id) === ownerId) {
          return NextResponse.json(
            { ok: false, error: 'Cannot delete the sole Super Admin account.' },
            { status: 403 }
          );
        }

        // Permissions boundary checks:
        if (isBusinessManager) {
          if (existingUser.role !== 'employee' || existingUser.assignedBusinesses !== sessionUser.assignedBusinesses) {
            return NextResponse.json(
              { ok: false, error: 'RBAC Denied: You can only remove employees of your own business.' },
              { status: 403 }
            );
          }
        } else if (isSuperManager) {
          if (existingUser.role === 'super_admin' || existingUser.role === 'super_manager') {
            return NextResponse.json(
              { ok: false, error: 'RBAC Denied: Super Manager cannot delete Super Admin or Super Managers.' },
              { status: 403 }
            );
          }
        } else if (!isSuperAdmin && !perms.canManageUsers) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: You do not have permission to delete users.' },
            { status: 403 }
          );
        }

        await db.collection('users').deleteOne({ _id: existingUser._id });
        await writeAuditLog({
          action: 'DELETE_USER_ACCESS',
          module: 'User & RBAC Security',
          businessId: existingUser.assignedBusinesses || 'ALL',
          details: `Revoked & deleted user account "${existingUser.displayName}" (${existingUser.email}, role: ${existingUser.role}) by ${sessionUser.displayName}`,
          severity: 'critical',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'updateUserProfile': {
        const payloadData = (payload || {}) as Record<string, unknown>;
        const updates = ((payloadData.updates as Record<string, unknown>) || payloadData) as {
          displayName?: string;
          name?: string;
          email?: string;
          phone?: string;
          nidNumber?: string;
          designation?: string;
          address?: string;
          emergencyContact?: string;
          photoUrl?: string;
          password?: string;
        };
        const rawTargetId = String(payloadData.userId || payloadData.targetUserId || '');
        const targetEmail = String(payloadData.email || updates.email || '').trim();
        const isSelf =
          !rawTargetId ||
          rawTargetId === sessionUser.id ||
          rawTargetId.startsWith('actor-') ||
          (targetEmail && targetEmail.toLowerCase() === sessionUser.email.toLowerCase());

        const userIdToUpdate = isSelf ? sessionUser.id : (isSuperAdmin ? rawTargetId : sessionUser.id);
        const setFields: Record<string, unknown> = { updatedAt: now };

        const resolvedName = updates.displayName || updates.name;
        if (resolvedName) setFields.displayName = cap(resolvedName, 120);
        if (updates.phone !== undefined) setFields.phone = cap(updates.phone, 40);
        if (updates.nidNumber !== undefined) setFields.nidNumber = cap(updates.nidNumber, 50);
        if (updates.designation !== undefined) setFields.designation = cap(updates.designation, 100);
        if (updates.address !== undefined) setFields.address = cap(updates.address, 240);
        if (updates.emergencyContact !== undefined) setFields.emergencyContact = cap(updates.emergencyContact, 60);
        if (updates.photoUrl !== undefined) setFields.photoUrl = updates.photoUrl;

        if (updates.password && typeof updates.password === 'string' && updates.password.trim().length >= 6) {
          setFields.passwordHash = await bcrypt.hash(updates.password.trim(), 10);
        }

        // Resilient user query conditions
        const userOrConditions: Record<string, unknown>[] = [
          { _id: userIdToUpdate as unknown as never },
          { id: userIdToUpdate },
          { uid: userIdToUpdate },
        ];
        if (ObjectId.isValid(userIdToUpdate)) {
          userOrConditions.unshift({ _id: new ObjectId(userIdToUpdate) as unknown as never });
        }
        if (targetEmail) {
          userOrConditions.push({ email: targetEmail });
          userOrConditions.push({ email: targetEmail.toLowerCase() });
        }
        if (isSelf && sessionUser.email) {
          userOrConditions.push({ email: sessionUser.email });
          userOrConditions.push({ email: sessionUser.email.toLowerCase() });
          if (ObjectId.isValid(sessionUser.id)) {
            userOrConditions.unshift({ _id: new ObjectId(sessionUser.id) as unknown as never });
          }
        }

        // Resilient update matching _id, id, uid, or email
        await db.collection('users').updateOne(
          { $or: userOrConditions as never },
          { $set: setFields }
        );

        // Also sync stakeholder profile if target is an employee or self
        const stkOrConditions: Record<string, unknown>[] = [
          { _id: userIdToUpdate as unknown as never },
          { id: userIdToUpdate },
        ];
        if (ObjectId.isValid(userIdToUpdate)) {
          stkOrConditions.unshift({ _id: new ObjectId(userIdToUpdate) as unknown as never });
        }
        if (targetEmail) {
          stkOrConditions.push({ email: targetEmail });
        }
        if (isSelf && sessionUser.email) {
          stkOrConditions.push({ email: sessionUser.email });
        }

        await db
          .collection('stakeholders')
          .updateOne(
            { $or: stkOrConditions as never },
            {
              $set: {
                ...(resolvedName ? { name: cap(resolvedName, 120) } : {}),
                ...(updates.phone !== undefined ? { phone: cap(updates.phone, 40) } : {}),
                ...(updates.nidNumber !== undefined ? { nidNumber: cap(updates.nidNumber, 50) } : {}),
                ...(updates.designation !== undefined ? { designationOrCategory: cap(updates.designation, 100) } : {}),
                ...(updates.address !== undefined ? { address: cap(updates.address, 240) } : {}),
                ...(updates.emergencyContact !== undefined ? { emergencyContact: cap(updates.emergencyContact, 60) } : {}),
                ...(updates.photoUrl !== undefined ? { photoUrl: updates.photoUrl } : {}),
                updatedAt: now,
              },
            }
          )
          .catch(() => {});

        await writeAuditLog({
          action: 'UPDATE_USER_PROFILE',
          module: 'Profile & Security',
          businessId: 'ALL',
          details: `Updated profile details for user "${userIdToUpdate}" by ${sessionUser.displayName} (${sessionUser.role})`,
          severity: 'info',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true, photoUrl: updates.photoUrl });
      }

      case 'createTreasuryAccount': {
        if (!isSuperAdmin && !perms.canPostAccounting) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: Only authorized users can add Cash/Bank accounts.' },
            { status: 403 }
          );
        }
        const name = cap(payload.name, 120);
        const subType = payload.subType === 'cash' ? 'cash' : 'bank';
        const openingBalance = Math.max(0, Number(payload.openingBalance) || 0);
        if (!name) {
          return NextResponse.json({ ok: false, error: 'Account name is required.' }, { status: 400 });
        }

        const accId = cleanId(subType === 'cash' ? 'acc-cash' : 'acc-bank');
        const codePrefix = subType === 'cash' ? '101' : '103';
        const code = `${codePrefix}${Math.floor(1 + Math.random() * 8)}`;

        await db.collection('accounts').insertOne({
          _id: accId,
          code,
          name,
          accountType: 'asset',
          subType,
          businessId: 'ALL',
          balance: openingBalance,
          currency: 'BDT',
          isActive: true,
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        if (openingBalance > 0) {
          const eqAcc = await db
            .collection('accounts')
            .findOne({ ownerId, accountType: 'equity' });
          if (eqAcc) {
            await db
              .collection('accounts')
              .updateOne(
                { _id: eqAcc._id },
                { $set: { balance: Number(eqAcc.balance) + openingBalance, updatedAt: now } }
              );
          }
          await db.collection('journal_entries').insertOne({
            _id: cleanId('je'),
            referenceNo: `OPN-${Date.now().toString().slice(-5)}`,
            date: new Date().toISOString().split('T')[0],
            businessId: 'ALL',
            businessName: 'Consolidated HQ',
            transactionType: 'income',
            category: 'Opening Balance / Capital Deposit',
            description: `Opening balance added to ${name}`,
            debitAccountId: accId,
            debitAccountName: name,
            creditAccountId: eqAcc ? String(eqAcc._id) : 'EQUITY',
            creditAccountName: eqAcc ? String(eqAcc.name) : 'Sponsor Equity',
            amount: openingBalance,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: 'Owner / Capital',
            status: 'posted',
            reversedByEntryId: '',
            ownerId,
            createdAt: now,
            updatedAt: now,
          } as unknown as never);
        }

        await writeAuditLog({
          action: 'CREATE_TREASURY_ACCOUNT',
          module: 'Central Accounting',
          businessId: 'ALL',
          details: `Created ${subType.toUpperCase()} account "${name}" with opening balance BDT ${openingBalance}`,
          severity: 'info',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true, result: accId });
      }

      case 'depositToTreasuryAccount': {
        if (!isSuperAdmin && !perms.canPostAccounting) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: You do not have permission to deposit funds.' },
            { status: 403 }
          );
        }
        const targetAccountId = cap(payload.targetAccountId, 128);
        const amount = Math.max(0, Number(payload.amount) || 0);
        const sourceType = payload.sourceType === 'income' ? 'income' : 'capital';
        const businessId = cap(payload.businessId || 'ALL', 128);
        const businessName = cap(payload.businessName || 'Consolidated HQ', 120);
        const note = cap(payload.note || '', 300);

        if (!targetAccountId || amount <= 0) {
          return NextResponse.json(
            { ok: false, error: 'Select a valid Cash/Bank account and enter an amount > 0.' },
            { status: 400 }
          );
        }

        const targetAcc = await db
          .collection('accounts')
          .findOne({ _id: targetAccountId as unknown as never, ownerId });
        if (!targetAcc) {
          return NextResponse.json({ ok: false, error: 'Target account not found.' }, { status: 404 });
        }

        const creditAcc = await db.collection('accounts').findOne({
          ownerId,
          accountType: sourceType === 'income' ? 'revenue' : 'equity',
        });

        await db
          .collection('accounts')
          .updateOne(
            { _id: targetAcc._id },
            { $set: { balance: Number(targetAcc.balance) + amount, updatedAt: now } }
          );

        if (creditAcc) {
          await db
            .collection('accounts')
            .updateOne(
              { _id: creditAcc._id },
              { $set: { balance: Number(creditAcc.balance) + amount, updatedAt: now } }
            );
        }

        const refNo = `DEP-${Date.now().toString().slice(-5)}`;
        await db.collection('journal_entries').insertOne({
          _id: cleanId('je'),
          referenceNo: refNo,
          date: new Date().toISOString().split('T')[0],
          businessId,
          businessName,
          transactionType: 'income',
          category:
            sourceType === 'income' ? 'Cash / Bank Income Deposit' : 'Owner Capital Deposit',
          description:
            note ||
            `${sourceType === 'income' ? 'Direct income' : 'Owner capital'} deposited into ${targetAcc.name}`,
          debitAccountId: String(targetAcc._id),
          debitAccountName: String(targetAcc.name),
          creditAccountId: creditAcc ? String(creditAcc._id) : 'EQUITY',
          creditAccountName: creditAcc ? String(creditAcc.name) : 'Sponsor Equity',
          amount,
          paymentStatus: 'paid',
          dueAmount: 0,
          counterpartyName: sourceType === 'income' ? 'Direct Income' : 'Owner / Sponsor',
          status: 'posted',
          reversedByEntryId: '',
          actorEmail: sessionUser.email,
          actorName: sessionUser.displayName || sessionUser.email,
          actorRole: sessionUser.role,
          actorDesignation: sessionUser.designation || (sessionUser.role === 'super_admin' ? 'Super Admin' : sessionUser.role === 'super_manager' ? 'General Manager' : 'Officer'),
          actorPhoto: sessionUser.photoUrl || '',
          ownerId,
          createdAt: now,
          updatedAt: now,
        } as unknown as never);

        await writeAuditLog({
          action: 'TREASURY_DEPOSIT',
          module: 'Central Accounting',
          businessId,
          details: `Deposited BDT ${amount} into ${targetAcc.name} (${refNo})`,
          severity: 'info',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true, result: refNo });
      }

      case 'resetDemoLedgerToZero': {
        if (!isSuperAdmin) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: Only Super Admin can reset ledger balances.' },
            { status: 403 }
          );
        }
        await db
          .collection('accounts')
          .updateMany({ ownerId }, { $set: { balance: 0, updatedAt: now } });
        await db.collection('journal_entries').deleteMany({ ownerId });
        await writeAuditLog({
          action: 'RESET_LEDGER_TO_ZERO',
          module: 'Central Accounting',
          businessId: 'ALL',
          details:
            'Super Admin reset all Cash, Bank, and Ledger balances to BDT 0 to start fresh with real data.',
          severity: 'critical',
          actorEmail,
          ownerId,
        });
        return NextResponse.json({ ok: true });
      }

      case 'settleStakeholderPayment': {
        if (sessionUser.role === 'employee' && !perms.canPostAccounting) {
          return NextResponse.json(
            { ok: false, error: 'RBAC Denied: You do not have permission to post payments.' },
            { status: 403 }
          );
        }
        const stakeholderId = cap(payload.stakeholderId, 128);
        const walletAccountId = cap(payload.walletAccountId, 128);
        const amount = Math.max(0, Number(payload.amount) || 0);
        const date = cap(payload.date || new Date().toISOString().split('T')[0], 32);
        const note = cap(payload.note || '', 300);

        if (!stakeholderId || !walletAccountId || amount <= 0) {
          return NextResponse.json(
            { ok: false, error: 'Valid person, Cash/Bank account, and amount > 0 are required.' },
            { status: 400 }
          );
        }

        const stk = await db
          .collection('stakeholders')
          .findOne({ _id: stakeholderId as unknown as never, ownerId });
        if (!stk) {
          return NextResponse.json({ ok: false, error: 'Stakeholder not found.' }, { status: 404 });
        }
        if (!checkBusinessAccess(String(stk.businessId))) {
          return NextResponse.json({ ok: false, error: 'RBAC Denied' }, { status: 403 });
        }

        const walletAcc = await db
          .collection('accounts')
          .findOne({ _id: walletAccountId as unknown as never, ownerId });
        if (!walletAcc) {
          return NextResponse.json({ ok: false, error: 'Cash/Bank account not found.' }, { status: 404 });
        }

        const stkType = String(stk.stakeholderType);
        const refNo = `${stkType === 'employee' ? 'PAY' : stkType === 'customer' ? 'COL' : 'SUP'}-${Date.now().toString().slice(-5)}`;

        if (stkType === 'employee') {
          const payAcc =
            (await db.collection('accounts').findOne({ ownerId, subType: 'payroll' })) ||
            (await db.collection('accounts').findOne({ ownerId, accountType: 'expense' }));

          await db
            .collection('accounts')
            .updateOne(
              { _id: walletAcc._id },
              { $set: { balance: Number(walletAcc.balance) - amount, updatedAt: now } }
            );
          if (payAcc) {
            await db
              .collection('accounts')
              .updateOne(
                { _id: payAcc._id },
                { $set: { balance: Number(payAcc.balance) + amount, updatedAt: now } }
              );
          }

          await db.collection('journal_entries').insertOne({
            _id: cleanId('je'),
            referenceNo: refNo,
            date,
            businessId: String(stk.businessId),
            businessName: String(stk.businessName),
            transactionType: 'payroll',
            category: 'কর্মচারী বেতন প্রদান (Salary)',
            description: note || `বেতন প্রদান: ${stk.name} (${stk.designationOrCategory})`,
            debitAccountId: payAcc ? String(payAcc._id) : 'PAYROLL',
            debitAccountName: payAcc ? String(payAcc.name) : 'Staff Salaries & Farm Wages',
            creditAccountId: String(walletAcc._id),
            creditAccountName: String(walletAcc.name),
            amount,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: String(stk.name),
            status: 'posted',
            reversedByEntryId: '',
            ownerId,
            createdAt: now,
            updatedAt: now,
          } as unknown as never);
        } else if (stkType === 'customer') {
          // Customer pays us -> reduces customer's outstandingBalance & Accounts Receivable, increases Cash/Bank
          const newBal = Math.max(0, Number(stk.outstandingBalance || 0) - amount);
          await db
            .collection('stakeholders')
            .updateOne({ _id: stk._id }, { $set: { outstandingBalance: newBal, updatedAt: now } });

          const arAcc = await db.collection('accounts').findOne({ ownerId, subType: 'receivable' });
          await db
            .collection('accounts')
            .updateOne(
              { _id: walletAcc._id },
              { $set: { balance: Number(walletAcc.balance) + amount, updatedAt: now } }
            );
          if (arAcc) {
            await db
              .collection('accounts')
              .updateOne(
                { _id: arAcc._id },
                { $set: { balance: Math.max(0, Number(arAcc.balance) - amount), updatedAt: now } }
              );
          }

          await db.collection('journal_entries').insertOne({
            _id: cleanId('je'),
            referenceNo: refNo,
            date,
            businessId: String(stk.businessId),
            businessName: String(stk.businessName),
            transactionType: 'adjustment',
            category: 'ক্রেতার কাছ থেকে বাকি আদায় (Due Collection)',
            description: note || `বাকি আদায়: ${stk.name} (অবশিষ্ট বাকি: ৳${newBal})`,
            debitAccountId: String(walletAcc._id),
            debitAccountName: String(walletAcc.name),
            creditAccountId: arAcc ? String(arAcc._id) : 'RECEIVABLE',
            creditAccountName: arAcc ? String(arAcc.name) : 'Accounts Receivable',
            amount,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: String(stk.name),
            status: 'posted',
            reversedByEntryId: '',
            ownerId,
            createdAt: now,
            updatedAt: now,
          } as unknown as never);
        } else {
          // Supplier: we pay supplier -> reduces supplier's outstandingBalance & Accounts Payable, decreases Cash/Bank
          const newBal = Math.max(0, Number(stk.outstandingBalance || 0) - amount);
          await db
            .collection('stakeholders')
            .updateOne({ _id: stk._id }, { $set: { outstandingBalance: newBal, updatedAt: now } });

          const apAcc = await db.collection('accounts').findOne({ ownerId, subType: 'payable' });
          await db
            .collection('accounts')
            .updateOne(
              { _id: walletAcc._id },
              { $set: { balance: Number(walletAcc.balance) - amount, updatedAt: now } }
            );
          if (apAcc) {
            await db
              .collection('accounts')
              .updateOne(
                { _id: apAcc._id },
                { $set: { balance: Math.max(0, Number(apAcc.balance) - amount), updatedAt: now } }
              );
          }

          await db.collection('journal_entries').insertOne({
            _id: cleanId('je'),
            referenceNo: refNo,
            date,
            businessId: String(stk.businessId),
            businessName: String(stk.businessName),
            transactionType: 'adjustment',
            category: 'সাপ্লায়ার বাকি পরিশোধ (Payable Settlement)',
            description: note || `বাকি পরিশোধ: ${stk.name} (অবশিষ্ট দেনা: ৳${newBal})`,
            debitAccountId: apAcc ? String(apAcc._id) : 'PAYABLE',
            debitAccountName: apAcc ? String(apAcc.name) : 'Accounts Payable',
            creditAccountId: String(walletAcc._id),
            creditAccountName: String(walletAcc.name),
            amount,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: String(stk.name),
            status: 'posted',
            reversedByEntryId: '',
            ownerId,
            createdAt: now,
            updatedAt: now,
          } as unknown as never);
        }

        await writeAuditLog({
          action: `STAKEHOLDER_${stkType.toUpperCase()}_PAYMENT`,
          module: 'Stakeholder & HR',
          businessId: String(stk.businessId),
          details: `${stkType === 'customer' ? 'Collected' : 'Paid'} BDT ${amount} for ${stk.name} via ${walletAcc.name} (${refNo})`,
          severity: 'info',
          actorEmail,
          ownerId,
        });

        return NextResponse.json({ ok: true, result: refNo });
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('ERP action error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Server error executing action.' },
      { status: 500 }
    );
  }
}
