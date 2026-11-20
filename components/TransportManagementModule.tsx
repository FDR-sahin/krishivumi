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
  ownerId: string;
  actorEmail: string;
  onNotify: (msg: string) => void;
  lang?: 'en' | 'bn';
}

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

  // 1. States & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'completed' | 'maintenance'>('ALL');
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [selectedTripChallan, setSelectedTripChallan] = useState<ErpTransportOp | null>(null);
  const [viewImageTrip, setViewImageTrip] = useState<ErpTransportOp | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Add / Edit Trip Form State
  const [tDate, setTDate] = useState(new Date().toISOString().split('T')[0]);
  const [tVehicleReg, setTVehicleReg] = useState('ঢাকা মেট্রো-ট-১২-৩৪৫৬');
  const [tVehicleCode, setTVehicleCode] = useState(`TRK-${Date.now().toString().slice(-4)}`);
  const [tRoute, setTRoute] = useState('ঢাকা ➔ চট্টগ্রাম');
  const [tOrigin, setTOrigin] = useState('ঢাকা');
  const [tDestination, setTDestination] = useState('চট্টগ্রাম');
  const [tDriverName, setTDriverName] = useState('আব্দুল করিম');
  const [tDriverMonthlySalary, setTDriverMonthlySalary] = useState<number>(22000);
  const [tFare, setTFare] = useState<number>(25000);
  const [tCommission, setTCommission] = useState<number>(1000);
  const [tDieselCost, setTDieselCost] = useState<number>(7500);
  const [tTollCost, setTTollCost] = useState<number>(1000);
  const [tOtherCost, setTOtherCost] = useState<number>(500);
  const [tCargo, setTCargo] = useState('ফার্ম ফিড ও ব্রয়লার মুরগি পরিবহন');
  const [tCustomer, setTCustomer] = useState('চট্টগ্রাম আগ্রাবাদ পাইকারি আড়ত');
  const [tStatus, setTStatus] = useState<'active' | 'completed' | 'maintenance'>('active');
  const [tImageUrl, setTImageUrl] = useState<string>('');

  // Total expense & Net profit for the form
  const formTripExpense = Number(tDieselCost || 0) + Number(tTollCost || 0) + Number(tOtherCost || 0);
  const formNetIncome = Number(tFare || 0) - (formTripExpense + Number(tCommission || 0));

  // 3. Filtered Operations
  const filteredOps = useMemo(() => {
    return ops.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const routeStr = o.route || `${o.origin} ➔ ${o.destination}`;
        return (
          o.tripOrVehicleCode.toLowerCase().includes(q) ||
          o.registrationNumber.toLowerCase().includes(q) ||
          o.driverName.toLowerCase().includes(q) ||
          routeStr.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ops, statusFilter, searchQuery]);

  // 4. Running Vehicles Telemetry (কতটি গাড়ি রানিং আছে ও কোন রুটে চলছে)
  const runningVehicles = useMemo(() => {
    return ops.filter((o) => o.status === 'active');
  }, [ops]);

  const completedCount = useMemo(() => {
    return ops.filter((o) => o.status === 'completed').length;
  }, [ops]);

  const maintenanceCount = useMemo(() => {
    return ops.filter((o) => o.status === 'maintenance').length;
  }, [ops]);

  // Overall Financials for Filtered Ops
  const totals = useMemo(() => {
    const totalFare = filteredOps.reduce((sum, o) => sum + Number(o.tripRevenue || 0), 0);
    const totalExpenses = filteredOps.reduce((sum, o) => {
      const exp =
        o.tripExpense !== undefined
          ? o.tripExpense
          : Number(o.fuelCost || 0) + Number(o.tollCost || 0) + Number(o.maintenanceCost || 0);
      const comm = Number(o.commission || 0);
      return sum + exp + comm;
    }, 0);
    const totalNetProfit = totalFare - totalExpenses;
    return { totalFare, totalExpenses, totalNetProfit };
  }, [filteredOps]);

  // 5. Image File Upload Handler (Data URL)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        triggerGlobalToast(bn ? 'ছবির সাইজ সর্বোচ্চ ২ মেগাবাইট হতে হবে' : 'Image size must be under 2MB', 'info');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setTImageUrl(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 6. Submit New Trip Handler
  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tVehicleReg.trim()) {
      triggerGlobalToast(bn ? 'গাড়ির নাম্বার লিখুন' : 'Enter vehicle registration number', 'info');
      return;
    }
    if (tFare <= 0) {
      triggerGlobalToast(bn ? 'ট্রিপের ভাড়া দিন' : 'Enter trip fare', 'info');
      return;
    }

    setIsSubmitting(true);
    try {
      const [orig, dest] = tRoute.includes('➔')
        ? tRoute.split('➔').map((s) => s.trim())
        : tRoute.includes('-')
        ? tRoute.split('-').map((s) => s.trim())
        : [tOrigin || 'ঢাকা', tDestination || 'গন্তব্য'];

      const totalExp = Number(tDieselCost || 0) + Number(tTollCost || 0) + Number(tOtherCost || 0);
      const computedNet = Number(tFare) - (totalExp + Number(tCommission || 0));

      await createTransportOpRecord(
        {
          tripOrVehicleCode: tVehicleCode.trim() || `TRK-${Date.now().toString().slice(-4)}`,
          recordType: 'trip',
          businessId: activeBusiness.id,
          registrationNumber: tVehicleReg.trim(),
          vehicleType: 'Heavy Transport Truck',
          driverName: tDriverName.trim(),
          origin: orig || tOrigin,
          destination: dest || tDestination,
          route: tRoute.trim(),
          cargoDetails: tCargo.trim(),
          customerName: tCustomer.trim(),
          distanceKm: 250,
          fuelCost: Number(tDieselCost || 0),
          tollCost: Number(tTollCost || 0),
          driverAllowance: 0,
          driverMonthlySalary: Number(tDriverMonthlySalary || 0),
          commission: Number(tCommission || 0),
          tripExpense: totalExp,
          maintenanceCost: Number(tOtherCost || 0),
          maintenanceDetails: `তেল: ৳${tDieselCost} | টোল: ৳${tTollCost} | রোড খরচ: ৳${tOtherCost} | কমিশন: ৳${tCommission}`,
          tripRevenue: Number(tFare || 0),
          outstandingDue: 0,
          netIncome: computedNet,
          insuranceExpiry: '2027-12-31',
          fitnessExpiry: '2027-12-31',
          taxTokenExpiry: '2027-12-31',
          nextServiceDate: '2027-06-30',
          date: tDate,
          status: tStatus,
          imageUrl: tImageUrl,
        },
        ownerId,
        actorEmail
      );

      // Automatic Double-Entry Bookkeeping:
      const cashOrBank = accounts.find((a) => a.subType === 'cash' || a.subType === 'bank') || accounts[0];
      const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];

      // 1. Post Freight Revenue
      if (cashOrBank && revAcc && Number(tFare) > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `TRP-REV-${tVehicleCode}-${Date.now().toString().slice(-4)}`,
            date: tDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'sale',
            category: `ট্রাক ভাড়া আয় (${tVehicleReg})`,
            description: `${tVehicleReg}: ${tRoute} | চালক: ${tDriverName} | ভাড়া: ৳${tFare}`,
            debitAccountId: cashOrBank.id,
            debitAccountName: cashOrBank.name,
            creditAccountId: revAcc.id,
            creditAccountName: revAcc.name,
            amount: Number(tFare),
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: tCustomer || tDriverName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      // 2. Post Trip Expenses (Fuel + Toll + Commission + Other)
      const totalOutflow = totalExp + Number(tCommission || 0);
      if (cashOrBank && expAcc && totalOutflow > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `TRP-EXP-${tVehicleCode}-${Date.now().toString().slice(-4)}`,
            date: tDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'expense',
            category: `ট্রিপ খরচ ও কমিশন (${tVehicleReg})`,
            description: `${tVehicleReg}: ডিজেল ৳${tDieselCost}, টোল ৳${tTollCost}, রোড খরচ ৳${tOtherCost}, কমিশন ৳${tCommission}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: cashOrBank.id,
            creditAccountName: cashOrBank.name,
            amount: totalOutflow,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: tDriverName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      setShowAddTripModal(false);
      triggerGlobalToast(
        bn
          ? `ট্রিপ সংরক্ষণ সম্পন্ন! গাড়ি: ${tVehicleReg}, নিট আয়: ${formatBDT(computedNet)}`
          : `Trip recorded! Net Income: ${formatBDT(computedNet)}`,
        'success'
      );
      onNotify(bn ? `ট্রিপ যুক্ত হয়েছে!` : 'Trip logged!');
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error saving trip', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 1. COMPACT RUNNING FLEET MONITOR & STATUS BAR ───────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Header & Running Count */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {bn ? 'ট্রাক ও পরিবহন ব্যবসা (Fleet & Trip Operations)' : 'Fleet & Transport Business'}
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {runningVehicles.length} {bn ? 'টি গাড়ি রানিং' : 'Running'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {bn ? `মোট গাড়ি: ${ops.length}টি | সম্পন্ন: ${completedCount}টি | গ্যারেজে: ${maintenanceCount}টি` : `Total: ${ops.length} | Completed: ${completedCount} | Idle: ${maintenanceCount}`}
              </p>
            </div>
          </div>

          {/* Quick Add Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTVehicleCode(`TRK-${Date.now().toString().slice(-4)}`);
                setTImageUrl('');
                setShowAddTripModal(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{bn ? '+ নতুন ট্রিপ / গাড়ি যোগ' : '+ Add Trip'}</span>
            </button>
          </div>
        </div>

        {/* Running Vehicles Route Strip (কোন রুটে গাড়ি চলছে) */}
        {runningVehicles.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Navigation className="h-3 w-3 text-emerald-600" />
              <span>{bn ? 'বর্তমানে রাস্তায় সচল গাড়ি ও রুট (Active Routes):' : 'Currently On-Road & Active Routes:'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {runningVehicles.map((v) => {
                const currentRoute = v.route || `${v.origin} ➔ ${v.destination}`;
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
                          {v.registrationNumber}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                          {bn ? 'রানিং' : 'Running'}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 truncate mt-0.5">
                        {currentRoute}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {bn ? 'চালক: ' : 'Driver: '}{v.driverName}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400">{bn ? 'ভাড়া' : 'Fare'}</div>
                      <div className="font-mono font-bold text-emerald-600">
                        {formatBDT(v.tripRevenue)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. COMPACT STATS & SEARCH / FILTER TOOLBAR ─────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          {/* Quick Financial Summary Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{bn ? 'মোট ভাড়া: ' : 'Total Fare: '}</span>
              <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
                {formatBDT(totals.totalFare)}
              </span>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{bn ? 'মোট খরচ ও কমিশন: ' : 'Cost & Comm: '}</span>
              <span className="font-mono font-extrabold text-rose-700 dark:text-rose-300">
                {formatBDT(totals.totalExpenses)}
              </span>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{bn ? 'নিট আয় (লাভ): ' : 'Net Profit: '}</span>
              <span className="font-mono font-extrabold text-sky-700 dark:text-sky-300">
                {formatBDT(totals.totalNetProfit)}
              </span>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold"
            >
              <option value="ALL">{bn ? 'সকল স্টেটাস' : 'All Status'}</option>
              <option value="active">{bn ? 'রানিং (Active)' : 'Running'}</option>
              <option value="completed">{bn ? 'সম্পন্ন (Completed)' : 'Completed'}</option>
              <option value="maintenance">{bn ? 'গ্যারেজে (Maintenance)' : 'Maintenance'}</option>
            </select>

            <div className="relative min-w-[180px]">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={bn ? 'গাড়ি, রুট বা চালক...' : 'Reg, route, driver...'}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. COMPACT SCROLLABLE TRIPS TABLE ───────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-[48vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-2 px-3">{bn ? 'তারিখ ও কোড' : 'Date & Code'}</th>
                <th className="py-2 px-3">{bn ? 'গাড়ির নাম্বার ও স্টেটাস' : 'Vehicle Reg & Status'}</th>
                <th className="py-2 px-3">{bn ? 'রুট (Route)' : 'Route'}</th>
                <th className="py-2 px-3">{bn ? 'ড্রাইভার ও বেতন' : 'Driver & Salary'}</th>
                <th className="py-2 px-3 text-right">{bn ? 'ভাড়া (Bara)' : 'Trip Fare'}</th>
                <th className="py-2 px-3 text-right">{bn ? 'খরচ ও কমিশন' : 'Cost & Comm'}</th>
                <th className="py-2 px-3 text-right">{bn ? 'নিট আয় (Profit)' : 'Net Profit'}</th>
                <th className="py-2 px-3 text-center">{bn ? 'ছবি' : 'Image'}</th>
                <th className="py-2 px-3 text-center">{bn ? 'অ্যাকশন' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOps.map((op) => {
                const totalCost =
                  op.tripExpense !== undefined
                    ? op.tripExpense
                    : Number(op.fuelCost || 0) + Number(op.tollCost || 0) + Number(op.maintenanceCost || 0);
                const comm = Number(op.commission || 0);
                const net = op.netIncome !== undefined ? op.netIncome : Number(op.tripRevenue || 0) - (totalCost + comm);
                const routeName = op.route || `${op.origin} ➔ ${op.destination}`;

                return (
                  <tr key={op.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{op.date}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{op.tripOrVehicleCode}</div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{op.registrationNumber}</div>
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          op.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : op.status === 'completed'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {op.status === 'active'
                          ? bn
                            ? '● রানিং'
                            : '● Running'
                          : op.status === 'completed'
                          ? bn
                            ? 'সম্পন্ন'
                            : 'Completed'
                          : bn
                          ? 'গ্যারেজে'
                          : 'Maintenance'}
                      </span>
                    </td>
                    <td className="py-2 px-3 max-w-[180px] truncate">
                      <div className="font-semibold text-emerald-700 dark:text-emerald-300 truncate">{routeName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{op.cargoDetails || op.customerName}</div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{op.driverName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {bn ? 'মাসিক বেতন: ' : 'Salary: '}
                        {op.driverMonthlySalary ? formatBDT(op.driverMonthlySalary) : '—'}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                      {formatBDT(op.tripRevenue)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <div>{formatBDT(totalCost)}</div>
                      {comm > 0 && (
                        <div className="text-[10px] text-amber-600">
                          {bn ? 'কমিশন: ' : 'Comm: '}
                          {formatBDT(comm)}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black whitespace-nowrap">
                      <span className={net >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600'}>
                        {formatBDT(net)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {op.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewImageTrip(op)}
                          className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-emerald-600 hover:bg-slate-200 cursor-pointer"
                          title="View Memo / Challan Image"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedTripChallan(op)}
                          className="p-1 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title={bn ? 'চালান ভিউ ও প্রিন্ট' : 'View Challan'}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerConfirmDelete({
                              title: bn ? 'ট্রিপ ডিলিট নিশ্চিতকরণ' : 'Confirm Delete',
                              message: bn
                                ? `আপনি কি নিশ্চিতভাবে এই ট্রিপটি (${op.registrationNumber} - ${routeName}) মুছতে চান?`
                                : `Delete trip ${op.registrationNumber}?`,
                              itemName: `${op.registrationNumber} (${formatBDT(op.tripRevenue)})`,
                              onConfirm: async () => {
                                await deleteTransportOp(op.id);
                                triggerGlobalToast(bn ? 'ট্রিপ মোছা হয়েছে!' : 'Trip deleted!', 'delete');
                                onNotify('Deleted');
                              },
                            });
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOps.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    {bn ? 'কোনো ট্রিপ বা গাড়ি পাওয়া যায়নি।' : 'No transport trips found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. MODAL: + NEW TRIP ENTRY (COMPACT & SIMPLE) ──────────── */}
      {showAddTripModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddTripModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {bn ? 'নতুন ট্রিপ ও ভাড়ার হিসাব এন্ট্রি' : 'Log New Transport Trip'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTripModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTrip} className="space-y-3 text-xs">
              {/* Row 1: Date & Vehicle Reg */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'তারিখ (Date) *' : 'Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={tDate}
                    onChange={(e) => setTDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'গাড়ির নাম্বার (Vehicle Reg) *' : 'Vehicle Reg *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={tVehicleReg}
                    onChange={(e) => setTVehicleReg(e.target.value)}
                    placeholder="ঢাকা মেট্রো-ট-১২-৩৪৫৬"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-bold"
                  />
                </div>
              </div>

              {/* Row 2: Route & Driver */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'রুট (Route - কোথা থেকে কোথায়) *' : 'Route *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={tRoute}
                    onChange={(e) => setTRoute(e.target.value)}
                    placeholder="যেমন: ঢাকা ➔ খুলনা"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-semibold text-emerald-700 dark:text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'ড্রাইভারের নাম *' : 'Driver Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={tDriverName}
                    onChange={(e) => setTDriverName(e.target.value)}
                    placeholder="আব্দুল করিম"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5"
                  />
                </div>
              </div>

              {/* Row 3: Fare & Monthly Salary */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-bold text-emerald-700 dark:text-emerald-400">
                    {bn ? 'ভাড়া / ট্রিপের আয় (Fare / Revenue) *' : 'Trip Fare (Revenue) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={tFare === 0 ? '' : tFare}
                    onChange={(e) => setTFare(Number(e.target.value) || 0)}
                    placeholder="25000"
                    className="w-full rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono font-black text-sm text-emerald-700 dark:text-emerald-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'ড্রাইভারের মাসিক বেতন (Monthly Salary)' : 'Driver Monthly Salary'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tDriverMonthlySalary === 0 ? '' : tDriverMonthlySalary}
                    onChange={(e) => setTDriverMonthlySalary(Number(e.target.value) || 0)}
                    placeholder="22000"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Row 4: Expenses & Commission */}
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{bn ? 'ট্রিপের খরচ ও কমিশন (Trip Expenses & Commission):' : 'Expenses & Commission:'}</span>
                  <span className="font-mono text-rose-600">{formatBDT(formTripExpense + Number(tCommission || 0))}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'ডিজেল / তেল' : 'Diesel'}</label>
                    <input
                      type="number"
                      min={0}
                      value={tDieselCost === 0 ? '' : tDieselCost}
                      onChange={(e) => setTDieselCost(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'টোল ও রোড' : 'Toll'}</label>
                    <input
                      type="number"
                      min={0}
                      value={tTollCost === 0 ? '' : tTollCost}
                      onChange={(e) => setTTollCost(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">{bn ? 'কমিশন (Broker)' : 'Commission'}</label>
                    <input
                      type="number"
                      min={0}
                      value={tCommission === 0 ? '' : tCommission}
                      onChange={(e) => setTCommission(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 font-mono text-amber-600"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Status & Image Option */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'গাড়ির স্টেটাস (Status)' : 'Status'}
                  </label>
                  <select
                    value={tStatus}
                    onChange={(e) => setTStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-bold"
                  >
                    <option value="active">{bn ? '● রানিং (On Road / Active)' : '● Running / Active'}</option>
                    <option value="completed">{bn ? 'সম্পন্ন (Completed)' : 'Completed'}</option>
                    <option value="maintenance">{bn ? 'গ্যারেজে / সার্ভিসিং (Maintenance)' : 'Maintenance'}</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{bn ? 'মেমো / রসিদ ছবি (Image)' : 'Receipt / Memo Image'}</span>
                    {tImageUrl && (
                      <span className="text-[10px] text-emerald-600 font-bold">{bn ? '✓ ছবি যুক্ত' : '✓ Uploaded'}</span>
                    )}
                  </label>
                  <label className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 cursor-pointer">
                    <Upload className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      {tImageUrl ? (bn ? 'ছবি পরিবর্তন' : 'Change Image') : (bn ? 'ছবি আপলোড করুন' : 'Upload Image')}
                    </span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Dynamic Net Income Calculation Box */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-400">{bn ? 'ভাড়া: ' : 'Fare: '}</span>
                  <span className="font-bold text-emerald-600">{formatBDT(tFare)}</span>
                  <span className="text-slate-400"> - </span>
                  <span className="text-slate-400">{bn ? 'খরচ: ' : 'Cost: '}</span>
                  <span className="font-bold text-rose-600">{formatBDT(formTripExpense + Number(tCommission || 0))}</span>
                </div>
                <div className="font-black text-sm">
                  <span className="text-slate-500 text-xs font-normal">{bn ? 'নিট আয় = ' : 'Net Profit = '}</span>
                  <span className={formNetIncome >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600'}>
                    {formatBDT(formNetIncome)}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTripModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? (bn ? 'সেভ হচ্ছে...' : 'Saving...') : bn ? 'ট্রিপ সেভ করুন' : 'Save Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. MODAL: IMAGE PREVIEW (MEMO / CHALLAN PHOTO) ────────── */}
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
                {viewImageTrip.registrationNumber} — {bn ? 'মেমো / রসিদের ছবি' : 'Memo / Receipt Photo'}
              </div>
              <button
                type="button"
                onClick={() => setViewImageTrip(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {viewImageTrip.imageUrl ? (
              <img
                src={viewImageTrip.imageUrl}
                alt="Trip receipt"
                className="w-full max-h-[60vh] object-contain rounded-lg border border-slate-200 dark:border-slate-800"
              />
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">{bn ? 'কোনো ছবি নেই' : 'No image'}</div>
            )}
          </div>
        </div>
      )}

      {/* ── 6. CHALLAN & WORK ORDER MODAL ─────────────────────────── */}
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
