'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Loader2,
} from 'lucide-react';

export type ToastType = 'success' | 'delete' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  createdAt: number;
  durationMs: number;
}

export interface ConfirmDeletePayload {
  title?: string;
  message?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
}

const TOAST_EVENT = 'krishi_global_toast_event';
const CONFIRM_DELETE_EVENT = 'krishi_global_confirm_delete_event';

// Synthesize pleasant multi-sensory sound effects (zero network latency, never fails)
function playSound(type: ToastType) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'success') {
      // Crisp 2-tone positive chime (C5 -> G5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'delete') {
      // Soft downward double tone for clean deletion
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'error') {
      // Warning buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Audio autoplay restrictions or unsupported
  }
}

/**
 * Trigger an unmistakable, eye-catching floating Toast Popup from ANY component.
 */
export function triggerGlobalToast(
  message: string,
  type: ToastType = 'success',
  title?: string,
  durationMs = 4500
) {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent(TOAST_EVENT, {
    detail: {
      message,
      type,
      title:
        title ||
        (type === 'success'
          ? 'সফলভাবে সম্পন্ন হয়েছে!'
          : type === 'delete'
          ? 'রেকর্ড মুছে ফেলা হয়েছে!'
          : type === 'error'
          ? 'ত্রুটি পরিলক্ষিত হয়েছে'
          : 'তথ্য'),
      durationMs,
    },
  });
  window.dispatchEvent(event);
}

/**
 * Trigger a secure confirmation popup before deleting or removing ANY item.
 */
export function triggerConfirmDelete(payload: ConfirmDeletePayload) {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent(CONFIRM_DELETE_EVENT, { detail: payload });
  window.dispatchEvent(event);
}

export default function GlobalToastAndConfirmModal({ lang = 'en' }: { lang?: 'bn' | 'en' }) {
  const bn = false;
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmPayload, setConfirmPayload] = useState<ConfirmDeletePayload | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Listen for Toast events
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        message: string;
        type: ToastType;
        title: string;
        durationMs?: number;
      }>;
      const { message, type, title, durationMs = 4500 } = customEvent.detail;
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const newToast: ToastItem = {
        id,
        type,
        title,
        message,
        createdAt: Date.now(),
        durationMs,
      };

      setToasts((prev) => [newToast, ...prev].slice(0, 5));
      playSound(type);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    };

    window.addEventListener(TOAST_EVENT, handleToastEvent);
    return () => window.removeEventListener(TOAST_EVENT, handleToastEvent);
  }, []);

  // Listen for Confirm Delete events
  useEffect(() => {
    const handleConfirmEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ConfirmDeletePayload>;
      setConfirmPayload(customEvent.detail);
      setIsDeleting(false);
    };

    window.addEventListener(CONFIRM_DELETE_EVENT, handleConfirmEvent);
    return () => window.removeEventListener(CONFIRM_DELETE_EVENT, handleConfirmEvent);
  }, []);

  const handleExecuteDelete = async () => {
    if (!confirmPayload) return;
    setIsDeleting(true);
    try {
      await confirmPayload.onConfirm();
      triggerGlobalToast(
        confirmPayload.itemName
          ? bn
            ? `"${confirmPayload.itemName}" সফলভাবে মুছে ফেলা হয়েছে!`
            : `"${confirmPayload.itemName}" deleted successfully!`
          : bn
          ? 'রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে!'
          : 'Record deleted successfully!',
        'delete',
        bn ? 'মুছে ফেলা সম্পন্ন!' : 'Deleted!'
      );
      setConfirmPayload(null);
    } catch (err) {
      console.error('Delete error:', err);
      triggerGlobalToast(
        err instanceof Error ? err.message : String(err),
        'error',
        bn ? 'মুছে ফেলতে ব্যর্থ হয়েছে' : 'Failed to delete'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. FLOATING GLOBAL TOAST STACK (Always on top of EVERYTHING)    */}
      {/* ============================================================== */}
      <div className="fixed top-5 right-5 z-[9999999] pointer-events-none flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-3 sm:px-0">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isDelete = toast.type === 'delete';
          const isError = toast.type === 'error';

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-top-3 duration-300 ${
                isSuccess
                  ? 'border-emerald-500/70 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 ring-2 ring-emerald-500/20'
                  : isDelete
                  ? 'border-rose-500/70 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 ring-2 ring-rose-500/20'
                  : isError
                  ? 'border-amber-500/70 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 ring-2 ring-amber-500/20'
                  : 'border-blue-500/70 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 ring-2 ring-blue-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 shadow-xs ${
                    isSuccess
                      ? 'bg-emerald-600 text-white'
                      : isDelete
                      ? 'bg-rose-600 text-white'
                      : isError
                      ? 'bg-amber-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {isSuccess ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isDelete ? (
                    <Trash2 className="h-5 w-5" />
                  ) : isError ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <Info className="h-5 w-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {toast.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug break-words">
                    {toast.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Animated Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full ${
                    isSuccess
                      ? 'bg-emerald-500'
                      : isDelete
                      ? 'bg-rose-500'
                      : isError
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    animation: `toastProgress ${toast.durationMs}ms linear forwards`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 2. GLOBAL DELETE CONFIRMATION MODAL                            */}
      {/* ============================================================== */}
      {confirmPayload && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999998] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (!isDeleting && e.target === e.currentTarget) setConfirmPayload(null);
          }}
        >
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200 text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 ring-4 ring-rose-50 dark:ring-rose-950/40">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  {confirmPayload.title || (bn ? 'ডিলিট বা মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Deletion')}
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                  {bn ? 'সতর্কতা: এই কাজটি আর পূর্বাবস্থায় ফেরানো যাবে না!' : 'Warning: This action cannot be undone!'}
                </p>
              </div>
            </div>

            <div className="rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <p className="leading-relaxed">
                {confirmPayload.message ||
                  (bn
                    ? 'আপনি কি নিশ্চিতভাবে এই রেকর্ডটি ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলতে চান?'
                    : 'Are you sure you want to permanently delete this record from the database?')}
              </p>
              {confirmPayload.itemName && (
                <div className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 inline-block mt-1">
                  {confirmPayload.itemName}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmPayload(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {confirmPayload.cancelLabel || (bn ? 'না, বাতিল করুন' : 'Cancel')}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>{bn ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <span>{confirmPayload.confirmLabel || (bn ? 'হ্যাঁ, নিশ্চিত ডিলিট করুন' : 'Yes, Delete')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress animation keyframe */}
      <style jsx global>{`
        @keyframes toastProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </>
  );
}
