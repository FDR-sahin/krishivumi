'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Printer, X, Calendar, DollarSign, Edit2, Check, Building2, Truck, AlertCircle, FileText } from 'lucide-react';
import { ErpTransportOp } from '@/lib/erp-types';

interface CorporateTransportBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ErpTransportOp | null;
  clientTrips: ErpTransportOp[];
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  onUpdateTripDemurrage?: (tripId: string, demurrage: number, days?: number, reason?: string) => Promise<void>;
  onReceivePayment?: (clientItem: any) => void;
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

const COMMON_DEMURRAGE_REASONS = [
  'Factory Unloading Delay (Exceeded 24h standard)',
  'Port / CFS Berth Congestion & Yard Hold',
  'Factory Closed / Weekend / Public Holiday',
  'Customs & Shipping Document Hold',
  'Receiver Labor Shortage at Offloading Point',
  'Truck Detained on Route / Highway Hold',
  'Special Client Holding Request',
];

export default function CorporateTransportBillModal({
  isOpen,
  onClose,
  contract,
  clientTrips,
  businessName = 'REGARDSAGRO ENTERPRISE',
  businessAddress = 'Tejgaon Industrial Area, Dhaka-1208, Bangladesh',
  businessPhone = '01719714211, 017787779, 01707300599',
  businessEmail = 'regardsagro747@gmail.com',
  onUpdateTripDemurrage,
  onReceivePayment,
}: CorporateTransportBillModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [customBillNo, setCustomBillNo] = useState<string>('');
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editingDemurrageVal, setEditingDemurrageVal] = useState<number>(0);
  const [editingDemurrageDays, setEditingDemurrageDays] = useState<number>(1);
  const [editingDemurrageReason, setEditingDemurrageReason] = useState<string>('Factory Unloading Delay');
  const [isSavingDemurrage, setIsSavingDemurrage] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Available Months from trips
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of clientTrips) {
      if (t.date) {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          const mName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
          set.add(mName);
        }
      }
    }
    return Array.from(set);
  }, [clientTrips]);

  // Filtered trips by selected month
  const filteredTrips = useMemo(() => {
    if (selectedMonth === 'ALL') return clientTrips;
    return clientTrips.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;
      const mName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
      return mName === selectedMonth;
    });
  }, [clientTrips, selectedMonth]);

  // Aggregated figures
  const totalRent = useMemo(() => {
    return filteredTrips.reduce((s, t) => s + Number(t.tripRevenue || t.estimatedTripFare || 0), 0);
  }, [filteredTrips]);

  const totalDemurrage = useMemo(() => {
    return filteredTrips.reduce((s, t) => s + Number(t.demurrageAmount || 0), 0);
  }, [filteredTrips]);

  const grandTotalTk = totalRent + totalDemurrage;

  const totalPaid = useMemo(() => {
    return filteredTrips.reduce((s, t) => s + Number(t.advancePaid || t.advanceReceived || 0), 0);
  }, [filteredTrips]);

  const balanceDue = Math.max(0, grandTotalTk - totalPaid);

  // Auto Bill No
  const defaultBillNo = useMemo(() => {
    const clientCode = (contract?.clientName || 'GSL').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 4);
    const year = new Date().getFullYear();
    const countStr = String(filteredTrips.length || 1).padStart(3, '0');
    return `SUM_TPB_${clientCode}_${year.toString().slice(-2)}${countStr}`;
  }, [contract, filteredTrips]);

  const displayBillNo = customBillNo || defaultBillNo;

  // Active Billing Period Label
  const displayPeriod = useMemo(() => {
    if (selectedMonth !== 'ALL') return selectedMonth;
    if (availableMonths.length > 0) return availableMonths[0];
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [selectedMonth, availableMonths]);

  if (!isOpen || !contract) return null;

  const clientName = contract.clientName || contract.customerName || 'GLOBAL SHOES LTD';
  const clientLocation = contract.factoryLocation || contract.origin || 'Seedstor Bazar Valuka';

  const handlePrint = () => {
    window.print();
  };

  const startEditTripDemurrage = (trip: ErpTransportOp) => {
    setEditingTripId(trip.id);
    const currentDemurrage = Number(trip.demurrageAmount || 0);
    setEditingDemurrageVal(currentDemurrage);
    setEditingDemurrageDays(trip.demurrageDays || (currentDemurrage > 0 ? 1 : 1));
    setEditingDemurrageReason(trip.demurrageReason || 'Factory Unloading Delay');
  };

  const handleSaveDemurrage = async (tripId: string) => {
    if (!onUpdateTripDemurrage) return;
    setIsSavingDemurrage(true);
    try {
      await onUpdateTripDemurrage(tripId, editingDemurrageVal, editingDemurrageDays, editingDemurrageReason);
      setEditingTripId(null);
    } catch (err) {
      console.error('Failed to update demurrage:', err);
    } finally {
      setIsSavingDemurrage(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed-none cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[95vh] print:max-h-none print:border-none print:shadow-none print:rounded-none cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-t-2xl print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{businessName} - Transport Bill & Monthly Statement</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Official Statement
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Official billing statement for {clientName} with Rent + Demurrage breakdown.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Filter */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Trips ({clientTrips.length})</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Download PDF / Print</span>
            </button>

            {onReceivePayment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReceivePayment({ contract, totalDue: balanceDue, totalBilled: grandTotalTk, clientTrips });
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>+ Receive Payment</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Close (or click outside)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container (A4 Printable Layout) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white text-slate-900 print:p-0 print:overflow-visible font-sans">
          <div
            ref={printRef}
            className="w-full max-w-[800px] mx-auto border border-slate-300 p-6 sm:p-8 bg-white text-black shadow-sm print:border-none print:shadow-none print:p-0 space-y-4"
          >
            {/* Top Brand Logo & Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full border-2 border-emerald-600 flex flex-col items-center justify-center p-1 text-center shrink-0 bg-emerald-50">
                  <div className="font-black text-emerald-800 text-[10px] tracking-tighter leading-none">REGARDS</div>
                  <div className="text-[7px] text-emerald-700 font-bold leading-none mt-0.5">Agro Enterprise</div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black">
                    {businessName}
                  </h1>
                  <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
                    Government Approved Transport Contractor & Fleet Logistics
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-700 font-medium">
                <div>Tejgaon Industrial Area, Dhaka</div>
                <div className="font-mono text-[10px]">Head Office & Fleet Logistics Depot</div>
              </div>
            </div>

            {/* Client Name & Transport Bill Title */}
            <div className="text-center space-y-0.5 py-1">
              <h2 className="text-xl sm:text-2xl font-black uppercase text-black tracking-wide">
                {clientName}
              </h2>
              <div className="inline-block border-b-2 border-black px-4 pb-0.5 text-base sm:text-lg font-extrabold uppercase tracking-wider">
                Transport Bill
              </div>
            </div>

            {/* Meta Row: Client Address (Left) & Bill No / Date (Right) */}
            <div className="flex items-start justify-between text-xs pt-1 border-t border-slate-200">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900">M/S {clientName}</div>
                <div className="text-slate-700">{clientLocation}</div>
              </div>

              <div className="text-right space-y-1">
                <div className="font-bold font-mono">
                  Bill No: <span className="font-black underline">{displayBillNo}</span>
                </div>
                <div className="font-bold">
                  Date: <span className="font-black underline">{displayPeriod}</span>
                </div>
              </div>
            </div>

            {/* Executive Summary Card (Monthly Trips, Demurrage & Income Breakdown) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Trips</span>
                <span className="font-bold text-sm font-mono text-slate-900">{filteredTrips.length} Trips</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Base Freight</span>
                <span className="font-bold text-sm font-mono text-slate-900">
                  {totalRent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-amber-700 block uppercase font-bold">Total Demurrage</span>
                <span className="font-bold text-sm font-mono text-amber-800">
                  {totalDemurrage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right sm:text-left">
                <span className="text-[10px] text-emerald-700 block uppercase font-bold">Total Billed</span>
                <span className="font-black text-sm font-mono text-emerald-800">
                  {grandTotalTk.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* The Authentic Real-World Bill Table */}
            <div className="pt-1">
              <table className="w-full border-collapse border-2 border-black text-xs">
                <thead>
                  <tr className="bg-slate-100 text-black font-black uppercase text-[11px] text-center border-b-2 border-black">
                    <th className="border border-black py-2 px-2 w-[85px]">DATE</th>
                    <th className="border border-black py-2 px-2 w-[105px]">BILL NO</th>
                    <th className="border border-black py-2 px-2 w-[115px]">TRUCK NO</th>
                    <th className="border border-black py-2 px-2">LOAD</th>
                    <th className="border border-black py-2 px-2">UNLOAD</th>
                    <th className="border border-black py-2 px-2 text-right w-[95px]">RENT</th>
                    <th className="border border-black py-2 px-2 text-right w-[115px]">DEMMURGE</th>
                    <th className="border border-black py-2 px-2 text-right w-[105px]">TOTAL TK</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((trip, idx) => {
                    const rent = Number(trip.tripRevenue || trip.estimatedTripFare || 0);
                    const demurrage = Number(trip.demurrageAmount || 0);
                    const totalTk = rent + demurrage;

                    const formattedDate = trip.date
                      ? (() => {
                          const parts = trip.date.split('-');
                          if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                          return trip.date;
                        })()
                      : '-';

                    const billCode = trip.challanNumber || trip.orderNumber || trip.tripOrVehicleCode || `TPB_GSL 0${idx + 10}`;
                    const loadPoint = trip.loadingLocation || trip.origin || 'GLOBAL';
                    const unloadPoint = trip.deliveryLocation || trip.destination || 'OCL';

                    return (
                      <tr key={trip.id} className="text-center font-medium">
                        <td className="border border-black py-1.5 px-2 font-mono whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="border border-black py-1.5 px-2 font-mono font-bold whitespace-nowrap">
                          {billCode}
                        </td>
                        <td className="border border-black py-1.5 px-2 font-mono font-bold whitespace-nowrap uppercase">
                          {trip.registrationNumber.replace('DHAKA-METRO-', 'DM ')}
                        </td>
                        <td className="border border-black py-1.5 px-2 uppercase font-bold text-[11px]">
                          {loadPoint}
                        </td>
                        <td className="border border-black py-1.5 px-2 uppercase font-bold text-[11px]">
                          {unloadPoint}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-right font-mono font-bold">
                          {rent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-right font-mono font-bold group relative">
                          {editingTripId === trip.id ? (
                            <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-left space-y-1.5 print:hidden">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-amber-900">Demurrage (BDT):</span>
                                <input
                                  type="number"
                                  autoFocus
                                  min={0}
                                  value={editingDemurrageVal}
                                  onChange={(e) => setEditingDemurrageVal(Number(e.target.value))}
                                  className="w-20 px-1 py-0.5 border border-amber-500 rounded text-right font-mono text-xs bg-white"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-700">Days Delayed:</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={editingDemurrageDays}
                                  onChange={(e) => setEditingDemurrageDays(Number(e.target.value))}
                                  className="w-14 px-1 py-0.5 border border-slate-300 rounded text-right font-mono text-xs bg-white"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-slate-700 block">Delay Reason:</span>
                                <select
                                  value={editingDemurrageReason}
                                  onChange={(e) => setEditingDemurrageReason(e.target.value)}
                                  className="w-full text-[10px] border border-slate-300 rounded p-1 bg-white"
                                >
                                  {COMMON_DEMURRAGE_REASONS.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex justify-end gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingTripId(null)}
                                  className="px-2 py-0.5 rounded text-[10px] border border-slate-300 text-slate-600 bg-white cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingDemurrage}
                                  onClick={() => handleSaveDemurrage(trip.id)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-bold cursor-pointer"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Save</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end justify-center">
                              <div className="flex items-center justify-end gap-1">
                                <span>
                                  {demurrage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {onUpdateTripDemurrage && (
                                  <button
                                    type="button"
                                    onClick={() => startEditTripDemurrage(trip)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-emerald-600 cursor-pointer print:hidden transition-opacity"
                                    title="Edit Demurrage / Delay Cause"
                                  >
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                              {trip.demurrageDays ? (
                                <span className="text-[8.5px] font-sans text-amber-700 font-semibold block leading-tight">
                                  {trip.demurrageDays}d delayed
                                </span>
                              ) : null}
                              {trip.demurrageReason ? (
                                <span className="text-[8px] font-sans text-slate-500 italic block leading-tight truncate max-w-[100px]" title={trip.demurrageReason}>
                                  {trip.demurrageReason}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-right font-mono font-black">
                          {totalTk.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty rows to match official ledger sheet appearance */}
                  {Array.from({ length: Math.max(0, 4 - filteredTrips.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-8">
                      <td className="border border-black">&nbsp;</td>
                      <td className="border border-black">&nbsp;</td>
                      <td className="border border-black">&nbsp;</td>
                      <td className="border border-black">&nbsp;</td>
                      <td className="border border-black">&nbsp;</td>
                      <td className="border border-black">&nbsp;</td>
                      <td className="border border-black">&nbsp;</td>
                      <td className="border border-black">&nbsp;</td>
                    </tr>
                  ))}

                  {/* TOTAL ROW & IN WORDS (Exact Match to Picture) */}
                  <tr className="border-t-2 border-black font-black">
                    <td colSpan={5} className="border border-black p-2 text-left align-middle text-[11px] uppercase tracking-wide">
                      <span className="font-black">IN WORD: </span>
                      <span className="font-bold underline decoration-dotted">
                        {numberToWords(grandTotalTk)}
                      </span>
                    </td>
                    <td colSpan={2} className="border border-black p-2 text-right font-black uppercase text-[11px] tracking-wider">
                      TOTAL
                    </td>
                    <td className="border border-black p-2 text-right font-mono font-black text-sm">
                      {grandTotalTk.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signature Area (Exact Match to Picture) */}
            <div className="pt-14 sm:pt-16 pb-3 flex items-end justify-between text-xs font-bold text-black">
              <div className="text-center w-40">
                <div className="border-t border-black pt-1">Received By</div>
              </div>

              <div className="text-center w-56 space-y-1">
                <div className="text-emerald-800 font-mono font-black text-xs italic tracking-wider">
                  {businessName}
                </div>
                <div className="border-t border-black pt-1 font-bold">
                  Proprietor / Authorized Signature
                </div>
              </div>
            </div>

            {/* Bottom Footer Info (Exact Match to Picture) */}
            <div className="border-t border-slate-400 pt-3 text-[10px] text-slate-700 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-emerald-800 font-extrabold uppercase">
                  Commission Agent | All Bangladesh Transportation
                </span>
                <span>Government Registered Commercial Transport Carrier</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[9.5px]">
                <div>
                  <span className="font-bold text-black">Head Office : </span>
                  {businessAddress}
                </div>
                <div>
                  <span className="font-bold text-black">Chittagong Office : </span>
                  Suvopur Bus Stand, Kadamtali, Chittagong
                </div>
              </div>

              <div className="text-[9.5px] font-mono text-slate-800 pt-0.5 border-t border-slate-200">
                <span className="font-bold font-sans">Call: </span>
                {businessPhone} &nbsp;|&nbsp; <span className="font-bold font-sans">E-mail: </span>
                {businessEmail}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Screen Only) */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-b-2xl flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Total Transport Bill</span>
              <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                BDT {grandTotalTk.toLocaleString()}
              </span>
            </div>
            <div className="border-l border-slate-300 dark:border-slate-700 pl-3">
              <span className="text-slate-400 text-[10px] block font-semibold">Already Paid</span>
              <span className="font-mono font-bold text-xs text-emerald-600">
                BDT {totalPaid.toLocaleString()}
              </span>
            </div>
            <div className="border-l border-slate-300 dark:border-slate-700 pl-3">
              <span className="text-slate-400 text-[10px] block font-semibold">Balance Due</span>
              <span className="font-mono font-black text-xs text-rose-600">
                BDT {balanceDue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Download PDF / Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
