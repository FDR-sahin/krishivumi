'use client';

import React, { useState } from 'react';
import {
  Landmark,
  Package,
  Users,
  ShieldAlert,
  FileBarChart,
  Plus,
  RotateCcw,
  Download,
  Printer,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserPlus,
  Edit3,
  Trash2,
  Eye,
  ShieldCheck,
  X,
  Wallet,
  Banknote,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Coins,
  PieChart,
  FileText,
  Send,
  UserX,
  Briefcase,
  Award,
  Truck,
  Calculator,
  HelpCircle,
  LayoutGrid,
  ListFilter,
  Loader2,
  Search,
  Calendar,
  UserCheck,
  Clock,
  Filter,
  Building2,
} from 'lucide-react';
import {
  ErpBusiness,
  ErpAccount,
  ErpJournalEntry,
  ErpInventoryItem,
  ErpStockMovement,
  ErpStakeholder,
  ErpAuditLog,
  ErpUser,
  ErpPoultryBatch,
  ErpLivestockRecord,
  ErpFishCycle,
  ErpTransportOp,
  UserRole,
  formatBDT,
} from '@/lib/erp-types';
import {
  postDoubleEntryTransaction,
  reversePostedJournalEntry,
  createInventoryItemWithMovement,
  recordStockMovement,
  createStakeholderRecord,
  updateStakeholderRecord,
  deleteStakeholderRecord,
  createErpUserAccount,
  updateErpUserPermissions,
  deleteErpUserAccount,
  createTreasuryAccount,
  depositToTreasuryAccount,
  resetDemoLedgerToZero,
  settleStakeholderPayment,
  createNotificationRecord,
} from '@/lib/erp-service';
import MonthFilterBar, {
  MonthFilterValue,
  matchesMonthFilter,
  MONTHS_12,
  formatMonthFilterLabel,
} from './MonthFilterBar';
import { getPayrollCycleInfo, getEnterprisePayrollSummary } from '@/lib/payroll-utils';
import UserProfileCardModal, { UserProfileData } from './UserProfileCardModal';
import SalaryManagementTab from './SalaryManagementTab';
import GodownAndStockTab from './GodownAndStockTab';
import AccountingAndLedgerTab from './AccountingAndLedgerTab';
import {
  triggerGlobalToast,
  triggerConfirmDelete,
} from './GlobalToastAndConfirmModal';

interface GranularPermissionsState {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDeleteRecords: boolean;
  canApprove: boolean;
  canExportPrint: boolean;
  canCreateBusiness: boolean;
  canManageUsers: boolean;
  canViewConsolidatedProfit: boolean;
  canPostAccounting: boolean;
  canReverseTransactions: boolean;
  canManageInventory: boolean;
  allowedModules: string[];
}

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, GranularPermissionsState> = {
  super_admin: {
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
  },
  super_manager: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDeleteRecords: false,
    canApprove: true,
    canExportPrint: true,
    canCreateBusiness: false,
    canManageUsers: true,
    canViewConsolidatedProfit: true,
    canPostAccounting: true,
    canReverseTransactions: false,
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
  },
  business_manager: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDeleteRecords: false,
    canApprove: true,
    canExportPrint: true,
    canCreateBusiness: false,
    canManageUsers: false,
    canViewConsolidatedProfit: true,
    canPostAccounting: true,
    canReverseTransactions: false,
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
    ],
  },
  employee: {
    canView: true,
    canCreate: true,
    canEdit: false,
    canDeleteRecords: false,
    canApprove: false,
    canExportPrint: false,
    canCreateBusiness: false,
    canManageUsers: false,
    canViewConsolidatedProfit: false,
    canPostAccounting: false,
    canReverseTransactions: false,
    canManageInventory: true,
    allowedModules: ['dashboard', 'poultry', 'cattle', 'goat', 'fish', 'transport', 'inventory'],
  },
};

const ALL_ERP_MODULE_OPTIONS: { id: string; label: string }[] = [
  { id: 'dashboard', label: 'Main Dashboard (Overview)' },
  { id: 'poultry', label: 'Poultry Farming Module' },
  { id: 'cattle', label: 'Cattle & Dairy Module' },
  { id: 'goat', label: 'Goat Farming Module' },
  { id: 'fish', label: 'Fish & Aquaculture Module' },
  { id: 'transport', label: 'Fleet & Transport Module' },
  { id: 'accounting', label: 'General Ledger & Accounting' },
  { id: 'inventory', label: 'Warehouse & Inventory' },
  { id: 'stakeholders', label: 'Staff, Payroll & Receivables' },
  { id: 'reports', label: 'Financial Reports & P&L' },
  { id: 'rbac', label: 'User & Access Control (RBAC)' },
];

interface CentralAccountingAndInventoryViewProps {
  activeSection: 'accounting' | 'inventory' | 'stakeholders' | 'reports' | 'security';
  businesses: ErpBusiness[];
  allBusinesses?: ErpBusiness[];
  accounts: ErpAccount[];
  journalEntries: ErpJournalEntry[];
  inventoryItems: ErpInventoryItem[];
  stockMovements: ErpStockMovement[];
  stakeholders: ErpStakeholder[];
  auditLogs: ErpAuditLog[];
  erpUsers?: ErpUser[];
  poultryBatches: ErpPoultryBatch[];
  livestockRecords: ErpLivestockRecord[];
  fishCycles: ErpFishCycle[];
  transportOps: ErpTransportOp[];
  ownerId: string;
  actorEmail: string;
  userRole: UserRole;
  assignedBusinessFilter: string;
  onChangeRoleSimulation: (role: UserRole, assignedBiz: string) => void;
  monthFilter?: MonthFilterValue;
  onChangeMonthFilter?: (next: MonthFilterValue) => void;
  currentUser?: ErpUser;
  currentUserPhoto?: string;
  lang?: 'en' | 'bn';
}

export default function CentralAccountingAndInventoryView({
  activeSection,
  businesses,
  allBusinesses,
  accounts,
  journalEntries,
  inventoryItems,
  stockMovements,
  stakeholders,
  auditLogs,
  erpUsers = [],
  poultryBatches,
  livestockRecords,
  fishCycles,
  transportOps,
  ownerId,
  actorEmail,
  userRole,
  assignedBusinessFilter,
  onChangeRoleSimulation,
  monthFilter: controlledMonthFilter,
  onChangeMonthFilter,
  currentUser,
  currentUserPhoto,
  lang = 'en',
}: CentralAccountingAndInventoryViewProps) {
  const bn = false;
  const fullBusinessList = React.useMemo(() => {
    const raw = allBusinesses && allBusinesses.length > 0 ? allBusinesses : businesses;
    const seen = new Set<string>();
    return raw.filter((b) => {
      const key = String(b.code || b.templateType || b.name || b.id).trim().toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allBusinesses, businesses]);
  const [selectedBizId, setSelectedBizId] = useState<string>('ALL');
  const [localMonthFilter, setLocalMonthFilter] = useState<MonthFilterValue>({
    year: 'ALL',
    month: 'ALL',
  });
  const activeMonthFilter = controlledMonthFilter ?? localMonthFilter;
  const setMonthFilter = onChangeMonthFilter ?? setLocalMonthFilter;
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Simple Treasury Modals State (Deposit / Easy Transfer / Add Wallet / Reset)
  const [showFullAccounts, setShowFullAccounts] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depAccountId, setDepAccountId] = useState<string>('');
  const [depAmount, setDepAmount] = useState<number>(50000);
  const [depSource, setDepSource] = useState<'capital' | 'income'>('capital');
  const [depNote, setDepNote] = useState<string>('');
  const [isDepositing, setIsDepositing] = useState(false);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [trFromId, setTrFromId] = useState<string>('');
  const [trToId, setTrToId] = useState<string>('');
  const [trAmount, setTrAmount] = useState<number>(25000);
  const [trNote, setTrNote] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'bank' | 'cash'>('bank');
  const [newAccOpening, setNewAccOpening] = useState<number>(0);
  const [isCreatingAcc, setIsCreatingAcc] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResettingLedger, setIsResettingLedger] = useState(false);
  const [showAdvancedDrCr, setShowAdvancedDrCr] = useState(false);

  // Custom Stock In / Out Modal State
  const [stockMoveItem, setStockMoveItem] = useState<ErpInventoryItem | null>(null);
  const [smType, setSmType] = useState<'purchase' | 'consumption' | 'sale' | 'transfer' | 'adjustment'>('purchase');
  const [smQty, setSmQty] = useState<number>(10);
  const [smDest, setSmDest] = useState<string>('');
  const [smNotes, setSmNotes] = useState<string>('');
  const [smPostExpense, setSmPostExpense] = useState<boolean>(false);
  const [smPayAccId, setSmPayAccId] = useState<string>('');
  const [isMovingStock, setIsMovingStock] = useState(false);

  // Double-Entry Voucher Form State
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [vType, setVType] = useState<
    'sale' | 'expense' | 'purchase' | 'income' | 'cash_to_bank' | 'bank_to_cash' | 'payroll' | 'adjustment'
  >('sale');
  const [vBizId, setVBizId] = useState<string>(businesses[0]?.id || 'ALL');
  const [vCategory, setVCategory] = useState('Commercial Wholesale Sale');
  const [vDesc, setVDesc] = useState('');
  const [vDebitId, setVDebitId] = useState<string>(accounts[1]?.id || '');
  const [vCreditId, setVCreditId] = useState<string>(accounts[7]?.id || '');
  const [vAmount, setVAmount] = useState<number>(85000);
  const [vPaymentStatus, setVPaymentStatus] = useState<'paid' | 'partial' | 'due'>('paid');
  const [vDueAmount, setVDueAmount] = useState<number>(0);
  const [vCounterparty, setVCounterparty] = useState('Agro Wholesale Partner');

  // Inventory Modal State
  const [showInvModal, setShowInvModal] = useState(false);
  const [invSku, setInvSku] = useState('SKU-AGRO-106');
  const [invName, setInvName] = useState('');
  const [invCat, setInvCat] = useState<ErpInventoryItem['category']>('feed');
  const [invBizId, setInvBizId] = useState(businesses[0]?.id || 'ALL');
  const [invWarehouse, setInvWarehouse] = useState('Central Agro Warehouse');
  const [invUnit, setInvUnit] = useState('Bag');
  const [invQty, setInvQty] = useState(100);
  const [invReorder, setInvReorder] = useState(25);
  const [invCost, setInvCost] = useState(2450);
  const [invPrice, setInvPrice] = useState(2650);
  const [invExpiry, setInvExpiry] = useState('2027-06-30');
  const [invSupplier, setInvSupplier] = useState('Kazi Agro Feed Mill Ltd.');

  // Stakeholder Modal State
  const [showStkModal, setShowStkModal] = useState(false);
  const [stkType, setStkType] = useState<'employee' | 'supplier' | 'customer'>('employee');
  const [stkFilter, setStkFilter] = useState<'all' | 'employee' | 'supplier' | 'customer'>('all');
  const [stkBizFilter, setStkBizFilter] = useState<string>('ALL');
  const [stkViewMode, setStkViewMode] = useState<'table' | 'grouped'>('table');
  const [showSalaryGuide, setShowSalaryGuide] = useState<boolean>(false);
  const [stkName, setStkName] = useState('');
  const [stkPhone, setStkPhone] = useState('+880 1711-000000');
  const [stkEmail, setStkEmail] = useState('');
  const [stkAddress, setStkAddress] = useState('Gazipur, Bangladesh');
  const [stkBizId, setStkBizId] = useState(businesses[0]?.id || 'ALL');
  const [stkRoleCat, setStkRoleCat] = useState('Farm Supervisor');
  const [stkSalaryOrLimit, setStkSalaryOrLimit] = useState(38000);
  const [stkBalance, setStkBalance] = useState(0);

  // Interactive Stakeholder Settlement Modal (Pay Salary / Collect Customer Due / Pay Supplier Due)
  const [stkPayTarget, setStkPayTarget] = useState<ErpStakeholder | null>(null);
  const [stkPayAmount, setStkPayAmount] = useState<number>(0);
  const [stkPayWalletId, setStkPayWalletId] = useState<string>('');
  const [stkPayDate, setStkPayDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [stkPayNote, setStkPayNote] = useState<string>('');
  const [isSettlingStk, setIsSettlingStk] = useState(false);

  // Transparent Salary Calculation Breakdown State
  const [salaryBase, setSalaryBase] = useState<number>(20000);
  const [salaryDaysTotal, setSalaryDaysTotal] = useState<number>(30);
  const [salaryDaysWorked, setSalaryDaysWorked] = useState<number>(30);
  const [salaryBonus, setSalaryBonus] = useState<number>(0);
  const [salaryDeduction, setSalaryDeduction] = useState<number>(0);

  // Business Manager Salary Disbursal State (Disbursed by General Manager / Super Admin)
  const [mgrPayTarget, setMgrPayTarget] = useState<ErpUser | null>(null);
  const [mgrPayAmount, setMgrPayAmount] = useState<number>(35000);
  const [mgrPayWalletId, setMgrPayWalletId] = useState<string>('');
  const [mgrPayDate, setMgrPayDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [mgrPayBonus, setMgrPayBonus] = useState<number>(0);
  const [mgrPayDeduction, setMgrPayDeduction] = useState<number>(0);
  const [mgrPayNote, setMgrPayNote] = useState<string>('');
  const [isSettlingMgr, setIsSettlingMgr] = useState<boolean>(false);

  // Executive Report Modal State (Super Manager & Super Admin)
  const [showExecutiveReportModal, setShowExecutiveReportModal] = useState(false);
  const [executiveReportRemarks, setExecutiveReportRemarks] = useState(
    'Honorable Owner, all 5 business divisions (Poultry, Cattle, Goat, Fish, and Fleet Transport) operated smoothly over the preceding cycle. The audited consolidated profit, expense, and operating returns are presented for your executive review.'
  );
  const [isSendingReport, setIsSendingReport] = useState(false);

  // Security Users Role Filter Tab
  const [secRoleFilter, setSecRoleFilter] = useState<'all' | 'super_manager' | 'business_manager' | 'employee'>('all');
  const [secLoginYear, setSecLoginYear] = useState<string>('ALL');
  const [secLoginMonth, setSecLoginMonth] = useState<string>('ALL');
  const [secManagerFilter, setSecManagerFilter] = useState<string>('ALL');
  const [secUserSearch, setSecUserSearch] = useState<string>('');
  const [secOnlyActiveInPeriod, setSecOnlyActiveInPeriod] = useState<boolean>(false);

  // Security Users Role & Hierarchy Helpers
  const secManagers = erpUsers.filter(
    (u) => u.role === 'super_admin' || u.role === 'super_manager' || u.role === 'business_manager'
  );

  const getStaffForManager = (manager: ErpUser): ErpUser[] => {
    if (manager.role === 'super_admin') {
      return erpUsers.filter((u) => u.id !== manager.id);
    }
    if (manager.role === 'super_manager') {
      return erpUsers.filter((u) => u.role === 'business_manager' || u.role === 'employee');
    }
    if (manager.role === 'business_manager') {
      const mgrBusinesses = (manager.assignedBusinesses || '').split(',').map((b) => b.trim());
      return erpUsers.filter((u) => {
        if (u.id === manager.id) return false;
        if (u.role !== 'employee') return false;
        if (
          u.appointedBy &&
          (u.appointedBy === manager.email ||
            u.appointedBy === manager.id ||
            u.appointedBy === manager.displayName)
        ) {
          return true;
        }
        const uBusinesses = (u.assignedBusinesses || '').split(',').map((b) => b.trim());
        return mgrBusinesses.some((b) => b !== 'ALL' && uBusinesses.includes(b));
      });
    }
    return [];
  };

  const findSupervisor = (user: ErpUser): { name: string; roleStr: string } => {
    if (user.role === 'super_admin') {
      return { name: 'Principal Owner', roleStr: 'Top Authority' };
    }
    if (user.role === 'super_manager') {
      const admin = erpUsers.find((u) => u.role === 'super_admin');
      return {
        name: admin?.displayName || 'Super Admin',
        roleStr: 'Super Admin (Owner)',
      };
    }
    if (user.role === 'business_manager') {
      const gm = erpUsers.find((u) => u.role === 'super_manager');
      if (gm) return { name: gm.displayName, roleStr: 'General Manager (COO)' };
      const admin = erpUsers.find((u) => u.role === 'super_admin');
      return { name: admin?.displayName || 'Super Admin', roleStr: 'Owner' };
    }
    // Employee
    if (user.appointedBy) {
      const app = erpUsers.find(
        (u) =>
          u.email === user.appointedBy ||
          u.id === user.appointedBy ||
          u.displayName === user.appointedBy
      );
      if (app) {
        return {
          name: app.displayName,
          roleStr:
            app.role === 'super_manager'
              ? 'General Manager'
              : app.role === 'business_manager'
              ? 'Unit Incharge'
              : 'Owner',
        };
      }
    }
    const uBiz = (user.assignedBusinesses || '').split(',').map((s) => s.trim())[0];
    if (uBiz && uBiz !== 'ALL') {
      const bm = erpUsers.find(
        (u) => u.role === 'business_manager' && (u.assignedBusinesses || '').includes(uBiz)
      );
      if (bm) return { name: bm.displayName, roleStr: 'Unit Incharge' };
    }
    const gm = erpUsers.find((u) => u.role === 'super_manager');
    if (gm) return { name: gm.displayName, roleStr: 'General Manager' };
    return { name: 'Super Admin', roleStr: 'Owner' };
  };

  const matchesLoginPeriod = (lastLoginAt?: string | number): boolean => {
    if (secLoginYear === 'ALL' && secLoginMonth === 'ALL') return true;
    if (!lastLoginAt) return false;
    try {
      const parsedDate =
        typeof lastLoginAt === 'number' || (!isNaN(Number(lastLoginAt)) && !String(lastLoginAt).includes('-'))
          ? new Date(Number(lastLoginAt))
          : new Date(lastLoginAt);
      if (isNaN(parsedDate.getTime())) return false;
      const y = parsedDate.getFullYear().toString();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      if (secLoginYear !== 'ALL' && y !== secLoginYear) return false;
      if (secLoginMonth !== 'ALL' && m !== secLoginMonth) return false;
      return true;
    } catch {
      return false;
    }
  };

  const usersLoggedInPeriodCount = erpUsers.filter((u) => matchesLoginPeriod(u.lastLoginAt)).length;

  const selectedManagerObj =
    secManagerFilter !== 'ALL' ? erpUsers.find((u) => u.id === secManagerFilter) : null;
  const selectedManagerStaff = selectedManagerObj ? getStaffForManager(selectedManagerObj) : [];

  const filteredSecUsers = erpUsers.filter((u) => {
    if (secRoleFilter !== 'all' && u.role !== secRoleFilter) return false;

    if (secUserSearch.trim()) {
      const q = secUserSearch.toLowerCase().trim();
      const matchName = u.displayName?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchPhone = u.phone?.toLowerCase().includes(q);
      const matchRole = u.role?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchRole) return false;
    }

    if (secManagerFilter !== 'ALL' && selectedManagerObj) {
      if (u.id === selectedManagerObj.id) {
        return true;
      }
      if (!selectedManagerStaff.some((s) => s.id === u.id)) {
        return false;
      }
    }

    // Direct filter when year/month is selected, or when active toggle is checked
    if (secLoginYear !== 'ALL' || secLoginMonth !== 'ALL' || secOnlyActiveInPeriod) {
      if (!matchesLoginPeriod(u.lastLoginAt)) return false;
    }

    return true;
  });

  const formatLoginTime = (iso?: string | number) => {
    if (!iso) {
      return {
        text: 'Never logged in',
        subText: 'Inactive',
        isRecent: false,
        color: 'text-slate-400 dark:text-slate-500',
      };
    }
    try {
      const d =
        typeof iso === 'number' || (!isNaN(Number(iso)) && !String(iso).includes('-'))
          ? new Date(Number(iso))
          : new Date(iso);
      if (isNaN(d.getTime())) {
        return { text: 'Unknown', subText: '', isRecent: false, color: 'text-slate-400' };
      }
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const dateStr = d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      if (diffHours >= 0 && diffHours < 24 && d.getDate() === now.getDate()) {
        const hoursAgo = Math.max(1, Math.floor(diffHours));
        return {
          text: `Today at ${timeStr}`,
          subText: `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago`,
          isRecent: true,
          color: 'text-emerald-700 dark:text-emerald-400 font-bold',
        };
      }
      if (diffHours >= 0 && diffHours < 48) {
        return {
          text: `Yesterday at ${timeStr}`,
          subText: 'Active yesterday',
          isRecent: true,
          color: 'text-blue-700 dark:text-blue-400 font-bold',
        };
      }
      return {
        text: dateStr,
        subText: timeStr,
        isRecent: false,
        color: 'text-slate-700 dark:text-slate-300 font-medium',
      };
    } catch {
      return { text: 'Unknown', subText: '', isRecent: false, color: 'text-slate-400' };
    }
  };

  // Terminate Stakeholder Modal State
  const [terminatingStakeholder, setTerminatingStakeholder] = useState<ErpStakeholder | null>(null);
  const [terminationReason, setTerminationReason] = useState('Work contract completed / operational restructuring');
  const [isTerminatingStakeholder, setIsTerminatingStakeholder] = useState(false);

  // Edit Stakeholder Modal State
  const [editingStakeholder, setEditingStakeholder] = useState<ErpStakeholder | null>(null);
  const [isSavingStakeholder, setIsSavingStakeholder] = useState(false);

  // Universal Printable Slip / Voucher State
  const [activeSlip, setActiveSlip] = useState<{
    type: 'salary_payslip' | 'goods_purchase_slip' | 'money_receipt';
    slipNo: string;
    date: string;
    businessName: string;
    recipientName: string;
    designation?: string;
    recipientPhone?: string;
    appointedBy?: string;
    recipientDesignation?: string;
    amount: number;
    paymentMethod: string;
    note: string;
    supplierName?: string;
    supplierMemoNo?: string;
    itemName?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    totalAmount?: number;
    enteredBy?: string;
  } | null>(null);

  // Supplier Paper Memo No for Stock Inward
  const [smSupplierMemoNo, setSmSupplierMemoNo] = useState('');

  // Physical Godown Stock Audit / Anti-Theft State
  const [auditSelectedItemId, setAuditSelectedItemId] = useState<string>('');
  const [auditPhysicalCount, setAuditPhysicalCount] = useState<number | ''>('');
  const [isSendingDiscrepancyNotice, setIsSendingDiscrepancyNotice] = useState(false);
  const [isReconcilingStock, setIsReconcilingStock] = useState(false);

  // User & Granular Permission Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ErpUser | null>(null);
  const [usrName, setUsrName] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrPassword, setUsrPassword] = useState('');
  const [usrRole, setUsrRole] = useState<UserRole>('business_manager');
  const [usrAssignAllBiz, setUsrAssignAllBiz] = useState<boolean>(false);
  const [usrSelectedBizIds, setUsrSelectedBizIds] = useState<string[]>([]);
  const [usrStatus, setUsrStatus] = useState<'active' | 'suspended' | 'invited'>('active');
  const [usrMfa, setUsrMfa] = useState<boolean>(true);
  const [usrPerms, setUsrPerms] = useState<GranularPermissionsState>(
    DEFAULT_ROLE_PERMISSIONS.business_manager
  );
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Profile Modal State (Clickable Actor / User Profile Card)
  const [viewingProfile, setViewingProfile] = useState<UserProfileData | null>(null);

  // Universal Actor / User Photo Resolver
  const resolveActorPhoto = React.useCallback(
    (targetEmail?: string, targetName?: string, targetRole?: string, rawPhoto?: string) => {
      if (rawPhoto && rawPhoto.startsWith('data:image')) return rawPhoto;
      if (rawPhoto && rawPhoto.length > 15) return rawPhoto;

      const myPhoto =
        currentUserPhoto ||
        currentUser?.photoUrl ||
        (typeof window !== 'undefined' ? localStorage.getItem('krishi_saved_photo_self') : null);

      const isCurrent =
        targetRole === 'super_admin' ||
        (targetEmail && currentUser?.email && targetEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
        (targetName && currentUser?.displayName && targetName.toLowerCase() === currentUser.displayName.toLowerCase()) ||
        targetEmail === 'admin' ||
        targetName?.toLowerCase() === 'sahin miah';

      if (isCurrent && myPhoto) return myPhoto;

      const matchedUser = (erpUsers || []).find(
        (u) =>
          (targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase()) ||
          (targetName && u.displayName?.toLowerCase() === targetName.toLowerCase()) ||
          (targetRole === 'super_admin' && u.role === 'super_admin')
      );
      if (matchedUser?.photoUrl) return matchedUser.photoUrl;

      const matchedStk = (stakeholders || []).find(
        (s) =>
          (targetEmail && s.phone === targetEmail) ||
          (targetName && s.name?.toLowerCase() === targetName.toLowerCase())
      );
      if (matchedStk?.photoUrl) return matchedStk.photoUrl;

      return '';
    },
    [currentUser, currentUserPhoto, erpUsers, stakeholders]
  );

  const showNotice = (msg: string) => {
    setToastMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setToastMsg(null), 2000);
    triggerGlobalToast(msg, 'success');
  };

  const parseUserPermissions = (u: ErpUser): GranularPermissionsState => {
    try {
      const parsed = JSON.parse(u.permissionsJson || '{}');
      const fallback = DEFAULT_ROLE_PERMISSIONS[u.role] || DEFAULT_ROLE_PERMISSIONS.employee;
      return {
        canView: parsed.canView ?? fallback.canView,
        canCreate: parsed.canCreate ?? fallback.canCreate,
        canEdit: parsed.canEdit ?? fallback.canEdit,
        canDeleteRecords: parsed.canDeleteRecords ?? fallback.canDeleteRecords,
        canApprove: parsed.canApprove ?? fallback.canApprove,
        canExportPrint: parsed.canExportPrint ?? fallback.canExportPrint,
        canCreateBusiness: parsed.canCreateBusiness ?? fallback.canCreateBusiness,
        canManageUsers: parsed.canManageUsers ?? fallback.canManageUsers,
        canViewConsolidatedProfit:
          parsed.canViewConsolidatedProfit ?? fallback.canViewConsolidatedProfit,
        canPostAccounting: parsed.canPostAccounting ?? fallback.canPostAccounting,
        canReverseTransactions: parsed.canReverseTransactions ?? fallback.canReverseTransactions,
        canManageInventory: parsed.canManageInventory ?? fallback.canManageInventory,
        allowedModules: Array.isArray(parsed.allowedModules)
          ? parsed.allowedModules
          : fallback.allowedModules,
      };
    } catch {
      return DEFAULT_ROLE_PERMISSIONS[u.role] || DEFAULT_ROLE_PERMISSIONS.employee;
    }
  };

  const openCreateUserModal = () => {
    setEditingUser(null);
    setUsrName('');
    setUsrEmail('');
    setUsrPassword('');
    const defaultRole: UserRole =
      userRole === 'super_admin'
        ? 'super_manager'
        : userRole === 'super_manager'
        ? 'business_manager'
        : 'employee';
    setUsrRole(defaultRole);
    setUsrAssignAllBiz(defaultRole === 'super_manager');
    setUsrSelectedBizIds(fullBusinessList[0] ? [fullBusinessList[0].id] : []);
    setUsrStatus('active');
    setUsrMfa(true);
    setUsrPerms(DEFAULT_ROLE_PERMISSIONS[defaultRole]);
    setShowUserModal(true);
  };

  const openEditUserModal = (target: ErpUser) => {
    setEditingUser(target);
    setUsrName(target.displayName);
    setUsrEmail(target.email);
    setUsrPassword('');
    setUsrRole(target.role);
    const isAll = !target.assignedBusinesses || target.assignedBusinesses === 'ALL';
    setUsrAssignAllBiz(isAll);
    setUsrSelectedBizIds(
      isAll
        ? fullBusinessList.map((b) => b.id)
        : target.assignedBusinesses
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
    );
    setUsrStatus(target.status);
    setUsrMfa(target.mfaEnabled);
    setUsrPerms(parseUserPermissions(target));
    setShowUserModal(true);
  };

  const handleRolePresetChange = (newRole: UserRole) => {
    setUsrRole(newRole);
    setUsrPerms(DEFAULT_ROLE_PERMISSIONS[newRole]);
    if (newRole === 'super_admin' || newRole === 'super_manager') {
      setUsrAssignAllBiz(true);
    } else if (usrSelectedBizIds.length === 0 && fullBusinessList[0]) {
      setUsrSelectedBizIds([fullBusinessList[0].id]);
    }
  };

  const toggleBizSelection = (bizId: string) => {
    setUsrSelectedBizIds((prev) =>
      prev.includes(bizId) ? prev.filter((id) => id !== bizId) : [...prev, bizId]
    );
  };

  const toggleModulePermission = (modId: string) => {
    setUsrPerms((prev) => ({
      ...prev,
      allowedModules: prev.allowedModules.includes(modId)
        ? prev.allowedModules.filter((m) => m !== modId)
        : [...prev.allowedModules, modId],
    }));
  };

  const handleSaveUserAndPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usrName.trim() || !usrEmail.trim()) {
      setErrorMsg('Please enter user name and email address.');
      return;
    }
    if (!editingUser && usrPassword.trim().length < 6) {
      setErrorMsg('Please provide a password of at least 6 characters.');
      return;
    }
    if (editingUser && usrPassword.trim().length > 0 && usrPassword.trim().length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    setIsSavingUser(true);
    try {
      const assignedBusinessesStr =
        usrAssignAllBiz || usrRole === 'super_admin' || usrRole === 'super_manager'
          ? 'ALL'
          : usrSelectedBizIds.length > 0
          ? usrSelectedBizIds.join(',')
          : fullBusinessList[0]?.id || 'ALL';

      const permissionsJsonStr = JSON.stringify(usrPerms);

      if (editingUser) {
        await updateErpUserPermissions(
          editingUser,
          {
            displayName: usrName.trim(),
            role: editingUser.role === 'super_admin' ? 'super_admin' : usrRole,
            assignedBusinesses: assignedBusinessesStr,
            permissionsJson: permissionsJsonStr,
            status: usrStatus,
            mfaEnabled: usrMfa,
            password: usrPassword.trim() || undefined,
          },
          actorEmail
        );
        showNotice(`Role and access permissions for "${usrName}" updated successfully!`);
      } else {
        await createErpUserAccount(
          {
            displayName: usrName.trim(),
            email: usrEmail.trim().toLowerCase(),
            password: usrPassword.trim(),
            role: usrRole,
            assignedBusinesses: assignedBusinessesStr,
            permissionsJson: permissionsJsonStr,
            status: usrStatus,
            mfaEnabled: usrMfa,
          },
          ownerId,
          actorEmail
        );
        showNotice(`New user "${usrName}" (${usrEmail}) created and permissions assigned successfully!`);
      }
      setShowUserModal(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save user account.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSeedSampleManagers = async () => {
    setIsSavingUser(true);
    try {
      const poultryBiz =
        fullBusinessList.find((b) => b.templateType === 'poultry') || fullBusinessList[0];
      const cattleBiz =
        fullBusinessList.find((b) => b.templateType === 'cattle') || fullBusinessList[1] || fullBusinessList[0];
      const transportBiz =
        fullBusinessList.find((b) => b.templateType === 'transport') || fullBusinessList[0];

      // 1. Super Manager (COO - oversees all 5 businesses and reports to owner)
      await createErpUserAccount(
        {
          displayName: 'Tarek Mahmud (Chief Operating Officer - COO)',
          email: 'coo.tarek@krishivumi.bd',
          role: 'super_manager',
          assignedBusinesses: 'ALL',
          permissionsJson: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.super_manager),
          status: 'active',
          mfaEnabled: true,
        },
        ownerId,
        actorEmail
      );

      // 2. Business Manager for Poultry
      await createErpUserAccount(
        {
          displayName: 'Md. Rafiqul Islam (Poultry Farm Manager)',
          email: 'rafiq.poultry@krishivumi.bd',
          role: 'business_manager',
          assignedBusinesses: poultryBiz ? poultryBiz.id : 'ALL',
          permissionsJson: JSON.stringify({
            ...DEFAULT_ROLE_PERMISSIONS.business_manager,
            allowedModules: ['dashboard', 'poultry', 'inventory', 'stakeholders', 'reports'],
          }),
          status: 'active',
          mfaEnabled: true,
        },
        ownerId,
        actorEmail
      );

      // 3. Business Manager for Livestock
      await createErpUserAccount(
        {
          displayName: 'Dr. Kamrul Hasan (Livestock & Dairy In-Charge)',
          email: 'kamrul.livestock@krishivumi.bd',
          role: 'business_manager',
          assignedBusinesses: cattleBiz ? cattleBiz.id : 'ALL',
          permissionsJson: JSON.stringify({
            ...DEFAULT_ROLE_PERMISSIONS.business_manager,
            allowedModules: ['dashboard', 'cattle', 'goat', 'inventory', 'stakeholders', 'reports'],
          }),
          status: 'active',
          mfaEnabled: true,
        },
        ownerId,
        actorEmail
      );

      // 4. Employee under Poultry
      await createErpUserAccount(
        {
          displayName: 'Tanvir Ahmed (Farm Data Entry & Accounts)',
          email: 'tanvir.staff@krishivumi.bd',
          role: 'employee',
          assignedBusinesses: poultryBiz ? poultryBiz.id : 'ALL',
          permissionsJson: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.employee),
          status: 'active',
          mfaEnabled: false,
        },
        ownerId,
        actorEmail
      );

      // Also seed 2 sample employee stakeholders with appointedBy metadata
      if (stakeholders.filter((s) => s.stakeholderType === 'employee').length <= 2) {
        if (poultryBiz) {
          await createStakeholderRecord(
            {
              stakeholderType: 'employee',
              code: 'EMP-701',
              name: 'Abdul Alim (Poultry Shed Assistant)',
              phone: '+880 1712-445566',
              email: 'alim.poultry@krishivumi.bd',
              address: 'Shed 1, Gazipur Complex',
              businessId: poultryBiz.id,
              businessName: poultryBiz.nameBn || poultryBiz.name,
              designationOrCategory: 'Poultry Shed Assistant',
              monthlySalaryOrCreditLimit: 22000,
              outstandingBalance: 0,
              status: 'active',
              appointedBy: 'Md. Rafiqul Islam (Poultry Manager)',
              appointedByRole: 'business_manager',
              appointedAt: new Date().toISOString(),
            },
            ownerId,
            actorEmail
          );
        }
        if (cattleBiz) {
          await createStakeholderRecord(
            {
              stakeholderType: 'employee',
              code: 'EMP-702',
              name: 'Safiqul Islam (Dairy Caretaker)',
              phone: '+880 1819-334455',
              email: 'safiq.cattle@krishivumi.bd',
              address: 'Shed 2, Dairy Unit',
              businessId: cattleBiz.id,
              businessName: cattleBiz.nameBn || cattleBiz.name,
              designationOrCategory: 'Dairy & Milking Caretaker',
              monthlySalaryOrCreditLimit: 24000,
              outstandingBalance: 0,
              status: 'active',
              appointedBy: 'Dr. Kamrul Hasan (Livestock Lead)',
              appointedByRole: 'business_manager',
              appointedAt: new Date().toISOString(),
            },
            ownerId,
            actorEmail
          );
        }
      }

      showNotice('Hierarchical staff roster seeded successfully! Default password: Krishi@1234');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generating demo team.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSendExecutiveReport = async () => {
    setIsSendingReport(true);
    try {
      await createNotificationRecord({
        title: '📊 Executive General Manager P&L & Operations Report',
        message: `Honorable Owner, COO has submitted the consolidated operations & audited profit report. Remarks: "${executiveReportRemarks.slice(0, 160)}..."`,
        category: 'executive_report',
        priority: 'high',
        businessId: 'ALL',
      });
      showNotice('Executive operations report successfully delivered to Owner inbox!');
      setShowExecutiveReportModal(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error sending report.');
    } finally {
      setIsSendingReport(false);
    }
  };

  // Preset debit/credit accounts when transaction type changes
  const handleSelectVoucherType = (
    t: 'sale' | 'expense' | 'purchase' | 'income' | 'cash_to_bank' | 'bank_to_cash' | 'payroll' | 'adjustment'
  ) => {
    setVType(t);
    const cashAcc = accounts.find((a) => a.subType === 'cash');
    const bankAcc = accounts.find((a) => a.subType === 'bank');
    const revAcc = accounts.find((a) => a.accountType === 'revenue');
    const expAcc = accounts.find((a) => a.subType === 'operating_expense');
    const invAcc = accounts.find((a) => a.subType === 'inventory');
    const payAcc = accounts.find((a) => a.subType === 'payroll');

    if (t === 'cash_to_bank' && bankAcc && cashAcc) {
      setVDebitId(bankAcc.id);
      setVCreditId(cashAcc.id);
      setVCategory('Cash-to-Bank Contra Transfer');
      setVDesc('Deposit cash from HQ Vault to Corporate Bank Account (Non-Revenue)');
    } else if (t === 'bank_to_cash' && cashAcc && bankAcc) {
      setVDebitId(cashAcc.id);
      setVCreditId(bankAcc.id);
      setVCategory('Bank-to-Cash Withdrawal');
      setVDesc('Withdraw cash from Corporate Bank to HQ Vault (Non-Expense)');
    } else if ((t === 'sale' || t === 'income') && bankAcc && revAcc) {
      setVDebitId(bankAcc.id);
      setVCreditId(revAcc.id);
      setVCategory('Commercial Agro Sales');
    } else if (t === 'expense' && expAcc && cashAcc) {
      setVDebitId(expAcc.id);
      setVCreditId(cashAcc.id);
      setVCategory('Direct Farm Operating Expense');
    } else if (t === 'purchase' && invAcc && bankAcc) {
      setVDebitId(invAcc.id);
      setVCreditId(bankAcc.id);
      setVCategory('Feed & Vet Stock Procurement');
    } else if (t === 'payroll' && payAcc && bankAcc) {
      setVDebitId(payAcc.id);
      setVCreditId(bankAcc.id);
      setVCategory('Monthly Employee Salary Disbursement');
    }
  };

  const handlePostVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const debitAcc = accounts.find((a) => a.id === vDebitId);
    const creditAcc = accounts.find((a) => a.id === vCreditId);
    const biz = businesses.find((b) => b.id === vBizId);

    if (!debitAcc || !creditAcc) {
      setErrorMsg('Please select valid Debit and Credit accounts.');
      return;
    }

    const payload = {
      referenceNo: `JV-2026-${Math.floor(100 + Math.random() * 899)}`,
      date: new Date().toISOString().split('T')[0],
      businessId: vBizId,
      businessName: biz ? biz.name : 'Consolidated HQ',
      transactionType: vType,
      category: vCategory,
      description: vDesc || `${vCategory} (${vType.toUpperCase()})`,
      debitAccountId: debitAcc.id,
      debitAccountName: debitAcc.name,
      creditAccountId: creditAcc.id,
      creditAccountName: creditAcc.name,
      amount: Number(vAmount),
      paymentStatus: vPaymentStatus,
      dueAmount: vPaymentStatus === 'paid' ? 0 : Number(vDueAmount),
      counterpartyName: vCounterparty,
    };

    const res = await fetch('/api/erp/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'journal_entry',
        payload,
        userRole,
      }),
    });
    const check = await res.json();
    if (!res.ok || !check.ok) {
      setErrorMsg(check.error || 'Failed validation');
      return;
    }

    await postDoubleEntryTransaction(payload, accounts, ownerId, actorEmail);
    setShowVoucherModal(false);
    showNotice(
      `Voucher ${payload.referenceNo} (${formatBDT(payload.amount)}) saved successfully!`
    );
  };

  const treasuryWallets = accounts.filter(
    (a) => a.subType === 'cash' || a.subType === 'bank'
  );

  const openDepositModal = (preselectId?: string) => {
    setDepAccountId(preselectId || treasuryWallets[0]?.id || '');
    setDepAmount(50000);
    setDepSource('capital');
    setDepNote('');
    setShowDepositModal(true);
  };

  const openTransferModal = (fromId?: string) => {
    const first = fromId || treasuryWallets[0]?.id || '';
    const second =
      treasuryWallets.find((w) => w.id !== first)?.id || treasuryWallets[1]?.id || first;
    setTrFromId(first);
    setTrToId(second);
    setTrAmount(25000);
    setTrNote('');
    setShowTransferModal(true);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!depAccountId || depAmount <= 0) return;
    setIsDepositing(true);
    try {
      await depositToTreasuryAccount({
        targetAccountId: depAccountId,
        amount: Number(depAmount),
        sourceType: depSource,
        businessId: 'ALL',
        businessName: 'Consolidated HQ',
        note: depNote.trim(),
      });
      const accName = treasuryWallets.find((w) => w.id === depAccountId)?.name || 'Account';
      setShowDepositModal(false);
      showNotice(`${formatBDT(Number(depAmount))} deposited successfully to ${accName}!`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error depositing funds.');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleEasyTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!trFromId || !trToId || trFromId === trToId) {
      setErrorMsg('Please select two different accounts (Source and Destination).');
      return;
    }
    const fromAcc = accounts.find((a) => a.id === trFromId);
    const toAcc = accounts.find((a) => a.id === trToId);
    if (!fromAcc || !toAcc) return;

    setIsTransferring(true);
    try {
      const isCashToBank = fromAcc.subType === 'cash' && toAcc.subType === 'bank';
      await postDoubleEntryTransaction(
        {
          referenceNo: `TRF-${Date.now().toString().slice(-5)}`,
          date: new Date().toISOString().split('T')[0],
          businessId: 'ALL',
          businessName: 'Consolidated HQ',
          transactionType: isCashToBank ? 'cash_to_bank' : 'bank_to_cash',
          category: `${fromAcc.name} → ${toAcc.name}`,
          description:
            trNote.trim() || `Fund transfer from ${fromAcc.name} to ${toAcc.name}`,
          // Debit = Destination (adds money to To Account), Credit = Source (subtracts from From Account)
          debitAccountId: toAcc.id,
          debitAccountName: toAcc.name,
          creditAccountId: fromAcc.id,
          creditAccountName: fromAcc.name,
          amount: Number(trAmount),
          paymentStatus: 'paid',
          dueAmount: 0,
          counterpartyName: 'Internal Transfer',
        },
        accounts,
        ownerId,
        actorEmail
      );
      setShowTransferModal(false);
      showNotice(
        `Transferred ${formatBDT(Number(trAmount))} from ${fromAcc.name} to ${toAcc.name}!`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error transferring funds.');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleCreateTreasuryAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!newAccName.trim()) return;
    setIsCreatingAcc(true);
    try {
      await createTreasuryAccount({
        name: newAccName.trim(),
        subType: newAccType,
        openingBalance: Number(newAccOpening) || 0,
      });
      setShowNewAccountModal(false);
      setNewAccName('');
      setNewAccOpening(0);
      showNotice(`Created new ${newAccType === 'cash' ? 'Cash' : 'Bank'} account "${newAccName}"!`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creating account.');
    } finally {
      setIsCreatingAcc(false);
    }
  };

  const handleResetDemoBalances = async () => {
    setIsResettingLedger(true);
    setErrorMsg(null);
    try {
      await resetDemoLedgerToZero();
      setShowResetConfirm(false);
      showNotice('All demo balances and test transactions reset to BDT 0. Ready for real transactions!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error resetting balances.');
    } finally {
      setIsResettingLedger(false);
    }
  };

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    const biz = businesses.find((b) => b.id === invBizId);
    await createInventoryItemWithMovement(
      {
        sku: invSku,
        barcode: `894${Date.now().toString().slice(-10)}`,
        name: invName,
        category: invCat,
        businessId: invBizId,
        businessName: biz ? biz.name : 'Central Warehouse',
        warehouse: invWarehouse,
        unit: invUnit,
        quantity: Number(invQty),
        reorderLevel: Number(invReorder),
        unitCost: Number(invCost),
        sellingPrice: Number(invPrice),
        expiryDate: invExpiry,
        supplierName: invSupplier,
      },
      ownerId,
      actorEmail
    );
    setShowInvModal(false);
    showNotice(`Created SKU ${invSku} (${invName}) with opening stock movement.`);
  };

  const handleCreateOrUpdateStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    const biz = fullBusinessList.find((b) => b.id === stkBizId) || businesses.find((b) => b.id === stkBizId);
    setIsSavingStakeholder(true);
    try {
      if (editingStakeholder) {
        await updateStakeholderRecord(editingStakeholder.id, {
          name: stkName.trim(),
          phone: stkPhone.trim(),
          address: stkAddress.trim(),
          businessId: stkBizId,
          businessName: biz ? (biz.nameBn || biz.name) : editingStakeholder.businessName,
          designationOrCategory: stkRoleCat.trim(),
          monthlySalaryOrCreditLimit: Number(stkSalaryOrLimit),
        });
        showNotice(`Profile for "${stkName}" updated successfully!`);
      } else {
        await createStakeholderRecord(
          {
            stakeholderType: stkType,
            code: `${stkType.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`,
            name: stkName.trim(),
            phone: stkPhone.trim(),
            email: stkEmail.trim() || 'contact@krishivumi.bd',
            address: stkAddress.trim(),
            businessId: stkBizId,
            businessName: biz ? (biz.nameBn || biz.name) : 'All Businesses',
            designationOrCategory: stkRoleCat.trim(),
            monthlySalaryOrCreditLimit: Number(stkSalaryOrLimit),
            outstandingBalance: Number(stkBalance),
            status: 'active',
            appointedBy: actorEmail,
            appointedByRole: userRole,
            appointedAt: new Date().toISOString(),
          },
          ownerId,
          actorEmail
        );
        showNotice(
          `Successfully registered new ${
            stkType === 'employee'
              ? 'Employee'
              : stkType === 'customer'
              ? 'Wholesale Customer'
              : 'Supplier'
          } "${stkName}"!`
        );
      }
      setShowStkModal(false);
      setEditingStakeholder(null);
      setStkName('');
      setStkBalance(0);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving stakeholder.');
    } finally {
      setIsSavingStakeholder(false);
    }
  };

  const handleTerminateStakeholder = async () => {
    if (!terminatingStakeholder) return;
    setIsTerminatingStakeholder(true);
    try {
      await updateStakeholderRecord(terminatingStakeholder.id, {
        status: 'terminated',
        notes: terminationReason.trim() || 'Service completed',
      });
      showNotice(`Staff member "${terminatingStakeholder.name}" has been terminated.`);
      setTerminatingStakeholder(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error removing staff.');
    } finally {
      setIsTerminatingStakeholder(false);
    }
  };

  const openHireStaffModal = (targetBizId?: string) => {
    const bId = targetBizId || (stkBizFilter !== 'ALL' ? stkBizFilter : businesses[0]?.id || 'ALL');
    const biz = fullBusinessList.find((b) => b.id === bId) || businesses.find((b) => b.id === bId);
    setEditingStakeholder(null);
    setStkType('employee');
    setStkName('');
    setStkPhone('+880 1711-000000');
    setStkAddress('Gazipur Complex, Bangladesh');
    setStkBizId(bId);

    if (biz?.templateType === 'transport' || biz?.name?.toLowerCase().includes('transport') || biz?.nameBn?.includes('ট্রাক')) {
      setStkRoleCat('Heavy Truck Driver');
      setStkSalaryOrLimit(28000);
    } else if (biz?.templateType === 'fish' || biz?.nameBn?.includes('মৎস্য')) {
      setStkRoleCat('Pond & Aquaculture Lead');
      setStkSalaryOrLimit(22000);
    } else if (biz?.templateType === 'cattle' || biz?.nameBn?.includes('পশু')) {
      setStkRoleCat('Milking & Cattle Caretaker');
      setStkSalaryOrLimit(20000);
    } else if (biz?.templateType === 'goat' || biz?.nameBn?.includes('ছাগল')) {
      setStkRoleCat('Goat Breeding & Caretaker');
      setStkSalaryOrLimit(18000);
    } else {
      setStkRoleCat('Shed In-Charge / Farm Staff');
      setStkSalaryOrLimit(20000);
    }
    setShowStkModal(true);
  };

  const handleSeedTransportStaff = async () => {
    const transportBiz = fullBusinessList.find(
      (b) => b.templateType === 'transport' || b.name?.toLowerCase().includes('transport') || b.nameBn?.includes('ট্রাক')
    );
    if (!transportBiz) {
      showNotice('Truck & Transport Business not found.');
      return;
    }
    try {
      await createStakeholderRecord(
        {
          stakeholderType: 'employee',
          code: `DRV-${Date.now().toString().slice(-4)}`,
          name: 'Md. Rafiqul Islam (Heavy Truck Driver)',
          phone: '+880 1718-552233',
          email: 'rafiq.driver@krishivumi.bd',
          address: 'Gazipur Central Truck Depot',
          businessId: transportBiz.id,
          businessName: transportBiz.nameBn || transportBiz.name,
          designationOrCategory: 'Heavy Truck Driver (License: DH-84920)',
          monthlySalaryOrCreditLimit: 28000,
          outstandingBalance: 0,
          status: 'active',
          appointedBy: actorEmail,
          appointedByRole: userRole,
          appointedAt: new Date().toISOString(),
        },
        ownerId,
        actorEmail
      );
      await createStakeholderRecord(
        {
          stakeholderType: 'employee',
          code: `HLP-${(Date.now() + 1).toString().slice(-4)}`,
          name: 'Md. Kamal Hossain (Truck Helper)',
          phone: '+880 1812-774411',
          email: 'kamal.helper@krishivumi.bd',
          address: 'Sreepur Feed Depot',
          businessId: transportBiz.id,
          businessName: transportBiz.nameBn || transportBiz.name,
          designationOrCategory: 'Truck Helper & Cargo Loading Staff',
          monthlySalaryOrCreditLimit: 15000,
          outstandingBalance: 0,
          status: 'active',
          appointedBy: actorEmail,
          appointedByRole: userRole,
          appointedAt: new Date().toISOString(),
        },
        ownerId,
        actorEmail
      );
      showNotice('Added 1 Heavy Driver and 1 Helper for Truck & Transport Business!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add transport staff.');
    }
  };

  const openStkPayModal = (target: ErpStakeholder, defaultAmt?: number) => {
    setStkPayTarget(target);
    const base = target.monthlySalaryOrCreditLimit || 20000;
    setSalaryBase(base);
    setSalaryDaysTotal(30);
    setSalaryDaysWorked(30);
    setSalaryBonus(0);
    setSalaryDeduction(0);
    const initialAmt =
      defaultAmt !== undefined
        ? defaultAmt
        : target.stakeholderType === 'employee'
        ? base
        : target.outstandingBalance > 0
        ? target.outstandingBalance
        : 10000;
    setStkPayAmount(initialAmt);
    setStkPayWalletId(treasuryWallets[0]?.id || accounts[0]?.id || '');
    setStkPayDate(new Date().toISOString().split('T')[0]);
    setStkPayNote(
      target.stakeholderType === 'employee'
        ? `${formatMonthFilterLabel(activeMonthFilter, false)} Salary`
        : ''
    );
  };

  const handleStakeholderPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stkPayTarget || !stkPayWalletId || stkPayAmount <= 0) return;
    setIsSettlingStk(true);
    setErrorMsg(null);
    try {
      let finalNote = stkPayNote.trim();
      if (stkPayTarget.stakeholderType === 'employee') {
        const formulaParts: string[] = [];
        if (salaryDaysWorked !== 30) {
          formulaParts.push(`Attendance: ${salaryDaysWorked}/30 days`);
        }
        if (salaryBonus > 0) {
          formulaParts.push(`Bonus: +BDT ${salaryBonus}`);
        }
        if (salaryDeduction > 0) {
          formulaParts.push(`Deduction: -BDT ${salaryDeduction}`);
        }
        const formulaText = formulaParts.length > 0 ? ` [${formulaParts.join(', ')}]` : '';
        finalNote = finalNote
          ? `${finalNote}${formulaText}`
          : `${formatMonthFilterLabel(activeMonthFilter, false)} Salary${formulaText}`;
      }

      const refNo = await settleStakeholderPayment({
        stakeholderId: stkPayTarget.id,
        walletAccountId: stkPayWalletId,
        amount: Number(stkPayAmount),
        date: stkPayDate,
        note: finalNote,
      });
      const actionText =
        stkPayTarget.stakeholderType === 'employee'
          ? 'Salary Payment'
          : stkPayTarget.stakeholderType === 'customer'
          ? 'Due Collection'
          : 'Payable Settlement';
      const walletAcc = treasuryWallets.find((w) => w.id === stkPayWalletId) || accounts.find((a) => a.id === stkPayWalletId);

      // Immediately generate printable slip
      setActiveSlip({
        type: stkPayTarget.stakeholderType === 'employee' ? 'salary_payslip' : 'money_receipt',
        slipNo: `SLIP-${refNo || Date.now().toString().slice(-6)}`,
        date: stkPayDate,
        businessName: stkPayTarget.businessName,
        recipientName: stkPayTarget.name,
        designation: stkPayTarget.designationOrCategory,
        recipientPhone: stkPayTarget.phone,
        appointedBy: stkPayTarget.appointedBy || 'Executive Owner Direct',
        amount: Number(stkPayAmount),
        paymentMethod: walletAcc ? walletAcc.name : 'Cash in Hand',
        note: finalNote || `${formatMonthFilterLabel(activeMonthFilter, false)} ${actionText}`,
        totalAmount: Number(stkPayAmount),
        enteredBy: actorEmail,
      });

      setStkPayTarget(null);
      showNotice(
        `${actionText} of ${formatBDT(Number(stkPayAmount))} for ${stkPayTarget.name} completed! Printable slip generated below.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error processing payment.');
    } finally {
      setIsSettlingStk(false);
    }
  };

  const handleSettleManagerSalary = async () => {
    if (!mgrPayTarget) return;
    const finalAmount = Math.max(0, Number(mgrPayAmount) + Number(mgrPayBonus) - Number(mgrPayDeduction));
    if (finalAmount <= 0) {
      setErrorMsg('Salary amount cannot be zero.');
      return;
    }
    const targetWalletId = mgrPayWalletId || treasuryWallets[0]?.id || accounts[0]?.id;
    if (!targetWalletId) {
      setErrorMsg('Please select a payment wallet or bank account.');
      return;
    }

    setIsSettlingMgr(true);
    setErrorMsg(null);
    try {
      const expenseAcc =
        accounts.find(
          (a) =>
            a.accountType === 'expense' &&
            (a.code === '5010' || a.name.includes('বেতন') || a.name.toLowerCase().includes('payroll'))
        ) || accounts.find((a) => a.accountType === 'expense');

      if (!expenseAcc) {
        throw new Error('Payroll expense ledger account not found.');
      }

      const assignedBiz = mgrPayTarget.assignedBusinesses || 'ALL';
      const bizId =
        assignedBiz !== 'ALL' && assignedBiz.length > 0
          ? assignedBiz.split(',')[0].trim()
          : (businesses[0]?.id || 'biz-poultry');

      const refNo = `MGR-PAY-${Date.now().toString().slice(-6)}`;
      const formulaParts: string[] = [];
      if (mgrPayBonus > 0) formulaParts.push(`Bonus: +BDT ${mgrPayBonus}`);
      if (mgrPayDeduction > 0) formulaParts.push(`Deduction: -BDT ${mgrPayDeduction}`);
      const formulaText = formulaParts.length > 0 ? ` [${formulaParts.join(', ')}]` : '';
      const finalNote = mgrPayNote
        ? `${mgrPayNote}${formulaText}`
        : `${formatMonthFilterLabel(activeMonthFilter, false)} Division Manager Remuneration${formulaText}`;

      const walletAcc = treasuryWallets.find((w) => w.id === targetWalletId) || accounts.find((a) => a.id === targetWalletId);

      await postDoubleEntryTransaction(
        {
          businessId: bizId,
          businessName: assignedBiz === 'ALL' ? 'RegardsAgro Enterprise' : `Division Lead — ${assignedBiz}`,
          debitAccountId: expenseAcc.id,
          debitAccountName: expenseAcc.name,
          creditAccountId: targetWalletId,
          creditAccountName: walletAcc ? walletAcc.name : 'Cash in Hand',
          amount: finalAmount,
          date: mgrPayDate,
          description: `Division Manager Remuneration — ${mgrPayTarget.displayName} (${finalNote})`,
          referenceNo: refNo,
          transactionType: 'payroll',
          category: 'payroll',
          dueAmount: 0,
          counterpartyName: mgrPayTarget.displayName,
          paymentStatus: 'paid',
        },
        accounts,
        ownerId,
        actorEmail
      );

      // Generate official Manager Payslip
      setActiveSlip({
        type: 'salary_payslip',
        slipNo: refNo,
        date: mgrPayDate,
        businessName: assignedBiz === 'ALL' ? 'RegardsAgro Enterprise' : `Division Lead — ${assignedBiz}`,
        recipientName: mgrPayTarget.displayName,
        designation: 'Division Manager',
        recipientPhone: mgrPayTarget.phone || '+880 1711-000000',
        appointedBy: 'General Manager & Super Admin',
        amount: finalAmount,
        paymentMethod: walletAcc ? walletAcc.name : 'Cash in Hand',
        note: finalNote,
        totalAmount: finalAmount,
        enteredBy: actorEmail,
      });

      setMgrPayTarget(null);
      showNotice(
        `Disbursed ${formatBDT(finalAmount)} manager salary to ${mgrPayTarget.displayName}! Printable slip generated below.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error disbursing manager salary.');
    } finally {
      setIsSettlingMgr(false);
    }
  };

  const handleSendDiscrepancyNotice = async (invItem: ErpInventoryItem, shortage: number, lossBDT: number) => {
    setIsSendingDiscrepancyNotice(true);
    try {
      await createNotificationRecord({
        title: `🚨 গোডাউন অডিটে ${shortage} ${invItem.unit} ফিড/পণ্য ঘাটতি ধরা পড়েছে!`,
        message: `সতর্কবার্তা: "${invItem.name}"-এর সিস্টেমে মজুত ছিল ${invItem.quantity} ${invItem.unit}, কিন্তু মালিকের ফিজিক্যাল অডিটে পাওয়া গেছে মাত্র ${Number(invItem.quantity) - shortage} ${invItem.unit}! ${shortage} ${invItem.unit} ঘাটতি (আর্থিক ক্ষতি: ${formatBDT(lossBDT)}) শনাক্ত হয়েছে। সংশ্লিষ্ট ম্যানেজার ও কর্মীকে অবিলম্বে দোকান/মিলের মূল ক্যাশ মেমো ও চালান স্লিপসহ হাজির হতে নির্দেশ দেওয়া হলো।`,
        category: 'audit_fraud_alert',
        priority: 'critical',
        businessId: invItem.businessId,
      });
      showNotice(`ম্যানেজার ও কর্মীদের কাছে ${shortage} ${invItem.unit} ঘাটতির কৈফিয়ত চেয়ে নোটিশ পাঠানো হয়েছে!`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'নোটিশ পাঠাতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSendingDiscrepancyNotice(false);
    }
  };

  const handleReconcilePhysicalStock = async (invItem: ErpInventoryItem, actualCount: number) => {
    const diff = actualCount - invItem.quantity;
    if (diff === 0) return;
    setIsReconcilingStock(true);
    try {
      await recordStockMovement(
        invItem,
        'adjustment',
        diff,
        invItem.warehouse,
        'মালিকের ফিজিক্যাল অডিট সমন্বয়',
        `মালিকের ফিজিক্যাল অডিটে ধরা পড়া গরমিল সমন্বয় (প্রকৃত গোডাউন গণনা: ${actualCount} ${invItem.unit}, পূর্বে সিস্টেমে ছিল: ${invItem.quantity} ${invItem.unit})`,
        actorEmail
      );
      showNotice(`গোডাউনের বাস্তব গণনা অনুযায়ী স্টক সমন্বয় সফল হয়েছে! বর্তমান সঠিক মজুত: ${actualCount} ${invItem.unit}`);
      setAuditPhysicalCount('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'স্টক সমন্বয় করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsReconcilingStock(false);
    }
  };

  const openStockMoveModal = (
    item: ErpInventoryItem,
    type: 'purchase' | 'consumption' | 'sale' | 'transfer' | 'adjustment'
  ) => {
    setStockMoveItem(item);
    setSmType(type);
    setSmQty(type === 'purchase' ? 20 : 5);
    setSmDest(type === 'purchase' ? item.warehouse : `${item.businessName} খামার ব্যবহার`);
    setSmNotes('');
    setSmSupplierMemoNo('');
    setSmPostExpense(false);
    setSmPayAccId(treasuryWallets[0]?.id || accounts[0]?.id || '');
  };

  const handleCustomStockMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockMoveItem || smQty <= 0) return;
    setIsMovingStock(true);
    setErrorMsg(null);
    try {
      const src = smType === 'purchase' ? stockMoveItem.supplierName : stockMoveItem.warehouse;
      const dst = smDest.trim() || stockMoveItem.warehouse;
      const memoTag = smSupplierMemoNo.trim() ? ` [চালান/মেমো: ${smSupplierMemoNo.trim()}]` : '';
      await recordStockMovement(
        stockMoveItem,
        smType,
        Number(smQty),
        src,
        dst,
        (smNotes.trim() || `${smType} (${smQty} ${stockMoveItem.unit})`) + memoTag,
        actorEmail
      );

      if (smType === 'purchase' && smPostExpense && smPayAccId) {
        const payAcc = accounts.find((a) => a.id === smPayAccId);
        const expAcc =
          accounts.find((a) => a.subType === 'operating_expense' || a.accountType === 'expense') ||
          accounts[0];
        if (payAcc && expAcc) {
          const totalCost = Number(smQty) * Number(stockMoveItem.unitCost);
          await postDoubleEntryTransaction(
            {
              referenceNo: `STK-${Date.now().toString().slice(-5)}`,
              date: new Date().toISOString().split('T')[0],
              businessId: stockMoveItem.businessId,
              businessName: stockMoveItem.businessName,
              transactionType: 'purchase',
              category: `স্টক ক্রয়: ${stockMoveItem.name}`,
              description: `${smQty} ${stockMoveItem.unit} @ ${formatBDT(stockMoveItem.unitCost)}${memoTag}`,
              debitAccountId: expAcc.id,
              debitAccountName: expAcc.name,
              creditAccountId: payAcc.id,
              creditAccountName: payAcc.name,
              amount: totalCost,
              paymentStatus: 'paid',
              dueAmount: 0,
              counterpartyName: stockMoveItem.supplierName,
            },
            accounts,
            ownerId,
            actorEmail
          );
        }
      }

      // Immediately generate printable Challan slip for purchase
      if (smType === 'purchase') {
        const payAcc = treasuryWallets.find((w) => w.id === smPayAccId) || accounts.find((a) => a.id === smPayAccId);
        setActiveSlip({
          type: 'goods_purchase_slip',
          slipNo: `CHALLAN-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString().split('T')[0],
          businessName: stockMoveItem.businessName,
          recipientName: dst,
          amount: Number(smQty) * Number(stockMoveItem.unitCost),
          paymentMethod: smPostExpense && payAcc ? payAcc.name : 'বাকি / পরে সমন্বয়',
          note: smNotes.trim() || 'গোডাউনে নতুন পণ্য/ফিড ইনওয়ার্ড',
          supplierName: stockMoveItem.supplierName,
          supplierMemoNo: smSupplierMemoNo.trim() || 'মিলের মূল মেমো নং দেওয়া হয়নি',
          itemName: stockMoveItem.name,
          quantity: Number(smQty),
          unit: stockMoveItem.unit,
          unitPrice: stockMoveItem.unitCost,
          totalAmount: Number(smQty) * Number(stockMoveItem.unitCost),
          enteredBy: actorEmail,
        });
      }

      setStockMoveItem(null);
      showNotice(
        `${stockMoveItem.name}-এর ${smQty} ${stockMoveItem.unit} (${
          smType === 'purchase' ? 'স্টক ইন' : 'স্টক আউট'
        }) সফলভাবে আপডেট হয়েছে! চালান স্লিপ নিচে দেখুন।`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'স্টক আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsMovingStock(false);
    }
  };

  const filteredJournals = journalEntries.filter(
    (j) =>
      (selectedBizId === 'ALL' || j.businessId === selectedBizId) &&
      matchesMonthFilter(j.date, activeMonthFilter)
  );

  const handleExportCsv = () => {
    if (filteredJournals.length === 0) {
      showNotice(
        activeSection === 'reports' || activeSection === 'security'
          ? 'No transactions found to export for this period.'
          : 'এক্সপোর্ট করার মতো কোনো লেনদেন পাওয়া যায়নি।'
      );
      return;
    }
    const headers = ['Voucher No', 'Date', 'Business', 'Category', 'Type', 'Description', 'Debit Account', 'Credit Account', 'Amount (BDT)', 'Due (BDT)', 'Status', 'Counterparty'];
    const rows = filteredJournals.map((j) => [
      `"${j.referenceNo}"`,
      `"${j.date}"`,
      `"${j.businessName}"`,
      `"${j.category}"`,
      `"${j.transactionType}"`,
      `"${(j.description || '').replace(/"/g, '""')}"`,
      `"${j.debitAccountName}"`,
      `"${j.creditAccountName}"`,
      j.amount,
      j.dueAmount || 0,
      `"${j.status}"`,
      `"${(j.counterpartyName || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KrishiVumi_Ledger_${activeMonthFilter}_${selectedBizId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('লেজার সিএসভি (CSV) ফাইল ডাউনলোড সম্পন্ন হয়েছে!');
  };
  const monthlyPostedJournals = filteredJournals.filter((j) => j.status === 'posted');
  const filteredInventory = inventoryItems.filter(
    (i) => selectedBizId === 'ALL' || i.businessId === selectedBizId
  );
  const filteredStockMovements = stockMovements.filter(
    (m) =>
      (selectedBizId === 'ALL' || m.businessId === selectedBizId) &&
      matchesMonthFilter(m.date, activeMonthFilter)
  );

  return (
    <div className="space-y-6">
      {activeSection !== 'security' && (
        <MonthFilterBar
          value={activeMonthFilter}
          onChange={setMonthFilter}
          bn={activeSection === 'reports' ? false : true}
        />
      )}
      {toastMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. REDESIGNED ACCOUNTING & LEDGER TAB */}
      {activeSection === 'accounting' && (
        <AccountingAndLedgerTab
          businesses={businesses}
          allBusinesses={fullBusinessList}
          accounts={accounts}
          journalEntries={journalEntries}
          stakeholders={stakeholders}
          erpUsers={erpUsers}
          currentUser={currentUser}
          userRole={userRole}
          assignedBusinessFilter={assignedBusinessFilter}
          lang={lang}
          onShowNotice={showNotice}
          onShowError={(err) => setErrorMsg(err)}
          onRefreshData={() => {}}
          onSetActiveSlip={setActiveSlip}
        />
      )}

      {/* 2. REDESIGNED GODOWN & STOCK MANAGEMENT TAB */}
      {activeSection === 'inventory' && (
        <GodownAndStockTab
          businesses={businesses}
          allBusinesses={fullBusinessList}
          accounts={accounts}
          journalEntries={journalEntries}
          inventoryItems={inventoryItems}
          stockMovements={stockMovements}
          stakeholders={stakeholders}
          erpUsers={erpUsers}
          currentUser={currentUser}
          userRole={userRole}
          assignedBusinessFilter={assignedBusinessFilter}
          lang={lang}
          onShowNotice={showNotice}
          onShowError={(err) => setErrorMsg(err)}
          onRefreshData={() => {}}
          onSetActiveSlip={setActiveSlip}
        />
      )}

      {/* 3. REDESIGNED SALARY MANAGEMENT & PAYROLL TAB */}
      {activeSection === 'stakeholders' && (
        <SalaryManagementTab
          businesses={businesses}
          allBusinesses={fullBusinessList}
          accounts={accounts}
          journalEntries={journalEntries}
          stakeholders={stakeholders}
          erpUsers={erpUsers}
          currentUser={currentUser}
          userRole={userRole}
          assignedBusinessFilter={assignedBusinessFilter}
          lang={lang}
          onShowNotice={showNotice}
          onShowError={(err) => setErrorMsg(err)}
          onRefreshData={() => {}}
          onOpenProfile={(email, name, role) => {
            setViewingProfile({
              id: email || name || 'emp-id',
              name: name || 'Staff Member',
              email: email || '',
              phone: '+880 1711-000000',
              nidNumber: '',
              role: (role as any) || 'employee',
              designation: 'Staff',
              businessName: 'Agro Enterprise',
              status: 'active',
            });
          }}
          onSetActiveSlip={setActiveSlip}
        />
      )}

      {/* 4. ENTERPRISE P&L CARDS & ANALYTICS */}
      {activeSection === 'reports' && (() => {
        const toEnglishCategory = (rawCat?: string): string => {
          if (!rawCat) return 'Operational Overhead';
          const c = rawCat.trim();
          if (c.includes('বাচ্চা') && c.includes('ক্রয়')) return 'Day-Old Chicks (DOC) Purchase';
          if (c.includes('বাচ্চা')) return 'Chicks / Offspring Purchase';
          if (c.includes('খাবার') || c.includes('ফিড')) return 'Animal Feed & Nutrition';
          if (c.includes('ওষুধ') || c.includes('ভ্যাকসিন') || c.includes('চিকিৎসা')) return 'Veterinary Medicine & Vaccines';
          if (c.includes('বেতন') || c.includes('মজুরি') || c.includes('রিম্যুনারেশন')) return 'Staff Payroll & Wages';
          if (c.includes('ডিজেল') || c.includes('জ্বালানী') || c.includes('ফুয়েল')) return 'Diesel & Fuel';
          if (c.includes('টোল') || c.includes('ঘাট')) return 'Highway Tolls & Transit';
          if (c.includes('চালক') || c.includes('ড্রাইভার')) return 'Driver Allowance & Per Diem';
          if (c.includes('মেরামত') || c.includes('সার্ভিসিং')) return 'Equipment Maintenance & Repair';
          if (c.includes('ডিম') && c.includes('বিক্রি')) return 'Egg Sales Revenue';
          if (c.includes('মুরগি') && c.includes('বিক্রি')) return 'Broiler & Poultry Sales';
          if (c.includes('দুধ') && c.includes('বিক্রি')) return 'Dairy & Fresh Milk Sales';
          if (c.includes('মাছ') && c.includes('বিক্রি')) return 'Fish Harvest Sales';
          if (c.includes('গরু') && c.includes('বিক্রি')) return 'Cattle & Live Bull Sales';
          if (c.includes('ছাগল') && c.includes('বিক্রি')) return 'Goat & Meat Sales';
          if (c.includes('ট্রাক') || c.includes('ভাড়া') || c.includes('ট্রিপ')) return 'Commercial Freight Revenue';
          if (c.includes('বিক্রি') || c.includes('আয়')) return c.replace(/বিক্রি|আয়/g, 'Sales / Income');
          if (c.includes('খরচ') || c.includes('ব্যয়')) return c.replace(/খরচ|ব্যয়/g, 'Operational Cost');
          return c;
        };

        const toEnglishBusinessName = (rawName?: string, bizId?: string): string => {
          if (!rawName && !bizId) return 'General Business Unit';
          const matched = businesses.find((b) => b.id === bizId || b.name === rawName || b.nameBn === rawName);
          if (matched?.name) return matched.name;
          if (!rawName) return 'Business Unit';
          if (rawName.includes('পোল্ট্রি') || rawName.toLowerCase().includes('poultry')) return 'Poultry Farming';
          if (rawName.includes('গবাদি') || rawName.includes('গরু') || rawName.includes('ডেইরি') || rawName.toLowerCase().includes('cattle')) return 'Cattle Farming';
          if (rawName.includes('ছাগল') || rawName.toLowerCase().includes('goat')) return 'Goat Farming';
          if (rawName.includes('মৎস্য') || rawName.includes('মাছ') || rawName.toLowerCase().includes('fish')) return 'Fish Farming';
          if (rawName.includes('ট্রাক') || rawName.includes('পরিবহন') || rawName.toLowerCase().includes('trans')) return 'Truck & Transport Business';
          return rawName;
        };

        const toEnglishLocation = (loc?: string): string => {
          if (!loc) return '';
          if (loc.includes('কুষ্টিয়া') || loc.includes('কুমারখালী')) return 'Kumarkhali, Kushtia, Bangladesh';
          if (loc.includes('সাভার') || loc.includes('ঢাকা')) return 'Savar Dairy Belt, Dhaka';
          if (loc.includes('গাজীপুর') || loc.includes('শ্রীপুর')) return 'Sreepur, Gazipur, Bangladesh';
          if (loc.includes('ময়মনসিংহ') || loc.includes('ত্রিশাল')) return 'Trishal, Mymensingh, Bangladesh';
          if (loc.includes('তেজগাঁও')) return 'Tejgaon Industrial Area, Dhaka';
          return loc;
        };

        const periodJournals = journalEntries.filter(
          (j) => j.status === 'posted' && matchesMonthFilter(j.date, activeMonthFilter)
        );
        const totalPeriodRev = periodJournals
          .filter((j) => j.transactionType === 'sale' || j.transactionType === 'income')
          .reduce((s, j) => s + j.amount, 0);
        const totalPeriodOpExp = periodJournals
          .filter((j) => j.transactionType === 'expense' || j.transactionType === 'purchase')
          .reduce((s, j) => s + j.amount, 0);
        const totalPeriodPayroll = periodJournals
          .filter((j) => j.transactionType === 'payroll')
          .reduce((s, j) => s + j.amount, 0);
        const totalPeriodExp = totalPeriodOpExp + totalPeriodPayroll;
        const totalPeriodNet = totalPeriodRev - totalPeriodExp;
        const totalPeriodDue = periodJournals.reduce((s, j) => s + (j.dueAmount || 0), 0);
        const profitMarginPct =
          totalPeriodRev > 0 ? ((totalPeriodNet / totalPeriodRev) * 100).toFixed(1) : '0.0';

        // Group expenses & revenue by category with guaranteed English mapping
        const expenseByCategoryMap: Record<string, { category: string; businessName: string; amount: number; count: number }> = {};
        const revenueByCategoryMap: Record<string, { category: string; businessName: string; amount: number; count: number }> = {};

        for (const j of periodJournals) {
          const engCat = toEnglishCategory(j.category);
          const engBiz = toEnglishBusinessName(j.businessName, j.businessId);

          if (
            j.transactionType === 'expense' ||
            j.transactionType === 'purchase' ||
            j.transactionType === 'payroll'
          ) {
            const key = `${engCat}__${engBiz}`;
            if (!expenseByCategoryMap[key]) {
              expenseByCategoryMap[key] = {
                category: engCat,
                businessName: engBiz,
                amount: 0,
                count: 0,
              };
            }
            expenseByCategoryMap[key].amount += j.amount;
            expenseByCategoryMap[key].count += 1;
          } else if (j.transactionType === 'sale' || j.transactionType === 'income') {
            const key = `${engCat}__${engBiz}`;
            if (!revenueByCategoryMap[key]) {
              revenueByCategoryMap[key] = {
                category: engCat,
                businessName: engBiz,
                amount: 0,
                count: 0,
              };
            }
            revenueByCategoryMap[key].amount += j.amount;
            revenueByCategoryMap[key].count += 1;
          }
        }

        const expenseCategories = Object.values(expenseByCategoryMap).sort(
          (a, b) => b.amount - a.amount
        );
        const revenueCategories = Object.values(revenueByCategoryMap).sort(
          (a, b) => b.amount - a.amount
        );

        return (
          <div className="space-y-4">
            {/* Header & Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <FileBarChart className="h-5 w-5 text-emerald-600" />
                  <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    Profit & Loss and Sector Analytics ({formatMonthFilterLabel(activeMonthFilter, false)})
                  </h1>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Business-wise performance, expense & revenue breakdowns, and financial health summary.
                </p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / PDF
                </button>
              </div>
            </div>

            {/* 1. HERO 4-CARD EXECUTIVE P&L SUMMARY (COMPACT & SLEEK) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/30 dark:to-slate-900 p-2.5 sm:p-3 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Total Revenue
                  </span>
                  <div className="h-6 w-6 rounded-md bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg lg:text-xl font-black font-mono tabular-nums text-slate-900 dark:text-white truncate">
                  {formatBDT(totalPeriodRev)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {revenueCategories.length} revenue streams
                </div>
              </div>

              <div className="rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/70 to-white dark:from-rose-950/20 dark:to-slate-900 p-2.5 sm:p-3 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                    Total Expenses
                  </span>
                  <div className="h-6 w-6 rounded-md bg-rose-600/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <TrendingDown className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg lg:text-xl font-black font-mono tabular-nums text-slate-900 dark:text-white truncate">
                  {formatBDT(totalPeriodExp)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  OpEx: {formatBDT(totalPeriodOpExp)} · Pay: {formatBDT(totalPeriodPayroll)}
                </div>
              </div>

              <div
                className={`rounded-xl border p-2.5 sm:p-3 shadow-2xs space-y-1 ${
                  totalPeriodNet >= 0
                    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
                    : 'border-rose-500/40 bg-gradient-to-br from-rose-600 to-red-700 text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                    {totalPeriodNet >= 0 ? 'Net Profit' : 'Net Loss'}
                  </span>
                  <div className="h-6 w-6 rounded-md bg-white/20 text-white flex items-center justify-center">
                    <Coins className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg lg:text-xl font-black font-mono tabular-nums truncate">
                  {formatBDT(totalPeriodNet)}
                </div>
                <div className="text-[10px] font-semibold text-white/90 truncate">
                  Margin: {profitMarginPct}%
                </div>
              </div>

              <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/20 dark:to-slate-900 p-2.5 sm:p-3 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Receivables (Due)
                  </span>
                  <div className="h-6 w-6 rounded-md bg-amber-600/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Wallet className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg lg:text-xl font-black font-mono tabular-nums text-amber-700 dark:text-amber-400 truncate">
                  {formatBDT(totalPeriodDue)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Uncollected balances
                </div>
              </div>
            </div>

            {/* 2. BUSINESS-WISE P&L CARDS GRID (COMPACT & SLEEK) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Business-Wise P&L Overview
                </h2>
                <span className="text-xs font-mono text-slate-500">
                  {businesses.length} Business Units
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {businesses.map((biz) => {
                  const bEntries = periodJournals.filter((j) => j.businessId === biz.id);
                  const rev = bEntries
                    .filter((j) => j.transactionType === 'sale' || j.transactionType === 'income')
                    .reduce((s, j) => s + j.amount, 0);
                  const exp = bEntries
                    .filter(
                      (j) =>
                        j.transactionType === 'expense' ||
                        j.transactionType === 'purchase' ||
                        j.transactionType === 'payroll'
                    )
                    .reduce((s, j) => s + j.amount, 0);
                  const due = bEntries.reduce((s, j) => s + (j.dueAmount || 0), 0);
                  const net = rev - exp;
                  const margin = rev > 0 ? ((net / rev) * 100).toFixed(0) : '0';
                  const expRatioPct = rev > 0 ? Math.min(100, Math.round((exp / rev) * 100)) : exp > 0 ? 100 : 0;
                  const engName = toEnglishBusinessName(biz.name, biz.id);
                  const engLoc = toEnglishLocation(biz.location);

                  return (
                    <div
                      key={biz.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md transition-all relative overflow-visible flex flex-col justify-between p-3 space-y-2"
                    >
                      <div
                        className={`h-1 w-full rounded-t-xl absolute top-0 left-0 right-0 ${
                          net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />

                      {/* Header Line */}
                      <div className="flex items-start justify-between gap-2 pt-0.5">
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {engName}
                          </h3>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {biz.code} · {engLoc}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                            net > 0
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : net < 0
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {net >= 0 ? `+${margin}%` : `${margin}%`} Net
                        </span>
                      </div>

                      {/* 3-Column Stats Box */}
                      <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-xs">
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Revenue</div>
                          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-[13px] mt-0.5 truncate">
                            {formatBDT(rev)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Expenses</div>
                          <div className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs sm:text-[13px] mt-0.5 truncate">
                            {formatBDT(exp)}
                          </div>
                        </div>
                        <div className="group/profit relative text-right cursor-help">
                          <div className="text-[10px] text-slate-500 font-medium flex items-center justify-end gap-1">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                net >= 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                              }`}
                            />
                            <span>{net >= 0 ? 'Net Profit' : 'Net Loss'}</span>
                          </div>
                          <div
                            className={`font-mono font-extrabold text-xs sm:text-[13px] mt-0.5 truncate ${
                              net >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatBDT(net)}
                          </div>

                          {/* Hover Card in English */}
                          <div className="absolute bottom-full right-0 mb-2 w-60 opacity-0 invisible group-hover/profit:opacity-100 group-hover/profit:visible transition-all duration-200 transform translate-y-1 group-hover/profit:translate-y-0 pointer-events-none z-50">
                            <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white rounded-xl p-3 shadow-2xl border border-emerald-500/30 text-left space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                <span className="text-xs font-bold text-slate-100 truncate">
                                  {engName}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    net >= 0
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {margin}% Margin
                                </span>
                              </div>
                              <div className="text-center py-0.5">
                                <div className="text-[10px] text-slate-400">Actual Net P&L</div>
                                <div
                                  className={`text-base font-black font-mono ${
                                    net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {formatBDT(net)}
                                </div>
                              </div>
                              <div className="bg-slate-950/80 rounded-lg p-2 space-y-1 text-[11px] font-mono">
                                <div className="flex justify-between text-slate-300">
                                  <span>Revenue:</span>
                                  <span className="text-emerald-400 font-bold">+{formatBDT(rev)}</span>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>Expenses:</span>
                                  <span className="text-rose-400 font-bold">-{formatBDT(exp)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-slate-900 dark:border-t-slate-950 ml-auto mr-4 -mt-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Thin Progress bar & due indicator */}
                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 pt-0.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="shrink-0 font-medium text-slate-500 dark:text-slate-400">
                            Cost Ratio: {expRatioPct}%
                          </span>
                          <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                expRatioPct >= 100
                                  ? 'bg-rose-500'
                                  : expRatioPct >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600'
                              }`}
                              style={{ width: `${expRatioPct}%` }}
                            />
                          </div>
                        </div>
                        {due > 0 && (
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                            Due: {formatBDT(due)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. EXCEL-STYLE SECTOR BREAKDOWN TABLES (EXPENSE & REVENUE) - DESIGNATED SCROLL BOX */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Table A: Expense by Sector */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                      <PieChart className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        Expense by Sector (Cost Breakdown)
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        {expenseCategories.length} categories recorded
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200/50 dark:border-rose-900/50">
                    Total: {formatBDT(totalPeriodExp)}
                  </span>
                </div>

                {/* Designated Fixed Height Container with Custom Scrollbar */}
                <div className="h-56 overflow-y-auto overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 [scrollbar-width:thin] scrollbar-thin">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700 select-none z-10">
                      <tr>
                        <th className="py-2 px-2.5 w-10 text-center border-r border-slate-200 dark:border-slate-700">#</th>
                        <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700">Sector / Category</th>
                        <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700">Business Unit</th>
                        <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700">Txns</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-200 dark:border-slate-700">Share</th>
                        <th className="py-2 px-3 text-right">Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {expenseCategories.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                            No expense records found for this period.
                          </td>
                        </tr>
                      ) : (
                        expenseCategories.map((item, idx) => {
                          const pct =
                            totalPeriodExp > 0
                              ? ((item.amount / totalPeriodExp) * 100).toFixed(1)
                              : '0.0';
                          return (
                            <tr
                              key={`${item.category}-${item.businessName}`}
                              className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors"
                            >
                              <td className="py-1.5 px-2.5 text-center font-mono text-[11px] text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                {idx + 1}
                              </td>
                              <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                                {item.category}
                              </td>
                              <td className="py-1.5 px-3 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 truncate max-w-[130px]">
                                {item.businessName}
                              </td>
                              <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-100 dark:border-slate-800">
                                {item.count}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                {pct}%
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                {formatBDT(item.amount)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {expenseCategories.length > 0 && (
                      <tfoot className="sticky bottom-0 bg-slate-50 dark:bg-slate-800/95 font-bold border-t-2 border-slate-200 dark:border-slate-700 text-xs z-10">
                        <tr>
                          <td colSpan={3} className="py-2 px-3 text-slate-700 dark:text-slate-200">
                            Total ({expenseCategories.length} Categories)
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                            {expenseCategories.reduce((s, c) => s + c.count, 0)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                            100%
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                            {formatBDT(totalPeriodExp)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Table B: Revenue by Sector */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        Revenue by Sector (Income Streams)
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        {revenueCategories.length} revenue streams recorded
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200/50 dark:border-emerald-900/50">
                    Total: {formatBDT(totalPeriodRev)}
                  </span>
                </div>

                {/* Designated Fixed Height Container with Custom Scrollbar */}
                <div className="h-56 overflow-y-auto overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 [scrollbar-width:thin] scrollbar-thin">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700 select-none z-10">
                      <tr>
                        <th className="py-2 px-2.5 w-10 text-center border-r border-slate-200 dark:border-slate-700">#</th>
                        <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700">Stream / Category</th>
                        <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700">Business Unit</th>
                        <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700">Txns</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-200 dark:border-slate-700">Share</th>
                        <th className="py-2 px-3 text-right">Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {revenueCategories.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                            No revenue records found for this period.
                          </td>
                        </tr>
                      ) : (
                        revenueCategories.map((item, idx) => {
                          const pct =
                            totalPeriodRev > 0
                              ? ((item.amount / totalPeriodRev) * 100).toFixed(1)
                              : '0.0';
                          return (
                            <tr
                              key={`${item.category}-${item.businessName}`}
                              className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
                            >
                              <td className="py-1.5 px-2.5 text-center font-mono text-[11px] text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                {idx + 1}
                              </td>
                              <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                                {item.category}
                              </td>
                              <td className="py-1.5 px-3 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 truncate max-w-[130px]">
                                {item.businessName}
                              </td>
                              <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-100 dark:border-slate-800">
                                {item.count}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                {pct}%
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatBDT(item.amount)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {revenueCategories.length > 0 && (
                      <tfoot className="sticky bottom-0 bg-slate-50 dark:bg-slate-800/95 font-bold border-t-2 border-slate-200 dark:border-slate-700 text-xs z-10">
                        <tr>
                          <td colSpan={3} className="py-2 px-3 text-slate-700 dark:text-slate-200">
                            Total ({revenueCategories.length} Streams)
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                            {revenueCategories.reduce((s, c) => s + c.count, 0)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                            100%
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {formatBDT(totalPeriodRev)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            {/* 4. 12-Month Financial Performance & Trends Table (Jan to Dec) - DESIGNATED SCROLL BOX */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs p-3.5 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    12-Month Financial Performance & Trends ({activeMonthFilter.year === 'ALL' ? '2026' : activeMonthFilter.year})
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Click any month row to filter the entire financial report by that month
                  </p>
                </div>
              </div>
              <div className="h-60 overflow-y-auto overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 [scrollbar-width:thin] scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700 select-none z-10">
                    <tr>
                      <th className="py-2 px-3">Month</th>
                      <th className="py-2 px-3 text-right">Revenue & Sales</th>
                      <th className="py-2 px-3 text-right">OpEx / Farm Cost</th>
                      <th className="py-2 px-3 text-right">Payroll</th>
                      <th className="py-2 px-3 text-right">Receivables (Due)</th>
                      <th className="py-2 px-3 text-right">Net Profit / Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {MONTHS_12.map((m) => {
                      const targetYear = activeMonthFilter.year === 'ALL' ? '2026' : activeMonthFilter.year;
                      const mEntries = journalEntries.filter(
                        (j) =>
                          j.status === 'posted' &&
                          matchesMonthFilter(j.date, { year: targetYear, month: m.code })
                      );
                      const rev = mEntries
                        .filter((j) => j.transactionType === 'sale' || j.transactionType === 'income')
                        .reduce((s, j) => s + j.amount, 0);
                      const opExp = mEntries
                        .filter((j) => j.transactionType === 'expense' || j.transactionType === 'purchase')
                        .reduce((s, j) => s + j.amount, 0);
                      const payExp = mEntries
                        .filter((j) => j.transactionType === 'payroll')
                        .reduce((s, j) => s + j.amount, 0);
                      const due = mEntries.reduce((s, j) => s + (j.dueAmount || 0), 0);
                      const net = rev - (opExp + payExp);
                      const isSelected = activeMonthFilter.month === m.code;
                      return (
                        <tr
                          key={m.code}
                          onClick={() => setMonthFilter({ year: targetYear, month: m.code })}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 font-semibold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                            {m.fullEn} ({m.shortEn} {targetYear})
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                            {formatBDT(rev)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">
                            {formatBDT(opExp)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">
                            {formatBDT(payExp)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-amber-600">
                            {formatBDT(due)}
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-mono tabular-nums font-bold ${
                              net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatBDT(net)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. RBAC PERMISSION CONTROL, USER MANAGEMENT & SECURITY AUDIT LOGS */}
      {activeSection === 'security' && (
        <div className="space-y-6">
          {/* Clean Action Bar & Title */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>User & Access Management</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                        Total {erpUsers.length} Users
                      </span>
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Role-based access control, manager hierarchy, and audit trails
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Live Role Simulator */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Eye className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">Role Preview:</span>
                  <select
                    value={userRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      onChangeRoleSimulation(
                        nextRole,
                        nextRole === 'super_admin' || nextRole === 'super_manager'
                          ? 'ALL'
                          : fullBusinessList[0]?.id || 'ALL'
                      );
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="super_admin">👑 Super Admin (Owner)</option>
                    <option value="super_manager">🎖️ Super Manager (General Manager - COO)</option>
                    <option value="business_manager">🏢 Business Manager (Unit Incharge)</option>
                    <option value="employee">👷 Employee (Field Staff)</option>
                  </select>
                  {userRole !== 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => onChangeRoleSimulation('super_admin', 'ALL')}
                      className="text-[10px] font-bold text-emerald-600 hover:underline ml-1 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowExecutiveReportModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 px-3.5 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  <FileBarChart className="h-3.5 w-3.5" />
                  <span>Executive Report</span>
                </button>

                <button
                  type="button"
                  onClick={openCreateUserModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>+ Add New User</span>
                </button>

                {erpUsers.length <= 1 && (
                  <button
                    type="button"
                    disabled={isSavingUser}
                    onClick={handleSeedSampleManagers}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Generate Demo Team</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* USER ACCOUNTS & PERMISSION MATRIX TABLE */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            {/* Top Bar: Title & Role Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>User Accounts & Access Matrix</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({filteredSecUsers.length} of {erpUsers.length} users)
                  </span>
                </h2>
              </div>

              {/* Role Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {[
                  { id: 'all' as const, label: `All (${erpUsers.length})` },
                  {
                    id: 'super_manager' as const,
                    label: `🎖️ General Managers (${erpUsers.filter((u) => u.role === 'super_manager').length})`,
                  },
                  {
                    id: 'business_manager' as const,
                    label: `🏢 Unit Managers (${erpUsers.filter((u) => u.role === 'business_manager').length})`,
                  },
                  {
                    id: 'employee' as const,
                    label: `👷 Field Staff (${erpUsers.filter((u) => u.role === 'employee').length})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSecRoleFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      secRoleFilter === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Toolbar: Manager Hierarchy, Month/Year Filter, Active in Period, Search */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search */}
                <div className="relative min-w-[200px] max-w-xs flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={secUserSearch}
                    onChange={(e) => setSecUserSearch(e.target.value)}
                    placeholder="Search by name, email or phone..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-emerald-500"
                  />
                  {secUserSearch && (
                    <button
                      type="button"
                      onClick={() => setSecUserSearch('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Manager / Hierarchy Filter */}
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <select
                    value={secManagerFilter}
                    onChange={(e) => setSecManagerFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[220px]"
                    title="Filter by Manager and their team members"
                  >
                    <option value="ALL">All Managers & Teams</option>
                    {secManagers.map((mgr) => {
                      const staff = getStaffForManager(mgr);
                      const roleLabel =
                        mgr.role === 'super_admin'
                          ? '👑 Owner'
                          : mgr.role === 'super_manager'
                          ? '🎖️ GM'
                          : '🏢 Manager';
                      return (
                        <option key={mgr.id} value={mgr.id}>
                          {roleLabel}: {mgr.displayName} ({staff.length} staff)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Login Year & Month Filters */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                  <select
                    value={secLoginYear}
                    onChange={(e) => setSecLoginYear(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="ALL">Year: All</option>
                    <option value="2027">2027</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>

                  <span className="text-slate-300 dark:text-slate-600">|</span>

                  <select
                    value={secLoginMonth}
                    onChange={(e) => setSecLoginMonth(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="ALL">Month: All</option>
                    {MONTHS_12.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.fullEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active in Period Badge / Filter */}
                <button
                  type="button"
                  onClick={() => setSecOnlyActiveInPeriod(!secOnlyActiveInPeriod)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    secOnlyActiveInPeriod
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                  }`}
                  title="Filter users who were active during selected period"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>
                    {secLoginYear === 'ALL' && secLoginMonth === 'ALL'
                      ? `Logged In: ${usersLoggedInPeriodCount} Users`
                      : `Active in Period: ${usersLoggedInPeriodCount} Users`}
                  </span>
                  {secOnlyActiveInPeriod && (
                    <span className="text-[10px] bg-white/30 px-1 rounded">Filter On</span>
                  )}
                </button>

                {/* Clear all filters button */}
                {(secRoleFilter !== 'all' ||
                  secManagerFilter !== 'ALL' ||
                  secLoginYear !== 'ALL' ||
                  secLoginMonth !== 'ALL' ||
                  secOnlyActiveInPeriod ||
                  secUserSearch.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSecRoleFilter('all');
                      setSecManagerFilter('ALL');
                      setSecLoginYear('ALL');
                      setSecLoginMonth('ALL');
                      setSecOnlyActiveInPeriod(false);
                      setSecUserSearch('');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-red-600 px-2 py-1 rounded cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Manager Filter Active Banner */}
            {selectedManagerObj && (
              <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800/50 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Selected Manager: <strong>{selectedManagerObj.displayName}</strong> (
                    {selectedManagerObj.role === 'super_admin'
                      ? 'Owner'
                      : selectedManagerObj.role === 'super_manager'
                      ? 'General Manager'
                      : 'Unit Manager'}
                    ) — Direct Team: <strong>{selectedManagerStaff.length}</strong> Members
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSecManagerFilter('ALL')}
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                >
                  Clear Filter
                </button>
              </div>
            )}

            {/* Scrollable User Matrix Table (Max 50vh internal scroll with sticky header) */}
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto border-t border-slate-200 dark:border-slate-800 scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/95 backdrop-blur-xs z-10 shadow-2xs">
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4 font-bold">User & Email</th>
                    <th className="py-3 px-4 font-bold">Role / Position</th>
                    <th className="py-3 px-4 font-bold">Supervisor / Team</th>
                    <th className="py-3 px-4 font-bold">Assigned Businesses</th>
                    <th className="py-3 px-4 font-bold">Granular Permissions</th>
                    <th className="py-3 px-4 font-bold">Last Login</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredSecUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <Users className="h-8 w-8 mx-auto text-slate-400 mb-2 opacity-50" />
                        <div className="font-semibold text-slate-700 dark:text-slate-300">No users found</div>
                        <div className="text-xs text-slate-400 mt-1">Try adjusting your search query, manager selection, or date filters</div>
                      </td>
                    </tr>
                  ) : (
                    filteredSecUsers.map((u) => {
                      const perms = parseUserPermissions(u);
                      const assignedIds =
                        !u.assignedBusinesses || u.assignedBusinesses === 'ALL'
                          ? ['ALL']
                          : u.assignedBusinesses.split(',').map((s) => s.trim());

                      const firstBizId =
                        assignedIds[0] === 'ALL'
                          ? fullBusinessList[0]?.id || 'ALL'
                          : assignedIds[0];

                      const uPhoto = resolveActorPhoto(u.email, u.displayName, u.role, u.photoUrl);
                      const sup = findSupervisor(u);
                      const loginInfo = formatLoginTime(u.lastLoginAt);

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() =>
                                setViewingProfile({
                                  id: u.id,
                                  name: u.displayName,
                                  email: u.email,
                                  phone: u.phone || '+880 1711-000000',
                                  nidNumber: u.nidNumber || '',
                                  designation:
                                    u.designation ||
                                    (u.role === 'super_admin'
                                      ? 'Super Admin'
                                      : u.role === 'super_manager'
                                      ? 'General Manager'
                                      : 'Business Incharge'),
                                  role: u.role,
                                  businessName:
                                    u.assignedBusinesses === 'ALL'
                                      ? 'All Businesses (All)'
                                      : u.assignedBusinesses,
                                  photoUrl: uPhoto,
                                  address: u.address || 'Dhaka, Bangladesh',
                                  status: u.status || 'active',
                                })
                              }
                              className="flex items-center gap-3 text-left group hover:opacity-85 transition-opacity cursor-pointer"
                            >
                              {uPhoto ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={uPhoto}
                                  alt={u.displayName}
                                  className="h-8 w-8 rounded-full object-cover shrink-0 ring-2 ring-emerald-500/30 shadow-xs"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                                  {(u.displayName || 'U').slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                                  {u.displayName}
                                </div>
                                <div className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]">
                                  {u.email}
                                </div>
                              </div>
                            </button>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                u.role === 'super_admin'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : u.role === 'super_manager'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                                  : u.role === 'business_manager'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                              }`}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              {u.role === 'super_admin'
                                ? '👑 Super Admin'
                                : u.role === 'super_manager'
                                ? '🎖️ Super Manager'
                                : u.role === 'business_manager'
                                ? '🏢 Business Manager'
                                : '👷 Employee'}
                            </span>
                          </td>

                          {/* Supervisor / Team Hierarchy Column */}
                          <td className="py-3 px-4">
                            {u.role === 'super_admin' ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                                <Award className="h-3 w-3 text-emerald-600 shrink-0" />
                                <span>Head of all {erpUsers.length - 1} members</span>
                              </div>
                            ) : u.role === 'super_manager' ? (
                              (() => {
                                const staff = getStaffForManager(u);
                                return (
                                  <div className="space-y-0.5">
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-semibold text-[11px]">
                                      <Users className="h-3 w-3 text-purple-600 shrink-0" />
                                      <span>Oversees: {staff.length} staff</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500">Reports to: Owner</div>
                                  </div>
                                );
                              })()
                            ) : u.role === 'business_manager' ? (
                              (() => {
                                const staff = getStaffForManager(u);
                                return (
                                  <div className="space-y-0.5">
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-semibold text-[11px]">
                                      <Users className="h-3 w-3 text-blue-600 shrink-0" />
                                      <span>Team: {staff.length} staff</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500">Supervisor: {sup.name}</div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="space-y-0.5">
                                <div className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                                  <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span>{sup.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-500">{sup.roleStr}</div>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {assignedIds.includes('ALL') ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                                  All Businesses (All)
                                </span>
                              ) : (
                                assignedIds.map((bid) => {
                                  const bObj = fullBusinessList.find(
                                    (b) => b.id === bid || b.code === bid
                                  );
                                  return (
                                    <span
                                      key={bid}
                                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-[11px]"
                                    >
                                      {bObj ? (bObj.name || bObj.nameBn) : bid}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {perms.canView && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium">
                                  View
                                </span>
                              )}
                              {perms.canCreate && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                                  Create
                                </span>
                              )}
                              {perms.canEdit && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                                  Edit
                                </span>
                              )}
                              {perms.canDeleteRecords && (
                                <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[10px] font-semibold">
                                  Delete
                                </span>
                              )}
                              {perms.canApprove && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold">
                                  Approve
                                </span>
                              )}
                              {perms.canViewConsolidatedProfit && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                                  Profit
                                </span>
                              )}
                              {perms.canPostAccounting && (
                                <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-[10px] font-semibold">
                                  Accounting
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Last Login Column */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                {loginInfo.isRecent ? (
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                ) : (
                                  <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                                )}
                                <span className={`text-[11px] ${loginInfo.color}`}>
                                  {loginInfo.text}
                                </span>
                              </div>
                              {loginInfo.subText && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 pl-3.5">
                                  {loginInfo.subText}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                u.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : u.status === 'suspended'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {u.status === 'active'
                                ? 'Active'
                                : u.status === 'suspended'
                                ? 'Suspended'
                                : 'Invited'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditUserModal(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                                title="Edit user permissions & assigned businesses"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  onChangeRoleSimulation(
                                    u.role,
                                    u.role === 'super_admin' ? 'ALL' : firstBizId
                                  );
                                  showNotice(
                                    `Simulating view for "${u.displayName}" (${u.role})`
                                  );
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-100 cursor-pointer"
                                title="Preview ERP interface as this user"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View</span>
                              </button>

                              {u.role !== 'super_admin' && u.id !== ownerId && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateErpUserPermissions(
                                        u,
                                        {
                                          status: u.status === 'active' ? 'suspended' : 'active',
                                        },
                                        actorEmail
                                      )
                                    }
                                    className="px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-50 cursor-pointer"
                                  >
                                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerConfirmDelete({
                                        title: 'Confirm User Account Deletion',
                                        message: `Are you sure you want to permanently delete user account "${u.displayName}"?`,
                                        itemName: `${u.displayName} (${u.email})`,
                                        onConfirm: async () => {
                                          await deleteErpUserAccount(u, actorEmail);
                                          triggerGlobalToast(
                                            `User "${u.displayName}" deleted successfully!`,
                                            'delete'
                                          );
                                        },
                                      });
                                    }}
                                    className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                    title="Delete user"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Immutable Audit Trail */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Security & Operational Audit Logs</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({auditLogs.length} Events)
                  </span>
                </h2>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Immutable Audit Trail • Max 45vh Scroll
              </div>
            </div>

            <div className="overflow-x-auto max-h-[45vh] overflow-y-auto border-t border-slate-200 dark:border-slate-800 scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/95 backdrop-blur-xs z-10 shadow-2xs">
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4 font-bold">Action</th>
                    <th className="py-3 px-4 font-bold">Module</th>
                    <th className="py-3 px-4 font-bold">Actor / User</th>
                    <th className="py-3 px-4 font-bold">Details</th>
                    <th className="py-3 px-4 text-right font-bold">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        No audit log records found.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {log.module}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const email = log.actorEmail || '';
                            const matchedUser = erpUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
                            const actorName = log.actorName || matchedUser?.displayName || (email.split('@')[0]) || 'RegardsAgro Admin';
                            const actorPhoto = resolveActorPhoto(email, actorName, log.actorRole, log.actorPhoto || matchedUser?.photoUrl);
                            const actorPost = log.actorDesignation || matchedUser?.designation || (log.actorRole === 'super_admin' ? 'Super Admin' : log.actorRole === 'super_manager' ? 'General Manager' : 'Officer');

                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingProfile({
                                    id: matchedUser?.id,
                                    name: actorName,
                                    email: email || matchedUser?.email,
                                    phone: matchedUser?.phone || '+880 1711-000000',
                                    nidNumber: matchedUser?.nidNumber || '',
                                    designation: actorPost,
                                    role: log.actorRole || matchedUser?.role || 'super_admin',
                                    photoUrl: actorPhoto,
                                    address: matchedUser?.address,
                                    status: 'active',
                                  })
                                }
                                className="flex items-center gap-2 text-left group hover:opacity-85 transition-opacity cursor-pointer"
                              >
                                {actorPhoto ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={actorPhoto}
                                    alt={actorName}
                                    className="h-6 w-6 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700 shadow-2xs"
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {actorName.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors text-[11px]">
                                    {actorName}
                                  </div>
                                  <div className="font-mono text-[9px] text-slate-400">
                                    {email}
                                  </div>
                                </div>
                              </button>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 text-right font-mono uppercase">
                          {log.severity}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CREATE / EDIT USER & GRANULAR PERMISSIONS MODAL */}
          {showUserModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
              onClick={() => setShowUserModal(false)}
            >
              <div
                className="w-full max-w-3xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-emerald-600" />
                      <span>
                        {editingUser
                          ? `Update User Permissions: ${editingUser.displayName}`
                          : 'Create New User & Assign Permissions'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure user credentials, role, business scope, and granular permissions below
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveUserAndPermissions} className="space-y-5 text-xs">
                  {/* Step 1: Identity & Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block mb-1 font-bold text-slate-800 dark:text-slate-200">
                        Full Name & Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={usrName}
                        onChange={(e) => setUsrName(e.target.value)}
                        placeholder="e.g. Md. Rafiqul Islam (Poultry Incharge)"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 font-bold text-slate-800 dark:text-slate-200">
                        Login Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        disabled={Boolean(editingUser)}
                        value={usrEmail}
                        onChange={(e) => setUsrEmail(e.target.value)}
                        placeholder="e.g. manager@krishivumi.com"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 font-bold text-slate-800 dark:text-slate-200">
                        {editingUser
                          ? 'New Password (leave blank to keep unchanged)'
                          : 'Login Password *'}
                      </label>
                      <input
                        type="password"
                        required={!editingUser}
                        minLength={editingUser ? 0 : 6}
                        value={usrPassword}
                        onChange={(e) => setUsrPassword(e.target.value)}
                        placeholder={editingUser ? 'Leave blank to keep unchanged' : 'At least 6 characters'}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block mb-1 font-bold text-slate-800 dark:text-slate-200">
                        Role / Access Tier *
                      </label>
                      <select
                        value={usrRole}
                        disabled={editingUser?.role === 'super_admin'}
                        onChange={(e) => handleRolePresetChange(e.target.value as UserRole)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-semibold disabled:opacity-60"
                      >
                        {editingUser?.role === 'super_admin' && (
                          <option value="super_admin">👑 Super Admin (Sole Owner)</option>
                        )}
                        {userRole === 'super_admin' && (
                          <option value="super_manager">🎖️ Super Manager (General Manager - COO)</option>
                        )}
                        <option value="business_manager">🏢 Business Manager (Unit Incharge)</option>
                        <option value="employee">👷 Employee / Staff (Data Entry & Operations)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 font-bold text-slate-800 dark:text-slate-200">
                        Account Status
                      </label>
                      <select
                        value={usrStatus}
                        onChange={(e) =>
                          setUsrStatus(e.target.value as 'active' | 'suspended' | 'invited')
                        }
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                      >
                        <option value="active">Active</option>
                        <option value="invited">Invited</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>

                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={usrMfa}
                          onChange={(e) => setUsrMfa(e.target.checked)}
                          className="h-4 w-4 rounded accent-emerald-600"
                        />
                        <span>Two-Factor Authentication (2FA Verified)</span>
                      </label>
                    </div>
                  </div>

                  {/* Step 2: Business Assignment */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        1. Assign Businesses to This User
                      </div>
                      <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-emerald-700 dark:text-emerald-400">
                        <input
                          type="checkbox"
                          checked={usrAssignAllBiz || usrRole === 'super_admin' || usrRole === 'super_manager'}
                          disabled={usrRole === 'super_admin' || usrRole === 'super_manager'}
                          onChange={(e) => setUsrAssignAllBiz(e.target.checked)}
                          className="h-4 w-4 rounded accent-emerald-600"
                        />
                        <span>Access All Businesses</span>
                      </label>
                    </div>

                    {!usrAssignAllBiz && usrRole !== 'super_admin' && usrRole !== 'super_manager' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                        {fullBusinessList.map((biz) => {
                          const checked = usrSelectedBizIds.includes(biz.id);
                          return (
                            <label
                              key={biz.id}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                checked
                                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-200'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleBizSelection(biz.id)}
                                className="h-4 w-4 rounded accent-emerald-600"
                              />
                              <div className="truncate">
                                <div className="truncate">{biz.name || biz.nameBn}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {biz.code}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Step 3: Granular Action & Financial Permissions */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      2. Granular Action & Financial Permissions
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {[
                        {
                          key: 'canView' as const,
                          label: 'View Data (canView)',
                        },
                        {
                          key: 'canCreate' as const,
                          label: 'Create Records (canCreate)',
                        },
                        {
                          key: 'canEdit' as const,
                          label: 'Edit Records (canEdit)',
                        },
                        {
                          key: 'canDeleteRecords' as const,
                          label: 'Delete Records (canDeleteRecords)',
                        },
                        {
                          key: 'canApprove' as const,
                          label: 'Approve Vouchers/Stock (canApprove)',
                        },
                        {
                          key: 'canExportPrint' as const,
                          label: 'Export & Print Reports (canExportPrint)',
                        },
                        {
                          key: 'canViewConsolidatedProfit' as const,
                          label: 'View Profit & Balance Sheet (canViewConsolidatedProfit)',
                        },
                        {
                          key: 'canPostAccounting' as const,
                          label: 'Post Vouchers & Accounting (canPostAccounting)',
                        },
                        {
                          key: 'canReverseTransactions' as const,
                          label: 'Reverse Posted Vouchers (canReverseTransactions)',
                        },
                        {
                          key: 'canManageInventory' as const,
                          label: 'Manage Warehouse & Stock (canManageInventory)',
                        },
                        {
                          key: 'canCreateBusiness' as const,
                          label: 'Create Businesses (canCreateBusiness)',
                        },
                        {
                          key: 'canManageUsers' as const,
                          label: 'Manage Users & Access (canManageUsers)',
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={usrPerms[item.key]}
                            onChange={(e) =>
                              setUsrPerms((prev) => ({
                                ...prev,
                                [item.key]: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded accent-emerald-600"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Step 4: Allowed ERP Modules */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      3. Allowed ERP Modules
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {ALL_ERP_MODULE_OPTIONS.map((mod) => {
                        const checked = usrPerms.allowedModules.includes(mod.id);
                        return (
                          <label
                            key={mod.id}
                            className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleModulePermission(mod.id)}
                              className="h-4 w-4 rounded accent-emerald-600"
                            />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              {mod.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingUser}
                      className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingUser
                        ? 'Saving...'
                        : editingUser
                        ? 'Update Access'
                        : 'Save User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Simple Deposit / Add Money to Cash or Bank */}
      {showDepositModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowDepositModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ক্যাশ বা ব্যাংকে টাকা জমা করুন
                </h3>
                <p className="text-[11px] text-slate-500">
                  মালিকের মূলধন বা নগদ টাকা সরাসরি অ্যাকাউন্টে যোগ করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block mb-1.5 font-semibold">কোন অ্যাকাউন্টে টাকা জমা হবে? *</label>
                <select
                  value={depAccountId}
                  onChange={(e) => setDepAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-semibold">টাকার পরিমাণ (BDT) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="0"
                    value={depAmount === 0 ? '' : depAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setDepAmount(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-semibold">টাকার উৎস (Source)</label>
                  <select
                    value={depSource}
                    onChange={(e) => setDepSource(e.target.value as 'capital' | 'income')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                  >
                    <option value="capital">মালিকের মূলধন / বিনিয়োগ</option>
                    <option value="income">অন্যান্য আয় (Income)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-semibold">নোট / বিবরণ (Optional)</label>
                <input
                  type="text"
                  value={depNote}
                  onChange={(e) => setDepNote(e.target.value)}
                  placeholder="যেমন: মালিকের নিজস্ব তহবিল থেকে ব্যাংকে জমা"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isDepositing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isDepositing ? 'জমা হচ্ছে...' : 'টাকা জমা করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Easy From -> To Transfer Modal (No DR/CR confusion!) */}
      {showTransferModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowTransferModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  টাকা ট্রান্সফার (ক্যাশ ↔ ব্যাংক)
                </h3>
                <p className="text-[11px] text-slate-500">
                  নিজের এক একাউন্ট থেকে আরেক একাউন্টে টাকা পাঠান
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEasyTransferSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block mb-1.5 font-semibold text-rose-600 dark:text-rose-400">
                  ১. কোথা থেকে টাকা কাটবে? (From Account) *
                </label>
                <select
                  value={trFromId}
                  onChange={(e) => setTrFromId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  ২. কোথায় টাকা জমা হবে? (To Account) *
                </label>
                <select
                  value={trToId}
                  onChange={(e) => setTrToId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1.5 font-semibold">কত টাকা ট্রান্সফার করবেন? (BDT) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="0"
                  value={trAmount === 0 ? '' : trAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/^0+(?=\d)/, '');
                    setTrAmount(v === '' ? 0 : Number(v));
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block mb-1.5 font-semibold">বিবরণ (Optional)</label>
                <input
                  type="text"
                  value={trNote}
                  onChange={(e) => setTrNote(e.target.value)}
                  placeholder="যেমন: অফিস ক্যাশ থেকে ইসলামী ব্যাংকে জমা"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                />
              </div>

              {trFromId && trToId && trFromId !== trToId && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                  <strong>{accounts.find((a) => a.id === trFromId)?.name}</strong> থেকে{' '}
                  <strong>{formatBDT(trAmount)}</strong> কমে{' '}
                  <strong>{accounts.find((a) => a.id === trToId)?.name}</strong>-এ যোগ হবে।
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isTransferring ? 'ট্রান্সফার হচ্ছে...' : 'ট্রান্সফার সম্পন্ন করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add New Bank / Cash / Mobile Banking Account */}
      {showNewAccountModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowNewAccountModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  নতুন ব্যাংক / ক্যাশ / মোবাইল ব্যাংকিং যোগ করুন
                </h3>
                <p className="text-[11px] text-slate-500">
                  যেমন: Dutch-Bangla Bank, City Bank, bKash বা Nagad
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAccountModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTreasuryAccount} className="space-y-4 text-xs">
              <div>
                <label className="block mb-1.5 font-semibold">অ্যাকাউন্টের নাম *</label>
                <input
                  type="text"
                  required
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="যেমন: bKash Merchant / Dutch-Bangla Bank"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-semibold">অ্যাকাউন্টের ধরন</label>
                  <select
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value as 'bank' | 'cash')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                  >
                    <option value="bank">ব্যাংক / বিকাশ / নগদ</option>
                    <option value="cash">নগদ ক্যাশ বাক্স</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 font-semibold">শুরুর ব্যালেন্স (BDT)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={newAccOpening === 0 ? '' : newAccOpening}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setNewAccOpening(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewAccountModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAcc}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isCreatingAcc ? 'তৈরি হচ্ছে...' : 'অ্যাকাউন্ট যোগ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Reset Demo Balances to ৳0 Confirmation */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">
              সব ডেমো ব্যালেন্স ৳০ করে নতুনভাবে শুরু করবেন?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              শুরুতে সিস্টেম বোঝার জন্য ক্যাশ, ব্যাংক ও লেনদেনে কিছু স্যাম্পল (ডেমো) টাকা দেওয়া ছিল। এটি কনফার্ম করলে ক্যাশ, ব্যাংক এবং জার্নালের সব স্যাম্পল হিসাব <strong>৳০</strong> হয়ে যাবে—যাতে আপনি আপনার নিজের আসল টাকা জমা দিয়ে শুরু করতে পারেন। (আপনার ব্যবসা ও কর্মচারীদের তালিকা অক্ষত থাকবে।)
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                disabled={isResettingLedger}
                onClick={handleResetDemoBalances}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
              >
                {isResettingLedger ? 'রিসেট হচ্ছে...' : 'হ্যাঁ, সব ব্যালেন্স ৳০ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Income / Expense Voucher Modal */}
      {showVoucherModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowVoucherModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  আয় / খরচ ভাউচার লিখুন
                </h3>
                <p className="text-[11px] text-slate-500">
                  লেনদেনের ধরন সিলেক্ট করলে ডেবিট/ক্রেডিট অটোমেটিক সেট হয়ে যাবে
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePostVoucher} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">কী ধরনের হিসাব? *</label>
                  <select
                    value={vType}
                    onChange={(e) => handleSelectVoucherType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-semibold"
                  >
                    <option value="sale">বিক্রি / আয় (Sales)</option>
                    <option value="expense">খরচ / বিল (Expense)</option>
                    <option value="purchase">মাল / স্টক কেনা (Purchase)</option>
                    <option value="payroll">কর্মচারীর বেতন (Payroll)</option>
                    <option value="cash_to_bank">ক্যাশ → ব্যাংক জমা</option>
                    <option value="bank_to_cash">ব্যাংক → ক্যাশ উত্তোলন</option>
                    <option value="adjustment">সমন্বয় (Adjustment)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">কোন ব্যবসা?</label>
                  <select
                    value={vBizId}
                    onChange={(e) => setVBizId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                  >
                    <option value="ALL">সমন্বিত (Consolidated HQ)</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameBn || b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">মোট টাকার পরিমাণ (BDT) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="0"
                    value={vAmount === 0 ? '' : vAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setVAmount(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">পেমেন্ট অবস্থা</label>
                  <select
                    value={vPaymentStatus}
                    onChange={(e) => setVPaymentStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                  >
                    <option value="paid">নগদ/ব্যাংকে পরিশোধ (Paid)</option>
                    <option value="partial">আংশিক বাকি (Partial Due)</option>
                    <option value="due">সম্পূর্ণ বাকি (Full Due)</option>
                  </select>
                </div>
              </div>

              {vPaymentStatus !== 'paid' && (
                <div>
                  <label className="block mb-1 font-semibold">বাকি টাকার পরিমাণ (BDT)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={vDueAmount === 0 ? '' : vDueAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setVDueAmount(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">খাতের নাম (Category) *</label>
                  <input
                    type="text"
                    required
                    value={vCategory}
                    onChange={(e) => setVCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">ক্রেতা / সাপ্লায়ারের নাম</label>
                  <input
                    type="text"
                    value={vCounterparty}
                    onChange={(e) => setVCounterparty(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">বিস্তারিত বিবরণ (Note)</label>
                <input
                  type="text"
                  value={vDesc}
                  onChange={(e) => setVDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                />
              </div>

              {/* Optional Advanced DR/CR toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedDrCr(!showAdvancedDrCr)}
                  className="text-[11px] font-semibold text-emerald-600 hover:underline"
                >
                  {showAdvancedDrCr
                    ? '▲ ডেবিট/ক্রেডিট অ্যাকাউন্ট লুকান'
                    : '▼ কোন ব্যাংক বা ক্যাশ ব্যবহার হবে তা পরিবর্তন করুন (Advanced DR/CR)'}
                </button>
              </div>

              {showAdvancedDrCr && (
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block mb-1 font-medium">টাকা ঢুকবে / খরচ (DR) *</label>
                    <select
                      value={vDebitId}
                      onChange={(e) => setVDebitId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">টাকা যাবে / আয় খাত (CR) *</label>
                    <select
                      value={vCreditId}
                      onChange={(e) => setVCreditId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                >
                  হিসাব সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Stock Movement Modal */}
      {stockMoveItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setStockMoveItem(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  স্টক ইন / আউট করুন ({stockMoveItem.unit})
                </h3>
                <p className="text-[11px] text-slate-500">
                  {stockMoveItem.name} · বর্তমান মজুদ: {stockMoveItem.quantity} {stockMoveItem.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStockMoveItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCustomStockMoveSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-semibold">কী করতে চান?</label>
                  <select
                    value={smType}
                    onChange={(e) => setSmType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-semibold"
                  >
                    <option value="purchase">+ স্টক ক্রয় / ইন (Stock In)</option>
                    <option value="consumption">- খামারে ব্যবহার (Stock Out)</option>
                    <option value="sale">- সরাসরি বিক্রি (Sale Out)</option>
                    <option value="transfer">গোডাউন ট্রান্সফার</option>
                    <option value="adjustment">হিসাব সমন্বয় (Adjustment)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 font-semibold">
                    কত {stockMoveItem.unit}? (পরিমাণ) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="0"
                    value={smQty === 0 ? '' : smQty}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setSmQty(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-semibold">
                  {smType === 'purchase' ? 'কোন গোডাউনে রাখা হবে?' : 'কোথায় ব্যবহার / পাঠানো হচ্ছে?'}
                </label>
                <input
                  type="text"
                  value={smDest}
                  onChange={(e) => setSmDest(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                />
              </div>

              {smType === 'purchase' && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-3 space-y-1">
                  <label className="block font-bold text-rose-900 dark:text-rose-200">
                    দোকান/মিলের মূল ক্যাশ মেমো বা চালান নং *
                  </label>
                  <input
                    type="text"
                    required
                    value={smSupplierMemoNo}
                    onChange={(e) => setSmSupplierMemoNo(e.target.value)}
                    placeholder="যেমন: MEMO-88412 বা মিল ভাউচার নং"
                    className="w-full rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-rose-700 dark:text-rose-400">
                    🛡️ চুরি ও ভুয়া বস্তা এন্ট্রি রোধে মিল থেকে সরবরাহকৃত মূল মেমোর নম্বরটি দেওয়া বাধ্যতামূলক।
                  </p>
                </div>
              )}

              <div>
                <label className="block mb-1.5 font-semibold">নোট / বিবরণ (Optional)</label>
                <input
                  type="text"
                  value={smNotes}
                  onChange={(e) => setSmNotes(e.target.value)}
                  placeholder="যেমন: শেড-২ মুরগির জন্য / নতুন চালান"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                />
              </div>

              {smType === 'purchase' && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-3 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-900 dark:text-emerald-200">
                    <input
                      type="checkbox"
                      checked={smPostExpense}
                      onChange={(e) => setSmPostExpense(e.target.checked)}
                      className="h-4 w-4 rounded accent-emerald-600"
                    />
                    <span>
                      কেনার টাকা ({formatBDT(Number(smQty) * Number(stockMoveItem.unitCost))}) ক্যাশ/ব্যাংক থেকে খরচ হিসেবে কাটুন
                    </span>
                  </label>
                  {smPostExpense && (
                    <select
                      value={smPayAccId}
                      onChange={(e) => setSmPayAccId(e.target.value)}
                      className="w-full rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-3 py-2 font-semibold"
                    >
                      {treasuryWallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({formatBDT(w.balance)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStockMoveItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isMovingStock}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isMovingStock ? 'আপডেট হচ্ছে...' : 'স্টক সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInvModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowInvModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Add Inventory Product SKU
              </h3>
              <button
                type="button"
                onClick={() => setShowInvModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleCreateInventory} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={invSku}
                    onChange={(e) => setInvSku(e.target.value)}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Category</label>
                  <select
                    value={invCat}
                    onChange={(e) => setInvCat(e.target.value as any)}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="feed">Feed</option>
                    <option value="medicine">Medicine</option>
                    <option value="vaccine">Vaccine</option>
                    <option value="seed_fingerling">Seed / Fingerling</option>
                    <option value="fuel_parts">Fuel & Spare Parts</option>
                    <option value="finished_goods">Finished Agro Goods</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Product Name *</label>
                <input
                  type="text"
                  required
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="e.g., Finisher Pellet Feed 50 KG"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Assigned Business</label>
                  <select
                    value={invBizId}
                    onChange={(e) => setInvBizId(e.target.value)}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Warehouse Location</label>
                  <input
                    type="text"
                    value={invWarehouse}
                    onChange={(e) => setInvWarehouse(e.target.value)}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Opening Qty</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={invQty === 0 ? '' : invQty}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setInvQty(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Unit Cost (BDT)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={invCost === 0 ? '' : invCost}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setInvCost(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Expiry Date</label>
                  <input
                    type="date"
                    value={invExpiry}
                    onChange={(e) => setInvExpiry(e.target.value)}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Save SKU & Opening Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stakeholder Settlement Modal (Pay Salary / Collect Due / Pay Supplier) */}
      {stkPayTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setStkPayTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {stkPayTarget.stakeholderType === 'employee' ? (
                    <>
                      <Calculator className="h-4 w-4 text-emerald-600" />
                      <span>কর্মচারী বেতন হিসাব ও অনুমোদন (Salary Disbursement)</span>
                    </>
                  ) : stkPayTarget.stakeholderType === 'customer' ? (
                    'ক্রেতার কাছ থেকে বাকি আদায় করুন'
                  ) : (
                    'সাপ্লায়ারের বাকি পরিশোধ করুন'
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {stkPayTarget.name} · {stkPayTarget.businessName} {stkPayTarget.designationOrCategory ? `(${stkPayTarget.designationOrCategory})` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStkPayTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleStakeholderPaymentSubmit} className="space-y-4 text-xs">
              {stkPayTarget.stakeholderType === 'employee' ? (
                <div className="space-y-3.5">
                  {/* Employee Contract & Role Highlight */}
                  <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/30 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-sky-950 dark:text-sky-100 flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-sky-600" />
                        <span>{stkPayTarget.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">[{stkPayTarget.code}]</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        ইউনিট: <strong>{stkPayTarget.businessName}</strong> · পদবি: <strong>{stkPayTarget.designationOrCategory}</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">নির্ধারিত মাসিক মূল বেতন</div>
                      <div className="font-mono font-bold text-sky-700 dark:text-sky-300 text-sm">
                        {formatBDT(stkPayTarget.monthlySalaryOrCreditLimit)}
                      </div>
                    </div>
                  </div>

                  {/* Live Salary Calculation Box */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 space-y-3">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>🧮 রিয়েল-টাইম বেতন ক্যালকুলেটর (Salary Formula Breakdown)</span>
                      <span className="text-[10px] text-slate-500 font-normal">হাজিরা, বোনাস ও কর্তন</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          মাসিক মূল বেতন (BDT) *
                        </label>
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={salaryBase === 0 ? '' : salaryBase}
                          onChange={(e) => {
                            const v = e.target.value.replace(/^0+(?=\d)/, '');
                            const val = v === '' ? 0 : Number(v);
                            setSalaryBase(val);
                            const proRated = Math.round((val / (salaryDaysTotal || 30)) * (salaryDaysWorked || 30));
                            setStkPayAmount(Math.max(0, proRated + salaryBonus - salaryDeduction));
                          }}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          হাজিরা / কাজের দিন (উপস্থিতি) *
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={31}
                            placeholder="30"
                            value={salaryDaysWorked === 0 ? '' : salaryDaysWorked}
                            onChange={(e) => {
                              const v = e.target.value.replace(/^0+(?=\d)/, '');
                              const val = v === '' ? 0 : Number(v);
                              setSalaryDaysWorked(val);
                              const proRated = Math.round((salaryBase / (salaryDaysTotal || 30)) * val);
                              setStkPayAmount(Math.max(0, proRated + salaryBonus - salaryDeduction));
                            }}
                            className="w-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-2 font-mono font-bold text-center"
                          />
                          <span className="text-slate-400 font-bold">/</span>
                          <span className="text-xs font-semibold text-slate-500">৩০ দিন</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          + বোনাস / ট্রিপ খোরাকি (BDT)
                        </label>
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={salaryBonus === 0 ? '' : salaryBonus}
                          onChange={(e) => {
                            const v = e.target.value.replace(/^0+(?=\d)/, '');
                            const val = v === '' ? 0 : Number(v);
                            setSalaryBonus(val);
                            const proRated = Math.round((salaryBase / (salaryDaysTotal || 30)) * (salaryDaysWorked || 30));
                            setStkPayAmount(Math.max(0, proRated + val - salaryDeduction));
                          }}
                          className="w-full rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono font-bold text-emerald-600"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">ট্রাক চালকের ট্রিপ ভাতা বা ঈদ বোনাস</p>
                      </div>

                      <div>
                        <label className="block mb-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                          - অগ্রিম কর্তন / জরিমানা (BDT)
                        </label>
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={salaryDeduction === 0 ? '' : salaryDeduction}
                          onChange={(e) => {
                            const v = e.target.value.replace(/^0+(?=\d)/, '');
                            const val = v === '' ? 0 : Number(v);
                            setSalaryDeduction(val);
                            const proRated = Math.round((salaryBase / (salaryDaysTotal || 30)) * (salaryDaysWorked || 30));
                            setStkPayAmount(Math.max(0, proRated + salaryBonus - val));
                          }}
                          className="w-full rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono font-bold text-rose-600"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">মাসের মাঝে অগ্রিম ক্যাশ নিয়ে থাকলে</p>
                      </div>
                    </div>

                    {/* Final Math Formula Result Pill */}
                    <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                        <div className="font-semibold">
                          আনুপাতিক মূল: {formatBDT(Math.round((salaryBase / 30) * salaryDaysWorked))}
                          {salaryBonus > 0 && <span className="text-emerald-700 font-bold"> + বোনাস: {formatBDT(salaryBonus)}</span>}
                          {salaryDeduction > 0 && <span className="text-rose-700 font-bold"> - কর্তন: {formatBDT(salaryDeduction)}</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ফর্মুলা: (মূল বেতন ÷ ৩০ × হাজিরা) + বোনাস/খোরাকি - কর্তন
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-500">চূড়ান্ত প্রদেয় নিট বেতন</div>
                        <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
                          {formatBDT(stkPayAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1.5 font-semibold">টাকার পরিমাণ (BDT) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="0"
                      value={stkPayAmount === 0 ? '' : stkPayAmount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setStkPayAmount(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold">তারিখ (Date)</label>
                    <input
                      type="date"
                      value={stkPayDate}
                      onChange={(e) => setStkPayDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono"
                    />
                  </div>
                </div>
              )}

              {stkPayTarget.stakeholderType === 'employee' && (
                <div>
                  <label className="block mb-1.5 font-semibold">পেমেন্ট তারিখ (Payment Date)</label>
                  <input
                    type="date"
                    value={stkPayDate}
                    onChange={(e) => setStkPayDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block mb-1.5 font-semibold">
                  {stkPayTarget.stakeholderType === 'customer'
                    ? 'কোন ক্যাশ বা ব্যাংকে টাকা জমা হবে? *'
                    : 'কোন ক্যাশ বা ব্যাংক থেকে টাকা দেবেন? *'}
                </label>
                <select
                  value={stkPayWalletId}
                  onChange={(e) => setStkPayWalletId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1.5 font-semibold">নোট / বিবরণ (Optional)</label>
                <input
                  type="text"
                  value={stkPayNote}
                  onChange={(e) => setStkPayNote(e.target.value)}
                  placeholder={
                    stkPayTarget.stakeholderType === 'employee'
                      ? 'যেমন: নভেম্বর মাসের বেতন ও ট্রিপ খোরাকি'
                      : 'যেমন: নগদ / ব্যাংক চেকের মাধ্যমে পরিশোধ'
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStkPayTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSettlingStk || stkPayAmount <= 0}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-600/30"
                >
                  {isSettlingStk
                    ? 'সংরক্ষণ হচ্ছে...'
                    : stkPayTarget.stakeholderType === 'customer'
                    ? 'টাকা জমা নিশ্চিত করুন'
                    : `${formatBDT(stkPayAmount)} পেমেন্ট নিশ্চিত করুন`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Business Manager Salary Disbursement Modal */}
      {mgrPayTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setMgrPayTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-emerald-600" />
                  <span>বিজনেস ম্যানেজার বেতন অনুমোদন ও প্রদান (Manager Remuneration)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {mgrPayTarget.displayName} · বিভাগীয় প্রধান ({mgrPayTarget.assignedBusinesses || 'RegardsAgro'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMgrPayTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                    <span>{mgrPayTarget.displayName}</span>
                    <span className="font-mono text-[10px] text-slate-500">[{mgrPayTarget.role}]</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    মোবাইল: <strong>{mgrPayTarget.phone || '+880 1711-000000'}</strong> · অনুমোদক: <strong>{userRole === 'super_admin' ? 'সুপার অ্যাডমিন (মালিক)' : 'জেনারেল ম্যানেজার (Super Manager)'}</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">মাসিক নির্ধারিত রিম্যুনারেশন</div>
                  <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    {formatBDT(mgrPayTarget.monthlySalary || 35000)}
                  </div>
                </div>
              </div>

              {/* Base Salary Input */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    মাসিক মূল বেতন (BDT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={mgrPayAmount === 0 ? '' : mgrPayAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setMgrPayAmount(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    + পারফরম্যান্স বোনাস (BDT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={mgrPayBonus === 0 ? '' : mgrPayBonus}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setMgrPayBonus(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-rose-700 dark:text-rose-400 mb-1">
                    - অগ্রিম / জরিমানা কর্তন
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={mgrPayDeduction === 0 ? '' : mgrPayDeduction}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setMgrPayDeduction(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono font-bold text-rose-600"
                  />
                </div>
              </div>

              {/* Calculated Total Payout Banner */}
              <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500">মোট প্রদেয় বেতন (ভাউচার অ্যামাউন্ট)</div>
                  <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
                    {formatBDT(Math.max(0, mgrPayAmount + mgrPayBonus - mgrPayDeduction))}
                  </div>
                </div>
                <div className="text-[11px] text-right text-slate-500">
                  মূল: ৳{mgrPayAmount} {mgrPayBonus > 0 ? `+ ৳${mgrPayBonus}` : ''} {mgrPayDeduction > 0 ? `- ৳${mgrPayDeduction}` : ''}
                </div>
              </div>

              {/* Wallet & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    পেমেন্ট মেথড / ক্যাশ ভল্ট বা ব্যাংক
                  </label>
                  <select
                    value={mgrPayWalletId || treasuryWallets[0]?.id || ''}
                    onChange={(e) => setMgrPayWalletId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-semibold"
                  >
                    {treasuryWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (ব্যালেন্স: {formatBDT(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    পরিশোধের তারিখ
                  </label>
                  <input
                    type="date"
                    value={mgrPayDate}
                    onChange={(e) => setMgrPayDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ভাউচার বিবরণ / রিমার্কস
                </label>
                <input
                  type="text"
                  placeholder="যেমন: চলতি মাসের সন্তোষজনক খামার পরিচালনার বেতন অনুমোদন"
                  value={mgrPayNote}
                  onChange={(e) => setMgrPayNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMgrPayTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleSettleManagerSalary}
                  disabled={isSettlingMgr || (mgrPayAmount + mgrPayBonus - mgrPayDeduction) <= 0}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-600/30"
                >
                  {isSettlingMgr
                    ? 'প্রসেসিং হচ্ছে...'
                    : `${formatBDT(Math.max(0, mgrPayAmount + mgrPayBonus - mgrPayDeduction))} ভাউচার অনুমোদন ও বেতন দিন`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stakeholder Modal */}
      {showStkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => {
            setShowStkModal(false);
            setEditingStakeholder(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingStakeholder
                    ? `তথ্য সম্পাদনা করুন: ${editingStakeholder.name}`
                    : stkType === 'employee'
                    ? 'নতুন খামার কর্মী নিয়োগ দিন (Hire Farm Staff)'
                    : 'নতুন ক্রেতা বা সাপ্লায়ার যোগ করুন'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {userRole === 'business_manager'
                    ? 'বিজনেস ম্যানেজার হিসেবে আপনি নিজ ইউনিটের জন্য কর্মী নিয়োগ দিতে পারেন'
                    : 'খামার কর্মী, কাস্টমার বা ফিড সাপ্লায়ারের হিসাব ও তথ্য সংরক্ষণ'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStkModal(false);
                  setEditingStakeholder(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateStakeholder} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">কী ধরনের ব্যক্তি/প্রতিষ্ঠান? *</label>
                  <select
                    value={stkType}
                    disabled={Boolean(editingStakeholder) || userRole === 'business_manager'}
                    onChange={(e) => setStkType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-semibold disabled:opacity-60"
                  >
                    <option value="employee">👷 খামার কর্মী / স্টাফ (বেতন পাবেন)</option>
                    <option value="customer">🛒 পাইকারি ক্রেতা (টাকা পাব)</option>
                    <option value="supplier">🏭 সাপ্লায়ার / মিল (টাকা দেব)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">কোন ব্যবসা ইউনিট?</label>
                  <select
                    value={stkBizId}
                    disabled={userRole === 'business_manager' && assignedBusinessFilter !== 'ALL'}
                    onChange={(e) => setStkBizId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 disabled:opacity-60 font-semibold"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameBn || b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">
                    {stkType === 'employee' ? 'কর্মীর পূর্ণ নাম *' : 'নাম / প্রতিষ্ঠানের নাম *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={stkName}
                    onChange={(e) => setStkName(e.target.value)}
                    placeholder={
                      stkType === 'employee'
                        ? 'যেমন: মোঃ আব্দুল আলিম'
                        : 'যেমন: বিসমিল্লাহ ট্রেডার্স'
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-semibold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    value={stkPhone}
                    onChange={(e) => setStkPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">
                    {stkType === 'employee' ? 'কাজের পদবি / দায়িত্ব *' : 'পরিচয় / ক্যাটাগরি'}
                  </label>
                  <input
                    type="text"
                    required
                    value={stkRoleCat}
                    onChange={(e) => setStkRoleCat(e.target.value)}
                    placeholder={
                      stkType === 'employee'
                        ? 'যেমন: শেড ইনচার্জ / খাদ্য ও টিকাদান সহকারী'
                        : 'যেমন: পাইকার'
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">
                    {stkType === 'employee' ? 'মাসিক বেতন (BDT) *' : 'ক্রেডিট লিমিট (BDT)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={stkSalaryOrLimit === 0 ? '' : stkSalaryOrLimit}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setStkSalaryOrLimit(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-bold"
                  />
                </div>
              </div>

              {stkType === 'employee' && (
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    💡 নির্বাচিত ব্যবসার জন্য দ্রুত পদবি ও বেতন সেট করুন (Quick Templates):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const curBiz = fullBusinessList.find((b) => b.id === stkBizId) || businesses.find((b) => b.id === stkBizId);
                      const isTrk = curBiz?.templateType === 'transport' || curBiz?.name?.toLowerCase().includes('transport') || curBiz?.nameBn?.includes('ট্রাক');
                      const isFsh = curBiz?.templateType === 'fish' || curBiz?.nameBn?.includes('মৎস্য');
                      const isCtl = curBiz?.templateType === 'cattle' || curBiz?.nameBn?.includes('পশু');
                      const isGot = curBiz?.templateType === 'goat' || curBiz?.nameBn?.includes('ছাগল');

                      const templates = isTrk
                        ? [
                            { title: 'হেভি ট্রাক ড্রাইভার', role: 'হেভি ট্রাক ড্রাইভার (Heavy Vehicle Driver)', salary: 28000 },
                            { title: 'ট্রাক হেলপার / খালাসি', role: 'ট্রাক হেলপার ও লোডিং খালাসি', salary: 15000 },
                            { title: 'লজিস্টিক ও ট্রিপ ইনচার্জ', role: 'ফ্লিট ও ট্রিপ সুপারভাইজার', salary: 25000 },
                          ]
                        : isFsh
                        ? [
                            { title: 'পুকুর ও মাছের খাদ্য ইনচার্জ', role: 'পুকুর ও মাছের খাদ্য ইনচার্জ', salary: 22000 },
                            { title: 'জাল টানা ও ডেলিভারি সহকারী', role: 'জাল টানা ও ডেলিভারি সহকারী', salary: 16000 },
                            { title: 'হ্যাচারি টেকনিশিয়ান', role: 'হ্যাচারি টেকনিশিয়ান', salary: 25000 },
                          ]
                        : isCtl
                        ? [
                            { title: 'দুগ্ধ দোহন ও যত্নকর্মী', role: 'দুগ্ধ দোহন ও পশু পরিচর্যা কর্মী', salary: 20000 },
                            { title: 'পশু চিকিৎসা সহকারী', role: 'পশু চিকিৎসা ও টিকাদান সহকারী', salary: 24000 },
                            { title: 'ঘাস ও ফিড সহকারী', role: 'ফিড ও চারণ সহকারী', salary: 16000 },
                          ]
                        : isGot
                        ? [
                            { title: 'ছাগল প্রজনন ও যত্নকর্মী', role: 'ছাগল প্রজনন ও যত্নকর্মী', salary: 19000 },
                            { title: 'শেড সহকারী', role: 'ছাগল শেড ও ফিড সহকারী', salary: 15000 },
                          ]
                        : [
                            { title: 'শেড ইনচার্জ', role: 'পোল্ট্রি শেড ইনচার্জ', salary: 24000 },
                            { title: 'খাদ্য ও টিকাদান কর্মী', role: 'খাদ্য ও টিকাদান কর্মী', salary: 18000 },
                            { title: 'প্যাকিং ও ডেলিভারি সহকারী', role: 'প্যাকিং ও ডেলিভারি সহকারী', salary: 16000 },
                          ];

                      return templates.map((tmpl) => (
                        <button
                          key={tmpl.role}
                          type="button"
                          onClick={() => {
                            setStkRoleCat(tmpl.role);
                            setStkSalaryOrLimit(tmpl.salary);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
                        >
                          + {tmpl.title} ({formatBDT(tmpl.salary)})
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              <div>
                <label className="block mb-1 font-semibold">ঠিকানা / কর্মস্থল</label>
                <input
                  type="text"
                  value={stkAddress}
                  onChange={(e) => setStkAddress(e.target.value)}
                  placeholder="যেমন: খামার ক্যাম্প ১, শ্রীপুর, গাজীপুর"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                />
              </div>

              {stkType !== 'employee' && !editingStakeholder && (
                <div>
                  <label className="block mb-1 font-semibold">
                    {stkType === 'customer'
                      ? 'আগের বাকি (তার কাছে কত টাকা পাবেন - BDT)'
                      : 'আগের বাকি (তাকে কত টাকা দেবেন - BDT)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={stkBalance === 0 ? '' : stkBalance}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setStkBalance(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-bold"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowStkModal(false);
                    setEditingStakeholder(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingStakeholder}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
                >
                  {isSavingStakeholder
                    ? 'সংরক্ষণ হচ্ছে...'
                    : editingStakeholder
                    ? 'আপডেট করুন'
                    : stkType === 'employee'
                    ? 'নিয়োগ নিশ্চিত করুন'
                    : 'সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminate Employee Confirmation Modal */}
      {terminatingStakeholder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setTerminatingStakeholder(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 font-bold">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  কর্মীকে বাদ / বরখাস্ত নিশ্চিতকরণ
                </h3>
                <p className="text-xs text-slate-500">
                  ব্যবসা ইউনিট: {terminatingStakeholder.businessName}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 text-xs text-red-800 dark:text-red-300">
              আপনি কি নিশ্চিতভাবে কর্মী <strong>&ldquo;{terminatingStakeholder.name}&rdquo;</strong> ({terminatingStakeholder.designationOrCategory})-কে খামার থেকে বরখাস্ত বা বাদ দিতে চান?
            </div>

            <div>
              <label className="block mb-1 font-bold text-xs text-slate-800 dark:text-slate-200">
                বাদ দেওয়ার কারণ / অফিসিয়াল মন্তব্য *
              </label>
              <textarea
                rows={3}
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                placeholder="যেমন: খামারের চুক্তি শেষ / কাজে অবহেলা / পদ বিলুপ্তি"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={isTerminatingStakeholder}
                onClick={() => setTerminatingStakeholder(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isTerminatingStakeholder}
                onClick={handleTerminateStakeholder}
                className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isTerminatingStakeholder ? 'প্রসেসিং হচ্ছে...' : 'হ্যাঁ, বরখাস্ত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXECUTIVE REPORT MODAL (Super Manager & Super Admin) */}
      {showExecutiveReportModal && (() => {
        const periodJournals = journalEntries.filter(
          (j) => j.status === 'posted' && matchesMonthFilter(j.date, activeMonthFilter)
        );
        const execTotalRev = periodJournals
          .filter((j) => j.transactionType === 'sale' || j.transactionType === 'income')
          .reduce((s, j) => s + j.amount, 0);
        const execTotalOpExp = periodJournals
          .filter((j) => j.transactionType === 'expense' || j.transactionType === 'purchase')
          .reduce((s, j) => s + j.amount, 0);
        const execTotalPayroll = periodJournals
          .filter((j) => j.transactionType === 'payroll')
          .reduce((s, j) => s + j.amount, 0);
        const execTotalExp = execTotalOpExp + execTotalPayroll;
        const execNetProfit = execTotalRev - execTotalExp;

        const cashVaultBalance = accounts
          .filter((a) => a.subType === 'cash')
          .reduce((s, a) => s + (a.balance || 0), 0);

        const bankPLCBalance = accounts
          .filter((a) => a.subType === 'bank')
          .reduce((s, a) => s + (a.balance || 0), 0);

        const totalEmployeesCount = stakeholders.filter(
          (s) => s.stakeholderType === 'employee' && s.status !== 'terminated'
        ).length;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
            onClick={() => setShowExecutiveReportModal(false)}
          >
            <div
              className="w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Report Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-extrabold text-[11px] uppercase tracking-wider">
                    <Award className="h-3.5 w-3.5" />
                    <span>প্রধান ম্যানেজারের অফিসিয়াল নির্বাহী প্রতিবেদন (Executive Report)</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    কৃষিভূমি এন্টারপ্রাইজ — ৫টি ব্যবসার সামগ্রিক লাভ-ক্ষতি ও কার্যবিবরণী
                  </h2>
                  <p className="text-xs text-slate-500">
                    প্রস্তুতকারক: <strong>প্রধান জেনারেল ম্যানেজার (Super Manager / COO)</strong> · প্রাপক: <strong>মালিক / স্বত্বাধিকারী (Super Admin)</strong> · সময়কাল: {formatMonthFilterLabel(activeMonthFilter, true)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExecutiveReportModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 self-start cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 4 Executive KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-500">মোট রাজস্ব ও বিক্রি</div>
                  <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatBDT(execTotalRev)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">সকল ৫টি ব্যবসা</div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-500">পরিচালন ব্যয় ও বেতন</div>
                  <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                    {formatBDT(execTotalExp)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">ফিড, ওষুধ, বেতন ও মেইনটেন্যান্স</div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5">
                  <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">সামগ্রিক নীট লাভ (Net Profit)</div>
                  <div className={`text-lg font-black font-mono mt-1 ${execNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}`}>
                    {formatBDT(execNetProfit)}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {execTotalRev > 0 ? `${((execNetProfit / execTotalRev) * 100).toFixed(1)}% মার্জিন` : 'প্রক্রিয়াধীন'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-blue-50/60 dark:bg-blue-950/30 p-3.5">
                  <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">ক্যাশ ও ব্যাংক রিজার্ভ</div>
                  <div className="text-lg font-black font-mono text-blue-700 dark:text-blue-300 mt-1">
                    {formatBDT(cashVaultBalance + bankPLCBalance)}
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                    মোট কর্মী বহর: {totalEmployeesCount} জন
                  </div>
                </div>
              </div>

              {/* 5 Business Units Breakdown Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-slate-100/70 dark:bg-slate-800/60 px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Business Unit Performance & Division Manager</span>
                  <span className="text-[11px] text-slate-500 font-normal">Audited in Realtime</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Business Unit</th>
                        <th className="py-2.5 px-3">Assigned Business Manager</th>
                        <th className="py-2.5 px-3 text-right">Revenue / Sales</th>
                        <th className="py-2.5 px-3 text-right">Expenses & Payroll</th>
                        <th className="py-2.5 px-3 text-right">Net Profit / Loss</th>
                        <th className="py-2.5 px-3 text-center">Staff Count</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {fullBusinessList.map((biz) => {
                        const bRev = periodJournals
                          .filter((j) => j.businessId === biz.id && (j.transactionType === 'sale' || j.transactionType === 'income'))
                          .reduce((s, j) => s + j.amount, 0);
                        const bExp = periodJournals
                          .filter((j) => j.businessId === biz.id && (j.transactionType === 'expense' || j.transactionType === 'purchase' || j.transactionType === 'payroll'))
                          .reduce((s, j) => s + j.amount, 0);
                        const bProfit = bRev - bExp;
                        const bStaffCount = stakeholders.filter((s) => s.businessId === biz.id && s.stakeholderType === 'employee' && s.status !== 'terminated').length;
                        const mgrUser = erpUsers.find((u) => u.role === 'business_manager' && (u.assignedBusinesses === 'ALL' || u.assignedBusinesses?.includes(biz.id)));

                        return (
                          <tr key={biz.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                              {biz.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                              {mgrUser ? (
                                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                  <Briefcase className="h-3 w-3 text-blue-500" />
                                  <span>{mgrUser.displayName}</span>
                                </div>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">নিয়োগ প্রক্রিয়াধীন</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatBDT(bRev)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                              {formatBDT(bExp)}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-mono font-extrabold ${bProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {formatBDT(bProfit)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {bStaffCount} জন
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${bProfit >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                                {bProfit >= 0 ? '✓ লাভজনক' : 'ঘাটতি'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Manager Remarks & Recommendations for Owner */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  প্রধান ম্যানেজারের পর্যবেক্ষণ ও মালিকের কাছে সুপারিশ (COO Executive Remarks & Recommendations):
                </label>
                <textarea
                  rows={3}
                  value={executiveReportRemarks}
                  onChange={(e) => setExecutiveReportRemarks(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-medium leading-relaxed"
                  placeholder="মালিকের জন্য খামার ব্যবস্থাপনা বা লাভ বৃদ্ধির সুপারিশ লিখুন..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:bg-slate-100 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>প্রিন্ট / PDF সেভ করুন</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExecutiveReportModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                  <button
                    type="button"
                    disabled={isSendingReport}
                    onClick={handleSendExecutiveReport}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-sm shadow-purple-600/30 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSendingReport ? 'রিপোর্ট পাঠানো হচ্ছে...' : 'মালিকের কাছে অফিসিয়াল রিপোর্ট পেশ করুন'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. UNIVERSAL OFFICIAL PRINTABLE SLIP / CHALLAN / VOUCHER MODAL */}
      {activeSlip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto"
          onClick={() => setActiveSlip(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Bar (Hidden in Print) */}
            <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>অফিসিয়াল অনুমোদিত স্লিপ প্রস্তুত</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>স্লিপ প্রিন্ট / PDF সেভ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSlip(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="বন্ধ করুন"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Area Begins */}
            <div className="border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-6 sm:p-8 bg-white dark:bg-slate-900 space-y-5">
              {/* Slip Header */}
              <div className="text-center space-y-1 border-b-2 border-slate-200 dark:border-slate-800 pb-4">
                <div className="inline-flex items-center justify-center gap-2">
                  <Landmark className="h-6 w-6 text-emerald-600" />
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    কৃষিভূমি এন্টারপ্রাইজ
                  </h2>
                </div>
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  KrishiVumi Enterprise · সেন্ট্রাল এগ্রো মাল্টি-বিজনেস ম্যানেজমেন্ট
                </div>
                <p className="text-[11px] text-slate-500">
                  হিসাব ও গোডাউন অডিট ট্রেইল শাখা · প্রধান কার্যালয় কমপ্লেক্স
                </p>

                <div className="pt-2">
                  <span className="inline-block px-4 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                    {activeSlip.type === 'salary_payslip'
                      ? 'কর্মচারী বেতন ও মজুরি পরিশোধ পে-স্লিপ'
                      : activeSlip.type === 'goods_purchase_slip'
                      ? 'গোডাউন পণ্য গ্রহণ ও ক্রয় চালান ভাউচার'
                      : 'আর্থিক লেনদেন ও ক্যাশ মানি রিসিট'}
                  </span>
                </div>
              </div>

              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-slate-500">ভাউচার / স্লিপ নম্বর:</span>{' '}
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{activeSlip.slipNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">লেনদেনের তারিখ:</span>{' '}
                    <span className="font-semibold">{activeSlip.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ব্যবসা ইউনিট:</span>{' '}
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{activeSlip.businessName}</span>
                  </div>
                  {activeSlip.appointedBy && (
                    <div>
                      <span className="text-slate-500">Appointing Authority:</span>{' '}
                      <span className="font-semibold">{activeSlip.appointedBy}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-right sm:text-left">
                  <div>
                    <span className="text-slate-500">
                      {activeSlip.type === 'salary_payslip'
                        ? 'Staff / Employee:'
                        : activeSlip.type === 'goods_purchase_slip'
                        ? 'Warehouse / Consignee:'
                        : 'Recipient / Payee:'}
                    </span>{' '}
                    <span className="font-bold text-slate-950 dark:text-white">{activeSlip.recipientName}</span>
                  </div>
                  {(activeSlip.designation || activeSlip.recipientDesignation) && (
                    <div>
                      <span className="text-slate-500">Designation / Role:</span>{' '}
                      <span className="font-medium">{activeSlip.designation || activeSlip.recipientDesignation}</span>
                    </div>
                  )}
                  {activeSlip.recipientPhone && (
                    <div>
                      <span className="text-slate-500">Phone:</span>{' '}
                      <span className="font-mono">{activeSlip.recipientPhone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Payment Channel:</span>{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{activeSlip.paymentMethod}</span>
                  </div>
                  {activeSlip.supplierMemoNo && (
                    <div className="text-rose-700 dark:text-rose-400 font-bold">
                      <span>Vendor Invoice / Memo No:</span>{' '}
                      <span className="font-mono underline">{activeSlip.supplierMemoNo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Table or Payment Details */}
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-4">Description / Particulars</th>
                      {activeSlip.type === 'goods_purchase_slip' ? (
                        <>
                          <th className="py-2.5 px-4 text-center">Quantity</th>
                          <th className="py-2.5 px-4 text-right">Unit Rate</th>
                        </>
                      ) : (
                        <th className="py-2.5 px-4">Account / Notes</th>
                      )}
                      <th className="py-2.5 px-4 text-right">Total Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="py-3 px-4 font-semibold">
                        {activeSlip.itemName || activeSlip.note || 'General Transaction'}
                        {activeSlip.supplierName && (
                          <div className="text-[11px] text-slate-500 font-normal">
                            Supplier / Dealer: {activeSlip.supplierName}
                          </div>
                        )}
                      </td>
                      {activeSlip.type === 'goods_purchase_slip' ? (
                        <>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            {activeSlip.quantity} {activeSlip.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {formatBDT(activeSlip.unitPrice || 0)}
                          </td>
                        </>
                      ) : (
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {activeSlip.note}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-sm text-slate-950 dark:text-white">
                        {formatBDT(activeSlip.amount)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t border-slate-200 dark:border-slate-700">
                    <tr>
                      <td
                        colSpan={activeSlip.type === 'goods_purchase_slip' ? 3 : 2}
                        className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300"
                      >
                        Total Amount Paid / Received:
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
                        {formatBDT(activeSlip.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Words & Remarks */}
              <div className="text-xs space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  <span className="text-slate-500">In Words:</span>{' '}
                  <span className="italic font-bold">{formatBDT(activeSlip.amount)} Only</span>
                </div>
                {activeSlip.enteredBy && (
                  <div className="text-[11px] text-slate-500">
                    Audit Entry Logged By: <span className="font-mono">{activeSlip.enteredBy}</span>
                  </div>
                )}
              </div>

              {/* Anti-Theft / Fraud Warning Note */}
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <span>Compliance & Dual Verification Rule:</span>
                </div>
                <p className="leading-relaxed">
                  1. No cash transaction or warehouse goods discharge is valid without this authorized voucher.
                  2. For physical feed or livestock inward, the original supplier/mill memo must be attached.
                  3. Signatures from both the recipient and authorized manager are required for final audit posting.
                </p>
              </div>

              {/* 3 Physical Signature Blocks */}
              <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="space-y-1 border-t border-slate-400 pt-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {activeSlip.type === 'salary_payslip'
                      ? 'Staff / Recipient Signature'
                      : activeSlip.type === 'goods_purchase_slip'
                      ? 'Warehouse Officer Signature'
                      : 'Payer / Payee Signature'}
                  </div>
                  <div className="text-[10px] text-slate-400">Signature & Date</div>
                </div>

                <div className="space-y-1 border-t border-slate-400 pt-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    Branch Manager / Accountant
                  </div>
                  <div className="text-[10px] text-slate-400">Countersign & Verify</div>
                </div>

                <div className="space-y-1 border-t border-slate-400 pt-2">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">
                    Owner / Executive Approval
                  </div>
                  <div className="text-[10px] text-slate-400">Authorized Seal & Signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Identity Profile Modal for Clicked Staff / Manager / Super Admin */}
      <UserProfileCardModal
        isOpen={Boolean(viewingProfile)}
        onClose={() => setViewingProfile(null)}
        profile={viewingProfile}
        lang={lang}
      />
    </div>
  );
}
