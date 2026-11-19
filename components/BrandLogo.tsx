'use client';

import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  whiteText?: boolean;
}

export default function BrandLogo({
  compact = false,
  subtitle = 'AGRO-INDUSTRIAL ERP',
  size = 'md',
  whiteText = false,
}: BrandLogoProps) {
  const boxSize =
    size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-9 w-9 rounded-xl';
  const svgSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
  const textSize = size === 'lg' ? 'text-xl sm:text-2xl' : size === 'sm' ? 'text-[15px]' : 'text-[16px]';

  return (
    <div className="inline-flex items-center gap-3 select-none">
      <div
        className={`${boxSize} bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 ring-1 ring-inset ring-white/20 shrink-0`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={svgSize}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Architectural leaf & modern dynamic agro monogram */}
          <path d="M12 21V9" />
          <path d="M12 13C12 8.5 15.5 5 20 5c0 4.5-3.5 8-8 8Z" fill="currentColor" fillOpacity="0.28" />
          <path d="M12 16C12 12 8.8 9 4.5 9c0 4 3.2 7 7.5 7Z" />
          <path d="M5 21h14" />
        </svg>
      </div>

      {!compact && (
        <div className="flex flex-col leading-tight min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-display ${textSize} font-black tracking-tight drop-shadow-sm truncate ${
                whiteText ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}
            >
              RegardsAgro
            </span>
            <span className="inline-flex items-center rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 ring-1 ring-inset ring-emerald-500/40">
              ERP
            </span>
          </div>
          {subtitle && (
            <span
              className={`mt-0.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase truncate ${
                whiteText ? 'text-emerald-300/80' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
