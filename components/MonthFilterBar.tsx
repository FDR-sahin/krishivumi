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

export function formatMonthFilterLabel(filter: MonthFilterValue, bn = true): string {
  if (filter.year === 'ALL' && filter.month === 'ALL') {
    return bn ? 'সব ১২ মাস (সর্বমোট)' : 'All 12 Months (All Time)';
  }
  const mObj = MONTHS_12.find((m) => m.code === filter.month);
  const mLabel = mObj ? (bn ? mObj.fullBn : mObj.fullEn) : bn ? 'সব মাস' : 'All Months';
  const yLabel = filter.year === 'ALL' ? (bn ? 'সব বছর' : 'All Years') : filter.year;
  return `${mLabel} · ${yLabel}`;
}

interface MonthFilterBarProps {
  value: MonthFilterValue;
  onChange: (next: MonthFilterValue) => void;
  bn?: boolean;
}

export default function MonthFilterBar({ value, onChange, bn = true }: MonthFilterBarProps) {
  const isFiltered = value.year !== 'ALL' || value.month !== 'ALL';

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 shadow-2xs space-y-3 no-print">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white">
              {bn ? '১২ মাসের হিসাব ফিল্টার:' : '12-Month Period Filter:'}
            </span>{' '}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {formatMonthFilterLabel(value, bn)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={value.year}
            onChange={(e) => onChange({ ...value, year: e.target.value })}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100"
            aria-label="Filter by Year"
          >
            <option value="ALL">{bn ? 'সব বছর (All Years)' : 'All Years'}</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2027">2027</option>
          </select>

          {isFiltered && (
            <button
              type="button"
              onClick={() => onChange({ year: 'ALL', month: 'ALL' })}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{bn ? 'রিসেট' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 12-Month Quick Pill Strip */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ ...value, month: 'ALL' })}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
            value.month === 'ALL'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {bn ? 'সব ১২ মাস' : 'All 12M'}
        </button>

        {MONTHS_12.map((m) => {
          const active = value.month === m.code;
          return (
            <button
              key={m.code}
              type="button"
              onClick={() =>
                onChange({
                  year: value.year === 'ALL' ? '2026' : value.year,
                  month: m.code,
                })
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                active
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {bn ? m.shortBn : m.shortEn}
            </button>
          );
        })}
      </div>
    </div>
  );
}
