'use client';

import React, { useState, useMemo } from 'react';
import {
  Bird,
  Search,
  Plus,
  HeartPulse,
  Package,
  Syringe,
  Zap,
  Scale,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  ErpBusiness,
  ErpPoultryBatch,
  ErpInventoryItem,
  ErpJournalEntry,
  ErpAccount,
  ErpAuditLog,
  formatBDT,
} from '@/lib/erp-types';
import {
  createPoultryBatchRecord,
  updatePoultryBatchDailyRecord,
  createInventoryItemWithMovement,
  recordStockMovement,
  postDoubleEntryTransaction,
  logAuditEvent,
  createNotificationRecord,
  deletePoultryBatch,
} from '@/lib/erp-service';
import {
  triggerGlobalToast,
  triggerConfirmDelete,
} from './GlobalToastAndConfirmModal';

const parseNum = (val: string): number => {
  const clean = val.replace(/^0+(?=\d)/, '');
  return clean === '' ? 0 : Number(clean);
};

interface PoultryManagementModuleProps {
  activeBusiness: ErpBusiness;
  batches: ErpPoultryBatch[];
  inventoryItems: ErpInventoryItem[];
  journalEntries: ErpJournalEntry[];
  accounts: ErpAccount[];
  auditLogs: ErpAuditLog[];
  ownerId: string;
  actorEmail: string;
  onNotify: (msg: string) => void;
  lang?: 'en' | 'bn';
}

type PoultrySubTab =
  | 'A_BATCH'
  | 'B_MORTALITY'
  | 'C_FEED'
  | 'D_MEDICINE'
  | 'E_EXPENSES'
  | 'F_SALES'
  | 'G_REPORT';

export default function PoultryManagementModule({
  activeBusiness,
  batches,
  inventoryItems,
  journalEntries,
  accounts,
  auditLogs,
  ownerId,
  actorEmail,
  onNotify,
  lang = 'en',
}: PoultryManagementModuleProps) {
  const bn = false;
  const notify = (msg: string) => {
    onNotify(msg);
    triggerGlobalToast(msg, 'success');
  };
  const [activeSubTab, setActiveSubTab] = useState<PoultrySubTab>('A_BATCH');
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter batches by search query (Batch ID, Shed, Supplier, Type)
  const filteredBatches = useMemo(() => {
    const q = batchSearchQuery.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter(
      (b) =>
        b.batchCode.toLowerCase().includes(q) ||
        b.shedNumber.toLowerCase().includes(q) ||
        b.supplierName.toLowerCase().includes(q) ||
        b.chickenType.toLowerCase().includes(q)
    );
  }, [batches, batchSearchQuery]);

  const selectedBatch = useMemo(() => {
    return (
      batches.find((b) => b.id === selectedBatchId) ||
      filteredBatches[0] ||
      batches[0] ||
      null
    );
  }, [batches, filteredBatches, selectedBatchId]);

  // Feed & Medicine inventory for this poultry business
  const feedItems = useMemo(
    () =>
      inventoryItems.filter(
        (i) =>
          i.category === 'feed' &&
          (i.businessId === activeBusiness.id || i.businessName.toLowerCase().includes('poultry'))
      ),
    [inventoryItems, activeBusiness.id]
  );

  const medItems = useMemo(
    () =>
      inventoryItems.filter(
        (i) =>
          (i.category === 'medicine' || i.category === 'vaccine') &&
          (i.businessId === activeBusiness.id || i.businessName.toLowerCase().includes('poultry'))
      ),
    [inventoryItems, activeBusiness.id]
  );

  // ============================================================================
  // A. Chick Procurement & Batch Initialization (State)
  // ============================================================================
  const [aBatchCode, setABatchCode] = useState('POL-2026-001');
  const [aPurchaseDate, setAPurchaseDate] = useState('2026-11-12');
  const [aChickenType, setAChickenType] = useState<
    'Broiler' | 'Layer' | 'Sonali' | 'Deshi' | 'Breeder'
  >('Broiler');
  const [aInitialQty, setAInitialQty] = useState(1000);
  const [aPricePerChick, setAPricePerChick] = useState(60);
  const [aSupplier, setASupplier] = useState('ABC Poultry');
  const [aShed, setAShed] = useState('Shed-01');
  const [aStatus, setAStatus] = useState<'active' | 'harvested' | 'closed'>('active');

  const aTotalChickCost = Number(aInitialQty) * Number(aPricePerChick);

  // ============================================================================
  // B. Daily Flock Mortality & Health Tracker (Form State)
  // ============================================================================
  const [bDate, setBDate] = useState(new Date().toISOString().split('T')[0]);
  const [bDeadToday, setBDeadToday] = useState(1);
  const [bCause, setBCause] = useState('Heat Stress (Severe Weather)');
  const [bSickToday, setBSickToday] = useState(4);
  const [bTreatment, setBTreatment] = useState('Electrolytes and Vitamin C administered in drinking water');
  const [bEmployee, setBEmployee] = useState('Md. Rafiqul Islam (Shed Supervisor)');

  // ============================================================================
  // C. Feed Inventory & Daily Consumption (Form State)
  // ============================================================================
  const [cFeedType, setCFeedType] = useState<'Starter Feed' | 'Grower Feed' | 'Finisher Feed'>(
    'Starter Feed'
  );
  const [cBagsCount, setCBagsCount] = useState(50);
  const [cPricePerBag, setCPricePerBag] = useState(2500);
  const [cFeedSupplier, setCFeedSupplier] = useState('Kazi Agro Feed Mill Ltd.');
  const [cWarehouse, setCWarehouse] = useState('Shed-01 Feed Store');

  const [cUseDate, setCUseDate] = useState(new Date().toISOString().split('T')[0]);
  const [cUseFeedStage, setCUseFeedStage] = useState<'starter' | 'grower' | 'finisher'>('starter');
  const [cUseInventoryId, setCUseInventoryId] = useState('');
  const [cUseBags, setCUseBags] = useState(3);
  const [cBagWeightKg, setCBagWeightKg] = useState(50);

  // ============================================================================
  // D. Medicine, Vaccine & Health Treatment (Form State)
  // ============================================================================
  const [dMedName, setDMedName] = useState('Vaccine A (ND + IB Live)');
  const [dMedCategory, setDMedCategory] = useState<'vaccine' | 'medicine'>('vaccine');
  const [dMedQty, setDMedQty] = useState(10);
  const [dMedUnitCost, setDMedUnitCost] = useState(200);
  const [dMedExpiry, setDMedExpiry] = useState('2027-06-30');
  const [dMedSupplier, setDMedSupplier] = useState('ACI Animal Health');

  const [dApplyMedId, setDApplyMedId] = useState('');
  const [dApplyName, setDApplyName] = useState('Vaccine A / Medicine B');
  const [dApplyDuration, setDApplyDuration] = useState('3 Days Course');
  const [dApplyQty, setDApplyQty] = useState(1);
  const [dApplyCost, setDApplyCost] = useState(2000);
  const [dApplyNote, setDApplyNote] = useState('1st dose completed — booster scheduled for Day 14');
  const [dNextReminderDate, setDNextReminderDate] = useState('2026-11-26');

  // ============================================================================
  // E. Utilities, Staff Salary & Overhead Allocation (Form State)
  // ============================================================================
  const [eExpenseType, setEExpenseType] = useState('Electricity Bill');
  const [eAmount, setEAmount] = useState(5000);
  const [eDate, setEDate] = useState(new Date().toISOString().split('T')[0]);
  const [eAllocationRule, setEAllocationRule] = useState<
    'single_batch' | 'equal_all_sheds' | 'proportional_birds'
  >('single_batch');
  const [eSpentBy, setESpentBy] = useState('Manager Mahmudul Hasan');
  const [ePaidTo, setEPaidTo] = useState('Palli Bidyut Samity / Farm Staff');
  const [eReceiptRef, setEReceiptRef] = useState('BILL-2026-1109');
  const [ePaymentMethod, setEPaymentMethod] = useState<'Cash' | 'Bank' | 'Mobile Banking'>('Cash');

  // ============================================================================
  // F. Multi-Grade Poultry Sales Calculator (Form State)
  // ============================================================================
  const [fBuyerName, setFBuyerName] = useState('Bismillah Poultry Wholesale');
  const [fSaleDate, setFSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [fTransportCost, setFTransportCost] = useState(2500);
  const [fDueAmount, setFDueAmount] = useState(0);
  const [fPaymentMethod, setFPaymentMethod] = useState<'Cash' | 'Bank' | 'Mobile Payment'>('Cash');

  const [gradeSmallBirds, setGradeSmallBirds] = useState(200);
  const [gradeSmallKg, setGradeSmallKg] = useState(300);
  const [gradeSmallPrice, setGradeSmallPrice] = useState(180);

  const [gradeMedBirds, setGradeMedBirds] = useState(400);
  const [gradeMedKg, setGradeMedKg] = useState(680);
  const [gradeMedPrice, setGradeMedPrice] = useState(190);

  const [gradeLargeBirds, setGradeLargeBirds] = useState(300);
  const [gradeLargeKg, setGradeLargeKg] = useState(600);
  const [gradeLargePrice, setGradeLargePrice] = useState(200);

  const [gradeXlBirds, setGradeXlBirds] = useState(94);
  const [gradeXlKg, setGradeXlKg] = useState(220);
  const [gradeXlPrice, setGradeXlPrice] = useState(210);

  const smallTotal = gradeSmallKg * gradeSmallPrice;
  const medTotal = gradeMedKg * gradeMedPrice;
  const largeTotal = gradeLargeKg * gradeLargePrice;
  const xlTotal = gradeXlKg * gradeXlPrice;

  const totalGradedBirds =
    Number(gradeSmallBirds) +
    Number(gradeMedBirds) +
    Number(gradeLargeBirds) +
    Number(gradeXlBirds);
  const totalGradedKg =
    Number(gradeSmallKg) + Number(gradeMedKg) + Number(gradeLargeKg) + Number(gradeXlKg);
  const totalGradedRevenue = smallTotal + medTotal + largeTotal + xlTotal;
  const avgGradedPricePerKg =
    totalGradedKg > 0 ? Math.round(totalGradedRevenue / totalGradedKg) : 0;

  // ============================================================================
  // HANDLERS FOR SECTIONS A - F
  // ============================================================================

  const handleCreateBatchA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createPoultryBatchRecord(
        {
          batchCode: aBatchCode,
          businessId: activeBusiness.id,
          chickPurchaseDate: aPurchaseDate,
          chickenType: aChickenType,
          shedNumber: aShed,
          supplierName: aSupplier,
          initialQuantity: Number(aInitialQty),
          mortalityCount: 0,
          sickBirdsCount: 0,
          soldBirdsCount: 0,
          purchaseCost: aTotalChickCost,
          starterFeedKg: 0,
          growerFeedKg: 0,
          finisherFeedKg: 0,
          feedCost: 0,
          medicineCost: 0,
          labourAndUtilityCost: 0,
          otherExpense: 0,
          totalSoldKg: 0,
          gradeBreakdown: 'Sales not started yet',
          pricePerKg: 0,
          totalSalesRevenue: 0,
          outstandingDue: 0,
          vaccineScheduleNotes: 'Initial brooding stage ongoing',
          status: aStatus,
        },
        ownerId,
        actorEmail
      );

      // Post chick purchase to central accounting
      const cashOrBank =
        accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];
      if (cashOrBank && expAcc && aTotalChickCost > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `CHK-${aBatchCode}`,
            date: aPurchaseDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'purchase',
            category: `Chick Procurement (${aBatchCode})`,
            description: `${aBatchCode}: ${aInitialQty} ${aChickenType} chicks @ ৳${aPricePerChick} (${aShed}) - Supplier: ${aSupplier}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: cashOrBank.id,
            creditAccountName: cashOrBank.name,
            amount: aTotalChickCost,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: aSupplier,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      notify(
        `New batch ${aBatchCode} (${aInitialQty} ${aChickenType} chicks, total ${formatBDT(aTotalChickCost)}) created successfully!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // One-click preset to create the exact example POL-2026-001 from user prompt
  const handleCreateExamplePol2026 = async () => {
    setIsSubmitting(true);
    try {
      await createPoultryBatchRecord(
        {
          batchCode: 'POL-2026-001',
          businessId: activeBusiness.id,
          chickPurchaseDate: '2026-11-12',
          chickenType: 'Broiler',
          shedNumber: 'Shed-01',
          supplierName: 'ABC Poultry',
          initialQuantity: 1000,
          mortalityCount: 6,
          sickBirdsCount: 3,
          soldBirdsCount: 0,
          purchaseCost: 60000,
          starterFeedKg: 50,
          growerFeedKg: 50,
          finisherFeedKg: 50,
          feedCost: 125000,
          medicineCost: 8000,
          labourAndUtilityCost: 21000,
          otherExpense: 10000,
          totalSoldKg: 1800,
          gradeBreakdown:
            'Small: 200 Birds (300kg @৳180) | Medium: 400 Birds (680kg @৳190) | Large: 300 Birds (600kg @৳200) | XL: 94 Birds (220kg @৳210)',
          pricePerKg: 194,
          totalSalesRevenue: 350000,
          outstandingDue: 15000,
          vaccineScheduleNotes: 'Vaccine A (1 Batch), Medicine B (3 Days), Vitamin C (5 Days)',
          status: 'active',
        },
        ownerId,
        actorEmail
      );
      notify(
        'Demo batch POL-2026-001 (1,000 Broiler chicks, 6 dead, 994 live, Total Revenue ৳3,50,000, Net Profit ৳1,26,000) loaded successfully!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordMortalityB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setIsSubmitting(true);
    try {
      const newMortality = selectedBatch.mortalityCount + Number(bDeadToday);
      await updatePoultryBatchDailyRecord(
        selectedBatch,
        {
          mortalityCount: newMortality,
          sickBirdsCount: Number(bSickToday),
        },
        actorEmail
      );

      await logAuditEvent({
        action: 'DAILY_MORTALITY_LOG',
        module: 'Poultry Management',
        businessId: activeBusiness.id,
        details: `[${selectedBatch.batchCode} | ${selectedBatch.shedNumber}] Date: ${bDate} | Mortality: ${bDeadToday} (Total Dead: ${newMortality}) | Cause: ${bCause} | Sick: ${bSickToday} | Treatment: ${bTreatment} | Supervisor: ${bEmployee}`,
        severity: Number(bDeadToday) >= 10 ? 'warning' : 'info',
        actorEmail,
        ownerId,
      });

      notify(
        `${selectedBatch.batchCode}: Today's mortality (${bDeadToday}) and illness (${bSickToday}) records updated! Current live birds: ${
          selectedBatch.initialQuantity - newMortality - selectedBatch.soldBirdsCount
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePurchaseFeedC = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const totalCost = Number(cBagsCount) * Number(cPricePerBag);
      await createInventoryItemWithMovement(
        {
          sku: `FD-${cFeedType.split(' ')[0].toUpperCase()}-${Date.now().toString().slice(-4)}`,
          barcode: `894${Date.now().toString().slice(-9)}`,
          name: `${cFeedType} (50 KG Bag)`,
          category: 'feed',
          businessId: activeBusiness.id,
          businessName: activeBusiness.name,
          warehouse: cWarehouse,
          unit: 'Bag',
          quantity: Number(cBagsCount),
          reorderLevel: 10,
          unitCost: Number(cPricePerBag),
          sellingPrice: Number(cPricePerBag),
          expiryDate: '2027-06-30',
          supplierName: cFeedSupplier,
        },
        ownerId,
        actorEmail
      );

      const cashOrBank =
        accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const invAcc =
        accounts.find((a) => a.subType === 'inventory' || a.accountType === 'expense') ||
        accounts[0];
      if (cashOrBank && invAcc && totalCost > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `FD-PUR-${Date.now().toString().slice(-5)}`,
            date: new Date().toISOString().split('T')[0],
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'purchase',
            category: `Poultry Feed Purchase (${cFeedType})`,
            description: `${cBagsCount} bags ${cFeedType} @ ৳${cPricePerBag}/bag (Supplier: ${cFeedSupplier})`,
            debitAccountId: invAcc.id,
            debitAccountName: invAcc.name,
            creditAccountId: cashOrBank.id,
            creditAccountName: cashOrBank.name,
            amount: totalCost,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: cFeedSupplier,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      notify(
        `${cBagsCount} bags ${cFeedType} (total ${formatBDT(totalCost)}) added to inventory stock!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDailyFeedUsageC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setIsSubmitting(true);
    try {
      const targetFeedItem =
        feedItems.find((i) => i.id === cUseInventoryId) || feedItems[0];
      const bagCost = targetFeedItem ? targetFeedItem.unitCost : Number(cPricePerBag);
      const usedKg = Number(cUseBags) * Number(cBagWeightKg);
      const addedCost = Number(cUseBags) * bagCost;

      if (targetFeedItem) {
        await recordStockMovement(
          targetFeedItem,
          'consumption',
          Number(cUseBags),
          targetFeedItem.warehouse,
          `${selectedBatch.batchCode} (${selectedBatch.shedNumber})`,
          `${selectedBatch.batchCode} — ${cUseDate}: Issued ${cUseBags} bags (${usedKg} KG) feed`,
          actorEmail
        );
      }

      await updatePoultryBatchDailyRecord(
        selectedBatch,
        {
          starterFeedKg:
            cUseFeedStage === 'starter'
              ? selectedBatch.starterFeedKg + usedKg
              : selectedBatch.starterFeedKg,
          growerFeedKg:
            cUseFeedStage === 'grower'
              ? selectedBatch.growerFeedKg + usedKg
              : selectedBatch.growerFeedKg,
          finisherFeedKg:
            cUseFeedStage === 'finisher'
              ? selectedBatch.finisherFeedKg + usedKg
              : selectedBatch.finisherFeedKg,
          feedCost: selectedBatch.feedCost + addedCost,
        },
        actorEmail
      );

      notify(
        `${selectedBatch.batchCode}: ${cUseBags} bags (${usedKg} KG) feed issued. Stock reduced by ${cUseBags} bags and ${formatBDT(addedCost)} added to batch expenses!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyMedicineD = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createInventoryItemWithMovement(
        {
          sku: `MED-${Date.now().toString().slice(-5)}`,
          barcode: `894${Date.now().toString().slice(-9)}`,
          name: dMedName,
          category: dMedCategory,
          businessId: activeBusiness.id,
          businessName: activeBusiness.name,
          warehouse: 'Poultry Medicine Cold Store',
          unit: 'Vial/Pack',
          quantity: Number(dMedQty),
          reorderLevel: 5,
          unitCost: Number(dMedUnitCost),
          sellingPrice: Number(dMedUnitCost),
          expiryDate: dMedExpiry,
          supplierName: dMedSupplier,
        },
        ownerId,
        actorEmail
      );
      notify(
        `${dMedName} (${dMedQty} units, Expiry: ${dMedExpiry}) added to medicine stock!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyMedicineD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setIsSubmitting(true);
    try {
      const targetMed = medItems.find((m) => m.id === dApplyMedId);
      if (targetMed) {
        await recordStockMovement(
          targetMed,
          'consumption',
          Number(dApplyQty),
          targetMed.warehouse,
          selectedBatch.batchCode,
          `${dApplyName} (${dApplyDuration}) - ${dApplyNote}`,
          actorEmail
        );
      }

      const updatedNotes = `${selectedBatch.vaccineScheduleNotes} | ${dApplyName} (${dApplyDuration}): ${dApplyNote}`.slice(
        0,
        300
      );

      await updatePoultryBatchDailyRecord(
        selectedBatch,
        {
          medicineCost: selectedBatch.medicineCost + Number(dApplyCost),
          vaccineScheduleNotes: updatedNotes,
        },
        actorEmail
      );

      // Create Vaccine Reminder Notification if date provided
      if (dNextReminderDate) {
        await createNotificationRecord({
          title: `Vaccine Reminder: ${selectedBatch.batchCode} (${selectedBatch.shedNumber})`.slice(
            0,
            140
          ),
          message: `${selectedBatch.batchCode}: Scheduled date for next vaccine/medication (${dApplyName}): ${dNextReminderDate}. Note: ${dApplyNote}`.slice(
            0,
            400
          ),
          category: 'vaccination',
          priority: 'high',
          businessId: activeBusiness.id,
        });
      }

      notify(
        `${selectedBatch.batchCode}: Medication/vaccine (${dApplyName}, cost ${formatBDT(Number(dApplyCost))}) added and booster reminder set for ${dNextReminderDate}!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordOverheadExpenseE = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setIsSubmitting(true);
    try {
      const totalExp = Number(eAmount);
      const isUtilityOrLabour =
        eExpenseType.toLowerCase().includes('electricity') ||
        eExpenseType.toLowerCase().includes('salary') ||
        eExpenseType.toLowerCase().includes('wage') ||
        eExpenseType.toLowerCase().includes('water') ||
        eExpenseType.toLowerCase().includes('gas') ||
        eExpenseType.includes('বিদ্যুৎ') ||
        eExpenseType.includes('বেতন') ||
        eExpenseType.includes('পানি') ||
        eExpenseType.includes('গ্যাস');

      const activeBatches = batches.filter((b) => b.status === 'active');
      const targetBatches =
        eAllocationRule === 'single_batch' || activeBatches.length === 0
          ? [selectedBatch]
          : activeBatches;

      const totalLiveAcrossBatches = targetBatches.reduce(
        (sum, b) => sum + Math.max(1, b.initialQuantity - b.mortalityCount - b.soldBirdsCount),
        0
      );

      for (const b of targetBatches) {
        let share = totalExp;
        if (eAllocationRule === 'equal_all_sheds') {
          share = Math.round(totalExp / targetBatches.length);
        } else if (eAllocationRule === 'proportional_birds') {
          const liveInB = Math.max(1, b.initialQuantity - b.mortalityCount - b.soldBirdsCount);
          share = Math.round((totalExp * liveInB) / totalLiveAcrossBatches);
        }

        await updatePoultryBatchDailyRecord(
          b,
          isUtilityOrLabour
            ? { labourAndUtilityCost: b.labourAndUtilityCost + share }
            : { otherExpense: b.otherExpense + share },
          actorEmail
        );
      }

      const ruleLabel =
        eAllocationRule === 'single_batch'
          ? `Single Batch (${selectedBatch.batchCode})`
          : eAllocationRule === 'equal_all_sheds'
          ? `Distributed equally across ${targetBatches.length} sheds`
          : `Distributed proportionally across ${targetBatches.length} sheds by bird count`;

      const cashOrBank =
        accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];
      if (cashOrBank && expAcc) {
        await postDoubleEntryTransaction(
          {
            referenceNo: eReceiptRef || `EXP-${Date.now().toString().slice(-5)}`,
            date: eDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'expense',
            category: eExpenseType,
            description: `${eExpenseType} | Allocation: ${ruleLabel} | Expensed by: ${eSpentBy} | Payee: ${ePaidTo} | Method: ${ePaymentMethod}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: cashOrBank.id,
            creditAccountName: cashOrBank.name,
            amount: totalExp,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: ePaidTo,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      notify(
        `${eExpenseType} for ${formatBDT(totalExp)} (${ruleLabel}) posted successfully!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGradedSalesF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setIsSubmitting(true);
    try {
      const breakdownStr = `Small:${gradeSmallBirds} Birds(${gradeSmallKg}kg@৳${gradeSmallPrice}) | Med:${gradeMedBirds} Birds(${gradeMedKg}kg@৳${gradeMedPrice}) | Lrg:${gradeLargeBirds} Birds(${gradeLargeKg}kg@৳${gradeLargePrice}) | XL:${gradeXlBirds} Birds(${gradeXlKg}kg@৳${gradeXlPrice})`.slice(
        0,
        200
      );

      const newSoldBirds = selectedBatch.soldBirdsCount + totalGradedBirds;
      const newSoldKg = selectedBatch.totalSoldKg + totalGradedKg;
      const newSalesRev = selectedBatch.totalSalesRevenue + totalGradedRevenue;
      const newDue = selectedBatch.outstandingDue + Number(fDueAmount);
      const newOtherExp = selectedBatch.otherExpense + Number(fTransportCost);

      await updatePoultryBatchDailyRecord(
        selectedBatch,
        {
          soldBirdsCount: newSoldBirds,
          totalSoldKg: newSoldKg,
          pricePerKg: avgGradedPricePerKg,
          totalSalesRevenue: newSalesRev,
          outstandingDue: newDue,
          otherExpense: newOtherExp,
          gradeBreakdown: breakdownStr,
        },
        actorEmail
      );

      const cashOrBank =
        accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
      if (cashOrBank && revAcc && totalGradedRevenue > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `SL-${selectedBatch.batchCode}-${Date.now().toString().slice(-4)}`,
            date: fSaleDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'sale',
            category: `Graded Poultry Sale (${selectedBatch.batchCode})`,
            description: `${selectedBatch.batchCode}: Total ${totalGradedBirds} birds (${totalGradedKg} KG) sold | ${breakdownStr} | Payment: ${fPaymentMethod}`,
            debitAccountId: cashOrBank.id,
            debitAccountName: cashOrBank.name,
            creditAccountId: revAcc.id,
            creditAccountName: revAcc.name,
            amount: totalGradedRevenue,
            paymentStatus: Number(fDueAmount) > 0 ? 'partial' : 'paid',
            dueAmount: Number(fDueAmount) || 0,
            counterpartyName: fBuyerName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      notify(
        `${selectedBatch.batchCode}: Total ${totalGradedBirds} birds (${totalGradedKg} KG) across 4 grades sold for ${formatBDT(totalGradedRevenue)}!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mortality Logs from Audit Trail for Section B
  const mortalityLogs = useMemo(
    () =>
      auditLogs.filter(
        (l) =>
          l.action === 'DAILY_MORTALITY_LOG' ||
          (l.module === 'Poultry Management' && (l.details.includes('Mortality') || l.details.includes('মৃত')))
      ),
    [auditLogs]
  );

  // Selected batch computed metrics
  const batchInitial = selectedBatch?.initialQuantity || 0;
  const batchDead = selectedBatch?.mortalityCount || 0;
  const batchSold = selectedBatch?.soldBirdsCount || 0;
  const batchAlive = Math.max(0, batchInitial - batchDead - batchSold);
  const batchMortalityRate =
    batchInitial > 0 ? ((batchDead / batchInitial) * 100).toFixed(2) : '0.00';

  const batchTotalExpenses = selectedBatch
    ? selectedBatch.purchaseCost +
      selectedBatch.feedCost +
      selectedBatch.medicineCost +
      selectedBatch.labourAndUtilityCost +
      selectedBatch.otherExpense
    : 0;
  const batchRealizedProfit = selectedBatch
    ? selectedBatch.totalSalesRevenue - batchTotalExpenses
    : 0;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          BATCH SEARCH & ACTIVE BATCH SELECTOR BAR
         ===================================================================== */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Bird className="h-4 w-4" />
              <span>Poultry Management Module (A to G Complete Lifecycle)</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {bn ? 'মুরগির বাচ্চা কেনা থেকে শুরু করে গ্রেডভিত্তিক বিক্রি ও চূড়ান্ত লাভ-ক্ষতি ট্র্যাকিং' : 'Poultry Batch Management: Chick Procurement to Graded Sales & Lifetime P&L'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {bn ? (
                <>যেমন ৬ মাস পরেও যদি আপনি <span className="font-mono font-bold">POL-2026-001</span> লিখে সার্চ করেন, এই ব্যাচের সম্পূর্ণ ইতিহাস নিচে দেখতে পাবেন।</>
              ) : (
                <>Search by Batch ID anytime (e.g. <span className="font-mono font-bold">POL-2026-001</span>) to access complete mortality, feed, and financial audit logs.</>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!batches.some((b) => b.batchCode === 'POL-2026-001') && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateExamplePol2026}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{bn ? 'লোড করা হচ্ছে...' : 'Loading demo...'}</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>{bn ? 'উদাহরণ ব্যাচ (POL-2026-001) লোড করুন' : 'Load Demo Batch (POL-2026-001)'}</span>
                  </>
                )}
              </button>
            )}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={batchSearchQuery}
                onChange={(e) => setBatchSearchQuery(e.target.value)}
                placeholder={bn ? "Batch ID সার্চ করুন (যেমন POL-2026-001)..." : "Search Batch ID (e.g. POL-2026-001)..."}
                className="pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Modern Dropdown & Quick Batch Selector Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-emerald-200/70 dark:border-emerald-900/40">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap">
              <Bird className="h-4 w-4 text-emerald-600" />
              <span>{bn ? 'সক্রিয় ব্যাচ নির্বাচন (Select Batch):' : 'Select Active Batch:'}</span>
            </label>

            <div className="relative min-w-[280px] max-w-md flex-1">
              <select
                value={selectedBatch?.id || ''}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {filteredBatches.length === 0 ? (
                  <option value="" disabled>{bn ? 'কোনো ব্যাচ পাওয়া যায়নি' : 'No batch found'}</option>
                ) : (
                  filteredBatches.map((b) => {
                    const alive = Math.max(0, b.initialQuantity - b.mortalityCount - b.soldBirdsCount);
                    return (
                      <option key={b.id} value={b.id}>
                        {b.batchCode} · {b.shedNumber} ({b.chickenType}) — {bn ? `জীবিত: ${alive}টি` : `Live: ${alive}`} ({b.status === 'active' ? (bn ? 'চলমান' : 'Active') : b.status})
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {bn ? `মোট ${batches.length}টি ব্যাচ` : `Total ${batches.length} Batches`}
            </span>
          </div>

          {selectedBatch && (
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Selected Batch Mini Summary Card */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedBatch.batchCode}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedBatch.shedNumber}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {bn ? `জীবিত: ${Math.max(0, selectedBatch.initialQuantity - selectedBatch.mortalityCount - selectedBatch.soldBirdsCount)}টি` : `Live: ${Math.max(0, selectedBatch.initialQuantity - selectedBatch.mortalityCount - selectedBatch.soldBirdsCount)}`}
                </span>
              </div>

              {/* Delete Batch Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  triggerConfirmDelete({
                    title: bn ? 'পোল্ট্রি ব্যাচ ডিলিট নিশ্চিতকরণ' : 'Confirm Delete Batch',
                    message: bn
                      ? `আপনি কি নিশ্চিতভাবে এই ব্যাচটি ডিলিট করতে চান? এর সাথে যুক্ত সমস্ত তথ্য মুছে যাবে।`
                      : `Are you sure you want to delete this batch? All records will be removed.`,
                    itemName: `${selectedBatch.batchCode} (${selectedBatch.shedNumber} - ${selectedBatch.chickenType})`,
                    onConfirm: async () => {
                      setIsSubmitting(true);
                      try {
                        await deletePoultryBatch(selectedBatch.id);
                        triggerGlobalToast(
                          bn ? `ব্যাচ ${selectedBatch.batchCode} সফলভাবে ডিলিট করা হয়েছে!` : `Batch ${selectedBatch.batchCode} deleted!`,
                          'delete'
                        );
                        notify(bn ? `ব্যাচ ${selectedBatch.batchCode} ডিলিট সম্পন্ন!` : `Batch deleted!`);
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
                <span>{bn ? 'ব্যাচ মুছুন' : 'Delete'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          7-STEP MODULE NAVIGATION TABS (A to G)
         ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          {
            id: 'A_BATCH' as PoultrySubTab,
            step: 'A',
            titleEn: 'Batch Setup',
            subEn: 'Chick Procurement',
            icon: Bird,
          },
          {
            id: 'B_MORTALITY' as PoultrySubTab,
            step: 'B',
            titleEn: 'Daily Mortality',
            subEn: 'Health & Stock',
            icon: HeartPulse,
          },
          {
            id: 'C_FEED' as PoultrySubTab,
            step: 'C',
            titleEn: 'Feed & Stock',
            subEn: 'Inventory & Issue',
            icon: Package,
          },
          {
            id: 'D_MEDICINE' as PoultrySubTab,
            step: 'D',
            titleEn: 'Medicine & Vaccine',
            subEn: 'Treatment & Booster',
            icon: Syringe,
          },
          {
            id: 'E_EXPENSES' as PoultrySubTab,
            step: 'E',
            titleEn: 'Utilities & Overhead',
            subEn: 'Labor & Shared Shed',
            icon: Zap,
          },
          {
            id: 'F_SALES' as PoultrySubTab,
            step: 'F',
            titleEn: 'Graded Sales',
            subEn: 'Weight & Size Revenue',
            icon: Scale,
          },
          {
            id: 'G_REPORT' as PoultrySubTab,
            step: 'G',
            titleEn: 'Financial Report',
            subEn: 'Lifetime Batch P&L',
            icon: FileSpreadsheet,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                active
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span
                  className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
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
          TAB A: Chick Procurement & Batch Initialization
         ===================================================================== */}
      {activeSubTab === 'A_BATCH' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Form to Buy New Chicks & Create Batch */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              {bn ? 'A. নতুন মুরগির বাচ্চা কেনা (Create New Poultry Batch)' : 'A. Buy Day-Old Chicks & Initialize Batch'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {bn ? 'নতুন বাচ্চা কিনলে একটি ইউনিক Batch ID তৈরি হবে এবং মোট ক্রয়মূল্য স্বয়ংক্রিয়ভাবে হিসাব হবে।' : 'Creates a unique Batch ID in the double-entry ledger and recalculates initial asset cost.'}
            </p>

            <form onSubmit={handleCreateBatchA} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'ব্যাচ আইডি (Batch ID) *' : 'Batch ID *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={aBatchCode}
                    onChange={(e) => setABatchCode(e.target.value)}
                    placeholder="POL-2026-001"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'কেনার তারিখ (Purchase Date) *' : 'Purchase Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={aPurchaseDate}
                    onChange={(e) => setAPurchaseDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'মুরগির ধরন (Chicken Type)' : 'Chicken Breed/Type'}
                  </label>
                  <select
                    value={aChickenType}
                    onChange={(e) =>
                      setAChickenType(
                        e.target.value as 'Broiler' | 'Layer' | 'Sonali' | 'Deshi' | 'Breeder'
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="Broiler">{bn ? "Broiler (ব্রয়লার)" : "Broiler"}</option>
                    <option value="Sonali">{bn ? "Sonali (সোনালী)" : "Sonali"}</option>
                    <option value="Layer">{bn ? "Layer (লেয়ার - ডিমের মুরগি)" : "Layer (Egg Production)"}</option>
                    <option value="Deshi">{bn ? "Deshi (দেশি মুরগি)" : "Deshi / Indigenous"}</option>
                    <option value="Breeder">{bn ? "Breeder (ব্রিডার)" : "Breeder"}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'শেড নম্বর (Shed No) *' : 'Farm / Shed Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={aShed}
                    onChange={(e) => setAShed(e.target.value)}
                    placeholder="Shed-01"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'বাচ্চার সংখ্যা (Quantity) *' : 'Chick Quantity *'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={aInitialQty === 0 ? '' : aInitialQty}
                    onChange={(e) => setAInitialQty(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'প্রতি বাচ্চার দাম (৳) *' : 'Price per Chick (৳) *'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={aPricePerChick === 0 ? '' : aPricePerChick}
                    onChange={(e) => setAPricePerChick(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    {bn ? 'মোট ক্রয়মূল্য (Auto)' : 'Total Chick Cost (Auto)'}
                  </label>
                  <div className="w-full rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    {formatBDT(aTotalChickCost)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'হ্যাচারি / সাপ্লায়ার (Supplier) *' : 'Hatchery / Chick Supplier *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={aSupplier}
                    onChange={(e) => setASupplier(e.target.value)}
                    placeholder="ABC Poultry"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'প্রাথমিক অবস্থা (Status)' : 'Initial Status'}
                  </label>
                  <select
                    value={aStatus}
                    onChange={(e) =>
                      setAStatus(e.target.value as 'active' | 'harvested' | 'closed')
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="active">{bn ? "Active (চলমান ব্যাচ)" : "Active Batch"}</option>
                    <option value="harvested">{bn ? "Harvested (বিক্রি সম্পন্ন)" : "Harvested"}</option>
                    <option value="closed">{bn ? "Closed (বন্ধ)" : "Closed"}</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>{bn ? 'ব্যাচ সেভ করা হচ্ছে...' : 'Saving Batch...'}</span>
                  </>
                ) : (
                  <span>{bn ? `+ নতুন মুরগির ব্যাচ সেভ করুন (Save Batch ${aBatchCode})` : `+ Save New Poultry Batch (${aBatchCode})`}</span>
                )}
              </button>
            </form>
          </div>

          {/* Right: Selected Batch Information Card (Exact Table from User Prompt) */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Batch Information — {selectedBatch?.batchCode || 'N/A'}
                </h3>
                <p className="text-xs text-slate-500">
                  Selected batch chick procurement and shed details
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                {selectedBatch?.status.toUpperCase()}
              </span>
            </div>

            {selectedBatch ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                      <th className="py-2.5 px-4 w-1/2">Metric / Field</th>
                      <th className="py-2.5 px-4">Value / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        Batch ID
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {selectedBatch.batchCode}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        Purchase Date
                      </td>
                      <td className="py-2.5 px-4 font-mono">{selectedBatch.chickPurchaseDate}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        Chicken Breed / Type
                      </td>
                      <td className="py-2.5 px-4 font-semibold">{selectedBatch.chickenType}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        Initial Chick Quantity
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold">
                        {selectedBatch.initialQuantity.toLocaleString()} Birds
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        Price per Chick
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        {selectedBatch.initialQuantity > 0
                          ? formatBDT(
                              Math.round(
                                selectedBatch.purchaseCost / selectedBatch.initialQuantity
                              )
                            )
                          : '৳0'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        Total Chick Cost
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatBDT(selectedBatch.purchaseCost)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        Supplier
                      </td>
                      <td className="py-2.5 px-4">{selectedBatch.supplierName}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        Farm / Shed
                      </td>
                      <td className="py-2.5 px-4 font-semibold">{selectedBatch.shedNumber}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        Initial Status
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-600">
                        {selectedBatch.status === 'active'
                          ? 'Active'
                          : selectedBatch.status === 'harvested'
                          ? 'Harvested'
                          : 'Closed'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-12 text-center space-y-2">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'কোনো সক্রিয় ব্যাচ নেই।' : 'No poultry batches created yet.'}
                </p>
                <p className="text-slate-400">
                  {bn ? 'বাম পাশের ফর্ম পূরণ করে আপনার প্রথম মুরগির ব্যাচ তৈরি করুন।' : 'Use the form on the left to initialize your first poultry batch.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB B: Daily Flock Mortality & Stock Tracking
         ===================================================================== */}
      {activeSubTab === 'B_MORTALITY' && (
        <div className="space-y-6">
          {/* 3 Big Poultry Stock Tracking Cards (Exact structure from user prompt) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="text-xs font-semibold text-slate-500">
                Poultry Stock Tracking — {selectedBatch?.batchCode}
              </div>
              <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {batchInitial.toLocaleString()}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {bn ? 'প্রাথমিক সংখ্যা (Initial Birds)' : 'Initial Birds'}
              </div>
            </div>

            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 p-5">
              <div className="flex items-center justify-between text-xs font-semibold text-red-600 dark:text-red-400">
                <span>{bn ? `মৃত্যুর হার: ${batchMortalityRate}%` : `Mortality Rate: ${batchMortalityRate}%`}</span>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
                {batchDead.toLocaleString()}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {bn ? `মৃত মুরগি (Total Dead Birds) · অসুস্থ: ${selectedBatch?.sickBirdsCount || 0}টি` : `Total Dead Birds · Sick: ${selectedBatch?.sickBirdsCount || 0}`}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-5">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <span>{bn ? `বিক্রিত মুরগি: ${batchSold}টি` : `Sold Birds: ${batchSold}`}</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {batchAlive.toLocaleString()}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {bn ? 'বর্তমানে জীবিত মুরগি (Currently Alive in Shed)' : 'Currently Live in Shed'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Daily Employee Entry Form */}
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {bn ? 'B. প্রতিদিনের মৃত্যু ও অসুস্থ মুরগির হিসাব (Daily Employee Log)' : 'B. Daily Flock Mortality & Health Tracker'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {bn ? 'কর্মচারী শুধু আজকের তথ্য লিখবে—সিস্টেম নিজে জীবিত মুরগির সংখ্যা ও মৃত্যুর হার আপডেট করবে।' : 'Log daily mortality; the system updates live bird counts and shed health logs in real time.'}
              </p>

              <form onSubmit={handleRecordMortalityB} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {bn ? 'তারিখ (Date) *' : 'Entry Date *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={bDate}
                      onChange={(e) => setBDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {bn ? 'কোন ব্যাচ (Selected Batch)' : 'Active Batch'}
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${selectedBatch?.batchCode || ''} (${selectedBatch?.shedNumber || ''})`}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-red-600 dark:text-red-400 mb-1">
                      {bn ? 'আজ কতটি মারা গেছে (Dead Today) *' : 'Dead Today (Count) *'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      placeholder="0"
                      value={bDeadToday === 0 ? '' : bDeadToday}
                      onChange={(e) => setBDeadToday(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-amber-600 dark:text-amber-400 mb-1">
                      {bn ? 'বর্তমানে অসুস্থ মুরগির সংখ্যা (Sick Birds) *' : 'Sick / Quarantined Birds *'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      placeholder="0"
                      value={bSickToday === 0 ? '' : bSickToday}
                      onChange={(e) => setBSickToday(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'মৃত্যুর কারণ (Cause of Death) *' : 'Cause of Death *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={bCause}
                    onChange={(e) => setBCause(e.target.value)}
                    placeholder={bn ? "যেমন: হিট স্ট্রোক, ঠান্ডা/CRD, দুর্বল বাচ্চা" : "e.g. Heat stress, respiratory/CRD, brooding weakness"}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'চিকিৎসা বা করণীয় (Treatment / Action Taken) *' : 'Treatment / Action Taken *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={bTreatment}
                    onChange={(e) => setBTreatment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'দায়িত্বপ্রাপ্ত কর্মচারী (Responsible Employee) *' : 'Responsible Farm Worker *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={bEmployee}
                    onChange={(e) => setBEmployee(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedBatch}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>{bn ? 'তথ্য আপডেট করা হচ্ছে...' : 'Updating Records...'}</span>
                    </>
                  ) : (
                    <span>{bn ? 'আজকের মৃত্যু ও স্বাস্থ্য তথ্য আপডেট করুন' : 'Update Daily Mortality & Health Log'}</span>
                  )}
                </button>
              </form>
            </div>

            {/* Right: Shed & Batch Mortality Rate Comparison Report */}
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {bn ? 'বিশেষ রিপোর্ট: কোন ব্যাচে ও কোন শেডে মৃত্যুর হার কেমন?' : 'Comparative Flock Mortality Report by Shed'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  {bn ? 'ব্যাচ ও শেড অনুযায়ী প্রাথমিক সংখ্যা, মৃত মুরগি, জীবিত মুরগি এবং মৃত্যুর হার (%)' : 'Initial count, mortality, live population and mortality rate across active sheds'}
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 font-bold">
                        <th className="py-2.5 px-3">{bn ? "Batch ID ও Shed" : "Batch ID & Shed"}</th>
                        <th className="py-2.5 px-3 text-right">{bn ? "শুরুতে" : "Initial"}</th>
                        <th className="py-2.5 px-3 text-right">{bn ? "মৃত" : "Dead"}</th>
                        <th className="py-2.5 px-3 text-right">{bn ? "জীবিত" : "Live Count"}</th>
                        <th className="py-2.5 px-3 text-right">{bn ? "মৃত্যুর হার (%)" : "Mortality Rate"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {batches.map((b) => {
                        const alive = Math.max(
                          0,
                          b.initialQuantity - b.mortalityCount - b.soldBirdsCount
                        );
                        const rate =
                          b.initialQuantity > 0
                            ? ((b.mortalityCount / b.initialQuantity) * 100).toFixed(2)
                            : '0.00';
                        const isHigh = Number(rate) > 3.0;
                        return (
                          <tr key={b.id}>
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-bold">{b.batchCode}</div>
                              <div className="text-slate-500">{b.shedNumber}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              {b.initialQuantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                              {b.mortalityCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                              {alive}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              <span
                                className={`px-2 py-0.5 rounded font-bold ${
                                  isHigh
                                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}
                              >
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Daily Mortality Log Entries */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Daily Mortality & Health Log History
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                  {mortalityLogs.length === 0 ? (
                    <div className="text-slate-500 py-3">
                      Enter daily mortality records using the form on the left to maintain an audited daily mortality log.
                    </div>
                  ) : (
                    mortalityLogs.slice(0, 8).map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                      >
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {log.details}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB C: Feed Inventory & Batch Consumption
         ===================================================================== */}
      {activeSubTab === 'C_FEED' && (
        <div className="space-y-6">
          {/* Feed Stock Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">Current Feed Stock in Warehouse</div>
              <div className="mt-1 text-2xl font-bold font-mono text-emerald-600">
                {feedItems.reduce((s, i) => s + i.quantity, 0)} Bags
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Total {(feedItems.reduce((s, i) => s + i.quantity, 0) * 50).toLocaleString()} KG (@ 50 KG/bag)
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">
                {selectedBatch?.batchCode} — Total Feed Consumed
              </div>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {(
                  (selectedBatch?.starterFeedKg || 0) +
                  (selectedBatch?.growerFeedKg || 0) +
                  (selectedBatch?.finisherFeedKg || 0)
                ).toLocaleString()}{' '}
                KG
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Starter: {selectedBatch?.starterFeedKg || 0}kg · Grower:{' '}
                {selectedBatch?.growerFeedKg || 0}kg · Finisher:{' '}
                {selectedBatch?.finisherFeedKg || 0}kg
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">
                {selectedBatch?.batchCode} — Total Feed Cost
              </div>
              <div className="mt-1 text-2xl font-bold font-mono text-amber-600">
                {formatBDT(selectedBatch?.feedCost || 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Feed Cost per Bird:{' '}
                {batchInitial > 0
                  ? formatBDT(Math.round((selectedBatch?.feedCost || 0) / batchInitial))
                  : '৳0'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">Total Feed Inventory Valuation</div>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatBDT(feedItems.reduce((s, i) => s + i.quantity * i.unitCost, 0))}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Current Market Value
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Buy Feed Bags into Stock */}
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                1. Purchase Feed into Warehouse Inventory
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                e.g. 50 bags × ৳2,500 = ৳1,25,000 added to inventory stock.
              </p>

              <form onSubmit={handlePurchaseFeedC} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Feed Stage
                    </label>
                    <select
                      value={cFeedType}
                      onChange={(e) =>
                        setCFeedType(
                          e.target.value as 'Starter Feed' | 'Grower Feed' | 'Finisher Feed'
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    >
                      <option value="Starter Feed">Starter Feed (0-14 Days)</option>
                      <option value="Grower Feed">Grower Feed (15-28 Days)</option>
                      <option value="Finisher Feed">Finisher Feed (29+ Days)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Feed Supplier Mill *
                    </label>
                    <input
                      type="text"
                      required
                      value={cFeedSupplier}
                      onChange={(e) => setCFeedSupplier(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Bag Quantity *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="0"
                      value={cBagsCount === 0 ? '' : cBagsCount}
                      onChange={(e) => setCBagsCount(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Price per Bag (৳) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="0"
                      value={cPricePerBag === 0 ? '' : cPricePerBag}
                      onChange={(e) => setCPricePerBag(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                      Total Cost (Auto)
                    </label>
                    <div className="w-full rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                      {formatBDT(cBagsCount * cPricePerBag)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Warehouse Location
                  </label>
                  <input
                    type="text"
                    value={cWarehouse}
                    onChange={(e) => setCWarehouse(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>Adding Feed to Stock...</span>
                    </>
                  ) : (
                    <span>+ Add {cBagsCount} Feed Bags to Stock</span>
                  )}
                </button>
              </form>
            </div>

            {/* Right: Daily Feed Consumption Linked to Batch */}
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                2. Dispense Daily Feed to {selectedBatch?.batchCode}
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Issuing feed automatically deducts from warehouse stock (e.g. 50 - 3 = 47 bags) and allocates production cost to{' '}
                <span className="font-mono font-bold">{selectedBatch?.batchCode}</span>.
              </p>

              <form onSubmit={handleDailyFeedUsageC} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Usage Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={cUseDate}
                      onChange={(e) => setCUseDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Feed Type
                    </label>
                    <select
                      value={cUseFeedStage}
                      onChange={(e) =>
                        setCUseFeedStage(e.target.value as 'starter' | 'grower' | 'finisher')
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    >
                      <option value="starter">Starter Feed</option>
                      <option value="grower">Grower Feed</option>
                      <option value="finisher">Finisher Feed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Source Feed Warehouse Stock
                  </label>
                  <select
                    value={cUseInventoryId}
                    onChange={(e) => setCUseInventoryId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    {feedItems.map((fi) => (
                      <option key={fi.id} value={fi.id}>
                        {fi.name} — Current Stock: {fi.quantity} {fi.unit} (@ ৳{fi.unitCost}/bag |{' '}
                        {fi.supplierName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {bn ? 'আজ কয় বস্তা ব্যবহার হয়েছে (Bags Used Today) *' : 'Bags Dispensed Today *'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="0"
                      value={cUseBags === 0 ? '' : cUseBags}
                      onChange={(e) => setCUseBags(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {bn ? 'প্রতি বস্তার ওজন (কেজি)' : 'Weight per Bag (KG)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      placeholder="0"
                      value={cBagWeightKg === 0 ? '' : cBagWeightKg}
                      onChange={(e) => setCBagWeightKg(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedBatch}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>{bn ? 'খাবার ব্যবহার রেকর্ড করা হচ্ছে...' : 'Recording Feed Usage...'}</span>
                    </>
                  ) : (
                    <span>{bn ? `খাবার ব্যবহার রেকর্ড করুন (${cUseBags} বস্তা = ${cUseBags * cBagWeightKg} কেজি)` : `Record Feed Usage (${cUseBags} Bags = ${cUseBags * cBagWeightKg} KG)`}</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Current Feed Inventory Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200">
              {bn ? 'খাবারের বর্তমান স্টক ও সাপ্লায়ার তালিকা (Feed Stock & Price History)' : 'Warehouse Feed Stock & Supplier Price History'}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold">
                    <th className="py-2.5 px-4">{bn ? "খাবারের নাম (Feed Name)" : "Feed Name / SKU"}</th>
                    <th className="py-2.5 px-4">Supplier</th>
                    <th className="py-2.5 px-4 text-right">{bn ? "প্রতি বস্তার দাম" : "Unit Cost (৳)"}</th>
                    <th className="py-2.5 px-4 text-right">{bn ? "বর্তমান অবশিষ্ট বস্তা" : "Available Bags"}</th>
                    <th className="py-2.5 px-4 text-right">{bn ? "মোট স্টক মূল্য" : "Total Valuation"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {feedItems.map((fi) => (
                    <tr key={fi.id}>
                      <td className="py-2.5 px-4 font-semibold">{fi.name}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {fi.supplierName}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {formatBDT(fi.unitCost)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                        {fi.quantity} {fi.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        {formatBDT(fi.quantity * fi.unitCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB D: Medicine, Vaccine & Treatment Reminders
         ===================================================================== */}
      {activeSubTab === 'D_MEDICINE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Buy Medicine / Vaccine */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {bn ? '১. ওষুধ ও ভ্যাকসিন ক্রয় (Purchase Medicine & Vaccine)' : '1. Purchase Medicine & Vaccines'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {bn ? 'ওষুধের নাম, ক্যাটাগরি, ক্রয়মূল্য এবং মেয়াদ উত্তীর্ণের তারিখ (Expiry Date) সংরক্ষণ করুন।' : 'Record veterinary medicines, vaccines, doses and expiration dates into clinic stock.'}
            </p>

            <form onSubmit={handleBuyMedicineD} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'ওষুধ বা ভ্যাকসিনের নাম *' : 'Medicine or Vaccine Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={dMedName}
                    onChange={(e) => setDMedName(e.target.value)}
                    placeholder="Vaccine A / Medicine B / Vitamin C"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'ক্যাটাগরি (Category)' : 'Category'}
                  </label>
                  <select
                    value={dMedCategory}
                    onChange={(e) => setDMedCategory(e.target.value as 'vaccine' | 'medicine')}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="vaccine">{bn ? "Vaccine (টিকা / ভ্যাকসিন)" : "Vaccine"}</option>
                    <option value="medicine">{bn ? "Medicine / Vitamin (ওষুধ ও ভিটামিন)" : "Medicine / Vitamin"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'পরিমাণ (Vial/Pack) *' : 'Quantity (Vial/Pack) *'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={dMedQty === 0 ? '' : dMedQty}
                    onChange={(e) => setDMedQty(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'একক দাম (৳) *' : 'Unit Cost (৳) *'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={dMedUnitCost === 0 ? '' : dMedUnitCost}
                    onChange={(e) => setDMedUnitCost(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dMedExpiry}
                    onChange={(e) => setDMedExpiry(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {bn ? 'সাপ্লায়ার (কোম্পানি / ফার্মেসি)' : 'Supplier (Pharma/Dealer)'}
                </label>
                <input
                  type="text"
                  value={dMedSupplier}
                  onChange={(e) => setDMedSupplier(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>{bn ? 'ওষুধ স্টকে যোগ হচ্ছে...' : 'Adding to Medicine Stock...'}</span>
                  </>
                ) : (
                  <span>{bn ? `+ ওষুধ/ভ্যাকসিন স্টকে যোগ করুন (মোট ${formatBDT(dMedQty * dMedUnitCost)})` : `+ Add to Stock (${formatBDT(dMedQty * dMedUnitCost)})`}</span>
                )}
              </button>
            </form>

            {/* Current Medicine Stock Table */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {bn ? 'ওষুধ ও ভ্যাকসিনের বর্তমান Stock এবং Expiry Date' : 'Current Veterinary Stock & Expiry Schedule'}
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                {medItems.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Expiry: <span className="font-mono font-semibold">{m.expiryDate}</span> ·{' '}
                        {m.supplierName}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-emerald-600">
                        {bn ? `অবশিষ্ট: ${m.quantity} ${m.unit}` : `In Stock: ${m.quantity} ${m.unit}`}
                      </div>
                      <div className="text-[11px] text-slate-500">@ {formatBDT(m.unitCost)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Apply Medicine/Vaccine to Selected Batch & Set Reminder */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {bn ? `২. ব্যাচে ওষুধ/ভ্যাকসিন প্রয়োগ ও Reminder (${selectedBatch?.batchCode})` : `2. Administer Treatment & Schedule Booster Reminder (${selectedBatch?.batchCode})`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {bn ? 'যেমন: Vaccine A (২,০০০ টাকা - ১ ব্যাচ), Medicine B (১,৫০০ টাকা - ৩ দিন), Vitamin C (১,০০০ টাকা - ৫ দিন)' : 'Record specific vaccine doses, medication treatment regimens, and schedule automated booster reminders.'}
            </p>

            <form onSubmit={handleApplyMedicineD} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {bn ? 'স্টক থেকে ওষুধ সিলেক্ট করুন (অথবা নিচে নাম লিখুন)' : 'Select from Clinic Stock or Enter Custom'}
                </label>
                <select
                  value={dApplyMedId}
                  onChange={(e) => {
                    setDApplyMedId(e.target.value);
                    const found = medItems.find((m) => m.id === e.target.value);
                    if (found) {
                      setDApplyName(found.name);
                      setDApplyCost(found.unitCost);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                >
                  <option value="">{bn ? "-- কাস্টম ওষুধ / ভ্যাকসিন --" : "-- Custom Medicine / Vaccine --"}</option>
                  {medItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Available: {m.quantity} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'ওষুধের নাম (Medicine/Vaccine Name) *' : 'Treatment Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={dApplyName}
                    onChange={(e) => setDApplyName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'ব্যবহারের মেয়াদ / পরিমাণ (Usage) *' : 'Duration / Dosage *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={dApplyDuration}
                    onChange={(e) => setDApplyDuration(e.target.value)}
                    placeholder={bn ? "যেমন: ১ ব্যাচ / ৩ দিন / ৫ দিন" : "e.g. 1 Batch / 3 Days / 5 Days Course"}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'ওষুধের খরচ (টাকা) *' : 'Medication Cost (৳) *'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="0"
                    value={dApplyCost === 0 ? '' : dApplyCost}
                    onChange={(e) => setDApplyCost(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    {bn ? 'পরবর্তী ভ্যাকসিন দেওয়ার তারিখের Reminder' : 'Booster / Next Reminder Date'}
                  </label>
                  <input
                    type="date"
                    value={dNextReminderDate}
                    onChange={(e) => setDNextReminderDate(e.target.value)}
                    className="w-full rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/30 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {bn ? 'চিকিৎসার নোট (Treatment Notes) *' : 'Veterinary & Treatment Notes *'}
                </label>
                <input
                  type="text"
                  required
                  value={dApplyNote}
                  onChange={(e) => setDApplyNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedBatch}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>{bn ? 'চিকিৎসা খরচ সেভ হচ্ছে...' : 'Saving Treatment...'}</span>
                  </>
                ) : (
                  <span>{bn ? `ব্যাচে ওষুধের খরচ (${formatBDT(dApplyCost)}) ও ভ্যাকসিন রিমাইন্ডার সেভ করুন` : `Save Treatment Cost (${formatBDT(dApplyCost)}) & Set Reminder`}</span>
                )}
              </button>
            </form>

            {selectedBatch && (
              <div className="mt-5 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedBatch.batchCode} — {bn ? 'মোট ওষুধ ও ভ্যাকসিন খরচ: ' : 'Total Medicine & Vaccine Cost: '}
                  <span className="font-mono text-emerald-600">
                    {formatBDT(selectedBatch.medicineCost)}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {bn ? 'ভ্যাকসিন ও চিকিৎসা ইতিহাস: ' : 'Treatment & Vaccine History: '}{selectedBatch.vaccineScheduleNotes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB E: Utilities, Labor & Shared Overhead Allocation
         ===================================================================== */}
      {activeSubTab === 'E_EXPENSES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {bn ? 'E. বিদ্যুৎ, গ্যাস, কর্মচারী ও অন্যান্য খরচ (Utilities, Staff & Shared Shed Allocation)' : 'E. Utilities, Labor & Shared Overhead Allocation'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {bn ? 'বিদ্যুৎ বিলের মতো যৌথ খরচ একটি নির্দিষ্ট শেডে অথবা একাধিক শেডে কী নিয়মে ভাগ হয়েছে তা সহ সংরক্ষণ করুন।' : 'Record shared shed expenses with cost-allocation rules (single shed, equal split, or bird-count ratio).'}
            </p>

            <form onSubmit={handleRecordOverheadExpenseE} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'খরচের ধরন (Expense Category) *' : 'Expense Category *'}
                  </label>
                  <select
                    value={eExpenseType}
                    onChange={(e) => setEExpenseType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-semibold"
                  >
                    <option value="Electricity Bill">{bn ? "বিদ্যুৎ বিল (Electricity Bill)" : "Electricity Bill"}</option>
                    <option value="Staff Salary">{bn ? "কর্মচারীর বেতন (Staff Salary)" : "Staff Salary & Wages"}</option>
                    <option value="Water & Gas Bill">{bn ? "পানি ও গ্যাস বিল (Water & Gas Bill)" : "Water & Gas Bill"}</option>
                    <option value="Transport">{bn ? "পরিবহন খরচ (Transport)" : "Fleet & Transport"}</option>
                    <option value="Disinfectant & Litter">{bn ? "জীবাণুনাশক ও লিটার/তুষ (Disinfectant)" : "Disinfectant & Litter"}</option>
                    <option value="Other Farm Expense">{bn ? "অন্যান্য খামার খরচ (Other Expense)" : "Other Farm Expense"}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'টাকার পরিমাণ (Amount ৳) *' : 'Amount (৳) *'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={eAmount === 0 ? '' : eAmount}
                    onChange={(e) => setEAmount(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold text-base"
                  />
                </div>
              </div>

              {/* Shared Shed Cost Allocation Rule */}
              <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                <label className="block font-bold text-slate-900 dark:text-slate-100">
                  {bn ? 'একাধিক শেডে বা ব্যাচে খরচ ভাগের নিয়ম (Cost Allocation Rule):' : 'Cost Allocation Method:'}
                </label>
                <select
                  value={eAllocationRule}
                  onChange={(e) =>
                    setEAllocationRule(
                      e.target.value as
                        | 'single_batch'
                        | 'equal_all_sheds'
                        | 'proportional_birds'
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-semibold"
                >
                  <option value="single_batch">
                    {bn ? '১. শুধুমাত্র সিলেক্ট করা ব্যাচ/শেডের খরচ' : '1. Allocate 100% to this active batch'} ({selectedBatch?.batchCode} -{' '}
                    {selectedBatch?.shedNumber})
                  </option>
                  <option value="equal_all_sheds">
                    {bn ? '২. সকল চলমান শেডে সমানভাবে ভাগ' : '2. Equal split across all active batches'}
                  </option>
                  <option value="proportional_birds">
                    {bn ? '৩. শেডের জীবিত মুরগির সংখ্যার অনুপাতে ভাগ' : '3. Proportional split by live bird population'}
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={eDate}
                    onChange={(e) => setEDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'কে খরচ করেছে (Spent By) *' : 'Disbursed By *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={eSpentBy}
                    onChange={(e) => setESpentBy(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'কাকে টাকা দেওয়া হয়েছে (Paid To) *' : 'Recipient / Vendor *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ePaidTo}
                    onChange={(e) => setEPaidTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'বিল বা রসিদ রেফারেন্স (Receipt / Bill No)' : 'Receipt / Voucher Reference'}
                  </label>
                  <input
                    type="text"
                    value={eReceiptRef}
                    onChange={(e) => setEReceiptRef(e.target.value)}
                    placeholder="BILL-2026-1109"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {bn ? 'পেমেন্ট মাধ্যম (Payment Method)' : 'Payment Method'}
                  </label>
                  <select
                    value={ePaymentMethod}
                    onChange={(e) =>
                      setEPaymentMethod(e.target.value as 'Cash' | 'Bank' | 'Mobile Banking')
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="Cash">{bn ? "Cash (নগদ ক্যাশ)" : "Cash"}</option>
                    <option value="Bank">{bn ? "Bank Account (ব্যাংক চেক/ট্রান্সফার)" : "Bank Account"}</option>
                    <option value="Mobile Banking">{bn ? "Mobile Banking (বিকাশ / নগদ)" : "Mobile Banking"}</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedBatch}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>{bn ? 'খরচ রেকর্ড করা হচ্ছে...' : 'Recording Expense...'}</span>
                  </>
                ) : (
                  <span>{bn ? `+ খরচ রেকর্ড করুন (${eExpenseType} — ${formatBDT(eAmount)})` : `+ Record Expense (${eExpenseType} — ${formatBDT(eAmount)})`}</span>
                )}
              </button>
            </form>
          </div>

          {/* Right: Summary of Overhead Expenses for Selected Batch */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {selectedBatch?.batchCode} — {bn ? 'অন্যান্য খরচের সারসংক্ষেপ' : 'Overhead Expenses Summary'}
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-2.5 px-4">{bn ? "খরচের ধরন" : "Expense Head"}</th>
                    <th className="py-2.5 px-4 text-right">{bn ? "টাকার পরিমাণ" : "Amount (BDT)"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 px-4">{bn ? "কর্মচারী বেতন, বিদ্যুৎ ও পানি বিল" : "Salaries, Electricity & Water Bills"}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(selectedBatch?.labourAndUtilityCost || 0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">{bn ? "পরিবহন, জীবাণুনাশক ও অন্যান্য খরচ" : "Transport, Litter, Disinfectant & Other"}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(selectedBatch?.otherExpense || 0)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold">
                    <td className="py-2.5 px-4">{bn ? "মোট পরিচালনা ও ইউটিলিটি খরচ" : "Total Overhead & Utilities"}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-amber-600">
                      {formatBDT(
                        (selectedBatch?.labourAndUtilityCost || 0) +
                          (selectedBatch?.otherExpense || 0)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB F: Multi-Grade Sales Management
         ===================================================================== */}
      {activeSubTab === 'F_SALES' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {bn ? `F. সাইজ ও ওজন অনুযায়ী আলাদা গ্রেডে মুরগি বিক্রির হিসাব (${selectedBatch?.batchCode})` : `F. Multi-Grade Bird Sales Calculator (${selectedBatch?.batchCode})`}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Birds vary in weight — calculate and record quantity, weight, and rate per KG separately across Small, Medium, Large, and Extra Large grades.
              </p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
              <span className="text-slate-600 dark:text-slate-400">{bn ? "ব্যাচে বর্তমানে জীবিত মুরগি: " : "Current Live Birds in Batch: "}</span>
              <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400">
                {batchAlive} Birds
              </span>
            </div>
          </div>

          <form onSubmit={handleGradedSalesF} className="space-y-6 text-xs">
            {/* Multi-Grade Calculator Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                    <th className="py-3 px-4">{bn ? "গ্রেড (Size Grade)" : "Size Grade"}</th>
                    <th className="py-3 px-4">{bn ? "মুরগির সংখ্যা (Birds Count)" : "Bird Count"}</th>
                    <th className="py-3 px-4">{bn ? "মোট ওজন (Total Weight KG)" : "Total Weight (KG)"}</th>
                    <th className="py-3 px-4">{bn ? "প্রতি কেজি দাম (Price/KG ৳)" : "Rate / KG (৳)"}</th>
                    <th className="py-3 px-4 text-right">{bn ? "মোট বিক্রয়মূল্য (Grade Total)" : "Revenue (BDT)"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {/* Small Grade */}
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {bn ? 'Small (ছোট সাইজ)' : 'Small Grade'}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={gradeSmallBirds === 0 ? '' : gradeSmallBirds}
                        onChange={(e) => setGradeSmallBirds(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        placeholder="0"
                        value={gradeSmallKg === 0 ? '' : gradeSmallKg}
                        onChange={(e) => setGradeSmallKg(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={gradeSmallPrice === 0 ? '' : gradeSmallPrice}
                        onChange={(e) => setGradeSmallPrice(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatBDT(smallTotal)}
                    </td>
                  </tr>

                  {/* Medium Grade */}
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {bn ? 'Medium (মাঝারি সাইজ)' : 'Medium Grade'}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={gradeMedBirds === 0 ? '' : gradeMedBirds}
                        onChange={(e) => setGradeMedBirds(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        placeholder="0"
                        value={gradeMedKg === 0 ? '' : gradeMedKg}
                        onChange={(e) => setGradeMedKg(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={gradeMedPrice === 0 ? '' : gradeMedPrice}
                        onChange={(e) => setGradeMedPrice(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatBDT(medTotal)}
                    </td>
                  </tr>

                  {/* Large Grade */}
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {bn ? 'Large (বড় সাইজ)' : 'Large Grade'}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={gradeLargeBirds === 0 ? '' : gradeLargeBirds}
                        onChange={(e) => setGradeLargeBirds(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        placeholder="0"
                        value={gradeLargeKg === 0 ? '' : gradeLargeKg}
                        onChange={(e) => setGradeLargeKg(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={gradeLargePrice === 0 ? '' : gradeLargePrice}
                        onChange={(e) => setGradeLargePrice(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatBDT(largeTotal)}
                    </td>
                  </tr>

                  {/* Extra Large Grade */}
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {bn ? 'Extra Large (এক্সট্রা লার্জ)' : 'Extra Large Grade'}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={gradeXlBirds === 0 ? '' : gradeXlBirds}
                        onChange={(e) => setGradeXlBirds(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        placeholder="0"
                        value={gradeXlKg === 0 ? '' : gradeXlKg}
                        onChange={(e) => setGradeXlKg(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={gradeXlPrice === 0 ? '' : gradeXlPrice}
                        onChange={(e) => setGradeXlPrice(parseNum(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatBDT(xlTotal)}
                    </td>
                  </tr>

                  {/* Total Summary Row */}
                  <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-bold text-sm">
                    <td className="py-3.5 px-4 text-emerald-900 dark:text-emerald-200">
                      Total Invoice Summary
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-800 dark:text-emerald-300">
                      {totalGradedBirds} Birds
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-800 dark:text-emerald-300">
                      {totalGradedKg} KG
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-800 dark:text-emerald-300">
                      Avg ৳{avgGradedPricePerKg}/KG
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-base text-emerald-700 dark:text-emerald-400">
                      {formatBDT(totalGradedRevenue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Buyer, Transport, Due & Payment Method Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {bn ? 'ক্রেতার নাম (Buyer Name) *' : 'Wholesale Buyer Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={fBuyerName}
                  onChange={(e) => setFBuyerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {bn ? 'বিক্রির তারিখ (Sale Date) *' : 'Sale Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={fSaleDate}
                  onChange={(e) => setFSaleDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {bn ? 'পরিবহন খরচ (Transport Cost ৳)' : 'Transport Freight Cost (৳)'}
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={fTransportCost === 0 ? '' : fTransportCost}
                  onChange={(e) => setFTransportCost(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-amber-600 dark:text-amber-400 mb-1">
                  {bn ? 'বকেয়া টাকা (Due Amount ৳)' : 'Outstanding Due (৳)'}
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={fDueAmount === 0 ? '' : fDueAmount}
                  onChange={(e) => setFDueAmount(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={fPaymentMethod}
                  onChange={(e) =>
                    setFPaymentMethod(e.target.value as 'Cash' | 'Bank' | 'Mobile Payment')
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                >
                  <option value="Cash">{bn ? "Cash (নগদ টাকা)" : "Cash"}</option>
                  <option value="Bank">{bn ? "Bank (ব্যাংক একাউন্ট)" : "Bank"}</option>
                  <option value="Mobile Payment">{bn ? "Mobile Payment (বিকাশ/নগদ)" : "Mobile Banking"}</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedBatch}
              className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>{bn ? 'বিক্রয় চালান সংরক্ষিত হচ্ছে...' : 'Saving Sales Invoice...'}</span>
                </>
              ) : (
                <span>
                  {bn ? `গ্রেডভিত্তিক বিক্রয় চালান সেভ করুন (${totalGradedBirds}টি মুরগি · ${totalGradedKg} কেজি · মোট ${formatBDT(totalGradedRevenue)})` : `Save Graded Sales Invoice (${totalGradedBirds} Birds · ${totalGradedKg} KG · Total ${formatBDT(totalGradedRevenue)})`}
                </span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB G: Comprehensive Batch Financial Report
         ===================================================================== */}
      {activeSubTab === 'G_REPORT' && selectedBatch && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Comprehensive Poultry Batch Financial Report
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  Batch {selectedBatch.batchCode} – Financial Report ({selectedBatch.shedNumber})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Procurement Date: {selectedBatch.chickPurchaseDate} · Chick Type:{' '}
                  {selectedBatch.chickenType} · Supplier: {selectedBatch.supplierName}
                </p>
              </div>

              {/* 3 Top Financial Summary Boxes */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 px-4 py-2.5 text-right">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Total Revenue
                  </div>
                  <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {formatBDT(selectedBatch.totalSalesRevenue)}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 px-4 py-2.5 text-right">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Total Production Cost
                  </div>
                  <div className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">
                    {formatBDT(batchTotalExpenses)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-emerald-600 text-white px-4 py-2.5 text-right">
                  <div className="text-[11px] font-semibold opacity-80">
                    Net Profit / Margin
                  </div>
                  <div className="text-lg font-bold font-mono">
                    {formatBDT(batchRealizedProfit)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              {/* Expense Breakdown Table */}
              <div className="lg:col-span-6 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Production Cost Breakdown
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                        <th className="py-3 px-4">Expense Head</th>
                        <th className="py-3 px-4 text-right">Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          1. Day-Old Chick Procurement ({selectedBatch.initialQuantity} chicks)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(selectedBatch.purchaseCost)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          2. Feed Consumption (Starter + Grower + Finisher:{' '}
                          {selectedBatch.starterFeedKg +
                            selectedBatch.growerFeedKg +
                            selectedBatch.finisherFeedKg}{' '}
                          KG)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(selectedBatch.feedCost)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">3. Veterinary Medicine & Vaccines</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(selectedBatch.medicineCost)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          4. Labor, Electricity & Water Overheads
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(selectedBatch.labourAndUtilityCost)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          5. Transportation, Litter & Disinfectant
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(selectedBatch.otherExpense)}
                        </td>
                      </tr>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-sm">
                        <td className="py-3 px-4">Total Operating Expenditure</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                          {formatBDT(batchTotalExpenses)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Real-World Adjustments (Unsold Birds, Remaining Feed, Customer Due) */}
              <div className="lg:col-span-6 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Farm Balance & Inventory Valuation (Live Birds, Unsold Feed & Receivables)
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                        <th className="py-3 px-4">Metric / Asset Category</th>
                        <th className="py-3 px-4 text-right">Quantity / Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          Total Sales (Birds Sold: {selectedBatch.soldBirdsCount} /{' '}
                          {selectedBatch.totalSoldKg} KG)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          {formatBDT(selectedBatch.totalSalesRevenue)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          Accounts Receivable (Customer Due)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-amber-600">
                          {formatBDT(selectedBatch.outstandingDue)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          Unsold Live Birds in Shed ({batchAlive} Birds) — Estimated Biological Asset Value
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(batchAlive * 185)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          Remaining Feed Stock in Warehouse ({feedItems.reduce((s, i) => s + i.quantity, 0)}{' '}
                          Bags)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(
                            feedItems.reduce((s, i) => s + i.quantity * i.unitCost, 0)
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          Graded Sales Breakdown
                        </td>
                        <td className="py-3 px-4 text-right text-[11px] text-slate-600 dark:text-slate-400">
                          {selectedBatch.gradeBreakdown}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-bold text-sm">
                        <td className="py-3 px-4 text-emerald-900 dark:text-emerald-200">
                          Adjusted Net Profit (Including Biological Assets)
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700 dark:text-emerald-400">
                          {formatBDT(batchRealizedProfit + batchAlive * 185)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
