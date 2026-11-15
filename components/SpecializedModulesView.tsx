'use client';

import React, { useState } from 'react';
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
  formatBDT,
} from '@/lib/erp-types';
import {
  createPoultryBatchRecord,
  createLivestockAnimalRecord,
  updateLivestockAnimalRecord,
  createFishCycleRecord,
  createTransportOpRecord,
  postDoubleEntryTransaction,
} from '@/lib/erp-service';
import PoultryManagementModule from './PoultryManagementModule';
import LivestockManagementModule from './LivestockManagementModule';
import FishManagementModule from './FishManagementModule';
import TransportManagementModule from './TransportManagementModule';
import MonthFilterBar, { MonthFilterValue, matchesMonthFilter } from './MonthFilterBar';

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
  ownerId: string;
  actorEmail: string;
  userRole: string;
  onBackToDashboard: () => void;
  monthFilter?: MonthFilterValue;
  onChangeMonthFilter?: (next: MonthFilterValue) => void;
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
  ownerId,
  actorEmail,
  onBackToDashboard,
  monthFilter: controlledMonthFilter,
  onChangeMonthFilter,
}: SpecializedModulesViewProps) {
  const [localMonthFilter, setLocalMonthFilter] = useState<MonthFilterValue>({
    year: 'ALL',
    month: 'ALL',
  });
  const activeMonthFilter = controlledMonthFilter ?? localMonthFilter;
  const setMonthFilter = onChangeMonthFilter ?? setLocalMonthFilter;

  const tpl = activeBusiness.templateType;

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
  const [pShed, setPShed] = useState('শেড নং - ৩ (Shed-3)');
  const [pSupplier, setPSupplier] = useState('কাজী হ্যাচারি লিমিটেড');
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
    tpl === 'goat' ? 'ব্ল্যাক বেঙ্গল (Black Bengal)' : 'হলস্টেইন ফ্রিজিয়ান (Friesian Cross)'
  );
  const [lGender, setLGender] = useState<'Female' | 'Male'>('Female');
  const [lAge, setLAge] = useState(24);
  const [lWeight, setLWeight] = useState(tpl === 'goat' ? 25 : 420);
  const [lPurchasePrice, setLPurchasePrice] = useState(tpl === 'goat' ? 15000 : 210000);
  const [lFeedCost, setLFeedCost] = useState(tpl === 'goat' ? 4500 : 48000);
  const [lMilkLiters, setLMilkLiters] = useState(tpl === 'goat' ? 0 : 3200);
  const [lMilkRev, setLMilkRev] = useState(tpl === 'goat' ? 0 : 256000);
  const [lParentTag, setLParentTag] = useState(
    tpl === 'goat' ? 'বাবা: GOAT-0002 | মা: GOAT-0001' : 'খামারের মূল জাত'
  );

  // Fish Form State
  const [fCycleCode, setFCycleCode] = useState(`POND-0${bizFish.length + 1}-2026`);
  const [fPondId, setFPondId] = useState(`POND-0${bizFish.length + 1}`);
  const [fPondName, setFPondName] = useState(`পুকুর নং - ০${bizFish.length + 1}`);
  const [fArea, setFArea] = useState(120);
  const [fSpecies, setFSpecies] = useState('রুই, কাতলা ও তেলাপিয়া');
  const [fInitQty, setFInitQty] = useState(25000);
  const [fFingerlingCost, setFFingerlingCost] = useState(85000);
  const [fFeedCost, setFFeedCost] = useState(210000);
  const [fSalesRev, setFSalesRev] = useState(580000);

  // Transport Form State
  const [tCode, setTCode] = useState(`TRIP-10${bizTransport.length + 1}`);
  const [tRegNo, setTRegNo] = useState('Dhaka Metro-Ta-16-9210');
  const [tVehicleType, setTVehicleType] = useState('৭ টন কাভার্ড ভ্যান');
  const [tDriver, setTDriver] = useState('মোঃ শফিকুল ইসলাম');
  const [tOrigin, setTOrigin] = useState('গাজীপুর খামার');
  const [tDest, setTDest] = useState('ঢাকা কারওয়ান বাজার');
  const [tDistance, setTDistance] = useState(180);
  const [tFuel, setTFuel] = useState(9500);
  const [tToll, setTToll] = useState(1800);
  const [tAllowance, setTAllowance] = useState(2000);
  const [tRev, setTRev] = useState(38000);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4500);
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

    await postDoubleEntryTransaction(
      {
        referenceNo: `VCH-${Date.now().toString().slice(-5)}`,
        date: new Date().toISOString().split('T')[0],
        businessId: activeBusiness.id,
        businessName: activeBusiness.name,
        transactionType: isSale ? 'sale' : 'expense',
        category: qCategory || (isSale ? 'পণ্য বিক্রি (Product Sale)' : 'খামার খরচ (Farm Expense)'),
        description: qDesc || `${isSale ? 'বিক্রি' : 'খরচ'} - ${activeBusiness.name}`,
        debitAccountId: isSale ? cashOrBank.id : expAcc.id,
        debitAccountName: isSale ? cashOrBank.name : expAcc.name,
        creditAccountId: isSale ? revAcc.id : cashOrBank.id,
        creditAccountName: isSale ? revAcc.name : cashOrBank.name,
        amount: Number(qAmount),
        paymentStatus: Number(qDueAmount) > 0 ? 'partial' : 'paid',
        dueAmount: Number(qDueAmount) || 0,
        counterpartyName: qCounterparty || (isSale ? 'পাইকারি ক্রেতা' : 'সাপ্লায়ার'),
      },
      accounts,
      ownerId,
      actorEmail
    );
    setShowQuickTxModal(null);
    notify(
      `${activeBusiness.name}-এ ${isSale ? 'বিক্রি/আয়' : 'খরচ'} বাবদ ${formatBDT(Number(qAmount))} সফলভাবে হিসাবভুক্ত হয়েছে!`
    );
  };

  const handleAddPoultryBatch = async (e: React.FormEvent) => {
    e.preventDefault();
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
        gradeBreakdown: 'বড় সাইজ: ৭০% | মাঝারি: ২৫% | ছোট: ৫%',
        pricePerKg: 170,
        totalSalesRevenue: Number(pSalesRev),
        outstandingDue: 0,
        vaccineScheduleNotes: '৫ম দিন: রানীক্ষেত, ১২তম দিন: গামবোরো টিকা সম্পন্ন',
        status: 'active',
      },
      ownerId,
      actorEmail
    );
    setShowAddModal(false);
    notify(`নতুন মুরগির ব্যাচ (${pBatchCode}) সফলভাবে চালু হয়েছে!`);
  };

  const handleAddLivestock = async (e: React.FormEvent) => {
    e.preventDefault();
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
          species === 'goat' ? 'পিপিআর (PPR) ও গোট পক্স টিকা দেওয়া হয়েছে' : 'ক্ষুরা রোগ (FMD) ও তড়কা টিকা দেওয়া হয়েছে',
        breedingAndOffspringNotes: species === 'goat' ? 'সুস্থ প্রজননক্ষম' : 'ডাক্তারি পরীক্ষা স্বাভাবিক',
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
    notify(`নতুন পশুর রেকর্ড (${lTag}) সফলভাবে যুক্ত হয়েছে!`);
  };

  const handleAddFishCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFishCycleRecord(
      {
        cycleCode: fCycleCode,
        pondId: fPondId,
        pondName: fPondName,
        businessId: activeBusiness.id,
        areaDecimals: Number(fArea),
        depthFeet: 6.0,
        location: activeBusiness.location,
        waterQualityNotes: 'pH: 7.6 | অক্সিজেন (DO): 6.5 mg/L | পানির অবস্থা ভালো',
        fishSpecies: fSpecies,
        stockingDate: new Date().toISOString().split('T')[0],
        initialQuantity: Number(fInitQty),
        mortalityCount: 300,
        fingerlingCost: Number(fFingerlingCost),
        feedCost: Number(fFeedCost),
        medicineAndLimeCost: 15000,
        labourCost: 30000,
        harvestDate: 'চলমান (Active)',
        harvestWeightKg: 2800,
        totalSalesRevenue: Number(fSalesRev),
        status: 'active',
      },
      ownerId,
      actorEmail
    );
    setShowAddModal(false);
    notify(`নতুন পুকুরের মাছ চাষ চক্র (${fPondName}) যুক্ত হয়েছে!`);
  };

  const handleAddTransportOp = async (e: React.FormEvent) => {
    e.preventDefault();
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
        cargoDetails: 'কৃষি ও খামার পণ্য পরিবহন',
        customerName: 'পাইকারি আড়তদার',
        distanceKm: Number(tDistance),
        fuelCost: Number(tFuel),
        tollCost: Number(tToll),
        driverAllowance: Number(tAllowance),
        maintenanceCost: 1000,
        maintenanceDetails: 'ইঞ্জিন অয়েল ও ব্রেক চেকআপ',
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
    notify(`নতুন ট্রিপের হিসাব (${tCode}) যুক্ত হয়েছে!`);
  };

  return (
    <div className="space-y-6">
      {/* 12-Month Period Filter for this Business Workspace */}
      <MonthFilterBar value={activeMonthFilter} onChange={setMonthFilter} bn={true} />

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
              মূল ড্যাশবোর্ডে ফিরে যান (Back to All Businesses)
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 pt-1">
              {activeBusiness.nameBn ? `${activeBusiness.nameBn} — ${activeBusiness.name}` : activeBusiness.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ঠিকানা: {activeBusiness.location} · ম্যানেজার: {activeBusiness.managerName} · ফোন:{' '}
              {activeBusiness.contactPhone}
            </p>
          </div>

          {/* 3 Ultra-Clear Action Buttons for Any User/Client */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setQCategory(
                  tpl === 'poultry'
                    ? 'মুরগি ও ডিম বিক্রি'
                    : tpl === 'cattle'
                    ? 'দুধ ও গরু বিক্রি'
                    : tpl === 'goat'
                    ? 'ছাগল বিক্রি'
                    : tpl === 'fish'
                    ? 'মাছ বিক্রি'
                    : tpl === 'transport'
                    ? 'ট্রাক ভাড়া আয়'
                    : 'পণ্য বিক্রি (Sales)'
                );
                setShowQuickTxModal('sale');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              + বিক্রি / আয় লিখুন (Add Sale)
            </button>

            <button
              type="button"
              onClick={() => {
                setQCategory(
                  tpl === 'poultry'
                    ? 'মুরগির খাবার ও ওষুধ খরচ'
                    : tpl === 'cattle'
                    ? 'গরুর খাবার ও ডাক্তার খরচ'
                    : tpl === 'goat'
                    ? 'ছাগলের খাবার ও পরিচর্যা খরচ'
                    : tpl === 'fish'
                    ? 'মাছের খাবার ও পুকুর খরচ'
                    : tpl === 'transport'
                    ? 'ডিজেল, টোল ও মেরামত খরচ'
                    : 'ব্যবসায়িক খরচ (Expense)'
                );
                setShowQuickTxModal('expense');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              + খরচ লিখুন (Add Expense)
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {tpl === 'poultry'
                ? '+ নতুন মুরগির ব্যাচ (New Batch)'
                : tpl === 'cattle'
                ? '+ নতুন গরু যুক্ত করুন (Add Cattle)'
                : tpl === 'goat'
                ? '+ নতুন ছাগল যুক্ত করুন (Add Goat)'
                : tpl === 'fish'
                ? '+ নতুন পুকুর/মাছের চক্র (New Pond)'
                : tpl === 'transport'
                ? '+ নতুন ট্রিপ লিখুন (Add Trip)'
                : '+ নতুন এন্ট্রি (New Record)'}
            </button>
          </div>
        </div>

        {/* Simple Explainable Guide Strip for this Specific Business */}
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3.5 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
          <HelpCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              এই পেজে কী করবেন (How to use this page):{' '}
            </span>
            {tpl === 'poultry' &&
              'এখানে আপনার প্রতিটি শেডের মুরগির ব্যাচ আলাদাভাবে ট্র্যাক করা হয়। নিচের টেবিল থেকে ১ ক্লিকে প্রতিদিনের খাবার (Feed), মারা যাওয়া মুরগি (Mortality), এবং মুরগি বিক্রি আপডেট করতে পারবেন। কোন ব্যাচে কত লাভ বা লস হচ্ছে সিস্টেম নিজে থেকেই হিসাব করে দেখাবে।'}
            {tpl === 'cattle' &&
              'এখানে প্রতিটি গরুর আলাদা আইডি (যেমন CAT-0001) অনুযায়ী ওজন, প্রতিদিনের দুধ উৎপাদন, টিকা (Vaccine), এবং গরুটির পেছনে মোট কত খরচ ও কত লাভ হয়েছে তা এক নজরে দেখতে ও আপডেট করতে পারবেন।'}
            {tpl === 'goat' &&
              'এখানে প্রতিটি ছাগলের আলাদা আইডি (GOAT-0001), বংশতালিকা (বাবা/মা), বাচ্চা (Kids) উৎপাদন, ওজন, এবং ছাগলটির আজীবন লাভ-ক্ষতি হিসাব রাখা হয়।'}
            {tpl === 'fish' &&
              'এখানে প্রতিটি পুকুরের আয়তন, পোনা ছাড়ার সংখ্যা, পানির মান (pH/Oxygen), খাবারের খরচ এবং মাছ বিক্রির পর পুকুরভিত্তিক নিট লাভ-ক্ষতি দেখা যায়।'}
            {tpl === 'transport' &&
              'এখানে প্রতিটি ট্রাকের নাম্বার প্লেট, ড্রাইভার, ট্রিপের ভাড়া, ডিজেল ও টোল খরচ বাদ দিয়ে প্রতি ট্রিপে কত টাকা নিট লাভ থাকছে এবং ফিটনেস/ট্যাক্স টোকেনের মেয়াদ কবে শেষ হবে তা দেখা যায়।'}
            {tpl === 'custom' &&
              'এটি আপনার তৈরি করা কাস্টম ব্যবসা। উপরের "+ বিক্রি / আয় লিখুন" এবং "+ খরচ লিখুন" বাটনে ক্লিক করে প্রতিদিনের লেনদেন লিখলে নিচে স্বয়ংক্রিয়ভাবে লাভ-ক্ষতি ও খতিয়ান তৈরি হবে।'}
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>মোট বিক্রি ও আয় (Total Sales/Income)</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatBDT(bizRevenue)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            মোট {bizJournals.filter((j) => j.transactionType === 'sale' || j.transactionType === 'income').length} টি বিক্রয় ভাউচার থেকে
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>মোট খরচ (Total Expenses)</span>
            <TrendingDown className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatBDT(bizExpense)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            খাবার, ওষুধ, কর্মচারী ও অন্যান্য খরচ
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>নিট লাভ / ক্ষতি (Net Profit / Loss)</span>
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
          <div className="mt-1 text-xs text-slate-500">
            {bizNetProfit >= 0 ? 'ব্যবসা লাভজনক অবস্থায় আছে' : 'খরচ আয়ের চেয়ে বেশি হয়েছে'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>গোডাউন স্টক (Inventory Items)</span>
            <PackageCheck className="h-4 w-4 text-slate-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {bizInventory.length} টি পণ্য
          </div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            {activeBusiness.customFieldsSpec || 'সক্রিয় মডিউল চালু আছে'}
          </div>
        </div>
      </div>

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
                  {tpl === 'cattle'
                    ? 'প্রতিটি গরুর প্রোফাইল, দুধ উৎপাদন ও আজীবন লাভ-ক্ষতি (Cattle Registry)'
                    : 'প্রতিটি ছাগলের প্রোফাইল, বংশতালিকা ও লাভ-ক্ষতি (Goat Registry)'}
                </h2>
                <p className="text-xs text-slate-500">
                  প্রতিটি পশুর আলাদা ট্যাগ নাম্বার অনুযায়ী ওজন, দুধ এবং চিকিৎসা খরচ হিসাব রাখা হয়
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-3 px-4">পশুর আইডি ও নাম (Tag & Name)</th>
                  <th className="py-3 px-4">জাত, বয়স ও বংশতালিকা</th>
                  <th className="py-3 px-4 text-right">বর্তমান ওজন ও স্বাস্থ্য</th>
                  <th className="py-3 px-4">টিকা ও বাচ্চা প্রজনন তথ্য</th>
                  <th className="py-3 px-4 text-right">মোট খরচ (কেনা+খাবার+ডাক্তার)</th>
                  <th className="py-3 px-4 text-right">দুধ বিক্রি ও বাজারমূল্য</th>
                  <th className="py-3 px-4 text-right">নিট লাভ (Lifetime Profit)</th>
                  <th className="py-3 px-4 text-right">দ্রুত আপডেট</th>
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
                          {animal.name}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {animal.breed}
                        </div>
                        <div className="text-slate-500">
                          {animal.gender === 'Female' ? 'মাদি (Female)' : 'মর্দা (Male)'} · বয়স: {animal.ageMonths} মাস
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          বংশ: {animal.parentTag}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {animal.currentWeightKg} কেজি
                        </div>
                        <div className="text-slate-500">{animal.healthStatus}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-800 dark:text-slate-200">
                          {animal.vaccinationHistory}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {animal.breedingAndOffspringNotes}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatBDT(totalCost)}
                        </div>
                        <div className="text-slate-500">
                          কেনা: {formatBDT(animal.purchasePrice)} · খাবার: {formatBDT(animal.feedCost)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatBDT(totalValueGenerated)}
                        </div>
                        {animal.species === 'cattle' ? (
                          <div className="text-slate-500">
                            দুধ: {animal.totalMilkLiters} লিটার ({formatBDT(animal.milkSalesRevenue)})
                          </div>
                        ) : (
                          <div className="text-slate-500">
                            আনুমানিক মূল্য: {formatBDT(estimatedMarketVal)}
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
                                  `${animal.animalTag}-এর আজকের ১৮ লিটার দুধ বিক্রি (+৳১,৪৪০) যোগ হয়েছে!`
                                );
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap"
                            >
                              +১৮ লিটার দুধ যোগ
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
                              notify(`${animal.animalTag}-এর ওজন (+${gain} কেজি) ও খাবার খরচ আপডেট হয়েছে!`);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            +ওজন ও খাবার যোগ
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
          />
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <Fish className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                পুকুর ও মাছ চাষের হিসাব (Pond Management & Fish Harvest Profit/Loss)
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-3 px-4">পুকুরের নাম ও আয়তন</th>
                  <th className="py-3 px-4">মাছের প্রজাতি ও পোনা সংখ্যা</th>
                  <th className="py-3 px-4">পানির গুণাগুণ (pH / Oxygen)</th>
                  <th className="py-3 px-4 text-right">মোট খরচ (পোনা+খাবার+ওষুধ)</th>
                  <th className="py-3 px-4 text-right">মাছ বিক্রি ও ওজন</th>
                  <th className="py-3 px-4 text-right">নিট লাভ (Net Profit)</th>
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
                          আয়তন: {fc.areaDecimals} শতক · গভীরতা: {fc.depthFeet} ফুট
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {fc.fishSpecies}
                        </div>
                        <div className="font-mono tabular-nums text-slate-500">
                          পোনা: {fc.initialQuantity.toLocaleString()} টি ({fc.stockingDate})
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
                          পোনা: {formatBDT(fc.fingerlingCost)} · খাবার: {formatBDT(fc.feedCost)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatBDT(fc.totalSalesRevenue)}
                        </div>
                        <div className="text-slate-500">
                          মাছের ওজন: {fc.harvestWeightKg.toLocaleString()} কেজি
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

      {/* E. TRUCK & TRANSPORT WORKSPACE */}
      {tpl === 'transport' && (
        <div className="space-y-6">
          <TransportManagementModule
            activeBusiness={activeBusiness}
            ops={bizTransport}
            journalEntries={bizJournals}
            accounts={accounts}
            auditLogs={auditLogs}
            ownerId={ownerId}
            actorEmail={actorEmail}
            onNotify={notify}
          />
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <Truck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ট্রাক ও পরিবহন ট্রিপের হিসাব এবং কাগজপত্রের মেয়াদ (Fleet & Trip Profit/Loss)
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-3 px-4">ট্রিপ আইডি ও গাড়ির নাম্বার</th>
                  <th className="py-3 px-4">রুট (কোথা থেকে কোথায়) ও মাল</th>
                  <th className="py-3 px-4">ফিটনেস ও ট্যাক্স টোকেনের মেয়াদ</th>
                  <th className="py-3 px-4 text-right">মোট খরচ (ডিজেল+টোল+ড্রাইভার)</th>
                  <th className="py-3 px-4 text-right">ট্রিপের ভাড়া (Revenue)</th>
                  <th className="py-3 px-4 text-right">ট্রিপে নিট লাভ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {bizTransport.map((trp) => {
                  const totalTripCost =
                    trp.fuelCost + trp.tollCost + trp.driverAllowance + trp.maintenanceCost;
                  const tripProfit = trp.tripRevenue - totalTripCost;
                  return (
                    <tr key={trp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {trp.tripOrVehicleCode}
                        </div>
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {trp.registrationNumber}
                        </div>
                        <div className="text-slate-500">ড্রাইভার: {trp.driverName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {trp.origin} → {trp.destination} ({trp.distanceKm} কি.মি.)
                        </div>
                        <div className="text-slate-500">{trp.cargoDetails}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div>ফিটনেস মেয়াদ: {trp.fitnessExpiry}</div>
                        <div>ট্যাক্স টোকেন: {trp.taxTokenExpiry}</div>
                        <div className="text-amber-600 dark:text-amber-400">
                          পরবর্তী সার্ভিসিং: {trp.nextServiceDate}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatBDT(totalTripCost)}
                        </div>
                        <div className="text-slate-500">
                          ডিজেল: {formatBDT(trp.fuelCost)} · টোল: {formatBDT(trp.tollCost)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatBDT(trp.tripRevenue)}
                        </div>
                        {trp.outstandingDue > 0 ? (
                          <div className="text-amber-600 dark:text-amber-400">
                            বাকি আছে: {formatBDT(trp.outstandingDue)}
                          </div>
                        ) : (
                          <div className="text-emerald-600 dark:text-emerald-400">নগদ পরিশোধিত</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div
                          className={`font-bold text-sm ${
                            tripProfit >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatBDT(tripProfit)}
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

      {/* THIS BUSINESS'S RECENT TRANSACTIONS LEDGER (Always visible so client sees their sales/expenses right here!) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Factory className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {activeBusiness.nameBn || activeBusiness.name} — সকল কেনা-বেচা ও খরচের খতিয়ান (Business Ledger)
              </h2>
              <p className="text-xs text-slate-500">
                এই ব্যবসায় যত বিক্রি ও খরচ লেখা হয়েছে তার সম্পূর্ণ তালিকা
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-500">
            মোট {bizJournals.length} টি লেনদেন
          </span>
        </div>

        {bizJournals.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              এই ব্যবসায় এখনো কোনো বিক্রি বা খরচ লেখা হয়নি। উপরের{' '}
              <strong>&ldquo;+ বিক্রি / আয় লিখুন&rdquo;</strong> বাটনে ক্লিক করে প্রথম হিসাব লিখুন!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-3 px-4">ভাউচার ও তারিখ</th>
                  <th className="py-3 px-4">ধরন (আয় / খরচ)</th>
                  <th className="py-3 px-4">বিবরণ ও ক্রেতা/সাপ্লায়ার</th>
                  <th className="py-3 px-4 text-right">টাকার পরিমাণ (BDT)</th>
                  <th className="py-3 px-4 text-right">বাকি (Due)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {bizJournals.map((j) => {
                  const isSale = j.transactionType === 'sale' || j.transactionType === 'income';
                  return (
                    <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {j.referenceNo}
                        </div>
                        <div className="text-slate-500">{j.date}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold ${
                            isSale
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isSale ? 'বিক্রি / আয় (Income)' : 'খরচ (Expense)'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {j.category}
                        </div>
                        <div className="text-slate-500">
                          {j.description} · পার্টি: {j.counterpartyName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatBDT(j.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {j.dueAmount > 0 ? (
                          <span className="text-red-600 font-semibold">
                            বাকি: {formatBDT(j.dueAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-600">পরিশোধিত</span>
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {showQuickTxModal === 'sale'
                  ? `${activeBusiness.nameBn || activeBusiness.name} — নতুন বিক্রি / আয় লিখুন`
                  : `${activeBusiness.nameBn || activeBusiness.name} — নতুন খরচ লিখুন`}
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickTxModal(null)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                বন্ধ করুন
              </button>
            </div>

            <form onSubmit={handleQuickSaleOrExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold">
                  {showQuickTxModal === 'sale'
                    ? 'কী বিক্রি করলেন? (Item / Category) *'
                    : 'কী বাবদ খরচ হলো? (Expense Item) *'}
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
                  <label className="block mb-1 font-semibold">মোট টাকার পরিমাণ (BDT) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={qAmount}
                    onChange={(e) => setQAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">বাকি থাকলে টাকার পরিমাণ (Due)</label>
                  <input
                    type="number"
                    min={0}
                    value={qDueAmount}
                    onChange={(e) => setQDueAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">
                  {showQuickTxModal === 'sale'
                    ? 'ক্রেতা / পাইকারের নাম (Buyer Name)'
                    : 'সাপ্লায়ার / দোকানের নাম (Vendor Name)'}
                </label>
                <input
                  type="text"
                  value={qCounterparty}
                  onChange={(e) => setQCounterparty(e.target.value)}
                  placeholder="যেমন: বিসমিল্লাহ ট্রেডার্স"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold">বিস্তারিত নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={qDesc}
                  onChange={(e) => setQDesc(e.target.value)}
                  placeholder="যেমন: নগদ পেমেন্ট"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickTxModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                >
                  হিসাব সেভ করুন (Save)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Adding Specialized Operational Record */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {tpl === 'poultry'
                  ? 'নতুন মুরগির ব্যাচ যোগ করুন (New Poultry Batch)'
                  : tpl === 'cattle' || tpl === 'goat'
                  ? `নতুন ${tpl === 'cattle' ? 'গরু' : 'ছাগল'} রেজিস্ট্রেশন করুন`
                  : tpl === 'fish'
                  ? 'নতুন পুকুর বা মাছ চাষ চক্র শুরু করুন'
                  : tpl === 'transport'
                  ? 'নতুন ট্রাক ট্রিপের হিসাব লিখুন'
                  : `${activeBusiness.name}-এ নতুন হিসাব লিখুন`}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                বন্ধ করুন
              </button>
            </div>

            {tpl === 'poultry' && (
              <form onSubmit={handleAddPoultryBatch} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">ব্যাচ নাম্বার (Batch ID)</label>
                    <input
                      type="text"
                      required
                      value={pBatchCode}
                      onChange={(e) => setPBatchCode(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">মুরগির জাত (Chicken Type)</label>
                    <select
                      value={pChickenType}
                      onChange={(e) => setPChickenType(e.target.value as any)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    >
                      <option value="Broiler">ব্রয়লার (Broiler)</option>
                      <option value="Sonali">সোনালী (Sonali)</option>
                      <option value="Layer">লেয়ার (Layer)</option>
                      <option value="Deshi">দেশি (Deshi)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">শেড নাম্বার (Shed No)</label>
                    <input
                      type="text"
                      value={pShed}
                      onChange={(e) => setPShed(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">মোট বাচ্চার সংখ্যা (Quantity)</label>
                    <input
                      type="number"
                      value={pInitQty}
                      onChange={(e) => setPInitQty(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">বাচ্চা কেনার দাম (BDT)</label>
                    <input
                      type="number"
                      value={pPurchaseCost}
                      onChange={(e) => setPPurchaseCost(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">খাবারের খরচ (Feed Cost BDT)</label>
                    <input
                      type="number"
                      value={pFeedCost}
                      onChange={(e) => setPFeedCost(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">ওষুধ ও টিকা খরচ</label>
                    <input
                      type="number"
                      value={pMedCost}
                      onChange={(e) => setPMedCost(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">লেবার ও বিদ্যুৎ বিল</label>
                    <input
                      type="number"
                      value={pLabourCost}
                      onChange={(e) => setPLabourCost(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">বিক্রয় মূল্য (BDT)</label>
                    <input
                      type="number"
                      value={pSalesRev}
                      onChange={(e) => setPSalesRev(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    ব্যাচ সেভ করুন
                  </button>
                </div>
              </form>
            )}

            {(tpl === 'cattle' || tpl === 'goat') && (
              <form onSubmit={handleAddLivestock} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">পশুর ট্যাগ আইডি (Animal ID)</label>
                    <input
                      type="text"
                      required
                      value={lTag}
                      onChange={(e) => setLTag(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">পশুর নাম (Animal Name)</label>
                    <input
                      type="text"
                      required
                      value={lName}
                      onChange={(e) => setLName(e.target.value)}
                      placeholder="যেমন: পদ্মা রানী / সুলতান"
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">জাত (Breed)</label>
                    <input
                      type="text"
                      value={lBreed}
                      onChange={(e) => setLBreed(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">লিঙ্গ (Gender)</label>
                    <select
                      value={lGender}
                      onChange={(e) => setLGender(e.target.value as any)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    >
                      <option value="Female">মাদি (Female)</option>
                      <option value="Male">মর্দা / ষাঁড় (Male)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">ওজন (কেজি)</label>
                    <input
                      type="number"
                      value={lWeight}
                      onChange={(e) => setLWeight(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">কেনা দাম (Purchase BDT)</label>
                    <input
                      type="number"
                      value={lPurchasePrice}
                      onChange={(e) => setLPurchasePrice(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">খাবার খরচ (Feed Cost BDT)</label>
                    <input
                      type="number"
                      value={lFeedCost}
                      onChange={(e) => setLFeedCost(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    পশু রেজিস্ট্রেশন সেভ করুন
                  </button>
                </div>
              </form>
            )}

            {tpl === 'fish' && (
              <form onSubmit={handleAddFishCycle} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">পুকুরের নাম (Pond Name)</label>
                    <input
                      type="text"
                      value={fPondName}
                      onChange={(e) => setFPondName(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">আয়তন (শতক / Decimals)</label>
                    <input
                      type="number"
                      value={fArea}
                      onChange={(e) => setFArea(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">মাছের নাম (Fish Species)</label>
                    <input
                      type="text"
                      value={fSpecies}
                      onChange={(e) => setFSpecies(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">পোনা সংখ্যা (Quantity)</label>
                    <input
                      type="number"
                      value={fInitQty}
                      onChange={(e) => setFInitQty(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">পোনা খরচ (BDT)</label>
                    <input
                      type="number"
                      value={fFingerlingCost}
                      onChange={(e) => setFFingerlingCost(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">খাবার খরচ (BDT)</label>
                    <input
                      type="number"
                      value={fFeedCost}
                      onChange={(e) => setFFeedCost(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">বিক্রয় মূল্য (BDT)</label>
                    <input
                      type="number"
                      value={fSalesRev}
                      onChange={(e) => setFSalesRev(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    পুকুরের হিসাব সেভ করুন
                  </button>
                </div>
              </form>
            )}

            {tpl === 'transport' && (
              <form onSubmit={handleAddTransportOp} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">ট্রিপ নাম্বার</label>
                    <input
                      type="text"
                      value={tCode}
                      onChange={(e) => setTCode(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">গাড়ির নাম্বার প্লেট</label>
                    <input
                      type="text"
                      value={tRegNo}
                      onChange={(e) => setTRegNo(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">কোথা থেকে (Origin)</label>
                    <input
                      type="text"
                      value={tOrigin}
                      onChange={(e) => setTOrigin(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">কোথায় যাবে (Destination)</label>
                    <input
                      type="text"
                      value={tDest}
                      onChange={(e) => setTDest(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">ডিজেল খরচ (BDT)</label>
                    <input
                      type="number"
                      value={tFuel}
                      onChange={(e) => setTFuel(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">ব্রিজ টোল (BDT)</label>
                    <input
                      type="number"
                      value={tToll}
                      onChange={(e) => setTToll(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">ট্রিপ ভাড়া (Revenue BDT)</label>
                    <input
                      type="number"
                      value={tRev}
                      onChange={(e) => setTRev(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    ট্রিপ সেভ করুন
                  </button>
                </div>
              </form>
            )}

            {tpl === 'custom' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  কাস্টম ব্যবসায় প্রতিদিনের বিক্রি বা খরচ যোগ করতে উপরের সবুজ{' '}
                  <strong>&ldquo;+ বিক্রি / আয় লিখুন&rdquo;</strong> অথবা হলুদ{' '}
                  <strong>&ldquo;+ খরচ লিখুন&rdquo;</strong> বাটন ব্যবহার করুন।
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
