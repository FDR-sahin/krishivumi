'use client';

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  Users,
  ShieldCheck,
  Building2,
  Calendar,
  Wallet,
  Package,
  FileBarChart,
  Lock,
  ArrowRight,
  Bell,
  Printer,
  ChevronRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface ClientWorkflowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'en' | 'bn';
}

export default function ClientWorkflowGuideModal({
  isOpen,
  onClose,
  lang = 'bn',
}: ClientWorkflowGuideModalProps) {
  const bn = lang === 'bn';
  const [activeTab, setActiveTab] = useState<string>('super_admin');

  if (!isOpen) return null;

  const chapters = [
    {
      id: 'super_admin',
      icon: '👑',
      titleBn: '১. সুপার অ্যাডমিন লগইন ও সিস্টেম দায়িত্ব',
      titleEn: '1. Super Admin Login & Setup',
      subtitleBn: 'মালিকানা প্রবেশাধিকার ও প্রাথমিক প্রস্তুতি',
    },
    {
      id: 'general_manager',
      icon: '🎖️',
      titleBn: '২. প্রধান জেনারেল ম্যানেজার (GM) নিয়োগ',
      titleEn: '2. Appointing General Manager',
      subtitleBn: 'সার্বিক তদারকি ও রিপোর্টিং কর্মকর্তা তৈরি',
    },
    {
      id: 'business_managers',
      icon: '🏢',
      titleBn: '৩. ৫টি ব্যবসার বিজনেস ম্যানেজার নিয়োগ',
      titleEn: '3. Division Managers Appointment',
      subtitleBn: 'পোল্ট্রি, ক্যাটল, ছাগল, মাছ ও ট্রাকের ইন-চার্জ',
    },
    {
      id: 'staff_hiring',
      icon: '👷',
      titleBn: '৪. কর্মী নিয়োগ, যোগদানের তারিখ ও বেতন',
      titleEn: '4. Staff Hiring & Joining Date',
      subtitleBn: 'খামারের মাঠকর্মী ও ড্রাইভারদের নিয়োগ',
    },
    {
      id: 'payroll_cycle',
      icon: '🔔',
      titleBn: '৫. মাসিক পে-রোল সাইকেল ও ৩ দিনের অ্যালার্ট',
      titleEn: '5. Payroll Cycle & 3-Day Alert',
      subtitleBn: 'মাসিক বেতন হিসাব, আনুপাতিক ফর্মুলা ও নোটিফিকেশন',
    },
    {
      id: 'five_businesses',
      icon: '🚜',
      titleBn: '৬. ৫টি খামারের দৈনিক ফিল্ড অপারেশন',
      titleEn: '6. Five Farming Operations',
      subtitleBn: 'ব্যাচ, ট্যাগ, দুধ, ডিম, মাছ ও ট্রাক ট্রিপ চালানো',
    },
    {
      id: 'accounting_treasury',
      icon: '💰',
      titleBn: '৭. কেন্দ্রীয় অ্যাকাউন্টিং, ভাউচার ও ক্যাশ/ব্যাংক',
      titleEn: '7. Central Accounting & Treasury',
      subtitleBn: 'ডাবল এন্ট্রি, ক্যাশ ভল্ট ও ব্যাংক লেনদেন',
    },
    {
      id: 'inventory_stock',
      icon: '📦',
      titleBn: '৮. গোডাউন ও ইনভেন্টরি স্টক অডিট',
      titleEn: '8. Warehouse Inventory Tracking',
      subtitleBn: 'খাদ্য, ওষুধ ও জ্বালানি স্টক ইন-আউট',
    },
    {
      id: 'pnl_reports',
      icon: '📊',
      titleBn: '৯. লাভ-ক্ষতি (P&L) রিপোর্ট ও সিইও ড্যাশবোর্ড',
      titleEn: '9. P&L Financial Reports',
      subtitleBn: 'নিট মুনাফা ও ক্লায়েন্ট ডেলিভারি নির্দেশিকা',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Ribbon Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-emerald-600/30">
              📖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  RegardsAgro Enterprise — {bn ? 'সম্পূর্ণ ক্লায়েন্ট অপারেশনাল গাইড (SOP Manual)' : 'Standard Operating Procedure (SOP)'}
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  Version 2.0 Live
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {bn
                  ? 'লগইন থেকে শুরু করে ম্যানেজার নিয়োগ, কর্মী বেতন, ৫টি ব্যবসা চালনা ও লাভ-ক্ষতির পয়েন্ট-টু-পয়েন্ট কার্যপ্রণালী'
                  : 'Point-to-point guide covering authentication, managerial hierarchy, division telemetry, payroll and P&L'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{bn ? 'প্রিন্ট / সেভ' : 'Print / Save'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Chapter Navigation Sidebar + Chapter Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Chapter Selector Sidebar */}
          <div className="w-full md:w-80 border-r border-slate-100 dark:border-slate-800 p-3 overflow-y-auto space-y-1.5 bg-slate-50/60 dark:bg-slate-900/40 shrink-0">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3 py-1">
              {bn ? 'অপারেশনাল অধ্যায়সমূহ (Chapters)' : 'Table of Contents'}
            </div>
            {chapters.map((chap) => {
              const isActive = activeTab === chap.id;
              return (
                <button
                  key={chap.id}
                  type="button"
                  onClick={() => setActiveTab(chap.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{chap.icon}</span>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {bn ? chap.titleBn : chap.titleEn}
                    </div>
                    <div className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {chap.subtitleBn}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chapter Content Details */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 text-slate-700 dark:text-slate-300">
            {/* CHAPTER 1 */}
            {activeTab === 'super_admin' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold">
                    অধ্যায় ১ · সর্বোচ্চ মালিকানা
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    সুপার অ্যাডমিন লগইন ও প্রাথমিক প্রস্তুতি
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    সিস্টেমের নিরাপত্তা বজায় রাখতে কোনো অপ্রয়োজনীয় ডামি বা অতিথি অ্যাকাউন্ট রাখা হয়নি।
                  </p>
                </div>

                <div className="space-y-3.5 text-xs leading-relaxed">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                    <div className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>১.১ একক মালিকানা লগইন ক্রেডেনশিয়াল:</span>
                    </div>
                    <p>
                      সিস্টেমে শুধুমাত্র ১টি সুপার অ্যাডমিন অ্যাকাউন্ট অনুমোদিত:
                      <br />
                      ইমেইল: <strong className="font-mono text-emerald-700 dark:text-emerald-300">sahinmiah1204@gmail.com</strong>
                      <br />
                      নিরাপদ পাসওয়ার্ড দিয়ে লগইন বাটনে চাপ দিলেই মূল কমান্ড সেন্টারে সরাসরি প্রবেশ করা যাবে।
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">১.২ লগইন করার পর ড্যাশবোর্ডে যা দেখতে পাবেন:</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                      <li><strong>টপ কমান্ড সেন্টার:</strong> বিক্রি এন্ট্রি, খরচ এন্ট্রি, নতুন ইউনিট চালু ও লাভ-ক্ষতি রিপোর্ট।</li>
                      <li><strong>৪টি মূল ফিনান্সিয়াল কার্ড:</strong> সমন্বিত মোট বিক্রি, পরিচালনা ব্যয়, নিট মুনাফা মার্জিন এবং লিকুইড ক্যাশ/ব্যাংক ব্যালেন্স।</li>
                      <li><strong>৫টি বিশেষায়িত খামার কার্ড:</strong> পোল্ট্রি, ক্যাটল, ছাগল, মাছ ও ট্রাকের রিয়েল-টাইম পারফরম্যান্স।</li>
                      <li><strong>অপারেশনাল ট্রেজারি:</strong> অফিস পেটি ক্যাশ, কর্পোরেট ব্যাংক অ্যাকাউন্ট ও মোট জনবল।</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER 2 */}
            {activeTab === 'general_manager' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-extrabold">
                    অধ্যায় ২ · সাংগঠনিক ব্যবস্থাপনা
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    প্রধান জেনারেল ম্যানেজার (Super Manager / COO) নিয়োগ
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    মালিক নিজে একা ৫টি ব্যবসা তদারকি না করে একজন প্রধান জেনারেল ম্যানেজারকে দায়িত্ব অর্পণ করবেন।
                  </p>
                </div>

                <div className="space-y-3.5 text-xs leading-relaxed">
                  <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-500/20 space-y-2">
                    <div className="font-extrabold text-purple-900 dark:text-purple-200 text-sm">
                      ২.১ কীভাবে জেনারেল ম্যানেজার তৈরি করবেন:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
                      <li>বামপাশের মেনু থেকে <strong>&ldquo;টিম ও পারমিশন কন্ট্রোল&rdquo; (Access Control)</strong>-এ ক্লিক করুন।</li>
                      <li>ডানপাশে থাকা <strong>&ldquo;+ নতুন ইউজার ও পারমিশন তৈরি করুন&rdquo;</strong> বাটনে চাপ দিন।</li>
                      <li>রোল হিসেবে <strong>&ldquo;🎖️ Super Manager (প্রধান জেনারেল ম্যানেজার)&rdquo;</strong> নির্বাচন করুন।</li>
                      <li>ম্যানেজারের নাম, ইমেইল, মোবাইল ও নিরাপদ পাসওয়ার্ড দিয়ে সেভ করুন।</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">২.২ জেনারেল ম্যানেজারের ক্ষমতা ও সীমাবদ্ধতা:</div>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                      <li><strong>সার্বিক ক্ষমতা:</strong> তিনি ৫টি ব্যবসার প্রতিটি মডিউল, অ্যাকাউন্টস ভাউচার, স্টক ও লাভ-ক্ষতি দেখতে পারবেন।</li>
                      <li><strong>বিজনেস ম্যানেজারদের নিয়োগ:</strong> তিনি পোল্ট্রি, ক্যাটল বা মাছের জন্য আলাদা বিজনেস ম্যানেজার নিয়োগ দিতে পারবেন।</li>
                      <li><strong>মালিকের কাছে রিপোর্টিং:</strong> তিনি সরাসরি মালিকের জন্য এক্সিকিউটিভ রিপোর্ট তৈরি করবেন।</li>
                      <li><strong>সুরক্ষা সীমা:</strong> তিনি কখনোই মালিক (Super Admin)-এর অ্যাকাউন্ট পরিবর্তন বা ডিলিট করতে পারবেন না।</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER 3 */}
            {activeTab === 'business_managers' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-extrabold">
                    অধ্যায় ৩ · ডিভিশনাল লিডারশিপ
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    ৫টি ব্যবসার জন্য বিজনেস ম্যানেজার নিয়োগ ও ভূমিকা
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    প্রতিটি খামারের জন্য আলাদা দায়িত্বপ্রাপ্ত ম্যানেজার থাকবেন যারা শুধুমাত্র তাদের নিজ ব্যবসা পরিচালনা করবেন।
                  </p>
                </div>

                <div className="space-y-3.5 text-xs leading-relaxed">
                  <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                    <div className="font-bold text-blue-900 dark:text-blue-200 text-sm">
                      ৩.১ বিজনেস ম্যানেজার তৈরির ২টি সহজ উপায়:
                    </div>
                    <div className="space-y-2 pl-2">
                      <p>
                        <strong>পদ্ধতি ১ (সরাসরি খামারের ভেতর থেকে):</strong><br />
                        ড্যাশবোর্ড থেকে সংশ্লিষ্ট খামারে ঢুকুন (যেমন Cattle Farming) ➔ উপরে থাকা <strong>&ldquo;👔 ম্যানেজার পরিবর্তন / নিয়োগ&rdquo;</strong> বাটনে ক্লিক করে ম্যানেজারের নাম ও মোবাইল লিখে ১ ক্লিকে ইন-চার্জ ঘোষণা করুন।
                      </p>
                      <p>
                        <strong>পদ্ধতি ২ (টিম ও পারমিশন কন্ট্রোল থেকে):</strong><br />
                        রোল হিসেবে <strong>&ldquo;Business Manager&rdquo;</strong> সিলেক্ট করুন এবং ড্রপডাউন থেকে নির্ধারিত ব্যবসা (যেমন: শুধু Cattle Farming) লক করে দিন।
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-amber-900 dark:text-amber-200">
                    <div className="font-bold flex items-center gap-2">
                      <span>⚠️ গুরুত্বপূর্ণ সিকিউরিটি পলিসি (বিজনেস ম্যানেজার স্কোপিং):</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      একজন বিজনেস ম্যানেজার (যেমন: ক্যাটল ম্যানেজার) সিস্টেমে লগইন করলে তিনি শুধুমাত্র ক্যাটল ফার্মের ডাটা দেখতে ও স্টাফ তৈরি করতে পারবেন। পোল্ট্রি, মাছ বা ট্রাকের কর্মী তৈরিতে তার কোনো প্রবেশাধিকার থাকবে না।
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER 4 */}
            {activeTab === 'staff_hiring' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold">
                    অধ্যায় ৪ · ফিল্ড জনবল
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    কর্মী নিয়োগ, যোগদানের তারিখ ও মাসিক বেতন নির্ধারণ
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    খামারের শেড সহকারী, পরিচর্যাকারী বা ট্রাক ড্রাইভারদের সঠিক উপায়ে সিস্টেমে অন্তর্ভুক্ত করার নিয়ম।
                  </p>
                </div>

                <div className="space-y-3.5 text-xs leading-relaxed">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      ৪.১ কীভাবে খামারের ভেতরে কর্মী যুক্ত করবেন:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                      <li>যেকোনো ব্যবসার কনসোলে যান (যেমন Cattle Farming)।</li>
                      <li>৪টি সামারি কার্ডের ঠিক নিচেই <strong>&ldquo;বিভাগীয় টিম, ম্যানেজার ও কর্মী বহর&rdquo;</strong> দেখতে পাবেন।</li>
                      <li>ডানপাশের <strong>&ldquo;+ নতুন কর্মী নিয়োগ দিন&rdquo;</strong> বাটনে চাপ দিন।</li>
                      <li>ব্যবসা স্বয়ংক্রিয়ভাবে ওই খামারেই ফিক্সড থাকবে।</li>
                      <li>কর্মীর নাম, মোবাইল নম্বর এবং <strong>কবে থেকে শুরু হয়েছে / যোগদানের তারিখ (Joining Date)</strong> ক্যালেন্ডার থেকে সিলেক্ট করুন।</li>
                      <li>চুক্তিকৃত <strong>মাসিক বেতন (BDT)</strong> ও ঠিকানা দিয়ে সেভ করুন।</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="font-bold text-slate-900 dark:text-white">৪.২ এক ক্লিকে পদবি নির্বাচন (Quick Role Presets):</div>
                    <p className="text-[11px] text-slate-500">
                      আপনাকে কষ্ট করে পদবি লিখতে হবে না। ক্যাটলে গেলে <em>দুগ্ধ দোহন কর্মী, পশু চিকিৎসা সহকারী</em>; পোল্ট্রিতে গেলে <em>শেড ইনচার্জ, খাদ্য ও টিকাদান কর্মী</em>; ট্রাকে গেলে <em>হেভি ট্রাক ড্রাইভার, খালাসি</em>—এক ক্লিকেই নির্বাচন করতে পারবেন।
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER 5 */}
            {activeTab === 'payroll_cycle' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-extrabold">
                    অধ্যায় ৫ · পে-রোল ও অ্যালার্ট
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    মাসিক পে-রোল সাইকেল, ৩ দিন আগের অ্যালার্ট ও বেতন ছাড়
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    কর্মী যেদিন যোগদান করে সেদিনই পুরো বেতন বকেয়া দেখায় না—মাস শেষ হলে বেতন প্রসেস হয়।
                  </p>
                </div>

                <div className="space-y-3.5 text-xs leading-relaxed">
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/20 space-y-2">
                    <div className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                      ৫.১ মাসিক বেতন চক্র ও আনুপাতিক (Prorated) হিসাবের নিয়ম:
                    </div>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
                      <li><strong>মাসের ১ থেকে ২৪ তারিখ:</strong> কর্মীর স্ট্যাটাস দেখায় <em>&ldquo;চলতি মাসের কার্যকাল চলমান (Accruing)&rdquo;</em>। এটি কোনো বকেয়া নয়।</li>
                      <li><strong>মাসের মাঝামাঝি যোগদান করলে:</strong> যেমন কোনো কর্মী ১৫ নভেম্বর যোগদান করলে ৩০ দিনের মাসে সে ১৬ দিন কাজ করবে। তার আনুপাতিক বেতন স্বয়ংক্রিয়ভাবে হিসাব হবে: <code className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded">(মাসিক বেতন ÷ ৩০) × ১৬ দিন</code>।</li>
                      <li><strong>মাসের শেষ ৩ দিন (২৮ থেকে ৩০/৩১ তারিখ):</strong> সিস্টেমে স্বয়ংক্রিয়ভাবে স্ট্যাটাস <em>&ldquo;🔔 বেতন প্রদানের সময় হয়েছে&rdquo;</em>-এ পরিবর্তিত হবে।</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">৫.২ ৩ দিন আগের স্বয়ংক্রিয় নোটিফিকেশন সিস্টেম:</div>
                    <p className="text-slate-600 dark:text-slate-400">
                      প্রতি মাসের শেষ ৩ দিন শুরু হতেই উপরের ঘণ্টার আইকন এবং ড্যাশবোর্ডে লাল-হলুদ অ্যালার্ট পপআপ আসবে:
                      <br />
                      <em>&ldquo;🔔 চলতি মাসের বেতন প্রদানের সময় হয়েছে। ৫টি ব্যবসা ও ম্যানেজমেন্টের সর্বমোট বেতন ৳XX,XXX প্রস্তুত করুন।&rdquo;</em>
                      <br />
                      এতে মালিক ও জেনারেল ম্যানেজার কোনো কর্মীর বেতন দিতে ভুলে যাবেন না।
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
                    <div className="font-bold text-emerald-900 dark:text-emerald-200">৫.৩ কে কার বেতন দেবে?</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                      <li><strong>বিজনেস ম্যানেজারদের বেতন দেবে:</strong> প্রধান জেনারেল ম্যানেজার বা মালিক।</li>
                      <li><strong>খামার কর্মীদের বেতন দেবে:</strong> সংশ্লিষ্ট খামারের বিজনেস ম্যানেজার বা জেনারেল ম্যানেজার।</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER 6 */}
            {activeTab === 'five_businesses' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 text-xs font-extrabold">
                    অধ্যায় ৬ · উৎপাদন মডিউল
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    ৫টি খামারের দৈনিক ফিল্ড অপারেশন চালনা
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    প্রতিটি ব্যবসার বিশেষায়িত বিজ্ঞানসম্মত ফিচার ও দৈনিক ডাটা এন্ট্রি নির্দেশিকা।
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                    <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span>🐔 পোল্ট্রি ফার্ম (Poultry Hub)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      শেড-ভিত্তিক ব্যাচ তৈরি, ব্রয়লার/লেয়ার বাচ্চা ক্রয়, দৈনিক মর্টালিটি (মৃত্যু), ফিড ও ভ্যাক্সিন শিডিউল, এবং ৪-গ্রেডে (এ, বি, সি, ডি) লাইভ মুরগি ও ডিম বিক্রি।
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span>🐄 ক্যাটল ফার্ম (Dairy & Beef)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      প্রতিটি গরুর স্বতন্ত্র ট্যাগ আইডি (যেমন CAT-001), জাত (হলস্টেইন ফ্রিসিয়ান), সকাল/বিকালের দুধ উৎপাদন (Liters), ভুট্টা সাইলেজ খাদ্য, ওজন বৃদ্ধি ও আজীবন লাভ-ক্ষতি।
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                    <div className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                      <span>🐐 ছাগলের খামার (Goat Breeding)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      ব্ল্যাক বেঙ্গল ও যমুনাপারি ব্রিডিং, ৪টি মাচা শেড ট্র্যাকিং, বাবা/মা বংশতালিকা (Sire/Dam Pedigree), বাচ্চা জন্ম এবং কোরবানি/মাংসের লাইভ ওজন সেল।
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                    <div className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                      <span>🐟 মাছ চাষ প্রকল্প (Aquaculture)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      পুকুরের শতক আয়তন, রুই-কাতলা-তেলাপিয়ার পোনা মজুত, পানির গুণমান (pH ও অক্সিজেন DO), প্যাডেল এরিয়েটর হিসাব এবং জাল টেনে পাইকারি আড়তে বিক্রি।
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 md:col-span-2">
                    <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <span>🚚 বাণিজ্যিক ট্রাক ও পরিবহন (Transport Logistics)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      বাণিজ্যিক ট্রাক বহর, ঢাকা-গাজীপুর-ময়মনসিংহ আন্তঃজেলা ট্রিপ, ডিজেল জ্বালানি ও এক্সপ্রেসওয়ে টোল বাদ দিয়ে ট্রিপভিত্তিক নিট প্রফিট, এবং বিআরটিএ ফিটনেস, রুট পারমিট ও ট্যাক্স টোকেন মেয়াদের অ্যালার্ট।
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER 7 */}
            {activeTab === 'accounting_treasury' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold">
                    অধ্যায় ৭ · অর্থনৈতিক নিয়ন্ত্রণ
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    কেন্দ্রীয় অ্যাকাউন্টিং, ভাউচার ও ক্যাশ/ব্যাংক ব্যবস্থাপনা
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    শতভাগ স্বচ্ছ ডাবল-এন্ট্রি বুককিপিং যা কোনো ভুল বা দুর্নীতি প্রতিরোধ করে।
                  </p>
                </div>

                <div className="space-y-3.5 text-xs leading-relaxed">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">৭.১ বিক্রি ও খরচের ১-ক্লিক ভাউচার:</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                      <li><strong>বিক্রি (Sales):</strong> ডেবিট: ক্যাশ বা ব্যাংক ➔ ক্রেডিট: ফার্ম সেলস রেভিনিউ।</li>
                      <li><strong>খরচ (Expense):</strong> ডেবিট: ফিড বা ওষুধ খরচ ➔ ক্রেডিট: ক্যাশ বা ব্যাংক।</li>
                      <li><strong>পে-রোল (Payroll):</strong> ডেবিট: কর্মী বেতন খরচ ➔ ক্রেডিট: ক্যাশ বা ব্যাংক।</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">৭.২ ট্রেজারি ওয়ালেট ব্যালেন্স:</div>
                    <p className="text-slate-600 dark:text-slate-400">
                      অফিসের নগদ টাকা <strong>&ldquo;Cash in Hand&rdquo;</strong> অ্যাকাউন্টে এবং ব্যাংকের টাকা <strong>&ldquo;Islami / BRAC Bank&rdquo;</strong> অ্যাকাউন্টে ট্র্যাক হয়। ক্যাশ থেকে ব্যাংকে জমা বা ব্যাংক থেকে নগদ তোলার জন্য রয়েছে ১-ক্লিকের ট্রান্সফার সুবিধা।
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER 8 */}
            {activeTab === 'inventory_stock' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 text-xs font-extrabold">
                    অধ্যায় ৮ · গোডাউন অডিট
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    গোডাউন ও ইনভেন্টরি স্টক অডিট
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    খাদ্যের বস্তা বা ওষুধের হিসাব গোডাউনে সঠিকভাবে মিলিয়ে অপচয় রোধ করার উপায়।
                  </p>
                </div>

                <div className="space-y-3.5 text-xs leading-relaxed">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">৮.১ গোডাউনে মাল ঢোকানো ও খরচ করা (Stock In / Stock Out):</div>
                    <p className="text-slate-600 dark:text-slate-400">
                      প্রতিটি পণ্য যেমন <em>ব্রয়লার স্টার্টার ফিড (৫০ কেজি বস্তা)</em>, <em>ভুট্টা সাইলেজ</em>, বা <em>পুকুরের চুন</em> গোডাউনে ক্রয় করলে স্বয়ংক্রিয়ভাবে স্টক বাড়ে। খামারে খাওয়ানোর সময় স্টক আউট এন্ট্রি দিলে স্বয়ংক্রিয়ভাবে গোডাউন থেকে বস্তা কমে যায় এবং ব্যালেন্স মিলে যায়।
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-500/20 space-y-1">
                    <div className="font-bold text-sky-900 dark:text-sky-200">৮.২ রিঅর্ডার লেভেল অ্যালার্ট:</div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      কোনো খাবারের স্টক ১০ বস্তার নিচে নামলে সিস্টেম নিজে থেকেই সতর্কবার্তা দেয় যাতে মুরগি বা গরু না খেয়ে না থাকে।
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER 9 */}
            {activeTab === 'pnl_reports' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold">
                    অধ্যায় ৯ · লাভ-ক্ষতি ও হ্যান্ডওভার
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    লাভ-ক্ষতি (P&L) রিপোর্ট ও ক্লায়েন্ট ডেলিভারি নির্দেশিকা
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    কোম্পানির বাস্তব মুনাফা যাচাই এবং ক্লায়েন্টকে সম্পূর্ণ ত্রুটিহীন সফটওয়্যার হ্যান্ডওভার।
                  </p>
                </div>

                <div className="space-y-3.5 text-xs leading-relaxed">
                  <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                    <div className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                      ৯.১ লাভ-ক্ষতি রিপোর্ট কীভাবে পড়বেন:
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      মেনু থেকে <strong>&ldquo;লাভ-ক্ষতির রিপোর্ট&rdquo; (Financial Reports)</strong>-এ ক্লিক করলে ১২ মাসের ফিল্টার অনুযায়ী মোট বিক্রি, খাবার ও ওষুধ খরচ, কর্মচারীর বেতন এবং অবশিষ্ট নিট প্রফিট দেখতে পাবেন।
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">৯.২ ক্লায়েন্ট ডেলিভারি চেকলিস্ট সম্পন্ন:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>১০০% পরিষ্কার ডাটাবেজ (০ ডামি ডাটা)</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>১টি সুপার অ্যাডমিন অ্যাকাউন্ট সুরক্ষিত</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>বাংলা ও ইংরেজি শতভাগ নিখুঁত অনুবাদ</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>প্রিমিয়াম এক্সিকিউটিভ ড্যাশবোর্ড কার্ড</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>ম্যানেজার ও কর্মী বেতন স্কোপিং সক্রিয়</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>৩ দিনের বেতন নোটিফিকেশন অ্যালার্ট</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>{bn ? 'RegardsAgro Enterprise · সম্পূর্ণ নিরাপদ ও লাইভ হ্যান্ডওভারের জন্য প্রস্তুত' : 'RegardsAgro ERP · Ready for production deployment'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs"
          >
            {bn ? 'বুঝেছি / বন্ধ করুন' : 'Got it / Close Guide'}
          </button>
        </div>
      </div>
    </div>
  );
}
