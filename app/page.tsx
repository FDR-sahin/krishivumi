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
  ArrowRight,
  Calendar,
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
  PieChart,
  Pie,
  Cell,
  Line,
  ComposedChart,
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
import EnterpriseLoginGate from '@/components/EnterpriseLoginGate';
import BrandLogo from '@/components/BrandLogo';
import MonthFilterBar, { MonthFilterValue, matchesMonthFilter } from '@/components/MonthFilterBar';
import ClientWorkflowGuideModal from '@/components/ClientWorkflowGuideModal';
import { getEnterprisePayrollSummary } from '@/lib/payroll-utils';
import UserProfileCardModal, { UserProfileData } from '@/components/UserProfileCardModal';

type NavSection =
  | 'dashboard'
  | 'business_detail'
  | 'accounting'
  | 'inventory'
  | 'stakeholders'
  | 'reports'
  | 'security';

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
        gradientBar: 'from-amber-500 via-orange-500 to-yellow-400',
        glowBorder: 'hover:border-amber-500/60 hover:shadow-amber-500/10',
        iconBg: 'bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs ring-amber-500/20',
        tagBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
        divisionTag: 'POULTRY & BROILER HUB',
        divisionTagBn: 'পোল্ট্রি ও ব্রয়লার হাব',
        kpiHighlight: 'text-amber-600 dark:text-amber-400',
        chips: ['15,000 Bird Cap', 'Tunnel Ventilation', '4-Grade Sales'],
        chipsBn: ['১৫,০০০ ক্যাপাসিটি', 'টানেল ভেন্টিলেশন', '৪-গ্রেডে বিক্রি'],
      };
    case 'cattle':
      return {
        bar: 'bg-emerald-500',
        gradientBar: 'from-emerald-500 via-teal-500 to-green-400',
        glowBorder: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
        iconBg: 'bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs ring-emerald-500/20',
        tagBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        divisionTag: 'DAIRY HERD & BEEF FATTENING',
        divisionTagBn: 'ডেইরি ও ক্যাটল ডিভিশন',
        kpiHighlight: 'text-emerald-600 dark:text-emerald-400',
        chips: ['DeLaval 12-Pt Parlour', 'Holstein Dairy', 'Corn Silage'],
        chipsBn: ['ডিলাভাল পার্লার', 'হলস্টেইন ডেইরি', 'ভুট্টা সাইলেজ'],
      };
    case 'goat':
      return {
        bar: 'bg-purple-500',
        gradientBar: 'from-purple-500 via-indigo-500 to-pink-500',
        glowBorder: 'hover:border-purple-500/60 hover:shadow-purple-500/10',
        iconBg: 'bg-gradient-to-br from-purple-500/20 via-indigo-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-xs ring-purple-500/20',
        tagBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
        divisionTag: 'SMALL RUMINANT & PEDIGREE',
        divisionTagBn: 'ছাগল প্রজনন ও ব্রিডিং হাব',
        kpiHighlight: 'text-purple-600 dark:text-purple-400',
        chips: ['Purebred Black Bengal', '4 Slatted Sheds', 'Sire/Dam Pedigree'],
        chipsBn: ['ব্ল্যাক বেঙ্গল জাত', '৪টি মাচা শেড', 'বংশতালিকা ট্র্যাকিং'],
      };
    case 'fish':
      return {
        bar: 'bg-cyan-500',
        gradientBar: 'from-cyan-500 via-blue-500 to-teal-400',
        glowBorder: 'hover:border-cyan-500/60 hover:shadow-cyan-500/10',
        iconBg: 'bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-xs ring-cyan-500/20',
        tagBg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
        divisionTag: 'SCIENTIFIC AQUACULTURE HUB',
        divisionTagBn: 'মৎস্য হ্যাচারি ও চাষ প্রকল্প',
        kpiHighlight: 'text-cyan-600 dark:text-cyan-400',
        chips: ['420 Decimals Water', '16 Paddle Aerators', 'DO & pH Monitor'],
        chipsBn: ['৪২০ শতক জলাশয়', '১৬টি প্যাডেল এরিয়েটর', 'পানির pH ও অক্সিজেন'],
      };
    case 'transport':
      return {
        bar: 'bg-blue-600',
        gradientBar: 'from-blue-600 via-sky-500 to-indigo-500',
        glowBorder: 'hover:border-blue-500/60 hover:shadow-blue-500/10',
        iconBg: 'bg-gradient-to-br from-blue-500/20 via-sky-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-xs ring-blue-500/20',
        tagBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
        divisionTag: 'LOGISTICS & FLEET TELEMETRY',
        divisionTagBn: 'পরিবহন ও আন্তঃজেলা লজিস্টিক',
        kpiHighlight: 'text-blue-600 dark:text-blue-400',
        chips: ['8 Commercial Fleet', 'Inter-District Routes', 'Diesel & Tolls'],
        chipsBn: ['৮টি বাণিজ্যিক গাড়ি', 'আন্তঃজেলা মহাসড়ক রুট', 'জ্বালানি ও টোল হিসাব'],
      };
    default:
      return {
        bar: 'bg-emerald-600',
        gradientBar: 'from-emerald-500 via-teal-500 to-cyan-500',
        glowBorder: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
        iconBg: 'bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs ring-emerald-500/20',
        tagBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        divisionTag: 'COMMERCIAL AGRO DIVISION',
        divisionTagBn: 'বাণিজ্যিক কৃষি ইউনিট',
        kpiHighlight: 'text-emerald-600 dark:text-emerald-400',
        chips: ['Double-Entry Ledger', 'Direct Farm Billing', 'Active Unit'],
        chipsBn: ['ডাবল-এন্ট্রি খতিয়ান', 'সরাসরি ইনভয়েস', 'সক্রিয় ব্যবসা'],
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
  const [simulatePayrollAlert, setSimulatePayrollAlert] = useState(false);
  const [dismissedPayrollAlert, setDismissedPayrollAlert] = useState(false);

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
  const [viewingProfile, setViewingProfile] = useState<UserProfileData | null>(null);

  const openActorProfile = useCallback(
    (actorEmail?: string, fallbackName?: string, fallbackRole?: string) => {
      const matchedUser = erpUsers.find((u) => u.email === actorEmail);
      if (matchedUser) {
        setViewingProfile({
          id: matchedUser.id,
          name: matchedUser.displayName || fallbackName || 'System User',
          displayName: matchedUser.displayName || fallbackName || 'System User',
          email: matchedUser.email,
          role: matchedUser.role,
          designation:
            matchedUser.designation ||
            (matchedUser.role === 'super_admin'
              ? 'ব্যবসা স্বত্বাধিকারী ও চেয়ারম্যান'
              : matchedUser.role === 'super_manager'
              ? 'প্রধান জেনারেল ম্যানেজার (COO)'
              : 'বিভাগীয় ইনচার্জ'),
          phone: matchedUser.phone || '+880 1711-000000',
          nidNumber: matchedUser.nidNumber || '19902692019000142',
          photoUrl: matchedUser.photoUrl,
          address: matchedUser.address || 'ঢাকা, বাংলাদেশ',
          emergencyContact: matchedUser.emergencyContact || '+880 1711-112233',
          joiningDate: matchedUser.createdAt,
          status: matchedUser.status,
          businessNames:
            matchedUser.assignedBusinesses === 'ALL'
              ? ['সকল ৫টি ব্যবসায়িক ইউনিট']
              : businesses
                  .filter((b) => matchedUser.assignedBusinesses?.includes(b.id))
                  .map((b) => b.nameBn || b.name),
        });
        return;
      }
      const matchedStk = stakeholders.find(
        (s) => s.id === actorEmail || s.name.toLowerCase() === fallbackName?.toLowerCase()
      );
      if (matchedStk) {
        setViewingProfile({
          id: matchedStk.id,
          name: matchedStk.name,
          displayName: matchedStk.name,
          email: matchedStk.phone || 'staff@regardsagro.com',
          role: 'employee',
          designation: matchedStk.designationOrCategory || 'খামার কর্মী',
          phone: matchedStk.phone || '+880 1700-000000',
          nidNumber: matchedStk.nidNumber || '19942692019000889',
          photoUrl: matchedStk.photoUrl,
          address: matchedStk.address || 'খামার ক্যাম্প',
          emergencyContact: matchedStk.emergencyContact,
          joiningDate: matchedStk.createdAt,
          status: matchedStk.status,
          businessNames: [matchedStk.businessName],
        });
        return;
      }
      setViewingProfile({
        id: 'actor-' + (actorEmail || 'admin'),
        name: fallbackName || user?.displayName || 'Sahin Miah',
        displayName: fallbackName || user?.displayName || 'Sahin Miah',
        email: actorEmail || user?.email || 'admin@regardsagro.com',
        role: (fallbackRole as UserRole) || userRole || 'super_admin',
        designation:
          fallbackRole === 'business_manager'
            ? 'বিভাগীয় ম্যানেজার'
            : fallbackRole === 'employee'
            ? 'দায়িত্বরত কর্মী'
            : 'ব্যবসা স্বত্বাধিকারী (সুপার অ্যাডমিন)',
        phone: user?.phone || '+880 1711-000000',
        nidNumber: user?.nidNumber || '19902692019000142',
        photoUrl: user?.photoUrl,
        address: user?.address || 'ঢাকা, বাংলাদেশ',
        emergencyContact: user?.emergencyContact,
        status: 'active',
        businessNames: ['সকল ব্যবসায়িক ইউনিট'],
      });
    },
    [erpUsers, stakeholders, businesses, user, userRole]
  );

  const handleSaveProfile = useCallback(
    async (updated: Partial<UserProfileData>) => {
      try {
        const resolvedName = updated.name || updated.displayName;
        const res = await fetch('/api/erp/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateUserProfile',
            userId: updated.id || user?.id,
            displayName: resolvedName,
            phone: updated.phone,
            nidNumber: updated.nidNumber,
            designation: updated.designation,
            address: updated.address,
            emergencyContact: updated.emergencyContact,
            photoUrl: updated.photoUrl,
            password: updated.password,
          }),
        });
        if (res.ok) {
          if (user && (updated.id === user.id || !updated.id)) {
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    displayName: resolvedName || prev.displayName,
                    phone: updated.phone || prev.phone,
                    nidNumber: updated.nidNumber || prev.nidNumber,
                    designation: updated.designation || prev.designation,
                    address: updated.address || prev.address,
                    emergencyContact: updated.emergencyContact || prev.emergencyContact,
                    photoUrl: updated.photoUrl !== undefined ? updated.photoUrl : prev.photoUrl,
                  }
                : null
            );
          }
          setErpUsers((prev) =>
            prev.map((u) =>
              u.id === updated.id
                ? {
                    ...u,
                    displayName: resolvedName || u.displayName,
                    phone: updated.phone || u.phone,
                    nidNumber: updated.nidNumber || u.nidNumber,
                    designation: updated.designation || u.designation,
                    address: updated.address || u.address,
                    emergencyContact: updated.emergencyContact || u.emergencyContact,
                    photoUrl: updated.photoUrl !== undefined ? updated.photoUrl : u.photoUrl,
                  }
                : u
            )
          );
          setViewingProfile(null);
        }
      } catch (e) {
        console.error('Failed to update profile:', e);
      }
    },
    [user]
  );

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
      user.email || 'admin@regardsagro.bd'
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

  // RBAC-filtered businesses with strict deduplication (Truck business never repeats)
  const accessibleBusinesses = useMemo(() => {
    const raw =
      userRole === 'super_admin' || userRole === 'super_manager' || assignedBusinessFilter === 'ALL'
        ? businesses
        : businesses.filter((b) => {
            const allowed = assignedBusinessFilter
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            return allowed.includes(b.id);
          });

    const seen = new Set<string>();
    return raw.filter((b) => {
      const isTransport =
        b.templateType === 'transport' ||
        b.name?.toLowerCase().includes('transport') ||
        b.nameBn?.includes('ট্রাক') ||
        b.code?.toUpperCase().startsWith('BIZ-TRAN');

      if (isTransport) {
        if (seen.has('TRANSPORT_SINGLE')) return false;
        seen.add('TRANSPORT_SINGLE');
        return true;
      }
      const key = String(b.code || b.templateType || b.name || b.id).trim().toUpperCase();
      if (seen.has(key) || key === 'BIZ-TRAN-06') return false;
      seen.add(key);
      return true;
    });
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

  const postedJournals = useMemo(() => {
    return monthFilteredJournals.filter((j) => {
      if (j.status !== 'posted') return false;
      if (userRole !== 'super_admin' && assignedBusinessFilter !== 'ALL') {
        return j.businessId === assignedBusinessFilter;
      }
      return true;
    });
  }, [monthFilteredJournals, userRole, assignedBusinessFilter]);

  const kpiTotals = useMemo(() => {
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
    postedJournals,
    accounts,
    stakeholders,
    accessibleBusinesses,
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

  const payrollSummary = useMemo(
    () => getEnterprisePayrollSummary(stakeholders, erpUsers, accessibleBusinesses, new Date(), simulatePayrollAlert),
    [stakeholders, erpUsers, accessibleBusinesses, simulatePayrollAlert]
  );

  // Executive Dashboard Visual Analytics (Matching Client Reference SaaS Central Dashboard)
  const executiveMetrics = useMemo(() => {
    const rev = kpiTotals.totalRevenue;
    const net = kpiTotals.netProfit;
    const grossProfit = Math.round(rev > 0 ? rev * 0.42 : 4320000);
    const ebitda = Math.round(rev > 0 ? rev * 0.28 : 2910000);
    const totalOrdersCount = postedJournals.length > 0 ? postedJournals.length : 312;
    const pendingDueCount = postedJournals.filter((j) => (j.dueAmount || 0) > 0).length || 18;

    return {
      revenue: rev > 0 ? rev : 18840000,
      grossProfit,
      ebitda,
      netProfit: net !== 0 ? net : 1850000,
      totalOrders: totalOrdersCount,
      pendingApprovals: pendingDueCount,
    };
  }, [kpiTotals, postedJournals]);

  // 1. Revenue Trend YTD (Smooth Area Chart)
  const revenueTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const monthlyRev: Record<string, number> = {};
    for (const j of postedJournals) {
      if (j.transactionType === 'sale' || j.transactionType === 'income') {
        const d = j.date ? new Date(j.date) : new Date();
        const m = months[d.getMonth()] || 'Nov';
        monthlyRev[m] = (monthlyRev[m] || 0) + j.amount;
      }
    }
    const baseRev = executiveMetrics.revenue;
    const weights = [0.06, 0.07, 0.09, 0.11, 0.13, 0.12, 0.14, 0.16, 0.15, 0.17, 0.20];
    return months.map((m, idx) => ({
      month: m,
      revenue: monthlyRev[m] || Math.round(baseRev * weights[idx]),
    }));
  }, [postedJournals, executiveMetrics.revenue]);

  // 2. Revenue by Business Unit (Donut Chart)
  const businessUnitDonutData = useMemo(() => {
    const palette = ['#3B82F6', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6'];
    const totalRev = accessibleBusinesses.reduce((acc, b) => {
      const m = businessMetricsMap[b.id] || { revenue: 0 };
      return acc + m.revenue;
    }, 0);

    return accessibleBusinesses.map((b, idx) => {
      const m = businessMetricsMap[b.id] || { revenue: 0 };
      const fallbackShares = [35, 25, 20, 12, 8];
      const rawRev =
        m.revenue > 0
          ? m.revenue
          : Math.round(executiveMetrics.revenue * (fallbackShares[idx % 5] / 100));
      const share =
        totalRev > 0
          ? Math.round((m.revenue / totalRev) * 100)
          : fallbackShares[idx % 5];
      const label = bn ? b.nameBn || b.name : b.name;
      return {
        name: label
          .replace(' Business', '')
          .replace(' Farming', '')
          .replace(' ব্যবসা', '')
          .replace(' খামার', ''),
        value: rawRev,
        share: `${share}%`,
        color: palette[idx % palette.length],
      };
    });
  }, [accessibleBusinesses, businessMetricsMap, executiveMetrics.revenue, bn]);

  // 3. Top 5 Products / Streams by Sales (Horizontal Bar Chart)
  const topProductsData = useMemo(() => {
    return [
      {
        name: bn ? 'ব্রয়লার ও সোনালী মুরগি' : 'Broiler & Sonali Poultry',
        sales: 4200,
        pct: '4.2k',
      },
      {
        name: bn ? 'ডেইরি দুধ ও মোটাতাজাকরণ' : 'Dairy Milk & Fattened Cattle',
        sales: 3800,
        pct: '3.8k',
      },
      {
        name: bn ? 'বাণিজ্যিক ট্রাক ট্রিপ' : 'Freight & Transport Trips',
        sales: 2900,
        pct: '2.9k',
      },
      {
        name: bn ? 'পুকুরের রুই ও কাতলা মাছ' : 'Carp & Tilapia Harvest',
        sales: 1950,
        pct: '1.9k',
      },
      {
        name: bn ? 'ব্ল্যাক বেঙ্গল ছাগল প্রজনন' : 'Black Bengal Breeding Stock',
        sales: 1100,
        pct: '1.1k',
      },
    ];
  }, [bn]);

  // 4. Receivables Aging (Donut Chart)
  const receivablesAgingData = useMemo(() => {
    const totalDue = Math.max(kpiTotals.outstandingReceivables, 180000);
    return [
      { name: '0-30 Days', value: Math.round(totalDue * 0.45), share: '45%', color: '#10B981' },
      { name: '31-60 Days', value: Math.round(totalDue * 0.28), share: '28%', color: '#3B82F6' },
      { name: '61-90 Days', value: Math.round(totalDue * 0.18), share: '18%', color: '#F59E0B' },
      { name: '90+ Days', value: Math.round(totalDue * 0.09), share: '9%', color: '#EF4444' },
    ];
  }, [kpiTotals.outstandingReceivables]);

  // 5. Orders vs Revenue (Composed Bar + Line Chart)
  const ordersVsRevenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const ordersBase = [24, 28, 35, 42, 48, 55, 52, 60, 68, 75, 82];
    const baseRev = executiveMetrics.revenue;
    return months.map((m, idx) => ({
      month: m,
      orders: ordersBase[idx],
      revenue: Math.round((baseRev / 12) * (0.6 + idx * 0.08)),
    }));
  }, [executiveMetrics.revenue]);

  // 6. Expenses by Category (Donut Chart)
  const expensesByCategoryData = useMemo(() => {
    const totalExp = Math.max(kpiTotals.totalExpenses, 1200000);
    return [
      {
        name: bn ? 'খাবার ও নিউট্রিশন' : 'Feed & Nutrition',
        value: Math.round(totalExp * 0.45),
        share: '45%',
        color: '#10B981',
      },
      {
        name: bn ? 'পরিবহন ও ডিজেল' : 'Transport & Diesel',
        value: Math.round(totalExp * 0.22),
        share: '22%',
        color: '#3B82F6',
      },
      {
        name: bn ? 'ওষুধ ও চিকিৎসা' : 'Medicine & Vet Care',
        value: Math.round(totalExp * 0.14),
        share: '14%',
        color: '#8B5CF6',
      },
      {
        name: bn ? 'কর্মচারীর বেতন' : 'Staff Salary & Wages',
        value: Math.round(totalExp * 0.12),
        share: '12%',
        color: '#F59E0B',
      },
      {
        name: bn ? 'অন্যান্য ও ইউটিলিটি' : 'Utilities & Misc',
        value: Math.round(totalExp * 0.07),
        share: '7%',
        color: '#64748B',
      },
    ];
  }, [kpiTotals.totalExpenses, bn]);

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

  if (!user) {
    return (
      <EnterpriseLoginGate
        hasSuperAdmin={hasSuperAdmin}
        lang={lang}
        onToggleLang={() => setLang(lang === 'en' ? 'bn' : 'en')}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onAuthenticated={(loggedInUser) => {
          setUser(loggedInUser);
          setHasSuperAdmin(true);
          setUserRole(loggedInUser.role);
          setAssignedBusinessFilter(loggedInUser.assignedBusinesses || 'ALL');
          setActiveNav('dashboard');
        }}
      />
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
    return found ? found.label : 'RegardsAgro ERP';
  })();

  const renderSidebarContent = (isMobile = false) => {
    const expanded = isMobile ? true : sidebarOpen;
    return (
      <div className="flex flex-col justify-between h-full bg-[#0B1120] text-slate-100 select-none">
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between gap-2 px-1">
            {expanded ? (
              <BrandLogo
                whiteText
                size="sm"
                subtitle={bn ? 'স্মার্ট এগ্রো ইআরপি' : 'ENTERPRISE AGRO ERP'}
              />
            ) : (
              <BrandLogo whiteText compact size="sm" />
            )}

            {isMobile ? (
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
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
            {/* Overview Section */}
            <div className="space-y-1">
              {expanded && (
                <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  {bn ? 'কোর ড্যাশবোর্ড' : 'Overview'}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveNav('dashboard');
                  setMobileDrawerOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                  activeNav === 'dashboard'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-white/15'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {expanded && (
                  <span className="truncate">{bn ? 'মূল ড্যাশবোর্ড' : 'Executive Overview'}</span>
                )}
              </button>
            </div>

            {/* Business Units Section */}
            <div className="space-y-1.5">
              {expanded && (
                <div className="px-2.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  <span>{bn ? 'ব্যবসায়িক শাখা' : 'Business Units'}</span>
                  <span className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
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
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800/90 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
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
                              <div className="truncate leading-tight font-semibold">
                                {bn ? biz.nameBn || biz.name : biz.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                {biz.code}
                              </div>
                            </div>
                          )}
                        </div>
                        {expanded && (
                          <ChevronRight
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isSelected ? 'text-emerald-400 opacity-100' : 'text-slate-500 opacity-40'
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
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-dashed border-emerald-500/30 transition-colors cursor-pointer"
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
                <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  {bn ? 'অর্থ ও সেন্ট্রাল নিয়ন্ত্রণ' : 'Finance & Control'}
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                    activeNav === item.id
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold shadow-lg shadow-emerald-950/40 ring-1 ring-white/15'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <item.Icon className="h-4 w-4 shrink-0" />
                  {expanded && <span className="truncate">{item.label}</span>}
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Sidebar Footer - User Card & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
          {expanded ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800/80">
              <button
                type="button"
                onClick={() => openActorProfile(user.email, user.displayName, user.role)}
                className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-90 transition-opacity cursor-pointer group flex-1"
                title={bn ? 'প্রোফাইল ও পরিচয়পত্র দেখুন' : 'View Profile Card'}
              >
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white flex items-center justify-center font-black text-xs shadow-md shadow-emerald-950/40 shrink-0 ring-1 ring-white/10 overflow-hidden">
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (user.displayName || user.email || 'A').slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-xs font-bold text-white truncate max-w-[125px] group-hover:text-emerald-400 transition-colors">
                    {user.displayName || (bn ? 'অ্যাডমিন' : 'Admin')}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide truncate">
                    {userRole === 'super_admin'
                      ? bn ? '👑 সুপার অ্যাডমিন' : '👑 Super Admin'
                      : userRole === 'super_manager'
                      ? bn ? '👔 প্রধান ম্যানেজার' : '👔 COO'
                      : userRole === 'business_manager'
                      ? bn ? '💼 শাখা ম্যানেজার' : '💼 Branch Mgr'
                      : bn ? '👤 কর্মী' : '👤 Staff'}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer shrink-0"
                title={bn ? 'লগ আউট করুন' : 'Sign Out'}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => openActorProfile(user.email, user.displayName, user.role)}
                className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title={user.displayName || (bn ? 'প্রোফাইল' : 'Profile')}
              >
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white flex items-center justify-center font-black text-xs overflow-hidden">
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (user.displayName || user.email || 'A').slice(0, 1).toUpperCase()
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center p-2 rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
                title={bn ? 'লগ আউট করুন' : 'Sign Out'}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#070B14] text-slate-900 dark:text-slate-100 relative">
      {/* Subtle Agro Landscape Brand Watermark Overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] dark:opacity-[0.025] bg-no-repeat bg-center bg-cover mix-blend-luminosity"
        style={{
          backgroundImage: `url('/images/agro_fields_brand.jpg')`,
        }}
        aria-hidden="true"
      />

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-800/80 bg-[#0B1120] text-slate-100 transition-all duration-200 no-print sticky top-0 h-screen shadow-2xl ${
          sidebarOpen ? 'w-72' : 'w-[76px]'
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
          <aside className="relative z-10 w-72 max-w-[85vw] bg-[#0B1120] text-slate-100 border-r border-slate-800 h-full shadow-2xl">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
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
            <div className="hidden xl:flex items-center gap-2 text-xs shrink-0 pr-3 border-r border-slate-200 dark:border-slate-800">
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">RegardsAgro</span>
              <span className="text-slate-300 dark:text-slate-600 font-bold">/</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">
                {activePageTitle}
              </span>
            </div>

            <div className="hidden lg:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{bn ? 'লাইভ ক্লাউড সিঙ্ক' : 'Live Sync'}</span>
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

            {/* Segmented Language Selector */}
            <div className="inline-flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLang('bn')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  lang === 'bn'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

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
            <button
              type="button"
              onClick={() => openActorProfile(user.email, user.displayName, user.role)}
              className="hidden md:flex items-center gap-2.5 pl-2.5 ml-1 border-l border-slate-200 dark:border-slate-800 text-left hover:opacity-90 transition-all cursor-pointer group"
              title={bn ? 'প্রোফাইল ও এনআইডি পরিচয়পত্র দেখুন' : 'View Profile & NID'}
            >
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs font-extrabold shadow-xs overflow-hidden group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (user.displayName || user.email || 'A').slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="text-xs leading-tight max-w-[140px] truncate">
                <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {user.displayName || (bn ? 'অ্যাডমিন' : 'Admin')}
                </div>
                <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide truncate">
                  {userRole.replace('_', ' ')}
                </div>
              </div>
            </button>
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

          {/* 3-Day Month-End Automated Payroll Reminder Alert Banner */}
          {payrollSummary.isThreeDaysBeforeMonthEnd && !dismissedPayrollAlert && (
            <div className="rounded-3xl border-2 border-amber-400 dark:border-amber-600 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/25 dark:to-transparent p-5 sm:p-6 shadow-xl shadow-amber-500/5 space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-amber-500/30">
                    🔔
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {bn ? payrollSummary.alertTitleBn : payrollSummary.alertTitleEn}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white">
                        {bn ? `আর মাত্র ${payrollSummary.daysRemaining} দিন বাকি` : `${payrollSummary.daysRemaining} Days Left`}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed max-w-3xl">
                      {bn ? payrollSummary.alertMessageBn : payrollSummary.alertMessageEn}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveNav('stakeholders')}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users className="h-4 w-4" />
                    <span>{bn ? 'পে-রোল প্রদান ও ভিউ →' : 'Review & Disburse Payroll →'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedPayrollAlert(true)}
                    className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold cursor-pointer"
                  >
                    {bn ? 'পরে দেখব' : 'Dismiss'}
                  </button>
                </div>
              </div>

              {/* Division Breakdown Quick Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-amber-300/40 dark:border-amber-700/40">
                {payrollSummary.divisionBreakdown.map((div) => (
                  <div
                    key={div.bizId}
                    className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/60 text-xs space-y-0.5"
                  >
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {bn ? div.bizNameBn : div.bizName}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {div.staffCount} জন কর্মী · {formatBDT(div.totalBudget)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold truncate">
                      ম্যানেজার: {formatBDT(div.managerSalary)}
                    </div>
                  </div>
                ))}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-0.5 flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                    {bn ? 'সর্বমোট পে-রোল' : 'Grand Payroll'}
                  </div>
                  <div className="font-black font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                    {formatBDT(payrollSummary.grandTotalMonthlyPayroll)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comprehensive Client SOP Guide Banner Card */}
          {activeNav === 'dashboard' && (
            <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shadow-sm shadow-emerald-600/30 shrink-0">
                  📖
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>RegardsAgro — {bn ? 'ক্লায়েন্ট অপারেশনাল গাইড (SOP Manual)' : 'Point-to-Point Enterprise SOP Manual'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      ৯টি চ্যাপ্টার
                    </span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {bn
                      ? 'সুপার অ্যাডমিন লগইন, জেনারেল ম্যানেজার ও ৫ জন ম্যানেজার নিয়োগ, কর্মী নিয়োগ ও বেতন হিসাব, স্টক অডিট এবং লাভ-ক্ষতির সম্পূর্ণ নির্দেশিকা।'
                      : 'Step-by-step master operational guide for owner, General Manager, 5 business managers, staff hiring, and P&L governance.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSimulatePayrollAlert(!simulatePayrollAlert)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    simulatePayrollAlert
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                  title="মাসের ৩ দিন আগের বেতন নোটিফিকেশন পরীক্ষা করুন"
                >
                  🔔 {simulatePayrollAlert ? (bn ? 'অ্যালার্ট টেস্ট অন' : 'Alert Sim ON') : (bn ? '৩ দিনের নোটিফিকেশন টেস্ট' : 'Test 3-Day Alert')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnboardingGuide(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>{bn ? 'সম্পূর্ণ গাইড খুলুন 📖' : 'Open SOP Guide 📖'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* VIEW 1: MAIN EXECUTIVE DASHBOARD */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6 relative">
              {/* Subtle Atmospheric Agro Watermark (Jolchap) Background */}
              <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] dark:opacity-[0.03] bg-cover bg-center bg-no-repeat mix-blend-multiply dark:mix-blend-screen filter saturate-50 pointer-events-none"
                style={{ backgroundImage: `url('/images/agro_fields_brand.jpg')` }}
              />
              {/* 12-Month Period Filter Bar */}
              <MonthFilterBar value={monthFilter} onChange={setMonthFilter} bn={bn} />

              {/* Client Demo Master Greeting Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {bn
                        ? `স্বাগতম, ${user?.displayName || 'Sahin Miah'}! 👋`
                        : `Welcome back, ${user?.displayName || 'Admin'}! 👋`}
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {bn
                      ? 'RegardsAgro-এর ৫টি ব্যবসায়িক ডিভিশনের সমন্বিত লাইভ অপারেশন ও আর্থিক সারাংশ'
                      : "Here's what's happening across your business units today"}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    <span>
                      {monthFilter.month === 'ALL'
                        ? bn
                          ? 'চলতি বছর (২০২৬)'
                          : 'This Year (2026)'
                        : `${monthFilter.month} ${monthFilter.year !== 'ALL' ? monthFilter.year : ''}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6 TOP EXECUTIVE KPI CARDS (Matching Client Demo SaaS Layout) */}
              <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
                {/* 1. Total Revenue */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>{bn ? 'মোট রাজস্ব (Total Rev)' : 'Total Revenue'}</span>
                      <Coins className="h-3.5 w-3.5 text-teal-600" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white truncate">
                      {userRole === 'employee' ? '•••' : formatBDT(executiveMetrics.revenue)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md w-fit">
                    <TrendingUp className="h-3 w-3" />
                    <span>+12.5% vs last month</span>
                  </div>
                </div>

                {/* 2. Gross Profit */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>{bn ? 'মোট লাভ (Gross Profit)' : 'Gross Profit'}</span>
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white truncate">
                      {userRole === 'employee' ? '•••' : formatBDT(executiveMetrics.grossProfit)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md w-fit">
                    <TrendingUp className="h-3 w-3" />
                    <span>+8.7% vs last month</span>
                  </div>
                </div>

                {/* 3. EBITDA */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>EBITDA</span>
                      <Wallet className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white truncate">
                      {userRole === 'employee' ? '•••' : formatBDT(executiveMetrics.ebitda)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md w-fit">
                    <TrendingUp className="h-3 w-3" />
                    <span>+10.2% vs last month</span>
                  </div>
                </div>

                {/* 4. Net Profit */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>{bn ? 'নিট মুনাফা (Net Profit)' : 'Net Profit'}</span>
                      <Coins className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
                      {userRole === 'employee' ? '•••' : formatBDT(executiveMetrics.netProfit)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md w-fit">
                    <TrendingUp className="h-3 w-3" />
                    <span>+15.4% vs last month</span>
                  </div>
                </div>

                {/* 5. Total Orders */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>{bn ? 'মোট চালান / অর্ডার' : 'Total Orders'}</span>
                      <Package className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                      {executiveMetrics.totalOrders}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md w-fit">
                    <TrendingUp className="h-3 w-3" />
                    <span>+18% vs last month</span>
                  </div>
                </div>

                {/* 6. Pending Approvals */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>{bn ? 'বকেয়া / অনুমোদন বাকি' : 'Pending Approvals'}</span>
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                      {executiveMetrics.pendingApprovals}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md w-fit">
                    <span>2 overdue</span>
                  </div>
                </div>
              </section>

              {/* ROW 1 ANALYTICS CHARTS (Revenue Trend, Revenue by Unit, Top 5 Products) */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Revenue Trend (YTD) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{bn ? 'রাজস্ব ট্রেন্ড (Revenue Trend YTD)' : 'Revenue Trend (YTD)'}</span>
                      <span className="text-[10px] font-mono text-slate-400">2026</span>
                    </h3>
                  </div>
                  <div className="h-52 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueTeal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0D9488" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => formatCompactBDT(Number(v))} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#F8FAFC', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                          formatter={(v: any) => [formatBDT(Number(v)), bn ? 'মাসিক আয়' : 'Monthly Rev']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#0D9488" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueTeal)" dot={{ r: 3, fill: '#0D9488' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Revenue by Business Unit (YTD Donut) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{bn ? 'বিভাগ অনুযায়ী আয় (Revenue by Business Unit)' : 'Revenue by Business Unit (YTD)'}</span>
                      <span className="text-[10px] font-mono text-slate-400">5 Divisions</span>
                    </h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
                    <div className="h-44 w-44 relative shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={businessUnitDonutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={52}
                            outerRadius={74}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {businessUnitDonutData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-white leading-tight">
                          {formatCompactBDT(executiveMetrics.revenue)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          {bn ? 'সর্বমোট' : 'Total Rev'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 w-full text-xs">
                      {businessUnitDonutData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 dark:text-slate-400 text-[11px] truncate">{item.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-200 text-[11px] shrink-0">{item.share}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Top 5 Products / Streams by Sales (Horizontal Bar Chart) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{bn ? 'শীর্ষ ৫টি পণ্য / সেবা (Top 5 Products by Sales)' : 'Top 5 Products / Streams by Sales (YTD)'}</span>
                      <span className="text-[10px] font-mono text-slate-400">Volume</span>
                    </h3>
                  </div>
                  <div className="h-52 w-full mt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={topProductsData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748B' }} width={120} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#F8FAFC', fontSize: '11px' }}
                          formatter={(v: any) => [`${v} units`, bn ? 'বিক্রি' : 'Sales']}
                        />
                        <Bar dataKey="sales" fill="#0D9488" radius={[0, 6, 6, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* ROW 2 ANALYTICS CHARTS (Receivables Aging, Orders vs Revenue, Expenses by Category) */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 4. Receivables Aging (YTD Donut) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{bn ? 'বকেয়ার বয়স অনুপাত (Receivables Aging)' : 'Receivables Aging (YTD)'}</span>
                      <span className="text-[10px] font-mono text-slate-400">Aging Buckets</span>
                    </h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
                    <div className="h-44 w-44 relative shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={receivablesAgingData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={52}
                            outerRadius={74}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {receivablesAgingData.map((entry, index) => (
                              <Cell key={`aging-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-white leading-tight">
                          {formatCompactBDT(kpiTotals.outstandingReceivables || 180000)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          {bn ? 'মোট বকেয়া' : 'Total Due'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 w-full text-xs">
                      {receivablesAgingData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">{item.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-200 text-[11px]">{item.share}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. Orders vs Revenue (Composed Bar + Line Chart) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{bn ? 'অর্ডার বনাম রাজস্ব (Orders vs Revenue)' : 'Orders vs Revenue (YTD)'}</span>
                      <div className="flex items-center gap-2.5 text-[10px] font-semibold">
                        <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                          <span className="h-2 w-2 rounded-xs bg-teal-600" /> Orders
                        </span>
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <span className="h-2 w-2 rounded-full bg-blue-600" /> Revenue
                        </span>
                      </div>
                    </h3>
                  </div>
                  <div className="h-52 w-full mt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={ordersVsRevenueData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                        <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                        <YAxis yAxisId="right" orientation="right" hide />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#F8FAFC', fontSize: '11px' }}
                        />
                        <Bar yAxisId="left" dataKey="orders" fill="#0D9488" radius={[4, 4, 0, 0]} barSize={12} name={bn ? 'অর্ডার' : 'Orders'} />
                        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 2.5, fill: '#3B82F6' }} name={bn ? 'রাজস্ব' : 'Revenue'} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 6. Expenses by Category (YTD Donut) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{bn ? 'ব্যয়ের খাতসমূহ (Expenses by Category)' : 'Expenses by Category (YTD)'}</span>
                      <span className="text-[10px] font-mono text-slate-400">Breakdown</span>
                    </h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
                    <div className="h-44 w-44 relative shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensesByCategoryData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={52}
                            outerRadius={74}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {expensesByCategoryData.map((entry, index) => (
                              <Cell key={`exp-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-white leading-tight">
                          {formatCompactBDT(kpiTotals.totalExpenses || 1200000)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          {bn ? 'মোট ব্যয়' : 'Total Exp'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 w-full text-xs">
                      {expensesByCategoryData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 dark:text-slate-400 text-[11px] truncate">{item.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-200 text-[11px] shrink-0">{item.share}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Executive Command Quick Actions Strip */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 shadow-xs backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                      {bn ? 'কেন্দ্রীয় কমান্ড অ্যাকশন' : 'FAST TRANSACTION COMMAND'}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {bn ? 'যেকোনো ডিভিশনের জন্য তাৎক্ষণিক আয়-ব্যয় এন্ট্রি বা ব্যালান্স চেক করুন' : 'Post balanced double-entry transactions or provision new agro divisions'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickBizId(businesses[0]?.id || '');
                        setQuickCategory(bn ? 'পণ্য ও খামার বিক্রি' : 'Farm & Product Sales');
                        setDashboardQuickTxModal('sale');
                      }}
                      className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/25 active:scale-98 whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90 duration-200" />
                      <span>{bn ? '+ বিক্রি / আয়' : '+ Record Sale'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setQuickBizId(businesses[0]?.id || '');
                        setQuickCategory(bn ? 'খাবার, ওষুধ ও খামার খরচ' : 'Feed, Medicine & Operating Cost');
                        setDashboardQuickTxModal('expense');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-all active:scale-98 whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{bn ? '+ খরচ' : '+ Record Expense'}</span>
                    </button>

                    {userRole === 'super_admin' && (
                      <button
                        type="button"
                        onClick={() => setShowAddBusinessWizard(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all active:scale-98 whitespace-nowrap cursor-pointer"
                      >
                        <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{bn ? 'নতুন ইউনিট' : 'New Division'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveNav('reports')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-98 whitespace-nowrap cursor-pointer"
                    >
                      <FileBarChart className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{bn ? 'P&L রিপোর্ট' : 'P&L Report'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 1: BUSINESS PORTFOLIO GRID */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                      {bn
                        ? `চলমান ব্যবসায়িক ডিভিশন পোর্টফোলিও (${filteredBusinesses.length})`
                        : `Active Business Portfolio (${filteredBusinesses.length})`}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {bn
                        ? 'প্রতিটি ইউনিটের কার্ডে ক্লিক করে লাইভ অপারেশন, ব্যাচ, পাল ও ট্রিপ কনসোলে প্রবেশ করুন।'
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        className={`group relative cursor-pointer rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${accent.glowBorder} flex flex-col justify-between`}
                      >
                        {/* Top Gradient Accent Bar */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${accent.gradientBar}`} />

                        <div className="p-6 sm:p-7 space-y-5 flex-1 flex flex-col justify-between">
                          <div className="space-y-3.5">
                            {/* Division Category Tag & Status Pill */}
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${accent.tagBg}`}
                              >
                                {bn ? accent.divisionTagBn : accent.divisionTag}
                              </span>

                              <span
                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                                  biz.status === 'active'
                                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                                    : 'text-amber-700 dark:text-amber-400 bg-amber-500/10'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    biz.status === 'active'
                                      ? 'bg-emerald-500 animate-pulse'
                                      : 'bg-amber-500'
                                  }`}
                                />
                                {biz.status === 'active'
                                  ? bn
                                    ? 'সক্রিয়'
                                    : 'Active'
                                  : bn
                                  ? 'স্থগিত'
                                  : 'Paused'}
                              </span>
                            </div>

                            {/* Identity Header */}
                            <div className="flex items-start gap-3.5 pt-1">
                              <div
                                className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${accent.iconBg} transition-transform duration-300 group-hover:scale-105`}
                              >
                                {renderBusinessIcon(biz.iconName, 'h-6 w-6')}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                                  {bn ? biz.nameBn || biz.name : biz.name}
                                </h3>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>{biz.location}</span>
                                  <span>•</span>
                                  <span className="font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                                    {biz.code}
                                  </span>
                                </div>
                                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mt-1">
                                  <span className="text-slate-400">👤 {bn ? 'ইন-চার্জ:' : 'Lead:'}</span>
                                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                                    {biz.managerName || 'Md. Sahin Miah'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {biz.description}
                            </p>

                            {/* Operational Capability Chips */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {(bn ? accent.chipsBn : accent.chips).map((chip, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                                >
                                  {chip}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* 3-Tile Structured Financial Metric Ribbon */}
                          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="grid grid-cols-3 gap-2">
                              {/* Tile 1: Sales */}
                              <div className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  <span>{bn ? 'বিক্রি' : 'Sales'}</span>
                                </div>
                                <div className="font-mono font-black tabular-nums text-xs text-slate-900 dark:text-white mt-1 truncate">
                                  {formatBDT(metrics.revenue)}
                                </div>
                              </div>

                              {/* Tile 2: Expense */}
                              <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  <span>{bn ? 'খরচ' : 'Expense'}</span>
                                </div>
                                <div className="font-mono font-black tabular-nums text-xs text-slate-900 dark:text-white mt-1 truncate">
                                  {formatBDT(metrics.expense)}
                                </div>
                              </div>

                              {/* Tile 3: Margin */}
                              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      metrics.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                  />
                                  <span>{bn ? 'নিট লাভ' : 'Margin'}</span>
                                </div>
                                <div
                                  className={`font-mono font-black tabular-nums text-xs mt-1 truncate ${
                                    metrics.profit >= 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {formatBDT(metrics.profit)}
                                </div>
                              </div>
                            </div>

                            {/* Action Footer */}
                            <div className="flex items-center justify-between pt-1">
                              {metrics.due > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-500/20">
                                  {bn ? 'বাকি:' : 'Due:'} {formatCompactBDT(metrics.due)}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                  {bn ? 'লেজার সিঙ্ক সক্রিয়' : 'Ledger in sync'}
                                </span>
                              )}

                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white text-xs font-bold transition-all shadow-2xs">
                                <span>{bn ? 'ডিভিশন কনসোল খুলুন' : 'Open Division Console'}</span>
                                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                              </span>
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
                      className="group relative rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white/70 dark:bg-slate-900/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 p-6 sm:p-7 transition-all duration-300 flex flex-col items-center justify-center text-center min-h-[340px] space-y-4 hover:shadow-lg"
                    >
                      <div className="relative">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm group-hover:scale-110">
                          <Plus className="h-7 w-7" />
                        </div>
                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                      </div>
                      <div className="space-y-1.5 max-w-xs">
                        <div className="text-base font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {bn ? 'নতুন ব্যবসায়িক বিভাগ যুক্ত করুন' : 'Provision New Division'}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {bn
                            ? 'ডেইরি প্রসেসিং, পোল্ট্রি হ্যাচারি, ফিড মিল, রাইস ট্রেডিং বা নিজস্ব বাণিজ্যিক ইউনিট ১-ক্লিকে ইনস্টল করুন।'
                            : 'Launch Feed Mills, Dairy Processing, Seed Distribution, or custom agro divisions with dedicated double-entry ledgers.'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                        <span>{bn ? 'ডিভিশন সেটআপ উইজার্ড' : 'Division Setup Wizard'}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
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

              {/* SECTION 2: SECONDARY OPERATIONAL OVERVIEW */}
              <section className="space-y-3 pt-2">
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {bn ? 'অপারেশনাল ট্রেজারি ও জনবল মনিটরিং' : 'Operational Treasury & Workforce Telemetry'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      label: bn ? 'অফিস ও খামার ক্যাশ তহবিল' : 'Office & Farm Cash Vault',
                      value:
                        userRole === 'employee'
                          ? bn
                            ? 'সংরক্ষিত'
                            : 'Restricted'
                          : formatBDT(kpiTotals.cashBalance),
                      sub: bn ? 'দৈনন্দিন নগদ পেটি ক্যাশ' : 'Daily petty cash in hand',
                      Icon: Banknote,
                      tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                      bar: 'bg-emerald-500',
                    },
                    {
                      label: bn ? 'কর্পোরেট ব্যাংক ব্যালেন্স' : 'Corporate Bank Balance',
                      value:
                        userRole === 'employee'
                          ? bn
                            ? 'সংরক্ষিত'
                            : 'Restricted'
                          : formatBDT(kpiTotals.bankBalance),
                      sub: bn ? 'ইসলামী ও ব্র্যাক ব্যাংক একাউন্ট' : 'Islami & BRAC Bank accounts',
                      Icon: Landmark,
                      tone: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                      bar: 'bg-indigo-500',
                    },
                    {
                      label: bn ? 'মোট জনবল ও স্টাফ' : 'Active Workforce',
                      value: `${kpiTotals.totalEmployees} ${bn ? 'জন' : 'Staff'}`,
                      sub: bn ? 'ম্যানেজার, ভেট ডাক্তার ও কর্মী' : 'Managers, vets & farm crew',
                      Icon: Users,
                      tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
                      bar: 'bg-violet-500',
                    },
                    {
                      label: bn ? 'পাওনা / বাকি টাকা (Due)' : 'Receivables (Due)',
                      value: formatBDT(kpiTotals.outstandingReceivables),
                      sub: bn ? 'ক্রেতা ও পাইকারদের কাছে পাওনা' : 'Pending buyer settlements',
                      Icon: Clock,
                      tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      bar: 'bg-amber-500',
                      valueColor: 'text-amber-600 dark:text-amber-400',
                    },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                    >
                      <div className={`absolute top-0 left-0 right-0 h-1 ${kpi.bar || 'bg-emerald-500'}`} />
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
                        className={`mt-3 text-xl sm:text-2xl font-black font-mono tabular-nums ${
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

              {/* RECENT OPERATIONAL TRANSACTIONS & ACTOR AUDIT SECTION */}
              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {bn ? 'সাম্প্রতিক আর্থিক লেনদেন ও এন্ট্রি প্রদানকারী কর্মী ট্রেইল' : 'Recent Financial Entries & Operational Actor Trail'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {bn
                        ? 'কে কোন ব্যবসা ইউনিটে আয়/ব্যয় ইনপুট দিয়েছেন তার ছবি, নাম ও পদবিসহ লাইভ রেকর্ড (ক্লিক করে প্রোফাইল ও এনআইডি দেখুন)'
                        : 'Live audit log of who recorded sales, expenses, and vouchers with avatar photos and designations (click to inspect profile)'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNav('accounting')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline self-start sm:self-auto cursor-pointer"
                  >
                    <span>{bn ? 'সকল খতিয়ান দেখুন' : 'Full Ledger View'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-3 px-4">{bn ? 'তারিখ ও ভাউচার' : 'Date / Voucher'}</th>
                        <th className="py-3 px-4">{bn ? 'ব্যবসা ইউনিট' : 'Business Unit'}</th>
                        <th className="py-3 px-4">{bn ? 'খাত ও বিবরণ' : 'Category & Description'}</th>
                        <th className="py-3 px-4 text-right">{bn ? 'টাকার পরিমাণ' : 'Amount (BDT)'}</th>
                        <th className="py-3 px-4">{bn ? 'এন্ট্রি প্রদানকারী কর্মী (Actor)' : 'Entered By (Staff)'}</th>
                        <th className="py-3 px-4 text-center">{bn ? 'প্রোফাইল' : 'Profile'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {monthFilteredJournals.slice(0, 8).map((j) => {
                        const isIncome = j.transactionType === 'sale' || j.transactionType === 'income';
                        const matchedUser = erpUsers.find((u) => u.email === j.actorEmail);
                        const actorPhoto = j.actorPhoto || matchedUser?.photoUrl;
                        const actorName = j.actorName || matchedUser?.displayName || (j.actorEmail ? j.actorEmail.split('@')[0] : (bn ? 'সুপার অ্যাডমিন' : 'Admin'));
                        const actorRole = j.actorRole || matchedUser?.role || 'Staff';
                        const actorDesignation = j.actorDesignation || matchedUser?.designation || (actorRole === 'super_admin' ? (bn ? 'ব্যবসা স্বত্বাধিকারী' : 'Owner / Super Admin') : actorRole === 'super_manager' ? (bn ? 'প্রধান জেনারেল ম্যানেজার' : 'COO') : actorRole === 'business_manager' ? (bn ? 'বিভাগীয় ইনচার্জ' : 'Branch Mgr') : (bn ? 'খামার হিসাবরক্ষক' : 'Accountant'));

                        return (
                          <tr key={j.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">{j.date}</div>
                              <div className="font-mono text-[10px] text-slate-400">{j.referenceNo || j.id}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {j.businessName}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-[240px]">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{j.category}</div>
                              <div className="text-[11px] text-slate-500 truncate">{j.description}</div>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <span className={`font-mono font-bold text-sm ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isIncome ? '+' : '-'}{formatBDT(j.amount)}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openActorProfile(j.actorEmail, actorName, actorRole)}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left cursor-pointer group"
                                title={bn ? 'প্রোফাইল ও এনআইডি কার্ড দেখুন' : 'View Profile & NID'}
                              >
                                <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-700 dark:text-slate-300 ring-1 ring-slate-300 dark:ring-slate-600 overflow-hidden shrink-0 group-hover:ring-emerald-500">
                                  {actorPhoto ? (
                                    <img src={actorPhoto} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    actorName.slice(0, 1).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate max-w-[130px]">
                                    {actorName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                    {actorDesignation}
                                  </div>
                                </div>
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openActorProfile(j.actorEmail, actorName, actorRole)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-300 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                              >
                                {bn ? 'কার্ড দেখুন' : 'View Card'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {monthFilteredJournals.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                            {bn ? 'এই ফিল্টারে কোনো লেনদেন পাওয়া যায়নি' : 'No transactions recorded for this period'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
              stakeholders={stakeholders}
              erpUsers={erpUsers}
              ownerId={user.ownerId}
              actorEmail={user.email || 'admin@regardsagro.bd'}
              userRole={userRole}
              onBackToDashboard={() => setActiveNav('dashboard')}
              monthFilter={monthFilter}
              onChangeMonthFilter={setMonthFilter}
              lang={lang}
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
              actorEmail={user.email || 'admin@regardsagro.bd'}
              userRole={userRole}
              assignedBusinessFilter={assignedBusinessFilter}
              monthFilter={monthFilter}
              onChangeMonthFilter={setMonthFilter}
              onChangeRoleSimulation={(role, bizId) => {
                if (user.role !== 'super_admin') return;
                setUserRole(role);
                setAssignedBusinessFilter(bizId);
              }}
              lang={lang}
            />
          )}
        </main>
      </div>

      {/* Dashboard Quick Sale / Expense Modal */}
      {dashboardQuickTxModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setDashboardQuickTxModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
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
                    placeholder="0"
                    value={quickAmount === 0 ? '' : quickAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      setQuickAmount(raw === '' ? 0 : Number(raw));
                    }}
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
                    placeholder="0"
                    value={quickDue === 0 ? '' : quickDue}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      setQuickDue(raw === '' ? 0 : Number(raw));
                    }}
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
        actorEmail={user.email || 'admin@regardsagro.bd'}
        userRole={userRole}
        onSuccess={(newBizId) => {
          setSelectedBusinessId(newBizId);
          setActiveNav('dashboard');
        }}
      />

      {/* Comprehensive Client Workflow Guide & SOP Manual Modal */}
      <ClientWorkflowGuideModal
        isOpen={showOnboardingGuide}
        onClose={() => setShowOnboardingGuide(false)}
        lang={lang}
      />

      {/* Official Identity Card & Profile Modal for Owner / Manager / Staff */}
      <UserProfileCardModal
        isOpen={Boolean(viewingProfile)}
        onClose={() => setViewingProfile(null)}
        profile={viewingProfile}
        canEdit={viewingProfile?.id === user?.id || userRole === 'super_admin'}
        onSave={handleSaveProfile}
        lang={lang}
      />
    </div>
  );
}
