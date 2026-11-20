'use client';

import React from 'react';
import { Calendar, RotateCcw } from 'lucide-react';

export interface MonthFilterValue {
  year: string; // 'ALL' | '2025' | '2026' | '2027'
  month: string; // 'ALL' | '01'..'12'
}

export const MONTHS_12 = [
  { code: '01', shortBn: 'জানু', fullBn: 'জানুয়ারি', shortEn: 'Jan', fullEn: 'January' },
  { code: '02', shortBn: 'ফেব্রু', fullBn: 'ফেব্রুয়ারি', shortEn: 'Feb', fullEn: 'February' },
  { code: '03', shortBn: 'মার্চ', fullBn: 'মার্চ', shortEn: 'Mar', fullEn: 'March' },
  { code: '04', shortBn: 'এপ্রিল', fullBn: 'এপ্রিল', shortEn: 'Apr', fullEn: 'April' },
  { code: '05', shortBn: 'মে', fullBn: 'মে', shortEn: 'May', fullEn: 'May' },
  { code: '06', shortBn: 'জুন', fullBn: 'জুন', shortEn: 'Jun', fullEn: 'June' },
  { code: '07', shortBn: 'জুলাই', fullBn: 'জুলাই', shortEn: 'Jul', fullEn: 'July' },
  { code: '08', shortBn: 'আগস্ট', fullBn: 'আগস্ট', shortEn: 'Aug', fullEn: 'August' },
  { code: '09', shortBn: 'সেপ্টে', fullBn: 'সেপ্টেম্বর', shortEn: 'Sep', fullEn: 'September' },
  { code: '10', shortBn: 'অক্টো', fullBn: 'অক্টোবর', shortEn: 'Oct', fullEn: 'October' },
  { code: '11', shortBn: 'নভে', fullBn: 'নভেম্বর', shortEn: 'Nov', fullEn: 'November' },
  { code: '12', shortBn: 'ডিসে', fullBn: 'ডিসেম্বর', shortEn: 'Dec', fullEn: 'December' },
] as const;

export function matchesMonthFilter(
  dateStr: string | undefined | null,
  filter: MonthFilterValue
): boolean {
  if (filter.year === 'ALL' && filter.month === 'ALL') return true;
  if (!dateStr) return false;
  const clean = String(dateStr).trim();
  // Expected formats: YYYY-MM-DD or ISO YYYY-MM-DDTHH:mm:ss...
  const match = clean.match(/^(\d{4})-(\d{2})/);
  if (!match) return false;
  const [, y, m] = match;
  if (filter.year !== 'ALL' && y !== filter.year) return false;
  if (filter.month !== 'ALL' && m !== filter.month) return false;
  return true;
}

export function formatMonthFilterLabel(filter: MonthFilterValue, bn = false): string {
  if (filter.year === 'ALL' && filter.month === 'ALL') {
    return 'All 12 Months (All Time)';
  }
  const mObj = MONTHS_12.find((m) => m.code === filter.month);
  const mLabel = mObj ? mObj.fullEn : 'All Months';
  const yLabel = filter.year === 'ALL' ? 'All Years' : filter.year;
  return `${mLabel} · ${yLabel}`;
}

interface MonthFilterBarProps {
  value: MonthFilterValue;
  onChange: (next: MonthFilterValue) => void;
  bn?: boolean;
}

export default function MonthFilterBar({ value, onChange, bn = false }: MonthFilterBarProps) {
  const isFiltered = value.year !== 'ALL' || value.month !== 'ALL';

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2.5 shadow-xs no-print transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-2xs">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white">
              Financial Period:
            </span>{' '}
            <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1">
              {formatMonthFilterLabel(value, false)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Year Dropdown */}
          <select
            value={value.year}
            onChange={(e) => onChange({ ...value, year: e.target.value })}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer shadow-2xs focus:border-emerald-500 focus:outline-none"
            aria-label="Filter by Year"
          >
            <option value="ALL">All Years</option>
            <option value="2026">Year 2026</option>
            <option value="2025">Year 2025</option>
            <option value="2027">Year 2027</option>
          </select>

          {/* Month Dropdown (Replaces horizontal 12-month pill bar) */}
          <select
            value={value.month}
            onChange={(e) => {
              const m = e.target.value;
              onChange({
                month: m,
                year: value.year === 'ALL' && m !== 'ALL' ? '2026' : value.year,
              });
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer shadow-2xs focus:border-emerald-500 focus:outline-none"
            aria-label="Filter by Month"
          >
            <option value="ALL">All 12 Months</option>
            {MONTHS_12.map((m) => (
              <option key={m.code} value={m.code}>
                {m.fullEn} ({m.code})
              </option>
            ))}
          </select>

          {isFiltered && (
            <button
              type="button"
              onClick={() => onChange({ year: 'ALL', month: 'ALL' })}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
