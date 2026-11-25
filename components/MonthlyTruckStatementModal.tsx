'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  X,
  Calendar,
  Truck,
  TrendingUp,
  DollarSign,
  Fuel,
  Wrench,
  Navigation,
  FileText,
  Building2,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { ErpTransportOp } from '@/lib/erp-types';

interface MonthlyTruckStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  truck: ErpTransportOp | null;
  allVehicles?: ErpTransportOp[];
  onSelectTruck?: (truck: ErpTransportOp) => void;
  allTrips: ErpTransportOp[];
  allFuelLogs?: ErpTransportOp[];
  allMaintLogs?: ErpTransportOp[];
  initialMonth?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  lang?: 'en' | 'bn';
}

function numberToWords(amount: number): string {
  if (amount === 0) return 'ZERO TAKA ONLY';
  const units = [
    '',
    'ONE',
    'TWO',
    'THREE',
    'FOUR',
    'FIVE',
    'SIX',
    'SEVEN',
    'EIGHT',
    'NINE',
    'TEN',
    'ELEVEN',
    'TWELVE',
    'THIRTEEN',
    'FOURTEEN',
    'FIFTEEN',
    'SIXTEEN',
    'SEVENTEEN',
    'EIGHTEEN',
    'NINETEEN',
  ];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  function convert(n: number): string {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    if (n < 1000) return units[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 !== 0 ? ' AND ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' THOUSAND' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' LAKH' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' CRORE' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  }
  return convert(Math.abs(Math.round(amount))) + ' TAKA ONLY';
}

const normalizeReg = (str: string | undefined | null) =>
  (str || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const formatBDT = (amount: number | string | undefined | null) => {
  const num = Number(amount || 0);
  return `৳ ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export default function MonthlyTruckStatementModal({
  isOpen,
  onClose,
  truck,
  allVehicles = [],
  onSelectTruck,
  allTrips = [],
  allFuelLogs = [],
  allMaintLogs = [],
  initialMonth = 'ALL',
  businessName = 'REGARDSAGRO ENTERPRISE',
  businessAddress = 'JL Manson 2nd Floor, 7/1 BRDC Road, Tejgaon, Dhaka-1208, Bangladesh',
  businessPhone = '01719714211, 017787779, 01707300599',
  businessEmail = 'regardsagro747@gmail.com',
}: MonthlyTruckStatementModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || 'ALL');
  const printRef = useRef<HTMLDivElement>(null);

  // Normalize current truck reg
  const truckReg = truck?.registrationNumber || '';
  const normTruckReg = normalizeReg(truckReg);

  // Filter trips belonging to this truck
  const truckAllTrips = useMemo(() => {
    if (!normTruckReg) return [];
    return allTrips.filter((t) => {
      const matchVehicle = normalizeReg(t.registrationNumber) === normTruckReg;
      const isTrip = t.recordType === 'trip' || (!t.recordType && (t.loadingLocation || t.origin || t.destination));
      return matchVehicle && isTrip;
    });
  }, [allTrips, normTruckReg]);

  // Available months discovered from this truck's trips
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of truckAllTrips) {
      if (t.date) {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          const mKey = d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
          set.add(mKey);
        }
      }
    }
    // Also include fuel logs and maintenance logs dates
    for (const f of allFuelLogs) {
      if (normalizeReg(f.registrationNumber) === normTruckReg && f.date) {
        const d = new Date(f.date);
        if (!isNaN(d.getTime())) {
          set.add(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase());
        }
      }
    }
    for (const m of allMaintLogs) {
      if (normalizeReg(m.registrationNumber) === normTruckReg && m.date) {
        const d = new Date(m.date);
        if (!isNaN(d.getTime())) {
          set.add(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase());
        }
      }
    }

    const arr = Array.from(set);
    if (arr.length === 0) {
      const now = new Date();
      arr.push(now.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase());
    }
    return arr;
  }, [truckAllTrips, allFuelLogs, allMaintLogs, normTruckReg]);

  // Filtered trips for selected month
  const filteredTrips = useMemo(() => {
    if (selectedMonth === 'ALL') return truckAllTrips;
    return truckAllTrips.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;
      const mKey = d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
      return mKey === selectedMonth;
    });
  }, [truckAllTrips, selectedMonth]);

  // Filtered fuel logs for this truck & month
  const filteredFuelLogs = useMemo(() => {
    return allFuelLogs.filter((f) => {
      if (normalizeReg(f.registrationNumber) !== normTruckReg) return false;
      if (selectedMonth === 'ALL') return true;
      if (!f.date) return false;
      const d = new Date(f.date);
      if (isNaN(d.getTime())) return false;
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase() === selectedMonth;
    });
  }, [allFuelLogs, normTruckReg, selectedMonth]);

  // Filtered maintenance logs for this truck & month
  const filteredMaintLogs = useMemo(() => {
    return allMaintLogs.filter((m) => {
      if (normalizeReg(m.registrationNumber) !== normTruckReg) return false;
      if (selectedMonth === 'ALL') return true;
      if (!m.date) return false;
      const d = new Date(m.date);
      if (isNaN(d.getTime())) return false;
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase() === selectedMonth;
    });
  }, [allMaintLogs, normTruckReg, selectedMonth]);

  // Aggregated Financial Metrics for Statement
  const totalFreightRent = useMemo(() => {
    return filteredTrips.reduce((acc, t) => acc + Number(t.tripRevenue || t.estimatedTripFare || 0), 0);
  }, [filteredTrips]);

  const totalDemurrage = useMemo(() => {
    return filteredTrips.reduce((acc, t) => acc + Number(t.demurrageAmount || 0), 0);
  }, [filteredTrips]);

  const grossEarnings = totalFreightRent + totalDemurrage;

  const totalDirectTripCost = useMemo(() => {
    return filteredTrips.reduce((acc, t) => acc + Number(t.tripExpense || 0), 0);
  }, [filteredTrips]);

  const totalFuelLogCost = useMemo(() => {
    return filteredFuelLogs.reduce((acc, f) => acc + Number(f.fuelCost || 0), 0);
  }, [filteredFuelLogs]);

  const totalMaintCost = useMemo(() => {
    return filteredMaintLogs.reduce((acc, m) => acc + Number(m.maintenanceCost || m.partsCost || 0), 0);
  }, [filteredMaintLogs]);

  const totalDistanceKm = useMemo(() => {
    return filteredTrips.reduce((acc, t) => acc + Number(t.distanceKm || 0), 0);
  }, [filteredTrips]);

  // Net Fleet Profit = Gross Earnings - (Direct Trip Cost + Maintenance Cost)
  const netTruckProfit = grossEarnings - (totalDirectTripCost + totalMaintCost);

  // Statement Period String
  const statementPeriodLabel = useMemo(() => {
    if (selectedMonth !== 'ALL') return selectedMonth;
    if (availableMonths.length > 0) return `ALL MONTHS (${availableMonths.join(', ')})`;
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [selectedMonth, availableMonths]);

  const statementNumber = useMemo(() => {
    const cleanReg = normTruckReg.slice(-4) || '747';
    const periodCode = (selectedMonth !== 'ALL' ? selectedMonth : 'ALL')
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    return `STM-${cleanReg}-${periodCode}`;
  }, [normTruckReg, selectedMonth]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (!isOpen || !truck) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[96vh] print:max-h-none print:border-none print:shadow-none print:rounded-none cursor-default overflow-hidden text-slate-800 dark:text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* TOP CONTROLS BAR (Hidden When Printing)                        */}
        {/* ============================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Monthly Vehicle Performance & Income Statement</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-bold">
                  {statementNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Monthly trip counts, routes, freight revenue, demurrage, direct expenses, and net ROI for {truckReg}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Vehicle Selector (Switch between trucks) */}
            {allVehicles.length > 1 && onSelectTruck && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                <Truck className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={truck.id || truck.registrationNumber}
                  onChange={(e) => {
                    const found = allVehicles.find(
                      (v) => v.id === e.target.value || v.registrationNumber === e.target.value
                    );
                    if (found) onSelectTruck(found);
                  }}
                  className="bg-transparent font-bold font-mono text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  {allVehicles.map((v) => (
                    <option key={v.id || v.registrationNumber} value={v.id || v.registrationNumber}>
                      {v.registrationNumber} ({v.vehicleType || 'Truck'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Month Filter Selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs">
              <Calendar className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-slate-400 font-medium">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer uppercase"
              >
                <option value="ALL">All Recorded Months ({truckAllTrips.length} Trips)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Print / Download Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Download PDF / Print</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PRINTABLE BODY CONTAINER (A4 Formatted)                        */}
        {/* ============================================================== */}
        <div
          ref={printRef}
          className="p-6 sm:p-8 space-y-5 overflow-y-auto bg-white dark:bg-slate-900 print:p-6 print:bg-white text-slate-900 dark:text-slate-100 print:text-black font-sans"
        >
          {/* Header Title & Business Information */}
          <div className="text-center space-y-1 pb-3 border-b-2 border-slate-900 dark:border-slate-700 print:border-black">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 print:text-black">
              <Truck className="h-4 w-4 text-purple-600 print:text-black" />
              <span>{businessName} • COMMERCIAL TRANSPORT & LOGISTICS FLEET</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
              VEHICLE MONTHLY PERFORMANCE & FREIGHT INCOME STATEMENT
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium print:text-slate-700">
              Head Office: {businessAddress} | Call: {businessPhone} | E-mail: {businessEmail}
            </p>
          </div>

          {/* ============================================================== */}
          {/* 2-COLUMN VEHICLE PROFILE & STATEMENT PERIOD METADATA           */}
          {/* ============================================================== */}
          <div className="border border-slate-300 dark:border-slate-700 print:border-black rounded-lg overflow-hidden text-xs">
            <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 py-1.5 px-4 text-center font-bold uppercase tracking-wider border-b border-slate-300 dark:border-slate-700 print:border-black text-slate-900 dark:text-slate-100 print:text-black">
              Vehicle Profile & Accounting Period Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-300 dark:divide-slate-700 print:divide-black">
              {/* Left Column: Vehicle Specs */}
              <div className="p-3.5 space-y-1.5 bg-white dark:bg-slate-900 print:bg-white">
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    VEHICLE REG NO
                  </span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 print:text-black w-3/5 text-right sm:text-left text-sm">
                    : {truck.registrationNumber}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    MODEL & BODY
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white print:text-black w-3/5 text-right sm:text-left">
                    : {truck.vehicleType || 'Heavy Truck'} ({truck.truckBodyType || 'Covered Van'})
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    ASSIGNED DRIVER
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-black w-3/5 text-right sm:text-left">
                    : {truck.driverName || 'Assigned Fleet Pilot'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    DRIVER MOBILE
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white print:text-black w-3/5 text-right sm:text-left">
                    : {truck.driverPhone || '—'}
                  </span>
                </div>
              </div>

              {/* Right Column: Statement Meta */}
              <div className="p-3.5 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/50 print:bg-white">
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-purple-800 dark:text-purple-400 print:text-slate-800 w-2/5">
                    STATEMENT PERIOD
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-black w-3/5 text-right sm:text-left uppercase">
                    : {statementPeriodLabel}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    STATEMENT REF NO
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white print:text-black w-3/5 text-right sm:text-left">
                    : {statementNumber}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    TOTAL TRIPS
                  </span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-400 print:text-black w-3/5 text-right sm:text-left">
                    : {filteredTrips.length} Trips ({totalDistanceKm.toLocaleString()} KM logged)
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    GENERATED DATE
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white print:text-black w-3/5 text-right sm:text-left">
                    : {new Date().toISOString().slice(0, 10)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* FINANCIAL KPI SUMMARY BOX                                       */}
          {/* Matches Screenshot Structure: Rent, Demurrage, Direct, Net    */}
          {/* ============================================================== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 print:border-black print:bg-white">
              <span className="text-[10px] font-sans font-bold text-emerald-800 dark:text-emerald-400 print:text-black block">
                Total Freight Rent
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 print:text-black mt-0.5">
                {formatBDT(totalFreightRent)}
              </div>
              <span className="text-[9px] font-sans text-emerald-600 dark:text-emerald-500 print:text-slate-600 block">
                Base fare from {filteredTrips.length} trips
              </span>
            </div>

            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 print:border-black print:bg-white">
              <span className="text-[10px] font-sans font-bold text-amber-800 dark:text-amber-400 print:text-black block">
                Total Demurrage
              </span>
              <div className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-400 print:text-black mt-0.5">
                {formatBDT(totalDemurrage)}
              </div>
              <span className="text-[9px] font-sans text-amber-600 dark:text-amber-500 print:text-slate-600 block">
                Holding & delay compensation
              </span>
            </div>

            <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 print:border-black print:bg-white">
              <span className="text-[10px] font-sans font-bold text-rose-800 dark:text-rose-400 print:text-black block">
                Direct & Maint Expenses
              </span>
              <div className="text-base sm:text-lg font-black text-rose-700 dark:text-rose-400 print:text-black mt-0.5">
                {formatBDT(totalDirectTripCost + totalMaintCost)}
              </div>
              <span className="text-[9px] font-sans text-rose-600 dark:text-rose-500 print:text-slate-600 block">
                Fuel, toll, khoraki + maint
              </span>
            </div>

            <div className="p-3 rounded-lg border-2 border-purple-400 dark:border-purple-700 bg-purple-50/70 dark:bg-purple-950/30 print:border-black print:bg-white">
              <span className="text-[10px] font-sans font-bold text-purple-900 dark:text-purple-300 print:text-black block">
                Net Truck Fleet Profit
              </span>
              <div
                className={`text-base sm:text-lg font-black mt-0.5 ${
                  netTruckProfit >= 0
                    ? 'text-purple-700 dark:text-purple-300 print:text-black'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatBDT(netTruckProfit)}
              </div>
              <span className="text-[9px] font-sans text-purple-600 dark:text-purple-400 print:text-slate-600 block">
                Gross earnings minus expenses
              </span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* DETAILED TRIP LEDGER TABLE                                      */}
          {/* Columns: SL, Date, Challan, Route, Party, Cargo, Distance,     */}
          {/* Rent, Demurrage, Expenses, Net Profit, Status                  */}
          {/* ============================================================== */}
          <div className="border border-slate-300 dark:border-slate-700 print:border-black rounded-lg overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 py-1.5 px-3 flex items-center justify-between border-b border-slate-300 dark:border-slate-700 print:border-black">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 print:text-black">
                Trip Operations & Revenue Ledger ({filteredTrips.length} Records)
              </span>
              <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 print:text-slate-800">
                Period: {statementPeriodLabel}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 print:bg-slate-100 text-slate-700 dark:text-slate-200 print:text-black font-bold border-b border-slate-300 dark:border-slate-700 print:border-black">
                    <th className="py-2 px-2 text-center w-8 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      SL
                    </th>
                    <th className="py-2 px-2 text-center w-20 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      Date
                    </th>
                    <th className="py-2 px-2 w-28 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      Challan / Bill No
                    </th>
                    <th className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      Route (Load ➔ Unload)
                    </th>
                    <th className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      Client / Party
                    </th>
                    <th className="py-2 px-2 text-center w-14 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      KM
                    </th>
                    <th className="py-2 px-2 text-right w-22 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      Rent (Fare)
                    </th>
                    <th className="py-2 px-2 text-right w-20 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      Demurrage
                    </th>
                    <th className="py-2 px-2 text-right w-20 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      Expense
                    </th>
                    <th className="py-2 px-2 text-right w-22 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      Net Profit
                    </th>
                    <th className="py-2 px-2 text-center w-16">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 print:divide-slate-300 font-medium">
                  {filteredTrips.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                        No trip records found for {truckReg} in {statementPeriodLabel}.
                      </td>
                    </tr>
                  ) : (
                    filteredTrips.map((t, idx) => {
                      const rent = Number(t.tripRevenue || t.estimatedTripFare || 0);
                      const dem = Number(t.demurrageAmount || 0);
                      const exp = Number(t.tripExpense || 0);
                      const net = rent + dem - exp;
                      return (
                        <tr
                          key={t.id || idx}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 print:hover:bg-transparent"
                        >
                          <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-300 dark:border-slate-700 print:border-black">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-700 dark:text-slate-300 print:text-black whitespace-nowrap border-r border-slate-300 dark:border-slate-700 print:border-black">
                            {t.date || '—'}
                          </td>
                          <td className="py-2 px-2 font-mono font-bold text-slate-900 dark:text-white print:text-black border-r border-slate-300 dark:border-slate-700 print:border-black">
                            <div>{t.challanNumber || t.tripOrVehicleCode}</div>
                            {t.orderNumber && (
                              <div className="text-[10px] text-slate-400 font-normal">ORD: {t.orderNumber}</div>
                            )}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 print:border-black">
                            <div className="font-semibold text-slate-900 dark:text-white print:text-black">
                              {t.loadingLocation || t.origin || 'Ashulia'} ➔ {t.deliveryLocation || t.destination || 'Ctg Port'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                              {t.cargoDetails || 'Freight Load'}
                            </div>
                          </td>
                          <td className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 print:border-black">
                            <div className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                              {t.clientName || t.customerName || 'Direct Party'}
                            </div>
                            {t.brokerName && (
                              <div className="text-[10px] text-slate-400">Broker: {t.brokerName}</div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-700 dark:text-slate-300 print:text-black border-r border-slate-300 dark:border-slate-700 print:border-black">
                            {t.distanceKm || 0}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 print:text-black border-r border-slate-300 dark:border-slate-700 print:border-black">
                            {formatBDT(rent)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-semibold text-amber-700 dark:text-amber-400 print:text-black border-r border-slate-300 dark:border-slate-700 print:border-black">
                            {dem > 0 ? formatBDT(dem) : '—'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-rose-600 dark:text-rose-400 print:text-black border-r border-slate-300 dark:border-slate-700 print:border-black">
                            {formatBDT(exp)}
                          </td>
                          <td
                            className={`py-2 px-2 text-right font-mono font-bold border-r border-slate-300 dark:border-slate-700 print:border-black ${
                              net >= 0
                                ? 'text-purple-700 dark:text-purple-400 print:text-black'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatBDT(net)}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.status === 'completed'
                                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 print:text-black print:bg-transparent'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 print:text-black print:bg-transparent'
                              }`}
                            >
                              {t.status === 'completed' ? 'Delivered' : 'Running'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Total Footer Row */}
                {filteredTrips.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 font-bold border-t-2 border-slate-400 dark:border-slate-600 print:border-black">
                      <td
                        colSpan={5}
                        className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-800 dark:text-white print:text-black border-r border-slate-300 dark:border-slate-700 print:border-black"
                      >
                        Monthly Summary Totals ({filteredTrips.length} Trips):
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-900 dark:text-white print:text-black border-r border-slate-300 dark:border-slate-700 print:border-black">
                        {totalDistanceKm.toLocaleString()} KM
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-800 dark:text-emerald-300 print:text-black border-r border-slate-300 dark:border-slate-700 print:border-black">
                        {formatBDT(totalFreightRent)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-amber-800 dark:text-amber-300 print:text-black border-r border-slate-300 dark:border-slate-700 print:border-black">
                        {formatBDT(totalDemurrage)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-rose-700 dark:text-rose-300 print:text-black border-r border-slate-300 dark:border-slate-700 print:border-black">
                        {formatBDT(totalDirectTripCost)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-purple-900 dark:text-purple-300 print:text-black border-r border-slate-300 dark:border-slate-700 print:border-black">
                        {formatBDT(grossEarnings - totalDirectTripCost)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* ============================================================== */}
          {/* OPTIONAL SUB-SECTIONS: FUEL & MAINTENANCE BREAKDOWN            */}
          {/* ============================================================== */}
          {(filteredFuelLogs.length > 0 || filteredMaintLogs.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Fuel Logs Sub-Table */}
              {filteredFuelLogs.length > 0 && (
                <div className="border border-slate-300 dark:border-slate-700 print:border-black rounded-lg overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 py-1 px-3 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between border-b border-slate-300 dark:border-slate-700 print:border-black">
                    <span className="flex items-center gap-1.5">
                      <Fuel className="h-3 w-3 text-emerald-600" />
                      <span>Fuel Dispensing Logs ({filteredFuelLogs.length})</span>
                    </span>
                    <span className="font-mono">{formatBDT(totalFuelLogCost)}</span>
                  </div>
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 print:bg-slate-100 font-bold border-b border-slate-200 dark:border-slate-700 print:border-black">
                        <th className="py-1 px-2">Date</th>
                        <th className="py-1 px-2">Pump / Station</th>
                        <th className="py-1 px-2 text-right">Litres</th>
                        <th className="py-1 px-2 text-right">Cost (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                      {filteredFuelLogs.map((f, i) => (
                        <tr key={f.id || i}>
                          <td className="py-1 px-2 font-mono">{f.date}</td>
                          <td className="py-1 px-2 truncate max-w-[140px]">{f.fuelStation || 'CNG / Diesel Pump'}</td>
                          <td className="py-1 px-2 text-right font-mono">{f.fuelLitres || '—'} L</td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-rose-600 print:text-black">
                            {formatBDT(f.fuelCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Maintenance Sub-Table */}
              {filteredMaintLogs.length > 0 && (
                <div className="border border-slate-300 dark:border-slate-700 print:border-black rounded-lg overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 py-1 px-3 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between border-b border-slate-300 dark:border-slate-700 print:border-black">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="h-3 w-3 text-rose-600" />
                      <span>Maintenance & Repairs ({filteredMaintLogs.length})</span>
                    </span>
                    <span className="font-mono">{formatBDT(totalMaintCost)}</span>
                  </div>
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 print:bg-slate-100 font-bold border-b border-slate-200 dark:border-slate-700 print:border-black">
                        <th className="py-1 px-2">Date</th>
                        <th className="py-1 px-2">Workshop / Issue</th>
                        <th className="py-1 px-2">Category</th>
                        <th className="py-1 px-2 text-right">Cost (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                      {filteredMaintLogs.map((m, i) => (
                        <tr key={m.id || i}>
                          <td className="py-1 px-2 font-mono">{m.date}</td>
                          <td className="py-1 px-2 truncate max-w-[140px]">{m.garageName || 'Workshop'}</td>
                          <td className="py-1 px-2">{m.expenseCategory || 'General'}</td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-rose-600 print:text-black">
                            {formatBDT(m.maintenanceCost || m.partsCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* NET STATEMENT AMOUNT IN WORDS                                   */}
          {/* Matches Screenshot 1 IN WORD: FORTY ONE THOUSAND TAKA ONLY     */}
          {/* ============================================================== */}
          <div className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 print:border-black bg-slate-50 dark:bg-slate-800/40 print:bg-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                IN WORD (NET FLEET PROFIT):
              </span>
              <span className="font-black text-slate-900 dark:text-white print:text-black uppercase">
                {numberToWords(netTruckProfit)}
              </span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                TOTAL NET FLEET PROFIT:
              </span>
              <span className="font-mono font-black text-base sm:text-lg text-purple-700 dark:text-purple-400 print:text-black">
                {formatBDT(netTruckProfit)}
              </span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 4-BOX OFFICIAL SIGNATURE & CERTIFICATION BLOCK                 */}
          {/* ============================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 text-xs text-center">
            <div className="space-y-1">
              <div className="border-t border-slate-400 dark:border-slate-600 print:border-black pt-1.5 font-bold text-slate-800 dark:text-slate-200 print:text-black">
                Prepared By
              </div>
              <p className="text-[10px] text-slate-500">Fleet Data Operator</p>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-400 dark:border-slate-600 print:border-black pt-1.5 font-bold text-slate-800 dark:text-slate-200 print:text-black">
                Fleet Supervisor
              </div>
              <p className="text-[10px] text-slate-500">Vehicle Operations In-Charge</p>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-400 dark:border-slate-600 print:border-black pt-1.5 font-bold text-slate-800 dark:text-slate-200 print:text-black">
                Accounts Officer
              </div>
              <p className="text-[10px] text-slate-500">Finance & Billing Audit</p>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-400 dark:border-slate-600 print:border-black pt-1.5 font-bold text-slate-800 dark:text-slate-200 print:text-black">
                Proprietor / MD
              </div>
              <p className="text-[10px] text-slate-500">{businessName}</p>
            </div>
          </div>

          {/* Footer Statutory Note */}
          <div className="pt-2 text-center text-[10px] text-slate-400 print:text-slate-600 border-t border-slate-200 dark:border-slate-800 print:border-slate-300">
            This is an official computer-generated monthly performance and income statement issued by {businessName} Logistics ERP.
          </div>
        </div>
      </div>
    </div>
  );
}
