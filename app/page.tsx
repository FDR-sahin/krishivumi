'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  Building2,
  Bird,
  Beef,
  ShieldCheck,
  Fish,
  Truck,
  Factory,
  Wheat,
  Store,
  Landmark,
  Package,
  Users,
  FileBarChart,
  Lock,
  Bell,
  Search,
  Plus,
  Sun,
  Moon,
  Globe,
  LogOut,
  ChevronRight,
  ArrowUpRight,
  Menu,
  X,
  CheckCircle2,
  HelpCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  Coins,
  Banknote,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { AuthenticatedErpUser } from '@/lib/auth';
import {
  ErpBusiness,
  ErpAccount,
  ErpJournalEntry,
  ErpInventoryItem,
  ErpStockMovement,
  ErpStakeholder,
  ErpPoultryBatch,
  ErpLivestockRecord,
  ErpFishCycle,
  ErpTransportOp,
  ErpNotification,
  ErpAuditLog,
  ErpUser,
  UserRole,
  formatBDT,
} from '@/lib/erp-types';
import {
  markNotificationAsRead,
  postDoubleEntryTransaction,
  subscribeErpDataChanged,
} from '@/lib/erp-service';
import AddBusinessWizardModal from '@/components/AddBusinessWizardModal';
import SpecializedModulesView from '@/components/SpecializedModulesView';
import CentralAccountingAndInventoryView from '@/components/CentralAccountingAndInventoryView';
import PublicWebsiteView from '@/components/PublicWebsiteView';
import BrandLogo from '@/components/BrandLogo';
import AuthModal from '@/components/AuthModal';
import MonthFilterBar, { MonthFilterValue, matchesMonthFilter } from '@/components/MonthFilterBar';

type NavSection =
  | 'dashboard'
  | 'business_detail'
  | 'accounting'
  | 'inventory'
  | 'stakeholders'
  | 'reports'
  | 'security'
  | 'public_site';

function formatCompactBDT(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}৳${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${sign}৳${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}৳${(abs / 1000).toFixed(0)}k`;
  return `${sign}৳${abs}`;
}

function getBusinessAccent(templateType?: string) {
  switch (templateType) {
    case 'poultry':
      return {
        bar: 'bg-amber-500',
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20',
      };
    case 'cattle':
      return {
        bar: 'bg-emerald-500',
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
      };
    case 'goat':
      return {
        bar: 'bg-indigo-500',
        iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20',
      };
    case 'fish':
      return {
        bar: 'bg-cyan-500',
        iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/20',
      };
    case 'transport':
      return {
        bar: 'bg-sky-500',
        iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20',
      };
    default:
      return {
        bar: 'bg-violet-500',
        iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20',
      };
  }
}

export default function AgroErpApp() {
  const [user, setUser] = useState<AuthenticatedErpUser | null>(null);
  const [hasSuperAdmin, setHasSuperAdmin] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [seedingData, setSeedingData] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Theme & Language
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<'en' | 'bn'>('bn');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);

  // Navigation & Active Business
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [showAddBusinessWizard, setShowAddBusinessWizard] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Dashboard Quick Sale / Expense Modal
  const [dashboardQuickTxModal, setDashboardQuickTxModal] = useState<'sale' | 'expense' | null>(
    null
  );
  const [quickBizId, setQuickBizId] = useState<string>('');
  const [quickCategory, setQuickCategory] = useState<string>('');
  const [quickAmount, setQuickAmount] = useState<number>(15000);
  const [quickDue, setQuickDue] = useState<number>(0);
  const [quickParty, setQuickParty] = useState<string>('');
  const [quickDate, setQuickDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [quickToast, setQuickToast] = useState<string | null>(null);

  // Global 12-Month Filter across Dashboard, Accounting, Inventory, Reports & Business Modules
  const [monthFilter, setMonthFilter] = useState<MonthFilterValue>({
    year: 'ALL',
    month: 'ALL',
  });

  // RBAC Simulation Context
  const [userRole, setUserRole] = useState<UserRole>('super_admin');
  const [assignedBusinessFilter, setAssignedBusinessFilter] = useState<string>('ALL');

  // Search, Filter, Sort & Pagination for Business Grid
  const [globalSearch, setGlobalSearch] = useState('');
  const [bizStatusFilter, setBizStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [bizSortBy, setBizSortBy] = useState<'name' | 'revenue' | 'profit'>('revenue');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Live Firestore Collections State
  const [businesses, setBusinesses] = useState<ErpBusiness[]>([]);
  const [accounts, setAccounts] = useState<ErpAccount[]>([]);
  const [journalEntries, setJournalEntries] = useState<ErpJournalEntry[]>([]);
  const [inventoryItems, setInventoryItems] = useState<ErpInventoryItem[]>([]);
  const [stockMovements, setStockMovements] = useState<ErpStockMovement[]>([]);
  const [stakeholders, setStakeholders] = useState<ErpStakeholder[]>([]);
  const [poultryBatches, setPoultryBatches] = useState<ErpPoultryBatch[]>([]);
  const [livestockRecords, setLivestockRecords] = useState<ErpLivestockRecord[]>([]);
  const [fishCycles, setFishCycles] = useState<ErpFishCycle[]>([]);
  const [transportOps, setTransportOps] = useState<ErpTransportOp[]>([]);
  const [notifications, setNotifications] = useState<ErpNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<ErpAuditLog[]>([]);
  const [erpUsers, setErpUsers] = useState<ErpUser[]>([]);

  const bn = lang === 'bn';

  const loadBootstrapData = useCallback(async () => {
    try {
      const res = await fetch('/api/erp/bootstrap', { cache: 'no-store' });
      if (res.status === 401) {
        setUser(null);
        return;
      }
      const json = (await res.json()) as {
        ok?: boolean;
        user?: AuthenticatedErpUser;
        data?: {
          businesses: ErpBusiness[];
          accounts: ErpAccount[];
          journalEntries: ErpJournalEntry[];
          inventoryItems: ErpInventoryItem[];
          stockMovements: ErpStockMovement[];
          stakeholders: ErpStakeholder[];
          poultryBatches: ErpPoultryBatch[];
          livestockRecords: ErpLivestockRecord[];
          fishCycles: ErpFishCycle[];
          transportOps: ErpTransportOp[];
          notifications: ErpNotification[];
          auditLogs: ErpAuditLog[];
          erpUsers: ErpUser[];
        };
      };
      if (json.ok && json.data) {
        setBusinesses(json.data.businesses || []);
        setAccounts(json.data.accounts || []);
        setJournalEntries(json.data.journalEntries || []);
        setInventoryItems(json.data.inventoryItems || []);
        setStockMovements(json.data.stockMovements || []);
        setStakeholders(json.data.stakeholders || []);
        setPoultryBatches(json.data.poultryBatches || []);
        setLivestockRecords(json.data.livestockRecords || []);
        setFishCycles(json.data.fishCycles || []);
        setTransportOps(json.data.transportOps || []);
        setNotifications(json.data.notifications || []);
        setAuditLogs(json.data.auditLogs || []);
        setErpUsers(json.data.erpUsers || []);
        if (json.data.businesses?.length > 0) {
          setQuickBizId((prev) => prev || json.data!.businesses[0].id);
        }
      }
    } catch (err) {
      console.error('MongoDB bootstrap fetch error:', err);
    } finally {
      setSeedingData(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/status', { cache: 'no-store' });
        const json = (await res.json()) as {
          ok?: boolean;
          hasSuperAdmin?: boolean;
          user?: AuthenticatedErpUser | null;
          error?: string;
        };
        if (!active) return;
        setHasSuperAdmin(Boolean(json.hasSuperAdmin));
        if (json.user) {
          setUser(json.user);
          setUserRole(json.user.role);
          setAssignedBusinessFilter(json.user.assignedBusinesses || 'ALL');
        } else {
          setUser(null);
        }
        if (json.error) setAuthError(json.error);
      } catch {
        if (active) setAuthError('Unable to reach MongoDB authentication service.');
      } finally {
        if (active) setAuthReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', darkMode);
    }
  }, [darkMode]);

  useEffect(() => {
    if (!authReady || !user) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadBootstrapData();
    });
    const unsubscribe = subscribeErpDataChanged(() => {
      if (active) void loadBootstrapData();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [authReady, user, loadBootstrapData]);

  const handleOpenAuthModal = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/status', { cache: 'no-store' });
      const json = (await res.json()) as { hasSuperAdmin?: boolean; user?: AuthenticatedErpUser | null };
      setHasSuperAdmin(Boolean(json.hasSuperAdmin));
      if (json.user) {
        setUser(json.user);
        setUserRole(json.user.role);
        setAssignedBusinessFilter(json.user.assignedBusinesses || 'ALL');
        setActiveNav('dashboard');
      } else {
        setShowAuthModal(true);
      }
    } catch {
      setShowAuthModal(true);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setBusinesses([]);
    setAccounts([]);
    setJournalEntries([]);
    setInventoryItems([]);
    setStockMovements([]);
    setStakeholders([]);
    setPoultryBatches([]);
    setLivestockRecords([]);
    setFishCycles([]);
    setTransportOps([]);
    setNotifications([]);
    setAuditLogs([]);
    setErpUsers([]);
    setActiveNav('dashboard');
  };

  const handleDashboardQuickTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dashboardQuickTxModal) return;
    const isSale = dashboardQuickTxModal === 'sale';
    const targetBiz = businesses.find((b) => b.id === quickBizId) || businesses[0];
    const cashOrBank =
      accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
    const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
    const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];

    if (!targetBiz || !cashOrBank || !revAcc || !expAcc) return;

    await postDoubleEntryTransaction(
      {
        referenceNo: `JV-${Date.now().toString().slice(-5)}`,
        date: quickDate || new Date().toISOString().split('T')[0],
        businessId: targetBiz.id,
        businessName: targetBiz.name,
        transactionType: isSale ? 'sale' : 'expense',
        category: quickCategory || (isSale ? 'পণ্য বিক্রি (Sales)' : 'খামার খরচ (Expense)'),
        description: `${targetBiz.nameBn || targetBiz.name} — ${quickCategory}`,
        debitAccountId: isSale ? cashOrBank.id : expAcc.id,
        debitAccountName: isSale ? cashOrBank.name : expAcc.name,
        creditAccountId: isSale ? revAcc.id : cashOrBank.id,
        creditAccountName: isSale ? revAcc.name : cashOrBank.name,
        amount: Number(quickAmount),
        paymentStatus: Number(quickDue) > 0 ? 'partial' : 'paid',
        dueAmount: Number(quickDue) || 0,
        counterpartyName: quickParty || (isSale ? 'পাইকারি ক্রেতা' : 'সাপ্লায়ার'),
      },
      accounts,
      user.ownerId,
      user.email || 'admin@krishivumi.bd'
    );

    setDashboardQuickTxModal(null);
    setQuickToast(
      bn
        ? `${targetBiz.nameBn || targetBiz.name}-এ ${isSale ? 'বিক্রি/আয়' : 'খরচ'} বাবদ ${formatBDT(
            Number(quickAmount)
          )} সফলভাবে সংরক্ষিত হয়েছে।`
        : `${isSale ? 'Revenue' : 'Expense'} of ${formatBDT(Number(quickAmount))} posted to ${
            targetBiz.name
          }.`
    );
    setTimeout(() => setQuickToast(null), 5000);
  };

  // RBAC-filtered businesses
  const accessibleBusinesses = useMemo(() => {
    if (userRole === 'super_admin' || userRole === 'super_manager' || assignedBusinessFilter === 'ALL') {
      return businesses;
    }
    const allowed = assignedBusinessFilter
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return businesses.filter((b) => allowed.includes(b.id));
  }, [businesses, userRole, assignedBusinessFilter]);

  // Journals filtered by selected 12-Month Period
  const monthFilteredJournals = useMemo(() => {
    return journalEntries.filter((j) => matchesMonthFilter(j.date, monthFilter));
  }, [journalEntries, monthFilter]);

  // Calculate per-business and company-wide KPIs from real database records (for selected month)
  const businessMetricsMap = useMemo(() => {
    const map: Record<string, { revenue: number; expense: number; profit: number; due: number }> =
      {};
    for (const b of businesses) {
      map[b.id] = { revenue: 0, expense: 0, profit: 0, due: 0 };
    }
    for (const j of monthFilteredJournals) {
      if (j.status !== 'posted') continue;
      const isRev = j.transactionType === 'sale' || j.transactionType === 'income';
      const isExp =
        j.transactionType === 'expense' ||
        j.transactionType === 'purchase' ||
        j.transactionType === 'payroll';
      if (map[j.businessId]) {
        if (isRev) map[j.businessId].revenue += j.amount;
        if (isExp) map[j.businessId].expense += j.amount;
        map[j.businessId].due += j.dueAmount || 0;
        map[j.businessId].profit = map[j.businessId].revenue - map[j.businessId].expense;
      }
    }
    return map;
  }, [businesses, monthFilteredJournals]);

  const kpiTotals = useMemo(() => {
    const postedJournals = monthFilteredJournals.filter((j) => {
      if (j.status !== 'posted') return false;
      if (userRole !== 'super_admin' && assignedBusinessFilter !== 'ALL') {
        return j.businessId === assignedBusinessFilter;
      }
      return true;
    });

    const totalRevenue = postedJournals
      .filter((j) => j.transactionType === 'sale' || j.transactionType === 'income')
      .reduce((s, j) => s + j.amount, 0);

    const totalExpenses = postedJournals
      .filter(
        (j) =>
          j.transactionType === 'expense' ||
          j.transactionType === 'purchase' ||
          j.transactionType === 'payroll'
      )
      .reduce((s, j) => s + j.amount, 0);

    const netProfit = totalRevenue - totalExpenses;

    const cashBalance = accounts
      .filter((a) => a.subType === 'cash')
      .reduce((s, a) => s + a.balance, 0);

    const bankBalance = accounts
      .filter((a) => a.subType === 'bank')
      .reduce((s, a) => s + a.balance, 0);

    const totalEmployees = stakeholders.filter(
      (s) => s.stakeholderType === 'employee' && s.status === 'active'
    ).length;

    const outstandingReceivables = postedJournals.reduce((s, j) => s + (j.dueAmount || 0), 0);

    return {
      totalBusinesses: accessibleBusinesses.filter((b) => b.status !== 'archived').length,
      totalRevenue,
      totalExpenses,
      netProfit,
      cashBalance,
      bankBalance,
      totalEmployees,
      outstandingReceivables,
    };
  }, [
    monthFilteredJournals,
    accounts,
    stakeholders,
    accessibleBusinesses,
    userRole,
    assignedBusinessFilter,
  ]);

  const filteredBusinesses = useMemo(() => {
    return accessibleBusinesses
      .filter((b) => {
        if (b.status === 'archived') return false;
        if (bizStatusFilter !== 'all' && b.status !== bizStatusFilter) return false;
        if (globalSearch.trim()) {
          const q = globalSearch.toLowerCase();
          return (
            b.name.toLowerCase().includes(q) ||
            (b.nameBn && b.nameBn.toLowerCase().includes(q)) ||
            b.code.toLowerCase().includes(q) ||
            b.category.toLowerCase().includes(q) ||
            b.location.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const ma = businessMetricsMap[a.id] || { revenue: 0, profit: 0 };
        const mb = businessMetricsMap[b.id] || { revenue: 0, profit: 0 };
        if (bizSortBy === 'revenue') return mb.revenue - ma.revenue;
        if (bizSortBy === 'profit') return mb.profit - ma.profit;
        return a.name.localeCompare(b.name);
      });
  }, [accessibleBusinesses, bizStatusFilter, globalSearch, bizSortBy, businessMetricsMap]);

  const totalPages = Math.max(1, Math.ceil(filteredBusinesses.length / pageSize));
  const paginatedBusinesses = filteredBusinesses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const businessChartData = useMemo(() => {
    return accessibleBusinesses.map((b) => {
      const m = businessMetricsMap[b.id] || { revenue: 0, expense: 0, profit: 0 };
      const label = bn
        ? b.nameBn || b.name.replace(' Business', '').replace(' Farming', '')
        : b.name.replace(' Business', '').replace(' Farming', '');
      return {
        name: label,
        [bn ? 'আয়' : 'Revenue']: m.revenue,
        [bn ? 'খরচ' : 'Expense']: m.expense,
        [bn ? 'নিট লাভ' : 'Net Profit']: m.profit,
      };
    });
  }, [accessibleBusinesses, businessMetricsMap, bn]);

  const cashFlowChartData = useMemo(() => {
    const byDate: Record<string, Record<string, string | number>> = {};
    const inflowKey = bn ? 'জমা' : 'Inflow';
    const outflowKey = bn ? 'খরচ' : 'Outflow';

    for (const j of monthFilteredJournals) {
      if (j.status !== 'posted') continue;
      const d = j.date || '2026-11-01';
      if (!byDate[d]) byDate[d] = { date: d.slice(5), [inflowKey]: 0, [outflowKey]: 0 };
      if (j.transactionType === 'sale' || j.transactionType === 'income') {
        byDate[d][inflowKey] = Number(byDate[d][inflowKey]) + j.amount;
      } else if (
        j.transactionType === 'expense' ||
        j.transactionType === 'purchase' ||
        j.transactionType === 'payroll'
      ) {
        byDate[d][outflowKey] = Number(byDate[d][outflowKey]) + j.amount;
      }
    }
    return Object.values(byDate).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [monthFilteredJournals, bn]);

  const renderBusinessIcon = (iconName: string, className = 'h-4 w-4') => {
    switch (iconName) {
      case 'Bird':
        return <Bird className={className} />;
      case 'Beef':
        return <Beef className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'Fish':
        return <Fish className={className} />;
      case 'Truck':
        return <Truck className={className} />;
      case 'Factory':
        return <Factory className={className} />;
      case 'Wheat':
        return <Wheat className={className} />;
      case 'Store':
        return <Store className={className} />;
      default:
        return <Building2 className={className} />;
    }
  };

  if (!user || activeNav === 'public_site') {
    return (
      <div>
        {authError && (
          <div className="bg-red-600 text-white text-xs font-medium px-6 py-2.5 flex items-center justify-between">
            <span>Authentication Notice: {authError}</span>
            <button type="button" onClick={() => setAuthError(null)} className="underline">
              Dismiss
            </button>
          </div>
        )}
        <PublicWebsiteView
          onAccessErpConsole={() => {
            if (user) {
              setActiveNav('dashboard');
            } else {
              handleOpenAuthModal();
            }
          }}
          isSigningIn={isSigningIn}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          lang={lang}
          onToggleLang={() => setLang(lang === 'en' ? 'bn' : 'en')}
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          hasSuperAdmin={hasSuperAdmin}
          lang={lang}
          onAuthenticated={(loggedInUser) => {
            setUser(loggedInUser);
            setHasSuperAdmin(true);
            setUserRole(loggedInUser.role);
            setAssignedBusinessFilter(loggedInUser.assignedBusinesses || 'ALL');
            setShowAuthModal(false);
            setActiveNav('dashboard');
          }}
        />
      </div>
    );
  }

  const activeBusinessObj =
    businesses.find((b) => b.id === selectedBusinessId) || businesses[0] || null;
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  const centralNavItems = [
    {
      id: 'accounting' as const,
      label: bn ? 'অ্যাকাউন্টিং ও খতিয়ান' : 'Accounting & Ledger',
      Icon: Landmark,
      restricted: userRole === 'employee',
    },
    {
      id: 'inventory' as const,
      label: bn ? 'গোডাউন ও স্টক' : 'Inventory & Stock',
      Icon: Package,
      restricted: false,
    },
    {
      id: 'stakeholders' as const,
      label: bn ? 'কর্মী, বেতন ও বাকি' : 'HR, Payroll & Due',
      Icon: Users,
      restricted: false,
    },
    {
      id: 'reports' as const,
      label: bn ? 'লাভ-ক্ষতি রিপোর্ট' : 'Financial Reports',
      Icon: FileBarChart,
      restricted: userRole === 'employee',
    },
    {
      id: 'security' as const,
      label: bn ? 'ইউজার ও ম্যানেজার দল' : 'Team & Access Control',
      Icon: Lock,
      restricted:
        user.role !== 'super_admin' &&
        user.role !== 'super_manager' &&
        userRole !== 'super_admin' &&
        userRole !== 'super_manager',
    },
  ].filter((item) => !item.restricted);

  const activePageTitle = (() => {
    if (activeNav === 'dashboard') return bn ? 'এক্সিকিউটিভ ড্যাশবোর্ড' : 'Executive Dashboard';
    if (activeNav === 'business_detail' && activeBusinessObj) {
      return bn ? activeBusinessObj.nameBn || activeBusinessObj.name : activeBusinessObj.name;
    }
    const found = centralNavItems.find((n) => n.id === activeNav);
    return found ? found.label : 'KrishiVumi ERP';
  })();

  const renderSidebarContent = (isMobile = false) => {
    const expanded = isMobile ? true : sidebarOpen;
    return (
      <div className="flex flex-col justify-between h-full">
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between gap-2 px-1">
            {expanded ? (
              <BrandLogo
                size="sm"
                subtitle={bn ? 'মাল্টি-বিজনেস ইআরপি' : 'AGRO-INDUSTRIAL ERP'}
              />
            ) : (
              <BrandLogo compact size="sm" />
            )}

            {isMobile ? (
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={bn ? 'সাইডবার ছোট/বড় করুন' : 'Toggle Sidebar'}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          <nav className="space-y-5">
            {/* Overview */}
            <div className="space-y-1">
              {expanded && (
                <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {bn ? 'ওভারভিউ' : 'Overview'}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveNav('dashboard');
                  setMobileDrawerOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  activeNav === 'dashboard'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {expanded && (
                  <span className="truncate">{bn ? 'মূল ড্যাশবোর্ড' : 'Executive Overview'}</span>
                )}
              </button>
            </div>

            {/* Business Units */}
            <div className="space-y-1.5">
              {expanded && (
                <div className="px-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>{bn ? 'ব্যবসায়িক ইউনিট' : 'Business Units'}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {accessibleBusinesses.filter((b) => b.status !== 'archived').length}
                  </span>
                </div>
              )}

              <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
                {accessibleBusinesses
                  .filter((b) => b.status !== 'archived')
                  .map((biz) => {
                    const isSelected =
                      activeNav === 'business_detail' && selectedBusinessId === biz.id;
                    const accent = getBusinessAccent(biz.templateType);
                    return (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => {
                          setSelectedBusinessId(biz.id);
                          setActiveNav('business_detail');
                          setMobileDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold ring-1 ring-inset ring-emerald-500/30'
                            : 'text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`h-7 w-7 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${accent.iconBg}`}
                          >
                            {renderBusinessIcon(biz.iconName, 'h-3.5 w-3.5')}
                          </div>
                          {expanded && (
                            <div className="text-left min-w-0">
                              <div className="truncate leading-tight">
                                {bn ? biz.nameBn || biz.name : biz.name}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                                {biz.code}
                              </div>
                            </div>
                          )}
                        </div>
                        {expanded && (
                          <ChevronRight
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isSelected ? 'text-emerald-600 opacity-100' : 'opacity-40'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
              </div>

              {expanded && userRole === 'super_admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBusinessWizard(true);
                    setMobileDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-dashed border-emerald-300 dark:border-emerald-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {bn ? 'নতুন ব্যবসা যোগ করুন' : 'Add Business Unit'}
                  </span>
                </button>
              )}
            </div>

            {/* Central ERP Modules */}
            <div className="space-y-1">
              {expanded && (
                <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {bn ? 'কেন্দ্রীয় নিয়ন্ত্রণ' : 'Finance & Control'}
                </div>
              )}

              {centralNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveNav(item.id);
                    setMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    activeNav === item.id
                      ? 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <item.Icon className="h-4 w-4 shrink-0" />
                  {expanded && <span className="truncate">{item.label}</span>}
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/50">
          {expanded && (
            <button
              type="button"
              onClick={() => {
                setActiveNav('public_site');
                setMobileDrawerOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
            >
              <span>{bn ? 'পাবলিক ওয়েবসাইট' : 'Public Website'}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {expanded && <span>{bn ? 'লগ আউট' : 'Sign Out'}</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 no-print sticky top-0 h-screen ${
          sidebarOpen ? 'w-68' : 'w-[74px]'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full shadow-2xl">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Enterprise Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200/90 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open Navigation"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Current Section Breadcrumb Pill */}
            <div className="hidden xl:flex items-center gap-2 text-xs shrink-0 pr-2 border-r border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                {activePageTitle}
              </span>
            </div>

            {/* Global Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={
                  bn
                    ? 'ব্যবসা, কোড বা লোকেশন খুঁজুন...'
                    : 'Search business unit, code, or location...'
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-600 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Guide Toggle */}
            <button
              type="button"
              onClick={() => setShowOnboardingGuide(!showOnboardingGuide)}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                showOnboardingGuide
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>{bn ? 'গাইড' : 'Guide'}</span>
            </button>

            {/* Language Selector */}
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap transition-colors"
              title="Switch Language"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{bn ? 'বাংলা' : 'EN'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title={bn ? 'ডার্ক / লাইট মোড' : 'Toggle Theme'}
            >
              {darkMode ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {bn
                        ? `জরুরি অ্যালার্ট (${unreadNotifCount}টি নতুন)`
                        : `System Alerts (${unreadNotifCount} unread)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNotificationsDropdown(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        {bn ? 'কোনো নতুন অ্যালার্ট নেই' : 'All caught up — no alerts'}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 rounded-xl border text-xs space-y-1 transition-colors ${
                            n.isRead
                              ? 'border-slate-100 dark:border-slate-800 opacity-60'
                              : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {n.title}
                            </span>
                            {!n.isRead && (
                              <button
                                type="button"
                                onClick={() => markNotificationAsRead(n)}
                                className="text-[11px] font-semibold text-emerald-600 hover:underline shrink-0"
                              >
                                {bn ? 'দেখেছি' : 'Mark read'}
                              </button>
                            )}
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            <div className="hidden md:flex items-center gap-2.5 pl-2.5 ml-1 border-l border-slate-200 dark:border-slate-800">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs font-extrabold shadow-xs">
                {(user.displayName || user.email || 'A').slice(0, 1).toUpperCase()}
              </div>
              <div className="text-xs leading-tight max-w-[140px] truncate">
                <div className="font-bold text-slate-900 dark:text-white truncate">
                  {user.displayName || (bn ? 'অ্যাডমিন' : 'Admin')}
                </div>
                <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide truncate">
                  {userRole.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Viewport Content */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-7">
          {seedingData && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 animate-spin shrink-0" />
              <span>
                {bn
                  ? 'আপনার ব্যবসায়িক ইউনিট ও কেন্দ্রীয় হিসাব সেটআপ হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...'
                  : 'Initializing enterprise business units and chart of accounts...'}
              </span>
            </div>
          )}

          {quickToast && (
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/70 px-5 py-3.5 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{quickToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setQuickToast(null)}
                className="text-emerald-700 dark:text-emerald-300 hover:underline shrink-0 ml-4"
              >
                {bn ? 'বন্ধ করুন' : 'Dismiss'}
              </button>
            </div>
          )}

          {/* Clean Quick-Start Guide Strip (Dismissible) */}
          {showOnboardingGuide && activeNav === 'dashboard' && (
            <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/70 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-emerald-600" />
                    <span>
                      {bn ? 'দ্রুত ব্যবহারের নির্দেশিকা' : 'Quick Workspace Guide'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {bn
                      ? 'প্রতিটি ব্যবসার উৎপাদন, বেচা-কেনা, স্টক এবং লাভ-ক্ষতির হিসাব এক জায়গা থেকে পরিচালনা করুন।'
                      : 'Manage daily farm operations, treasury entries, inventory movements, and consolidated P&L from one hub.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOnboardingGuide(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  aria-label="Hide guide"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    step: '01',
                    title: bn ? 'ব্যবসায়িক ইউনিট নির্বাচন করুন' : 'Select or Launch a Business',
                    desc: bn
                      ? 'নিচের যেকোনো কার্ডে ক্লিক করে ওই খামার বা পরিবহন ইউনিটের নিজস্ব ওয়ার্কস্পেসে প্রবেশ করুন।'
                      : 'Click any business card below to open its dedicated batch, livestock, pond, or fleet workspace.',
                  },
                  {
                    step: '02',
                    title: bn ? 'দৈনিক বিক্রি ও খরচ এন্ট্রি দিন' : 'Post Daily Sales & Expenses',
                    desc: bn
                      ? 'কুইক অ্যাকশন বার থেকে ১ ক্লিকে যেকোনো ব্যবসার আয় বা খরচ কেন্দ্রীয় খতিয়ানে যুক্ত করুন।'
                      : 'Use the Quick Actions bar to record sales, procurement, or expenses directly into the ledger.',
                  },
                  {
                    step: '03',
                    title: bn ? 'তাৎক্ষণিক লাভ-ক্ষতি ও ক্যাশ দেখুন' : 'Monitor Real-Time P&L',
                    desc: bn
                      ? 'প্রতিটি এন্ট্রির সাথে সাথে নিট মুনাফা, ক্যাশ, ব্যাংক ব্যালেন্স এবং বাকি হিসাব স্বয়ংক্রিয়ভাবে আপডেট হয়।'
                      : 'Consolidated revenue, expenses, cash/bank liquidity, and receivables update automatically.',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-md bg-emerald-600 text-white font-mono text-[10px] font-bold">
                        {item.step}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 1: MAIN EXECUTIVE DASHBOARD */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6">
              {/* 12-Month Period Filter Bar */}
              <MonthFilterBar value={monthFilter} onChange={setMonthFilter} bn={bn} />

              {/* Executive Command Strip */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {bn ? 'কেন্দ্রীয় কমান্ড সেন্টার' : 'EXECUTIVE COMMAND CENTER'}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {bn ? 'দৈনন্দিন পরিচালনা ও দ্রুত হিসাব' : 'Consolidated Operations & Quick Actions'}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {bn
                      ? 'যেকোনো ব্যবসার বিক্রি, খরচ বা নতুন ইউনিট ১ ক্লিকে পরিচালনা করুন'
                      : 'Record ledger-balanced transactions, provision new business units, or inspect consolidated P&L.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickBizId(businesses[0]?.id || '');
                      setQuickCategory(bn ? 'পণ্য ও খামার বিক্রি' : 'Farm & Product Sales');
                      setDashboardQuickTxModal('sale');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{bn ? 'বিক্রি / আয় যোগ করুন' : 'Record Sale'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickBizId(businesses[0]?.id || '');
                      setQuickCategory(bn ? 'খাবার, ওষুধ ও খামার খরচ' : 'Feed, Medicine & Operating Cost');
                      setDashboardQuickTxModal('expense');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{bn ? 'খরচ যোগ করুন' : 'Record Expense'}</span>
                  </button>

                  {userRole === 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => setShowAddBusinessWizard(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      <Building2 className="h-4 w-4" />
                      <span>{bn ? 'নতুন ব্যবসা খুলুন' : 'New Business'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveNav('reports')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
                  >
                    <FileBarChart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{bn ? 'লাভ-ক্ষতি রিপোর্ট' : 'P&L Report'}</span>
                  </button>
                </div>
              </div>

              {/* SECTION 1: BUSINESS PORTFOLIO GRID */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {bn
                        ? `চলমান ব্যবসায়িক ইউনিট (${filteredBusinesses.length})`
                        : `Active Business Portfolio (${filteredBusinesses.length})`}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {bn
                        ? 'যেকোনো কার্ডে ক্লিক করে ওই ব্যবসার অপারেশনাল ড্যাশবোর্ডে প্রবেশ করুন'
                        : 'Select any business unit to manage batches, livestock tags, ponds, or fleet trips.'}
                    </p>
                  </div>

                  {/* Filter & Sort Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={bizStatusFilter}
                      onChange={(e) => {
                        setBizStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
                        setCurrentPage(1);
                      }}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <option value="all">{bn ? 'সব স্ট্যাটাস' : 'All Status'}</option>
                      <option value="active">{bn ? 'শুধু চালু' : 'Active Only'}</option>
                      <option value="inactive">{bn ? 'বন্ধ' : 'Inactive'}</option>
                    </select>

                    <select
                      value={bizSortBy}
                      onChange={(e) =>
                        setBizSortBy(e.target.value as 'name' | 'revenue' | 'profit')
                      }
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <option value="revenue">{bn ? 'সর্বোচ্চ আয়' : 'Sort: Revenue'}</option>
                      <option value="profit">{bn ? 'সর্বোচ্চ লাভ' : 'Sort: Net Profit'}</option>
                      <option value="name">{bn ? 'নাম অনুযায়ী' : 'Sort: Name'}</option>
                    </select>
                  </div>
                </div>

                {/* Business Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {paginatedBusinesses.map((biz) => {
                    const metrics = businessMetricsMap[biz.id] || {
                      revenue: 0,
                      expense: 0,
                      profit: 0,
                      due: 0,
                    };
                    const accent = getBusinessAccent(biz.templateType);
                    return (
                      <div
                        key={biz.id}
                        onClick={() => {
                          setSelectedBusinessId(biz.id);
                          setActiveNav('business_detail');
                        }}
                        className="group relative cursor-pointer rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-emerald-500/70 hover:shadow-lg hover:shadow-emerald-950/5 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                      >
                        {/* Subtle Top Accent Bar */}
                        <div className={`h-1 w-full ${accent.bar}`} />

                        <div className="p-5 sm:p-6 space-y-5 flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`h-11 w-11 rounded-xl flex items-center justify-center ring-1 ring-inset shrink-0 ${accent.iconBg}`}
                                >
                                  {renderBusinessIcon(biz.iconName, 'h-5 w-5')}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                                    {bn ? biz.nameBn || biz.name : biz.name}
                                  </h3>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {biz.location} · <span className="font-mono">{biz.code}</span>
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                                  biz.status === 'active'
                                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                                    : 'text-amber-700 dark:text-amber-400 bg-amber-500/10'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    biz.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                />
                                {biz.status === 'active'
                                  ? bn
                                    ? 'চালু'
                                    : 'Active'
                                  : bn
                                  ? 'বন্ধ'
                                  : 'Paused'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {biz.description}
                            </p>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {bn ? 'মোট বিক্রি' : 'Revenue'}
                                </div>
                                <div className="font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                                  {formatBDT(metrics.revenue)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {bn ? 'মোট খরচ' : 'Expense'}
                                </div>
                                <div className="font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                                  {formatBDT(metrics.expense)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {bn ? 'নিট লাভ' : 'Net Profit'}
                                </div>
                                <div
                                  className={`font-mono font-extrabold tabular-nums mt-0.5 ${
                                    metrics.profit >= 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {formatBDT(metrics.profit)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              <span className="inline-flex items-center gap-1.5">
                                {bn ? 'ওয়ার্কস্পেস খুলুন' : 'Open Workspace'}
                              </span>
                              <div className="flex items-center gap-2">
                                {metrics.due > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[10px]">
                                    {bn ? 'বাকি:' : 'Due:'} {formatCompactBDT(metrics.due)}
                                  </span>
                                )}
                                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Provision New Business Card */}
                  {userRole === 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => setShowAddBusinessWizard(true)}
                      className="group rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white/60 dark:bg-slate-900/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 p-6 transition-all flex flex-col items-center justify-center text-center min-h-[235px] space-y-3"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <Plus className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {bn ? 'নতুন ব্যবসা যোগ করুন' : 'Provision New Business'}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                          {bn
                            ? 'ডেইরি, ফিড মিল, রাইস ট্রেডিং বা যেকোনো নতুন ব্যবসা ১ ক্লিকে চালু করুন'
                            : 'Launch Dairy Products, Feed Mills, Rice Trading, or custom operations in seconds.'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <span>{bn ? 'উইজার্ড শুরু করুন' : 'Launch Wizard'}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold disabled:opacity-40"
                    >
                      {bn ? 'পূর্ববর্তী' : 'Prev'}
                    </button>
                    <span className="text-xs font-mono text-slate-500">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold disabled:opacity-40"
                    >
                      {bn ? 'পরবর্তী' : 'Next'}
                    </button>
                  </div>
                )}
              </section>

              {/* SECTION 2: 8 EXECUTIVE FINANCIAL KPIs */}
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {bn ? 'সমন্বিত আর্থিক সারসংক্ষেপ' : 'Consolidated Financial Overview'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {bn
                      ? 'সবগুলো ব্যবসার মোট বিক্রি, ব্যয়, মুনাফা ও ক্যাশ পজিশন'
                      : 'Real-time treasury, profit & loss, and operational headcount across active units'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      label: bn ? 'মোট চালু ব্যবসা' : 'Active Businesses',
                      value: `${kpiTotals.totalBusinesses} ${bn ? 'টি' : 'Units'}`,
                      sub: bn ? 'কেন্দ্রীয় সিস্টেমে সংযুক্ত' : 'Connected to central ledger',
                      Icon: Building2,
                      tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    },
                    {
                      label: bn ? 'সর্বমোট বিক্রি ও আয়' : 'Total Revenue',
                      value:
                        userRole === 'employee'
                          ? bn
                            ? 'সংরক্ষিত'
                            : 'Restricted'
                          : formatBDT(kpiTotals.totalRevenue),
                      sub: bn ? 'সব ব্যবসার সমন্বিত আয়' : 'Gross sales across all units',
                      Icon: TrendingUp,
                      tone: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
                    },
                    {
                      label: bn ? 'সর্বমোট খরচ' : 'Total Expenses',
                      value:
                        userRole === 'employee'
                          ? bn
                            ? 'সংরক্ষিত'
                            : 'Restricted'
                          : formatBDT(kpiTotals.totalExpenses),
                      sub: bn ? 'খাবার, ওষুধ, ডিজেল ও বেতন' : 'Feed, vet, fuel & payroll',
                      Icon: TrendingDown,
                      tone: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
                    },
                    {
                      label: bn ? 'সর্বমোট নিট মুনাফা' : 'Consolidated Net Profit',
                      value:
                        userRole === 'employee'
                          ? bn
                            ? 'সংরক্ষিত'
                            : 'Restricted'
                          : formatBDT(kpiTotals.netProfit),
                      sub: bn ? 'আয় থেকে সব খরচ বাদ দিয়ে' : 'Net operating margin',
                      Icon: Coins,
                      tone:
                        kpiTotals.netProfit >= 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                      valueColor:
                        kpiTotals.netProfit >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400',
                    },
                    {
                      label: bn ? 'ক্যাশ তহবিল' : 'Cash in Hand',
                      value:
                        userRole === 'employee'
                          ? bn
                            ? 'সংরক্ষিত'
                            : 'Restricted'
                          : formatBDT(kpiTotals.cashBalance),
                      sub: bn ? 'অফিস ও খামারের নগদ টাকা' : 'Vault & farm petty cash',
                      Icon: Banknote,
                      tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
                    },
                    {
                      label: bn ? 'ব্যাংক ব্যালেন্স' : 'Bank Balance',
                      value:
                        userRole === 'employee'
                          ? bn
                            ? 'সংরক্ষিত'
                            : 'Restricted'
                          : formatBDT(kpiTotals.bankBalance),
                      sub: bn ? 'কর্পোরেট ব্যাংক একাউন্ট' : 'Islami & BRAC Bank accounts',
                      Icon: Landmark,
                      tone: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                    },
                    {
                      label: bn ? 'মোট কর্মচারী' : 'Active Workforce',
                      value: `${kpiTotals.totalEmployees} ${bn ? 'জন' : 'Staff'}`,
                      sub: bn ? 'ম্যানেজার, ডাক্তার ও কর্মী' : 'Managers, vets & farm crew',
                      Icon: Users,
                      tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
                    },
                    {
                      label: bn ? 'পাওনা / বাকি টাকা' : 'Receivables (Due)',
                      value: formatBDT(kpiTotals.outstandingReceivables),
                      sub: bn ? 'পাইকার ও ক্রেতাদের কাছে পাওনা' : 'Pending buyer settlements',
                      Icon: Clock,
                      tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      valueColor: 'text-amber-600 dark:text-amber-400',
                    },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {kpi.label}
                        </span>
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${kpi.tone}`}
                        >
                          <kpi.Icon className="h-4 w-4" />
                        </div>
                      </div>
                      <div
                        className={`mt-3 text-xl sm:text-2xl font-extrabold font-mono tabular-nums ${
                          kpi.valueColor || 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {kpi.value}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {kpi.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* SECTION 3: EXECUTIVE ANALYTICS CHARTS */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {bn
                          ? 'ব্যবসা-ভিত্তিক আয়, ব্যয় ও মুনাফা'
                          : 'Business-Wise Revenue, Cost & Profit'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {bn
                          ? 'প্রতিটি খামার ও পরিবহন ইউনিটের তুলনামূলক পারফরম্যান্স'
                          : 'Comparative financial performance across active units'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold font-mono text-slate-600 dark:text-slate-300">
                      BDT (৳)
                    </span>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={businessChartData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.18} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(v) => formatCompactBDT(Number(v))}
                          axisLine={false}
                          tickLine={false}
                          width={58}
                        />
                        <Tooltip
                          formatter={(val: unknown) => formatBDT(Number(val))}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '12px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                        <Bar
                          dataKey={bn ? 'আয়' : 'Revenue'}
                          fill="#059669"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey={bn ? 'খরচ' : 'Expense'}
                          fill="#64748b"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey={bn ? 'নিট লাভ' : 'Net Profit'}
                          fill="#0ea5e9"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {bn ? 'দৈনিক ক্যাশ-ফ্লো (জমা বনাম খরচ)' : 'Daily Treasury Cash Flow'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {bn
                          ? 'তারিখ অনুযায়ী প্রতিষ্ঠানে নগদ আগমন ও ব্যয়ের ধারা'
                          : 'Daily inflow vs outflow trajectory across all ledger entries'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      {bn ? 'রিয়েল-টাইম' : 'Live Ledger'}
                    </span>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashFlowChartData}>
                        <defs>
                          <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e11d48" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.18} vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(v) => formatCompactBDT(Number(v))}
                          axisLine={false}
                          tickLine={false}
                          width={58}
                        />
                        <Tooltip
                          formatter={(val: unknown) => formatBDT(Number(val))}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '12px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                        <Area
                          type="monotone"
                          dataKey={bn ? 'জমা' : 'Inflow'}
                          stroke="#059669"
                          strokeWidth={2}
                          fill="url(#inflowGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey={bn ? 'খরচ' : 'Outflow'}
                          stroke="#e11d48"
                          strokeWidth={2}
                          fill="url(#outflowGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* VIEW 2: DEDICATED BUSINESS-SPECIFIC OPERATIONAL WORKSPACE */}
          {activeNav === 'business_detail' && activeBusinessObj && (
            <SpecializedModulesView
              activeBusiness={activeBusinessObj}
              poultryBatches={poultryBatches}
              livestockRecords={livestockRecords}
              fishCycles={fishCycles}
              transportOps={transportOps}
              journalEntries={journalEntries}
              inventoryItems={inventoryItems}
              accounts={accounts}
              auditLogs={auditLogs}
              ownerId={user.ownerId}
              actorEmail={user.email || 'admin@krishivumi.bd'}
              userRole={userRole}
              onBackToDashboard={() => setActiveNav('dashboard')}
              monthFilter={monthFilter}
              onChangeMonthFilter={setMonthFilter}
            />
          )}

          {/* VIEW 3: CENTRAL ACCOUNTING, INVENTORY, STAKEHOLDERS, REPORTS & RBAC */}
          {(activeNav === 'accounting' ||
            activeNav === 'inventory' ||
            activeNav === 'stakeholders' ||
            activeNav === 'reports' ||
            (activeNav === 'security' &&
              (user.role === 'super_admin' ||
                user.role === 'super_manager' ||
                userRole === 'super_admin' ||
                userRole === 'super_manager'))) && (
            <CentralAccountingAndInventoryView
              activeSection={activeNav}
              businesses={accessibleBusinesses}
              allBusinesses={businesses}
              accounts={accounts}
              journalEntries={journalEntries}
              inventoryItems={inventoryItems}
              stockMovements={stockMovements}
              stakeholders={stakeholders}
              auditLogs={auditLogs}
              erpUsers={erpUsers}
              poultryBatches={poultryBatches}
              livestockRecords={livestockRecords}
              fishCycles={fishCycles}
              transportOps={transportOps}
              ownerId={user.ownerId}
              actorEmail={user.email || 'admin@krishivumi.bd'}
              userRole={userRole}
              assignedBusinessFilter={assignedBusinessFilter}
              monthFilter={monthFilter}
              onChangeMonthFilter={setMonthFilter}
              onChangeRoleSimulation={(role, bizId) => {
                if (user.role !== 'super_admin') return;
                setUserRole(role);
                setAssignedBusinessFilter(bizId);
              }}
            />
          )}
        </main>
      </div>

      {/* Dashboard Quick Sale / Expense Modal */}
      {dashboardQuickTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    dashboardQuickTxModal === 'sale'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {dashboardQuickTxModal === 'sale'
                    ? bn
                      ? 'নতুন বিক্রি / আয় যোগ করুন'
                      : 'Record Sale / Income'
                    : bn
                    ? 'নতুন খরচ যোগ করুন'
                    : 'Record Operating Expense'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDashboardQuickTxModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDashboardQuickTxSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'ব্যবসায়িক ইউনিট নির্বাচন করুন *' : 'Business Unit *'}
                </label>
                <select
                  value={quickBizId}
                  onChange={(e) => setQuickBizId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-medium"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bn ? b.nameBn || b.name : b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  {dashboardQuickTxModal === 'sale'
                    ? bn
                      ? 'বিবরণ (যেমন: ব্রয়লার, দুধ, মাছ, ট্রিপ ভাড়া) *'
                      : 'Revenue Category / Item *'
                    : bn
                    ? 'খরচের খাত (যেমন: ফিড, ওষুধ, ডিজেল, লেবার) *'
                    : 'Expense Category / Item *'}
                </label>
                <input
                  type="text"
                  required
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'মোট টাকা (BDT) *' : 'Total Amount (BDT) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'বাকি পরিমাণ (Due)' : 'Due Amount'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={quickDue}
                    onChange={(e) => setQuickDue(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    {dashboardQuickTxModal === 'sale'
                      ? bn
                        ? 'ক্রেতা / পাইকারের নাম'
                        : 'Buyer / Party Name'
                      : bn
                      ? 'সাপ্লায়ার / দোকানের নাম'
                      : 'Supplier / Vendor Name'}
                  </label>
                  <input
                    type="text"
                    value={quickParty}
                    onChange={(e) => setQuickParty(e.target.value)}
                    placeholder={bn ? 'যেমন: বিসমিল্লাহ পোল্ট্রি আড়ত' : 'e.g. Bismillah Agro Traders'}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'তারিখ (Date)' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={quickDate}
                    onChange={(e) => setQuickDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDashboardQuickTxModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
                >
                  {bn ? 'হিসাব সংরক্ষণ করুন' : 'Post Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Business Creation Wizard Modal */}
      <AddBusinessWizardModal
        isOpen={showAddBusinessWizard}
        onClose={() => setShowAddBusinessWizard(false)}
        ownerId={user.ownerId}
        actorEmail={user.email || 'admin@krishivumi.bd'}
        userRole={userRole}
        onSuccess={(newBizId) => {
          setSelectedBusinessId(newBizId);
          setActiveNav('dashboard');
        }}
      />
    </div>
  );
}
