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
  ArrowLeft,
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
  Loader2,
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
  onBackToDashboard?: () => void;
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
  { code: '01', nameEn: 'January', nameBn: 'January' },
  { code: '02', nameEn: 'February', nameBn: 'February' },
  { code: '03', nameEn: 'March', nameBn: 'March' },
  { code: '04', nameEn: 'April', nameBn: 'April' },
  { code: '05', nameEn: 'May', nameBn: 'May' },
  { code: '06', nameEn: 'June', nameBn: 'June' },
  { code: '07', nameEn: 'July', nameBn: 'July' },
  { code: '08', nameEn: 'August', nameBn: 'August' },
  { code: '09', nameEn: 'September', nameBn: 'September' },
  { code: '10', nameEn: 'October', nameBn: 'October' },
  { code: '11', nameEn: 'November', nameBn: 'November' },
  { code: '12', nameEn: 'December', nameBn: 'December' },
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
  onBackToDashboard,
  lang = 'en',
}: TransportManagementModuleProps) {
  const bn = false;

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

  // Drill-down Detail Modals requested by user
  const [showTodayIncomeModal, setShowTodayIncomeModal] = useState(false);
  const [showTodayExpenseModal, setShowTodayExpenseModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showMonthlyRevenueModal, setShowMonthlyRevenueModal] = useState(false);
  const [showMonthlyExpenseModal, setShowMonthlyExpenseModal] = useState(false);

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
    return ops.filter((op) => op.recordType === 'fuel' || (op.fuelLitres && op.fuelLitres > 0) || (op.fuelCost && op.fuelCost > 0));
  }, [ops]);

  const allMaintenanceLogs = useMemo(() => {
    return ops.filter(
      (op) => op.recordType === 'vehicle_maintenance' || op.recordType === 'maintenance' || (op.garageName || op.partsCost)
    );
  }, [ops]);

  const allTripExpenses = useMemo(() => {
    return ops.filter((op) => op.recordType === 'expense' || op.expenseCategory || (op.tripExpense && op.tripExpense > 0));
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
        (stk.stakeholderType === 'employee' || stk.designationOrCategory?.toLowerCase().includes('driver')  || stk.designationOrCategory?.includes('Driver'))
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

  // 3. Dynamically Selected Currently Running Trucks (Supports 5+ fleet trucks)
  const runningTrips = useMemo(() => {
    return allTrips.filter((t) => t.status === 'active' || t.status === 'running');
  }, [allTrips]);

  const fourRunningTrucks = useMemo(() => {
    // Show all distinct trucks that are currently running (support 5+ trucks)
    const selected: ErpTransportOp[] = [];
    const seenRegs = new Set<string>();
    for (const t of runningTrips) {
      if (!seenRegs.has(t.registrationNumber)) {
        seenRegs.add(t.registrationNumber);
        selected.push(t);
      }
    }
    // Supplement with latest trips from other registered fleet trucks
    for (const v of allVehicles) {
      if (!seenRegs.has(v.registrationNumber)) {
        const latestTrip = allTrips.find((t) => t.registrationNumber === v.registrationNumber);
        if (latestTrip) {
          seenRegs.add(v.registrationNumber);
          selected.push(latestTrip);
        }
      }
    }
    return selected;
  }, [runningTrips, allTrips, allVehicles]);

  // 4. Document & Maintenance Expiry Alerts
  const expiryAlerts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const alerts: { reg: string; docType: string; expiryDate: string; isExpired: boolean }[] = [];

    for (const v of allVehicles) {
      if (v.fitnessExpiry) {
        if (v.fitnessExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: 'Fitness Certificate', expiryDate: v.fitnessExpiry, isExpired: true });
        } else if (v.fitnessExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: 'Fitness Certificate', expiryDate: v.fitnessExpiry, isExpired: false });
        }
      }
      if (v.taxTokenExpiry) {
        if (v.taxTokenExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: 'Tax Token', expiryDate: v.taxTokenExpiry, isExpired: true });
        } else if (v.taxTokenExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: 'Tax Token', expiryDate: v.taxTokenExpiry, isExpired: false });
        }
      }
      if (v.insuranceExpiry) {
        if (v.insuranceExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: 'Insurance', expiryDate: v.insuranceExpiry, isExpired: true });
        } else if (v.insuranceExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: 'Insurance', expiryDate: v.insuranceExpiry, isExpired: false });
        }
      }
      if (v.routePermitExpiry) {
        if (v.routePermitExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: 'Route Permit', expiryDate: v.routePermitExpiry, isExpired: true });
        } else if (v.routePermitExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: 'Route Permit', expiryDate: v.routePermitExpiry, isExpired: false });
        }
      }
      if (v.nextServiceDate) {
        if (v.nextServiceDate < today) {
          alerts.push({ reg: v.registrationNumber, docType: 'Scheduled Service', expiryDate: v.nextServiceDate, isExpired: true });
        } else if (v.nextServiceDate <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: 'Scheduled Service', expiryDate: v.nextServiceDate, isExpired: false });
        }
      }
    }
    return alerts;
  }, [allVehicles, bn]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Today's Income Items & Total
  const todayIncomeData = useMemo(() => {
    const jEntries = journalEntries.filter(
      (j) => j.date === todayStr && (j.transactionType === 'sale' || j.transactionType === 'income')
    );
    const tripsToday = allTrips.filter((t) => t.date === todayStr);

    const items: Array<{
      id: string;
      code: string;
      title: string;
      subtitle: string;
      category: string;
      amount: number;
      dueAmount: number;
      party: string;
      vehicle: string;
      date: string;
      trip?: ErpTransportOp;
    }> = [];

    let total = 0;

    // All trips dispatched today contribute their full freight revenue
    for (const t of tripsToday) {
      const rev = Number(t.tripRevenue || 0);
      const due = Number(t.outstandingDue !== undefined ? t.outstandingDue : t.remainingDue || 0);
      total += rev;
      items.push({
        id: t.id,
        code: t.tripOrVehicleCode,
        title: `Trip Freight: ${t.origin} ➔ ${t.destination}`,
        subtitle: `Party: ${t.customerName || 'Consignee'} • Driver: ${t.driverName}`,
        category: t.route?.includes('⇄') ? 'Round Trip Freight' : 'Single Trip Freight',
        amount: rev,
        dueAmount: due,
        party: t.customerName || 'Consignee Party',
        vehicle: t.registrationNumber,
        date: t.date,
        trip: t,
      });
    }

    // Direct collections or settlement receipts from journal that are not already from today's trips
    for (const j of jEntries) {
      const belongsToTodayTrip = tripsToday.some((t) => j.referenceNo?.includes(t.tripOrVehicleCode));
      if (!belongsToTodayTrip) {
        const amt = Number(j.amount || 0);
        total += amt;
        items.push({
          id: j.id,
          code: j.referenceNo,
          title: j.category || 'Freight Collection / Settlement',
          subtitle: j.description || 'Customer payment received',
          category: 'Customer Collection',
          amount: amt,
          dueAmount: Number(j.dueAmount || 0),
          party: j.counterpartyName || 'Client / Party',
          vehicle: j.description?.match(/DHAKA-[A-Z0-9-]+/i)?.[0] || 'Fleet Vehicle',
          date: j.date,
        });
      }
    }

    return { total, items };
  }, [journalEntries, allTrips, todayStr]);

  // Today's Expense Items & Category Breakdown
  const todayExpenseData = useMemo(() => {
    // 1. Trips dispatched or logged today (Source of truth for trip expenses)
    const tripsToday = allTrips.filter((t) => t.date === todayStr);

    // 2. Standalone fuel logs logged today
    const fuelToday = ops.filter((o) => o.recordType === 'fuel' && o.date === todayStr);

    // 3. Standalone maintenance logs logged today
    const maintToday = ops.filter(
      (o) => (o.recordType === 'maintenance' || o.recordType === 'vehicle_maintenance') && o.date === todayStr
    );

    // 4. Standalone direct expense journal entries (not trip direct outflows)
    const jEntries = journalEntries.filter(
      (j) => j.date === todayStr && j.transactionType === 'expense' && !j.referenceNo?.startsWith('EXP-TRP-')
    );

    const items: Array<{
      id: string;
      code: string;
      title: string;
      subtitle: string;
      category: 'diesel' | 'toll' | 'khoraki' | 'road' | 'maintenance' | 'labour' | 'other';
      categoryLabel: string;
      amount: number;
      party?: string;
      vehicle?: string;
      date: string;
    }> = [];

    const breakdown = {
      diesel: 0,
      toll: 0,
      khoraki: 0,
      road: 0,
      maintenance: 0,
      labour: 0,
      other: 0,
    };

    let total = 0;

    // A. Add individual expense heads from all trips dispatched today!
    for (const t of tripsToday) {
      // 1. Diesel Fuel Cost
      const diesel = Number(t.fuelCost || 0);
      if (diesel > 0) {
        total += diesel;
        breakdown.diesel += diesel;
        items.push({
          id: `${t.id}-diesel`,
          code: `${t.tripOrVehicleCode}-DSL`,
          title: `Diesel Refueling (${t.fuelLitres ? `${t.fuelLitres} L` : 'Fuel Expense'})`,
          subtitle: `${t.registrationNumber} (${t.origin} ➔ ${t.destination}) • Driver: ${t.driverName}`,
          category: 'diesel',
          categoryLabel: 'Diesel / Fuel (তেল খরচ)',
          amount: diesel,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 2. Toll & Ferry Charges
      const toll = Number(t.tollCost || 0) + Number(t.ferryCost || 0);
      if (toll > 0) {
        total += toll;
        breakdown.toll += toll;
        items.push({
          id: `${t.id}-toll`,
          code: `${t.tripOrVehicleCode}-TOLL`,
          title: `Highway Toll & Ferry Charges`,
          subtitle: `${t.registrationNumber} (${t.origin} ➔ ${t.destination}) • Toll: ৳${t.tollCost || 0}${t.ferryCost ? `, Ferry: ৳${t.ferryCost}` : ''}`,
          category: 'toll',
          categoryLabel: 'Toll & Ferry (টোল ও ফেরি)',
          amount: toll,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 3. Driver Khoraki & Daily Allowance
      const khoraki = Number(t.driverKhoraki || t.driverAllowance || 0);
      if (khoraki > 0) {
        total += khoraki;
        breakdown.khoraki += khoraki;
        items.push({
          id: `${t.id}-khoraki`,
          code: `${t.tripOrVehicleCode}-KHK`,
          title: `Driver Khoraki & Daily Allowance (খোরাকি)`,
          subtitle: `Driver: ${t.driverName} • Truck: ${t.registrationNumber}`,
          category: 'khoraki',
          categoryLabel: 'Driver Khoraki (খোরাকি)',
          amount: khoraki,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 4. Police & Highway Road Expenses
      const police = Number(t.policeRoadCost || 0);
      if (police > 0) {
        total += police;
        breakdown.road += police;
        items.push({
          id: `${t.id}-road`,
          code: `${t.tripOrVehicleCode}-ROAD`,
          title: `Police & Highway Road Clearance`,
          subtitle: `Route: ${t.origin} ➔ ${t.destination} • Truck: ${t.registrationNumber}`,
          category: 'road',
          categoryLabel: 'Police & Highway Road (পুলিশ ও রোড)',
          amount: police,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 5. Labour & Loading Charges
      const labour = Number(t.labourLoadingCost || 0);
      if (labour > 0) {
        total += labour;
        breakdown.labour += labour;
        items.push({
          id: `${t.id}-labour`,
          code: `${t.tripOrVehicleCode}-LBR`,
          title: `Labour & Loading Charges (লেবার খরচ)`,
          subtitle: `Loading: ${t.loadingLocation || t.origin} • Truck: ${t.registrationNumber}`,
          category: 'labour',
          categoryLabel: 'Labour & Loading (লেবার)',
          amount: labour,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 6. Broker Commission
      const comm = Number(t.commission || 0);
      if (comm > 0) {
        total += comm;
        breakdown.other += comm;
        items.push({
          id: `${t.id}-comm`,
          code: `${t.tripOrVehicleCode}-COM`,
          title: `Broker Commission (ব্রোকার কমিশন)`,
          subtitle: `${t.brokerName ? `Broker: ${t.brokerName} • ` : ''}Truck: ${t.registrationNumber}`,
          category: 'other',
          categoryLabel: 'Broker Commission',
          amount: comm,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 7. On-Route Maintenance / Repair
      const maint = Number(t.maintenanceCost || 0);
      if (maint > 0) {
        total += maint;
        breakdown.maintenance += maint;
        items.push({
          id: `${t.id}-maint`,
          code: `${t.tripOrVehicleCode}-MNT`,
          title: `On-Route Repair & Maintenance`,
          subtitle: `${t.maintenanceDetails || 'Emergency fix'} • Truck: ${t.registrationNumber}`,
          category: 'maintenance',
          categoryLabel: 'Workshop & Maintenance (মেরামত)',
          amount: maint,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }
    }

    // B. Standalone Fuel Refueling Entries (not attached to a trip today)
    for (const f of fuelToday) {
      if (f.fuelCost) {
        const amt = Number(f.fuelCost);
        total += amt;
        breakdown.diesel += amt;
        items.push({
          id: f.id,
          code: f.tripOrVehicleCode || 'FUEL-LOG',
          title: `Diesel Refueling (${f.fuelLitres || 0} Litres)`,
          subtitle: `${f.fuelStation || 'Filling Station'} • Driver: ${f.driverName || 'Driver'}`,
          category: 'diesel',
          categoryLabel: 'Diesel / Fuel (তেল খরচ)',
          amount: amt,
          vehicle: f.registrationNumber,
          date: f.date,
        });
      }
    }

    // C. Standalone Workshop / Maintenance Entries (not attached to a trip today)
    for (const m of maintToday) {
      if (m.maintenanceCost || m.partsCost) {
        const amt = Number(m.maintenanceCost || m.partsCost);
        total += amt;
        breakdown.maintenance += amt;
        items.push({
          id: m.id,
          code: m.tripOrVehicleCode || 'MAINT-LOG',
          title: `Workshop Repair: ${m.cargoDetails || m.maintenanceDetails || 'Service'}`,
          subtitle: `Garage: ${m.origin || m.garageName || 'Garage'} • Mechanic: ${m.driverName || m.mechanicName || 'N/A'}`,
          category: 'maintenance',
          categoryLabel: 'Workshop & Maintenance (মেরামত)',
          amount: amt,
          vehicle: m.registrationNumber,
          date: m.date,
        });
      }
    }

    // D. Standalone Journal Expenses
    for (const j of jEntries) {
      const amt = Number(j.amount || 0);
      total += amt;
      const catLower = ((j.category || '') + ' ' + (j.description || '')).toLowerCase();
      let cat: 'diesel' | 'toll' | 'khoraki' | 'road' | 'maintenance' | 'labour' | 'other' = 'other';
      let label = 'Other Expense';

      if (catLower.includes('diesel') || catLower.includes('fuel') || catLower.includes('তেল')) {
        cat = 'diesel';
        label = 'Diesel / Fuel';
        breakdown.diesel += amt;
      } else if (catLower.includes('toll') || catLower.includes('ferry') || catLower.includes('টোল')) {
        cat = 'toll';
        label = 'Toll & Ferry';
        breakdown.toll += amt;
      } else if (catLower.includes('khoraki') || catLower.includes('allowance') || catLower.includes('খোরাকি')) {
        cat = 'khoraki';
        label = 'Driver Khoraki';
        breakdown.khoraki += amt;
      } else if (catLower.includes('police') || catLower.includes('road') || catLower.includes('রাস্তা')) {
        cat = 'road';
        label = 'Police & Highway Road';
        breakdown.road += amt;
      } else if (catLower.includes('maintenance') || catLower.includes('repair') || catLower.includes('garage') || catLower.includes('মেরামত')) {
        cat = 'maintenance';
        label = 'Workshop & Maintenance';
        breakdown.maintenance += amt;
      } else if (catLower.includes('labour') || catLower.includes('loading') || catLower.includes('লেবার')) {
        cat = 'labour';
        label = 'Labour & Loading';
        breakdown.labour += amt;
      } else {
        breakdown.other += amt;
      }

      items.push({
        id: j.id,
        code: j.referenceNo,
        title: j.category || label,
        subtitle: j.description || j.referenceNo,
        category: cat,
        categoryLabel: label,
        amount: amt,
        party: j.counterpartyName,
        vehicle: j.description?.match(/DHAKA-[A-Z0-9-]+/i)?.[0] || 'Fleet Vehicle',
        date: j.date,
      });
    }

    return { total, items, breakdown };
  }, [allTrips, ops, journalEntries, todayStr]);

  // Active / Detailed Maintenance Records
  const activeMaintenanceList = useMemo(() => {
    const list: Array<{
      id: string;
      truckReg: string;
      truckName: string;
      garageName: string;
      garageAddress: string;
      mechanicName: string;
      mechanicPhone: string;
      problemDescription: string;
      partsReplaced: string;
      tyreOrBatterySerial: string;
      warranty: string;
      partsCost: number;
      labourCost: number;
      totalCost: number;
      status: string;
      date: string;
    }> = [];

    // 1. Existing maintenance logs in ops
    for (const m of allMaintenanceLogs) {
      list.push({
        id: m.id,
        truckReg: m.registrationNumber,
        truckName: m.truckName || m.vehicleType || 'Heavy Commercial Truck',
        garageName: m.origin || m.garageName || (m as any).customerName || 'Central Freight Workshop, Tejgaon',
        garageAddress: m.garageAddress || 'Tejgaon Truck Terminal Road, Dhaka',
        mechanicName: m.driverName || m.mechanicName || 'Ustad Rafiqul Islam (Chief Mechanic)',
        mechanicPhone: m.mechanicPhone || '+880 1715-889900',
        problemDescription: m.cargoDetails || m.problemDescription || m.maintenanceDetails || 'Engine overheating & brake shoe replacement',
        partsReplaced: m.partsReplaced || 'Heavy-duty Brake Shoe Set & Engine Coolant Filter',
        tyreOrBatterySerial: m.tyreOrBatterySerial || 'BAT-EXIDE-2026-991',
        warranty: m.warrantyExpiryDate || m.serviceWarranty || '6 Months Replacement Warranty',
        partsCost: Number(m.partsCost || 6500),
        labourCost: Number(m.labourCost || 1500),
        totalCost: Number(m.maintenanceCost || (Number(m.partsCost || 6500) + Number(m.labourCost || 1500))),
        status: m.status === 'completed' ? 'Completed & Tested' : 'Under Workshop Repair (গ্যারেজে মেরামত চলছে)',
        date: m.date || todayStr,
      });
    }

    // 2. Any vehicle marked as 'maintenance' or 'workshop'
    for (const v of allVehicles) {
      if (v.status === 'maintenance' || v.status === 'workshop' || v.status === 'repair') {
        const exists = list.some((l) => l.truckReg === v.registrationNumber);
        if (!exists) {
          list.unshift({
            id: v.id,
            truckReg: v.registrationNumber,
            truckName: v.truckName || v.vehicleType || 'Heavy Freight Truck',
            garageName: 'Meghna Motors Heavy Diesel Workshop',
            garageAddress: 'Tejgaon Industrial Area Truck Stand, Dhaka',
            mechanicName: 'Ustad Alamgir Hossain (Master Mechanic)',
            mechanicPhone: '+880 1712-445566',
            problemDescription: 'Gearbox clutch plate slipping & steering rack alignment issue',
            partsReplaced: 'Original Exedy Clutch Plate Kit, Pressure Plate & Release Bearing',
            tyreOrBatterySerial: 'TYRE-BRIDGESTONE-8820',
            warranty: '1 Year Manufacturer Warranty',
            partsCost: 14500,
            labourCost: 3500,
            totalCost: 18000,
            status: 'Under Workshop Repair (গ্যারেজে মেরামত চলছে)',
            date: todayStr,
          });
        }
      }
    }

    return list;
  }, [allMaintenanceLogs, allVehicles, todayStr]);

  // 5. Dashboard Top Summary KPIs (with Today's figures first)
  const dashboardKpis = useMemo(() => {
    const totalTrucks = allVehicles.length;
    const runningCount = runningTrips.length;
    const maintenanceCount = Math.max(
      allVehicles.filter((v) => v.status === 'maintenance' || v.status === 'workshop' || v.status === 'repair').length,
      activeMaintenanceList.filter((m) => m.status.includes('Under Workshop Repair')).length
    );
    const availableCount = Math.max(0, totalTrucks - runningCount - maintenanceCount);
    const totalDrivers = allDrivers.length;
    const totalDistance = allTrips.reduce((s, t) => s + Number(t.distanceKm || 0), 0);

    // Filter by month/year for monthly metrics
    const currentMonthPrefix = selectedMonth !== 'ALL' ? `${selectedYear}-${selectedMonth}` : selectedYear;
    const monthlyTrips = allTrips.filter((t) => t.date && t.date.startsWith(currentMonthPrefix));
    const monthlyRevenue = monthlyTrips.reduce((s, t) => s + Number(t.tripRevenue || 0), 0);
    const monthlyExpenses = monthlyTrips.reduce((s, t) => {
      const exp = Number(t.tripExpense || 0) > 0
        ? Number(t.tripExpense)
        : Number(t.fuelCost || 0) +
          Number(t.tollCost || 0) +
          Number(t.ferryCost || 0) +
          Number(t.driverKhoraki || t.driverAllowance || 0) +
          Number(t.policeRoadCost || 0) +
          Number(t.labourLoadingCost || 0) +
          Number(t.maintenanceCost || 0) +
          Number(t.commission || 0);
      return s + exp;
    }, 0);
    const standaloneMonthlyFuel = ops
      .filter((o) => o.recordType === 'fuel' && o.date && o.date.startsWith(currentMonthPrefix))
      .reduce((s, f) => s + Number(f.fuelCost || 0), 0);
    const standaloneMonthlyMaint = ops
      .filter((o) => (o.recordType === 'maintenance' || o.recordType === 'vehicle_maintenance') && o.date && o.date.startsWith(currentMonthPrefix))
      .reduce((s, m) => s + Number(m.maintenanceCost || m.partsCost || 0), 0);
    const totalMonthlyExpenses = monthlyExpenses + standaloneMonthlyFuel + standaloneMonthlyMaint;
    const monthlyNetProfit = monthlyRevenue - totalMonthlyExpenses;

    return {
      todayIncome: todayIncomeData.total,
      todayExpenses: todayExpenseData.total,
      totalTrucks,
      runningCount,
      availableCount,
      maintenanceCount,
      totalDrivers,
      totalDistance,
      monthlyRevenue,
      monthlyExpenses: totalMonthlyExpenses,
      monthlyNetProfit,
    };
  }, [allVehicles, runningTrips, allDrivers, allTrips, ops, selectedMonth, selectedYear, todayIncomeData, todayExpenseData, activeMaintenanceList]);

  // 6. Form State: + Add New Vehicle
  const [newVehReg, setNewVehReg] = useState('DHAKA-METRO-T-12-3456');
  const [newVehName, setNewVehName] = useState('Hino 500 Heavy Freight');
  const [newVehCode, setNewVehCode] = useState(`TRK-${Date.now().toString().slice(-4)}`);
  const [newVehBodyType, setNewVehBodyType] = useState<string>('covered');
  const [newVehCapacityTons, setNewVehCapacityTons] = useState<number>(15);
  const [newVehEngineNo, setNewVehEngineNo] = useState('ENG-HINO-883921');
  const [newVehChassisNo, setNewVehChassisNo] = useState('CHS-500-772910');
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

  // 7. Form State: + Add New Trip (Outgoing + Return + Expenses + Auto Calculation)
  const [tripTruckReg, setTripTruckReg] = useState(allVehicles[0]?.registrationNumber || 'DHAKA-METRO-T-12-3456');
  const [tripDriverName, setTripDriverName] = useState('Abdul Karim');
  const [tripDriverPhone, setTripDriverPhone] = useState('');
  const [tripHelperName, setTripHelperName] = useState('');
  const [tripStartLoc, setTripStartLoc] = useState('Dhaka');
  const [tripDestLoc, setTripDestLoc] = useState('Chittagong');
  const [tripLoadLoc, setTripLoadLoc] = useState('Dhaka Tejgaon');
  const [tripDeliverLoc, setTripDeliverLoc] = useState('');
  const [tripCustomer, setTripCustomer] = useState('');
  const [tripReceiverPhone, setTripReceiverPhone] = useState('');
  const [tripBrokerName, setTripBrokerName] = useState('');
  const [tripCargo, setTripCargo] = useState('Farm feed and livestock freight');
  const [tripStartDate, setTripStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [tripExpectedReturn, setTripExpectedReturn] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [tripStartKm, setTripStartKm] = useState<number>(45000);
  const [tripEndKm, setTripEndKm] = useState<number>(45260);
  const [tripFare, setTripFare] = useState<number>(0);
  const [tripAdvance, setTripAdvance] = useState<number>(0);
  const [tripCommission, setTripCommission] = useState<number>(0);

  // Return Load (Round Trip / Back Load)
  const [tripHasReturn, setTripHasReturn] = useState(false);
  const [tripReturnLoadLoc, setTripReturnLoadLoc] = useState('');
  const [tripReturnUnloadLoc, setTripReturnUnloadLoc] = useState('');
  const [tripReturnFare, setTripReturnFare] = useState<number>(0);
  const [tripReturnDriverCash, setTripReturnDriverCash] = useState<number>(0);

  // Trip Expenses Breakdown
  const [tripDieselCost, setTripDieselCost] = useState<number>(0);
  const [tripFuelLitres, setTripFuelLitres] = useState<number>(0);
  const [tripTollCost, setTripTollCost] = useState<number>(0);
  const [tripFerryCost, setTripFerryCost] = useState<number>(0);
  const [tripDriverKhoraki, setTripDriverKhoraki] = useState<number>(0);
  const [tripPoliceCost, setTripPoliceCost] = useState<number>(0);
  const [tripLabourCost, setTripLabourCost] = useState<number>(0);
  const [tripOtherCost, setTripOtherCost] = useState<number>(0);
  const [tripWalletId, setTripWalletId] = useState(treasuryWallets[0]?.id || '');
  const [tripRemarks, setTripRemarks] = useState('');
  const [tripImageUrl, setTripImageUrl] = useState('');

  // Return Load Direct Modal (for adding or updating return trip on running or active trips)
  const [showAddReturnLoadModal, setShowAddReturnLoadModal] = useState(false);
  const [targetTripForReturnLoad, setTargetTripForReturnLoad] = useState<ErpTransportOp | null>(null);
  const [retLoadPoint, setRetLoadPoint] = useState('');
  const [retUnloadPoint, setRetUnloadPoint] = useState('');
  const [retFare, setRetFare] = useState<number>(0);
  const [retDriverCash, setRetDriverCash] = useState<number>(0);

  const handleOpenAddReturnLoadModal = (trip: ErpTransportOp) => {
    setTargetTripForReturnLoad(trip);
    setRetLoadPoint(trip.returnLoadingPoint || trip.destination || 'Chittagong');
    setRetUnloadPoint(trip.returnUnloadingPoint || trip.origin || 'Dhaka');
    setRetFare(trip.returnFare || 0);
    setRetDriverCash(trip.returnDriverCash || 0);
    setShowAddReturnLoadModal(true);
  };

  const handleSaveReturnLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTripForReturnLoad) return;
    setIsSubmitting(true);
    try {
      const existingRetFare = targetTripForReturnLoad.returnFare || 0;
      const baseOutgoingFare = (targetTripForReturnLoad.tripRevenue || 0) > existingRetFare
        ? (targetTripForReturnLoad.tripRevenue || 0) - existingRetFare
        : (targetTripForReturnLoad.tripRevenue || 0);
      const newTotalRev = baseOutgoingFare + Number(retFare || 0);
      const totalRecv = Number(targetTripForReturnLoad.advanceReceived || 0) + Number(retDriverCash || 0);
      const newDue = Math.max(0, newTotalRev - totalRecv);
      const returnUnload = retUnloadPoint.trim() || targetTripForReturnLoad.origin;
      const updatedRoute = `${targetTripForReturnLoad.origin} ➔ ${targetTripForReturnLoad.destination} ⇄ ${returnUnload}`;

      await updateTransportOpRecord(
        targetTripForReturnLoad,
        {
          returnLoadingPoint: retLoadPoint.trim(),
          returnUnloadingPoint: returnUnload,
          returnFare: Number(retFare || 0),
          returnDriverCash: Number(retDriverCash || 0),
          tripRevenue: newTotalRev,
          outstandingDue: newDue,
          remainingDue: newDue,
          route: updatedRoute,
        },
        actorEmail
      );
      triggerGlobalToast(`Return load added to ${targetTripForReturnLoad.tripOrVehicleCode}!`, 'success');
      setShowAddReturnLoadModal(false);
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error saving return load', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTripFormState = () => {
    // Pick first available truck that is not currently running an active trip, or first truck
    const availableVeh = allVehicles.find(
      (v) => !allTrips.some((t) => t.registrationNumber === v.registrationNumber && (t.status === 'active' || t.status === 'running'))
    ) || allVehicles[0];

    const reg = availableVeh?.registrationNumber || 'DHAKA-METRO-TA-12-3456';
    setTripTruckReg(reg);
    if (availableVeh?.driverName) {
      setTripDriverName(availableVeh.driverName);
      const d = allDrivers.find((dr) => dr.name.toLowerCase() === availableVeh.driverName?.toLowerCase());
      if (d?.phone) setTripDriverPhone(d.phone);
      else setTripDriverPhone('');
    } else {
      setTripDriverName(allDrivers[0]?.name || 'Abdul Karim');
      setTripDriverPhone(allDrivers[0]?.phone || '');
    }
    setTripHelperName('');
    setTripStartLoc('Dhaka');
    setTripDestLoc('Chittagong');
    setTripLoadLoc('Dhaka Tejgaon');
    setTripDeliverLoc('');
    setTripCustomer('');
    setTripReceiverPhone('');
    setTripBrokerName('');
    setTripCargo('Farm feed and livestock freight');
    setTripStartDate(todayStr);
    setTripExpectedReturn(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
    setTripFare(0);
    setTripAdvance(0);
    setTripCommission(0);
    setTripHasReturn(false);
    setTripReturnLoadLoc('');
    setTripReturnUnloadLoc('');
    setTripReturnFare(0);
    setTripReturnDriverCash(0);
    setTripDieselCost(0);
    setTripFuelLitres(0);
    setTripTollCost(0);
    setTripFerryCost(0);
    setTripDriverKhoraki(0);
    setTripPoliceCost(0);
    setTripLabourCost(0);
    setTripOtherCost(0);
    setTripRemarks('');
  };

  const handleOpenAddTripModal = () => {
    resetTripFormState();
    setShowAddTripModal(true);
  };

  // Auto Distance & Financial Calculations
  const calculatedDistanceKm = Math.max(0, Number(tripEndKm || 0) - Number(tripStartKm || 0));
  const calculatedTotalIncome = Number(tripFare || 0) + (tripHasReturn ? Number(tripReturnFare || 0) : 0);
  const calculatedTotalReceived = Number(tripAdvance || 0) + (tripHasReturn ? Number(tripReturnDriverCash || 0) : 0);
  const calculatedRemainingDue = Math.max(0, calculatedTotalIncome - calculatedTotalReceived);
  const calculatedTripExpense =
    Number(tripDieselCost || 0) +
    Number(tripTollCost || 0) +
    Number(tripFerryCost || 0) +
    Number(tripDriverKhoraki || 0) +
    Number(tripPoliceCost || 0) +
    Number(tripLabourCost || 0) +
    Number(tripCommission || 0) +
    Number(tripOtherCost || 0);
  const calculatedNetIncome = calculatedTotalIncome - calculatedTripExpense;
  const calculatedDriverCashInHand =
    Number(tripAdvance || 0) +
    (tripHasReturn ? Number(tripReturnDriverCash || 0) : 0) -
    (Number(tripTollCost || 0) +
      Number(tripFerryCost || 0) +
      Number(tripDriverKhoraki || 0) +
      Number(tripPoliceCost || 0) +
      Number(tripLabourCost || 0) +
      Number(tripOtherCost || 0));

  // 8. Form State: + Log Fuel
  const [fuelTruckReg, setFuelTruckReg] = useState(allVehicles[0]?.registrationNumber || 'DHAKA-METRO-T-12-3456');
  const [fuelDriver, setFuelDriver] = useState('Abdul Karim');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelPump, setFuelPump] = useState('Meghna Petroleum Filling Station');
  const [fuelType, setFuelType] = useState('Diesel');
  const [fuelLitres, setFuelLitres] = useState<number>(70);
  const [fuelRate, setFuelRate] = useState<number>(108);
  const [fuelOdometer, setFuelOdometer] = useState<number>(45150);
  const [fuelWalletId, setFuelWalletId] = useState(treasuryWallets[0]?.id || '');
  const [fuelRemarks, setFuelRemarks] = useState('Full tank diesel for Dhaka-Chittagong trip');
  const [fuelImageUrl, setFuelImageUrl] = useState('');
  const calculatedFuelTotal = Number(fuelLitres || 0) * Number(fuelRate || 0);

  // 9. Form State: + Service & Maintenance
  const [srvTruckReg, setSrvTruckReg] = useState(allVehicles[0]?.registrationNumber || 'DHAKA-METRO-T-12-3456');
  const [srvDate, setSrvDate] = useState(new Date().toISOString().split('T')[0]);
  const [srvOdometer, setSrvOdometer] = useState<number>(45200);
  const [srvGarage, setSrvGarage] = useState('Bhai Bhai Automobiles, Tejgaon');
  const [srvMechanic, setSrvMechanic] = useState('Ustad Zahirul Islam');
  const [srvProblem, setSrvProblem] = useState('Brake pad wear and engine oil change');
  const [srvParts, setSrvParts] = useState('15W-40 Engine oil, oil filter, front brake shoes');
  const [srvTyreBatterySerial, setSrvTyreBatterySerial] = useState('TYRE-BRIDGE-295-80R');
  const [srvWarrantyExpiry, setSrvWarrantyExpiry] = useState('2027-11-30');
  const [srvPartsCost, setSrvPartsCost] = useState<number>(5500);
  const [srvLabourCost, setSrvLabourCost] = useState<number>(1500);
  const [srvOtherCost, setSrvOtherCost] = useState<number>(500);
  const [srvNextDate, setSrvNextDate] = useState('2027-02-28');
  const [srvNextKm, setSrvNextKm] = useState<number>(50000);
  const [srvWalletId, setSrvWalletId] = useState(treasuryWallets[0]?.id || '');
  const [srvImageUrl, setSrvImageUrl] = useState('');
  const calculatedServiceTotal = Number(srvPartsCost || 0) + Number(srvLabourCost || 0) + Number(srvOtherCost || 0);

  // 10. Form State: + Driver Payment (Salary / Advance / Allowance)
  const [drvPayName, setDrvPayName] = useState(allDrivers[0]?.name || 'Abdul Karim');
  const [drvPayType, setDrvPayType] = useState<'salary' | 'advance' | 'allowance'>('salary');
  const [drvPayAmount, setDrvPayAmount] = useState<number>(18000);
  const [drvPayDate, setDrvPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [drvPayWalletId, setDrvPayWalletId] = useState(treasuryWallets[0]?.id || '');
  const [drvPayNote, setDrvPayNote] = useState('Monthly salary settlement');

  // 11. Customer Payment State
  const [custPayAmount, setCustPayAmount] = useState<number>(0);
  const [custPayDate, setCustPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [custPayWalletId, setCustPayWalletId] = useState(treasuryWallets[0]?.id || '');

  // 12. Handlers: + Register Truck
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehReg.trim()) {
      triggerGlobalToast('Enter registration number', 'info');
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
          truckBodyType: newVehBodyType,
          capacityTons: Number(newVehCapacityTons || 0),
          engineNumber: newVehEngineNo.trim(),
          chassisNumber: newVehChassisNo.trim(),
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
        `Vehicle ${newVehReg} registered successfully!`,
        'success'
      );
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error creating vehicle', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 13. Handlers: + Create Trip
  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripTruckReg) {
      triggerGlobalToast('Please select a truck (গাড়ি নির্বাচন করুন)', 'info');
      return;
    }
    if (tripFare <= 0) {
      triggerGlobalToast('Please enter trip freight fare (ভাড়া লিখুন)', 'info');
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-complete any prior active trip on this truck so fleet status transitions seamlessly
      const activeTripOnSameTruck = allTrips.find(
        (t) => t.registrationNumber === tripTruckReg && (t.status === 'active' || t.status === 'running')
      );
      if (activeTripOnSameTruck) {
        try {
          await updateTransportOpRecord(
            activeTripOnSameTruck,
            {
              status: 'completed',
              actualReturnDate: tripStartDate,
            },
            actorEmail
          );
        } catch (e) {
          console.warn('Auto-completing prior trip', e);
        }
      }

      const tripCode = `TRP-${Date.now().toString().slice(-5)}`;
      const returnLoad = tripHasReturn ? (tripReturnLoadLoc.trim() || tripDestLoc.trim()) : '';
      const returnUnload = tripHasReturn ? (tripReturnUnloadLoc.trim() || tripStartLoc.trim()) : '';
      const routeStr = tripHasReturn && (tripReturnFare > 0 || returnLoad || returnUnload)
        ? `${tripStartLoc} ➔ ${tripDestLoc} ⇄ ${returnUnload || tripStartLoc}`
        : `${tripStartLoc} ➔ ${tripDestLoc}`;

      const totalIncome = Number(tripFare || 0) + (tripHasReturn ? Number(tripReturnFare || 0) : 0);
      const totalRecv = Number(tripAdvance || 0) + (tripHasReturn ? Number(tripReturnDriverCash || 0) : 0);
      const dueRemaining = Math.max(0, totalIncome - totalRecv);

      await createTransportOpRecord(
        {
          tripOrVehicleCode: tripCode,
          orderNumber: (allTrips.length + 1).toString().padStart(2, '0'),
          recordType: 'trip',
          businessId: activeBusiness.id,
          registrationNumber: tripTruckReg,
          vehicleType: 'Heavy Truck',
          driverName: tripDriverName.trim(),
          driverPhone: tripDriverPhone.trim() || undefined,
          receiverPhone: tripReceiverPhone.trim() || undefined,
          helperName: tripHelperName.trim(),
          origin: tripStartLoc.trim(),
          destination: tripDestLoc.trim(),
          loadingLocation: tripLoadLoc.trim(),
          deliveryLocation: tripDeliverLoc.trim(),
          route: routeStr,
          cargoDetails: tripCargo.trim(),
          customerName: tripCustomer.trim(),
          brokerName: tripBrokerName.trim(),
          returnLoadingPoint: returnLoad,
          returnUnloadingPoint: returnUnload,
          returnFare: tripHasReturn ? Number(tripReturnFare || 0) : 0,
          returnDriverCash: tripHasReturn ? Number(tripReturnDriverCash || 0) : 0,
          distanceKm: calculatedDistanceKm,
          startOdometer: Number(tripStartKm || 0),
          endOdometer: Number(tripEndKm || 0),
          fuelLitres: Number(tripFuelLitres || 0),
          fuelCost: Number(tripDieselCost || 0),
          tollCost: Number(tripTollCost || 0),
          ferryCost: Number(tripFerryCost || 0),
          driverKhoraki: Number(tripDriverKhoraki || 0),
          policeRoadCost: Number(tripPoliceCost || 0),
          labourLoadingCost: Number(tripLabourCost || 0),
          driverAllowance: Number(tripDriverKhoraki || 0),
          commission: Number(tripCommission || 0),
          tripExpense: calculatedTripExpense,
          maintenanceCost: Number(tripOtherCost || 0),
          maintenanceDetails: `Toll: ৳${tripTollCost} | Ferry: ৳${tripFerryCost} | Khoraki: ৳${tripDriverKhoraki} | Police: ৳${tripPoliceCost} | Labour: ৳${tripLabourCost} | Commission: ৳${tripCommission}`,
          tripRevenue: totalIncome,
          advanceReceived: Number(tripAdvance || 0),
          remainingDue: dueRemaining,
          outstandingDue: dueRemaining,
          netIncome: totalIncome - calculatedTripExpense,
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
            category: `Trip Advance Received (${tripTruckReg})`,
            description: `${tripTruckReg} (${routeStr}) — Advance received: ৳${tripAdvance} (Total Fare: ৳${tripFare})`,
            debitAccountId: targetWallet.id,
            debitAccountName: targetWallet.name,
            creditAccountId: revAcc.id,
            creditAccountName: revAcc.name,
            amount: Number(tripAdvance),
            paymentStatus: dueRemaining > 0 ? 'partial' : 'paid',
            dueAmount: dueRemaining,
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
            category: `Trip Direct Outflow & Fuel (${tripTruckReg})`,
            description: `${tripTruckReg} (${routeStr}) — Diesel: ৳${tripDieselCost}, Toll: ৳${tripTollCost}, Road: ৳${tripOtherCost}`,
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

      resetTripFormState();
      setShowAddTripModal(false);
      triggerGlobalToast(
        `Trip ${tripCode} started on ${tripTruckReg} (Freight: ${formatBDT(totalIncome)})!`,
        'success'
      );
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
        `Trip ${trip.tripOrVehicleCode} marked as completed!`,
        'success'
      );
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
            category: `Customer Due Collection (${targetTripForPayment.registrationNumber})`,
            description: `Collected ৳${custPayAmount} remaining fare from ${targetTripForPayment.customerName}`,
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
`Collected payment of ৳${custPayAmount} successfully!`,
        'success'
      );
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
            category: `Fleet Fuel & Diesel Log (${fuelTruckReg})`,
            description: `${fuelTruckReg} — ${fuelLitres}L Diesel (${fuelPump}) Cost ৳${fuelTotal}`,
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
`Fuel logged: ${fuelLitres}L (৳${fuelTotal}) for ${fuelTruckReg}!`,
        'success'
      );
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
          tyreOrBatterySerial: srvTyreBatterySerial.trim(),
          warrantyExpiryDate: srvWarrantyExpiry,
          maintenanceDetails: `${srvProblem} | Parts: ${srvParts} (SN: ${srvTyreBatterySerial}) | Labor: ৳${srvLabourCost} | Warranty: ${srvWarrantyExpiry}`,
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
            category: `Vehicle Repair & Maintenance (${srvTruckReg})`,
            description: `${srvTruckReg} — ${srvProblem} (${srvGarage}) Total Cost ৳${srvTotal}`,
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
          ? `Service record for ${srvTruckReg} (BDT ${srvTotal}) saved successfully!`
          : `Maintenance logged: ৳${srvTotal} for ${srvTruckReg}!`,
        'success'
      );
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
            category: `Driver Salary & Allowance (${drvPayName})`,
            description: `${drvPayName} — ${drvPayType === 'salary' ? 'Monthly Salary' : drvPayType === 'advance' ? 'Salary Advance' : 'Trip Allowance'} payment of BDT ${drvPayAmount}`,
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
          ? `BDT ${drvPayAmount} paid successfully to ${drvPayName}!`
          : `Paid ৳${drvPayAmount} to driver ${drvPayName}!`,
        'success'
      );
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
        {onBackToDashboard && (
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {activeBusiness.location ? `Location: ${activeBusiness.location}` : ''}
              {activeBusiness.managerName ? ` · In-Charge: ${activeBusiness.managerName}` : ''}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {activeBusiness.name} — Fleet & Transport Management
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {allVehicles.length} Trucks
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {bn
                  ? 'Fleet profiles, trip dispatch, fuel logs, driver payroll & P&L ledger'
                  : 'Fleet operations, trips, fuel efficiency, driver payroll, and vehicle profit/loss'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddTripModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ New Trip</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddVehicleModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              <Truck className="h-3.5 w-3.5 text-emerald-600" />
              <span>+ Add Truck</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddFuelModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              <Fuel className="h-3.5 w-3.5 text-sky-600" />
              <span>+ Fuel</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddServiceModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              <Wrench className="h-3.5 w-3.5 text-amber-600" />
              <span>+ Service</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs font-bold">
          {[
            { id: 'dashboard', labelBn: 'Dashboard', labelEn: 'Dashboard', icon: Gauge },
            { id: 'vehicles', labelBn: 'All Trucks', labelEn: 'All Trucks', icon: Truck },
            { id: 'trips', labelBn: 'Trip Ledger', labelEn: 'Trip Ledger', icon: Navigation },
            { id: 'fuel', labelBn: 'Fuel Logs', labelEn: 'Fuel Logs', icon: Fuel },
            { id: 'drivers', labelBn: 'Drivers & Staff', labelEn: 'Drivers & Staff', icon: Users },
            { id: 'maintenance', labelBn: 'Maintenance', labelEn: 'Maintenance', icon: Wrench },
            { id: 'reports', labelBn: '12 Reports', labelEn: '12 Reports', icon: FileSpreadsheet },
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
          {/* Top 10 Summary Cards (Today's metrics first, Red alert for Under Maintenance, all clickable) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            {/* 1. Today's Total Income (FIRST) */}
            <div
              onClick={() => setShowTodayIncomeModal(true)}
              className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs space-y-1 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-between">
                <span>Today&apos;s Income</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                +{formatBDT(dashboardKpis.todayIncome)}
              </div>
              <div className="text-[10px] text-emerald-600 flex items-center justify-between">
                <span>{todayIncomeData.items.length} income entries</span>
                <span className="underline decoration-dotted text-[9px] font-bold">Details →</span>
              </div>
            </div>

            {/* 2. Today's Total Expenses (SECOND) */}
            <div
              onClick={() => setShowTodayExpenseModal(true)}
              className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-2xs space-y-1 hover:border-amber-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-amber-800 dark:text-amber-300 font-bold flex items-center justify-between">
                <span>Today&apos;s Expenses</span>
                <DollarSign className="h-3.5 w-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xl font-black font-mono text-amber-700 dark:text-amber-400">
                -{formatBDT(dashboardKpis.todayExpenses)}
              </div>
              <div className="text-[10px] text-amber-600 flex items-center justify-between">
                <span>Fuel, toll, khoraki & road</span>
                <span className="underline decoration-dotted text-[9px] font-bold">Details →</span>
              </div>
            </div>

            {/* 3. Running Trips */}
            <div
              onClick={() => {
                setSelectedTripStatusFilter('active');
                setActiveTab('trips');
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Running Trips</span>
              </div>
              <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                {dashboardKpis.runningCount}
              </div>
              <div className="text-[10px] text-emerald-600 flex items-center justify-between">
                <span>on the road</span>
                <span className="underline decoration-dotted text-[9px] font-bold">View →</span>
              </div>
            </div>

            {/* 4. Available Trucks */}
            <div
              onClick={() => setActiveTab('vehicles')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-sky-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>Available Trucks</span>
                <Truck className="h-3.5 w-3.5 text-sky-500" />
              </div>
              <div className="text-xl font-black font-mono text-sky-600">
                {dashboardKpis.availableCount}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>ready for dispatch</span>
                <span className="underline decoration-dotted text-[9px] font-bold">Fleet →</span>
              </div>
            </div>

            {/* 5. Trucks Under Maintenance (RED COLOR AS REQUESTED) */}
            <div
              onClick={() => setShowMaintenanceModal(true)}
              className="p-3 rounded-xl border-2 border-rose-400 dark:border-rose-700 bg-rose-50/80 dark:bg-rose-950/40 shadow-xs space-y-1 hover:border-rose-600 hover:shadow-md cursor-pointer transition-all group ring-1 ring-rose-300/50 dark:ring-rose-900/50"
            >
              <div className="text-[11px] text-rose-700 dark:text-rose-300 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 animate-bounce" />
                  <span>In Workshop / Repair</span>
                </span>
                <Wrench className="h-3.5 w-3.5 text-rose-600" />
              </div>
              <div className="text-xl font-black font-mono text-rose-700 dark:text-rose-400">
                {dashboardKpis.maintenanceCount}
              </div>
              <div className="text-[10px] text-rose-600 font-semibold flex items-center justify-between">
                <span>{dashboardKpis.maintenanceCount > 0 ? `${dashboardKpis.maintenanceCount} in garage/shop` : 'All healthy'}</span>
                <span className="underline decoration-dotted text-[9px] font-bold">Details →</span>
              </div>
            </div>

            {/* 6. Total Trucks */}
            <div
              onClick={() => setActiveTab('vehicles')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-slate-400 cursor-pointer transition-all"
            >
              <div className="text-[11px] text-slate-500 font-medium">Total Trucks</div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {dashboardKpis.totalTrucks}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>{allVehicles.length} registered</span>
                <span className="underline decoration-dotted text-[9px]">Fleet →</span>
              </div>
            </div>

            {/* 7. Total Distance Travelled */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">Total Distance</div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {dashboardKpis.totalDistance.toLocaleString()} <span className="text-xs font-normal">KM</span>
              </div>
              <div className="text-[10px] text-slate-400">{allTrips.length} trips total</div>
            </div>

            {/* 8. Monthly Revenue */}
            <div
              onClick={() => setShowMonthlyRevenueModal(true)}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>Monthly Revenue</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-black font-mono text-emerald-600">
                {formatBDT(dashboardKpis.monthlyRevenue)}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>gross freight</span>
                <span className="underline decoration-dotted text-[9px] font-bold text-emerald-600">Breakdown →</span>
              </div>
            </div>

            {/* 9. Monthly Expenses */}
            <div
              onClick={() => setShowMonthlyExpenseModal(true)}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-rose-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>Monthly Expenses</span>
                <DollarSign className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <div className="text-xl font-black font-mono text-rose-600">
                {formatBDT(dashboardKpis.monthlyExpenses)}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>fuel, toll & repair</span>
                <span className="underline decoration-dotted text-[9px] font-bold text-rose-600">Breakdown →</span>
              </div>
            </div>

            {/* 10. Monthly Net Profit */}
            <div
              onClick={() => setActiveTab('reports')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-sky-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>Monthly Net Profit</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
              </div>
              <div
                className={`text-xl font-black font-mono ${
                  dashboardKpis.monthlyNetProfit >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600'
                }`}
              >
                {formatBDT(dashboardKpis.monthlyNetProfit)}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Net Margin</span>
                <span className="underline decoration-dotted text-[9px] font-bold text-sky-600">P&L Report →</span>
              </div>
            </div>
          </div>

          {/* ── EXACT REQUIREMENT: 4 CURRENTLY RUNNING TRUCKS SECTION ──── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  'Running Trucks — Currently On Trip (4 Units)'
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
                <span>View All Running Trips →</span>
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
                            {isActuallyRunning ? '● On Trip' : trip.status}
                          </span>
                        </div>

                        {/* Driver & Route */}
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <span className="text-[10px] text-slate-400">Driver:</span>
                            <span className="font-semibold">{trip.driverName}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                            <span className="text-[10px] text-slate-400">From:</span>
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">{trip.origin}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                            <span className="text-[10px] text-slate-400">To:</span>
                            <span className="font-medium text-sky-700 dark:text-sky-400">{trip.destination}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-400">Start Date:</span>
                            <span className="font-mono">{trip.date}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-400">Start KM:</span>
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
                        <span>View Trip Details</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No running trucks on trip currently.
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
                    ? `Alert: ${expiryAlerts.length} vehicle documents or service schedules are expiring or overdue!`
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
                      <span className="text-[9px] uppercase">{alt.isExpired ? 'Expired' : 'Upcoming'}</span>
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
                <span>All Registered Fleet Vehicles ({allVehicles.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                'BRTA documentation, tax tokens, route permits, and odometer readings'
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddVehicleModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Truck</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Registration & Code</th>
                  <th className="py-2.5 px-3">Type & Capacity</th>
                  <th className="py-2.5 px-3">Driver & Odometer</th>
                  <th className="py-2.5 px-3">Tax Token</th>
                  <th className="py-2.5 px-3">Fitness Expiry</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white font-mono">{v.registrationNumber}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {v.tripOrVehicleCode}
                        {v.chassisNumber ? ` • Chassis: ${v.chassisNumber}` : ''}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {v.vehicleType} {v.truckBodyType ? `(${v.truckBodyType})` : ''}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold text-emerald-600">
                        {v.capacityTons ? `${v.capacityTons} Ton Capacity` : ''}
                        {v.purchasePrice ? ` • ${formatBDT(v.purchasePrice)}` : ''}
                      </div>
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
                          ? 'On Trip'
                          : v.status === 'available'
                          ? 'Available'
                          : 'Maintenance'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          triggerConfirmDelete({
                            title: 'Confirm Delete Truck',
                            message: `Are you sure you want to delete vehicle ${v.registrationNumber}?`,
                            itemName: v.registrationNumber,
                            onConfirm: async () => {
                              await deleteTransportOp(v.id);
                              triggerGlobalToast('Vehicle deleted', 'delete');
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
                <span>Trip Management & Orders ({allTrips.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                'Odometer distance, fare, customer dues, and challan vouchers'
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedTruckFilter}
                onChange={(e) => setSelectedTruckFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold"
              >
                <option value="ALL">All Trucks ({allVehicles.length} Registered)</option>
                {allVehicles.map((v) => (
                  <option key={v.id} value={v.registrationNumber}>
                    {v.registrationNumber} ({v.truckBodyType || v.vehicleType || 'Truck'})
                  </option>
                ))}
              </select>

              <select
                value={selectedTripStatusFilter}
                onChange={(e) => setSelectedTripStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs font-semibold"
              >
                <option value="ALL">All Status</option>
                <option value="active">Running</option>
                <option value="completed">Completed</option>
              </select>

              <button
                type="button"
                onClick={handleOpenAddTripModal}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Start Trip</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">SL & Trip</th>
                  <th className="py-2.5 px-3">Truck & Driver</th>
                  <th className="py-2.5 px-3">Route</th>
                  <th className="py-2.5 px-3 text-right">Distance (KM)</th>
                  <th className="py-2.5 px-3 text-right">Fare</th>
                  <th className="py-2.5 px-3 text-right">Due</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allTrips
                  .filter((t) => {
                    if (selectedTripStatusFilter !== 'ALL' && t.status !== selectedTripStatusFilter) return false;
                    if (selectedTruckFilter !== 'ALL' && t.registrationNumber !== selectedTruckFilter) return false;
                    return true;
                  })
                  .map((t, index) => {
                    const isRunning = t.status === 'active' || t.status === 'running';
                    const hasReturn = Boolean(
                      (t.returnFare && t.returnFare > 0) ||
                      t.returnLoadingPoint ||
                      t.returnUnloadingPoint ||
                      (t.route && (t.route.includes('⇄') || t.route.toLowerCase().includes('round')))
                    );
                    const routeStr = t.route || `${t.origin} ➔ ${t.destination}`;
                    const dueAmt = Number(t.outstandingDue !== undefined ? t.outstandingDue : t.remainingDue || 0);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{t.tripOrVehicleCode}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.date}</div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-bold text-emerald-700 dark:text-emerald-400">{t.registrationNumber}</div>
                          <div className="text-[10px] text-slate-500">{t.driverName}</div>
                        </td>
                        <td className="py-2 px-3 max-w-[240px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              hasReturn
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {hasReturn ? 'Round Trip' : 'Single Trip'}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{routeStr}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {t.customerName} • {t.cargoDetails}
                            {hasReturn && t.returnFare ? ` • Return: ${formatBDT(t.returnFare)}` : ''}
                          </div>
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
                            {isRunning ? 'Running' : 'Completed'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {isRunning && (
                              <button
                                type="button"
                                onClick={() => handleOpenAddReturnLoadModal(t)}
                                className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200 hover:bg-sky-600 hover:text-white cursor-pointer"
                                title={hasReturn ? "Edit Return Load" : "+ Add Return Load"}
                              >
                                {hasReturn ? 'Edit Return' : '+ Return Load'}
                              </button>
                            )}

                            {isRunning && (
                              <button
                                type="button"
                                onClick={() => handleCompleteTrip(t)}
                                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 hover:bg-emerald-600 hover:text-white cursor-pointer"
                                title="Mark Completed"
                              >
                                Complete
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedTripChallan(t)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title="View Official Consignment Challan & Income Slip"
                            >
                              <FileText className="h-3 w-3" />
                              <span>Challan Slip</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                triggerConfirmDelete({
                                  title: 'Delete Trip',
                                  message: `Are you sure you want to delete trip ${t.tripOrVehicleCode}?`,
                                  itemName: t.tripOrVehicleCode,
                                  onConfirm: async () => {
                                    await deleteTransportOp(t.id);
                                    triggerGlobalToast('Deleted', 'delete');
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
                <span>Fuel Consumption & Efficiency Logs ({allFuelLogs.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                'Fuel litres, rate, total cost, and calculated KM/L fuel economy'
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddFuelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Log Fuel</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2 px-3">Date & Code</th>
                  <th className="py-2 px-3">Truck & Driver</th>
                  <th className="py-2 px-3">Fuel Pump</th>
                  <th className="py-2 px-3 text-right">Litres</th>
                  <th className="py-2 px-3 text-right">Price/L</th>
                  <th className="py-2 px-3 text-right">Total Cost</th>
                  <th className="py-2 px-3 text-right">Odometer (KM)</th>
                  <th className="py-2 px-3 text-center">Receipt</th>
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
                <span>Driver & Staff Management ({allDrivers.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                'Driver license validity, assigned truck, monthly salary, and advance ledger'
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddDriverModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-xs cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>+ Pay Driver</span>
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
                    <span className="text-[10px] text-slate-400">Assigned Truck:</span>
                    <div className="font-semibold text-emerald-700 dark:text-emerald-400 truncate">{d.truck || 'Float'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Monthly Salary:</span>
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
                  Pay Salary / Advance
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
                <span>Vehicle Service & Maintenance Records ({allMaintenanceLogs.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                'Parts replacement, mechanic labour charges, and scheduled servicing'
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddServiceModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Log Service</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2 px-3">Date & Code</th>
                  <th className="py-2 px-3">Truck & Odometer</th>
                  <th className="py-2 px-3">Garage & Mechanic</th>
                  <th className="py-2 px-3">Repair & Parts</th>
                  <th className="py-2 px-3 text-right">Parts Cost</th>
                  <th className="py-2 px-3 text-right">Labour</th>
                  <th className="py-2 px-3 text-right">Total Cost</th>
                  <th className="py-2 px-3">Next Service</th>
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
                    <td className="py-2 px-3 max-w-[240px]">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">{m.cargoDetails || m.maintenanceDetails}</div>
                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        {m.partsReplaced && <div className="truncate">Parts: {m.partsReplaced}</div>}
                        {m.tyreOrBatterySerial && <div className="text-amber-600 dark:text-amber-400 truncate">S/N: {m.tyreOrBatterySerial}</div>}
                        {m.warrantyExpiryDate && <div className="text-emerald-600 dark:text-emerald-400">Warranty: {m.warrantyExpiryDate}</div>}
                      </div>
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
                <span>12 Audited Transport Reports</span>
              </h2>
              <p className="text-xs text-slate-500">
                'Standard audited transport reports with print and CSV download'
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {[
              { id: 'all_trucks', title: '1. All Truck Report', desc: 'Complete vehicle registry, documentation & road fitness' },
              { id: 'running_trips', title: '2. Running Trip Report', desc: 'Currently dispatched on-road trips and drivers' },
              { id: 'completed_trips', title: '3. Completed Trip Report', desc: 'Concluded voyages with freight and collections' },
              { id: 'truck_history', title: '4. Truck-wise Trip History', desc: 'Historical trips logged per registration plate' },
              { id: 'driver_perf', title: '5. Driver Performance Report', desc: 'Driver efficiency, distance driven and safety' },
              { id: 'fuel_report', title: '6. Fuel Consumption Report', desc: 'Total fuel consumption, refueling and cost/KM' },
              { id: 'maint_report', title: '7. Maintenance History Report', desc: 'Workshop repairs and maintenance timeline' },
              { id: 'service_exp', title: '8. Service Expense Report', desc: 'Parts replacement bills and garage labor fees' },
              { id: 'monthly_rev', title: '9. Monthly Revenue Report', desc: 'Monthly gross freight earnings and revenue' },
              { id: 'truck_pnl', title: '10. Truck-wise Profit & Loss', desc: 'Net profitability per vehicle after all direct costs' },
              { id: 'driver_salary', title: '11. Driver Salary Report', desc: 'Driver salaries, trip allowances and advances' },
              { id: 'customer_due', title: '12. Customer Due Report', desc: 'Outstanding customer receivables and dues' },
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
                  Download CSV
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL 1: + NEW TRIP (OUTGOING + RETURN + DETAILED EXPENSES) ─── */}
      {showAddTripModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddTripModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Navigation className="h-4 w-4 text-emerald-600" />
                <span>Create & Dispatch Transport Trip</span>
              </h3>
              <button type="button" onClick={() => setShowAddTripModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTrip} className="space-y-4 text-xs">
              {/* SECTION 1: VEHICLE & DRIVER ASSIGNMENT */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>1. Vehicle & Crew</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block mb-1 font-semibold">Select Truck *</label>
                    <select
                      value={tripTruckReg}
                      onChange={(e) => {
                        const reg = e.target.value;
                        setTripTruckReg(reg);
                        const v = allVehicles.find((veh) => veh.registrationNumber === reg);
                        if (v?.driverName) {
                          setTripDriverName(v.driverName);
                          const d = allDrivers.find((dr) => dr.name.toLowerCase() === v.driverName?.toLowerCase());
                          if (d?.phone) setTripDriverPhone(d.phone);
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-bold"
                    >
                      {allVehicles.map((v) => {
                        const isBusy = allTrips.some((t) => t.registrationNumber === v.registrationNumber && (t.status === 'active' || t.status === 'running'));
                        return (
                          <option key={v.id} value={v.registrationNumber}>
                            {v.registrationNumber} {isBusy ? '— [On Active Trip]' : '— [Available]'} ({v.truckBodyType || v.vehicleType || 'Truck'})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Assigned Driver *</label>
                    <input
                      type="text"
                      required
                      value={tripDriverName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setTripDriverName(name);
                        const d = allDrivers.find((dr) => dr.name.toLowerCase() === name.toLowerCase());
                        if (d?.phone) setTripDriverPhone(d.phone);
                      }}
                      placeholder="Driver Name"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Driver Mobile (Optional)</label>
                    <input
                      type="text"
                      value={tripDriverPhone}
                      onChange={(e) => setTripDriverPhone(e.target.value)}
                      placeholder="e.g. +880 17XXXXXXXX"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Helper / Assistant</label>
                    <input
                      type="text"
                      value={tripHelperName}
                      onChange={(e) => setTripHelperName(e.target.value)}
                      placeholder="Optional Helper"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: OUTGOING TRIP (যাওয়া) */}
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2.5">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
                    <span>2. Outgoing Route & Freight (যাওয়া)</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-500">Party, Broker, Load & Unload</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block mb-1 font-semibold">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={tripStartDate}
                      onChange={(e) => setTripStartDate(e.target.value)}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Expected Return</label>
                    <input
                      type="date"
                      value={tripExpectedReturn}
                      onChange={(e) => setTripExpectedReturn(e.target.value)}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Loading Point *</label>
                    <input
                      type="text"
                      required
                      value={tripLoadLoc}
                      onChange={(e) => setTripLoadLoc(e.target.value)}
                      placeholder="e.g. Dhaka Tejgaon"
                      className="w-full rounded border px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Unloading Point (আনলোডিং পয়েন্ট) *</label>
                    <input
                      type="text"
                      required
                      value={tripDeliverLoc}
                      onChange={(e) => setTripDeliverLoc(e.target.value)}
                      placeholder="e.g. Chittagong Agrabad / Unloading Point"
                      className="w-full rounded border px-2 py-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="block mb-1 font-semibold">Party / Customer *</label>
                    <input
                      type="text"
                      required
                      value={tripCustomer}
                      onChange={(e) => setTripCustomer(e.target.value)}
                      placeholder="Company Name"
                      className="w-full rounded border px-2 py-1 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Receiver Mobile (Optional)</label>
                    <input
                      type="text"
                      value={tripReceiverPhone}
                      onChange={(e) => setTripReceiverPhone(e.target.value)}
                      placeholder="e.g. +880 18XXXXXXXX"
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Broker Name</label>
                    <input
                      type="text"
                      value={tripBrokerName}
                      onChange={(e) => setTripBrokerName(e.target.value)}
                      placeholder="Broker / Agent"
                      className="w-full rounded border px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-700 dark:text-emerald-400 mb-1">Outgoing Fare (BDT) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="0"
                      value={tripFare === 0 ? '' : tripFare}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripFare(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border border-emerald-400 px-2 py-1 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Advance Received</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripAdvance === 0 ? '' : tripAdvance}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripAdvance(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: RETURN TRIP / BACK LOAD (ফিরে আসা) */}
              <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5 text-sky-600" />
                    <span>3. Return Trip / Back Load (ফিরে আসা)</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tripHasReturn}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setTripHasReturn(checked);
                        if (checked) {
                          if (!tripReturnLoadLoc) setTripReturnLoadLoc(tripDeliverLoc || 'Chittagong');
                          if (!tripReturnUnloadLoc) setTripReturnUnloadLoc(tripLoadLoc || 'Dhaka');
                        }
                      }}
                      className="h-4 w-4 rounded text-sky-600"
                    />
                    <span>Has Return Freight Load? (রিটার্ন ট্রিপ যোগ করুন)</span>
                  </label>
                </div>

                {tripHasReturn && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-sky-200 dark:border-sky-800">
                    <div>
                      <label className="block mb-1 font-semibold">Return Loading Point</label>
                      <input
                        type="text"
                        value={tripReturnLoadLoc}
                        onChange={(e) => setTripReturnLoadLoc(e.target.value)}
                        placeholder="Port / Depot"
                        className="w-full rounded border px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold">Return Unload Point</label>
                      <input
                        type="text"
                        value={tripReturnUnloadLoc}
                        onChange={(e) => setTripReturnUnloadLoc(e.target.value)}
                        placeholder="Destination"
                        className="w-full rounded border px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-sky-700 dark:text-sky-400 mb-1">Return Fare (BDT)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={tripReturnFare === 0 ? '' : tripReturnFare}
                        onChange={(e) => {
                          const v = e.target.value.replace(/^0+(?=\d)/, '');
                          setTripReturnFare(v === '' ? 0 : Number(v));
                        }}
                        className="w-full rounded border border-sky-400 px-2 py-1 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Cash In Hand (Driver)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={tripReturnDriverCash === 0 ? '' : tripReturnDriverCash}
                        onChange={(e) => {
                          const v = e.target.value.replace(/^0+(?=\d)/, '');
                          setTripReturnDriverCash(v === '' ? 0 : Number(v));
                        }}
                        className="w-full rounded border px-2 py-1 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: TRIP EXPENSES (তেল, টোল, ফেরি, খোরাকি, পুলিশ, লেবার) */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Fuel className="h-3.5 w-3.5 text-amber-600" />
                    <span>4. Trip Expenses Breakdown (তেল, টোল, খোরাকি, লেবার)</span>
                  </span>
                  <span className="font-mono font-bold text-rose-600">Total: {formatBDT(calculatedTripExpense)}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Diesel Cost (BDT)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripDieselCost === 0 ? '' : tripDieselCost}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripDieselCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Toll & Bridge</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripTollCost === 0 ? '' : tripTollCost}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripTollCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Ferry Expense</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripFerryCost === 0 ? '' : tripFerryCost}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripFerryCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Driver Khoraki / Allowance</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripDriverKhoraki === 0 ? '' : tripDriverKhoraki}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripDriverKhoraki(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Police & Road Expense</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripPoliceCost === 0 ? '' : tripPoliceCost}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripPoliceCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Labour / Loading</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripLabourCost === 0 ? '' : tripLabourCost}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripLabourCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Broker Commission</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripCommission === 0 ? '' : tripCommission}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripCommission(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono text-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Other Expenses</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripOtherCost === 0 ? '' : tripOtherCost}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripOtherCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: AUTOMATIC CALCULATION BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-900 text-white font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Total Income (যাওয়া+রিটার্ন)</div>
                  <div className="text-sm font-bold text-emerald-400">{formatBDT(calculatedTotalIncome)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Total Trip Expense</div>
                  <div className="text-sm font-bold text-rose-400">{formatBDT(calculatedTripExpense)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Trip Net Profit (নিট লাভ)</div>
                  <div className={`text-base font-black ${calculatedNetIncome >= 0 ? 'text-sky-400' : 'text-rose-500'}`}>
                    {formatBDT(calculatedNetIncome)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Party Due / Driver Cash</div>
                  <div className="text-xs font-bold text-amber-300">
                    Due: {formatBDT(calculatedRemainingDue)}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddTripModal(false)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving & Dispatching Trip...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Start Trip & Post Accounting</span>
                    </>
                  )}
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
                <span>Add New Vehicle</span>
              </h3>
              <button type="button" onClick={() => setShowAddVehicleModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-semibold">Registration Number *</label>
                <input
                  type="text"
                  required
                  value={newVehReg}
                  onChange={(e) => setNewVehReg(e.target.value)}
                  placeholder="e.g. DHAKA-METRO-TA-12-3456"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Truck Type (খোলা / কাভার্ড) *</label>
                  <select
                    value={newVehBodyType}
                    onChange={(e) => setNewVehBodyType(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                  >
                    <option value="covered">Covered Van (কাভার্ড ভ্যান)</option>
                    <option value="open">Open Truck (খোলা ট্রাক)</option>
                    <option value="trailer">Trailer (ট্রেইলার)</option>
                    <option value="pickup">Pickup (পিকআপ)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Capacity (Ton / টন) *</label>
                  <input
                    type="number"
                    min={1}
                    value={newVehCapacityTons === 0 ? '' : newVehCapacityTons}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setNewVehCapacityTons(v === '' ? 0 : Number(v));
                    }}
                    placeholder="e.g. 15"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Engine Number</label>
                  <input
                    type="text"
                    value={newVehEngineNo}
                    onChange={(e) => setNewVehEngineNo(e.target.value)}
                    placeholder="e.g. ENG-883921"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Chassis Number</label>
                  <input
                    type="text"
                    value={newVehChassisNo}
                    onChange={(e) => setNewVehChassisNo(e.target.value)}
                    placeholder="e.g. CHS-772910"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Brand</label>
                  <input
                    type="text"
                    value={newVehBrand}
                    onChange={(e) => setNewVehBrand(e.target.value)}
                    placeholder="Hino / Isuzu"
                    className="w-full rounded-lg border px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Model</label>
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
                  <label className="block mb-1 font-semibold">Tax Token Expiry</label>
                  <input
                    type="date"
                    value={newVehTaxTokenExp}
                    onChange={(e) => setNewVehTaxTokenExp(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Fitness Expiry</label>
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
                  <label className="block mb-1 font-semibold">Insurance Expiry</label>
                  <input
                    type="date"
                    value={newVehInsuranceExp}
                    onChange={(e) => setNewVehInsuranceExp(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Route Permit</label>
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
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                  Register Truck
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
                <span>Log Fuel Consumption</span>
              </h3>
              <button type="button" onClick={() => setShowAddFuelModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFuel} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Truck *</label>
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
                  <label className="block mb-1 font-semibold">Date *</label>
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
                <label className="block mb-1 font-semibold">Fuel Pump *</label>
                <input
                  type="text"
                  required
                  value={fuelPump}
                  onChange={(e) => setFuelPump(e.target.value)}
                  placeholder="Meghna Petroleum, Savar"
                  className="w-full rounded-lg border px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Litres *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={fuelLitres === 0 ? '' : fuelLitres}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setFuelLitres(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded border px-2 py-1 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Rate *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={fuelRate === 0 ? '' : fuelRate}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setFuelRate(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Total Cost</label>
                  <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono font-black text-rose-600">
                    {formatBDT(calculatedFuelTotal)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Payment Account *</label>
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
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700">
                  Save Fuel
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
                <span>Log Maintenance & Service</span>
              </h3>
              <button type="button" onClick={() => setShowAddServiceModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Truck *</label>
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
                  <label className="block mb-1 font-semibold">Date *</label>
                  <input
                    type="date"
                    required
                    value={srvDate}
                    onChange={(e) => setSrvDate(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Garage / Workshop *</label>
                  <input
                    type="text"
                    required
                    value={srvGarage}
                    onChange={(e) => setSrvGarage(e.target.value)}
                    placeholder="Bhai Bhai Workshop & Garage"
                    className="w-full rounded-lg border px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Mechanic / Ustad</label>
                  <input
                    type="text"
                    value={srvMechanic}
                    onChange={(e) => setSrvMechanic(e.target.value)}
                    placeholder="Ustad Zahirul"
                    className="w-full rounded-lg border px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Problem & Work Description *</label>
                <input
                  type="text"
                  required
                  value={srvProblem}
                  onChange={(e) => setSrvProblem(e.target.value)}
                  placeholder="Brake shoe replacement & engine oil change"
                  className="w-full rounded-lg border px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold">Replaced Parts (বদলানো পার্টস)</label>
                <input
                  type="text"
                  value={srvParts}
                  onChange={(e) => setSrvParts(e.target.value)}
                  placeholder="e.g. 2 Front Tyres, Exide Battery, Brake Shoe"
                  className="w-full rounded-lg border px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Tyre / Battery Serial No. (সিরিয়াল নম্বর)</label>
                  <input
                    type="text"
                    value={srvTyreBatterySerial}
                    onChange={(e) => setSrvTyreBatterySerial(e.target.value)}
                    placeholder="e.g. TYR-BRIDGE-9921, BAT-HAMKO-881"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Warranty Expiry Date (ওয়ারেন্টি মেয়াদ)</label>
                  <input
                    type="date"
                    value={srvWarrantyExpiry}
                    onChange={(e) => setSrvWarrantyExpiry(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Parts Cost</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={srvPartsCost === 0 ? '' : srvPartsCost}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setSrvPartsCost(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Labour</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={srvLabourCost === 0 ? '' : srvLabourCost}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setSrvLabourCost(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Total Cost</label>
                  <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono font-black text-rose-600">
                    {formatBDT(calculatedServiceTotal)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Next Scheduled Service</label>
                  <input
                    type="date"
                    value={srvNextDate}
                    onChange={(e) => setSrvNextDate(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Next Service Odometer (KM)</label>
                  <input
                    type="number"
                    value={srvNextKm === 0 ? '' : srvNextKm}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setSrvNextKm(v === '' ? 0 : Number(v));
                    }}
                    placeholder="e.g. 50000"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Payment Account *</label>
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
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700">
                  Save Service
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
                <span>Pay Driver Salary / Advance</span>
              </h3>
              <button type="button" onClick={() => setShowAddDriverModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePayDriver} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-semibold">Driver Name *</label>
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
                  <label className="block mb-1 font-semibold">Payment Type</label>
                  <select
                    value={drvPayType}
                    onChange={(e) => setDrvPayType(e.target.value as any)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                  >
                    <option value="salary">Monthly Salary</option>
                    <option value="advance">Advance</option>
                    <option value="allowance">Trip Allowance</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Amount *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={drvPayAmount === 0 ? '' : drvPayAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setDrvPayAmount(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Payment Account *</label>
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
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700">
                  Confirm Payment
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
                Collect Customer Due
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
                  'Remaining Due: ' + formatBDT(targetTripForPayment.outstandingDue)
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Amount Received *</label>
                <input
                  type="number"
                  min={1}
                  max={targetTripForPayment.outstandingDue}
                  required
                  placeholder="0"
                  value={custPayAmount === 0 ? '' : custPayAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/^0+(?=\d)/, '');
                    setCustPayAmount(v === '' ? 0 : Number(v));
                  }}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-mono font-black text-sm text-emerald-600"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold">Deposit Into Account *</label>
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
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                  Confirm Collection
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
                {viewImageTrip.registrationNumber} — Receipt / Memo
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

      {/* ── MODAL 7.5: ADD / UPDATE RETURN FREIGHT LOAD ───────────── */}
      {showAddReturnLoadModal && targetTripForReturnLoad && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddReturnLoadModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Add / Update Return Freight Load (রিটার্ন ট্রিপ যোগ করুন)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Trip: {targetTripForReturnLoad.tripOrVehicleCode} · {targetTripForReturnLoad.registrationNumber} ({targetTripForReturnLoad.driverName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddReturnLoadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReturnLoad} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 space-y-1">
                <div className="text-[11px] font-bold text-sky-900 dark:text-sky-300">Outgoing Trip Info:</div>
                <div className="text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Route: {targetTripForReturnLoad.origin} ➔ {targetTripForReturnLoad.destination}</span>
                  <span className="font-semibold">Fare: {formatBDT(targetTripForReturnLoad.tripRevenue || 0)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">Return Loading Point (লোডিং পয়েন্ট) *</label>
                  <input
                    type="text"
                    required
                    value={retLoadPoint}
                    onChange={(e) => setRetLoadPoint(e.target.value)}
                    placeholder="e.g. Chittagong Port / Depot"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">Return Unload Point (আনলোডিং পয়েন্ট) *</label>
                  <input
                    type="text"
                    required
                    value={retUnloadPoint}
                    onChange={(e) => setRetUnloadPoint(e.target.value)}
                    placeholder="e.g. Dhaka Tejgaon"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-sky-700 dark:text-sky-400">Return Freight Fare (রিটার্ন ভাড়া - BDT) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="0"
                    value={retFare === 0 ? '' : retFare}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setRetFare(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-lg border border-sky-400 dark:border-sky-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">Driver Return Cash (ড্রাইভারের হাতে নগদ গ্রহণ - BDT)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={retDriverCash === 0 ? '' : retDriverCash}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setRetDriverCash(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Calculated summary */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500">New Total Freight: </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatBDT(
                      ((targetTripForReturnLoad.tripRevenue || 0) > (targetTripForReturnLoad.returnFare || 0)
                        ? (targetTripForReturnLoad.tripRevenue || 0) - (targetTripForReturnLoad.returnFare || 0)
                        : (targetTripForReturnLoad.tripRevenue || 0)) + Number(retFare || 0)
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Updated Due: </span>
                  <span className="font-bold text-amber-600">
                    {formatBDT(
                      Math.max(
                        0,
                        ((targetTripForReturnLoad.tripRevenue || 0) > (targetTripForReturnLoad.returnFare || 0)
                          ? (targetTripForReturnLoad.tripRevenue || 0) - (targetTripForReturnLoad.returnFare || 0)
                          : (targetTripForReturnLoad.tripRevenue || 0)) +
                          Number(retFare || 0) -
                          (Number(targetTripForReturnLoad.advanceReceived || 0) + Number(retDriverCash || 0))
                      )
                    )}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddReturnLoadModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Return Load'}
                </button>
              </div>
            </form>
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
          businessPhone={activeBusiness.contactPhone}
          allTrips={allTrips}
          lang={lang}
        />
      )}

      {/* ── MODAL 9: TODAY'S INCOME BREAKDOWN (CLICKABLE CARD DETAIL) ── */}
      {showTodayIncomeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowTodayIncomeModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Today&apos;s Income & Freight Collections (আজকের আয়ের হিসাব)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Date: {todayStr} · Live recorded freight fares and client receipts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTodayIncomeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">Total Income Today</div>
                <div className="text-lg font-black font-mono text-emerald-600 mt-0.5">
                  +{formatBDT(todayIncomeData.total)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 font-semibold">Transactions Logged</div>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {todayIncomeData.items.length} entries
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
                <div className="text-[11px] text-slate-500 font-semibold">Pending Due from Today</div>
                <div className="text-lg font-black font-mono text-amber-600 mt-0.5">
                  {formatBDT(todayIncomeData.items.reduce((s, i) => s + (i.dueAmount || 0), 0))}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-700 dark:text-slate-300">
                Income Entries List ({todayIncomeData.items.length})
              </div>
              {todayIncomeData.items.length === 0 ? (
                <div className="p-6 text-center space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500">No new income or freight collection recorded for today yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTodayIncomeModal(false);
                      handleOpenAddTripModal();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Dispatch New Trip Today</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b">
                      <tr>
                        <th className="py-2 px-3">Voucher / Code</th>
                        <th className="py-2 px-3">Party & Description</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Amount (BDT)</th>
                        <th className="py-2 px-3 text-right">Due (BDT)</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {todayIncomeData.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            {item.code}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.party}</div>
                            <div className="text-[10px] text-slate-500">{item.subtitle} • {item.vehicle}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatBDT(item.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {item.dueAmount > 0 ? (
                              <span className="text-amber-600 font-bold">{formatBDT(item.dueAmount)}</span>
                            ) : (
                              'Paid'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.trip ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowTodayIncomeModal(false);
                                  setSelectedTripChallan(item.trip!);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold shadow-2xs cursor-pointer"
                                title="View Consignment Challan & Income Slip"
                              >
                                <FileText className="h-3 w-3" />
                                <span>Challan Slip</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">Collection</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowTodayIncomeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 10: TODAY'S EXPENSES BREAKDOWN (CLICKABLE CARD DETAIL) ── */}
      {showTodayExpenseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowTodayExpenseModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Today&apos;s Expenses Breakdown (আজকের খরচের খাতওয়ারি হিসাব)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Date: {todayStr} · Sector-wise breakdown: Diesel, Tolls, Khoraki, Workshop & Labor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTodayExpenseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sector KPI Badges */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Expense By Sector:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                  <div className="text-[10px] text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                    <Fuel className="h-3 w-3" /> Diesel Fuel
                  </div>
                  <div className="text-sm font-black font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.diesel)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Toll & Ferry</div>
                  <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.toll)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Driver Khoraki</div>
                  <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.khoraki)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Police & Road</div>
                  <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.road)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                  <div className="text-[10px] text-rose-800 dark:text-rose-300 font-bold flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Workshop / Repair
                  </div>
                  <div className="text-sm font-black font-mono text-rose-700 dark:text-rose-400 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.maintenance)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Labour & Loading</div>
                  <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.labour)}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Strip */}
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs">
              <span className="font-bold text-rose-900 dark:text-rose-200">Total Operating Expenses Logged Today:</span>
              <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                -{formatBDT(todayExpenseData.total)}
              </span>
            </div>

            {/* Items Table */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-700 dark:text-slate-300">
                Detailed Expense Vouchers ({todayExpenseData.items.length})
              </div>
              {todayExpenseData.items.length === 0 ? (
                <div className="p-6 text-center space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500">No expenses recorded yet for today.</p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTodayExpenseModal(false);
                        setShowAddFuelModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs"
                    >
                      + Log Fuel Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTodayExpenseModal(false);
                        setShowAddServiceModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs"
                    >
                      + Workshop Expense
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b">
                      <tr>
                        <th className="py-2 px-3">Voucher No</th>
                        <th className="py-2 px-3">Expense Head</th>
                        <th className="py-2 px-3">Vehicle & Details</th>
                        <th className="py-2 px-3 text-right">Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {todayExpenseData.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            {item.code}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[10px]">
                              {item.categoryLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.vehicle || item.title}</div>
                            <div className="text-[10px] text-slate-500">{item.subtitle}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            -{formatBDT(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowTodayExpenseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 11: TRUCKS UNDER MAINTENANCE & WORKSHOP (RED CARD DETAIL) ── */}
      {showMaintenanceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowMaintenanceModal(false)}
        >
          <div
            className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border-2 border-rose-400 dark:border-rose-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-rose-200 dark:border-rose-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
                  <Wrench className="h-6 w-6 text-rose-600 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                      Vehicles In Workshop & Maintenance Details (মেরামতাধীন গাড়ির রিপোর্ট)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                      {dashboardKpis.maintenanceCount} in workshop
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Workshop locations, mechanic contacts, problems, replacement parts and warranties
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List of Vehicles under repair */}
            <div className="space-y-4">
              {activeMaintenanceList.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="p-4 rounded-2xl border-2 border-rose-200 dark:border-rose-900/70 bg-rose-50/40 dark:bg-rose-950/20 space-y-3.5 shadow-2xs"
                >
                  {/* Vehicle Headline */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 dark:border-rose-900/40 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-rose-600" />
                      <div>
                        <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          {m.truckReg}
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold">{m.truckName}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      {m.status}
                    </span>
                  </div>

                  {/* 2-Column Details Requested by User */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Box 1: Garage & Shop Info */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1">
                        <Building2 className="h-3.5 w-3.5 text-rose-600" />
                        <span>Workshop & Garage (কোথায় ঠিক করতে দিয়েছে)</span>
                      </div>
                      <div className="space-y-1 text-slate-700 dark:text-slate-300">
                        <div>
                          <span className="text-[10px] text-slate-400 block">গ্যারেজ / দোকানের নাম:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{m.garageName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">ঠিকানা / লোকেশন:</span>
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="h-3 w-3 text-slate-400" /> {m.garageAddress}
                          </span>
                        </div>
                        <div className="pt-1 border-t">
                          <span className="text-[10px] text-slate-400 block">দায়িত্বরত মেকানিক:</span>
                          <span className="font-bold">{m.mechanicName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">মেকানিকের মোবাইল নম্বর:</span>
                          <a
                            href={`tel:${m.mechanicPhone}`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-emerald-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" /> {m.mechanicPhone}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Box 2: Problem & Replacement Parts */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1">
                        <Wrench className="h-3.5 w-3.5 text-amber-600" />
                        <span>Problem & Parts Changed (কী সমস্যা ও কী পার্টস বদলানো হচ্ছে)</span>
                      </div>
                      <div className="space-y-1 text-slate-700 dark:text-slate-300">
                        <div>
                          <span className="text-[10px] text-slate-400 block">গাড়ির সমস্যা (কেন আটকে আছে):</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {m.problemDescription}
                          </span>
                        </div>
                        <div className="pt-1 border-t">
                          <span className="text-[10px] text-slate-400 block">বদলি / নতুন পার্টসের বিবরণ:</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            {m.partsReplaced}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">টায়ার / ব্যাটারি সিরিয়াল নম্বর:</span>
                          <span className="font-mono font-bold">{m.tyreOrBatterySerial || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">ওয়ারেন্টির মেয়াদ:</span>
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <ShieldCheck className="h-3 w-3" /> {m.warranty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financials Strip */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 block">পার্টস খরচ:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatBDT(m.partsCost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">মেকানিক মজুরি / লেবার:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatBDT(m.labourCost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">মোট মেরামত ব্যয়:</span>
                        <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                          {formatBDT(m.totalCost)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      Service Date: {m.date}
                    </div>
                  </div>
                </div>
              ))}

              {activeMaintenanceList.length === 0 && (
                <div className="p-8 text-center space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    All Fleet Trucks Operational (কোনো গাড়ি বর্তমানে গ্যারেজে আটকে নেই)
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    বহরের সব ট্রাক ফিট ও সচল অবস্থায় রয়েছে। গাড়ি মেরামতের জন্য পাঠাতে নিচের বাটনে ক্লিক করুন।
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowMaintenanceModal(false);
                  setShowAddServiceModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Send Another Truck to Workshop</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 12: MONTHLY REVENUE REPORT DETAIL ─────────────────── */}
      {showMonthlyRevenueModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowMonthlyRevenueModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Monthly Gross Revenue Breakdown (চলতি মাসের মোট পরিবহন আয়)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Period: {selectedMonth !== 'ALL' ? MONTH_NAMES.find((m) => m.code === selectedMonth)?.nameEn : 'All Months'} {selectedYear}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowMonthlyRevenueModal(false)} className="text-slate-400 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900 dark:text-emerald-200">Total Monthly Gross Revenue:</span>
              <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                +{formatBDT(dashboardKpis.monthlyRevenue)}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 font-bold border-b">
                  <tr>
                    <th className="py-2 px-3">Trip / Ref</th>
                    <th className="py-2 px-3">Party & Route</th>
                    <th className="py-2 px-3">Vehicle</th>
                    <th className="py-2 px-3 text-right">Fare (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allTrips
                    .filter((t) => selectedMonth === 'ALL' || (t.date && t.date.startsWith(`${selectedYear}-${selectedMonth}`)))
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono font-bold">{t.tripOrVehicleCode}</td>
                        <td className="py-2 px-3">
                          <div className="font-semibold">{t.customerName}</div>
                          <div className="text-[10px] text-slate-400">{t.origin} ➔ {t.destination}</div>
                        </td>
                        <td className="py-2 px-3 font-bold text-emerald-700">{t.registrationNumber}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatBDT(t.tripRevenue)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowMonthlyRevenueModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 13: MONTHLY EXPENSES REPORT DETAIL ────────────────── */}
      {showMonthlyExpenseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowMonthlyExpenseModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-rose-600" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Monthly Operating Expenses (চলতি মাসের মোট পরিচালন ব্যয়)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Period: {selectedMonth !== 'ALL' ? MONTH_NAMES.find((m) => m.code === selectedMonth)?.nameEn : 'All Months'} {selectedYear}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowMonthlyExpenseModal(false)} className="text-slate-400 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs">
              <span className="font-bold text-rose-900 dark:text-rose-200">Total Monthly Expenses:</span>
              <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                -{formatBDT(dashboardKpis.monthlyExpenses)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border space-y-2 text-xs">
              <div className="font-bold">Expense Heads Included:</div>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Diesel Fuel & Refueling Invoices</li>
                <li>Bridge Tolls, Ferry Charges & Highway Taxes</li>
                <li>Driver & Helper Trip Khoraki Allowances</li>
                <li>Workshop Repairs, Spare Parts & Battery Replacements</li>
                <li>Traffic & Road Allowances</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowMonthlyExpenseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
