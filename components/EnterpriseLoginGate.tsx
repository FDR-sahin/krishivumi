'use client';

import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  Mail,
  KeyRound,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Sun,
  Moon,
  Building2,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { AuthenticatedErpUser } from '@/lib/auth';

interface EnterpriseLoginGateProps {
  hasSuperAdmin: boolean;
  lang?: 'en' | 'bn';
  onToggleLang?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onAuthenticated: (user: AuthenticatedErpUser) => void;
}

export default function EnterpriseLoginGate({
  hasSuperAdmin,
  lang = 'bn',
  onToggleLang,
  darkMode = false,
  onToggleDarkMode,
  onAuthenticated,
}: EnterpriseLoginGateProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        setErrorMsg(data.error || (bn ? 'লগইন ব্যর্থ হয়েছে। সঠিক ইমেইল ও পাসওয়ার্ড দিন।' : 'Authentication failed. Please verify credentials.'));
        return;
      }

      onAuthenticated(data.user);
    } catch {
      setErrorMsg(
        bn
          ? 'সার্ভারের সাথে সংযোগ করা যাচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন।'
          : 'Unable to connect to authentication server. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100 selection:bg-emerald-600 selection:text-white relative overflow-hidden">
      {/* Background Ambience / Privacy Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-40 right-10 w-[500px] h-[400px] bg-teal-500/10 blur-[140px] rounded-full" />
        <div className="absolute top-1/3 left-10 w-[400px] h-[300px] bg-slate-800/40 blur-[100px] rounded-full" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" subtitle={bn ? 'সংরক্ষিত এন্টারপ্রাইজ ইআরপি' : 'ENTERPRISE ERP PORTAL'} />
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
            <Lock className="h-3 w-3 text-emerald-400" />
            <span>{bn ? 'নিরাপদ এনক্রিপ্টেড প্রবেশদ্বার' : 'SSL 256-Bit Encrypted'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              title={bn ? 'থিম পরিবর্তন' : 'Toggle Theme'}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {onToggleLang && (
            <button
              type="button"
              onClick={onToggleLang}
              className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-bold text-slate-200 hover:bg-slate-700/80 transition-colors"
            >
              {lang === 'bn' ? 'English' : 'বাংলা'}
            </button>
          )}
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden space-y-6">
          {/* Top Security Line Accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

          <div className="p-6 sm:p-8 space-y-6">
            {/* Security Badge & Title */}
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-800/60 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>{bn ? 'সংরক্ষিত অভ্যন্তরীণ ইআরপি পোর্টাল' : 'Confidential Corporate ERP'}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isSetupMode
                  ? bn
                    ? 'সুপার অ্যাডমিন অ্যাকাউন্ট সেটআপ'
                    : 'Initialize Super Admin'
                  : bn
                  ? 'কোম্পানি ইআরপি কনসোলে সাইন ইন করুন'
                  : 'Sign In to ERP Portal'}
              </h1>

              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                {isSetupMode
                  ? bn
                    ? 'সিস্টেমে প্রথম ও একমাত্র সুপার অ্যাডমিন (মালিক) অ্যাকাউন্ট তৈরি করে ডাটাবেজ চালু করুন।'
                    : 'Create the sole Super Admin account to initialize your private ERP.'
                  : bn
                  ? 'রিগার্ডস এগ্রো এন্টারপ্রাইজ-এর অনুমোদিত পরিচালনা পর্ষদ ও কর্মীদের জন্য সংরক্ষিত প্রবেশদ্বার।'
                  : 'Authorized personnel portal for RegardsAgro Enterprise agro business operations.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {isSetupMode && (
                <div>
                  <label className="block mb-1.5 font-semibold text-slate-300">
                    {bn ? 'পূর্ণ নাম (Full Name) *' : 'Full Name *'}
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={bn ? 'যেমন: মোঃ শাহিন মিয়া (মালিক)' : 'e.g. Md. Sahin Miah (Owner)'}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block mb-1.5 font-semibold text-slate-300">
                  {bn ? 'অফিসিয়াল ইমেইল ঠিকানা (Email) *' : 'Official Email Address *'}
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@regardsagro.bd"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-2.5 font-mono text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-300">
                    {bn ? 'পাসওয়ার্ড (Password) *' : 'Password *'}
                  </label>
                </div>
                <div className="relative">
                  <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-9 pr-10 py-2.5 font-mono text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isSetupMode && (
                <div>
                  <label className="block mb-1.5 font-semibold text-slate-300">
                    {bn ? 'পাসওয়ার্ড নিশ্চিত করুন (Confirm Password) *' : 'Confirm Password *'}
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
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-2.5 font-mono text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 text-xs font-medium text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-60 cursor-pointer"
              >
                <span>
                  {submitting
                    ? bn
                      ? 'যাচাই করা হচ্ছে...'
                      : 'Verifying Credentials...'
                    : isSetupMode
                    ? bn
                      ? 'সুপার অ্যাডমিন তৈরি ও ইআরপি চালু করুন'
                      : 'Initialize Super Admin & Open Console'
                    : bn
                    ? 'নিরাপদ সাইন ইন করুন ও ইআরপিতে প্রবেশ করুন'
                    : 'Sign In to Private ERP Console'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Privacy & Anti-Crawler Notice */}
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
              <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                {bn
                  ? 'গোপনীয়তা রুল: এই পোর্টালটি গুগল সার্চ ইনডেক্সিং থেকে সম্পূর্ণ গোপন ও বিচ্ছিন্ন রাখা হয়েছে। অননুমোদিত প্রবেশ স্বয়ংক্রিয়ভাবে ব্লক করা হবে।'
                  : 'Strict Confidentiality: This ERP portal is blocked from Google search indexing. Unauthorized attempts are logged.'}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-400 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <span>© {new Date().getFullYear()} RegardsAgro Enterprise · Private Agro Multi-Business ERP · All Rights Reserved</span>
      </footer>
    </div>
  );
}
