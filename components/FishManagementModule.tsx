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
  Loader2,
  Trash2,
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
  deleteFishCycle,
} from '@/lib/erp-service';
import {
  triggerGlobalToast,
  triggerConfirmDelete,
} from './GlobalToastAndConfirmModal';

const parseNum = (val: string): number => {
  const clean = val.replace(/^0+(?=\d)/, '');
  return clean === '' ? 0 : Number(clean);
};

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
  lang?: 'en' | 'bn';
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
  lang = 'en',
}: FishManagementModuleProps) {
  const bn = false;
  const notify = (msg: string) => {
    onNotify(msg);
    triggerGlobalToast(msg, 'success');
  };
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
  // B. Fingerling Stocking & New Production Cycle State
  // ============================================================================
  const [bPondId, setBPondId] = useState('POND-001');
  const [bPondName, setBPondName] = useState('Pond #01 (Polyculture Carp & Tilapia)');
  const [bCycleCode, setBCycleCode] = useState(`CYC-POND001-${cycles.length + 1}`);
  const [bAreaDecimals, setBAreaDecimals] = useState(50);
  const [bDepthFeet, setBDepthFeet] = useState(6);
  const [bSpecies, setBSpecies] = useState('Rui, Katla & Tilapia');
  const [bFingerlingQty, setBFingerlingQty] = useState(5000);
  const [bPricePerPiece, setBPricePerPiece] = useState(5);
  const [bSupplier, setBSupplier] = useState('Trishal Ideal Fish Hatchery');
  const [bStockingDate, setBStockingDate] = useState('2026-11-12');

  const totalFingerlingInvestment = Number(bFingerlingQty) * Number(bPricePerPiece);

  // ============================================================================
  // C. Feed, Medicine, Water Quality (pH/DO), Mortality & Labor State
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
    'Lime, Zeolite & Oxygen Tablets'
  );
  const [cTreatmentCost, setCTreatmentCost] = useState(2500);
  const [cPondCleaningCost, setCPondCleaningCost] = useState(1500);
  const [cLabourCost, setCLabourCost] = useState(2000);

  const dailyFeedCost = Math.round(Number(cFeedKg) * Number(cFeedRatePerKg));

  // ============================================================================
  // D. Multi-Species Harvest & Sales Calculator State
  // ============================================================================
  const [dHarvestDate, setDHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [dBuyerName, setDBuyerName] = useState('Mymensingh Fish Wholesale Market Association');
  const [dPaymentMethod, setDPaymentMethod] = useState<'Cash' | 'Bank' | 'Mobile Payment'>('Cash');
  const [dDueAmount, setDDueAmount] = useState(0);

  // Multi-species harvest: Rui 300 KG @ 280, Katla 200 KG @ 320, Tilapia 100 KG @ 180
  const [ruiKg, setRuiKg] = useState(300);
  const [ruiPrice, setRuiPrice] = useState(280);

  const [katlaKg, setKatlaKg] = useState(200);
  const [katlaPrice, setKatlaPrice] = useState(320);

  const [tilapiaKg, setTilapiaKg] = useState(100);
  const [tilapiaPrice, setTilapiaPrice] = useState(180);

  const [otherSpeciesName, setOtherSpeciesName] = useState('Pabda / Silver Carp');
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
          pondName: 'Pond #01 (Main Carp & Tilapia Pond)',
          businessId: activeBusiness.id,
          areaDecimals: 50,
          depthFeet: 6,
          location: activeBusiness.location,
          waterQualityNotes: 'pH: 7.6 | DO (Dissolved Oxygen): 6.5 mg/L | Temp: 28°C | Optimal Water Quality',
          fishSpecies: 'Rui, Katla & Tilapia',
          stockingDate: '2026-11-12',
          initialQuantity: 5000,
          mortalityCount: 45,
          fingerlingCost: 25000,
          feedCost: 52000,
          medicineAndLimeCost: 8000,
          labourCost: 15000,
          harvestDate: '2026-11-12',
          harvestWeightKg: 600,
          totalSalesRevenue: 166000, // Rui 84,000 + Katla 64,000 + Tilapia 18,000 = 166,000
          status: 'active',
        },
        ownerId,
        actorEmail
      );

      notify(
        'Sample Pond POND-001 (Area 50 Decimals, Depth 6 ft, 5,000 fingerlings, Rui 300kg + Katla 200kg + Tilapia 100kg = 600kg harvest, Revenue ৳166,000) loaded successfully!'
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
          waterQualityNotes: 'pH: 7.5 | DO (Dissolved Oxygen): 6.5 mg/L | Suitable for fingerling release',
          fishSpecies: bSpecies,
          stockingDate: bStockingDate,
          initialQuantity: Number(bFingerlingQty),
          mortalityCount: 0,
          fingerlingCost: totalFingerlingInvestment,
          feedCost: 0,
          medicineAndLimeCost: 0,
          labourCost: 0,
          harvestDate: 'Active Cycle',
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
            category: `Fingerlings Purchase (${bPondId} - ${bCycleCode})`,
            description: `${bPondId} (${bPondName}): ${bFingerlingQty} fingerlings (${bSpecies}) @ ৳${bPricePerPiece} | Supplier: ${bSupplier}`,
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

      notify(
        `${bPondId}: Initialized new production cycle (${bCycleCode}: ${bFingerlingQty} fingerlings, Investment: ${formatBDT(totalFingerlingInvestment)})!`
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
      const waterQualityStr = `pH: ${cWaterPh} | DO: ${cWaterDo} mg/L | Temp: ${cWaterTemp}°C | Treatment: ${cWaterTreatmentName}`.slice(
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
          `Date ${cDate}: Dispensed ${cFeedKg} KG feed in ${selectedCycle.pondId}`,
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
            category: `Pond Feed, Medicine & Maintenance (${selectedCycle.pondId})`,
            description: `${selectedCycle.pondId}: Feed ${cFeedKg}kg (৳${dailyFeedCost}), Water treatment & cleaning (৳${addedMedAndCleaning}), Labor (৳${cLabourCost}) | pH:${cWaterPh}, DO:${cWaterDo}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: cashOrBank.id,
            creditAccountName: cashOrBank.name,
            amount: totalDayExpense,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: 'Pond Farm Operations',
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      notify(
        `${selectedCycle.pondId}: Feed (${cFeedKg} KG), Water Quality (pH ${cWaterPh}, DO ${cWaterDo}), and Expenses (${formatBDT(totalDayExpense)}) updated!`
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

      const breakdownDesc = `Rui: ${ruiKg}kg@৳${ruiPrice} (৳${ruiTotal}) | Katla: ${katlaKg}kg@৳${katlaPrice} (৳${katlaTotal}) | Tilapia: ${tilapiaKg}kg@৳${tilapiaPrice} (৳${tilapiaTotal})${
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
            category: `Fish Harvest Sales (${selectedCycle.pondId})`,
            description: `${selectedCycle.pondId} (${selectedCycle.cycleCode}): Total ${totalHarvestKg} KG fish sold | ${breakdownDesc}`,
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
        details: `[${selectedCycle.pondId} | ${selectedCycle.cycleCode}] Date: ${dHarvestDate} | ${breakdownDesc} | Total Harvest: ${totalHarvestKg} KG | Revenue: ৳${totalHarvestRevenue}`,
        severity: 'info',
        actorEmail,
        ownerId,
      });

      notify(
        `${selectedCycle.pondId}: Total ${totalHarvestKg} KG fish harvested and sold for ${formatBDT(totalHarvestRevenue)}!`
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
              Pond-Wise (POND-001, POND-002, POND-003) Stocking, Feed, Water Quality & Harvest Sales
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Each production cycle tracks stocking density, feed consumption, water parameters (pH/DO), and species-wise sales revenue separately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!cycles.some((c) => c.pondId === 'POND-001') && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleLoadPromptPondExample}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Loading demo...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Load Demo Pond (POND-001)</span>
                  </>
                )}
              </button>
            )}

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pondSearch}
                onChange={(e) => setPondSearch(e.target.value)}
                placeholder="Search POND-001 or fish species..."
                className="pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Modern Dropdown & Quick Pond Selector Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-emerald-200/70 dark:border-emerald-900/40">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap">
              <Fish className="h-4 w-4 text-emerald-600" />
              <span>Select Active Pond:</span>
            </label>

            <div className="relative min-w-[280px] max-w-md flex-1">
              <select
                value={selectedCycle?.id || ''}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {filteredCycles.length === 0 ? (
                  <option value="" disabled>No pond found</option>
                ) : (
                  filteredCycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.pondId}] {c.pondName} · {c.areaDecimals} Dec · {c.fishSpecies} ({c.status === 'active' ? 'Active' : c.status})
                    </option>
                  ))
                )}
              </select>
            </div>

            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
              `Total ${cycles.length} Ponds`
            </span>
          </div>

          {selectedCycle && (
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Selected Pond Mini Summary Card */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedCycle.pondId}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedCycle.pondName}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">{selectedCycle.fishSpecies}</span>
              </div>

              {/* Delete Pond Cycle Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  triggerConfirmDelete({
                    title: 'Confirm Delete Pond Cycle',
                    message: `Are you sure you want to delete cycle ${selectedCycle.pondId} - ${selectedCycle.cycleCode}? All associated feed, water and harvest records will be removed.`,
                    itemName: `${selectedCycle.pondId} (${selectedCycle.pondName} - ${selectedCycle.fishSpecies})`,
                    onConfirm: async () => {
                      setIsSubmitting(true);
                      try {
                        await deleteFishCycle(selectedCycle.id);
                        triggerGlobalToast(
                          `${selectedCycle.pondId} deleted!`,
                          'delete'
                        );
                        onNotify(`${selectedCycle.pondId} deleted!`);
                      } catch (err: any) {
                        triggerGlobalToast(err?.message || 'Delete failed', 'info');
                      } finally {
                        setIsSubmitting(false);
                      }
                    },
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-2xs cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
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
            titleEn: 'Pond Profile & Status',
            subEn: 'Area, Stock & Economics',
            icon: Waves,
          },
          {
            id: 'B_FINGERLING' as FishSubTab,
            step: 'B',
            titleEn: 'Fingerling & New Cycle',
            subEn: 'Stocking & Initial Setup',
            icon: Fish,
          },
          {
            id: 'C_FEED_WATER' as FishSubTab,
            step: 'C',
            titleEn: 'Feed, Medicine & Water',
            subEn: 'Daily pH, DO & Expenses',
            icon: Droplets,
          },
          {
            id: 'D_HARVEST_SALES' as FishSubTab,
            step: 'D',
            titleEn: 'Species Sales & Profit',
            subEn: 'Multi-Species Harvest P&L',
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
                  Step {tab.step}
                </span>
                <Icon className="h-4 w-4 opacity-85" />
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">{tab.titleEn}</div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    active ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  {tab.subEn}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB A: Pond Profile & Production Economics
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
                {'Active'}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-2.5 px-4 w-2/5">Metric / Field</th>
                    <th className="py-2.5 px-4">Value / Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      Pond ID
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {selectedCycle.pondId} (Cycle: {selectedCycle.cycleCode})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      Surface Area
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold">
                      {selectedCycle.areaDecimals} Decimals
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      Water Depth
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold">
                      {selectedCycle.depthFeet} Feet
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      Species Planted
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {selectedCycle.fishSpecies}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      Stocking Date
                    </td>
                    <td className="py-2.5 px-4 font-mono">{selectedCycle.stockingDate}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      Stocking Density & Live Biomass
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold">
                      Stocked: {selectedCycle.initialQuantity.toLocaleString()} | Mortality: {selectedCycle.mortalityCount} | Live: {pondAliveFish.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      Water Quality (pH & DO)
                    </td>
                    <td className="py-2.5 px-4 font-mono text-emerald-700 dark:text-emerald-400">
                      {selectedCycle.waterQualityNotes}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      Cycle Status
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
              {selectedCycle.pondId} — Pond Production Economics & Lifetime P&L
            </h3>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-2.5 px-4">Cost / Revenue Head</th>
                    <th className="py-2.5 px-4 text-right">Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 px-4">1. Fingerling Stocking Investment</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(pondFingerlingCost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">2. Floating & Sinking Feed Cost</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(pondFeedCost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">
                      3. Lime, Zeolite, Oxygen & Water Care
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(pondMedCost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">4. Pond Care & Harvesting Labor</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(pondLabourCost)}
                    </td>
                  </tr>
                  <tr className="bg-amber-50/70 dark:bg-amber-950/20 font-bold">
                    <td className="py-2.5 px-4">Total Pond Operating Cost</td>
                    <td className="py-2.5 px-4 text-right font-mono text-amber-700 dark:text-amber-400">
                      {formatBDT(pondTotalInvestment)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold">
                      `Total Harvest Sales (${selectedCycle.harvestWeightKg.toLocaleString()} KG)`
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {formatBDT(pondTotalRevenue)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-bold text-sm">
                    <td className="py-3 px-4">Net Pond Harvest Profit</td>
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
          TAB B: Fingerling Stocking & New Production Cycle
         ===================================================================== */}
      {activeSubTab === 'B_FINGERLING' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 max-w-3xl">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />
            B. Stock Fingerlings & Initialize Production Cycle
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Enter species stocked, fingerling count, unit price, hatchery supplier and target pond to automatically compute stocking investment.
          </p>

          <form onSubmit={handleCreateCycleB} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold mb-1">Target Pond ID *</label>
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
                <label className="block font-semibold mb-1">Pond Name *</label>
                <input
                  type="text"
                  required
                  value={bPondName}
                  onChange={(e) => setBPondName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Cycle Code *</label>
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
                <label className="block font-semibold mb-1">Surface Area (Decimals)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="0"
                  value={bAreaDecimals === 0 ? '' : bAreaDecimals}
                  onChange={(e) => setBAreaDecimals(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Water Depth (Feet)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="0"
                  value={bDepthFeet === 0 ? '' : bDepthFeet}
                  onChange={(e) => setBDepthFeet(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Stocking Date</label>
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
                  Fish Species Stocked *
                </label>
                <input
                  type="text"
                  required
                  value={bSpecies}
                  onChange={(e) => setBSpecies(e.target.value)}
                  placeholder="e.g. Rui, Katla, Tilapia, Pabda..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Hatchery Supplier</label>
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
                <label className="block font-semibold mb-1">Fingerling Quantity (Count) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="0"
                  value={bFingerlingQty === 0 ? '' : bFingerlingQty}
                  onChange={(e) => setBFingerlingQty(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Price per Fingerling (৳) *</label>
                <input
                  type="number"
                  step="0.5"
                  min={0.1}
                  placeholder="0"
                  value={bPricePerPiece === 0 ? '' : bPricePerPiece}
                  onChange={(e) => setBPricePerPiece(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                  Total Stocking Investment (Auto)
                </label>
                <div className="w-full rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  {formatBDT(totalFingerlingInvestment)}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Saving Cycle...</span>
                </>
              ) : (
                <span>+ Save Stocking & Initialize Cycle</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB C: Feed, Medicine, Water Quality (pH/DO), Mortality & Labor
         ===================================================================== */}
      {activeSubTab === 'C_FEED_WATER' && selectedCycle && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 max-w-4xl space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-emerald-600" />
            `C. Daily Feeding, Water Quality (pH/DO) & Maintenance (${selectedCycle.pondId})`
          </h3>

          <form onSubmit={handleRecordFeedAndWaterC} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Date</label>
                <input
                  type="date"
                  value={cDate}
                  onChange={(e) => setCDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Feed Dispensed (KG)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={cFeedKg === 0 ? '' : cFeedKg}
                  onChange={(e) => setCFeedKg(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Feed Rate / KG (৳)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={cFeedRatePerKg === 0 ? '' : cFeedRatePerKg}
                  onChange={(e) => setCFeedRatePerKg(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Total Feed Cost (Auto)</label>
                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono font-bold">
                  {formatBDT(dailyFeedCost)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                  Water pH Level
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
                  Dissolved Oxygen (DO mg/L)
                </label>
                <input
                  type="text"
                  value={cWaterDo}
                  onChange={(e) => setCWaterDo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Water Temp (°C)</label>
                <input
                  type="text"
                  value={cWaterTemp}
                  onChange={(e) => setCWaterTemp(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-red-600">
                  Fish Mortality Count
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={cMortalityToday === 0 ? '' : cMortalityToday}
                  onChange={(e) => setCMortalityToday(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Water Treatment (Lime/Zeolite/Probiotics)</label>
                <input
                  type="text"
                  value={cWaterTreatmentName}
                  onChange={(e) => setCWaterTreatmentName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Treatment Cost (৳)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={cTreatmentCost === 0 ? '' : cTreatmentCost}
                  onChange={(e) => setCTreatmentCost(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Weeding & Pond Cleaning (৳)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={cPondCleaningCost === 0 ? '' : cPondCleaningCost}
                  onChange={(e) => setCPondCleaningCost(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Labor & Guarding (৳)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={cLabourCost === 0 ? '' : cLabourCost}
                  onChange={(e) => setCLabourCost(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Saving Data...</span>
                </>
              ) : (
                <span>+ Save Daily Feed, Water Quality & Expenses</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB D: Multi-Species Fish Harvest & Sales
         ===================================================================== */}
      {activeSubTab === 'D_HARVEST_SALES' && selectedCycle && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scale className="h-4 w-4 text-emerald-600" />
              `D. Multi-Species Harvest Sales Calculator (${selectedCycle.pondId})`
            </h3>
            <p className="text-xs text-slate-500">
              Record species-wise harvested weights (Rui, Katla, Tilapia, etc.) and wholesale rates to realize harvest revenue and post to accounts.
            </p>

            <form onSubmit={handleRecordHarvestSaleD} className="space-y-4 text-xs">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                      <th className="py-2.5 px-3">Fish Species</th>
                      <th className="py-2.5 px-3">Harvest Qty (KG)</th>
                      <th className="py-2.5 px-3">Rate / KG (৳)</th>
                      <th className="py-2.5 px-3 text-right">Total Revenue (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="py-2.5 px-3 font-bold">Rui (Rohu Carp)</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={ruiKg === 0 ? '' : ruiKg}
                          onChange={(e) => setRuiKg(parseNum(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={ruiPrice === 0 ? '' : ruiPrice}
                          onChange={(e) => setRuiPrice(parseNum(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatBDT(ruiTotal)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">Katla (Major Carp)</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={katlaKg === 0 ? '' : katlaKg}
                          onChange={(e) => setKatlaKg(parseNum(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={katlaPrice === 0 ? '' : katlaPrice}
                          onChange={(e) => setKatlaPrice(parseNum(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatBDT(katlaTotal)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">Tilapia</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={tilapiaKg === 0 ? '' : tilapiaKg}
                          onChange={(e) => setTilapiaKg(parseNum(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={tilapiaPrice === 0 ? '' : tilapiaPrice}
                          onChange={(e) => setTilapiaPrice(parseNum(e.target.value))}
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
                          placeholder="0"
                          value={otherKg === 0 ? '' : otherKg}
                          onChange={(e) => setOtherKg(parseNum(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={otherPrice === 0 ? '' : otherPrice}
                          onChange={(e) => setOtherPrice(parseNum(e.target.value))}
                          className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatBDT(otherTotal)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-bold text-sm">
                      <td className="py-3 px-3">Total Harvest</td>
                      <td className="py-3 px-3 font-mono">{totalHarvestKg} KG</td>
                      <td className="py-3 px-3 font-mono">
                        Avg Rate:{' '}
                        {totalHarvestKg > 0
                          ? formatBDT(Math.round(totalHarvestRevenue / totalHarvestKg))
                          : '৳0'}
                        / KG
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
                  <label className="block font-semibold mb-1">Harvest / Sale Date</label>
                  <input
                    type="date"
                    value={dHarvestDate}
                    onChange={(e) => setDHarvestDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Buyer / Commission Agent</label>
                  <input
                    type="text"
                    value={dBuyerName}
                    onChange={(e) => setDBuyerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Payment Method</label>
                  <select
                    value={dPaymentMethod}
                    onChange={(e) => setDPaymentMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Mobile Payment">Mobile Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Remaining Due (৳)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={dDueAmount === 0 ? '' : dDueAmount}
                    onChange={(e) => setDDueAmount(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Saving Invoice...</span>
                  </>
                ) : (
                  <span>+ Save Harvest Consignment ({totalHarvestKg} KG = {formatBDT(totalHarvestRevenue)})</span>
                )}
              </button>
            </form>
          </div>

          {/* Right: Live Profit Preview after this Harvest */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {selectedCycle.pondId} — Post-Harvest Net Profit Summary
            </h4>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between">
                <span>Current Consignment Revenue:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {formatBDT(totalHarvestRevenue)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between">
                <span>Cumulative Past Revenue:</span>
                <span className="font-mono font-bold">{formatBDT(pondTotalRevenue)}</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 flex justify-between">
                <span>Total Pond Cost (Stocking+Feed+Care+Labor):</span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                  {formatBDT(pondTotalInvestment)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                <span className="font-bold">Net Pond Harvest Profit:</span>
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
