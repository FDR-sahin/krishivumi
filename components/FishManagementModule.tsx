'use client';

import React, { useState, useMemo } from 'react';
import {
  Fish,
  Search,
  Plus,
  Waves,
  Droplets,
  Package,
  Scale,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ErpBusiness,
  ErpFishCycle,
  ErpInventoryItem,
  ErpJournalEntry,
  ErpAccount,
  ErpAuditLog,
  formatBDT,
} from '@/lib/erp-types';
import {
  createFishCycleRecord,
  updateFishCycleRecord,
  recordStockMovement,
  postDoubleEntryTransaction,
  logAuditEvent,
} from '@/lib/erp-service';

interface FishManagementModuleProps {
  activeBusiness: ErpBusiness;
  cycles: ErpFishCycle[];
  inventoryItems: ErpInventoryItem[];
  journalEntries: ErpJournalEntry[];
  accounts: ErpAccount[];
  auditLogs: ErpAuditLog[];
  ownerId: string;
  actorEmail: string;
  onNotify: (msg: string) => void;
}

type FishSubTab =
  | 'A_POND_PROFILE'
  | 'B_FINGERLING'
  | 'C_FEED_WATER'
  | 'D_HARVEST_SALES';

export default function FishManagementModule({
  activeBusiness,
  cycles,
  inventoryItems,
  accounts,
  auditLogs,
  ownerId,
  actorEmail,
  onNotify,
}: FishManagementModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<FishSubTab>('A_POND_PROFILE');
  const [pondSearch, setPondSearch] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState<string>(cycles[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCycles = useMemo(() => {
    const q = pondSearch.trim().toLowerCase();
    if (!q) return cycles;
    return cycles.filter(
      (c) =>
        c.pondId.toLowerCase().includes(q) ||
        c.pondName.toLowerCase().includes(q) ||
        c.cycleCode.toLowerCase().includes(q) ||
        c.fishSpecies.toLowerCase().includes(q)
    );
  }, [cycles, pondSearch]);

  const selectedCycle = useMemo(() => {
    return (
      cycles.find((c) => c.id === selectedCycleId) ||
      filteredCycles[0] ||
      cycles[0] ||
      null
    );
  }, [cycles, filteredCycles, selectedCycleId]);

  const fishFeedInventory = useMemo(
    () =>
      inventoryItems.filter(
        (i) =>
          i.category === 'feed' &&
          (i.businessId === activeBusiness.id ||
            i.businessName.toLowerCase().includes('fish'))
      ),
    [inventoryItems, activeBusiness.id]
  );

  // ============================================================================
  // B. মাছের পোনা কেনা ও নতুন Production Cycle (Fingerling Stocking State)
  // ============================================================================
  const [bPondId, setBPondId] = useState('POND-001');
  const [bPondName, setBPondName] = useState('পুকুর নং-০১ (রুই-কাতলা মিশ্র চাষ)');
  const [bCycleCode, setBCycleCode] = useState(`CYC-POND001-${cycles.length + 1}`);
  const [bAreaDecimals, setBAreaDecimals] = useState(50);
  const [bDepthFeet, setBDepthFeet] = useState(6);
  const [bSpecies, setBSpecies] = useState('রুই, কাতলা ও তেলাপিয়া');
  const [bFingerlingQty, setBFingerlingQty] = useState(5000);
  const [bPricePerPiece, setBPricePerPiece] = useState(5);
  const [bSupplier, setBSupplier] = useState('ত্রিশাল আদর্শ মৎস্য হ্যাচারি');
  const [bStockingDate, setBStockingDate] = useState('2026-11-12');

  const totalFingerlingInvestment = Number(bFingerlingQty) * Number(bPricePerPiece);

  // ============================================================================
  // C. মাছের খাবার, ওষুধ, পানির গুণাগুণ (pH/DO), মৃত্যু ও শ্রমিকের খরচ
  // ============================================================================
  const [cDate, setCDate] = useState(new Date().toISOString().split('T')[0]);
  const [cFeedKg, setCFeedKg] = useState(50);
  const [cFeedRatePerKg, setCFeedRatePerKg] = useState(72);
  const [cSelectedFeedInvId, setCSelectedFeedInvId] = useState('');
  const [cWaterPh, setCWaterPh] = useState('7.6');
  const [cWaterDo, setCWaterDo] = useState('6.5');
  const [cWaterTemp, setCWaterTemp] = useState('28');
  const [cMortalityToday, setCMortalityToday] = useState(5);
  const [cWaterTreatmentName, setCWaterTreatmentName] = useState(
    'চুন (Lime), জিওলাইট ও অক্সিজেন ট্যাবলেট'
  );
  const [cTreatmentCost, setCTreatmentCost] = useState(2500);
  const [cPondCleaningCost, setCPondCleaningCost] = useState(1500);
  const [cLabourCost, setCLabourCost] = useState(2000);

  const dailyFeedCost = Math.round(Number(cFeedKg) * Number(cFeedRatePerKg));

  // ============================================================================
  // D. প্রজাতি অনুযায়ী মাছ বিক্রি (Multi-Species Harvest & Sales Calculator)
  // ============================================================================
  const [dHarvestDate, setDHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [dBuyerName, setDBuyerName] = useState('ময়মনসিংহ মৎস্য আড়তদার সমিতি');
  const [dPaymentMethod, setDPaymentMethod] = useState<'Cash' | 'Bank' | 'Mobile Payment'>('Cash');
  const [dDueAmount, setDDueAmount] = useState(0);

  // Exact example from user prompt: রুই ৩০০ কেজি @৳২৮০, কাতলা ২০০ কেজি @৳৩২০, তেলাপিয়া ১০০ কেজি @৳১৮০
  const [ruiKg, setRuiKg] = useState(300);
  const [ruiPrice, setRuiPrice] = useState(280);

  const [katlaKg, setKatlaKg] = useState(200);
  const [katlaPrice, setKatlaPrice] = useState(320);

  const [tilapiaKg, setTilapiaKg] = useState(100);
  const [tilapiaPrice, setTilapiaPrice] = useState(180);

  const [otherSpeciesName, setOtherSpeciesName] = useState('পাবদা / কার্প');
  const [otherKg, setOtherKg] = useState(0);
  const [otherPrice, setOtherPrice] = useState(350);

  const ruiTotal = Number(ruiKg) * Number(ruiPrice);
  const katlaTotal = Number(katlaKg) * Number(katlaPrice);
  const tilapiaTotal = Number(tilapiaKg) * Number(tilapiaPrice);
  const otherTotal = Number(otherKg) * Number(otherPrice);

  const totalHarvestKg =
    Number(ruiKg) + Number(katlaKg) + Number(tilapiaKg) + Number(otherKg);
  const totalHarvestRevenue = ruiTotal + katlaTotal + tilapiaTotal + otherTotal;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // 1-Click Load User's Exact Prompt Example: POND-001, POND-002, POND-003
  const handleLoadPromptPondExample = async () => {
    setIsSubmitting(true);
    try {
      await createFishCycleRecord(
        {
          cycleCode: 'CYC-POND001-2026',
          pondId: 'POND-001',
          pondName: 'পুকুর নং-০১ (প্রধান রুই-কাতলা পুকুর)',
          businessId: activeBusiness.id,
          areaDecimals: 50,
          depthFeet: 6,
          location: activeBusiness.location,
          waterQualityNotes: 'pH: 7.6 | DO (অক্সিজেন): 6.5 mg/L | তাপমাত্রা: 28°C | পানির মান উত্তম',
          fishSpecies: 'রুই, কাতলা ও তেলাপিয়া',
          stockingDate: '2026-11-12',
          initialQuantity: 5000,
          mortalityCount: 45,
          fingerlingCost: 25000,
          feedCost: 52000,
          medicineAndLimeCost: 8000,
          labourCost: 15000,
          harvestDate: '2026-11-12',
          harvestWeightKg: 600,
          totalSalesRevenue: 166000, // রুই 84,000 + কাতলা 64,000 + তেলাপিয়া 18,000 = 1,66,000
          status: 'active',
        },
        ownerId,
        actorEmail
      );

      onNotify(
        'উদাহরণের পুকুর POND-001 (আয়তন ৫০ শতাংশ, গভীরতা ৬ ফুট, রুই-কাতলা ৫,০০০ পোনা, রুই ৩০০ কেজি + কাতলা ২০০ কেজি + তেলাপিয়া ১০০ কেজি = ৬০০ কেজি বিক্রি, মোট আয় ৳১,৬৬,০০০) সফলভাবে লোড হয়েছে!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler B: Buy Fingerlings & Start New Production Cycle in Pond
  const handleCreateCycleB = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createFishCycleRecord(
        {
          cycleCode: bCycleCode,
          pondId: bPondId,
          pondName: bPondName,
          businessId: activeBusiness.id,
          areaDecimals: Number(bAreaDecimals),
          depthFeet: Number(bDepthFeet),
          location: activeBusiness.location,
          waterQualityNotes: 'pH: 7.5 | অক্সিজেন (DO): 6.5 mg/L | নতুন পোনা ছাড়ার উপযুক্ত',
          fishSpecies: bSpecies,
          stockingDate: bStockingDate,
          initialQuantity: Number(bFingerlingQty),
          mortalityCount: 0,
          fingerlingCost: totalFingerlingInvestment,
          feedCost: 0,
          medicineAndLimeCost: 0,
          labourCost: 0,
          harvestDate: 'চলমান (Active Cycle)',
          harvestWeightKg: 0,
          totalSalesRevenue: 0,
          status: 'active',
        },
        ownerId,
        actorEmail
      );

      const cashOrBank =
        accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];
      if (cashOrBank && expAcc && totalFingerlingInvestment > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `FNG-${bPondId}-${Date.now().toString().slice(-4)}`,
            date: bStockingDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'purchase',
            category: `মাছের পোনা ক্রয় (${bPondId} - ${bCycleCode})`,
            description: `${bPondId} (${bPondName}): ${bFingerlingQty}টি ${bSpecies} পোনা @ ৳${bPricePerPiece} | সাপ্লায়ার: ${bSupplier}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: cashOrBank.id,
            creditAccountName: cashOrBank.name,
            amount: totalFingerlingInvestment,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: bSupplier,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      onNotify(
        `${bPondId}-এ নতুন Production Cycle (${bCycleCode}: ${bFingerlingQty}টি পোনা, বিনিয়োগ ${formatBDT(totalFingerlingInvestment)}) চালু হয়েছে!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler C: Feed, Medicine, Water Quality (pH/DO), Mortality & Labour
  const handleRecordFeedAndWaterC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCycle) return;
    setIsSubmitting(true);
    try {
      const waterQualityStr = `pH: ${cWaterPh} | DO (অক্সিজেন): ${cWaterDo} mg/L | তাপমাত্রা: ${cWaterTemp}°C | চিকিৎসা: ${cWaterTreatmentName}`.slice(
        0,
        200
      );
      const addedMedAndCleaning = Number(cTreatmentCost) + Number(cPondCleaningCost);

      await updateFishCycleRecord(
        selectedCycle,
        {
          waterQualityNotes: waterQualityStr,
          mortalityCount: selectedCycle.mortalityCount + Number(cMortalityToday),
          feedCost: selectedCycle.feedCost + dailyFeedCost,
          medicineAndLimeCost: selectedCycle.medicineAndLimeCost + addedMedAndCleaning,
          labourCost: selectedCycle.labourCost + Number(cLabourCost),
        },
        actorEmail
      );

      const feedInv = fishFeedInventory.find((i) => i.id === cSelectedFeedInvId);
      if (feedInv && Number(cFeedKg) > 0) {
        await recordStockMovement(
          feedInv,
          'consumption',
          Number(cFeedKg),
          feedInv.warehouse,
          `${selectedCycle.pondId} (${selectedCycle.cycleCode})`,
          `${cDate} তারিখে ${selectedCycle.pondId}-এ ${cFeedKg} কেজি খাবার প্রদান`,
          actorEmail
        );
      }

      const totalDayExpense = dailyFeedCost + addedMedAndCleaning + Number(cLabourCost);
      const cashOrBank =
        accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];
      if (cashOrBank && expAcc && totalDayExpense > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `PND-EXP-${Date.now().toString().slice(-4)}`,
            date: cDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'expense',
            category: `পুকুরের খাবার, ওষুধ ও পরিচর্যা (${selectedCycle.pondId})`,
            description: `${selectedCycle.pondId}: খাবার ${cFeedKg}kg (৳${dailyFeedCost}), পানি চিকিৎসা ও পরিষ্কার (৳${addedMedAndCleaning}), শ্রমিক (৳${cLabourCost}) | pH:${cWaterPh}, DO:${cWaterDo}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: cashOrBank.id,
            creditAccountName: cashOrBank.name,
            amount: totalDayExpense,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: 'খামার পুকুর ব্যবস্থাপনা',
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      onNotify(
        `${selectedCycle.pondId}-এ খাবার (${cFeedKg} কেজি), পানির মান (pH ${cWaterPh}, DO ${cWaterDo}) এবং পরিচর্যা খরচ (${formatBDT(totalDayExpense)}) আপডেট হয়েছে!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler D: Multi-Species Fish Harvest & Sales
  const handleRecordHarvestSaleD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCycle) return;
    setIsSubmitting(true);
    try {
      const newTotalKg = selectedCycle.harvestWeightKg + totalHarvestKg;
      const newTotalRev = selectedCycle.totalSalesRevenue + totalHarvestRevenue;

      await updateFishCycleRecord(
        selectedCycle,
        {
          harvestDate: dHarvestDate,
          harvestWeightKg: newTotalKg,
          totalSalesRevenue: newTotalRev,
        },
        actorEmail
      );

      const breakdownDesc = `রুই: ${ruiKg}kg@৳${ruiPrice} (৳${ruiTotal}) | কাতলা: ${katlaKg}kg@৳${katlaPrice} (৳${katlaTotal}) | তেলাপিয়া: ${tilapiaKg}kg@৳${tilapiaPrice} (৳${tilapiaTotal})${
        otherKg > 0 ? ` | ${otherSpeciesName}: ${otherKg}kg@৳${otherPrice}` : ''
      }`;

      const cashOrBank =
        accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
      if (cashOrBank && revAcc && totalHarvestRevenue > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `FSH-SL-${selectedCycle.pondId}-${Date.now().toString().slice(-4)}`,
            date: dHarvestDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'sale',
            category: `পুকুরের মাছ বিক্রি (${selectedCycle.pondId})`,
            description: `${selectedCycle.pondId} (${selectedCycle.cycleCode}): মোট ${totalHarvestKg} কেজি মাছ বিক্রি | ${breakdownDesc}`,
            debitAccountId: cashOrBank.id,
            debitAccountName: cashOrBank.name,
            creditAccountId: revAcc.id,
            creditAccountName: revAcc.name,
            amount: totalHarvestRevenue,
            paymentStatus: Number(dDueAmount) > 0 ? 'partial' : 'paid',
            dueAmount: Number(dDueAmount) || 0,
            counterpartyName: dBuyerName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      await logAuditEvent({
        action: 'FISH_HARVEST_SALE',
        module: 'Fish Management',
        businessId: activeBusiness.id,
        details: `[${selectedCycle.pondId} | ${selectedCycle.cycleCode}] তারিখ: ${dHarvestDate} | ${breakdownDesc} | মোট ওজন: ${totalHarvestKg} কেজি | মোট বিক্রয়মূল্য: ৳${totalHarvestRevenue}`,
        severity: 'info',
        actorEmail,
        ownerId,
      });

      onNotify(
        `${selectedCycle.pondId} থেকে মোট ${totalHarvestKg} কেজি মাছ ${formatBDT(totalHarvestRevenue)}-এ বিক্রি সম্পন্ন হয়েছে!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Selected Pond Financial Metrics
  const pondFingerlingCost = selectedCycle?.fingerlingCost || 0;
  const pondFeedCost = selectedCycle?.feedCost || 0;
  const pondMedCost = selectedCycle?.medicineAndLimeCost || 0;
  const pondLabourCost = selectedCycle?.labourCost || 0;
  const pondTotalInvestment =
    pondFingerlingCost + pondFeedCost + pondMedCost + pondLabourCost;
  const pondTotalRevenue = selectedCycle?.totalSalesRevenue || 0;
  const pondNetProfit = pondTotalRevenue - pondTotalInvestment;
  const pondAliveFish = selectedCycle
    ? Math.max(0, selectedCycle.initialQuantity - selectedCycle.mortalityCount)
    : 0;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          TOP POND & PRODUCTION CYCLE SELECTOR BAR
         ===================================================================== */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Fish className="h-4 w-4" />
              <span>Fish Farming — Pond & Production Cycle System (A to D)</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              পুকুরভিত্তিক (POND-001, POND-002, POND-003) পোনা ছাড়া, খাবার, পানির মান ও মাছ বিক্রির লাভ-ক্ষতি
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              একই পুকুরে নতুন করে মাছ ছাড়লে নতুন Production Cycle তৈরি হবে এবং প্রতিটি পুকুরের আলাদা হিসাব থাকবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!cycles.some((c) => c.pondId === 'POND-001') && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleLoadPromptPondExample}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                উদাহরণ পুকুর (POND-001) লোড করুন
              </button>
            )}

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pondSearch}
                onChange={(e) => setPondSearch(e.target.value)}
                placeholder="POND-001 বা মাছের নাম সার্চ..."
                className="pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Pond Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1">
            পুকুর ও সাইকেল নির্বাচন করুন:
          </span>
          {filteredCycles.map((c) => {
            const isSelected = selectedCycle?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCycleId(c.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                }`}
              >
                <span className="font-mono font-bold">{c.pondId}</span>
                <span>({c.pondName})</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {c.areaDecimals} শতক
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          4-STEP NAVIGATION TABS (A to D)
         ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            id: 'A_POND_PROFILE' as FishSubTab,
            step: 'A',
            titleBn: 'Pond Profile ও সারসংক্ষেপ',
            titleEn: 'Pond Profile & Status',
            icon: Waves,
          },
          {
            id: 'B_FINGERLING' as FishSubTab,
            step: 'B',
            titleBn: 'মাছের পোনা কেনা ও নতুন সাইকেল',
            titleEn: 'Fingerling & New Cycle',
            icon: Fish,
          },
          {
            id: 'C_FEED_WATER' as FishSubTab,
            step: 'C',
            titleBn: 'খাবার, ওষুধ ও পানির মান (pH/DO)',
            titleEn: 'Feed, Medicine & Water',
            icon: Droplets,
          },
          {
            id: 'D_HARVEST_SALES' as FishSubTab,
            step: 'D',
            titleBn: 'মাছ বিক্রি ও পুকুরের লাভ-ক্ষতি',
            titleEn: 'Species Sales & Profit',
            icon: Scale,
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
                  ধাপ {tab.step}
                </span>
                <Icon className="h-4 w-4 opacity-85" />
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">{tab.titleBn}</div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    active ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  {tab.titleEn}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB A: Pond Profile (যেমন POND-001 প্রোফাইল ও আর্থিক অবস্থা)
         ===================================================================== */}
      {activeSubTab === 'A_POND_PROFILE' && selectedCycle && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Exact Pond Profile Table as in User Prompt */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-600 uppercase">
                  A. Pond Profile
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedCycle.pondId} — {selectedCycle.pondName}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                {selectedCycle.status === 'active' ? 'Active (চলমান)' : selectedCycle.status}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-2.5 px-4 w-2/5">বিষয় (Field)</th>
                    <th className="py-2.5 px-4">তথ্য (Information)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      Pond ID (পুকুর আইডি)
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {selectedCycle.pondId} (Cycle: {selectedCycle.cycleCode})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      আয়তন (Pond Area)
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold">
                      {selectedCycle.areaDecimals} শতাংশ (Decimals)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      পানির গভীরতা (Water Depth)
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold">
                      {selectedCycle.depthFeet} ফুট
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      মাছের ধরন (Fish Species)
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {selectedCycle.fishSpecies}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      চাষ শুরুর তারিখ (Stocking Date)
                    </td>
                    <td className="py-2.5 px-4 font-mono">{selectedCycle.stockingDate}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      পোনা সংখ্যা ও বর্তমান জীবিত মাছ
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold">
                      পোনা ছাড়া: {selectedCycle.initialQuantity.toLocaleString()} টি | মৃত:{' '}
                      {selectedCycle.mortalityCount} টি | জীবিত: {pondAliveFish.toLocaleString()} টি
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      পানির গুণগত মান (pH & Oxygen)
                    </td>
                    <td className="py-2.5 px-4 font-mono text-emerald-700 dark:text-emerald-400">
                      {selectedCycle.waterQualityNotes}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      বর্তমান অবস্থা (Current Status)
                    </td>
                    <td className="py-2.5 px-4 font-bold text-emerald-700 dark:text-emerald-400">
                      {selectedCycle.status.toUpperCase()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Selected Pond Financial Summary Card */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              {selectedCycle.pondId} — পুকুরের মোট বিনিয়োগ, বিক্রি ও লাভ-ক্ষতি
            </h3>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-2.5 px-4">খাত (Category)</th>
                    <th className="py-2.5 px-4 text-right">টাকা (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 px-4">১. মাছের পোনা ক্রয় (Fingerling Investment)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(pondFingerlingCost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">২. মাছের খাবার খরচ (Floating/Pellet Feed)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(pondFeedCost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">
                      ৩. পানির চিকিৎসা, চুন, ওষুধ ও পুকুর পরিষ্কার খরচ
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(pondMedCost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">৪. শ্রমিক ও পরিচর্যা খরচ (Labour Cost)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(pondLabourCost)}
                    </td>
                  </tr>
                  <tr className="bg-amber-50/70 dark:bg-amber-950/20 font-bold">
                    <td className="py-2.5 px-4">মোট বিনিয়োগ / খরচ (Total Pond Cost)</td>
                    <td className="py-2.5 px-4 text-right font-mono text-amber-700 dark:text-amber-400">
                      {formatBDT(pondTotalInvestment)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold">
                      মোট মাছ বিক্রি ({selectedCycle.harvestWeightKg.toLocaleString()} কেজি)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {formatBDT(pondTotalRevenue)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-bold text-sm">
                    <td className="py-3 px-4">পুকুরের নিট লাভ (Pond Net Profit)</td>
                    <td
                      className={`py-3 px-4 text-right font-mono text-base ${
                        pondNetProfit >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-600'
                      }`}
                    >
                      {formatBDT(pondNetProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB B: মাছের পোনা কেনা ও নতুন Production Cycle শুরু করা
         ===================================================================== */}
      {activeSubTab === 'B_FINGERLING' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 max-w-3xl">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />
            B. মাছের পোনা কেনা ও পুকুরে নতুন Production Cycle শুরু করুন
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            কোন মাছের পোনা কিনলেন, কতটি কিনলেন, প্রতি পোনার দাম, সাপ্লায়ার ও কোন পুকুরে ছাড়লেন তা লিখলে স্বয়ংক্রিয়ভাবে মোট বিনিয়োগ হিসাব হবে।
          </p>

          <form onSubmit={handleCreateCycleB} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold mb-1">কোন পুকুরে ছাড়লেন? (Pond ID) *</label>
                <input
                  type="text"
                  required
                  value={bPondId}
                  onChange={(e) => setBPondId(e.target.value)}
                  placeholder="POND-001 / POND-002"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">পুকুরের নাম (Pond Name) *</label>
                <input
                  type="text"
                  required
                  value={bPondName}
                  onChange={(e) => setBPondName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Production Cycle কোড *</label>
                <input
                  type="text"
                  required
                  value={bCycleCode}
                  onChange={(e) => setBCycleCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold mb-1">পুকুরের আয়তন (শতাংশ)</label>
                <input
                  type="number"
                  min={1}
                  value={bAreaDecimals}
                  onChange={(e) => setBAreaDecimals(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">পানির গভীরতা (ফুট)</label>
                <input
                  type="number"
                  step="0.5"
                  value={bDepthFeet}
                  onChange={(e) => setBDepthFeet(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">পোনা ছাড়ার তারিখ</label>
                <input
                  type="date"
                  value={bStockingDate}
                  onChange={(e) => setBStockingDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold mb-1">
                  কোন মাছের পোনা কিনলেন? (Fish Species) *
                </label>
                <input
                  type="text"
                  required
                  value={bSpecies}
                  onChange={(e) => setBSpecies(e.target.value)}
                  placeholder="রুই, কাতলা, তেলাপিয়া, পাবদা..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">সাপ্লায়ার / হ্যাচারি (Supplier)</label>
                <input
                  type="text"
                  value={bSupplier}
                  onChange={(e) => setBSupplier(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold mb-1">পোনা সংখ্যা (কতটি কিনলেন) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={bFingerlingQty}
                  onChange={(e) => setBFingerlingQty(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">প্রতি পোনার দাম (৳) *</label>
                <input
                  type="number"
                  step="0.5"
                  min={0.1}
                  value={bPricePerPiece}
                  onChange={(e) => setBPricePerPiece(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                  মোট বিনিয়োগ (Auto Total)
                </label>
                <div className="w-full rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  {formatBDT(totalFingerlingInvestment)}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
            >
              + পোনা ক্রয় ও নতুন Production Cycle সেভ করুন
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB C: মাছের খাবার, ওষুধ, পানির মান (pH/Oxygen), মৃত্যু ও শ্রমিকের খরচ
         ===================================================================== */}
      {activeSubTab === 'C_FEED_WATER' && selectedCycle && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 max-w-4xl space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-emerald-600" />
            C. মাছের খাবার, পানির গুণাগুণ (pH ও অক্সিজেন), চিকিৎসা ও শ্রমিকের খরচ ({selectedCycle.pondId})
          </h3>

          <form onSubmit={handleRecordFeedAndWaterC} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">তারিখ</label>
                <input
                  type="date"
                  value={cDate}
                  onChange={(e) => setCDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">কত কেজি খাবার দেওয়া হয়েছে?</label>
                <input
                  type="number"
                  min={0}
                  value={cFeedKg}
                  onChange={(e) => setCFeedKg(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">প্রতি কেজি খাবারের দাম (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={cFeedRatePerKg}
                  onChange={(e) => setCFeedRatePerKg(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">আজকের খাবারের মোট দাম</label>
                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono font-bold">
                  {formatBDT(dailyFeedCost)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                  পানির pH মান
                </label>
                <input
                  type="text"
                  value={cWaterPh}
                  onChange={(e) => setCWaterPh(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                  অক্সিজেন (DO mg/L)
                </label>
                <input
                  type="text"
                  value={cWaterDo}
                  onChange={(e) => setCWaterDo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">পানির তাপমাত্রা (°C)</label>
                <input
                  type="text"
                  value={cWaterTemp}
                  onChange={(e) => setCWaterTemp(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-red-600">
                  মাছের মৃত্যুর সংখ্যা (টি)
                </label>
                <input
                  type="number"
                  min={0}
                  value={cMortalityToday}
                  onChange={(e) => setCMortalityToday(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">পানির চিকিৎসা (চুন/জিওলাইট/ওষুধ)</label>
                <input
                  type="text"
                  value={cWaterTreatmentName}
                  onChange={(e) => setCWaterTreatmentName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">পানির চিকিৎসা খরচ (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={cTreatmentCost}
                  onChange={(e) => setCTreatmentCost(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">পুকুর পরিষ্কারের খরচ (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={cPondCleaningCost}
                  onChange={(e) => setCPondCleaningCost(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">শ্রমিকের খরচ (Labour ৳)</label>
                <input
                  type="number"
                  min={0}
                  value={cLabourCost}
                  onChange={(e) => setCLabourCost(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
            >
              + পুকুরের খাবার, পানির মান (pH/DO) ও খরচ সেভ করুন
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB D: মাছ বিক্রি (রুই, কাতলা, তেলাপিয়া প্রজাতি অনুযায়ী হিসাব)
         ===================================================================== */}
      {activeSubTab === 'D_HARVEST_SALES' && selectedCycle && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scale className="h-4 w-4 text-emerald-600" />
              D. পুকুর থেকে মাছ বিক্রি ({selectedCycle.pondId} — প্রজাতি অনুযায়ী ওজন ও দর)
            </h3>
            <p className="text-xs text-slate-500">
              ধরুন, {selectedCycle.pondId} থেকে রুই, কাতলা ও তেলাপিয়া তুললেন। প্রতিটি মাছের পরিমাণ ও প্রতি কেজির দাম দিলে সিস্টেম মোট বিক্রয়মূল্য ও পুকুরের লাভ হিসাব করবে।
            </p>

            <form onSubmit={handleRecordHarvestSaleD} className="space-y-4 text-xs">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                      <th className="py-2.5 px-3">মাছের ধরন (Fish Type)</th>
                      <th className="py-2.5 px-3">পরিমাণ (কেজি)</th>
                      <th className="py-2.5 px-3">প্রতি কেজি দাম (৳)</th>
                      <th className="py-2.5 px-3 text-right">মোট বিক্রয়মূল্য (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="py-2.5 px-3 font-bold">রুই (Rui)</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          value={ruiKg}
                          onChange={(e) => setRuiKg(Number(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          value={ruiPrice}
                          onChange={(e) => setRuiPrice(Number(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatBDT(ruiTotal)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">কাতলা (Katla)</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          value={katlaKg}
                          onChange={(e) => setKatlaKg(Number(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          value={katlaPrice}
                          onChange={(e) => setKatlaPrice(Number(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatBDT(katlaTotal)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">তেলাপিয়া (Tilapia)</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          value={tilapiaKg}
                          onChange={(e) => setTilapiaKg(Number(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          value={tilapiaPrice}
                          onChange={(e) => setTilapiaPrice(Number(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatBDT(tilapiaTotal)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={otherSpeciesName}
                          onChange={(e) => setOtherSpeciesName(e.target.value)}
                          className="w-32 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          value={otherKg}
                          onChange={(e) => setOtherKg(Number(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          value={otherPrice}
                          onChange={(e) => setOtherPrice(Number(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatBDT(otherTotal)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-bold text-sm">
                      <td className="py-3 px-3">সর্বমোট বিক্রি (Total Harvest)</td>
                      <td className="py-3 px-3 font-mono">{totalHarvestKg} কেজি</td>
                      <td className="py-3 px-3 font-mono">
                        গড় দর:{' '}
                        {totalHarvestKg > 0
                          ? formatBDT(Math.round(totalHarvestRevenue / totalHarvestKg))
                          : '৳০'}
                        /কেজি
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                        {formatBDT(totalHarvestRevenue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold mb-1">বিক্রির তারিখ</label>
                  <input
                    type="date"
                    value={dHarvestDate}
                    onChange={(e) => setDHarvestDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">ক্রেতা / আড়তদারের নাম</label>
                  <input
                    type="text"
                    value={dBuyerName}
                    onChange={(e) => setDBuyerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={dPaymentMethod}
                    onChange={(e) => setDPaymentMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="Cash">Cash (নগদ)</option>
                    <option value="Bank">Bank (ব্যাংক)</option>
                    <option value="Mobile Payment">Mobile Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">বকেয়া (Due ৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={dDueAmount}
                    onChange={(e) => setDDueAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
              >
                + মাছ বিক্রির চালান ({totalHarvestKg} কেজি = {formatBDT(totalHarvestRevenue)}) সেভ করুন
              </button>
            </form>
          </div>

          {/* Right: Live Profit Preview after this Harvest */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {selectedCycle.pondId} — বিক্রির পর পুকুরের মোট লাভের হিসাব
            </h4>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between">
                <span>বর্তমান চালানের বিক্রয়মূল্য:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {formatBDT(totalHarvestRevenue)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between">
                <span>পুকুরের পূর্বের মোট বিক্রি:</span>
                <span className="font-mono font-bold">{formatBDT(pondTotalRevenue)}</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 flex justify-between">
                <span>পুকুরের মোট খরচ (পোনা+খাবার+ওষুধ+শ্রমিক):</span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                  {formatBDT(pondTotalInvestment)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                <span className="font-bold">পুকুরের নিট লাভ:</span>
                <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400">
                  {formatBDT(pondTotalRevenue + totalHarvestRevenue - pondTotalInvestment)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
