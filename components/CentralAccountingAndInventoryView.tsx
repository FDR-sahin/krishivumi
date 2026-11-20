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
  { id: 'dashboard', label: 'মূল ড্যাশবোর্ড (Main Dashboard)' },
  { id: 'poultry', label: 'পোল্ট্রি ফার্মিং (Poultry Module)' },
  { id: 'cattle', label: 'গরুর খামার (Cattle Module)' },
  { id: 'goat', label: 'ছাগলের খামার (Goat Module)' },
  { id: 'fish', label: 'মাছ চাষ (Fisheries Module)' },
  { id: 'transport', label: 'ট্রাক ও পরিবহন (Transport Module)' },
  { id: 'accounting', label: 'টাকা-পয়সা ও ভাউচার (Central Accounting)' },
  { id: 'inventory', label: 'গোডাউন ও স্টক (Inventory)' },
  { id: 'stakeholders', label: 'কর্মচারী, বেতন ও বাকি (HR & Due)' },
  { id: 'reports', label: 'লাভ-ক্ষতির রিপোর্ট (Financial Reports)' },
  { id: 'rbac', label: 'ইউজার ও পারমিশন কন্ট্রোল (User & RBAC)' },
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
  lang = 'bn',
}: CentralAccountingAndInventoryViewProps) {
  const bn = lang === 'bn';
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
    'মাননীয় মালিক মহোদয়, বিগত মাসে আমাদের ৫টি ব্যবসায়িক ইউনিট (পোল্ট্রি, ডেইরি ও গরু মোটাতাজাকরণ, ছাগল খামার, মৎস্য প্রকল্প ও বাণিজ্যিক ট্রাক) সুশৃঙ্খলভাবে পরিচালিত হয়েছে। লাভ, ব্যয় ও খামার পরিচালন সমন্বিত হিসাব আপনার সদয় পর্যালোচনার জন্য পেশ করা হলো।'
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
  const [terminationReason, setTerminationReason] = useState('কাজে অবহেলা / খামারের প্রয়োজন সমাপ্তি');
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
    setTimeout(() => setToastMsg(null), 4500);
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
          displayName: 'জনাব তারেক মাহমুদ (প্রধান জেনারেল ম্যানেজার - COO)',
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
          displayName: 'মোঃ রফিকুল ইসলাম (পোল্ট্রি খামার ম্যানেজার)',
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
          displayName: 'ডাঃ কামরুল হাসান (গরু ও ছাগল খামার ইনচার্জ)',
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
          displayName: 'তানভীর আহমেদ (খামার হিসাব সহকারী / Data Entry)',
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
              name: 'আব্দুল আলিম (পোল্ট্রি শেড সহকারী)',
              phone: '+880 1712-445566',
              email: 'alim.poultry@krishivumi.bd',
              address: 'শেড নং ১, গাজীপুর খামার',
              businessId: poultryBiz.id,
              businessName: poultryBiz.nameBn || poultryBiz.name,
              designationOrCategory: 'পোল্ট্রি শেড সহকারী',
              monthlySalaryOrCreditLimit: 22000,
              outstandingBalance: 0,
              status: 'active',
              appointedBy: 'মোঃ রফিকুল ইসলাম (পোল্ট্রি ম্যানেজার)',
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
              name: 'সফিকুল ইসলাম (ডেইরি কেয়ারটেকার)',
              phone: '+880 1819-334455',
              email: 'safiq.cattle@krishivumi.bd',
              address: 'শেড নং ২, ডেইরি ইউনিট',
              businessId: cattleBiz.id,
              businessName: cattleBiz.nameBn || cattleBiz.name,
              designationOrCategory: 'ডেইরি ও মিল্কিং ইনচার্জ',
              monthlySalaryOrCreditLimit: 24000,
              outstandingBalance: 0,
              status: 'active',
              appointedBy: 'ডাঃ কামরুল হাসান (গরু খামার ইনচার্জ)',
              appointedByRole: 'business_manager',
              appointedAt: new Date().toISOString(),
            },
            ownerId,
            actorEmail
          );
        }
      }

      showNotice('৪ স্তরের পূর্ণাঙ্গ টিম (প্রধান ম্যানেজার, বিজনেস ম্যানেজারগণ ও কর্মী) তৈরি হয়েছে! লগইন পাসওয়ার্ড: Krishi@1234');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ডেমো ইউজার তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSendExecutiveReport = async () => {
    setIsSendingReport(true);
    try {
      await createNotificationRecord({
        title: '📊 প্রধান ম্যানেজারের পক্ষ থেকে নতুন কার্যবিবরণী ও লাভ-ক্ষতি রিপোর্ট',
        message: `মাননীয় মালিক মহোদয়, প্রধান জেনারেল ম্যানেজার কর্তৃক ৫টি ব্যবসার সমন্বিত লাভ-ক্ষতি ও কার্যবিবরণী রিপোর্ট পেশ করা হয়েছে। প্রধান ম্যানেজারের মন্তব্য: "${executiveReportRemarks.slice(0, 160)}..."`,
        category: 'executive_report',
        priority: 'high',
        businessId: 'ALL',
      });
      showNotice('মালিকের ইনবক্সে অফিসিয়াল কার্যবিবরণী ও লাভ-ক্ষতি রিপোর্ট সফলভাবে পেশ করা হয়েছে!');
      setShowExecutiveReportModal(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'রিপোর্ট পাঠাতে সমস্যা হয়েছে।');
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
      `সফলভাবে ভাউচার ${payload.referenceNo} (${formatBDT(payload.amount)}) সংরক্ষণ করা হয়েছে!`
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
      showNotice(`${accName}-এ ${formatBDT(Number(depAmount))} সফলভাবে জমা করা হয়েছে!`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'টাকা জমা করতে সমস্যা হয়েছে।');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleEasyTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!trFromId || !trToId || trFromId === trToId) {
      setErrorMsg('অনুগ্রহ করে দুটি ভিন্ন অ্যাকাউন্ট (কোথা থেকে এবং কোথায়) নির্বাচন করুন।');
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
            trNote.trim() || `${fromAcc.name} থেকে ${toAcc.name}-এ ফান্ড ট্রান্সফার`,
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
        `${fromAcc.name} থেকে ${formatBDT(Number(trAmount))} সরিয়ে ${toAcc.name}-এ জমা করা হয়েছে!`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ট্রান্সফার করতে সমস্যা হয়েছে।');
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
      showNotice(`নতুন ${newAccType === 'cash' ? 'ক্যাশ' : 'ব্যাংক'} অ্যাকাউন্ট "${newAccName}" তৈরি হয়েছে!`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে।');
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
      showNotice('সব ডেমো ব্যালেন্স ও স্যাম্পল লেনদেন ৳০ করা হয়েছে। এখন আপনি নিজের আসল হিসাব যোগ করতে পারবেন!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'রিসেট করতে সমস্যা হয়েছে।');
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
        showNotice(`"${stkName}"-এর তথ্য সফলভাবে সংশোধন করা হয়েছে!`);
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
          `নতুন ${
            stkType === 'employee'
              ? 'কর্মচারী'
              : stkType === 'customer'
              ? 'ক্রেতা/পাইকার'
              : 'সাপ্লায়ার'
          } "${stkName}" সফলভাবে নিয়োগ/যুক্ত করা হয়েছে!`
        );
      }
      setShowStkModal(false);
      setEditingStakeholder(null);
      setStkName('');
      setStkBalance(0);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'স্টেকহোল্ডার সংরক্ষণ করতে সমস্যা হয়েছে।');
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
        notes: terminationReason.trim() || 'খামারের প্রয়োজনীয়তা সমাপ্ত',
      });
      showNotice(`কর্মী "${terminatingStakeholder.name}"-কে বরখাস্ত/বাদ দেওয়া হয়েছে।`);
      setTerminatingStakeholder(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'কর্মী বাদ দিতে সমস্যা হয়েছে।');
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
    setStkAddress('গাজীপুর কমপ্লেক্স, বাংলাদেশ');
    setStkBizId(bId);

    if (biz?.templateType === 'transport' || biz?.name?.toLowerCase().includes('transport') || biz?.nameBn?.includes('ট্রাক')) {
      setStkRoleCat('হেভি ট্রাক ড্রাইভার (Heavy Vehicle Driver)');
      setStkSalaryOrLimit(28000);
    } else if (biz?.templateType === 'fish' || biz?.nameBn?.includes('মৎস্য')) {
      setStkRoleCat('পুকুর ও মাছের খাদ্য ইনচার্জ');
      setStkSalaryOrLimit(22000);
    } else if (biz?.templateType === 'cattle' || biz?.nameBn?.includes('পশু')) {
      setStkRoleCat('দুগ্ধ দোহন ও পশু পরিচর্যা কর্মী');
      setStkSalaryOrLimit(20000);
    } else if (biz?.templateType === 'goat' || biz?.nameBn?.includes('ছাগল')) {
      setStkRoleCat('ছাগল প্রজনন ও যত্নকর্মী');
      setStkSalaryOrLimit(18000);
    } else {
      setStkRoleCat('শেড ইনচার্জ / ফার্ম কর্মী');
      setStkSalaryOrLimit(20000);
    }
    setShowStkModal(true);
  };

  const handleSeedTransportStaff = async () => {
    const transportBiz = fullBusinessList.find(
      (b) => b.templateType === 'transport' || b.name?.toLowerCase().includes('transport') || b.nameBn?.includes('ট্রাক')
    );
    if (!transportBiz) {
      showNotice('ট্রাক ও পরিবহন ব্যবসা পাওয়া যায়নি।');
      return;
    }
    try {
      await createStakeholderRecord(
        {
          stakeholderType: 'employee',
          code: `DRV-${Date.now().toString().slice(-4)}`,
          name: 'মোঃ রফিকুল ইসলাম (হেভি ট্রাক ড্রাইভার)',
          phone: '+880 1718-552233',
          email: 'rafiq.driver@krishivumi.bd',
          address: 'গাজীপুর সেন্ট্রাল ট্রাক ডিপো',
          businessId: transportBiz.id,
          businessName: transportBiz.nameBn || transportBiz.name,
          designationOrCategory: 'হেভি ট্রাক ড্রাইভার (লাইসেন্স নং: DH-84920)',
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
          name: 'মোঃ কামাল হোসেন (ট্রাক হেলপার)',
          phone: '+880 1812-774411',
          email: 'kamal.helper@krishivumi.bd',
          address: 'শ্রীপুর ফিড লোডিং ইয়ার্ড',
          businessId: transportBiz.id,
          businessName: transportBiz.nameBn || transportBiz.name,
          designationOrCategory: 'ট্রাক হেলপার ও লোডিং খালাসি',
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
      showNotice('ট্রাক ও পরিবহন ব্যবসার জন্য ১ জন হেভি ড্রাইভার ও ১ জন হেলপার সফলভাবে যুক্ত হয়েছে!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ট্রাক স্টাফ যুক্ত করতে ব্যর্থ হয়েছে।');
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
        ? `${formatMonthFilterLabel(activeMonthFilter, true)} বেতন`
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
          formulaParts.push(`হাজিরা: ${salaryDaysWorked}/30 দিন`);
        }
        if (salaryBonus > 0) {
          formulaParts.push(`বোনাস/খোরাকি: +৳${salaryBonus}`);
        }
        if (salaryDeduction > 0) {
          formulaParts.push(`কর্তন: -৳${salaryDeduction}`);
        }
        const formulaText = formulaParts.length > 0 ? ` [${formulaParts.join(', ')}]` : '';
        finalNote = finalNote
          ? `${finalNote}${formulaText}`
          : `${formatMonthFilterLabel(activeMonthFilter, true)} বেতন${formulaText}`;
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
          ? 'বেতন প্রদান'
          : stkPayTarget.stakeholderType === 'customer'
          ? 'বাকি টাকা আদায়'
          : 'বাকি টাকা পরিশোধ';
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
        appointedBy: stkPayTarget.appointedBy || 'মালিক কর্তৃক সরাসরি',
        amount: Number(stkPayAmount),
        paymentMethod: walletAcc ? walletAcc.name : 'ক্যাশ ইন হ্যান্ড',
        note: finalNote || `${formatMonthFilterLabel(activeMonthFilter, true)} ${actionText}`,
        totalAmount: Number(stkPayAmount),
        enteredBy: actorEmail,
      });

      setStkPayTarget(null);
      showNotice(
        `${stkPayTarget.name}-এর ${formatBDT(Number(stkPayAmount))} ${actionText} সম্পন্ন! স্লিপটি নিচে তৈরি হয়েছে।`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'পেমেন্ট সম্পন্ন করতে সমস্যা হয়েছে।');
    } finally {
      setIsSettlingStk(false);
    }
  };

  const handleSettleManagerSalary = async () => {
    if (!mgrPayTarget) return;
    const finalAmount = Math.max(0, Number(mgrPayAmount) + Number(mgrPayBonus) - Number(mgrPayDeduction));
    if (finalAmount <= 0) {
      setErrorMsg('বেতনের পরিমাণ শূন্য হতে পারে না।');
      return;
    }
    const targetWalletId = mgrPayWalletId || treasuryWallets[0]?.id || accounts[0]?.id;
    if (!targetWalletId) {
      setErrorMsg('অনুগ্রহ করে বেতন পরিশোধের ক্যাশ ভল্ট বা ব্যাংক একাউন্ট নির্বাচন করুন।');
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
        throw new Error('বেতন খরচের লেজার একাউন্ট পাওয়া যায়নি।');
      }

      const assignedBiz = mgrPayTarget.assignedBusinesses || 'ALL';
      const bizId =
        assignedBiz !== 'ALL' && assignedBiz.length > 0
          ? assignedBiz.split(',')[0].trim()
          : (businesses[0]?.id || 'biz-poultry');

      const refNo = `MGR-PAY-${Date.now().toString().slice(-6)}`;
      const formulaParts: string[] = [];
      if (mgrPayBonus > 0) formulaParts.push(`বোনাস: +৳${mgrPayBonus}`);
      if (mgrPayDeduction > 0) formulaParts.push(`কর্তন: -৳${mgrPayDeduction}`);
      const formulaText = formulaParts.length > 0 ? ` [${formulaParts.join(', ')}]` : '';
      const finalNote = mgrPayNote
        ? `${mgrPayNote}${formulaText}`
        : `${formatMonthFilterLabel(activeMonthFilter, true)} বিজনেস ম্যানেজার রিম্যুনারেশন${formulaText}`;

      const walletAcc = treasuryWallets.find((w) => w.id === targetWalletId) || accounts.find((a) => a.id === targetWalletId);

      await postDoubleEntryTransaction(
        {
          businessId: bizId,
          businessName: assignedBiz === 'ALL' ? 'RegardsAgro Enterprise' : `বিভাগীয় প্রধান — ${assignedBiz}`,
          debitAccountId: expenseAcc.id,
          debitAccountName: expenseAcc.name,
          creditAccountId: targetWalletId,
          creditAccountName: walletAcc ? walletAcc.name : 'ক্যাশ ইন হ্যান্ড',
          amount: finalAmount,
          date: mgrPayDate,
          description: `বিজনেস ম্যানেজার বেতন প্রদান — ${mgrPayTarget.displayName} (${finalNote})`,
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
        businessName: assignedBiz === 'ALL' ? 'RegardsAgro Enterprise' : `বিভাগীয় প্রধান — ${assignedBiz}`,
        recipientName: mgrPayTarget.displayName,
        designation: 'বিজনেস ম্যানেজার (Division Manager)',
        recipientPhone: mgrPayTarget.phone || '+880 1711-000000',
        appointedBy: 'জেনারেল ম্যানেজার ও সুপার অ্যাডমিন',
        amount: finalAmount,
        paymentMethod: walletAcc ? walletAcc.name : 'ক্যাশ ইন হ্যান্ড',
        note: finalNote,
        totalAmount: finalAmount,
        enteredBy: actorEmail,
      });

      setMgrPayTarget(null);
      showNotice(
        `${mgrPayTarget.displayName}-কে ${formatBDT(finalAmount)} বেতন সফলভাবে পরিশোধ করা হয়েছে এবং অফিসিয়াল ভাউচার তৈরি হয়েছে!`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ম্যানেজার বেতন পরিশোধ ব্যর্থ হয়েছে।');
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
      showNotice('এক্সপোর্ট করার মতো কোনো লেনদেন পাওয়া যায়নি।');
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
        <MonthFilterBar value={activeMonthFilter} onChange={setMonthFilter} bn={true} />
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

      {/* 1. SIMPLE & CLEAR TREASURY, CASH, BANK & LEDGER */}
      {activeSection === 'accounting' && (
        <div className="space-y-6">
          {/* Header & Easy Action Buttons */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-emerald-600" />
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  টাকা-পয়সা, ক্যাশ ও ব্যাংক হিসাব (Cash, Bank & Ledger)
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                আপনার হাতে নগদ কত টাকা আছে, কোন ব্যাংকে কত আছে—তা এখানে দেখুন। নতুন টাকা যোগ করতে <strong>&ldquo;+ টাকা জমা করুন&rdquo;</strong> এবং এক একাউন্ট থেকে আরেক একাউন্টে নিতে <strong>&ldquo;টাকা ট্রান্সফার&rdquo;</strong> ব্যবহার করুন।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => openDepositModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>+ ক্যাশ / ব্যাংকে টাকা জমা</span>
              </button>

              <button
                type="button"
                onClick={() => openTransferModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 whitespace-nowrap"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-600" />
                <span>টাকা ট্রান্সফার (From → To)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNewAccountModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ নতুন ব্যাংক / বিকাশ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSelectVoucherType('sale');
                  setShowVoucherModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <span>+ আয় / খরচ ভাউচার</span>
              </button>

              {userRole === 'super_admin' && (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 whitespace-nowrap"
                  title="প্রাথমিক ডেমো ব্যালেন্স মুছে ৳০ থেকে শুরু করুন"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>৳০ থেকে শুরু করুন</span>
                </button>
              )}
            </div>
          </div>

          {/* SECTION A: CASH & BANK WALLETS (Only real money accounts!) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <span>আপনার নগদ ক্যাশ ও ব্যাংক অ্যাকাউন্টসমূহ ({treasuryWallets.length}টি)</span>
              </h2>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                মোট নগদ + ব্যাংক: {formatBDT(treasuryWallets.reduce((s, w) => s + Number(w.balance), 0))}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {treasuryWallets.map((w) => {
                const isCash = w.subType === 'cash';
                return (
                  <div
                    key={w.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isCash
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                          }`}
                        >
                          {isCash ? <Banknote className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
                        </div>
                        <div>
                          <span
                            className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isCash
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                            }`}
                          >
                            {isCash ? 'নগদ ক্যাশ (Cash)' : 'ব্যাংক / ওয়ালেট (Bank)'}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                            {w.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatBDT(w.balance)}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => openDepositModal(w.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white text-xs font-bold transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>টাকা জমা দিন</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openTransferModal(w.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        <span>ট্রান্সফার</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION B: SIMPLE 4-CARD SUMMARY + COLLAPSIBLE FULL CHART OF ACCOUNTS */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  আয়, খরচ, পাওনা ও দেনার সংক্ষিপ্ত হিসাব
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  এগুলো আপনার ব্যবসার মোট বিক্রি, খরচ, ক্রেতাদের কাছে পাওনা এবং সাপ্লায়ারদের দেনা দেখায় (এগুলোতে আলাদা টাকা যোগ করতে হয় না, এন্ট্রি দিলে অটো আপডেট হয়)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFullAccounts(!showFullAccounts)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
              >
                {showFullAccounts ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    <span>সব লেজার লুকান</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>সব {accounts.length}টি লেজার অ্যাকাউন্ট দেখুন</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: `বিক্রি ও আয় (${formatMonthFilterLabel(activeMonthFilter, true)})`,
                  val: monthlyPostedJournals
                    .filter((j) => j.transactionType === 'sale' || j.transactionType === 'income')
                    .reduce((s, j) => s + Number(j.amount), 0),
                  color: 'text-emerald-600 dark:text-emerald-400',
                },
                {
                  title: `খরচ ও বেতন (${formatMonthFilterLabel(activeMonthFilter, true)})`,
                  val: monthlyPostedJournals
                    .filter(
                      (j) =>
                        j.transactionType === 'expense' ||
                        j.transactionType === 'purchase' ||
                        j.transactionType === 'payroll'
                    )
                    .reduce((s, j) => s + Number(j.amount), 0),
                  color: 'text-rose-600 dark:text-rose-400',
                },
                {
                  title: 'এই সময়ের বাকি / পাওনা (Due)',
                  val: monthlyPostedJournals.reduce((s, j) => s + Number(j.dueAmount || 0), 0),
                  color: 'text-amber-600 dark:text-amber-400',
                },
                {
                  title: 'এই সময়ের নিট লাভ (Net Profit)',
                  val:
                    monthlyPostedJournals
                      .filter((j) => j.transactionType === 'sale' || j.transactionType === 'income')
                      .reduce((s, j) => s + Number(j.amount), 0) -
                    monthlyPostedJournals
                      .filter(
                        (j) =>
                          j.transactionType === 'expense' ||
                          j.transactionType === 'purchase' ||
                          j.transactionType === 'payroll'
                      )
                      .reduce((s, j) => s + Number(j.amount), 0),
                  color: 'text-sky-600 dark:text-sky-400',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4"
                >
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {item.title}
                  </div>
                  <div className={`mt-1.5 text-xl font-extrabold font-mono tabular-nums ${item.color}`}>
                    {formatBDT(item.val)}
                  </div>
                </div>
              ))}
            </div>

            {showFullAccounts && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-mono">{acc.code}</span>
                        <span className="uppercase font-semibold">{acc.accountType}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {acc.name}
                      </div>
                      <div className="text-sm font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatBDT(acc.balance)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION C: TRANSACTION HISTORY TABLE */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  সকল লেনদেনের তালিকা (Transaction Ledger)
                </h2>
                <p className="text-xs text-slate-500">
                  কোন খাত থেকে টাকা গেছে এবং কোন খাতে টাকা জমা হয়েছে তার সম্পূর্ণ তালিকা
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedBizId}
                  onChange={(e) => setSelectedBizId(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="ALL">সব ব্যবসা (All Businesses)</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameBn || b.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV ডাউনলোড</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 bg-slate-50/60 dark:bg-slate-800/40">
                    <th className="py-3 px-4">ভাউচার ও তারিখ</th>
                    <th className="py-3 px-4">ব্যবসা</th>
                    <th className="py-3 px-4">এন্ট্রি দাতা (Actor)</th>
                    <th className="py-3 px-4">বিবরণ</th>
                    <th className="py-3 px-4">টাকা জমা / খরচ খাত (DR)</th>
                    <th className="py-3 px-4">টাকার উৎস / প্রদান খাত (CR)</th>
                    <th className="py-3 px-4 text-right">পরিমাণ (BDT)</th>
                    <th className="py-3 px-4 text-right">স্ট্যাটাস</th>
                    <th className="py-3 px-4 text-right">সংশোধন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredJournals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        এখনো কোনো লেনদেন নেই। উপরের &ldquo;+ ক্যাশ / ব্যাংকে টাকা জমা&rdquo; বা &ldquo;+ আয় / খরচ ভাউচার&rdquo; থেকে শুরু করুন।
                      </td>
                    </tr>
                  ) : (
                    filteredJournals.map((j) => (
                      <tr
                        key={j.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          j.status === 'reversed' ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {j.referenceNo}
                          </div>
                          <div className="text-slate-500">{j.date}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {j.businessName}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const email = j.actorEmail || '';
                            const matchedUser = erpUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
                            const matchedStk = stakeholders.find((s) => s.email?.toLowerCase() === email.toLowerCase() || s.name === j.actorName);
                            const actorName = j.actorName || matchedUser?.displayName || matchedStk?.name || (email.split('@')[0]) || 'RegardsAgro Admin';
                            const actorPhoto = resolveActorPhoto(email, actorName, j.actorRole, j.actorPhoto || matchedUser?.photoUrl || matchedStk?.photoUrl);
                            const actorPost = j.actorDesignation || matchedUser?.designation || matchedStk?.designationOrCategory || (j.actorRole === 'super_admin' ? 'Super Admin' : j.actorRole === 'super_manager' ? 'General Manager' : 'Officer');

                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingProfile({
                                    id: matchedUser?.id || matchedStk?.id,
                                    name: actorName,
                                    email: email || matchedUser?.email,
                                    phone: matchedUser?.phone || matchedStk?.phone || '+880 1711-000000',
                                    nidNumber: matchedUser?.nidNumber || matchedStk?.nidNumber || '',
                                    designation: actorPost,
                                    role: j.actorRole || matchedUser?.role || 'super_admin',
                                    businessName: j.businessName,
                                    photoUrl: actorPhoto,
                                    address: matchedUser?.address || matchedStk?.address,
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
                                    className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700 shadow-2xs"
                                  />
                                ) : (
                                  <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                                    {actorName.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors truncate max-w-[110px]">
                                    {actorName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                                    {actorPost}
                                  </div>
                                </div>
                              </button>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {j.category}{' '}
                            <span className="font-mono text-[11px] text-slate-500 uppercase">
                              · {j.transactionType.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-slate-500 truncate">{j.description}</div>
                          <div className="text-[11px] text-slate-400">Party: {j.counterpartyName}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-700 dark:text-emerald-400">
                          + {j.debitAccountName}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {j.creditAccountName}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatBDT(j.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <div
                            className={
                              j.status === 'reversed'
                                ? 'text-red-600'
                                : 'text-emerald-600 dark:text-emerald-400 font-medium'
                            }
                          >
                            {j.status.toUpperCase()}
                          </div>
                          {j.dueAmount > 0 && (
                            <div className="text-amber-600 dark:text-amber-400">
                              Due: {formatBDT(j.dueAmount)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSlip({
                                  type: j.transactionType === 'payroll' ? 'salary_payslip' : 'money_receipt',
                                  slipNo: j.referenceNo,
                                  date: j.date,
                                  businessName: j.businessName,
                                  recipientName: j.counterpartyName || j.description,
                                  amount: j.amount,
                                  paymentMethod: `${j.creditAccountName} ➔ ${j.debitAccountName}`,
                                  note: `${j.category}: ${j.description}`,
                                  enteredBy: actorEmail,
                                  recipientDesignation: j.transactionType === 'payroll' ? 'কর্মচারী' : undefined,
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 whitespace-nowrap cursor-pointer"
                              title="ভাউচার বা মানি রিসিট স্লিপ প্রিন্ট করুন"
                            >
                              <FileText className="h-3 w-3" />
                              <span>স্লিপ</span>
                            </button>

                            {j.status === 'posted' && j.transactionType !== 'reversal' ? (
                              <button
                                type="button"
                                disabled={userRole === 'employee'}
                                onClick={() => {
                                  triggerConfirmDelete({
                                    title: bn ? 'ভাউচার রিভার্স নিশ্চিতকরণ' : 'Confirm Voucher Reversal',
                                    message: bn
                                      ? `আপনি কি নিশ্চিতভাবে ভাউচার ${j.referenceNo} রিভার্স করতে চান? এর ফলে বিপরীত এন্ট্রি পাশ হবে।`
                                      : `Are you sure you want to reverse voucher ${j.referenceNo}? This will post an offsetting transaction.`,
                                    itemName: `${j.referenceNo} - ${j.category} (${formatBDT(j.amount)})`,
                                    onConfirm: async () => {
                                      await reversePostedJournalEntry(j, accounts, actorEmail);
                                      triggerGlobalToast(
                                        bn ? `${j.referenceNo} রিভার্স করা হয়েছে!` : `${j.referenceNo} reversed!`,
                                        'delete'
                                      );
                                    },
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap cursor-pointer"
                              >
                                <RotateCcw className="h-3 w-3" />
                                {bn ? 'রিভার্স করুন' : 'Reverse'}
                              </button>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">Locked</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. INVENTORY & WAREHOUSE MANAGEMENT */}
      {activeSection === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  গোডাউন ও স্টক ব্যবস্থাপনা (Warehouse & Stock Control)
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                সব ব্যবসার ফিড, ভ্যাকসিন, ওষুধ, পোনা ও জ্বালানি স্টক দেখুন এবং যেকোনো কাস্টম পরিমাণে স্টক ইন/আউট করুন।
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedBizId}
                onChange={(e) => setSelectedBizId(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold"
              >
                <option value="ALL">সব গোডাউন ও ব্যবসা (All)</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameBn || b.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowInvModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 whitespace-nowrap shadow-sm shadow-emerald-600/20"
              >
                <Plus className="h-4 w-4" />
                <span>+ নতুন পণ্য যোগ করুন</span>
              </button>
            </div>
          </div>

          {/* Monthly Stock KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">বর্তমান মোট স্টক মূল্য</div>
              <div className="mt-1 text-xl font-extrabold font-mono text-slate-900 dark:text-white">
                {formatBDT(filteredInventory.reduce((s, i) => s + i.quantity * i.unitCost, 0))}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{filteredInventory.length}টি আইটেম সক্রিয়</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">
                এই সময়ে স্টক ক্রয় ({formatMonthFilterLabel(activeMonthFilter, true)})
              </div>
              <div className="mt-1 text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {formatBDT(
                  filteredStockMovements
                    .filter((m) => m.movementType === 'purchase')
                    .reduce((s, m) => s + m.quantity * m.unitCost, 0)
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                মোট {filteredStockMovements.filter((m) => m.movementType === 'purchase').reduce((s, m) => s + m.quantity, 0)} ইউনিট ঢুকেছে
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">
                এই সময়ে খামারে ব্যবহার ({formatMonthFilterLabel(activeMonthFilter, true)})
              </div>
              <div className="mt-1 text-xl font-extrabold font-mono text-sky-600 dark:text-sky-400">
                {formatBDT(
                  filteredStockMovements
                    .filter((m) => m.movementType === 'consumption' || m.movementType === 'sale')
                    .reduce((s, m) => s + m.quantity * m.unitCost, 0)
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                মোট{' '}
                {filteredStockMovements
                  .filter((m) => m.movementType === 'consumption' || m.movementType === 'sale')
                  .reduce((s, m) => s + m.quantity, 0)}{' '}
                ইউনিট বের হয়েছে
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">কম স্টক সতর্কতা (Low Stock)</div>
              <div className="mt-1 text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
                {filteredInventory.filter((i) => i.quantity <= i.reorderLevel).length} টি
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">রি-অর্ডার সীমার নিচে রয়েছে</div>
            </div>
          </div>

          {/* PHYSICAL STOCK AUDIT & ANTI-THEFT DISCREPANCY RECONCILIATION */}
          <div
            id="godown-audit-panel"
            className="rounded-2xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-5 space-y-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-900/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-amber-500/30">
                  🔍
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>মালিকের সারপ্রাইজ গোডাউন অডিট ও গরমিল যাচাই (Anti-Theft Physical Stock Audit)</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      চুরি / টাকা মারা রোধ
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    স্টাফকে ৩০ বস্তা আনতে বললে সে সিস্টেমে ৫০ বস্তা লিখে টাকা চুরি করছে কি না—তা ধরতে এখানে বাস্তব গণনা দিয়ে টেস্ট করুন।
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">
                  ১. কোন আইটেমটি অডিট করবেন? *
                </label>
                <select
                  value={auditSelectedItemId}
                  onChange={(e) => {
                    setAuditSelectedItemId(e.target.value);
                    setAuditPhysicalCount('');
                  }}
                  className="w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- গোডাউনের আইটেম সিলেক্ট করুন --</option>
                  {filteredInventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (মজুদ: {item.quantity} {item.unit}) - {item.businessName}
                    </option>
                  ))}
                </select>
              </div>

              {auditSelectedItemId && (() => {
                const invItem = filteredInventory.find((i) => i.id === auditSelectedItemId);
                if (!invItem) return null;

                const systemQty = invItem.quantity;

                return (
                  <>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-500">সিস্টেমে বর্তমান এন্ট্রি</div>
                      <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                        {systemQty} {invItem.unit}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        দর: {formatBDT(invItem.unitCost)}/{invItem.unit} · মোট বুক ভ্যালু: {formatBDT(systemQty * invItem.unitCost)}
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">
                        ২. গোডাউনে গুনে পাওয়া গেল (Physical Count) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="যেমন: ৩০"
                          value={auditPhysicalCount}
                          onChange={(e) => setAuditPhysicalCount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full rounded-xl border border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-900 px-3 py-2.5 font-mono font-black text-base text-slate-900 dark:text-slate-100"
                        />
                        <span className="font-bold text-slate-600 dark:text-slate-400 text-xs shrink-0">
                          {invItem.unit}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Real-time Discrepancy & Fraud Detection Card */}
            {auditSelectedItemId && auditPhysicalCount !== '' && (() => {
              const invItem = filteredInventory.find((i) => i.id === auditSelectedItemId);
              if (!invItem) return null;

              const systemQty = invItem.quantity;
              const physicalQty = Number(auditPhysicalCount);
              const diff = physicalQty - systemQty;
              const shortage = diff < 0 ? Math.abs(diff) : 0;
              const lossBDT = shortage * invItem.unitCost;

              if (diff < 0) {
                return (
                  <div className="rounded-xl border-2 border-red-400 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
                        ⚠️
                      </div>
                      <div className="space-y-1">
                        <div className="font-black text-red-900 dark:text-red-200 text-sm">
                          🚨 মারাত্মক গরমিল ধরা পড়েছে! {shortage} {invItem.unit} কম পাওয়া গেছে!
                        </div>
                        <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
                          সিস্টেমে <strong>{systemQty} {invItem.unit}</strong> লেখা রয়েছে, কিন্তু গোডাউনে আপনি গুনে পেলেন মাত্র <strong>{physicalQty} {invItem.unit}</strong>!
                          এখানে <strong>{shortage} {invItem.unit} ঘাটতি</strong>, যার আর্থিক মূল্য <strong>{formatBDT(lossBDT)}</strong> টাকা।
                        </p>
                        <div className="text-[11px] font-semibold text-red-700 dark:text-red-400 bg-red-100/80 dark:bg-red-900/40 p-2.5 rounded-lg mt-1">
                          💡 <strong>চুরি রোধের পদক্ষেপ:</strong> সংশ্লিষ্ট ম্যানেজার/স্টাফের কাছ থেকে মিলের মূল ক্যাশ মেমো ও সাইন করা চালান স্লিপ তলব করুন। সে যদি মেমো দেখাতে না পারে, তবে বুঝবেন কম মাল এনে বেশি টাকা সফটওয়্যার থেকে কেটে নিয়েছে।
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-red-200 dark:border-red-900/60">
                      <button
                        type="button"
                        disabled={isSendingDiscrepancyNotice}
                        onClick={() => handleSendDiscrepancyNotice(invItem, shortage, lossBDT)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{isSendingDiscrepancyNotice ? 'নোটিশ যাচ্ছে...' : 'ম্যানেজারকে কৈফিয়ত নোটিশ পাঠান'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isReconcilingStock}
                        onClick={() => handleReconcilePhysicalStock(invItem, physicalQty)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{isReconcilingStock ? 'সমন্বয় হচ্ছে...' : `বাস্তব ${physicalQty} ${invItem.unit}-এ স্টক সমন্বয় করুন`}</span>
                      </button>
                    </div>
                  </div>
                );
              }

              if (diff === 0) {
                return (
                  <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>✓ গোডাউনে কোনো গরমিল পাওয়া যায়নি! বাস্তব গণনা ({physicalQty} {invItem.unit}) এবং সফটওয়্যারের এন্ট্রি ১০০% নির্ভুল মিলেছে।</span>
                  </div>
                );
              }

              return (
                <div className="rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-3.5 text-xs text-blue-800 dark:text-blue-300 font-semibold">
                  ℹ️ গোডাউনে অতিরিক্ত +{diff} {invItem.unit} মজুত পাওয়া গেছে। চাইলে আপনি তা সমন্বয় করতে পারেন।
                </div>
              );
            })()}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 bg-slate-50/60 dark:bg-slate-800/40">
                    <th className="py-3 px-4">কোড ও বারকোড</th>
                    <th className="py-3 px-4">পণ্যের নাম ও ধরন</th>
                    <th className="py-3 px-4">ব্যবসা ও গোডাউন</th>
                    <th className="py-3 px-4 text-right">বর্তমান মজুদ</th>
                    <th className="py-3 px-4 text-right">মোট মূল্য / দর</th>
                    <th className="py-3 px-4">মেয়াদ ও সাপ্লায়ার</th>
                    <th className="py-3 px-4 text-right">অ্যাকশন ও অডিট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredInventory.map((item) => {
                    const isLow = item.quantity <= item.reorderLevel;
                    const stockVal = item.quantity * item.unitCost;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.sku}
                          </div>
                          <div className="text-slate-400">{item.barcode}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.name}
                          </div>
                          <div className="text-slate-500 uppercase">{item.category}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {item.businessName}
                          </div>
                          <div className="text-slate-500">{item.warehouse}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                          <div
                            className={`font-bold ${
                              isLow
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.quantity} {item.unit}
                          </div>
                          <div className="text-slate-400">
                            সর্বনিম্ন সীমা: {item.reorderLevel} {isLow ? '(কম স্টক!)' : ''}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatBDT(stockVal)}
                          </div>
                          <div className="text-slate-500">@ {formatBDT(item.unitCost)}/{item.unit}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-slate-700 dark:text-slate-300">
                            মেয়াদ: {item.expiryDate || 'N/A'}
                          </div>
                          <div className="text-slate-500">{item.supplierName}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setAuditSelectedItemId(item.id);
                                setAuditPhysicalCount('');
                                const panel = document.getElementById('godown-audit-panel');
                                if (panel) panel.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="px-2 py-1.5 text-xs font-bold rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 whitespace-nowrap cursor-pointer"
                              title="বাস্তব গোডাউন মজুদের সাথে গরমিল টেস্ট করুন"
                            >
                              🔍 অডিট
                            </button>
                            <button
                              type="button"
                              onClick={() => openStockMoveModal(item, 'purchase')}
                              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap cursor-pointer shadow-2xs"
                            >
                              + স্টক ইন
                            </button>
                            <button
                              type="button"
                              onClick={() => openStockMoveModal(item, 'consumption')}
                              className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                            >
                              - স্টক আউট
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock Movements Traceability Log */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                স্টক আনা-নেওয়ার ইতিহাস ও চালান রসিদ ({formatMonthFilterLabel(activeMonthFilter, true)})
              </h3>
              <span className="text-xs font-mono text-slate-500">
                {filteredStockMovements.length}টি রেকর্ড
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                    <th className="py-2.5 px-4">তারিখ</th>
                    <th className="py-2.5 px-4">পণ্যের নাম</th>
                    <th className="py-2.5 px-4">ধরন</th>
                    <th className="py-2.5 px-4">কোথা থেকে → কোথায়</th>
                    <th className="py-2.5 px-4 text-right">পরিমাণ</th>
                    <th className="py-2.5 px-4">মোট দাম</th>
                    <th className="py-2.5 px-4">নোট ও মেমো নং</th>
                    <th className="py-2.5 px-4 text-right">চালান স্লিপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredStockMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        নির্বাচিত মাসে স্টকের কোনো আনা-নেওয়া হয়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredStockMovements.slice(0, 25).map((m) => (
                      <tr key={m.id}>
                        <td className="py-2.5 px-4 font-mono">{m.date}</td>
                        <td className="py-2.5 px-4 font-medium">{m.itemName}</td>
                        <td className="py-2.5 px-4 uppercase font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.movementType === 'purchase'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {m.movementType}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {m.sourceLocation} → {m.destinationLocation}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">
                          {m.quantity}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {formatBDT(m.quantity * m.unitCost)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{m.notes}</td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSlip({
                                type: 'goods_purchase_slip',
                                slipNo: `CHALLAN-${m.id.slice(-6).toUpperCase()}`,
                                date: m.date,
                                businessName: fullBusinessList.find((b) => b.id === m.businessId)?.nameBn || 'সেন্ট্রাল এগ্রো গোডাউন',
                                recipientName: m.destinationLocation,
                                amount: m.quantity * m.unitCost,
                                paymentMethod: m.movementType === 'purchase' ? 'সাপ্লায়ার ক্যাশ/ব্যাংক বিল' : 'খামার ইন্টারনাল ট্রান্সফার',
                                note: m.notes,
                                supplierName: m.sourceLocation,
                                supplierMemoNo: 'MEMO-' + m.id.slice(-5),
                                itemName: m.itemName,
                                quantity: m.quantity,
                                unit: 'বস্তা/একক',
                                unitPrice: m.unitCost,
                                totalAmount: m.quantity * m.unitCost,
                                enteredBy: actorEmail,
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 whitespace-nowrap cursor-pointer shadow-2xs"
                            title="চালান স্লিপ প্রিন্ট করুন"
                          >
                            <Printer className="h-3 w-3 text-emerald-600" />
                            <span>চালান স্লিপ</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. EMPLOYEES, PAYROLL, SUPPLIERS & CUSTOMERS */}
      {activeSection === 'stakeholders' && (
        <div className="space-y-6">
          {/* Header & Main Control Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  কর্মী, বেতন ও বাকি হিসাব (Staff, Customers & Suppliers)
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                <strong>কর্মচারী</strong> = মাসিক বেতন পাচ্ছেন · <strong>ক্রেতা/পাইকার</strong> = তাদের কাছ থেকে বাকি টাকা পাবেন · <strong>সাপ্লায়ার</strong> = দোকান/মিলকে বাকি টাকা দেবেন।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Salary Calculation Guide Accordion Trigger */}
              <button
                type="button"
                onClick={() => setShowSalaryGuide(!showSalaryGuide)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  showSalaryGuide
                    ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <Calculator className="h-4 w-4 text-blue-600" />
                <span>💡 বেতন হিসাব নির্দেশিকা</span>
              </button>

              {/* View Mode Switcher (Table vs Grouped Directory) */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStkViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    stkViewMode === 'table'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  <span>তালিকা ভিউ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStkViewMode('grouped')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    stkViewMode === 'grouped'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-emerald-600" />
                  <span>৫টি ব্যবসার কর্মী বোর্ড</span>
                </button>
              </div>

              {/* Stakeholder Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {[
                  { id: 'all' as const, label: 'সবাই' },
                  { id: 'employee' as const, label: 'কর্মচারী (বেতন)' },
                  { id: 'customer' as const, label: 'ক্রেতা (পাব)' },
                  { id: 'supplier' as const, label: 'সাপ্লায়ার (দেব)' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStkFilter(tab.id)}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      stkFilter === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => openHireStaffModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 whitespace-nowrap shadow-sm shadow-blue-600/20 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ নতুন কর্মী নিয়োগ দিন</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingStakeholder(null);
                  setStkType('customer');
                  setStkName('');
                  setStkPhone('+880 1711-000000');
                  setStkRoleCat('পাইকারি ক্রেতা');
                  setStkSalaryOrLimit(50000);
                  setStkBalance(0);
                  setStkBizId(stkBizFilter !== 'ALL' ? stkBizFilter : businesses[0]?.id || 'ALL');
                  setShowStkModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ পাইকার/সাপ্লায়ার</span>
              </button>
            </div>
          </div>

          {/* Salary Calculation Guide Accordion Banner */}
          {showSalaryGuide && (
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                    <Calculator className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      💡 খামার কর্মী ও পরিবহন ড্রাইভারদের বেতন হিসাবের ফর্মুলা নির্দেশিকা
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      সিস্টেমে কীভাবে সঠিক উপায়ে দিন গণনা, বোনাস/ট্রিপ খোরাকি এবং কর্তন সমন্বয় করে বেতন হিসাব করবেন:
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSalaryGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs pt-1">
                <div className="rounded-xl bg-white dark:bg-slate-900 p-4 border border-blue-100 dark:border-blue-900/60 space-y-1.5 shadow-2xs">
                  <div className="font-bold text-blue-700 dark:text-blue-400">
                    ১. মাসিক মূল বেতন ও হাজিরা (Attendance)
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    প্রতিটি কর্মীর চুক্তিকৃত মাসিক বেতন থাকে (যেমন: খামার কর্মী ৳২০,০০০, ট্রাক ড্রাইভার ৳২৮,০০০)। কর্মী মাসে যত দিন কাজ করবে, আনুপাতিক বেতন স্বয়ংক্রিয়ভাবে হিসাব হবে:
                    <br />
                    <span className="font-mono font-bold text-blue-600 mt-1 inline-block">
                      আনুপাতিক বেতন = (মূল বেতন ÷ ৩০) × হাজিরা দিন
                    </span>
                  </p>
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-900 p-4 border border-blue-100 dark:border-blue-900/60 space-y-1.5 shadow-2xs">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">
                    ২. ট্রিপ খোরাকি ও বোনাস (ট্রাক ব্যবসা ও খামার)
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    বাণিজ্যিক ট্রাক ব্যবসার ক্ষেত্রে ড্রাইভার ও হেলপাররা প্রতি দূরপাল্লার ট্রিপে খোরাকি বা ট্রিপ কমিশন পান। এছাড়া কর্মীদের ঈদ/উৎসব বোনাস থাকতে পারে। &ldquo;বেতন দিন&rdquo; মডালে বোনাস/খোরাকি বক্সে মানটি দিলেই মূল বেতনের সাথে যোগ হবে।
                  </p>
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-900 p-4 border border-blue-100 dark:border-blue-900/60 space-y-1.5 shadow-2xs">
                  <div className="font-bold text-rose-700 dark:text-rose-400">
                    ৩. অগ্রিম কর্তন ও স্বাক্ষরিত পে-স্লিপ
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    কর্মী মাসের মাঝে ক্যাশ থেকে অগ্রিম ধার নিয়ে থাকলে কর্তন বক্সে তা লিখে দিলে স্বয়ংক্রিয়ভাবে মোট বেতন থেকে বাদ যাবে। এরপর &ldquo;পেমেন্ট নিশ্চিত&rdquo; করলেই কোম্পানির সিল ও কর্মীর শারীরিক স্বাক্ষর নেওয়ার অফিসিয়াল পে-স্লিপ প্রিন্ট হবে।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5 Business Units Filter Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ব্যবসা অনুযায়ী কর্মী ফিল্টার (Filter by Business Unit):
              </span>
              {stkBizFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setStkBizFilter('ALL')}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  ← সকল ব্যবসার কর্মী দেখুন
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setStkBizFilter('ALL')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  stkBizFilter === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <span>🌐 সকল ব্যবসা ও খামার</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                  {stakeholders.filter((s) => s.stakeholderType === 'employee').length} জন কর্মী
                </span>
              </button>

              {businesses.map((biz) => {
                const staffCount = stakeholders.filter(
                  (s) => s.businessId === biz.id && s.stakeholderType === 'employee' && s.status !== 'terminated'
                ).length;
                const icon =
                  biz.templateType === 'poultry'
                    ? '🐔'
                    : biz.templateType === 'cattle'
                    ? '🐄'
                    : biz.templateType === 'goat'
                    ? '🐐'
                    : biz.templateType === 'fish'
                    ? '🐟'
                    : '🚚';
                return (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => setStkBizFilter(biz.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      stkBizFilter === biz.id
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                    }`}
                  >
                    <span>{icon} {biz.nameBn || biz.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        stkBizFilter === biz.id
                          ? 'bg-white/20 text-white'
                          : staffCount > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {staffCount} জন
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Business Unit Highlight Banner */}
          {(() => {
            const activeBizObj = fullBusinessList.find((b) => b.id === stkBizFilter);
            const activeBizStaff = stakeholders.filter(
              (s) => s.businessId === stkBizFilter && s.stakeholderType === 'employee' && s.status !== 'terminated'
            );
            const activeBizTotalSalary = activeBizStaff.reduce((sum, s) => sum + s.monthlySalaryOrCreditLimit, 0);
            const isTransportBiz =
              activeBizObj?.templateType === 'transport' ||
              activeBizObj?.name?.toLowerCase().includes('transport') ||
              activeBizObj?.nameBn?.includes('ট্রাক');

            if (stkBizFilter !== 'ALL' && activeBizObj) {
              return (
                <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-sm">
                      {isTransportBiz ? '🚚' : '🏢'}
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{activeBizObj.nameBn || activeBizObj.name} — কর্মী ও পে-রোল রেজিস্টার</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 text-[10px] font-bold">
                          সক্রিয় ফিল্টার
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        মোট কর্মী: <strong>{activeBizStaff.length} জন</strong> · মাসিক বেতন বাজেট: <strong>{formatBDT(activeBizTotalSalary)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isTransportBiz && activeBizStaff.length === 0 && (
                      <button
                        type="button"
                        onClick={handleSeedTransportStaff}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-sm cursor-pointer whitespace-nowrap"
                        title="ট্রাক ব্যবসার জন্য ১ জন ড্রাইভার ও ১ জন হেলপার যুক্ত করুন"
                      >
                        🚚 + ১-ক্লিকে ড্রাইভার ও হেলপার যোগ করুন
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openHireStaffModal(activeBizObj.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 cursor-pointer whitespace-nowrap"
                    >
                      + এই ব্যবসায় কর্মী নিয়োগ দিন
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* 4 Financial KPI Summary Cards (Filtered by Active Business) */}
          {(() => {
            const bizStakeholders = stakeholders.filter(
              (s) => stkBizFilter === 'ALL' || s.businessId === stkBizFilter
            );
            const activeEmployees = bizStakeholders.filter(
              (s) => s.stakeholderType === 'employee' && s.status !== 'terminated'
            );
            const activeStaffNames = new Set(activeEmployees.map((e) => e.name));
            const paidThisMonthBDT = monthlyPostedJournals
              .filter(
                (j) =>
                  j.transactionType === 'payroll' &&
                  (stkBizFilter === 'ALL' || j.businessId === stkBizFilter || activeStaffNames.has(j.counterpartyName))
              )
              .reduce((s, j) => s + j.amount, 0);

            const totalMonthlySalaryBudget = activeEmployees.reduce(
              (sum, s) => sum + s.monthlySalaryOrCreditLimit,
              0
            );
            const totalCustomerReceivable = bizStakeholders
              .filter((s) => s.stakeholderType === 'customer')
              .reduce((sum, s) => sum + s.outstandingBalance, 0);
            const totalSupplierPayable = bizStakeholders
              .filter((s) => s.stakeholderType === 'supplier')
              .reduce((sum, s) => sum + s.outstandingBalance, 0);

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs text-slate-500">
                    বেতন পরিশোধ ({formatMonthFilterLabel(activeMonthFilter, true)})
                  </div>
                  <div className="mt-1 text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatBDT(paidThisMonthBDT)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    সক্রিয় কর্মী: {activeEmployees.length} জন
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs text-slate-500">মোট মাসিক বেতন বাজেট</div>
                  <div className="mt-1 text-xl font-extrabold font-mono text-slate-900 dark:text-white">
                    {formatBDT(totalMonthlySalaryBudget)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {stkBizFilter === 'ALL' ? 'সকল সক্রিয় ইউনিট' : 'নির্বাচিত বিজনেস ইউনিট'}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs text-slate-500">পাইকার/ক্রেতার কাছে পাওনা (পাবেন)</div>
                  <div className="mt-1 text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                    {formatBDT(totalCustomerReceivable)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">বকেয়া কাস্টমার হিসাব</div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs text-slate-500">সাপ্লায়ারদের কাছে দেনা (দেবেন)</div>
                  <div className="mt-1 text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
                    {formatBDT(totalSupplierPayable)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">দোকান/মিলের বিল বাকি</div>
                </div>
              </div>
            );
          })()}

          {/* EXECUTIVE SECTION: 5 DIVISION MANAGERS REMUNERATION & DISBURSEMENT */}
          <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-transparent p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>বিভাগীয় বিজনেস ম্যানেজারদের পে-রোল ও পারিশ্রমিক (Division Managers Remuneration)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      জিএম ও অ্যাডমিন কর্তৃত্ব
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    জেনারেল ম্যানেজার (Super Manager) ও সুপার অ্যাডমিন সরাসরি ৫টি ব্যবসার ম্যানেজারদের মাসিক বেতন অনুমোদন ও ক্যাশ/ব্যাংক থেকে পরিশোধ করবেন।
                  </p>
                </div>
              </div>

              {(userRole === 'super_admin' || userRole === 'super_manager') && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    ✓ আপনি ম্যানেজার বেতন পরিশোধের পূর্ণ ক্ষমতাপ্রাপ্ত
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {fullBusinessList.map((biz) => {
                const mgrUser = erpUsers.find(
                  (u) =>
                    u.role === 'business_manager' &&
                    (u.assignedBusinesses === 'ALL' || u.assignedBusinesses?.includes(biz.id))
                );
                const mgrName = mgrUser?.displayName || biz.managerName || 'মোঃ রফিকুল ইসলাম';
                const mgrPhone = mgrUser?.phone || (biz as unknown as { managerPhone?: string }).managerPhone || '+880 1711-000000';
                const mgrSalary = mgrUser?.monthlySalary || 35000;

                const paidThisPeriod = monthlyPostedJournals
                  .filter(
                    (j) =>
                      j.transactionType === 'payroll' &&
                      (j.counterpartyName === mgrName || (mgrUser && j.counterpartyName === mgrUser.displayName))
                  )
                  .reduce((sum, j) => sum + j.amount, 0);

                const cycleInfo = getPayrollCycleInfo(
                  (mgrUser as unknown as { createdAt?: string })?.createdAt || '2026-01-01',
                  mgrSalary,
                  paidThisPeriod
                );

                const isTrk =
                  biz.templateType === 'transport' ||
                  biz.name?.toLowerCase().includes('transport') ||
                  biz.nameBn?.includes('ট্রাক');
                const icon =
                  biz.templateType === 'poultry'
                    ? '🐔'
                    : biz.templateType === 'cattle'
                    ? '🐄'
                    : biz.templateType === 'goat'
                    ? '🐐'
                    : biz.templateType === 'fish'
                    ? '🐟'
                    : '🚚';

                return (
                  <div
                    key={biz.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-2xs hover:border-emerald-400 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                          {icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {biz.nameBn || biz.name}
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span>{mgrName}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({isTrk ? 'লজিস্টিক প্রধান' : 'ইন-চার্জ'})</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{mgrPhone}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">মাসিক বেতন</div>
                        <div className="font-mono font-black text-slate-900 dark:text-white text-sm">
                          {formatBDT(mgrSalary)}
                        </div>
                      </div>
                    </div>

                    {/* Cycle Status Badge */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                      <div>
                        {paidThisPeriod >= cycleInfo.payableForCurrentMonth && cycleInfo.payableForCurrentMonth > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            ✓ {cycleInfo.currentMonthNameBn} পরিশোধিত ({formatBDT(paidThisPeriod)})
                          </span>
                        ) : paidThisPeriod > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            আংশিক প্রদত্ত (বাকি {formatBDT(cycleInfo.payableForCurrentMonth - paidThisPeriod)})
                          </span>
                        ) : cycleInfo.cycleStatus === 'due_for_payout' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                            🔔 বেতন প্রদানের সময় হয়েছে
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                            {cycleInfo.currentMonthNameBn} কার্যকাল চলমান
                          </span>
                        )}
                      </div>

                      {/* Pay / Slip Button */}
                      <div className="flex items-center gap-1.5">
                        {paidThisPeriod > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const latestPayroll = monthlyPostedJournals.find(
                                (j) =>
                                  j.transactionType === 'payroll' &&
                                  (j.counterpartyName === mgrName || (mgrUser && j.counterpartyName === mgrUser.displayName))
                              );
                              setActiveSlip({
                                type: 'salary_payslip',
                                slipNo: latestPayroll?.referenceNo || `MGR-SLIP-${Date.now().toString().slice(-4)}`,
                                date: latestPayroll?.date || new Date().toISOString().split('T')[0],
                                businessName: biz.nameBn || biz.name,
                                recipientName: mgrName,
                                designation: 'বিজনেস ম্যানেজার (Division In-Charge)',
                                amount: paidThisPeriod,
                                paymentMethod: latestPayroll?.creditAccountName || 'ক্যাশ / ব্যাংক একাউন্ট',
                                note: `ম্যানেজার বেতন পরিশোধ (${formatMonthFilterLabel(activeMonthFilter, true)})`,
                                recipientPhone: mgrPhone,
                                appointedBy: 'জেনারেল ম্যানেজার ও সুপার অ্যাডমিন',
                                enteredBy: actorEmail,
                              });
                            }}
                            className="p-1.5 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 text-xs font-semibold cursor-pointer"
                            title="ম্যানেজার পে-স্লিপ প্রিন্ট করুন"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {(userRole === 'super_admin' || userRole === 'super_manager') ? (
                          <button
                            type="button"
                            onClick={() => {
                              const defaultUser: ErpUser = mgrUser || {
                                id: `mgr-${biz.id}`,
                                uid: `uid-mgr-${biz.id}`,
                                email: `${biz.templateType}.mgr@regardsagro.bd`,
                                displayName: mgrName,
                                phone: mgrPhone,
                                role: 'business_manager',
                                status: 'active',
                                assignedBusinesses: biz.id,
                                monthlySalary: mgrSalary,
                                permissionsJson: '{}',
                                mfaEnabled: false,
                                lastLoginAt: new Date().toISOString(),
                                ownerId,
                              };
                              setMgrPayTarget(defaultUser);
                              setMgrPayAmount(Math.max(1, cycleInfo.payableForCurrentMonth - paidThisPeriod));
                              setMgrPayBonus(0);
                              setMgrPayDeduction(0);
                              setMgrPayWalletId(treasuryWallets[0]?.id || accounts[0]?.id || '');
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-xl text-white transition-all shadow-xs cursor-pointer ${
                              paidThisPeriod >= cycleInfo.payableForCurrentMonth
                                ? 'bg-slate-700 hover:bg-slate-800'
                                : cycleInfo.cycleStatus === 'due_for_payout'
                                ? 'bg-amber-600 hover:bg-amber-700 animate-pulse'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {paidThisPeriod >= cycleInfo.payableForCurrentMonth
                              ? 'বোনাস দিন'
                              : paidThisPeriod > 0
                              ? 'বাকি বেতন দিন'
                              : cycleInfo.cycleStatus === 'due_for_payout'
                              ? '🔔 ম্যানেজারকে বেতন দিন'
                              : 'বেতন পরিশোধ'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            জিএম / অ্যাডমিন অনুমোদিত
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VIEW MODE 1: 5 BUSINESS UNITS GROUPED DIRECTORY BOARD */}
          {stkViewMode === 'grouped' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-emerald-600" />
                    <span>৫টি ব্যবসায়ের আলাদা কর্মী বোর্ড (Business Unit HR Directory)</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    কোন ব্যবসায় কোন কোন কর্মী বা ড্রাইভার নিয়োজিত আছেন তার আলাদা কার্ড ও বেতন বিবরণী
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {fullBusinessList.map((biz) => {
                  const bStaff = stakeholders.filter(
                    (s) => s.businessId === biz.id && s.stakeholderType === 'employee'
                  );
                  const activeStaff = bStaff.filter((s) => s.status !== 'terminated');
                  const bSalaryBudget = activeStaff.reduce((sum, s) => sum + s.monthlySalaryOrCreditLimit, 0);
                  const mgrUser = erpUsers.find(
                    (u) =>
                      u.role === 'business_manager' &&
                      (u.assignedBusinesses === 'ALL' || u.assignedBusinesses?.includes(biz.id))
                  );
                  const isTrk =
                    biz.templateType === 'transport' ||
                    biz.name?.toLowerCase().includes('transport') ||
                    biz.nameBn?.includes('ট্রাক');
                  const icon =
                    biz.templateType === 'poultry'
                      ? '🐔'
                      : biz.templateType === 'cattle'
                      ? '🐄'
                      : biz.templateType === 'goat'
                      ? '🐐'
                      : biz.templateType === 'fish'
                      ? '🐟'
                      : '🚚';

                  return (
                    <div
                      key={biz.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Card Header */}
                        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{icon}</span>
                            <div>
                              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                {biz.nameBn || biz.name}
                              </h3>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Briefcase className="h-3 w-3 text-blue-500" />
                                <span>ম্যানেজার: <strong>{mgrUser ? mgrUser.displayName : 'নিয়োগ প্রক্রিয়াধীন'}</strong></span>
                              </div>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                            {activeStaff.length} জন কর্মী
                          </span>
                        </div>

                        {/* Salary Summary Pill */}
                        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                          <span className="text-slate-500">মাসিক বেতন বাজেট:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatBDT(bSalaryBudget)}
                          </span>
                        </div>

                        {/* Staff Members List */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            কর্মীদের তালিকা ({activeStaff.length} জন):
                          </div>

                          {activeStaff.length === 0 ? (
                            <div className="py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
                              <div className="text-2xl">{isTrk ? '🚚' : '👷'}</div>
                              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {isTrk
                                  ? 'এই পরিবহন ব্যবসায় এখনো কোনো ড্রাইভার বা হেলপার নেই।'
                                  : 'এই ইউনিটে এখনো কোনো কর্মী নিয়োগ দেওয়া হয়নি।'}
                              </div>
                              {isTrk && (
                                <button
                                  type="button"
                                  onClick={handleSeedTransportStaff}
                                  className="mt-1 px-3 py-1 text-[11px] font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 cursor-pointer shadow-xs"
                                >
                                  🚚 ১-ক্লিকে ড্রাইভার ও হেলপার যোগ করুন
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {activeStaff.map((stk) => {
                                const paidThisPeriod = monthlyPostedJournals
                                  .filter(
                                    (j) =>
                                      j.transactionType === 'payroll' &&
                                      j.counterpartyName === stk.name
                                  )
                                  .reduce((sum, j) => sum + j.amount, 0);

                                return (
                                  <div
                                    key={stk.id}
                                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 hover:border-slate-300 dark:hover:border-slate-700 space-y-2 text-xs"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                          <span>{stk.name}</span>
                                          <span className="font-mono text-[10px] text-slate-400">({stk.code})</span>
                                        </div>
                                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                          {stk.designationOrCategory}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          {stk.phone} · নিয়োগকারী: {stk.appointedBy || 'মালিক'}
                                        </div>
                                      </div>

                                      {(() => {
                                        const cycleInfo = getPayrollCycleInfo(
                                          stk.joiningDate || stk.salaryEffectiveFrom || stk.appointedAt,
                                          stk.monthlySalaryOrCreditLimit,
                                          paidThisPeriod
                                        );
                                        return (
                                          <div className="text-right">
                                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                                              {formatBDT(stk.monthlySalaryOrCreditLimit)}
                                            </div>
                                            <div className="mt-0.5">
                                              {paidThisPeriod >= cycleInfo.payableForCurrentMonth && cycleInfo.payableForCurrentMonth > 0 ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                  ✓ পরিশোধিত
                                                </span>
                                              ) : paidThisPeriod > 0 ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                  আংশিক
                                                </span>
                                              ) : cycleInfo.cycleStatus === 'due_for_payout' ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                                                  🔔 প্রদেয়
                                                </span>
                                              ) : (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                                  চলমান
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* Action Buttons for Card */}
                                    <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                                      {(() => {
                                        const cycleInfo = getPayrollCycleInfo(
                                          stk.joiningDate || stk.salaryEffectiveFrom || stk.appointedAt,
                                          stk.monthlySalaryOrCreditLimit,
                                          paidThisPeriod
                                        );
                                        return paidThisPeriod >= cycleInfo.payableForCurrentMonth && cycleInfo.payableForCurrentMonth > 0 ? (
                                          <button
                                            type="button"
                                            onClick={() => openStkPayModal(stk, 5000)}
                                            className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
                                          >
                                            বোনাস দিন
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openStkPayModal(
                                                stk,
                                                Math.max(1, cycleInfo.payableForCurrentMonth - paidThisPeriod)
                                              )
                                            }
                                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg text-white cursor-pointer shadow-2xs ${
                                              cycleInfo.cycleStatus === 'due_for_payout'
                                                ? 'bg-amber-600 hover:bg-amber-700 animate-pulse'
                                                : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                          >
                                            {paidThisPeriod > 0
                                              ? 'বাকি দিন'
                                              : cycleInfo.cycleStatus === 'due_for_payout'
                                              ? '🔔 বেতন দিন'
                                              : 'বেতন / অগ্রিম'}
                                          </button>
                                        );
                                      })()}

                                      {paidThisPeriod > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const latestPayroll = monthlyPostedJournals.find(
                                              (j) => j.transactionType === 'payroll' && j.counterpartyName === stk.name
                                            );
                                            setActiveSlip({
                                              type: 'salary_payslip',
                                              slipNo: latestPayroll?.referenceNo || `PAY-${stk.code}-${Date.now().toString().slice(-4)}`,
                                              date: latestPayroll?.date || new Date().toISOString().split('T')[0],
                                              businessName: stk.businessName,
                                              recipientName: stk.name,
                                              designation: stk.designationOrCategory,
                                              amount: paidThisPeriod,
                                              paymentMethod: latestPayroll?.creditAccountName || 'ক্যাশ / ব্যাংক একাউন্ট',
                                              note: `বেতন প্রদান (${formatMonthFilterLabel(activeMonthFilter, true)})`,
                                              recipientPhone: stk.phone,
                                              appointedBy: stk.appointedBy || 'মালিক কর্তৃক সরাসরি',
                                              enteredBy: actorEmail,
                                            });
                                          }}
                                          className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 cursor-pointer inline-flex items-center gap-1"
                                          title="পে-স্লিপ দেখুন"
                                        >
                                          <FileText className="h-3 w-3 text-sky-600" />
                                          <span>স্লিপ</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Button */}
                      <button
                        type="button"
                        onClick={() => openHireStaffModal(biz.id)}
                        className="mt-3 w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
                        <span>+ এই {isTrk ? 'ট্রাক ব্যবসায় ড্রাইভার/কর্মী' : 'ব্যবসায় কর্মী'} নিয়োগ দিন</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: TABLE VIEW */}
          {stkViewMode === 'table' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
              <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {stkBizFilter === 'ALL'
                      ? 'সকল কর্মী ও স্টেকহোল্ডারের তালিকা'
                      : `${fullBusinessList.find((b) => b.id === stkBizFilter)?.nameBn || 'নির্বাচিত ব্যবসা'}-এর কর্মী তালিকা`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    বেতন হিসাব, বকেয়া স্থিতি এবং নিয়োগকারী কর্তৃপক্ষের বিবরণ
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {stakeholders.filter((s) => (stkFilter === 'all' || s.stakeholderType === stkFilter) && (stkBizFilter === 'ALL' || s.businessId === stkBizFilter)).length} জন রেকর্ড
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/60 dark:bg-slate-800/40">
                      <th className="py-3 px-4">কোড ও ধরন</th>
                      <th className="py-3 px-4">নাম ও মোবাইল</th>
                      <th className="py-3 px-4">ব্যবসা ইউনিট</th>
                      <th className="py-3 px-4">পদবি / পরিচয়</th>
                      <th className="py-3 px-4">নিয়োগকারী কর্তৃপক্ষ (Appointed By)</th>
                      <th className="py-3 px-4 text-right">মাসিক বেতন / লিমিট</th>
                      <th className="py-3 px-4 text-right">হিসাবের অবস্থা</th>
                      <th className="py-3 px-4 text-right">অ্যাকশন ও ম্যানেজমেন্ট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(() => {
                      const displayList = stakeholders.filter(
                        (s) =>
                          (stkFilter === 'all' || s.stakeholderType === stkFilter) &&
                          (stkBizFilter === 'ALL' || s.businessId === stkBizFilter)
                      );

                      if (displayList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400 space-y-3">
                              <div className="text-3xl">👥</div>
                              <div className="font-semibold text-slate-600 dark:text-slate-400">
                                নির্বাচিত ফিল্টারে কোনো কর্মী বা রেকর্ড পাওয়া যায়নি।
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openHireStaffModal(stkBizFilter !== 'ALL' ? stkBizFilter : undefined)}
                                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                                >
                                  + নতুন কর্মী নিয়োগ দিন
                                </button>
                                {stkBizFilter !== 'ALL' && (
                                  <button
                                    type="button"
                                    onClick={() => setStkBizFilter('ALL')}
                                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                                  >
                                    সকল কর্মী দেখুন
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return displayList.map((s) => {
                        const paidThisPeriod =
                          s.stakeholderType === 'employee'
                            ? monthlyPostedJournals
                                .filter(
                                  (j) =>
                                    j.transactionType === 'payroll' &&
                                    j.counterpartyName === s.name
                                )
                                .reduce((sum, j) => sum + j.amount, 0)
                            : 0;

                        const canManageThisStaff =
                          userRole === 'super_admin' ||
                          userRole === 'super_manager' ||
                          (userRole === 'business_manager' &&
                            (assignedBusinessFilter === 'ALL' || assignedBusinessFilter === s.businessId));

                        return (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-3.5 px-4">
                              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                {s.code}
                              </div>
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.stakeholderType === 'employee'
                                    ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                                    : s.stakeholderType === 'customer'
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                }`}
                              >
                                {s.stakeholderType === 'employee'
                                  ? 'কর্মচারী (বেতন)'
                                  : s.stakeholderType === 'customer'
                                  ? 'ক্রেতা (পাবেন)'
                                  : 'সাপ্লায়ার (দেবেন)'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {s.name}
                              </div>
                              <div className="text-slate-500">
                                {s.phone} · {s.address}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-medium">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">
                                {s.businessName.includes('ট্রাক') || s.businessName.toLowerCase().includes('transport')
                                  ? '🚚 '
                                  : s.businessName.includes('পোল্ট্রি')
                                  ? '🐔 '
                                  : s.businessName.includes('গরু') || s.businessName.includes('পশু')
                                  ? '🐄 '
                                  : s.businessName.includes('ছাগল')
                                  ? '🐐 '
                                  : s.businessName.includes('মৎস্য')
                                  ? '🐟 '
                                  : '🏢 '}
                                {s.businessName}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {s.designationOrCategory}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {s.stakeholderType === 'employee' ? (
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                    <Briefcase className="h-3 w-3 text-blue-600" />
                                    <span>{s.appointedBy || 'মালিক কর্তৃক সরাসরি'}</span>
                                  </div>
                                  {s.status === 'terminated' && (
                                    <div>
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[10px] font-bold">
                                        <UserX className="h-3 w-3" />
                                        <span>বরখাস্ত / বাদ দেওয়া</span>
                                      </span>
                                      {s.notes && (
                                        <div className="text-[10px] text-red-500 italic truncate max-w-xs">{s.notes}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold">
                              <div className="text-[10px] text-slate-400">
                                {s.stakeholderType === 'employee' ? 'মাসিক বেতন' : 'ক্রেডিট লিমিট'}
                              </div>
                              <div className="text-sm font-bold">{formatBDT(s.monthlySalaryOrCreditLimit)}</div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                              {s.stakeholderType === 'employee' ? (
                                (() => {
                                  const cycleInfo = getPayrollCycleInfo(
                                    s.joiningDate || s.salaryEffectiveFrom || s.appointedAt,
                                    s.monthlySalaryOrCreditLimit,
                                    paidThisPeriod
                                  );

                                  if (s.status === 'terminated') {
                                    return (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-semibold">
                                        চাকরি শেষ
                                      </span>
                                    );
                                  }

                                  if (paidThisPeriod >= cycleInfo.payableForCurrentMonth && cycleInfo.payableForCurrentMonth > 0) {
                                    return (
                                      <div className="space-y-0.5">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                                          ✓ পরিশোধিত: {formatBDT(paidThisPeriod)}
                                        </span>
                                        <div className="text-[10px] text-slate-400">
                                          বকেয়া: ৳0 ({cycleInfo.currentMonthNameBn})
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (paidThisPeriod > 0) {
                                    return (
                                      <div className="space-y-0.5">
                                        <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                          প্রদত্ত: {formatBDT(paidThisPeriod)}
                                        </div>
                                        <div className="text-amber-600 dark:text-amber-400 font-bold">
                                          বাকি: {formatBDT(Math.max(0, cycleInfo.payableForCurrentMonth - paidThisPeriod))}
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (cycleInfo.cycleStatus === 'due_for_payout') {
                                    return (
                                      <div className="space-y-0.5">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[11px] animate-pulse">
                                          🔔 প্রদেয় বেতন: {formatBDT(cycleInfo.payableForCurrentMonth)}
                                        </span>
                                        {cycleInfo.isProrated && (
                                          <div className="text-[10px] text-amber-600">
                                            হাজিরা: {cycleInfo.daysWorkedInCurrentMonth} দিন (আনুপাতিক)
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold text-[11px]">
                                        {cycleInfo.isJoinedCurrentMonth
                                          ? `চলমান: ${cycleInfo.daysWorkedInCurrentMonth} দিন (আনুপাতিক ${formatBDT(cycleInfo.payableForCurrentMonth)})`
                                          : `মাসের কার্যকাল চলমান (${formatBDT(cycleInfo.payableForCurrentMonth)})`}
                                      </span>
                                      <div className="text-[10px] text-slate-400">
                                        মাস শেষে ৩ দিন পূর্বে প্রদেয় হবে
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : s.stakeholderType === 'customer' ? (
                                s.outstandingBalance > 0 ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                                    পাবেন: {formatBDT(s.outstandingBalance)}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    ✓ সব আদায় হয়েছে
                                  </span>
                                )
                              ) : s.outstandingBalance > 0 ? (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">
                                  দেবেন: {formatBDT(s.outstandingBalance)}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  ✓ সব পরিশোধিত
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                                {s.stakeholderType === 'employee' ? (
                                  <>
                                    {s.status !== 'terminated' &&
                                      (() => {
                                        const cycleInfo = getPayrollCycleInfo(
                                          s.joiningDate || s.salaryEffectiveFrom || s.appointedAt,
                                          s.monthlySalaryOrCreditLimit,
                                          paidThisPeriod
                                        );
                                        return paidThisPeriod >= cycleInfo.payableForCurrentMonth && cycleInfo.payableForCurrentMonth > 0 ? (
                                          <button
                                            type="button"
                                            onClick={() => openStkPayModal(s, 5000)}
                                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                                          >
                                            বোনাস দিন
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openStkPayModal(
                                                s,
                                                Math.max(1, cycleInfo.payableForCurrentMonth - paidThisPeriod)
                                              )
                                            }
                                            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap shadow-xs cursor-pointer ${
                                              cycleInfo.cycleStatus === 'due_for_payout'
                                                ? 'bg-amber-600 text-white hover:bg-amber-700 animate-pulse'
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                            }`}
                                          >
                                            {paidThisPeriod > 0
                                              ? 'বাকি বেতন দিন'
                                              : cycleInfo.cycleStatus === 'due_for_payout'
                                              ? '🔔 বেতন দিন'
                                              : 'অগ্রিম / বেতন দিন'}
                                          </button>
                                        );
                                      })()}

                                    {paidThisPeriod > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const latestPayroll = monthlyPostedJournals.find(
                                            (j) => j.transactionType === 'payroll' && j.counterpartyName === s.name
                                          );
                                          setActiveSlip({
                                            type: 'salary_payslip',
                                            slipNo: latestPayroll?.referenceNo || `PAY-${s.code}-${Date.now().toString().slice(-4)}`,
                                            date: latestPayroll?.date || new Date().toISOString().split('T')[0],
                                            businessName: s.businessName,
                                            recipientName: s.name,
                                            designation: s.designationOrCategory,
                                            amount: paidThisPeriod,
                                            paymentMethod: latestPayroll?.creditAccountName || 'ক্যাশ / ব্যাংক একাউন্ট',
                                            note: `বেতন প্রদান (${formatMonthFilterLabel(activeMonthFilter, true)})`,
                                            recipientPhone: s.phone,
                                            appointedBy: s.appointedBy || 'মালিক কর্তৃক সরাসরি',
                                            enteredBy: actorEmail,
                                          });
                                        }}
                                        className="px-2 py-1.5 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap text-xs font-semibold"
                                        title="বেতন পরিশোধ পে-স্লিপ প্রিন্ট করুন"
                                      >
                                        <FileText className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                                        <span>পে-স্লিপ</span>
                                      </button>
                                    )}

                                    {canManageThisStaff && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingStakeholder(s);
                                          setStkType(s.stakeholderType);
                                          setStkName(s.name);
                                          setStkPhone(s.phone);
                                          setStkAddress(s.address);
                                          setStkBizId(s.businessId);
                                          setStkRoleCat(s.designationOrCategory);
                                          setStkSalaryOrLimit(s.monthlySalaryOrCreditLimit);
                                          setStkBalance(s.outstandingBalance);
                                          setShowStkModal(true);
                                        }}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                                        title="তথ্য সংশোধন"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </button>
                                    )}

                                    {canManageThisStaff && s.status !== 'terminated' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTerminatingStakeholder(s);
                                          setTerminationReason('কাজে অবহেলা / খামারের প্রয়োজন সমাপ্তি');
                                        }}
                                        className="px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                        title="কর্মীকে খামার থেকে বাদ / বরখাস্ত করুন"
                                      >
                                        <UserX className="h-3.5 w-3.5" />
                                        <span>বাদ দিন</span>
                                      </button>
                                    )}
                                  </>
                                ) : s.stakeholderType === 'customer' ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openStkPayModal(s)}
                                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 whitespace-nowrap shadow-xs cursor-pointer"
                                    >
                                      বাকি আদায়
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveSlip({
                                          type: 'money_receipt',
                                          slipNo: `REC-${s.code}-${Date.now().toString().slice(-4)}`,
                                          date: new Date().toISOString().split('T')[0],
                                          businessName: s.businessName,
                                          recipientName: s.name,
                                          designation: 'পাইকারি ক্রেতা',
                                          amount: s.outstandingBalance,
                                          paymentMethod: 'বকেয়া হিসাব রসিদ',
                                          note: `গ্রাহকের বর্তমান বকেয়া স্থিতি: ${formatBDT(s.outstandingBalance)}`,
                                          recipientPhone: s.phone,
                                          enteredBy: actorEmail,
                                        });
                                      }}
                                      className="p-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                      title="গ্রাহক মানি রিসিট স্লিপ প্রিন্ট করুন"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-amber-600" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openStkPayModal(s)}
                                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 whitespace-nowrap shadow-xs cursor-pointer"
                                    >
                                      বাকি পরিশোধ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveSlip({
                                          type: 'money_receipt',
                                          slipNo: `SUP-${s.code}-${Date.now().toString().slice(-4)}`,
                                          date: new Date().toISOString().split('T')[0],
                                          businessName: s.businessName,
                                          recipientName: s.name,
                                          designation: 'সাপ্লায়ার / মিল',
                                          amount: s.outstandingBalance,
                                          paymentMethod: 'সাপ্লায়ার দেনা ভাউচার',
                                          note: `সাপ্লায়ারের বর্তমান বকেয়া দেনা: ${formatBDT(s.outstandingBalance)}`,
                                          recipientPhone: s.phone,
                                          enteredBy: actorEmail,
                                        });
                                      }}
                                      className="p-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                      title="সাপ্লায়ার ভাউচার স্লিপ প্রিন্ট করুন"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-rose-600" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ENTERPRISE P&L CARDS & ANALYTICS */}
      {activeSection === 'reports' && (() => {
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

        // Group expenses & revenue by category so owner sees EXACTLY which sector/category cost how much
        const expenseByCategoryMap: Record<string, { category: string; businessName: string; amount: number; count: number }> = {};
        const revenueByCategoryMap: Record<string, { category: string; businessName: string; amount: number; count: number }> = {};

        for (const j of periodJournals) {
          if (
            j.transactionType === 'expense' ||
            j.transactionType === 'purchase' ||
            j.transactionType === 'payroll'
          ) {
            const key = `${j.category}__${j.businessName}`;
            if (!expenseByCategoryMap[key]) {
              expenseByCategoryMap[key] = {
                category: j.category,
                businessName: j.businessName,
                amount: 0,
                count: 0,
              };
            }
            expenseByCategoryMap[key].amount += j.amount;
            expenseByCategoryMap[key].count += 1;
          } else if (j.transactionType === 'sale' || j.transactionType === 'income') {
            const key = `${j.category}__${j.businessName}`;
            if (!revenueByCategoryMap[key]) {
              revenueByCategoryMap[key] = {
                category: j.category,
                businessName: j.businessName,
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
          <div className="space-y-6">
            {/* Header & Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <FileBarChart className="h-5 w-5 text-emerald-600" />
                  <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    লাভ-ক্ষতি রিপোর্ট ও খাতভিত্তিক বিশ্লেষণ ({formatMonthFilterLabel(activeMonthFilter, true)})
                  </h1>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  কোন ব্যবসায় এবং কোন খাতে (খাবার, ওষুধ, ডিজেল, বেতন) কত টাকা খরচ ও লাভ হচ্ছে তা কার্ড আকারে দেখুন।
                </p>
              </div>
              <div className="flex items-center gap-2.5 no-print">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  CSV ডাউনলোড
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4" />
                  প্রিন্ট / PDF
                </button>
              </div>
            </div>

            {/* 1. HERO 4-CARD EXECUTIVE P&L SUMMARY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-slate-900 p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    সর্বমোট বিক্রি ও আয়
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatBDT(totalPeriodRev)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {revenueCategories.length}টি আয়ের খাত থেকে প্রাপ্ত
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/90 to-white dark:from-rose-950/30 dark:to-slate-900 p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    সর্বমোট খরচ ও বেতন
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-rose-600/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatBDT(totalPeriodExp)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  খামার খরচ: {formatBDT(totalPeriodOpExp)} · বেতন: {formatBDT(totalPeriodPayroll)}
                </div>
              </div>

              <div
                className={`rounded-2xl border p-5 shadow-2xs space-y-2 ${
                  totalPeriodNet >= 0
                    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
                    : 'border-rose-500/40 bg-gradient-to-br from-rose-600 to-red-700 text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/90">
                    {totalPeriodNet >= 0 ? 'সর্বমোট নিট লাভ (Net Profit)' : 'সর্বমোট নিট ক্ষতি (Net Loss)'}
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
                    <Coins className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold font-mono tabular-nums">
                  {formatBDT(totalPeriodNet)}
                </div>
                <div className="text-[11px] font-semibold text-white/90">
                  লাভের হার (Margin): {profitMarginPct}%
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/90 to-white dark:from-amber-950/30 dark:to-slate-900 p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    মোট বাকি পাওনা (Due)
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-amber-600/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-700 dark:text-amber-400">
                  {formatBDT(totalPeriodDue)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  ক্রেতাদের কাছে বকেয়া রয়েছে
                </div>
              </div>
            </div>

            {/* 2. BUSINESS-WISE P&L CARDS GRID */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  কোন ব্যবসায় কত আয়, খরচ ও লাভ/ক্ষতি (Business-Wise P&L Cards)
                </h2>
                <span className="text-xs font-mono text-slate-500">
                  {businesses.length}টি ব্যবসা
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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

                  // Top 3 expense categories inside this business
                  const bizExpCatsMap: Record<string, number> = {};
                  for (const j of bEntries) {
                    if (
                      j.transactionType === 'expense' ||
                      j.transactionType === 'purchase' ||
                      j.transactionType === 'payroll'
                    ) {
                      bizExpCatsMap[j.category] = (bizExpCatsMap[j.category] || 0) + j.amount;
                    }
                  }
                  const topBizExpenses = Object.entries(bizExpCatsMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);

                  return (
                    <div
                      key={biz.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:z-30 shadow-2xs flex flex-col justify-between relative"
                    >
                      <div
                        className={`h-1.5 w-full rounded-t-2xl ${
                          net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <div className="p-5 space-y-4">
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-mono font-bold text-slate-400">
                              {biz.code} · {biz.location}
                            </div>
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                              {biz.nameBn || biz.name}
                            </h3>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                              net > 0
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : net < 0
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {net >= 0 ? `লাভ ${margin}%` : `ক্ষতি ${margin}%`}
                          </span>
                        </div>

                        {/* 3-Column Income / Expense / Net Profit */}
                        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs">
                          <div>
                            <div className="text-[10px] text-slate-500">আয় / বিক্রি</div>
                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {formatBDT(rev)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500">মোট খরচ</div>
                            <div className="font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                              {formatBDT(exp)}
                            </div>
                          </div>
                          <div className="group/profit relative text-right cursor-help p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  net >= 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                                }`}
                              />
                              <span>{net >= 0 ? 'নিট লাভ' : 'নিট ক্ষতি'}</span>
                            </div>
                            <div
                              className={`font-mono font-extrabold mt-0.5 ${
                                net >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {formatBDT(net)}
                            </div>

                            {/* Floating Hover Card above Net Profit */}
                            <div className="absolute bottom-full right-0 mb-2 w-64 opacity-0 invisible group-hover/profit:opacity-100 group-hover/profit:visible transition-all duration-200 transform translate-y-1 group-hover/profit:translate-y-0 pointer-events-none z-50">
                              <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white rounded-xl p-3 shadow-2xl border border-emerald-500/30 text-left space-y-2">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                  <span className="text-xs font-bold text-slate-100 truncate">
                                    {biz.nameBn || biz.name}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                      net >= 0
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-rose-500/20 text-rose-300'
                                    }`}
                                  >
                                    মার্জিন: {margin}%
                                  </span>
                                </div>
                                <div className="text-center py-0.5">
                                  <div className="text-[10px] text-slate-400">প্রকৃত লাভ/ক্ষতি</div>
                                  <div
                                    className={`text-lg font-black font-mono ${
                                      net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {formatBDT(net)}
                                  </div>
                                </div>
                                <div className="bg-slate-950/80 rounded-lg p-2 space-y-1 text-[11px] font-mono">
                                  <div className="flex justify-between text-slate-300">
                                    <span>বিক্রি/আয়:</span>
                                    <span className="text-emerald-400 font-bold">+{formatBDT(rev)}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>মোট খরচ:</span>
                                    <span className="text-amber-300 font-bold">-{formatBDT(exp)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-slate-900 dark:border-t-slate-950 ml-auto mr-4 -mt-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Expense-to-Revenue Visual Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>আয়ের তুলনায় খরচ ({expRatioPct}%)</span>
                            {due > 0 && (
                              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                                বাকি: {formatBDT(due)}
                              </span>
                            )}
                          </div>
                          <div className="h-2 w-full rounded-full bg-emerald-100 dark:bg-slate-800 overflow-hidden">
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

                        {/* Top Expense Categories Inside This Business */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            এই ব্যবসার খরচের খাতসমূহ:
                          </div>
                          {topBizExpenses.length === 0 ? (
                            <div className="text-[11px] text-slate-400">এই সময়ে কোনো খরচ নেই</div>
                          ) : (
                            <div className="space-y-1">
                              {topBizExpenses.map(([cat, amt]) => (
                                <div
                                  key={cat}
                                  className="flex items-center justify-between text-[11px]"
                                >
                                  <span className="text-slate-700 dark:text-slate-300 truncate pr-2">
                                    • {cat}
                                  </span>
                                  <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                                    {formatBDT(amt)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. CATEGORY-WISE EXPENSE & REVENUE BREAKDOWN CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense Breakdown by Category */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                      <PieChart className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        কোন খাতে কত টাকা খরচ হয়েছে (Expense by Sector)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        খাবার, ওষুধ, ডিজেল, মেরামত ও বেতন খাতের হিসাব
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-600">
                    {formatBDT(totalPeriodExp)}
                  </span>
                </div>

                {expenseCategories.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    নির্বাচিত সময়ে কোনো খরচের এন্ট্রি নেই
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expenseCategories.map((item) => {
                      const pct =
                        totalPeriodExp > 0
                          ? Math.round((item.amount / totalPeriodExp) * 100)
                          : 0;
                      return (
                        <div
                          key={`${item.category}-${item.businessName}`}
                          className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                {item.category}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {item.businessName} · {item.count}টি লেনদেন
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono font-extrabold text-rose-600 dark:text-rose-400">
                                {formatBDT(item.amount)}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                মোট খরচের {pct}%
                              </div>
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-rose-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Revenue Breakdown by Category */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        কোন খাত থেকে কত টাকা আয় হয়েছে (Revenue by Sector)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        মুরগি, দুধ, গরু-ছাগল, মাছ ও ট্রাক ভাড়া আয়ের হিসাব
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-600">
                    {formatBDT(totalPeriodRev)}
                  </span>
                </div>

                {revenueCategories.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    নির্বাচিত সময়ে কোনো আয়ের এন্ট্রি নেই
                  </div>
                ) : (
                  <div className="space-y-3">
                    {revenueCategories.map((item) => {
                      const pct =
                        totalPeriodRev > 0
                          ? Math.round((item.amount / totalPeriodRev) * 100)
                          : 0;
                      return (
                        <div
                          key={`${item.category}-${item.businessName}`}
                          className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                {item.category}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {item.businessName} · {item.count}টি লেনদেন
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                                {formatBDT(item.amount)}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                মোট আয়ের {pct}%
                              </div>
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 4. 12-Month Breakdown Table (Jan to Dec) */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
              <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    ১২ মাসের মাসিক আয়-ব্যয় ও লাভ-ক্ষতি তুলনা ({activeMonthFilter.year === 'ALL' ? '2026' : activeMonthFilter.year})
                  </h2>
                  <p className="text-xs text-slate-500">
                    যেকোনো মাসে ক্লিক করলে পুরো রিপোর্ট ওই মাসের হিসাবে আপডেট হবে
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/60 dark:bg-slate-800/40">
                      <th className="py-3 px-4">মাস (Month)</th>
                      <th className="py-3 px-4 text-right">বিক্রি ও আয়</th>
                      <th className="py-3 px-4 text-right">খামার/ব্যবসা খরচ</th>
                      <th className="py-3 px-4 text-right">বেতন (Payroll)</th>
                      <th className="py-3 px-4 text-right">বাকি (Due)</th>
                      <th className="py-3 px-4 text-right">নিট লাভ / ক্ষতি</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
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
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {m.fullBn} ({m.shortEn} {targetYear})
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                            {formatBDT(rev)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            {formatBDT(opExp)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            {formatBDT(payExp)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-600">
                            {formatBDT(due)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
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
                  <span>৫টি খামার ও ব্যবসার আলাদা লাভ-ক্ষতি ও দায়িত্বরত ম্যানেজার</span>
                  <span className="text-[11px] text-slate-500 font-normal">রিয়েলটাইম অডিট ট্রেইল অনুযায়ী</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">ব্যবসায়িক ইউনিট</th>
                        <th className="py-2.5 px-3">দায়িত্বপ্রাপ্ত বিজনেস ম্যানেজার</th>
                        <th className="py-2.5 px-3 text-right">আয় / বিক্রি</th>
                        <th className="py-2.5 px-3 text-right">ব্যয় ও বেতন</th>
                        <th className="py-2.5 px-3 text-right">নীট লাভ / ক্ষতি</th>
                        <th className="py-2.5 px-3 text-center">কর্মী সংখ্যা</th>
                        <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
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
                              {biz.nameBn || biz.name}
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
                      <span className="text-slate-500">নিয়োগকারী কর্তৃপক্ষ:</span>{' '}
                      <span className="font-semibold">{activeSlip.appointedBy}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-right sm:text-left">
                  <div>
                    <span className="text-slate-500">
                      {activeSlip.type === 'salary_payslip'
                        ? 'কর্মচারীর নাম:'
                        : activeSlip.type === 'goods_purchase_slip'
                        ? 'গোডাউন / রিসিভার:'
                        : 'প্রাপক / প্রদানকারী:'}
                    </span>{' '}
                    <span className="font-bold text-slate-950 dark:text-white">{activeSlip.recipientName}</span>
                  </div>
                  {(activeSlip.designation || activeSlip.recipientDesignation) && (
                    <div>
                      <span className="text-slate-500">পদবি / বিবরণ:</span>{' '}
                      <span className="font-medium">{activeSlip.designation || activeSlip.recipientDesignation}</span>
                    </div>
                  )}
                  {activeSlip.recipientPhone && (
                    <div>
                      <span className="text-slate-500">মোবাইল:</span>{' '}
                      <span className="font-mono">{activeSlip.recipientPhone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{activeSlip.paymentMethod}</span>
                  </div>
                  {activeSlip.supplierMemoNo && (
                    <div className="text-rose-700 dark:text-rose-400 font-bold">
                      <span>মিলের মূল মেমো নং:</span>{' '}
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
                      <th className="py-2.5 px-4">বিবরণ / আইটেম</th>
                      {activeSlip.type === 'goods_purchase_slip' ? (
                        <>
                          <th className="py-2.5 px-4 text-center">পরিমাণ</th>
                          <th className="py-2.5 px-4 text-right">দর (প্রতি একক)</th>
                        </>
                      ) : (
                        <th className="py-2.5 px-4">খাত / নোট</th>
                      )}
                      <th className="py-2.5 px-4 text-right">মোট টাকা (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="py-3 px-4 font-semibold">
                        {activeSlip.itemName || activeSlip.note || 'সাধারণ লেনদেন'}
                        {activeSlip.supplierName && (
                          <div className="text-[11px] text-slate-500 font-normal">
                            সাপ্লায়ার / ডিলার: {activeSlip.supplierName}
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
                        সর্বমোট পরিশোধিত / গৃহীত অর্থ:
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
                  <span className="text-slate-500">কথায়:</span>{' '}
                  <span className="italic font-bold">{formatBDT(activeSlip.amount)} মাত্র</span>
                </div>
                {activeSlip.enteredBy && (
                  <div className="text-[11px] text-slate-500">
                    সিস্টেম অডিট এন্ট্রি প্রদানকারী: <span className="font-mono">{activeSlip.enteredBy}</span>
                  </div>
                )}
              </div>

              {/* Anti-Theft / Fraud Warning Note */}
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <span>চুরি ও জালিয়াতি প্রতিরোধ নীতি (Anti-Theft Compliance & Counter-Sign Rule):</span>
                </div>
                <p className="leading-relaxed">
                  ১. এই অনুমোদিত স্লিপ ছাড়া কোনো নগদ অর্থ লেনদেন বা গোডাউনে মাল খালাস বৈধ বলে গণ্য হবে না।
                  ২. গোডাউনে পণ্য ইনওয়ার্ডের ক্ষেত্রে সাপ্লায়ার বা মিলের মূল ক্যাশ মেমো এই স্লিপের সাথে গেঁথে সংরক্ষণ করতে হবে।
                  ৩. গ্রহীতা এবং ম্যানেজার উভয়ের শারীরিক স্বাক্ষর ব্যতিরেকে হিসাব নথিতে চূড়ান্ত হিসেবে গৃহীত হবে না।
                </p>
              </div>

              {/* 3 Physical Signature Blocks */}
              <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="space-y-1 border-t border-slate-400 pt-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {activeSlip.type === 'salary_payslip'
                      ? 'বেতন গ্রহণকারী কর্মীর স্বাক্ষর'
                      : activeSlip.type === 'goods_purchase_slip'
                      ? 'পণ্য গ্রহণকারী গোডাউন রক্ষক'
                      : 'অর্থ প্রদানকারী / গ্রহণকারী'}
                  </div>
                  <div className="text-[10px] text-slate-400">স্বাক্ষর ও তারিখ</div>
                </div>

                <div className="space-y-1 border-t border-slate-400 pt-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    শাখা ম্যানেজার / হিসাবরক্ষক
                  </div>
                  <div className="text-[10px] text-slate-400">প্রতিস্বাক্ষর ও যাচাই</div>
                </div>

                <div className="space-y-1 border-t border-slate-400 pt-2">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">
                    মালিক / প্রধান ম্যানেজারের অনুমোদন
                  </div>
                  <div className="text-[10px] text-slate-400">অনুমোদনের সিল ও স্বাক্ষর</div>
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
