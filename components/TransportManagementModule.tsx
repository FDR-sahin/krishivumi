'use client';

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Search,
  Plus,
  Route,
  Wrench,
  FileSpreadsheet,
  CheckCircle2,
  Bell,
  Eye,
} from 'lucide-react';
import {
  ErpBusiness,
  ErpTransportOp,
  ErpJournalEntry,
  ErpAccount,
  ErpAuditLog,
  formatBDT,
} from '@/lib/erp-types';
import {
  createTransportOpRecord,
  updateTransportOpRecord,
  postDoubleEntryTransaction,
  logAuditEvent,
  createNotificationRecord,
} from '@/lib/erp-service';
import TripChallanModal from './TripChallanModal';

const parseNum = (val: string): number => {
  const clean = val.replace(/^0+(?=\d)/, '');
  return clean === '' ? 0 : Number(clean);
};

interface TransportManagementModuleProps {
  activeBusiness: ErpBusiness;
  ops: ErpTransportOp[];
  journalEntries: ErpJournalEntry[];
  accounts: ErpAccount[];
  auditLogs: ErpAuditLog[];
  ownerId: string;
  actorEmail: string;
  onNotify: (msg: string) => void;
  lang?: 'en' | 'bn';
}

type TransportSubTab =
  | 'PROFILE_OVERVIEW'
  | 'A_TRIP_MANAGEMENT'
  | 'B_MAINTENANCE_DOCS';

export default function TransportManagementModule({
  activeBusiness,
  ops,
  accounts,
  ownerId,
  actorEmail,
  onNotify,
  lang = 'bn',
}: TransportManagementModuleProps) {
  const bn = lang === 'bn';
  const [activeSubTab, setActiveSubTab] = useState<TransportSubTab>('PROFILE_OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpId, setSelectedOpId] = useState<string>(ops[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTripChallan, setSelectedTripChallan] = useState<ErpTransportOp | null>(null);

  const filteredOps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ops;
    return ops.filter(
      (o) =>
        o.tripOrVehicleCode.toLowerCase().includes(q) ||
        o.registrationNumber.toLowerCase().includes(q) ||
        o.driverName.toLowerCase().includes(q) ||
        o.origin.toLowerCase().includes(q) ||
        o.destination.toLowerCase().includes(q)
    );
  }, [ops, searchQuery]);

  const selectedOp = useMemo(() => {
    return (
      ops.find((o) => o.id === selectedOpId) ||
      filteredOps[0] ||
      ops[0] ||
      null
    );
  }, [ops, filteredOps, selectedOpId]);

  // ============================================================================
  // A. Trip Management & New Vehicle/Trip State (Exact Example: TRUCK-001)
  // ============================================================================
  const [aVehicleCode, setAVehicleCode] = useState('TRUCK-001');
  const [aRegNo, setARegNo] = useState('ঢাকা মেট্রো-ট-১২-৩৪৫৬');
  const [aVehicleType, setAVehicleType] = useState('Heavy Truck (খামারের পণ্যবাহী ট্রাক)');
  const [aPurchasePriceInfo, setAPurchasePriceInfo] = useState('২৫,০০,০০০');
  const [aDriverName, setADriverName] = useState('আব্দুল');
  const [aTripDate, setATripDate] = useState(new Date().toISOString().split('T')[0]);
  const [aOrigin, setAOrigin] = useState('ঢাকা');
  const [aDestination, setADestination] = useState('চট্টগ্রাম');
  const [aCargoDetails, setACargoDetails] = useState('খামারের মুরগি, মাছ ও পশুখাদ্য পরিবহন');
  const [aCustomerName, setACustomerName] = useState('চট্টগ্রাম পাইকারি আড়ত');
  const [aDistanceKm, setADistanceKm] = useState(255);
  const [aTripRevenue, setATripRevenue] = useState(25000);
  const [aDieselCost, setADieselCost] = useState(8000);
  const [aTollCost, setATollCost] = useState(1000);
  const [aDriverAllowance, setADriverAllowance] = useState(1000);
  const [aOtherTripCost, setAOtherTripCost] = useState(500);
  const [aDueAmount, setADueAmount] = useState(0);
  const [aTripStatus, setATripStatus] = useState<'completed' | 'active' | 'maintenance'>(
    'completed'
  );

  const formTotalTripExpense =
    Number(aDieselCost) +
    Number(aTollCost) +
    Number(aDriverAllowance) +
    Number(aOtherTripCost);
  const formNetTripProfit = Number(aTripRevenue) - formTotalTripExpense;

  // ============================================================================
  // B. Vehicle Maintenance & Document Expiry Reminder State
  // ============================================================================
  const [bEngineOilChange, setBEngineOilChange] = useState('হ্যাঁ — ১৫W-৪০ ডিজেল ইঞ্জিন অয়েল');
  const [bTyreChange, setBTyreChange] = useState('সামনের ২টি চাকা রোটেশন ও হাওয়া চেক');
  const [bServiceDetails, setBServiceDetails] = useState(
    'ইঞ্জিন অয়েল পরিবর্তন, ব্রেক সার্ভিসিং ও ফিল্টার পরিবর্তন'
  );
  const [bMaintenanceCost, setBMaintenanceCost] = useState(4500);
  const [bDriverSalary, setBDriverSalary] = useState(18000);
  const [bDowntimeDays, setBDowntimeDays] = useState(1);
  const [bFitnessExpiry, setBFitnessExpiry] = useState(
    selectedOp?.fitnessExpiry || '2027-06-30'
  );
  const [bTaxTokenExpiry, setBTaxTokenExpiry] = useState(
    selectedOp?.taxTokenExpiry || '2027-03-31'
  );
  const [bInsuranceExpiry, setBInsuranceExpiry] = useState(
    selectedOp?.insuranceExpiry || '2027-09-30'
  );
  const [bNextServiceDate, setBNextServiceDate] = useState(
    selectedOp?.nextServiceDate || '2026-12-20'
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // 1-Click Load User's Exact Prompt Example: TRUCK-001 (ঢাকা → চট্টগ্রাম, ভাড়া ২৫,০০০, খরচ ১০,৫০০, লাভ ১৪,৫০০)
  const handleLoadPromptTruckExample = async () => {
    setIsSubmitting(true);
    try {
      await createTransportOpRecord(
        {
          tripOrVehicleCode: 'TRUCK-001',
          recordType: 'trip',
          businessId: activeBusiness.id,
          registrationNumber: 'ঢাকা মেট্রো-ট-১২-৩৪৫৬',
          vehicleType: 'Heavy Truck (ক্রয়মূল্য: ৳২৫,০০,০০০)',
          driverName: 'আব্দুল',
          origin: 'ঢাকা',
          destination: 'চট্টগ্রাম',
          cargoDetails: 'খামারের পোল্ট্রি, মাছ ও ফিড পণ্য পরিবহন',
          customerName: 'চট্টগ্রাম আগ্রাবাদ পাইকারি ট্রেডার্স',
          distanceKm: 250,
          fuelCost: 8000,
          tollCost: 1000,
          driverAllowance: 1000,
          maintenanceCost: 500, // অন্যান্য খরচ ৫০০ টাকা
          maintenanceDetails: 'কেনার দাম: ৳২৫,০০,০০০ | ট্রিপের অন্যান্য খরচ: ৳৫০০ | গাড়ি সচল (Active)',
          tripRevenue: 25000,
          outstandingDue: 0,
          insuranceExpiry: '2027-08-30',
          fitnessExpiry: '2027-05-15',
          taxTokenExpiry: '2027-03-31',
          nextServiceDate: '2026-12-15',
          date: '2026-11-12',
          status: 'completed',
        },
        ownerId,
        actorEmail
      );

      onNotify(
        'উদাহরণের গাড়ি ও ট্রিপ রিপোর্ট TRUCK-001 (ঢাকা মেট্রো-ট-১২-৩৪৫৬, চালক: আব্দুল, রুট: ঢাকা → চট্টগ্রাম, ভাড়া: ৳২৫,০০০, মোট খরচ: ৳১০,৫০০, ট্রিপের লাভ: ৳১৪,৫০০) সফলভাবে লোড হয়েছে!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler A: Create New Trip & Vehicle Profile
  const handleCreateTripA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createTransportOpRecord(
        {
          tripOrVehicleCode: aVehicleCode,
          recordType: 'trip',
          businessId: activeBusiness.id,
          registrationNumber: aRegNo,
          vehicleType: `${aVehicleType} (দাম: ৳${aPurchasePriceInfo})`.slice(0, 60),
          driverName: aDriverName,
          origin: aOrigin,
          destination: aDestination,
          cargoDetails: aCargoDetails,
          customerName: aCustomerName,
          distanceKm: Number(aDistanceKm),
          fuelCost: Number(aDieselCost),
          tollCost: Number(aTollCost),
          driverAllowance: Number(aDriverAllowance),
          maintenanceCost: Number(aOtherTripCost),
          maintenanceDetails: `কেনার দাম: ৳${aPurchasePriceInfo} | অন্যান্য ট্রিপ খরচ: ৳${aOtherTripCost}`,
          tripRevenue: Number(aTripRevenue),
          outstandingDue: Number(aDueAmount),
          insuranceExpiry: bInsuranceExpiry,
          fitnessExpiry: bFitnessExpiry,
          taxTokenExpiry: bTaxTokenExpiry,
          nextServiceDate: bNextServiceDate,
          date: aTripDate,
          status: aTripStatus,
        },
        ownerId,
        actorEmail
      );

      const cashOrBank =
        accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];

      if (cashOrBank && revAcc && Number(aTripRevenue) > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `TRP-REV-${aVehicleCode}-${Date.now().toString().slice(-4)}`,
            date: aTripDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'sale',
            category: `ট্রাক ট্রিপ ভাড়া (${aVehicleCode})`,
            description: `${aVehicleCode} (${aRegNo}): ${aOrigin} → ${aDestination} | চালক: ${aDriverName} | পণ্য: ${aCargoDetails}`,
            debitAccountId: cashOrBank.id,
            debitAccountName: cashOrBank.name,
            creditAccountId: revAcc.id,
            creditAccountName: revAcc.name,
            amount: Number(aTripRevenue),
            paymentStatus: Number(aDueAmount) > 0 ? 'partial' : 'paid',
            dueAmount: Number(aDueAmount) || 0,
            counterpartyName: aCustomerName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      if (cashOrBank && expAcc && formTotalTripExpense > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `TRP-EXP-${aVehicleCode}-${Date.now().toString().slice(-4)}`,
            date: aTripDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'expense',
            category: `ট্রিপের ডিজেল, টোল ও ভাতা (${aVehicleCode})`,
            description: `${aVehicleCode}: ডিজেল ৳${aDieselCost}, টোল ৳${aTollCost}, চালকের ভাতা ৳${aDriverAllowance}, অন্যান্য ৳${aOtherTripCost}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: cashOrBank.id,
            creditAccountName: cashOrBank.name,
            amount: formTotalTripExpense,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: aDriverName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      onNotify(
        `${aVehicleCode} (${aOrigin} → ${aDestination}) ট্রিপ সেভ হয়েছে! ভাড়া: ${formatBDT(Number(aTripRevenue))}, মোট খরচ: ${formatBDT(formTotalTripExpense)}, ট্রিপের লাভ: ${formatBDT(formNetTripProfit)}।`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler B: Update Vehicle Maintenance, Downtime & Set Expiry Reminders
  const handleRecordMaintenanceB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOp) return;
    setIsSubmitting(true);
    try {
      const maintSummary = `ইঞ্জিন অয়েল: ${bEngineOilChange} | টায়ার: ${bTyreChange} | সার্ভিসিং: ${bServiceDetails} | বন্ধ ছিল: ${bDowntimeDays} দিন | ড্রাইভার বেতন: ৳${bDriverSalary}`.slice(
        0,
        240
      );
      const addedCost = Number(bMaintenanceCost) + Number(bDriverSalary);

      await updateTransportOpRecord(
        selectedOp,
        {
          maintenanceCost: selectedOp.maintenanceCost + Number(bMaintenanceCost),
          maintenanceDetails: maintSummary,
          fitnessExpiry: bFitnessExpiry,
          taxTokenExpiry: bTaxTokenExpiry,
          insuranceExpiry: bInsuranceExpiry,
          nextServiceDate: bNextServiceDate,
        },
        actorEmail
      );

      // Create Document & Servicing Reminder Notification
      await createNotificationRecord({
        title: `গাড়ির কাগজপত্র ও সার্ভিসিং রিমাইন্ডার: ${selectedOp.tripOrVehicleCode} (${selectedOp.registrationNumber})`.slice(
          0,
          140
        ),
        message: `ফিটনেস মেয়াদ: ${bFitnessExpiry} | ট্যাক্স টোকেন: ${bTaxTokenExpiry} | ইন্স্যুরেন্স: ${bInsuranceExpiry} | পরবর্তী সার্ভিসিং: ${bNextServiceDate} | বন্ধ ছিল: ${bDowntimeDays} দিন`.slice(
          0,
          400
        ),
        category: 'vehicle_doc',
        priority: 'high',
        businessId: activeBusiness.id,
      });

      const cashOrBank =
        accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];
      if (cashOrBank && expAcc && addedCost > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `MNT-${selectedOp.tripOrVehicleCode}-${Date.now().toString().slice(-4)}`,
            date: new Date().toISOString().split('T')[0],
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'expense',
            category: `গাড়ি মেরামত ও ড্রাইভার বেতন (${selectedOp.tripOrVehicleCode})`,
            description: maintSummary,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: cashOrBank.id,
            creditAccountName: cashOrBank.name,
            amount: addedCost,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: selectedOp.driverName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      onNotify(
        `${selectedOp.tripOrVehicleCode}-এর সার্ভিসিং, ড্রাইভার বেতন ও কাগজপত্রের মেয়াদ (ফিটনেস: ${bFitnessExpiry}, ট্যাক্স টোকেন: ${bTaxTokenExpiry}) রিমাইন্ডার সহ আপডেট হয়েছে!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Selected Trip Computed Profit
  const selDiesel = selectedOp?.fuelCost || 0;
  const selToll = selectedOp?.tollCost || 0;
  const selAllowance = selectedOp?.driverAllowance || 0;
  const selOtherMaint = selectedOp?.maintenanceCost || 0;
  const selTotalTripCost = selDiesel + selToll + selAllowance + selOtherMaint;
  const selTripRevenue = selectedOp?.tripRevenue || 0;
  const selTripProfit = selTripRevenue - selTotalTripCost;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          TOP VEHICLE ID & TRIP SELECTOR BAR
         ===================================================================== */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Truck className="h-4 w-4" />
              <span>Truck & Transport Business — Vehicle ID & Trip Profit System</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              প্রতিটি গাড়ির আলাদা প্রোফাইল (TRUCK-001), ট্রিপের আয়-ব্যয় রিপোর্ট ও মেইনটেন্যান্স রিমাইন্ডার
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              প্রতিটি ট্রিপের ভাড়া থেকে ডিজেল, টোল, চালকের ভাতা ও অন্যান্য খরচ বাদ দিয়ে প্রকৃত লাভ এবং ফিটনেস/ট্যাক্স টোকেন মেয়াদের অ্যালার্ট।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!ops.some((o) => o.tripOrVehicleCode === 'TRUCK-001') && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleLoadPromptTruckExample}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                উদাহরণ ট্রাক (TRUCK-001 ঢাকা → চট্টগ্রাম) লোড করুন
              </button>
            )}

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="TRUCK-001 বা চালকের নাম সার্চ..."
                className="pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Vehicle & Trip Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1">
            গাড়ি ও ট্রিপ নির্বাচন করুন:
          </span>
          {filteredOps.map((o) => {
            const isSelected = selectedOp?.id === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelectedOpId(o.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                }`}
              >
                <span className="font-mono font-bold">{o.tripOrVehicleCode}</span>
                <span>({o.origin} → {o.destination})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          3-STEP NAVIGATION TABS
         ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            id: 'PROFILE_OVERVIEW' as TransportSubTab,
            step: 'Profile & Report',
            titleBn: 'গাড়ির প্রোফাইল ও Trip Report কার্ড',
            titleEn: 'Vehicle Profile & Profit Card',
            icon: FileSpreadsheet,
          },
          {
            id: 'A_TRIP_MANAGEMENT' as TransportSubTab,
            step: 'A',
            titleBn: 'A. নতুন ট্রিপ ও ভাড়ার হিসাব',
            titleEn: 'Trip Management',
            icon: Route,
          },
          {
            id: 'B_MAINTENANCE_DOCS' as TransportSubTab,
            step: 'B',
            titleBn: 'B. সার্ভিসিং, ফিটনেস ও মেয়াদ রিমাইন্ডার',
            titleEn: 'Vehicle Maintenance & Docs',
            icon: Wrench,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                active
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {bn ? `ধাপ ${tab.step}` : `Step ${tab.step}`}
                </span>
                <Icon className="h-4 w-4 opacity-85" />
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">{bn ? tab.titleBn : tab.titleEn}</div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    active ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  {bn ? tab.titleEn : tab.titleBn}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: প্রতিটি ট্রাকের Profile ও Trip Report Card (যেমন TRUCK-001)
         ===================================================================== */}
      {activeSubTab === 'PROFILE_OVERVIEW' && selectedOp && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Exact Truck Profile Table as in User Prompt */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-600 uppercase">
                  Vehicle Digital Profile
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedOp.tripOrVehicleCode} — {selectedOp.registrationNumber}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                Active
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-2.5 px-4 w-2/5">{bn ? "বিষয় (Field)" : "Metric / Field"}</th>
                    <th className="py-2.5 px-4">{bn ? "তথ্য (Information)" : "Vehicle Records"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      {bn ? 'গাড়ির আইডি (Vehicle ID)' : 'Vehicle ID'}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {selectedOp.tripOrVehicleCode}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      Registration Number
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {selectedOp.registrationNumber}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      {bn ? 'গাড়ির ধরন ও কেনার দাম' : 'Vehicle Type & Purchase Price'}
                    </td>
                    <td className="py-2.5 px-4 font-semibold">{selectedOp.vehicleType}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      {bn ? 'চালক (Driver Name)' : 'Designated Driver'}
                    </td>
                    <td className="py-2.5 px-4 font-bold">{selectedOp.driverName}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      {bn ? 'ফিটনেস ও ট্যাক্স টোকেনের মেয়াদ' : 'Fitness & Tax Token Expiry'}
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      {bn ? 'ফিটনেস: ' : 'Fitness: '}{selectedOp.fitnessExpiry} | {bn ? 'ট্যাক্স টোকেন: ' : 'Tax Token: '}{selectedOp.taxTokenExpiry}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      {bn ? 'ইন্স্যুরেন্স ও পরবর্তী সার্ভিসিং' : 'Insurance & Next Servicing'}
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      {bn ? 'ইন্স্যুরেন্স: ' : 'Insurance: '}{selectedOp.insuranceExpiry} | {bn ? 'সার্ভিসিং: ' : 'Service: '}{selectedOp.nextServiceDate}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      {bn ? 'রক্ষণাবেক্ষণ নোট' : 'Maintenance & Status Notes'}
                    </td>
                    <td className="py-2.5 px-4">{selectedOp.maintenanceDetails}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Exact Trip Report Card (TRUCK-001 – Trip Report) as in User Prompt */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedOp.tripOrVehicleCode} – Trip Report
                </h3>
                <p className="text-xs text-slate-500">
                  {bn ? 'তারিখ: ' : 'Date: '}{selectedOp.date} · {bn ? 'পার্টি: ' : 'Client: '}{selectedOp.customerName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                  {selectedOp.status === 'completed' ? 'Completed' : selectedOp.status}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTripChallan(selectedOp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
                  title={bn ? 'কাজের অর্ডার ও ডেলিভারি চালান দেখুন' : 'View Work Order & Challan'}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{bn ? 'ভিউ চালান ও অর্ডার' : 'View Challan / PO'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">{bn ? "রুট (Route)" : "Freight Route"}</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedOp.origin} → {selectedOp.destination} ({selectedOp.distanceKm} {bn ? 'কি.মি.' : 'KM'})
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-[11px] text-slate-500">{bn ? "ট্রিপ ভাড়া (Trip Revenue)" : "Freight Revenue"}</div>
                <div className="text-base font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {formatBDT(selTripRevenue)}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-2.5 px-4">{bn ? "খরচ (Expense Head)" : "Trip Expense Head"}</th>
                    <th className="py-2.5 px-4 text-right">{bn ? "টাকা (BDT)" : "Amount (BDT)"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold">{bn ? "ডিজেল (Diesel / Fuel Cost)" : "Diesel Fuel Cost"}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(selDiesel)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold">{bn ? "টোল (Bridge & Highway Toll)" : "Bridge & Highway Tolls"}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(selToll)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold">{bn ? "চালকের ভাতা (Driver Allowance)" : "Driver & Helper Allowance"}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(selAllowance)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold">{bn ? "অন্যান্য ও রক্ষণাবেক্ষণ (Other)" : "Other Trip & Maintenance"}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(selOtherMaint)}
                    </td>
                  </tr>
                  <tr className="bg-amber-50/70 dark:bg-amber-950/20 font-bold">
                    <td className="py-2.5 px-4">{bn ? "মোট খরচ (Total Trip Expense)" : "Total Trip Operating Cost"}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-amber-700 dark:text-amber-400">
                      {formatBDT(selTotalTripCost)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-bold text-sm">
                    <td className="py-3 px-4">{bn ? "ট্রিপের লাভ (Net Trip Profit)" : "Net Trip Profit Margin"}</td>
                    <td
                      className={`py-3 px-4 text-right font-mono text-base ${
                        selTripProfit >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-600'
                      }`}
                    >
                      {formatBDT(selTripProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB A: Trip Management (নতুন ট্রিপ ও ভাড়ার হিসাব এন্ট্রি)
         ===================================================================== */}
      {activeSubTab === 'A_TRIP_MANAGEMENT' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 max-w-4xl space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />
            {bn ? 'A. নতুন ট্রিপ ও গাড়ির ভাড়ার হিসাব লিখুন (Trip Management)' : 'A. Record Highway Freight Trip & Revenue'}
          </h3>

          <form onSubmit={handleCreateTripA} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Vehicle / Trip ID *</label>
                <input
                  type="text"
                  required
                  value={aVehicleCode}
                  onChange={(e) => setAVehicleCode(e.target.value)}
                  placeholder="TRUCK-001"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Registration Number *</label>
                <input
                  type="text"
                  required
                  value={aRegNo}
                  onChange={(e) => setARegNo(e.target.value)}
                  placeholder="ঢাকা মেট্রো-ট-১২-৩৪৫৬"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'গাড়ির ধরন' : 'Vehicle Category / Body Type'}</label>
                <input
                  type="text"
                  value={aVehicleType}
                  onChange={(e) => setAVehicleType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'চালকের নাম (Driver) *' : 'Driver Name *'}</label>
                <input
                  type="text"
                  required
                  value={aDriverName}
                  onChange={(e) => setADriverName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">{bn ? 'ট্রিপের তারিখ' : 'Trip Date'}</label>
                <input
                  type="date"
                  value={aTripDate}
                  onChange={(e) => setATripDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'কোথা থেকে (Origin) *' : 'Origin *'}</label>
                <input
                  type="text"
                  required
                  value={aOrigin}
                  onChange={(e) => setAOrigin(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'কোথায় যাবে (Destination) *' : 'Destination *'}</label>
                <input
                  type="text"
                  required
                  value={aDestination}
                  onChange={(e) => setADestination(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'যাত্রার দূরত্ব (কি.মি.)' : 'Trip Distance (KM)'}</label>
                <input
                  type="number"
                  min={1}
                  placeholder="0"
                  value={aDistanceKm === 0 ? '' : aDistanceKm}
                  onChange={(e) => setADistanceKm(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">{bn ? 'কোন পণ্য বহন করছে? (Cargo)' : 'Cargo Description'}</label>
                <input
                  type="text"
                  value={aCargoDetails}
                  onChange={(e) => setACargoDetails(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'ক্রেতা / পার্টির নাম' : 'Freight Client / Shipper'}</label>
                <input
                  type="text"
                  value={aCustomerName}
                  onChange={(e) => setACustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'ট্রিপ শেষ হয়েছে কি না?' : 'Trip Completion Status'}</label>
                <select
                  value={aTripStatus}
                  onChange={(e) => setATripStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-bold"
                >
                  <option value="completed">{bn ? "হ্যাঁ — Completed (সম্পন্ন)" : "Completed"}</option>
                  <option value="active">{bn ? "চলমান (On Route / Active)" : "In Transit / Active"}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                  {bn ? 'ট্রিপ ভাড়া (৳) *' : 'Freight Revenue (৳) *'}
                </label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={aTripRevenue === 0 ? '' : aTripRevenue}
                  onChange={(e) => setATripRevenue(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'ডিজেল খরচ (৳)' : 'Diesel Fuel Cost (৳)'}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={aDieselCost === 0 ? '' : aDieselCost}
                  onChange={(e) => setADieselCost(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'টোল খরচ (৳)' : 'Highway & Bridge Toll (৳)'}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={aTollCost === 0 ? '' : aTollCost}
                  onChange={(e) => setATollCost(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'চালকের ভাতা (৳)' : 'Driver Allowance (৳)'}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={aDriverAllowance === 0 ? '' : aDriverAllowance}
                  onChange={(e) => setADriverAllowance(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'অন্যান্য খরচ (৳)' : 'Other Incidentals (৳)'}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={aOtherTripCost === 0 ? '' : aOtherTripCost}
                  onChange={(e) => setAOtherTripCost(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'বকেয়া (Due ৳)' : 'Freight Due (৳)'}</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={aDueAmount === 0 ? '' : aDueAmount}
                  onChange={(e) => setADueAmount(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[11px] text-slate-500">{bn ? "মোট ভাড়া" : "Freight Revenue"}</div>
                <div className="text-sm font-mono font-bold">{formatBDT(aTripRevenue)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">{bn ? "মোট খরচ" : "Total Trip Expense"}</div>
                <div className="text-sm font-mono font-bold text-amber-600">
                  {formatBDT(formTotalTripExpense)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">{bn ? "ট্রিপের নিট লাভ" : "Net Margin"}</div>
                <div className="text-base font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {formatBDT(formNetTripProfit)}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
            >
              {bn ? '+ নতুন ট্রিপ ও লাভ-ক্ষতি সেভ করুন' : '+ Save Freight Trip & Ledger Entry'}
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB B: Vehicle Maintenance & Expiry Reminder (ইঞ্জিন অয়েল, টায়ার, ফিটনেস, ট্যাক্স টোকেন)
         ===================================================================== */}
      {activeSubTab === 'B_MAINTENANCE_DOCS' && selectedOp && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 max-w-4xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-emerald-600" />
                {bn ? `B. গাড়ির সার্ভিসিং, রক্ষণাবেক্ষণ ও কাগজপত্রের মেয়াদ রিমাইন্ডার (${selectedOp.tripOrVehicleCode})` : `B. Vehicle Maintenance, Servicing & Document Reminders (${selectedOp.tripOrVehicleCode})`}
              </h3>
              <p className="text-xs text-slate-500">
                ইঞ্জিন অয়েল, টায়ার, মেরামত খরচ, ড্রাইভারের বেতন, গাড়ি কতদিন বন্ধ ছিল এবং ফিটনেস/ট্যাক্স টোকেন/ইন্স্যুরেন্স মেয়াদের রিমাইন্ডার।
              </p>
            </div>
            <Bell className="h-5 w-5 text-amber-500" />
          </div>

          <form onSubmit={handleRecordMaintenanceB} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">{bn ? '১. ইঞ্জিন অয়েল পরিবর্তন' : '1. Engine Oil Change'}</label>
                <input
                  type="text"
                  value={bEngineOilChange}
                  onChange={(e) => setBEngineOilChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? '২. টায়ার পরিবর্তন / চেকআপ' : '2. Tyre Replacement / Inspection'}</label>
                <input
                  type="text"
                  value={bTyreChange}
                  onChange={(e) => setBTyreChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? '৩. গাড়ির সার্ভিসিং বিবরণ' : '3. Workshop Service Details'}</label>
                <input
                  type="text"
                  value={bServiceDetails}
                  onChange={(e) => setBServiceDetails(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">{bn ? '৪. মেরামতের খরচ (Maintenance ৳)' : '4. Maintenance Cost (৳)'}</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={bMaintenanceCost === 0 ? '' : bMaintenanceCost}
                  onChange={(e) => setBMaintenanceCost(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? '৮. ড্রাইভারের মাসিক বেতন (৳)' : '8. Driver Monthly Salary (৳)'}</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={bDriverSalary === 0 ? '' : bDriverSalary}
                  onChange={(e) => setBDriverSalary(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-red-600">
                  {bn ? '৯. গাড়ি কতদিন বন্ধ ছিল? (Downtime Days)' : '9. Fleet Downtime (Days)'}
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={bDowntimeDays === 0 ? '' : bDowntimeDays}
                  onChange={(e) => setBDowntimeDays(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-amber-600">
                  {bn ? '৫. ফিটনেসের মেয়াদ (Fitness Expiry)' : '5. BRTA Fitness Certificate Expiry'}
                </label>
                <input
                  type="date"
                  value={bFitnessExpiry}
                  onChange={(e) => setBFitnessExpiry(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-amber-50/30 dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-amber-600">
                  {bn ? '৬. ট্যাক্স টোকেনের মেয়াদ (Tax Token)' : '6. Tax Token Expiry Date'}
                </label>
                <input
                  type="date"
                  value={bTaxTokenExpiry}
                  onChange={(e) => setBTaxTokenExpiry(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-amber-50/30 dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-amber-600">
                  {bn ? '৭. ইন্স্যুরেন্সের মেয়াদ (Insurance)' : '7. Commercial Insurance Expiry'}
                </label>
                <input
                  type="date"
                  value={bInsuranceExpiry}
                  onChange={(e) => setBInsuranceExpiry(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-amber-50/30 dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{bn ? 'পরবর্তী সার্ভিসিং তারিখ' : 'Next Workshop Scheduled Service'}</label>
                <input
                  type="date"
                  value={bNextServiceDate}
                  onChange={(e) => setBNextServiceDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
            >
              + রক্ষণাবেক্ষণ খরচ ও মেয়াদ শেষ হওয়ার Reminder সেভ করুন
            </button>
          </form>
        </div>
      )}

      {/* Trip Challan & Work Order Modal */}
      <TripChallanModal
        isOpen={Boolean(selectedTripChallan)}
        onClose={() => setSelectedTripChallan(null)}
        trip={selectedTripChallan}
        businessName={activeBusiness.nameBn || activeBusiness.name}
        lang={lang}
      />
    </div>
  );
}
