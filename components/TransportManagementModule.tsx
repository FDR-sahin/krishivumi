'use client';

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Printer,
  Eye,
  Trash2,
  X,
  Upload,
  ArrowRight,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Navigation,
  Fuel,
  Wrench,
  Percent,
  FileSpreadsheet,
  Download,
  Users,
  CreditCard,
  Building2,
  Phone,
  MapPin,
  FileText,
  ShieldCheck,
  AlertCircle,
  Gauge,
  Layers,
  ChevronRight,
  Check,
  Receipt,
  UserCheck,
} from 'lucide-react';
import {
  ErpBusiness,
  ErpTransportOp,
  ErpJournalEntry,
  ErpAccount,
  ErpAuditLog,
  ErpStakeholder,
  ErpUser,
  UserRole,
  formatBDT,
} from '@/lib/erp-types';
import {
  createTransportOpRecord,
  updateTransportOpRecord,
  postDoubleEntryTransaction,
  deleteTransportOp,
} from '@/lib/erp-service';
import TripChallanModal from './TripChallanModal';
import { triggerGlobalToast, triggerConfirmDelete } from './GlobalToastAndConfirmModal';

interface TransportManagementModuleProps {
  activeBusiness: ErpBusiness;
  ops: ErpTransportOp[];
  journalEntries: ErpJournalEntry[];
  accounts: ErpAccount[];
  auditLogs: ErpAuditLog[];
  stakeholders?: ErpStakeholder[];
  erpUsers?: ErpUser[];
  currentUser?: ErpUser | { id?: string; email?: string; displayName?: string; photoUrl?: string } | null;
  userRole?: UserRole | string;
  ownerId: string;
  actorEmail: string;
  onNotify: (msg: string) => void;
  lang?: 'en' | 'bn';
}

type TransportTab =
  | 'dashboard'
  | 'vehicles'
  | 'trips'
  | 'fuel'
  | 'drivers'
  | 'maintenance'
  | 'expenses'
  | 'reports';

const MONTH_NAMES = [
  { code: '01', nameEn: 'January', nameBn: 'জানুয়ারি' },
  { code: '02', nameEn: 'February', nameBn: 'ফেব্রুয়ারি' },
  { code: '03', nameEn: 'March', nameBn: 'মার্চ' },
  { code: '04', nameEn: 'April', nameBn: 'এপ্রিল' },
  { code: '05', nameEn: 'May', nameBn: 'মে' },
  { code: '06', nameEn: 'June', nameBn: 'জুন' },
  { code: '07', nameEn: 'July', nameBn: 'জুলাই' },
  { code: '08', nameEn: 'August', nameBn: 'আগস্ট' },
  { code: '09', nameEn: 'September', nameBn: 'সেপ্টেম্বর' },
  { code: '10', nameEn: 'October', nameBn: 'অক্টোবর' },
  { code: '11', nameEn: 'November', nameBn: 'নভেম্বর' },
  { code: '12', nameEn: 'December', nameBn: 'ডিসেম্বর' },
];

export default function TransportManagementModule({
  activeBusiness,
  ops,
  journalEntries,
  accounts,
  auditLogs,
  stakeholders = [],
  erpUsers = [],
  currentUser,
  userRole = 'super_admin',
  ownerId,
  actorEmail,
  onNotify,
  lang = 'bn',
}: TransportManagementModuleProps) {
  const bn = lang === 'bn';

  // 1. Navigation & Global State
  const [activeTab, setActiveTab] = useState<TransportTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedTruckFilter, setSelectedTruckFilter] = useState<string>('ALL');
  const [selectedTripStatusFilter, setSelectedTripStatusFilter] = useState<string>('ALL');

  // Modals
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showSettlePaymentModal, setShowSettlePaymentModal] = useState(false);
  const [selectedTripChallan, setSelectedTripChallan] = useState<ErpTransportOp | null>(null);
  const [viewImageTrip, setViewImageTrip] = useState<ErpTransportOp | null>(null);
  const [targetTripForPayment, setTargetTripForPayment] = useState<ErpTransportOp | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Extracted Data Partitions (Vehicles, Trips, Fuel, Maintenance, Drivers, Expenses)
  const allVehicles = useMemo(() => {
    // Collect distinct vehicle registrations from ops or vehicle records
    const vehicleMap = new Map<string, ErpTransportOp>();
    for (const op of ops) {
      if (op.registrationNumber) {
        const reg = op.registrationNumber.trim();
        if (!vehicleMap.has(reg) || op.recordType === 'vehicle') {
          vehicleMap.set(reg, op);
        }
      }
    }
    return Array.from(vehicleMap.values());
  }, [ops]);

  const allTrips = useMemo(() => {
    return ops.filter((op) => op.recordType === 'trip' || (!op.recordType && op.origin));
  }, [ops]);

  const allFuelLogs = useMemo(() => {
    return ops.filter((op) => op.recordType === 'fuel' || (op.fuelLitres && op.fuelLitres > 0));
  }, [ops]);

  const allMaintenanceLogs = useMemo(() => {
    return ops.filter(
      (op) => op.recordType === 'vehicle_maintenance' || (op.garageName || op.partsCost)
    );
  }, [ops]);

  const allTripExpenses = useMemo(() => {
    return ops.filter((op) => op.recordType === 'expense' || op.expenseCategory);
  }, [ops]);

  const allDrivers = useMemo(() => {
    // Drivers from transport ops + transport stakeholders
    const driverMap = new Map<string, { name: string; phone?: string; license?: string; salary?: number; truck?: string }>();
    for (const op of ops) {
      if (op.driverName) {
        const name = op.driverName.trim();
        if (!driverMap.has(name)) {
          driverMap.set(name, {
            name,
            phone: op.driverPhone,
            license: op.driverLicense,
            salary: op.driverMonthlySalary,
            truck: op.registrationNumber,
          });
        }
      }
    }
    for (const stk of stakeholders) {
      if (
        stk.businessId === activeBusiness.id &&
        (stk.stakeholderType === 'employee' || stk.designationOrCategory?.includes('ড্রাইভার') || stk.designationOrCategory?.includes('Driver'))
      ) {
        if (!driverMap.has(stk.name)) {
          driverMap.set(stk.name, {
            name: stk.name,
            phone: stk.phone,
            salary: stk.monthlySalaryOrCreditLimit,
          });
        }
      }
    }
    return Array.from(driverMap.values());
  }, [ops, stakeholders, activeBusiness.id]);

  // Cash & Bank Wallets for Financial Payments
  const treasuryWallets = useMemo(() => {
    return accounts.filter((a) => a.subType === 'cash' || a.subType === 'bank');
  }, [accounts]);

  // 3. Four (4) Dynamically Selected Currently Running Trucks (EXACT REQUIREMENT)
  const runningTrips = useMemo(() => {
    return allTrips.filter((t) => t.status === 'active' || t.status === 'running');
  }, [allTrips]);

  const fourRunningTrucks = useMemo(() => {
    // If we have active running trips, take up to 4 distinct running trucks
    const selected: ErpTransportOp[] = [];
    const seenRegs = new Set<string>();
    for (const t of runningTrips) {
      if (!seenRegs.has(t.registrationNumber)) {
        seenRegs.add(t.registrationNumber);
        selected.push(t);
        if (selected.length === 4) break;
      }
    }
    // If fewer than 4 running, supplement with most recent trips marked with status
    if (selected.length < 4) {
      for (const t of allTrips) {
        if (!seenRegs.has(t.registrationNumber)) {
          seenRegs.add(t.registrationNumber);
          selected.push(t);
          if (selected.length === 4) break;
        }
      }
    }
    return selected;
  }, [runningTrips, allTrips]);

  // 4. Document & Maintenance Expiry Alerts
  const expiryAlerts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const alerts: { reg: string; docType: string; expiryDate: string; isExpired: boolean }[] = [];

    for (const v of allVehicles) {
      if (v.fitnessExpiry) {
        if (v.fitnessExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: bn ? 'ফিটনেস সার্টিফিকেট' : 'Fitness Certificate', expiryDate: v.fitnessExpiry, isExpired: true });
        } else if (v.fitnessExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: bn ? 'ফিটনেস সার্টিফিকেট' : 'Fitness Certificate', expiryDate: v.fitnessExpiry, isExpired: false });
        }
      }
      if (v.taxTokenExpiry) {
        if (v.taxTokenExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: bn ? 'ট্যাক্স টোকেন' : 'Tax Token', expiryDate: v.taxTokenExpiry, isExpired: true });
        } else if (v.taxTokenExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: bn ? 'ট্যাক্স টোকেন' : 'Tax Token', expiryDate: v.taxTokenExpiry, isExpired: false });
        }
      }
      if (v.insuranceExpiry) {
        if (v.insuranceExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: bn ? 'ইন্স্যুরেন্স' : 'Insurance', expiryDate: v.insuranceExpiry, isExpired: true });
        } else if (v.insuranceExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: bn ? 'ইন্স্যুরেন্স' : 'Insurance', expiryDate: v.insuranceExpiry, isExpired: false });
        }
      }
      if (v.routePermitExpiry) {
        if (v.routePermitExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: bn ? 'রুট পারমিট' : 'Route Permit', expiryDate: v.routePermitExpiry, isExpired: true });
        } else if (v.routePermitExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: bn ? 'রুট পারমিট' : 'Route Permit', expiryDate: v.routePermitExpiry, isExpired: false });
        }
      }
      if (v.nextServiceDate) {
        if (v.nextServiceDate < today) {
          alerts.push({ reg: v.registrationNumber, docType: bn ? 'শিডিউল সার্ভিসিং' : 'Scheduled Service', expiryDate: v.nextServiceDate, isExpired: true });
        } else if (v.nextServiceDate <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: bn ? 'শিডিউল সার্ভিসিং' : 'Scheduled Service', expiryDate: v.nextServiceDate, isExpired: false });
        }
      }
    }
    return alerts;
  }, [allVehicles, bn]);

  // 5. Dashboard Top 9 Summary KPIs
  const dashboardKpis = useMemo(() => {
    const totalTrucks = allVehicles.length;
    const runningCount = runningTrips.length;
    const maintenanceCount = allVehicles.filter((v) => v.status === 'maintenance').length;
    const availableCount = Math.max(0, totalTrucks - runningCount - maintenanceCount);
    const totalDrivers = allDrivers.length;
    const totalDistance = allTrips.reduce((s, t) => s + Number(t.distanceKm || 0), 0);

    // Filter by month/year for monthly metrics
    const currentMonthPrefix = selectedMonth !== 'ALL' ? `${selectedYear}-${selectedMonth}` : selectedYear;
    const monthlyTrips = allTrips.filter((t) => t.date && t.date.startsWith(currentMonthPrefix));
    const monthlyRevenue = monthlyTrips.reduce((s, t) => s + Number(t.tripRevenue || 0), 0);
    const monthlyExpenses = monthlyTrips.reduce((s, t) => {
      const exp = t.tripExpense !== undefined ? t.tripExpense : Number(t.fuelCost || 0) + Number(t.tollCost || 0) + Number(t.maintenanceCost || 0);
      return s + exp + Number(t.commission || 0);
    }, 0);
    const monthlyNetProfit = monthlyRevenue - monthlyExpenses;

    return {
      totalTrucks,
      runningCount,
      availableCount,
      maintenanceCount,
      totalDrivers,
      totalDistance,
      monthlyRevenue,
      monthlyExpenses,
      monthlyNetProfit,
    };
  }, [allVehicles, runningTrips, allDrivers, allTrips, selectedMonth, selectedYear]);

  // 6. Form State: + Add New Vehicle
  const [newVehReg, setNewVehReg] = useState('ঢাকা মেট্রো-ট-১২-৩৪৫৬');
  const [newVehName, setNewVehName] = useState('Hino 500 Heavy Freight');
  const [newVehCode, setNewVehCode] = useState(`TRK-${Date.now().toString().slice(-4)}`);
  const [newVehBrand, setNewVehBrand] = useState('Hino');
  const [newVehModel, setNewVehModel] = useState('500 Series');
  const [newVehYear, setNewVehYear] = useState('2022');
  const [newVehPurchasePrice, setNewVehPurchasePrice] = useState<number>(2800000);
  const [newVehFuelType, setNewVehFuelType] = useState('Diesel');
  const [newVehOdometer, setNewVehOdometer] = useState<number>(45000);
  const [newVehDriver, setNewVehDriver] = useState('');
  const [newVehTaxTokenExp, setNewVehTaxTokenExp] = useState('2027-06-30');
  const [newVehFitnessExp, setNewVehFitnessExp] = useState('2027-05-31');
  const [newVehInsuranceExp, setNewVehInsuranceExp] = useState('2027-08-31');
  const [newVehRoutePermitExp, setNewVehRoutePermitExp] = useState('2027-12-31');
  const [newVehNextServiceDate, setNewVehNextServiceDate] = useState('2027-02-28');
  const [newVehNextServiceKm, setNewVehNextServiceKm] = useState<number>(50000);

  // 7. Form State: + Add New Trip
  const [tripTruckReg, setTripTruckReg] = useState(allVehicles[0]?.registrationNumber || 'ঢাকা মেট্রো-ট-১২-৩৪৫৬');
  const [tripDriverName, setTripDriverName] = useState('আব্দুল করিম');
  const [tripHelperName, setTripHelperName] = useState('');
  const [tripStartLoc, setTripStartLoc] = useState('ঢাকা');
  const [tripDestLoc, setTripDestLoc] = useState('চট্টগ্রাম');
  const [tripLoadLoc, setTripLoadLoc] = useState('তেজগাঁও সেন্ট্রাল ডিপো');
  const [tripDeliverLoc, setTripDeliverLoc] = useState('আগ্রাবাদ পাইকারি আড়ত');
  const [tripCustomer, setTripCustomer] = useState('চট্টগ্রাম এগ্রো ডিলার্স');
  const [tripCargo, setTripCargo] = useState('খামারের মুরগি ও পশুখাদ্য পরিবহন');
  const [tripStartDate, setTripStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [tripExpectedReturn, setTripExpectedReturn] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [tripStartKm, setTripStartKm] = useState<number>(45000);
  const [tripEndKm, setTripEndKm] = useState<number>(45260);
  const [tripFare, setTripFare] = useState<number>(26000);
  const [tripAdvance, setTripAdvance] = useState<number>(15000);
  const [tripCommission, setTripCommission] = useState<number>(1000);
  const [tripDieselCost, setTripDieselCost] = useState<number>(7500);
  const [tripTollCost, setTripTollCost] = useState<number>(1000);
  const [tripOtherCost, setTripOtherCost] = useState<number>(500);
  const [tripWalletId, setTripWalletId] = useState(treasuryWallets[0]?.id || '');
  const [tripRemarks, setTripRemarks] = useState('');
  const [tripImageUrl, setTripImageUrl] = useState('');

  // Auto Distance calculation
  const calculatedDistanceKm = Math.max(0, Number(tripEndKm || 0) - Number(tripStartKm || 0));
  const calculatedRemainingDue = Math.max(0, Number(tripFare || 0) - Number(tripAdvance || 0));
  const calculatedTripExpense = Number(tripDieselCost || 0) + Number(tripTollCost || 0) + Number(tripOtherCost || 0);
  const calculatedNetIncome = Number(tripFare || 0) - (calculatedTripExpense + Number(tripCommission || 0));

  // 8. Form State: + Log Fuel
  const [fuelTruckReg, setFuelTruckReg] = useState(allVehicles[0]?.registrationNumber || 'ঢাকা মেট্রো-ট-১২-৩৪৫৬');
  const [fuelDriver, setFuelDriver] = useState('আব্দুল করিম');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelPump, setFuelPump] = useState('মেঘনা পেট্রোলিয়াম ফিলিং স্টেশন');
  const [fuelType, setFuelType] = useState('Diesel');
  const [fuelLitres, setFuelLitres] = useState<number>(70);
  const [fuelRate, setFuelRate] = useState<number>(108);
  const [fuelOdometer, setFuelOdometer] = useState<number>(45150);
  const [fuelWalletId, setFuelWalletId] = useState(treasuryWallets[0]?.id || '');
  const [fuelRemarks, setFuelRemarks] = useState('ঢাকা-চট্টগ্রাম ট্রিপের জন্য পূর্ণ ট্যাঙ্ক ডিজেল');
  const [fuelImageUrl, setFuelImageUrl] = useState('');
  const calculatedFuelTotal = Number(fuelLitres || 0) * Number(fuelRate || 0);

  // 9. Form State: + Service & Maintenance
  const [srvTruckReg, setSrvTruckReg] = useState(allVehicles[0]?.registrationNumber || 'ঢাকা মেট্রো-ট-১২-৩৪৫৬');
  const [srvDate, setSrvDate] = useState(new Date().toISOString().split('T')[0]);
  const [srvOdometer, setSrvOdometer] = useState<number>(45200);
  const [srvGarage, setSrvGarage] = useState('ভাই ভাই অটোমোবাইলস, তেজগাঁও');
  const [srvMechanic, setSrvMechanic] = useState('উস্তাদ জহিরুল ইসলাম');
  const [srvProblem, setSrvProblem] = useState('ব্রেক প্যাড ক্ষয় ও ইঞ্জিন অয়েল পরিবর্তন');
  const [srvParts, setSrvParts] = useState('১৫W-৪০ ইঞ্জিন অয়েল, অয়েল ফিল্টার, ফ্রন্ট ব্রেক শু');
  const [srvPartsCost, setSrvPartsCost] = useState<number>(5500);
  const [srvLabourCost, setSrvLabourCost] = useState<number>(1500);
  const [srvOtherCost, setSrvOtherCost] = useState<number>(500);
  const [srvNextDate, setSrvNextDate] = useState('2027-02-28');
  const [srvNextKm, setSrvNextKm] = useState<number>(50000);
  const [srvWalletId, setSrvWalletId] = useState(treasuryWallets[0]?.id || '');
  const [srvImageUrl, setSrvImageUrl] = useState('');
  const calculatedServiceTotal = Number(srvPartsCost || 0) + Number(srvLabourCost || 0) + Number(srvOtherCost || 0);

  // 10. Form State: + Driver Payment (Salary / Advance / Allowance)
  const [drvPayName, setDrvPayName] = useState(allDrivers[0]?.name || 'আব্দুল করিম');
  const [drvPayType, setDrvPayType] = useState<'salary' | 'advance' | 'allowance'>('salary');
  const [drvPayAmount, setDrvPayAmount] = useState<number>(18000);
  const [drvPayDate, setDrvPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [drvPayWalletId, setDrvPayWalletId] = useState(treasuryWallets[0]?.id || '');
  const [drvPayNote, setDrvPayNote] = useState('মাসিক বেতন পরিশোধ');

  // 11. Customer Payment State
  const [custPayAmount, setCustPayAmount] = useState<number>(0);
  const [custPayDate, setCustPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [custPayWalletId, setCustPayWalletId] = useState(treasuryWallets[0]?.id || '');

  // 12. Handlers: + Register Truck
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehReg.trim()) {
      triggerGlobalToast(bn ? 'গাড়ির রেজিস্ট্রেশন নম্বর লিখুন' : 'Enter registration number', 'info');
      return;
    }
    setIsSubmitting(true);
    try {
      await createTransportOpRecord(
        {
          tripOrVehicleCode: newVehCode.trim(),
          recordType: 'vehicle',
          businessId: activeBusiness.id,
          registrationNumber: newVehReg.trim(),
          truckName: newVehName.trim(),
          vehicleType: `${newVehBrand} ${newVehModel}`,
          brand: newVehBrand.trim(),
          model: newVehModel.trim(),
          manufacturingYear: newVehYear,
          purchasePrice: Number(newVehPurchasePrice || 0),
          fuelType: newVehFuelType,
          currentOdometer: Number(newVehOdometer || 0),
          driverName: newVehDriver.trim() || 'Unassigned',
          origin: 'Central Garage',
          destination: 'Fleet Yard',
          cargoDetails: 'Commercial Agro Transport',
          customerName: 'Internal Fleet',
          distanceKm: 0,
          fuelCost: 0,
          tollCost: 0,
          driverAllowance: 0,
          maintenanceCost: 0,
          maintenanceDetails: 'New vehicle registered in fleet',
          tripRevenue: 0,
          outstandingDue: 0,
          taxTokenExpiry: newVehTaxTokenExp,
          fitnessExpiry: newVehFitnessExp,
          insuranceExpiry: newVehInsuranceExp,
          routePermitExpiry: newVehRoutePermitExp,
          nextServiceDate: newVehNextServiceDate,
          nextServiceKm: Number(newVehNextServiceKm || 0),
          date: new Date().toISOString().split('T')[0],
          status: 'available',
        },
        ownerId,
        actorEmail
      );
      setShowAddVehicleModal(false);
      triggerGlobalToast(
        bn ? `নতুন গাড়ি ${newVehReg} সফলভাবে ফ্লিটে যুক্ত হয়েছে!` : `Vehicle ${newVehReg} registered!`,
        'success'
      );
      onNotify('Vehicle registered');
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error creating vehicle', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 13. Handlers: + Create Trip (With Overlapping Active Trip Check!)
  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripTruckReg) {
      triggerGlobalToast(bn ? 'গাড়ি নির্বাচন করুন' : 'Select vehicle', 'info');
      return;
    }
    if (tripFare <= 0) {
      triggerGlobalToast(bn ? 'ট্রিপের ভাড়া দিন' : 'Enter trip fare', 'info');
      return;
    }

    // Overlapping Active Trip Prevention:
    const activeTripOnSameTruck = allTrips.find(
      (t) => t.registrationNumber === tripTruckReg && (t.status === 'active' || t.status === 'running')
    );
    if (activeTripOnSameTruck) {
      triggerGlobalToast(
        bn
          ? `সতর্কতা: গাড়ি ${tripTruckReg} বর্তমানে ইতিমধ্যে একটি সক্রিয় ট্রিপে (${activeTripOnSameTruck.origin} ➔ ${activeTripOnSameTruck.destination}) চলমান রয়েছে! একই সাথে দুটি ট্রিপে গাড়ি বরাদ্দ করা যাবে না।`
          : `Vehicle ${tripTruckReg} is already on an active trip! Complete that trip first.`,
        'info'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const tripCode = `TRP-${Date.now().toString().slice(-5)}`;
      const routeStr = `${tripStartLoc} ➔ ${tripDestLoc}`;

      await createTransportOpRecord(
        {
          tripOrVehicleCode: tripCode,
          recordType: 'trip',
          businessId: activeBusiness.id,
          registrationNumber: tripTruckReg,
          vehicleType: 'Heavy Truck',
          driverName: tripDriverName.trim(),
          helperName: tripHelperName.trim(),
          origin: tripStartLoc.trim(),
          destination: tripDestLoc.trim(),
          loadingLocation: tripLoadLoc.trim(),
          deliveryLocation: tripDeliverLoc.trim(),
          route: routeStr,
          cargoDetails: tripCargo.trim(),
          customerName: tripCustomer.trim(),
          distanceKm: calculatedDistanceKm,
          startOdometer: Number(tripStartKm || 0),
          endOdometer: Number(tripEndKm || 0),
          fuelCost: Number(tripDieselCost || 0),
          tollCost: Number(tripTollCost || 0),
          driverAllowance: 0,
          commission: Number(tripCommission || 0),
          tripExpense: calculatedTripExpense,
          maintenanceCost: Number(tripOtherCost || 0),
          maintenanceDetails: `টোল: ৳${tripTollCost} | রোড খরচ: ৳${tripOtherCost} | কমিশন: ৳${tripCommission}`,
          tripRevenue: Number(tripFare || 0),
          advanceReceived: Number(tripAdvance || 0),
          remainingDue: calculatedRemainingDue,
          outstandingDue: calculatedRemainingDue,
          netIncome: calculatedNetIncome,
          insuranceExpiry: '2027-12-31',
          fitnessExpiry: '2027-12-31',
          taxTokenExpiry: '2027-12-31',
          nextServiceDate: '2027-06-30',
          date: tripStartDate,
          expectedReturnDate: tripExpectedReturn,
          status: 'active',
          imageUrl: tripImageUrl,
          remarks: tripRemarks.trim(),
        },
        ownerId,
        actorEmail
      );

      // Financial Integration: Advance Payment Received
      const targetWallet = accounts.find((a) => a.id === tripWalletId) || treasuryWallets[0];
      const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];

      if (targetWallet && revAcc && Number(tripAdvance) > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `ADV-${tripCode}`,
            date: tripStartDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'sale',
            category: `ট্রিপ অগ্রিম ভাড়া গ্রহণ (${tripTruckReg})`,
            description: `${tripTruckReg} (${routeStr}) — ট্রিপ অগ্রিম গৃহীত: ৳${tripAdvance} (মোট ভাড়া: ৳${tripFare})`,
            debitAccountId: targetWallet.id,
            debitAccountName: targetWallet.name,
            creditAccountId: revAcc.id,
            creditAccountName: revAcc.name,
            amount: Number(tripAdvance),
            paymentStatus: calculatedRemainingDue > 0 ? 'partial' : 'paid',
            dueAmount: calculatedRemainingDue,
            counterpartyName: tripCustomer || tripDriverName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      // Financial Integration: Direct Trip Outflow (Fuel + Toll + Road)
      if (targetWallet && expAcc && calculatedTripExpense > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `EXP-${tripCode}`,
            date: tripStartDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'expense',
            category: `ট্রিপের খরচ ও ডিজেল (${tripTruckReg})`,
            description: `${tripTruckReg} (${routeStr}) — ডিজেল: ৳${tripDieselCost}, টোল: ৳${tripTollCost}, রোড: ৳${tripOtherCost}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: targetWallet.id,
            creditAccountName: targetWallet.name,
            amount: calculatedTripExpense,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: tripDriverName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      setShowAddTripModal(false);
      triggerGlobalToast(
        bn
          ? `ট্রিপ ${tripCode} সফলভাবে শুরু হয়েছে! রুট: ${routeStr}, গাড়ি: ${tripTruckReg}`
          : `Trip ${tripCode} started on ${tripTruckReg}!`,
        'success'
      );
      onNotify('Trip started');
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error saving trip', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 14. Handlers: + Complete Trip
  const handleCompleteTrip = async (trip: ErpTransportOp) => {
    try {
      await updateTransportOpRecord(
        trip,
        {
          status: 'completed',
          actualReturnDate: new Date().toISOString().split('T')[0],
        },
        actorEmail
      );
      triggerGlobalToast(
        bn ? `ট্রিপ ${trip.tripOrVehicleCode} সম্পন্ন চিহ্নিত করা হয়েছে!` : `Trip ${trip.tripOrVehicleCode} completed!`,
        'success'
      );
      onNotify('Trip completed');
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error completing trip', 'info');
    }
  };

  // 15. Handlers: + Settle Customer Payment
  const handleSettleCustomerPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTripForPayment || custPayAmount <= 0) return;
    setIsSubmitting(true);
    try {
      const newDue = Math.max(0, Number(targetTripForPayment.outstandingDue || 0) - Number(custPayAmount));
      await updateTransportOpRecord(
        targetTripForPayment,
        {
          outstandingDue: newDue,
          remainingDue: newDue,
        },
        actorEmail
      );

      const targetWallet = accounts.find((a) => a.id === custPayWalletId) || treasuryWallets[0];
      const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
      if (targetWallet && revAcc) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `PAY-${targetTripForPayment.tripOrVehicleCode}-${Date.now().toString().slice(-4)}`,
            date: custPayDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'sale',
            category: `বাকি ভাড়া পরিশোধ (${targetTripForPayment.registrationNumber})`,
            description: `${targetTripForPayment.customerName} থেকে বাকি ভাড়া বাবদ ৳${custPayAmount} গৃহীত`,
            debitAccountId: targetWallet.id,
            debitAccountName: targetWallet.name,
            creditAccountId: revAcc.id,
            creditAccountName: revAcc.name,
            amount: Number(custPayAmount),
            paymentStatus: newDue === 0 ? 'paid' : 'partial',
            dueAmount: newDue,
            counterpartyName: targetTripForPayment.customerName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      setShowSettlePaymentModal(false);
      setTargetTripForPayment(null);
      triggerGlobalToast(
        bn
          ? `বাকি ভাড়া ৳${custPayAmount} সফলভাবে আদায় হয়েছে!`
          : `Collected payment of ৳${custPayAmount}!`,
        'success'
      );
      onNotify('Payment collected');
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error recording payment', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 16. Handlers: + Log Fuel Entry
  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fuelLitres <= 0 || fuelRate <= 0) return;
    setIsSubmitting(true);
    try {
      const fuelTotal = Number(fuelLitres) * Number(fuelRate);
      const fuelCode = `FUL-${Date.now().toString().slice(-5)}`;

      await createTransportOpRecord(
        {
          tripOrVehicleCode: fuelCode,
          recordType: 'fuel',
          businessId: activeBusiness.id,
          registrationNumber: fuelTruckReg,
          vehicleType: 'Heavy Truck',
          driverName: fuelDriver.trim(),
          origin: fuelPump.trim(),
          destination: 'Fuel Tank',
          cargoDetails: `${fuelLitres}L ${fuelType} @ ৳${fuelRate}/L`,
          customerName: fuelPump.trim(),
          distanceKm: 0,
          startOdometer: Number(fuelOdometer || 0),
          fuelCost: fuelTotal,
          fuelLitres: Number(fuelLitres),
          fuelRate: Number(fuelRate),
          fuelStation: fuelPump.trim(),
          fuelType,
          tollCost: 0,
          driverAllowance: 0,
          maintenanceCost: 0,
          maintenanceDetails: fuelRemarks.trim(),
          tripRevenue: 0,
          outstandingDue: 0,
          insuranceExpiry: '2027-12-31',
          fitnessExpiry: '2027-12-31',
          taxTokenExpiry: '2027-12-31',
          nextServiceDate: '2027-06-30',
          date: fuelDate,
          status: 'completed',
          imageUrl: fuelImageUrl,
          remarks: fuelRemarks.trim(),
        },
        ownerId,
        actorEmail
      );

      // Financial Integration: Fuel Expense
      const targetWallet = accounts.find((a) => a.id === fuelWalletId) || treasuryWallets[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];
      if (targetWallet && expAcc && fuelTotal > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: fuelCode,
            date: fuelDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'expense',
            category: `ট্রাকের জ্বালানি / ডিজেল ক্রয় (${fuelTruckReg})`,
            description: `${fuelTruckReg} — ${fuelLitres} লিটার ডিজেল (${fuelPump}) বাবদ খরচ ৳${fuelTotal}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: targetWallet.id,
            creditAccountName: targetWallet.name,
            amount: fuelTotal,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: fuelPump,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      setShowAddFuelModal(false);
      triggerGlobalToast(
        bn
          ? `${fuelTruckReg}-এর জন্য ${fuelLitres} লিটার ডিজেল (৳${fuelTotal}) এন্ট্রি হয়েছে!`
          : `Fuel logged: ${fuelLitres}L for ${fuelTruckReg}!`,
        'success'
      );
      onNotify('Fuel logged');
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error saving fuel', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 17. Handlers: + Log Maintenance & Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const srvTotal = Number(srvPartsCost || 0) + Number(srvLabourCost || 0) + Number(srvOtherCost || 0);
      const srvCode = `MNT-${Date.now().toString().slice(-5)}`;

      await createTransportOpRecord(
        {
          tripOrVehicleCode: srvCode,
          recordType: 'vehicle_maintenance',
          businessId: activeBusiness.id,
          registrationNumber: srvTruckReg,
          vehicleType: 'Heavy Truck',
          driverName: srvMechanic.trim(),
          origin: srvGarage.trim(),
          destination: 'Workshop Repair',
          cargoDetails: srvProblem.trim(),
          customerName: srvGarage.trim(),
          distanceKm: 0,
          startOdometer: Number(srvOdometer || 0),
          fuelCost: 0,
          tollCost: 0,
          driverAllowance: 0,
          maintenanceCost: srvTotal,
          partsCost: Number(srvPartsCost || 0),
          labourCost: Number(srvLabourCost || 0),
          otherCosts: Number(srvOtherCost || 0),
          partsReplaced: srvParts.trim(),
          maintenanceDetails: `${srvProblem} | পার্টস: ${srvParts} | লেবার: ৳${srvLabourCost}`,
          tripRevenue: 0,
          outstandingDue: 0,
          insuranceExpiry: '2027-12-31',
          fitnessExpiry: '2027-12-31',
          taxTokenExpiry: '2027-12-31',
          nextServiceDate: srvNextDate,
          nextServiceKm: Number(srvNextKm || 0),
          date: srvDate,
          status: 'completed',
          imageUrl: srvImageUrl,
        },
        ownerId,
        actorEmail
      );

      // Financial Integration: Maintenance Expense
      const targetWallet = accounts.find((a) => a.id === srvWalletId) || treasuryWallets[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];
      if (targetWallet && expAcc && srvTotal > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: srvCode,
            date: srvDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'expense',
            category: `গাড়ি মেরামত ও সার্ভিসিং (${srvTruckReg})`,
            description: `${srvTruckReg} — ${srvProblem} (${srvGarage}) বাবদ মোট খরচ ৳${srvTotal}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: targetWallet.id,
            creditAccountName: targetWallet.name,
            amount: srvTotal,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: srvGarage,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      setShowAddServiceModal(false);
      triggerGlobalToast(
        bn
          ? `${srvTruckReg}-এর সার্ভিসিং রেকর্ড (৳${srvTotal}) সেভ হয়েছে!`
          : `Maintenance logged: ৳${srvTotal} for ${srvTruckReg}!`,
        'success'
      );
      onNotify('Service recorded');
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error recording service', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 18. Handlers: + Pay Driver Salary / Advance
  const handlePayDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (drvPayAmount <= 0) return;
    setIsSubmitting(true);
    try {
      const payCode = `SAL-DRV-${Date.now().toString().slice(-5)}`;
      const targetWallet = accounts.find((a) => a.id === drvPayWalletId) || treasuryWallets[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];

      if (targetWallet && expAcc) {
        await postDoubleEntryTransaction(
          {
            referenceNo: payCode,
            date: drvPayDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'payroll',
            category: `চালক বেতন ও ভাতা (${drvPayName})`,
            description: `${drvPayName} — ${drvPayType === 'salary' ? 'মাসিক বেতন' : drvPayType === 'advance' ? 'অগ্রিম বেতন' : 'ট্রিপ ভাতা'} বাবদ ৳${drvPayAmount} পরিশোধ`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: targetWallet.id,
            creditAccountName: targetWallet.name,
            amount: Number(drvPayAmount),
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: drvPayName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      setShowAddDriverModal(false);
      triggerGlobalToast(
        bn
          ? `${drvPayName}-কে ৳${drvPayAmount} সফলভাবে পরিশোধ করা হয়েছে!`
          : `Paid ৳${drvPayAmount} to driver ${drvPayName}!`,
        'success'
      );
      onNotify('Driver paid');
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error paying driver', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 19. Export to CSV Helper
  const handleExportCsv = (title: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* ── TOP HEADER & SUB-TABS NAVIGATION ────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {bn ? 'ট্রাক ও পরিবহন ফ্লিট ব্যবস্থাপনা' : 'Fleet & Transport Management System'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {allVehicles.length} {bn ? 'টি গাড়ি' : 'Trucks'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {bn
                  ? 'গাড়ির প্রোফাইল, ট্রিপ ট্র্যাকিং, জ্বালানি, ড্রাইভার বেতন ও লাভ-ক্ষতি হিসাব'
                  : 'Fleet operations, trips, fuel efficiency, driver payroll, and vehicle profit/loss'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setTripTruckReg(allVehicles[0]?.registrationNumber || 'ঢাকা মেট্রো-ট-১২-৩৪৫৬');
                setTripFare(25000);
                setTripAdvance(15000);
                setShowAddTripModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{bn ? '+ নতুন ট্রিপ' : '+ New Trip'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddVehicleModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              <Truck className="h-3.5 w-3.5 text-emerald-600" />
              <span>{bn ? '+ গাড়ি যোগ' : '+ Add Truck'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddFuelModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              <Fuel className="h-3.5 w-3.5 text-sky-600" />
              <span>{bn ? '+ জ্বালানি' : '+ Fuel'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddServiceModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              <Wrench className="h-3.5 w-3.5 text-amber-600" />
              <span>{bn ? '+ সার্ভিসিং' : '+ Service'}</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs font-bold">
          {[
            { id: 'dashboard', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard', icon: Gauge },
            { id: 'vehicles', labelBn: 'সকল গাড়ি (Fleet)', labelEn: 'All Trucks', icon: Truck },
            { id: 'trips', labelBn: 'ট্রিপ খতিয়ান', labelEn: 'Trip Ledger', icon: Navigation },
            { id: 'fuel', labelBn: 'জ্বালানি হিসাব', labelEn: 'Fuel Logs', icon: Fuel },
            { id: 'drivers', labelBn: 'ড্রাইভার ও বেতন', labelEn: 'Drivers & Staff', icon: Users },
            { id: 'maintenance', labelBn: 'সার্ভিসিং ও মেরামত', labelEn: 'Maintenance', icon: Wrench },
            { id: 'reports', labelBn: '১২টি অডিট রিপোর্ট', labelEn: '12 Reports', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TransportTab)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{bn ? tab.labelBn : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: TRANSPORT DASHBOARD ─────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Top 9 Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            {/* 1. Total Trucks */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">{bn ? 'মোট গাড়ি' : 'Total Trucks'}</div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">{dashboardKpis.totalTrucks}</div>
              <div className="text-[10px] text-slate-400">{allVehicles.length} {bn ? 'টি নিবন্ধিত' : 'registered'}</div>
            </div>

            {/* 2. Running Trips */}
            <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs space-y-1">
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {bn ? 'চলমান ট্রিপ' : 'Running Trips'}
              </div>
              <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">{dashboardKpis.runningCount}</div>
              <div className="text-[10px] text-emerald-600">{bn ? 'রাস্তায় সচল' : 'on the road'}</div>
            </div>

            {/* 3. Available Trucks */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">{bn ? 'উপলব্ধ গাড়ি' : 'Available Trucks'}</div>
              <div className="text-xl font-black font-mono text-sky-600">{dashboardKpis.availableCount}</div>
              <div className="text-[10px] text-slate-400">{bn ? 'ট্রিপের জন্য প্রস্তুত' : 'ready for trip'}</div>
            </div>

            {/* 4. Trucks Under Maintenance */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">{bn ? 'গ্যারেজে / মেরামত' : 'Under Maintenance'}</div>
              <div className="text-xl font-black font-mono text-amber-600">{dashboardKpis.maintenanceCount}</div>
              <div className="text-[10px] text-slate-400">{bn ? 'সার্ভিসিং চলছে' : 'in garage'}</div>
            </div>

            {/* 5. Total Drivers */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">{bn ? 'মোট চালক' : 'Total Drivers'}</div>
              <div className="text-xl font-black font-mono text-purple-600">{dashboardKpis.totalDrivers}</div>
              <div className="text-[10px] text-slate-400">{bn ? 'ড্রাইভার ও সহকারী' : 'drivers & staff'}</div>
            </div>

            {/* 6. Total Distance Travelled */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">{bn ? 'মোট দূরত্ব' : 'Total Distance'}</div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {dashboardKpis.totalDistance.toLocaleString()} <span className="text-xs font-normal">KM</span>
              </div>
              <div className="text-[10px] text-slate-400">{allTrips.length} {bn ? 'টি ট্রিপে' : 'trips'}</div>
            </div>

            {/* 7. Monthly Revenue */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">{bn ? 'চলতি মাসের ভাড়া' : 'Monthly Revenue'}</div>
              <div className="text-xl font-black font-mono text-emerald-600">{formatBDT(dashboardKpis.monthlyRevenue)}</div>
              <div className="text-[10px] text-slate-400">{bn ? 'মোট অর্জিত ভাড়া' : 'gross freight'}</div>
            </div>

            {/* 8. Monthly Expenses */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">{bn ? 'চলতি মাসের খরচ' : 'Monthly Expenses'}</div>
              <div className="text-xl font-black font-mono text-rose-600">{formatBDT(dashboardKpis.monthlyExpenses)}</div>
              <div className="text-[10px] text-slate-400">{bn ? 'ডিজেল, টোল ও মেরামত' : 'fuel, toll & repair'}</div>
            </div>

            {/* 9. Monthly Net Profit */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 col-span-2">
              <div className="text-[11px] text-slate-500 font-medium">{bn ? 'চলতি মাসের নিট লাভ' : 'Monthly Net Profit'}</div>
              <div
                className={`text-2xl font-black font-mono ${
                  dashboardKpis.monthlyNetProfit >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600'
                }`}
              >
                {formatBDT(dashboardKpis.monthlyNetProfit)}
              </div>
              <div className="text-[10px] text-slate-400">
                {bn ? 'ভাড়া মাইনাস সমস্ত খরচ ও কমিশন' : 'Revenue - All Expenses'}
              </div>
            </div>
          </div>

          {/* ── EXACT REQUIREMENT: 4 CURRENTLY RUNNING TRUCKS SECTION ──── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {bn ? 'বর্তমানে চলমান ৪টি গাড়ি (Running Trucks — On Road)' : 'Running Trucks — Currently On Trip (4 Units)'}
                </h2>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTripStatusFilter('active');
                  setActiveTab('trips');
                }}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{bn ? 'সকল চলমান ট্রিপ দেখুন →' : 'View All Running Trips →'}</span>
              </button>
            </div>

            {fourRunningTrucks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {fourRunningTrucks.map((trip) => {
                  const isActuallyRunning = trip.status === 'active' || trip.status === 'running';
                  return (
                    <div
                      key={trip.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3 space-y-2.5 flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Reg & Status */}
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="font-mono font-black text-xs text-slate-900 dark:text-white">
                              {trip.registrationNumber}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{trip.tripOrVehicleCode}</div>
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                              isActuallyRunning
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isActuallyRunning ? (bn ? '● রানিং' : '● On Trip') : trip.status}
                          </span>
                        </div>

                        {/* Driver & Route */}
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <span className="text-[10px] text-slate-400">{bn ? 'চালক:' : 'Driver:'}</span>
                            <span className="font-semibold">{trip.driverName}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                            <span className="text-[10px] text-slate-400">{bn ? 'যাত্রা শুরু:' : 'From:'}</span>
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">{trip.origin}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                            <span className="text-[10px] text-slate-400">{bn ? 'গন্তব্য:' : 'To:'}</span>
                            <span className="font-medium text-sky-700 dark:text-sky-400">{trip.destination}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-400">{bn ? 'শুরুর তারিখ:' : 'Start Date:'}</span>
                            <span className="font-mono">{trip.date}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-400">{bn ? 'শুরুর KM:' : 'Start KM:'}</span>
                            <span className="font-mono font-bold">{trip.startOdometer || 0} KM</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedTripChallan(trip)}
                        className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 text-center inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>{bn ? 'ট্রিপের বিস্তারিত দেখুন' : 'View Trip Details'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                {bn ? 'বর্তমানে কোনো গাড়ি রানিং নেই। নতুন ট্রিপ শুরু করুন।' : 'No running trucks on trip currently.'}
              </div>
            )}
          </div>

          {/* Document & Maintenance Expiry Alerts Banner */}
          {expiryAlerts.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  {bn
                    ? `সতর্কতা: ${expiryAlerts.length}টি গাড়ির কাগজপত্র বা সার্ভিসিংয়ের মেয়াদ শেষ/নিকটবর্তী!`
                    : `Alert: ${expiryAlerts.length} document/maintenance expiries pending!`}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                {expiryAlerts.map((alt, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border flex items-center justify-between ${
                      alt.isExpired
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{alt.reg}</div>
                      <div className="text-[10px]">{alt.docType}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-[11px]">
                      <div>{alt.expiryDate}</div>
                      <span className="text-[9px] uppercase">{alt.isExpired ? (bn ? 'মেয়াদোত্তীর্ণ' : 'Expired') : (bn ? 'শীঘ্রই শেষ' : 'Upcoming')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: TRUCK / VEHICLE MANAGEMENT (ALL TRUCKS) ─────────── */}
      {activeTab === 'vehicles' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-600" />
                <span>{bn ? `সকল নিবন্ধিত গাড়ি ও ফ্লিট প্রোফাইল (${allVehicles.length}টি)` : `All Registered Fleet Vehicles (${allVehicles.length})`}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {bn ? 'ফিটনেস, ট্যাক্স টোকেন, রুট পারমিট ও অডোমিটার রিডিং ট্র্যাকিং' : 'BRTA documentation, tax tokens, route permits, and odometer readings'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddVehicleModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{bn ? '+ নতুন গাড়ি যোগ' : '+ Add Truck'}</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">{bn ? 'রেজিস্ট্রেশন ও কোড' : 'Registration & Code'}</th>
                  <th className="py-2.5 px-3">{bn ? 'মডেল ও দাম' : 'Model & Price'}</th>
                  <th className="py-2.5 px-3">{bn ? 'চালক ও ওডোমিটার' : 'Driver & Odometer'}</th>
                  <th className="py-2.5 px-3">{bn ? 'ট্যাক্স টোকেন মেয়াদ' : 'Tax Token'}</th>
                  <th className="py-2.5 px-3">{bn ? 'ফিটনেস মেয়াদ' : 'Fitness Expiry'}</th>
                  <th className="py-2.5 px-3 text-center">{bn ? 'স্টেটাস' : 'Status'}</th>
                  <th className="py-2.5 px-3 text-center">{bn ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white font-mono">{v.registrationNumber}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{v.tripOrVehicleCode}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{v.vehicleType}</div>
                      <div className="text-[10px] text-slate-400">{v.purchasePrice ? formatBDT(v.purchasePrice) : '—'}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{v.driverName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{v.currentOdometer || v.distanceKm || 0} KM</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                      {v.taxTokenExpiry || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                      {v.fitnessExpiry || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'active' || v.status === 'running'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : v.status === 'available'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {v.status === 'active' || v.status === 'running'
                          ? bn ? 'রানিং' : 'On Trip'
                          : v.status === 'available'
                          ? bn ? 'প্রস্তুত' : 'Available'
                          : bn ? 'গ্যারেজে' : 'Maintenance'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          triggerConfirmDelete({
                            title: bn ? 'গাড়ি ডিলিট নিশ্চিতকরণ' : 'Confirm Delete Truck',
                            message: bn ? `আপনি কি নিশ্চিতভাবে এই গাড়িটি (${v.registrationNumber}) মুছতে চান?` : `Delete vehicle ${v.registrationNumber}?`,
                            itemName: v.registrationNumber,
                            onConfirm: async () => {
                              await deleteTransportOp(v.id);
                              triggerGlobalToast('Vehicle deleted', 'delete');
                              onNotify('Deleted');
                            },
                          });
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: TRIP MANAGEMENT (TRIPS & OVERLAPPING PREVENTION) ─── */}
      {activeTab === 'trips' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Navigation className="h-4 w-4 text-emerald-600" />
                <span>{bn ? `ট্রিপ খতিয়ান ও অর্ডার ট্র্যাকিং (${allTrips.length}টি)` : `Trip Management & Orders (${allTrips.length})`}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {bn ? 'শুরুর ও শেষের KM, অতিক্রান্ত দূরত্ব, ভাড়া, বকেয়া এবং চালান প্রিন্ট' : 'Odometer distance, fare, customer dues, and challan vouchers'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedTripStatusFilter}
                onChange={(e) => setSelectedTripStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs font-semibold"
              >
                <option value="ALL">{bn ? 'সকল ট্রিপ' : 'All Trips'}</option>
                <option value="active">{bn ? 'চলমান (Running)' : 'Running'}</option>
                <option value="completed">{bn ? 'সম্পন্ন (Completed)' : 'Completed'}</option>
              </select>

              <button
                type="button"
                onClick={() => setShowAddTripModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{bn ? '+ নতুন ট্রিপ শুরু' : '+ Start Trip'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">{bn ? 'ট্রিপ কোড ও তারিখ' : 'Trip & Date'}</th>
                  <th className="py-2.5 px-3">{bn ? 'গাড়ি ও চালক' : 'Truck & Driver'}</th>
                  <th className="py-2.5 px-3">{bn ? 'রুট (কোথা থেকে কোথায়)' : 'Route'}</th>
                  <th className="py-2.5 px-3 text-right">{bn ? 'দূরত্ব (KM)' : 'Distance'}</th>
                  <th className="py-2.5 px-3 text-right">{bn ? 'ভাড়া (Fare)' : 'Fare'}</th>
                  <th className="py-2.5 px-3 text-right">{bn ? 'বাকি (Due)' : 'Due'}</th>
                  <th className="py-2.5 px-3 text-center">{bn ? 'স্টেটাস' : 'Status'}</th>
                  <th className="py-2.5 px-3 text-center">{bn ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allTrips
                  .filter((t) => {
                    if (selectedTripStatusFilter !== 'ALL' && t.status !== selectedTripStatusFilter) return false;
                    return true;
                  })
                  .map((t) => {
                    const isRunning = t.status === 'active' || t.status === 'running';
                    const routeStr = t.route || `${t.origin} ➔ ${t.destination}`;
                    const dueAmt = Number(t.outstandingDue || t.remainingDue || 0);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">{t.tripOrVehicleCode}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{t.date}</div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-bold text-emerald-700 dark:text-emerald-400">{t.registrationNumber}</div>
                          <div className="text-[10px] text-slate-500">{t.driverName}</div>
                        </td>
                        <td className="py-2 px-3 max-w-[200px] truncate">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{routeStr}</div>
                          <div className="text-[10px] text-slate-400 truncate">{t.customerName} • {t.cargoDetails}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {t.distanceKm || (t.endOdometer && t.startOdometer ? t.endOdometer - t.startOdometer : 0)} KM
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatBDT(t.tripRevenue)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {dueAmt > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetTripForPayment(t);
                                setCustPayAmount(dueAmt);
                                setShowSettlePaymentModal(true);
                              }}
                              className="text-amber-600 hover:underline cursor-pointer"
                              title="Click to collect due"
                            >
                              {formatBDT(dueAmt)}
                            </button>
                          ) : (
                            <span className="text-emerald-600 text-[10px]">Paid</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isRunning
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {isRunning ? (bn ? 'চলমান' : 'Running') : (bn ? 'সম্পন্ন' : 'Completed')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {isRunning && (
                              <button
                                type="button"
                                onClick={() => handleCompleteTrip(t)}
                                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 hover:bg-emerald-600 hover:text-white cursor-pointer"
                                title="Mark Completed"
                              >
                                {bn ? 'সম্পন্ন' : 'Complete'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedTripChallan(t)}
                              className="p-1 rounded text-slate-500 hover:text-emerald-600 cursor-pointer"
                              title="View Challan"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                triggerConfirmDelete({
                                  title: bn ? 'ট্রিপ ডিলিট' : 'Delete Trip',
                                  message: bn ? `এই ট্রিপটি (${t.tripOrVehicleCode}) মুছতে চান?` : `Delete trip ${t.tripOrVehicleCode}?`,
                                  itemName: t.tripOrVehicleCode,
                                  onConfirm: async () => {
                                    await deleteTransportOp(t.id);
                                    triggerGlobalToast('Deleted', 'delete');
                                    onNotify('Deleted');
                                  },
                                });
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
      )}

      {/* ── TAB 4: FUEL MANAGEMENT ─────────────────────────────────── */}
      {activeTab === 'fuel' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Fuel className="h-4 w-4 text-sky-600" />
                <span>{bn ? `জ্বালানি খরচ ও মাইলেজ খতিয়ান (${allFuelLogs.length}টি)` : `Fuel Consumption & Efficiency Logs (${allFuelLogs.length})`}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {bn ? 'ডিজেলের পরিমাণ, প্রতি লিটার দর, মোট খরচ ও প্রতি কিলোমিটারে মাইলেজ হিসাব' : 'Fuel litres, rate, total cost, and calculated KM/L fuel economy'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddFuelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{bn ? '+ নতুন জ্বালানি এন্ট্রি' : '+ Log Fuel'}</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2 px-3">{bn ? 'তারিখ ও কোড' : 'Date & Code'}</th>
                  <th className="py-2 px-3">{bn ? 'গাড়ি ও চালক' : 'Truck & Driver'}</th>
                  <th className="py-2 px-3">{bn ? 'ফিলিং স্টেশন' : 'Fuel Pump'}</th>
                  <th className="py-2 px-3 text-right">{bn ? 'লিটার (Litres)' : 'Litres'}</th>
                  <th className="py-2 px-3 text-right">{bn ? 'দর (Rate)' : 'Price/L'}</th>
                  <th className="py-2 px-3 text-right">{bn ? 'মোট খরচ' : 'Total Cost'}</th>
                  <th className="py-2 px-3 text-right">{bn ? 'ওডোমিটার (KM)' : 'Odometer'}</th>
                  <th className="py-2 px-3 text-center">{bn ? 'রসিদ' : 'Receipt'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allFuelLogs.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{f.date}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{f.tripOrVehicleCode}</div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">{f.registrationNumber}</div>
                      <div className="text-[10px] text-slate-500">{f.driverName}</div>
                    </td>
                    <td className="py-2 px-3 max-w-[200px] truncate">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{f.fuelStation || f.origin}</div>
                      <div className="text-[10px] text-slate-400 truncate">{f.remarks}</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-sky-600">
                      {f.fuelLitres || 0} L
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      ৳{f.fuelRate || 108}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-rose-600">
                      {formatBDT(f.fuelCost)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {f.startOdometer || 0} KM
                    </td>
                    <td className="py-2 px-3 text-center">
                      {f.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewImageTrip(f)}
                          className="p-1 rounded text-sky-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: DRIVERS & STAFF MANAGEMENT ──────────────────────── */}
      {activeTab === 'drivers' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span>{bn ? `চালক ও সহকারী ব্যবস্থাপনা (${allDrivers.length}জন)` : `Driver & Staff Management (${allDrivers.length})`}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {bn ? 'ড্রাইভারদের লাইসেন্স, বরাদ্দকৃত গাড়ি, মাসিক বেতন ও অগ্রিম হিসাব' : 'Driver license validity, assigned truck, monthly salary, and advance ledger'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddDriverModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-xs cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>{bn ? '+ বেতন / অগ্রিম পরিশোধ' : '+ Pay Driver'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allDrivers.map((d, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{d.name}</h3>
                    <div className="text-[11px] text-slate-500 font-mono">{d.phone || 'Phone not set'}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active Driver
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400">{bn ? 'বরাদ্দ গাড়ি:' : 'Assigned Truck:'}</span>
                    <div className="font-semibold text-emerald-700 dark:text-emerald-400 truncate">{d.truck || 'Float'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">{bn ? 'মাসিক বেতন:' : 'Monthly Salary:'}</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{formatBDT(d.salary || 22000)}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDrvPayName(d.name);
                    setDrvPayAmount(d.salary || 22000);
                    setShowAddDriverModal(true);
                  }}
                  className="w-full py-1 text-xs font-bold rounded-lg border border-purple-200 text-purple-700 dark:text-purple-300 hover:bg-purple-50 text-center cursor-pointer"
                >
                  {bn ? 'বেতন বা অগ্রিম দিন' : 'Pay Salary / Advance'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 6: MAINTENANCE & SERVICE LOGS ──────────────────────── */}
      {activeTab === 'maintenance' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-600" />
                <span>{bn ? `গাড়ি সার্ভিসিং ও মেরামত খতিয়ান (${allMaintenanceLogs.length}টি)` : `Vehicle Service & Maintenance Records (${allMaintenanceLogs.length})`}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {bn ? 'পার্টস বদল, লেবার খরচ ও পরবর্তী শিডিউল সার্ভিসিং হিসাব' : 'Parts replacement, mechanic labour charges, and scheduled servicing'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddServiceModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{bn ? '+ নতুন সার্ভিস রেকর্ড' : '+ Log Service'}</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2 px-3">{bn ? 'তারিখ ও কোড' : 'Date & Code'}</th>
                  <th className="py-2 px-3">{bn ? 'গাড়ি ও ওডোমিটার' : 'Truck & Odometer'}</th>
                  <th className="py-2 px-3">{bn ? 'গ্যারেজ ও মেকানিক' : 'Garage & Mechanic'}</th>
                  <th className="py-2 px-3">{bn ? 'কাজের বিবরণ ও পার্টস' : 'Repair & Parts'}</th>
                  <th className="py-2 px-3 text-right">{bn ? 'পার্টস খরচ' : 'Parts Cost'}</th>
                  <th className="py-2 px-3 text-right">{bn ? 'লেবার খরচ' : 'Labour'}</th>
                  <th className="py-2 px-3 text-right">{bn ? 'মোট খরচ' : 'Total Cost'}</th>
                  <th className="py-2 px-3">{bn ? 'পরবর্তী সার্ভিস' : 'Next Service'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allMaintenanceLogs.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{m.date}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.tripOrVehicleCode}</div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">{m.registrationNumber}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{m.startOdometer || 0} KM</div>
                    </td>
                    <td className="py-2 px-3 max-w-[180px] truncate">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{m.garageName || m.origin}</div>
                      <div className="text-[10px] text-slate-400 truncate">{m.mechanicName || m.driverName}</div>
                    </td>
                    <td className="py-2 px-3 max-w-[220px] truncate">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">{m.cargoDetails || m.maintenanceDetails}</div>
                      <div className="text-[10px] text-slate-400 truncate">{m.partsReplaced}</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{formatBDT(m.partsCost || 0)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatBDT(m.labourCost || 0)}</td>
                    <td className="py-2 px-3 text-right font-mono font-black text-rose-600">
                      {formatBDT(m.maintenanceCost)}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                      {m.nextServiceDate || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 7: 12 AUDITED TRANSPORT REPORTS ─────────────────────── */}
      {activeTab === 'reports' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>{bn ? '১২টি অডিটেড ট্রান্সপোর্ট রিপোর্ট (12 Transport Reports)' : '12 Audited Transport Reports'}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {bn ? 'গাড়ি, ট্রিপ, জ্বালানি, ড্রাইভার বেতন ও লাভ-ক্ষতির বিশদ রিপোর্ট' : 'Standard audited transport reports with print and CSV download'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{bn ? 'প্রিন্ট' : 'Print'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {[
              { id: 'all_trucks', title: '1. All Truck Report', desc: 'সকল গাড়ির পূর্ণাঙ্গ তালিকা ও কাগজপত্র' },
              { id: 'running_trips', title: '2. Running Trip Report', desc: 'বর্তমানে রাস্তায় সচল ট্রিপসমূহ' },
              { id: 'completed_trips', title: '3. Completed Trip Report', desc: 'সম্পন্ন হওয়া সকল ট্রিপের হিসাব' },
              { id: 'truck_history', title: '4. Truck-wise Trip History', desc: 'গাড়িভিত্তিক অতীত সকল ট্রিপ রেকর্ড' },
              { id: 'driver_perf', title: '5. Driver Performance Report', desc: 'চালকদের ট্রিপ সংখ্যা ও মাইলেজ' },
              { id: 'fuel_report', title: '6. Fuel Consumption Report', desc: 'জ্বালানি ব্যবহার ও প্রতি লিটার খরচ' },
              { id: 'maint_report', title: '7. Maintenance History Report', desc: 'গাড়ি মেরামতের পূর্ণাঙ্গ ইতিহাস' },
              { id: 'service_exp', title: '8. Service Expense Report', desc: 'পার্টস ও লেবার খরচের বিশদ রিপোর্ট' },
              { id: 'monthly_rev', title: '9. Monthly Revenue Report', desc: 'মাসভিত্তিক মোট ভাড়া আয় ও প্রবৃদ্ধি' },
              { id: 'truck_pnl', title: '10. Truck-wise Profit & Loss', desc: 'প্রতিটি গাড়ির পৃথক নিট লাভ-ক্ষতি' },
              { id: 'driver_salary', title: '11. Driver Salary Report', desc: 'চালকদের মাসিক বেতন ও অগ্রিম হিসাব' },
              { id: 'customer_due', title: '12. Customer Due Report', desc: 'গ্রাহকদের কাছে বাকি থাকা ভাড়ার তালিকা' },
            ].map((rep, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">{rep.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{rep.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExportCsv(
                      rep.title,
                      ['Code', 'Registration', 'Driver', 'Date', 'Amount', 'Status'],
                      allTrips.map((t) => [t.tripOrVehicleCode, t.registrationNumber, t.driverName, t.date, t.tripRevenue, t.status])
                    );
                  }}
                  className="w-full py-1 text-center rounded border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                >
                  {bn ? 'CSV ডাউনলোড' : 'Download CSV'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL 1: + NEW TRIP (COMPACT & COMPLETE) ──────────────── */}
      {showAddTripModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddTripModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Navigation className="h-4 w-4 text-emerald-600" />
                <span>{bn ? 'নতুন ট্রিপ শুরু ও অর্ডার এন্ট্রি' : 'Dispatch New Transport Trip'}</span>
              </h3>
              <button type="button" onClick={() => setShowAddTripModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTrip} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'গাড়ি নির্বাচন (Truck) *' : 'Select Truck *'}</label>
                  <select
                    value={tripTruckReg}
                    onChange={(e) => setTripTruckReg(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-bold"
                  >
                    {allVehicles.map((v) => (
                      <option key={v.id} value={v.registrationNumber}>
                        {v.registrationNumber} ({v.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'চালক (Driver Name) *' : 'Driver Name *'}</label>
                  <input
                    type="text"
                    required
                    value={tripDriverName}
                    onChange={(e) => setTripDriverName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'যাত্রা শুরুর স্থান *' : 'Start Location *'}</label>
                  <input
                    type="text"
                    required
                    value={tripStartLoc}
                    onChange={(e) => setTripStartLoc(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'গন্তব্য (Destination) *' : 'Destination *'}</label>
                  <input
                    type="text"
                    required
                    value={tripDestLoc}
                    onChange={(e) => setTripDestLoc(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'শুরুর তারিখ *' : 'Start Date *'}</label>
                  <input
                    type="date"
                    required
                    value={tripStartDate}
                    onChange={(e) => setTripStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'সম্ভাব্য ফেরার তারিখ' : 'Expected Return Date'}</label>
                  <input
                    type="date"
                    value={tripExpectedReturn}
                    onChange={(e) => setTripExpectedReturn(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Odometer KM auto calculation */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'শুরুর KM *' : 'Start KM *'}</label>
                  <input
                    type="number"
                    min={0}
                    value={tripStartKm}
                    onChange={(e) => setTripStartKm(Number(e.target.value) || 0)}
                    className="w-full rounded border px-2 py-1 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'শেষের KM *' : 'End KM *'}</label>
                  <input
                    type="number"
                    min={0}
                    value={tripEndKm}
                    onChange={(e) => setTripEndKm(Number(e.target.value) || 0)}
                    className="w-full rounded border px-2 py-1 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'মোট দূরত্ব (Auto)' : 'Total Distance'}</label>
                  <div className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 font-mono font-black text-emerald-600">
                    {calculatedDistanceKm} KM
                  </div>
                </div>
              </div>

              {/* Financials: Fare, Advance, Due */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">{bn ? 'মোট ভাড়া (Fare) *' : 'Fare *'}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={tripFare === 0 ? '' : tripFare}
                    onChange={(e) => setTripFare(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-emerald-300 px-2 py-1 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-0.5">{bn ? 'অগ্রিম গ্রহণ (Advance)' : 'Advance'}</label>
                  <input
                    type="number"
                    min={0}
                    value={tripAdvance === 0 ? '' : tripAdvance}
                    onChange={(e) => setTripAdvance(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-0.5">{bn ? 'বাকি (Due Auto)' : 'Due'}</label>
                  <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-amber-600">
                    {formatBDT(calculatedRemainingDue)}
                  </div>
                </div>
              </div>

              {/* Expenses: Diesel, Toll, Comm */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'ডিজেল খরচ' : 'Diesel'}</label>
                  <input
                    type="number"
                    min={0}
                    value={tripDieselCost}
                    onChange={(e) => setTripDieselCost(Number(e.target.value) || 0)}
                    className="w-full rounded border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'টোল খরচ' : 'Toll'}</label>
                  <input
                    type="number"
                    min={0}
                    value={tripTollCost}
                    onChange={(e) => setTripTollCost(Number(e.target.value) || 0)}
                    className="w-full rounded border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'কমিশন' : 'Commission'}</label>
                  <input
                    type="number"
                    min={0}
                    value={tripCommission}
                    onChange={(e) => setTripCommission(Number(e.target.value) || 0)}
                    className="w-full rounded border px-2 py-1 font-mono text-amber-600"
                  />
                </div>
              </div>

              {/* Net Profit Bar */}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between font-mono text-xs">
                <span>{bn ? 'নিট লাভ (Net Profit):' : 'Net Profit:'}</span>
                <span className={`font-black text-sm ${calculatedNetIncome >= 0 ? 'text-sky-600' : 'text-rose-600'}`}>
                  {formatBDT(calculatedNetIncome)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddTripModal(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                  {isSubmitting ? 'Saving...' : bn ? 'ট্রিপ নিশ্চিত করুন' : 'Start Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: + REGISTER VEHICLE ───────────────────────────── */}
      {showAddVehicleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddVehicleModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-emerald-600" />
                <span>{bn ? 'নতুন গাড়ি নিবন্ধন (Register Vehicle)' : 'Add New Vehicle'}</span>
              </h3>
              <button type="button" onClick={() => setShowAddVehicleModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-semibold">{bn ? 'গাড়ির রেজিস্ট্রেশন নম্বর *' : 'Registration Number *'}</label>
                <input
                  type="text"
                  required
                  value={newVehReg}
                  onChange={(e) => setNewVehReg(e.target.value)}
                  placeholder="যেমন: ঢাকা মেট্রো-ট-১২-৩৪৫৬"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'ব্র্যান্ড / কোম্পানি' : 'Brand'}</label>
                  <input
                    type="text"
                    value={newVehBrand}
                    onChange={(e) => setNewVehBrand(e.target.value)}
                    placeholder="Hino / Isuzu"
                    className="w-full rounded-lg border px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'মডেল' : 'Model'}</label>
                  <input
                    type="text"
                    value={newVehModel}
                    onChange={(e) => setNewVehModel(e.target.value)}
                    placeholder="500 Series"
                    className="w-full rounded-lg border px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'ট্যাক্স টোকেন মেয়াদ' : 'Tax Token Expiry'}</label>
                  <input
                    type="date"
                    value={newVehTaxTokenExp}
                    onChange={(e) => setNewVehTaxTokenExp(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'ফিটনেস মেয়াদ' : 'Fitness Expiry'}</label>
                  <input
                    type="date"
                    value={newVehFitnessExp}
                    onChange={(e) => setNewVehFitnessExp(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'ইন্স্যুরেন্স মেয়াদ' : 'Insurance Expiry'}</label>
                  <input
                    type="date"
                    value={newVehInsuranceExp}
                    onChange={(e) => setNewVehInsuranceExp(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'রুট পারমিট মেয়াদ' : 'Route Permit'}</label>
                  <input
                    type="date"
                    value={newVehRoutePermitExp}
                    onChange={(e) => setNewVehRoutePermitExp(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddVehicleModal(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                  {bn ? 'গাড়ি যোগ করুন' : 'Register Truck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: + LOG FUEL ───────────────────────────────────── */}
      {showAddFuelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddFuelModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Fuel className="h-4 w-4 text-sky-600" />
                <span>{bn ? 'জ্বালানি খরচ এন্ট্রি (Log Fuel)' : 'Log Fuel Consumption'}</span>
              </h3>
              <button type="button" onClick={() => setShowAddFuelModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFuel} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'গাড়ি *' : 'Truck *'}</label>
                  <select
                    value={fuelTruckReg}
                    onChange={(e) => setFuelTruckReg(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-bold"
                  >
                    {allVehicles.map((v) => (
                      <option key={v.id} value={v.registrationNumber}>
                        {v.registrationNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'তারিখ *' : 'Date *'}</label>
                  <input
                    type="date"
                    required
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'পাম্পের নাম (Filling Station) *' : 'Fuel Pump *'}</label>
                <input
                  type="text"
                  required
                  value={fuelPump}
                  onChange={(e) => setFuelPump(e.target.value)}
                  placeholder="মেঘনা পেট্রোলিয়াম, সাভার"
                  className="w-full rounded-lg border px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'লিটার *' : 'Litres *'}</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(Number(e.target.value) || 0)}
                    className="w-full rounded border px-2 py-1 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'দর / লিটার *' : 'Rate *'}</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={fuelRate}
                    onChange={(e) => setFuelRate(Number(e.target.value) || 0)}
                    className="w-full rounded border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'মোট খরচ (Auto)' : 'Total Cost'}</label>
                  <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono font-black text-rose-600">
                    {formatBDT(calculatedFuelTotal)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'পরিশোধের উৎস (Payment Account) *' : 'Payment Account *'}</label>
                <select
                  value={fuelWalletId}
                  onChange={(e) => setFuelWalletId(e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddFuelModal(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700">
                  {bn ? 'জ্বালানি সেভ করুন' : 'Save Fuel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: + LOG SERVICE / MAINTENANCE ──────────────────── */}
      {showAddServiceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddServiceModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-amber-600" />
                <span>{bn ? 'সার্ভিসিং ও মেরামত খরচ এন্ট্রি' : 'Log Maintenance & Service'}</span>
              </h3>
              <button type="button" onClick={() => setShowAddServiceModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'গাড়ি *' : 'Truck *'}</label>
                  <select
                    value={srvTruckReg}
                    onChange={(e) => setSrvTruckReg(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-bold"
                  >
                    {allVehicles.map((v) => (
                      <option key={v.id} value={v.registrationNumber}>
                        {v.registrationNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'তারিখ *' : 'Date *'}</label>
                  <input
                    type="date"
                    required
                    value={srvDate}
                    onChange={(e) => setSrvDate(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'গ্যারেজ / ওয়ার্কশপ *' : 'Garage / Workshop *'}</label>
                <input
                  type="text"
                  required
                  value={srvGarage}
                  onChange={(e) => setSrvGarage(e.target.value)}
                  placeholder="ভাই ভাই অটোমোবাইলস"
                  className="w-full rounded-lg border px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'মেরামতের সমস্যা ও বিবরণ *' : 'Problem Description *'}</label>
                <input
                  type="text"
                  required
                  value={srvProblem}
                  onChange={(e) => setSrvProblem(e.target.value)}
                  placeholder="ব্রেক শু ও ইঞ্জিন অয়েল পরিবর্তন"
                  className="w-full rounded-lg border px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'পার্টস খরচ' : 'Parts Cost'}</label>
                  <input
                    type="number"
                    min={0}
                    value={srvPartsCost}
                    onChange={(e) => setSrvPartsCost(Number(e.target.value) || 0)}
                    className="w-full rounded border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'লেবার চার্জ' : 'Labour'}</label>
                  <input
                    type="number"
                    min={0}
                    value={srvLabourCost}
                    onChange={(e) => setSrvLabourCost(Number(e.target.value) || 0)}
                    className="w-full rounded border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'মোট খরচ (Auto)' : 'Total Cost'}</label>
                  <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono font-black text-rose-600">
                    {formatBDT(calculatedServiceTotal)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'টাকা প্রদানের উৎস *' : 'Payment Account *'}</label>
                <select
                  value={srvWalletId}
                  onChange={(e) => setSrvWalletId(e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddServiceModal(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700">
                  {bn ? 'সার্ভিস সেভ করুন' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: + PAY DRIVER SALARY / ADVANCE ─────────────────── */}
      {showAddDriverModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddDriverModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="h-4 w-4 text-purple-600" />
                <span>{bn ? 'চালক বেতন ও ভাতা প্রদান' : 'Pay Driver Salary / Advance'}</span>
              </h3>
              <button type="button" onClick={() => setShowAddDriverModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePayDriver} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-semibold">{bn ? 'চালকের নাম *' : 'Driver Name *'}</label>
                <input
                  type="text"
                  required
                  value={drvPayName}
                  onChange={(e) => setDrvPayName(e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'প্রদানের ধরণ' : 'Payment Type'}</label>
                  <select
                    value={drvPayType}
                    onChange={(e) => setDrvPayType(e.target.value as any)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                  >
                    <option value="salary">{bn ? 'মাসিক বেতন (Salary)' : 'Monthly Salary'}</option>
                    <option value="advance">{bn ? 'অগ্রিম বেতন (Advance)' : 'Advance'}</option>
                    <option value="allowance">{bn ? 'ট্রিপ ভাতা (Allowance)' : 'Trip Allowance'}</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{bn ? 'টাকার পরিমাণ (BDT) *' : 'Amount *'}</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={drvPayAmount}
                    onChange={(e) => setDrvPayAmount(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'টাকা প্রদানের উৎস *' : 'Payment Account *'}</label>
                <select
                  value={drvPayWalletId}
                  onChange={(e) => setDrvPayWalletId(e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddDriverModal(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700">
                  {bn ? 'বেতন পরিশোধ সম্পন্ন' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 6: SETTLE CUSTOMER DUE ───────────────────────────── */}
      {showSettlePaymentModal && targetTripForPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowSettlePaymentModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {bn ? 'বাকি ভাড়া আদায় এন্ট্রি' : 'Collect Customer Due'}
              </h3>
              <button type="button" onClick={() => setShowSettlePaymentModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSettleCustomerPayment} className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-1">
                <div className="font-bold">{targetTripForPayment.customerName}</div>
                <div className="text-[11px] text-slate-500">
                  {targetTripForPayment.registrationNumber} ({targetTripForPayment.route || `${targetTripForPayment.origin} ➔ ${targetTripForPayment.destination}`})
                </div>
                <div className="text-xs font-mono font-bold text-amber-600">
                  {bn ? 'বর্তমান বাকি: ' : 'Remaining Due: '}{formatBDT(targetTripForPayment.outstandingDue)}
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'আদায়কৃত টাকা *' : 'Amount Received *'}</label>
                <input
                  type="number"
                  min={1}
                  max={targetTripForPayment.outstandingDue}
                  required
                  value={custPayAmount}
                  onChange={(e) => setCustPayAmount(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-mono font-black text-sm text-emerald-600"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold">{bn ? 'জমা হবে কোন অ্যাকাউন্টে? *' : 'Deposit Into Account *'}</label>
                <select
                  value={custPayWalletId}
                  onChange={(e) => setCustPayWalletId(e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowSettlePaymentModal(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                  {bn ? 'আদায় সম্পন্ন' : 'Confirm Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 7: MEMO / CHALLAN IMAGE VIEWER ──────────────────── */}
      {viewImageTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
          onClick={() => setViewImageTrip(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <div className="font-bold text-xs text-slate-900 dark:text-white">
                {viewImageTrip.registrationNumber} — {bn ? 'রসিদের ছবি' : 'Receipt / Memo'}
              </div>
              <button type="button" onClick={() => setViewImageTrip(null)} className="p-1 rounded text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            {viewImageTrip.imageUrl ? (
              <img
                src={viewImageTrip.imageUrl}
                alt="Receipt"
                className="w-full max-h-[60vh] object-contain rounded-lg border"
              />
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">No image</div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 8: OFFICIAL TRIP CHALLAN PRINT ───────────────────── */}
      {selectedTripChallan && (
        <TripChallanModal
          isOpen={!!selectedTripChallan}
          onClose={() => setSelectedTripChallan(null)}
          trip={selectedTripChallan}
          businessName={activeBusiness.nameBn || activeBusiness.name}
          lang={lang}
        />
      )}
    </div>
  );
}
