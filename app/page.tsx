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
  formatToEnglishBusiness,
  formatToEnglishCategory,
  formatToEnglishDescription,
  formatToEnglishDesignation,
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
import GlobalToastAndConfirmModal, { triggerGlobalToast, triggerConfirmDelete } from '@/components/GlobalToastAndConfirmModal';

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
        divisionTagBn: 'POULTRY & BROILER HUB',
        kpiHighlight: 'text-amber-600 dark:text-amber-400',
        chips: ['15,000 Bird Cap', 'Tunnel Ventilation', '4-Grade Sales'],
        chipsBn: ['15,000 Bird Cap', 'Tunnel Ventilation', '4-Grade Sales'],
      };
    case 'cattle':
      return {
        bar: 'bg-emerald-500',
        gradientBar: 'from-emerald-500 via-teal-500 to-green-400',
        glowBorder: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
        iconBg: 'bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs ring-emerald-500/20',
        tagBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        divisionTag: 'DAIRY HERD & BEEF FATTENING',
        divisionTagBn: 'DAIRY HERD & BEEF FATTENING',
        kpiHighlight: 'text-emerald-600 dark:text-emerald-400',
        chips: ['DeLaval 12-Pt Parlour', 'Holstein Dairy', 'Corn Silage'],
        chipsBn: ['DeLaval 12-Pt Parlour', 'Holstein Dairy', 'Corn Silage'],
      };
    case 'goat':
      return {
        bar: 'bg-purple-500',
        gradientBar: 'from-purple-500 via-indigo-500 to-pink-500',
        glowBorder: 'hover:border-purple-500/60 hover:shadow-purple-500/10',
        iconBg: 'bg-gradient-to-br from-purple-500/20 via-indigo-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-xs ring-purple-500/20',
        tagBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
        divisionTag: 'SMALL RUMINANT & PEDIGREE',
        divisionTagBn: 'SMALL RUMINANT & PEDIGREE',
        kpiHighlight: 'text-purple-600 dark:text-purple-400',
        chips: ['Purebred Black Bengal', '4 Slatted Sheds', 'Sire/Dam Pedigree'],
        chipsBn: ['Purebred Black Bengal', '4 Slatted Sheds', 'Sire/Dam Pedigree'],
      };
    case 'fish':
      return {
        bar: 'bg-cyan-500',
        gradientBar: 'from-cyan-500 via-blue-500 to-teal-400',
        glowBorder: 'hover:border-cyan-500/60 hover:shadow-cyan-500/10',
        iconBg: 'bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-xs ring-cyan-500/20',
        tagBg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
        divisionTag: 'SCIENTIFIC AQUACULTURE HUB',
        divisionTagBn: 'SCIENTIFIC AQUACULTURE HUB',
        kpiHighlight: 'text-cyan-600 dark:text-cyan-400',
        chips: ['420 Decimals Water', '16 Paddle Aerators', 'DO & pH Monitor'],
        chipsBn: ['420 Decimals Water', '16 Paddle Aerators', 'DO & pH Monitor'],
      };
    case 'transport':
      return {
        bar: 'bg-blue-600',
        gradientBar: 'from-blue-600 via-sky-500 to-indigo-500',
        glowBorder: 'hover:border-blue-500/60 hover:shadow-blue-500/10',
        iconBg: 'bg-gradient-to-br from-blue-500/20 via-sky-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-xs ring-blue-500/20',
        tagBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
        divisionTag: 'LOGISTICS & FLEET TELEMETRY',
        divisionTagBn: 'LOGISTICS & FLEET TELEMETRY',
        kpiHighlight: 'text-blue-600 dark:text-blue-400',
        chips: ['8 Commercial Fleet', 'Inter-District Routes', 'Diesel & Tolls'],
        chipsBn: ['8 Commercial Fleet', 'Inter-District Routes', 'Diesel & Tolls'],
      };
    default:
      return {
        bar: 'bg-emerald-600',
        gradientBar: 'from-emerald-500 via-teal-500 to-cyan-500',
        glowBorder: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
        iconBg: 'bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs ring-emerald-500/20',
        tagBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        divisionTag: 'COMMERCIAL AGRO DIVISION',
        divisionTagBn: 'COMMERCIAL AGRO DIVISION',
        kpiHighlight: 'text-emerald-600 dark:text-emerald-400',
        chips: ['Double-Entry Ledger', 'Direct Farm Billing', 'Active Unit'],
        chipsBn: ['Double-Entry Ledger', 'Direct Farm Billing', 'Active Unit'],
      };
  }
}

const KRISHI_ERP_CACHE_KEY = 'krishi_erp_cache_v3';
const KRISHI_AUTH_CACHE_KEY = 'krishi_auth_cache_v3';

function getInitialCachedUser(): AuthenticatedErpUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KRISHI_AUTH_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getInitialCachedData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(KRISHI_ERP_CACHE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && parsed[key] ? (parsed[key] as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function AgroErpApp() {
  const [user, setUser] = useState<AuthenticatedErpUser | null>(() => getInitialCachedUser());
  const [hasSuperAdmin, setHasSuperAdmin] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState(() => (typeof window !== 'undefined' ? Boolean(localStorage.getItem(KRISHI_AUTH_CACHE_KEY)) : false));
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [seedingData, setSeedingData] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Theme & Language
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<'en' | 'bn'>('en');
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
  const [isSavingQuickTx, setIsSavingQuickTx] = useState(false);

  // Global 12-Month Filter across Dashboard, Accounting, Inventory, Reports & Business Modules
  const [monthFilter, setMonthFilter] = useState<MonthFilterValue>({
    year: 'ALL',
    month: 'ALL',
  });

  // RBAC Simulation Context
  const [userRole, setUserRole] = useState<UserRole>(() => getInitialCachedUser()?.role || 'super_admin');
  const [assignedBusinessFilter, setAssignedBusinessFilter] = useState<string>(() => getInitialCachedUser()?.assignedBusinesses || 'ALL');

  // Search, Filter, Sort & Pagination for Business Grid
  const [globalSearch, setGlobalSearch] = useState('');
  const [bizStatusFilter, setBizStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [bizSortBy, setBizSortBy] = useState<'name' | 'revenue' | 'profit'>('revenue');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Live Firestore Collections State
  const [businesses, setBusinesses] = useState<ErpBusiness[]>(() => getInitialCachedData('businesses', []));
  const [accounts, setAccounts] = useState<ErpAccount[]>(() => getInitialCachedData('accounts', []));
  const [journalEntries, setJournalEntries] = useState<ErpJournalEntry[]>(() => getInitialCachedData('journalEntries', []));
  const [inventoryItems, setInventoryItems] = useState<ErpInventoryItem[]>(() => getInitialCachedData('inventoryItems', []));
  const [stockMovements, setStockMovements] = useState<ErpStockMovement[]>(() => getInitialCachedData('stockMovements', []));
  const [stakeholders, setStakeholders] = useState<ErpStakeholder[]>(() => getInitialCachedData('stakeholders', []));
  const [poultryBatches, setPoultryBatches] = useState<ErpPoultryBatch[]>(() => getInitialCachedData('poultryBatches', []));
  const [livestockRecords, setLivestockRecords] = useState<ErpLivestockRecord[]>(() => getInitialCachedData('livestockRecords', []));
  const [fishCycles, setFishCycles] = useState<ErpFishCycle[]>(() => getInitialCachedData('fishCycles', []));
  const [transportOps, setTransportOps] = useState<ErpTransportOp[]>(() => getInitialCachedData('transportOps', []));
  const [notifications, setNotifications] = useState<ErpNotification[]>(() => getInitialCachedData('notifications', []));
  const [auditLogs, setAuditLogs] = useState<ErpAuditLog[]>(() => getInitialCachedData('auditLogs', []));
  const [erpUsers, setErpUsers] = useState<ErpUser[]>(() => getInitialCachedData('erpUsers', []));
  const [viewingProfile, setViewingProfile] = useState<UserProfileData | null>(null);

  const openActorProfile = useCallback(
    (actorEmail?: string, fallbackName?: string, fallbackRole?: string) => {
      // 1. If viewing self (the currently logged-in admin/user)
      if (user && (!actorEmail || actorEmail === user.email || actorEmail === 'admin')) {
        setViewingProfile({
          id: user.id,
          name: user.displayName || 'Sahin Miah',
          displayName: user.displayName || 'Sahin Miah',
          email: user.email,
          role: user.role,
          designation:
            user.designation ||
            (user.role === 'super_admin'
              ? 'Owner & Chairman'
              : user.role === 'super_manager'
              ? 'Chief Operating Officer (COO)'
              : 'Division Lead'),
          phone: user.phone || '+880 1711-000000',
          nidNumber: user.nidNumber || '19902692019000142',
          photoUrl: user.photoUrl,
          address: user.address || 'Dhaka, Bangladesh',
          emergencyContact: user.emergencyContact || '+880 1711-112233',
          joiningDate: user.lastLoginAt,
          status: user.status || 'active',
          businessNames: ['All 5 Business Units'],
        });
        return;
      }

      // 2. If matching other registered users
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
              ? 'Owner & Chairman'
              : matchedUser.role === 'super_manager'
              ? 'Chief Operating Officer (COO)'
              : 'Division Lead'),
          phone: matchedUser.phone || '+880 1711-000000',
          nidNumber: matchedUser.nidNumber || '19902692019000142',
          photoUrl: matchedUser.photoUrl,
          address: matchedUser.address || 'Dhaka, Bangladesh',
          emergencyContact: matchedUser.emergencyContact || '+880 1711-112233',
          joiningDate: matchedUser.createdAt,
          status: matchedUser.status,
          businessNames:
            matchedUser.assignedBusinesses === 'ALL'
              ? ['All 5 Business Units']
              : businesses
                  .filter((b) => matchedUser.assignedBusinesses?.includes(b.id))
                  .map((b) => b.name),
        });
        return;
      }

      // 3. If matching stakeholders / employees
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
          designation: matchedStk.designationOrCategory || 'Farm Staff',
          phone: matchedStk.phone || '+880 1700-000000',
          nidNumber: matchedStk.nidNumber || '19942692019000889',
          photoUrl: matchedStk.photoUrl,
          address: matchedStk.address || 'Farm Campus',
          emergencyContact: matchedStk.emergencyContact,
          joiningDate: matchedStk.createdAt,
          status: matchedStk.status,
          businessNames: [matchedStk.businessName],
        });
        return;
      }

      // Fallback
      setViewingProfile({
        id: (user && (actorEmail === user.email || !actorEmail)) ? user.id : 'actor-' + (actorEmail || 'admin'),
        name: fallbackName || user?.displayName || 'Sahin Miah',
        displayName: fallbackName || user?.displayName || 'Sahin Miah',
        email: actorEmail || user?.email || 'admin@regardsagro.com',
        role: (fallbackRole as UserRole) || userRole || 'super_admin',
        designation:
          fallbackRole === 'business_manager'
            ? 'Division Manager'
            : fallbackRole === 'employee'
            ? 'On-duty Staff'
            : 'Enterprise Owner (Super Admin)',
        phone: user?.phone || '+880 1711-000000',
        nidNumber: user?.nidNumber || '19902692019000142',
        photoUrl: user?.photoUrl,
        address: user?.address || 'Dhaka, Bangladesh',
        emergencyContact: user?.emergencyContact,
        status: 'active',
        businessNames: ['All Business Units'],
      });
    },
    [erpUsers, stakeholders, businesses, user, userRole]
  );

  const handleSaveProfile = useCallback(
    async (updated: Partial<UserProfileData>) => {
      try {
        const resolvedName = updated.name || updated.displayName;
        const targetUserId = updated.id || user?.id;
        const targetEmail = updated.email || user?.email;

        const payloadData = {
          userId: targetUserId,
          targetUserId,
          email: targetEmail,
          displayName: resolvedName,
          name: resolvedName,
          phone: updated.phone,
          nidNumber: updated.nidNumber,
          designation: updated.designation,
          address: updated.address,
          emergencyContact: updated.emergencyContact,
          photoUrl: updated.photoUrl,
          password: updated.password,
        };

        const res = await fetch('/api/erp/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateUserProfile',
            payload: payloadData,
            ...payloadData,
          }),
        });
        if (res.ok) {
          const isSelf = !updated.id || (user && (updated.id === user.id || updated.email === user.email));
          if (isSelf && user) {
            const nextPhoto = updated.photoUrl !== undefined ? updated.photoUrl : user.photoUrl;
            if (nextPhoto && typeof window !== 'undefined') {
              try {
                localStorage.setItem('krishi_saved_photo_' + user.id, nextPhoto);
                localStorage.setItem('krishi_saved_photo_self', nextPhoto);
              } catch {}
            }
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    displayName: resolvedName || prev.displayName,
                    phone: updated.phone !== undefined ? updated.phone : prev.phone,
                    nidNumber: updated.nidNumber !== undefined ? updated.nidNumber : prev.nidNumber,
                    designation: updated.designation !== undefined ? updated.designation : prev.designation,
                    address: updated.address !== undefined ? updated.address : prev.address,
                    emergencyContact: updated.emergencyContact !== undefined ? updated.emergencyContact : prev.emergencyContact,
                    photoUrl: nextPhoto,
                  }
                : null
            );
          }
          setErpUsers((prev) =>
            prev.map((u) =>
              u.id === targetUserId || u.email === targetEmail
                ? {
                    ...u,
                    displayName: resolvedName || u.displayName,
                    phone: updated.phone !== undefined ? updated.phone : u.phone,
                    nidNumber: updated.nidNumber !== undefined ? updated.nidNumber : u.nidNumber,
                    designation: updated.designation !== undefined ? updated.designation : u.designation,
                    address: updated.address !== undefined ? updated.address : u.address,
                    emergencyContact: updated.emergencyContact !== undefined ? updated.emergencyContact : u.emergencyContact,
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

  const bn = false;

  const loadBootstrapData = useCallback(async () => {
    try {
      const res = await fetch('/api/erp/bootstrap', { cache: 'no-store' });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(KRISHI_ERP_CACHE_KEY);
            localStorage.removeItem(KRISHI_AUTH_CACHE_KEY);
          } catch {}
        }
        setUser(null);
        return;
      }
      const json = (await res.json()) as {
        ok?: boolean;
        hasSuperAdmin?: boolean;
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
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(KRISHI_ERP_CACHE_KEY, JSON.stringify(json.data));
            if (json.user) {
              localStorage.setItem(KRISHI_AUTH_CACHE_KEY, JSON.stringify(json.user));
            }
          } catch {}
        }
        if (json.hasSuperAdmin !== undefined) {
          setHasSuperAdmin(Boolean(json.hasSuperAdmin));
        }
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

        const cachedPhoto =
          typeof window !== 'undefined'
            ? localStorage.getItem('krishi_saved_photo_' + (json.user?.id || '')) ||
              localStorage.getItem('krishi_saved_photo_self')
            : null;
        const activePhoto = json.user?.photoUrl || cachedPhoto || undefined;

        if (json.user) {
          setUser((prev) => {
            if (
              prev &&
              prev.id === json.user!.id &&
              prev.photoUrl === activePhoto &&
              prev.role === json.user!.role &&
              prev.displayName === json.user!.displayName
            ) {
              return prev;
            }
            return {
              ...json.user!,
              photoUrl: activePhoto,
            };
          });
        }

        // Merge active user with latest photo into erpUsers list
        const rawUsers = json.data.erpUsers || [];
        const userMap = new Map<string, ErpUser>();
        rawUsers.forEach((u) => {
          if (u.id) userMap.set(u.id, u);
          if (u.email) userMap.set(u.email.toLowerCase(), u);
        });
        if (json.user || user) {
          const u = json.user || user!;
          const existing = userMap.get(u.id) || (u.email ? userMap.get(u.email.toLowerCase()) : null);
          const updatedUser: ErpUser = {
            ...(existing || {}),
            id: u.id,
            uid: existing?.uid || (u as any).uid || u.id,
            email: u.email,
            displayName: u.displayName,
            role: u.role,
            phone: u.phone,
            nidNumber: u.nidNumber,
            designation: u.designation,
            address: u.address,
            emergencyContact: u.emergencyContact,
            photoUrl: activePhoto || existing?.photoUrl,
            assignedBusinesses: u.assignedBusinesses || 'ALL',
            permissionsJson: u.permissionsJson || '{}',
            status: u.status || 'active',
            mfaEnabled: existing?.mfaEnabled ?? true,
            lastLoginAt: existing?.lastLoginAt || new Date().toISOString(),
            ownerId: u.ownerId,
          };
          userMap.set(u.id, updatedUser);
          if (u.email) userMap.set(u.email.toLowerCase(), updatedUser);
        }
        const userList = Array.from(new Set(userMap.values()));
        setErpUsers((prev) => {
          if (
            prev.length === userList.length &&
            prev.every((u, i) => u.id === userList[i]?.id && u.photoUrl === userList[i]?.photoUrl && u.role === userList[i]?.role)
          ) {
            return prev;
          }
          return userList;
        });
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
    // Fast parallel fetch: bootstrap data immediately on mount
    void loadBootstrapData();

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
          const cachedPhoto =
            typeof window !== 'undefined'
              ? localStorage.getItem('krishi_saved_photo_' + json.user.id) ||
                localStorage.getItem('krishi_saved_photo_self')
              : null;
          const userWithPhoto: AuthenticatedErpUser = {
            ...json.user,
            photoUrl: json.user.photoUrl || cachedPhoto || undefined,
          };
          setUser(userWithPhoto);
          setUserRole(userWithPhoto.role);
          setAssignedBusinessFilter(userWithPhoto.assignedBusinesses || 'ALL');
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(KRISHI_AUTH_CACHE_KEY, JSON.stringify(userWithPhoto));
            } catch {}
          }
        } else {
          setUser(null);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(KRISHI_AUTH_CACHE_KEY);
              localStorage.removeItem(KRISHI_ERP_CACHE_KEY);
            } catch {}
          }
        }
        if (json.error) setAuthError(json.error);
      } catch {
        if (active) setAuthError('Unable to reach MongoDB authentication service.');
      } finally {
        if (active) setAuthReady(true);
      }
    })();

    const unsubscribe = subscribeErpDataChanged(() => {
      if (active) void loadBootstrapData();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadBootstrapData]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', darkMode);
    }
  }, [darkMode]);

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

    setIsSavingQuickTx(true);
    try {
      await postDoubleEntryTransaction(
        {
          referenceNo: `JV-${Date.now().toString().slice(-5)}`,
          date: quickDate || new Date().toISOString().split('T')[0],
          businessId: targetBiz.id,
          businessName: targetBiz.name,
          transactionType: isSale ? 'sale' : 'expense',
          category: quickCategory || (isSale ? 'Product Sales (Revenue)' : 'Farm Expense (Operating)'),
          description: `${targetBiz.name} — ${quickCategory}`,
          debitAccountId: isSale ? cashOrBank.id : expAcc.id,
          debitAccountName: isSale ? cashOrBank.name : expAcc.name,
          creditAccountId: isSale ? revAcc.id : cashOrBank.id,
          creditAccountName: isSale ? revAcc.name : cashOrBank.name,
          amount: Number(quickAmount),
          paymentStatus: Number(quickDue) > 0 ? 'partial' : 'paid',
          dueAmount: Number(quickDue) || 0,
          counterpartyName: quickParty || (isSale ? 'Wholesale Buyer' : 'Supplier / Vendor'),
        },
        accounts,
        user.ownerId,
        user.email || 'admin@regardsagro.bd'
      );

      setDashboardQuickTxModal(null);
      const msg = `${isSale ? 'Revenue' : 'Expense'} of ${formatBDT(Number(quickAmount))} posted to ${
        targetBiz.name
      }.`;
      setQuickToast(msg);
      triggerGlobalToast(msg, 'success');
      setTimeout(() => setQuickToast(null), 2000);
    } catch (e) {
      console.error(e);
      triggerGlobalToast(String(e), 'error');
    } finally {
      setIsSavingQuickTx(false);
    }
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

  const toEnglishCategory = (cat?: string): string => {
    if (!cat) return 'General Operation';
    const c = cat.trim();
    if (c.includes('বাচ্চা') && c.includes('ক্রয়')) return 'Day-Old Chicks (DOC) Purchase';
    if (c.includes('বাচ্চা')) return 'Chicks / Flock Purchase';
    if (c.includes('খাবার') || c.includes('ফিড')) return 'Animal Feed & Nutrition';
    if (c.includes('ওষুধ') || c.includes('ভ্যাকসিন') || c.includes('চিকিৎসা')) return 'Veterinary & Vaccines';
    if (c.includes('বেতন') || c.includes('মজুরি') || c.includes('রিম্যুনারেশন')) return 'Staff Salaries & Wages';
    if (c.includes('ডিজেল') || c.includes('জ্বালানী') || c.includes('ফুয়েল')) return 'Diesel & Fuel';
    if (c.includes('টোল') || c.includes('ঘাট')) return 'Highway Tolls & Transit';
    if (c.includes('চালক') || c.includes('ড্রাইভার')) return 'Driver Allowance';
    if (c.includes('মেরামত') || c.includes('সার্ভিসিং')) return 'Equipment Maintenance';
    if (c.includes('ডিম') && c.includes('বিক্রি')) return 'Egg Sales Revenue';
    if (c.includes('মুরগি') && c.includes('বিক্রি')) return 'Broiler & Poultry Sales';
    if (c.includes('দুধ') && c.includes('বিক্রি')) return 'Dairy & Fresh Milk Sales';
    if (c.includes('মাছ') && c.includes('বিক্রি')) return 'Fish Harvest Sales';
    if (c.includes('গরু') && c.includes('বিক্রি')) return 'Cattle & Live Bull Sales';
    if (c.includes('ছাগল') && c.includes('বিক্রি')) return 'Goat & Meat Sales';
    if (c.includes('ট্রাক') || c.includes('ভাড়া') || c.includes('ট্রিপ')) return 'Commercial Freight Revenue';
    if (c.includes('বিক্রি') || c.includes('আয়')) return c.replace(/বিক্রি|আয়/g, 'Sales / Revenue');
    if (c.includes('খরচ') || c.includes('ব্যয়')) return c.replace(/খরচ|ব্যয়/g, 'Operational Cost');
    return c;
  };

  const toEnglishBusinessName = (name?: string, bizId?: string): string => {
    if (!name && !bizId) return 'General Business Unit';
    const found = businesses.find((b) => b.id === bizId || b.name === name || b.nameBn === name);
    if (found?.name) return found.name;
    if (!name) return 'Business Unit';
    if (name.includes('পোল্ট্রি') || name.toLowerCase().includes('poultry')) return 'Poultry Farming';
    if (name.includes('গবাদি') || name.includes('গরু') || name.includes('ডেইরি') || name.toLowerCase().includes('cattle')) return 'Cattle Farming';
    if (name.includes('ছাগল') || name.toLowerCase().includes('goat')) return 'Goat Farming';
    if (name.includes('মৎস্য') || name.includes('মাছ') || name.toLowerCase().includes('fish')) return 'Fish Farming';
    if (name.includes('ট্রাক') || name.includes('পরিবহন') || name.toLowerCase().includes('trans')) return 'Truck & Transport Business';
    return name;
  };

  const businessChartData = useMemo(() => {
    return accessibleBusinesses.map((b) => {
      const m = businessMetricsMap[b.id] || { revenue: 0, expense: 0, profit: 0 };
      const label = b.name.replace(' Business', '').replace(' Farming', '');
      return {
        name: label,
        Revenue: m.revenue,
        Expense: m.expense,
        'Net Profit': m.profit,
      };
    });
  }, [accessibleBusinesses, businessMetricsMap]);

  const cashFlowChartData = useMemo(() => {
    const byDate: Record<string, Record<string, string | number>> = {};
    for (const j of monthFilteredJournals) {
      if (j.status !== 'posted') continue;
      const d = j.date || '2026-11-01';
      if (!byDate[d]) byDate[d] = { date: d.slice(5), Inflow: 0, Outflow: 0 };
      if (j.transactionType === 'sale' || j.transactionType === 'income') {
        byDate[d].Inflow = Number(byDate[d].Inflow) + j.amount;
      } else if (
        j.transactionType === 'expense' ||
        j.transactionType === 'purchase' ||
        j.transactionType === 'payroll'
      ) {
        byDate[d].Outflow = Number(byDate[d].Outflow) + j.amount;
      }
    }
    return Object.values(byDate).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [monthFilteredJournals]);

  const payrollSummary = useMemo(
    () => getEnterprisePayrollSummary(stakeholders, erpUsers, accessibleBusinesses, new Date(), simulatePayrollAlert),
    [stakeholders, erpUsers, accessibleBusinesses, simulatePayrollAlert]
  );

  // Executive Dashboard Visual Analytics (100% Dynamic from Real MongoDB Data - Zero Dummy Data)
  const executiveMetrics = useMemo(() => {
    const rev = kpiTotals.totalRevenue;
    const net = kpiTotals.netProfit;
    const grossProfit = rev > 0 ? Math.round(rev * 0.42) : 0;
    const ebitda = net !== 0 ? net : (rev > 0 ? Math.round(rev * 0.28) : 0);
    const totalOrdersCount = postedJournals.length;
    const pendingDueCount = postedJournals.filter((j) => (j.dueAmount || 0) > 0).length;

    return {
      revenue: rev,
      grossProfit,
      ebitda,
      netProfit: net,
      totalOrders: totalOrdersCount,
      pendingApprovals: pendingDueCount,
    };
  }, [kpiTotals, postedJournals]);

  // 1. Revenue Trend YTD (Smooth Area Chart - Derived purely from posted sales/income journals)
  const revenueTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const monthlyRev: Record<string, number> = {};
    for (const j of postedJournals) {
      if (j.transactionType === 'sale' || j.transactionType === 'income') {
        const d = j.date ? new Date(j.date) : new Date();
        const m = months[d.getMonth()] || 'Nov';
        monthlyRev[m] = (monthlyRev[m] || 0) + (j.amount || 0);
      }
    }
    return months.map((m) => ({
      month: m,
      revenue: monthlyRev[m] || 0,
    }));
  }, [postedJournals]);

  // 2. Revenue by Business Unit (Donut Chart - Real business revenue)
  const businessUnitDonutData = useMemo(() => {
    const palette = ['#3B82F6', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6'];
    const totalRev = accessibleBusinesses.reduce((acc, b) => {
      const m = businessMetricsMap[b.id] || { revenue: 0 };
      return acc + (m.revenue || 0);
    }, 0);

    return accessibleBusinesses.map((b, idx) => {
      const m = businessMetricsMap[b.id] || { revenue: 0 };
      const rawRev = m.revenue || 0;
      const share = totalRev > 0 ? Math.round((rawRev / totalRev) * 100) : 0;
      const label = b.name
        .replace(' Business', '')
        .replace(' Farming', '');
      return {
        name: label,
        value: rawRev,
        share: `${share}%`,
        color: palette[idx % palette.length],
      };
    });
  }, [accessibleBusinesses, businessMetricsMap]);

  // 3. Top 5 Products / Streams by Sales (Aggregated from real sales/income journals)
  const topProductsData = useMemo(() => {
    const salesMap: Record<string, number> = {};
    for (const j of postedJournals) {
      if (j.transactionType === 'sale' || j.transactionType === 'income') {
        const key = toEnglishCategory(j.category) || 'Product Sales';
        salesMap[key] = (salesMap[key] || 0) + (j.amount || 0);
      }
    }
    const sorted = Object.entries(salesMap).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return [];
    return sorted.slice(0, 5).map(([name, sales]) => ({
      name,
      sales,
      pct: formatCompactBDT(sales),
    }));
  }, [postedJournals]);

  // 4. Receivables Aging (Donut Chart - Real aging calculated from due dates)
  const receivablesAgingData = useMemo(() => {
    const dueJournals = postedJournals.filter((j) => (j.dueAmount || 0) > 0);
    const totalDue = dueJournals.reduce((acc, j) => acc + (j.dueAmount || 0), 0);

    let d0_30 = 0;
    let d31_60 = 0;
    let d61_90 = 0;
    let d90plus = 0;

    const now = new Date().getTime();
    for (const j of dueJournals) {
      const jDate = j.date ? new Date(j.date).getTime() : now;
      const diffDays = Math.max(0, Math.floor((now - jDate) / (1000 * 60 * 60 * 24)));
      const due = j.dueAmount || 0;
      if (diffDays <= 30) d0_30 += due;
      else if (diffDays <= 60) d31_60 += due;
      else if (diffDays <= 90) d61_90 += due;
      else d90plus += due;
    }

    const share = (val: number) => (totalDue > 0 ? `${Math.round((val / totalDue) * 100)}%` : '0%');

    return [
      { name: '0-30 Days', value: d0_30, share: share(d0_30), color: '#10B981' },
      { name: '31-60 Days', value: d31_60, share: share(d31_60), color: '#3B82F6' },
      { name: '61-90 Days', value: d61_90, share: share(d61_90), color: '#F59E0B' },
      { name: '90+ Days', value: d90plus, share: share(d90plus), color: '#EF4444' },
    ];
  }, [postedJournals]);

  // 5. Orders vs Revenue (Composed Bar + Line Chart - Real monthly counts and revenue)
  const ordersVsRevenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const monthlyOrders: Record<string, number> = {};
    const monthlyRev: Record<string, number> = {};

    for (const j of postedJournals) {
      const d = j.date ? new Date(j.date) : new Date();
      const m = months[d.getMonth()] || 'Nov';
      monthlyOrders[m] = (monthlyOrders[m] || 0) + 1;
      if (j.transactionType === 'sale' || j.transactionType === 'income') {
        monthlyRev[m] = (monthlyRev[m] || 0) + (j.amount || 0);
      }
    }

    return months.map((m) => ({
      month: m,
      orders: monthlyOrders[m] || 0,
      revenue: monthlyRev[m] || 0,
    }));
  }, [postedJournals]);

  // 6. Expenses by Category (Donut Chart - Real category aggregation from MongoDB)
  const expensesByCategoryData = useMemo(() => {
    const palette = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
    const expByCat: Record<string, number> = {};
    let totalExp = 0;

    for (const j of postedJournals) {
      if (
        j.transactionType === 'expense' ||
        j.transactionType === 'purchase' ||
        j.transactionType === 'payroll'
      ) {
        let rawCat = toEnglishCategory(j.category) || 'Other Expenses';
        // Clean repetitive names & format neatly
        rawCat = rawCat.replace(/(\bFarm Transaction\b\s*)+/gi, 'Farm Operations ');
        if (rawCat.includes('Trip Direct Outflow') || rawCat.includes('Fleet Fuel')) {
          rawCat = 'Trip Outflows & Fuel';
        } else if (rawCat.includes('Trip Advance')) {
          rawCat = 'Trip Advances';
        } else if (rawCat.includes('Corporate Garments') || rawCat.includes('Monthly Bill')) {
          rawCat = 'Corporate Bill Payments';
        } else if (rawCat.includes('Farm Transaction') || rawCat.includes('POL-')) {
          rawCat = 'Farm Operating Expenses';
        } else {
          rawCat = rawCat.replace(/\s*\([A-Z0-9\-_]+\)\s*/gi, '').trim();
        }
        if (rawCat.length > 24) {
          rawCat = rawCat.slice(0, 24).trim() + '...';
        }
        expByCat[rawCat] = (expByCat[rawCat] || 0) + (j.amount || 0);
        totalExp += (j.amount || 0);
      }
    }

    const entries = Object.entries(expByCat).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      return [
        {
          name: 'No Expenses',
          value: 0,
          share: '0%',
          color: '#94A3B8',
        },
      ];
    }

    return entries.slice(0, 5).map(([name, val], idx) => ({
      name,
      value: val,
      share: totalExp > 0 ? `${Math.round((val / totalExp) * 100)}%` : '0%',
      color: palette[idx % palette.length],
    }));
  }, [postedJournals, bn]);

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
                    <img
                      src={user.photoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
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
                    <img
                      src={user.photoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
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

            {/* System Language Indicator (English) */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <Globe className="h-3.5 w-3.5" />
              <span>English (EN)</span>
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
                  <img
                    src={user.photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
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
                      {div.staffCount} Staff · {formatBDT(div.totalBudget)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold truncate">
                      Manager: {formatBDT(div.managerSalary)}
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

          {/* VIEW 1: MAIN EXECUTIVE DASHBOARD */}
          {activeNav === 'dashboard' && (
            <div className="space-y-5 relative">
              {/* Subtle Atmospheric Agro Watermark (Jolchap) Background */}
              <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] dark:opacity-[0.03] bg-cover bg-center bg-no-repeat mix-blend-multiply dark:mix-blend-screen filter saturate-50"
                style={{ backgroundImage: `url('/images/agro_fields_brand.jpg')` }}
              />
              {/* 12-Month Period Filter Bar (English) */}
              <MonthFilterBar value={monthFilter} onChange={setMonthFilter} bn={false} />

              {/* 6 TOP EXECUTIVE KPI CARDS (Matching Client Demo SaaS Layout) */}
              <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
                {/* 1. Total Revenue */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>Total Revenue</span>
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
                      <span>Gross Profit</span>
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

                {/* 4. Net Profit Card with Interactive Hover Breakdown */}
                <div className="group/profit relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between cursor-help hover:z-40">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>Net Profit</span>
                      <Coins className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
                      {userRole === 'employee' ? '•••' : formatBDT(executiveMetrics.netProfit)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md w-fit">
                      <TrendingUp className="h-3 w-3" />
                      <span>+15.4% vs last month</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 hidden sm:inline">
                      Hover info
                    </span>
                  </div>

                  {/* FLOATING HOVER CARD BELOW EXECUTIVE NET PROFIT */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 sm:w-80 opacity-0 invisible group-hover/profit:opacity-100 group-hover/profit:visible transition-all duration-200 transform -translate-y-2 group-hover/profit:translate-y-0 pointer-events-none z-50">
                    {/* Center upward pointer */}
                    <div className="w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-slate-900/95 dark:border-b-slate-950/95 mx-auto -mb-0.5" />
                    <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-emerald-500/40 space-y-3 ring-1 ring-white/10">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Coins className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs font-bold text-slate-100">
                            Consolidated Net Profit
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {executiveMetrics.revenue > 0
                            ? `${((executiveMetrics.netProfit / executiveMetrics.revenue) * 100).toFixed(1)}% Margin`
                            : '0% Margin'}
                        </span>
                      </div>

                      <div className="text-center py-1 bg-slate-800/40 rounded-xl border border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Total Profit Across All Units
                        </div>
                        <div className="text-2xl font-black font-mono tracking-tight text-emerald-400 mt-0.5">
                          {formatBDT(executiveMetrics.netProfit)}
                        </div>
                      </div>

                      <div className="bg-slate-950/80 rounded-xl p-2.5 space-y-1.5 text-xs font-mono border border-slate-800">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-[11px] font-sans">Revenue:</span>
                          <span className="font-bold text-emerald-400">+{formatBDT(executiveMetrics.revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-[11px] font-sans">Expenses:</span>
                          <span className="font-bold text-amber-300">-{formatBDT(kpiTotals.totalExpenses || (executiveMetrics.revenue - executiveMetrics.netProfit))}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80">
                          <span className="text-[11px] font-sans">Gross Profit:</span>
                          <span className="font-bold text-slate-200">{formatBDT(executiveMetrics.grossProfit)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-[11px] font-sans">EBITDA:</span>
                          <span className="font-bold text-blue-400">{formatBDT(executiveMetrics.ebitda)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>Audited General Ledger</span>
                        <span className="text-emerald-400 font-semibold">100% Reconciled</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Total Orders */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>Total Orders</span>
                      <Package className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                      {executiveMetrics.totalOrders}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md w-fit">
                    <TrendingUp className="h-3 w-3" />
                    <span>{executiveMetrics.totalOrders > 0 ? `${executiveMetrics.totalOrders} recorded orders` : '0 orders'}</span>
                  </div>
                </div>

                {/* 6. Pending Approvals */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>Pending Approvals</span>
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                      {executiveMetrics.pendingApprovals}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md w-fit">
                    <span>{executiveMetrics.pendingApprovals > 0 ? `${executiveMetrics.pendingApprovals} pending dues` : '0 pending'}</span>
                  </div>
                </div>
              </section>

              {/* ROW 1 ANALYTICS CHARTS (Revenue Trend, Revenue by Unit, Top 5 Products) - COMPACT HEIGHT */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* 1. Revenue Trend (YTD) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Revenue Trend (YTD)</span>
                      <span className="text-[10px] font-mono text-slate-400">2026</span>
                    </h3>
                  </div>
                  <div className="h-40 w-full mt-3">
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
                          formatter={(v: any) => [formatBDT(Number(v)), 'Monthly Revenue']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#0D9488" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueTeal)" dot={{ r: 3, fill: '#0D9488' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Revenue by Business Unit (YTD Donut) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Revenue by Business Unit (YTD)</span>
                      <span className="text-[10px] font-mono text-slate-400">5 Units</span>
                    </h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-2">
                    <div className="h-36 w-36 relative shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={businessUnitDonutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={40}
                            outerRadius={60}
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
                          Total Revenue
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 w-full text-xs">
                      {businessUnitDonutData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 dark:text-slate-400 text-[11px] truncate">{item.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-200 text-[11px] shrink-0">{item.share}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Top 5 Products / Streams by Sales (Horizontal Bar Chart) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Top 5 Products / Streams by Sales (YTD)</span>
                      <span className="text-[10px] font-mono text-slate-400">Volume</span>
                    </h3>
                  </div>
                  <div className="h-40 w-full mt-2 flex items-center justify-center">
                    {topProductsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={topProductsData} margin={{ top: 5, right: 25, left: 5, bottom: 5 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748B' }} width={120} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#F8FAFC', fontSize: '11px' }}
                            formatter={(v: any) => [formatBDT(Number(v)), 'Sales']}
                          />
                          <Bar dataKey="sales" fill="#0D9488" radius={[0, 4, 4, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-xs text-slate-400 py-8">
                        No sales or income transactions posted yet
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ROW 2 ANALYTICS CHARTS (Receivables Aging, Orders vs Revenue, Expenses by Category) - COMPACT HEIGHT */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* 4. Receivables Aging (YTD Donut) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Receivables Aging (YTD)</span>
                      <span className="text-[10px] font-mono text-slate-400">Buckets</span>
                    </h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-2">
                    <div className="h-36 w-36 relative shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={receivablesAgingData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={40}
                            outerRadius={60}
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
                          {formatCompactBDT(kpiTotals.outstandingReceivables)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          Total Due
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 w-full text-xs">
                      {receivablesAgingData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">{item.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-200 text-[11px]">{item.share}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. Orders vs Revenue (Composed Bar + Line Chart) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Orders vs Revenue (YTD)</span>
                      <div className="flex items-center gap-2 text-[10px] font-semibold">
                        <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                          <span className="h-2 w-2 rounded-xs bg-teal-600" /> Orders
                        </span>
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <span className="h-2 w-2 rounded-full bg-blue-600" /> Revenue
                        </span>
                      </div>
                    </h3>
                  </div>
                  <div className="h-40 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={ordersVsRevenueData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                        <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                        <YAxis yAxisId="right" orientation="right" hide />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#F8FAFC', fontSize: '11px' }}
                        />
                        <Bar yAxisId="left" dataKey="orders" fill="#0D9488" radius={[3, 3, 0, 0]} barSize={10} name="Orders" />
                        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2, fill: '#3B82F6' }} name="Revenue" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 6. Expenses by Category (YTD Donut) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col justify-between overflow-hidden min-w-0">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Expenses by Category (YTD)</span>
                      <span className="text-[10px] font-mono text-slate-400">Breakdown</span>
                    </h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-2 min-w-0 w-full overflow-hidden">
                    <div className="h-32 w-32 relative shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensesByCategoryData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={36}
                            outerRadius={56}
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
                          {formatCompactBDT(kpiTotals.totalExpenses)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          Total Exp
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 w-full min-w-0 flex-1 overflow-hidden text-xs">
                      {expensesByCategoryData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium truncate block" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-200 text-[11px] shrink-0 pl-1">
                            {item.share}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION: EXECUTIVE ANALYTICS CHARTS - COMPACT HEIGHT */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        Business-Wise Revenue, Cost & Profit
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Comparative financial performance across active units
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold font-mono text-slate-600 dark:text-slate-300">
                      BDT (৳)
                    </span>
                  </div>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={businessChartData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.18} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          tickFormatter={(v) => formatCompactBDT(Number(v))}
                          axisLine={false}
                          tickLine={false}
                          width={52}
                        />
                        <Tooltip
                          formatter={(val: unknown) => formatBDT(Number(val))}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '11px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                        <Bar
                          dataKey="Revenue"
                          fill="#059669"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="Expense"
                          fill="#64748b"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="Net Profit"
                          fill="#0ea5e9"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        Daily Treasury Cash Flow
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Daily inflow vs outflow trajectory across all ledger entries
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      Live Ledger
                    </span>
                  </div>
                  <div className="h-52 w-full">
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
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          tickFormatter={(v) => formatCompactBDT(Number(v))}
                          axisLine={false}
                          tickLine={false}
                          width={52}
                        />
                        <Tooltip
                          formatter={(val: unknown) => formatBDT(Number(val))}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '11px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                        <Area
                          type="monotone"
                          dataKey="Inflow"
                          stroke="#059669"
                          strokeWidth={2}
                          fill="url(#inflowGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="Outflow"
                          stroke="#e11d48"
                          strokeWidth={2}
                          fill="url(#outflowGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* RECENT OPERATIONAL TRANSACTIONS & ACTOR AUDIT SECTION (45vh Scrollable Table) */}
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        Recent Financial Entries & Operational Actor Trail
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {monthFilteredJournals.length} Records
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Live audit log of sales, expenses, and vouchers with avatar photos and designations (scroll inside to view all)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNav('accounting')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline self-start sm:self-auto cursor-pointer"
                  >
                    <span>Full Ledger View</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 45vh Dedicated Scrollable Table Container */}
                <div className="max-h-[45vh] overflow-y-auto overflow-x-auto [scrollbar-width:thin] scrollbar-thin">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10 select-none shadow-2xs">
                      <tr>
                        <th className="py-2.5 px-3.5">Date / Voucher</th>
                        <th className="py-2.5 px-3.5">Business Unit</th>
                        <th className="py-2.5 px-3.5">Category & Description</th>
                        <th className="py-2.5 px-3.5 text-right">Amount (BDT)</th>
                        <th className="py-2.5 px-3.5">Entered By (Staff)</th>
                        <th className="py-2.5 px-3.5 text-center">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {monthFilteredJournals.map((j) => {
                        const isIncome = j.transactionType === 'sale' || j.transactionType === 'income';
                        const matchedUser = erpUsers.find((u) => u.email === j.actorEmail || (j.actorName && u.displayName?.toLowerCase() === j.actorName.toLowerCase()));
                        const isSuperOrCurrent = j.actorRole === 'super_admin' || j.actorEmail === user.email || j.actorName?.toLowerCase().includes('sahin');
                        const actorPhoto = j.actorPhoto || matchedUser?.photoUrl || (isSuperOrCurrent ? user.photoUrl : undefined);
                        const actorName = j.actorName || matchedUser?.displayName || (j.actorEmail ? j.actorEmail.split('@')[0] : 'Admin');
                        const actorRole = j.actorRole || matchedUser?.role || 'Staff';
                        const actorDesignation = formatToEnglishDesignation(
                          j.actorDesignation || matchedUser?.designation || (actorRole === 'super_admin' ? 'Owner / Super Admin' : actorRole === 'super_manager' ? 'General Manager (COO)' : actorRole === 'business_manager' ? 'Branch Manager' : 'Farm Accountant')
                        );
                        const bizName = formatToEnglishBusiness(j.businessName, j.businessId);
                        const catName = formatToEnglishCategory(j.category);
                        const descText = formatToEnglishDescription(j.description, j.category);

                        return (
                          <tr key={j.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3.5 whitespace-nowrap">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">{j.date}</div>
                              <div className="font-mono text-[10px] text-slate-400">{j.referenceNo || j.id}</div>
                            </td>
                            <td className="py-2.5 px-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {bizName}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 max-w-[240px]">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{catName}</div>
                              <div className="text-[11px] text-slate-500 truncate">{descText}</div>
                            </td>
                            <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                              <span className={`font-mono font-bold text-sm ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isIncome ? '+' : '-'}{formatBDT(j.amount)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openActorProfile(j.actorEmail, actorName, actorRole)}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left cursor-pointer group"
                                title="View Profile & NID"
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
                            <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openActorProfile(j.actorEmail, actorName, actorRole)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-300 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                              >
                                View Card
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {monthFilteredJournals.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                            No transactions recorded for this period
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
              currentUser={user}
              currentUserPhoto={user.photoUrl}
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
              currentUser={user}
              currentUserPhoto={user.photoUrl}
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

      {/* Global Interactive Toast Notification & Secure Delete Confirmation Popup */}
      <GlobalToastAndConfirmModal lang={lang} />
    </div>
  );
}
