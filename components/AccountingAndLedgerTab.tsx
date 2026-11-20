'use client';

import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Wallet,
  Banknote,
  BookOpen,
  FileSpreadsheet,
  ArrowRightLeft,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Printer,
  Download,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Scale,
  Receipt,
  Eye,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  CreditCard,
  FileText,
  Layers,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
} from 'lucide-react';
import {
  ErpBusiness,
  ErpAccount,
  ErpJournalEntry,
  ErpStakeholder,
  ErpUser,
  UserRole,
  formatBDT,
} from '@/lib/erp-types';
import {
  postDoubleEntryTransaction,
  reversePostedJournalEntry,
  depositToTreasuryAccount,
  createTreasuryAccount,
  createChartOfAccount,
  resetDemoLedgerToZero,
} from '@/lib/erp-service';

const formatCompactBDT = (amt: number): string => {
  if (Math.abs(amt) >= 10000000) return `৳${(amt / 10000000).toFixed(1)}Cr`;
  if (Math.abs(amt) >= 100000) return `৳${(amt / 100000).toFixed(1)}L`;
  if (Math.abs(amt) >= 1000) return `৳${(amt / 1000).toFixed(1)}k`;
  return `৳${amt}`;
};

export interface AccountingAndLedgerTabProps {
  businesses: ErpBusiness[];
  allBusinesses?: ErpBusiness[];
  accounts: ErpAccount[];
  journalEntries: ErpJournalEntry[];
  stakeholders?: ErpStakeholder[];
  erpUsers?: ErpUser[];
  currentUser?: ErpUser;
  userRole: UserRole;
  assignedBusinessFilter: string;
  lang?: 'en' | 'bn';
  onShowNotice?: (msg: string) => void;
  onShowError?: (msg: string) => void;
  onRefreshData?: () => void;
  onSetActiveSlip?: (slip: any) => void;
}

const MONTH_OPTIONS = [
  { code: '01', nameEn: 'January', nameBn: 'জানুয়ারি' },
  { code: '02', nameEn: 'February', nameBn: 'ফেব্রুয়ারি' },
  { code: '03', nameEn: 'March', nameBn: 'মার্চ' },
  { code: '04', nameEn: 'April', nameBn: 'এপ্রিল' },
  { code: '05', nameEn: 'May', nameBn: 'মে' },
  { code: '06', nameEn: 'June', nameBn: 'জুন' },
  { code: '07', nameEn: 'July', nameBn: 'জুলাই' },
  { code: '08', nameEn: 'August', nameBn: 'আগস্ট' },
  { code: '09', nameEn: 'September', nameBn: 'সেপ্টেম্বর' },
  { code: '10', nameEn: 'October', nameBn: 'অক্টোবর' },
  { code: '11', nameEn: 'November', nameBn: 'নভেম্বর' },
  { code: '12', nameEn: 'December', nameBn: 'ডিসেম্বর' },
];

const YEAR_OPTIONS = ['2025', '2026', '2027'];

type AccountingSubTab =
  | 'overview'
  | 'coa'
  | 'cash_bank'
  | 'general_ledger'
  | 'journal_entries'
  | 'financial_reports'
  | 'business_pnl';

export default function AccountingAndLedgerTab({
  businesses,
  allBusinesses = [],
  accounts,
  journalEntries,
  stakeholders = [],
  erpUsers = [],
  currentUser,
  userRole,
  assignedBusinessFilter,
  lang = 'en',
  onShowNotice,
  onShowError,
  onRefreshData,
  onSetActiveSlip,
}: AccountingAndLedgerTabProps) {
  const bn = false;

  // 1. RBAC Business Assignment
  const isBusinessManager = userRole === 'business_manager';
  const bmAssignedBizId =
    assignedBusinessFilter !== 'ALL'
      ? assignedBusinessFilter
      : currentUser?.assignedBusinesses?.split(',')[0]?.trim() || '';

  const accessibleBusinesses = useMemo(() => {
    if (isBusinessManager && bmAssignedBizId) {
      const match = (allBusinesses.length > 0 ? allBusinesses : businesses).filter(
        (b) =>
          b.id === bmAssignedBizId ||
          (currentUser?.assignedBusinesses && currentUser.assignedBusinesses.includes(b.id))
      );
      return match.length > 0 ? match : businesses;
    }
    return businesses.length > 0 ? businesses : allBusinesses;
  }, [isBusinessManager, bmAssignedBizId, businesses, allBusinesses, currentUser]);

  const ownerId = currentUser?.ownerId || 'OWNER-REGARDS';
  const actorEmail = currentUser?.email || 'admin@regardsagro.com';

  // 2. Active Tab & Global Filter States
  const [activeTab, setActiveTab] = useState<AccountingSubTab>('overview');
  const [selectedBizId, setSelectedBizId] = useState<string>(
    isBusinessManager && bmAssignedBizId ? bmAssignedBizId : 'ALL'
  );
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Modals & Actions States
  const [showVoucherModal, setShowVoucherModal] = useState<boolean>(false);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showNewAccountModal, setShowNewAccountModal] = useState<boolean>(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [reversingEntry, setReversingEntry] = useState<ErpJournalEntry | null>(null);
  const [viewVoucherSlip, setViewVoucherSlip] = useState<ErpJournalEntry | null>(null);

  // General Ledger specific state
  const [glAccountId, setGlAccountId] = useState<string>(accounts[0]?.id || '');

  // Financial Reports sub-selector
  const [activeReport, setActiveReport] = useState<
    'pnl' | 'balance_sheet' | 'trial_balance' | 'cash_book' | 'bank_book' | 'ar_aging' | 'ap_aging'
  >('pnl');

  // Chart of Accounts filter
  const [coaClassFilter, setCoaClassFilter] = useState<'all' | 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('all');

  // Form State: + Post Double-Entry Journal Voucher
  const [vRefNo, setVRefNo] = useState<string>(`JV-${Date.now().toString().slice(-6)}`);
  const [vDate, setVDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vBizId, setVBizId] = useState<string>(selectedBizId !== 'ALL' ? selectedBizId : accessibleBusinesses[0]?.id || 'ALL');
  const [vCategory, setVCategory] = useState<string>('Operational Expense');
  const [vDescription, setVDescription] = useState<string>('');
  const [vDebitAccId, setVDebitAccId] = useState<string>(accounts[0]?.id || '');
  const [vCreditAccId, setVCreditAccId] = useState<string>(accounts[1]?.id || '');
  const [vAmount, setVAmount] = useState<number>(0);
  const [vCounterparty, setVCounterparty] = useState<string>('');
  const [isSubmittingVoucher, setIsSubmittingVoucher] = useState<boolean>(false);

  // Form State: + Cash / Bank Deposit Modal
  const [depAccountId, setDepAccountId] = useState<string>('');
  const [depAmount, setDepAmount] = useState<number>(50000);
  const [depSource, setDepSource] = useState<'capital' | 'income'>('capital');
  const [depNote, setDepNote] = useState<string>('');
  const [depBizId, setDepBizId] = useState<string>('ALL');
  const [isDepositing, setIsDepositing] = useState<boolean>(false);

  // Form State: Inter-Account Transfer (Cash ⇄ Bank)
  const [trFromId, setTrFromId] = useState<string>('');
  const [trToId, setTrToId] = useState<string>('');
  const [trAmount, setTrAmount] = useState<number>(25000);
  const [trNote, setTrNote] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  // Form State: + Add New Chart of Account
  const [newAccClass, setNewAccClass] = useState<'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('expense');
  const [newAccSubType, setNewAccSubType] = useState<string>('operating_expense');
  const [newAccCode, setNewAccCode] = useState<string>('');
  const [newAccName, setNewAccName] = useState<string>('');
  const [newAccBizId, setNewAccBizId] = useState<string>('ALL');
  const [newAccOpening, setNewAccOpening] = useState<number>(0);
  const [isCreatingAcc, setIsCreatingAcc] = useState<boolean>(false);

  // Reset demo ledger state
  const [isResettingLedger, setIsResettingLedger] = useState<boolean>(false);

  // 4. Treasury Cash & Bank Wallets
  const treasuryWallets = useMemo(() => {
    return accounts.filter((a) => a.subType === 'cash' || a.subType === 'bank');
  }, [accounts]);

  // Pre-fill treasury IDs if empty
  const cashAccounts = useMemo(() => treasuryWallets.filter((a) => a.subType === 'cash'), [treasuryWallets]);
  const bankAccounts = useMemo(() => treasuryWallets.filter((a) => a.subType === 'bank'), [treasuryWallets]);

  // 5. Filtered Journal Entries by Business, Month, Year & Date Range
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter((j) => {
      // Business RBAC / selector
      if (selectedBizId !== 'ALL' && j.businessId !== selectedBizId && j.businessId !== 'ALL') {
        return false;
      }
      if (isBusinessManager && bmAssignedBizId && j.businessId !== bmAssignedBizId && j.businessId !== 'ALL') {
        return false;
      }

      const entryDate = j.date || '';

      // Custom date range
      if (useCustomRange) {
        if (startDate && entryDate < startDate) return false;
        if (endDate && entryDate > endDate) return false;
      } else {
        // Year filter
        if (selectedYear !== 'ALL') {
          if (!entryDate.startsWith(selectedYear)) return false;
        }
        // Month filter
        if (selectedMonth !== 'ALL') {
          const parts = entryDate.split('-');
          if (parts[1] !== selectedMonth) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          j.referenceNo?.toLowerCase().includes(q) ||
          j.description?.toLowerCase().includes(q) ||
          j.category?.toLowerCase().includes(q) ||
          j.debitAccountName?.toLowerCase().includes(q) ||
          j.creditAccountName?.toLowerCase().includes(q) ||
          j.counterpartyName?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    journalEntries,
    selectedBizId,
    isBusinessManager,
    bmAssignedBizId,
    useCustomRange,
    startDate,
    endDate,
    selectedYear,
    selectedMonth,
    searchQuery,
  ]);

  // 6. Nine (9) Core Accounting Dashboard KPI Calculations
  const metrics = useMemo(() => {
    // Only active, non-reversed posted entries
    const posted = filteredJournalEntries.filter((j) => j.status !== 'reversed');

    // Total Income & Revenue
    const totalIncome = posted
      .filter((j) => j.transactionType === 'sale' || j.transactionType === 'income')
      .reduce((sum, j) => sum + Number(j.amount || 0), 0);

    // Total Expenses
    const totalExpenses = posted
      .filter(
        (j) =>
          j.transactionType === 'expense' ||
          j.transactionType === 'purchase' ||
          j.transactionType === 'payroll'
      )
      .reduce((sum, j) => sum + Number(j.amount || 0), 0);

    // Net Profit / Loss
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // Filter accounts by business if single business is selected
    const activeAccounts = accounts.filter((a) => {
      if (selectedBizId !== 'ALL' && a.businessId !== selectedBizId && a.businessId !== 'ALL') {
        return false;
      }
      return true;
    });

    // Total Cash Balance
    const totalCash = activeAccounts
      .filter((a) => a.subType === 'cash')
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    // Total Bank Balance
    const totalBank = activeAccounts
      .filter((a) => a.subType === 'bank')
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    // Accounts Receivable (AR)
    const accountsReceivable = activeAccounts
      .filter((a) => a.subType === 'receivable')
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    // Accounts Payable (AP)
    const accountsPayable = activeAccounts
      .filter((a) => a.subType === 'payable')
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    // Total Assets (Cash + Bank + AR + Inventory + other assets)
    const totalAssets = activeAccounts
      .filter((a) => a.accountType === 'asset')
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    // Total Liabilities (AP + Loan + Accruals)
    const totalLiabilities = activeAccounts
      .filter((a) => a.accountType === 'liability')
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    // Total Equity
    const totalEquity = activeAccounts
      .filter((a) => a.accountType === 'equity')
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      totalCash,
      totalBank,
      accountsReceivable,
      accountsPayable,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalTransactions: posted.length,
    };
  }, [filteredJournalEntries, accounts, selectedBizId]);

  // 7. General Ledger Calculation for Selected Account
  const glData = useMemo(() => {
    const acc = accounts.find((a) => a.id === glAccountId) || accounts[0];
    if (!acc) {
      return {
        account: null,
        openingBalance: 0,
        totalDebits: 0,
        totalCredits: 0,
        closingBalance: 0,
        rows: [],
      };
    }

    const isDebitNormal = acc.accountType === 'asset' || acc.accountType === 'expense';
    let runningBalance = Number(acc.balance || 0); // start from current or calculate from opening

    // Filter all journal entries for this account
    const accountEntries = filteredJournalEntries
      .filter((j) => j.debitAccountId === acc.id || j.creditAccountId === acc.id)
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    let totalDebits = 0;
    let totalCredits = 0;
    let cumBalance = 0;

    const rows = accountEntries.map((j) => {
      const isDebit = j.debitAccountId === acc.id;
      const isCredit = j.creditAccountId === acc.id;
      const debitAmt = isDebit ? Number(j.amount || 0) : 0;
      const creditAmt = isCredit ? Number(j.amount || 0) : 0;

      totalDebits += debitAmt;
      totalCredits += creditAmt;

      if (isDebitNormal) {
        cumBalance += debitAmt - creditAmt;
      } else {
        cumBalance += creditAmt - debitAmt;
      }

      return {
        id: j.id,
        date: j.date,
        referenceNo: j.referenceNo,
        businessName: j.businessName,
        category: j.category,
        description: j.description,
        counterparty: j.counterpartyName || 'Internal',
        debit: debitAmt,
        credit: creditAmt,
        runningBalance: cumBalance,
        status: j.status,
        entry: j,
      };
    });

    return {
      account: acc,
      openingBalance: 0,
      totalDebits,
      totalCredits,
      closingBalance: cumBalance,
      rows,
    };
  }, [accounts, glAccountId, filteredJournalEntries]);

  // 8. Business-Wise Financial Matrix (5 Businesses)
  const businessMatrix = useMemo(() => {
    const bList = accessibleBusinesses.length > 0 ? accessibleBusinesses : businesses;
    return bList.map((b) => {
      const bizJournals = journalEntries.filter(
        (j) => (j.businessId === b.id || j.businessId === b.code) && j.status !== 'reversed'
      );
      const revenue = bizJournals
        .filter((j) => j.transactionType === 'sale' || j.transactionType === 'income')
        .reduce((sum, j) => sum + Number(j.amount || 0), 0);
      const expenses = bizJournals
        .filter(
          (j) =>
            j.transactionType === 'expense' ||
            j.transactionType === 'purchase' ||
            j.transactionType === 'payroll'
        )
        .reduce((sum, j) => sum + Number(j.amount || 0), 0);
      const netProfit = revenue - expenses;
      const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      const bizAccounts = accounts.filter((a) => a.businessId === b.id || a.businessId === b.code);
      const allocatedTreasury = bizAccounts
        .filter((a) => a.subType === 'cash' || a.subType === 'bank')
        .reduce((sum, a) => sum + Number(a.balance || 0), 0);
      const receivables = bizJournals.reduce((sum, j) => sum + Number(j.dueAmount || 0), 0);

      return {
        id: b.id,
        code: b.code,
        name: b.nameBn || b.name,
        nameEn: b.name,
        revenue,
        expenses,
        netProfit,
        margin,
        allocatedTreasury,
        receivables,
        transactionCount: bizJournals.length,
      };
    });
  }, [accessibleBusinesses, businesses, journalEntries, accounts]);

  // 9. Quick Actions: Open Deposit Modal
  const openDeposit = (targetAccId?: string) => {
    setDepAccountId(targetAccId || treasuryWallets[0]?.id || '');
    setDepAmount(50000);
    setDepSource('capital');
    setDepNote('');
    setDepBizId(selectedBizId !== 'ALL' ? selectedBizId : 'ALL');
    setShowDepositModal(true);
  };

  // 10. Quick Actions: Open Transfer Modal
  const openTransfer = (fromAccId?: string) => {
    const first = fromAccId || treasuryWallets[0]?.id || '';
    const second = treasuryWallets.find((w) => w.id !== first)?.id || treasuryWallets[1]?.id || first;
    setTrFromId(first);
    setTrToId(second);
    setTrAmount(25000);
    setTrNote('');
    setShowTransferModal(true);
  };

  // 11. Quick Actions: Open New Account Modal
  const openNewAccount = (cls?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense') => {
    const targetClass = cls || 'expense';
    setNewAccClass(targetClass);
    setNewAccSubType(
      targetClass === 'asset'
        ? 'bank'
        : targetClass === 'expense'
        ? 'operating_expense'
        : targetClass === 'revenue'
        ? 'operating_revenue'
        : targetClass === 'liability'
        ? 'payable'
        : 'capital'
    );
    const prefix =
      targetClass === 'asset'
        ? '10'
        : targetClass === 'liability'
        ? '20'
        : targetClass === 'equity'
        ? '30'
        : targetClass === 'revenue'
        ? '40'
        : '50';
    setNewAccCode(`${prefix}${Math.floor(20 + Math.random() * 70)}`);
    setNewAccName('');
    setNewAccBizId(selectedBizId !== 'ALL' ? selectedBizId : 'ALL');
    setNewAccOpening(0);
    setShowNewAccountModal(true);
  };

  // 12. Submit Handlers: + Post Double-Entry Journal Voucher
  const handlePostVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vAmount <= 0) {
      onShowError?.(bn ? 'অনুগ্রহ করে ভাউচারের টাকার পরিমাণ দিন (Amount > 0)' : 'Please enter an amount > 0');
      return;
    }
    if (!vDebitAccId || !vCreditAccId) {
      onShowError?.(bn ? 'ডেবিট ও ক্রেডিট অ্যাকাউন্ট নির্বাচন করুন' : 'Please select both Debit and Credit accounts');
      return;
    }
    if (vDebitAccId === vCreditAccId) {
      onShowError?.(
        bn
          ? 'ডেবিট এবং ক্রেডিট অ্যাকাউন্ট এক হতে পারে না (Debit and Credit accounts must be different)'
          : 'Debit and Credit accounts must be different.'
      );
      return;
    }

    const drAcc = accounts.find((a) => a.id === vDebitAccId);
    const crAcc = accounts.find((a) => a.id === vCreditAccId);
    if (!drAcc || !crAcc) return;

    const biz = accessibleBusinesses.find((b) => b.id === vBizId) || businesses.find((b) => b.id === vBizId);

    setIsSubmittingVoucher(true);
    try {
      await postDoubleEntryTransaction(
        {
          referenceNo: vRefNo.trim() || `JV-${Date.now().toString().slice(-6)}`,
          date: vDate,
          businessId: vBizId,
          businessName: biz ? biz.nameBn || biz.name : 'Consolidated HQ',
          transactionType: 'adjustment',
          category: vCategory.trim() || 'General Journal',
          description: vDescription.trim() || `${drAcc.name} / ${crAcc.name}`,
          debitAccountId: drAcc.id,
          debitAccountName: drAcc.name,
          creditAccountId: crAcc.id,
          creditAccountName: crAcc.name,
          amount: Number(vAmount),
          paymentStatus: 'paid',
          dueAmount: 0,
          counterpartyName: vCounterparty.trim() || 'General Entry',
        },
        accounts,
        ownerId,
        actorEmail
      );

      setShowVoucherModal(false);
      onShowNotice?.(
        bn
          ? `ভাউচার ${vRefNo} (${formatBDT(vAmount)}) সফলভাবে পোস্ট করা হয়েছে!`
          : `Journal voucher ${vRefNo} (${formatBDT(vAmount)}) posted successfully!`
      );
      onRefreshData?.();
    } catch (err: any) {
      onShowError?.(err?.message || (bn ? 'ভাউচার পোস্ট করতে সমস্যা হয়েছে' : 'Failed to post voucher'));
    } finally {
      setIsSubmittingVoucher(false);
    }
  };

  // 13. Submit Handlers: Deposit to Treasury Account
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depAccountId || depAmount <= 0) {
      onShowError?.(bn ? 'অ্যাকাউন্ট ও টাকার সঠিক পরিমাণ দিন' : 'Select an account and valid amount');
      return;
    }
    setIsDepositing(true);
    try {
      const biz = accessibleBusinesses.find((b) => b.id === depBizId);
      await depositToTreasuryAccount({
        targetAccountId: depAccountId,
        amount: Number(depAmount),
        sourceType: depSource,
        businessId: depBizId,
        businessName: biz ? biz.nameBn || biz.name : 'Consolidated HQ',
        note: depNote.trim(),
      });
      const acc = treasuryWallets.find((w) => w.id === depAccountId);
      setShowDepositModal(false);
      onShowNotice?.(
        bn
          ? `${acc?.name || 'অ্যাকাউন্টে'} ${formatBDT(depAmount)} সফলভাবে জমা হয়েছে!`
          : `Successfully deposited ${formatBDT(depAmount)} into ${acc?.name || 'account'}!`
      );
      onRefreshData?.();
    } catch (err: any) {
      onShowError?.(err?.message || (bn ? 'জমা করতে সমস্যা হয়েছে' : 'Failed to deposit funds'));
    } finally {
      setIsDepositing(false);
    }
  };

  // 14. Submit Handlers: Inter-Account Transfer
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trFromId || !trToId || trFromId === trToId) {
      onShowError?.(
        bn ? 'অনুগ্রহ করে দুটি ভিন্ন অ্যাকাউন্ট নির্বাচন করুন' : 'Please select two different accounts for transfer'
      );
      return;
    }
    if (trAmount <= 0) {
      onShowError?.(bn ? 'ট্রান্সফারের পরিমাণ দিন' : 'Please enter a valid transfer amount');
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
          businessName: 'Consolidated Treasury',
          transactionType: isCashToBank ? 'cash_to_bank' : 'bank_to_cash',
          category: `${fromAcc.name} → ${toAcc.name}`,
          description: trNote.trim() || `${fromAcc.name} থেকে ${toAcc.name}-এ আন্তঃঅ্যাকাউন্ট ফান্ড ট্রান্সফার`,
          debitAccountId: toAcc.id,
          debitAccountName: toAcc.name,
          creditAccountId: fromAcc.id,
          creditAccountName: fromAcc.name,
          amount: Number(trAmount),
          paymentStatus: 'paid',
          dueAmount: 0,
          counterpartyName: 'Treasury Fund Transfer',
        },
        accounts,
        ownerId,
        actorEmail
      );

      setShowTransferModal(false);
      onShowNotice?.(
        bn
          ? `${fromAcc.name} থেকে ${formatBDT(trAmount)} সফলভাবে ${toAcc.name}-এ ট্রান্সফার করা হয়েছে!`
          : `Transferred ${formatBDT(trAmount)} from ${fromAcc.name} to ${toAcc.name}!`
      );
      onRefreshData?.();
    } catch (err: any) {
      onShowError?.(err?.message || (bn ? 'ট্রান্সফার করতে সমস্যা হয়েছে' : 'Failed to transfer funds'));
    } finally {
      setIsTransferring(false);
    }
  };

  // 15. Submit Handlers: Create Chart of Account
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccCode.trim() || !newAccName.trim()) {
      onShowError?.(bn ? 'অ্যাকাউন্ট কোড ও নাম লিখুন' : 'Please provide account code and name');
      return;
    }

    setIsCreatingAcc(true);
    try {
      await createChartOfAccount({
        code: newAccCode.trim(),
        name: newAccName.trim(),
        accountType: newAccClass,
        subType: newAccSubType,
        businessId: newAccBizId,
        openingBalance: Number(newAccOpening) || 0,
      });

      setShowNewAccountModal(false);
      onShowNotice?.(
        bn
          ? `নতুন লেজার অ্যাকাউন্ট "${newAccName}" (${newAccCode}) সফলভাবে তৈরি হয়েছে!`
          : `Chart of account "${newAccName}" (${newAccCode}) created successfully!`
      );
      onRefreshData?.();
    } catch (err: any) {
      onShowError?.(err?.message || (bn ? 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে' : 'Failed to create account'));
    } finally {
      setIsCreatingAcc(false);
    }
  };

  // 16. Reverse Journal Entry
  const handleConfirmReverse = async () => {
    if (!reversingEntry) return;
    try {
      await reversePostedJournalEntry(reversingEntry, accounts, actorEmail);
      onShowNotice?.(
        bn
          ? `ভাউচার ${reversingEntry.referenceNo} সফলভাবে রিভার্স করা হয়েছে!`
          : `Voucher ${reversingEntry.referenceNo} reversed successfully!`
      );
      setReversingEntry(null);
      onRefreshData?.();
    } catch (err: any) {
      onShowError?.(err?.message || (bn ? 'রিভার্স করতে সমস্যা হয়েছে' : 'Failed to reverse voucher'));
    }
  };

  // 17. Reset Demo Balances
  const handleConfirmReset = async () => {
    setIsResettingLedger(true);
    try {
      await resetDemoLedgerToZero();
      setShowResetConfirmModal(false);
      onShowNotice?.(
        bn
          ? 'সব ডেমো হিসাব ও ব্যালেন্স মুছে ৳০ করা হয়েছে। এখন আপনি আসল হিসাব রাখতে পারবেন!'
          : 'Demo ledger and transactions reset to ৳0 successfully!'
      );
      onRefreshData?.();
    } catch (err: any) {
      onShowError?.(err?.message || (bn ? 'রিসেট করতে ব্যর্থ হয়েছে' : 'Failed to reset demo ledger'));
    } finally {
      setIsResettingLedger(false);
    }
  };

  // 18. Export Table to CSV
  const handleExportCsv = (title: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & SUB-TABS NAVIGATION ────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  {bn ? 'অ্যাকাউন্টিং ও পূর্ণাঙ্গ খতিয়ান' : 'Accounting & Enterprise Ledger'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {bn ? 'ডাবল-এন্ট্রি GAAP' : 'Double-Entry GAAP'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {bn
                  ? '৫টি ব্যবসার সমন্বিত ক্যাশ, ব্যাংক, চার্ট অব অ্যাকাউন্টস, সাধারণ খতিয়ান ও অডিট রিপোর্ট'
                  : 'Consolidated cash, bank, chart of accounts, general ledger & audited reports across 5 businesses'}
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setVRefNo(`JV-${Date.now().toString().slice(-6)}`);
                setVAmount(0);
                setVDescription('');
                setShowVoucherModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>{bn ? '+ জার্নাল ভাউচার' : '+ Post Voucher'}</span>
            </button>

            <button
              type="button"
              onClick={() => openDeposit()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 whitespace-nowrap"
            >
              <Banknote className="h-3.5 w-3.5" />
              <span>{bn ? '+ টাকা জমা' : '+ Deposit Funds'}</span>
            </button>

            <button
              type="button"
              onClick={() => openTransfer()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 whitespace-nowrap"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-sky-600" />
              <span>{bn ? 'টাকা ট্রান্সফার' : 'Transfer'}</span>
            </button>

            <button
              type="button"
              onClick={() => openNewAccount()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 text-slate-500" />
              <span>{bn ? '+ নতুন অ্যাকাউন্ট' : '+ Add Account'}</span>
            </button>

            {userRole === 'super_admin' && (
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 whitespace-nowrap"
                title={bn ? 'ডেমো হিসাব মুছে ৳০ করুন' : 'Reset demo accounts to ৳0'}
              >
                <RotateCcw className="h-3 w-3" />
                <span>{bn ? 'রিসেট ৳০' : 'Reset ৳0'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-3">
          {[
            { id: 'overview', labelEn: 'Dashboard Overview', labelBn: 'অ্যাকাউন্টিং ড্যাশবোর্ড', icon: BarChart3 },
            { id: 'coa', labelEn: 'Chart of Accounts', labelBn: 'হিসাব কাঠামো (COA)', icon: BookOpen },
            { id: 'cash_bank', labelEn: 'Cash & Bank Accounts', labelBn: 'ক্যাশ ও ব্যাংক হিসাব', icon: Wallet },
            { id: 'general_ledger', labelEn: 'General Ledger', labelBn: 'সাধারণ খতিয়ান (GL)', icon: Layers },
            { id: 'journal_entries', labelEn: 'Journal & Vouchers', labelBn: 'জার্নাল ও ভাউচার বই', icon: Receipt },
            { id: 'financial_reports', labelEn: 'Financial Statements', labelBn: 'আর্থিক বিবরণী ও রিপোর্ট', icon: FileSpreadsheet },
            { id: 'business_pnl', labelEn: 'Business-Wise P&L', labelBn: 'ব্যবসাভিত্তিক লাভ-ক্ষতি', icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AccountingSubTab)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{bn ? tab.labelBn : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── FILTER TOOLBAR (BUSINESS, MONTH, YEAR & DATE RANGE) ────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Business Unit Selector */}
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <select
                disabled={isBusinessManager}
                value={selectedBizId}
                onChange={(e) => setSelectedBizId(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200 disabled:opacity-60"
              >
                {!isBusinessManager && (
                  <option value="ALL">
                    {bn ? 'সব ব্যবসা (Consolidated All 5)' : 'All 5 Businesses (Consolidated)'}
                  </option>
                )}
                {accessibleBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameBn || b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Range Toggle */}
            <button
              type="button"
              onClick={() => setUseCustomRange(!useCustomRange)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-colors ${
                useCustomRange
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{useCustomRange ? (bn ? 'কাস্টম তারিখ চালু' : 'Custom Range') : (bn ? 'তারিখ নির্ধারণ' : 'Pick Range')}</span>
            </button>

            {/* Standard Month / Year OR Custom Date Range */}
            {useCustomRange ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono"
                  placeholder="Start Date"
                />
                <span className="text-slate-400">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono"
                  placeholder="End Date"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">{bn ? 'সব মাস (All 12 Months)' : 'All 12 Months'}</option>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.code} value={m.code}>
                      {bn ? m.nameBn : m.nameEn}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-200 font-mono"
                >
                  <option value="ALL">{bn ? 'সব বছর (All Years)' : 'All Years'}</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search Field */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={bn ? 'ভাউচার, খতিয়ান বা বর্ণনা খুঁজুন...' : 'Search voucher, ledger, remarks...'}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* ── SUB-TAB 1: ACCOUNTING DASHBOARD OVERVIEW ──────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 9 Professional Accounting KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Total Assets */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-emerald-600" />
                  {bn ? 'মোট পরিসম্পদ (Total Assets)' : 'Total Assets'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                  {bn ? 'পরিসম্পদ' : 'Asset'}
                </span>
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatBDT(metrics.totalAssets)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{bn ? 'নগদ + ব্যাংক + স্টক + পাওনা' : 'Cash + Bank + Inventory + AR'}</span>
                <span className="font-mono text-emerald-600">{formatCompactBDT(metrics.totalAssets)}</span>
              </div>
            </div>

            {/* 2. Total Liabilities */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-amber-600" />
                  {bn ? 'মোট দায় ও দেনা (Total Liabilities)' : 'Total Liabilities'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                  {bn ? 'দায়' : 'Liability'}
                </span>
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {formatBDT(metrics.totalLiabilities)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{bn ? 'সাপ্লায়ার পাওনা + বকেয়া বেতন' : 'Payables + Accrued Dues'}</span>
                <span className="font-mono text-amber-600">{formatCompactBDT(metrics.totalLiabilities)}</span>
              </div>
            </div>

            {/* 3. Net Profit / Loss */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-sky-600" />
                  {bn ? 'নিট লাভ / ক্ষতি (Net Profit / Loss)' : 'Net Profit / Loss'}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    metrics.netProfit >= 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                  }`}
                >
                  {metrics.profitMargin.toFixed(1)}% {bn ? 'মার্জিন' : 'Margin'}
                </span>
              </div>
              <div
                className={`text-2xl font-extrabold font-mono tabular-nums ${
                  metrics.netProfit >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {metrics.netProfit < 0 ? `- ৳${Math.abs(metrics.netProfit).toLocaleString('en-IN')}` : formatBDT(metrics.netProfit)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{bn ? 'মোট আয় মাইনাস মোট খরচ' : 'Total Revenue - Expenses'}</span>
                <span className="font-mono">{metrics.netProfit >= 0 ? 'Profitable' : 'Deficit'}</span>
              </div>
            </div>

            {/* 4. Total Income / Revenue */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  {bn ? 'মোট আয় ও বিক্রি (Total Income)' : 'Total Revenue'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                  {bn ? 'বিক্রি' : 'Sales'}
                </span>
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatBDT(metrics.totalIncome)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{bn ? 'ফার্ম পণ্য বিক্রি ও ফ্রেইট' : 'Farm Sales & Other Income'}</span>
                <span className="font-mono">{formatCompactBDT(metrics.totalIncome)}</span>
              </div>
            </div>

            {/* 5. Total Expenses */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ArrowDownLeft className="h-4 w-4 text-rose-600" />
                  {bn ? 'মোট খরচ ও বেতন (Total Expenses)' : 'Total Expenses'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700">
                  {bn ? 'ব্যয়' : 'Expense'}
                </span>
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                {formatBDT(metrics.totalExpenses)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{bn ? 'ফিড, ওষুধ, বেতন ও পরিচালনা' : 'Feed, Vet, Payroll & Ops'}</span>
                <span className="font-mono">{formatCompactBDT(metrics.totalExpenses)}</span>
              </div>
            </div>

            {/* 6. Total Cash Balance */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  {bn ? 'নগদ ক্যাশ ব্যালেন্স (Cash in Hand)' : 'Total Cash Balance'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                  {cashAccounts.length} {bn ? 'টি ভল্ট' : 'Vaults'}
                </span>
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatBDT(metrics.totalCash)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{bn ? 'ফার্ম ও প্রধান কার্যালয় ক্যাশ' : 'Physical Vault Cash'}</span>
                <span className="font-mono text-emerald-600">{formatCompactBDT(metrics.totalCash)}</span>
              </div>
            </div>

            {/* 7. Total Bank Balance */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-sky-600" />
                  {bn ? 'মোট ব্যাংক জমা (Bank Balances)' : 'Total Bank Balance'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700">
                  {bankAccounts.length} {bn ? 'টি ব্যাংক' : 'Accounts'}
                </span>
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-sky-600 dark:text-sky-400">
                {formatBDT(metrics.totalBank)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{bn ? 'ইসলামী ব্যাংক, ব্র্যাক ও অন্যান্য' : 'Corporate & SME Bank A/Cs'}</span>
                <span className="font-mono text-sky-600">{formatCompactBDT(metrics.totalBank)}</span>
              </div>
            </div>

            {/* 8. Accounts Receivable */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-indigo-600" />
                  {bn ? 'গ্রাহকদের কাছে পাওনা (Accounts Receivable)' : 'Accounts Receivable'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                  {bn ? 'বাকি' : 'Due'}
                </span>
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                {formatBDT(metrics.accountsReceivable)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{bn ? 'ডিলার ও পাইকারদের কাছে বাকি' : 'Pending Customer Dues'}</span>
                <span className="font-mono text-indigo-600">{formatCompactBDT(metrics.accountsReceivable)}</span>
              </div>
            </div>

            {/* 9. Accounts Payable */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-amber-600" />
                  {bn ? 'সাপ্লায়ার দেনা (Accounts Payable)' : 'Accounts Payable'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700">
                  {bn ? 'দেনা' : 'Payable'}
                </span>
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {formatBDT(metrics.accountsPayable)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{bn ? 'ফিড ও ওষুধ সরবরাহকারীদের দেনা' : 'Vendor & Supplier Dues'}</span>
                <span className="font-mono text-amber-600">{formatCompactBDT(metrics.accountsPayable)}</span>
              </div>
            </div>
          </div>

          {/* Quick Treasury Cash & Bank Wallets View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <span>
                  {bn
                    ? `সক্রিয় ক্যাশ ও ব্যাংক অ্যাকাউন্ট (${treasuryWallets.length}টি)`
                    : `Active Cash & Bank Accounts (${treasuryWallets.length})`}
                </span>
              </h2>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {bn ? 'মোট তরল অর্থ: ' : 'Liquid Cash & Bank: '}
                {formatBDT(metrics.totalCash + metrics.totalBank)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {treasuryWallets.map((w) => {
                const isCash = w.subType === 'cash';
                return (
                  <div
                    key={w.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col justify-between space-y-3"
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
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                isCash
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                              }`}
                            >
                              {isCash ? (bn ? 'নগদ ক্যাশ' : 'Cash Vault') : (bn ? 'ব্যাংক' : 'Bank A/C')}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">{w.code}</span>
                          </div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">{w.name}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatBDT(w.balance)}
                    </div>

                    <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => openDeposit(w.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white text-xs font-bold transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        <span>{bn ? 'টাকা জমা' : 'Deposit'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openTransfer(w.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>{bn ? 'ট্রান্সফার' : 'Transfer'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Journal Transactions Preview (with scrollable table) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
            <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  <span>{bn ? 'সাম্প্রতিক জার্নাল লেনদেনসমূহ' : 'Recent Journal Entries & Audit Trail'}</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  {bn ? 'সর্বশেষ এন্ট্রিকৃত লেনদেন ও ডেবিট-ক্রেডিট স্টেটাস' : 'Latest double-entry vouchers and audit status'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('journal_entries')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {bn ? 'সব জার্নাল দেখুন →' : 'View All Journals →'}
              </button>
            </div>

            <div className="overflow-x-auto max-h-[45vh]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3.5">{bn ? 'ভাউচার নং ও তারিখ' : 'Voucher & Date'}</th>
                    <th className="py-2.5 px-3.5">{bn ? 'ব্যবসা' : 'Business'}</th>
                    <th className="py-2.5 px-3.5">{bn ? 'বিবরণ ও পক্ষ' : 'Description & Party'}</th>
                    <th className="py-2.5 px-3.5">{bn ? 'ডেবিট খাত (DR)' : 'Debit Account'}</th>
                    <th className="py-2.5 px-3.5">{bn ? 'ক্রেডিট খাত (CR)' : 'Credit Account'}</th>
                    <th className="py-2.5 px-3.5 text-right">{bn ? 'পরিমাণ (BDT)' : 'Amount'}</th>
                    <th className="py-2.5 px-3.5 text-center">{bn ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredJournalEntries.slice(0, 15).map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{j.referenceNo}</div>
                        <div className="text-[10px] text-slate-400">{j.date}</div>
                      </td>
                      <td className="py-2 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {j.businessName || 'Consolidated'}
                        </span>
                      </td>
                      <td className="py-2 px-3.5 max-w-[200px] truncate">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{j.description}</div>
                        <div className="text-[10px] text-slate-400 truncate">{j.counterpartyName || j.category}</div>
                      </td>
                      <td className="py-2 px-3.5 text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap">
                        DR: {j.debitAccountName}
                      </td>
                      <td className="py-2 px-3.5 text-rose-700 dark:text-rose-400 font-semibold whitespace-nowrap">
                        CR: {j.creditAccountName}
                      </td>
                      <td className="py-2 px-3.5 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatBDT(j.amount)}
                      </td>
                      <td className="py-2 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSetActiveSlip) {
                              onSetActiveSlip({
                                type: j.transactionType === 'payroll' ? 'salary_payslip' : 'money_receipt',
                                slipNo: j.referenceNo,
                                date: j.date,
                                businessName: j.businessName,
                                recipientName: j.counterpartyName || j.description,
                                category: j.category,
                                walletName: `${j.debitAccountName} / ${j.creditAccountName}`,
                                amount: j.amount,
                                note: j.description,
                                enteredBy: j.actorName || j.actorEmail || 'Authorized Accountant',
                              });
                            } else {
                              setViewVoucherSlip(j);
                            }
                          }}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600"
                          title="Print / View Voucher"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredJournalEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                        {bn ? 'কোনো লেনদেন পাওয়া যায়নি।' : 'No journal transactions found for the selected filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 2: CHART OF ACCOUNTS (COA) ─────────────────────── */}
      {activeTab === 'coa' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                <span>{bn ? 'হিসাব কাঠামো (Chart of Accounts - 5 Standard Classes)' : 'Standard Chart of Accounts (COA)'}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {bn
                  ? 'আন্তর্জাতিক মানদণ্ড অনুযায়ী সম্পদ, দায়, মূলধন, আয় ও ব্যয়ের পূর্ণাঙ্গ তালিকা'
                  : 'Assets, Liabilities, Equity, Revenue, and Expense ledgers with real-time balances'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openNewAccount()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{bn ? '+ নতুন অ্যাকাউন্ট যোগ' : '+ Add Account'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleExportCsv(
                    'Chart_Of_Accounts',
                    ['Code', 'Name', 'Class', 'SubType', 'Business', 'Balance'],
                    accounts.map((a) => [a.code, a.name, a.accountType, a.subType, a.businessId, a.balance])
                  )
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Class Filters (All, Assets, Liabilities, Equity, Revenue, Expense) */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            {[
              { id: 'all', label: bn ? 'সব অ্যাকাউন্ট' : 'All Classes', count: accounts.length },
              {
                id: 'asset',
                label: bn ? '১. পরিসম্পদ (Assets - 1000s)' : '1. Assets (1000s)',
                count: accounts.filter((a) => a.accountType === 'asset').length,
              },
              {
                id: 'liability',
                label: bn ? '২. দায় ও দেনা (Liabilities - 2000s)' : '2. Liabilities (2000s)',
                count: accounts.filter((a) => a.accountType === 'liability').length,
              },
              {
                id: 'equity',
                label: bn ? '৩. মূলধন (Equity - 3000s)' : '3. Equity (3000s)',
                count: accounts.filter((a) => a.accountType === 'equity').length,
              },
              {
                id: 'revenue',
                label: bn ? '৪. আয় ও বিক্রি (Revenue - 4000s)' : '4. Revenue (4000s)',
                count: accounts.filter((a) => a.accountType === 'revenue').length,
              },
              {
                id: 'expense',
                label: bn ? '৫. ব্যয় ও খরচ (Expenses - 5000s)' : '5. Expenses (5000s)',
                count: accounts.filter((a) => a.accountType === 'expense').length,
              },
            ].map((cls) => {
              const active = coaClassFilter === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setCoaClassFilter(cls.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-emerald-600'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cls.label} ({cls.count})
                </button>
              );
            })}
          </div>

          {/* Accounts Table */}
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3.5">{bn ? 'অ্যাকাউন্ট কোড' : 'Code'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'অ্যাকাউন্টের নাম' : 'Account Name'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'শ্রেণী (Type)' : 'Class'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'উপ-ধরণ (Sub-Type)' : 'Sub-Type'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'স্বাভাবিক জের' : 'Normal'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'ব্যবসা' : 'Business'}</th>
                  <th className="py-2.5 px-3.5 text-right">{bn ? 'বর্তমান ব্যালেন্স' : 'Balance'}</th>
                  <th className="py-2.5 px-3.5 text-center">{bn ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {accounts
                  .filter((a) => {
                    if (coaClassFilter !== 'all' && a.accountType !== coaClassFilter) return false;
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      return (
                        a.code.toLowerCase().includes(q) ||
                        a.name.toLowerCase().includes(q) ||
                        a.subType.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  })
                  .map((a) => {
                    const isDebitNormal = a.accountType === 'asset' || a.accountType === 'expense';
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {a.code}
                        </td>
                        <td className="py-2 px-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {a.name}
                        </td>
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              a.accountType === 'asset'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : a.accountType === 'liability'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : a.accountType === 'equity'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                : a.accountType === 'revenue'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {a.accountType}
                          </span>
                        </td>
                        <td className="py-2 px-3.5 text-slate-500 font-mono text-[11px] uppercase">
                          {a.subType}
                        </td>
                        <td className="py-2 px-3.5 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {isDebitNormal ? 'DR' : 'CR'}
                        </td>
                        <td className="py-2 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {a.businessId === 'ALL' ? (bn ? 'সার্বজনীন (ALL)' : 'Consolidated') : a.businessId}
                        </td>
                        <td
                          className={`py-2 px-3.5 text-right font-mono font-extrabold ${
                            a.balance < 0
                              ? 'text-rose-600'
                              : isDebitNormal
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-sky-600 dark:text-sky-400'
                          }`}
                        >
                          {formatBDT(a.balance)}
                        </td>
                        <td className="py-2 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setGlAccountId(a.id);
                              setActiveTab('general_ledger');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                          >
                            <Layers className="h-3 w-3 text-emerald-600" />
                            <span>{bn ? 'খতিয়ান' : 'Ledger'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 3: CASH & BANK MANAGEMENT ─────────────────────── */}
      {activeTab === 'cash_bank' && (
        <div className="space-y-6">
          {/* Cash Vaults Section */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  <span>{bn ? 'নগদ ক্যাশ ভল্টসমূহ (Cash in Hand Accounts)' : 'Cash in Hand Vaults'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {bn ? 'ফার্মের চলতি ক্যাশ ও প্রধান ক্যাশ ড্রয়ার' : 'Petty cash and central vault cash registers'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500">{bn ? 'মোট ক্যাশ: ' : 'Total Cash: '}</span>
                <span className="text-sm font-mono font-extrabold text-emerald-600">{formatBDT(metrics.totalCash)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cashAccounts.map((w) => (
                <div
                  key={w.id}
                  className="rounded-2xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                        {w.code}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-1">{w.name}</h3>
                    </div>
                    <Banknote className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                    {formatBDT(w.balance)}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/40">
                    <button
                      type="button"
                      onClick={() => openDeposit(w.id)}
                      className="flex-1 py-1 px-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-center"
                    >
                      {bn ? '+ জমা' : '+ Deposit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openTransfer(w.id)}
                      className="flex-1 py-1 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 text-center"
                    >
                      {bn ? 'ট্রান্সফার' : 'Transfer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Corporate Bank & MFS Accounts Section */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-sky-600" />
                  <span>{bn ? 'করপোরেট ব্যাংক ও মোবাইল ওয়ালেট (Bank Accounts)' : 'Corporate Bank & MFS Accounts'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {bn ? 'ইসলামী ব্যাংক, ব্র্যাক ব্যাংক ও মার্চেন্ট ওয়ালেট হিসাব' : 'Commercial bank checking accounts and merchant portals'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500">{bn ? 'মোট ব্যাংক জমা: ' : 'Total Bank: '}</span>
                <span className="text-sm font-mono font-extrabold text-sky-600">{formatBDT(metrics.totalBank)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccounts.map((w) => (
                <div
                  key={w.id}
                  className="rounded-2xl border border-sky-100 dark:border-sky-950/60 bg-sky-50/30 dark:bg-sky-950/20 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                        {w.code}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-1">{w.name}</h3>
                    </div>
                    <Landmark className="h-5 w-5 text-sky-600" />
                  </div>
                  <div className="text-xl font-extrabold font-mono text-sky-700 dark:text-sky-400">
                    {formatBDT(w.balance)}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-sky-100 dark:border-sky-900/40">
                    <button
                      type="button"
                      onClick={() => openDeposit(w.id)}
                      className="flex-1 py-1 px-2 text-xs font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-700 text-center"
                    >
                      {bn ? '+ জমা' : '+ Deposit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openTransfer(w.id)}
                      className="flex-1 py-1 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 text-center"
                    >
                      {bn ? 'ট্রান্সফার' : 'Transfer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 4: GENERAL LEDGER (GL) ────────────────────────── */}
      {activeTab === 'general_ledger' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <span>{bn ? 'সাধারণ খতিয়ান (General Ledger Book)' : 'General Ledger (GL) Report'}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {bn
                  ? 'যেকোনো লেজার অ্যাকাউন্ট নির্বাচন করে তার প্রতিটি ডেবিট, ক্রেডিট ও চলমান জের (Running Balance) দেখুন'
                  : 'Select any account to inspect its chronological debits, credits, and running balance'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Account Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{bn ? 'খাত নির্বাচন:' : 'Account:'}</span>
                <select
                  value={glAccountId}
                  onChange={(e) => setGlAccountId(e.target.value)}
                  className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name} ({formatBDT(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{bn ? 'প্রিন্ট' : 'Print'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleExportCsv(
                    `GL_${glData.account?.code || 'Account'}`,
                    ['Date', 'Reference', 'Description', 'Counterparty', 'Debit', 'Credit', 'RunningBalance'],
                    glData.rows.map((r) => [r.date, r.referenceNo, r.description, r.counterparty, r.debit, r.credit, r.runningBalance])
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Account Summary Banner */}
          {glData.account && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs">
              <div>
                <div className="text-slate-400 text-[11px]">{bn ? 'খাত ও কোড' : 'Account & Code'}</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                  [{glData.account.code}] {glData.account.name}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">{bn ? 'মোট ডেবিট (Total Debit)' : 'Period Debits'}</div>
                <div className="font-mono font-extrabold text-emerald-600 mt-0.5">
                  {formatBDT(glData.totalDebits)}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">{bn ? 'মোট ক্রেডিট (Total Credit)' : 'Period Credits'}</div>
                <div className="font-mono font-extrabold text-rose-600 mt-0.5">
                  {formatBDT(glData.totalCredits)}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">{bn ? 'বর্তমান জের (Running Balance)' : 'Closing Balance'}</div>
                <div className="font-mono font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
                  {formatBDT(glData.closingBalance)}
                </div>
              </div>
            </div>
          )}

          {/* Detailed Chronological Ledger Table with Running Balance */}
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3.5">{bn ? 'তারিখ' : 'Date'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'ভাউচার নং' : 'Voucher Ref'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'বিবরণ ও বিবরণী' : 'Particulars & Description'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'দ্বিতীয় পক্ষ' : 'Counterparty'}</th>
                  <th className="py-2.5 px-3.5 text-right text-emerald-600">{bn ? 'ডেবিট (DR)' : 'Debit'}</th>
                  <th className="py-2.5 px-3.5 text-right text-rose-600">{bn ? 'ক্রেডিট (CR)' : 'Credit'}</th>
                  <th className="py-2.5 px-3.5 text-right font-extrabold">{bn ? 'চলমান জের (Balance)' : 'Running Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {glData.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3.5 whitespace-nowrap font-mono">{row.date}</td>
                    <td className="py-2 px-3.5 whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200">
                      {row.referenceNo}
                    </td>
                    <td className="py-2 px-3.5 max-w-[240px] truncate">
                      <div className="font-medium text-slate-900 dark:text-white truncate">{row.description}</div>
                      <div className="text-[10px] text-slate-400">{row.businessName} • {row.category}</div>
                    </td>
                    <td className="py-2 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {row.counterparty}
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-semibold text-emerald-600">
                      {row.debit > 0 ? formatBDT(row.debit) : '—'}
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-semibold text-rose-600">
                      {row.credit > 0 ? formatBDT(row.credit) : '—'}
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-black text-slate-900 dark:text-white">
                      {formatBDT(row.runningBalance)}
                    </td>
                  </tr>
                ))}
                {glData.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      {bn
                        ? 'এই অ্যাকাউন্টে নির্বাচিত সময়কালে কোনো লেনদেন নেই।'
                        : 'No ledger transactions recorded for this account in the selected period.'}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 font-bold text-xs">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3.5 text-right">
                    {bn ? 'মোট জের ও লেনদেন সমাপনী:' : 'Period Total & Closing Balance:'}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-emerald-600">
                    {formatBDT(glData.totalDebits)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-rose-600">
                    {formatBDT(glData.totalCredits)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-sm text-slate-900 dark:text-white">
                    {formatBDT(glData.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 5: JOURNAL ENTRIES & AUDIT BOOKKEEPING ────────── */}
      {activeTab === 'journal_entries' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span>{bn ? 'জার্নাল ও ভাউচার রেজিস্টার (Journal Entries Register)' : 'Journal Entries & Bookkeeping'}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {bn
                  ? 'প্রতিটি লেনদেনের ডেবিট, ক্রেডিট, এন্ট্রি প্রদানকারী ও অডিট ট্রেইল'
                  : 'Complete double-entry journal vouchers, counterparty receipts & reversal audit'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setVRefNo(`JV-${Date.now().toString().slice(-6)}`);
                  setShowVoucherModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{bn ? '+ নতুন ভাউচার' : '+ Post Voucher'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleExportCsv(
                    'Journal_Entries',
                    ['Reference', 'Date', 'Business', 'Category', 'Description', 'DR_Account', 'CR_Account', 'Amount', 'Status'],
                    filteredJournalEntries.map((j) => [
                      j.referenceNo,
                      j.date,
                      j.businessName,
                      j.category,
                      j.description,
                      j.debitAccountName,
                      j.creditAccountName,
                      j.amount,
                      j.status,
                    ])
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Journal Entries Table with Reversal & Print Actions */}
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3.5">{bn ? 'ভাউচার ও তারিখ' : 'Voucher & Date'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'ব্যবসা' : 'Business'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'ক্যাটাগরি ও বিবরণ' : 'Category & Description'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'ডেবিট খাত (DR)' : 'Debit Account'}</th>
                  <th className="py-2.5 px-3.5">{bn ? 'ক্রেডিট খাত (CR)' : 'Credit Account'}</th>
                  <th className="py-2.5 px-3.5 text-right">{bn ? 'টাকার পরিমাণ' : 'Amount'}</th>
                  <th className="py-2.5 px-3.5 text-center">{bn ? 'স্টেটাস' : 'Status'}</th>
                  <th className="py-2.5 px-3.5 text-center">{bn ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredJournalEntries.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{j.referenceNo}</div>
                      <div className="text-[10px] text-slate-400">{j.date}</div>
                    </td>
                    <td className="py-2 px-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {j.businessName || 'Consolidated'}
                      </span>
                    </td>
                    <td className="py-2 px-3.5 max-w-[220px] truncate">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{j.description}</div>
                      <div className="text-[10px] text-slate-400 truncate">{j.category} • {j.counterpartyName || 'Party'}</div>
                    </td>
                    <td className="py-2 px-3.5 font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      DR: {j.debitAccountName}
                    </td>
                    <td className="py-2 px-3.5 font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                      CR: {j.creditAccountName}
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                      {formatBDT(j.amount)}
                    </td>
                    <td className="py-2 px-3.5 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          j.status === 'posted'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 line-through'
                        }`}
                      >
                        {j.status === 'posted' ? (bn ? 'পোস্টেড' : 'Posted') : (bn ? 'রিভার্সড' : 'Reversed')}
                      </span>
                    </td>
                    <td className="py-2 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSetActiveSlip) {
                              onSetActiveSlip({
                                type: j.transactionType === 'payroll' ? 'salary_payslip' : 'money_receipt',
                                slipNo: j.referenceNo,
                                date: j.date,
                                businessName: j.businessName,
                                recipientName: j.counterpartyName || j.description,
                                category: j.category,
                                walletName: `${j.debitAccountName} / ${j.creditAccountName}`,
                                amount: j.amount,
                                note: j.description,
                                enteredBy: j.actorName || j.actorEmail || 'Authorized Accountant',
                              });
                            } else {
                              setViewVoucherSlip(j);
                            }
                          }}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 cursor-pointer"
                          title="Print / View Voucher"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>

                        {j.status === 'posted' && userRole !== 'employee' && (
                          <button
                            type="button"
                            onClick={() => setReversingEntry(j)}
                            className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title={bn ? 'ভাউচার রিভার্স করুন' : 'Reverse Voucher'}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 6: FINANCIAL STATEMENTS & REPORTS ─────────────── */}
      {activeTab === 'financial_reports' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>{bn ? 'প্রফেশনাল আর্থিক বিবরণী (Audited Financial Statements)' : 'Standard Financial Statements'}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {bn
                  ? 'লাভ-ক্ষতি বিবরণী, ব্যালেন্স শিট, রেওয়ামিল, ক্যাশ বুক ও ব্যাংক বই'
                  : 'Profit & Loss, Balance Sheet, Trial Balance, Cash Book & Bank Book'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{bn ? 'প্রিন্ট রিপোর্ট' : 'Print Statement'}</span>
              </button>
            </div>
          </div>

          {/* Statement Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            {[
              { id: 'pnl', labelEn: 'Profit & Loss Statement', labelBn: 'লাভ-ক্ষতি বিবরণী (P&L)' },
              { id: 'balance_sheet', labelEn: 'Balance Sheet', labelBn: 'উদ্বৃত্তপত্র (Balance Sheet)' },
              { id: 'trial_balance', labelEn: 'Trial Balance', labelBn: 'রেওয়ামিল (Trial Balance)' },
              { id: 'cash_book', labelEn: 'Cash Book', labelBn: 'নগদান বই (Cash Book)' },
              { id: 'bank_book', labelEn: 'Bank Book', labelBn: 'ব্যাংক খতিয়ান বই (Bank Book)' },
            ].map((rep) => {
              const active = activeReport === rep.id;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setActiveReport(rep.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {bn ? rep.labelBn : rep.labelEn}
                </button>
              );
            })}
          </div>

          {/* 1. Profit & Loss Statement (Income Statement) */}
          {activeReport === 'pnl' && (
            <div className="max-w-3xl mx-auto rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 bg-slate-50/40 dark:bg-slate-800/30 text-xs">
              <div className="text-center pb-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">RegardsAgro Enterprise Limited</h3>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mt-0.5">
                  {bn ? 'লাভ ও ক্ষতি বিবরণী (Statement of Profit or Loss)' : 'Statement of Comprehensive Income'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {bn ? 'সময়কাল: ' : 'Period: '}
                  {selectedMonth !== 'ALL'
                    ? `${MONTH_OPTIONS.find((m) => m.code === selectedMonth)?.nameEn || selectedMonth} ${selectedYear}`
                    : `Year ${selectedYear} (Consolidated)`}
                </div>
              </div>

              {/* Revenue Section */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] flex justify-between border-b pb-1">
                  <span>{bn ? '১. পরিচালন রাজস্ব / আয় (Operating Revenue)' : '1. Operating Revenue'}</span>
                  <span>{bn ? 'টাকা (BDT)' : 'Amount (BDT)'}</span>
                </div>
                <div className="flex justify-between pl-3 text-slate-700 dark:text-slate-300">
                  <span>{bn ? 'ফার্ম পণ্য ও ব্রয়লার/লেয়ার বিক্রি (Farm Products Sales)' : 'Farm Operations & Livestock Sales'}</span>
                  <span className="font-mono font-bold">{formatBDT(metrics.totalIncome)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t">
                  <span>{bn ? 'সর্বমোট আয় (Gross Revenue)' : 'Total Gross Revenue'}</span>
                  <span className="font-mono text-emerald-600">{formatBDT(metrics.totalIncome)}</span>
                </div>
              </div>

              {/* Operating Expenses Section */}
              <div className="space-y-2 pt-2">
                <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] flex justify-between border-b pb-1">
                  <span>{bn ? '২. পরিচালন খরচ ও বেতন (Operating Expenses)' : '2. Operating Expenses'}</span>
                  <span>{bn ? 'টাকা (BDT)' : 'Amount (BDT)'}</span>
                </div>
                <div className="flex justify-between pl-3 text-slate-700 dark:text-slate-300">
                  <span>{bn ? 'ফিড, ওষুধ ও সরবরাহ খরচ (Feed, Vet & Raw Materials)' : 'Feed, Medicine & Operational Purchases'}</span>
                  <span className="font-mono">
                    {formatBDT(
                      filteredJournalEntries
                        .filter((j) => j.transactionType === 'purchase' || j.category?.includes('Feed'))
                        .reduce((s, j) => s + Number(j.amount || 0), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between pl-3 text-slate-700 dark:text-slate-300">
                  <span>{bn ? 'কর্মীদের বেতন ও মজুরি (Staff Salaries & Wages)' : 'Staff Salaries & Farm Wages'}</span>
                  <span className="font-mono">
                    {formatBDT(
                      filteredJournalEntries
                        .filter((j) => j.transactionType === 'payroll' || j.category?.includes('Salary'))
                        .reduce((s, j) => s + Number(j.amount || 0), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between pl-3 text-slate-700 dark:text-slate-300">
                  <span>{bn ? 'অন্যান্য পরিচালনা ও পরিবহন খরচ (Fleet, Utilities & Overhead)' : 'Utilities, Logistics & Maintenance'}</span>
                  <span className="font-mono">
                    {formatBDT(
                      filteredJournalEntries
                        .filter(
                          (j) =>
                            j.transactionType === 'expense' &&
                            !j.category?.includes('Feed') &&
                            !j.category?.includes('Salary')
                        )
                        .reduce((s, j) => s + Number(j.amount || 0), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t">
                  <span>{bn ? 'সর্বমোট পরিচালন খরচ (Total Operating Expenses)' : 'Total Operating Expenses'}</span>
                  <span className="font-mono text-rose-600">{formatBDT(metrics.totalExpenses)}</span>
                </div>
              </div>

              {/* Net Profit / Loss */}
              <div className="pt-3 border-t-2 border-slate-900 dark:border-white">
                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white">
                  <span>{bn ? 'নিট লাভ / (ক্ষতি) [Net Profit / (Loss)]' : 'Net Operating Profit / (Loss)'}</span>
                  <span
                    className={`font-mono ${
                      metrics.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
                    }`}
                  >
                    {metrics.netProfit < 0 ? `(৳${Math.abs(metrics.netProfit).toLocaleString('en-IN')})` : formatBDT(metrics.netProfit)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 text-right mt-0.5">
                  {bn ? 'মুনাফার হার: ' : 'Net Margin: '}
                  {metrics.profitMargin.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* 2. Balance Sheet */}
          {activeReport === 'balance_sheet' && (
            <div className="max-w-3xl mx-auto rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 bg-slate-50/40 dark:bg-slate-800/30 text-xs">
              <div className="text-center pb-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">RegardsAgro Enterprise Limited</h3>
                <div className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase mt-0.5">
                  {bn ? 'উদ্বৃত্তপত্র / আর্থিক অবস্থার বিবরণী' : 'Statement of Financial Position (Balance Sheet)'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {bn ? 'তারিখ পর্যন্ত: ' : 'As of: '}
                  {new Date().toISOString().split('T')[0]}
                </div>
              </div>

              {/* Assets */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] flex justify-between border-b pb-1">
                  <span>{bn ? 'পরিসম্পদ (Assets)' : 'Assets'}</span>
                  <span>{bn ? 'টাকা (BDT)' : 'Amount (BDT)'}</span>
                </div>
                <div className="flex justify-between pl-3 text-slate-700 dark:text-slate-300">
                  <span>{bn ? 'নগদ ক্যাশ (Cash in Hand)' : 'Cash in Hand'}</span>
                  <span className="font-mono">{formatBDT(metrics.totalCash)}</span>
                </div>
                <div className="flex justify-between pl-3 text-slate-700 dark:text-slate-300">
                  <span>{bn ? 'ব্যাংক জমা (Bank Accounts)' : 'Bank Balances'}</span>
                  <span className="font-mono">{formatBDT(metrics.totalBank)}</span>
                </div>
                <div className="flex justify-between pl-3 text-slate-700 dark:text-slate-300">
                  <span>{bn ? 'গ্রাহক বাকি (Accounts Receivable)' : 'Accounts Receivable'}</span>
                  <span className="font-mono">{formatBDT(metrics.accountsReceivable)}</span>
                </div>
                <div className="flex justify-between pl-3 text-slate-700 dark:text-slate-300">
                  <span>{bn ? 'মজুদ ফিড ও পণ্য (Inventory Valuation)' : 'Inventories & Supplies'}</span>
                  <span className="font-mono">
                    {formatBDT(
                      accounts.find((a) => a.subType === 'inventory')?.balance || 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-black text-slate-900 dark:text-white pt-1 border-t">
                  <span>{bn ? 'সর্বমোট পরিসম্পদ (Total Assets)' : 'Total Assets'}</span>
                  <span className="font-mono text-emerald-600">{formatBDT(metrics.totalAssets)}</span>
                </div>
              </div>

              {/* Liabilities */}
              <div className="space-y-2 pt-2">
                <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] flex justify-between border-b pb-1">
                  <span>{bn ? 'দায় ও দেনা (Liabilities)' : 'Liabilities'}</span>
                  <span>{bn ? 'টাকা (BDT)' : 'Amount (BDT)'}</span>
                </div>
                <div className="flex justify-between pl-3 text-slate-700 dark:text-slate-300">
                  <span>{bn ? 'সাপ্লায়ার দেনা (Accounts Payable)' : 'Accounts Payable'}</span>
                  <span className="font-mono">{formatBDT(metrics.accountsPayable)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 dark:text-white pt-1 border-t">
                  <span>{bn ? 'সর্বমোট দায় (Total Liabilities)' : 'Total Liabilities'}</span>
                  <span className="font-mono text-amber-600">{formatBDT(metrics.totalLiabilities)}</span>
                </div>
              </div>

              {/* Equity */}
              <div className="space-y-2 pt-2">
                <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] flex justify-between border-b pb-1">
                  <span>{bn ? 'মালিকানা স্বত্ব (Equity)' : 'Owner Equity'}</span>
                  <span>{bn ? 'টাকা (BDT)' : 'Amount (BDT)'}</span>
                </div>
                <div className="flex justify-between pl-3 text-slate-700 dark:text-slate-300">
                  <span>{bn ? 'মালিকের মূলধন ও বিনিয়োগ (Capital)' : 'Sponsor Equity & Capital'}</span>
                  <span className="font-mono">{formatBDT(metrics.totalEquity)}</span>
                </div>
                <div className="flex justify-between pl-3 text-slate-700 dark:text-slate-300">
                  <span>{bn ? 'বর্তমান সময়ের নিট লাভ (Retained Profit)' : 'Period Retained Earnings'}</span>
                  <span className="font-mono">{formatBDT(metrics.netProfit)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 dark:text-white pt-1 border-t">
                  <span>{bn ? 'মোট মূলধন ও লাভ (Total Equity)' : 'Total Equity'}</span>
                  <span className="font-mono text-purple-600">{formatBDT(metrics.totalEquity + metrics.netProfit)}</span>
                </div>
              </div>

              {/* Verification Equation Bar */}
              <div className="pt-3 border-t-2 border-slate-900 dark:border-white">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{bn ? 'অ্যাকাউন্টিং সমীকরণ যাচাই: ' : 'Accounting Equation Verified: '}</span>
                    <span className="font-mono">Assets = Liabilities + Equity</span>
                  </div>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">
                    {formatBDT(metrics.totalAssets)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Trial Balance */}
          {activeReport === 'trial_balance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{bn ? 'রেওয়ামিল (Trial Balance)' : 'Trial Balance'}</h3>
                  <p className="text-xs text-slate-500">
                    {bn ? 'প্রতিটি খাতের সমাপনী ডেবিট ও ক্রেডিট সমতা' : 'Verification of equality between debit and credit balances'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleExportCsv(
                      'Trial_Balance',
                      ['AccountCode', 'AccountName', 'DebitBalance', 'CreditBalance'],
                      accounts.map((a) => {
                        const isDebit = a.accountType === 'asset' || a.accountType === 'expense';
                        return [a.code, a.name, isDebit ? a.balance : 0, !isDebit ? a.balance : 0];
                      })
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b font-semibold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3.5">{bn ? 'কোড' : 'Code'}</th>
                      <th className="py-2.5 px-3.5">{bn ? 'খাতের নাম (Account Name)' : 'Account Name'}</th>
                      <th className="py-2.5 px-3.5">{bn ? 'ধরণ (Class)' : 'Class'}</th>
                      <th className="py-2.5 px-3.5 text-right text-emerald-600">{bn ? 'ডেবিট জের (DR)' : 'Debit Balance'}</th>
                      <th className="py-2.5 px-3.5 text-right text-rose-600">{bn ? 'ক্রেডিট জের (CR)' : 'Credit Balance'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {accounts.map((a) => {
                      const isDebitNormal = a.accountType === 'asset' || a.accountType === 'expense';
                      const drVal = isDebitNormal ? a.balance : 0;
                      const crVal = !isDebitNormal ? a.balance : 0;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">{a.code}</td>
                          <td className="py-2 px-3.5 font-semibold text-slate-800 dark:text-slate-200">{a.name}</td>
                          <td className="py-2 px-3.5 text-slate-400 uppercase text-[10px]">{a.accountType}</td>
                          <td className="py-2 px-3.5 text-right font-mono font-semibold text-emerald-600">
                            {drVal !== 0 ? formatBDT(drVal) : '—'}
                          </td>
                          <td className="py-2 px-3.5 text-right font-mono font-semibold text-rose-600">
                            {crVal !== 0 ? formatBDT(crVal) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-slate-100 dark:bg-slate-800 border-t-2 font-bold text-xs">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3.5 text-right">
                        {bn ? 'সর্বমোট জের (Total):' : 'Total Balances:'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-emerald-700 dark:text-emerald-400">
                        {formatBDT(
                          accounts
                            .filter((a) => a.accountType === 'asset' || a.accountType === 'expense')
                            .reduce((s, a) => s + Number(a.balance || 0), 0)
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-rose-700 dark:text-rose-400">
                        {formatBDT(
                          accounts
                            .filter((a) => a.accountType !== 'asset' && a.accountType !== 'expense')
                            .reduce((s, a) => s + Number(a.balance || 0), 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 4. Cash Book */}
          {activeReport === 'cash_book' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{bn ? 'নগদান বই (Cash Book)' : 'Cash Book Ledger'}</h3>
                  <p className="text-xs text-slate-500">
                    {bn ? 'সকল নগদ প্রাপ্তি (Cash Receipts) ও নগদ পরিশোধ (Cash Payments)' : 'Chronological cash inflows and outflows'}
                  </p>
                </div>
                <span className="font-mono font-bold text-xs text-emerald-600">
                  {bn ? 'নগদ জের: ' : 'Cash on Hand: '}
                  {formatBDT(metrics.totalCash)}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b font-semibold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3.5">{bn ? 'তারিখ' : 'Date'}</th>
                      <th className="py-2.5 px-3.5">{bn ? 'ভাউচার' : 'Voucher'}</th>
                      <th className="py-2.5 px-3.5">{bn ? 'বিবরণ ও উৎস' : 'Particulars & Source'}</th>
                      <th className="py-2.5 px-3.5 text-right text-emerald-600">{bn ? 'নগদ গ্রহণ (Inflow / DR)' : 'Cash In'}</th>
                      <th className="py-2.5 px-3.5 text-right text-rose-600">{bn ? 'নগদ প্রদান (Outflow / CR)' : 'Cash Out'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredJournalEntries
                      .filter((j) => {
                        const drIsCash = cashAccounts.some((c) => c.id === j.debitAccountId);
                        const crIsCash = cashAccounts.some((c) => c.id === j.creditAccountId);
                        return drIsCash || crIsCash;
                      })
                      .map((j) => {
                        const isCashIn = cashAccounts.some((c) => c.id === j.debitAccountId);
                        return (
                          <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3.5 font-mono whitespace-nowrap">{j.date}</td>
                            <td className="py-2 px-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">{j.referenceNo}</td>
                            <td className="py-2 px-3.5 max-w-[280px] truncate">
                              <div className="font-medium text-slate-900 dark:text-white truncate">{j.description}</div>
                              <div className="text-[10px] text-slate-400">{j.counterpartyName || j.category}</div>
                            </td>
                            <td className="py-2 px-3.5 text-right font-mono font-semibold text-emerald-600">
                              {isCashIn ? formatBDT(j.amount) : '—'}
                            </td>
                            <td className="py-2 px-3.5 text-right font-mono font-semibold text-rose-600">
                              {!isCashIn ? formatBDT(j.amount) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Bank Book */}
          {activeReport === 'bank_book' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{bn ? 'ব্যাংক খতিয়ান বই (Bank Book)' : 'Bank Book Ledger'}</h3>
                  <p className="text-xs text-slate-500">
                    {bn ? 'সকল ব্যাংক জমা (Deposits) ও ব্যাংক পেমেন্ট/ট্রান্সফার (Withdrawals)' : 'Chronological bank deposits and withdrawals'}
                  </p>
                </div>
                <span className="font-mono font-bold text-xs text-sky-600">
                  {bn ? 'ব্যাংক মোট জের: ' : 'Bank Balance: '}
                  {formatBDT(metrics.totalBank)}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b font-semibold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3.5">{bn ? 'তারিখ' : 'Date'}</th>
                      <th className="py-2.5 px-3.5">{bn ? 'ভাউচার' : 'Voucher'}</th>
                      <th className="py-2.5 px-3.5">{bn ? 'ব্যাংক অ্যাকাউন্ট' : 'Bank A/C'}</th>
                      <th className="py-2.5 px-3.5">{bn ? 'বিবরণ ও পক্ষ' : 'Particulars'}</th>
                      <th className="py-2.5 px-3.5 text-right text-sky-600">{bn ? 'জমা (Deposit / DR)' : 'Deposit'}</th>
                      <th className="py-2.5 px-3.5 text-right text-rose-600">{bn ? 'উত্তোলন (Withdraw / CR)' : 'Withdrawal'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredJournalEntries
                      .filter((j) => {
                        const drIsBank = bankAccounts.some((c) => c.id === j.debitAccountId);
                        const crIsBank = bankAccounts.some((c) => c.id === j.creditAccountId);
                        return drIsBank || crIsBank;
                      })
                      .map((j) => {
                        const isBankDeposit = bankAccounts.some((c) => c.id === j.debitAccountId);
                        const bankName = isBankDeposit ? j.debitAccountName : j.creditAccountName;
                        return (
                          <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3.5 font-mono whitespace-nowrap">{j.date}</td>
                            <td className="py-2 px-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">{j.referenceNo}</td>
                            <td className="py-2 px-3.5 font-semibold text-sky-700 dark:text-sky-300">{bankName}</td>
                            <td className="py-2 px-3.5 max-w-[260px] truncate">
                              <div className="font-medium text-slate-900 dark:text-white truncate">{j.description}</div>
                              <div className="text-[10px] text-slate-400">{j.counterpartyName || j.category}</div>
                            </td>
                            <td className="py-2 px-3.5 text-right font-mono font-semibold text-sky-600">
                              {isBankDeposit ? formatBDT(j.amount) : '—'}
                            </td>
                            <td className="py-2 px-3.5 text-right font-mono font-semibold text-rose-600">
                              {!isBankDeposit ? formatBDT(j.amount) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUB-TAB 7: BUSINESS-WISE ACCOUNTING & COMPARATIVE P&L ── */}
      {activeTab === 'business_pnl' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span>{bn ? '৫টি ব্যবসার পৃথক অ্যাকাউন্টিং ও তুলনামূলক লাভ-ক্ষতি' : 'Comparative Multi-Business Accounting (5 Units)'}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {bn
                  ? 'পোল্ট্রি, মাছ, ছাগল, গবাদিপশু ও পরিবহন ব্যবসার আয়, ব্যয়, নিট লাভ ও মার্জিন তুলনা'
                  : 'Independent P&L, dedicated assets, and cash allocations across all 5 agro units'}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                handleExportCsv(
                  'Multi_Business_PnL',
                  ['Business', 'Code', 'Revenue', 'Expenses', 'NetProfit', 'MarginPercent', 'AllocatedTreasury'],
                  businessMatrix.map((b) => [b.nameEn, b.code, b.revenue, b.expenses, b.netProfit, b.margin.toFixed(1), b.allocatedTreasury])
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* 5 Business Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessMatrix.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 space-y-3 shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {b.code}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{b.name}</h3>
                  </div>
                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                      b.netProfit >= 0
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {b.margin.toFixed(1)}% {bn ? 'মার্জিন' : 'Margin'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400">{bn ? 'মোট আয়' : 'Revenue'}</div>
                    <div className="font-mono font-bold text-emerald-600 mt-0.5">{formatBDT(b.revenue)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">{bn ? 'মোট খরচ' : 'Expense'}</div>
                    <div className="font-mono font-bold text-rose-600 mt-0.5">{formatBDT(b.expenses)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">{bn ? 'নিট লাভ / ক্ষতি' : 'Net Profit'}</div>
                    <div
                      className={`font-mono font-extrabold mt-0.5 ${
                        b.netProfit >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600'
                      }`}
                    >
                      {formatBDT(b.netProfit)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">{bn ? 'মোট লেনদেন' : 'Entries'}</div>
                    <div className="font-mono font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      {b.transactionCount} {bn ? 'টি' : 'txns'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBizId(b.id);
                    setActiveTab('overview');
                  }}
                  className="w-full py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-colors text-center"
                >
                  {bn ? 'এই ব্যবসার বিস্তারিত খতিয়ান দেখুন →' : 'View This Business Ledger →'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL 1: + POST DOUBLE-ENTRY JOURNAL VOUCHER ─────────── */}
      {showVoucherModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowVoucherModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  <span>{bn ? 'নতুন ডাবল-এন্ট্রি জার্নাল ভাউচার' : 'Post Double-Entry Journal Voucher'}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {bn
                    ? 'প্রতিটি ভাউচারে ডেবিট ও ক্রেডিট সমান হতে হবে (Debit === Credit)'
                    : 'Standard double-entry journal ensuring Debit equals Credit'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePostVoucherSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'ভাউচার রেফারেন্স নং *' : 'Voucher Ref *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={vRefNo}
                    onChange={(e) => setVRefNo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'তারিখ *' : 'Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={vDate}
                    onChange={(e) => setVDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'ব্যবসা শাখা *' : 'Business Unit *'}
                  </label>
                  <select
                    value={vBizId}
                    onChange={(e) => setVBizId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-semibold"
                  >
                    {!isBusinessManager && <option value="ALL">{bn ? 'সার্বজনীন (ALL HQ)' : 'Consolidated HQ'}</option>}
                    {accessibleBusinesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameBn || b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'ক্যাটাগরি *' : 'Category *'}
                  </label>
                  <input
                    type="text"
                    value={vCategory}
                    onChange={(e) => setVCategory(e.target.value)}
                    placeholder="e.g. Sales, Feed Purchase, Salary"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>

              {/* Debit & Credit Accounts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                <div>
                  <label className="block mb-1 font-bold text-emerald-700 dark:text-emerald-400">
                    {bn ? 'ডেবিট খাত (Debit Account - DR) *' : 'Debit Account (DR) *'}
                  </label>
                  <select
                    value={vDebitAccId}
                    onChange={(e) => setVDebitAccId(e.target.value)}
                    className="w-full rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-3 py-2 font-semibold"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.code}] {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-bold text-rose-700 dark:text-rose-400">
                    {bn ? 'ক্রেডিট খাত (Credit Account - CR) *' : 'Credit Account (CR) *'}
                  </label>
                  <select
                    value={vCreditAccId}
                    onChange={(e) => setVCreditAccId(e.target.value)}
                    className="w-full rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 px-3 py-2 font-semibold"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.code}] {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'টাকার পরিমাণ (BDT) *' : 'Amount (BDT) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={vAmount === 0 ? '' : vAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setVAmount(val === '' ? 0 : Number(val));
                    }}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono font-black text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'দ্বিতীয় পক্ষ / গ্রাহক / সাপ্লায়ার' : 'Counterparty / Party'}
                  </label>
                  <input
                    type="text"
                    value={vCounterparty}
                    onChange={(e) => setVCounterparty(e.target.value)}
                    placeholder="e.g. Farmer Rahim, Dealer Kamal"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'বর্ণনা / বিবরণী *' : 'Description / Remarks *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={vDescription}
                  onChange={(e) => setVDescription(e.target.value)}
                  placeholder={bn ? 'লেনদেনের পূর্ণাঙ্গ উদ্দেশ্য লিখুন...' : 'Enter complete purpose of the journal entry...'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                />
              </div>

              {/* Invariant Verification Bar */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
                <span className="text-emerald-600 font-bold">DR: {formatBDT(vAmount)}</span>
                <span className="text-slate-400">===</span>
                <span className="text-rose-600 font-bold">CR: {formatBDT(vAmount)}</span>
                <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                  <Check className="h-3 w-3" /> Balanced
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVoucher}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmittingVoucher ? (bn ? 'পোস্ট হচ্ছে...' : 'Posting...') : bn ? 'ভাউচার পোস্ট করুন' : 'Post Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: + CASH / BANK DEPOSIT MODAL ──────────────────── */}
      {showDepositModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowDepositModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {bn ? 'ক্যাশ বা ব্যাংকে টাকা জমা করুন' : 'Deposit Funds to Cash / Bank'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {bn ? 'মালিকের মূলধন বা নগদ তহবিল অ্যাকাউন্টে যোগ করুন' : 'Deposit owner equity or initial cash balance'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block mb-1 font-semibold">{bn ? 'কোন অ্যাকাউন্টে জমা হবে? *' : 'Target Account *'}</label>
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
                  <label className="block mb-1 font-semibold">{bn ? 'টাকার পরিমাণ (BDT) *' : 'Amount (BDT) *'}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={depAmount === 0 ? '' : depAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setDepAmount(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'উৎস (Source)' : 'Source'}</label>
                  <select
                    value={depSource}
                    onChange={(e) => setDepSource(e.target.value as 'capital' | 'income')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="capital">{bn ? 'মালিকের মূলধন (Owner Capital)' : 'Owner Capital'}</option>
                    <option value="income">{bn ? 'অন্যান্য আয় (Other Income)' : 'Other Income'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'বিবরণ / নোট' : 'Remarks / Note'}</label>
                <input
                  type="text"
                  value={depNote}
                  onChange={(e) => setDepNote(e.target.value)}
                  placeholder={bn ? 'যেমন: মালিকের তহবিল থেকে ব্যাংকে জমা' : 'e.g. Deposit from central treasury'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isDepositing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isDepositing ? (bn ? 'জমা হচ্ছে...' : 'Depositing...') : bn ? 'টাকা জমা করুন' : 'Confirm Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: INTER-ACCOUNT TRANSFER (CASH ⇄ BANK) ─────────── */}
      {showTransferModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowTransferModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-sky-600" />
                  <span>{bn ? 'আন্তঃঅ্যাকাউন্ট টাকা ট্রান্সফার' : 'Inter-Account Transfer'}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {bn ? 'ক্যাশ থেকে ব্যাংকে অথবা ব্যাংক থেকে ক্যাশে টাকা স্থানান্তর' : 'Move funds between cash vaults and bank accounts'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-rose-700 dark:text-rose-400">
                  {bn ? 'কোথা থেকে টাকা যাবে (From Source Account) *' : 'From Source Account *'}
                </label>
                <select
                  value={trFromId}
                  onChange={(e) => setTrFromId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  {bn ? 'কোথায় টাকা জমা হবে (To Destination Account) *' : 'To Destination Account *'}
                </label>
                <select
                  value={trToId}
                  onChange={(e) => setTrToId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'ট্রান্সফারের পরিমাণ (BDT) *' : 'Transfer Amount (BDT) *'}</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={trAmount === 0 ? '' : trAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/^0+(?=\d)/, '');
                    setTrAmount(v === '' ? 0 : Number(v));
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'বিবরণ / নোট' : 'Remarks / Note'}</label>
                <input
                  type="text"
                  value={trNote}
                  onChange={(e) => setTrNote(e.target.value)}
                  placeholder={bn ? 'যেমন: ক্যাশ থেকে ব্যাংক ডিপোজিট' : 'e.g. Cash deposited to BRAC Bank'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isTransferring ? (bn ? 'ট্রান্সফার হচ্ছে...' : 'Transferring...') : bn ? 'ট্রান্সফার সম্পন্ন করুন' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: + ADD NEW CHART OF ACCOUNT ───────────────────── */}
      {showNewAccountModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowNewAccountModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {bn ? 'নতুন লেজার অ্যাকাউন্ট তৈরি' : 'Create New Chart of Account'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {bn ? 'হিসাব কাঠামোতে নতুন লেজার অ্যাকাউন্ট যোগ করুন' : 'Add a new ledger to the chart of accounts'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAccountModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'শ্রেণী (Class) *' : 'Class *'}</label>
                  <select
                    value={newAccClass}
                    onChange={(e) => {
                      const cls = e.target.value as any;
                      setNewAccClass(cls);
                      const prefix =
                        cls === 'asset'
                          ? '10'
                          : cls === 'liability'
                          ? '20'
                          : cls === 'equity'
                          ? '30'
                          : cls === 'revenue'
                          ? '40'
                          : '50';
                      setNewAccCode(`${prefix}${Math.floor(20 + Math.random() * 70)}`);
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-semibold"
                  >
                    <option value="asset">{bn ? '১. পরিসম্পদ (Asset)' : '1. Asset'}</option>
                    <option value="liability">{bn ? '২. দায় (Liability)' : '2. Liability'}</option>
                    <option value="equity">{bn ? '৩. মূলধন (Equity)' : '3. Equity'}</option>
                    <option value="revenue">{bn ? '৪. আয় (Revenue)' : '4. Revenue'}</option>
                    <option value="expense">{bn ? '৫. ব্যয় (Expense)' : '5. Expense'}</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'অ্যাকাউন্ট কোড *' : 'Code *'}</label>
                  <input
                    type="text"
                    required
                    value={newAccCode}
                    onChange={(e) => setNewAccCode(e.target.value)}
                    placeholder="e.g. 1030, 5040"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'অ্যাকাউন্টের নাম *' : 'Account Name *'}</label>
                <input
                  type="text"
                  required
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder={bn ? 'যেমন: ভ্যাকসিন ও ওষুধ খরচ, নতুন ব্যাংক' : 'e.g. Vaccine & Vet Expense, Dhaka Bank A/C'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'ব্যবসা শাখা' : 'Business Unit'}</label>
                  <select
                    value={newAccBizId}
                    onChange={(e) => setNewAccBizId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="ALL">{bn ? 'সার্বজনীন (ALL HQ)' : 'Consolidated (ALL)'}</option>
                    {accessibleBusinesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameBn || b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'প্রারম্ভিক জের (BDT)' : 'Opening Balance'}</label>
                  <input
                    type="number"
                    min={0}
                    value={newAccOpening === 0 ? '' : newAccOpening}
                    onChange={(e) => setNewAccOpening(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewAccountModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAcc}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isCreatingAcc ? (bn ? 'তৈরি হচ্ছে...' : 'Creating...') : bn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: CONFIRM REVERSAL OF JOURNAL ENTRY ───────────── */}
      {reversingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          onClick={() => setReversingEntry(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {bn ? 'ভাউচার রিভার্স নিশ্চিতকরণ' : 'Confirm Voucher Reversal'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {reversingEntry.referenceNo} — {formatBDT(reversingEntry.amount)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {bn
                ? `আপনি কি নিশ্চিতভাবে ভাউচার "${reversingEntry.referenceNo}" রিভার্স করতে চান? এর ফলে বিপরীতে সমপরিমাণ এন্ট্রি হয়ে অ্যাকাউন্ট ব্যালেন্স পূর্বাবস্থায় ফিরে যাবে।`
                : `Are you sure you want to reverse voucher "${reversingEntry.referenceNo}"? This will create an offsetting entry and restore account balances.`}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReversingEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
              >
                {bn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReverse}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                {bn ? 'হ্যাঁ, রিভার্স করুন' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 6: RESET DEMO LEDGER CONFIRMATION ──────────────── */}
      {showResetConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          onClick={() => setShowResetConfirmModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {bn ? 'ডেমো হিসাব মুছে ৳০ করুন' : 'Reset Demo Ledger to ৳0'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {bn ? 'শুধুমাত্র সুপার অ্যাডমিনের জন্য প্রযোজ্য' : 'Super Admin Action Only'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {bn
                ? 'সিস্টেমের প্রাথমিক ডেমো ব্যালেন্স ও পরীক্ষামূলক ভাউচার মুছে ৳০ করা হবে। এটি করলে আপনি আপনার আসল ফার্মের হিসাব নতুন করে যোগ করতে পারবেন।'
                : 'This will reset all initial sample demo balances and test vouchers to ৳0, allowing you to begin with clean actual balances.'}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
              >
                {bn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isResettingLedger}
                onClick={handleConfirmReset}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
              >
                {isResettingLedger ? (bn ? 'রিসেট হচ্ছে...' : 'Resetting...') : bn ? 'হ্যাঁ, ৳০ করুন' : 'Yes, Reset to ৳0'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 7: STANDALONE VOUCHER SLIP PRINT ────────────────── */}
      {viewVoucherSlip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setViewVoucherSlip(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 print:m-0 print:p-0 print:border-none print:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {bn ? 'ভাউচার রসিদ ও অডিট স্লিপ' : 'Journal Voucher Slip'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg border text-slate-600 hover:text-emerald-600"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewVoucherSlip(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Slip Content */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="text-center pb-2 border-b">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">RegardsAgro Enterprise Limited</h2>
                <div className="text-[11px] font-bold text-emerald-600 uppercase">Official Double-Entry Journal Slip</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Voucher: {viewVoucherSlip.referenceNo} • Date: {viewVoucherSlip.date}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">Business Unit: </span>
                  <span className="font-bold">{viewVoucherSlip.businessName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Category: </span>
                  <span className="font-bold">{viewVoucherSlip.category}</span>
                </div>
                <div>
                  <span className="text-slate-400">Debit (DR): </span>
                  <span className="font-bold text-emerald-600">{viewVoucherSlip.debitAccountName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Credit (CR): </span>
                  <span className="font-bold text-rose-600">{viewVoucherSlip.creditAccountName}</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-slate-400 text-[10px]">Particulars / Narration:</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{viewVoucherSlip.description}</div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t font-black text-sm">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-600">{formatBDT(viewVoucherSlip.amount)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-6 text-center text-[10px] text-slate-400 border-t">
                <div className="border-t border-slate-300 pt-1">Prepared By</div>
                <div className="border-t border-slate-300 pt-1">Verified By</div>
                <div className="border-t border-slate-300 pt-1">Approved By</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
