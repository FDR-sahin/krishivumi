'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Truck,
  FileText,
  MapPin,
  Calendar,
  Phone,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { ErpTransportOp, formatBDT } from '@/lib/erp-types';

interface TripChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: ErpTransportOp | null;
  businessName?: string;
  businessPhone?: string;
  allTrips?: ErpTransportOp[];
  lang?: 'bn' | 'en';
}

function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Taka Only';
  const units = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  }
  return convert(Math.abs(amount)) + ' Taka Only';
}

export default function TripChallanModal({
  isOpen,
  onClose,
  trip,
  businessName = 'RegardsAgro Enterprise',
  businessPhone = '',
  allTrips = [],
  lang = 'en',
}: TripChallanModalProps) {
  const bn = false;
  const [copied, setCopied] = useState(false);

  // Compute sequential order index starting from 1 (Order 01, 02, etc.)
  const orderIndex = useMemo(() => {
    if (!trip) return 1;
    if (trip.orderNumber) {
      const parsed = parseInt(trip.orderNumber, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (allTrips && allTrips.length > 0) {
      const chronological = [...allTrips].sort((a, b) => {
        const da = a.date || '';
        const db = b.date || '';
        if (da !== db) return da.localeCompare(db);
        return (a.tripOrVehicleCode || '').localeCompare(b.tripOrVehicleCode || '');
      });
      const idx = chronological.findIndex(
        (t) => t.id === trip.id || t.tripOrVehicleCode === trip.tripOrVehicleCode
      );
      if (idx !== -1) return idx + 1;
    }
    return 1;
  }, [trip, allTrips]);

  const orderNumberFormatted = String(orderIndex).padStart(2, '0');
  const serialNumberFormatted = '01'; // Clean "01" without any "#" symbol

  if (!isOpen || !trip) return null;

  const totalTripCost =
    (trip.fuelCost || 0) +
    (trip.tollCost || 0) +
    (trip.driverAllowance || 0) +
    (trip.maintenanceCost || 0);
  const netTripProfit = (trip.tripRevenue || 0) - totalTripCost;

  // Real phone numbers entered by user (NO fake hardcoded fallback!)
  const driverPhone = trip.driverPhone?.trim() || '';
  const receiverPhone =
    (trip as any).receiverPhone?.trim() ||
    (trip as any).customerPhone?.trim() ||
    '';

  // Estimated delivery calculation (typically 1-2 days after departure)
  const departureDate = trip.date || new Date().toISOString().split('T')[0];
  const deliveryDateObj = new Date(departureDate);
  deliveryDateObj.setDate(deliveryDateObj.getDate() + 1);
  const deliveryDate = deliveryDateObj.toISOString().split('T')[0];

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopySummary = async () => {
    const textSummary = `
========================================
${businessName} - Freight Consignment Challan & Work Order
========================================
Order No: ${orderNumberFormatted}
Work Order No: ${trip.tripOrVehicleCode}
Vehicle No: ${trip.registrationNumber} (${trip.vehicleType || 'Heavy Truck'})
Driver: ${trip.driverName}${driverPhone ? ` (${driverPhone})` : ''}
Consignor (Origin): ${trip.origin}
Consignee (Destination): ${trip.customerName || 'Wholesale Terminal'} (${trip.destination})${receiverPhone ? ` [Phone: ${receiverPhone}]` : ''}
Distance: ${trip.distanceKm} KM
Cargo: ${trip.cargoDetails || 'Commercial Freight Consignment'}
Trip Fare: ৳ ${trip.tripRevenue.toLocaleString()}
Trip Expenses: ৳ ${totalTripCost.toLocaleString()} (Diesel: ৳${(trip.fuelCost || 0).toLocaleString()}, Toll: ৳${(trip.tollCost || 0).toLocaleString()}, Allowance: ৳${(trip.driverAllowance || 0).toLocaleString()})
Net Profit: ৳ ${netTripProfit.toLocaleString()}
Remaining Due: ৳ ${trip.outstandingDue.toLocaleString()}
Status: ${trip.status === 'completed' ? 'Delivered' : 'On Highway'}
Date: ${trip.date}
========================================
`.trim();

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(textSummary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {
      console.error('Clipboard copy error:', e);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none text-slate-800 dark:text-slate-200">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Work Order & Trip Consignment Challan
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
'Trip consignment, consignor/consignee party, route, expenses and profit summary'
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors shadow-2xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PRINTABLE CHALLAN & WORK ORDER BODY                            */}
        {/* Matches Client Format in Image 2 (Style Wise PO Summary Report) */}
        {/* ============================================================== */}
        <div className="p-6 sm:p-8 space-y-6 bg-white dark:bg-slate-900 print:p-8 print:bg-white text-slate-900 dark:text-slate-100 print:text-black">
          {/* Header Title & Address */}
          <div className="text-center space-y-1 pb-2 border-b border-slate-200 dark:border-slate-800 print:border-black">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 print:text-black">
              <Truck className="h-4 w-4" />
              <span>{businessName} — Fleet Logistics Division</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
              Freight Consignment Challan & Transport Work Order
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium print:text-slate-700">
              Address: Central Agro Logistics Hub, Dhaka-Chattogram Highway, Bangladesh{businessPhone ? ` | Phone: ${businessPhone}` : ''}
            </p>
          </div>

          {/* ============================================================== */}
          {/* 2-COLUMN WORK ORDER KEY-VALUE METADATA BOX                     */}
          {/* Left: Transport Meta | Right: Consignor / Consignee Parties    */}
          {/* ============================================================== */}
          <div className="border-2 border-slate-900 dark:border-slate-700 print:border-black rounded-lg overflow-hidden text-xs">
            <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 py-2 px-4 text-center font-bold uppercase tracking-wider border-b-2 border-slate-900 dark:border-slate-700 print:border-black text-slate-900 dark:text-slate-100 print:text-black">
              Work Order & Consignment Note
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900 dark:divide-slate-700 print:divide-black">
              {/* Left Column: Work Order Details */}
              <div className="p-4 space-y-2 bg-white dark:bg-slate-900/50 print:bg-white">
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    ORDER NO
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 print:text-black w-3/5 text-right sm:text-left text-sm">
                    : {orderNumberFormatted}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    WORK ORDER NO
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white print:text-black w-3/5 text-right sm:text-left">
                    : {trip.tripOrVehicleCode}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    ISSUE DATE
                  </span>
                  <span className="font-mono text-slate-900 dark:text-slate-200 print:text-black w-3/5 text-right sm:text-left">
                    : {trip.date}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    DELIVERY DATE
                  </span>
                  <span className="font-mono text-slate-900 dark:text-slate-200 print:text-black w-3/5 text-right sm:text-left">
                    : {deliveryDate}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    CONTACT PERSON
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white print:text-black w-3/5 text-right sm:text-left">
                    : {trip.driverName || '—'} (Driver & In-Charge)
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    MOBILE NUMBER
                  </span>
                  <span className="font-mono text-slate-900 dark:text-slate-200 print:text-black w-3/5 text-right sm:text-left">
                    : {driverPhone || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    VEHICLE REG NO
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 print:text-black w-3/5 text-right sm:text-left">
                    : {trip.registrationNumber} ({trip.vehicleType || 'Heavy Truck'})
                  </span>
                </div>
              </div>

              {/* Right Column: Buyer (Consignee) & Supplier (Consignor) */}
              <div className="p-4 space-y-2 bg-emerald-50/30 dark:bg-slate-900/50 print:bg-white">
                <div className="flex justify-between items-baseline py-0.5 border-b border-emerald-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 print:text-slate-800 w-2/5">
                    BUYER / CONSIGNEE
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-black w-3/5 text-right sm:text-left">
                    : {trip.customerName || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-emerald-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    SUPPLIER / CONSIGNOR
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white print:text-black w-3/5 text-right sm:text-left">
                    : {businessName} (Feed Mill & Central Agro Complex)
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-emerald-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    ATTENTION
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-200 print:text-black w-3/5 text-right sm:text-left">
                    : {trip.brokerName ? `Broker: ${trip.brokerName}` : 'Depot Incharge & Receiver'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-emerald-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    RECEIVER MOBILE
                  </span>
                  <span className="font-mono text-slate-900 dark:text-slate-200 print:text-black w-3/5 text-right sm:text-left">
                    : {receiverPhone || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5 border-b border-emerald-100 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-700 w-2/5">
                    ORIGIN ADDRESS (CONSIGNOR)
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 print:text-black w-3/5 text-right sm:text-left">
                    : {trip.origin} (Loading Point)
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 print:text-slate-800 w-2/5">
                    UNLOADING POINT (DESTINATION)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-black w-3/5 text-right sm:text-left">
                    : {trip.destination} ({trip.distanceKm} KM)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* CONSIGNMENT BREAKDOWN TABLE (Soft green styled table)           */}
          {/* Matches Screenshot 2 Header & Columns                          */}
          {/* ============================================================== */}
          <div className="border border-slate-300 dark:border-slate-700 print:border-black rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-100/80 dark:bg-emerald-950/70 print:bg-slate-200 text-slate-800 dark:text-slate-100 print:text-black font-bold border-b border-slate-300 dark:border-slate-700 print:border-black">
                    <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-center w-16">
                      Serial Number
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      Cargo & Goods Details
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-center w-28">
                      Order Number
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      Route & Vehicle
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-center">
                      Weight / Load
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-right">
                      Freight Fare
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-right">
                      Trip Cost
                    </th>
                    <th className="py-2.5 px-3 text-right">
                      Net Profit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 print:divide-slate-300 font-medium">
                  <tr>
                    <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-center font-mono font-bold text-slate-900 dark:text-white print:text-black">
                      {serialNumberFormatted}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      <div className="font-bold text-slate-900 dark:text-white print:text-black">
                        {trip.cargoDetails || 'Farm Livestock & Feed Consignment'}
                      </div>
                      <div className="text-[11px] text-slate-500 print:text-slate-600">
                        Safe commercial transport load
                      </div>
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-center">
                      <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 print:text-black">
                        {orderNumberFormatted}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {trip.tripOrVehicleCode}
                      </div>
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black">
                      <div className="font-semibold">
                        {trip.origin} ➔ {trip.destination}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {trip.registrationNumber} · {trip.driverName}
                      </div>
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-center font-mono font-bold">
                      {trip.capacityTons ? `${trip.capacityTons} Ton` : 'Full Truck Load'}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-right font-mono font-bold text-slate-900 dark:text-slate-100 print:text-black">
                      {formatBDT(trip.tripRevenue)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-right font-mono text-slate-700 dark:text-slate-300 print:text-black">
                      {formatBDT(totalTripCost)}
                      <div className="text-[10px] text-slate-400 print:text-slate-500">
                        Diesel: {formatBDT(trip.fuelCost)} | Toll: {formatBDT(trip.tollCost)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span
                        className={
                          netTripProfit >= 0
                            ? 'text-emerald-700 dark:text-emerald-400 print:text-black'
                            : 'text-red-600 print:text-black'
                        }
                      >
                        {formatBDT(netTripProfit)}
                      </span>
                    </td>
                  </tr>

                  {/* Grand Total Row matching client screenshot */}
                  <tr className="bg-slate-100/90 dark:bg-slate-800 font-bold border-t-2 border-slate-900 dark:border-slate-700 print:border-black print:bg-slate-100">
                    <td
                      colSpan={4}
                      className="py-2.5 px-4 text-right uppercase tracking-wider border-r border-slate-300 dark:border-slate-700 print:border-black"
                    >
                      Grand Total:
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700 print:border-black font-mono font-bold">
                      {trip.capacityTons ? `${trip.capacityTons} Ton` : '1 Load'}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-300 dark:border-slate-700 print:border-black font-mono text-emerald-800 dark:text-emerald-400 print:text-black">
                      {formatBDT(trip.tripRevenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-300 dark:border-slate-700 print:border-black font-mono text-slate-700 dark:text-slate-300 print:text-black">
                      {formatBDT(totalTripCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800 dark:text-emerald-400 print:text-black">
                      {formatBDT(netTripProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================== */}
          {/* IN WORD, NOTE & REMARKS SECTION                                */}
          {/* Matches Screenshot 2 exactly                                   */}
          {/* ============================================================== */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 print:text-black whitespace-nowrap">
                IN WORD:
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-black italic">
                {numberToWords(trip.tripRevenue)} ({trip.tripRevenue.toLocaleString()} BDT Only)
              </span>
            </div>

            <div className="flex items-start gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 print:text-black whitespace-nowrap">
                NOTE:
              </span>
              <span className="text-slate-600 dark:text-slate-400 print:text-slate-700">
'Consignment must be delivered safely in sealed condition. Receiver signature and company stamp required upon discharge.'
              </span>
            </div>

            <div className="flex items-start gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 print:text-black whitespace-nowrap">
                REMARKS:
              </span>
              <span className="text-slate-600 dark:text-slate-400 print:text-slate-700 font-mono">
`Trip Status: ${trip.status === 'completed' ? 'Delivered & Received' : 'On Highway Dispatch'} | Outstanding Fare: ${formatBDT(trip.outstandingDue)}`
              </span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 5-BOX SIGNATURE APPROVAL BLOCK                                 */}
          {/* PREPARED BY | CHECKED BY | ASST./MANAGER | HOD | ED            */}
          {/* Exact structure from user's image 2                            */}
          {/* ============================================================== */}
          <div className="pt-12 sm:pt-16 grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6 text-center text-xs">
            <div className="space-y-1">
              <div className="border-t-2 border-slate-900 dark:border-slate-600 print:border-black pt-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-900 dark:text-slate-200 print:text-black">
                PREPARED BY
              </div>
              <div className="text-[10px] text-slate-500 print:text-slate-600">
                {trip.driverName} (Driver / In-Charge)
              </div>
            </div>

            <div className="space-y-1">
              <div className="border-t-2 border-slate-900 dark:border-slate-600 print:border-black pt-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-900 dark:text-slate-200 print:text-black">
                CHECKED BY
              </div>
              <div className="text-[10px] text-slate-500 print:text-slate-600">
                Trip Supervisor
              </div>
            </div>

            <div className="space-y-1">
              <div className="border-t-2 border-slate-900 dark:border-slate-600 print:border-black pt-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-900 dark:text-slate-200 print:text-black">
                ASST. / MANAGER
              </div>
              <div className="text-[10px] text-slate-500 print:text-slate-600">
                Md. Sahin Miah (Manager)
              </div>
            </div>

            <div className="space-y-1">
              <div className="border-t-2 border-slate-900 dark:border-slate-600 print:border-black pt-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-900 dark:text-slate-200 print:text-black">
                HOD LOGISTICS
              </div>
              <div className="text-[10px] text-slate-500 print:text-slate-600">
                Head of Fleet Ops
              </div>
            </div>

            <div className="space-y-1 col-span-2 sm:col-span-1">
              <div className="border-t-2 border-slate-900 dark:border-slate-600 print:border-black pt-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-900 dark:text-slate-200 print:text-black">
                ED / SUPER ADMIN
              </div>
              <div className="text-[10px] text-slate-500 print:text-slate-600">
                Executive Director
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
