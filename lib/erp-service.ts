'use client';

import {
  ErpBusiness,
  ErpAccount,
  ErpJournalEntry,
  ErpInventoryItem,
  ErpStakeholder,
  ErpPoultryBatch,
  ErpLivestockRecord,
  ErpFishCycle,
  ErpTransportOp,
  ErpNotification,
  ErpUser,
  UserRole,
} from './erp-types';

type ErpListener = () => void;
const erpListeners = new Set<ErpListener>();

export function subscribeErpDataChanged(listener: ErpListener): () => void {
  erpListeners.add(listener);
  return () => {
    erpListeners.delete(listener);
  };
}

export function notifyErpDataChanged(): void {
  erpListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // Ignore listener errors
    }
  });
}

async function callErpAction<T = void>(
  action: string,
  payload: Record<string, unknown>
): Promise<T> {
  const res = await fetch('/api/erp/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    result?: T;
  };

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  notifyErpDataChanged();
  return data.result as T;
}

export async function logAuditEvent(params: {
  action: string;
  module: string;
  businessId: string;
  details: string;
  severity?: 'info' | 'warning' | 'critical';
  actorEmail: string;
  ownerId: string;
}): Promise<void> {
  await callErpAction('logAuditEvent', params);
}

export async function createDynamicBusiness(
  input: Omit<ErpBusiness, 'id' | 'ownerId'>,
  ownerId: string,
  actorEmail: string
): Promise<string> {
  return callErpAction<string>('createDynamicBusiness', { input, ownerId, actorEmail });
}

export async function updateDynamicBusinessStatus(
  business: ErpBusiness,
  newStatus: 'active' | 'inactive' | 'archived',
  actorEmail: string
): Promise<void> {
  await callErpAction('updateDynamicBusinessStatus', { business, newStatus, actorEmail });
}

export async function assignBusinessManager(
  businessId: string,
  managerName: string,
  managerPhone?: string
): Promise<void> {
  await callErpAction('assignBusinessManager', { businessId, managerName, managerPhone });
}

export async function postDoubleEntryTransaction(
  input: Omit<ErpJournalEntry, 'id' | 'status' | 'reversedByEntryId' | 'ownerId'>,
  accounts: ErpAccount[],
  ownerId: string,
  actorEmail: string
): Promise<void> {
  await callErpAction('postDoubleEntryTransaction', { input, accounts, ownerId, actorEmail });
}

export async function reversePostedJournalEntry(
  entry: ErpJournalEntry,
  accounts: ErpAccount[],
  actorEmail: string
): Promise<void> {
  await callErpAction('reversePostedJournalEntry', { entry, accounts, actorEmail });
}

export async function createInventoryItemWithMovement(
  input: Omit<ErpInventoryItem, 'id' | 'ownerId'>,
  ownerId: string,
  actorEmail: string
): Promise<void> {
  await callErpAction('createInventoryItemWithMovement', { input, ownerId, actorEmail });
}

export async function recordStockMovement(
  item: ErpInventoryItem,
  movementType: 'purchase' | 'consumption' | 'sale' | 'transfer' | 'adjustment',
  quantity: number,
  sourceLocation: string,
  destinationLocation: string,
  notes: string,
  actorEmail: string
): Promise<void> {
  await callErpAction('recordStockMovement', {
    item,
    movementType,
    quantity,
    sourceLocation,
    destinationLocation,
    notes,
    actorEmail,
  });
}

export async function createPoultryBatchRecord(
  input: Omit<ErpPoultryBatch, 'id' | 'ownerId'>,
  ownerId: string,
  actorEmail: string
): Promise<void> {
  await callErpAction('createPoultryBatchRecord', { input, ownerId, actorEmail });
}

export async function updatePoultryBatchDailyRecord(
  batch: ErpPoultryBatch,
  updates: Partial<ErpPoultryBatch>,
  actorEmail: string
): Promise<void> {
  await callErpAction('updatePoultryBatchDailyRecord', { batch, updates, actorEmail });
}

export async function createLivestockAnimalRecord(
  input: Omit<ErpLivestockRecord, 'id' | 'ownerId'>,
  ownerId: string,
  actorEmail: string
): Promise<void> {
  await callErpAction('createLivestockAnimalRecord', { input, ownerId, actorEmail });
}

export async function updateLivestockAnimalRecord(
  animal: ErpLivestockRecord,
  updates: Partial<ErpLivestockRecord>,
  actorEmail: string
): Promise<void> {
  await callErpAction('updateLivestockAnimalRecord', { animal, updates, actorEmail });
}

export async function createFishCycleRecord(
  input: Omit<ErpFishCycle, 'id' | 'ownerId'>,
  ownerId: string,
  actorEmail: string
): Promise<void> {
  await callErpAction('createFishCycleRecord', { input, ownerId, actorEmail });
}

export async function updateFishCycleRecord(
  cycle: ErpFishCycle,
  updates: Partial<ErpFishCycle>,
  actorEmail: string
): Promise<void> {
  await callErpAction('updateFishCycleRecord', { cycle, updates, actorEmail });
}

export async function createTransportOpRecord(
  input: Omit<ErpTransportOp, 'id' | 'ownerId'>,
  ownerId: string,
  actorEmail: string
): Promise<void> {
  await callErpAction('createTransportOpRecord', { input, ownerId, actorEmail });
}

export async function updateTransportOpRecord(
  op: ErpTransportOp,
  updates: Partial<ErpTransportOp>,
  actorEmail: string
): Promise<void> {
  await callErpAction('updateTransportOpRecord', { op, updates, actorEmail });
}

export async function createStakeholderRecord(
  input: Omit<ErpStakeholder, 'id' | 'ownerId'>,
  ownerId: string,
  actorEmail: string
): Promise<void> {
  await callErpAction('createStakeholderRecord', { input, ownerId, actorEmail });
}

export async function updateStakeholderRecord(
  stakeholderId: string,
  updates: Partial<ErpStakeholder>
): Promise<void> {
  await callErpAction('updateStakeholderRecord', { stakeholderId, updates });
}

export async function deleteStakeholderRecord(
  stakeholderId: string
): Promise<void> {
  await callErpAction('deleteStakeholderRecord', { stakeholderId });
}

export async function markNotificationAsRead(notification: ErpNotification): Promise<void> {
  await callErpAction('markNotificationAsRead', { notification });
}

export async function createNotificationRecord(input: {
  title: string;
  message: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  businessId: string;
}): Promise<string> {
  return callErpAction<string>('createNotificationRecord', { input });
}

export async function createErpUserAccount(
  input: {
    email: string;
    displayName: string;
    password?: string;
    role: UserRole;
    assignedBusinesses: string;
    permissionsJson: string;
    status?: 'active' | 'suspended' | 'invited';
    mfaEnabled?: boolean;
  },
  ownerId: string,
  actorEmail: string
): Promise<string> {
  return callErpAction<string>('createErpUserAccount', { input, ownerId, actorEmail });
}

export async function updateErpUserPermissions(
  targetUser: ErpUser,
  updates: {
    displayName?: string;
    role?: UserRole;
    assignedBusinesses?: string;
    permissionsJson?: string;
    status?: 'active' | 'suspended' | 'invited';
    mfaEnabled?: boolean;
    password?: string;
  },
  actorEmail: string
): Promise<void> {
  await callErpAction('updateErpUserPermissions', { targetUser, updates, actorEmail });
}

export async function deleteErpUserAccount(
  targetUser: ErpUser,
  actorEmail: string
): Promise<void> {
  await callErpAction('deleteErpUserAccount', { targetUser, actorEmail });
}

export async function seedInitialErpDataIfEmpty(
  uid: string,
  email: string,
  displayName: string
): Promise<boolean> {
  return callErpAction<boolean>('seedInitialErpDataIfEmpty', { uid, email, displayName });
}

export async function createTreasuryAccount(input: {
  name: string;
  subType: 'cash' | 'bank';
  openingBalance: number;
}): Promise<string> {
  return callErpAction<string>('createTreasuryAccount', input);
}

export async function depositToTreasuryAccount(input: {
  targetAccountId: string;
  amount: number;
  sourceType: 'capital' | 'income';
  businessId?: string;
  businessName?: string;
  note?: string;
}): Promise<string> {
  return callErpAction<string>('depositToTreasuryAccount', input);
}

export async function resetDemoLedgerToZero(): Promise<void> {
  await callErpAction('resetDemoLedgerToZero', {});
}

export async function settleStakeholderPayment(input: {
  stakeholderId: string;
  walletAccountId: string;
  amount: number;
  date?: string;
  note?: string;
}): Promise<string> {
  return callErpAction<string>('settleStakeholderPayment', input);
}
