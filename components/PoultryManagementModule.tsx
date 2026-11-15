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
} from '@/lib/erp-service';

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
}: PoultryManagementModuleProps) {
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
  // A. নতুন মুরগির বাচ্চা কেনা (Batch Creation State)
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
  // B. প্রতিদিনের মৃত্যু ও স্বাস্থ্য (Daily Mortality Form State)
  // ============================================================================
  const [bDate, setBDate] = useState(new Date().toISOString().split('T')[0]);
  const [bDeadToday, setBDeadToday] = useState(1);
  const [bCause, setBCause] = useState('প্রচণ্ড গরম / হিট স্ট্রোক (Heat Stress)');
  const [bSickToday, setBSickToday] = useState(4);
  const [bTreatment, setBTreatment] = useState('ইলেকট্রোলাইট ও ভিটামিন সি পানিতে মিশিয়ে দেওয়া হয়েছে');
  const [bEmployee, setBEmployee] = useState('মোঃ রফিকুল ইসলাম (শেড সুপারভাইজার)');

  // ============================================================================
  // C. খাবারের হিসাব (Feed Purchase & Daily Feed Consumption State)
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
  // D. ওষুধ, ভ্যাকসিন ও চিকিৎসা (Medicine Purchase & Usage State)
  // ============================================================================
  const [dMedName, setDMedName] = useState('Vaccine A (রানীক্ষেত বিসিআরডিভি)');
  const [dMedCategory, setDMedCategory] = useState<'vaccine' | 'medicine'>('vaccine');
  const [dMedQty, setDMedQty] = useState(10);
  const [dMedUnitCost, setDMedUnitCost] = useState(200);
  const [dMedExpiry, setDMedExpiry] = useState('2027-06-30');
  const [dMedSupplier, setDMedSupplier] = useState('ACI Animal Health');

  const [dApplyMedId, setDApplyMedId] = useState('');
  const [dApplyName, setDApplyName] = useState('Vaccine A / Medicine B');
  const [dApplyDuration, setDApplyDuration] = useState('৩ দিন (3 Days Course)');
  const [dApplyQty, setDApplyQty] = useState(1);
  const [dApplyCost, setDApplyCost] = useState(2000);
  const [dApplyNote, setDApplyNote] = useState('১ম ডোজ ভ্যাকসিন সম্পন্ন — পরবর্তী ডোজ ১৪তম দিনে');
  const [dNextReminderDate, setDNextReminderDate] = useState('2026-11-26');

  // ============================================================================
  // E. বিদ্যুৎ, গ্যাস, কর্মচারী ও অন্যান্য খরচ (Overhead & Shared Shed Allocation)
  // ============================================================================
  const [eExpenseType, setEExpenseType] = useState('বিদ্যুৎ বিল (Electricity Bill)');
  const [eAmount, setEAmount] = useState(5000);
  const [eDate, setEDate] = useState(new Date().toISOString().split('T')[0]);
  const [eAllocationRule, setEAllocationRule] = useState<
    'single_batch' | 'equal_all_sheds' | 'proportional_birds'
  >('single_batch');
  const [eSpentBy, setESpentBy] = useState('ম্যানেজার মাহমুদুল হাসান');
  const [ePaidTo, setEPaidTo] = useState('পল্লী বিদ্যুৎ সমিতি / ফার্ম স্টাফ');
  const [eReceiptRef, setEReceiptRef] = useState('BILL-2026-1109');
  const [ePaymentMethod, setEPaymentMethod] = useState<'Cash' | 'Bank' | 'Mobile Banking'>('Cash');

  // ============================================================================
  // F. গ্রেড অনুযায়ী মুরগি বিক্রি (Multi-Grade Sales Calculator State)
  // ============================================================================
  const [fBuyerName, setFBuyerName] = useState('মেসার্স বিসমিল্লাহ পোল্ট্রি আড়ত');
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
          gradeBreakdown: 'এখনো বিক্রি শুরু হয়নি',
          pricePerKg: 0,
          totalSalesRevenue: 0,
          outstandingDue: 0,
          vaccineScheduleNotes: 'প্রাথমিক ব্রুডিং পর্যায় চলমান',
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
            category: `মুরগির বাচ্চা ক্রয় (${aBatchCode})`,
            description: `${aBatchCode}: ${aInitialQty}টি ${aChickenType} বাচ্চা @ ৳${aPricePerChick} (${aShed}) - সাপ্লায়ার: ${aSupplier}`,
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

      onNotify(
        `নতুন ব্যাচ ${aBatchCode} (${aInitialQty}টি ${aChickenType} বাচ্চা, মোট ${formatBDT(aTotalChickCost)}) সফলভাবে তৈরি হয়েছে!`
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
            'Small: 200টি (300kg @৳180) | Medium: 400টি (680kg @৳190) | Large: 300টি (600kg @৳200) | XL: 94টি (220kg @৳210)',
          pricePerKg: 194,
          totalSalesRevenue: 350000,
          outstandingDue: 15000,
          vaccineScheduleNotes: 'Vaccine A (১ ব্যাচ), Medicine B (৩ দিন), Vitamin C (৫ দিন)',
          status: 'active',
        },
        ownerId,
        actorEmail
      );
      onNotify(
        'আপনার উদাহরণের ব্যাচ POL-2026-001 (১,০০০ ব্রয়লার বাচ্চা, ৬টি মৃত, ৯৯৪টি জীবিত, মোট আয় ৳৩,৫০,০০০, নিট লাভ ৳১,২৬,০০০) লোড করা হয়েছে!'
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
        details: `[${selectedBatch.batchCode} | ${selectedBatch.shedNumber}] তারিখ: ${bDate} | মৃত: ${bDeadToday}টি (মোট মৃত: ${newMortality}টি) | কারণ: ${bCause} | অসুস্থ: ${bSickToday}টি | চিকিৎসা: ${bTreatment} | দায়িত্বপ্রাপ্ত: ${bEmployee}`,
        severity: Number(bDeadToday) >= 10 ? 'warning' : 'info',
        actorEmail,
        ownerId,
      });

      onNotify(
        `${selectedBatch.batchCode}-এ আজকের মৃত্যু (${bDeadToday}টি) ও অসুস্থ (${bSickToday}টি) রেকর্ড আপডেট হয়েছে! বর্তমান জীবিত: ${
          selectedBatch.initialQuantity - newMortality - selectedBatch.soldBirdsCount
        }টি।`
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
            category: `মুরগির খাবার ক্রয় (${cFeedType})`,
            description: `${cBagsCount} বস্তা ${cFeedType} @ ৳${cPricePerBag}/বস্তা (সাপ্লায়ার: ${cFeedSupplier})`,
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

      onNotify(
        `${cBagsCount} বস্তা ${cFeedType} (মোট ${formatBDT(totalCost)}) ইনভেন্টরি স্টকে যোগ হয়েছে!`
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
          `${selectedBatch.batchCode}-এ ${cUseDate} তারিখে ${cUseBags} বস্তা (${usedKg} কেজি) খাবার প্রদান`,
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

      onNotify(
        `${selectedBatch.batchCode}-এ ${cUseBags} বস্তা (${usedKg} কেজি) খাবার দেওয়া হয়েছে। স্টক থেকে ${cUseBags} বস্তা কমানো হয়েছে এবং ব্যাচের খরচে ${formatBDT(addedCost)} যুক্ত হয়েছে!`
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
      onNotify(
        `${dMedName} (${dMedQty} টি, মেয়াদ: ${dMedExpiry}) ওষুধের স্টকে যুক্ত হয়েছে!`
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
          title: `ভ্যাকসিন রিমাইন্ডার: ${selectedBatch.batchCode} (${selectedBatch.shedNumber})`.slice(
            0,
            140
          ),
          message: `${selectedBatch.batchCode}-এ পরবর্তী ভ্যাকসিন/ওষুধ (${dApplyName}) দেওয়ার নির্ধারিত তারিখ: ${dNextReminderDate}। নোট: ${dApplyNote}`.slice(
            0,
            400
          ),
          category: 'vaccination',
          priority: 'high',
          businessId: activeBusiness.id,
        });
      }

      onNotify(
        `${selectedBatch.batchCode}-এ ওষুধ/ভ্যাকসিন (${dApplyName}, খরচ ${formatBDT(Number(dApplyCost))}) যোগ হয়েছে এবং ${dNextReminderDate} তারিখের রিমাইন্ডার সেট হয়েছে!`
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
          ? `একক ব্যাচ (${selectedBatch.batchCode})`
          : eAllocationRule === 'equal_all_sheds'
          ? `${targetBatches.length}টি শেডে সমানভাবে বণ্টিত`
          : `${targetBatches.length}টি শেডে মুরগির সংখ্যার অনুপাতে বণ্টিত`;

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
            description: `${eExpenseType} | বণ্টন নিয়ম: ${ruleLabel} | খরচকারী: ${eSpentBy} | প্রাপক: ${ePaidTo} | মাধ্যম: ${ePaymentMethod}`,
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

      onNotify(
        `${eExpenseType} বাবদ ${formatBDT(totalExp)} (${ruleLabel}) সফলভাবে হিসাবভুক্ত হয়েছে!`
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
      const breakdownStr = `Small:${gradeSmallBirds}টি(${gradeSmallKg}kg@৳${gradeSmallPrice}) | Med:${gradeMedBirds}টি(${gradeMedKg}kg@৳${gradeMedPrice}) | Lrg:${gradeLargeBirds}টি(${gradeLargeKg}kg@৳${gradeLargePrice}) | XL:${gradeXlBirds}টি(${gradeXlKg}kg@৳${gradeXlPrice})`.slice(
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
            category: `গ্রেডভিত্তিক মুরগি বিক্রি (${selectedBatch.batchCode})`,
            description: `${selectedBatch.batchCode}: মোট ${totalGradedBirds}টি মুরগি (${totalGradedKg} কেজি) বিক্রি | ${breakdownStr} | পেমেন্ট: ${fPaymentMethod}`,
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

      onNotify(
        `${selectedBatch.batchCode} থেকে ৪টি গ্রেডে মোট ${totalGradedBirds}টি মুরগি (${totalGradedKg} কেজি) ${formatBDT(totalGradedRevenue)}-এ বিক্রি সম্পন্ন হয়েছে!`
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
          (l.module === 'Poultry Management' && l.details.includes('মৃত'))
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
              মুরগির বাচ্চা কেনা থেকে শুরু করে গ্রেডভিত্তিক বিক্রি ও চূড়ান্ত লাভ-ক্ষতি ট্র্যাকিং
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              যেমন ৬ মাস পরেও যদি আপনি <span className="font-mono font-bold">POL-2026-001</span> লিখে সার্চ করেন, এই ব্যাচের সম্পূর্ণ ইতিহাস নিচে দেখতে পাবেন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!batches.some((b) => b.batchCode === 'POL-2026-001') && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateExamplePol2026}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                উদাহরণ ব্যাচ (POL-2026-001) লোড করুন
              </button>
            )}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={batchSearchQuery}
                onChange={(e) => setBatchSearchQuery(e.target.value)}
                placeholder="Batch ID সার্চ করুন (যেমন POL-2026-001)..."
                className="pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Batch Selector Cards */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1">
            ব্যাচ সিলেক্ট করুন (Select Batch):
          </span>
          {filteredBatches.map((b) => {
            const isSelected = selectedBatch?.id === b.id;
            const alive = Math.max(0, b.initialQuantity - b.mortalityCount - b.soldBirdsCount);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBatchId(b.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                }`}
              >
                <span className="font-mono font-bold">{b.batchCode}</span>
                <span className="opacity-75">({b.shedNumber})</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  জীবিত: {alive}টি
                </span>
              </button>
            );
          })}
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
            titleBn: 'নতুন বাচ্চা কেনা',
            titleEn: 'Batch Setup',
            icon: Bird,
          },
          {
            id: 'B_MORTALITY' as PoultrySubTab,
            step: 'B',
            titleBn: 'মৃত্যু ও জীবিত হিসাব',
            titleEn: 'Daily Mortality',
            icon: HeartPulse,
          },
          {
            id: 'C_FEED' as PoultrySubTab,
            step: 'C',
            titleBn: 'খাবারের হিসাব ও স্টক',
            titleEn: 'Feed & Stock',
            icon: Package,
          },
          {
            id: 'D_MEDICINE' as PoultrySubTab,
            step: 'D',
            titleBn: 'ওষুধ ও ভ্যাকসিন',
            titleEn: 'Medicine & Vaccine',
            icon: Syringe,
          },
          {
            id: 'E_EXPENSES' as PoultrySubTab,
            step: 'E',
            titleBn: 'বিদ্যুৎ, বেতন ও খরচ',
            titleEn: 'Utilities & Overhead',
            icon: Zap,
          },
          {
            id: 'F_SALES' as PoultrySubTab,
            step: 'F',
            titleBn: 'গ্রেডভিত্তিক বিক্রি',
            titleEn: 'Graded Sales',
            icon: Scale,
          },
          {
            id: 'G_REPORT' as PoultrySubTab,
            step: 'G',
            titleBn: 'চূড়ান্ত লাভ-ক্ষতি',
            titleEn: 'Financial Report',
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
          TAB A: নতুন মুরগির বাচ্চা কেনা (Batch Management)
         ===================================================================== */}
      {activeSubTab === 'A_BATCH' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Form to Buy New Chicks & Create Batch */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              A. নতুন মুরগির বাচ্চা কেনা (Create New Poultry Batch)
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              নতুন বাচ্চা কিনলে একটি ইউনিক Batch ID তৈরি হবে এবং মোট ক্রয়মূল্য স্বয়ংক্রিয়ভাবে হিসাব হবে।
            </p>

            <form onSubmit={handleCreateBatchA} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Batch ID (ব্যাচ আইডি) *
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
                    কেনার তারিখ (Purchase Date) *
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
                    মুরগির ধরন (Chicken Type)
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
                    <option value="Broiler">Broiler (ব্রয়লার)</option>
                    <option value="Sonali">Sonali (সোনালী)</option>
                    <option value="Layer">Layer (লেয়ার - ডিমের মুরগি)</option>
                    <option value="Deshi">Deshi (দেশি মুরগি)</option>
                    <option value="Breeder">Breeder (ব্রিডার)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Farm / Shed (শেড নম্বর) *
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
                    বাচ্চার সংখ্যা (Quantity) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={aInitialQty}
                    onChange={(e) => setAInitialQty(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    প্রতি বাচ্চার দাম (৳) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={aPricePerChick}
                    onChange={(e) => setAPricePerChick(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    মোট ক্রয়মূল্য (Auto)
                  </label>
                  <div className="w-full rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    {formatBDT(aTotalChickCost)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier (হ্যাচারি / সাপ্লায়ার) *
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
                    প্রাথমিক অবস্থা (Status)
                  </label>
                  <select
                    value={aStatus}
                    onChange={(e) =>
                      setAStatus(e.target.value as 'active' | 'harvested' | 'closed')
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="active">Active (চলমান ব্যাচ)</option>
                    <option value="harvested">Harvested (বিক্রি সম্পন্ন)</option>
                    <option value="closed">Closed (বন্ধ)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs"
              >
                + নতুন মুরগির ব্যাচ সেভ করুন (Save Batch {aBatchCode})
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
                  সিলেক্ট করা ব্যাচের প্রাথমিক ক্রয় ও শেড তথ্য
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
                      <th className="py-2.5 px-4 w-1/2">বিষয় (Field)</th>
                      <th className="py-2.5 px-4">তথ্য (Details)</th>
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
                        কেনার তারিখ (Purchase Date)
                      </td>
                      <td className="py-2.5 px-4 font-mono">{selectedBatch.chickPurchaseDate}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        মুরগির ধরন (Chicken Type)
                      </td>
                      <td className="py-2.5 px-4 font-semibold">{selectedBatch.chickenType}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        বাচ্চার সংখ্যা (Initial Quantity)
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold">
                        {selectedBatch.initialQuantity.toLocaleString()} টি
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        প্রতি বাচ্চার দাম (Price per Chick)
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
                        মোট ক্রয়মূল্য (Total Purchase Cost)
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatBDT(selectedBatch.purchaseCost)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        Supplier (সাপ্লায়ার)
                      </td>
                      <td className="py-2.5 px-4">{selectedBatch.supplierName}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        Farm / Shed (শেড)
                      </td>
                      <td className="py-2.5 px-4 font-semibold">{selectedBatch.shedNumber}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        প্রাথমিক অবস্থা (Status)
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-600">
                        {selectedBatch.status === 'active'
                          ? 'Active (চলমান)'
                          : selectedBatch.status === 'harvested'
                          ? 'Harvested (বিক্রি শেষ)'
                          : 'Closed'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-8 text-center">
                কোনো ব্যাচ পাওয়া যায়নি। বাম পাশের ফর্ম থেকে নতুন ব্যাচ তৈরি করুন।
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB B: প্রতিদিন কতগুলো মুরগি মারা গেল? (Daily Mortality & Stock Tracking)
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
                প্রাথমিক সংখ্যা (Initial Birds)
              </div>
            </div>

            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 p-5">
              <div className="flex items-center justify-between text-xs font-semibold text-red-600 dark:text-red-400">
                <span>মৃত্যুর হার: {batchMortalityRate}%</span>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
                {batchDead.toLocaleString()}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                মৃত মুরগি (Total Dead Birds) · অসুস্থ: {selectedBatch?.sickBirdsCount || 0}টি
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-5">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <span>বিক্রিত মুরগি: {batchSold}টি</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {batchAlive.toLocaleString()}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                বর্তমানে জীবিত মুরগি (Currently Alive in Shed)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Daily Employee Entry Form */}
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                B. প্রতিদিনের মৃত্যু ও অসুস্থ মুরগির হিসাব (Daily Employee Log)
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                কর্মচারী শুধু আজকের তথ্য লিখবে—সিস্টেম নিজে জীবিত মুরগির সংখ্যা ও মৃত্যুর হার আপডেট করবে।
              </p>

              <form onSubmit={handleRecordMortalityB} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      তারিখ (Date) *
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
                      কোন ব্যাচ (Selected Batch)
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
                      আজ কতটি মারা গেছে (Dead Today) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={bDeadToday}
                      onChange={(e) => setBDeadToday(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-amber-600 dark:text-amber-400 mb-1">
                      বর্তমানে অসুস্থ মুরগির সংখ্যা (Sick Birds) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={bSickToday}
                      onChange={(e) => setBSickToday(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    মৃত্যুর কারণ (Cause of Death) *
                  </label>
                  <input
                    type="text"
                    required
                    value={bCause}
                    onChange={(e) => setBCause(e.target.value)}
                    placeholder="যেমন: হিট স্ট্রোক, ঠান্ডা/CRD, দুর্বল বাচ্চা"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    চিকিৎসা বা করণীয় (Treatment / Action Taken) *
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
                    দায়িত্বপ্রাপ্ত কর্মচারী (Responsible Employee) *
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
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-bold hover:opacity-95 transition-opacity"
                >
                  আজকের মৃত্যু ও স্বাস্থ্য তথ্য আপডেট করুন
                </button>
              </form>
            </div>

            {/* Right: Shed & Batch Mortality Rate Comparison Report */}
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  বিশেষ রিপোর্ট: কোন ব্যাচে ও কোন শেডে মৃত্যুর হার কেমন?
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  ব্যাচ ও শেড অনুযায়ী প্রাথমিক সংখ্যা, মৃত মুরগি, জীবিত মুরগি এবং মৃত্যুর হার (%)
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 font-bold">
                        <th className="py-2.5 px-3">Batch ID ও Shed</th>
                        <th className="py-2.5 px-3 text-right">শুরুতে</th>
                        <th className="py-2.5 px-3 text-right">মৃত</th>
                        <th className="py-2.5 px-3 text-right">জীবিত</th>
                        <th className="py-2.5 px-3 text-right">মৃত্যুর হার (%)</th>
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
                  সাম্প্রতিক প্রতিদিনের মৃত্যু ও চিকিৎসার লগ (Daily Mortality History)
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                  {mortalityLogs.length === 0 ? (
                    <div className="text-slate-500 py-3">
                      বাম পাশের ফর্ম দিয়ে প্রতিদিনের মৃত্যু এন্ট্রি করলে এখানে তারিখ ও কর্মচারীর নামসহ বিস্তারিত লগ জমা হবে।
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
          TAB C: মুরগির খাবারের হিসাব (Feed Management & Batch Stock Link)
         ===================================================================== */}
      {activeSubTab === 'C_FEED' && (
        <div className="space-y-6">
          {/* Feed Stock Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">গোডাউনে বর্তমান খাবারের বস্তা</div>
              <div className="mt-1 text-2xl font-bold font-mono text-emerald-600">
                {feedItems.reduce((s, i) => s + i.quantity, 0)} বস্তা
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                প্রতি বস্তা ৫০ কেজি হিসেবে মোট{' '}
                {(feedItems.reduce((s, i) => s + i.quantity, 0) * 50).toLocaleString()} কেজি
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">
                {selectedBatch?.batchCode}-এ ব্যবহৃত মোট খাবার
              </div>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {(
                  (selectedBatch?.starterFeedKg || 0) +
                  (selectedBatch?.growerFeedKg || 0) +
                  (selectedBatch?.finisherFeedKg || 0)
                ).toLocaleString()}{' '}
                কেজি
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Starter: {selectedBatch?.starterFeedKg || 0}kg · Grower:{' '}
                {selectedBatch?.growerFeedKg || 0}kg · Finisher:{' '}
                {selectedBatch?.finisherFeedKg || 0}kg
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">
                {selectedBatch?.batchCode}-এ মোট খাবারের খরচ
              </div>
              <div className="mt-1 text-2xl font-bold font-mono text-amber-600">
                {formatBDT(selectedBatch?.feedCost || 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                মুরগি প্রতি খাবার খরচ:{' '}
                {batchInitial > 0
                  ? formatBDT(Math.round((selectedBatch?.feedCost || 0) / batchInitial))
                  : '৳0'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">বর্তমান খাবার স্টকের মূল্য</div>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatBDT(feedItems.reduce((s, i) => s + i.quantity * i.unitCost, 0))}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                অবশিষ্ট খাবারের বাজারমূল্য
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Buy Feed Bags into Stock */}
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ১. নতুন খাবারের বস্তা কেনা (Buy Feed into Inventory)
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                যেমন: ৫০ বস্তা খাবার × ২,৫০০ টাকা = ১,২৫,০০০ টাকা স্টকে যুক্ত হবে।
              </p>

              <form onSubmit={handlePurchaseFeedC} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      খাবারের ধরন (Feed Stage)
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
                      <option value="Starter Feed">Starter Feed (শুরুর খাবার)</option>
                      <option value="Grower Feed">Grower Feed (বাড়ন্ত খাবার)</option>
                      <option value="Finisher Feed">Finisher Feed (বিক্রির আগের খাবার)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      খাবার কেনার Supplier *
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
                      কত বস্তা (Bags) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={cBagsCount}
                      onChange={(e) => setCBagsCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      প্রতি বস্তার দাম (৳) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={cPricePerBag}
                      onChange={(e) => setCPricePerBag(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                      মোট খরচ (Total)
                    </label>
                    <div className="w-full rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                      {formatBDT(cBagsCount * cPricePerBag)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    গোডাউন / স্টোর রুম (Warehouse)
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
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                >
                  + {cBagsCount} বস্তা খাবার স্টকে যুক্ত করুন
                </button>
              </form>
            </div>

            {/* Right: Daily Feed Consumption Linked to Batch */}
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ২. প্রতিদিন মুরগিকে খাবার দেওয়া (Daily Feed Usage to {selectedBatch?.batchCode})
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                খাবার ব্যবহার করলে গোডাউন স্টক স্বয়ংক্রিয়ভাবে কমে যাবে (যেমন ৫০ - ৩ = ৪৭ বস্তা) এবং খরচ{' '}
                <span className="font-mono font-bold">{selectedBatch?.batchCode}</span>-এ যুক্ত হবে।
              </p>

              <form onSubmit={handleDailyFeedUsageC} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ব্যবহারের তারিখ (Date) *
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
                      খাবারের পর্যায় (Feed Type)
                    </label>
                    <select
                      value={cUseFeedStage}
                      onChange={(e) =>
                        setCUseFeedStage(e.target.value as 'starter' | 'grower' | 'finisher')
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    >
                      <option value="starter">Starter Feed (স্টার্টার)</option>
                      <option value="grower">Grower Feed (গ্রোয়ার)</option>
                      <option value="finisher">Finisher Feed (ফিনিশার)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    কোন স্টকের বস্তা থেকে দিচ্ছেন (Select Feed Stock)
                  </label>
                  <select
                    value={cUseInventoryId}
                    onChange={(e) => setCUseInventoryId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    {feedItems.map((fi) => (
                      <option key={fi.id} value={fi.id}>
                        {fi.name} — বর্তমান স্টক: {fi.quantity} {fi.unit} (@ ৳{fi.unitCost}/বস্তা |{' '}
                        {fi.supplierName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      আজ কয় বস্তা ব্যবহার হয়েছে (Bags Used Today) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={cUseBags}
                      onChange={(e) => setCUseBags(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      প্রতি বস্তার ওজন (কেজি)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={cBagWeightKg}
                      onChange={(e) => setCBagWeightKg(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedBatch}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-bold hover:opacity-95 transition-opacity"
                >
                  খাবার ব্যবহার রেকর্ড করুন ({cUseBags} বস্তা = {cUseBags * cBagWeightKg} কেজি)
                </button>
              </form>
            </div>
          </div>

          {/* Current Feed Inventory Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200">
              খাবারের বর্তমান স্টক ও সাপ্লায়ার তালিকা (Feed Stock & Price History)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold">
                    <th className="py-2.5 px-4">খাবারের নাম (Feed Name)</th>
                    <th className="py-2.5 px-4">Supplier</th>
                    <th className="py-2.5 px-4 text-right">প্রতি বস্তার দাম</th>
                    <th className="py-2.5 px-4 text-right">বর্তমান অবশিষ্ট বস্তা</th>
                    <th className="py-2.5 px-4 text-right">মোট স্টক মূল্য</th>
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
          TAB D: ওষুধ, ভ্যাকসিন ও চিকিৎসা (Medicine, Vaccine & Reminder)
         ===================================================================== */}
      {activeSubTab === 'D_MEDICINE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Buy Medicine / Vaccine */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              ১. ওষুধ ও ভ্যাকসিন ক্রয় (Purchase Medicine & Vaccine)
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              ওষুধের নাম, ক্যাটাগরি, ক্রয়মূল্য এবং মেয়াদ উত্তীর্ণের তারিখ (Expiry Date) সংরক্ষণ করুন।
            </p>

            <form onSubmit={handleBuyMedicineD} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ওষুধ বা ভ্যাকসিনের নাম *
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
                    ক্যাটাগরি (Category)
                  </label>
                  <select
                    value={dMedCategory}
                    onChange={(e) => setDMedCategory(e.target.value as 'vaccine' | 'medicine')}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="vaccine">Vaccine (টিকা / ভ্যাকসিন)</option>
                    <option value="medicine">Medicine / Vitamin (ওষুধ ও ভিটামিন)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    পরিমাণ (Vial/Pack) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={dMedQty}
                    onChange={(e) => setDMedQty(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    একক দাম (৳) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={dMedUnitCost}
                    onChange={(e) => setDMedUnitCost(Number(e.target.value))}
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
                  Supplier (কোম্পানি / ফার্মেসি)
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
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
              >
                + ওষুধ/ভ্যাকসিন স্টকে যোগ করুন (মোট {formatBDT(dMedQty * dMedUnitCost)})
              </button>
            </form>

            {/* Current Medicine Stock Table */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                ওষুধ ও ভ্যাকসিনের বর্তমান Stock এবং Expiry Date
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
                        অবশিষ্ট: {m.quantity} {m.unit}
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
              ২. ব্যাচে ওষুধ/ভ্যাকসিন প্রয়োগ ও Reminder ({selectedBatch?.batchCode})
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              যেমন: Vaccine A (২,০০০ টাকা - ১ ব্যাচ), Medicine B (১,৫০০ টাকা - ৩ দিন), Vitamin C (১,০০০ টাকা - ৫ দিন)
            </p>

            <form onSubmit={handleApplyMedicineD} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  স্টক থেকে ওষুধ সিলেক্ট করুন (অথবা নিচে নাম লিখুন)
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
                  <option value="">-- কাস্টম ওষুধ / ভ্যাকসিন --</option>
                  {medItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (অবশিষ্ট: {m.quantity} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ওষুধের নাম (Medicine/Vaccine Name) *
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
                    ব্যবহারের মেয়াদ / পরিমাণ (Usage) *
                  </label>
                  <input
                    type="text"
                    required
                    value={dApplyDuration}
                    onChange={(e) => setDApplyDuration(e.target.value)}
                    placeholder="যেমন: ১ ব্যাচ / ৩ দিন / ৫ দিন"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ওষুধের খরচ (টাকা) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={dApplyCost}
                    onChange={(e) => setDApplyCost(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    পরবর্তী ভ্যাকসিন দেওয়ার তারিখের Reminder
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
                  চিকিৎসার নোট (Treatment Notes) *
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
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-bold hover:opacity-95 transition-opacity"
              >
                ব্যাচে ওষুধের খরচ ({formatBDT(dApplyCost)}) ও ভ্যাকসিন রিমাইন্ডার সেভ করুন
              </button>
            </form>

            {selectedBatch && (
              <div className="mt-5 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedBatch.batchCode} — মোট ওষুধ ও ভ্যাকসিন খরচ:{' '}
                  <span className="font-mono text-emerald-600">
                    {formatBDT(selectedBatch.medicineCost)}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  ভ্যাকসিন ও চিকিৎসা ইতিহাস: {selectedBatch.vaccineScheduleNotes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB E: বিদ্যুৎ, গ্যাস, কর্মচারী ও অন্যান্য খরচ (Overhead & Shared Allocation)
         ===================================================================== */}
      {activeSubTab === 'E_EXPENSES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              E. বিদ্যুৎ, গ্যাস, কর্মচারী ও অন্যান্য খরচ (Utilities, Staff & Shared Shed Allocation)
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              বিদ্যুৎ বিলের মতো যৌথ খরচ একটি নির্দিষ্ট শেডে অথবা একাধিক শেডে কী নিয়মে ভাগ হয়েছে তা সহ সংরক্ষণ করুন।
            </p>

            <form onSubmit={handleRecordOverheadExpenseE} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    খরচের ধরন (Expense Category) *
                  </label>
                  <select
                    value={eExpenseType}
                    onChange={(e) => setEExpenseType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-semibold"
                  >
                    <option value="বিদ্যুৎ বিল (Electricity Bill)">
                      বিদ্যুৎ বিল (Electricity Bill) — যেমন ৫,০০০ টাকা
                    </option>
                    <option value="কর্মচারীর বেতন (Staff Salary)">
                      কর্মচারীর বেতন (Staff Salary) — যেমন ১৫,০০০ টাকা
                    </option>
                    <option value="পানি ও গ্যাস বিল (Water & Gas Bill)">
                      পানি ও গ্যাস বিল (Water & Gas Bill) — যেমন ১,০০০ টাকা
                    </option>
                    <option value="পরিবহন খরচ (Transport)">
                      পরিবহন খরচ (Transport) — যেমন ৩,০০০ টাকা
                    </option>
                    <option value="জীবাণুনাশক ও লিটার/তুষ (Disinfectant)">
                      জীবাণুনাশক ও লিটার/তুষ (Disinfectant) — যেমন ২,০০০ টাকা
                    </option>
                    <option value="অন্যান্য খামার খরচ (Other Expense)">
                      অন্যান্য খামার খরচ (Other Expense) — যেমন ১,০০০ টাকা
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    টাকার পরিমাণ (Amount ৳) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={eAmount}
                    onChange={(e) => setEAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold text-base"
                  />
                </div>
              </div>

              {/* Shared Shed Cost Allocation Rule */}
              <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                <label className="block font-bold text-slate-900 dark:text-slate-100">
                  একাধিক শেডে বা ব্যাচে খরচ ভাগের নিয়ম (Cost Allocation Rule):
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
                    ১. শুধুমাত্র সিলেক্ট করা ব্যাচ/শেডের খরচ ({selectedBatch?.batchCode} -{' '}
                    {selectedBatch?.shedNumber})
                  </option>
                  <option value="equal_all_sheds">
                    ২. সকল চলমান শেডে সমানভাবে ভাগ (Equal Split Across Active Sheds)
                  </option>
                  <option value="proportional_birds">
                    ৩. শেডের জীবিত মুরগির সংখ্যার অনুপাতে ভাগ (Proportional by Live Bird Count)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    তারিখ (Date) *
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
                    কে খরচ করেছে (Spent By) *
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
                    কাকে টাকা দেওয়া হয়েছে (Paid To) *
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
                    বিল বা রসিদ রেফারেন্স (Receipt / Bill No)
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
                    Payment Method (পেমেন্ট মাধ্যম)
                  </label>
                  <select
                    value={ePaymentMethod}
                    onChange={(e) =>
                      setEPaymentMethod(e.target.value as 'Cash' | 'Bank' | 'Mobile Banking')
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="Cash">Cash (নগদ ক্যাশ)</option>
                    <option value="Bank">Bank Account (ব্যাংক চেক/ট্রান্সফার)</option>
                    <option value="Mobile Banking">Mobile Banking (বিকাশ / নগদ)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedBatch}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors"
              >
                + খরচ রেকর্ড করুন ({eExpenseType} — {formatBDT(eAmount)})
              </button>
            </form>
          </div>

          {/* Right: Summary of Overhead Expenses for Selected Batch */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {selectedBatch?.batchCode} — অন্যান্য খরচের সারসংক্ষেপ
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-2.5 px-4">খরচের ধরন</th>
                    <th className="py-2.5 px-4 text-right">টাকার পরিমাণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 px-4">কর্মচারী বেতন, বিদ্যুৎ ও পানি বিল</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(selectedBatch?.labourAndUtilityCost || 0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">পরিবহন, জীবাণুনাশক ও অন্যান্য খরচ</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {formatBDT(selectedBatch?.otherExpense || 0)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold">
                    <td className="py-2.5 px-4">মোট পরিচালনা ও ইউটিলিটি খরচ</td>
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
          TAB F: মুরগি বিক্রির হিসাব (Multi-Grade Sales Management)
         ===================================================================== */}
      {activeSubTab === 'F_SALES' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                F. সাইজ ও ওজন অনুযায়ী আলাদা গ্রেডে মুরগি বিক্রির হিসাব ({selectedBatch?.batchCode})
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                সব মুরগির সাইজ এক হয় না—তাই Small, Medium, Large এবং Extra Large গ্রেডের সংখ্যা, ওজন ও প্রতি কেজির দাম আলাদাভাবে হিসাব করুন।
              </p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
              <span className="text-slate-600 dark:text-slate-400">ব্যাচে বর্তমানে জীবিত মুরগি: </span>
              <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400">
                {batchAlive} টি
              </span>
            </div>
          </div>

          <form onSubmit={handleGradedSalesF} className="space-y-6 text-xs">
            {/* Multi-Grade Calculator Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                    <th className="py-3 px-4">গ্রেড (Size Grade)</th>
                    <th className="py-3 px-4">মুরগির সংখ্যা (Birds Count)</th>
                    <th className="py-3 px-4">মোট ওজন (Total Weight KG)</th>
                    <th className="py-3 px-4">প্রতি কেজি দাম (Price/KG ৳)</th>
                    <th className="py-3 px-4 text-right">মোট বিক্রয়মূল্য (Grade Total)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {/* Small Grade */}
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      Small (ছোট সাইজ)
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={gradeSmallBirds}
                        onChange={(e) => setGradeSmallBirds(Number(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={gradeSmallKg}
                        onChange={(e) => setGradeSmallKg(Number(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={gradeSmallPrice}
                        onChange={(e) => setGradeSmallPrice(Number(e.target.value))}
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
                      Medium (মাঝারি সাইজ)
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={gradeMedBirds}
                        onChange={(e) => setGradeMedBirds(Number(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={gradeMedKg}
                        onChange={(e) => setGradeMedKg(Number(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={gradeMedPrice}
                        onChange={(e) => setGradeMedPrice(Number(e.target.value))}
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
                      Large (বড় সাইজ)
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={gradeLargeBirds}
                        onChange={(e) => setGradeLargeBirds(Number(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={gradeLargeKg}
                        onChange={(e) => setGradeLargeKg(Number(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={gradeLargePrice}
                        onChange={(e) => setGradeLargePrice(Number(e.target.value))}
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
                      Extra Large (এক্সট্রা লার্জ)
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={gradeXlBirds}
                        onChange={(e) => setGradeXlBirds(Number(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={gradeXlKg}
                        onChange={(e) => setGradeXlKg(Number(e.target.value))}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={gradeXlPrice}
                        onChange={(e) => setGradeXlPrice(Number(e.target.value))}
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
                      সর্বমোট চালান (Total Invoice)
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-800 dark:text-emerald-300">
                      {totalGradedBirds} টি মুরগি
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-800 dark:text-emerald-300">
                      {totalGradedKg} কেজি
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-800 dark:text-emerald-300">
                      গড় ৳{avgGradedPricePerKg}/কেজি
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
                  ক্রেতার নাম (Buyer Name) *
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
                  বিক্রির তারিখ (Sale Date) *
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
                  পরিবহন খরচ (Transport Cost ৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={fTransportCost}
                  onChange={(e) => setFTransportCost(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-amber-600 dark:text-amber-400 mb-1">
                  বকেয়া টাকা (Due Amount ৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={fDueAmount}
                  onChange={(e) => setFDueAmount(Number(e.target.value))}
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
                  <option value="Cash">Cash (নগদ টাকা)</option>
                  <option value="Bank">Bank (ব্যাংক একাউন্ট)</option>
                  <option value="Mobile Payment">Mobile Payment (বিকাশ/নগদ)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedBatch}
              className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-xs"
            >
              গ্রেডভিত্তিক বিক্রয় চালান সেভ করুন ({totalGradedBirds}টি মুরগি · {totalGradedKg} কেজি · মোট{' '}
              {formatBDT(totalGradedRevenue)})
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB G: Poultry Farm-এর চূড়ান্ত লাভ-ক্ষতি (Batch Financial Report)
         ===================================================================== */}
      {activeSubTab === 'G_REPORT' && selectedBatch && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  G. Poultry Farm চূড়ান্ত লাভ-ক্ষতি প্রতিবেদন
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  Batch {selectedBatch.batchCode} – Financial Report ({selectedBatch.shedNumber})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  কেনার তারিখ: {selectedBatch.chickPurchaseDate} · মুরগির ধরন:{' '}
                  {selectedBatch.chickenType} · সাপ্লায়ার: {selectedBatch.supplierName}
                </p>
              </div>

              {/* 3 Top Financial Summary Boxes (Exact match to user prompt: মোট আয়, মোট খরচ, নিট লাভ) */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 px-4 py-2.5 text-right">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    মোট আয় (Total Revenue)
                  </div>
                  <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {formatBDT(selectedBatch.totalSalesRevenue)}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 px-4 py-2.5 text-right">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    মোট খরচ (Total Cost)
                  </div>
                  <div className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">
                    {formatBDT(batchTotalExpenses)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-emerald-600 text-white px-4 py-2.5 text-right">
                  <div className="text-[11px] font-semibold opacity-80">
                    নিট লাভ (Net Profit)
                  </div>
                  <div className="text-lg font-bold font-mono">
                    {formatBDT(batchRealizedProfit)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              {/* Expense Breakdown Table (Exact structure from user's prompt) */}
              <div className="lg:col-span-6 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  মোট খরচের বিস্তারিত বিবরণ (Expense Breakdown)
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                        <th className="py-3 px-4">খরচের বিবরণ (Expense Head)</th>
                        <th className="py-3 px-4 text-right">টাকা (Amount BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          ১. বাচ্চা ক্রয় ({selectedBatch.initialQuantity}টি বাচ্চা)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(selectedBatch.purchaseCost)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          ২. খাবার খরচ (Starter + Grower + Finisher:{' '}
                          {selectedBatch.starterFeedKg +
                            selectedBatch.growerFeedKg +
                            selectedBatch.finisherFeedKg}{' '}
                          কেজি)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(selectedBatch.feedCost)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">৩. ওষুধ ও ভ্যাকসিন</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(selectedBatch.medicineCost)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          ৪. কর্মচারী বেতন, বিদ্যুৎ ও পানি বিল
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(selectedBatch.labourAndUtilityCost)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          ৫. পরিবহন, জীবাণুনাশক ও অন্যান্য খরচ
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(selectedBatch.otherExpense)}
                        </td>
                      </tr>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-sm">
                        <td className="py-3 px-4">সর্বমোট খরচ (Total Expense)</td>
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
                  বাস্তব খামারের সমন্বিত হিসাব (অবিক্রীত মুরগি, অবশিষ্ট খাবার ও বকেয়া)
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                        <th className="py-3 px-4">বিবরণ (Real-World Asset / Metric)</th>
                        <th className="py-3 px-4 text-right">পরিমাণ / মূল্য</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          মোট বিক্রি (মুরগি বিক্রি হয়েছে: {selectedBatch.soldBirdsCount}টি /{' '}
                          {selectedBatch.totalSoldKg} কেজি)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          {formatBDT(selectedBatch.totalSalesRevenue)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          ক্রেতার কাছে বকেয়া পাওনা (Receivable Due)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-amber-600">
                          {formatBDT(selectedBatch.outstandingDue)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          শেডে অবিক্রীত জীবিত মুরগি ({batchAlive}টি) — আনুমানিক বাজারমূল্য
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(batchAlive * 185)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          গোডাউনে অবশিষ্ট খাবারের স্টক ({feedItems.reduce((s, i) => s + i.quantity, 0)}{' '}
                          বস্তা)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {formatBDT(
                            feedItems.reduce((s, i) => s + i.quantity * i.unitCost, 0)
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          গ্রেডভিত্তিক বিক্রির বিবরণ (Grade Breakdown)
                        </td>
                        <td className="py-3 px-4 text-right text-[11px] text-slate-600 dark:text-slate-400">
                          {selectedBatch.gradeBreakdown}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-bold text-sm">
                        <td className="py-3 px-4 text-emerald-900 dark:text-emerald-200">
                          অবিক্রীত মুরগিসহ মোট নিট লাভ (Adjusted Net Profit)
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
