'use client';

import React, { useState, useMemo } from 'react';
import {
  Beef,
  ShieldCheck,
  Search,
  Plus,
  Milk,
  Utensils,
  Stethoscope,
  GitBranch,
  BadgeDollarSign,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Baby,
  QrCode,
  Scale,
  AlertCircle,
  Loader2,
  Trash2,
  Scan,
  Printer,
  X,
} from 'lucide-react';
import {
  ErpBusiness,
  ErpLivestockRecord,
  ErpInventoryItem,
  ErpJournalEntry,
  ErpAccount,
  ErpAuditLog,
  formatBDT,
} from '@/lib/erp-types';
import {
  createLivestockAnimalRecord,
  updateLivestockAnimalRecord,
  recordStockMovement,
  postDoubleEntryTransaction,
  logAuditEvent,
  createNotificationRecord,
  deleteLivestockAnimal,
} from '@/lib/erp-service';
import {
  triggerGlobalToast,
  triggerConfirmDelete,
} from './GlobalToastAndConfirmModal';
import LivestockBarcodeScannerModal from './LivestockBarcodeScannerModal';

const parseNum = (val: string): number => {
  const clean = val.replace(/^0+(?=\d)/, '');
  return clean === '' ? 0 : Number(clean);
};

interface LivestockManagementModuleProps {
  activeBusiness: ErpBusiness;
  species: 'cattle' | 'goat';
  animals: ErpLivestockRecord[];
  inventoryItems: ErpInventoryItem[];
  journalEntries: ErpJournalEntry[];
  accounts: ErpAccount[];
  auditLogs: ErpAuditLog[];
  ownerId: string;
  actorEmail: string;
  onNotify: (msg: string) => void;
  lang?: 'en' | 'bn';
}

type LivestockSubTab =
  | 'A_PROFILE'
  | 'B_MILK_WEIGHT'
  | 'C_FEEDING'
  | 'D_VET_BREEDING'
  | 'E_FAMILY_TREE'
  | 'F_SALE_PROFIT';

export default function LivestockManagementModule({
  activeBusiness,
  species,
  animals,
  inventoryItems,
  journalEntries,
  accounts,
  auditLogs,
  ownerId,
  actorEmail,
  onNotify,
  lang = 'bn',
}: LivestockManagementModuleProps) {
  const bn = lang === 'bn';
  const notify = (msg: string) => {
    onNotify(msg);
    triggerGlobalToast(msg, 'success');
  };
  const isCattle = species === 'cattle';
  const [activeSubTab, setActiveSubTab] = useState<LivestockSubTab>('A_PROFILE');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>(animals[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showEarTagModal, setShowEarTagModal] = useState(false);

  // Filter animals by Tag ID, Name, Breed, Parent Tag, Health Status
  const filteredAnimals = useMemo(() => {
    const q = tagSearchQuery.trim().toLowerCase();
    if (!q) return animals;
    return animals.filter(
      (a) =>
        a.animalTag.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.breed.toLowerCase().includes(q) ||
        a.parentTag.toLowerCase().includes(q) ||
        a.healthStatus.toLowerCase().includes(q)
    );
  }, [animals, tagSearchQuery]);

  const selectedAnimal = useMemo(() => {
    return (
      animals.find((a) => a.id === selectedAnimalId) ||
      filteredAnimals[0] ||
      animals[0] ||
      null
    );
  }, [animals, filteredAnimals, selectedAnimalId]);

  // Feed inventory items
  const feedInventory = useMemo(
    () =>
      inventoryItems.filter(
        (i) =>
          i.category === 'feed' &&
          (i.businessId === activeBusiness.id ||
            i.businessName.toLowerCase().includes(isCattle ? 'cattle' : 'goat'))
      ),
    [inventoryItems, activeBusiness.id, isCattle]
  );

  // ============================================================================
  // A. নতুন গরু / ছাগল প্রোফাইল রেজিস্ট্রেশন (Digital Profile State)
  // ============================================================================
  const [aTag, setATag] = useState(
    isCattle ? `CAT-000${animals.length + 1}` : `GOAT-000${animals.length + 1}`
  );
  const [aName, setAName] = useState(isCattle ? 'লক্ষ্মী (Laxmi)' : 'কুষ্টিয়া ব্ল্যাক পার্ল');
  const [aPurposeType, setAPurposeType] = useState(
    isCattle ? 'Dairy Cow (দুধের গাভী)' : 'Breeding Doe (প্রজননক্ষম মা ছাগল)'
  );
  const [aBreed, setABreed] = useState(
    isCattle ? 'Holstein Cross (হলস্টেইন ক্রস)' : 'Black Bengal (ব্ল্যাক বেঙ্গল)'
  );
  const [aGender, setAGender] = useState<'Female' | 'Male'>('Female');
  const [aBirthYear, setABirthYear] = useState('2024');
  const [aPurchaseDate, setAPurchaseDate] = useState('2025-01-15');
  const [aAgeMonths, setAAgeMonths] = useState(isCattle ? 24 : 18);
  const [aPurchasePrice, setAPurchasePrice] = useState(isCattle ? 80000 : 14500);
  const [aWeightKg, setAWeightKg] = useState(isCattle ? 350 : 26);
  const [aHealthStatus, setAHealthStatus] = useState<
    'Healthy' | 'Under Observation' | 'Treatment' | 'Pregnant' | 'Lactating' | 'Sold'
  >(isCattle ? 'Lactating' : 'Healthy');
  const [aSireTag, setASireTag] = useState(isCattle ? 'BULL-AF-88' : 'GOAT-0002');
  const [aDamTag, setADamTag] = useState(isCattle ? 'CAT-DAM-01' : 'GOAT-0001');

  // ============================================================================
  // B. দুধ উৎপাদন (Morning + Evening) ও ওজন বৃদ্ধি (Milk & Weight State)
  // ============================================================================
  const [bMilkDate, setBMilkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bMorningLiters, setBMorningLiters] = useState(isCattle ? 6 : 1.2);
  const [bEveningLiters, setBEveningLiters] = useState(isCattle ? 5 : 0.8);
  const [bFarmUseLiters, setBFarmUseLiters] = useState(0);
  const [bWastedLiters, setBWastedLiters] = useState(0);
  const [bMilkPricePerLiter, setBMilkPricePerLiter] = useState(isCattle ? 80 : 120);
  const [bMilkBuyer, setBMilkBuyer] = useState('আড়ং ডেইরি চিলিং পয়েন্ট / স্থানীয় ক্রেতা');

  const totalDailyMilk = Number((Number(bMorningLiters) + Number(bEveningLiters)).toFixed(2));
  const soldDailyMilk = Math.max(
    0,
    Number((totalDailyMilk - Number(bFarmUseLiters) - Number(bWastedLiters)).toFixed(2))
  );
  const dailyMilkRevenue = Math.round(soldDailyMilk * Number(bMilkPricePerLiter));

  // Weight & Fattening (ADG) State
  const [wMeasureDate, setWMeasureDate] = useState(new Date().toISOString().split('T')[0]);
  const [wNewWeightKg, setWNewWeightKg] = useState(
    selectedAnimal ? selectedAnimal.currentWeightKg + (isCattle ? 12 : 2) : isCattle ? 362 : 28
  );
  const [wTargetWeightKg, setWTargetWeightKg] = useState(isCattle ? 450 : 38);
  const [wExpectedPricePerKg, setWExpectedPricePerKg] = useState(isCattle ? 650 : 1100);
  const [wNotes, setWNotes] = useState('মাসিক ওজন পরিমাপ — শারীরিক বৃদ্ধি সন্তোষজনক');

  // ============================================================================
  // C. খাবারের হিসাব — একক ও যৌথ (Individual & Group Feeding State)
  // ============================================================================
  const [cFeedMode, setCFeedMode] = useState<
    'individual' | 'group_equal' | 'group_weight_ratio'
  >('individual');
  const [cGrassKg, setCGrassKg] = useState(isCattle ? 10 : 3);
  const [cGrassRate, setCGrassRate] = useState(8);
  const [cStrawKg, setCStrawKg] = useState(isCattle ? 3 : 0.5);
  const [cStrawRate, setCStrawRate] = useState(15);
  const [cBranKg, setCBranKg] = useState(isCattle ? 2 : 0.5);
  const [cBranRate, setCBranRate] = useState(55);
  const [cOtherKg, setCOtherKg] = useState(isCattle ? 1 : 0.2);
  const [cOtherRate, setCOtherRate] = useState(70);
  const [cDaysCount, setCDaysCount] = useState(1);
  const [cSelectedInvId, setCSelectedInvId] = useState('');

  const dailyRationKg =
    Number(cGrassKg) + Number(cStrawKg) + Number(cBranKg) + Number(cOtherKg);
  const dailyRationCost =
    Number(cGrassKg) * Number(cGrassRate) +
    Number(cStrawKg) * Number(cStrawRate) +
    Number(cBranKg) * Number(cBranRate) +
    Number(cOtherKg) * Number(cOtherRate);
  const totalPeriodFeedCost = Math.round(dailyRationCost * Number(cDaysCount));
  const monthlyEstimatedFeedCost = Math.round(dailyRationCost * 30);

  // ============================================================================
  // D. চিকিৎসা, ভ্যাকসিন, গর্ভধারণ ও বাচ্চা জন্ম (Vet, Breeding & Newborn Offspring)
  // ============================================================================
  const [dDiseaseName, setDDiseaseName] = useState('রুটিন স্বাস্থ্য পরীক্ষা ও কৃমিনাশক');
  const [dDoctorName, setDDoctorName] = useState('ডা. কামরুল ইসলাম (DVM)');
  const [dTreatDate, setDTreatDate] = useState(new Date().toISOString().split('T')[0]);
  const [dMedicineName, setDMedicineName] = useState('Ivermectin + Livavet + Calcium');
  const [dMedCost, setDMedCost] = useState(isCattle ? 1500 : 450);
  const [dVaccineName, setDVaccineName] = useState(
    isCattle ? 'FMD (ক্ষুরা রোগ টিকা)' : 'PPR (পিপিআর ভ্যাকসিন)'
  );
  const [dVaccineDate, setDVaccineDate] = useState(new Date().toISOString().split('T')[0]);
  const [dNextVaccineDate, setDNextVaccineDate] = useState('2027-05-12');
  const [dIsPregnant, setDIsPregnant] = useState(false);
  const [dBreedingDate, setDBreedingDate] = useState('2026-09-10');
  const [dSireUsed, setDSireUsed] = useState(
    isCattle ? 'হলস্টেইন ফ্রিজিয়ান সিমেন #AF-88' : 'পাঠা ছাগল GOAT-0002'
  );

  // Auto-calculate expected delivery date (Cattle: ~283 days, Goat: ~150 days)
  const expectedDeliveryDate = useMemo(() => {
    if (!dBreedingDate) return '';
    const d = new Date(dBreedingDate);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + (isCattle ? 283 : 150));
    return d.toISOString().split('T')[0];
  }, [dBreedingDate, isCattle]);

  // Newborn Calf / Kid Generator State
  const [newbornTag, setNewbornTag] = useState(
    isCattle ? `CAT-000${animals.length + 2}` : `GOAT-000${animals.length + 2}`
  );
  const [newbornName, setNewbornName] = useState(
    isCattle ? 'নতুন বাছুর ( মা: লক্ষ্মী )' : 'নতুন ছাগলছানা (Kid)'
  );
  const [newbornGender, setNewbornGender] = useState<'Female' | 'Male'>('Female');
  const [newbornWeight, setNewbornWeight] = useState(isCattle ? 28 : 2.2);
  const [newbornSireTag, setNewbornSireTag] = useState(
    isCattle ? 'BULL-AF-88' : 'GOAT-0002'
  );
  const [newbornBirthDate, setNewbornBirthDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // ============================================================================
  // F. পশু বিক্রির হিসাব ও Lifetime Profit (Sale & Profit State)
  // ============================================================================
  const [fSalePrice, setFSalePrice] = useState(isCattle ? 120000 : 32000);
  const [fBuyerName, setFBuyerName] = useState('সাভার ডেইরি অ্যান্ড মিট মার্ট');
  const [fSaleDate, setFSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [fPaymentMethod, setFPaymentMethod] = useState<'Cash' | 'Bank' | 'Mobile Payment'>('Cash');
  const [fDueAmount, setFDueAmount] = useState(0);
  const [fMarkAsSold, setFMarkAsSold] = useState(false);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // 1-Click Load User's Exact Prompt Example: CAT-0001 (লক্ষ্মী) or GOAT-0001 Family Tree
  const handleLoadPromptExample = async () => {
    setIsSubmitting(true);
    try {
      if (isCattle) {
        await createLivestockAnimalRecord(
          {
            animalTag: 'CAT-0001',
            species: 'cattle',
            businessId: activeBusiness.id,
            name: 'লক্ষ্মী (Laxmi - Dairy Cow)',
            breed: 'Holstein Cross (হলস্টেইন ক্রস)',
            gender: 'Female',
            ageMonths: 28,
            purchaseDate: '2025-01-10',
            purchasePrice: 80000,
            currentWeightKg: 350,
            healthStatus: 'Lactating',
            feedCost: 18000,
            medicineAndVetCost: 7000,
            vaccinationHistory: 'FMD (ক্ষুরা রোগ), Anthrax ও BQ ভ্যাকসিন সম্পন্ন | পরবর্তী: 2027-03-15',
            breedingAndOffspringNotes:
              'জন্ম: ২০২৪ | কেনা: ২০২৫ | বর্তমান অবস্থা: প্রতিদিন দুধ দেয় (সকাল ৬ লি. + বিকেল ৫ লি. = ১১ লি.)',
            parentTag: 'Sire: HF-AU-88 | Dam: CAT-0000',
            totalMilkLiters: 330,
            milkSalesRevenue: 26400,
            animalSalePrice: 120000,
            status: 'active',
          },
          ownerId,
          actorEmail
        );

        await logAuditEvent({
          action: 'DAILY_MILK_LOG',
          module: 'Cattle Management',
          businessId: activeBusiness.id,
          details:
            '[CAT-0001 | লক্ষ্মী] তারিখ: 2026-11-12 | সকাল: 6 লিটার | বিকেল: 5 লিটার | মোট: 11 লিটার | বিক্রি: 11 লিটার @ ৳80 = ৳880',
          severity: 'info',
          actorEmail,
          ownerId,
        });

        notify(
          'উদাহরণের গাভী CAT-0001 (নাম: লক্ষ্মী, ক্রয়মূল্য ৳৮০,০০০, বরাদ্দ খরচ ৳২৫,০০০, বিক্রয়মূল্য ৳১,২০,০০০, প্রকৃত লাভ ৳১৫,০০০ + দুধের আয়) সফলভাবে লোড হয়েছে!'
        );
      } else {
        // Create Mother Goat + 2 Offspring Kids so Family Tree works out of the box
        await createLivestockAnimalRecord(
          {
            animalTag: 'GOAT-0001',
            species: 'goat',
            businessId: activeBusiness.id,
            name: 'কালো মানিক (Mother Doe)',
            breed: 'Black Bengal Purebred',
            gender: 'Female',
            ageMonths: 24,
            purchaseDate: '2025-04-10',
            purchasePrice: 14000,
            currentWeightKg: 28,
            healthStatus: 'Healthy',
            feedCost: 4200,
            medicineAndVetCost: 800,
            vaccinationHistory: 'PPR ভ্যাকসিন ও কৃমিনাশক সম্পন্ন',
            breedingAndOffspringNotes:
              '২টি বাচ্চা দিয়েছে (GOAT-K01 ও GOAT-K02) | পুনরায় গর্ভবতী',
            parentTag: 'Sire: ROOT-BUCK | Dam: ROOT-DOE',
            totalMilkLiters: 0,
            milkSalesRevenue: 0,
            animalSalePrice: 28000,
            status: 'active',
          },
          ownerId,
          actorEmail
        );

        await createLivestockAnimalRecord(
          {
            animalTag: 'GOAT-K01',
            species: 'goat',
            businessId: activeBusiness.id,
            name: 'বিজলি (১ম বাচ্চা - মাদি)',
            breed: 'Black Bengal Purebred',
            gender: 'Female',
            ageMonths: 7,
            purchaseDate: '2026-04-12',
            purchasePrice: 0,
            currentWeightKg: 14,
            healthStatus: 'Healthy',
            feedCost: 1600,
            medicineAndVetCost: 300,
            vaccinationHistory: 'PPR ১ম ডোজ সম্পন্ন',
            breedingAndOffspringNotes: 'খামারে জন্ম (জন্ম তারিখ: ১২ এপ্রিল ২০২৬)',
            parentTag: 'Sire: GOAT-0002 | Dam: GOAT-0001',
            totalMilkLiters: 0,
            milkSalesRevenue: 0,
            animalSalePrice: 15000,
            status: 'active',
          },
          ownerId,
          actorEmail
        );

        await createLivestockAnimalRecord(
          {
            animalTag: 'GOAT-K02',
            species: 'goat',
            businessId: activeBusiness.id,
            name: 'তুফান (২য় বাচ্চা - খাসি)',
            breed: 'Black Bengal Purebred',
            gender: 'Male',
            ageMonths: 7,
            purchaseDate: '2026-04-12',
            purchasePrice: 0,
            currentWeightKg: 16,
            healthStatus: 'Healthy',
            feedCost: 1800,
            medicineAndVetCost: 300,
            vaccinationHistory: 'PPR ১ম ডোজ সম্পন্ন',
            breedingAndOffspringNotes: 'খামারে জন্ম (জন্ম তারিখ: ১২ এপ্রিল ২০২৬)',
            parentTag: 'Sire: GOAT-0002 | Dam: GOAT-0001',
            totalMilkLiters: 0,
            milkSalesRevenue: 0,
            animalSalePrice: 18000,
            status: 'active',
          },
          ownerId,
          actorEmail
        );

        notify(
          'মা ছাগল GOAT-0001 এবং তার ২টি বাচ্চা (GOAT-K01 ও GOAT-K02) সহ সম্পূর্ণ Family Tree লোড করা হয়েছে!'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler A: Register New Cattle or Goat Digital Profile
  const handleCreateAnimalA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const parentStr = `Sire: ${aSireTag || 'N/A'} | Dam: ${aDamTag || 'N/A'}`.slice(0, 40);
      const profileNotes = `ধরন: ${aPurposeType} | জন্ম সাল: ${aBirthYear} | কেনা: ${aPurchaseDate}`.slice(
        0,
        300
      );

      await createLivestockAnimalRecord(
        {
          animalTag: aTag,
          species,
          businessId: activeBusiness.id,
          name: aName,
          breed: aBreed,
          gender: aGender,
          ageMonths: Number(aAgeMonths),
          purchaseDate: aPurchaseDate,
          purchasePrice: Number(aPurchasePrice),
          currentWeightKg: Number(aWeightKg),
          healthStatus: aHealthStatus,
          feedCost: 0,
          medicineAndVetCost: 0,
          vaccinationHistory: isCattle
            ? 'প্রাথমিক স্বাস্থ্য পরীক্ষা সম্পন্ন (FMD/BQ Scheduled)'
            : 'প্রাথমিক স্বাস্থ্য পরীক্ষা সম্পন্ন (PPR Scheduled)',
          breedingAndOffspringNotes: profileNotes,
          parentTag: parentStr,
          totalMilkLiters: 0,
          milkSalesRevenue: 0,
          animalSalePrice: 0,
          status: 'active',
        },
        ownerId,
        actorEmail
      );

      // Post purchase cost to Central Accounting if > 0
      const cashOrBank =
        accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];
      if (cashOrBank && expAcc && Number(aPurchasePrice) > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `BUY-${aTag}`,
            date: aPurchaseDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'purchase',
            category: `${isCattle ? 'গরু' : 'ছাগল'} ক্রয় (${aTag})`,
            description: `${aTag} (${aName} - ${aBreed}), ওজন: ${aWeightKg} কেজি, ধরন: ${aPurposeType}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: cashOrBank.id,
            creditAccountName: cashOrBank.name,
            amount: Number(aPurchasePrice),
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: 'খামার পশু হাট / ব্রিডার',
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      notify(
        `নতুন ডিজিটাল প্রোফাইল ${aTag} (${aName}, ক্রয়মূল্য ${formatBDT(Number(aPurchasePrice))}) সফলভাবে তৈরি হয়েছে!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler B1: Daily Morning + Evening Milk Production Log
  const handleRecordDailyMilkB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimal) return;
    setIsSubmitting(true);
    try {
      const updatedLiters = Number(
        (selectedAnimal.totalMilkLiters + soldDailyMilk).toFixed(2)
      );
      const updatedRev = selectedAnimal.milkSalesRevenue + dailyMilkRevenue;

      await updateLivestockAnimalRecord(
        selectedAnimal,
        {
          totalMilkLiters: updatedLiters,
          milkSalesRevenue: updatedRev,
          healthStatus: 'Lactating',
        },
        actorEmail
      );

      await logAuditEvent({
        action: 'DAILY_MILK_LOG',
        module: isCattle ? 'Cattle Management' : 'Goat Management',
        businessId: activeBusiness.id,
        details: `[${selectedAnimal.animalTag} | ${selectedAnimal.name}] তারিখ: ${bMilkDate} | সকাল: ${bMorningLiters} লি. | বিকেল: ${bEveningLiters} লি. | মোট: ${totalDailyMilk} লি. | বিক্রি: ${soldDailyMilk} লি. | খামারে ব্যবহার: ${bFarmUseLiters} লি. | নষ্ট: ${bWastedLiters} লি. | দর: ৳${bMilkPricePerLiter} | আয়: ৳${dailyMilkRevenue}`,
        severity: 'info',
        actorEmail,
        ownerId,
      });

      const cashOrBank =
        accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
      if (cashOrBank && revAcc && dailyMilkRevenue > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `MLK-${selectedAnimal.animalTag}-${Date.now().toString().slice(-4)}`,
            date: bMilkDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'sale',
            category: `দুধ বিক্রি (${selectedAnimal.animalTag} - ${selectedAnimal.name})`,
            description: `তারিখ: ${bMilkDate} | সকাল ${bMorningLiters} লি. + বিকেল ${bEveningLiters} লি. = মোট ${totalDailyMilk} {bn ? "লিটার" : "L"} (বিক্রি ${soldDailyMilk} লি. @ ৳${bMilkPricePerLiter})`,
            debitAccountId: cashOrBank.id,
            debitAccountName: cashOrBank.name,
            creditAccountId: revAcc.id,
            creditAccountName: revAcc.name,
            amount: dailyMilkRevenue,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: bMilkBuyer,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      notify(
        `${selectedAnimal.animalTag} (${selectedAnimal.name})-এর আজকের দুধ উৎপাদন: সকাল ${bMorningLiters} লি. + বিকেল ${bEveningLiters} লি. = ${totalDailyMilk} লিটার (আয় ${formatBDT(dailyMilkRevenue)}) সংরক্ষিত হয়েছে!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler B2: Weight Growth Update
  const handleUpdateWeightB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimal) return;
    setIsSubmitting(true);
    try {
      const prevWeight = selectedAnimal.currentWeightKg;
      const diff = Number((Number(wNewWeightKg) - prevWeight).toFixed(1));
      await updateLivestockAnimalRecord(
        selectedAnimal,
        {
          currentWeightKg: Number(wNewWeightKg),
        },
        actorEmail
      );

      await logAuditEvent({
        action: 'WEIGHT_GROWTH_LOG',
        module: isCattle ? 'Cattle Management' : 'Goat Management',
        businessId: activeBusiness.id,
        details: `[${selectedAnimal.animalTag} | ${selectedAnimal.name}] তারিখ: ${wMeasureDate} | পূর্বের ওজন: ${prevWeight} কেজি ➔ বর্তমান ওজন: ${wNewWeightKg} কেজি (পরিবর্তন: ${diff >= 0 ? '+' : ''}${diff} কেজি) | টার্গেট: ${wTargetWeightKg} কেজি | নোট: ${wNotes}`,
        severity: 'info',
        actorEmail,
        ownerId,
      });

      notify(
        `${selectedAnimal.animalTag}-এর নতুন ওজন ${wNewWeightKg} কেজি (${diff >= 0 ? '+' : ''}${diff} কেজি) আপডেট হয়েছে!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler C: Individual or Group Feeding Allocation
  const handleRecordFeedingC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimal) return;
    setIsSubmitting(true);
    try {
      const activeHerd = animals.filter((a) => a.status === 'active');
      const targets =
        cFeedMode === 'individual' || activeHerd.length === 0
          ? [selectedAnimal]
          : activeHerd;

      const totalHerdWeight = targets.reduce(
        (sum, a) => sum + Math.max(1, a.currentWeightKg),
        0
      );

      for (const animal of targets) {
        let allocatedCost = totalPeriodFeedCost;
        if (cFeedMode === 'group_equal') {
          allocatedCost = Math.round(totalPeriodFeedCost / targets.length);
        } else if (cFeedMode === 'group_weight_ratio') {
          allocatedCost = Math.round(
            (totalPeriodFeedCost * Math.max(1, animal.currentWeightKg)) / totalHerdWeight
          );
        }

        await updateLivestockAnimalRecord(
          animal,
          {
            feedCost: animal.feedCost + allocatedCost,
          },
          actorEmail
        );
      }

      // Deduct from inventory if selected
      const invItem = feedInventory.find((i) => i.id === cSelectedInvId);
      if (invItem) {
        const totalKgUsed = dailyRationKg * Number(cDaysCount);
        await recordStockMovement(
          invItem,
          'consumption',
          totalKgUsed,
          invItem.warehouse,
          cFeedMode === 'individual' ? selectedAnimal.animalTag : `Group Herd (${targets.length})`,
          `ঘাস ${cGrassKg}kg, খড় ${cStrawKg}kg, ভুসি ${cBranKg}kg, অন্যান্য ${cOtherKg}kg (${cDaysCount} দিন)`,
          actorEmail
        );
      }

      const modeLabel =
        cFeedMode === 'individual'
          ? `একক পশু (${selectedAnimal.animalTag})`
          : cFeedMode === 'group_equal'
          ? `যৌথ খাবার (${targets.length}টি পশুর মধ্যে সমান বণ্টন)`
          : `যৌথ খাবার (${targets.length}টি পশুর ওজন অনুপাতে বণ্টন)`;

      await logAuditEvent({
        action: 'LIVESTOCK_FEED_LOG',
        module: isCattle ? 'Cattle Management' : 'Goat Management',
        businessId: activeBusiness.id,
        details: `[${modeLabel}] দৈনিক রেশন: ঘাস ${cGrassKg} কেজি, খড় ${cStrawKg} কেজি, ভুসি ${cBranKg} কেজি, অন্যান্য ${cOtherKg} কেজি (দৈনিক ৳${dailyRationCost} × ${cDaysCount} দিন = মোট ৳${totalPeriodFeedCost})`,
        severity: 'info',
        actorEmail,
        ownerId,
      });

      notify(
        `খাবারের হিসাব (${modeLabel}: মোট ${formatBDT(totalPeriodFeedCost)}) সফলভাবে প্রোফাইলে যুক্ত হয়েছে!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler D1: Veterinary Treatment, Vaccine & Pregnancy Update
  const handleRecordVetAndBreedingD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimal) return;
    setIsSubmitting(true);
    try {
      const newVacHistory = `${dVaccineName} (${dVaccineDate}, পরবর্তী: ${dNextVaccineDate}) | ডা. ${dDoctorName}`.slice(
        0,
        300
      );
      const newBreedingNotes = dIsPregnant
        ? `গর্ভবতী (প্রজনন: ${dBreedingDate}, বীজ/পাঠা: ${dSireUsed}, সম্ভাব্য প্রসব: ${expectedDeliveryDate}) | রোগ/চিকিৎসা: ${dDiseaseName} (${dMedicineName})`.slice(
            0,
            300
          )
        : `${selectedAnimal.breedingAndOffspringNotes} | চিকিৎসা (${dTreatDate}): ${dDiseaseName} - ${dMedicineName}`.slice(
            0,
            300
          );

      await updateLivestockAnimalRecord(
        selectedAnimal,
        {
          medicineAndVetCost: selectedAnimal.medicineAndVetCost + Number(dMedCost),
          vaccinationHistory: newVacHistory,
          breedingAndOffspringNotes: newBreedingNotes,
          healthStatus: dIsPregnant ? 'Pregnant' : selectedAnimal.healthStatus,
        },
        actorEmail
      );

      // Create Vaccine Reminder Notification
      if (dNextVaccineDate) {
        await createNotificationRecord({
          title: `টিকা ও প্রজনন রিমাইন্ডার: ${selectedAnimal.animalTag} (${selectedAnimal.name})`.slice(
            0,
            140
          ),
          message: `${selectedAnimal.animalTag}-এর পরবর্তী ভ্যাকসিন (${dVaccineName}): ${dNextVaccineDate}${
            dIsPregnant ? ` | সম্ভাব্য বাচ্চা প্রসবের তারিখ: ${expectedDeliveryDate}` : ''
          }`.slice(0, 400),
          category: 'vaccination',
          priority: 'high',
          businessId: activeBusiness.id,
        });
      }

      notify(
        `${selectedAnimal.animalTag}-এর চিকিৎসা ও ভ্যাকসিন খরচ (${formatBDT(Number(dMedCost))}) এবং পরবর্তী ভ্যাকসিন রিমাইন্ডার (${dNextVaccineDate}) সেভ হয়েছে!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler D2: Register Newborn Calf / Goat Kid with Automatic Parent Linkage
  const handleRegisterNewbornOffspring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimal) return;
    setIsSubmitting(true);
    try {
      const parentLink = `Sire: ${newbornSireTag} | Dam: ${selectedAnimal.animalTag}`.slice(
        0,
        40
      );

      await createLivestockAnimalRecord(
        {
          animalTag: newbornTag,
          species,
          businessId: activeBusiness.id,
          name: newbornName,
          breed: selectedAnimal.breed,
          gender: newbornGender,
          ageMonths: 1,
          purchaseDate: newbornBirthDate,
          purchasePrice: 0, // Born on farm!
          currentWeightKg: Number(newbornWeight),
          healthStatus: 'Healthy',
          feedCost: 0,
          medicineAndVetCost: 0,
          vaccinationHistory: 'খামারে সদ্যজাত — শালদুধ (Colostrum) প্রদান করা হয়েছে',
          breedingAndOffspringNotes: `খামারে জন্ম: ${newbornBirthDate} | মা: ${selectedAnimal.animalTag} (${selectedAnimal.name})`,
          parentTag: parentLink,
          totalMilkLiters: 0,
          milkSalesRevenue: 0,
          animalSalePrice: 0,
          status: 'active',
        },
        ownerId,
        actorEmail
      );

      // Update Mother's breedingAndOffspringNotes to record the newborn ID
      const updatedMotherNotes = `সন্তান জন্ম (${newbornBirthDate}): ${newbornTag} (${newbornName}) | ${selectedAnimal.breedingAndOffspringNotes}`.slice(
        0,
        300
      );
      await updateLivestockAnimalRecord(
        selectedAnimal,
        {
          breedingAndOffspringNotes: updatedMotherNotes,
          healthStatus: isCattle ? 'Lactating' : 'Healthy',
        },
        actorEmail
      );

      notify(
        `অভিনন্দন! মা ${selectedAnimal.animalTag}-এর নতুন বাচ্চা ${newbornTag} (${newbornName}) স্বয়ংক্রিয় বংশলতিকা (Parent Link) সহ রেজিস্ট্রেশন হয়েছে!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler F: Animal Sale & Lifetime Profit Realization
  const handleRecordAnimalSaleF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimal) return;
    setIsSubmitting(true);
    try {
      await updateLivestockAnimalRecord(
        selectedAnimal,
        {
          animalSalePrice: Number(fSalePrice),
          status: fMarkAsSold ? 'sold' : selectedAnimal.status,
          healthStatus: fMarkAsSold ? 'Sold' : selectedAnimal.healthStatus,
        },
        actorEmail
      );

      if (fMarkAsSold && Number(fSalePrice) > 0) {
        const cashOrBank =
          accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
        const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
        if (cashOrBank && revAcc) {
          await postDoubleEntryTransaction(
            {
              referenceNo: `SL-${selectedAnimal.animalTag}`,
              date: fSaleDate,
              businessId: activeBusiness.id,
              businessName: activeBusiness.name,
              transactionType: 'sale',
              category: `${isCattle ? 'গরু' : 'ছাগল'} বিক্রি (${selectedAnimal.animalTag})`,
              description: `${selectedAnimal.animalTag} (${selectedAnimal.name} - ${selectedAnimal.breed}), ওজন: ${selectedAnimal.currentWeightKg} {bn ? 'কেজি' : 'KG'} | ক্রেতা: ${fBuyerName} | মাধ্যম: ${fPaymentMethod}`,
              debitAccountId: cashOrBank.id,
              debitAccountName: cashOrBank.name,
              creditAccountId: revAcc.id,
              creditAccountName: revAcc.name,
              amount: Number(fSalePrice),
              paymentStatus: Number(fDueAmount) > 0 ? 'partial' : 'paid',
              dueAmount: Number(fDueAmount) || 0,
              counterpartyName: fBuyerName,
            },
            accounts,
            ownerId,
            actorEmail
          );
        }
      }

      notify(
        `${selectedAnimal.animalTag} (${selectedAnimal.name})-এর বিক্রয়মূল্য ${formatBDT(Number(fSalePrice))} আপডেট হয়েছে!`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter historical logs for milk, weight, and feeding
  const milkHistoryLogs = useMemo(
    () =>
      auditLogs.filter(
        (l) =>
          l.action === 'DAILY_MILK_LOG' &&
          (!selectedAnimal || l.details.includes(selectedAnimal.animalTag))
      ),
    [auditLogs, selectedAnimal]
  );

  const weightHistoryLogs = useMemo(
    () =>
      auditLogs.filter(
        (l) =>
          l.action === 'WEIGHT_GROWTH_LOG' &&
          (!selectedAnimal || l.details.includes(selectedAnimal.animalTag))
      ),
    [auditLogs, selectedAnimal]
  );

  // Selected Animal Financial Calculations (Matches User's Exact Prompt Formula)
  const animPurchasePrice = selectedAnimal?.purchasePrice || 0;
  const animFeedCost = selectedAnimal?.feedCost || 0;
  const animVetCost = selectedAnimal?.medicineAndVetCost || 0;
  const animAllocatedCost = animFeedCost + animVetCost;
  const animTotalInvestment = animPurchasePrice + animAllocatedCost;
  const animSaleOrMarketVal =
    selectedAnimal && selectedAnimal.animalSalePrice > 0
      ? selectedAnimal.animalSalePrice
      : selectedAnimal
      ? selectedAnimal.currentWeightKg * (isCattle ? 620 : 1100)
      : 0;
  const animDirectSaleProfit = animSaleOrMarketVal - animTotalInvestment;
  const animMilkRevenue = selectedAnimal?.milkSalesRevenue || 0;
  const animLifetimeTotalProfit = animDirectSaleProfit + animMilkRevenue;

  // Find children (offspring) of a given animal tag for Family Tree
  const getOffspringOf = (parentTagCode: string) => {
    return animals.filter(
      (a) =>
        a.id !== parentTagCode &&
        (a.parentTag.toLowerCase().includes(parentTagCode.toLowerCase()) ||
          a.breedingAndOffspringNotes.toLowerCase().includes(parentTagCode.toLowerCase()))
    );
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          TOP DIGITAL TAG SEARCH BAR & ANIMAL SELECTOR
         ===================================================================== */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {isCattle ? <Beef className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              <span>
                {isCattle
                  ? 'Cattle Farm — Individual Digital ID System (A to F)'
                  : 'Goat Farm — Individual ID & Family Tree System (A to F)'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isCattle
                ? 'প্রতিটি গরুর আলাদা Digital ID, দুধ উৎপাদন, খাবার, চিকিৎসা, বাছুর ও আজীবন লাভ-ক্ষতি'
                : 'প্রতিটি ছাগলের আলাদা Digital ID, বংশলতিকা (Family Tree), বাচ্চা, খাবার ও আজীবন লাভ-ক্ষতি'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              সার্চ বক্সে <span className="font-mono font-bold">{isCattle ? 'CAT-0001' : 'GOAT-0001'}</span> বা পশুর নাম লিখলেই ওই পশুর জন্ম থেকে বিক্রি পর্যন্ত সম্পূর্ণ ইতিহাস চলে আসবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleLoadPromptExample}
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
                  <span>
                    {isCattle
                      ? 'উদাহরণ গরু (CAT-0001 লক্ষ্মী) লোড করুন'
                      : 'উদাহরণ ছাগল ও Family Tree লোড করুন'}
                  </span>
                </>
              )}
            </button>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                placeholder={`${isCattle ? 'CAT-0001 বা লক্ষ্মী' : 'GOAT-0001'} লিখে সার্চ করুন...`}
                className="pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Modern Dropdown & Quick Animal Selector Bar with Barcode Scanner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-emerald-200/70 dark:border-emerald-900/40">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              title={bn ? 'ক্যামেরা অথবা বারকোড স্ক্যানার গান দিয়ে স্ক্যান করুন' : 'Scan Tag with Camera or Barcode Gun'}
            >
              <Scan className="h-4 w-4" />
              <span>{bn ? 'বারকোড স্ক্যানার' : 'Scan Barcode/QR'}</span>
            </button>

            <div className="relative min-w-[260px] max-w-md flex-1">
              <select
                value={selectedAnimal?.id || ''}
                onChange={(e) => setSelectedAnimalId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {filteredAnimals.length === 0 ? (
                  <option value="" disabled>{bn ? 'কোনো পশু পাওয়া যায়নি' : 'No animal found'}</option>
                ) : (
                  filteredAnimals.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.animalTag}] {a.name} · {a.breed} · {a.currentWeightKg} কেজি ({a.healthStatus || 'সুস্থ'})
                    </option>
                  ))
                )}
              </select>
            </div>

            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
              {bn ? `মোট ${animals.length}টি ${isCattle ? 'গরু' : 'ছাগল'}` : `Total ${animals.length} ${isCattle ? 'Cattle' : 'Goats'}`}
            </span>
          </div>

          {selectedAnimal && (
            <div className="flex items-center gap-2 shrink-0">
              {/* Selected Animal Mini Info Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedAnimal.animalTag}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedAnimal.name}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">{selectedAnimal.currentWeightKg} কেজি</span>
              </div>

              {/* View/Print Ear Tag & Barcode Modal Button */}
              <button
                type="button"
                onClick={() => setShowEarTagModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
                title={bn ? 'বারকোড ইয়ার ট্যাগ স্লিপ দেখুন ও প্রিন্ট করুন' : 'View & Print Barcode Ear Tag'}
              >
                <Printer className="h-3.5 w-3.5 text-emerald-600" />
                <span>{bn ? 'বারকোড ট্যাগ' : 'Ear Tag'}</span>
              </button>

              {/* Delete Animal Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  triggerConfirmDelete({
                    title: bn ? 'পশুর রেকর্ড ডিলিট নিশ্চিতকরণ' : 'Confirm Delete Animal',
                    message: bn
                      ? `আপনি কি নিশ্চিতভাবে এই পশুর রেকর্ডটি (${selectedAnimal.animalTag}) ডিলিট করতে চান? এর সাথে যুক্ত যাবতীয় তথ্য মুছে যাবে।`
                      : `Are you sure you want to delete animal record ${selectedAnimal.animalTag}?`,
                    itemName: `${selectedAnimal.animalTag} (${selectedAnimal.name} - ${selectedAnimal.breed})`,
                    onConfirm: async () => {
                      setIsSubmitting(true);
                      try {
                        await deleteLivestockAnimal(selectedAnimal.id);
                        triggerGlobalToast(
                          bn ? `${selectedAnimal.animalTag} সফলভাবে ডিলিট করা হয়েছে!` : `${selectedAnimal.animalTag} deleted!`,
                          'delete'
                        );
                        onNotify(bn ? `${selectedAnimal.animalTag} ডিলিট সম্পন্ন!` : `Record deleted!`);
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
                <span>{bn ? 'মুছুন' : 'Delete'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          6-STEP NAVIGATION TABS (A to F)
         ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          {
            id: 'A_PROFILE' as LivestockSubTab,
            step: 'A',
            titleBn: 'Digital ID ও প্রোফাইল',
            titleEn: 'Digital Profile',
            icon: QrCode,
          },
          {
            id: 'B_MILK_WEIGHT' as LivestockSubTab,
            step: 'B',
            titleBn: isCattle ? 'দুধ উৎপাদন ও ওজন' : 'ওজন বৃদ্ধি ও দুধ',
            titleEn: 'Milk & Weight Log',
            icon: Milk,
          },
          {
            id: 'C_FEEDING' as LivestockSubTab,
            step: 'C',
            titleBn: 'খাবারের খরচ (একক/যৌথ)',
            titleEn: 'Individual & Group Feed',
            icon: Utensils,
          },
          {
            id: 'D_VET_BREEDING' as LivestockSubTab,
            step: 'D',
            titleBn: 'চিকিৎসা, প্রজনন ও বাচ্চা',
            titleEn: 'Vet, Vaccine & Birth',
            icon: Stethoscope,
          },
          {
            id: 'E_FAMILY_TREE' as LivestockSubTab,
            step: 'E',
            titleBn: 'বংশলতিকা (Family Tree)',
            titleEn: 'Parent & Kids Tree',
            icon: GitBranch,
          },
          {
            id: 'F_SALE_PROFIT' as LivestockSubTab,
            step: 'F',
            titleBn: 'বিক্রি ও প্রকৃত লাভ-ক্ষতি',
            titleEn: 'Sale & Lifetime Profit',
            icon: BadgeDollarSign,
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
          TAB A: প্রতিটি গরু / ছাগলের Digital Profile & New Registration
         ===================================================================== */}
      {activeSubTab === 'A_PROFILE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Selected Animal's Complete Digital ID Profile Card */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
                  {selectedAnimal ? selectedAnimal.animalTag.split('-')[0] : 'ID'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100">
                      {selectedAnimal?.animalTag || 'N/A'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                      {selectedAnimal?.status === 'active' ? 'Active (সক্রিয়)' : selectedAnimal?.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {isCattle ? 'Cattle Digital Profile' : 'Goat Digital Profile'} —{' '}
                    {selectedAnimal?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                  title={bn ? 'ক্যামেরা অথবা বারকোড স্ক্যানার গান দিয়ে স্ক্যান করুন' : 'Scan via Camera or Barcode Gun'}
                >
                  <Scan className="h-4 w-4" />
                  <span>{bn ? 'স্ক্যান' : 'Scan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEarTagModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                  title={bn ? 'বারকোড ইয়ার ট্যাগ স্লিপ প্রিন্ট করুন' : 'Print Barcode Ear Tag'}
                >
                  <Printer className="h-4 w-4 text-emerald-600" />
                  <span>{bn ? 'স্লিপ' : 'Slip'}</span>
                </button>
              </div>
            </div>

            {selectedAnimal ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      <th className="py-2.5 px-4 w-2/5">{bn ? "বিষয় (Field)" : "Metric / Field"}</th>
                      <th className="py-2.5 px-4">{bn ? "তথ্য (Information)" : "Details / Records"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'ডিজিটাল ট্যাগ (Unique ID)' : 'Digital Tag ID'}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {selectedAnimal.animalTag}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'পশুর নাম (Animal Name)' : 'Animal Name'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {selectedAnimal.name}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'ধরন ও লিঙ্গ (Type & Gender)' : 'Category & Gender'}
                      </td>
                      <td className="py-2.5 px-4">
                        {selectedAnimal.gender === 'Female'
                          ? isCattle
                            ? (bn ? 'Dairy Cow / গাভী (Female)' : 'Dairy Cow (Female)')
                            : (bn ? 'মা ছাগল / Doe (Female)' : 'Breeding Doe (Female)')
                          : isCattle
                          ? (bn ? 'ষাঁড় / Bull (Male)' : 'Bull (Male)')
                          : (bn ? 'পাঠা বা খাসি / Buck (Male)' : 'Buck / Wether (Male)')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'জাত ও বয়স (Breed & Age)' : 'Breed & Age'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold">
                        {selectedAnimal.breed} ({selectedAnimal.ageMonths} {bn ? 'মাস' : 'Months'})
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'কেনার / জন্মের তারিখ' : 'Purchase / Birth Date'}
                      </td>
                      <td className="py-2.5 px-4 font-mono">{selectedAnimal.purchaseDate}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'ক্রয়মূল্য (Purchase Price)' : 'Procurement Cost'}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold">
                        {selectedAnimal.purchasePrice > 0
                          ? formatBDT(selectedAnimal.purchasePrice)
                          : (bn ? 'খামারে জন্ম (৳০)' : 'Farm Born (৳0)')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'বর্তমান ওজন (Current Weight)' : 'Current Live Weight'}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {selectedAnimal.currentWeightKg} কেজি
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'স্বাস্থ্য ও বর্তমান অবস্থা' : 'Health & Physiological Status'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-emerald-700 dark:text-emerald-400">
                        {selectedAnimal.healthStatus === 'Lactating'
                          ? (bn ? 'ভালো — দুধ দেয় (Lactating)' : 'Healthy — Lactating')
                          : selectedAnimal.healthStatus === 'Pregnant'
                          ? (bn ? 'ভালো — গর্ভবতী (Pregnant)' : 'Healthy — Pregnant')
                          : selectedAnimal.healthStatus === 'Healthy'
                          ? (bn ? 'ভালো — সুস্থ (Healthy)' : 'Healthy & Active')
                          : selectedAnimal.healthStatus}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'বংশ ও বাবা-মায়ের পরিচয়' : 'Pedigree & Lineage'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        {selectedAnimal.parentTag}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'ভ্যাকসিন ও চিকিৎসার ইতিহাস' : 'Vaccination & Medical History'}
                      </td>
                      <td className="py-2.5 px-4">{selectedAnimal.vaccinationHistory}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'প্রজনন ও বাচ্চা জন্মের ইতিহাস' : 'Breeding & Offspring History'}
                      </td>
                      <td className="py-2.5 px-4">{selectedAnimal.breedingAndOffspringNotes}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {bn ? 'খাবার ও চিকিৎসার মোট খরচ' : 'Total Feed & Vet Cost'}
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        {bn ? 'খাবার: ' : 'Feed: '}{formatBDT(selectedAnimal.feedCost)} + {bn ? 'চিকিৎসা: ' : 'Vet: '}
                        {formatBDT(selectedAnimal.medicineAndVetCost)} ={' '}
                        <span className="font-bold">
                          {formatBDT(selectedAnimal.feedCost + selectedAnimal.medicineAndVetCost)}
                        </span>
                      </td>
                    </tr>
                    {isCattle && (
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                          {bn ? 'মোট দুধ উৎপাদন ও আয়' : 'Cumulative Milk Production & Sales'}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {selectedAnimal.totalMilkLiters} {bn ? 'লিটার' : 'Liters'} ({formatBDT(selectedAnimal.milkSalesRevenue)})
                        </td>
                      </tr>
                    )}
                    <tr className="bg-emerald-50/70 dark:bg-emerald-950/30">
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {bn ? 'আজীবন নিট লাভ (Lifetime Profit)' : 'Lifetime Cumulative Net Profit'}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                        {formatBDT(animLifetimeTotalProfit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-12 text-center space-y-2">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {bn ? 'কোনো পশু নিবন্ধিত নেই।' : 'No livestock registered yet.'}
            </p>
            <p className="text-slate-400">
              {bn ? 'ডানপাশের ফর্ম পূরণ করে প্রথম পশুর ডিজিটাল প্রোফাইল তৈরি করুন।' : 'Use the form on the right to register your first livestock profile.'}
            </p>
          </div>
            )}
          </div>

          {/* Right: Register New Animal Digital ID Form */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              {bn ? `নতুন ${isCattle ? 'গরুর' : 'ছাগলের'} Digital Profile তৈরি করুন` : `Register New ${isCattle ? 'Cattle' : 'Goat'} Profile`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {bn ? `খামারে নতুন ${isCattle ? 'গরু' : 'ছাগল'} কিনলে বা যোগ করলে আলাদা ইউনিক আইডি দিয়ে নিবন্ধন করুন।` : `Register new ${isCattle ? 'cattle' : 'goat'} with a unique ID tag, breed, procurement cost and health status.`}
            </p>

            <form onSubmit={handleCreateAnimalA} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">
                    {bn ? 'ডিজিটাল ট্যাগ নাম্বার (Unique ID) *' : 'Digital Tag ID *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={aTag}
                    onChange={(e) => setATag(e.target.value)}
                    placeholder={isCattle ? 'CAT-0001' : 'GOAT-0001'}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {bn ? (isCattle ? 'গরুর নাম (Name) *' : 'ছাগলের নাম (Name) *') : (isCattle ? 'Cattle Name *' : 'Goat Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={aName}
                    onChange={(e) => setAName(e.target.value)}
                    placeholder={bn ? (isCattle ? 'যেমন: লক্ষ্মী / সুলতান' : 'যেমন: কালো মানিক') : (isCattle ? 'e.g. Laxmi / Sultan' : 'e.g. Kalo Manik')}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'ধরন (Category / Type)' : 'Category / Type'}</label>
                  <select
                    value={aPurposeType}
                    onChange={(e) => setAPurposeType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    {isCattle ? (
                      <>
                        <option value="Dairy Cow">{bn ? "Dairy Cow (দুধের গাভী)" : "Dairy Cow"}</option>
                        <option value="Bull Fattening">{bn ? "কোরবানির ষাঁড় (Bull Fattening)" : "Beef Fattening Bull"}</option>
                        <option value="Heifer">{bn ? "Heifer (বকনা বাছুর)" : "Heifer"}</option>
                        <option value="Breeding Bull">{bn ? "Breeding Bull (প্রজনন ষাঁড়)" : "Breeding Bull"}</option>
                      </>
                    ) : (
                      <>
                        <option value="Breeding Doe">{bn ? "Breeding Doe (মা ছাগল)" : "Breeding Doe"}</option>
                        <option value="Meat Goat">{bn ? "Meat Goat (মাংসের খাসি)" : "Meat Goat"}</option>
                        <option value="Breeding Buck">{bn ? "Breeding Buck (প্রজনন পাঠা)" : "Breeding Buck"}</option>
                        <option value="Kid">{bn ? "Kid (ছাগলছানা)" : "Kid"}</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'জাত (Breed)' : 'Breed'}</label>
                  <input
                    type="text"
                    value={aBreed}
                    onChange={(e) => setABreed(e.target.value)}
                    placeholder={isCattle ? 'Holstein Cross / Sahiwal' : 'Black Bengal / Jamunapari'}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'লিঙ্গ (Gender)' : 'Gender'}</label>
                  <select
                    value={aGender}
                    onChange={(e) => setAGender(e.target.value as 'Female' | 'Male')}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="Female">{bn ? "মাদি (Female)" : "Female"}</option>
                    <option value="Male">{bn ? "মর্দা (Male)" : "Male"}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'জন্ম সাল (Birth Year)' : 'Birth Year'}</label>
                  <input
                    type="text"
                    value={aBirthYear}
                    onChange={(e) => setABirthYear(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'বয়স (মাস)' : 'Age (Months)'}</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={aAgeMonths === 0 ? '' : aAgeMonths}
                    onChange={(e) => setAAgeMonths(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'কেনার তারিখ' : 'Purchase Date'}</label>
                  <input
                    type="date"
                    value={aPurchaseDate}
                    onChange={(e) => setAPurchaseDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'ক্রয়মূল্য (৳)' : 'Purchase Price (৳)'}</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={aPurchasePrice === 0 ? '' : aPurchasePrice}
                    onChange={(e) => setAPurchasePrice(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'বর্তমান ওজন (কেজি)' : 'Current Weight (KG)'}</label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    placeholder="0"
                    value={aWeightKg === 0 ? '' : aWeightKg}
                    onChange={(e) => setAWeightKg(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'বর্তমান অবস্থা' : 'Current Status'}</label>
                  <select
                    value={aHealthStatus}
                    onChange={(e) => setAHealthStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="Lactating">{bn ? "দুধ দেয় (Lactating)" : "Lactating"}</option>
                    <option value="Healthy">{bn ? "সুস্থ (Healthy)" : "Healthy"}</option>
                    <option value="Pregnant">{bn ? "গর্ভবতী (Pregnant)" : "Pregnant"}</option>
                    <option value="Under Observation">{bn ? "পর্যবেক্ষণে (Under Observation)" : "Under Observation"}</option>
                    <option value="Treatment">{bn ? "চিকিৎসাধীন (Under Treatment)" : "Under Treatment"}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'বাবার আইডি (Sire ID)' : 'Sire ID (Father)'}</label>
                  <input
                    type="text"
                    value={aSireTag}
                    onChange={(e) => setASireTag(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'মায়ের আইডি (Dam ID)' : 'Dam ID (Mother)'}</label>
                  <input
                    type="text"
                    value={aDamTag}
                    onChange={(e) => setADamTag(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>{bn ? 'সেভ করা হচ্ছে...' : 'Saving...'}</span>
                  </>
                ) : (
                  <span>{bn ? `+ নতুন ${isCattle ? 'গরুর' : 'ছাগলের'} Digital ID সেভ করুন` : `+ Save New ${isCattle ? 'Cattle' : 'Goat'} ID Profile`}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB B: দুধ উৎপাদনের হিসাব (Morning + Evening) ও ওজন বৃদ্ধি (ADG)
         ===================================================================== */}
      {activeSubTab === 'B_MILK_WEIGHT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Morning + Evening Milk Production Form */}
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Milk className="h-4 w-4 text-emerald-600" />
                    {bn ? 'B1. প্রতিদিনের দুধ উৎপাদনের হিসাব (Morning + Evening Milk Log)' : 'B1. Daily Milk Production & Sales Log'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    পশু:{' '}
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {selectedAnimal?.animalTag} ({selectedAnimal?.name})
                    </span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleRecordDailyMilkB} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">{bn ? 'তারিখ (Date)' : 'Date'}</label>
                    <input
                      type="date"
                      value={bMilkDate}
                      onChange={(e) => setBMilkDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                      {bn ? 'সকাল (Morning লিটার) *' : 'Morning Yield (Liters) *'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      placeholder="0"
                      value={bMorningLiters === 0 ? '' : bMorningLiters}
                      onChange={(e) => setBMorningLiters(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                      {bn ? 'বিকেল (Evening লিটার) *' : 'Evening Yield (Liters) *'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      placeholder="0"
                      value={bEveningLiters === 0 ? '' : bEveningLiters}
                      onChange={(e) => setBEveningLiters(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">{bn ? 'খামারে/বাছুরকে ব্যবহার (লি.)' : 'Calf / Farm Usage (Liters)'}</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      placeholder="0"
                      value={bFarmUseLiters === 0 ? '' : bFarmUseLiters}
                      onChange={(e) => setBFarmUseLiters(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">{bn ? 'নষ্ট দুধ (Wasted লি.)' : 'Wasted / Spoilage (Liters)'}</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      placeholder="0"
                      value={bWastedLiters === 0 ? '' : bWastedLiters}
                      onChange={(e) => setBWastedLiters(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">{bn ? 'প্রতি লিটার দাম (৳)' : 'Rate / Liter (৳)'}</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="0"
                      value={bMilkPricePerLiter === 0 ? '' : bMilkPricePerLiter}
                      onChange={(e) => setBMilkPricePerLiter(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Live Calculation Summary Strip */}
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3.5 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[11px] text-slate-500">{bn ? "আজকের মোট দুধ" : "Total Daily Yield"}</div>
                    <div className="text-base font-mono font-bold text-slate-900 dark:text-slate-100">
                      {totalDailyMilk} লিটার
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">{bn ? "বিক্রিযোগ্য দুধ" : "Commercial Sold"}</div>
                    <div className="text-base font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {soldDailyMilk} {bn ? "লিটার" : "L"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">{bn ? "আজকের দুধ বিক্রির আয়" : "Daily Milk Revenue"}</div>
                    <div className="text-base font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {formatBDT(dailyMilkRevenue)}
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
                      <span>{bn ? 'দুধের হিসাব সেভ হচ্ছে...' : 'Saving Milk Log...'}</span>
                    </>
                  ) : (
                    <span>{bn ? '+ আজকের দুধের হিসাব ও বিক্রয় আয় সেভ করুন' : '+ Save Daily Milk Yield & Revenue'}</span>
                  )}
                </button>
              </form>
            </div>

            {/* Right: Weight Growth & Qurbani/Fattening ADG Calculator */}
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-600" />
                {bn ? 'B2. ওজনের ইতিহাস ও মোটাতাজাকরণ (Weight Growth & Target Tracker)' : 'B2. Weight Growth & Beef Fattening Target Tracker'}
              </h3>
              <p className="text-xs text-slate-500">
                প্রতি মাসে বা সপ্তাহে ওজন মেপে রেকর্ড রাখুন এবং বিক্রির সম্ভাব্য বাজারমূল্য দেখুন।
              </p>

              <form onSubmit={handleUpdateWeightB} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">{bn ? 'পরিমাপের তারিখ' : 'Weighing Date'}</label>
                    <input
                      type="date"
                      value={wMeasureDate}
                      onChange={(e) => setWMeasureDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">{bn ? 'পূর্বের ওজন' : 'Previous Weight'}</label>
                    <input
                      type="text"
                      disabled
                      value={`${selectedAnimal?.currentWeightKg || 0} কেজি`}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                      {bn ? 'নতুন ওজন (কেজি) *' : 'New Weight (KG) *'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      placeholder="0"
                      value={wNewWeightKg === 0 ? '' : wNewWeightKg}
                      onChange={(e) => setWNewWeightKg(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">
                      {bn ? 'টার্গেট ওজন (কোরবানি/বিক্রি কেজি)' : 'Target Market Weight (KG)'}
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={wTargetWeightKg === 0 ? '' : wTargetWeightKg}
                      onChange={(e) => setWTargetWeightKg(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      {bn ? 'আনুমানিক লাইভ ওয়েট দর (৳/কেজি)' : 'Live Weight Rate (৳/KG)'}
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={wExpectedPricePerKg === 0 ? '' : wExpectedPricePerKg}
                      onChange={(e) => setWExpectedPricePerKg(parseNum(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3.5 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-500">{bn ? "বর্তমান ওজনে সম্ভাব্য বাজারমূল্য" : "Current Live Valuation"}</div>
                    <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatBDT(Number(wNewWeightKg) * Number(wExpectedPricePerKg))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">{bn ? "টার্গেট ওজনে সম্ভাব্য বাজারমূল্য" : "Target Market Valuation"}</div>
                    <div className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {formatBDT(Number(wTargetWeightKg) * Number(wExpectedPricePerKg))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-bold hover:opacity-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>{bn ? 'ওজন আপডেট হচ্ছে...' : 'Updating Weight...'}</span>
                    </>
                  ) : (
                    <span>{bn ? `+ নতুন ওজন (${wNewWeightKg} কেজি) সংরক্ষণ করুন` : `+ Save Weight Log (${wNewWeightKg} KG)`}</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Comparative Milk Yield Ranking & History Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {bn ? 'কোন পশু কত দুধ দিচ্ছে ও ওজন কত — তুলনামূলক তালিকা ও ইতিহাস (Milk & Weight History)' : 'Livestock Comparative Performance, Milk Yield & Weight Tracker'}
                </h4>
                <p className="text-xs text-slate-500">
                  এতে সহজেই বুঝবেন কোন গরু বেশি দুধ দিচ্ছে এবং কার উৎপাদন কমে যাচ্ছে
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="py-3 px-4">{bn ? "Digital ID ও নাম" : "Digital ID & Name"}</th>
                    <th className="py-3 px-4">{bn ? "জাত ও বর্তমান অবস্থা" : "Breed & Status"}</th>
                    <th className="py-3 px-4 text-right">{bn ? "বর্তমান ওজন" : "Current Weight"}</th>
                    <th className="py-3 px-4 text-right">{bn ? "মোট দুধ উৎপাদন (লিটার)" : "Total Milk (Liters)"}</th>
                    <th className="py-3 px-4 text-right">{bn ? "মোট দুধ বিক্রির আয়" : "Milk Sales Revenue"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {animals.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold">
                        {a.animalTag} — <span className="font-sans">{a.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        {a.breed} · <span className="text-emerald-600 font-semibold">{a.healthStatus}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {a.currentWeightKg} কেজি
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {a.totalMilkLiters} লিটার
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {formatBDT(a.milkSalesRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {milkHistoryLogs.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {bn ? 'সাম্প্রতিক সকাল-বিকেল দুধ উৎপাদনের লগ (Daily Morning/Evening Logs):' : 'Recent Morning & Evening Milk Production Logs:'}
                </div>
                {milkHistoryLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="text-xs font-mono bg-white dark:bg-slate-900 px-3 py-2 rounded border border-slate-200 dark:border-slate-800"
                  >
                    {log.details}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB C: খাবারের খরচ — Individual ও Group Feeding Record
         ===================================================================== */}
      {activeSubTab === 'C_FEEDING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Utensils className="h-4 w-4 text-emerald-600" />
              {bn ? 'C. প্রতিদিনের খাবারের হিসাব (Individual & Group Feeding Calculator)' : 'C. Daily Feed Calculator (Individual & Group Feeding)'}
            </h3>
            <p className="text-xs text-slate-500">
              সব গরু/ছাগলকে একই পরিমাণ খাবার দেওয়া হয় না। আপনি চাইলে নির্দিষ্ট ১টি পশুর জন্য অথবা সব পশুর জন্য একসঙ্গে (Group Feeding) হিসাব রাখতে পারবেন।
            </p>

            <form onSubmit={handleRecordFeedingC} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1.5">
                  {bn ? 'খাবার বণ্টনের পদ্ধতি নির্বাচন করুন (Feeding Allocation Method):' : 'Select Feeding Method:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCFeedMode('individual')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      cFeedMode === 'individual'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>{bn ? "১. একক পশুর খাবার" : "1. Individual Animal"}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {bn ? `শুধু ${selectedAnimal?.animalTag}-এর জন্য` : `Only for ${selectedAnimal?.animalTag}`}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCFeedMode('group_equal')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      cFeedMode === 'group_equal'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>{bn ? "২. যৌথ খাবার (সমান ভাগ)" : "2. Group Feeding (Equal)"}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {bn ? "সব পশুর মধ্যে সমানভাবে বণ্টন" : "Equal split across herd"}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCFeedMode('group_weight_ratio')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      cFeedMode === 'group_weight_ratio'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>{bn ? "৩. যৌথ (ওজন অনুপাতে)" : "3. Group (Weight Ratio)"}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {bn ? "পশুর শরীরের ওজন অনুযায়ী বণ্টন" : "Proportional by body weight"}
                    </div>
                  </button>
                </div>
              </div>

              {/* 4 Feed Items Table (Grass, Straw, Wheat Bran, Other) */}
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                      <th className="py-2.5 px-3">{bn ? "খাবারের নাম (Feed Item)" : "Feed Item"}</th>
                      <th className="py-2.5 px-3">{bn ? "দৈনিক পরিমাণ (কেজি)" : "Daily Qty (KG)"}</th>
                      <th className="py-2.5 px-3">{bn ? "প্রতি কেজির দাম (৳)" : "Price / KG (৳)"}</th>
                      <th className="py-2.5 px-3 text-right">{bn ? "দৈনিক খরচ (৳)" : "Daily Cost (৳)"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="py-2 px-3 font-semibold">{bn ? "কাঁচা ঘাস (Green Grass / Napier)" : "Green Grass / Napier"}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          placeholder="0"
                          value={cGrassKg === 0 ? '' : cGrassKg}
                          onChange={(e) => setCGrassKg(parseNum(e.target.value))}
                          className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={cGrassRate === 0 ? '' : cGrassRate}
                          onChange={(e) => setCGrassRate(parseNum(e.target.value))}
                          className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatBDT(cGrassKg * cGrassRate)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">{bn ? "খড় (Dry Paddy Straw)" : "Dry Paddy Straw"}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          placeholder="0"
                          value={cStrawKg === 0 ? '' : cStrawKg}
                          onChange={(e) => setCStrawKg(parseNum(e.target.value))}
                          className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={cStrawRate === 0 ? '' : cStrawRate}
                          onChange={(e) => setCStrawRate(parseNum(e.target.value))}
                          className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatBDT(cStrawKg * cStrawRate)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">{bn ? "ভুসি ও দানাদার (Wheat Bran)" : "Wheat Bran & Concentrates"}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          placeholder="0"
                          value={cBranKg === 0 ? '' : cBranKg}
                          onChange={(e) => setCBranKg(parseNum(e.target.value))}
                          className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={cBranRate === 0 ? '' : cBranRate}
                          onChange={(e) => setCBranRate(parseNum(e.target.value))}
                          className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatBDT(cBranKg * cBranRate)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">{bn ? "অন্যান্য খাবার (খৈল / মিনারেল / ভিটামিন)" : "Oil Cake, Minerals & Salt"}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          placeholder="0"
                          value={cOtherKg === 0 ? '' : cOtherKg}
                          onChange={(e) => setCOtherKg(parseNum(e.target.value))}
                          className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={cOtherRate === 0 ? '' : cOtherRate}
                          onChange={(e) => setCOtherRate(parseNum(e.target.value))}
                          className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatBDT(cOtherKg * cOtherRate)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'কত দিনের খাবার একসাথে যোগ করবেন?' : 'Ration Duration (Days):'}</label>
                  <select
                    value={cDaysCount}
                    onChange={(e) => setCDaysCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-semibold"
                  >
                    <option value={1}>{bn ? "১ দিনের খাবার (Daily Entry)" : "1 Day (Daily Entry)"}</option>
                    <option value={7}>{bn ? "৭ দিনের খাবার (Weekly Entry)" : "7 Days (Weekly Ration)"}</option>
                    <option value={15}>{bn ? "১৫ দিনের খাবার (Bi-Weekly)" : "15 Days (Bi-Weekly)"}</option>
                    <option value={30}>{bn ? "৩০ দিনের / ১ মাসের খাবার (Monthly)" : "30 Days (Monthly Ration)"}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'গোডাউন স্টক থেকে কমান (ঐচ্ছিক)' : 'Deduct from Warehouse Stock (Optional)'}</label>
                  <select
                    value={cSelectedInvId}
                    onChange={(e) => setCSelectedInvId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="">{bn ? "সরাসরি বাজার/খামার থেকে (স্টক অপরিবর্তিত)" : "Direct Farm/Market (Inventory Unchanged)"}</option>
                    {feedInventory.map((fi) => (
                      <option key={fi.id} value={fi.id}>
                        {fi.name} (মজুদ: {fi.quantity} {fi.unit})
                      </option>
                    ))}
                  </select>
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
                    <span>{bn ? 'খাবারের খরচ যোগ হচ্ছে...' : 'Adding Feed Expense...'}</span>
                  </>
                ) : (
                  <span>{bn ? `+ খাবারের খরচ (${formatBDT(totalPeriodFeedCost)}) প্রোফাইলে যোগ করুন` : `+ Add Feed Expense (${formatBDT(totalPeriodFeedCost)}) to Record`}</span>
                )}
              </button>
            </form>
          </div>

          {/* Right: Daily & Monthly Ration Summary Card */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {bn ? 'দৈনিক ও মাসিক খাবারের হিসাব সারসংক্ষেপ (Ration Summary)' : 'Daily & Monthly Ration Cost Summary'}
            </h4>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
                <span>{bn ? "দৈনিক মোট খাবারের ওজন:" : "Daily Total Ration Weight:"}</span>
                <span className="font-mono font-bold text-sm">{dailyRationKg} কেজি / দিন</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
                <span>{bn ? "দৈনিক খাবারের খরচ (Daily Cost):" : "Daily Feed Cost:"}</span>
                <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                  {formatBDT(dailyRationCost)}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
                <span>{bn ? "মাসিক প্রাক্কলিত খরচ (৩০ দিন):" : "Estimated Monthly Cost (30 Days):"}</span>
                <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                  {formatBDT(monthlyEstimatedFeedCost)}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                <span className="font-bold">
                  {selectedAnimal?.animalTag} — {bn ? 'এ পর্যন্ত মোট খাবার খরচ:' : 'Cumulative Lifetime Feed Cost:'}
                </span>
                <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400">
                  {formatBDT(selectedAnimal?.feedCost || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB D: চিকিৎসা, ভ্যাকসিন, গর্ভধারণ ও বাছুর/বাচ্চা জন্ম রেজিস্ট্রেশন
         ===================================================================== */}
      {activeSubTab === 'D_VET_BREEDING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 9-Point Veterinary, Vaccine & Pregnancy Form */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-600" />
              {bn ? 'D1. চিকিৎসা, ভ্যাকসিন ও গর্ভধারণের হিসাব (Vet, Vaccine & Pregnancy)' : 'D1. Veterinary Care, Vaccines & Pregnancy Tracking'}
            </h3>

            <form onSubmit={handleRecordVetAndBreedingD} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{bn ? '১. রোগের নাম ও লক্ষণ' : '1. Disease / Symptoms'}</label>
                  <input
                    type="text"
                    value={dDiseaseName}
                    onChange={(e) => setDDiseaseName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? '২. চিকিৎসকের নাম (Vet Doctor)' : '2. Attending Veterinarian'}</label>
                  <input
                    type="text"
                    value={dDoctorName}
                    onChange={(e) => setDDoctorName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{bn ? '৩. চিকিৎসার তারিখ' : '3. Treatment Date'}</label>
                  <input
                    type="date"
                    value={dTreatDate}
                    onChange={(e) => setDTreatDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? '৪. ওষুধের নাম' : '4. Administered Medicines'}</label>
                  <input
                    type="text"
                    value={dMedicineName}
                    onChange={(e) => setDMedicineName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'ওষুধ ও ডাক্তার খরচ (৳)' : 'Vet & Medicine Cost (৳)'}</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={dMedCost === 0 ? '' : dMedCost}
                    onChange={(e) => setDMedCost(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'ভ্যাকসিনের নাম' : 'Vaccine Name'}</label>
                  <input
                    type="text"
                    value={dVaccineName}
                    onChange={(e) => setDVaccineName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? '৫. ভ্যাকসিনের তারিখ' : '5. Vaccination Date'}</label>
                  <input
                    type="date"
                    value={dVaccineDate}
                    onChange={(e) => setDVaccineDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-amber-600 dark:text-amber-400">
                    {bn ? '৬. পরবর্তী ভ্যাকসিনের তারিখ (Booster Date)' : '6. Next Booster Vaccine Date'}
                  </label>
                  <input
                    type="date"
                    value={dNextVaccineDate}
                    onChange={(e) => setDNextVaccineDate(e.target.value)}
                    className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Pregnancy & Expected Delivery Date Calculator */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <label className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dIsPregnant}
                    onChange={(e) => setDIsPregnant(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>{bn ? "৭. গর্ভধারণের তথ্য যুক্ত করুন (Mark as Pregnant & Calculate Delivery Date)" : "7. Mark as Pregnant & Calculate Delivery Date"}</span>
                </label>

                {dIsPregnant && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold mb-1">{bn ? 'বীজ দেওয়ার / প্রজননের তারিখ' : 'Insemination / Breeding Date'}</label>
                      <input
                        type="date"
                        value={dBreedingDate}
                        onChange={(e) => setDBreedingDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">ষাঁড় বা পাঠার আইডি/সিমেন</label>
                      <input
                        type="text"
                        value={dSireUsed}
                        onChange={(e) => setDSireUsed(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                        ৮. সম্ভাব্য বাচ্চা জন্মের তারিখ
                      </label>
                      <input
                        type="text"
                        disabled
                        value={expectedDeliveryDate}
                        className="w-full rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 font-mono font-bold text-emerald-800 dark:text-emerald-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>{bn ? 'তথ্য সেভ হচ্ছে...' : 'Saving Information...'}</span>
                  </>
                ) : (
                  <span>+ চিকিৎসা, ভ্যাকসিন ও প্রজনন তথ্য সেভ করুন</span>
                )}
              </button>
            </form>
          </div>

          {/* Right: 9. Newborn Calf / Kid Registration (Auto Parent Relationship Link) */}
          <div className="lg:col-span-5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Baby className="h-5 w-5 text-emerald-600" />
              ৯. বাচ্চা জন্ম নিলে নতুন Digital ID তৈরি করুন (Newborn Offspring)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              একটি {isCattle ? 'গরু বাছুর' : 'ছাগল বাচ্চা'} জন্ম দিলে এখানে ক্লিক করলেই সেই বাচ্চার জন্য নতুন ID তৈরি হবে এবং তার <strong>মা ({selectedAnimal?.animalTag})</strong> ও <strong>বাবার সম্পর্ক</strong> স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকবে।
            </p>

            <form onSubmit={handleRegisterNewbornOffspring} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">
                    নতুন {isCattle ? 'বাছুরের' : 'বাচ্চার'} Digital ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newbornTag}
                    onChange={(e) => setNewbornTag(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{bn ? 'বাচ্চার নাম *' : 'Newborn Name *'}</label>
                  <input
                    type="text"
                    required
                    value={newbornName}
                    onChange={(e) => setNewbornName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">লিঙ্গ</label>
                  <select
                    value={newbornGender}
                    onChange={(e) => setNewbornGender(e.target.value as 'Female' | 'Male')}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="Female">মাদি (Female)</option>
                    <option value="Male">মর্দা (Male)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">জন্ম ওজন (কেজি)</label>
                  <input
                    type="number"
                    step="0.2"
                    placeholder="0"
                    value={newbornWeight === 0 ? '' : newbornWeight}
                    onChange={(e) => setNewbornWeight(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">জন্মের তারিখ</label>
                  <input
                    type="date"
                    value={newbornBirthDate}
                    onChange={(e) => setNewbornBirthDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">মায়ের আইডি (Mother / Dam)</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedAnimal?.animalTag || ''} (${selectedAnimal?.name || ''})`}
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">বাবার আইডি (Father / Sire)</label>
                  <input
                    type="text"
                    value={newbornSireTag}
                    onChange={(e) => setNewbornSireTag(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-bold hover:opacity-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>{bn ? 'বাচ্চার ID তৈরি হচ্ছে...' : 'Creating Offspring ID...'}</span>
                  </>
                ) : (
                  <span>+ সদ্যজাত {isCattle ? 'বাছুরের' : 'ছাগলছানার'} নতুন ID তৈরি করুন</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB E: বংশলতিকা ও পরিবার বৃক্ষ (Interactive Family Tree)
         ===================================================================== */}
      {activeSubTab === 'E_FAMILY_TREE' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-emerald-600" />
                E. বংশলতিকা ও সন্তানদের তালিকা (Interactive Family Tree — মা, বাবা ও বাচ্চাদের সম্পর্ক)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                কোন মা {isCattle ? 'গাভী' : 'ছাগলের'} কয়টি বাচ্চা হয়েছে, কোন বাচ্চা কখন জন্মেছে এবং তাদের বর্তমান অবস্থা কী—সবকিছু Family Tree আকারে দেখুন।
              </p>
            </div>
          </div>

          {selectedAnimal && (
            <div className="space-y-6">
              {/* Generation 1: Parents of Selected Animal */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  ১ম প্রজন্ম — পিতা-মাতা (Parents / Lineage of {selectedAnimal.animalTag})
                </div>
                <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedAnimal.parentTag || 'খামারের মূল ফাউন্ডেশন ব্রিড'}
                </div>
              </div>

              {/* Generation 2: Selected Parent Animal */}
              <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    নির্বাচিত পশু (Selected Animal)
                  </span>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    <span className="font-mono">{selectedAnimal.animalTag}</span> — {selectedAnimal.name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    জাত: {selectedAnimal.breed} · বয়স: {selectedAnimal.ageMonths} মাস · ওজন:{' '}
                    {selectedAnimal.currentWeightKg} কেজি · অবস্থা: {selectedAnimal.healthStatus}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedAnimal.breedingAndOffspringNotes}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs text-slate-500">সন্তান সংখ্যা (Registered Offspring)</div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {getOffspringOf(selectedAnimal.animalTag).length} টি
                  </div>
                </div>
              </div>

              {/* Generation 3: Offspring / Kids Cards */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  পরবর্তী প্রজন্ম — {selectedAnimal.animalTag}-এর বাচ্চাগুলোর আলাদা প্রোফাইল (Offspring / Kids):
                </div>

                {getOffspringOf(selectedAnimal.animalTag).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-xs text-slate-500">
                    এই পশুটির অধীনে এখনো আলাদা বাচ্চা নিবন্ধিত হয়নি। উপরের <strong>&ldquo;ধাপ D: চিকিৎসা, প্রজনন ও বাচ্চা&rdquo;</strong> ট্যাবে গিয়ে ১ ক্লিকে বাচ্চার নতুন ID যোগ করতে পারেন।
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getOffspringOf(selectedAnimal.animalTag).map((kid) => (
                      <div
                        key={kid.id}
                        onClick={() => setSelectedAnimalId(kid.id)}
                        className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500 transition-all space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                            {kid.animalTag}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                            {kid.status}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {kid.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          লিঙ্গ: {kid.gender === 'Female' ? 'মাদি' : 'মর্দা'} · বর্তমান ওজন:{' '}
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {kid.currentWeightKg} কেজি
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          জন্মের তারিখ: {kid.purchaseDate}
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          {kid.parentTag}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB F: পশু বিক্রির হিসাব ও চূড়ান্ত আজীবন লাভ-ক্ষতি (Sale & Lifetime Profit)
         ===================================================================== */}
      {activeSubTab === 'F_SALE_PROFIT' && selectedAnimal && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Exact Financial Report Card as requested in User Prompt */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-emerald-600">
                  Individual Animal Financial Statement
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedAnimal.animalTag} ({selectedAnimal.name}) — সম্পূর্ণ আর্থিক ও লাভ-ক্ষতি হিসাব
                </h3>
              </div>
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-3 px-4">আর্থিক বিবরণ (Financial Breakdown)</th>
                    <th className="py-3 px-4 text-right">টাকার পরিমাণ (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-3 px-4 font-semibold">১. ক্রয়মূল্য (Purchase Price)</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {formatBDT(animPurchasePrice)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">
                      ২. খাবারের মোট খরচ (Allocated Feed Cost)
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatBDT(animFeedCost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">
                      ৩. চিকিৎসা, ভ্যাকসিন ও অন্যান্য বরাদ্দ খরচ (Vet & Care Cost)
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatBDT(animVetCost)}
                    </td>
                  </tr>
                  <tr className="bg-amber-50/60 dark:bg-amber-950/20 font-bold">
                    <td className="py-3 px-4">
                      মোট বিনিয়োগ (Total Investment = কেনা + খাবার + চিকিৎসা)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400">
                      {formatBDT(animTotalInvestment)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">
                      ৪. পশু বিক্রয়মূল্য / বর্তমান বাজারমূল্য (Animal Sale Value)
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatBDT(animSaleOrMarketVal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">
                      পশু বিক্রি থেকে প্রকৃত লাভ (Sale Price − Total Investment)
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        animDirectSaleProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {formatBDT(animDirectSaleProfit)}
                    </td>
                  </tr>
                  {animMilkRevenue > 0 && (
                    <tr>
                      <td className="py-3 px-4 font-semibold text-emerald-700 dark:text-emerald-400">
                        ৫. দুধ বিক্রির মোট আয় ({selectedAnimal.totalMilkLiters} লিটার দুধ)
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        + {formatBDT(animMilkRevenue)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-bold text-sm">
                    <td className="py-3.5 px-4 text-slate-900 dark:text-slate-100">
                      সর্বমোট আজীবন প্রকৃত লাভ (Total Lifetime Net Profit)
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono text-base ${
                        animLifetimeTotalProfit >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-600'
                      }`}
                    >
                      {formatBDT(animLifetimeTotalProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Record Animal Sale or Update Valuation Form */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {selectedAnimal.animalTag} বিক্রির হিসাব লিখুন (Record Animal Sale)
            </h3>
            <p className="text-xs text-slate-500">
              ধরুন, আপনি {selectedAnimal.animalTag} {formatBDT(animPurchasePrice)}-এ কিনেছিলেন এবং{' '}
              {formatBDT(animAllocatedCost)} খরচ করেছেন। এখন বিক্রয়মূল্য দিলে সিস্টেম নিজে প্রকৃত লাভ হিসাব করবে।
            </p>

            <form onSubmit={handleRecordAnimalSaleF} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">বিক্রয়মূল্য (Sale Price ৳) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="0"
                  value={fSalePrice === 0 ? '' : fSalePrice}
                  onChange={(e) => setFSalePrice(parseNum(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">ক্রেতার নাম (Buyer Name)</label>
                  <input
                    type="text"
                    value={fBuyerName}
                    onChange={(e) => setFBuyerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">বিক্রির তারিখ</label>
                  <input
                    type="date"
                    value={fSaleDate}
                    onChange={(e) => setFSaleDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={fPaymentMethod}
                    onChange={(e) => setFPaymentMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="Cash">Cash (নগদ)</option>
                    <option value="Bank">Bank (ব্যাংক)</option>
                    <option value="Mobile Payment">Mobile Payment (বিকাশ/নগদ)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">বকেয়া টাকা (Due ৳)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={fDueAmount === 0 ? '' : fDueAmount}
                    onChange={(e) => setFDueAmount(parseNum(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fMarkAsSold}
                  onChange={(e) => setFMarkAsSold(e.target.checked)}
                />
                <span>চূড়ান্তভাবে বিক্রি সম্পন্ন হয়েছে এবং ক্যাশ/ব্যাংক খতিয়ানে জমা করুন</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>{bn ? 'বিক্রির হিসাব আপডেট হচ্ছে...' : 'Updating Sales...'}</span>
                  </>
                ) : (
                  <span>{bn ? 'বিক্রির হিসাব ও লাভ-ক্ষতি আপডেট করুন' : 'Update Sale & Profit'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          EAR TAG & BARCODE SLIP MODAL (PRINTABLE)
         ===================================================================== */}
      {showEarTagModal && selectedAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {bn ? 'পশুর ডিজিটাল বারকোড ও ইয়ার ট্যাগ স্লিপ' : 'Animal Barcode & Ear Tag Slip'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEarTagModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Tag Badge */}
            <div className="border-2 border-dashed border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800 rounded-xl p-5 space-y-4 text-center">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider pb-1 border-b border-amber-200 dark:border-amber-900/50">
                <span>{activeBusiness.name}</span>
                <span>Enterprise Agro ERP</span>
              </div>

              <div>
                <div className="text-3xl font-mono font-black tracking-widest text-slate-900 dark:text-slate-100 py-1">
                  {selectedAnimal.animalTag}
                </div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {selectedAnimal.name} ({selectedAnimal.breed})
                </div>
              </div>

              {/* High-Contrast Visual Barcode Graphic */}
              <div className="bg-white p-3 rounded-lg border border-slate-300 dark:border-slate-700 inline-block shadow-xs">
                <svg className="w-64 h-16 mx-auto" viewBox="0 0 260 60">
                  {[
                    2, 5, 2, 8, 3, 4, 2, 7, 3, 5, 2, 9, 4, 3, 2, 6, 3, 5, 2, 8, 4, 2, 3, 7, 2, 6,
                    3, 4, 2, 8, 3, 5, 2, 7, 4, 3, 2, 8, 3, 6, 2, 5, 4, 2, 3, 7, 2, 6, 3, 5,
                  ].map((bar, i) => (
                    <rect
                      key={i}
                      x={i * 5 + 4}
                      y="4"
                      width={bar > 4 ? 3 : 1.5}
                      height="44"
                      fill="#0f172a"
                    />
                  ))}
                  <text
                    x="130"
                    y="56"
                    textAnchor="middle"
                    className="font-mono text-[10px] font-bold"
                    fill="#334155"
                  >
                    *{selectedAnimal.animalTag}*
                  </text>
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left text-xs bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                <div>
                  <span className="text-slate-500 block text-[10px]">{bn ? 'জাত ও লিঙ্গ' : 'Breed & Gender'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAnimal.breed} ({selectedAnimal.gender})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{bn ? 'বর্তমান ওজন' : 'Current Weight'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAnimal.currentWeightKg} কেজি
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{bn ? 'কেনার / জন্ম তারিখ' : 'Birth/Purchase Date'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAnimal.purchaseDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{bn ? 'স্বাস্থ্য অবস্থা' : 'Health Status'}</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {selectedAnimal.healthStatus || 'সুস্থ'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-tight">
                {bn
                  ? '💡 পরামর্শ: কানের হলুদ ট্যাগে বা কলার ট্যাগে এই বারকোড বা কিউআর কোডটি প্রিন্ট করে লাগান। ক্যামেরা বা স্ক্যানার গান দিয়ে মুহূর্তেই তথ্য পাওয়া যাবে।'
                  : 'Attach this barcode to ear tag or neck collar for instant scanning via camera or barcode gun.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowEarTagModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {bn ? 'বন্ধ করুন' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>{bn ? 'ট্যাগ স্লিপ প্রিন্ট করুন (Print)' : 'Print Ear Tag'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CAMERA & HARDWARE BARCODE / QR SCANNER MODAL
         ===================================================================== */}
      <LivestockBarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        animals={animals}
        onSelectAnimal={(animalId) => {
          setSelectedAnimalId(animalId);
        }}
        species={isCattle ? 'cattle' : 'goat'}
        lang={lang}
      />
    </div>
  );
}
