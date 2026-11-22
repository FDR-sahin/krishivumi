'use client';

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Bird,
  Beef,
  ShieldCheck,
  Fish,
  Truck,
  Factory,
  CheckCircle2,
  ArrowLeft,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  PackageCheck,
  Users,
  UserPlus,
  Calendar,
  X,
  Briefcase,
  UserCheck,
  Award,
  Eye,
  Printer,
  Copy,
  Check,
  FileText,
  Loader2,
  Trash2,
  Coins,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import {
  ErpBusiness,
  ErpPoultryBatch,
  ErpLivestockRecord,
  ErpFishCycle,
  ErpTransportOp,
  ErpJournalEntry,
  ErpInventoryItem,
  ErpAccount,
  ErpAuditLog,
  ErpStakeholder,
  ErpUser,
  formatBDT,
} from '@/lib/erp-types';
import {
  createPoultryBatchRecord,
  createLivestockAnimalRecord,
  updateLivestockAnimalRecord,
  createFishCycleRecord,
  createTransportOpRecord,
  postDoubleEntryTransaction,
  createStakeholderRecord,
  assignBusinessManager,
  deleteStakeholderRecord,
  deleteJournalEntry,
} from '@/lib/erp-service';
import PoultryManagementModule from './PoultryManagementModule';
import LivestockManagementModule from './LivestockManagementModule';
import FishManagementModule from './FishManagementModule';
import TransportManagementModule from './TransportManagementModule';
import MonthFilterBar, { MonthFilterValue, matchesMonthFilter } from './MonthFilterBar';
import UserProfileCardModal, { UserProfileData } from './UserProfileCardModal';
import TripChallanModal from './TripChallanModal';
import { triggerGlobalToast, triggerConfirmDelete } from './GlobalToastAndConfirmModal';

const parseNum = (val: string): number => {
  const clean = val.replace(/^0+(?=\d)/, '');
  return clean === '' ? 0 : Number(clean);
};

function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Taka Only';
  const units = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  }
  return convert(Math.abs(amount)) + ' Taka Only';
}

function cleanAnimalText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/প্রাথমিক স্বাস্থ্য পরীক্ষা সম্পন্ন \(FMD\/BQ Scheduled\)/gi, 'Initial health checkup completed (FMD/BQ Scheduled)')
    .replace(/প্রাথমিক স্বাস্থ্য পরীক্ষা সম্পন্ন/gi, 'Initial health checkup completed')
    .replace(/ধরন:\s*Breeding Doe\s*\(প্রজননক্ষম মা ছাগল\)/gi, 'Category: Breeding Doe')
    .replace(/প্রজননক্ষম মা ছাগল/gi, 'Breeding Doe')
    .replace(/জন্ম সাল:/gi, 'Birth Year:')
    .replace(/কেনা:/gi, 'Acquired:')
    .replace(/কুষ্টিয়া ব্ল্যাক পার্ল/gi, 'Kushtia Black Pearl')
    .replace(/কুষ্টিয়া ব্ল্যাক বেঙ্গল/gi, 'Kushtia Black Bengal')
    .replace(/কুষ্টিয়া/gi, 'Kushtia')
    .replace(/ব্ল্যাক বেঙ্গল/gi, 'Black Bengal')
    .replace(/\(ব্ল্যাক বেঙ্গল\)/gi, '')
    .trim();
}

interface SpecializedModulesViewProps {
  activeBusiness: ErpBusiness;
  poultryBatches: ErpPoultryBatch[];
  livestockRecords: ErpLivestockRecord[];
  fishCycles: ErpFishCycle[];
  transportOps: ErpTransportOp[];
  journalEntries: ErpJournalEntry[];
  inventoryItems: ErpInventoryItem[];
  accounts: ErpAccount[];
  auditLogs?: ErpAuditLog[];
  stakeholders?: ErpStakeholder[];
  erpUsers?: ErpUser[];
  ownerId: string;
  actorEmail: string;
  userRole: string;
  onBackToDashboard: () => void;
  monthFilter?: MonthFilterValue;
  onChangeMonthFilter?: (next: MonthFilterValue) => void;
  currentUser?: ErpUser | { id?: string; email?: string; displayName?: string; photoUrl?: string } | null;
  currentUserPhoto?: string;
  lang?: 'en' | 'bn';
}

export default function SpecializedModulesView({
  activeBusiness,
  poultryBatches,
  livestockRecords,
  fishCycles,
  transportOps,
  journalEntries,
  inventoryItems,
  accounts,
  auditLogs = [],
  stakeholders = [],
  erpUsers = [],
  ownerId,
  actorEmail,
  userRole,
  onBackToDashboard,
  monthFilter: controlledMonthFilter,
  onChangeMonthFilter,
  currentUser,
  currentUserPhoto,
  lang = 'en',
}: SpecializedModulesViewProps) {
  const tpl = activeBusiness.templateType;
  const bn = false;
  const [localMonthFilter, setLocalMonthFilter] = useState<MonthFilterValue>({
    year: 'ALL',
    month: 'ALL',
  });
  const activeMonthFilter = controlledMonthFilter ?? localMonthFilter;
  const setMonthFilter = onChangeMonthFilter ?? setLocalMonthFilter;

  const bizBatches = poultryBatches.filter(
    (b) =>
      b.businessId === activeBusiness.id ||
      (tpl === 'poultry' && b.businessId.includes('biz-poultry'))
  );
  const bizCattle = livestockRecords.filter(
    (r) =>
      r.species === 'cattle' &&
      (r.businessId === activeBusiness.id || r.businessId.includes('biz-cattle'))
  );
  const bizGoats = livestockRecords.filter(
    (r) =>
      r.species === 'goat' &&
      (r.businessId === activeBusiness.id || r.businessId.includes('biz-goat'))
  );
  const bizFish = fishCycles.filter(
    (f) =>
      f.businessId === activeBusiness.id ||
      (tpl === 'fish' && f.businessId.includes('biz-fish'))
  );
  const bizTransport = transportOps.filter(
    (t) =>
      (t.businessId === activeBusiness.id ||
        (tpl === 'transport' && t.businessId.includes('biz-trans'))) &&
      matchesMonthFilter(t.date, activeMonthFilter)
  );
  const bizJournals = journalEntries.filter(
    (j) =>
      j.businessId === activeBusiness.id &&
      j.status === 'posted' &&
      matchesMonthFilter(j.date, activeMonthFilter)
  );
  const bizInventory = inventoryItems.filter((i) => i.businessId === activeBusiness.id);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickTxModal, setShowQuickTxModal] = useState<'sale' | 'expense' | null>(null);
  const [showProfitAnalysisModal, setShowProfitAnalysisModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Quick Sale / Expense Form State for ANY business
  const [qCategory, setQCategory] = useState('');
  const [qAmount, setQAmount] = useState(25000);
  const [qCounterparty, setQCounterparty] = useState('');
  const [qDueAmount, setQDueAmount] = useState(0);
  const [qDesc, setQDesc] = useState('');

  // Poultry Form State
  const [pBatchCode, setPBatchCode] = useState(`BATCH-0${bizBatches.length + 1}`);
  const [pChickenType, setPChickenType] = useState<
    'Broiler' | 'Layer' | 'Sonali' | 'Deshi' | 'Breeder'
  >('Broiler');
  const [pShed, setPShed] = useState('Shed-03');
  const [pSupplier, setPSupplier] = useState('Prime Hatcheries Ltd.');
  const [pInitQty, setPInitQty] = useState(2000);
  const [pPurchaseCost, setPPurchaseCost] = useState(110000);
  const [pFeedCost, setPFeedCost] = useState(185000);
  const [pMedCost, setPMedCost] = useState(18000);
  const [pLabourCost, setPLabourCost] = useState(22000);
  const [pSalesRev, setPSalesRev] = useState(450000);

  // Livestock Form State
  const [lTag, setLTag] = useState(
    tpl === 'goat' ? `GOAT-00${bizGoats.length + 1}` : `CAT-00${bizCattle.length + 1}`
  );
  const [lName, setLName] = useState('');
  const [lBreed, setLBreed] = useState(
    tpl === 'goat' ? 'Black Bengal' : 'Holstein Friesian Cross'
  );
  const [lGender, setLGender] = useState<'Female' | 'Male'>('Female');
  const [lAge, setLAge] = useState(24);
  const [lWeight, setLWeight] = useState(tpl === 'goat' ? 25 : 420);
  const [lPurchasePrice, setLPurchasePrice] = useState(tpl === 'goat' ? 15000 : 210000);
  const [lFeedCost, setLFeedCost] = useState(tpl === 'goat' ? 4500 : 48000);
  const [lMilkLiters, setLMilkLiters] = useState(tpl === 'goat' ? 0 : 3200);
  const [lMilkRev, setLMilkRev] = useState(tpl === 'goat' ? 0 : 256000);
  const [lParentTag, setLParentTag] = useState(
    tpl === 'goat' ? 'Sire: GOAT-0002 | Dam: GOAT-0001' : 'Core Purebred Lineage'
  );

  // Fish Form State
  const [fCycleCode, setFCycleCode] = useState(`POND-0${bizFish.length + 1}-2026`);
  const [fPondId, setFPondId] = useState(`POND-0${bizFish.length + 1}`);
  const [fPondName, setFPondName] = useState(`Pond-0${bizFish.length + 1}`);
  const [fArea, setFArea] = useState(120);
  const [fSpecies, setFSpecies] = useState('Rui, Katla & Tilapia');
  const [fInitQty, setFInitQty] = useState(25000);
  const [fFingerlingCost, setFFingerlingCost] = useState(85000);
  const [fFeedCost, setFFeedCost] = useState(210000);
  const [fSalesRev, setFSalesRev] = useState(580000);

  // Transport Form State
  const [tCode, setTCode] = useState(`TRIP-10${bizTransport.length + 1}`);
  const [tRegNo, setTRegNo] = useState('Dhaka Metro-Ta-16-9210');
  const [tVehicleType, setTVehicleType] = useState('7-Ton Covered Van');
  const [tDriver, setTDriver] = useState('Md. Shafiqul Islam');
  const [tOrigin, setTOrigin] = useState('Gazipur Agro Hub');
  const [tDest, setTDest] = useState('Dhaka Wholesale Hub');
  const [tDistance, setTDistance] = useState(180);
  const [tFuel, setTFuel] = useState(9500);
  const [tToll, setTToll] = useState(1800);
  const [tAllowance, setTAllowance] = useState(2000);
  const [tRev, setTRev] = useState(38000);

  // Business-Specific Staff & Team Telemetry
  const bizStaff = (stakeholders || []).filter(
    (s) =>
      s.stakeholderType === 'employee' &&
      (s.businessId === activeBusiness.id ||
        (tpl === 'poultry' &&
          (s.businessId?.includes('biz-poultry') ||
            s.businessName?.toLowerCase().includes('poultry'))) ||
        (tpl === 'cattle' &&
          (s.businessId?.includes('biz-cattle') ||
            s.businessName?.toLowerCase().includes('cattle') ||
            s.businessName?.includes('গরু'))) ||
        (tpl === 'goat' &&
          (s.businessId?.includes('biz-goat') ||
            s.businessName?.toLowerCase().includes('goat') ||
            s.businessName?.includes('ছাগল'))) ||
        (tpl === 'fish' &&
          (s.businessId?.includes('biz-fish') ||
            s.businessName?.toLowerCase().includes('fish') ||
            s.businessName?.includes('মাছ'))) ||
        (tpl === 'transport' &&
          (s.businessId?.includes('biz-trans') ||
            s.businessName?.toLowerCase().includes('transport') ||
            s.businessName?.includes('ট্রাক'))))
  );

  const totalStaffSalary = bizStaff.reduce(
    (sum, s) => sum + (s.monthlySalaryOrCreditLimit || 0),
    0
  );

  const assignedManagerUser = (erpUsers || []).find(
    (u) =>
      (u.role === 'business_manager' || u.role === 'super_manager') &&
      (u.assignedBusinesses === 'ALL' || u.assignedBusinesses?.includes(activeBusiness.id))
  );
  const currentManagerName =
    activeBusiness.managerName || assignedManagerUser?.displayName || (bn ? 'Md. Sahin Miah (মালিক)' : 'Md. Sahin Miah (Owner)');
  const currentManagerPhone =
    activeBusiness.contactPhone || assignedManagerUser?.phone || '+880 1711-000000';

  // Business-Specific Staff Recruitment Modal State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [stfName, setStfName] = useState('');
  const [stfPhone, setStfPhone] = useState('+880 1711-000000');
  const [stfDesignation, setStfDesignation] = useState('');
  const [stfSalary, setStfSalary] = useState<number>(20000);
  const [stfJoiningDate, setStfJoiningDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [stfAddress, setStfAddress] = useState(activeBusiness.location || 'Gazipur, Bangladesh');
  const [stfNid, setStfNid] = useState('');
  const [stfPhotoUrl, setStfPhotoUrl] = useState('');
  const [stfEmergencyContact, setStfEmergencyContact] = useState('');
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  // Profile Modal State (Clickable profile card)
  const [viewingProfile, setViewingProfile] = useState<UserProfileData | null>(null);

  // Appoint / Change Manager Modal State
  const [showAppointMgrModal, setShowAppointMgrModal] = useState(false);
  const [newMgrName, setNewMgrName] = useState(activeBusiness.managerName || '');
  const [newMgrPhone, setNewMgrPhone] = useState(activeBusiness.contactPhone || '');
  const [isSavingMgr, setIsSavingMgr] = useState(false);

  // Quick Salary Payment Modal State
  const [salaryTarget, setSalaryTarget] = useState<ErpStakeholder | null>(null);
  const [salaryPaymentAmount, setSalaryPaymentAmount] = useState<number>(0);
  const [salaryWalletId, setSalaryWalletId] = useState<string>('');
  const [salaryMonthLabel, setSalaryMonthLabel] = useState<string>(() =>
    new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  );
  const [isPayingSalary, setIsPayingSalary] = useState(false);

  // Trip Challan / Work Order Modal State
  const [selectedTripChallan, setSelectedTripChallan] = useState<ErpTransportOp | null>(null);

  // Submissions & Loading states for all forms
  const [isSavingQuickTx, setIsSavingQuickTx] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [isSavingAnimal, setIsSavingAnimal] = useState(false);
  const [isSavingCycle, setIsSavingCycle] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  // Universal Actor / User Photo Resolver
  const resolveActorPhoto = useCallback(
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

      if (myPhoto && (targetRole === 'super_admin' || targetName?.toLowerCase().includes('sahin'))) {
        return myPhoto;
      }
      return '';
    },
    [currentUser, currentUserPhoto, erpUsers, stakeholders]
  );

  const notify = (msg: string) => {
    setStatusMessage(msg);
    triggerGlobalToast(msg, 'success');
    setTimeout(() => setStatusMessage(null), 2000);
  };

  const handleOpenAddStaff = () => {
    setStfName('');
    setStfPhone('+880 1711-000000');
    setStfJoiningDate(new Date().toISOString().split('T')[0]);
    setStfAddress(activeBusiness.location || 'Gazipur, Bangladesh');
    setStfNid('');
    setStfPhotoUrl('');
    setStfEmergencyContact('');

    if (tpl === 'cattle') {
      setStfDesignation(bn ? 'দুগ্ধ দোহন ও পশু পরিচর্যা কর্মী' : 'Milking & Cattle Caretaker');
      setStfSalary(20000);
    } else if (tpl === 'poultry') {
      setStfDesignation(bn ? 'পোল্ট্রি শেড সহকারী' : 'Poultry Shed Assistant');
      setStfSalary(22000);
    } else if (tpl === 'goat') {
      setStfDesignation(bn ? 'ছাগল প্রজনন ও যত্নকর্মী' : 'Goat Breeding & Feed Keeper');
      setStfSalary(18000);
    } else if (tpl === 'fish') {
      setStfDesignation('Pond & Feed Lead');
      setStfSalary(22000);
    } else if (tpl === 'transport') {
      setStfDesignation('Heavy Truck Driver');
      setStfSalary(28000);
    } else {
      setStfDesignation(bn ? 'খামার কর্মী' : 'Farm Assistant');
      setStfSalary(20000);
    }
    setShowAddStaffModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stfName.trim()) return;
    setIsSavingStaff(true);
    try {
      await createStakeholderRecord(
        {
          stakeholderType: 'employee',
          code: `EMP-${Math.floor(100 + Math.random() * 899)}`,
          name: stfName.trim(),
          phone: stfPhone.trim(),
          email: `${stfName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff'}@regardsagro.bd`,
          address: stfAddress.trim(),
          businessId: activeBusiness.id,
          businessName: activeBusiness.nameBn || activeBusiness.name,
          designationOrCategory: stfDesignation.trim(),
          monthlySalaryOrCreditLimit: Number(stfSalary) || 0,
          outstandingBalance: 0,
          status: 'active',
          appointedBy: actorEmail,
          appointedByRole: userRole as any,
          appointedAt: new Date().toISOString(),
          joiningDate: stfJoiningDate,
          salaryEffectiveFrom: stfJoiningDate,
          nidNumber: stfNid.trim(),
          photoUrl: stfPhotoUrl,
          emergencyContact: stfEmergencyContact.trim(),
        },
        ownerId,
        actorEmail
      );
      setShowAddStaffModal(false);
      notify(`Staff "${stfName}" successfully hired for ${activeBusiness.name}!`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error adding staff.');
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleAppointManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMgrName.trim()) return;
    setIsSavingMgr(true);
    try {
      await assignBusinessManager(activeBusiness.id, newMgrName.trim(), newMgrPhone.trim());
      activeBusiness.managerName = newMgrName.trim();
      if (newMgrPhone.trim()) activeBusiness.contactPhone = newMgrPhone.trim();
      setShowAppointMgrModal(false);
      notify(`Appointed "${newMgrName}" as manager for ${activeBusiness.name}!`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error assigning manager.');
    } finally {
      setIsSavingMgr(false);
    }
  };

  const handleDisburseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryTarget || salaryPaymentAmount <= 0) return;
    setIsPayingSalary(true);
    try {
      const payingWallet =
        accounts.find((a) => a.id === salaryWalletId) ||
        accounts.find((a) => a.subType === 'cash') ||
        accounts.find((a) => a.subType === 'bank') ||
        accounts[0];
      const payrollAccount =
        accounts.find((a) => a.subType === 'payroll' || a.accountType === 'expense') ||
        accounts[0];

      await postDoubleEntryTransaction(
        {
          referenceNo: `PAY-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString().split('T')[0],
          businessId: activeBusiness.id,
          businessName: activeBusiness.name,
          transactionType: 'payroll',
          category: 'Salary & Wages (Payroll)',
          description: `${salaryTarget.name} (${salaryTarget.designationOrCategory}) - ${salaryMonthLabel} Salary`,
          debitAccountId: payrollAccount.id,
          debitAccountName: payrollAccount.name,
          creditAccountId: payingWallet.id,
          creditAccountName: payingWallet.name,
          amount: Number(salaryPaymentAmount),
          paymentStatus: 'paid',
          dueAmount: 0,
          counterpartyName: salaryTarget.name,
        },
        accounts,
        ownerId,
        actorEmail
      );
      setSalaryTarget(null);
      notify(`Disbursed ${formatBDT(salaryPaymentAmount)} payroll to ${salaryTarget.name}!`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error disbursing salary.');
    } finally {
      setIsPayingSalary(false);
    }
  };

  // Financial Summary for this business
  const bizRevenue = bizJournals
    .filter((j) => j.transactionType === 'sale' || j.transactionType === 'income')
    .reduce((sum, j) => sum + j.amount, 0);
  const bizExpense = bizJournals
    .filter(
      (j) =>
        j.transactionType === 'expense' ||
        j.transactionType === 'purchase' ||
        j.transactionType === 'payroll'
    )
    .reduce((sum, j) => sum + j.amount, 0);
  const bizNetProfit = bizRevenue - bizExpense;

  const handleQuickSaleOrExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showQuickTxModal) return;
    const isSale = showQuickTxModal === 'sale';
    const cashOrBank =
      accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
    const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
    const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];
    if (!cashOrBank || !revAcc || !expAcc) return;

    setIsSavingQuickTx(true);
    try {
      await postDoubleEntryTransaction(
        {
          referenceNo: `VCH-${Date.now().toString().slice(-5)}`,
          date: new Date().toISOString().split('T')[0],
          businessId: activeBusiness.id,
          businessName: activeBusiness.name,
          transactionType: isSale ? 'sale' : 'expense',
          category: qCategory || (isSale ? 'Product / Commodity Sale' : 'Operational Farm Expense'),
          description: qDesc || `${isSale ? 'Revenue' : 'Expense'} - ${activeBusiness.name}`,
          debitAccountId: isSale ? cashOrBank.id : expAcc.id,
          debitAccountName: isSale ? cashOrBank.name : expAcc.name,
          creditAccountId: isSale ? revAcc.id : cashOrBank.id,
          creditAccountName: isSale ? revAcc.name : cashOrBank.name,
          amount: Number(qAmount),
          paymentStatus: Number(qDueAmount) > 0 ? 'partial' : 'paid',
          dueAmount: Number(qDueAmount) || 0,
          counterpartyName: qCounterparty || (isSale ? 'Wholesale Customer' : 'Supplier / Vendor'),
        },
        accounts,
        ownerId,
        actorEmail
      );
      setShowQuickTxModal(null);
      notify(
        `${activeBusiness.name}: ${isSale ? 'Revenue' : 'Expense'} of ${formatBDT(Number(qAmount))} recorded successfully!`
      );
    } catch (err) {
      console.error(err);
      triggerGlobalToast(String(err), 'error');
    } finally {
      setIsSavingQuickTx(false);
    }
  };

  const handleAddPoultryBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBatch(true);
    try {
      await createPoultryBatchRecord(
        {
          batchCode: pBatchCode,
          businessId: activeBusiness.id,
          chickPurchaseDate: new Date().toISOString().split('T')[0],
          chickenType: pChickenType,
          shedNumber: pShed,
          supplierName: pSupplier,
          initialQuantity: Number(pInitQty),
          mortalityCount: 10,
          sickBirdsCount: 2,
          soldBirdsCount: 0,
          purchaseCost: Number(pPurchaseCost),
          starterFeedKg: 600,
          growerFeedKg: 1200,
          finisherFeedKg: 900,
          feedCost: Number(pFeedCost),
          medicineCost: Number(pMedCost),
          labourAndUtilityCost: Number(pLabourCost),
          otherExpense: 5000,
          totalSoldKg: Math.round(Number(pInitQty) * 1.6),
          gradeBreakdown: 'Large: 70% | Medium: 25% | Small: 5%',
          pricePerKg: 170,
          totalSalesRevenue: Number(pSalesRev),
          outstandingDue: 0,
          vaccineScheduleNotes: 'Day 5: ND (Ranikhet), Day 12: Gumboro completed',
          status: 'active',
        },
        ownerId,
        actorEmail
      );
      setShowAddModal(false);
      notify(`New poultry flock batch (${pBatchCode}) started successfully!`);
    } catch (err) {
      console.error(err);
      triggerGlobalToast(String(err), 'error');
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleAddLivestock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAnimal(true);
    try {
      const species = tpl === 'goat' ? 'goat' : 'cattle';
      await createLivestockAnimalRecord(
        {
          animalTag: lTag,
          species,
          businessId: activeBusiness.id,
          name: lName || `${lBreed} #${lTag}`,
          breed: lBreed,
          gender: lGender,
          ageMonths: Number(lAge),
          purchaseDate: new Date().toISOString().split('T')[0],
          purchasePrice: Number(lPurchasePrice),
          currentWeightKg: Number(lWeight),
          healthStatus: lGender === 'Female' && species === 'cattle' ? 'Lactating' : 'Healthy',
          feedCost: Number(lFeedCost),
          medicineAndVetCost: species === 'goat' ? 950 : 6500,
          vaccinationHistory:
            species === 'goat' ? 'PPR & Goat Pox vaccines administered' : 'FMD & Anthrax vaccines administered',
          breedingAndOffspringNotes: species === 'goat' ? 'Healthy reproductive' : 'Veterinary check normal',
          parentTag: lParentTag,
          totalMilkLiters: Number(lMilkLiters),
          milkSalesRevenue: Number(lMilkRev),
          animalSalePrice: species === 'goat' ? 35000 : 0,
          status: 'active',
        },
        ownerId,
        actorEmail
      );
      setShowAddModal(false);
      notify(`New livestock record (${lTag}) registered successfully!`);
    } catch (err) {
      console.error(err);
      triggerGlobalToast(String(err), 'error');
    } finally {
      setIsSavingAnimal(false);
    }
  };

  const handleAddFishCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCycle(true);
    try {
      await createFishCycleRecord(
        {
          cycleCode: fCycleCode,
          pondId: fPondId,
          pondName: fPondName,
          businessId: activeBusiness.id,
          areaDecimals: Number(fArea),
          depthFeet: 6.0,
          location: activeBusiness.location,
          waterQualityNotes: 'pH: 7.6 | Dissolved Oxygen (DO): 6.5 mg/L | Water clear',
          fishSpecies: fSpecies,
          stockingDate: new Date().toISOString().split('T')[0],
          initialQuantity: Number(fInitQty),
          mortalityCount: 300,
          fingerlingCost: Number(fFingerlingCost),
          feedCost: Number(fFeedCost),
          medicineAndLimeCost: 15000,
          labourCost: 30000,
          harvestDate: 'Active',
          harvestWeightKg: 2800,
          totalSalesRevenue: Number(fSalesRev),
          status: 'active',
        },
        ownerId,
        actorEmail
      );
      setShowAddModal(false);
      notify(`New fish pond cycle (${fPondName}) added successfully!`);
    } catch (err) {
      console.error(err);
      triggerGlobalToast(String(err), 'error');
    } finally {
      setIsSavingCycle(false);
    }
  };

  const handleAddTransportOp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTrip(true);
    try {
      await createTransportOpRecord(
        {
          tripOrVehicleCode: tCode,
          recordType: 'trip',
          businessId: activeBusiness.id,
          registrationNumber: tRegNo,
          vehicleType: tVehicleType,
          driverName: tDriver,
          origin: tOrigin,
          destination: tDest,
          cargoDetails: 'Agro and farm supplies transport',
          customerName: 'Wholesale Depot / Merchant',
          distanceKm: Number(tDistance),
          fuelCost: Number(tFuel),
          tollCost: Number(tToll),
          driverAllowance: Number(tAllowance),
          maintenanceCost: 1000,
          maintenanceDetails: 'Engine oil & brake inspection',
          tripRevenue: Number(tRev),
          outstandingDue: 0,
          insuranceExpiry: '2027-09-30',
          fitnessExpiry: '2027-06-30',
          taxTokenExpiry: '2027-06-30',
          nextServiceDate: '2026-12-25',
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
        },
        ownerId,
        actorEmail
      );
      setShowAddModal(false);
      notify(`New transport trip (${tCode}) recorded successfully!`);
    } catch (err) {
      console.error(err);
      triggerGlobalToast(String(err), 'error');
    } finally {
      setIsSavingTrip(false);
    }
  };

  // Dedicated full-workspace view for Truck & Transport Business handled in main JSX return below

  return (
    <div className="space-y-6 relative">
      {/* Thematic Agribusiness Watermark (Jolchap) Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.055] dark:opacity-[0.035] bg-cover bg-center bg-no-repeat mix-blend-multiply dark:mix-blend-screen filter saturate-50"
        style={{
          backgroundImage: `url(${
            tpl === 'cattle' || tpl === 'goat'
              ? '/images/agro_precision_livestock.jpg'
              : tpl === 'poultry' || tpl === 'transport'
              ? '/images/agro_enterprise_hero.jpg'
              : '/images/agro_dashboard_watermark.webp'
          })`,
        }}
      />
      {/* 12-Month Period Filter for this Business Workspace */}
      <MonthFilterBar value={activeMonthFilter} onChange={setMonthFilter} bn={bn} />

      {tpl === 'transport' ? (
        <TransportManagementModule
          activeBusiness={activeBusiness}
          ops={bizTransport}
          journalEntries={bizJournals}
          accounts={accounts}
          auditLogs={auditLogs}
          stakeholders={stakeholders}
          erpUsers={erpUsers}
          currentUser={currentUser}
          userRole={userRole}
          ownerId={ownerId}
          actorEmail={actorEmail}
          onNotify={notify}
          onBackToDashboard={onBackToDashboard}
          lang={lang}
        />
      ) : (
        <>
          {/* Top Business Header with Simple Action Buttons */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {bn ? 'মূল ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 pt-1">
              {bn && activeBusiness.nameBn ? `${activeBusiness.nameBn} — ${activeBusiness.name}` : activeBusiness.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {bn
                ? `ঠিকানা: ${activeBusiness.location} · ম্যানেজার: ${activeBusiness.managerName} · ফোন: ${activeBusiness.contactPhone}`
                : `Location: ${activeBusiness.location} · Manager: ${activeBusiness.managerName} · Phone: ${activeBusiness.contactPhone}`}
            </p>
          </div>

          {/* 3 Ultra-Clear Action Buttons for Any User/Client */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setQCategory(
                  tpl === 'poultry'
                    ? (bn ? 'মুরগি ও ডিম বিক্রি' : 'Poultry & Egg Sales')
                    : tpl === 'cattle'
                    ? (bn ? 'দুধ ও গরু বিক্রি' : 'Milk & Cattle Sales')
                    : tpl === 'goat'
                    ? (bn ? 'ছাগল বিক্রি' : 'Goat Sales')
                    : tpl === 'fish'
                    ? 'Fish Sales'
                    
                    : (bn ? 'পণ্য বিক্রি (Sales)' : 'Product Sales')
                );
                setShowQuickTxModal('sale');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              {bn ? '+ বিক্রি / আয় লিখুন' : '+ Record Sale'}
            </button>

            <button
              type="button"
              onClick={() => {
                setQCategory(
                  tpl === 'poultry'
                    ? (bn ? 'মুরগির খাবার ও ওষুধ খরচ' : 'Poultry Feed & Medicine Expense')
                    : tpl === 'cattle'
                    ? (bn ? 'গরুর খাবার ও ডাক্তার খরচ' : 'Cattle Feed & Vet Expense')
                    : tpl === 'goat'
                    ? (bn ? 'ছাগলের খাবার ও পরিচর্যা খরচ' : 'Goat Feed & Care Expense')
                    : tpl === 'fish'
                    ? 'Fish Feed & Pond Maintenance'
                    
                    : (bn ? 'ব্যবসায়িক খরচ (Expense)' : 'Operating Expense')
                );
                setShowQuickTxModal('expense');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              {bn ? '+ খরচ লিখুন' : '+ Record Expense'}
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {tpl === 'poultry'
                ? (bn ? '+ নতুন মুরগির ব্যাচ (New Batch)' : '+ New Poultry Batch')
                : tpl === 'cattle'
                ? (bn ? '+ নতুন গরু যুক্ত করুন (Add Cattle)' : '+ Register Cattle')
                : tpl === 'goat'
                ? (bn ? '+ নতুন ছাগল যুক্ত করুন (Add Goat)' : '+ Register Goat')
                : tpl === 'fish'
                ? '+ New Pond Cycle'
                
                : (bn ? '+ নতুন এন্ট্রি (New Record)' : '+ New Record')}
            </button>
          </div>
        </div>

        {/* Simple Explainable Guide Strip for this Specific Business */}
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3.5 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
          <HelpCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {bn ? 'এই পেজে কী করবেন (Operational Guide): ' : 'Operations Guide for this Unit: '}
            </span>
            {tpl === 'poultry' &&
              (bn
                ? 'এখানে আপনার প্রতিটি শেডের মুরগির ব্যাচ আলাদাভাবে ট্র্যাক করা হয়। নিচের টেবিল থেকে ১ ক্লিকে প্রতিদিনের খাবার (Feed), মারা যাওয়া মুরগি (Mortality), এবং মুরগি বিক্রি আপডেট করতে পারবেন। কোন ব্যাচে কত লাভ বা লস হচ্ছে সিস্টেম নিজে থেকেই হিসাব করে দেখাবে।'
                : 'Track individual shed batches across day-old chick procurement, daily mortality, feed inventory, vaccines, multi-grade bird sales, and automated batch lifetime P&L.')}
            {tpl === 'cattle' &&
              (bn
                ? 'এখানে প্রতিটি গরুর আলাদা আইডি (যেমন CAT-0001) অনুযায়ী ওজন, প্রতিদিনের দুধ উৎপাদন, টিকা (Vaccine), এবং গরুটির পেছনে মোট কত খরচ ও কত লাভ হয়েছে তা এক নজরে দেখতে ও আপডেট করতে পারবেন।'
                : 'Monitor individual cattle by unique Tag ID, tracking weight gain, daily morning/evening milk production, veterinary vaccines, and individual lifetime profit.')}
            {tpl === 'goat' &&
              (bn
                ? 'এখানে প্রতিটি ছাগলের আলাদা আইডি (GOAT-0001), বংশতালিকা (বাবা/মা), বাচ্চা (Kids) উৎপাদন, ওজন, এবং ছাগলটির আজীবন লাভ-ক্ষতি হিসাব রাখা হয়।'
                : 'Manage individual goats by Tag ID, sire/dam pedigree family trees, kid births, health logs, and cumulative profitability.')}
            {tpl === 'fish' &&
              'Log pond water surface area, fingerling stocking density, water quality (pH, DO), feed consumption, multi-species harvest sales, and net profit per pond.'}
            
            {tpl === 'custom' &&
              (bn
                ? 'এটি আপনার তৈরি করা কাস্টম ব্যবসা। উপরের "+ বিক্রি / আয় লিখুন" এবং "+ খরচ লিখুন" বাটনে ক্লিক করে প্রতিদিনের লেনদেন লিখলে নিচে স্বয়ংক্রিয়ভাবে লাভ-ক্ষতি ও খতিয়ান তৈরি হবে।'
                : 'Custom agro enterprise unit. Click "+ Record Sale" or "+ Record Expense" to log daily transactions and generate real-time ledgers.')}
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 px-4 py-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 4 Simple Summary Cards for This Business */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{bn ? 'মোট বিক্রি ও আয় (Total Sales/Income)' : 'Total Sales & Revenue'}</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatBDT(bizRevenue)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {bn ? `মোট ${bizJournals.filter((j) => j.transactionType === 'sale' || j.transactionType === 'income').length} টি বিক্রয় ভাউচার থেকে` : `From ${bizJournals.filter((j) => j.transactionType === 'sale' || j.transactionType === 'income').length} sales entries`}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{bn ? 'মোট খরচ (Total Expenses)' : 'Total Operating Expenses'}</span>
            <TrendingDown className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatBDT(bizExpense)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {bn ? 'খাবার, ওষুধ, কর্মচারী ও অন্যান্য খরচ' : 'Feed, vet, labor & utility expenses'}
          </div>
        </div>

        <div
          onClick={() => setShowProfitAnalysisModal(true)}
          className="group/profit relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-xl hover:border-emerald-500/50 transition-all cursor-pointer hover:z-40"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{bn ? 'নিট লাভ / ক্ষতি (Net Profit / Loss)' : 'Net Profit / Loss'}</span>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
          <div
            className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
              bizNetProfit >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatBDT(bizNetProfit)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>
              {bizNetProfit >= 0
                ? (bn ? 'ব্যবসা লাভজনক অবস্থায় আছে' : 'Profitable operating status')
                : (bn ? 'খরচ আয়ের চেয়ে বেশি হয়েছে' : 'Operating deficit recorded')}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowProfitAnalysisModal(true);
              }}
              className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold underline decoration-dotted hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span>{bn ? 'বিশ্লেষণ দেখুন' : 'View Breakdown'}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* FLOATING HOVER CARD BELOW BUSINESS NET PROFIT */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 sm:w-80 opacity-0 invisible group-hover/profit:opacity-100 group-hover/profit:visible transition-all duration-200 transform -translate-y-2 group-hover/profit:translate-y-0 pointer-events-auto z-50">
            {/* Center upward pointer */}
            <div className="w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-slate-900/95 dark:border-b-slate-950/95 mx-auto -mb-0.5" />
            <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-emerald-500/40 space-y-3 ring-1 ring-white/10">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-100">
                    {bn ? 'ইউনিট লাভ-ক্ষতি বিশ্লেষণ' : 'Unit Profit Breakdown'}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                    bizNetProfit >= 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {bizRevenue > 0
                    ? `${bizNetProfit >= 0 ? '+' : ''}${((bizNetProfit / bizRevenue) * 100).toFixed(1)}% ${bn ? 'মার্জিন' : 'Margin'}`
                    : (bn ? '০% মার্জিন' : '0% Margin')}
                </span>
              </div>

              <div className="text-center py-1 bg-slate-800/40 rounded-xl border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {bn ? 'চলতি ডিভিশনের চূড়ান্ত নিট মুনাফা' : 'Current Unit Net Profit'}
                </div>
                <div
                  className={`text-2xl font-black font-mono tracking-tight mt-0.5 ${
                    bizNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatBDT(bizNetProfit)}
                </div>
              </div>

              <div className="bg-slate-950/80 rounded-xl p-2.5 space-y-1.5 text-xs font-mono border border-slate-800">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] font-sans">{bn ? 'মোট বিক্রি / আয় (Sales):' : 'Revenue:'}</span>
                  <span className="font-bold text-emerald-400">+{formatBDT(bizRevenue)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] font-sans">{bn ? 'মোট পরিচালন ব্যয় (Expenses):' : 'Expenses:'}</span>
                  <span className="font-bold text-amber-300">-{formatBDT(bizExpense)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] font-sans">{bn ? 'প্রকৃত নিট লাভ (Net Margin):' : 'Net Profit:'}</span>
                  <span
                    className={`font-bold ${
                      bizNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatBDT(bizNetProfit)}
                  </span>
                </div>
              </div>

              {/* Button to open Profit Analysis modal */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfitAnalysisModal(true);
                }}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>{bn ? 'সম্পূর্ণ লাভ-ক্ষতি ও ভাউচার বিশ্লেষণ' : 'Open Complete P&L & Vouchers'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>{bn ? 'খতিয়ান থেকে সরাসরি সিঙ্ক' : 'Ledger synced'}</span>
                <span className="text-emerald-400 font-semibold">{bn ? 'লাইভ হিসাব' : 'Live'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{bn ? 'গোডাউন স্টক (Inventory Items)' : 'Warehouse Inventory Items'}</span>
            <PackageCheck className="h-4 w-4 text-slate-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {bizInventory.length} {bn ? 'টি পণ্য' : 'Items'}
          </div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            {activeBusiness.customFieldsSpec || (bn ? 'সক্রিয় মডিউল চালু আছে' : 'Active production unit')}
          </div>
        </div>
      </div>

      {/* DEDICATED DIVISION TEAM, MANAGER & STAFF PAYROLL ROSTER */}
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs space-y-0">
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {bn
                    ? `${activeBusiness.nameBn || activeBusiness.name} — বিভাগীয় টিম, ম্যানেজার ও কর্মী বহর`
                    : `${activeBusiness.name} — Team, Manager & Workforce`}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  {bizStaff.length} {bn ? 'জন কর্মী' : 'Staff'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {bn
                  ? 'এই ইউনিটের ইন-চার্জ ম্যানেজার, নিযুক্ত সকল কর্মী, তাদের যোগদানের তারিখ ও মাসিক বেতন হিসাব'
                  : 'Assigned division manager, workforce headcount, joining dates, and monthly payroll budget'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {(userRole === 'super_admin' || userRole === 'super_manager') && (
              <button
                type="button"
                onClick={() => {
                  setNewMgrName(activeBusiness.managerName || '');
                  setNewMgrPhone(activeBusiness.contactPhone || '');
                  setShowAppointMgrModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs"
              >
                <UserCheck className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span>{bn ? 'ম্যানেজার পরিবর্তন / নিয়োগ' : 'Appoint Manager'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAddStaff}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs shadow-emerald-600/20"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{bn ? '+ নতুন কর্মী নিয়োগ দিন' : '+ Hire New Staff'}</span>
            </button>
          </div>
        </div>

        {/* Division In-Charge & Workforce Telemetry Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
          {/* Card 1: In-Charge Manager */}
          <button
            type="button"
            onClick={() =>
              setViewingProfile({
                id: assignedManagerUser?.id,
                name: currentManagerName,
                phone: currentManagerPhone,
                nidNumber: assignedManagerUser?.nidNumber || '',
                designation: assignedManagerUser?.designation || `${activeBusiness.name} Branch Manager`,
                role: 'business_manager',
                businessName: activeBusiness.name,
                businessId: activeBusiness.id,
                photoUrl: assignedManagerUser?.photoUrl || '',
                email: assignedManagerUser?.email || `${activeBusiness.code.toLowerCase()}@regardsagro.bd`,
                address: activeBusiness.location,
                status: 'active',
              })
            }
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 flex items-center justify-between gap-4 text-left hover:border-purple-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {assignedManagerUser?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assignedManagerUser.photoUrl}
                  alt={currentManagerName}
                  className="h-12 w-12 rounded-2xl object-cover shrink-0 ring-2 ring-purple-500/20"
                />
              ) : (
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-base shrink-0 ring-1 ring-purple-500/20">
                  👔
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                  {bn ? 'বিভাগীয় ইন-চার্জ ম্যানেজার' : 'Division In-Charge Manager'}
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate mt-0.5 group-hover:text-purple-600 transition-colors">
                  {currentManagerName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {currentManagerPhone}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{bn ? 'সক্রিয় ইন-চার্জ' : 'Active Lead'}</span>
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold group-hover:underline">
                {bn ? 'প্রোফাইল দেখুন ↗' : 'View Profile ↗'}
              </span>
            </div>
          </button>

          {/* Card 2: Workforce & Payroll Budget */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-base shrink-0 ring-1 ring-blue-500/20">
                👥
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  {bn ? 'মোট কর্মী ও মাসিক পে-রোল' : 'Active Staff & Monthly Payroll'}
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate mt-0.5 font-mono">
                  {bizStaff.length} {bn ? 'জন কর্মী' : 'Staff'} · {formatBDT(totalStaffSalary)} / {bn ? 'মাস' : 'mo'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {bn ? 'নিয়মিত হাজিরা ও কর্ম বণ্টন সক্রিয়' : 'Daily active workforce roster'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenAddStaff}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white text-xs font-bold transition-colors shrink-0"
            >
              {bn ? '+ নিয়োগ' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Division Staff Roster Table */}
        <div className="overflow-x-auto">
          {bizStaff.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {bn
                    ? `${activeBusiness.nameBn || activeBusiness.name}-এ এখনো কোনো কর্মী যুক্ত করা হয়নি`
                    : `No staff currently hired for ${activeBusiness.name}`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {bn
                    ? 'আপনার খামারের শেড সহকারী, পরিচর্যাকারী বা ড্রাইভার নিয়োগ করতে উপরের "+ নতুন কর্মী নিয়োগ দিন" বাটনে ক্লিক করুন।'
                    : 'Click "+ Hire New Staff" above to add caretakers, operators, or drivers for this business unit.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddStaff}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <UserPlus className="h-4 w-4" />
                <span>{bn ? '+ প্রথম কর্মী নিয়োগ দিন' : '+ Add First Staff Member'}</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/60 dark:bg-slate-800/40 font-semibold">
                  <th className="py-3 px-4">{bn ? 'কর্মীর কোড ও নাম' : 'Staff Code & Name'}</th>
                  <th className="py-3 px-4">{bn ? 'পদবি ও ভূমিকা' : 'Designation & Role'}</th>
                  <th className="py-3 px-4">{bn ? 'মোবাইল নম্বর' : 'Phone'}</th>
                  <th className="py-3 px-4">{bn ? 'কবে থেকে শুরু হয়েছে' : 'Started / Joining Date'}</th>
                  <th className="py-3 px-4 text-right">{bn ? 'মাসিক বেতন' : 'Monthly Salary'}</th>
                  <th className="py-3 px-4 text-right">{bn ? 'স্ট্যাটাস ও বেতন' : 'Payroll Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bizStaff.map((stf) => (
                  <tr key={stf.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          setViewingProfile({
                            id: stf.id,
                            name: stf.name,
                            phone: stf.phone,
                            nidNumber: stf.nidNumber || '',
                            designation: stf.designationOrCategory,
                            role: 'employee',
                            businessName: stf.businessName || activeBusiness.nameBn || activeBusiness.name,
                            businessId: stf.businessId,
                            photoUrl: stf.photoUrl || '',
                            email: stf.email,
                            address: stf.address,
                            emergencyContact: stf.emergencyContact || '',
                            joiningDate: stf.joiningDate,
                            monthlySalary: stf.monthlySalaryOrCreditLimit,
                            status: stf.status,
                            appointedBy: stf.appointedBy,
                          })
                        }
                        className="flex items-center gap-2.5 text-left group cursor-pointer"
                      >
                        {stf.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={stf.photoUrl}
                            alt={stf.name}
                            className="h-8 w-8 rounded-xl object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                            {stf.name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                            {stf.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {stf.code} {stf.nidNumber ? `• NID: ${stf.nidNumber}` : ''}
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        {stf.designationOrCategory}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {stf.phone}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{stf.joiningDate || stf.appointedAt?.split('T')[0] || '2025-01-15'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatBDT(stf.monthlySalaryOrCreditLimit)} / {bn ? 'মাস' : 'mo'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          {bn ? 'সক্রিয়' : 'Active'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSalaryTarget(stf);
                            setSalaryPaymentAmount(stf.monthlySalaryOrCreditLimit || 20000);
                            setSalaryWalletId(
                              accounts.find((a) => a.subType === 'cash')?.id || accounts[0]?.id || ''
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                        >
                          {bn ? '৳ বেতন দিন' : 'Pay Salary'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerConfirmDelete({
                              title: bn ? 'কর্মী অপসারণ ও পদ বাতিল' : 'Terminate Staff Member',
                              message: bn
                                ? `আপনি কি নিশ্চিতভাবে "${stf.name}" (${stf.code})-কে এই ইউনিট থেকে অপসারণ করতে চান?`
                                : `Are you sure you want to remove "${stf.name}" (${stf.code})?`,
                              itemName: `${stf.name} — ${stf.designationOrCategory}`,
                              onConfirm: async () => {
                                await deleteStakeholderRecord(stf.id);
                              },
                            });
                          }}
                          className="p-1 rounded-lg border border-red-200 dark:border-red-900/60 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title={bn ? 'কর্মী অপসারণ করুন' : 'Remove Staff'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* MODAL 1: HIRE NEW STAFF FOR THIS BUSINESS */}
      {showAddStaffModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setShowAddStaffModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  {bn
                    ? `${activeBusiness.nameBn || activeBusiness.name}-এ নতুন কর্মী নিয়োগ`
                    : `Hire New Staff for ${activeBusiness.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                <span>🏢 {bn ? 'নির্ধারিত ব্যবসা ইউনিট:' : 'Assigned Business Unit:'}</span>
                <span className="font-extrabold">{activeBusiness.nameBn || activeBusiness.name} ({activeBusiness.code})</span>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'কর্মীর পূর্ণ নাম *' : 'Employee Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={stfName}
                  onChange={(e) => setStfName(e.target.value)}
                  placeholder={bn ? 'যেমন: মোঃ আব্দুল আলিম' : 'e.g. Md. Abdul Alim'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'মোবাইল নম্বর *' : 'Phone Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={stfPhone}
                    onChange={(e) => setStfPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'জাতীয় পরিচয়পত্র নং (NID)' : 'National ID (NID)'}
                  </label>
                  <input
                    type="text"
                    value={stfNid}
                    onChange={(e) => setStfNid(e.target.value)}
                    placeholder={bn ? '১০ বা ১৭ সংখ্যার এনআইডি' : '10 or 17 digit NID'}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'কবে থেকে শুরু হয়েছে / যোগদানের তারিখ *' : 'Joining / Started Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={stfJoiningDate}
                    onChange={(e) => setStfJoiningDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'জরুরি যোগাযোগ নম্বর' : 'Emergency Contact'}
                  </label>
                  <input
                    type="text"
                    value={stfEmergencyContact}
                    onChange={(e) => setStfEmergencyContact(e.target.value)}
                    placeholder="+880 1..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'কাজের পদবি ও দায়িত্ব *' : 'Designation & Role *'}
                </label>
                <input
                  type="text"
                  required
                  value={stfDesignation}
                  onChange={(e) => setStfDesignation(e.target.value)}
                  placeholder={bn ? 'যেমন: শেড সহকারী / পরিচর্যাকারী' : 'e.g. Shed Caretaker'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-semibold text-slate-900 dark:text-white"
                />
              </div>

              {/* Quick role preset buttons */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold">
                  {bn ? 'দ্রুত পদবি নির্বাচন করুন:' : 'Quick Designation Presets:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(tpl === 'cattle'
                    ? [
                        bn ? 'দুগ্ধ দোহন ও পশু পরিচর্যা কর্মী' : 'Milking Caretaker',
                        bn ? 'পশু চিকিৎসা ও টিকাদান সহকারী' : 'Vet & Vaccine Assistant',
                        bn ? 'ফিড ও চারণ সহকারী' : 'Feed Handler',
                      ]
                    : tpl === 'poultry'
                    ? [
                        bn ? 'পোল্ট্রি শেড ইনচার্জ' : 'Poultry Shed Lead',
                        bn ? 'খাদ্য ও টিকাদান কর্মী' : 'Feed & Vaccine Staff',
                        bn ? 'ডিম প্যাকিং ও ডেলিভারি সহকারী' : 'Egg Packing Assistant',
                      ]
                    : tpl === 'goat'
                    ? [
                        bn ? 'ছাগল প্রজনন ও যত্নকর্মী' : 'Breeding & Caretaker',
                        bn ? 'ছাগল শেড ও ফিড সহকারী' : 'Shed Assistant',
                      ]
                    : tpl === 'fish'
                    ? [
                        'Pond & Feed Lead',
                        'Netting & Fish Harvest Assistant',
                      ]
                    
                    : [bn ? 'খামার সহকারী' : 'Farm Assistant', bn ? 'সুপারভাইজার' : 'Supervisor']
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStfDesignation(preset)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'মাসিক বেতন (BDT) *' : 'Monthly Salary (BDT) *'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="0"
                    value={stfSalary === 0 ? '' : stfSalary}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setStfSalary(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'ঠিকানা / শেড অবস্থান' : 'Address / Shed Location'}
                  </label>
                  <input
                    type="text"
                    value={stfAddress}
                    onChange={(e) => setStfAddress(e.target.value)}
                    placeholder={bn ? 'যেমন: শেড নং ৩' : 'e.g. Shed 3'}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingStaff}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isSavingStaff
                    ? bn
                      ? 'নিয়োগ সম্পন্ন হচ্ছে...'
                      : 'Hiring...'
                    : bn
                    ? 'কর্মী নিয়োগ নিশ্চিত করুন'
                    : 'Confirm Staff Recruitment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: APPOINT OR CHANGE BUSINESS MANAGER */}
      {showAppointMgrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setShowAppointMgrModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  {bn
                    ? `${activeBusiness.nameBn || activeBusiness.name}-এর ইন-চার্জ ম্যানেজার নিয়োগ`
                    : `Appoint Manager for ${activeBusiness.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAppointMgrModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAppointManager} className="space-y-3.5 text-xs">
              <p className="text-slate-500 dark:text-slate-400">
                {bn
                  ? 'সুপার অ্যাডমিন বা প্রধান জেনারেল ম্যানেজার হিসেবে আপনি যেকোনো ব্যবসার ইন-চার্জ ম্যানেজার পরিবর্তন বা নিয়োগ দিতে পারেন।'
                  : 'As Owner or General Manager, you can designate an official division lead for this business unit.'}
              </p>

              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'ম্যানেজারের পূর্ণ নাম *' : 'Manager Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={newMgrName}
                  onChange={(e) => setNewMgrName(e.target.value)}
                  placeholder={bn ? 'যেমন: মোঃ রফিকুল ইসলাম' : 'e.g. Md. Rafiqul Islam'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'মোবাইল নম্বর' : 'Contact Phone'}
                </label>
                <input
                  type="text"
                  value={newMgrPhone}
                  onChange={(e) => setNewMgrPhone(e.target.value)}
                  placeholder="+880 1711-000000"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAppointMgrModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingMgr}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isSavingMgr
                    ? bn
                      ? 'নিয়োগ হচ্ছে...'
                      : 'Saving...'
                    : bn
                    ? 'ম্যানেজার নিয়োগ নিশ্চিত করুন'
                    : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK SALARY PAYMENT */}
      {salaryTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setSalaryTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  {bn ? `${salaryTarget.name}-এর বেতন পরিশোধ` : `Disburse Payroll to ${salaryTarget.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSalaryTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDisburseSalary} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 space-y-1">
                <div className="text-slate-500 font-semibold">{salaryTarget.designationOrCategory}</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {bn ? 'চুক্তিকৃত মাসিক বেতন:' : 'Monthly Agreed Salary:'} {formatBDT(salaryTarget.monthlySalaryOrCreditLimit)}
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'বেতন পরিশোধের পরিমাণ (BDT) *' : 'Payment Amount (BDT) *'}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="0"
                  value={salaryPaymentAmount === 0 ? '' : salaryPaymentAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/^0+(?=\d)/, '');
                    setSalaryPaymentAmount(v === '' ? 0 : Number(v));
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-mono font-black text-emerald-600 dark:text-emerald-400 text-base"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'কোন তহবিল থেকে টাকা পরিশোধ হবে?' : 'Pay From Account *'}
                </label>
                <select
                  value={salaryWalletId}
                  onChange={(e) => setSalaryWalletId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 font-semibold text-slate-900 dark:text-white"
                >
                  {accounts
                    .filter((a) => a.subType === 'cash' || a.subType === 'bank')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.subType === 'cash' ? (bn ? 'নগদ ক্যাশ' : 'Cash') : (bn ? 'ব্যাংক' : 'Bank')} · {bn ? 'ব্যালেন্স' : 'Balance'}: {formatBDT(a.balance)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSalaryTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isPayingSalary}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isPayingSalary
                    ? bn
                      ? 'পরিশোধ হচ্ছে...'
                      : 'Processing...'
                    : bn
                    ? 'বেতন পরিশোধ নিশ্চিত করুন'
                    : 'Confirm Salary Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A. DEDICATED 7-STEP POULTRY FARMING ERP MODULE (A to G) */}
      {tpl === 'poultry' && (
        <PoultryManagementModule
          activeBusiness={activeBusiness}
          batches={bizBatches}
          inventoryItems={inventoryItems}
          journalEntries={bizJournals}
          accounts={accounts}
          auditLogs={auditLogs}
          ownerId={ownerId}
          actorEmail={actorEmail}
          onNotify={notify}
          lang={lang}
        />
      )}

      {/* B & C. CATTLE AND GOAT INDIVIDUAL LIVESTOCK WORKSPACE */}
      {(tpl === 'cattle' || tpl === 'goat') && (
        <div className="space-y-6">
          <LivestockManagementModule
            activeBusiness={activeBusiness}
            species={tpl === 'goat' ? 'goat' : 'cattle'}
            animals={tpl === 'cattle' ? bizCattle : bizGoats}
            inventoryItems={inventoryItems}
            journalEntries={bizJournals}
            accounts={accounts}
            auditLogs={auditLogs}
            ownerId={ownerId}
            actorEmail={actorEmail}
            onNotify={notify}
            lang={lang}
          />
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2.5">
              {tpl === 'cattle' ? (
                <Beef className="h-5 w-5 text-emerald-600" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              )}
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {bn
                    ? (tpl === 'cattle'
                      ? 'প্রতিটি গরুর প্রোফাইল, দুধ উৎপাদন ও আজীবন লাভ-ক্ষতি (Cattle Registry)'
                      : 'প্রতিটি ছাগলের প্রোফাইল, বংশতালিকা ও লাভ-ক্ষতি (Goat Registry)')
                    : (tpl === 'cattle'
                      ? 'Cattle Individual Registry & Lifetime P&L'
                      : 'Goat Pedigree Registry & Lifetime P&L')}
                </h2>
                <p className="text-xs text-slate-500">
                  {bn
                    ? 'প্রতিটি পশুর আলাদা ট্যাগ নাম্বার অনুযায়ী ওজন, দুধ এবং চিকিৎসা খরচ হিসাব রাখা হয়'
                    : 'Animal records tracked by individual tag ID, weight growth, vet logs and margins'}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-3 px-4">{bn ? 'পশুর আইডি ও নাম' : 'Tag & Name'}</th>
                  <th className="py-3 px-4">{bn ? 'জাত ও বয়স' : 'Breed & Age'}</th>
                  <th className="py-3 px-4 text-right">{bn ? 'বর্তমান ওজন ও স্বাস্থ্য' : 'Current Weight & Health'}</th>
                  <th className="py-3 px-4">{bn ? 'টিকা ও প্রজনন' : 'Vaccine & Breeding'}</th>
                  <th className="py-3 px-4 text-right">{bn ? 'মোট খরচ' : 'Total Cost'}</th>
                  <th className="py-3 px-4 text-right">{bn ? 'দুধ বিক্রি ও বাজারমূল্য' : 'Sales Revenue & Market Val'}</th>
                  <th className="py-3 px-4 text-right">{bn ? 'নিট লাভ' : 'Net Lifetime Profit'}</th>
                  <th className="py-3 px-4 text-right">{bn ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {(tpl === 'cattle' ? bizCattle : bizGoats).map((animal) => {
                  const totalCost =
                    animal.purchasePrice + animal.feedCost + animal.medicineAndVetCost;
                  const estimatedMarketVal =
                    animal.animalSalePrice > 0
                      ? animal.animalSalePrice
                      : animal.species === 'cattle'
                      ? animal.currentWeightKg * 620
                      : animal.currentWeightKg * 1100;
                  const totalValueGenerated = animal.milkSalesRevenue + estimatedMarketVal;
                  const lifetimeProfit = totalValueGenerated - totalCost;

                  return (
                    <tr key={animal.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {animal.animalTag}
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold">
                          {cleanAnimalText(animal.name)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {cleanAnimalText(animal.breed)}
                        </div>
                        <div className="text-slate-500">
                          {animal.gender === 'Female' ? 'Female' : 'Male'} · Age: {animal.ageMonths} mos
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Lineage: {cleanAnimalText(animal.parentTag)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {animal.currentWeightKg} kg
                        </div>
                        <div className="text-slate-500">{animal.healthStatus}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-800 dark:text-slate-200">
                          {cleanAnimalText(animal.vaccinationHistory)}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {cleanAnimalText(animal.breedingAndOffspringNotes)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatBDT(totalCost)}
                        </div>
                        <div className="text-slate-500">
                          {bn ? 'কেনা: ' : 'Cost: '}{formatBDT(animal.purchasePrice)} · {bn ? 'খাবার: ' : 'Feed: '}{formatBDT(animal.feedCost)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatBDT(totalValueGenerated)}
                        </div>
                        {animal.species === 'cattle' ? (
                          <div className="text-slate-500">
                            {bn ? 'দুধ: ' : 'Milk: '}{animal.totalMilkLiters} {bn ? 'লিটার' : 'L'} ({formatBDT(animal.milkSalesRevenue)})
                          </div>
                        ) : (
                          <div className="text-slate-500">
                            {bn ? 'আনুমানিক মূল্য: ' : 'Est. Val: '}{formatBDT(estimatedMarketVal)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div
                          className={`font-bold text-sm ${
                            lifetimeProfit >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatBDT(lifetimeProfit)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {animal.species === 'cattle' && animal.gender === 'Female' && (
                            <button
                              type="button"
                              onClick={async () => {
                                await updateLivestockAnimalRecord(
                                  animal,
                                  {
                                    totalMilkLiters: animal.totalMilkLiters + 18,
                                    milkSalesRevenue: animal.milkSalesRevenue + 1440,
                                  },
                                  actorEmail
                                );
                                notify(
                                  bn
                                    ? `${animal.animalTag}-এর আজকের ১৮ লিটার দুধ বিক্রি (+৳১,৪৪০) যোগ হয়েছে!`
                                    : `${animal.animalTag}: Recorded today's 18L milk sale (+৳1,440)!`
                                );
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap"
                            >
                              {bn ? '+১৮ লিটার দুধ যোগ' : '+18L Milk'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              const gain = animal.species === 'cattle' ? 8 : 1.5;
                              const feedAdd = animal.species === 'cattle' ? 2400 : 350;
                              await updateLivestockAnimalRecord(
                                animal,
                                {
                                  currentWeightKg: Number((animal.currentWeightKg + gain).toFixed(1)),
                                  feedCost: animal.feedCost + feedAdd,
                                },
                                actorEmail
                              );
                              notify(`${animal.animalTag} weight (+${gain} kg) and feed cost updated!`);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            {bn ? '+ওজন ও খাবার যোগ' : '+Weight & Feed'}
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
        </div>
      )}

      {/* D. FISH FARMING WORKSPACE */}
      {tpl === 'fish' && (
        <div className="space-y-6">
          <FishManagementModule
            activeBusiness={activeBusiness}
            cycles={bizFish}
            inventoryItems={inventoryItems}
            journalEntries={bizJournals}
            accounts={accounts}
            auditLogs={auditLogs}
            ownerId={ownerId}
            actorEmail={actorEmail}
            onNotify={notify}
            lang={lang}
          />
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <Fish className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                'Pond Management & Fish Harvest P&L'
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-3 px-4">Pond Name & Area</th>
                  <th className="py-3 px-4">Species & Fingerlings</th>
                  <th className="py-3 px-4">Water Quality (pH/DO)</th>
                  <th className="py-3 px-4 text-right">Total Production Cost</th>
                  <th className="py-3 px-4 text-right">Harvest Revenue & Weight</th>
                  <th className="py-3 px-4 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {bizFish.map((fc) => {
                  const totalCost =
                    fc.fingerlingCost + fc.feedCost + fc.medicineAndLimeCost + fc.labourCost;
                  const netProfit = fc.totalSalesRevenue - totalCost;
                  return (
                    <tr key={fc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {fc.pondId} — {fc.pondName}
                        </div>
                        <div className="text-slate-500">
                          `Area: ${fc.areaDecimals} Dec · Depth: ${fc.depthFeet} ft`
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {fc.fishSpecies}
                        </div>
                        <div className="font-mono tabular-nums text-slate-500">
                          `Fingerlings: ${fc.initialQuantity.toLocaleString()} (${fc.stockingDate})`
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-700 dark:text-emerald-400">
                        {fc.waterQualityNotes}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatBDT(totalCost)}
                        </div>
                        <div className="text-slate-500">
                          'Stocking: ' + formatBDT(fc.fingerlingCost) + ' · Feed: ' + formatBDT(fc.feedCost)
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatBDT(fc.totalSalesRevenue)}
                        </div>
                        <div className="text-slate-500">
                          'Harvest Weight: ' + fc.harvestWeightKg.toLocaleString() + ' KG'
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div
                          className={`font-bold text-sm ${
                            netProfit >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatBDT(netProfit)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* THIS BUSINESS'S RECENT TRANSACTIONS LEDGER (Always visible so client sees their sales/expenses right here!) */}
      <div id="business-ledger-section" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <Factory className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {activeBusiness.name} — Transaction & Business Ledger
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete journal of sales, procurement and operational expenditures for this business unit
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            Total {bizJournals.length} Transactions
          </span>
        </div>

        {bizJournals.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No transactions or operational expenses recorded for this business yet.
            </p>
          </div>
        ) : (
          <div className="max-h-[45vh] overflow-y-auto overflow-x-auto divide-y divide-slate-200 dark:divide-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 shadow-xs">
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <th className="py-3 px-4">Voucher & Date</th>
                  <th className="py-3 px-4">Officer / Actor</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description & Party</th>
                  <th className="py-3 px-4 text-right">Amount (BDT)</th>
                  <th className="py-3 px-4 text-right">Due (BDT)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {bizJournals.map((j) => {
                  const isSale = j.transactionType === 'sale' || j.transactionType === 'income';
                  const actorEmail = j.actorEmail || '';
                  const matchedUser = erpUsers.find((u) => u.email?.toLowerCase() === actorEmail.toLowerCase());
                  const actorName = j.actorName || matchedUser?.displayName || (actorEmail.split('@')[0]) || 'RegardsAgro Admin';
                  const actorPhoto = resolveActorPhoto(actorEmail, actorName, j.actorRole, j.actorPhoto);
                  const actorPost = j.actorDesignation || matchedUser?.designation || (j.actorRole === 'super_admin' ? 'Super Admin' : j.actorRole === 'super_manager' ? 'General Manager' : 'Officer');

                  return (
                    <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {j.referenceNo}
                        </div>
                        <div className="text-slate-500">{j.date}</div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() =>
                            setViewingProfile({
                              id: matchedUser?.id,
                              name: actorName,
                              email: actorEmail || matchedUser?.email,
                              phone: matchedUser?.phone || '+880 1711-000000',
                              nidNumber: matchedUser?.nidNumber || '',
                              designation: actorPost,
                              role: j.actorRole || matchedUser?.role || 'super_admin',
                              businessName: activeBusiness.name,
                              photoUrl: actorPhoto,
                              address: matchedUser?.address || activeBusiness.location,
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
                              className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {actorName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors truncate max-w-[120px]">
                              {actorName}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                              {actorPost}
                            </div>
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold ${
                            isSale
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isSale ? 'Income / Sale' : 'Operating Expense'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {j.category}
                        </div>
                        <div className="text-slate-500">
                          {j.description} {j.counterpartyName ? `· Party: ${j.counterpartyName}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatBDT(j.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {j.dueAmount > 0 ? (
                          <span className="text-red-600 font-semibold">
                            Due: {formatBDT(j.dueAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Paid</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            triggerConfirmDelete({
                              title: 'Delete Transaction Voucher',
                              message: `Are you sure you want to permanently delete voucher "${j.referenceNo}"?`,
                              itemName: `${j.referenceNo} - ${formatBDT(j.amount)} (${j.category})`,
                              onConfirm: async () => {
                                await deleteJournalEntry(j.id);
                              },
                            });
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Delete Entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Sale / Expense Modal for this Business */}
      {showQuickTxModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowQuickTxModal(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {showQuickTxModal === 'sale'
                  ? (bn ? `${activeBusiness.nameBn || activeBusiness.name} — নতুন বিক্রি / আয় লিখুন` : `${activeBusiness.name} — Record New Sale / Revenue`)
                  : (bn ? `${activeBusiness.nameBn || activeBusiness.name} — নতুন খরচ লিখুন` : `${activeBusiness.name} — Record Operational Expense`)}
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickTxModal(null)}
                className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              >
                {bn ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>

            <form onSubmit={handleQuickSaleOrExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold">
                  {showQuickTxModal === 'sale'
                    ? (bn ? 'কী বিক্রি করলেন? (Item / Category) *' : 'Sale Item / Category *')
                    : (bn ? 'কী বাবদ খরচ হলো? (Expense Item) *' : 'Expense Category / Head *')}
                </label>
                <input
                  type="text"
                  required
                  value={qCategory}
                  onChange={(e) => setQCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'মোট টাকার পরিমাণ (BDT) *' : 'Total Amount (BDT) *'}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="0"
                    value={qAmount === 0 ? '' : qAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setQAmount(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'বাকি থাকলে টাকার পরিমাণ (Due)' : 'Outstanding Due (if any)'}</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={qDueAmount === 0 ? '' : qDueAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setQDueAmount(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">
                  {showQuickTxModal === 'sale'
                    ? (bn ? 'ক্রেতা / পাইকারের নাম (Buyer Name)' : 'Customer / Wholesale Buyer Name')
                    : (bn ? 'সাপ্লায়ার / দোকানের নাম (Vendor Name)' : 'Vendor / Supplier Name')}
                </label>
                <input
                  type="text"
                  value={qCounterparty}
                  onChange={(e) => setQCounterparty(e.target.value)}
                  placeholder={bn ? "যেমন: বিসমিল্লাহ ট্রেডার্স" : "e.g. Bismillah Traders"}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'বিস্তারিত নোট (ঐচ্ছিক)' : 'Transaction Notes (Optional)'}</label>
                <input
                  type="text"
                  value={qDesc}
                  onChange={(e) => setQDesc(e.target.value)}
                  placeholder={bn ? "যেমন: নগদ পেমেন্ট" : "e.g. Cash payment"}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickTxModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickTx}
                  className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-2"
                >
                  {isSavingQuickTx ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>{bn ? 'হিসাব সেভ হচ্ছে...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{bn ? 'হিসাব সেভ করুন (Save)' : 'Save Transaction'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Adding Specialized Operational Record */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {tpl === 'poultry'
                  ? (bn ? 'নতুন মুরগির ব্যাচ যোগ করুন (New Poultry Batch)' : 'Create New Poultry Batch')
                  : tpl === 'cattle' || tpl === 'goat'
                  ? (bn ? `নতুন ${tpl === 'cattle' ? 'গরু' : 'ছাগল'} রেজিস্ট্রেশন করুন` : `Register New ${tpl === 'cattle' ? 'Cattle' : 'Goat'}`)
                  : tpl === 'fish'
                  ? 'Start New Pond Fish Cycle'
                  
                  : (bn ? `${activeBusiness.name}-এ নতুন হিসাব লিখুন` : `Add New Record to ${activeBusiness.name}`)}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              >
                {bn ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>

            {tpl === 'poultry' && (
              <form onSubmit={handleAddPoultryBatch} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'ব্যাচ নাম্বার (Batch ID)' : 'Batch ID'}</label>
                    <input
                      type="text"
                      required
                      value={pBatchCode}
                      onChange={(e) => setPBatchCode(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'মুরগির জাত (Chicken Type)' : 'Chicken Breed'}</label>
                    <select
                      value={pChickenType}
                      onChange={(e) => setPChickenType(e.target.value as any)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    >
                      <option value="Broiler">{bn ? "ব্রয়লার (Broiler)" : "Broiler"}</option>
                      <option value="Sonali">{bn ? "সোনালী (Sonali)" : "Sonali"}</option>
                      <option value="Layer">{bn ? "লেয়ার (Layer)" : "Layer"}</option>
                      <option value="Deshi">{bn ? "দেশি (Deshi)" : "Deshi"}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'শেড নাম্বার (Shed No)' : 'Shed Number'}</label>
                    <input
                      type="text"
                      value={pShed}
                      onChange={(e) => setPShed(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'মোট বাচ্চার সংখ্যা (Quantity)' : 'Chick Quantity'}</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={pInitQty === 0 ? '' : pInitQty}
                      onChange={(e) => setPInitQty(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'বাচ্চা কেনার দাম (BDT)' : 'Chick Purchase Cost (BDT)'}</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={pPurchaseCost === 0 ? '' : pPurchaseCost}
                      onChange={(e) => setPPurchaseCost(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'খাবারের খরচ (Feed Cost BDT)' : 'Feed Cost (BDT)'}</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={pFeedCost === 0 ? '' : pFeedCost}
                      onChange={(e) => setPFeedCost(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'ওষুধ ও টিকা খরচ' : 'Medicine & Vaccine Cost'}</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={pMedCost === 0 ? '' : pMedCost}
                      onChange={(e) => setPMedCost(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'লেবার ও বিদ্যুৎ বিল' : 'Labor & Electricity Bill'}</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={pLabourCost === 0 ? '' : pLabourCost}
                      onChange={(e) => setPLabourCost(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'বিক্রয় মূল্য (BDT)' : 'Sales Revenue (BDT)'}</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={pSalesRev === 0 ? '' : pSalesRev}
                      onChange={(e) => setPSalesRev(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="submit"
                    disabled={isSavingBatch}
                    className="px-5 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingBatch ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        <span>{bn ? 'সেভ হচ্ছে...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <span>{bn ? 'ব্যাচ সেভ করুন' : 'Save Batch'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {(tpl === 'cattle' || tpl === 'goat') && (
              <form onSubmit={handleAddLivestock} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'পশুর ট্যাগ আইডি (Animal ID)' : 'Animal Tag ID'}</label>
                    <input
                      type="text"
                      required
                      value={lTag}
                      onChange={(e) => setLTag(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'পশুর নাম (Animal Name)' : 'Animal Name'}</label>
                    <input
                      type="text"
                      required
                      value={lName}
                      onChange={(e) => setLName(e.target.value)}
                      placeholder={bn ? "যেমন: পদ্মা রানী / সুলতান" : "e.g. Padma Rani / Sultan"}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'জাত (Breed)' : 'Breed'}</label>
                    <input
                      type="text"
                      value={lBreed}
                      onChange={(e) => setLBreed(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'লিঙ্গ (Gender)' : 'Gender'}</label>
                    <select
                      value={lGender}
                      onChange={(e) => setLGender(e.target.value as any)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    >
                      <option value="Female">{bn ? "মাদি (Female)" : "Female"}</option>
                      <option value="Male">{bn ? "মর্দা / ষাঁড় (Male)" : "Male"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'ওজন (কেজি)' : 'Weight (KG)'}</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={lWeight === 0 ? '' : lWeight}
                      onChange={(e) => setLWeight(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'কেনা দাম (Purchase BDT)' : 'Purchase Cost (BDT)'}</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={lPurchasePrice === 0 ? '' : lPurchasePrice}
                      onChange={(e) => setLPurchasePrice(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{bn ? 'খাবার খরচ (Feed Cost BDT)' : 'Feed Cost (BDT)'}</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={lFeedCost === 0 ? '' : lFeedCost}
                      onChange={(e) => setLFeedCost(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="submit"
                    disabled={isSavingAnimal}
                    className="px-5 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingAnimal ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        <span>{bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <span>{bn ? 'পশু রেজিস্ট্রেশন সেভ করুন' : 'Save Livestock Record'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {tpl === 'fish' && (
              <form onSubmit={handleAddFishCycle} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">Pond Name</label>
                    <input
                      type="text"
                      value={fPondName}
                      onChange={(e) => setFPondName(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Surface Area (Decimals)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={fArea === 0 ? '' : fArea}
                      onChange={(e) => setFArea(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">Fish Species</label>
                    <input
                      type="text"
                      value={fSpecies}
                      onChange={(e) => setFSpecies(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Fingerling Quantity</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={fInitQty === 0 ? '' : fInitQty}
                      onChange={(e) => setFInitQty(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">Fingerling Cost (BDT)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={fFingerlingCost === 0 ? '' : fFingerlingCost}
                      onChange={(e) => setFFingerlingCost(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Feed Cost (BDT)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={fFeedCost === 0 ? '' : fFeedCost}
                      onChange={(e) => setFFeedCost(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Harvest Sales Revenue (BDT)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={fSalesRev === 0 ? '' : fSalesRev}
                      onChange={(e) => setFSalesRev(parseNum(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="submit"
                    disabled={isSavingCycle}
                    className="px-5 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingCycle ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        <span>{bn ? 'চক্র চালু হচ্ছে...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <span>Save Pond Record</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            

            {tpl === 'custom' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  To record daily sales or expenses for this enterprise unit, use the green{' '}
                  <strong>&ldquo;+ Record Sale&rdquo;</strong> or amber{' '}
                  <strong>&ldquo;+ Record Expense&rdquo;</strong> buttons above.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Profile Card Modal */}
      <UserProfileCardModal
        isOpen={Boolean(viewingProfile)}
        onClose={() => setViewingProfile(null)}
        profile={viewingProfile}
        lang={lang}
      />

      {/* Trip Challan & Work Order Modal */}
      <TripChallanModal
        isOpen={Boolean(selectedTripChallan)}
        onClose={() => setSelectedTripChallan(null)}
        trip={selectedTripChallan}
        businessName={activeBusiness.nameBn || activeBusiness.name}
        businessPhone={activeBusiness.contactPhone}
        allTrips={bizTransport.filter((t) => t.recordType === 'trip' || (!t.recordType && t.tripOrVehicleCode?.startsWith('TRP')))}
        lang={lang}
      />

      {/* Comprehensive Profit & Loss Analysis Modal */}
      {showProfitAnalysisModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowProfitAnalysisModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {bn ? `${activeBusiness.nameBn || activeBusiness.name} — নিট লাভ-ক্ষতি ও খতিয়ান বিশ্লেষণ` : `${activeBusiness.name} — Profit & Loss Analysis`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {bn ? 'সকল বিক্রি, কেনাকাটা, শ্রম ও পরিচালন খরচের লাইভ সমাপনী হিসাব' : 'Live synchronized financial P&L analysis and ledger audit'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfitAnalysisModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 4 Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {bn ? 'মোট বিক্রি / আয়' : 'Total Revenue'}
                </div>
                <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  +{formatBDT(bizRevenue)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {bn ? 'মোট খরচ / ব্যয়' : 'Total Expenses'}
                </div>
                <div className="text-base font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                  -{formatBDT(bizExpense)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {bn ? 'প্রকৃত নিট লাভ' : 'Net Profit'}
                </div>
                <div
                  className={`text-base font-black font-mono mt-1 ${
                    bizNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatBDT(bizNetProfit)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {bn ? 'প্রফিট মার্জিন' : 'Profit Margin'}
                </div>
                <div className="text-base font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
                  {bizRevenue > 0 ? `${((bizNetProfit / bizRevenue) * 100).toFixed(1)}%` : (bn ? '০%' : '0%')}
                </div>
              </div>
            </div>

            {/* Operating Health Assessment */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {bizNetProfit >= 0
                    ? bn
                      ? 'এই ডিভিশনটি সন্তোষজনক লাভে পরিচালিত হচ্ছে এবং আয়ের অনুপাত স্থিতিশীল রয়েছে।'
                      : 'This business division is operating profitably with balanced operating ratios.'
                    : bn
                      ? 'এই ডিভিশনে খরচ আয়ের চেয়ে বেশি। অতিরিক্ত ব্যয় নিয়ন্ত্রণ বা বিক্রি বাড়ানোর পদক্ষেপ নিন।'
                      : 'Operating deficit detected. Consider reviewing recurring feed/overhead costs.'}
                </span>
              </div>
            </div>

            {/* Recent Vouchers List Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {bn ? 'সর্বশেষ এন্ট্রি ও ভাউচার তালিকা' : 'Recent Unit Transactions'}
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  {bizJournals.length} {bn ? 'টি লেনদেন' : 'entries'}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-2 px-3">{bn ? 'ভাউচার' : 'Voucher'}</th>
                      <th className="py-2 px-3">{bn ? 'তারিখ' : 'Date'}</th>
                      <th className="py-2 px-3">{bn ? 'বিবরণ' : 'Description'}</th>
                      <th className="py-2 px-3 text-right">{bn ? 'পরিমাণ' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {bizJournals.slice(0, 6).map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                          {j.referenceNo}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{j.date}</td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs">
                          {j.description}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${
                            j.transactionType === 'sale' || j.transactionType === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {j.transactionType === 'sale' || j.transactionType === 'income' ? '+' : '-'}
                          {formatBDT(j.amount)}
                        </td>
                      </tr>
                    ))}
                    {bizJournals.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400 text-xs">
                          {bn ? 'কোনো লেনদেন রেকর্ড পাওয়া যায়নি' : 'No transactions recorded yet'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowProfitAnalysisModal(false);
                  const el = document.getElementById('business-ledger-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>{bn ? 'সম্পূর্ণ লেজার টেবিলে যান' : 'Go to Full Ledger Table'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>{bn ? 'প্রিন্ট' : 'Print'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowProfitAnalysisModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {bn ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
