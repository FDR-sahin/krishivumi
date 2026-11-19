'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Scan,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Search,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import { ErpLivestockRecord } from '@/lib/erp-types';
import { triggerGlobalToast } from './GlobalToastAndConfirmModal';

interface LivestockBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  animals: ErpLivestockRecord[];
  onSelectAnimal: (animalId: string) => void;
  species: 'cattle' | 'goat';
  lang?: 'en' | 'bn';
}

export default function LivestockBarcodeScannerModal({
  isOpen,
  onClose,
  animals,
  onSelectAnimal,
  species,
  lang = 'bn',
}: LivestockBarcodeScannerModalProps) {
  const bn = lang === 'bn';
  const isCattle = species === 'cattle';

  const [scanInput, setScanInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<ErpLivestockRecord | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Play pleasant scanner beep sound (synthesized with Web Audio API)
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio not permitted or supported
    }
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          bn
            ? 'আপনার ব্রাউজারে ক্যামেরা সাপোর্ট নেই। নিচে বারকোড নম্বর লিখুন বা ইউএসবি স্ক্যানার ব্যবহার করুন।'
            : 'Camera access is not supported in this browser. Please type or use a USB scanner.'
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      setCameraError(
        bn
          ? 'ক্যামেরা চালু করা যায়নি (অনুমতি দিন অথবা নিচে ট্যাগ লিখুন/ইউএসবি স্ক্যানার গান ব্যবহার করুন)।'
          : 'Could not access camera. Please allow permission or enter Tag ID manually.'
      );
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Handle successful detection of an animal
  const handleAnimalDetected = (matched: ErpLivestockRecord) => {
    playBeep();
    setScannedResult(matched);
    onSelectAnimal(matched.id);
    triggerGlobalToast(
      bn
        ? `ট্যাগ "${matched.animalTag}" (${matched.name}) সফলভাবে স্ক্যান হয়েছে!`
        : `Tag "${matched.animalTag}" (${matched.name}) scanned successfully!`,
      'success'
    );
    setTimeout(() => {
      stopCamera();
      onClose();
    }, 900);
  };

  // Search/Match animal by input
  const processQuery = (rawQuery: string) => {
    const q = rawQuery.trim().toLowerCase();
    if (!q) return;

    const matched = animals.find(
      (a) =>
        a.animalTag.toLowerCase() === q ||
        a.animalTag.toLowerCase().includes(q) ||
        a.name.toLowerCase() === q ||
        a.id.toLowerCase() === q
    );

    if (matched) {
      handleAnimalDetected(matched);
    } else {
      triggerGlobalToast(
        bn
          ? `ট্যাগ বা কোড "${rawQuery}"-এর সাথে কোনো ${isCattle ? 'গরু' : 'ছাগল'} মেলেনি!`
          : `No ${isCattle ? 'cattle' : 'goat'} matches tag "${rawQuery}"!`,
        'info'
      );
    }
  };

  // BarcodeDetector interval loop if supported
  useEffect(() => {
    if (!cameraActive || !videoRef.current || !('BarcodeDetector' in window)) return;

    let isScanning = true;
    const detector = new (window as any).BarcodeDetector({
      formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a'],
    });

    const interval = setInterval(async () => {
      if (!isScanning || !videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes && barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue;
          if (rawValue) {
            isScanning = false;
            processQuery(rawValue);
          }
        }
      } catch {
        // detection frame skip
      }
    }, 400);

    return () => {
      isScanning = false;
      clearInterval(interval);
    };
  }, [cameraActive, animals]);

  // Focus input and optionally start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      setScanInput('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Scan className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {bn ? `${isCattle ? 'গরুর' : 'ছাগলের'} ইয়ার ট্যাগ ও বারকোড স্ক্যানার` : `Livestock Ear Tag & Barcode Scanner`}
              </h3>
              <p className="text-[11px] text-slate-500">
                {bn ? 'ক্যামেরা, ইউএসবি বারকোড রিডার গান অথবা ট্যাগ লিখে স্ক্যান করুন' : 'Scan via camera, USB barcode gun, or tag ID'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Camera Viewport / Scanner Target */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border-2 border-dashed border-emerald-500/40">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {cameraActive ? (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Visual Target Frame */}
                <div className="w-48 h-36 border-2 border-emerald-400 rounded-lg relative shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                  {/* Laser Scan line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-bounce" />
                  <div className="absolute -top-6 left-0 right-0 text-center">
                    <span className="text-[10px] font-mono font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded">
                      {bn ? 'বারকোড/কিউআর মাঝখানে রাখুন' : 'Align Barcode / QR Inside'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center space-y-2">
                <Camera className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 max-w-xs">
                  {cameraError || (bn ? 'ক্যামেরা চালু করা হচ্ছে...' : 'Initializing camera stream...')}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{bn ? 'ক্যামেরা আবার চেষ্টা করুন' : 'Retry Camera'}</span>
                </button>
              </div>
            )}

            {scannedResult && (
              <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center text-white p-4 animate-in fade-in">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2 animate-bounce" />
                <div className="text-base font-bold font-mono">{scannedResult.animalTag}</div>
                <div className="text-sm font-semibold">{scannedResult.name}</div>
                <div className="text-xs text-emerald-300 mt-1">
                  {bn ? 'স্ক্যান সম্পন্ন! তথ্য লোড হচ্ছে...' : 'Scan Successful! Loading records...'}
                </div>
              </div>
            )}
          </div>

          {/* Barcode Gun / Manual Scanner Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {bn ? 'বারকোড স্ক্যানার গান বা ট্যাগ ইনপুট (Hardware Scanner Input):' : 'Barcode Reader Input / Manual Tag:'}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    processQuery(scanInput);
                  }
                }}
                placeholder={isCattle ? 'CAT-0001 লিখে Enter দিন বা বারকোড গান টিপুন...' : 'GOAT-0001...'}
                className="w-full pl-9 pr-24 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <Scan className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => processQuery(scanInput)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white dark:bg-emerald-600 hover:opacity-90 cursor-pointer"
              >
                {bn ? 'খুঁজুন' : 'Search'}
              </button>
            </div>
          </div>

          {/* Quick-Test / Registered Animal Ear Tags */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{bn ? 'খামারের নিবন্ধিত ট্যাগ তালিকা (এক ক্লিকে টেস্ট স্ক্যান):' : 'Registered Animal Tags (1-Click Test Scan):'}</span>
              <span className="font-mono font-semibold">{animals.length} {bn ? 'টি' : 'tags'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {animals.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleAnimalDetected(a)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950/80 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  <QrCode className="h-3 w-3" />
                  <span>{a.animalTag}</span>
                  <span className="font-sans font-normal opacity-75">({a.name})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>{bn ? 'স্ক্যান সম্পন্ন হলে সাউন্ড বিপ বাজবে' : 'Audible beep on scan'}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 cursor-pointer"
          >
            {bn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
