'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  Mail,
  KeyRound,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { AuthenticatedErpUser } from '@/lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasSuperAdmin: boolean;
  lang?: 'en' | 'bn';
  onAuthenticated: (user: AuthenticatedErpUser) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  hasSuperAdmin,
  lang = 'bn',
  onAuthenticated,
}: AuthModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const bn = lang === 'bn';
  const isSetupMode = !hasSuperAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isSetupMode) {
      if (password.length < 6) {
        setErrorMsg(
          bn ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.'
        );
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(bn ? 'দুটি পাসওয়ার্ড মিলছে না।' : 'Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const endpoint = isSetupMode ? '/api/auth/register-super-admin' : '/api/auth/login';
      const bodyPayload = isSetupMode
        ? { displayName: displayName.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        user?: AuthenticatedErpUser;
      };

      if (!res.ok || !data.ok || !data.user) {
        setErrorMsg(data.error || (bn ? 'লগইন ব্যর্থ হয়েছে।' : 'Authentication failed.'));
        return;
      }

      onAuthenticated(data.user);
    } catch {
      setErrorMsg(
        bn
          ? 'সার্ভারের সাথে সংযোগ করা যাচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন।'
          : 'Unable to reach authentication server. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

        <div className="p-6 sm:p-7 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <BrandLogo size="sm" subtitle="MONGODB SECURE ACCESS" />
              <div className="pt-1">
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {isSetupMode
                    ? bn
                      ? 'সুপার অ্যাডমিন অ্যাকাউন্ট সেটআপ'
                      : 'Initialize Super Admin Account'
                    : bn
                    ? 'ইআরপি কনসোলে সাইন ইন করুন'
                    : 'Sign In to ERP Console'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isSetupMode
                    ? bn
                      ? 'সিস্টেমে এখনো কোনো সুপার অ্যাডমিন নেই। প্রথম ও একমাত্র সুপার অ্যাডমিন অ্যাকাউন্ট তৈরি করে ডাটাবেজ চালু করুন।'
                      : 'Create the sole Super Admin account to initialize RegardsAgro Enterprise. Once created, public signup locks automatically.'
                    : bn
                    ? 'আপনার সুপার অ্যাডমিন অথবা প্রদত্ত কর্মচারী ইমেইল ও পাসওয়ার্ড দিয়ে প্রবেশ করুন।'
                    : 'Enter your authorized Super Admin, Manager, or Staff credentials.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Single Super Admin Policy Notice */}
          <div
            className={`rounded-xl border px-3.5 py-2.5 text-[11px] flex items-start gap-2.5 ${
              isSetupMode
                ? 'border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
            }`}
          >
            {isSetupMode ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Lock className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            )}
            <span>
              {isSetupMode
                ? bn
                  ? 'নীতিমালা: পুরো সিস্টেমে মাত্র ১ জন সুপার অ্যাডমিন থাকবেন। পরবর্তীতে আপনি ভেতর থেকে স্টাফ ও ম্যানেজারদের অ্যাকাউন্ট ও পারমিশন দিতে পারবেন।'
                  : 'Policy: Only ONE Super Admin is permitted. Afterwards, you can create Manager & Staff accounts with granular permissions inside the console.'
                : bn
                ? 'পাবলিক রেজিস্ট্রেশন বন্ধ রয়েছে। নতুন স্টাফ অ্যাকাউন্ট শুধুমাত্র সুপার অ্যাডমিন তৈরি করতে পারবেন।'
                : 'Public registration is locked. Only the Super Admin can provision new employee or manager accounts.'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {isSetupMode && (
              <div>
                <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'পূর্ণ নাম (Full Name) *' : 'Super Admin Full Name *'}
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={bn ? 'যেমন: মোঃ শাহিন মিয়া' : 'e.g. Md. Sahin Miah'}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                {bn ? 'ইমেইল ঠিকানা (Email) *' : 'Email Address *'}
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@regardsagro.bd"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 font-mono text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                {bn ? 'পাসওয়ার্ড (Password) *' : 'Password *'}
              </label>
              <div className="relative">
                <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-10 py-2.5 font-mono text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isSetupMode && (
              <div>
                <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'পাসওয়ার্ড নিশ্চিত করুন *' : 'Confirm Password *'}
                </label>
                <div className="relative">
                  <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 font-mono text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-600"
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-60"
            >
              <span>
                {submitting
                  ? bn
                    ? 'যাচাই হচ্ছে...'
                    : 'Authenticating...'
                  : isSetupMode
                  ? bn
                    ? 'সুপার অ্যাডমিন তৈরি ও ড্যাশবোর্ড খুলুন'
                    : 'Create Super Admin & Launch ERP'
                  : bn
                  ? 'সাইন ইন করুন'
                  : 'Sign In to Workspace'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
