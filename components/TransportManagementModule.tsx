'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Printer,
  Eye,
  Trash2,
  X,
  Upload,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Navigation,
  Fuel,
  Wrench,
  Percent,
  FileSpreadsheet,
  Download,
  Users,
  CreditCard,
  Building2,
  Phone,
  MapPin,
  FileText,
  ShieldCheck,
  AlertCircle,
  Gauge,
  Layers,
  ChevronRight,
  Check,
  Receipt,
  UserCheck,
  Loader2,
  XCircle,
} from 'lucide-react';
import {
  ErpBusiness,
  ErpTransportOp,
  ErpJournalEntry,
  ErpAccount,
  ErpAuditLog,
  ErpStakeholder,
  ErpUser,
  UserRole,
  formatBDT,
} from '@/lib/erp-types';
import {
  createTransportOpRecord,
  updateTransportOpRecord,
  postDoubleEntryTransaction,
  deleteTransportOp,
} from '@/lib/erp-service';
import TripChallanModal from './TripChallanModal';
import CorporateTransportBillModal from './CorporateTransportBillModal';
import MonthlyTruckStatementModal from './MonthlyTruckStatementModal';
import { triggerGlobalToast, triggerConfirmDelete } from './GlobalToastAndConfirmModal';

interface TransportManagementModuleProps {
  activeBusiness: ErpBusiness;
  ops: ErpTransportOp[];
  journalEntries: ErpJournalEntry[];
  accounts: ErpAccount[];
  auditLogs: ErpAuditLog[];
  stakeholders?: ErpStakeholder[];
  erpUsers?: ErpUser[];
  currentUser?: ErpUser | { id?: string; email?: string; displayName?: string; photoUrl?: string } | null;
  userRole?: UserRole | string;
  ownerId: string;
  actorEmail: string;
  onNotify: (msg: string) => void;
  onBackToDashboard?: () => void;
  lang?: 'en' | 'bn';
}

type TransportTab =
  | 'dashboard'
  | 'vehicles'
  | 'garments'
  | 'trips'
  | 'fuel'
  | 'drivers'
  | 'maintenance'
  | 'expenses'
  | 'reports';

const MONTH_NAMES = [
  { code: '01', nameEn: 'January', nameBn: 'January' },
  { code: '02', nameEn: 'February', nameBn: 'February' },
  { code: '03', nameEn: 'March', nameBn: 'March' },
  { code: '04', nameEn: 'April', nameBn: 'April' },
  { code: '05', nameEn: 'May', nameBn: 'May' },
  { code: '06', nameEn: 'June', nameBn: 'June' },
  { code: '07', nameEn: 'July', nameBn: 'July' },
  { code: '08', nameEn: 'August', nameBn: 'August' },
  { code: '09', nameEn: 'September', nameBn: 'September' },
  { code: '10', nameEn: 'October', nameBn: 'October' },
  { code: '11', nameEn: 'November', nameBn: 'November' },
  { code: '12', nameEn: 'December', nameBn: 'December' },
];

interface GeoCoordinate {
  lat: number;
  lng: number;
  name: string;
}

const BANGLADESH_LOCATIONS: Record<string, GeoCoordinate> = {
  // Micro / Suburban Dhaka & Savar
  khagan: { lat: 23.8690, lng: 90.3195, name: 'Khagan Bazar (Birulia/Savar)' },
  birulia: { lat: 23.8690, lng: 90.3195, name: 'Birulia, Savar' },
  daffodil: { lat: 23.8690, lng: 90.3195, name: 'Daffodil / Khagan' },
  mirpur: { lat: 23.8070, lng: 90.3685, name: 'Mirpur, Dhaka' },
  savar: { lat: 23.8583, lng: 90.2667, name: 'Savar, Dhaka' },
  ashulia: { lat: 23.8967, lng: 90.3200, name: 'Ashulia, Savar' },
  depz: { lat: 23.9312, lng: 90.2831, name: 'DEPZ / Baipail' },
  baipail: { lat: 23.9312, lng: 90.2831, name: 'Baipail, Savar' },
  nischintapur: { lat: 23.9015, lng: 90.3015, name: 'Nischintapur, Ashulia' },
  gabtoli: { lat: 23.7845, lng: 90.3475, name: 'Gabtoli, Dhaka' },
  tejgaon: { lat: 23.7594, lng: 90.3920, name: 'Tejgaon, Dhaka' },
  uttara: { lat: 23.8759, lng: 90.3795, name: 'Uttara, Dhaka' },
  tongi: { lat: 23.8983, lng: 90.4042, name: 'Tongi' },
  gazipur: { lat: 23.9999, lng: 90.4203, name: 'Gazipur' },
  konabari: { lat: 24.0150, lng: 90.3320, name: 'Konabari, Gazipur' },
  valuka: { lat: 24.3820, lng: 90.3790, name: 'Valuka / Seedstor' },
  narayanganj: { lat: 23.6238, lng: 90.5000, name: 'Narayanganj' },
  // Major Districts & Ports
  chittagong: { lat: 22.3475, lng: 91.8123, name: 'Chittagong Port' },
  benapole: { lat: 23.0422, lng: 88.8965, name: 'Benapole Land Port' },
  bogra: { lat: 24.8465, lng: 89.3730, name: 'Bogra' },
  sylhet: { lat: 24.8949, lng: 91.8687, name: 'Sylhet' },
  khulna: { lat: 22.8456, lng: 89.5403, name: 'Khulna' },
  barisal: { lat: 22.7010, lng: 90.3535, name: 'Barisal' },
  rajshahi: { lat: 24.3745, lng: 88.6042, name: 'Rajshahi' },
  rangpur: { lat: 25.7439, lng: 89.2752, name: 'Rangpur' },
  mymensingh: { lat: 24.7471, lng: 90.4203, name: 'Mymensingh' },
  comilla: { lat: 23.4607, lng: 91.1809, name: 'Comilla' },
  feni: { lat: 23.0159, lng: 91.3976, name: 'Feni' },
  coxsbazar: { lat: 21.4272, lng: 92.0058, name: "Cox's Bazar" },
  tangail: { lat: 24.2513, lng: 89.9167, name: 'Tangail' },
  sirajganj: { lat: 24.4534, lng: 89.7008, name: 'Sirajganj' },
  jessore: { lat: 23.1664, lng: 89.2081, name: 'Jessore' },
  dinajpur: { lat: 25.6279, lng: 88.6332, name: 'Dinajpur' },
  kushtia: { lat: 23.9013, lng: 89.1205, name: 'Kushtia' },
  faridpur: { lat: 23.6071, lng: 89.8429, name: 'Faridpur' },
  pabna: { lat: 24.0044, lng: 89.2372, name: 'Pabna' },
  natore: { lat: 24.4206, lng: 89.0003, name: 'Natore' },
  habiganj: { lat: 24.3749, lng: 91.4155, name: 'Habiganj' },
  moulvibazar: { lat: 24.4829, lng: 91.7774, name: 'Moulvibazar' },
  sreemangal: { lat: 24.3065, lng: 91.7296, name: 'Sreemangal' },
  brahmanbaria: { lat: 23.9571, lng: 91.1119, name: 'Brahmanbaria' },
  noakhali: { lat: 22.8696, lng: 91.0994, name: 'Noakhali' },
};

function getHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const calculateHighwayDistance = (origin: string, destination: string): { km: number; routeName: string } => {
  const o = (origin || '').toLowerCase().trim();
  const d = (destination || '').toLowerCase().trim();
  if (!o || !d) return { km: 260, routeName: 'National Highway Route' };

  // Explicit pairs (Highest precision):
  const isKhagan = o.includes('khagan') || o.includes('khagon') || o.includes('birulia') || o.includes('daffodil') || o.includes('diu');
  const isKhaganDest = d.includes('khagan') || d.includes('khagon') || d.includes('birulia') || d.includes('daffodil') || d.includes('diu');

  const isMirpur = o.includes('mirpur') || o.includes('pallabi') || o.includes('kazipara') || o.includes('shewrapara');
  const isMirpurDest = d.includes('mirpur') || d.includes('pallabi') || d.includes('kazipara') || d.includes('shewrapara');

  const isAshulia = o.includes('ashulia') || o.includes('savar') || o.includes('depz') || o.includes('nischintapur') || o.includes('epz') || o.includes('baipail') || o.includes('hemayetpur');
  const isAshuliaDest = d.includes('ashulia') || d.includes('savar') || d.includes('depz') || d.includes('nischintapur') || d.includes('epz') || d.includes('baipail') || d.includes('hemayetpur');

  const isGazipur = o.includes('gazipur') || o.includes('konabari') || o.includes('tongi') || o.includes('joydebpur') || o.includes('kasimpur');
  const isGazipurDest = d.includes('gazipur') || d.includes('konabari') || d.includes('tongi') || d.includes('joydebpur') || d.includes('kasimpur');

  const isValuka = o.includes('valuka') || o.includes('bhaluka') || o.includes('seedstor') || o.includes('mymensingh');
  const isValukaDest = d.includes('valuka') || d.includes('bhaluka') || d.includes('seedstor') || d.includes('mymensingh');

  const isDhaka = o.includes('dhaka') || o.includes('tejgaon') || o.includes('kallayanpur') || o.includes('farmgate') || o.includes('dhanmondi') || o.includes('mohammadpur') || o.includes('motijheel') || o.includes('jatrabari');
  const isDhakaDest = d.includes('dhaka') || d.includes('tejgaon') || d.includes('kallayanpur') || d.includes('farmgate') || d.includes('dhanmondi') || d.includes('mohammadpur') || d.includes('motijheel') || d.includes('jatrabari');

  const isUttara = o.includes('uttara') || o.includes('airport') || o.includes('khilkhet') || o.includes('nikunja') || o.includes('abdullahpur');
  const isUttaraDest = d.includes('uttara') || d.includes('airport') || d.includes('khilkhet') || d.includes('nikunja') || d.includes('abdullahpur');

  const isGabtoli = o.includes('gabtoli') || o.includes('aminbazar');
  const isGabtoliDest = d.includes('gabtoli') || d.includes('aminbazar');

  const isCtgPort = d.includes('chittagong') || d.includes('chattogram') || d.includes('ctg') || d.includes('port') || d.includes('ocl') || d.includes('cfs') || d.includes('patenga') || d.includes('agrabad');
  const isCtgPortOrig = o.includes('chittagong') || o.includes('chattogram') || o.includes('ctg') || o.includes('port') || o.includes('ocl') || o.includes('cfs') || o.includes('patenga') || o.includes('agrabad');

  const isBenapole = d.includes('benapole') || d.includes('jessore') || d.includes('jashore');
  const isBenapoleOrig = o.includes('benapole') || o.includes('jessore') || o.includes('jashore');

  const isBogra = d.includes('bogra') || d.includes('bogura') || d.includes('sirajganj') || d.includes('rangpur');
  const isBograOrig = o.includes('bogra') || o.includes('bogura') || o.includes('sirajganj') || o.includes('rangpur');

  const isSylhet = d.includes('sylhet') || d.includes('habiganj') || d.includes('moulvibazar') || d.includes('sreemangal');
  const isSylhetOrig = o.includes('sylhet') || o.includes('habiganj') || o.includes('moulvibazar') || o.includes('sreemangal');

  const isKhulna = d.includes('khulna') || d.includes('mongla');
  const isComilla = d.includes('comilla') || d.includes('cumilla') || d.includes('feni');

  // 1. Direct Khagan Bazar Local Routes
  if ((isKhagan && isMirpurDest) || (isMirpur && isKhaganDest)) {
    return { km: 15, routeName: 'Khagan Bazar ➔ Mirpur (via Birulia Bridge & Beribadh Road)' };
  }
  if ((isKhagan && isAshuliaDest) || (isAshulia && isKhaganDest)) {
    return { km: 10, routeName: 'Khagan Bazar ➔ Savar/Ashulia (via Ashulia Road)' };
  }
  if ((isKhagan && isGabtoliDest) || (isGabtoli && isKhaganDest)) {
    return { km: 14, routeName: 'Khagan Bazar ➔ Gabtoli (via Beribadh Highway)' };
  }
  if ((isKhagan && isUttaraDest) || (isUttara && isKhaganDest)) {
    return { km: 18, routeName: 'Khagan Bazar ➔ Uttara / Airport (via Beribadh / Abdullahpur)' };
  }
  if ((isKhagan && isDhakaDest) || (isDhaka && isKhaganDest)) {
    return { km: 22, routeName: 'Khagan Bazar ➔ Dhaka Tejgaon (via Beribadh / Mirpur)' };
  }
  if ((isKhagan && isGazipurDest) || (isGazipur && isKhaganDest)) {
    return { km: 24, routeName: 'Khagan Bazar ➔ Gazipur / Konabari' };
  }
  if ((isKhagan && isCtgPort) || (isCtgPortOrig && isKhaganDest)) {
    return { km: 280, routeName: 'Khagan Bazar ➔ Chittagong Port (via N1 Highway)' };
  }
  if ((isKhagan && isBenapole) || (isBenapoleOrig && isKhaganDest)) {
    return { km: 250, routeName: 'Khagan Bazar ➔ Benapole Land Port (via Padma Bridge)' };
  }
  if ((isKhagan && isBogra) || (isBograOrig && isKhaganDest)) {
    return { km: 195, routeName: 'Khagan Bazar ➔ Bogra (via Bangabandhu Bridge)' };
  }

  // 2. Direct Mirpur Local & Highway Routes
  if ((isMirpur && isDhakaDest) || (isDhaka && isMirpurDest)) {
    return { km: 10, routeName: 'Mirpur ➔ Dhaka Tejgaon (via Begum Rokeya Sarani)' };
  }
  if ((isMirpur && isUttaraDest) || (isUttara && isMirpurDest)) {
    return { km: 15, routeName: 'Mirpur ➔ Uttara (via Kalshi Flyover / Airport Road)' };
  }
  if ((isMirpur && isGabtoliDest) || (isGabtoli && isMirpurDest)) {
    return { km: 6, routeName: 'Mirpur ➔ Gabtoli Terminal' };
  }
  if ((isMirpur && isAshuliaDest) || (isAshulia && isMirpurDest)) {
    return { km: 18, routeName: 'Mirpur ➔ Savar / Ashulia (via Gabtoli - Aminbazar)' };
  }
  if ((isMirpur && isGazipurDest) || (isGazipur && isMirpurDest)) {
    return { km: 26, routeName: 'Mirpur ➔ Gazipur / Konabari (via Abdullahpur)' };
  }
  if ((isMirpur && isCtgPort) || (isCtgPortOrig && isMirpurDest)) {
    return { km: 268, routeName: 'Mirpur ➔ Chittagong Port (via Mayor Hanif Flyover / N1)' };
  }
  if ((isMirpur && isBenapole) || (isBenapoleOrig && isMirpurDest)) {
    return { km: 235, routeName: 'Mirpur ➔ Benapole (via Babubazar / Padma Bridge)' };
  }
  if ((isMirpur && isBogra) || (isBograOrig && isMirpurDest)) {
    return { km: 205, routeName: 'Mirpur ➔ Bogra (via Gabtoli / N5 Highway)' };
  }
  if ((isMirpur && isSylhet) || (isSylhetOrig && isMirpurDest)) {
    return { km: 248, routeName: 'Mirpur ➔ Sylhet (via Kuril / N2 Highway)' };
  }

  // 3. Port & Major Highway Routes
  if (isAshulia && isCtgPort) return { km: 275, routeName: 'Ashulia ➔ Chittagong Port (via N1 Highway)' };
  if (isGazipur && isCtgPort) return { km: 290, routeName: 'Konabari/Gazipur ➔ Chittagong Port (via N1 Highway)' };
  if (isValuka && isCtgPort) return { km: 315, routeName: 'Valuka Seedstor ➔ Chittagong Port/OCL (via N1 Highway)' };
  if (isDhaka && isCtgPort) return { km: 260, routeName: 'Dhaka Tejgaon ➔ Chittagong Port (via N1 Highway)' };

  if (isAshulia && isBenapole) return { km: 245, routeName: 'Ashulia ➔ Benapole Land Port (via Padma Bridge)' };
  if (isGazipur && isBenapole) return { km: 260, routeName: 'Gazipur ➔ Benapole Land Port (via Padma Bridge)' };
  if (isValuka && isBenapole) return { km: 310, routeName: 'Valuka ➔ Benapole Land Port (via Padma Bridge)' };
  if (isDhaka && isBenapole) return { km: 240, routeName: 'Dhaka ➔ Benapole Land Port (via Padma Bridge)' };

  if (isAshulia && isBogra) return { km: 195, routeName: 'Ashulia ➔ Bogra (via Bangabandhu Bridge)' };
  if (isGazipur && isBogra) return { km: 190, routeName: 'Gazipur ➔ Bogra (via Bangabandhu Bridge)' };
  if (isDhaka && isBogra) return { km: 210, routeName: 'Dhaka ➔ Bogra (via N4 / N5 Highway)' };

  if (isAshulia && isSylhet) return { km: 260, routeName: 'Ashulia ➔ Sylhet (via N2 Highway)' };
  if (isGazipur && isSylhet) return { km: 245, routeName: 'Gazipur ➔ Sylhet (via N2 Highway)' };
  if (isDhaka && isSylhet) return { km: 240, routeName: 'Dhaka ➔ Sylhet (via N2 Highway)' };

  if (isDhaka && isKhulna) return { km: 265, routeName: 'Dhaka ➔ Khulna / Mongla (via Padma Bridge)' };
  if (isDhaka && isComilla) return { km: 105, routeName: 'Dhaka ➔ Comilla (via Meghna Bridge)' };

  if (isAshulia && isDhaka) return { km: 35, routeName: 'Ashulia ➔ Dhaka Tejgaon' };
  if (isGazipur && isDhaka) return { km: 38, routeName: 'Gazipur ➔ Dhaka Tejgaon' };
  if (isValuka && isDhaka) return { km: 90, routeName: 'Valuka ➔ Dhaka Tejgaon' };

  if (o === d) return { km: 15, routeName: `${origin} (Intra-Zone Transfer)` };

  // 4. Intelligent Coordinate Lookup for other Bangladesh pairs
  let coordOrig: GeoCoordinate | null = null;
  let coordDest: GeoCoordinate | null = null;

  for (const [key, geo] of Object.entries(BANGLADESH_LOCATIONS)) {
    if (!coordOrig && o.includes(key)) coordOrig = geo;
    if (!coordDest && d.includes(key)) coordDest = geo;
    if (coordOrig && coordDest) break;
  }

  if (coordOrig && coordDest) {
    const aerialKm = getHaversineKm(coordOrig.lat, coordOrig.lng, coordDest.lat, coordDest.lng);
    const roadFactor = aerialKm < 40 ? 1.65 : 1.30;
    const roadDist = Math.max(8, Math.round(aerialKm * roadFactor));
    return { km: roadDist, routeName: `${coordOrig.name} ➔ ${coordDest.name} (National Highway)` };
  }

  return { km: 260, routeName: `${origin} ➔ ${destination} (National Highway)` };
};

export default function TransportManagementModule({
  activeBusiness,
  ops,
  journalEntries,
  accounts,
  auditLogs,
  stakeholders = [],
  erpUsers = [],
  currentUser,
  userRole = 'super_admin',
  ownerId,
  actorEmail,
  onNotify,
  onBackToDashboard,
  lang = 'en',
}: TransportManagementModuleProps) {
  const bn = false;

  // 1. Navigation & Global State
  const [activeTab, setActiveTab] = useState<TransportTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedTruckFilter, setSelectedTruckFilter] = useState<string>('ALL');
  const [selectedTripStatusFilter, setSelectedTripStatusFilter] = useState<string>('ALL');
  const [tripSearchQuery, setTripSearchQuery] = useState('');

  // Driver Table Filters (Excel View)
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [driverTruckFilter, setDriverTruckFilter] = useState('ALL');
  const [driverStatusFilter, setDriverStatusFilter] = useState('ALL');

  // Fleet / Truck Table Filters
  const [truckSearchQuery, setTruckSearchQuery] = useState('');
  const [truckStatusFilter, setTruckStatusFilter] = useState('ALL');
  const [truckBodyTypeFilter, setTruckBodyTypeFilter] = useState('ALL');
  const [truckContractFilter, setTruckContractFilter] = useState<'ALL' | 'garments' | 'open'>('ALL');

  // Truck Details Profile Modal State
  const [selectedTruckForDetails, setSelectedTruckForDetails] = useState<ErpTransportOp | null>(null);
  const [truckDetailsActiveTab, setTruckDetailsActiveTab] = useState<'overview' | 'trips' | 'fuel' | 'maintenance'>('overview');

  // Garments & Corporate Dedicated Contracts State
  const [garmentsSearchQuery, setGarmentsSearchQuery] = useState('');
  const [garmentsBillingFilter, setGarmentsBillingFilter] = useState<'ALL' | 'day_trip' | 'monthly'>('ALL');
  const [showAddGarmentsModal, setShowAddGarmentsModal] = useState(false);
  const [editingGarmentsContract, setEditingGarmentsContract] = useState<ErpTransportOp | null>(null);
  const [selectedGarmentsForDetails, setSelectedGarmentsForDetails] = useState<any | null>(null);
  const [garmentsClientName, setGarmentsClientName] = useState('');
  const [garmentsLocation, setGarmentsLocation] = useState('');
  const [garmentsContactPerson, setGarmentsContactPerson] = useState('');
  const [garmentsContactPhone, setGarmentsContactPhone] = useState('');
  const [garmentsBillingType, setGarmentsBillingType] = useState<'day_trip' | 'monthly'>('day_trip');
  const [garmentsAgreedRate, setGarmentsAgreedRate] = useState<number>(15000);
  const [garmentsAssignedTrucks, setGarmentsAssignedTrucks] = useState<string[]>([]);
  const [garmentsStartDate, setGarmentsStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [garmentsStatus, setGarmentsStatus] = useState<'active' | 'paused' | 'completed'>('active');
  const [garmentsRemarks, setGarmentsRemarks] = useState('');

  // ── Start Garments Trip Modal State ────────────────────────────────
  const [showQuickGarmentsDispatchModal, setShowQuickGarmentsDispatchModal] = useState(false);
  const [quickDispatchContract, setQuickDispatchContract] = useState<ErpTransportOp | null>(null);
  const [quickDispatchTruck, setQuickDispatchTruck] = useState('');
  const [quickDispatchDest, setQuickDispatchDest] = useState('Chittagong Port (Incoterm CFS)');
  const [quickDispatchDate, setQuickDispatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quickDispatchDurationDays, setQuickDispatchDurationDays] = useState<number>(2);
  const [quickDispatchReturnDate, setQuickDispatchReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [quickDispatchFare, setQuickDispatchFare] = useState<number>(14500);
  const [quickDispatchDemurrage, setQuickDispatchDemurrage] = useState<number>(0);
  const [quickDispatchDemurrageDays, setQuickDispatchDemurrageDays] = useState<number>(0);
  const [quickDispatchDemurrageDailyRate, setQuickDispatchDemurrageDailyRate] = useState<number>(3000);
  const [quickDispatchDemurrageReason, setQuickDispatchDemurrageReason] = useState<string>('Factory Unloading Delay (Exceeded 24h standard)');
  const [quickDispatchDriverDelayKhoraki, setQuickDispatchDriverDelayKhoraki] = useState<number>(0);
  const [quickDispatchAdvance, setQuickDispatchAdvance] = useState<number>(0);
  const [quickDispatchKhoraki, setQuickDispatchKhoraki] = useState<number>(2000);
  const [quickDispatchCargo, setQuickDispatchCargo] = useState('RMG Garments Export Cartons');
  const [quickDispatchChallanNo, setQuickDispatchChallanNo] = useState('');
  const [quickDispatchOrderNo, setQuickDispatchOrderNo] = useState('');

  // Corporate Transport Bill Modal State (A4 Printable Invoice with Rent + Demurrage)
  const [showCorporateBillModal, setShowCorporateBillModal] = useState(false);
  const [selectedCorporateBillContract, setSelectedCorporateBillContract] = useState<ErpTransportOp | null>(null);

  // Collect Garments Client Monthly Bill Modal State
  const [showCollectClientBillModal, setShowCollectClientBillModal] = useState(false);
  const [targetClientForBill, setTargetClientForBill] = useState<any | null>(null);
  const [clientBillPayAmount, setClientBillPayAmount] = useState<number>(0);
  const [clientBillPayDate, setClientBillPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [clientBillWalletId, setClientBillWalletId] = useState('');
  const [clientBillNotes, setClientBillNotes] = useState('');

  // Monthly Truck Statement Modal State (Per-Truck Month Filter & PDF Statement)
  const [showTruckMonthlyStatementModal, setShowTruckMonthlyStatementModal] = useState(false);
  const [selectedTruckForStatement, setSelectedTruckForStatement] = useState<ErpTransportOp | null>(null);
  const [statementSelectedMonth, setStatementSelectedMonth] = useState<string>('ALL');
  const [truckDetailsSelectedMonth, setTruckDetailsSelectedMonth] = useState<string>('ALL');

  // View Mode Toggles for Garments Presentation
  const [garmentsViewMode, setGarmentsViewMode] = useState<'companies' | 'trucks'>('companies');

  // Modals
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showSettlePaymentModal, setShowSettlePaymentModal] = useState(false);
  const [selectedTripChallan, setSelectedTripChallan] = useState<ErpTransportOp | null>(null);
  const [viewImageTrip, setViewImageTrip] = useState<ErpTransportOp | null>(null);
  const [targetTripForPayment, setTargetTripForPayment] = useState<ErpTransportOp | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Edit Trip Modal State ──────────────────────────────────────────────
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<ErpTransportOp | null>(null);
  const [editTripFare, setEditTripFare] = useState<number>(0);
  const [editTripAdvance, setEditTripAdvance] = useState<number>(0);
  const [editTripDiesel, setEditTripDiesel] = useState<number>(0);
  const [editTripToll, setEditTripToll] = useState<number>(0);
  const [editTripFerry, setEditTripFerry] = useState<number>(0);
  const [editTripKhoraki, setEditTripKhoraki] = useState<number>(0);
  const [editTripPolice, setEditTripPolice] = useState<number>(0);
  const [editTripLabour, setEditTripLabour] = useState<number>(0);
  const [editTripCommission, setEditTripCommission] = useState<number>(0);
  const [editTripDriverCommission, setEditTripDriverCommission] = useState<number>(0);
  const [editTripDriverCommPercent, setEditTripDriverCommPercent] = useState<number | ''>('');
  const [editTripOther, setEditTripOther] = useState<number>(0);
  const [editTripCustomer, setEditTripCustomer] = useState('');
  const [editTripOrigin, setEditTripOrigin] = useState('');
  const [editTripDestination, setEditTripDestination] = useState('');
  const [editTripCargo, setEditTripCargo] = useState('');
  const [editTripDriver, setEditTripDriver] = useState('');
  const [editTripDriverPhone, setEditTripDriverPhone] = useState('');
  const [editTripRemarks, setEditTripRemarks] = useState('');
  const [editTripDistanceKm, setEditTripDistanceKm] = useState<number>(0);
  const [editTripReturnDate, setEditTripReturnDate] = useState('');
  const [editTripDemurrageAmount, setEditTripDemurrageAmount] = useState<number>(0);
  const [editTripDemurrageDays, setEditTripDemurrageDays] = useState<number>(0);
  const [editTripDemurrageDailyRate, setEditTripDemurrageDailyRate] = useState<number>(3000);
  const [editTripDemurrageReason, setEditTripDemurrageReason] = useState<string>('Factory Unloading Delay');

  // ── Edit Truck/Vehicle Modal State ─────────────────────────────────────
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<ErpTransportOp | null>(null);
  const [editVehReg, setEditVehReg] = useState('');
  const [editVehName, setEditVehName] = useState('');
  const [editVehDriver, setEditVehDriver] = useState('');
  const [editVehDriverPhone, setEditVehDriverPhone] = useState('');
  const [editVehOdometer, setEditVehOdometer] = useState<number>(0);
  const [editVehCapacity, setEditVehCapacity] = useState<number>(0);
  const [editVehBodyType, setEditVehBodyType] = useState('covered');
  const [editVehTaxToken, setEditVehTaxToken] = useState('');
  const [editVehFitness, setEditVehFitness] = useState('');
  const [editVehInsurance, setEditVehInsurance] = useState('');
  const [editVehRoutePermit, setEditVehRoutePermit] = useState('');
  const [editVehStatus, setEditVehStatus] = useState<string>('available');
  const [editVehAssignedGarments, setEditVehAssignedGarments] = useState('');

  // Drill-down Detail Modals requested by user
  const [showTodayIncomeModal, setShowTodayIncomeModal] = useState(false);
  const [showTodayExpenseModal, setShowTodayExpenseModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showMonthlyRevenueModal, setShowMonthlyRevenueModal] = useState(false);
  const [showMonthlyExpenseModal, setShowMonthlyExpenseModal] = useState(false);

  // Helper to normalize registration numbers (merges DHAKA-METRO-T-12-3456 and DHAKA-METRO-TA-12-3456)
  const normalizeReg = useCallback((reg?: string | null): string => {
    if (!reg) return '';
    let s = reg.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
    s = s.replace(/METROT(?=[0-9])/g, 'METROTA');
    s = s.replace(/METROTA+/g, 'METROTA');
    return s;
  }, []);

  // Helper to clean truck name of unwanted price/annotation artifacts
  const cleanTruckName = useCallback((name?: string | null): string => {
    if (!name) return 'Heavy Truck';
    return name
      .replace(/\(Price:\s*BDT\s*[,.\s0-9]*\)/gi, '')
      .replace(/\(Farm Freight Truck\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Heavy Truck';
  }, []);

  // Helper to normalize client/company names (handles SAHIN.dev, sahin dev, Ananta Apparels Ltd., etc.)
  const normalizeClientName = useCallback((name?: string | null): string => {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  }, []);

  // 2. Extracted Data Partitions (Vehicles, Trips, Fuel, Maintenance, Drivers, Expenses)
  const allVehicles = useMemo(() => {
    // Default 7 Fleet Trucks (User specified fleet of 7 trucks)
    const default7Fleet: ErpTransportOp[] = [
      {
        id: 'fleet-truck-1',
        tripOrVehicleCode: 'TRK-01',
        recordType: 'vehicle',
        businessId: activeBusiness.id,
        registrationNumber: 'DHAKA-METRO-TA-11-2233',
        vehicleType: 'Covered Van',
        truckName: 'Tata 1618 Covered Van (15 Ton)',
        driverName: 'Md. Kalam Hossain',
        driverPhone: '01711-223344',
        capacityTons: 15,
        currentOdometer: 64200,
        truckBodyType: 'covered',
        taxTokenExpiry: '2027-08-30',
        fitnessExpiry: '2027-09-15',
        insuranceExpiry: '2027-11-30',
        routePermitExpiry: '2028-01-10',
        status: 'active',
        origin: 'Dhaka',
        destination: 'Chittagong',
        cargoDetails: 'Garments Goods',
        customerName: 'Ananta Apparels Ltd.',
        fuelCost: 0,
        tollCost: 0,
        maintenanceCost: 0,
        maintenanceDetails: '',
        distanceKm: 0,
      },
      {
        id: 'fleet-truck-2',
        tripOrVehicleCode: 'TRK-02',
        recordType: 'vehicle',
        businessId: activeBusiness.id,
        registrationNumber: 'DHAKA-METRO-TA-12-3456',
        vehicleType: 'Heavy Truck',
        truckName: 'Ashok Leyland 1616 (16 Ton)',
        driverName: 'Abdul Karim',
        driverPhone: '01722-334455',
        capacityTons: 16,
        currentOdometer: 78500,
        truckBodyType: 'open',
        taxTokenExpiry: '2027-06-20',
        fitnessExpiry: '2027-07-15',
        insuranceExpiry: '2027-10-10',
        routePermitExpiry: '2027-12-25',
        status: 'active',
        origin: 'Gazipur',
        destination: 'Chittagong Port',
        cargoDetails: 'Fabric & Denim Roll',
        customerName: 'Ha-Meem Denim & Garments',
        fuelCost: 0,
        tollCost: 0,
        maintenanceCost: 0,
        maintenanceDetails: '',
        distanceKm: 0,
      },
      {
        id: 'fleet-truck-3',
        tripOrVehicleCode: 'TRK-03',
        recordType: 'vehicle',
        businessId: activeBusiness.id,
        registrationNumber: 'DHAKA-METRO-TA-13-4455',
        vehicleType: 'Covered Van',
        truckName: 'Eicher Pro 3015 (12 Ton)',
        driverName: 'Jamal Uddin',
        driverPhone: '01833-445566',
        capacityTons: 12,
        currentOdometer: 42100,
        truckBodyType: 'covered',
        taxTokenExpiry: '2027-09-10',
        fitnessExpiry: '2027-10-05',
        insuranceExpiry: '2027-12-01',
        routePermitExpiry: '2028-02-15',
        status: 'active',
        origin: 'Ashulia',
        destination: 'Dhaka Airport Cargo',
        cargoDetails: 'RMG Export Carton',
        customerName: 'Ha-Meem Denim & Garments',
        fuelCost: 0,
        tollCost: 0,
        maintenanceCost: 0,
        maintenanceDetails: '',
        distanceKm: 0,
      },
      {
        id: 'fleet-truck-4',
        tripOrVehicleCode: 'TRK-04',
        recordType: 'vehicle',
        businessId: activeBusiness.id,
        registrationNumber: 'DHAKA-METRO-TA-14-5566',
        vehicleType: 'Heavy Trailer',
        truckName: 'Tata LPT 2518 (25 Ton)',
        driverName: 'Md. Rafiqul Islam',
        driverPhone: '01944-556677',
        capacityTons: 25,
        currentOdometer: 95400,
        truckBodyType: 'trailer',
        taxTokenExpiry: '2027-05-18',
        fitnessExpiry: '2027-06-30',
        insuranceExpiry: '2027-09-22',
        routePermitExpiry: '2027-11-15',
        status: 'active',
        origin: 'Ashulia',
        destination: 'Chittagong Port',
        cargoDetails: 'Export Container / Garments Carton',
        customerName: 'Ananta Apparels Ltd.',
        fuelCost: 0,
        tollCost: 0,
        maintenanceCost: 0,
        maintenanceDetails: '',
        distanceKm: 0,
      },
      {
        id: 'fleet-truck-5',
        tripOrVehicleCode: 'TRK-05',
        recordType: 'vehicle',
        businessId: activeBusiness.id,
        registrationNumber: 'DHAKA-METRO-TA-15-6677',
        vehicleType: 'Covered Van',
        truckName: 'Mahindra Blazo 25 (18 Ton)',
        driverName: 'Sumon Mia',
        driverPhone: '01755-667788',
        capacityTons: 18,
        currentOdometer: 38900,
        truckBodyType: 'covered',
        taxTokenExpiry: '2027-11-15',
        fitnessExpiry: '2027-12-20',
        insuranceExpiry: '2028-02-10',
        routePermitExpiry: '2028-04-01',
        status: 'active',
        origin: 'Valuka',
        destination: 'Dhaka Head Office',
        cargoDetails: 'Garments & Knitwear Goods',
        customerName: 'Square Fashions Ltd.',
        fuelCost: 0,
        tollCost: 0,
        maintenanceCost: 0,
        maintenanceDetails: '',
        distanceKm: 0,
      },
      {
        id: 'fleet-truck-6',
        tripOrVehicleCode: 'TRK-06',
        recordType: 'vehicle',
        businessId: activeBusiness.id,
        registrationNumber: 'DHAKA-METRO-TA-16-7788',
        vehicleType: 'Open Truck',
        truckName: 'Isuzu Forward FVR (14 Ton)',
        driverName: 'Harunur Rashid',
        driverPhone: '01866-778899',
        capacityTons: 14,
        currentOdometer: 51200,
        truckBodyType: 'open',
        taxTokenExpiry: '2027-07-25',
        fitnessExpiry: '2027-08-30',
        insuranceExpiry: '2027-10-18',
        routePermitExpiry: '2027-12-10',
        status: 'active',
        origin: 'Dhaka',
        destination: 'Bogra',
        cargoDetails: 'General Commercial Freight',
        customerName: 'Open Market Transport',
        fuelCost: 0,
        tollCost: 0,
        maintenanceCost: 0,
        maintenanceDetails: '',
        distanceKm: 0,
      },
      {
        id: 'fleet-truck-7',
        tripOrVehicleCode: 'TRK-07',
        recordType: 'vehicle',
        businessId: activeBusiness.id,
        registrationNumber: 'DHAKA-METRO-TA-17-8899',
        vehicleType: 'Flatbed Trailer',
        truckName: 'Hino 500 Heavy Prime (22 Ton)',
        driverName: 'Anowar Hossain',
        driverPhone: '01977-889900',
        capacityTons: 22,
        currentOdometer: 62400,
        truckBodyType: 'trailer',
        taxTokenExpiry: '2027-10-05',
        fitnessExpiry: '2027-11-12',
        insuranceExpiry: '2028-01-20',
        routePermitExpiry: '2028-03-15',
        status: 'active',
        origin: 'Dhaka',
        destination: 'Khulna / Mongla',
        cargoDetails: 'Commercial Steel & Machinery',
        customerName: 'Open Market Transport',
        fuelCost: 0,
        tollCost: 0,
        maintenanceCost: 0,
        maintenanceDetails: '',
        distanceKm: 0,
      },
      {
        id: 'fleet-truck-8',
        tripOrVehicleCode: 'TRK-08',
        recordType: 'vehicle',
        businessId: activeBusiness.id,
        registrationNumber: 'DHAKA-METRO-TA-20-9171',
        vehicleType: 'Heavy Truck',
        truckName: 'Tata 1615 Cargo Truck (15 Ton)',
        driverName: 'Md. Tariqul Islam',
        driverPhone: '01719-714211',
        capacityTons: 15,
        currentOdometer: 58000,
        truckBodyType: 'covered',
        taxTokenExpiry: '2027-10-10',
        fitnessExpiry: '2027-11-15',
        insuranceExpiry: '2028-01-10',
        routePermitExpiry: '2028-03-20',
        status: 'active',
        origin: 'Valuka',
        destination: 'OCL Chittagong',
        cargoDetails: 'Export Footwear & RMG Cargo',
        customerName: 'Global Shoes Ltd',
        fuelCost: 0,
        tollCost: 0,
        maintenanceCost: 0,
        maintenanceDetails: '',
        distanceKm: 0,
      },
      {
        id: 'fleet-truck-9',
        tripOrVehicleCode: 'TRK-09',
        recordType: 'vehicle',
        businessId: activeBusiness.id,
        registrationNumber: 'DHAKA-METRO-TA-11-8393',
        vehicleType: 'Covered Van',
        truckName: 'Bedford Covered Van (14 Ton)',
        driverName: 'Md. Shahidul Islam',
        driverPhone: '01707-300599',
        capacityTons: 14,
        currentOdometer: 47000,
        truckBodyType: 'covered',
        taxTokenExpiry: '2027-09-10',
        fitnessExpiry: '2027-10-25',
        insuranceExpiry: '2028-02-15',
        routePermitExpiry: '2028-04-10',
        status: 'active',
        origin: 'Valuka',
        destination: 'OCL Chittagong',
        cargoDetails: 'Export Footwear & RMG Cargo',
        customerName: 'Global Shoes Ltd',
        fuelCost: 0,
        tollCost: 0,
        maintenanceCost: 0,
        maintenanceDetails: '',
        distanceKm: 0,
      },
    ].map((v) => ({
      tripRevenue: 0,
      outstandingDue: 0,
      nextServiceDate: '2027-12-31',
      date: '2026-01-01',
      ownerId: ownerId || activeBusiness.id,
      ...v,
    } as ErpTransportOp));

    const vehicleMap = new Map<string, ErpTransportOp>();

    // 1. Seed the default 7 fleet trucks
    for (const defTruck of default7Fleet) {
      vehicleMap.set(normalizeReg(defTruck.registrationNumber), defTruck);
    }

    // 2. Overlay vehicle records from ops (if user edited driver name, phone, etc.)
    for (const op of ops) {
      if (op.registrationNumber && op.recordType === 'vehicle') {
        const norm = normalizeReg(op.registrationNumber);
        if (vehicleMap.has(norm)) {
          vehicleMap.set(norm, {
            ...vehicleMap.get(norm)!,
            ...op,
            registrationNumber: vehicleMap.get(norm)!.registrationNumber,
          });
        } else {
          // Additional custom vehicle registered by user via Add Truck
          vehicleMap.set(norm, op);
        }
      }
    }

    return Array.from(vehicleMap.values());
  }, [ops, activeBusiness.id, ownerId, normalizeReg]);

  const defaultGarmentsContracts: ErpTransportOp[] = useMemo(() => [
    {
      id: 'gcontract-01',
      tripOrVehicleCode: 'GCON-01',
      recordType: 'garments_contract',
      businessId: activeBusiness.id,
      registrationNumber: 'DHAKA-METRO-TA-11-2233',
      vehicleType: 'Corporate Contract',
      clientName: 'Ananta Apparels Ltd.',
      customerName: 'Ananta Apparels Ltd.',
      factoryLocation: 'Nischintapur, Ashulia, Savar, Dhaka',
      contactPerson: 'Engr. Farhan Tanvir (Logistics & Transport Lead)',
      contactPhone: '01711-445566',
      billingType: 'day_trip', // Day-Trip / Per-Trip Rate
      agreedRate: 14500, // BDT 14,500 per trip
      assignedTrucks: ['DHAKA-METRO-TA-11-2233', 'DHAKA-METRO-TA-14-5566'],
      assignedTrucksJson: JSON.stringify(['DHAKA-METRO-TA-11-2233', 'DHAKA-METRO-TA-14-5566']),
      route: 'Ashulia Factory ➔ Chittagong Seaport / Airport',
      cargoDetails: 'Readymade Export Garments (RMG), Carton, Fabric',
      startDate: '2026-01-10',
      contractStatus: 'active',
      status: 'active',
      remarks: 'Export container and carton dispatch. Payment settled per trip within 7 days of challan slip submission.',
      origin: 'Ashulia',
      destination: 'Chittagong Port',
      fuelCost: 0,
      tollCost: 0,
      maintenanceCost: 0,
      maintenanceDetails: '',
      driverName: 'Assigned Fleet (2 Trucks)',
      distanceKm: 275,
    },
    {
      id: 'gcontract-02',
      tripOrVehicleCode: 'GCON-02',
      recordType: 'garments_contract',
      businessId: activeBusiness.id,
      registrationNumber: 'DHAKA-METRO-TA-12-3456',
      vehicleType: 'Corporate Contract',
      clientName: 'Ha-Meem Denim & Garments Ltd.',
      customerName: 'Ha-Meem Denim & Garments Ltd.',
      factoryLocation: 'Konabari, Gazipur Industrial Area',
      contactPerson: 'Md. Delwar Hossain (Senior Dispatch Officer)',
      contactPhone: '01819-332211',
      billingType: 'day_trip', // Day-Trip / Per-Trip Rate
      agreedRate: 16000, // BDT 16,000 per trip
      assignedTrucks: ['DHAKA-METRO-TA-12-3456', 'DHAKA-METRO-TA-13-4455'],
      assignedTrucksJson: JSON.stringify(['DHAKA-METRO-TA-12-3456', 'DHAKA-METRO-TA-13-4455']),
      route: 'Konabari Gazipur ➔ Chittagong Port / Benapole Land Port',
      cargoDetails: 'Denim Fabrics, Finished Jeans & Export Garments',
      startDate: '2026-01-15',
      contractStatus: 'active',
      status: 'active',
      remarks: 'Day/trip rate basis. Trips dispatch daily or alternate days. Driver allowances paid on loading.',
      origin: 'Gazipur',
      destination: 'Chittagong Port',
      fuelCost: 0,
      tollCost: 0,
      maintenanceCost: 0,
      maintenanceDetails: '',
      driverName: 'Assigned Fleet (2 Trucks)',
      distanceKm: 290,
    },
    {
      id: 'gcontract-03',
      tripOrVehicleCode: 'GCON-03',
      recordType: 'garments_contract',
      businessId: activeBusiness.id,
      registrationNumber: 'DHAKA-METRO-TA-15-6677',
      vehicleType: 'Corporate Contract',
      clientName: 'Square Fashions Ltd.',
      customerName: 'Square Fashions Ltd.',
      factoryLocation: 'Masterbari, Valuka, Mymensingh',
      contactPerson: 'Masum Billah (Commercial & Fleet Officer)',
      contactPhone: '01912-778899',
      billingType: 'monthly', // Monthly Fixed Contract
      agreedRate: 220000, // BDT 220,000 per month
      assignedTrucks: ['DHAKA-METRO-TA-15-6677'],
      assignedTrucksJson: JSON.stringify(['DHAKA-METRO-TA-15-6677']),
      route: 'Valuka Factory ➔ Dhaka HQ / Chittagong Depot',
      cargoDetails: 'Knit Fabrics, Yarns, Sewing Accessories & Export Apparel',
      startDate: '2026-02-01',
      contractStatus: 'active',
      status: 'active',
      remarks: 'Monthly fixed contract. 1 Dedicated covered van 24/7 dedicated service. Monthly invoice paid 1st week of each month.',
      origin: 'Valuka',
      destination: 'Dhaka / Chittagong',
      fuelCost: 0,
      tollCost: 0,
      maintenanceCost: 0,
      maintenanceDetails: '',
      driverName: 'Assigned Fleet (1 Truck)',
      distanceKm: 120,
    },
    {
      id: 'gcontract-04',
      tripOrVehicleCode: 'GCON-04',
      recordType: 'garments_contract',
      businessId: activeBusiness.id,
      registrationNumber: 'DHAKA-METRO-TA-20-9171',
      vehicleType: 'Corporate Contract',
      clientName: 'Global Shoes Ltd',
      customerName: 'Global Shoes Ltd',
      factoryLocation: 'Seedstor Bazar Valuka, Mymensingh',
      contactPerson: 'Mr. Tariqul Islam (Logistics Manager)',
      contactPhone: '01719-714211',
      billingType: 'day_trip', // Day-Trip / Per-Trip Rate
      agreedRate: 15000, // BDT 15,000 per trip base rent
      assignedTrucks: ['DHAKA-METRO-TA-20-9171', 'DHAKA-METRO-TA-11-8393'],
      assignedTrucksJson: JSON.stringify(['DHAKA-METRO-TA-20-9171', 'DHAKA-METRO-TA-11-8393']),
      route: 'Seedstor Bazar Valuka ➔ OCL Depot / Chittagong Port',
      cargoDetails: 'Export Footwear & RMG Cargo',
      startDate: '2026-10-01',
      contractStatus: 'active',
      status: 'active',
      remarks: 'Official transport contract with Global Shoes Ltd. Rent + Demurrage billing per trip with monthly Transport Bill.',
      origin: 'GLOBAL',
      destination: 'OCL',
      fuelCost: 0,
      tollCost: 0,
      maintenanceCost: 0,
      maintenanceDetails: '',
      driverName: 'Assigned Fleet (2 Trucks)',
      distanceKm: 260,
    },
  ].map((c) => ({
    tripRevenue: 0,
    outstandingDue: 0,
    taxTokenExpiry: '2027-12-31',
    fitnessExpiry: '2027-12-31',
    insuranceExpiry: '2027-12-31',
    nextServiceDate: '2027-12-31',
    date: '2026-01-10',
    ownerId: ownerId || activeBusiness.id,
    ...c,
  } as ErpTransportOp)), [activeBusiness.id, ownerId]);

  const allGarmentsContracts = useMemo(() => {
    const fromOps = ops.filter((op) => op.recordType === 'garments_contract');
    // Combine fromOps with defaultGarmentsContracts without duplicates
    const contractMap = new Map<string, ErpTransportOp>();
    for (const def of defaultGarmentsContracts) {
      contractMap.set(def.tripOrVehicleCode || def.id, def);
    }
    for (const op of fromOps) {
      contractMap.set(op.tripOrVehicleCode || op.id, op);
    }
    return Array.from(contractMap.values());
  }, [ops, defaultGarmentsContracts]);

  // Helper to retrieve which Garments a truck is assigned to
  const getTruckAssignedGarments = useCallback(
    (reg: string) => {
      const targetNorm = normalizeReg(reg);
      for (const c of allGarmentsContracts) {
        let trucks: string[] = [];
        if (Array.isArray(c.assignedTrucks)) {
          trucks = c.assignedTrucks;
        } else if (c.assignedTrucksJson) {
          try {
            trucks = JSON.parse(c.assignedTrucksJson);
          } catch {
            trucks = [];
          }
        } else if (c.route && c.route.includes(',')) {
          trucks = c.route.split(',').map((s) => s.trim());
        } else if (c.registrationNumber) {
          trucks = [c.registrationNumber];
        }
        if (trucks.some((t) => normalizeReg(t) === targetNorm)) {
          return c;
        }
      }
      return null;
    },
    [allGarmentsContracts, normalizeReg]
  );

  const defaultGlobalShoesTrips: ErpTransportOp[] = useMemo(() => [
    {
      id: 'demo-gsl-trip-01',
      tripOrVehicleCode: 'TPB_GSL 010',
      challanNumber: 'TPB_GSL 010',
      orderNumber: 'ORD-GSL-010',
      recordType: 'trip',
      businessId: activeBusiness.id,
      registrationNumber: 'DHAKA-METRO-TA-20-9171',
      vehicleType: 'Heavy Truck',
      driverName: 'Md. Tariqul Islam',
      origin: 'GLOBAL',
      destination: 'OCL',
      loadingLocation: 'GLOBAL',
      deliveryLocation: 'OCL',
      route: 'GLOBAL ➔ OCL',
      cargoDetails: 'Export Footwear & RMG',
      customerName: 'Global Shoes Ltd',
      clientName: 'Global Shoes Ltd',
      distanceKm: 260,
      tripRevenue: 15000,
      demurrageAmount: 6000,
      demurrageDays: 2,
      demurrageDailyRate: 3000,
      demurrageReason: 'Factory Unloading Delay (2 Days Detention)',
      advancePaid: 0,
      advanceReceived: 0,
      driverKhoraki: 2000,
      tripExpense: 2000,
      netIncome: 19000,
      insuranceExpiry: '2027-12-31',
      fitnessExpiry: '2027-12-31',
      taxTokenExpiry: '2027-12-31',
      nextServiceDate: '2027-06-30',
      date: '2026-10-14',
      status: 'completed',
      fuelCost: 0,
      tollCost: 0,
      maintenanceCost: 0,
      maintenanceDetails: '',
      ownerId: ownerId || activeBusiness.id,
    } as ErpTransportOp,
    {
      id: 'demo-gsl-trip-02',
      tripOrVehicleCode: 'TPB_GSL 011',
      challanNumber: 'TPB_GSL 011',
      orderNumber: 'ORD-GSL-011',
      recordType: 'trip',
      businessId: activeBusiness.id,
      registrationNumber: 'DHAKA-METRO-TA-11-8393',
      vehicleType: 'Covered Van',
      driverName: 'Md. Shahidul Islam',
      origin: 'GLOBAL',
      destination: 'OCL',
      loadingLocation: 'GLOBAL',
      deliveryLocation: 'OCL',
      route: 'GLOBAL ➔ OCL',
      cargoDetails: 'Export Footwear & RMG',
      customerName: 'Global Shoes Ltd',
      clientName: 'Global Shoes Ltd',
      distanceKm: 260,
      tripRevenue: 16000,
      demurrageAmount: 4000,
      demurrageDays: 1,
      demurrageDailyRate: 4000,
      demurrageReason: 'Port Berth Congestion / Offloading Delay (1 Day)',
      advancePaid: 0,
      advanceReceived: 0,
      driverKhoraki: 2000,
      tripExpense: 2000,
      netIncome: 18000,
      insuranceExpiry: '2027-12-31',
      fitnessExpiry: '2027-12-31',
      taxTokenExpiry: '2027-12-31',
      nextServiceDate: '2027-06-30',
      date: '2026-10-22',
      status: 'completed',
      fuelCost: 0,
      tollCost: 0,
      maintenanceCost: 0,
      maintenanceDetails: '',
      ownerId: ownerId || activeBusiness.id,
    } as ErpTransportOp,
  ], [activeBusiness.id, ownerId]);

  const allTrips = useMemo(() => {
    const fromOps = ops.filter((op) => op.recordType === 'trip' || (!op.recordType && op.origin));
    const tripMap = new Map<string, ErpTransportOp>();
    for (const d of defaultGlobalShoesTrips) {
      tripMap.set(d.tripOrVehicleCode || d.id, d);
    }
    for (const op of fromOps) {
      tripMap.set(op.tripOrVehicleCode || op.id, op);
    }
    return Array.from(tripMap.values());
  }, [ops, defaultGlobalShoesTrips]);

  // Helper to determine if a truck is currently on an active trip and when it is expected to return
  const getTruckActiveTrip = useCallback(
    (reg?: string | null) => {
      if (!reg) return { isOnTrip: false, returnDateFormatted: '', expectedReturnDate: '' };
      const targetNorm = normalizeReg(reg);
      if (!targetNorm) return { isOnTrip: false, returnDateFormatted: '', expectedReturnDate: '' };

      const today = new Date().toISOString().slice(0, 10);

      // Find an active trip for this vehicle that has not been marked completed/returned
      const activeTrip = allTrips.find((t) => {
        if (normalizeReg(t.registrationNumber) !== targetNorm) return false;
        if (t.status !== 'active' && t.status !== 'running') return false;
        if (t.actualReturnDate) return false;
        return true;
      });

      if (!activeTrip) return { isOnTrip: false, returnDateFormatted: '', expectedReturnDate: '' };

      // Determine expected return date (default 2 days for round trip / up-down)
      let retDateStr = activeTrip.expectedReturnDate;
      if (!retDateStr && activeTrip.date) {
        try {
          const d = new Date(activeTrip.date);
          d.setDate(d.getDate() + 2);
          retDateStr = d.toISOString().slice(0, 10);
        } catch {
          retDateStr = activeTrip.date;
        }
      }

      // If today is past the return date, automatically release lock per user request
      if (retDateStr && today > retDateStr) {
        return { isOnTrip: false, returnDateFormatted: '', expectedReturnDate: retDateStr };
      }

      // Format return date for human display (e.g., "26 Nov")
      let formatted = retDateStr || 'On Trip';
      if (retDateStr) {
        try {
          const parts = retDateStr.split('-');
          if (parts.length === 3) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mIdx = parseInt(parts[1], 10) - 1;
            formatted = `${parseInt(parts[2], 10)} ${months[mIdx] || parts[1]}`;
          }
        } catch {
          formatted = retDateStr;
        }
      }

      return {
        isOnTrip: true,
        trip: activeTrip,
        startDate: activeTrip.date,
        expectedReturnDate: retDateStr,
        returnDateFormatted: formatted,
        route: activeTrip.route || `${activeTrip.origin || ''} ➔ ${activeTrip.destination || ''}`,
        clientName: activeTrip.customerName || activeTrip.clientName,
      };
    },
    [allTrips, normalizeReg]
  );

  const allFuelLogs = useMemo(() => {
    return ops.filter((op) => op.recordType === 'fuel' || (op.fuelLitres && op.fuelLitres > 0) || (op.fuelCost && op.fuelCost > 0));
  }, [ops]);

  const allMaintenanceLogs = useMemo(() => {
    return ops.filter(
      (op) => op.recordType === 'vehicle_maintenance' || op.recordType === 'maintenance' || (op.garageName || op.partsCost)
    );
  }, [ops]);

  const allTripExpenses = useMemo(() => {
    return ops.filter((op) => op.recordType === 'expense' || op.expenseCategory || (op.tripExpense && op.tripExpense > 0));
  }, [ops]);

  const allDrivers = useMemo(() => {
    // Drivers from allVehicles + transport ops + transport stakeholders
    const driverMap = new Map<
      string,
      {
        id?: string;
        name: string;
        phone: string;
        license: string;
        salary: number;
        truck: string;
        tripCount: number;
        totalCommission: number;
        totalKhoraki: number;
        status: string;
      }
    >();

    // 1. Seed drivers from all registered fleet vehicles
    for (const v of allVehicles) {
      if (v.driverName && v.driverName.trim() && v.driverName.toLowerCase() !== 'unassigned') {
        const name = v.driverName.trim();
        if (!driverMap.has(name)) {
          driverMap.set(name, {
            id: `drv-${v.registrationNumber}`,
            name,
            phone: v.driverPhone || '',
            license: 'BRTA Verified',
            salary: 5000,
            truck: v.registrationNumber,
            tripCount: 0,
            totalCommission: 0,
            totalKhoraki: 0,
            status: 'Active',
          });
        }
      }
    }

    for (const op of ops) {
      if (op.driverName) {
        const name = op.driverName.trim();
        if (!driverMap.has(name)) {
          driverMap.set(name, {
            id: op.id,
            name,
            phone: op.driverPhone || '',
            license: op.driverLicense || (op as any).licenseNumber || 'BRTA Verified',
            salary: Number(op.driverMonthlySalary || 5000), // Default monthly 5000 BDT as client requested
            truck: op.registrationNumber || '',
            tripCount: 0,
            totalCommission: 0,
            totalKhoraki: 0,
            status: 'Active',
          });
        } else {
          const existing = driverMap.get(name)!;
          if (!existing.phone && op.driverPhone) existing.phone = op.driverPhone;
          if ((!existing.license || existing.license === 'BRTA Verified') && (op.driverLicense || (op as any).licenseNumber)) {
            existing.license = op.driverLicense || (op as any).licenseNumber;
          }
          if (!existing.truck && op.registrationNumber) existing.truck = op.registrationNumber;
          if (op.driverMonthlySalary) existing.salary = Number(op.driverMonthlySalary);
        }
      }
    }

    for (const stk of stakeholders) {
      if (
        stk.businessId === activeBusiness.id &&
        (stk.stakeholderType === 'employee' || stk.designationOrCategory?.toLowerCase().includes('driver') || stk.designationOrCategory?.includes('Driver'))
      ) {
        if (!driverMap.has(stk.name)) {
          driverMap.set(stk.name, {
            id: stk.id,
            name: stk.name,
            phone: stk.phone || '',
            license: (stk as any).licenseNumber || 'BRTA Verified',
            salary: Number(stk.monthlySalaryOrCreditLimit || 5000),
            truck: '',
            tripCount: 0,
            totalCommission: 0,
            totalKhoraki: 0,
            status: 'Active',
          });
        }
      }
    }

    // Aggregate trips for trip count & commissions
    for (const t of allTrips) {
      if (t.driverName) {
        const dName = t.driverName.trim();
        const d = driverMap.get(dName);
        if (d) {
          d.tripCount += 1;
          const comm = Number(t.driverCommission !== undefined ? t.driverCommission : t.commission || 0);
          d.totalCommission += comm;
          d.totalKhoraki += Number(t.driverKhoraki || t.driverAllowance || 0);
          if (t.status === 'active' || t.status === 'running') {
            d.status = 'On Trip';
          }
          if (!d.truck && t.registrationNumber) {
            d.truck = t.registrationNumber;
          }
        }
      }
    }

    return Array.from(driverMap.values());
  }, [ops, stakeholders, activeBusiness.id, allTrips]);

  const filteredDrivers = useMemo(() => {
    return allDrivers.filter((d) => {
      if (driverTruckFilter !== 'ALL' && d.truck !== driverTruckFilter) return false;
      if (driverStatusFilter !== 'ALL' && d.status !== driverStatusFilter) return false;
      if (driverSearchQuery.trim()) {
        const q = driverSearchQuery.toLowerCase().trim();
        const cleanQ = q.replace(/[^a-z0-9]/gi, '');
        const digitsQ = q.replace(/\D/g, '');

        const matchesName = d.name.toLowerCase().includes(q);
        const matchesPhone = (d.phone || '').replace(/\D/g, '').includes(digitsQ) || (d.phone || '').toLowerCase().includes(q);

        const truckReg = (d.truck || '').toLowerCase();
        const digitsTruck = truckReg.replace(/\D/g, '');
        const cleanTruck = truckReg.replace(/[^a-z0-9]/gi, '');
        const matchTruckDigits = digitsQ.length >= 2 && digitsTruck.includes(digitsQ);
        const matchCleanTruck = cleanQ.length > 0 && cleanTruck.includes(cleanQ);
        const matchesTruck = truckReg.includes(q) || matchCleanTruck || matchTruckDigits;

        const matchesLicense = (d.license || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesTruck && !matchesLicense) return false;
      }
      return true;
    });
  }, [allDrivers, driverTruckFilter, driverStatusFilter, driverSearchQuery]);

  // Filtered Vehicles for Fleet Management
  const filteredVehicles = useMemo(() => {
    return allVehicles.filter((v) => {
      if (truckStatusFilter !== 'ALL' && v.status !== truckStatusFilter) return false;
      if (truckBodyTypeFilter !== 'ALL' && (v.truckBodyType || 'open') !== truckBodyTypeFilter) return false;
      if (truckContractFilter === 'garments' && !getTruckAssignedGarments(v.registrationNumber)) return false;
      if (truckContractFilter === 'open' && getTruckAssignedGarments(v.registrationNumber)) return false;
      if (truckSearchQuery.trim()) {
        const q = truckSearchQuery.toLowerCase().trim();
        const cleanQ = q.replace(/[^a-z0-9]/gi, '');
        const digitsQ = q.replace(/\D/g, '');

        const reg = (v.registrationNumber || '').toLowerCase();
        const cleanReg = reg.replace(/[^a-z0-9]/gi, '');
        const digitsReg = reg.replace(/\D/g, '');

        const matchDigits = digitsQ.length >= 2 && digitsReg.includes(digitsQ);
        const matchCleanReg = cleanQ.length > 0 && cleanReg.includes(cleanQ);
        const matchReg = reg.includes(q) || matchCleanReg || matchDigits;
        const matchDriver = (v.driverName || '').toLowerCase().includes(q);
        const matchPhone = (v.driverPhone || '').replace(/\D/g, '').includes(digitsQ) || (v.driverPhone || '').toLowerCase().includes(q);
        const matchModel = (v.vehicleType || v.truckName || '').toLowerCase().includes(q);
        const matchChassis = (v.chassisNumber || '').toLowerCase().includes(q);
        const matchCode = (v.tripOrVehicleCode || '').toLowerCase().includes(q);
        if (!matchReg && !matchDriver && !matchPhone && !matchModel && !matchChassis && !matchCode) return false;
      }
      return true;
    });
  }, [allVehicles, truckStatusFilter, truckBodyTypeFilter, truckContractFilter, truckSearchQuery, getTruckAssignedGarments]);

  // Helper to dynamically resolve driver name and phone across trips, vehicles & driver rosters
  const resolveTripDriverName = useCallback(
    (t: ErpTransportOp): string => {
      if (t.driverName && t.driverName.trim() && t.driverName.toLowerCase() !== 'unassigned') {
        return t.driverName.trim();
      }
      const veh = allVehicles.find((v) => normalizeReg(v.registrationNumber) === normalizeReg(t.registrationNumber));
      if (veh?.driverName && veh.driverName.trim() && veh.driverName.toLowerCase() !== 'unassigned') {
        return veh.driverName.trim();
      }
      const drv = allDrivers.find((d) => normalizeReg(d.truck) === normalizeReg(t.registrationNumber));
      if (drv?.name && drv.name.trim() && drv.name.toLowerCase() !== 'unassigned') {
        return drv.name.trim();
      }
      return veh?.driverName || t.driverName || 'Driver Assigned';
    },
    [allVehicles, allDrivers, normalizeReg]
  );

  const resolveTripDriverPhone = useCallback(
    (t: ErpTransportOp): string => {
      if (t.driverPhone && t.driverPhone.trim()) {
        return t.driverPhone.trim();
      }
      const dName = resolveTripDriverName(t);
      const drv = allDrivers.find(
        (d) => d.name.toLowerCase() === dName.toLowerCase() || d.truck === t.registrationNumber
      );
      return drv?.phone || '';
    },
    [resolveTripDriverName, allDrivers]
  );

  const openTripChallanModal = useCallback(
    (t: ErpTransportOp) => {
      const dName = resolveTripDriverName(t);
      const dPhone = resolveTripDriverPhone(t);
      setSelectedTripChallan({
        ...t,
        driverName: dName,
        driverPhone: dPhone || t.driverPhone,
      });
    },
    [resolveTripDriverName, resolveTripDriverPhone]
  );

  // Detailed Analytics & Financial Statistics for Selected Truck Profile Modal
  const selectedTruckStats = useMemo(() => {
    if (!selectedTruckForDetails) return null;
    const reg = selectedTruckForDetails.registrationNumber;
    const allTruckTrips = allTrips.filter((t) => t.registrationNumber === reg);

    // Available months from all trips and logs
    const monthSet = new Set<string>();
    for (const t of allTruckTrips) {
      if (t.date) {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          monthSet.add(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase());
        }
      }
    }
    const allTruckFuelLogs = ops.filter((o) => o.recordType === 'fuel' && o.registrationNumber === reg);
    for (const f of allTruckFuelLogs) {
      if (f.date) {
        const d = new Date(f.date);
        if (!isNaN(d.getTime())) {
          monthSet.add(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase());
        }
      }
    }
    const allTruckMaintLogs = ops.filter(
      (o) => (o.recordType === 'maintenance' || o.recordType === 'vehicle_maintenance') && o.registrationNumber === reg
    );
    for (const m of allTruckMaintLogs) {
      if (m.date) {
        const d = new Date(m.date);
        if (!isNaN(d.getTime())) {
          monthSet.add(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase());
        }
      }
    }
    const availableMonths = Array.from(monthSet);

    // Filter by truckDetailsSelectedMonth
    const truckTrips = truckDetailsSelectedMonth === 'ALL'
      ? allTruckTrips
      : allTruckTrips.filter((t) => {
          if (!t.date) return false;
          const d = new Date(t.date);
          if (isNaN(d.getTime())) return false;
          return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase() === truckDetailsSelectedMonth;
        });

    const totalRevenue = truckTrips.reduce((s, t) => s + Number(t.tripRevenue || t.estimatedTripFare || 0), 0);
    const totalDemurrage = truckTrips.reduce((s, t) => s + Number(t.demurrageAmount || 0), 0);
    const grossIncome = totalRevenue + totalDemurrage;

    const totalTripExpenses = truckTrips.reduce((s, t) => {
      const exp = Number(t.tripExpense || 0) > 0
        ? Number(t.tripExpense)
        : Number(t.fuelCost || 0) +
          Number(t.tollCost || 0) +
          Number(t.ferryCost || 0) +
          Number(t.driverKhoraki || t.driverAllowance || 0) +
          Number(t.policeRoadCost || 0) +
          Number(t.labourLoadingCost || 0) +
          Number(t.driverCommission || 0) +
          Number(t.commission || 0) +
          Number(t.maintenanceCost || 0);
      return s + exp;
    }, 0);

    const truckFuelLogs = truckDetailsSelectedMonth === 'ALL'
      ? allTruckFuelLogs
      : allTruckFuelLogs.filter((f) => {
          if (!f.date) return false;
          const d = new Date(f.date);
          if (isNaN(d.getTime())) return false;
          return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase() === truckDetailsSelectedMonth;
        });
    const standaloneFuelCost = truckFuelLogs.reduce((s, f) => s + Number(f.fuelCost || 0), 0);
    const totalFuelLitres = truckFuelLogs.reduce((s, f) => s + Number(f.fuelLitres || 0), 0);

    const truckMaintLogs = truckDetailsSelectedMonth === 'ALL'
      ? allTruckMaintLogs
      : allTruckMaintLogs.filter((m) => {
          if (!m.date) return false;
          const d = new Date(m.date);
          if (isNaN(d.getTime())) return false;
          return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase() === truckDetailsSelectedMonth;
        });
    const totalMaintenanceCost = truckMaintLogs.reduce((s, m) => s + Number(m.maintenanceCost || m.partsCost || 0), 0);

    const grandTotalExpenses = totalTripExpenses + standaloneFuelCost + totalMaintenanceCost;
    const netProfit = grossIncome - grandTotalExpenses;
    const totalKm = truckTrips.reduce((s, t) => s + Number(t.distanceKm || 0), 0) || (truckDetailsSelectedMonth === 'ALL' ? Number(selectedTruckForDetails.currentOdometer || 0) : 0);
    const completedTrips = truckTrips.filter((t) => t.status === 'completed').length;
    const activeTrips = truckTrips.filter((t) => t.status === 'active' || t.status === 'running').length;

    // Assigned driver info
    const assignedDriver = allDrivers.find(
      (d) => d.name.toLowerCase() === (selectedTruckForDetails.driverName || '').toLowerCase() || d.truck === reg
    );

    return {
      allTimeTripsCount: allTruckTrips.length,
      availableMonths,
      truckTrips,
      truckFuelLogs,
      truckMaintLogs,
      totalRevenue: grossIncome,
      totalDemurrage,
      totalTripExpenses,
      standaloneFuelCost,
      totalFuelLitres,
      totalMaintenanceCost,
      grandTotalExpenses,
      netProfit,
      totalKm,
      completedTrips,
      activeTrips,
      assignedDriver,
    };
  }, [selectedTruckForDetails, allTrips, ops, allDrivers, truckDetailsSelectedMonth]);

  // Garments & Corporate Contracts Analytics & Aggregated Ledger
  const garmentsStatsList = useMemo(() => {
    return allGarmentsContracts.map((contract) => {
      let assignedTrucks: string[] = [];
      if (Array.isArray(contract.assignedTrucks)) {
        assignedTrucks = contract.assignedTrucks;
      } else if (contract.assignedTrucksJson) {
        try {
          assignedTrucks = JSON.parse(contract.assignedTrucksJson);
        } catch {
          assignedTrucks = [];
        }
      } else if (contract.route && contract.route.includes(',')) {
        assignedTrucks = contract.route.split(',').map((s) => s.trim());
      } else if (contract.registrationNumber) {
        assignedTrucks = [contract.registrationNumber];
      }

      // Find all trips matching this client or assigned trucks
      const rawCName = (contract.clientName || contract.customerName || '').trim();
      const cName = rawCName.toLowerCase();
      const normCName = normalizeClientName(rawCName);

      const clientTrips = allTrips.filter((t) => {
        const rawTCustomer = (t.customerName || t.clientName || '').trim();
        const normTCustomer = normalizeClientName(rawTCustomer);

        const matchesName =
          normCName &&
          normTCustomer &&
          (normTCustomer.includes(normCName) || normCName.includes(normTCustomer));
        const matchesTruck = assignedTrucks.some((tr) => normalizeReg(tr) === normalizeReg(t.registrationNumber));
        return matchesName || matchesTruck;
      });

      const totalTrips = clientTrips.length;
      const activeTrips = clientTrips.filter((t) => t.status === 'active' || t.status === 'running').length;
      const completedTrips = clientTrips.filter((t) => t.status === 'completed').length;

      // Billing calculations (Rent + Demurrage per real-world corporate billing):
      let totalBilled = 0;
      if (contract.billingType === 'monthly') {
        const tripBilledSum = clientTrips.reduce(
          (s, t) => s + Number(t.tripRevenue || t.estimatedTripFare || 0) + Number(t.demurrageAmount || 0),
          0
        );
        totalBilled = Math.max(tripBilledSum, Number(contract.agreedRate || 0));
      } else {
        // day_trip: sum of trip rent + demurrage
        totalBilled = clientTrips.reduce(
          (s, t) => s + Number(t.tripRevenue || t.estimatedTripFare || 0) + Number(t.demurrageAmount || 0),
          0
        );
        if (totalBilled === 0 && totalTrips > 0) {
          totalBilled = totalTrips * Number(contract.agreedRate || 0);
        }
      }

      // Payments & Advances tracking:
      // 1. Advances / payments logged directly on individual trips
      const tripAdvanceSum = clientTrips.reduce((s, t) => s + Number(t.advancePaid || t.advanceReceived || 0), 0);

      // 2. Direct advances / rent recorded on the contract record itself
      const contractAdvance = Number(contract.advancePaid || contract.advanceReceived || 0);

      // 3. Payments collected via double-entry journal vouchers for this corporate company (e.g. SAHIN.dev)
      const clientJournalEntries = (journalEntries || []).filter((j) => {
        if (j.transactionType !== 'sale' && j.transactionType !== 'income') return false;
        const rawJParty = (j.counterpartyName || '').trim();
        const normJParty = normalizeClientName(rawJParty);
        const jDesc = (j.description || '').toLowerCase();
        const jCat = (j.category || '').toLowerCase();

        const matchesParty =
          normCName &&
          normJParty &&
          (normJParty.includes(normCName) || normCName.includes(normJParty));
        const matchesText =
          (cName && jDesc.includes(cName)) ||
          (normCName && normalizeClientName(jDesc).includes(normCName)) ||
          (cName && jCat.includes(cName)) ||
          (normCName && normalizeClientName(jCat).includes(normCName));

        return matchesParty || matchesText;
      });
      const journalPaidSum = clientJournalEntries.reduce((s, j) => s + Number(j.amount || 0), 0);

      // 4. Standalone payment records in ops
      const opPaymentsSum = (ops || [])
        .filter((op) => {
          if (op.recordType !== 'payment' && op.recordType !== 'collection') return false;
          const rawOpClient = (op.clientName || op.customerName || '').trim();
          const normOpClient = normalizeClientName(rawOpClient);
          return normCName && normOpClient && (normOpClient.includes(normCName) || normCName.includes(normOpClient));
        })
        .reduce((s, op: any) => s + Number(op.tripRevenue || op.advancePaid || op.amount || 0), 0);

      // Comprehensive total advance/paid calculation ensuring money received reduces due:
      const totalAdvance = Math.max(
        tripAdvanceSum + contractAdvance,
        journalPaidSum,
        opPaymentsSum,
        tripAdvanceSum + opPaymentsSum
      );
      const totalDue = Math.max(0, totalBilled - totalAdvance);

      const totalExpenses = clientTrips.reduce((s, t) => {
        const exp = Number(t.tripExpense || 0) > 0
          ? Number(t.tripExpense)
          : Number(t.fuelCost || 0) +
            Number(t.tollCost || 0) +
            Number(t.ferryCost || 0) +
            Number(t.driverKhoraki || t.driverAllowance || 0) +
            Number(t.policeRoadCost || 0) +
            Number(t.labourLoadingCost || 0) +
            Number(t.driverCommission || 0) +
            Number(t.commission || 0);
        return s + exp;
      }, 0);

      const netProfit = totalBilled - totalExpenses;

      return {
        contract,
        assignedTrucks,
        totalTrips,
        activeTrips,
        completedTrips,
        totalBilled,
        totalAdvance,
        totalDue,
        totalExpenses,
        netProfit,
        clientTrips,
      };
    });
  }, [allGarmentsContracts, allTrips, journalEntries, ops, normalizeReg, normalizeClientName]);

  const filteredGarmentsContracts = useMemo(() => {
    return garmentsStatsList.filter((item) => {
      const c = item.contract;
      if (garmentsBillingFilter !== 'ALL' && c.billingType !== garmentsBillingFilter) return false;
      if (garmentsSearchQuery.trim()) {
        const q = garmentsSearchQuery.toLowerCase();
        const normQ = normalizeClientName(q);
        const matchesClient =
          (c.clientName || c.customerName || '').toLowerCase().includes(q) ||
          normalizeClientName(c.clientName || c.customerName || '').includes(normQ);
        const matchesContact = (c.contactPerson || '').toLowerCase().includes(q);
        const matchesPhone = (c.contactPhone || '').toLowerCase().includes(q);
        const matchesLoc = (c.factoryLocation || '').toLowerCase().includes(q);
        const matchesTruck = item.assignedTrucks.some((tr) => tr.toLowerCase().includes(q));
        if (!matchesClient && !matchesContact && !matchesPhone && !matchesLoc && !matchesTruck) return false;
      }
      return true;
    });
  }, [garmentsStatsList, garmentsBillingFilter, garmentsSearchQuery, normalizeClientName]);

  // Dedicated fleet trucks assigned to Garments factories
  const garmentsDedicatedTrucks = useMemo(() => {
    return allVehicles.filter((v) => getTruckAssignedGarments(v.registrationNumber));
  }, [allVehicles, getTruckAssignedGarments]);

  // Trucks strictly allocated to the selected corporate company in Quick Dispatch modal
  const quickDispatchCompanyTrucks = useMemo(() => {
    if (!quickDispatchContract) return garmentsDedicatedTrucks;
    let assignedArr: string[] = [];
    if (Array.isArray(quickDispatchContract.assignedTrucks)) assignedArr = quickDispatchContract.assignedTrucks;
    else if (quickDispatchContract.assignedTrucksJson) {
      try { assignedArr = JSON.parse(quickDispatchContract.assignedTrucksJson); } catch {}
    } else if (quickDispatchContract.route && quickDispatchContract.route.includes(',')) {
      assignedArr = quickDispatchContract.route.split(',').map((s) => s.trim());
    } else if (quickDispatchContract.registrationNumber) {
      assignedArr = [quickDispatchContract.registrationNumber];
    }
    const filtered = allVehicles.filter((v) =>
      assignedArr.some((t) => normalizeReg(t) === normalizeReg(v.registrationNumber))
    );
    return filtered.length > 0 ? filtered : garmentsDedicatedTrucks;
  }, [quickDispatchContract, allVehicles, garmentsDedicatedTrucks, normalizeReg]);

  // Cash & Bank Wallets for Financial Payments
  const treasuryWallets = useMemo(() => {
    return accounts.filter((a) => a.subType === 'cash' || a.subType === 'bank');
  }, [accounts]);

  // 3. Dynamically Selected Currently Running Trucks (Supports 5+ fleet trucks)
  const runningTrips = useMemo(() => {
    return allTrips.filter((t) => {
      if (t.status !== 'active' && t.status !== 'running') return false;
      if (t.actualReturnDate) return false;
      const tripInfo = getTruckActiveTrip(t.registrationNumber);
      return tripInfo.isOnTrip;
    });
  }, [allTrips, getTruckActiveTrip]);

  const fourRunningTrucks = useMemo(() => {
    // Show all distinct trucks that are currently running (support 5+ trucks)
    const selected: ErpTransportOp[] = [];
    const seenRegs = new Set<string>();
    for (const t of runningTrips) {
      if (!seenRegs.has(t.registrationNumber)) {
        seenRegs.add(t.registrationNumber);
        selected.push(t);
      }
    }
    // Supplement with latest trips from other registered fleet trucks
    for (const v of allVehicles) {
      if (!seenRegs.has(v.registrationNumber)) {
        const latestTrip = allTrips.find((t) => t.registrationNumber === v.registrationNumber);
        if (latestTrip) {
          seenRegs.add(v.registrationNumber);
          selected.push(latestTrip);
        }
      }
    }
    return selected;
  }, [runningTrips, allTrips, allVehicles]);

  // 4. Document & Maintenance Expiry Alerts
  const expiryAlerts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const alerts: { reg: string; docType: string; expiryDate: string; isExpired: boolean }[] = [];

    for (const v of allVehicles) {
      if (v.fitnessExpiry) {
        if (v.fitnessExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: 'Fitness Certificate', expiryDate: v.fitnessExpiry, isExpired: true });
        } else if (v.fitnessExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: 'Fitness Certificate', expiryDate: v.fitnessExpiry, isExpired: false });
        }
      }
      if (v.taxTokenExpiry) {
        if (v.taxTokenExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: 'Tax Token', expiryDate: v.taxTokenExpiry, isExpired: true });
        } else if (v.taxTokenExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: 'Tax Token', expiryDate: v.taxTokenExpiry, isExpired: false });
        }
      }
      if (v.insuranceExpiry) {
        if (v.insuranceExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: 'Insurance', expiryDate: v.insuranceExpiry, isExpired: true });
        } else if (v.insuranceExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: 'Insurance', expiryDate: v.insuranceExpiry, isExpired: false });
        }
      }
      if (v.routePermitExpiry) {
        if (v.routePermitExpiry < today) {
          alerts.push({ reg: v.registrationNumber, docType: 'Route Permit', expiryDate: v.routePermitExpiry, isExpired: true });
        } else if (v.routePermitExpiry <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: 'Route Permit', expiryDate: v.routePermitExpiry, isExpired: false });
        }
      }
      if (v.nextServiceDate) {
        if (v.nextServiceDate < today) {
          alerts.push({ reg: v.registrationNumber, docType: 'Scheduled Service', expiryDate: v.nextServiceDate, isExpired: true });
        } else if (v.nextServiceDate <= thirtyDaysFromNow) {
          alerts.push({ reg: v.registrationNumber, docType: 'Scheduled Service', expiryDate: v.nextServiceDate, isExpired: false });
        }
      }
    }
    return alerts;
  }, [allVehicles, bn]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Today's Income Items & Total
  const todayIncomeData = useMemo(() => {
    const jEntries = journalEntries.filter(
      (j) => j.date === todayStr && (j.transactionType === 'sale' || j.transactionType === 'income')
    );
    const tripsToday = allTrips.filter((t) => t.date === todayStr);

    const items: Array<{
      id: string;
      code: string;
      title: string;
      subtitle: string;
      category: string;
      amount: number;
      dueAmount: number;
      party: string;
      vehicle: string;
      date: string;
      trip?: ErpTransportOp;
    }> = [];

    let total = 0;

    // All trips dispatched today contribute their full freight revenue
    for (const t of tripsToday) {
      const rev = Number(t.tripRevenue || 0);
      const due = Number(t.outstandingDue !== undefined ? t.outstandingDue : t.remainingDue || 0);
      total += rev;
      items.push({
        id: t.id,
        code: t.tripOrVehicleCode,
        title: `Trip Freight: ${t.origin} ➔ ${t.destination}`,
        subtitle: `Party: ${t.customerName || 'Consignee'} • Driver: ${t.driverName}`,
        category: t.route?.includes('⇄') ? 'Round Trip Freight' : 'Single Trip Freight',
        amount: rev,
        dueAmount: due,
        party: t.customerName || 'Consignee Party',
        vehicle: t.registrationNumber,
        date: t.date,
        trip: t,
      });
    }

    // Direct collections or settlement receipts from journal that are not already from today's trips
    for (const j of jEntries) {
      const belongsToTodayTrip = tripsToday.some((t) => j.referenceNo?.includes(t.tripOrVehicleCode));
      if (!belongsToTodayTrip) {
        const amt = Number(j.amount || 0);
        total += amt;
        items.push({
          id: j.id,
          code: j.referenceNo,
          title: j.category || 'Freight Collection / Settlement',
          subtitle: j.description || 'Customer payment received',
          category: 'Customer Collection',
          amount: amt,
          dueAmount: Number(j.dueAmount || 0),
          party: j.counterpartyName || 'Client / Party',
          vehicle: j.description?.match(/DHAKA-[A-Z0-9-]+/i)?.[0] || 'Fleet Vehicle',
          date: j.date,
        });
      }
    }

    return { total, items };
  }, [journalEntries, allTrips, todayStr]);

  // Today's Expense Items & Category Breakdown
  const todayExpenseData = useMemo(() => {
    // 1. Trips dispatched or logged today (Source of truth for trip expenses)
    const tripsToday = allTrips.filter((t) => t.date === todayStr);

    // 2. Standalone fuel logs logged today
    const fuelToday = ops.filter((o) => o.recordType === 'fuel' && o.date === todayStr);

    // 3. Standalone maintenance logs logged today
    const maintToday = ops.filter(
      (o) => (o.recordType === 'maintenance' || o.recordType === 'vehicle_maintenance') && o.date === todayStr
    );

    // 4. Standalone direct expense journal entries (not trip direct outflows)
    const jEntries = journalEntries.filter(
      (j) => j.date === todayStr && j.transactionType === 'expense' && !j.referenceNo?.startsWith('EXP-TRP-')
    );

    const items: Array<{
      id: string;
      code: string;
      title: string;
      subtitle: string;
      category: 'diesel' | 'toll' | 'khoraki' | 'road' | 'maintenance' | 'labour' | 'other';
      categoryLabel: string;
      amount: number;
      party?: string;
      vehicle?: string;
      date: string;
    }> = [];

    const breakdown = {
      diesel: 0,
      toll: 0,
      khoraki: 0,
      road: 0,
      maintenance: 0,
      labour: 0,
      other: 0,
    };

    let total = 0;

    // A. Add individual expense heads from all trips dispatched today!
    for (const t of tripsToday) {
      // 1. Diesel Fuel Cost
      const diesel = Number(t.fuelCost || 0);
      if (diesel > 0) {
        total += diesel;
        breakdown.diesel += diesel;
        items.push({
          id: `${t.id}-diesel`,
          code: `${t.tripOrVehicleCode}-DSL`,
          title: `Diesel Refueling (${t.fuelLitres ? `${t.fuelLitres} L` : 'Fuel Expense'})`,
          subtitle: `${t.registrationNumber} (${t.origin} ➔ ${t.destination}) • Driver: ${t.driverName}`,
          category: 'diesel',
          categoryLabel: 'Diesel / Fuel',
          amount: diesel,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 2. Toll & Ferry Charges
      const toll = Number(t.tollCost || 0) + Number(t.ferryCost || 0);
      if (toll > 0) {
        total += toll;
        breakdown.toll += toll;
        items.push({
          id: `${t.id}-toll`,
          code: `${t.tripOrVehicleCode}-TOLL`,
          title: `Highway Toll & Ferry Charges`,
          subtitle: `${t.registrationNumber} (${t.origin} ➔ ${t.destination}) • Toll: ৳${t.tollCost || 0}${t.ferryCost ? `, Ferry: ৳${t.ferryCost}` : ''}`,
          category: 'toll',
          categoryLabel: 'Toll & Ferry',
          amount: toll,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 3. Driver Khoraki & Daily Allowance
      const khoraki = Number(t.driverKhoraki || t.driverAllowance || 0);
      if (khoraki > 0) {
        total += khoraki;
        breakdown.khoraki += khoraki;
        items.push({
          id: `${t.id}-khoraki`,
          code: `${t.tripOrVehicleCode}-KHK`,
          title: `Driver Khoraki & Daily Allowance`,
          subtitle: `Driver: ${t.driverName} • Truck: ${t.registrationNumber}`,
          category: 'khoraki',
          categoryLabel: 'Driver Khoraki & Allowance',
          amount: khoraki,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 4. Police & Highway Road Expenses
      const police = Number(t.policeRoadCost || 0);
      if (police > 0) {
        total += police;
        breakdown.road += police;
        items.push({
          id: `${t.id}-road`,
          code: `${t.tripOrVehicleCode}-ROAD`,
          title: `Police & Highway Road Clearance`,
          subtitle: `Route: ${t.origin} ➔ ${t.destination} • Truck: ${t.registrationNumber}`,
          category: 'road',
          categoryLabel: 'Police & Highway Road',
          amount: police,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 5. Labour & Loading Charges
      const labour = Number(t.labourLoadingCost || 0);
      if (labour > 0) {
        total += labour;
        breakdown.labour += labour;
        items.push({
          id: `${t.id}-labour`,
          code: `${t.tripOrVehicleCode}-LBR`,
          title: `Labour & Loading Charges`,
          subtitle: `Loading: ${t.loadingLocation || t.origin} • Truck: ${t.registrationNumber}`,
          category: 'labour',
          categoryLabel: 'Labour & Loading',
          amount: labour,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 6. Driver Commission
      const drvComm = Number(t.driverCommission || 0);
      if (drvComm > 0) {
        total += drvComm;
        breakdown.other += drvComm;
        items.push({
          id: `${t.id}-drvcomm`,
          code: `${t.tripOrVehicleCode}-DCM`,
          title: `Driver Trip Commission`,
          subtitle: `Driver: ${t.driverName} • Truck: ${t.registrationNumber}`,
          category: 'other',
          categoryLabel: 'Driver Commission',
          amount: drvComm,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 7. Broker Commission
      const comm = Number(t.commission || 0);
      if (comm > 0) {
        total += comm;
        breakdown.other += comm;
        items.push({
          id: `${t.id}-comm`,
          code: `${t.tripOrVehicleCode}-COM`,
          title: `Broker Commission`,
          subtitle: `${t.brokerName ? `Broker: ${t.brokerName} • ` : ''}Truck: ${t.registrationNumber}`,
          category: 'other',
          categoryLabel: 'Broker Commission',
          amount: comm,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }

      // 8. On-Route Maintenance / Repair
      const maint = Number(t.maintenanceCost || 0);
      if (maint > 0) {
        total += maint;
        breakdown.maintenance += maint;
        items.push({
          id: `${t.id}-maint`,
          code: `${t.tripOrVehicleCode}-MNT`,
          title: `On-Route Repair & Maintenance`,
          subtitle: `${t.maintenanceDetails || 'Emergency fix'} • Truck: ${t.registrationNumber}`,
          category: 'maintenance',
          categoryLabel: 'Workshop & Maintenance',
          amount: maint,
          vehicle: t.registrationNumber,
          date: t.date,
        });
      }
    }

    // B. Standalone Fuel Refueling Entries (not attached to a trip today)
    for (const f of fuelToday) {
      if (f.fuelCost) {
        const amt = Number(f.fuelCost);
        total += amt;
        breakdown.diesel += amt;
        items.push({
          id: f.id,
          code: f.tripOrVehicleCode || 'FUEL-LOG',
          title: `Diesel Refueling (${f.fuelLitres || 0} Litres)`,
          subtitle: `${f.fuelStation || 'Filling Station'} • Driver: ${f.driverName || 'Driver'}`,
          category: 'diesel',
          categoryLabel: 'Diesel / Fuel',
          amount: amt,
          vehicle: f.registrationNumber,
          date: f.date,
        });
      }
    }

    // C. Standalone Workshop / Maintenance Entries (not attached to a trip today)
    for (const m of maintToday) {
      if (m.maintenanceCost || m.partsCost) {
        const amt = Number(m.maintenanceCost || m.partsCost);
        total += amt;
        breakdown.maintenance += amt;
        items.push({
          id: m.id,
          code: m.tripOrVehicleCode || 'MAINT-LOG',
          title: `Workshop Repair: ${m.cargoDetails || m.maintenanceDetails || 'Service'}`,
          subtitle: `Garage: ${m.origin || m.garageName || 'Garage'} • Mechanic: ${m.driverName || m.mechanicName || 'N/A'}`,
          category: 'maintenance',
          categoryLabel: 'Workshop & Maintenance',
          amount: amt,
          vehicle: m.registrationNumber,
          date: m.date,
        });
      }
    }

    // D. Standalone Journal Expenses
    for (const j of jEntries) {
      const amt = Number(j.amount || 0);
      total += amt;
      const catLower = ((j.category || '') + ' ' + (j.description || '')).toLowerCase();
      let cat: 'diesel' | 'toll' | 'khoraki' | 'road' | 'maintenance' | 'labour' | 'other' = 'other';
      let label = 'Other Expense';

      if (catLower.includes('diesel') || catLower.includes('fuel') || catLower.includes('তেল')) {
        cat = 'diesel';
        label = 'Diesel / Fuel';
        breakdown.diesel += amt;
      } else if (catLower.includes('toll') || catLower.includes('ferry') || catLower.includes('টোল')) {
        cat = 'toll';
        label = 'Toll & Ferry';
        breakdown.toll += amt;
      } else if (catLower.includes('khoraki') || catLower.includes('allowance') || catLower.includes('খোরাকি')) {
        cat = 'khoraki';
        label = 'Driver Khoraki';
        breakdown.khoraki += amt;
      } else if (catLower.includes('police') || catLower.includes('road') || catLower.includes('রাস্তা')) {
        cat = 'road';
        label = 'Police & Highway Road';
        breakdown.road += amt;
      } else if (catLower.includes('maintenance') || catLower.includes('repair') || catLower.includes('garage') || catLower.includes('মেরামত')) {
        cat = 'maintenance';
        label = 'Workshop & Maintenance';
        breakdown.maintenance += amt;
      } else if (catLower.includes('labour') || catLower.includes('loading') || catLower.includes('লেবার')) {
        cat = 'labour';
        label = 'Labour & Loading';
        breakdown.labour += amt;
      } else {
        breakdown.other += amt;
      }

      items.push({
        id: j.id,
        code: j.referenceNo,
        title: j.category || label,
        subtitle: j.description || j.referenceNo,
        category: cat,
        categoryLabel: label,
        amount: amt,
        party: j.counterpartyName,
        vehicle: j.description?.match(/DHAKA-[A-Z0-9-]+/i)?.[0] || 'Fleet Vehicle',
        date: j.date,
      });
    }

    return { total, items, breakdown };
  }, [allTrips, ops, journalEntries, todayStr]);

  // Active / Detailed Maintenance Records
  const activeMaintenanceList = useMemo(() => {
    const list: Array<{
      id: string;
      truckReg: string;
      truckName: string;
      garageName: string;
      garageAddress: string;
      mechanicName: string;
      mechanicPhone: string;
      problemDescription: string;
      partsReplaced: string;
      tyreOrBatterySerial: string;
      warranty: string;
      partsCost: number;
      labourCost: number;
      totalCost: number;
      status: string;
      date: string;
      daysInGarage: number;
      avgDailyRevenue: number;
      demurrage: number;
    }> = [];

    // Helper: compute demurrage for a truck
    const computeDemurrage = (reg: string, serviceDate: string) => {
      const startMs = new Date(serviceDate || todayStr).getTime();
      const todayMs = new Date(todayStr).getTime();
      const daysInGarage = Math.max(1, Math.round((todayMs - startMs) / 86400000));
      // Average daily revenue from completed trips for this truck
      const truckCompletedTrips = allTrips.filter(
        (t) => t.registrationNumber === reg && t.status === 'completed' && Number(t.tripRevenue || 0) > 0
      );
      const avgDailyRevenue =
        truckCompletedTrips.length > 0
          ? truckCompletedTrips.reduce((s, t) => s + Number(t.tripRevenue || 0), 0) /
            truckCompletedTrips.length /
            2 // assume ~2 days per trip avg
          : 5000; // fallback BDT 5000/day if no history
      const demurrage = Math.round(daysInGarage * avgDailyRevenue);
      return { daysInGarage, avgDailyRevenue: Math.round(avgDailyRevenue), demurrage };
    };

    // 1. Existing maintenance logs in ops
    for (const m of allMaintenanceLogs) {
      const { daysInGarage, avgDailyRevenue, demurrage } = computeDemurrage(m.registrationNumber, m.date || todayStr);
      list.push({
        id: m.id,
        truckReg: m.registrationNumber,
        truckName: m.truckName || m.vehicleType || 'Heavy Commercial Truck',
        garageName: m.origin || m.garageName || (m as any).customerName || 'Central Freight Workshop, Tejgaon',
        garageAddress: m.garageAddress || 'Tejgaon Truck Terminal Road, Dhaka',
        mechanicName: m.driverName || m.mechanicName || 'Ustad Rafiqul Islam (Chief Mechanic)',
        mechanicPhone: m.mechanicPhone || '+880 1715-889900',
        problemDescription: m.cargoDetails || m.problemDescription || m.maintenanceDetails || 'Engine overheating & brake shoe replacement',
        partsReplaced: m.partsReplaced || 'Heavy-duty Brake Shoe Set & Engine Coolant Filter',
        tyreOrBatterySerial: m.tyreOrBatterySerial || 'BAT-EXIDE-2026-991',
        warranty: m.warrantyExpiryDate || m.serviceWarranty || '6 Months Replacement Warranty',
        partsCost: Number(m.partsCost || 6500),
        labourCost: Number(m.labourCost || 1500),
        totalCost: Number(m.maintenanceCost || (Number(m.partsCost || 6500) + Number(m.labourCost || 1500))),
        status: m.status === 'completed' ? 'Completed & Tested' : 'Under Workshop Repair',
        date: m.date || todayStr,
        daysInGarage,
        avgDailyRevenue,
        demurrage,
      });
    }

    // 2. Any vehicle marked as 'maintenance' or 'workshop'
    for (const v of allVehicles) {
      if (v.status === 'maintenance' || v.status === 'workshop' || v.status === 'repair') {
        const exists = list.some((l) => l.truckReg === v.registrationNumber);
        if (!exists) {
          const { daysInGarage, avgDailyRevenue, demurrage } = computeDemurrage(v.registrationNumber, todayStr);
          list.unshift({
            id: v.id,
            truckReg: v.registrationNumber,
            truckName: v.truckName || v.vehicleType || 'Heavy Freight Truck',
            garageName: 'Meghna Motors Heavy Diesel Workshop',
            garageAddress: 'Tejgaon Industrial Area Truck Stand, Dhaka',
            mechanicName: 'Ustad Alamgir Hossain (Master Mechanic)',
            mechanicPhone: '+880 1712-445566',
            problemDescription: 'Gearbox clutch plate slipping & steering rack alignment issue',
            partsReplaced: 'Original Exedy Clutch Plate Kit, Pressure Plate & Release Bearing',
            tyreOrBatterySerial: 'TYRE-BRIDGESTONE-8820',
            warranty: '1 Year Manufacturer Warranty',
            partsCost: 14500,
            labourCost: 3500,
            totalCost: 18000,
            status: 'Under Workshop Repair',
            date: todayStr,
            daysInGarage,
            avgDailyRevenue,
            demurrage,
          });
        }
      }
    }

    return list;
  }, [allMaintenanceLogs, allVehicles, allTrips, todayStr]);

  // 5. Dashboard Top Summary KPIs (with Today's figures first)
  const dashboardKpis = useMemo(() => {
    const totalTrucks = allVehicles.length;
    const runningCount = allVehicles.filter((v) => getTruckActiveTrip(v.registrationNumber).isOnTrip).length;
    const maintenanceCount = Math.max(
      allVehicles.filter((v) => v.status === 'maintenance' || v.status === 'workshop' || v.status === 'repair').length,
      activeMaintenanceList.filter((m) => m.status.includes('Under Workshop Repair')).length
    );
    const availableCount = Math.max(0, totalTrucks - runningCount - maintenanceCount);
    const totalDrivers = allDrivers.length;
    const totalDistance = allTrips.reduce((s, t) => s + Number(t.distanceKm || 0), 0);

    // Filter by month/year for monthly metrics
    const currentMonthPrefix = selectedMonth !== 'ALL' ? `${selectedYear}-${selectedMonth}` : selectedYear;
    const monthlyTrips = allTrips.filter((t) => t.date && t.date.startsWith(currentMonthPrefix));
    const monthlyRevenue = monthlyTrips.reduce((s, t) => s + Number(t.tripRevenue || 0) + Number(t.demurrageAmount || 0), 0);
    const monthlyExpenses = monthlyTrips.reduce((s, t) => {
      const exp = Number(t.tripExpense || 0) > 0
        ? Number(t.tripExpense)
        : Number(t.fuelCost || 0) +
          Number(t.tollCost || 0) +
          Number(t.ferryCost || 0) +
          Number(t.driverKhoraki || t.driverAllowance || 0) +
          Number(t.policeRoadCost || 0) +
          Number(t.labourLoadingCost || 0) +
          Number(t.maintenanceCost || 0) +
          Number(t.driverCommission || 0) +
          Number(t.commission || 0);
      return s + exp;
    }, 0);
    const standaloneMonthlyFuel = ops
      .filter((o) => o.recordType === 'fuel' && o.date && o.date.startsWith(currentMonthPrefix))
      .reduce((s, f) => s + Number(f.fuelCost || 0), 0);
    const standaloneMonthlyMaint = ops
      .filter((o) => (o.recordType === 'maintenance' || o.recordType === 'vehicle_maintenance') && o.date && o.date.startsWith(currentMonthPrefix))
      .reduce((s, m) => s + Number(m.maintenanceCost || m.partsCost || 0), 0);
    const totalMonthlyExpenses = monthlyExpenses + standaloneMonthlyFuel + standaloneMonthlyMaint;
    const monthlyNetProfit = monthlyRevenue - totalMonthlyExpenses;

    return {
      todayIncome: todayIncomeData.total,
      todayExpenses: todayExpenseData.total,
      totalTrucks,
      runningCount,
      availableCount,
      maintenanceCount,
      totalDrivers,
      totalDistance,
      monthlyRevenue,
      monthlyExpenses: totalMonthlyExpenses,
      monthlyNetProfit,
    };
  }, [allVehicles, runningTrips, allDrivers, allTrips, ops, selectedMonth, selectedYear, todayIncomeData, todayExpenseData, activeMaintenanceList, getTruckActiveTrip]);

  // 6. Form State: + Add New Vehicle
  const [newVehReg, setNewVehReg] = useState('DHAKA-METRO-T-12-3456');
  const [newVehName, setNewVehName] = useState('Hino 500 Heavy Freight');
  const [newVehCode, setNewVehCode] = useState(`TRK-${Date.now().toString().slice(-4)}`);
  const [newVehBodyType, setNewVehBodyType] = useState<string>('covered');
  const [newVehCapacityTons, setNewVehCapacityTons] = useState<number>(15);
  const [newVehEngineNo, setNewVehEngineNo] = useState('ENG-HINO-883921');
  const [newVehChassisNo, setNewVehChassisNo] = useState('CHS-500-772910');
  const [newVehBrand, setNewVehBrand] = useState('Hino');
  const [newVehModel, setNewVehModel] = useState('500 Series');
  const [newVehYear, setNewVehYear] = useState('2022');
  const [newVehPurchasePrice, setNewVehPurchasePrice] = useState<number>(2800000);
  const [newVehFuelType, setNewVehFuelType] = useState('Diesel');
  const [newVehOdometer, setNewVehOdometer] = useState<number>(45000);
  const [newVehDriver, setNewVehDriver] = useState('');
  const [newVehDriverPhone, setNewVehDriverPhone] = useState('');
  const [addTripTruckSearch, setAddTripTruckSearch] = useState('');
  const [quickDispatchTruckSearch, setQuickDispatchTruckSearch] = useState('');
  const [contractTruckSearch, setContractTruckSearch] = useState('');
  const [newVehTaxTokenExp, setNewVehTaxTokenExp] = useState('2027-06-30');
  const [newVehFitnessExp, setNewVehFitnessExp] = useState('2027-05-31');
  const [newVehInsuranceExp, setNewVehInsuranceExp] = useState('2027-08-31');
  const [newVehRoutePermitExp, setNewVehRoutePermitExp] = useState('2027-12-31');
  const [newVehNextServiceDate, setNewVehNextServiceDate] = useState('2027-02-28');
  const [newVehNextServiceKm, setNewVehNextServiceKm] = useState<number>(50000);

  // 7. Form State: + Add New Trip (Outgoing + Return + Expenses + Auto Calculation)
  const [tripTruckReg, setTripTruckReg] = useState(allVehicles[0]?.registrationNumber || 'DHAKA-METRO-T-12-3456');
  const [tripChallanNo, setTripChallanNo] = useState('');
  const [tripOrderNo, setTripOrderNo] = useState('');
  const [tripDriverName, setTripDriverName] = useState('Abdul Karim');
  const [tripDriverPhone, setTripDriverPhone] = useState('');
  const [tripHelperName, setTripHelperName] = useState('');
  const [tripStartLoc, setTripStartLoc] = useState('');
  const [tripDestLoc, setTripDestLoc] = useState('');
  const [tripLoadLoc, setTripLoadLoc] = useState('');
  const [tripDeliverLoc, setTripDeliverLoc] = useState('');
  const [tripCustomer, setTripCustomer] = useState('');
  const [tripReceiverPhone, setTripReceiverPhone] = useState('');
  const [tripBrokerName, setTripBrokerName] = useState('');
  const [tripCargo, setTripCargo] = useState('Farm feed and livestock freight');
  const [tripStartDate, setTripStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [tripExpectedReturn, setTripExpectedReturn] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [tripStartKm, setTripStartKm] = useState<number>(45000);
  const [tripEndKm, setTripEndKm] = useState<number>(45260);
  const [tripFare, setTripFare] = useState<number>(0);
  const [tripAdvance, setTripAdvance] = useState<number>(0);
  const [tripCommission, setTripCommission] = useState<number>(0);
  const [tripDriverCommission, setTripDriverCommission] = useState<number>(0);
  const [tripDriverCommMode, setTripDriverCommMode] = useState<'percent' | 'manual'>('manual');
  const [tripDriverCommPercent, setTripDriverCommPercent] = useState<number | ''>('');

  // Demurrage (Detention Delay / Waiting Fine for Normal & Contract Trips)
  const [tripDemurrage, setTripDemurrage] = useState<number>(0);
  const [tripDemurrageDays, setTripDemurrageDays] = useState<number>(0);
  const [tripDemurrageDailyRate, setTripDemurrageDailyRate] = useState<number>(3000);
  const [tripDemurrageReason, setTripDemurrageReason] = useState<string>('Factory Unloading Delay (Exceeded 24h standard)');
  const [tripDistanceKm, setTripDistanceKm] = useState<number>(260);

  // Trip Delay, Duration Extension & Demurrage Modal
  const [showTripDelayModal, setShowTripDelayModal] = useState(false);
  const [delayTrip, setDelayTrip] = useState<ErpTransportOp | null>(null);
  const [delayExtraDays, setDelayExtraDays] = useState<number>(1);
  const [delayNewReturnDate, setDelayNewReturnDate] = useState<string>('');
  const [delayBillDemurrage, setDelayBillDemurrage] = useState<boolean>(true);
  const [delayDemurrageDailyRate, setDelayDemurrageDailyRate] = useState<number>(3000);
  const [delayDemurrageAmount, setDelayDemurrageAmount] = useState<number>(3000);
  const [delayReason, setDelayReason] = useState<string>('Factory Unloading Delay (Exceeded standard 24h)');
  const [delayDriverKhoraki, setDelayDriverKhoraki] = useState<number>(500);

  const handleOpenExtendTrip = (trip: ErpTransportOp) => {
    setDelayTrip(trip);
    const currentRet = trip.expectedReturnDate || trip.date || new Date().toISOString().slice(0, 10);
    const d = new Date(currentRet);
    d.setDate(d.getDate() + 1);
    const nextDate = d.toISOString().slice(0, 10);
    setDelayExtraDays(1);
    setDelayNewReturnDate(nextDate);
    setDelayBillDemurrage(true);
    const rate = Number(trip.demurrageDailyRate || 3000);
    setDelayDemurrageDailyRate(rate);
    setDelayDemurrageAmount(rate * 1);
    setDelayReason(trip.demurrageReason || 'Factory Unloading Delay (Exceeded standard 24h)');
    setDelayDriverKhoraki(500);
    setShowTripDelayModal(true);
  };

  const handleSetDelayDays = (days: number) => {
    setDelayExtraDays(days);
    if (delayTrip) {
      const currentRet = delayTrip.expectedReturnDate || delayTrip.date || new Date().toISOString().slice(0, 10);
      const d = new Date(currentRet);
      d.setDate(d.getDate() + days);
      setDelayNewReturnDate(d.toISOString().slice(0, 10));
      setDelayDemurrageAmount(days * delayDemurrageDailyRate);
      setDelayDriverKhoraki(days * 500);
    }
  };

  const handleReturnDateChange = (newDate: string) => {
    setDelayNewReturnDate(newDate);
    if (delayTrip) {
      const currentRet = delayTrip.expectedReturnDate || delayTrip.date || new Date().toISOString().slice(0, 10);
      const diffMs = new Date(newDate).getTime() - new Date(currentRet).getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      setDelayExtraDays(diffDays);
      setDelayDemurrageAmount(diffDays * delayDemurrageDailyRate);
      setDelayDriverKhoraki(diffDays * 500);
    }
  };

  const handleSaveTripExtensionAndDemurrage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delayTrip) return;
    setIsSubmitting(true);
    try {
      const addedDemurrage = delayBillDemurrage ? Number(delayDemurrageAmount || 0) : 0;
      const addedDays = delayBillDemurrage ? Number(delayExtraDays || 0) : 0;
      const newDemurrageTotal = Number(delayTrip.demurrageAmount || 0) + addedDemurrage;
      const newDemurrageDays = Number(delayTrip.demurrageDays || 0) + addedDays;
      const addedKhoraki = Number(delayDriverKhoraki || 0);
      const newKhoraki = Number(delayTrip.driverKhoraki || delayTrip.driverAllowance || 0) + addedKhoraki;
      const newExpense = Number(delayTrip.tripExpense || 0) + addedKhoraki;

      const totalBilled = Number(delayTrip.tripRevenue || 0) + newDemurrageTotal;
      const totalAdvance = Number(delayTrip.advanceReceived || delayTrip.advancePaid || 0);
      const newDue = Math.max(0, totalBilled - totalAdvance);

      const note = `[Delay Extended +${delayExtraDays}d to ${delayNewReturnDate}: ${delayReason}${addedDemurrage > 0 ? ` (+৳${addedDemurrage} Demurrage)` : ''}${addedKhoraki > 0 ? ` (+৳${addedKhoraki} Extra Khoraki)` : ''}]`;
      const updatedRemarks = delayTrip.remarks ? `${delayTrip.remarks} ${note}` : note;

      const delayTasks: Promise<any>[] = [
        updateTransportOpRecord(
          delayTrip,
          {
            expectedReturnDate: delayNewReturnDate,
            demurrageAmount: newDemurrageTotal,
            demurrageDays: newDemurrageDays,
            demurrageDailyRate: delayDemurrageDailyRate,
            demurrageReason: delayReason,
            demurrageDriverAllowance: (Number(delayTrip.demurrageDriverAllowance || 0)) + addedKhoraki,
            driverKhoraki: newKhoraki,
            driverAllowance: newKhoraki,
            tripExpense: newExpense,
            outstandingDue: newDue,
            remainingDue: newDue,
            remarks: updatedRemarks,
          },
          actorEmail
        )
      ];

      // Also ensure vehicle record reflects the extended date
      const veh = allVehicles.find((v) => normalizeReg(v.registrationNumber) === normalizeReg(delayTrip.registrationNumber));
      if (veh) {
        delayTasks.push(
          updateTransportOpRecord(
            veh,
            {
              expectedReturnDate: delayNewReturnDate,
              status: 'active',
            },
            actorEmail
          ).catch((e) => console.warn('Auto-updating vehicle delay return date', e))
        );
      }

      await Promise.all(delayTasks);

      setShowTripDelayModal(false);
      triggerGlobalToast(`Trip ${delayTrip.tripOrVehicleCode} extended to ${delayNewReturnDate}! Demurrage ৳${addedDemurrage.toLocaleString()} applied.`, 'success');
    } catch (err: any) {
      triggerGlobalToast(err.message || 'Failed to update trip delay', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Active Trip & Release Truck back to Available
  const handleCancelActiveTrip = async (tripId?: string, truckReg?: string) => {
    const targetTrip = allTrips.find((t) => (tripId && (t.id === tripId || t.tripOrVehicleCode === tripId)) || (truckReg && normalizeReg(t.registrationNumber) === normalizeReg(truckReg) && (t.status === 'active' || t.status === 'running') && !t.actualReturnDate));
    const reg = truckReg || targetTrip?.registrationNumber;
    const confirmCancel = window.confirm(
      `Cancel active trip ${targetTrip?.challanNumber || targetTrip?.tripOrVehicleCode || ''} and release truck ${reg || ''} back to Available?`
    );
    if (!confirmCancel) return;

    try {
      const today = new Date().toISOString().slice(0, 10);
      if (targetTrip) {
        await updateTransportOpRecord(
          targetTrip,
          {
            status: 'cancelled',
            actualReturnDate: today,
            remarks: `${targetTrip.remarks || ''} [Trip cancelled by dispatcher on ${today}. Vehicle released]`.trim(),
          },
          actorEmail
        );
      }

      if (reg) {
        const veh = allVehicles.find((v) => normalizeReg(v.registrationNumber) === normalizeReg(reg));
        if (veh) {
          await updateTransportOpRecord(
            veh,
            {
              status: 'available',
              expectedReturnDate: undefined,
            },
            actorEmail
          );
        }
      }

      triggerGlobalToast(`Trip cancelled successfully. Truck ${reg || ''} is now Available! 🚛✨`, 'success');
      if (selectedTruckForDetails && normalizeReg(selectedTruckForDetails.registrationNumber) === normalizeReg(reg)) {
        setSelectedTruckForDetails(null);
      }
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error cancelling trip', 'info');
    }
  };

  // Return Load (Round Trip / Back Load)
  const [tripHasReturn, setTripHasReturn] = useState(false);
  const [tripReturnLoadLoc, setTripReturnLoadLoc] = useState('');
  const [tripReturnUnloadLoc, setTripReturnUnloadLoc] = useState('');
  const [tripReturnFare, setTripReturnFare] = useState<number>(0);
  const [tripReturnDriverCash, setTripReturnDriverCash] = useState<number>(0);

  // Trip Expenses Breakdown
  const [tripDieselCost, setTripDieselCost] = useState<number>(0);
  const [tripFuelLitres, setTripFuelLitres] = useState<number>(0);
  const [tripTollCost, setTripTollCost] = useState<number>(0);
  const [tripFerryCost, setTripFerryCost] = useState<number>(0);
  const [tripDriverKhoraki, setTripDriverKhoraki] = useState<number>(0);
  const [tripPoliceCost, setTripPoliceCost] = useState<number>(0);
  const [tripLabourCost, setTripLabourCost] = useState<number>(0);
  const [tripOtherCost, setTripOtherCost] = useState<number>(0);
  const [tripWalletId, setTripWalletId] = useState(treasuryWallets[0]?.id || '');
  const [tripRemarks, setTripRemarks] = useState('');
  const [tripImageUrl, setTripImageUrl] = useState('');

  // Return Load Direct Modal (for adding or updating return trip on running or active trips)
  const [showAddReturnLoadModal, setShowAddReturnLoadModal] = useState(false);
  const [targetTripForReturnLoad, setTargetTripForReturnLoad] = useState<ErpTransportOp | null>(null);
  const [retLoadPoint, setRetLoadPoint] = useState('');
  const [retUnloadPoint, setRetUnloadPoint] = useState('');
  const [retFare, setRetFare] = useState<number>(0);
  const [retDriverCash, setRetDriverCash] = useState<number>(0);

  const handleOpenAddReturnLoadModal = (trip: ErpTransportOp) => {
    setTargetTripForReturnLoad(trip);
    setRetLoadPoint(trip.returnLoadingPoint || trip.destination || 'Chittagong');
    setRetUnloadPoint(trip.returnUnloadingPoint || trip.origin || 'Dhaka');
    setRetFare(trip.returnFare || 0);
    setRetDriverCash(trip.returnDriverCash || 0);
    setShowAddReturnLoadModal(true);
  };

  const handleSaveReturnLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTripForReturnLoad) return;
    setIsSubmitting(true);
    try {
      const existingRetFare = targetTripForReturnLoad.returnFare || 0;
      const baseOutgoingFare = (targetTripForReturnLoad.tripRevenue || 0) > existingRetFare
        ? (targetTripForReturnLoad.tripRevenue || 0) - existingRetFare
        : (targetTripForReturnLoad.tripRevenue || 0);
      const newTotalRev = baseOutgoingFare + Number(retFare || 0);
      const totalRecv = Number(targetTripForReturnLoad.advanceReceived || 0) + Number(retDriverCash || 0);
      const newDue = Math.max(0, newTotalRev - totalRecv);
      const returnUnload = retUnloadPoint.trim() || targetTripForReturnLoad.origin;
      const updatedRoute = `${targetTripForReturnLoad.origin} ➔ ${targetTripForReturnLoad.destination} ⇄ ${returnUnload}`;

      await updateTransportOpRecord(
        targetTripForReturnLoad,
        {
          returnLoadingPoint: retLoadPoint.trim(),
          returnUnloadingPoint: returnUnload,
          returnFare: Number(retFare || 0),
          returnDriverCash: Number(retDriverCash || 0),
          tripRevenue: newTotalRev,
          outstandingDue: newDue,
          remainingDue: newDue,
          route: updatedRoute,
        },
        actorEmail
      );
      triggerGlobalToast(`Return load added to ${targetTripForReturnLoad.tripOrVehicleCode}!`, 'success');
      setShowAddReturnLoadModal(false);
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error saving return load', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit Trip: Open modal pre-filled with existing data ────────────────
  const handleOpenEditTrip = (trip: ErpTransportOp) => {
    setEditingTrip(trip);
    setEditTripFare(Number(trip.tripRevenue || 0));
    setEditTripAdvance(Number(trip.advanceReceived || 0));
    setEditTripDiesel(Number(trip.fuelCost || 0));
    setEditTripToll(Number(trip.tollCost || 0));
    setEditTripFerry(Number(trip.ferryCost || 0));
    setEditTripKhoraki(Number(trip.driverKhoraki || trip.driverAllowance || 0));
    setEditTripPolice(Number(trip.policeRoadCost || 0));
    setEditTripLabour(Number(trip.labourLoadingCost || 0));
    setEditTripCommission(Number(trip.commission || 0));
    const drvComm = Number(trip.driverCommission !== undefined ? trip.driverCommission : trip.commission || 0);
    setEditTripDriverCommission(drvComm);
    setEditTripOther(Number(trip.otherCosts || 0));
    setEditTripCustomer(trip.customerName || '');
    setEditTripOrigin(trip.loadingLocation || trip.origin || '');
    setEditTripDestination(trip.deliveryLocation || trip.destination || '');
    setEditTripCargo(trip.cargoDetails || '');
    const initialDriver = resolveTripDriverName(trip);
    setEditTripDriver(initialDriver);
    setEditTripDriverPhone(trip.driverPhone || resolveTripDriverPhone(trip));
    setEditTripRemarks(trip.remarks || '');
    setEditTripDistanceKm(Number(trip.distanceKm || 0));
    setEditTripReturnDate(trip.expectedReturnDate || '');
    setEditTripDemurrageAmount(Number(trip.demurrageAmount || 0));
    setEditTripDemurrageDays(Number(trip.demurrageDays || 0));
    setEditTripDemurrageDailyRate(Number(trip.demurrageDailyRate || 3000));
    setEditTripDemurrageReason(trip.demurrageReason || 'Factory Unloading Delay');

    const expBeforeDr =
      Number(trip.fuelCost || 0) +
      Number(trip.tollCost || 0) +
      Number(trip.ferryCost || 0) +
      Number(trip.driverKhoraki || trip.driverAllowance || 0) +
      Number(trip.policeRoadCost || 0) +
      Number(trip.labourLoadingCost || 0) +
      Number(trip.commission || 0) +
      Number(trip.otherCosts || 0);
    const netBeforeDr = Math.max(0, Number(trip.tripRevenue || 0) + Number(trip.demurrageAmount || 0) - expBeforeDr);
    if (netBeforeDr > 0 && drvComm > 0) {
      setEditTripDriverCommPercent(Number(((drvComm / netBeforeDr) * 100).toFixed(1)));
    } else {
      setEditTripDriverCommPercent('');
    }

    setShowEditTripModal(true);
  };

  // ── Edit Trip: Save updated data ────────────────────────────────────────
  const handleSaveEditTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    setIsSubmitting(true);
    try {
      const totalExpense =
        editTripDiesel + editTripToll + editTripFerry + editTripKhoraki +
        editTripPolice + editTripLabour + editTripCommission + editTripDriverCommission + editTripOther;
      const totalIncome = editTripFare + editTripDemurrageAmount;
      const newDue = Math.max(0, totalIncome - editTripAdvance);

      await updateTransportOpRecord(
        editingTrip,
        {
          tripRevenue: editTripFare,
          demurrageAmount: editTripDemurrageAmount,
          demurrageDays: editTripDemurrageDays,
          demurrageDailyRate: editTripDemurrageDailyRate,
          demurrageReason: editTripDemurrageReason,
          expectedReturnDate: editTripReturnDate || editingTrip.expectedReturnDate,
          advanceReceived: editTripAdvance,
          outstandingDue: newDue,
          remainingDue: newDue,
          fuelCost: editTripDiesel,
          tollCost: editTripToll,
          ferryCost: editTripFerry,
          driverKhoraki: editTripKhoraki,
          driverAllowance: editTripKhoraki,
          policeRoadCost: editTripPolice,
          labourLoadingCost: editTripLabour,
          commission: editTripCommission,
          driverCommission: editTripDriverCommission,
          otherCosts: editTripOther,
          tripExpense: totalExpense,
          customerName: editTripCustomer.trim(),
          driverName: editTripDriver.trim() || 'Unassigned',
          driverPhone: editTripDriverPhone.trim() || undefined,
          origin: editTripOrigin.trim() || editingTrip.origin,
          destination: editTripDestination.trim() || editingTrip.destination,
          loadingLocation: editTripOrigin.trim() || editingTrip.loadingLocation || editingTrip.origin,
          deliveryLocation: editTripDestination.trim() || editingTrip.deliveryLocation || editingTrip.destination,
          route: `${editTripOrigin.trim() || editingTrip.origin} ➔ ${editTripDestination.trim() || editingTrip.destination}`,
          cargoDetails: editTripCargo.trim(),
          remarks: editTripRemarks.trim(),
          distanceKm: editTripDistanceKm,
        },
        actorEmail
      );

      // Auto-sync vehicle expectedReturnDate if updated
      if (editTripReturnDate) {
        const veh = allVehicles.find((v) => normalizeReg(v.registrationNumber) === normalizeReg(editingTrip.registrationNumber));
        if (veh) {
          await updateTransportOpRecord(
            veh,
            { expectedReturnDate: editTripReturnDate, status: 'active' },
            actorEmail
          );
        }
      }

      setShowEditTripModal(false);
      setEditingTrip(null);
      triggerGlobalToast(`Trip ${editingTrip.tripOrVehicleCode} updated successfully! ✅`, 'success');
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Failed to update trip', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit Vehicle: Open modal pre-filled with vehicle data ──────────────
  const handleOpenEditVehicle = (v: ErpTransportOp) => {
    setEditingVehicle(v);
    setEditVehReg(v.registrationNumber || '');
    setEditVehName(v.truckName || v.vehicleType || '');
    setEditVehDriver(v.driverName || '');
    const d = allDrivers.find(
      (dr) =>
        dr.name.toLowerCase() === (v.driverName || '').toLowerCase() ||
        normalizeReg(dr.truck) === normalizeReg(v.registrationNumber)
    );
    setEditVehDriverPhone(v.driverPhone || d?.phone || '');
    setEditVehOdometer(Number(v.currentOdometer || v.distanceKm || 0));
    setEditVehCapacity(Number(v.capacityTons || 0));
    setEditVehBodyType(v.truckBodyType || 'covered');
    setEditVehTaxToken(v.taxTokenExpiry || '');
    setEditVehFitness(v.fitnessExpiry || '');
    setEditVehInsurance(v.insuranceExpiry || '');
    setEditVehRoutePermit(v.routePermitExpiry || '');
    setEditVehStatus(v.status || 'available');
    setShowEditVehicleModal(true);
  };

  // ── Edit Vehicle: Save updated data ────────────────────────────────────
  const handleSaveEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setIsSubmitting(true);
    try {
      const updatedDriverName = editVehDriver.trim() || 'Unassigned';
      const updatedDriverPhone = editVehDriverPhone.trim();
      await updateTransportOpRecord(
        editingVehicle,
        {
          registrationNumber: editVehReg.trim(),
          truckName: editVehName.trim(),
          driverName: updatedDriverName,
          driverPhone: updatedDriverPhone,
          currentOdometer: editVehOdometer,
          capacityTons: editVehCapacity,
          truckBodyType: editVehBodyType,
          taxTokenExpiry: editVehTaxToken,
          fitnessExpiry: editVehFitness,
          insuranceExpiry: editVehInsurance,
          routePermitExpiry: editVehRoutePermit,
          status: editVehStatus as any,
        },
        actorEmail
      );

      // Auto-synchronize driver name with any active or running trips for this truck
      const activeTripsOfVehicle = allTrips.filter(
        (t) =>
          (normalizeReg(t.registrationNumber) === normalizeReg(editingVehicle.registrationNumber) ||
            normalizeReg(t.registrationNumber) === normalizeReg(editVehReg.trim())) &&
          (t.status === 'active' || t.status === 'running')
      );
      const drvObj = allDrivers.find((d) => d.name.toLowerCase() === updatedDriverName.toLowerCase());
      for (const tr of activeTripsOfVehicle) {
        try {
          await updateTransportOpRecord(
            tr,
            {
              driverName: updatedDriverName,
              ...(updatedDriverPhone ? { driverPhone: updatedDriverPhone } : (drvObj?.phone ? { driverPhone: drvObj.phone } : {})),
              ...(drvObj?.license ? { driverLicense: drvObj.license } : {}),
            },
            actorEmail
          );
        } catch (e) {
          console.warn('Error auto-syncing trip driver:', e);
        }
      }

      setShowEditVehicleModal(false);
      setEditingVehicle(null);
      triggerGlobalToast(`Truck ${editVehReg} updated successfully! ✅`, 'success');
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Failed to update truck', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTruckSelectChange = useCallback(
    (reg: string) => {
      setTripTruckReg(reg);
      const v = allVehicles.find((veh) => normalizeReg(veh.registrationNumber) === normalizeReg(reg));
      if (v?.driverName) {
        setTripDriverName(v.driverName);
        const d = allDrivers.find(
          (dr) =>
            dr.name.toLowerCase() === v.driverName?.toLowerCase() ||
            normalizeReg(dr.truck) === normalizeReg(reg)
        );
        if (v.driverPhone) setTripDriverPhone(v.driverPhone);
        else if (d?.phone) setTripDriverPhone(d.phone);
        else setTripDriverPhone('');
      } else {
        const fallbackDriver = allDrivers.find((dr) => normalizeReg(dr.truck) === normalizeReg(reg)) || allDrivers[0];
        if (fallbackDriver) {
          setTripDriverName(fallbackDriver.name);
          setTripDriverPhone(fallbackDriver.phone || '');
        }
      }

      // Auto-fill Garments contract details if truck is assigned to a Garments contract
      const contract = getTruckAssignedGarments(reg);
      if (contract) {
        const cClient = contract.clientName || contract.customerName || '';
        if (cClient) setTripCustomer(cClient);
        const cOrigin = contract.factoryLocation || contract.origin || '';
        if (cOrigin) {
          setTripLoadLoc(cOrigin);
          setTripStartLoc(cOrigin);
        }
        const cDest = contract.destination || 'Chittagong Port';
        if (cDest) {
          setTripDeliverLoc(cDest);
          setTripDestLoc(cDest);
        }
        if (contract.cargoDetails) {
          setTripCargo(contract.cargoDetails);
        }
        if (contract.agreedRate && contract.agreedRate > 0) {
          setTripFare(contract.agreedRate);
        }
      }
    },
    [allVehicles, allDrivers, getTruckAssignedGarments]
  );

  const resetTripFormState = () => {
    // Pick first available truck that is not currently running an active trip, or first truck
    const availableVeh = allVehicles.find(
      (v) => !allTrips.some((t) => t.registrationNumber === v.registrationNumber && (t.status === 'active' || t.status === 'running'))
    ) || allVehicles[0];

    const reg = availableVeh?.registrationNumber || 'DHAKA-METRO-TA-12-3456';
    handleTruckSelectChange(reg);
    setTripHelperName('');
    setTripStartLoc('');
    setTripDestLoc('');
    setTripLoadLoc('');
    setTripDeliverLoc('');
    setTripCustomer('');
    setTripReceiverPhone('');
    setTripBrokerName('');
    setTripCargo('Farm feed and livestock freight');
    setTripStartDate(todayStr);
    setTripExpectedReturn(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
    setTripFare(0);
    setTripAdvance(0);
    setTripCommission(0);
    setTripDriverCommission(0);
    setTripHasReturn(false);
    setTripReturnLoadLoc('');
    setTripReturnUnloadLoc('');
    setTripReturnFare(0);
    setTripReturnDriverCash(0);
    setTripDieselCost(0);
    setTripFuelLitres(0);
    setTripTollCost(0);
    setTripFerryCost(0);
    setTripDriverKhoraki(0);
    setTripPoliceCost(0);
    setTripLabourCost(0);
    setTripOtherCost(0);
    setTripDemurrage(0);
    setTripDemurrageDays(0);
    setTripDemurrageDailyRate(3000);
    setTripDemurrageReason('Factory Unloading Delay (Exceeded 24h standard)');
    setTripDistanceKm(260);
    setTripRemarks('');
  };

  const handleOpenAddTripModal = () => {
    resetTripFormState();
    const currentYear = new Date().getFullYear();
    const nextSeq = allTrips.length + 1;
    setTripOrderNo(`ORD-${currentYear}-${String(nextSeq).padStart(3, '0')}`);
    setTripChallanNo(`CHAL-${currentYear}-${String(nextSeq).padStart(3, '0')}`);
    const firstAvail = allVehicles.find((v) => !getTruckActiveTrip(v.registrationNumber).isOnTrip) || allVehicles[0];
    if (firstAvail) {
      handleTruckSelectChange(firstAvail.registrationNumber);
    }
    setShowAddTripModal(true);
  };

  // Auto Distance & Financial Calculations
  const calculatedDistanceKm = Math.max(0, Number(tripEndKm || 0) - Number(tripStartKm || 0));
  const calculatedTotalIncome =
    Number(tripFare || 0) +
    (tripHasReturn ? Number(tripReturnFare || 0) : 0) +
    Number(tripDemurrage || 0);
  const expensesBeforeDriverComm =
    Number(tripDieselCost || 0) +
    Number(tripTollCost || 0) +
    Number(tripFerryCost || 0) +
    Number(tripDriverKhoraki || 0) +
    Number(tripPoliceCost || 0) +
    Number(tripLabourCost || 0) +
    Number(tripCommission || 0) +
    Number(tripOtherCost || 0);
  const netSurplusBeforeDriverComm = Math.max(0, calculatedTotalIncome - expensesBeforeDriverComm);

  // Dynamically recalculate driver commission whenever expenses or fare change in percent mode
  useEffect(() => {
    if (tripDriverCommMode === 'percent' && typeof tripDriverCommPercent === 'number' && tripDriverCommPercent > 0) {
      const autoAmt = Math.round((netSurplusBeforeDriverComm * tripDriverCommPercent) / 100);
      setTripDriverCommission(autoAmt);
    }
  }, [tripDriverCommMode, tripDriverCommPercent, netSurplusBeforeDriverComm]);

  // Dynamically recalculate driver commission for edit trip modal when in percent mode
  useEffect(() => {
    if (showEditTripModal && typeof editTripDriverCommPercent === 'number' && editTripDriverCommPercent > 0) {
      const editExp =
        editTripDiesel + editTripToll + editTripFerry + editTripKhoraki +
        editTripPolice + editTripLabour + editTripCommission + editTripOther;
      const editNet = Math.max(0, editTripFare + editTripDemurrageAmount - editExp);
      const autoAmt = Math.round((editNet * editTripDriverCommPercent) / 100);
      setEditTripDriverCommission(autoAmt);
    }
  }, [
    showEditTripModal,
    editTripDriverCommPercent,
    editTripFare,
    editTripDemurrageAmount,
    editTripDiesel,
    editTripToll,
    editTripFerry,
    editTripKhoraki,
    editTripPolice,
    editTripLabour,
    editTripCommission,
    editTripOther,
  ]);

  const calculatedTotalReceived = Number(tripAdvance || 0) + (tripHasReturn ? Number(tripReturnDriverCash || 0) : 0);
  const calculatedRemainingDue = Math.max(0, calculatedTotalIncome - calculatedTotalReceived);
  const calculatedTripExpense =
    Number(tripDieselCost || 0) +
    Number(tripTollCost || 0) +
    Number(tripFerryCost || 0) +
    Number(tripDriverKhoraki || 0) +
    Number(tripPoliceCost || 0) +
    Number(tripLabourCost || 0) +
    Number(tripCommission || 0) +
    Number(tripDriverCommission || 0) +
    Number(tripOtherCost || 0);
  const calculatedNetIncome = calculatedTotalIncome - calculatedTripExpense;
  const calculatedDriverCashInHand =
    Number(tripAdvance || 0) +
    (tripHasReturn ? Number(tripReturnDriverCash || 0) : 0) -
    (Number(tripTollCost || 0) +
      Number(tripFerryCost || 0) +
      Number(tripDriverKhoraki || 0) +
      Number(tripPoliceCost || 0) +
      Number(tripLabourCost || 0) +
      Number(tripOtherCost || 0));

  // 8. Form State: + Log Fuel
  const [fuelTruckReg, setFuelTruckReg] = useState(allVehicles[0]?.registrationNumber || 'DHAKA-METRO-T-12-3456');
  const [fuelDriver, setFuelDriver] = useState('Abdul Karim');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelPump, setFuelPump] = useState('Meghna Petroleum Filling Station');
  const [fuelType, setFuelType] = useState('Diesel');
  const [fuelLitres, setFuelLitres] = useState<number>(70);
  const [fuelRate, setFuelRate] = useState<number>(108);
  const [fuelOdometer, setFuelOdometer] = useState<number>(45150);
  const [fuelWalletId, setFuelWalletId] = useState(treasuryWallets[0]?.id || '');
  const [fuelRemarks, setFuelRemarks] = useState('Full tank diesel for Dhaka-Chittagong trip');
  const [fuelImageUrl, setFuelImageUrl] = useState('');
  const calculatedFuelTotal = Number(fuelLitres || 0) * Number(fuelRate || 0);

  // 9. Form State: + Service & Maintenance
  const [srvTruckReg, setSrvTruckReg] = useState(allVehicles[0]?.registrationNumber || 'DHAKA-METRO-T-12-3456');
  const [srvDate, setSrvDate] = useState(new Date().toISOString().split('T')[0]);
  const [srvOdometer, setSrvOdometer] = useState<number>(45200);
  const [srvGarage, setSrvGarage] = useState('Bhai Bhai Automobiles, Tejgaon');
  const [srvMechanic, setSrvMechanic] = useState('Ustad Zahirul Islam');
  const [srvProblem, setSrvProblem] = useState('Brake pad wear and engine oil change');
  const [srvParts, setSrvParts] = useState('15W-40 Engine oil, oil filter, front brake shoes');
  const [srvTyreBatterySerial, setSrvTyreBatterySerial] = useState('TYRE-BRIDGE-295-80R');
  const [srvWarrantyExpiry, setSrvWarrantyExpiry] = useState('2027-11-30');
  const [srvPartsCost, setSrvPartsCost] = useState<number>(5500);
  const [srvLabourCost, setSrvLabourCost] = useState<number>(1500);
  const [srvOtherCost, setSrvOtherCost] = useState<number>(500);
  const [srvNextDate, setSrvNextDate] = useState('2027-02-28');
  const [srvNextKm, setSrvNextKm] = useState<number>(50000);
  const [srvWalletId, setSrvWalletId] = useState(treasuryWallets[0]?.id || '');
  const [srvImageUrl, setSrvImageUrl] = useState('');
  const calculatedServiceTotal = Number(srvPartsCost || 0) + Number(srvLabourCost || 0) + Number(srvOtherCost || 0);

  // 10. Form State: + Driver Payment (Salary / Commission / Advance / Allowance)
  const [drvPayName, setDrvPayName] = useState(allDrivers[0]?.name || 'Abdul Karim');
  const [drvPayType, setDrvPayType] = useState<'salary' | 'commission' | 'advance' | 'allowance'>('salary');
  const [drvPayAmount, setDrvPayAmount] = useState<number>(5000);
  const [drvPayDate, setDrvPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [drvPayWalletId, setDrvPayWalletId] = useState(treasuryWallets[0]?.id || '');
  const [drvPayNote, setDrvPayNote] = useState('Monthly salary settlement');

  // 11. Customer Payment State
  const [custPayAmount, setCustPayAmount] = useState<number>(0);
  const [custPayDate, setCustPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [custPayWalletId, setCustPayWalletId] = useState(treasuryWallets[0]?.id || '');

  // 12. Handlers: + Register Truck
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehReg.trim()) {
      triggerGlobalToast('Enter registration number', 'info');
      return;
    }
    setIsSubmitting(true);
    try {
      await createTransportOpRecord(
        {
          tripOrVehicleCode: newVehCode.trim(),
          recordType: 'vehicle',
          businessId: activeBusiness.id,
          registrationNumber: newVehReg.trim(),
          truckName: newVehName.trim(),
          vehicleType: `${newVehBrand} ${newVehModel}`,
          truckBodyType: newVehBodyType,
          capacityTons: Number(newVehCapacityTons || 0),
          engineNumber: newVehEngineNo.trim(),
          chassisNumber: newVehChassisNo.trim(),
          brand: newVehBrand.trim(),
          model: newVehModel.trim(),
          manufacturingYear: newVehYear,
          purchasePrice: Number(newVehPurchasePrice || 0),
          fuelType: newVehFuelType,
          currentOdometer: Number(newVehOdometer || 0),
          driverName: newVehDriver.trim() || 'Unassigned',
          driverPhone: newVehDriverPhone.trim() || undefined,
          origin: 'Central Garage',
          destination: 'Fleet Yard',
          cargoDetails: 'Commercial Agro Transport',
          customerName: 'Internal Fleet',
          distanceKm: 0,
          fuelCost: 0,
          tollCost: 0,
          driverAllowance: 0,
          maintenanceCost: 0,
          maintenanceDetails: 'New vehicle registered in fleet',
          tripRevenue: 0,
          outstandingDue: 0,
          taxTokenExpiry: newVehTaxTokenExp,
          fitnessExpiry: newVehFitnessExp,
          insuranceExpiry: newVehInsuranceExp,
          routePermitExpiry: newVehRoutePermitExp,
          nextServiceDate: newVehNextServiceDate,
          nextServiceKm: Number(newVehNextServiceKm || 0),
          date: new Date().toISOString().split('T')[0],
          status: 'available',
        },
        ownerId,
        actorEmail
      );
      setShowAddVehicleModal(false);
      triggerGlobalToast(
        `Vehicle ${newVehReg} registered successfully!`,
        'success'
      );
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error creating vehicle', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 13. Handlers: + Create Trip
  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripTruckReg) {
      triggerGlobalToast('Please select a truck', 'info');
      return;
    }
    if (tripFare <= 0) {
      triggerGlobalToast('Please enter trip freight fare', 'info');
      return;
    }

    const activeCheck = getTruckActiveTrip(tripTruckReg);
    if (activeCheck.isOnTrip) {
      triggerGlobalToast(`Cannot start trip: Truck ${tripTruckReg} is currently on a trip until ${activeCheck.returnDateFormatted}!`, 'info');
      return;
    }

    setIsSubmitting(true);
    try {
      const loadPoint = tripLoadLoc.trim() || tripStartLoc.trim() || 'Loading Point';
      const unloadPoint = tripDeliverLoc.trim() || tripDestLoc.trim() || 'Unloading Point';

      const tripChallan = tripChallanNo.trim() || `CHAL-${new Date().getFullYear()}-${String(allTrips.length + 1).padStart(3, '0')}`;
      const tripOrder = tripOrderNo.trim() || `ORD-${new Date().getFullYear()}-${String(allTrips.length + 1).padStart(3, '0')}`;
      const tripCode = tripChallan;
      const returnLoad = tripHasReturn ? (tripReturnLoadLoc.trim() || unloadPoint) : '';
      const returnUnload = tripHasReturn ? (tripReturnUnloadLoc.trim() || loadPoint) : '';
      const routeStr = tripHasReturn && (tripReturnFare > 0 || returnLoad || returnUnload)
        ? `${loadPoint} ➔ ${unloadPoint} ⇄ ${returnUnload || loadPoint}`
        : `${loadPoint} ➔ ${unloadPoint}`;

      const totalIncome =
        Number(tripFare || 0) +
        (tripHasReturn ? Number(tripReturnFare || 0) : 0) +
        Number(tripDemurrage || 0);
      const totalRecv = Number(tripAdvance || 0) + (tripHasReturn ? Number(tripReturnDriverCash || 0) : 0);
      const dueRemaining = Math.max(0, totalIncome - totalRecv);

      const asyncTasks: Promise<any>[] = [
        createTransportOpRecord(
          {
            tripOrVehicleCode: tripCode,
            challanNumber: tripChallan,
            orderNumber: tripOrder,
            recordType: 'trip',
            businessId: activeBusiness.id,
            registrationNumber: tripTruckReg,
            vehicleType: 'Heavy Truck',
            driverName: tripDriverName.trim(),
            driverPhone: tripDriverPhone.trim() || undefined,
            receiverPhone: tripReceiverPhone.trim() || undefined,
            helperName: tripHelperName.trim(),
            origin: loadPoint,
            destination: unloadPoint,
            loadingLocation: loadPoint,
            deliveryLocation: unloadPoint,
            route: routeStr,
            cargoDetails: tripCargo.trim(),
            customerName: tripCustomer.trim(),
            brokerName: tripBrokerName.trim(),
            returnLoadingPoint: returnLoad,
            returnUnloadingPoint: returnUnload,
            returnFare: tripHasReturn ? Number(tripReturnFare || 0) : 0,
            returnDriverCash: tripHasReturn ? Number(tripReturnDriverCash || 0) : 0,
            distanceKm: Number(tripDistanceKm || calculatedDistanceKm || 260),
            demurrageAmount: Number(tripDemurrage || 0),
            demurrageDays: Number(tripDemurrageDays || 0),
            demurrageDailyRate: Number(tripDemurrageDailyRate || 0),
            demurrageReason: Number(tripDemurrage || 0) > 0 ? tripDemurrageReason : undefined,
            startOdometer: Number(tripStartKm || 0),
            endOdometer: Number(tripEndKm || 0),
            fuelLitres: Number(tripFuelLitres || 0),
            fuelCost: Number(tripDieselCost || 0),
            tollCost: Number(tripTollCost || 0),
            ferryCost: Number(tripFerryCost || 0),
            driverKhoraki: Number(tripDriverKhoraki || 0),
            policeRoadCost: Number(tripPoliceCost || 0),
            labourLoadingCost: Number(tripLabourCost || 0),
            driverAllowance: Number(tripDriverKhoraki || 0),
            commission: Number(tripCommission || 0),
            driverCommission: Number(tripDriverCommission || 0),
            tripExpense: calculatedTripExpense,
            maintenanceCost: Number(tripOtherCost || 0),
            maintenanceDetails: `Toll: ৳${tripTollCost} | Ferry: ৳${tripFerryCost} | Khoraki: ৳${tripDriverKhoraki} | Driver Comm: ৳${tripDriverCommission} | Police: ৳${tripPoliceCost} | Labour: ৳${tripLabourCost} | Broker Comm: ৳${tripCommission}`,
            tripRevenue: totalIncome,
            advanceReceived: Number(tripAdvance || 0),
            remainingDue: dueRemaining,
            outstandingDue: dueRemaining,
            netIncome: totalIncome - calculatedTripExpense,
            insuranceExpiry: '2027-12-31',
            fitnessExpiry: '2027-12-31',
            taxTokenExpiry: '2027-12-31',
            nextServiceDate: '2027-06-30',
            date: tripStartDate,
            expectedReturnDate: tripExpectedReturn,
            status: 'active',
            imageUrl: tripImageUrl,
            remarks: tripRemarks.trim(),
          },
          ownerId,
          actorEmail
        )
      ];

      // Auto-complete any prior active trip on this truck so fleet status transitions seamlessly
      const activeTripOnSameTruck = allTrips.find(
        (t) => t.registrationNumber === tripTruckReg && (t.status === 'active' || t.status === 'running')
      );
      if (activeTripOnSameTruck) {
        asyncTasks.push(
          updateTransportOpRecord(
            activeTripOnSameTruck,
            {
              status: 'completed',
              actualReturnDate: tripStartDate,
            },
            actorEmail
          ).catch((e) => console.warn('Auto-completing prior trip', e))
        );
      }

      // Financial Integration: Advance Payment Received
      // Update vehicle assigned driver & active status so the truck immediately reflects active status everywhere
      const targetVeh = allVehicles.find((v) => normalizeReg(v.registrationNumber) === normalizeReg(tripTruckReg));
      if (targetVeh) {
        const vehUpdate: Partial<ErpTransportOp> = {
          status: 'active',
          expectedReturnDate: tripExpectedReturn,
        };
        if (tripDriverName.trim() && tripDriverName.trim().toLowerCase() !== 'unassigned') {
          vehUpdate.driverName = tripDriverName.trim();
          vehUpdate.driverPhone = tripDriverPhone.trim() || targetVeh.driverPhone || '';
        }
        asyncTasks.push(
          updateTransportOpRecord(
            targetVeh,
            vehUpdate,
            actorEmail
          ).catch((e) => console.warn('Auto-updating vehicle driver name and status', e))
        );
      }

      const targetWallet = accounts.find((a) => a.id === tripWalletId) || treasuryWallets[0];
      const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];

      if (targetWallet && revAcc && Number(tripAdvance) > 0) {
        asyncTasks.push(
          postDoubleEntryTransaction(
            {
              referenceNo: `ADV-${tripCode}`,
              date: tripStartDate,
              businessId: activeBusiness.id,
              businessName: activeBusiness.name,
              transactionType: 'sale',
              category: `Trip Advance Received (${tripTruckReg})`,
              description: `${tripTruckReg} (${routeStr}) — Advance received: ৳${tripAdvance} (Total Fare: ৳${tripFare})`,
              debitAccountId: targetWallet.id,
              debitAccountName: targetWallet.name,
              creditAccountId: revAcc.id,
              creditAccountName: revAcc.name,
              amount: Number(tripAdvance),
              paymentStatus: dueRemaining > 0 ? 'partial' : 'paid',
              dueAmount: dueRemaining,
              counterpartyName: tripCustomer || tripDriverName,
            },
            accounts,
            ownerId,
            actorEmail
          ).catch((e) => console.warn('Advance transaction error', e))
        );
      }

      // Financial Integration: Direct Trip Outflow (Fuel + Toll + Road)
      if (targetWallet && expAcc && calculatedTripExpense > 0) {
        asyncTasks.push(
          postDoubleEntryTransaction(
            {
              referenceNo: `EXP-${tripCode}`,
              date: tripStartDate,
              businessId: activeBusiness.id,
              businessName: activeBusiness.name,
              transactionType: 'expense',
              category: `Trip Direct Outflow & Fuel (${tripTruckReg})`,
              description: `${tripTruckReg} (${routeStr}) — Diesel: ৳${tripDieselCost}, Toll: ৳${tripTollCost}, Road: ৳${tripOtherCost}`,
              debitAccountId: expAcc.id,
              debitAccountName: expAcc.name,
              creditAccountId: targetWallet.id,
              creditAccountName: targetWallet.name,
              amount: calculatedTripExpense,
              paymentStatus: 'paid',
              dueAmount: 0,
              counterpartyName: tripDriverName,
            },
            accounts,
            ownerId,
            actorEmail
          ).catch((e) => console.warn('Expense transaction error', e))
        );
      }

      await Promise.all(asyncTasks);

      resetTripFormState();
      setShowAddTripModal(false);
      triggerGlobalToast(
        `Trip ${tripCode} started on ${tripTruckReg} (Freight: ${formatBDT(totalIncome)})!`,
        'success'
      );
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error saving trip', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 14. Handlers: + Complete Trip
  const handleCompleteTrip = async (trip: ErpTransportOp) => {
    try {
      await updateTransportOpRecord(
        trip,
        {
          status: 'completed',
          actualReturnDate: new Date().toISOString().split('T')[0],
        },
        actorEmail
      );
      const targetVeh = allVehicles.find((v) => normalizeReg(v.registrationNumber) === normalizeReg(trip.registrationNumber));
      if (targetVeh) {
        try {
          await updateTransportOpRecord(
            targetVeh,
            {
              status: 'available',
            },
            actorEmail
          );
        } catch (e) {
          console.warn('Resetting vehicle to available status', e);
        }
      }
      triggerGlobalToast(
        `Trip ${trip.tripOrVehicleCode} marked as completed! Truck is now Available. ✅`,
        'success'
      );
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error completing trip', 'info');
    }
  };

  // 15. Handlers: + Settle Customer Payment
  const handleSettleCustomerPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTripForPayment || custPayAmount <= 0) return;
    setIsSubmitting(true);
    try {
      const newDue = Math.max(0, Number(targetTripForPayment.outstandingDue || 0) - Number(custPayAmount));
      await updateTransportOpRecord(
        targetTripForPayment,
        {
          outstandingDue: newDue,
          remainingDue: newDue,
        },
        actorEmail
      );

      const targetWallet = accounts.find((a) => a.id === custPayWalletId) || treasuryWallets[0];
      const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
      if (targetWallet && revAcc) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `PAY-${targetTripForPayment.tripOrVehicleCode}-${Date.now().toString().slice(-4)}`,
            date: custPayDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'sale',
            category: `Customer Due Collection (${targetTripForPayment.registrationNumber})`,
            description: `Collected ৳${custPayAmount} remaining fare from ${targetTripForPayment.customerName}`,
            debitAccountId: targetWallet.id,
            debitAccountName: targetWallet.name,
            creditAccountId: revAcc.id,
            creditAccountName: revAcc.name,
            amount: Number(custPayAmount),
            paymentStatus: newDue === 0 ? 'paid' : 'partial',
            dueAmount: newDue,
            counterpartyName: targetTripForPayment.customerName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      setShowSettlePaymentModal(false);
      setTargetTripForPayment(null);
      triggerGlobalToast(
`Collected payment of ৳${custPayAmount} successfully!`,
        'success'
      );
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error recording payment', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 16. Handlers: + Log Fuel Entry
  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fuelLitres <= 0 || fuelRate <= 0) return;
    setIsSubmitting(true);
    try {
      const fuelTotal = Number(fuelLitres) * Number(fuelRate);
      const fuelCode = `FUL-${Date.now().toString().slice(-5)}`;

      await createTransportOpRecord(
        {
          tripOrVehicleCode: fuelCode,
          recordType: 'fuel',
          businessId: activeBusiness.id,
          registrationNumber: fuelTruckReg,
          vehicleType: 'Heavy Truck',
          driverName: fuelDriver.trim(),
          origin: fuelPump.trim(),
          destination: 'Fuel Tank',
          cargoDetails: `${fuelLitres}L ${fuelType} @ ৳${fuelRate}/L`,
          customerName: fuelPump.trim(),
          distanceKm: 0,
          startOdometer: Number(fuelOdometer || 0),
          fuelCost: fuelTotal,
          fuelLitres: Number(fuelLitres),
          fuelRate: Number(fuelRate),
          fuelStation: fuelPump.trim(),
          fuelType,
          tollCost: 0,
          driverAllowance: 0,
          maintenanceCost: 0,
          maintenanceDetails: fuelRemarks.trim(),
          tripRevenue: 0,
          outstandingDue: 0,
          insuranceExpiry: '2027-12-31',
          fitnessExpiry: '2027-12-31',
          taxTokenExpiry: '2027-12-31',
          nextServiceDate: '2027-06-30',
          date: fuelDate,
          status: 'completed',
          imageUrl: fuelImageUrl,
          remarks: fuelRemarks.trim(),
        },
        ownerId,
        actorEmail
      );

      // Financial Integration: Fuel Expense
      const targetWallet = accounts.find((a) => a.id === fuelWalletId) || treasuryWallets[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];
      if (targetWallet && expAcc && fuelTotal > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: fuelCode,
            date: fuelDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'expense',
            category: `Fleet Fuel & Diesel Log (${fuelTruckReg})`,
            description: `${fuelTruckReg} — ${fuelLitres}L Diesel (${fuelPump}) Cost ৳${fuelTotal}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: targetWallet.id,
            creditAccountName: targetWallet.name,
            amount: fuelTotal,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: fuelPump,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      setShowAddFuelModal(false);
      triggerGlobalToast(
`Fuel logged: ${fuelLitres}L (৳${fuelTotal}) for ${fuelTruckReg}!`,
        'success'
      );
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error saving fuel', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 17. Handlers: + Log Maintenance & Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const srvTotal = Number(srvPartsCost || 0) + Number(srvLabourCost || 0) + Number(srvOtherCost || 0);
      const srvCode = `MNT-${Date.now().toString().slice(-5)}`;

      await createTransportOpRecord(
        {
          tripOrVehicleCode: srvCode,
          recordType: 'vehicle_maintenance',
          businessId: activeBusiness.id,
          registrationNumber: srvTruckReg,
          vehicleType: 'Heavy Truck',
          driverName: srvMechanic.trim(),
          origin: srvGarage.trim(),
          destination: 'Workshop Repair',
          cargoDetails: srvProblem.trim(),
          customerName: srvGarage.trim(),
          distanceKm: 0,
          startOdometer: Number(srvOdometer || 0),
          fuelCost: 0,
          tollCost: 0,
          driverAllowance: 0,
          maintenanceCost: srvTotal,
          partsCost: Number(srvPartsCost || 0),
          labourCost: Number(srvLabourCost || 0),
          otherCosts: Number(srvOtherCost || 0),
          partsReplaced: srvParts.trim(),
          tyreOrBatterySerial: srvTyreBatterySerial.trim(),
          warrantyExpiryDate: srvWarrantyExpiry,
          maintenanceDetails: `${srvProblem} | Parts: ${srvParts} (SN: ${srvTyreBatterySerial}) | Labor: ৳${srvLabourCost} | Warranty: ${srvWarrantyExpiry}`,
          tripRevenue: 0,
          outstandingDue: 0,
          insuranceExpiry: '2027-12-31',
          fitnessExpiry: '2027-12-31',
          taxTokenExpiry: '2027-12-31',
          nextServiceDate: srvNextDate,
          nextServiceKm: Number(srvNextKm || 0),
          date: srvDate,
          status: 'completed',
          imageUrl: srvImageUrl,
        },
        ownerId,
        actorEmail
      );

      // Financial Integration: Maintenance Expense
      const targetWallet = accounts.find((a) => a.id === srvWalletId) || treasuryWallets[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];
      if (targetWallet && expAcc && srvTotal > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: srvCode,
            date: srvDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'expense',
            category: `Vehicle Repair & Maintenance (${srvTruckReg})`,
            description: `${srvTruckReg} — ${srvProblem} (${srvGarage}) Total Cost ৳${srvTotal}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: targetWallet.id,
            creditAccountName: targetWallet.name,
            amount: srvTotal,
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: srvGarage,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      setShowAddServiceModal(false);
      triggerGlobalToast(
        bn
          ? `Service record for ${srvTruckReg} (BDT ${srvTotal}) saved successfully!`
          : `Maintenance logged: ৳${srvTotal} for ${srvTruckReg}!`,
        'success'
      );
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error recording service', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 18. Handlers: + Pay Driver Salary / Advance
  const handlePayDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (drvPayAmount <= 0) return;
    setIsSubmitting(true);
    try {
      const payCode = `SAL-DRV-${Date.now().toString().slice(-5)}`;
      const targetWallet = accounts.find((a) => a.id === drvPayWalletId) || treasuryWallets[0];
      const expAcc = accounts.find((a) => a.accountType === 'expense') || accounts[0];

      if (targetWallet && expAcc) {
        await postDoubleEntryTransaction(
          {
            referenceNo: payCode,
            date: drvPayDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'payroll',
            category: `Driver Salary & Commission (${drvPayName})`,
            description: `${drvPayName} — ${drvPayType === 'salary' ? 'Monthly Basic Salary' : drvPayType === 'commission' ? 'Trip Commission' : drvPayType === 'advance' ? 'Salary Advance' : 'Trip Allowance'} payment of BDT ${drvPayAmount}`,
            debitAccountId: expAcc.id,
            debitAccountName: expAcc.name,
            creditAccountId: targetWallet.id,
            creditAccountName: targetWallet.name,
            amount: Number(drvPayAmount),
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: drvPayName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      setShowAddDriverModal(false);
      triggerGlobalToast(
        bn
          ? `BDT ${drvPayAmount} paid successfully to ${drvPayName}!`
          : `Paid ৳${drvPayAmount} to driver ${drvPayName}!`,
        'success'
      );
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error paying driver', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Garments Contract Handlers
  const handleSaveGarmentsContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garmentsClientName.trim()) {
      triggerGlobalToast('Please enter corporate client name', 'info');
      return;
    }
    if (garmentsAssignedTrucks.length === 0) {
      triggerGlobalToast('Please select at least 1 truck from the fleet', 'info');
      return;
    }

    setIsSubmitting(true);
    try {
      const gCode = editingGarmentsContract?.tripOrVehicleCode || `GCON-${Date.now().toString().slice(-4)}`;
      const payload: Partial<ErpTransportOp> = {
        recordType: 'garments_contract',
        businessId: activeBusiness.id,
        tripOrVehicleCode: gCode,
        clientName: garmentsClientName.trim(),
        customerName: garmentsClientName.trim(),
        factoryLocation: garmentsLocation.trim(),
        contactPerson: garmentsContactPerson.trim(),
        contactPhone: garmentsContactPhone.trim(),
        billingType: garmentsBillingType,
        agreedRate: Number(garmentsAgreedRate || 0),
        assignedTrucks: garmentsAssignedTrucks,
        assignedTrucksJson: JSON.stringify(garmentsAssignedTrucks),
        registrationNumber: garmentsAssignedTrucks[0] || 'DHAKA-METRO-TA-11-2233',
        route: garmentsAssignedTrucks.join(', '),
        startDate: garmentsStartDate,
        contractStatus: garmentsStatus,
        status: garmentsStatus,
        remarks: garmentsRemarks.trim(),
        origin: garmentsLocation.trim() || 'Factory Depot',
        destination: 'Chittagong Port',
        cargoDetails: 'Garments Goods & RMG Cargo',
        vehicleType: 'Corporate Contract',
        driverName: `Assigned Fleet (${garmentsAssignedTrucks.length} Trucks)`,
      };

      if (editingGarmentsContract && editingGarmentsContract.id) {
        await updateTransportOpRecord(
          editingGarmentsContract,
          payload,
          actorEmail
        );
        triggerGlobalToast('Garments contract updated successfully!', 'success');
      } else {
        await createTransportOpRecord(
          payload as any,
          ownerId,
          actorEmail
        );
        triggerGlobalToast('New Garments contract created successfully!', 'success');
      }

      setShowAddGarmentsModal(false);
      setEditingGarmentsContract(null);
    } catch (err: any) {
      console.error('Error saving garments contract:', err);
      triggerGlobalToast('Failed to save Garments contract: ' + (err?.message || ''), 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Quick Garments Dispatch Handlers ────────────────────────────────
  const openQuickGarmentsDispatch = (truckReg?: string, contractOrCompany?: ErpTransportOp | string | null) => {
    // 1. Resolve targeted corporate garments contract
    let matchedContract: ErpTransportOp | null = null;
    if (contractOrCompany) {
      if (typeof contractOrCompany === 'object') {
        matchedContract = contractOrCompany;
      } else {
        matchedContract = allGarmentsContracts.find(
          (c) => c.id === contractOrCompany || (c.clientName || c.customerName) === contractOrCompany
        ) || null;
      }
    }
    if (!matchedContract && truckReg) {
      matchedContract = getTruckAssignedGarments(truckReg) || null;
    }
    if (!matchedContract && allGarmentsContracts.length > 0) {
      matchedContract = allGarmentsContracts[0];
    }
    setQuickDispatchContract(matchedContract);

    // 2. Resolve trucks strictly allocated to this company
    let targetCompanyTrucks: ErpTransportOp[] = [];
    if (matchedContract) {
      let assignedArr: string[] = [];
      if (Array.isArray(matchedContract.assignedTrucks)) assignedArr = matchedContract.assignedTrucks;
      else if (matchedContract.assignedTrucksJson) {
        try { assignedArr = JSON.parse(matchedContract.assignedTrucksJson); } catch {}
      } else if (matchedContract.route && matchedContract.route.includes(',')) {
        assignedArr = matchedContract.route.split(',').map((s) => s.trim());
      } else if (matchedContract.registrationNumber) {
        assignedArr = [matchedContract.registrationNumber];
      }
      targetCompanyTrucks = allVehicles.filter((v) =>
        assignedArr.some((t) => normalizeReg(t) === normalizeReg(v.registrationNumber))
      );
    }
    if (targetCompanyTrucks.length === 0) {
      targetCompanyTrucks = garmentsDedicatedTrucks.length > 0 ? garmentsDedicatedTrucks : allVehicles;
    }

    // 3. Inform user if the specific requested truck is busy
    if (truckReg) {
      const activeInfo = getTruckActiveTrip(truckReg);
      if (activeInfo.isOnTrip) {
        triggerGlobalToast(
          `Truck ${truckReg} is currently on a trip (Expected return: ${activeInfo.returnDateFormatted}). Please choose another truck for ${matchedContract?.clientName || 'this company'}.`,
          'info'
        );
      }
    }

    const availInCompany = targetCompanyTrucks.find((v) => !getTruckActiveTrip(v.registrationNumber).isOnTrip);
    const regToUse =
      (truckReg && !getTruckActiveTrip(truckReg).isOnTrip && targetCompanyTrucks.some((v) => normalizeReg(v.registrationNumber) === normalizeReg(truckReg)) ? truckReg : null) ||
      availInCompany?.registrationNumber ||
      targetCompanyTrucks[0]?.registrationNumber ||
      '';

    setQuickDispatchTruck(regToUse);
    const currentYear = new Date().getFullYear();
    const nextSeq = allTrips.length + 1;
    setQuickDispatchOrderNo(`ORD-${currentYear}-${String(nextSeq).padStart(3, '0')}`);
    setQuickDispatchChallanNo(`CHAL-${currentYear}-${String(nextSeq).padStart(3, '0')}`);

    if (matchedContract) {
      setQuickDispatchFare(matchedContract.agreedRate || 14500);
      if (matchedContract.destination || matchedContract.route) {
        setQuickDispatchDest(matchedContract.destination || matchedContract.route || 'Chittagong Port');
      }
      if (matchedContract.cargoDetails) setQuickDispatchCargo(matchedContract.cargoDetails);
    } else {
      setQuickDispatchFare(15000);
    }
    setQuickDispatchDemurrage(0);
    setQuickDispatchDemurrageDays(0);
    setQuickDispatchDemurrageDailyRate(3000);
    setQuickDispatchDemurrageReason('Factory Unloading Delay (Exceeded 24h standard)');
    setQuickDispatchDriverDelayKhoraki(0);
    setQuickDispatchAdvance(0);
    setQuickDispatchKhoraki(2000);
    const today = new Date().toISOString().slice(0, 10);
    setQuickDispatchDate(today);
    setQuickDispatchDurationDays(2);
    const retD = new Date();
    retD.setDate(retD.getDate() + 2);
    setQuickDispatchReturnDate(retD.toISOString().slice(0, 10));
    setShowQuickGarmentsDispatchModal(true);
  };

  const handleQuickDispatchCompanyChange = (contract: ErpTransportOp) => {
    setQuickDispatchContract(contract);
    let assignedArr: string[] = [];
    if (Array.isArray(contract.assignedTrucks)) assignedArr = contract.assignedTrucks;
    else if (contract.assignedTrucksJson) {
      try { assignedArr = JSON.parse(contract.assignedTrucksJson); } catch {}
    } else if (contract.route && contract.route.includes(',')) {
      assignedArr = contract.route.split(',').map((s) => s.trim());
    } else if (contract.registrationNumber) {
      assignedArr = [contract.registrationNumber];
    }
    const cTrucks = allVehicles.filter((v) =>
      assignedArr.some((t) => normalizeReg(t) === normalizeReg(v.registrationNumber))
    );
    const avail = cTrucks.find((v) => !getTruckActiveTrip(v.registrationNumber).isOnTrip);
    setQuickDispatchTruck(avail?.registrationNumber || cTrucks[0]?.registrationNumber || '');
    setQuickDispatchFare(contract.agreedRate || 14500);
    if (contract.destination || contract.route) {
      setQuickDispatchDest(contract.destination || contract.route || 'Chittagong Port');
    }
    if (contract.cargoDetails) setQuickDispatchCargo(contract.cargoDetails);
  };

  const handleQuickTruckChange = (reg: string) => {
    setQuickDispatchTruck(reg);
    const contract = quickDispatchContract || getTruckAssignedGarments(reg);
    if (contract) {
      setQuickDispatchFare(contract.agreedRate || 14500);
      if (contract.destination || contract.route) {
        setQuickDispatchDest(contract.destination || contract.route || 'Chittagong Port');
      }
      if (contract.cargoDetails) setQuickDispatchCargo(contract.cargoDetails);
    }
  };

  const handleSaveQuickGarmentsDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDispatchTruck) {
      triggerGlobalToast('Please select a truck to start trip', 'info');
      return;
    }
    const activeCheck = getTruckActiveTrip(quickDispatchTruck);
    if (activeCheck.isOnTrip) {
      triggerGlobalToast(`Cannot dispatch: Truck ${quickDispatchTruck} is currently on a trip until ${activeCheck.returnDateFormatted}!`, 'info');
      return;
    }
    setIsSubmitting(true);
    try {
      const currentYear = new Date().getFullYear();
      const tripChallan = quickDispatchChallanNo.trim() || `CHAL-${currentYear}-${String(allTrips.length + 1).padStart(3, '0')}`;
      const tripOrder = quickDispatchOrderNo.trim() || `ORD-${currentYear}-${String(allTrips.length + 1).padStart(3, '0')}`;
      const tripCode = tripChallan;
      const veh = allVehicles.find((v) => normalizeReg(v.registrationNumber) === normalizeReg(quickDispatchTruck));
      const resolvedDriverPhone = veh?.driverPhone || allDrivers.find(
        (dr) => dr.name.toLowerCase() === (veh?.driverName || '').toLowerCase() || normalizeReg(dr.truck) === normalizeReg(quickDispatchTruck)
      )?.phone || undefined;
      const contract = quickDispatchContract || getTruckAssignedGarments(quickDispatchTruck);
      const originLoc = contract?.factoryLocation || contract?.origin || 'Ashulia, Savar';
      const dynamicKm = calculateHighwayDistance(originLoc, quickDispatchDest || 'Chittagong Port').km;

      await createTransportOpRecord(
        {
          tripOrVehicleCode: tripCode,
          challanNumber: tripChallan,
          orderNumber: tripOrder,
          recordType: 'trip',
          businessId: activeBusiness.id,
          registrationNumber: quickDispatchTruck,
          vehicleType: veh?.vehicleType || 'Covered Van',
          driverName: veh?.driverName || 'Driver Assigned',
          driverPhone: resolvedDriverPhone,
          origin: originLoc,
          destination: quickDispatchDest || 'Chittagong Port',
          loadingLocation: originLoc,
          deliveryLocation: quickDispatchDest || 'Chittagong Port',
          route: `${contract?.factoryLocation || 'Ashulia'} ➔ ${quickDispatchDest}`,
          cargoDetails: quickDispatchCargo || 'RMG Garments Export Cartons',
          customerName: contract?.clientName || contract?.customerName || 'Garments Client',
          clientName: contract?.clientName || contract?.customerName || 'Garments Client',
          distanceKm: dynamicKm,
          tripRevenue: Number(quickDispatchFare || 0),
          demurrageAmount: Number(quickDispatchDemurrage || 0),
          demurrageDays: Number(quickDispatchDemurrageDays || 0),
          demurrageDailyRate: Number(quickDispatchDemurrageDailyRate || 0),
          demurrageReason: quickDispatchDemurrageDays > 0 || quickDispatchDemurrage > 0 ? quickDispatchDemurrageReason : undefined,
          demurrageDriverAllowance: Number(quickDispatchDriverDelayKhoraki || 0),
          advancePaid: Number(quickDispatchAdvance || 0),
          advanceReceived: Number(quickDispatchAdvance || 0),
          remainingDue: Math.max(0, Number(quickDispatchFare || 0) + Number(quickDispatchDemurrage || 0) - Number(quickDispatchAdvance || 0)),
          outstandingDue: Math.max(0, Number(quickDispatchFare || 0) + Number(quickDispatchDemurrage || 0) - Number(quickDispatchAdvance || 0)),
          driverKhoraki: Number(quickDispatchKhoraki || 0) + Number(quickDispatchDriverDelayKhoraki || 0),
          tripExpense: Number(quickDispatchKhoraki || 0) + Number(quickDispatchDriverDelayKhoraki || 0),
          netIncome: Number(quickDispatchFare || 0) + Number(quickDispatchDemurrage || 0) - (Number(quickDispatchKhoraki || 0) + Number(quickDispatchDriverDelayKhoraki || 0)),
          insuranceExpiry: '2027-12-31',
          fitnessExpiry: '2027-12-31',
          taxTokenExpiry: '2027-12-31',
          nextServiceDate: '2027-06-30',
          date: quickDispatchDate,
          expectedReturnDate: quickDispatchReturnDate,
          status: 'active',
          fuelCost: 0,
          tollCost: 0,
          maintenanceCost: 0,
          maintenanceDetails: '',
        },
        ownerId,
        actorEmail
      );

      // Auto-update vehicle record status to 'active' and expectedReturnDate
      if (veh) {
        try {
          await updateTransportOpRecord(
            veh,
            {
              status: 'active',
              expectedReturnDate: quickDispatchReturnDate,
            },
            actorEmail
          );
        } catch (err) {
          console.warn('Failed to update vehicle active status:', err);
        }
      }

      const targetWallet = treasuryWallets[0] || accounts[0];
      const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];
      const remainingDue = Math.max(0, Number(quickDispatchFare || 0) - Number(quickDispatchAdvance || 0));
      if (targetWallet && revAcc && Number(quickDispatchAdvance) > 0) {
        await postDoubleEntryTransaction(
          {
            referenceNo: `ADV-${tripCode}`,
            date: quickDispatchDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'sale',
            category: `Garments Trip Advance (${quickDispatchTruck})`,
            description: `${quickDispatchTruck} — Advance: ৳${quickDispatchAdvance} for ${tripCode} (${contract?.clientName || 'Garments'})`,
            debitAccountId: targetWallet.id,
            debitAccountName: targetWallet.name,
            creditAccountId: revAcc.id,
            creditAccountName: revAcc.name,
            amount: Number(quickDispatchAdvance),
            paymentStatus: remainingDue > 0 ? 'partial' : 'paid',
            dueAmount: remainingDue,
            counterpartyName: contract?.clientName || contract?.customerName || 'Garments Client',
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      triggerGlobalToast(`Trip ${tripChallan} dispatched successfully for ${contract?.clientName || 'Garments'}! Order: ${tripOrder}. Truck is now On Trip. 🚚`, 'success');
      setShowQuickGarmentsDispatchModal(false);
    } catch (err: any) {
      triggerGlobalToast(err?.message || 'Error dispatching trip', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Corporate Transport Bill Handlers & Computed Trips ───────────────
  const openCorporateTransportBill = (contract: ErpTransportOp) => {
    setSelectedCorporateBillContract(contract);
    setShowCorporateBillModal(true);
  };

  const handleUpdateTripDemurrage = async (tripId: string, demurrage: number, days?: number, reason?: string) => {
    const trip = allTrips.find((t) => t.id === tripId);
    if (trip && !trip.id.startsWith('demo-')) {
      await updateTransportOpRecord(
        trip,
        {
          demurrageAmount: demurrage,
          demurrageDays: days,
          demurrageReason: reason,
        },
        actorEmail
      );
      triggerGlobalToast('Demurrage and detention delay details updated successfully', 'success');
    } else {
      triggerGlobalToast('Demurrage updated', 'info');
    }
  };

  const corporateBillTrips = useMemo(() => {
    if (!selectedCorporateBillContract) return [];
    const rawCName = (selectedCorporateBillContract.clientName || selectedCorporateBillContract.customerName || '').trim();
    const normCName = normalizeClientName(rawCName);
    let assignedTrucks: string[] = [];
    if (Array.isArray(selectedCorporateBillContract.assignedTrucks)) assignedTrucks = selectedCorporateBillContract.assignedTrucks;
    else if (selectedCorporateBillContract.assignedTrucksJson) {
      try { assignedTrucks = JSON.parse(selectedCorporateBillContract.assignedTrucksJson); } catch {}
    } else if (selectedCorporateBillContract.route && selectedCorporateBillContract.route.includes(',')) {
      assignedTrucks = selectedCorporateBillContract.route.split(',').map((s) => s.trim());
    } else if (selectedCorporateBillContract.registrationNumber) {
      assignedTrucks = [selectedCorporateBillContract.registrationNumber];
    }

    return allTrips.filter((t) => {
      const rawTCustomer = (t.customerName || t.clientName || '').trim();
      const normTCustomer = normalizeClientName(rawTCustomer);
      const matchesName = normCName && normTCustomer && (normTCustomer.includes(normCName) || normCName.includes(normTCustomer));
      const matchesTruck = assignedTrucks.some((tr) => normalizeReg(tr) === normalizeReg(t.registrationNumber));
      return matchesName || matchesTruck;
    });
  }, [selectedCorporateBillContract, allTrips, normalizeClientName, normalizeReg]);

  // ── Receive Garments Payment / Monthly Rent Handlers ───────────────
  const openCollectClientBillModal = (clientItem: any) => {
    setTargetClientForBill(clientItem);
    const suggestedAmount = clientItem.totalDue > 0
      ? clientItem.totalDue
      : (clientItem.contract?.agreedRate || 0);
    setClientBillPayAmount(suggestedAmount);
    setClientBillPayDate(new Date().toISOString().slice(0, 10));
    setClientBillWalletId(treasuryWallets[0]?.id || accounts[0]?.id || '');
    const isMonthly = clientItem.contract?.billingType === 'monthly';
    const companyName = clientItem.contract?.clientName || clientItem.contract?.customerName || 'Garments Client';
    setClientBillNotes(
      isMonthly
        ? `Monthly vehicle rent received from ${companyName}`
        : `Freight payment settlement received from ${companyName}`
    );
    setShowCollectClientBillModal(true);
  };

  const handleCollectGarmentsClientBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClientForBill) return;
    if (clientBillPayAmount <= 0) {
      triggerGlobalToast('Please enter a valid bill collection amount', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const companyName = targetClientForBill.contract?.clientName || targetClientForBill.contract?.customerName || 'Garments Client';
      const recCode = `BILL-${Date.now().toString().slice(-6)}`;
      const selectedWallet = treasuryWallets.find((w) => w.id === clientBillWalletId) || treasuryWallets[0] || accounts[0];
      const revAcc = accounts.find((a) => a.accountType === 'revenue') || accounts[0];

      // 1. If company has unpaid clientTrips, allocate payment towards settling their dues
      let remainingAmountToAllocate = clientBillPayAmount;
      const unpaidTrips = (targetClientForBill.clientTrips || [])
        .filter((t: any) => Number(t.outstandingDue !== undefined ? t.outstandingDue : t.remainingDue || 0) > 0)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const trip of unpaidTrips) {
        if (remainingAmountToAllocate <= 0) break;
        const tripDue = Number(trip.outstandingDue !== undefined ? trip.outstandingDue : trip.remainingDue || 0);
        const payForThisTrip = Math.min(tripDue, remainingAmountToAllocate);
        const newDue = Math.max(0, tripDue - payForThisTrip);
        const newAdv = Number(trip.advancePaid || trip.advanceReceived || 0) + payForThisTrip;

        await updateTransportOpRecord(
          trip,
          {
            advancePaid: newAdv,
            advanceReceived: newAdv,
            remainingDue: newDue,
            outstandingDue: newDue,
          },
          actorEmail
        );
        remainingAmountToAllocate -= payForThisTrip;
      }

      // 2. Update contract record in ops to track total collected rent / payments
      if (targetClientForBill.contract && targetClientForBill.contract.id) {
        const curContractAdv = Number(targetClientForBill.contract.advancePaid || targetClientForBill.contract.advanceReceived || 0);
        const newContractAdv = curContractAdv + clientBillPayAmount;
        const newContractDue = Math.max(0, Number(targetClientForBill.totalDue || 0) - clientBillPayAmount);
        try {
          await updateTransportOpRecord(
            targetClientForBill.contract,
            {
              advancePaid: newContractAdv,
              advanceReceived: newContractAdv,
              outstandingDue: newContractDue,
              remainingDue: newContractDue,
            },
            actorEmail
          );
        } catch (cErr) {
          console.warn('Could not update contract op record:', cErr);
        }
      }

      // 3. Create a dedicated payment op record in ops for client payment ledger
      try {
        await createTransportOpRecord(
          {
            tripOrVehicleCode: recCode,
            recordType: 'payment',
            businessId: activeBusiness.id,
            clientName: companyName,
            customerName: companyName,
            date: clientBillPayDate,
            tripRevenue: Number(clientBillPayAmount),
            advancePaid: Number(clientBillPayAmount),
            advanceReceived: Number(clientBillPayAmount),
            remainingDue: 0,
            outstandingDue: 0,
            status: 'completed',
            remarks: `Corporate garments payment collection: ${clientBillNotes}`,
          } as any,
          ownerId,
          actorEmail
        );
      } catch (pErr) {
        console.warn('Could not create payment op record:', pErr);
      }

      // 4. Post Double Entry Transaction: Debit Treasury (Cash/Bank), Credit Revenue
      if (selectedWallet && revAcc) {
        await postDoubleEntryTransaction(
          {
            referenceNo: recCode,
            date: clientBillPayDate,
            businessId: activeBusiness.id,
            businessName: activeBusiness.name,
            transactionType: 'sale',
            category: `Corporate Garments Monthly Bill Collection (${companyName})`,
            description: `Collected ৳${clientBillPayAmount} transport payment from ${companyName}. ${clientBillNotes}`,
            debitAccountId: selectedWallet.id,
            debitAccountName: selectedWallet.name,
            creditAccountId: revAcc.id,
            creditAccountName: revAcc.name,
            amount: Number(clientBillPayAmount),
            paymentStatus: 'paid',
            dueAmount: 0,
            counterpartyName: companyName,
          },
          accounts,
          ownerId,
          actorEmail
        );
      }

      triggerGlobalToast(`Successfully collected ৳${clientBillPayAmount.toLocaleString()} monthly bill from ${companyName}!`, 'success');
      setShowCollectClientBillModal(false);
      setTargetClientForBill(null);
    } catch (err: any) {
      console.error('Error collecting client bill:', err);
      triggerGlobalToast(err?.message || 'Failed to record bill payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewGarmentsModal = () => {
    setEditingGarmentsContract(null);
    setGarmentsClientName('');
    setGarmentsLocation('');
    setGarmentsContactPerson('');
    setGarmentsContactPhone('');
    setGarmentsBillingType('day_trip');
    setGarmentsAgreedRate(15000);
    setGarmentsAssignedTrucks(['DHAKA-METRO-TA-11-2233']);
    setGarmentsStartDate(new Date().toISOString().split('T')[0]);
    setGarmentsStatus('active');
    setGarmentsRemarks('');
    setShowAddGarmentsModal(true);
  };

  const openEditGarmentsModal = (contract: ErpTransportOp) => {
    setEditingGarmentsContract(contract);
    setGarmentsClientName(contract.clientName || contract.customerName || '');
    setGarmentsLocation(contract.factoryLocation || contract.origin || '');
    setGarmentsContactPerson(contract.contactPerson || '');
    setGarmentsContactPhone(contract.contactPhone || '');
    setGarmentsBillingType(contract.billingType === 'monthly' ? 'monthly' : 'day_trip');
    setGarmentsAgreedRate(contract.agreedRate || 15000);

    let trucks: string[] = [];
    if (Array.isArray(contract.assignedTrucks)) {
      trucks = contract.assignedTrucks;
    } else if (contract.assignedTrucksJson) {
      try {
        trucks = JSON.parse(contract.assignedTrucksJson);
      } catch {
        trucks = [];
      }
    } else if (contract.route && contract.route.includes(',')) {
      trucks = contract.route.split(',').map((s) => s.trim());
    } else if (contract.registrationNumber) {
      trucks = [contract.registrationNumber];
    }
    setGarmentsAssignedTrucks(trucks);
    setGarmentsStartDate(contract.startDate || new Date().toISOString().split('T')[0]);
    setGarmentsStatus((contract.contractStatus as any) || (contract.status as any) || 'active');
    setGarmentsRemarks(contract.remarks || '');
    setShowAddGarmentsModal(true);
  };

  const handleDeleteGarmentsContract = async (contract: ErpTransportOp) => {
    triggerConfirmDelete({
      title: 'Confirm Delete Contract',
      message: `Are you sure you want to delete contract for ${contract.clientName || 'this corporate client'}?`,
      itemName: contract.clientName || 'Garments Contract',
      onConfirm: async () => {
        try {
          await deleteTransportOp(contract.id);
        } catch (err: any) {
          triggerGlobalToast('Failed to delete contract: ' + (err?.message || ''), 'info');
        }
      },
    });
  };

  // 19. Export to CSV Helper with safe Blob and UTF-8 BOM
  const handleExportCsv = (title: string, headers: string[], rows: (string | number | undefined | null)[][]) => {
    const formatCell = (c: string | number | undefined | null) => {
      if (c === undefined || c === null) return '""';
      const str = String(c).replace(/"/g, '""');
      return `"${str}"`;
    };
    const csvRows = [
      headers.map(formatCell).join(','),
      ...rows.map((r) => r.map(formatCell).join(',')),
    ];
    const csvText = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportSpecificReport = (repId: string, repTitle: string) => {
    switch (repId) {
      case 'all_trucks': {
        const headers = ['Vehicle Code', 'Registration Number', 'Brand & Model', 'Body Type', 'Capacity (Tons)', 'Assigned Driver', 'Driver Mobile', 'Current KM', 'Tax Token Exp', 'Fitness Exp', 'Insurance Exp', 'Route Permit Exp', 'Status'];
        const rows = allVehicles.map((v) => [
          v.tripOrVehicleCode || '-',
          v.registrationNumber || '-',
          v.vehicleType || `${v.brand || ''} ${v.model || ''}`.trim() || 'Heavy Truck',
          v.truckBodyType || 'Open Truck',
          v.capacityTons || 0,
          v.driverName || 'Unassigned',
          v.driverPhone || '-',
          v.currentOdometer || 0,
          v.taxTokenExpiry || '-',
          v.fitnessExpiry || '-',
          v.insuranceExpiry || '-',
          v.routePermitExpiry || '-',
          v.status || 'available'
        ]);
        handleExportCsv(repTitle, headers, rows);
        break;
      }
      case 'running_trips': {
        const headers = ['Challan No', 'Order No', 'Registration', 'Driver', 'Driver Mobile', 'Departure Date', 'Expected Return', 'Loading Point', 'Unloading Point', 'Route', 'Freight Fare (BDT)', 'Advance Received (BDT)', 'Due (BDT)', 'Status'];
        const running = allTrips.filter((t) => t.status === 'active' || t.status === 'running');
        const rows = running.map((t) => [
          t.challanNumber || t.tripOrVehicleCode || '-',
          t.orderNumber || '-',
          t.registrationNumber || '-',
          t.driverName || '-',
          t.driverPhone || '-',
          t.date || '-',
          t.expectedReturnDate || '-',
          t.loadingLocation || t.origin || '-',
          t.deliveryLocation || t.destination || '-',
          t.route || '-',
          t.tripRevenue || 0,
          t.advanceReceived || 0,
          t.outstandingDue || 0,
          t.status || 'running'
        ]);
        handleExportCsv(repTitle, headers, rows);
        break;
      }
      case 'completed_trips': {
        const headers = ['Challan No', 'Registration', 'Driver', 'Trip Date', 'Actual Return Date', 'Origin / Loading', 'Destination / Unload', 'Total Freight (BDT)', 'Trip Expenses (BDT)', 'Net Profit (BDT)', 'Status'];
        const completed = allTrips.filter((t) => t.status === 'completed');
        const rows = completed.map((t) => [
          t.challanNumber || t.tripOrVehicleCode || '-',
          t.registrationNumber || '-',
          t.driverName || '-',
          t.date || '-',
          t.actualReturnDate || t.expectedReturnDate || '-',
          t.loadingLocation || t.origin || '-',
          t.deliveryLocation || t.destination || '-',
          t.tripRevenue || 0,
          t.tripExpense || 0,
          (Number(t.tripRevenue || 0)) - (Number(t.tripExpense || 0)),
          t.status || 'completed'
        ]);
        handleExportCsv(repTitle, headers, rows);
        break;
      }
      case 'truck_history': {
        const headers = ['Challan No', 'Registration Number', 'Driver', 'Date', 'Loading Location', 'Delivery Location', 'Distance (KM)', 'Gross Freight (BDT)', 'Fuel Cost (BDT)', 'Toll & Ferry (BDT)', 'Driver Khoraki (BDT)', 'Net Profit (BDT)', 'Status'];
        const rows = allTrips.map((t) => [
          t.challanNumber || t.tripOrVehicleCode || '-',
          t.registrationNumber || '-',
          t.driverName || '-',
          t.date || '-',
          t.loadingLocation || t.origin || '-',
          t.deliveryLocation || t.destination || '-',
          t.distanceKm || 0,
          t.tripRevenue || 0,
          t.fuelCost || 0,
          (Number(t.tollCost || 0)) + (Number(t.ferryCost || 0)),
          t.driverKhoraki || t.driverAllowance || 0,
          (Number(t.tripRevenue || 0)) - (Number(t.tripExpense || 0)),
          t.status || '-'
        ]);
        handleExportCsv(repTitle, headers, rows);
        break;
      }
      case 'driver_perf': {
        const headers = ['Driver Name', 'Assigned Truck', 'Driver Phone', 'Completed Trips', 'Running Trips', 'Total Distance (KM)', 'Total Freight Handled (BDT)', 'Total Driver Commission (BDT)'];
        const map = new Map<string, any>();
        for (const t of allTrips) {
          const dName = (t.driverName || 'Unassigned').trim();
          if (!map.has(dName)) {
            map.set(dName, {
              name: dName,
              truck: t.registrationNumber || '-',
              phone: t.driverPhone || '-',
              completed: 0,
              running: 0,
              km: 0,
              freight: 0,
              commission: 0,
            });
          }
          const rec = map.get(dName);
          if (t.status === 'completed') rec.completed++;
          else rec.running++;
          rec.km += Number(t.distanceKm || 0);
          rec.freight += Number(t.tripRevenue || 0);
          rec.commission += Number(t.driverCommission || t.commission || 0);
        }
        const rows = Array.from(map.values()).map((d) => [
          d.name,
          d.truck,
          d.phone,
          d.completed,
          d.running,
          d.km,
          d.freight,
          d.commission
        ]);
        handleExportCsv(repTitle, headers, rows);
        break;
      }
      case 'fuel_report': {
        const headers = ['Date', 'Vehicle Reg', 'Driver', 'Fuel Type', 'Quantity (Litres)', 'Unit Price (BDT)', 'Total Cost (BDT)', 'Odometer (KM)', 'Fuel Station', 'Remarks'];
        const rows = (allFuelLogs || []).map((f) => [
          f.date || '-',
          f.registrationNumber || '-',
          f.driverName || '-',
          f.fuelType || 'Diesel',
          f.fuelLitres || 0,
          f.fuelLitres ? Math.round((f.fuelCost || 0) / f.fuelLitres) : 0,
          f.fuelCost || 0,
          f.currentOdometer || 0,
          f.origin || 'Highway Fuel Station',
          f.remarks || '-'
        ]);
        handleExportCsv(repTitle, headers, rows.length > 0 ? rows : [['-', '-', '-', 'Diesel', 0, 0, 0, 0, '-', 'No fuel logs recorded yet']]);
        break;
      }
      case 'maint_report': {
        const headers = ['Date', 'Vehicle Reg', 'Service Category', 'Workshop / Garage', 'Parts Replaced', 'Labor & Parts Cost (BDT)', 'Next Service Date', 'Status', 'Remarks'];
        const rows = (allMaintenanceLogs || []).map((m: any) => [
          m.date || '-',
          m.registrationNumber || '-',
          m.vehicleType || 'Routine Maintenance',
          m.customerName || 'Central Garage',
          m.cargoDetails || m.maintenanceDetails || '-',
          m.maintenanceCost || 0,
          m.nextServiceDate || '-',
          m.status || 'completed',
          m.remarks || '-'
        ]);
        handleExportCsv(repTitle, headers, rows.length > 0 ? rows : [['-', '-', 'Maintenance', 'Garage', '-', 0, '-', 'completed', 'No maintenance logs recorded yet']]);
        break;
      }
      case 'service_exp': {
        const headers = ['Date', 'Vehicle Reg', 'Expense Type', 'Description', 'Amount (BDT)', 'Vendor / Garage'];
        const rows = (allMaintenanceLogs || []).map((m: any) => [
          m.date || '-',
          m.registrationNumber || '-',
          'Repair & Service',
          m.maintenanceDetails || 'Fleet service expense',
          m.maintenanceCost || 0,
          m.customerName || 'Authorized Workshop'
        ]);
        handleExportCsv(repTitle, headers, rows.length > 0 ? rows : [['-', '-', 'Service', 'Garage repair', 0, '-']]);
        break;
      }
      case 'monthly_rev': {
        const headers = ['Month Period', 'Total Trips', 'Gross Freight (BDT)', 'Demurrage Billed (BDT)', 'Total Billed (BDT)', 'Direct Fuel & Road Cost (BDT)', 'Estimated Net Profit (BDT)'];
        const monthMap = new Map<string, any>();
        for (const t of allTrips) {
          const m = t.date ? t.date.slice(0, 7) : 'Unknown';
          if (!monthMap.has(m)) {
            monthMap.set(m, { month: m, count: 0, freight: 0, demurrage: 0, expense: 0 });
          }
          const item = monthMap.get(m);
          item.count++;
          item.freight += Number(t.tripRevenue || 0);
          item.demurrage += Number(t.demurrageAmount || 0);
          item.expense += Number(t.tripExpense || 0);
        }
        const rows = Array.from(monthMap.values()).map((m) => [
          m.month,
          m.count,
          m.freight,
          m.demurrage,
          m.freight + m.demurrage,
          m.expense,
          (m.freight + m.demurrage) - m.expense
        ]);
        handleExportCsv(repTitle, headers, rows);
        break;
      }
      case 'truck_pnl': {
        const headers = ['Registration Number', 'Model / Type', 'Driver', 'Total Trips Completed', 'Gross Freight (BDT)', 'Total Direct Expenses (BDT)', 'Maintenance Costs (BDT)', 'Net Fleet Profit (BDT)'];
        const rows = allVehicles.map((v) => {
          const vReg = normalizeReg(v.registrationNumber);
          const vTrips = allTrips.filter((t) => normalizeReg(t.registrationNumber) === vReg);
          const gross = vTrips.reduce((s, t) => s + Number(t.tripRevenue || 0), 0);
          const expenses = vTrips.reduce((s, t) => s + Number(t.tripExpense || 0), 0);
          const maint = (allMaintenanceLogs || [])
            .filter((m: any) => normalizeReg(m.registrationNumber) === vReg)
            .reduce((s: number, m: any) => s + Number(m.maintenanceCost || 0), 0);
          return [
            v.registrationNumber,
            v.vehicleType || 'Heavy Truck',
            v.driverName || 'Unassigned',
            vTrips.length,
            gross,
            expenses,
            maint,
            gross - (expenses + maint)
          ];
        });
        handleExportCsv(repTitle, headers, rows);
        break;
      }
      case 'driver_salary': {
        const headers = ['Driver Name', 'Assigned Truck', 'Driver Phone', 'Total Trip Allowance / Khoraki (BDT)', 'Total Commission (BDT)', 'Advance Taken (BDT)', 'Net Payable (BDT)'];
        const driverMap = new Map<string, any>();
        for (const t of allTrips) {
          const dName = (t.driverName || 'Unassigned').trim();
          if (!driverMap.has(dName)) {
            driverMap.set(dName, { name: dName, truck: t.registrationNumber, phone: t.driverPhone, khoraki: 0, commission: 0 });
          }
          const rec = driverMap.get(dName);
          rec.khoraki += Number(t.driverKhoraki || t.driverAllowance || 0);
          rec.commission += Number(t.driverCommission || t.commission || 0);
        }
        const rows = Array.from(driverMap.values()).map((d) => [
          d.name,
          d.truck,
          d.phone || '-',
          d.khoraki,
          d.commission,
          0,
          d.khoraki + d.commission
        ]);
        handleExportCsv(repTitle, headers, rows);
        break;
      }
      case 'customer_due': {
        const headers = ['Party / Customer Name', 'Challan No', 'Truck Reg', 'Trip Date', 'Total Freight (BDT)', 'Advance Received (BDT)', 'Outstanding Due (BDT)', 'Receiver Contact'];
        const dueTrips = allTrips.filter((t) => Number(t.outstandingDue || 0) > 0 || (Number(t.tripRevenue || 0) - Number(t.advanceReceived || 0) > 0));
        const rows = dueTrips.map((t) => [
          t.customerName || t.clientName || 'General Client',
          t.challanNumber || t.tripOrVehicleCode || '-',
          t.registrationNumber || '-',
          t.date || '-',
          t.tripRevenue || 0,
          t.advanceReceived || 0,
          t.outstandingDue !== undefined ? t.outstandingDue : Math.max(0, Number(t.tripRevenue || 0) - Number(t.advanceReceived || 0)),
          (t as any).receiverPhone || t.driverPhone || '-'
        ]);
        handleExportCsv(repTitle, headers, rows.length > 0 ? rows : [['-', '-', '-', '-', 0, 0, 0, 'All dues cleared']]);
        break;
      }
      default: {
        handleExportCsv(
          repTitle,
          ['Challan / Code', 'Registration', 'Driver', 'Date', 'Freight (BDT)', 'Status'],
          allTrips.map((t) => [t.challanNumber || t.tripOrVehicleCode || '-', t.registrationNumber, t.driverName, t.date || '-', t.tripRevenue || 0, t.status || '-'])
        );
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* ── TOP HEADER & SUB-TABS NAVIGATION ────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
        {onBackToDashboard && (
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {activeBusiness.location ? `Location: ${activeBusiness.location}` : ''}
              {activeBusiness.managerName ? ` · In-Charge: ${activeBusiness.managerName}` : ''}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {activeBusiness.name} — Fleet & Transport Management
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {allVehicles.length} Trucks
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {bn
                  ? 'Fleet profiles, trip dispatch, fuel logs, driver payroll & P&L ledger'
                  : 'Fleet operations, trips, fuel efficiency, driver payroll, and vehicle profit/loss'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddTripModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ New Trip</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddVehicleModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              <Truck className="h-3.5 w-3.5 text-emerald-600" />
              <span>+ Add Truck</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddFuelModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              <Fuel className="h-3.5 w-3.5 text-sky-600" />
              <span>+ Fuel</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddServiceModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              <Wrench className="h-3.5 w-3.5 text-amber-600" />
              <span>+ Service</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs font-bold">
          {[
            { id: 'dashboard', labelBn: 'Dashboard', labelEn: 'Dashboard', icon: Gauge },
            { id: 'vehicles', labelBn: `All Trucks (${allVehicles.length})`, labelEn: `All Trucks (${allVehicles.length})`, icon: Truck },
            { id: 'garments', labelBn: 'Garments & Contracts', labelEn: 'Garments & Contracts', icon: Building2 },
            { id: 'trips', labelBn: 'Trip Ledger', labelEn: 'Trip Ledger', icon: Navigation },
            { id: 'fuel', labelBn: 'Fuel Logs', labelEn: 'Fuel Logs', icon: Fuel },
            { id: 'drivers', labelBn: 'Drivers & Staff', labelEn: 'Drivers & Staff', icon: Users },
            { id: 'maintenance', labelBn: 'Maintenance', labelEn: 'Maintenance', icon: Wrench },
            { id: 'reports', labelBn: '12 Reports', labelEn: '12 Reports', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TransportTab)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{bn ? tab.labelBn : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: TRANSPORT DASHBOARD ─────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Top 10 Summary Cards (Today's metrics first, Red alert for Under Maintenance, all clickable) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            {/* 1. Today's Total Income (FIRST) */}
            <div
              onClick={() => setShowTodayIncomeModal(true)}
              className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs space-y-1 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-between">
                <span>Today&apos;s Income</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                +{formatBDT(dashboardKpis.todayIncome)}
              </div>
              <div className="text-[10px] text-emerald-600 flex items-center justify-between">
                <span>{todayIncomeData.items.length} income entries</span>
                <span className="underline decoration-dotted text-[9px] font-bold">Details →</span>
              </div>
            </div>

            {/* 2. Today's Total Expenses (SECOND) */}
            <div
              onClick={() => setShowTodayExpenseModal(true)}
              className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-2xs space-y-1 hover:border-amber-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-amber-800 dark:text-amber-300 font-bold flex items-center justify-between">
                <span>Today&apos;s Expenses</span>
                <DollarSign className="h-3.5 w-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xl font-black font-mono text-amber-700 dark:text-amber-400">
                -{formatBDT(dashboardKpis.todayExpenses)}
              </div>
              <div className="text-[10px] text-amber-600 flex items-center justify-between">
                <span>Fuel, toll, khoraki & road</span>
                <span className="underline decoration-dotted text-[9px] font-bold">Details →</span>
              </div>
            </div>

            {/* 3. Running Trips */}
            <div
              onClick={() => {
                setSelectedTripStatusFilter('active');
                setActiveTab('trips');
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Running Trips</span>
              </div>
              <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                {dashboardKpis.runningCount}
              </div>
              <div className="text-[10px] text-emerald-600 flex items-center justify-between">
                <span>on the road</span>
                <span className="underline decoration-dotted text-[9px] font-bold">View →</span>
              </div>
            </div>

            {/* 4. Available Trucks */}
            <div
              onClick={() => setActiveTab('vehicles')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-sky-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>Available Trucks</span>
                <Truck className="h-3.5 w-3.5 text-sky-500" />
              </div>
              <div className="text-xl font-black font-mono text-sky-600">
                {dashboardKpis.availableCount}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>ready for dispatch</span>
                <span className="underline decoration-dotted text-[9px] font-bold">Fleet →</span>
              </div>
            </div>

            {/* 5. Trucks Under Maintenance & Workshop Demurrage */}
            {(() => {
              const inRepair = dashboardKpis.maintenanceCount > 0;
              const estMaintDemurrage = activeMaintenanceList.reduce((s, m) => s + (m.demurrage || 0), 0);
              return (
                <div
                  onClick={() => setShowMaintenanceModal(true)}
                  className={`p-3 rounded-xl transition-all cursor-pointer space-y-1 ${
                    inRepair
                      ? 'border-2 border-rose-400 dark:border-rose-700 bg-rose-50/80 dark:bg-rose-950/40 shadow-xs hover:border-rose-600 hover:shadow-md ring-1 ring-rose-300/50 dark:ring-rose-900/50'
                      : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-400'
                  }`}
                >
                  <div className={`text-[11px] font-bold flex items-center justify-between ${
                    inRepair ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    <span className="flex items-center gap-1">
                      {inRepair ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 animate-bounce" />
                      ) : (
                        <Wrench className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <span>In Workshop / Repair</span>
                    </span>
                    <Wrench className={`h-3.5 w-3.5 ${inRepair ? 'text-rose-600' : 'text-slate-400'}`} />
                  </div>

                  <div className={`text-xl font-black font-mono ${
                    inRepair ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                  }`}>
                    {dashboardKpis.maintenanceCount}
                  </div>

                  <div className="text-[10px] font-semibold flex items-center justify-between">
                    <span className={inRepair ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                      {inRepair ? `${dashboardKpis.maintenanceCount} in garage/shop` : '✓ 0 in repair (All Fleet Healthy)'}
                    </span>
                    <span className="underline decoration-dotted text-[9px] text-slate-400 font-bold">Details →</span>
                  </div>

                  {inRepair && estMaintDemurrage > 0 && (
                    <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-2 py-1 mt-0.5 border border-amber-200 dark:border-amber-800/50">
                      ⚠ Delay Demurrage: {formatBDT(estMaintDemurrage)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 6. Total Trucks */}
            <div
              onClick={() => setActiveTab('vehicles')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-slate-400 cursor-pointer transition-all"
            >
              <div className="text-[11px] text-slate-500 font-medium">Total Trucks</div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {dashboardKpis.totalTrucks}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>{allVehicles.length} registered</span>
                <span className="underline decoration-dotted text-[9px]">Fleet →</span>
              </div>
            </div>

            {/* 7. Total Distance Travelled */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">Total Distance</div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {dashboardKpis.totalDistance.toLocaleString()} <span className="text-xs font-normal">KM</span>
              </div>
              <div className="text-[10px] text-slate-400">{allTrips.length} trips total</div>
            </div>

            {/* 8. Monthly Revenue */}
            <div
              onClick={() => setShowMonthlyRevenueModal(true)}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>Monthly Revenue</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-black font-mono text-emerald-600">
                {formatBDT(dashboardKpis.monthlyRevenue)}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>gross freight</span>
                <span className="underline decoration-dotted text-[9px] font-bold text-emerald-600">Breakdown →</span>
              </div>
            </div>

            {/* 9. Monthly Expenses */}
            <div
              onClick={() => setShowMonthlyExpenseModal(true)}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-rose-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>Monthly Expenses</span>
                <DollarSign className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <div className="text-xl font-black font-mono text-rose-600">
                {formatBDT(dashboardKpis.monthlyExpenses)}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>fuel, toll & repair</span>
                <span className="underline decoration-dotted text-[9px] font-bold text-rose-600">Breakdown →</span>
              </div>
            </div>

            {/* 10. Monthly Net Profit */}
            <div
              onClick={() => setActiveTab('reports')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1 hover:border-sky-500 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>Monthly Net Profit</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
              </div>
              <div
                className={`text-xl font-black font-mono ${
                  dashboardKpis.monthlyNetProfit >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600'
                }`}
              >
                {formatBDT(dashboardKpis.monthlyNetProfit)}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Net Margin</span>
                <span className="underline decoration-dotted text-[9px] font-bold text-sky-600">P&L Report →</span>
              </div>
            </div>
          </div>

          {/* ── FLEET ALLOCATION OVERVIEW: 5 GARMENTS vs 2 OPEN MARKET ─── */}
          <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/80 via-white to-sky-50/80 dark:from-purple-950/30 dark:via-slate-900 dark:to-sky-950/20 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Fleet Deployment Overview (7 Total Fleet Trucks)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      5 Garments Dedicated • 2 Open Fleet
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Ananta Apparels (2 Trucks), Ha-Meem Denim (2 Trucks), Square Fashions (1 Truck) — 2 Trucks available for open market trips.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setTruckContractFilter('garments');
                    setActiveTab('vehicles');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 shadow-2xs cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>View Garments Fleet (5)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTruckContractFilter('open');
                    setActiveTab('vehicles');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 shadow-2xs cursor-pointer"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>View Open Fleet (2)</span>
                </button>
              </div>
            </div>

            {/* Quick 2-Column High-Level Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2">
                <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span>Garments Dedicated Fleet by Company:</span>
                  </span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                    {garmentsDedicatedTrucks.length} Trucks
                  </span>
                </div>
                <div className="space-y-1.5">
                  {garmentsStatsList.map((item) => {
                    const c = item.contract;
                    return (
                      <div
                        key={c.id}
                        className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>🏢 {c.clientName || c.customerName}</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-mono">
                              {item.assignedTrucks.length} Trucks
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {c.billingType === 'monthly'
                              ? `Monthly Fixed: ${formatBDT(c.agreedRate || 0)}/mo`
                              : `Per Trip Rate: ${formatBDT(c.agreedRate || 0)}/trip`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('garments')}
                          className="text-[11px] font-bold text-purple-600 hover:underline cursor-pointer"
                        >
                          View →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 space-y-2">
                <div className="font-bold text-sky-900 dark:text-sky-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Navigation className="h-4 w-4 text-sky-600" />
                    <span>Open Market Fleet:</span>
                  </span>
                  <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                    {allVehicles.filter((v) => !getTruckAssignedGarments(v.registrationNumber)).length} Trucks
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-sky-100 dark:border-sky-900/40 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    2 Trucks ready for ad-hoc open market freight & return cargo trips.
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    DHAKA-METRO-TA-16-7788 (14T Open) • DHAKA-METRO-TA-17-8899 (22T Trailer)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTruckContractFilter('open');
                      setActiveTab('vehicles');
                    }}
                    className="text-[11px] font-bold text-sky-600 hover:underline cursor-pointer pt-1 block"
                  >
                    Manage Open Fleet Trucks →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── EXACT REQUIREMENT: 4 CURRENTLY RUNNING TRUCKS SECTION ──── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  'Running Trucks — Currently On Trip (4 Units)'
                </h2>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTripStatusFilter('active');
                  setActiveTab('trips');
                }}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View All Running Trips →</span>
              </button>
            </div>

            {fourRunningTrucks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {fourRunningTrucks.map((trip) => {
                  const isActuallyRunning = trip.status === 'active' || trip.status === 'running';
                  return (
                    <div
                      key={trip.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3 space-y-2.5 flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Reg & Status */}
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="font-mono font-black text-xs text-slate-900 dark:text-white">
                              {trip.registrationNumber}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{trip.tripOrVehicleCode}</div>
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                              isActuallyRunning
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isActuallyRunning ? '● On Trip' : trip.status}
                          </span>
                        </div>

                        {/* Driver & Route */}
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <span className="text-[10px] text-slate-400">Driver:</span>
                            <span className="font-semibold">{resolveTripDriverName(trip)}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                            <span className="text-[10px] text-slate-400">From:</span>
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">{trip.origin}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                            <span className="text-[10px] text-slate-400">To:</span>
                            <span className="font-medium text-sky-700 dark:text-sky-400">{trip.destination}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-400">Start Date:</span>
                            <span className="font-mono">{trip.date}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-400">Start KM:</span>
                            <span className="font-mono font-bold">{trip.startOdometer || 0} KM</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenExtendTrip(trip)}
                          className="py-1.5 px-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 text-center inline-flex items-center justify-center gap-1 cursor-pointer"
                          title="Trip delayed due to road jam or unloading? Extend return date and bill demurrage"
                        >
                          <Clock className="h-3 w-3 text-amber-600" />
                          <span>⏱ Delay & Demurrage</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openTripChallanModal(trip)}
                          className="py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-100 text-center inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Challan Slip</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No running trucks on trip currently.
              </div>
            )}
          </div>

          {/* Document & Maintenance Expiry Alerts Banner */}
          {expiryAlerts.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  {bn
                    ? `Alert: ${expiryAlerts.length} vehicle documents or service schedules are expiring or overdue!`
                    : `Alert: ${expiryAlerts.length} document/maintenance expiries pending!`}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                {expiryAlerts.map((alt, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border flex items-center justify-between ${
                      alt.isExpired
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{alt.reg}</div>
                      <div className="text-[10px]">{alt.docType}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-[11px]">
                      <div>{alt.expiryDate}</div>
                      <span className="text-[9px] uppercase">{alt.isExpired ? 'Expired' : 'Upcoming'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: TRUCK / VEHICLE MANAGEMENT (ALL TRUCKS) ─────────── */}
      {activeTab === 'vehicles' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          {/* Header & Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-600" />
                <span>All Registered Fleet Vehicles ({allVehicles.length} Trucks)</span>
              </h2>
              <p className="text-xs text-slate-500">
                BRTA documentation, tax tokens, route permits, odometer readings, and truck income-expense ledger
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">Available:</span>
                <span className="font-bold text-sky-700 dark:text-sky-300">
                  {allVehicles.filter((v) => v.status === 'available').length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">On Trip:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {runningTrips.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTruckForStatement(allVehicles[0] || null);
                  setShowTruckMonthlyStatementModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/60 shadow-2xs cursor-pointer"
                title="Download or Print Monthly Performance & Income Statement PDF"
              >
                <FileText className="h-3.5 w-3.5 text-purple-600" />
                <span>Monthly Statement (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddVehicleModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Truck</span>
              </button>
            </div>
          </div>

          {/* Quick Fleet Segmentation Cards: All vs Garments vs Open */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setTruckContractFilter('ALL')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                truckContractFilter === 'ALL'
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <div className="text-[11px] font-bold flex items-center justify-between">
                <span>All Fleet Trucks</span>
                <Truck className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="text-lg font-black font-mono">{allVehicles.length} Trucks</div>
              <div className="text-[10px] text-slate-400">Total 7 company-owned trucks</div>
            </button>

            <button
              type="button"
              onClick={() => setTruckContractFilter('garments')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                truckContractFilter === 'garments'
                  ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <div className="text-[11px] font-bold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-purple-600" />
                  <span>Garments Dedicated</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                  5 Trucks
                </span>
              </div>
              <div className="text-lg font-black font-mono text-purple-600 dark:text-purple-400">
                {allVehicles.filter((v) => getTruckAssignedGarments(v.registrationNumber)).length} Trucks
              </div>
              <div className="text-[10px] text-slate-400">Ananta (2), Ha-Meem (2), Square (1)</div>
            </button>

            <button
              type="button"
              onClick={() => setTruckContractFilter('open')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                truckContractFilter === 'open'
                  ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 text-sky-950 dark:text-sky-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <div className="text-[11px] font-bold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5 text-sky-600" />
                  <span>Open Market Fleet</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                  2 Trucks
                </span>
              </div>
              <div className="text-lg font-black font-mono text-sky-600 dark:text-sky-400">
                {allVehicles.filter((v) => !getTruckAssignedGarments(v.registrationNumber)).length} Trucks
              </div>
              <div className="text-[10px] text-slate-400">General market freight & ad-hoc trips</div>
            </button>
          </div>

          {/* Search & Filter Bar for Trucks */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search truck reg, driver, model, chassis..."
                  value={truckSearchQuery}
                  onChange={(e) => setTruckSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Contract Assignment Filter Dropdown */}
              <select
                value={truckContractFilter}
                onChange={(e) => setTruckContractFilter(e.target.value as any)}
                className="rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Assignments (7 Trucks)</option>
                <option value="garments">Garments Dedicated (5 Trucks)</option>
                <option value="open">Open Market Fleet (2 Trucks)</option>
              </select>

              {/* Status Filter Dropdown */}
              <select
                value={truckStatusFilter}
                onChange={(e) => setTruckStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Status</option>
                <option value="available">Available (Ready)</option>
                <option value="active">On Trip (Running)</option>
                <option value="maintenance">Maintenance (Workshop)</option>
              </select>

              {/* Body Type Filter Dropdown */}
              <select
                value={truckBodyTypeFilter}
                onChange={(e) => setTruckBodyTypeFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Body Types</option>
                <option value="covered">Covered Van</option>
                <option value="open">Open Truck</option>
                <option value="trailer">Trailer</option>
                <option value="pickup">Pickup</option>
              </select>
            </div>

            {(truckSearchQuery || truckStatusFilter !== 'ALL' || truckBodyTypeFilter !== 'ALL' || truckContractFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setTruckSearchQuery('');
                  setTruckStatusFilter('ALL');
                  setTruckBodyTypeFilter('ALL');
                  setTruckContractFilter('ALL');
                }}
                className="text-[11px] font-bold text-rose-600 hover:underline px-2 py-1"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* All Registered Fleet Vehicles Table */}
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Registration & Code</th>
                  <th className="py-2.5 px-3">Type & Capacity</th>
                  <th className="py-2.5 px-3">Driver & Odometer</th>
                  <th className="py-2.5 px-3">Dedicated Contract</th>
                  <th className="py-2.5 px-3">Tax Token</th>
                  <th className="py-2.5 px-3">Fitness Expiry</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div
                        onClick={() => {
                          setSelectedTruckForDetails(v);
                          setTruckDetailsActiveTab('overview');
                        }}
                        className="font-bold text-slate-900 dark:text-white font-mono hover:text-emerald-600 cursor-pointer flex items-center gap-1.5 group"
                        title="Click to view detailed truck profile & financial ledger"
                      >
                        <span>{v.registrationNumber}</span>
                        <Eye className="h-3 w-3 text-slate-400 group-hover:text-emerald-600" />
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {v.tripOrVehicleCode}
                        {v.chassisNumber ? ` • Chassis: ${v.chassisNumber}` : ''}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {cleanTruckName(v.truckName || v.vehicleType)} {v.truckBodyType ? `(${v.truckBodyType})` : ''}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold text-emerald-600">
                        {v.capacityTons ? `${v.capacityTons} Ton Capacity` : ''}
                        {v.purchasePrice ? ` • ${formatBDT(v.purchasePrice)}` : ''}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{v.driverName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{v.currentOdometer || v.distanceKm || 0} KM</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {(() => {
                        const c = getTruckAssignedGarments(v.registrationNumber);
                        if (c) {
                          return (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                                <Building2 className="h-2.5 w-2.5" />
                                <span>{c.clientName || 'Garments Dedicated'}</span>
                              </span>
                              <div className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold flex items-center gap-1">
                                <span>{c.billingType === 'monthly' ? 'Monthly Contract' : 'Per Trip Rate'}</span>
                                <span>• {formatBDT(c.agreedRate || 0)}</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                              <Navigation className="h-2.5 w-2.5" />
                              <span>Open Market Fleet</span>
                            </span>
                            <div className="text-[10px] text-slate-500 font-medium">
                              General cargo & ad-hoc freight trips
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                      {v.taxTokenExpiry || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                      {v.fitnessExpiry || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {(() => {
                        const tripInfo = getTruckActiveTrip(v.registrationNumber);
                        if (tripInfo.isOnTrip) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>On Trip (Returns {tripInfo.returnDateFormatted})</span>
                            </span>
                          );
                        }
                        if (v.status === 'maintenance' || v.status === 'workshop' || v.status === 'repair') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              <span>In Workshop</span>
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Available</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {(() => {
                          const activeInfo = getTruckActiveTrip(v.registrationNumber);
                          if (activeInfo.isOnTrip) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  const trip = allTrips.find(
                                    (t) =>
                                      normalizeReg(t.registrationNumber) === normalizeReg(v.registrationNumber) &&
                                      (t.status === 'active' || t.status === 'running') &&
                                      !t.actualReturnDate
                                  );
                                  handleCancelActiveTrip(trip?.id, v.registrationNumber);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                                title={`Currently on trip until ${activeInfo.returnDateFormatted}. Click to cancel trip and release truck.`}
                              >
                                <XCircle className="h-3 w-3 text-rose-600" />
                                <span>Release</span>
                              </button>
                            );
                          }
                          return null;
                        })()}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTruckForStatement(v);
                            setShowTruckMonthlyStatementModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600 text-white hover:bg-purple-700 text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                          title="Monthly Performance & Income Statement (PDF)"
                        >
                          <FileText className="h-3 w-3" />
                          <span>Statement</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTruckForDetails(v);
                            setTruckDetailsActiveTab('overview');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                          title="View Detailed Truck Profile, Trips & Financial Ledger"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditVehicle(v)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-600 text-white hover:bg-sky-700 text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                          title="Edit / Update Truck Details"
                        >
                          <span>✏ Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerConfirmDelete({
                              title: 'Confirm Delete Truck',
                              message: `Are you sure you want to delete vehicle ${v.registrationNumber}?`,
                              itemName: v.registrationNumber,
                              onConfirm: async () => {
                                await deleteTransportOp(v.id);
                              },
                            });
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>
    )}

      {/* ── TAB: GARMENTS & CORPORATE FLEET CONTRACTS ─── */}
      {activeTab === 'garments' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-5 shadow-2xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Garments Dedicated Fleet & Client Contracts
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  {garmentsDedicatedTrucks.length} Dedicated Trucks • {allGarmentsContracts.length} RMG Clients
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                5 of your 7 fleet trucks are dedicated to corporate garment factories. Click "+ Start Trip" to send any truck on a trip in seconds.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openQuickGarmentsDispatch()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>+ Start Garments Trip</span>
              </button>

              <button
                type="button"
                onClick={openNewGarmentsModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ New Contract</span>
              </button>
            </div>
          </div>

          {/* Business Guide Banner (Explaining Garments Transport & Trips in plain English) */}
          <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/70 to-indigo-50/50 dark:from-purple-950/30 dark:to-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="text-purple-600 text-sm">💡</span>
                <span>How Garments Fleet & Trips Work:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                1. <strong>Dedicated Fleet:</strong> 5 of your 7 trucks are assigned to garment factories.<br />
                2. <strong>Billing:</strong> Factories pay either <strong>Per-Trip</strong> (e.g. ৳14,500/trip on delivery) or <strong>Monthly Fixed</strong> (e.g. ৳220,000/month flat rent).<br />
                3. <strong>Start Trip:</strong> Whenever a truck leaves the factory with goods, click <strong>+ Start Trip</strong>. Driver, loading address, and agreed fare are pre-filled in 5 seconds!
              </p>
            </div>
            <button
              type="button"
              onClick={() => openQuickGarmentsDispatch()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Truck className="h-4 w-4" />
              <span>+ Start Garments Trip</span>
            </button>
          </div>

          {/* 4 Top KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
              <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                <span>Dedicated Fleet</span>
                <Truck className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">
                {garmentsDedicatedTrucks.length}{' '}
                <span className="text-xs font-normal text-slate-400">/ {allVehicles.length} Trucks</span>
              </div>
              <div className="text-[10px] text-purple-600 font-bold">5 Trucks Allocated to Garments</div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
              <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                <span>Open Market Fleet</span>
                <Navigation className="h-3.5 w-3.5 text-sky-500" />
              </div>
              <div className="text-xl font-black font-mono text-sky-600 dark:text-sky-400">
                {allVehicles.length - garmentsDedicatedTrucks.length}{' '}
                <span className="text-xs font-normal text-slate-400">Trucks</span>
              </div>
              <div className="text-[10px] text-slate-400">General Cargo & Open Trips</div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
              <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                <span>Corporate Clients</span>
                <Building2 className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {allGarmentsContracts.length}{' '}
                <span className="text-xs font-normal text-slate-400">Factories</span>
              </div>
              <div className="text-[10px] text-slate-400">Ananta, Ha-Meem, Square</div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
              <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                <span>Total Due Receivable</span>
                <DollarSign className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                {formatBDT(garmentsStatsList.reduce((s, g) => s + g.totalDue, 0))}
              </div>
              <div className="text-[10px] text-slate-400">
                Total Billed: {formatBDT(garmentsStatsList.reduce((s, g) => s + g.totalBilled, 0))}
              </div>
            </div>
          </div>

          {/* View Mode Switcher: Company-Wise vs Dedicated Trucks Table */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-900/40 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Display:</span>
              <button
                type="button"
                onClick={() => setGarmentsViewMode('companies')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  garmentsViewMode === 'companies'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Company-Wise Allocation ({filteredGarmentsContracts.length} Companies)</span>
              </button>
              <button
                type="button"
                onClick={() => setGarmentsViewMode('trucks')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  garmentsViewMode === 'trucks'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Dedicated Trucks Table ({garmentsDedicatedTrucks.length} Trucks)</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-400">
              {garmentsViewMode === 'companies'
                ? 'Corporate clients, assigned dedicated fleet, and monthly billing collection'
                : 'Showing flat table of all 5 garments-dedicated trucks'}
            </span>
          </div>

          {/* ── OPTION A: DEDICATED GARMENTS TRUCKS TABLE (FLAT LIST) ─── */}
          {garmentsViewMode === 'trucks' && (
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-900/40 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck className="h-4 w-4 text-purple-600" />
                    <span>Garments Dedicated Trucks ({garmentsDedicatedTrucks.length} Trucks Allocated from Fleet)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    These 5 vehicles from your 7-truck fleet are dedicated to corporate garment factory transport.
                  </p>
                </div>

                <div className="text-xs font-mono text-purple-700 dark:text-purple-300 font-bold">
                  {garmentsDedicatedTrucks.filter((v) => getTruckActiveTrip(v.registrationNumber).isOnTrip).length} Active On Trip • {garmentsDedicatedTrucks.filter((v) => !getTruckActiveTrip(v.registrationNumber).isOnTrip).length} Available
                </div>
              </div>

              {/* Dedicated Trucks Table */}
              <div className="overflow-x-auto border border-purple-100 dark:border-purple-900/40 rounded-xl bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Truck & Specs</th>
                      <th className="py-2.5 px-3">Crew & Driver</th>
                      <th className="py-2.5 px-3">Dedicated Garments Client</th>
                      <th className="py-2.5 px-3">Factory Loading Point</th>
                      <th className="py-2.5 px-3">Billing Type & Rate</th>
                      <th className="py-2.5 px-3">Standard Route</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Start Trip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {garmentsDedicatedTrucks.map((v) => {
                      const contract = getTruckAssignedGarments(v.registrationNumber);
                      const activeTripInfo = getTruckActiveTrip(v.registrationNumber);
                      const isBusy = activeTripInfo.isOnTrip;
                      const cleanTruckName = (v.truckName || v.vehicleType || 'Heavy Truck').replace(/\(Price:\s*BDT\s*[,.\s]*\)/gi, '').trim();
                      return (
                        <tr key={v.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20">
                          {/* Truck & Specs */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div
                              onClick={() => {
                                setSelectedTruckForDetails(v);
                                setTruckDetailsActiveTab('overview');
                              }}
                              className="font-bold text-slate-900 dark:text-white font-mono hover:text-purple-600 cursor-pointer flex items-center gap-1.5 group"
                              title="Click to view full truck profile"
                            >
                              <span>{v.registrationNumber}</span>
                              <Eye className="h-3 w-3 text-slate-400 group-hover:text-purple-600" />
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {cleanTruckName} • {v.capacityTons ? `${v.capacityTons}T` : ''} ({v.truckBodyType || 'covered'})
                            </div>
                          </td>

                          {/* Driver */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Users className="h-3 w-3 text-purple-500" />
                              <span>{v.driverName}</span>
                            </div>
                            {v.driverPhone && (
                              <a href={`tel:${v.driverPhone}`} className="text-[10px] text-slate-400 font-mono hover:text-purple-600">
                                {v.driverPhone}
                              </a>
                            )}
                          </td>

                          {/* Garments Client */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              <Building2 className="h-2.5 w-2.5" />
                              <span>{contract?.clientName || contract?.customerName || 'Garments Client'}</span>
                            </span>
                          </td>

                          {/* Factory Location */}
                          <td className="py-2.5 px-3">
                            <div className="text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px]">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[160px]">{contract?.factoryLocation || contract?.origin || 'Factory Depot'}</span>
                            </div>
                          </td>

                          {/* Billing Type & Rate */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {formatBDT(contract?.agreedRate || 0)}
                            </div>
                            <div className="text-[10px] text-purple-600 font-medium">
                              {contract?.billingType === 'monthly' ? 'Monthly Fixed' : 'Per Trip Rate'}
                            </div>
                          </td>

                          {/* Route */}
                          <td className="py-2.5 px-3">
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[170px]" title={contract?.route || 'Factory ➔ Port'}>
                              {contract?.route || `${contract?.origin || 'Factory'} ➔ ${contract?.destination || 'Port'}`}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[170px]">{contract?.cargoDetails || 'RMG Export Goods'}</div>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isBusy ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>On Trip (Returns {activeTripInfo.returnDateFormatted})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Available</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isBusy ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={true}
                                  title={`Truck is busy on active trip until ${activeTripInfo.returnDateFormatted}. New trips cannot be dispatched.`}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-[11px] font-bold opacity-60 cursor-not-allowed shadow-none"
                                >
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span>On Trip ({activeTripInfo.returnDateFormatted})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const trip = allTrips.find(
                                      (t) =>
                                        normalizeReg(t.registrationNumber) === normalizeReg(v.registrationNumber) &&
                                        (t.status === 'active' || t.status === 'running') &&
                                        !t.actualReturnDate
                                    );
                                    handleCancelActiveTrip(trip?.id, v.registrationNumber);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                                  title="Cancel active trip & release truck to Available"
                                >
                                  <XCircle className="h-3 w-3 text-rose-600" />
                                  <span>Release</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openQuickGarmentsDispatch(v.registrationNumber, contract)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                              >
                                <Truck className="h-3 w-3" />
                                <span>+ Start Trip</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── OPTION B: CORPORATE CLIENT CONTRACTS & FLEET ALLOCATION (DEFAULT PRIMARY VIEW) ─── */}
          {garmentsViewMode === 'companies' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  <span>Corporate Garments Client Agreements ({filteredGarmentsContracts.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Agreed rates, assigned fleet trucks, billing models, and financial ledgers per corporate client.
                </p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-[180px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={garmentsSearchQuery}
                    onChange={(e) => setGarmentsSearchQuery(e.target.value)}
                    placeholder="Search client, factory, truck..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-purple-500"
                  />
                  {garmentsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setGarmentsSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={garmentsBillingFilter}
                  onChange={(e) => setGarmentsBillingFilter(e.target.value as any)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="ALL">All Billing Models</option>
                  <option value="day_trip">Per Trip Rate Basis</option>
                  <option value="monthly">Monthly Fixed Contract</option>
                </select>
              </div>
            </div>

            {/* Corporate Clients Master Allocation & Monthly Billing Table */}
            <div className="overflow-x-auto border border-purple-100 dark:border-purple-900/40 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    Corporate Client Fleet Allocation & Monthly Billing Roster
                  </span>
                </div>
                <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold">
                  1-Click Bill Collection & Dispatch per Company
                </span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Company & Factory</th>
                    <th className="py-2.5 px-3">Fleet Count</th>
                    <th className="py-2.5 px-3">Assigned Dedicated Trucks</th>
                    <th className="py-2.5 px-3">Billing Model & Rate</th>
                    <th className="py-2.5 px-3 text-center">Trips</th>
                    <th className="py-2.5 px-3 text-right">Total Billed</th>
                    <th className="py-2.5 px-3 text-right">Total Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance Due</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredGarmentsContracts.map((item) => {
                    const contract = item.contract;
                    const isMonthly = contract.billingType === 'monthly';
                    const availTruck = item.assignedTrucks.find((t) => !getTruckActiveTrip(t).isOnTrip);

                    return (
                      <tr key={contract.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20">
                        {/* Company & Factory */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                            <span>{contract.clientName || contract.customerName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{contract.factoryLocation || contract.origin || 'Industrial Area'}</span>
                          </div>
                        </td>

                        {/* Dedicated Fleet Count */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                            <Truck className="h-3 w-3" />
                            <span>{item.assignedTrucks.length} Trucks</span>
                          </span>
                        </td>

                        {/* Assigned Dedicated Trucks */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[280px]">
                            {item.assignedTrucks.map((truckReg) => {
                              const veh = allVehicles.find((v) => normalizeReg(v.registrationNumber) === normalizeReg(truckReg));
                              const activeInfo = getTruckActiveTrip(truckReg);
                              const isBusy = activeInfo.isOnTrip;
                              return (
                                <div
                                  key={truckReg}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                                    isBusy
                                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                  }`}
                                  title={`${truckReg} • Driver: ${veh?.driverName || 'Driver'}${veh?.driverPhone ? ` (${veh.driverPhone})` : ''} • Status: ${isBusy ? `On Trip until ${activeInfo.returnDateFormatted}` : 'Available'}`}
                                >
                                  <span className="font-bold">{truckReg}</span>
                                  <span className="text-[9px] opacity-75">({veh?.driverName?.split(' ')[0] || 'Driver'})</span>
                                  <span className="text-[9px] font-bold">
                                    {isBusy ? '🚫' : '✓'}
                                  </span>
                                </div>
                              );
                            })}
                            {item.assignedTrucks.length === 0 && (
                              <span className="text-slate-400 italic text-[11px]">No trucks assigned</span>
                            )}
                          </div>
                        </td>

                        {/* Billing Model & Rate */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatBDT(contract.agreedRate || 0)}
                          </div>
                          <div className="text-[10px] font-bold text-purple-600">
                            {isMonthly ? 'Monthly Fixed Rate' : 'Per Trip Rate'}
                          </div>
                        </td>

                        {/* Total Trips */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {item.totalTrips}
                          </span>
                        </td>

                        {/* Total Billed */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-slate-900 dark:text-white">
                          {formatBDT(item.totalBilled)}
                        </td>

                        {/* Total Paid */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatBDT(item.totalAdvance)}
                        </td>

                        {/* Balance Due */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-black text-rose-600 dark:text-rose-400">
                          {formatBDT(item.totalDue)}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openCorporateTransportBill(contract)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title="View & Print Official Corporate Transport Bill (Rent + Demurrage Invoice)"
                            >
                              <FileText className="h-3 w-3" />
                              <span>Bill</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openCollectClientBillModal(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title={isMonthly ? 'Receive Monthly Fixed Rent' : 'Receive Trip Payment / Settle Due'}
                            >
                              <DollarSign className="h-3 w-3" />
                              <span>{isMonthly ? '+ Receive Rent' : '+ Receive Payment'}</span>
                            </button>

                            {availTruck ? (
                              <button
                                type="button"
                                onClick={() => openQuickGarmentsDispatch(availTruck, item.contract)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                                title="Start Trip for this Company"
                              >
                                <Truck className="h-3 w-3" />
                                <span>+ Start Trip</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={true}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400 text-[11px] font-bold opacity-60 cursor-not-allowed"
                                title="All trucks assigned to this factory are currently on trip"
                              >
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>Fleet Busy</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedGarmentsForDetails(item)}
                              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="View Trip History & Ledger"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* List of Garments Contracts Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredGarmentsContracts.map((item) => {
                const contract = item.contract;
                const isMonthly = contract.billingType === 'monthly';
                return (
                  <div
                    key={contract.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm p-4 space-y-3.5 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {contract.tripOrVehicleCode}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {contract.clientName || contract.customerName}
                          </h3>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{contract.factoryLocation || contract.origin || 'Industrial Area'}</span>
                        </div>
                      </div>

                      {/* Billing Model Badge */}
                      <div className="shrink-0 text-right">
                        {isMonthly ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              <Calendar className="h-2.5 w-2.5" />
                              <span>Monthly Contract</span>
                            </span>
                            <span className="text-[11px] font-black font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                              {formatBDT(contract.agreedRate || 0)} / Month
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                              <Navigation className="h-2.5 w-2.5" />
                              <span>Per Trip Rate</span>
                            </span>
                            <span className="text-[11px] font-black font-mono text-indigo-700 dark:text-indigo-400 mt-0.5">
                              {formatBDT(contract.agreedRate || 0)} / Trip
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact Person Details */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                        <span className="font-semibold">{contract.contactPerson || 'Logistics In-Charge'}</span>
                      </div>
                      {contract.contactPhone && (
                        <a
                          href={`tel:${contract.contactPhone}`}
                          className="inline-flex items-center gap-1 font-mono font-bold text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{contract.contactPhone}</span>
                        </a>
                      )}
                    </div>

                    {/* Assigned Fleet Trucks */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3 text-emerald-600" />
                          <span>Assigned Dedicated Fleet ({item.assignedTrucks.length} Trucks)</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Auto-fills driver & route on trip dispatch
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {item.assignedTrucks.map((truckReg) => {
                          const veh = allVehicles.find((v) => normalizeReg(v.registrationNumber) === normalizeReg(truckReg));
                          const activeInfo = getTruckActiveTrip(truckReg);
                          const isBusy = activeInfo.isOnTrip;
                          return (
                            <div
                              key={truckReg}
                              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-[11px] space-y-0.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {truckReg}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    isBusy
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  }`}
                                >
                                  {isBusy ? `On Trip (${activeInfo.returnDateFormatted})` : 'Available'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {veh?.truckName || veh?.vehicleType || 'Truck'} • {veh?.capacityTons ? `${veh.capacityTons}T` : ''}
                              </div>
                              <div className="text-[10px] text-emerald-600 font-medium truncate flex items-center gap-1">
                                <Users className="h-2.5 w-2.5" />
                                <span>{veh?.driverName || 'Driver Assigned'}</span>
                                {veh?.driverPhone && <span className="font-mono">({veh.driverPhone})</span>}
                              </div>
                            </div>
                          );
                        })}
                        {item.assignedTrucks.length === 0 && (
                          <div className="text-[11px] text-slate-400 italic p-2">No trucks assigned yet</div>
                        )}
                      </div>
                    </div>

                    {/* Route & Cargo */}
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        <span>Route & Cargo</span>
                      </div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {contract.cargoDetails || 'Garments Goods & Fabrics'}
                      </div>
                      {contract.route && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          {contract.route}
                        </div>
                      )}
                    </div>

                    {/* 4 Financial Stat Boxes */}
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-center">
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <div className="text-[10px] text-slate-400 font-semibold">Trips</div>
                        <div className="text-xs font-black font-mono text-slate-800 dark:text-slate-200">
                          {item.totalTrips}
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <div className="text-[10px] text-slate-400 font-semibold">Billed</div>
                        <div className="text-xs font-black font-mono text-slate-900 dark:text-white">
                          {formatBDT(item.totalBilled)}
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <div className="text-[10px] text-slate-400 font-semibold">Advance</div>
                        <div className="text-xs font-black font-mono text-emerald-600">
                          {formatBDT(item.totalAdvance)}
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <div className="text-[10px] text-slate-400 font-semibold">Due</div>
                        <div className="text-xs font-black font-mono text-rose-600">
                          {formatBDT(item.totalDue)}
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedGarmentsForDetails(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                          title="View Trip History & Ledger"
                        >
                          <Eye className="h-3 w-3 text-slate-500" />
                          <span>Ledger & Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditGarmentsModal(contract)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                          title="Edit Contract"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteGarmentsContract(contract)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Delete Contract"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Collect Monthly Bill, Transport Bill & Dispatch Trip Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => openCorporateTransportBill(contract)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          title="View & Print Official Corporate Transport Bill (Rent + Demurrage Invoice)"
                        >
                          <FileText className="h-3 w-3" />
                          <span>Transport Bill</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openCollectClientBillModal(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                          title={item.contract?.billingType === 'monthly' ? 'Receive Monthly Fixed Rent' : 'Receive Trip Payment / Settle Due'}
                        >
                          <DollarSign className="h-3 w-3" />
                          <span>{item.contract?.billingType === 'monthly' ? '+ Receive Monthly Rent' : '+ Receive Payment'}</span>
                        </button>

                      {/* Dispatch Trip Button */}
                      {(() => {
                        const availTruck = item.assignedTrucks.find((t) => !getTruckActiveTrip(t).isOnTrip);
                        const allBusy = !availTruck;
                        if (allBusy) {
                          return (
                            <button
                              type="button"
                              disabled={true}
                              title="All assigned trucks for this factory are currently on trip."
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 text-xs font-bold opacity-60 cursor-not-allowed shadow-none"
                            >
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>All Fleet on Trip</span>
                            </button>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => openQuickGarmentsDispatch(availTruck, item.contract)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            <span>+ Start Trip</span>
                          </button>
                        );
                      })()}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredGarmentsContracts.length === 0 && (
                <div className="col-span-full p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <Building2 className="h-8 w-8 text-slate-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No Garments Contracts Found
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click the button above to add a new corporate garments contract and assign fleet trucks.
                  </p>
                  <button
                    type="button"
                    onClick={openNewGarmentsModal}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add New Contract</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* ── TAB 3: TRIP MANAGEMENT (TRIPS & OVERLAPPING PREVENTION) ─── */}
      {activeTab === 'trips' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Navigation className="h-4 w-4 text-emerald-600" />
                <span>Trip Management & Orders ({allTrips.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                'Odometer distance, fare, customer dues, and challan vouchers'
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
              <div className="relative min-w-[220px] max-w-sm">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={tripSearchQuery}
                  onChange={(e) => setTripSearchQuery(e.target.value)}
                  placeholder="Search by Truck digits (e.g. 9171), Challan, Driver..."
                  className="w-full pl-8 pr-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                />
                {tripSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTripSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <select
                value={selectedTruckFilter}
                onChange={(e) => setSelectedTruckFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold"
              >
                <option value="ALL">All Trucks ({allVehicles.length} Registered)</option>
                {allVehicles.map((v) => {
                  const digits = (v.registrationNumber || '').replace(/\D/g, '').slice(-4);
                  return (
                    <option key={v.id} value={v.registrationNumber}>
                      [{digits || 'TRK'}] {v.registrationNumber} ({v.truckBodyType || v.vehicleType || 'Truck'})
                    </option>
                  );
                })}
              </select>

              <select
                value={selectedTripStatusFilter}
                onChange={(e) => setSelectedTripStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs font-semibold"
              >
                <option value="ALL">All Status</option>
                <option value="active">Running</option>
                <option value="completed">Completed</option>
              </select>

              <button
                type="button"
                onClick={handleOpenAddTripModal}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Start Trip</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">SL & Trip</th>
                  <th className="py-2.5 px-3">Truck & Driver</th>
                  <th className="py-2.5 px-3">Route</th>
                  <th className="py-2.5 px-3 text-right">Distance (KM)</th>
                  <th className="py-2.5 px-3 text-right">Fare</th>
                  <th className="py-2.5 px-3 text-right">Due</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allTrips
                  .filter((t) => {
                    if (selectedTripStatusFilter !== 'ALL' && t.status !== selectedTripStatusFilter) return false;
                    if (selectedTruckFilter !== 'ALL' && normalizeReg(t.registrationNumber) !== normalizeReg(selectedTruckFilter)) return false;
                    if (tripSearchQuery.trim()) {
                      const q = tripSearchQuery.toLowerCase().trim();
                      const cleanQ = q.replace(/[^a-z0-9]/gi, '');
                      const digitsQ = q.replace(/\D/g, '');

                      const reg = (t.registrationNumber || '').toLowerCase();
                      const cleanReg = reg.replace(/[^a-z0-9]/gi, '');
                      const digitsReg = reg.replace(/\D/g, '');

                      const matchDigits = digitsQ.length >= 2 && digitsReg.includes(digitsQ);
                      const matchCleanReg = cleanQ.length > 0 && cleanReg.includes(cleanQ);
                      const matchTruck = reg.includes(q) || matchCleanReg || matchDigits;
                      const matchDriver = (t.driverName || '').toLowerCase().includes(q);
                      const matchPhone = ((t.driverPhone || (t as any).receiverPhone || '') + '').replace(/\D/g, '').includes(digitsQ) || (t.driverPhone || '').toLowerCase().includes(q);
                      const matchChallan = (t.challanNumber || t.tripOrVehicleCode || t.orderNumber || '').toLowerCase().includes(q);
                      const matchRoute = ((t.loadingLocation || t.origin || '') + ' ' + (t.deliveryLocation || t.destination || '') + ' ' + (t.cargoDetails || '') + ' ' + (t.customerName || t.clientName || '')).toLowerCase().includes(q);

                      if (!matchTruck && !matchDriver && !matchPhone && !matchChallan && !matchRoute) return false;
                    }
                    return true;
                  })
                  .map((t, index) => {
                    const isRunning = t.status === 'active' || t.status === 'running';
                    const hasReturn = Boolean(
                      (t.returnFare && t.returnFare > 0) ||
                      t.returnLoadingPoint ||
                      t.returnUnloadingPoint ||
                      (t.route && (t.route.includes('⇄') || t.route.toLowerCase().includes('round')))
                    );
                    const routeStr = t.route || `${t.origin} ➔ ${t.destination}`;
                    const dueAmt = Number(t.outstandingDue !== undefined ? t.outstandingDue : t.remainingDue || 0);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {t.challanNumber || t.tripOrVehicleCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
                            <span className="text-slate-400">{t.date}</span>
                            {t.orderNumber && (
                              <span className="px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold">
                                {t.orderNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-bold text-emerald-700 dark:text-emerald-400">{t.registrationNumber}</div>
                          <div className="text-[10px] text-slate-500">{resolveTripDriverName(t)}</div>
                        </td>
                        <td className="py-2 px-3 max-w-[240px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              hasReturn
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {hasReturn ? 'Round Trip' : 'Single Trip'}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{routeStr}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {t.customerName} • {t.cargoDetails}
                            {hasReturn && t.returnFare ? ` • Return: ${formatBDT(t.returnFare)}` : ''}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {t.distanceKm || (t.endOdometer && t.startOdometer ? t.endOdometer - t.startOdometer : 0)} KM
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatBDT(t.tripRevenue)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {dueAmt > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetTripForPayment(t);
                                setCustPayAmount(dueAmt);
                                setShowSettlePaymentModal(true);
                              }}
                              className="text-amber-600 hover:underline cursor-pointer"
                              title="Click to collect due"
                            >
                              {formatBDT(dueAmt)}
                            </button>
                          ) : (
                            <span className="text-emerald-600 text-[10px]">Paid</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isRunning
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {isRunning ? 'Running' : 'Completed'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {isRunning && (
                              <button
                                type="button"
                                onClick={() => handleOpenExtendTrip(t)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-700 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                                title="Trip delayed due to road jam or unloading delay? Extend return date & bill demurrage"
                              >
                                <Clock className="h-3 w-3 text-amber-600" />
                                <span>Extend & Demurrage</span>
                              </button>
                            )}

                            {isRunning && (
                              <button
                                type="button"
                                onClick={() => handleOpenAddReturnLoadModal(t)}
                                className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200 hover:bg-sky-600 hover:text-white cursor-pointer"
                                title={hasReturn ? "Edit Return Load" : "+ Add Return Load"}
                              >
                                {hasReturn ? 'Edit Return' : '+ Return Load'}
                              </button>
                            )}

                            {isRunning && (
                              <button
                                type="button"
                                onClick={() => handleCompleteTrip(t)}
                                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 hover:bg-emerald-600 hover:text-white cursor-pointer"
                                title="Mark Completed"
                              >
                                Complete
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEditTrip(t)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-600 text-white hover:bg-sky-700 text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Edit / Update Trip Details"
                            >
                              <span>✏ Edit</span>
                            </button>

                            {(t.status === 'active' || t.status === 'running') && !t.actualReturnDate && (
                              <button
                                type="button"
                                onClick={() => handleCancelActiveTrip(t.id, t.registrationNumber)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                                title="Cancel active trip and release truck to Available"
                              >
                                <XCircle className="h-3 w-3 text-rose-600" />
                                <span>Cancel Trip</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openTripChallanModal(t)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title="View Official Consignment Challan & Income Slip"
                            >
                              <FileText className="h-3 w-3" />
                              <span>Challan Slip</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                triggerConfirmDelete({
                                  title: 'Delete Trip',
                                  message: `Are you sure you want to delete trip ${t.tripOrVehicleCode}?`,
                                  itemName: t.tripOrVehicleCode,
                                  onConfirm: async () => {
                                    await deleteTransportOp(t.id);
                                    triggerGlobalToast('Deleted', 'delete');
                                  },
                                });
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: FUEL MANAGEMENT ─────────────────────────────────── */}
      {activeTab === 'fuel' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Fuel className="h-4 w-4 text-sky-600" />
                <span>Fuel Consumption & Efficiency Logs ({allFuelLogs.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                'Fuel litres, rate, total cost, and calculated KM/L fuel economy'
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddFuelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Log Fuel</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2 px-3">Date & Code</th>
                  <th className="py-2 px-3">Truck & Driver</th>
                  <th className="py-2 px-3">Fuel Pump</th>
                  <th className="py-2 px-3 text-right">Litres</th>
                  <th className="py-2 px-3 text-right">Price/L</th>
                  <th className="py-2 px-3 text-right">Total Cost</th>
                  <th className="py-2 px-3 text-right">Odometer (KM)</th>
                  <th className="py-2 px-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allFuelLogs.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{f.date}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{f.tripOrVehicleCode}</div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">{f.registrationNumber}</div>
                      <div className="text-[10px] text-slate-500">{f.driverName}</div>
                    </td>
                    <td className="py-2 px-3 max-w-[200px] truncate">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{f.fuelStation || f.origin}</div>
                      <div className="text-[10px] text-slate-400 truncate">{f.remarks}</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-sky-600">
                      {f.fuelLitres || 0} L
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      ৳{f.fuelRate || 108}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-rose-600">
                      {formatBDT(f.fuelCost)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {f.startOdometer || 0} KM
                    </td>
                    <td className="py-2 px-3 text-center">
                      {f.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewImageTrip(f)}
                          className="p-1 rounded text-sky-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: DRIVERS & STAFF MANAGEMENT (EXCEL-STYLE TABLE) ──────────────────────── */}
      {activeTab === 'drivers' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          {/* Header & KPI Summary */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span>Driver & Staff Payroll Ledger ({allDrivers.length} Drivers)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Monthly basic salary (BDT 5,000), per-trip driver commission, license validity, and assigned fleet trucks
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">Monthly Payroll:</span>
                <span className="font-bold text-purple-700 dark:text-purple-300">
                  {formatBDT(allDrivers.reduce((s, d) => s + (d.salary || 5000), 0))}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">Total Commission:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {formatBDT(allDrivers.reduce((s, d) => s + (d.totalCommission || 0), 0))}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDrvPayName(allDrivers[0]?.name || '');
                  setDrvPayAmount(5000);
                  setShowAddDriverModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-xs cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>+ Pay Salary / Commission</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Dropdown Bar requested by user */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search driver by name, phone or license..."
                  value={driverSearchQuery}
                  onChange={(e) => setDriverSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Driver Truck Dropdown Filter */}
              <select
                value={driverTruckFilter}
                onChange={(e) => setDriverTruckFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Trucks ({allVehicles.length})</option>
                {allVehicles.map((v) => {
                  const digits = (v.registrationNumber || '').replace(/\D/g, '').slice(-4);
                  return (
                    <option key={v.id} value={v.registrationNumber}>
                      [{digits || 'TRK'}] {v.registrationNumber} ({v.truckBodyType || v.vehicleType || 'Truck'})
                    </option>
                  );
                })}
              </select>

              {/* Status Dropdown Filter */}
              <select
                value={driverStatusFilter}
                onChange={(e) => setDriverStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active / Available</option>
                <option value="On Trip">On Trip / Dispatched</option>
              </select>
            </div>

            {(driverSearchQuery || driverTruckFilter !== 'ALL' || driverStatusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setDriverSearchQuery('');
                  setDriverTruckFilter('ALL');
                  setDriverStatusFilter('ALL');
                }}
                className="text-[11px] font-bold text-rose-600 hover:underline px-2 py-1"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Excel-style Clean Data Table */}
          <div className="overflow-x-auto max-h-[55vh] border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12 border-r border-slate-200 dark:border-slate-700">SL</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700">Driver & Contact</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700">Assigned Truck</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700">Driving License</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-700">Monthly Basic Salary</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700">Completed Trips</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-400">Total Commission</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-700">Total Payable / Earnings</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredDrivers.map((d, index) => {
                  const basicSalary = Number(d.salary || 5000);
                  const totalEarnings = basicSalary + Number(d.totalCommission || 0);

                  return (
                    <tr key={index} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-100 dark:border-slate-800">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-purple-600" />
                          <span>{d.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{d.phone || 'Phone not set'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800">
                        {d.truck ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                            <Truck className="h-3 w-3" />
                            {d.truck}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Float / Unassigned</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {d.license || 'BRTA Verified'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800">
                        {formatBDT(basicSalary)}
                        <span className="text-[9px] text-slate-400 block font-normal font-sans">/ month</span>
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-slate-800 font-mono">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">
                          {d.tripCount} Trips
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300 border-r border-slate-100 dark:border-slate-800">
                        {formatBDT(d.totalCommission)}
                        {d.totalKhoraki > 0 && (
                          <span className="text-[9px] text-slate-400 block font-normal font-sans">
                            + Khoraki: {formatBDT(d.totalKhoraki)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 border-r border-slate-100 dark:border-slate-800">
                        {formatBDT(totalEarnings)}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.status === 'On Trip'
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {d.status === 'On Trip' ? '🚚 On Trip' : 'Active'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setDrvPayName(d.name);
                            setDrvPayAmount(basicSalary);
                            setDrvPayType('salary');
                            setShowAddDriverModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer shadow-2xs"
                        >
                          <CreditCard className="h-3 w-3" />
                          <span>Pay Salary / Comm</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Excel Summary Footer Row */}
              <tfoot className="sticky bottom-0 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-bold text-xs">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px] border-r border-slate-200 dark:border-slate-700">
                    Grand Total ({filteredDrivers.length} Drivers):
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                    {formatBDT(filteredDrivers.reduce((s, d) => s + (d.salary || 5000), 0))}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono border-r border-slate-200 dark:border-slate-700">
                    {filteredDrivers.reduce((s, d) => s + d.tripCount, 0)} Trips
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300 border-r border-slate-200 dark:border-slate-700">
                    {formatBDT(filteredDrivers.reduce((s, d) => s + (d.totalCommission || 0), 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">
                    {formatBDT(
                      filteredDrivers.reduce(
                        (s, d) => s + (d.salary || 5000) + (d.totalCommission || 0),
                        0
                      )
                    )}
                  </td>
                  <td colSpan={2} className="py-2.5 px-3 text-center text-slate-400 text-[10px]">
                    Excel Ledger View
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: MAINTENANCE & SERVICE LOGS ──────────────────────── */}
      {activeTab === 'maintenance' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-600" />
                <span>Vehicle Service & Maintenance Records ({allMaintenanceLogs.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                'Parts replacement, mechanic labour charges, and scheduled servicing'
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddServiceModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Log Service</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2 px-3">Date & Code</th>
                  <th className="py-2 px-3">Truck & Odometer</th>
                  <th className="py-2 px-3">Garage & Mechanic</th>
                  <th className="py-2 px-3">Repair & Parts</th>
                  <th className="py-2 px-3 text-right">Parts Cost</th>
                  <th className="py-2 px-3 text-right">Labour</th>
                  <th className="py-2 px-3 text-right">Total Cost</th>
                  <th className="py-2 px-3">Next Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allMaintenanceLogs.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{m.date}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.tripOrVehicleCode}</div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">{m.registrationNumber}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{m.startOdometer || 0} KM</div>
                    </td>
                    <td className="py-2 px-3 max-w-[180px] truncate">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{m.garageName || m.origin}</div>
                      <div className="text-[10px] text-slate-400 truncate">{m.mechanicName || m.driverName}</div>
                    </td>
                    <td className="py-2 px-3 max-w-[240px]">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">{m.cargoDetails || m.maintenanceDetails}</div>
                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        {m.partsReplaced && <div className="truncate">Parts: {m.partsReplaced}</div>}
                        {m.tyreOrBatterySerial && <div className="text-amber-600 dark:text-amber-400 truncate">S/N: {m.tyreOrBatterySerial}</div>}
                        {m.warrantyExpiryDate && <div className="text-emerald-600 dark:text-emerald-400">Warranty: {m.warrantyExpiryDate}</div>}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{formatBDT(m.partsCost || 0)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatBDT(m.labourCost || 0)}</td>
                    <td className="py-2 px-3 text-right font-mono font-black text-rose-600">
                      {formatBDT(m.maintenanceCost)}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                      {m.nextServiceDate || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 7: 12 AUDITED TRANSPORT REPORTS ─────────────────────── */}
      {activeTab === 'reports' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>12 Audited Transport Reports</span>
              </h2>
              <p className="text-xs text-slate-500">
                'Standard audited transport reports with print and CSV download'
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {[
              { id: 'all_trucks', title: '1. All Truck Report', desc: 'Complete vehicle registry, documentation & road fitness' },
              { id: 'running_trips', title: '2. Running Trip Report', desc: 'Currently dispatched on-road trips and drivers' },
              { id: 'completed_trips', title: '3. Completed Trip Report', desc: 'Concluded voyages with freight and collections' },
              { id: 'truck_history', title: '4. Truck-wise Trip History', desc: 'Historical trips logged per registration plate' },
              { id: 'driver_perf', title: '5. Driver Performance Report', desc: 'Driver efficiency, distance driven and safety' },
              { id: 'fuel_report', title: '6. Fuel Consumption Report', desc: 'Total fuel consumption, refueling and cost/KM' },
              { id: 'maint_report', title: '7. Maintenance History Report', desc: 'Workshop repairs and maintenance timeline' },
              { id: 'service_exp', title: '8. Service Expense Report', desc: 'Parts replacement bills and garage labor fees' },
              { id: 'monthly_rev', title: '9. Monthly Revenue Report', desc: 'Monthly gross freight earnings and revenue' },
              { id: 'truck_pnl', title: '10. Truck-wise Profit & Loss', desc: 'Net profitability per vehicle after all direct costs' },
              { id: 'driver_salary', title: '11. Driver Salary Report', desc: 'Driver salaries, trip allowances and advances' },
              { id: 'customer_due', title: '12. Customer Due Report', desc: 'Outstanding customer receivables and dues' },
            ].map((rep, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">{rep.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{rep.desc}</div>
                </div>
                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => exportSpecificReport(rep.id, rep.title)}
                    className="w-full py-1 text-center rounded border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                  >
                    Download CSV
                  </button>
                  {(rep.id === 'truck_history' || rep.id === 'truck_pnl' || rep.id === 'all_trucks') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTruckForStatement(allVehicles[0] || null);
                        setShowTruckMonthlyStatementModal(true);
                      }}
                      className="w-full py-1 text-center rounded border border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-600 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Print Statement (PDF)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL 1: + NEW TRIP (OUTGOING + RETURN + DETAILED EXPENSES) ─── */}
      {showAddTripModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddTripModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Navigation className="h-4 w-4 text-emerald-600" />
                <span>Create & Dispatch Transport Trip</span>
              </h3>
              <button type="button" onClick={() => setShowAddTripModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTrip} className="space-y-4 text-xs">
              {/* AUTO-GENERATED CHALLAN & ORDER NUMBER */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      Challan Number *
                    </label>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      ✨ Auto-Generated
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={tripChallanNo}
                    onChange={(e) => setTripChallanNo(e.target.value)}
                    placeholder="e.g. CHAL-2026-001"
                    className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold text-xs text-purple-700 dark:text-purple-300 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      Order Number *
                    </label>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                      ✨ Auto-Generated
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={tripOrderNo}
                    onChange={(e) => setTripOrderNo(e.target.value)}
                    placeholder="e.g. ORD-2026-001"
                    className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* SECTION 1: VEHICLE & DRIVER ASSIGNMENT */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>1. Vehicle & Crew</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold">Select Truck *</label>
                      <span className="text-[10px] text-emerald-600 font-bold">🔍 By digits (e.g. 9171)</span>
                    </div>
                    <div className="relative mb-1">
                      <Search className="h-3 w-3 absolute left-2 top-2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={addTripTruckSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAddTripTruckSearch(val);
                          if (val.trim()) {
                            const digitsQ = val.replace(/\D/g, '');
                            const cleanQ = val.replace(/[^a-z0-9]/gi, '').toLowerCase();
                            const matched = allVehicles.find((v) => {
                              const dReg = (v.registrationNumber || '').replace(/\D/g, '');
                              const cReg = (v.registrationNumber || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
                              const mDriver = (v.driverName || '').toLowerCase().includes(cleanQ);
                              return (digitsQ.length >= 2 && dReg.includes(digitsQ)) || cReg.includes(cleanQ) || mDriver;
                            });
                            if (matched) {
                              handleTruckSelectChange(matched.registrationNumber);
                            }
                          }
                        }}
                        placeholder="Search digits e.g. 9171, 8899..."
                        className="w-full pl-6 pr-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <select
                      value={tripTruckReg}
                      onChange={(e) => handleTruckSelectChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-bold"
                    >
                      {allVehicles
                        .filter((v) => {
                          if (!addTripTruckSearch.trim()) return true;
                          const digitsQ = addTripTruckSearch.replace(/\D/g, '');
                          const cleanQ = addTripTruckSearch.replace(/[^a-z0-9]/gi, '').toLowerCase();
                          const dReg = (v.registrationNumber || '').replace(/\D/g, '');
                          const cReg = (v.registrationNumber || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
                          const mDriver = (v.driverName || '').toLowerCase().includes(cleanQ);
                          return (digitsQ.length >= 2 && dReg.includes(digitsQ)) || cReg.includes(cleanQ) || mDriver;
                        })
                        .map((v) => {
                          const digits = (v.registrationNumber || '').replace(/\D/g, '').slice(-4);
                          const activeInfo = getTruckActiveTrip(v.registrationNumber);
                          const isBusy = activeInfo.isOnTrip;
                          const contract = getTruckAssignedGarments(v.registrationNumber);
                          const contractLabel = contract ? ` [${(contract.clientName || 'Garments').split(' ')[0]} - ${contract.billingType === 'monthly' ? 'Monthly' : 'Per-Trip'}]` : '';
                          const phoneLabel = v.driverPhone ? ` 📞 ${v.driverPhone}` : '';
                          return (
                            <option
                              key={v.id}
                              value={v.registrationNumber}
                              disabled={isBusy}
                              className={isBusy ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 italic' : 'font-bold'}
                            >
                              [{digits || 'TRK'}] {v.registrationNumber} • {v.driverName || 'Driver'}{phoneLabel} {isBusy ? `— [BUSY until ${activeInfo.returnDateFormatted}] 🚫` : '— [Available]'}{contractLabel}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Assigned Driver *</label>
                    <input
                      type="text"
                      required
                      value={tripDriverName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setTripDriverName(name);
                        const d = allDrivers.find((dr) => dr.name.toLowerCase() === name.toLowerCase());
                        if (d?.phone) setTripDriverPhone(d.phone);
                      }}
                      placeholder="Driver Name"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Driver Mobile (Optional)</label>
                    <input
                      type="text"
                      value={tripDriverPhone}
                      onChange={(e) => setTripDriverPhone(e.target.value)}
                      placeholder="e.g. +880 17XXXXXXXX"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Helper / Assistant</label>
                    <input
                      type="text"
                      value={tripHelperName}
                      onChange={(e) => setTripHelperName(e.target.value)}
                      placeholder="Optional Helper"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: OUTGOING TRIP */}
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2.5">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
                    <span>2. Outgoing Route & Freight</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-500">Party, Broker, Load & Unload</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block mb-1 font-semibold">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={tripStartDate}
                      onChange={(e) => setTripStartDate(e.target.value)}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold">Expected Return *</label>
                      <span className="text-[10px] text-slate-400">Duration</span>
                    </div>
                    <input
                      type="date"
                      required
                      value={tripExpectedReturn}
                      min={tripStartDate}
                      onChange={(e) => setTripExpectedReturn(e.target.value)}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(tripStartDate);
                          setTripExpectedReturn(d.toISOString().slice(0, 10));
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                      >
                        1 Day
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(tripStartDate);
                          d.setDate(d.getDate() + 2);
                          setTripExpectedReturn(d.toISOString().slice(0, 10));
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 font-bold"
                      >
                        2 Days (Up-Down)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(tripStartDate);
                          d.setDate(d.getDate() + 3);
                          setTripExpectedReturn(d.toISOString().slice(0, 10));
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                      >
                        3 Days
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Loading Point *</label>
                    <input
                      type="text"
                      required
                      value={tripLoadLoc}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTripLoadLoc(val);
                        const dist = calculateHighwayDistance(val, tripDeliverLoc);
                        setTripDistanceKm(dist.km);
                      }}
                      placeholder="e.g. Dhaka Tejgaon"
                      className="w-full rounded border px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Unloading Point (Destination) *</label>
                    <input
                      type="text"
                      required
                      value={tripDeliverLoc}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTripDeliverLoc(val);
                        const dist = calculateHighwayDistance(tripLoadLoc, val);
                        setTripDistanceKm(dist.km);
                      }}
                      placeholder="e.g. Chittagong Agrabad / Unloading Point"
                      className="w-full rounded border px-2 py-1"
                    />
                  </div>
                </div>

                {/* Dynamic Highway Route & Distance Indicator */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                    <Navigation className="h-3.5 w-3.5 text-emerald-600" />
                    <span>⚡ Route: {calculateHighwayDistance(tripLoadLoc || 'Tejgaon', tripDeliverLoc || 'Chittagong Port').routeName}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-100">
                    <span className="text-[10px] text-slate-400 font-sans font-normal">Distance:</span>
                    <input
                      type="number"
                      min={1}
                      placeholder="0"
                      value={tripDistanceKm === 0 ? '' : tripDistanceKm}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripDistanceKm(v === '' ? 0 : Number(v));
                      }}
                      className="w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800"
                    />
                    <span>KM</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="block mb-1 font-semibold">Party / Customer *</label>
                    <input
                      type="text"
                      required
                      value={tripCustomer}
                      onChange={(e) => setTripCustomer(e.target.value)}
                      placeholder="Company Name"
                      className="w-full rounded border px-2 py-1 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Receiver Mobile (Optional)</label>
                    <input
                      type="text"
                      value={tripReceiverPhone}
                      onChange={(e) => setTripReceiverPhone(e.target.value)}
                      placeholder="e.g. +880 18XXXXXXXX"
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Broker Name</label>
                    <input
                      type="text"
                      value={tripBrokerName}
                      onChange={(e) => setTripBrokerName(e.target.value)}
                      placeholder="Broker / Agent"
                      className="w-full rounded border px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-700 dark:text-emerald-400 mb-1">Outgoing Fare (BDT) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="0"
                      value={tripFare === 0 ? '' : tripFare}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripFare(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border border-emerald-400 px-2 py-1 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Advance Received</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripAdvance === 0 ? '' : tripAdvance}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripAdvance(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* DEMURRAGE & VEHICLE DETENTION (Waiting Charge) */}
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Demurrage & Vehicle Detention (Extra Waiting Charge)</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 font-mono">
                    {tripDemurrage > 0 ? `+BDT ${tripDemurrage.toLocaleString()} Added to Bill` : 'No Detention'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Detention Days</label>
                    <select
                      value={tripDemurrageDays}
                      onChange={(e) => {
                        const days = Number(e.target.value);
                        setTripDemurrageDays(days);
                        setTripDemurrage(days * tripDemurrageDailyRate);
                      }}
                      className="w-full rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-bold"
                    >
                      <option value={0}>0 Days (On-Time)</option>
                      <option value={1}>1 Day Detention</option>
                      <option value={2}>2 Days Detention</option>
                      <option value={3}>3 Days Detention</option>
                      <option value={4}>4 Days Detention</option>
                      <option value={5}>5 Days Detention</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Daily Rate (BDT/day)</label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      placeholder="0"
                      value={tripDemurrageDailyRate === 0 ? '' : tripDemurrageDailyRate}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const rate = Number(e.target.value.replace(/^0+(?=\d)/, ''));
                        setTripDemurrageDailyRate(rate);
                        setTripDemurrage(tripDemurrageDays * rate);
                      }}
                      className="w-full rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Demurrage Total (BDT)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripDemurrage === 0 ? '' : tripDemurrage}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripDemurrage(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-800 px-2 py-1 font-mono font-bold text-xs text-amber-800 dark:text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Reason / Note</label>
                    <input
                      type="text"
                      value={tripDemurrageReason}
                      onChange={(e) => setTripDemurrageReason(e.target.value)}
                      placeholder="e.g. Factory unloading delay"
                      className="w-full rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: RETURN TRIP / BACK LOAD */}
              <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5 text-sky-600" />
                    <span>3. Return Trip / Back Load</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tripHasReturn}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setTripHasReturn(checked);
                        if (checked) {
                          if (!tripReturnLoadLoc) setTripReturnLoadLoc(tripDeliverLoc || 'Chittagong');
                          if (!tripReturnUnloadLoc) setTripReturnUnloadLoc(tripLoadLoc || 'Dhaka');
                        }
                      }}
                      className="h-4 w-4 rounded text-sky-600"
                    />
                    <span>Has Return Freight Load? (Add Return Trip)</span>
                  </label>
                </div>

                {tripHasReturn && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-sky-200 dark:border-sky-800">
                    <div>
                      <label className="block mb-1 font-semibold">Return Loading Point</label>
                      <input
                        type="text"
                        value={tripReturnLoadLoc}
                        onChange={(e) => setTripReturnLoadLoc(e.target.value)}
                        placeholder="Port / Depot"
                        className="w-full rounded border px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold">Return Unload Point</label>
                      <input
                        type="text"
                        value={tripReturnUnloadLoc}
                        onChange={(e) => setTripReturnUnloadLoc(e.target.value)}
                        placeholder="Destination"
                        className="w-full rounded border px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-sky-700 dark:text-sky-400 mb-1">Return Fare (BDT)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={tripReturnFare === 0 ? '' : tripReturnFare}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const v = e.target.value.replace(/^0+(?=\d)/, '');
                          setTripReturnFare(v === '' ? 0 : Number(v));
                        }}
                        className="w-full rounded border border-sky-400 px-2 py-1 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Cash In Hand (Driver)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={tripReturnDriverCash === 0 ? '' : tripReturnDriverCash}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const v = e.target.value.replace(/^0+(?=\d)/, '');
                          setTripReturnDriverCash(v === '' ? 0 : Number(v));
                        }}
                        className="w-full rounded border px-2 py-1 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: TRIP EXPENSES */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Fuel className="h-3.5 w-3.5 text-amber-600" />
                    <span>4. Trip Expenses Breakdown (Fuel, Toll, Khoraki, Labour)</span>
                  </span>
                  <span className="font-mono font-bold text-rose-600">Total: {formatBDT(calculatedTripExpense)}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Diesel Cost (BDT)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripDieselCost === 0 ? '' : tripDieselCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripDieselCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Toll & Bridge</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripTollCost === 0 ? '' : tripTollCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripTollCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Ferry Expense</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripFerryCost === 0 ? '' : tripFerryCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripFerryCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Driver Khoraki / Allowance</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripDriverKhoraki === 0 ? '' : tripDriverKhoraki}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripDriverKhoraki(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Police & Road Expense</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripPoliceCost === 0 ? '' : tripPoliceCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripPoliceCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Labour / Loading</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripLabourCost === 0 ? '' : tripLabourCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripLabourCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Broker Commission</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripCommission === 0 ? '' : tripCommission}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripCommission(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono text-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Other Expenses</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tripOtherCost === 0 ? '' : tripOtherCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setTripOtherCost(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded border px-2 py-1 font-mono"
                    />
                  </div>
                </div>

                {/* Driver Commission Smart Percentage & Manual BDT Section */}
                <div className="p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-2 mt-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-200">
                      <Users className="h-3.5 w-3.5 text-purple-600" />
                      <span>Driver Trip Commission (Percentage % of Net Profit or Manual BDT)</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      <span className="text-slate-500 mr-1">Quick % of Net:</span>
                      {[5, 10, 15, 20, 25].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setTripDriverCommPercent(pct);
                            setTripDriverCommMode('percent');
                            const amt = Math.round((netSurplusBeforeDriverComm * pct) / 100);
                            setTripDriverCommission(amt);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                            tripDriverCommPercent === pct && tripDriverCommMode === 'percent'
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-100'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-purple-700 dark:text-purple-300 font-semibold mb-1">
                        Commission Percentage (% of Net Trip Surplus)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          placeholder="e.g. 10"
                          value={tripDriverCommPercent}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setTripDriverCommPercent('');
                            } else {
                              const p = Number(val);
                              setTripDriverCommPercent(p);
                              setTripDriverCommMode('percent');
                              const amt = Math.round((netSurplusBeforeDriverComm * p) / 100);
                              setTripDriverCommission(amt);
                            }
                          }}
                          className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-bold text-purple-800 dark:text-purple-200 pr-7"
                        />
                        <span className="absolute right-2.5 top-1.5 text-xs font-bold text-purple-500 pointer-events-none">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-purple-700 dark:text-purple-300 font-semibold mb-1">
                        Commission Amount (BDT ৳)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={tripDriverCommission === 0 ? '' : tripDriverCommission}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const v = e.target.value.replace(/^0+(?=\d)/, '');
                            const amt = v === '' ? 0 : Number(v);
                            setTripDriverCommission(amt);
                            setTripDriverCommMode('manual');
                            if (netSurplusBeforeDriverComm > 0) {
                              setTripDriverCommPercent(Number(((amt / netSurplusBeforeDriverComm) * 100).toFixed(1)));
                            }
                          }}
                          className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-black text-purple-700 dark:text-purple-300 pr-7"
                        />
                        <span className="absolute right-2.5 top-1.5 text-xs font-bold text-purple-500 pointer-events-none">৳</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Breakdown Explanation */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-purple-200 dark:border-purple-900 font-mono">
                    <span className="text-slate-600 dark:text-slate-300">
                      Net Surplus (Fare {formatBDT(calculatedTotalIncome)} − Direct Outflows {formatBDT(expensesBeforeDriverComm)}): <strong className="text-emerald-700 dark:text-emerald-400">{formatBDT(netSurplusBeforeDriverComm)}</strong>
                    </span>
                    <span className="text-purple-700 dark:text-purple-300 font-bold">
                      Driver gets: {formatBDT(tripDriverCommission)} {tripDriverCommPercent ? `(${tripDriverCommPercent}%)` : ''} • Owner Profit: {formatBDT(Math.max(0, netSurplusBeforeDriverComm - tripDriverCommission))}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 5: AUTOMATIC CALCULATION BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-900 text-white font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Total Gross Income</div>
                  <div className="text-sm font-bold text-emerald-400">{formatBDT(calculatedTotalIncome)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Total Trip Expense</div>
                  <div className="text-sm font-bold text-rose-400">{formatBDT(calculatedTripExpense)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Trip Net Profit</div>
                  <div className={`text-base font-black ${calculatedNetIncome >= 0 ? 'text-sky-400' : 'text-rose-500'}`}>
                    {formatBDT(calculatedNetIncome)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Party Due / Driver Cash</div>
                  <div className="text-xs font-bold text-amber-300">
                    Due: {formatBDT(calculatedRemainingDue)}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddTripModal(false)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving & Dispatching Trip...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Start Trip & Post Accounting</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: + REGISTER VEHICLE ───────────────────────────── */}
      {showAddVehicleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddVehicleModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-emerald-600" />
                <span>Add New Vehicle</span>
              </h3>
              <button type="button" onClick={() => setShowAddVehicleModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-semibold">Registration Number *</label>
                <input
                  type="text"
                  required
                  value={newVehReg}
                  onChange={(e) => setNewVehReg(e.target.value)}
                  placeholder="e.g. DHAKA-METRO-TA-12-3456"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Assigned Driver Name</label>
                  <input
                    type="text"
                    value={newVehDriver}
                    onChange={(e) => setNewVehDriver(e.target.value)}
                    placeholder="e.g. Md. Kalam Hossain"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Driver Mobile / Phone</label>
                  <input
                    type="text"
                    value={newVehDriverPhone}
                    onChange={(e) => setNewVehDriverPhone(e.target.value)}
                    placeholder="e.g. 01711-223344"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Truck Body Type *</label>
                  <select
                    value={newVehBodyType}
                    onChange={(e) => setNewVehBodyType(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                  >
                    <option value="covered">Covered Van</option>
                    <option value="open">Open Truck</option>
                    <option value="trailer">Trailer</option>
                    <option value="pickup">Pickup</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Capacity (Ton) *</label>
                  <input
                    type="number"
                    min={1}
                    value={newVehCapacityTons === 0 ? '' : newVehCapacityTons}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setNewVehCapacityTons(v === '' ? 0 : Number(v));
                    }}
                    placeholder="e.g. 15"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Engine Number</label>
                  <input
                    type="text"
                    value={newVehEngineNo}
                    onChange={(e) => setNewVehEngineNo(e.target.value)}
                    placeholder="e.g. ENG-883921"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Chassis Number</label>
                  <input
                    type="text"
                    value={newVehChassisNo}
                    onChange={(e) => setNewVehChassisNo(e.target.value)}
                    placeholder="e.g. CHS-772910"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Brand</label>
                  <input
                    type="text"
                    value={newVehBrand}
                    onChange={(e) => setNewVehBrand(e.target.value)}
                    placeholder="Hino / Isuzu"
                    className="w-full rounded-lg border px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Model</label>
                  <input
                    type="text"
                    value={newVehModel}
                    onChange={(e) => setNewVehModel(e.target.value)}
                    placeholder="500 Series"
                    className="w-full rounded-lg border px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Tax Token Expiry</label>
                  <input
                    type="date"
                    value={newVehTaxTokenExp}
                    onChange={(e) => setNewVehTaxTokenExp(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Fitness Expiry</label>
                  <input
                    type="date"
                    value={newVehFitnessExp}
                    onChange={(e) => setNewVehFitnessExp(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Insurance Expiry</label>
                  <input
                    type="date"
                    value={newVehInsuranceExp}
                    onChange={(e) => setNewVehInsuranceExp(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Route Permit</label>
                  <input
                    type="date"
                    value={newVehRoutePermitExp}
                    onChange={(e) => setNewVehRoutePermitExp(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddVehicleModal(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                  Register Truck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: + LOG FUEL ───────────────────────────────────── */}
      {showAddFuelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddFuelModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Fuel className="h-4 w-4 text-sky-600" />
                <span>Log Fuel Consumption</span>
              </h3>
              <button type="button" onClick={() => setShowAddFuelModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFuel} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Truck *</label>
                  <select
                    value={fuelTruckReg}
                    onChange={(e) => setFuelTruckReg(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-bold"
                  >
                    {allVehicles.map((v) => {
                      const digits = (v.registrationNumber || '').replace(/\D/g, '').slice(-4);
                      return (
                        <option key={v.id} value={v.registrationNumber}>
                          [{digits || 'TRK'}] {v.registrationNumber}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Date *</label>
                  <input
                    type="date"
                    required
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Fuel Pump *</label>
                <input
                  type="text"
                  required
                  value={fuelPump}
                  onChange={(e) => setFuelPump(e.target.value)}
                  placeholder="Meghna Petroleum, Savar"
                  className="w-full rounded-lg border px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Litres *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={fuelLitres === 0 ? '' : fuelLitres}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setFuelLitres(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded border px-2 py-1 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Rate *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={fuelRate === 0 ? '' : fuelRate}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setFuelRate(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Total Cost</label>
                  <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono font-black text-rose-600">
                    {formatBDT(calculatedFuelTotal)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Payment Account *</label>
                <select
                  value={fuelWalletId}
                  onChange={(e) => setFuelWalletId(e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddFuelModal(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700">
                  Save Fuel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: + LOG SERVICE / MAINTENANCE ──────────────────── */}
      {showAddServiceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddServiceModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-amber-600" />
                <span>Log Maintenance & Service</span>
              </h3>
              <button type="button" onClick={() => setShowAddServiceModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Truck *</label>
                  <select
                    value={srvTruckReg}
                    onChange={(e) => setSrvTruckReg(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-bold"
                  >
                    {allVehicles.map((v) => {
                      const digits = (v.registrationNumber || '').replace(/\D/g, '').slice(-4);
                      return (
                        <option key={v.id} value={v.registrationNumber}>
                          [{digits || 'TRK'}] {v.registrationNumber}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Date *</label>
                  <input
                    type="date"
                    required
                    value={srvDate}
                    onChange={(e) => setSrvDate(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Garage / Workshop *</label>
                  <input
                    type="text"
                    required
                    value={srvGarage}
                    onChange={(e) => setSrvGarage(e.target.value)}
                    placeholder="Bhai Bhai Workshop & Garage"
                    className="w-full rounded-lg border px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Mechanic / Ustad</label>
                  <input
                    type="text"
                    value={srvMechanic}
                    onChange={(e) => setSrvMechanic(e.target.value)}
                    placeholder="Ustad Zahirul"
                    className="w-full rounded-lg border px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Problem & Work Description *</label>
                <input
                  type="text"
                  required
                  value={srvProblem}
                  onChange={(e) => setSrvProblem(e.target.value)}
                  placeholder="Brake shoe replacement & engine oil change"
                  className="w-full rounded-lg border px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold">Replaced Parts Description</label>
                <input
                  type="text"
                  value={srvParts}
                  onChange={(e) => setSrvParts(e.target.value)}
                  placeholder="e.g. 2 Front Tyres, Exide Battery, Brake Shoe"
                  className="w-full rounded-lg border px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Tyre / Battery Serial No.</label>
                  <input
                    type="text"
                    value={srvTyreBatterySerial}
                    onChange={(e) => setSrvTyreBatterySerial(e.target.value)}
                    placeholder="e.g. TYR-BRIDGE-9921, BAT-HAMKO-881"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Warranty Expiry Date</label>
                  <input
                    type="date"
                    value={srvWarrantyExpiry}
                    onChange={(e) => setSrvWarrantyExpiry(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Parts Cost</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={srvPartsCost === 0 ? '' : srvPartsCost}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setSrvPartsCost(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Labour</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={srvLabourCost === 0 ? '' : srvLabourCost}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setSrvLabourCost(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded border px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Total Cost</label>
                  <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono font-black text-rose-600">
                    {formatBDT(calculatedServiceTotal)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Next Scheduled Service</label>
                  <input
                    type="date"
                    value={srvNextDate}
                    onChange={(e) => setSrvNextDate(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Next Service Odometer (KM)</label>
                  <input
                    type="number"
                    value={srvNextKm === 0 ? '' : srvNextKm}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setSrvNextKm(v === '' ? 0 : Number(v));
                    }}
                    placeholder="e.g. 50000"
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Payment Account *</label>
                <select
                  value={srvWalletId}
                  onChange={(e) => setSrvWalletId(e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddServiceModal(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700">
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: + PAY DRIVER SALARY / ADVANCE ─────────────────── */}
      {showAddDriverModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddDriverModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="h-4 w-4 text-purple-600" />
                <span>Pay Driver Salary / Commission / Advance</span>
              </h3>
              <button type="button" onClick={() => setShowAddDriverModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePayDriver} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-semibold">Driver Name *</label>
                <input
                  type="text"
                  required
                  value={drvPayName}
                  onChange={(e) => setDrvPayName(e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold">Payment Type</label>
                  <select
                    value={drvPayType}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setDrvPayType(newType);
                      const d = allDrivers.find((dr) => dr.name.toLowerCase() === drvPayName.toLowerCase());
                      if (d) {
                        if (newType === 'salary') setDrvPayAmount(d.salary || 5000);
                        else if (newType === 'commission') setDrvPayAmount(d.totalCommission || 0);
                      }
                    }}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                  >
                    <option value="salary">Monthly Basic Salary (BDT 5,000)</option>
                    <option value="commission">Trip Commission</option>
                    <option value="advance">Salary Advance</option>
                    <option value="allowance">Trip Khoraki / Allowance</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Amount *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={drvPayAmount === 0 ? '' : drvPayAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setDrvPayAmount(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-lg border px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Payment Account *</label>
                <select
                  value={drvPayWalletId}
                  onChange={(e) => setDrvPayWalletId(e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddDriverModal(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 6: SETTLE CUSTOMER DUE ───────────────────────────── */}
      {showSettlePaymentModal && targetTripForPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowSettlePaymentModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Collect Customer Due
              </h3>
              <button type="button" onClick={() => setShowSettlePaymentModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSettleCustomerPayment} className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-1">
                <div className="font-bold">{targetTripForPayment.customerName}</div>
                <div className="text-[11px] text-slate-500">
                  {targetTripForPayment.registrationNumber} ({targetTripForPayment.route || `${targetTripForPayment.origin} ➔ ${targetTripForPayment.destination}`})
                </div>
                <div className="text-xs font-mono font-bold text-amber-600">
                  'Remaining Due: ' + formatBDT(targetTripForPayment.outstandingDue)
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Amount Received *</label>
                <input
                  type="number"
                  min={1}
                  max={targetTripForPayment.outstandingDue}
                  required
                  placeholder="0"
                  value={custPayAmount === 0 ? '' : custPayAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/^0+(?=\d)/, '');
                    setCustPayAmount(v === '' ? 0 : Number(v));
                  }}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-mono font-black text-sm text-emerald-600"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold">Deposit Into Account *</label>
                <select
                  value={custPayWalletId}
                  onChange={(e) => setCustPayWalletId(e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-1.5 font-semibold"
                >
                  {treasuryWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatBDT(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowSettlePaymentModal(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                  Confirm Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 7: MEMO / CHALLAN IMAGE VIEWER ──────────────────── */}
      {viewImageTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
          onClick={() => setViewImageTrip(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <div className="font-bold text-xs text-slate-900 dark:text-white">
                {viewImageTrip.registrationNumber} — Receipt / Memo
              </div>
              <button type="button" onClick={() => setViewImageTrip(null)} className="p-1 rounded text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            {viewImageTrip.imageUrl ? (
              <img
                src={viewImageTrip.imageUrl}
                alt="Receipt"
                className="w-full max-h-[60vh] object-contain rounded-lg border"
              />
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">No image</div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 7.5: ADD / UPDATE RETURN FREIGHT LOAD ───────────── */}
      {showAddReturnLoadModal && targetTripForReturnLoad && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddReturnLoadModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Add / Update Return Freight Load
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Trip: {targetTripForReturnLoad.tripOrVehicleCode} · {targetTripForReturnLoad.registrationNumber} ({targetTripForReturnLoad.driverName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddReturnLoadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReturnLoad} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 space-y-1">
                <div className="text-[11px] font-bold text-sky-900 dark:text-sky-300">Outgoing Trip Info:</div>
                <div className="text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Route: {targetTripForReturnLoad.origin} ➔ {targetTripForReturnLoad.destination}</span>
                  <span className="font-semibold">Fare: {formatBDT(targetTripForReturnLoad.tripRevenue || 0)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">Return Loading Point *</label>
                  <input
                    type="text"
                    required
                    value={retLoadPoint}
                    onChange={(e) => setRetLoadPoint(e.target.value)}
                    placeholder="e.g. Chittagong Port / Depot"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">Return Unload Point *</label>
                  <input
                    type="text"
                    required
                    value={retUnloadPoint}
                    onChange={(e) => setRetUnloadPoint(e.target.value)}
                    placeholder="e.g. Dhaka Tejgaon"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-sky-700 dark:text-sky-400">Return Freight Fare (BDT) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="0"
                    value={retFare === 0 ? '' : retFare}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setRetFare(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-lg border border-sky-400 dark:border-sky-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">Driver Return Cash Advance (BDT)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={retDriverCash === 0 ? '' : retDriverCash}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setRetDriverCash(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Calculated summary */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500">New Total Freight: </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatBDT(
                      ((targetTripForReturnLoad.tripRevenue || 0) > (targetTripForReturnLoad.returnFare || 0)
                        ? (targetTripForReturnLoad.tripRevenue || 0) - (targetTripForReturnLoad.returnFare || 0)
                        : (targetTripForReturnLoad.tripRevenue || 0)) + Number(retFare || 0)
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Updated Due: </span>
                  <span className="font-bold text-amber-600">
                    {formatBDT(
                      Math.max(
                        0,
                        ((targetTripForReturnLoad.tripRevenue || 0) > (targetTripForReturnLoad.returnFare || 0)
                          ? (targetTripForReturnLoad.tripRevenue || 0) - (targetTripForReturnLoad.returnFare || 0)
                          : (targetTripForReturnLoad.tripRevenue || 0)) +
                          Number(retFare || 0) -
                          (Number(targetTripForReturnLoad.advanceReceived || 0) + Number(retDriverCash || 0))
                      )
                    )}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddReturnLoadModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Return Load'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 8: OFFICIAL TRIP CHALLAN PRINT ───────────────────── */}
      {selectedTripChallan && (
        <TripChallanModal
          isOpen={!!selectedTripChallan}
          onClose={() => setSelectedTripChallan(null)}
          trip={selectedTripChallan}
          businessName={activeBusiness.nameBn || activeBusiness.name}
          businessPhone={activeBusiness.contactPhone}
          allTrips={allTrips}
          allVehicles={allVehicles}
          allDrivers={allDrivers}
          lang={lang}
        />
      )}

      {/* ── MODAL 9: TODAY'S INCOME BREAKDOWN (CLICKABLE CARD DETAIL) ── */}
      {showTodayIncomeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowTodayIncomeModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Today&apos;s Income & Freight Collections
                  </h3>
                  <p className="text-xs text-slate-500">
                    Date: {todayStr} · Live recorded freight fares and client receipts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTodayIncomeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">Total Income Today</div>
                <div className="text-lg font-black font-mono text-emerald-600 mt-0.5">
                  +{formatBDT(todayIncomeData.total)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 font-semibold">Transactions Logged</div>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {todayIncomeData.items.length} entries
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
                <div className="text-[11px] text-slate-500 font-semibold">Pending Due from Today</div>
                <div className="text-lg font-black font-mono text-amber-600 mt-0.5">
                  {formatBDT(todayIncomeData.items.reduce((s, i) => s + (i.dueAmount || 0), 0))}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-700 dark:text-slate-300">
                Income Entries List ({todayIncomeData.items.length})
              </div>
              {todayIncomeData.items.length === 0 ? (
                <div className="p-6 text-center space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500">No new income or freight collection recorded for today yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTodayIncomeModal(false);
                      handleOpenAddTripModal();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Dispatch New Trip Today</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b">
                      <tr>
                        <th className="py-2 px-3">Voucher / Code</th>
                        <th className="py-2 px-3">Party & Description</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Amount (BDT)</th>
                        <th className="py-2 px-3 text-right">Due (BDT)</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {todayIncomeData.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            {item.code}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.party}</div>
                            <div className="text-[10px] text-slate-500">{item.subtitle} • {item.vehicle}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatBDT(item.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {item.dueAmount > 0 ? (
                              <span className="text-amber-600 font-bold">{formatBDT(item.dueAmount)}</span>
                            ) : (
                              'Paid'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.trip ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowTodayIncomeModal(false);
                                  openTripChallanModal(item.trip!);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold shadow-2xs cursor-pointer"
                                title="View Consignment Challan & Income Slip"
                              >
                                <FileText className="h-3 w-3" />
                                <span>Challan Slip</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">Collection</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowTodayIncomeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 10: TODAY'S EXPENSES BREAKDOWN (CLICKABLE CARD DETAIL) ── */}
      {showTodayExpenseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowTodayExpenseModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Today&apos;s Expenses Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">
                    Date: {todayStr} · Sector-wise breakdown: Diesel, Tolls, Khoraki, Workshop & Labor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTodayExpenseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sector KPI Badges */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Expense By Sector:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                  <div className="text-[10px] text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                    <Fuel className="h-3 w-3" /> Diesel Fuel
                  </div>
                  <div className="text-sm font-black font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.diesel)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Toll & Ferry</div>
                  <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.toll)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Driver Khoraki</div>
                  <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.khoraki)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Police & Road</div>
                  <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.road)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                  <div className="text-[10px] text-rose-800 dark:text-rose-300 font-bold flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Workshop / Repair
                  </div>
                  <div className="text-sm font-black font-mono text-rose-700 dark:text-rose-400 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.maintenance)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 font-semibold">Labour & Loading</div>
                  <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatBDT(todayExpenseData.breakdown.labour)}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Strip */}
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs">
              <span className="font-bold text-rose-900 dark:text-rose-200">Total Operating Expenses Logged Today:</span>
              <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                -{formatBDT(todayExpenseData.total)}
              </span>
            </div>

            {/* Items Table */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-700 dark:text-slate-300">
                Detailed Expense Vouchers ({todayExpenseData.items.length})
              </div>
              {todayExpenseData.items.length === 0 ? (
                <div className="p-6 text-center space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500">No expenses recorded yet for today.</p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTodayExpenseModal(false);
                        setShowAddFuelModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs"
                    >
                      + Log Fuel Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTodayExpenseModal(false);
                        setShowAddServiceModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs"
                    >
                      + Workshop Expense
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b">
                      <tr>
                        <th className="py-2 px-3">Voucher No</th>
                        <th className="py-2 px-3">Expense Head</th>
                        <th className="py-2 px-3">Vehicle & Details</th>
                        <th className="py-2 px-3 text-right">Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {todayExpenseData.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            {item.code}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[10px]">
                              {item.categoryLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.vehicle || item.title}</div>
                            <div className="text-[10px] text-slate-500">{item.subtitle}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            -{formatBDT(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowTodayExpenseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT TRIP (UPDATE FARE, EXPENSES, DETAILS) ── */}
      {showEditTripModal && editingTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowEditTripModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-sky-300 dark:border-sky-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>✏</span>
                  <span>Edit Trip — {editingTrip.tripOrVehicleCode}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingTrip.registrationNumber} • {editingTrip.origin} ➔ {editingTrip.destination} • {editingTrip.date}
                </p>
              </div>
              <button type="button" onClick={() => setShowEditTripModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTrip} className="space-y-4 text-xs">
              {/* Revenue & Payment */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Revenue & Payments
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Total Freight Fare (BDT)</label>
                    <input type="number" value={editTripFare} onChange={(e) => setEditTripFare(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 block mb-1">Demurrage Billed (BDT)</label>
                    <input type="number" value={editTripDemurrageAmount} onChange={(e) => setEditTripDemurrageAmount(Number(e.target.value))} className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono font-bold text-purple-700 dark:text-purple-300" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Advance Received (BDT)</label>
                    <input type="number" value={editTripAdvance} onChange={(e) => setEditTripAdvance(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-900/30 rounded-lg px-3 py-1.5">
                  <span>Total Billed (Fare + Demurrage): {formatBDT(editTripFare + editTripDemurrageAmount)}</span>
                  <span>Due Balance: {formatBDT(Math.max(0, editTripFare + editTripDemurrageAmount - editTripAdvance))}</span>
                </div>
              </div>

              {/* Trip Schedule, Duration Extension & Demurrage Details */}
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2.5">
                <div className="font-bold text-amber-900 dark:text-amber-300 text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Trip Schedule, Return Lock & Delay Demurrage</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 mr-1">Quick Extend:</span>
                    {[1, 2, 3].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const base = editTripReturnDate || editingTrip.expectedReturnDate || editingTrip.date || new Date().toISOString().slice(0, 10);
                          const dt = new Date(base);
                          dt.setDate(dt.getDate() + d);
                          setEditTripReturnDate(dt.toISOString().slice(0, 10));
                          setEditTripDemurrageDays((prev) => prev + d);
                          setEditTripDemurrageAmount((prev) => prev + d * editTripDemurrageDailyRate);
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 cursor-pointer"
                      >
                        +{d}d
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Expected Return Date (Truck locked busy until this date)
                    </label>
                    <input
                      type="date"
                      value={editTripReturnDate}
                      onChange={(e) => setEditTripReturnDate(e.target.value)}
                      className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Delay Demurrage Reason
                    </label>
                    <select
                      value={editTripDemurrageReason}
                      onChange={(e) => setEditTripDemurrageReason(e.target.value)}
                      className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                    >
                      <option value="Factory Unloading Delay (Exceeded standard 24h)">Factory Unloading Delay (Exceeded 24h)</option>
                      <option value="Port Berth Congestion / Offloading Delay">Port Berth Congestion / Offloading Delay</option>
                      <option value="Highway Jam & Traffic Disruption">Highway Jam & Traffic Disruption</option>
                      <option value="Customs Clearance & Inspection Delay">Customs Clearance & Inspection Delay</option>
                      <option value="Client Storage / Delayed Confirmation">Client Storage / Delayed Confirmation</option>
                      <option value="Road Block / Political Disruption">Road Block / Political Disruption</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Trip Expenses */}
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-3">
                <div className="font-bold text-rose-800 dark:text-rose-300 text-[11px] flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Trip Operating Expenses
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Diesel Cost (BDT)</label>
                    <input type="number" value={editTripDiesel} onChange={(e) => setEditTripDiesel(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Toll Charges (BDT)</label>
                    <input type="number" value={editTripToll} onChange={(e) => setEditTripToll(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Ferry Charges (BDT)</label>
                    <input type="number" value={editTripFerry} onChange={(e) => setEditTripFerry(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Driver Khoraki & Allowance (BDT)</label>
                    <input type="number" value={editTripKhoraki} onChange={(e) => setEditTripKhoraki(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Police & Road Cost (BDT)</label>
                    <input type="number" value={editTripPolice} onChange={(e) => setEditTripPolice(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Labour & Loading (BDT)</label>
                    <input type="number" value={editTripLabour} onChange={(e) => setEditTripLabour(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Broker Commission (BDT)</label>
                    <input type="number" value={editTripCommission} onChange={(e) => setEditTripCommission(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Other Road Cost (BDT)</label>
                    <input type="number" value={editTripOther} onChange={(e) => setEditTripOther(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Trip Distance (KM)</label>
                    <input type="number" value={editTripDistanceKm} onChange={(e) => setEditTripDistanceKm(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono" />
                  </div>
                </div>

                {/* Driver Commission Smart Percentage & Manual BDT Section */}
                {(() => {
                  const editExpBeforeDr =
                    editTripDiesel + editTripToll + editTripFerry + editTripKhoraki +
                    editTripPolice + editTripLabour + editTripCommission + editTripOther;
                  const editNetBeforeDr = Math.max(0, editTripFare + editTripDemurrageAmount - editExpBeforeDr);
                  return (
                    <div className="p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-2 mt-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-200">
                          <Users className="h-3.5 w-3.5 text-purple-600" />
                          <span>Driver Trip Commission (Percentage % or Manual BDT)</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <span className="text-slate-500 mr-1">Quick % of Net:</span>
                          {[5, 10, 15, 20, 25].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                setEditTripDriverCommPercent(pct);
                                const amt = Math.round((editNetBeforeDr * pct) / 100);
                                setEditTripDriverCommission(amt);
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                editTripDriverCommPercent === pct
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-100'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-purple-700 dark:text-purple-300 font-semibold mb-1">
                            Commission Percentage (% of Net Trip Surplus)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              placeholder="e.g. 10"
                              value={editTripDriverCommPercent}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  setEditTripDriverCommPercent('');
                                } else {
                                  const p = Number(val);
                                  setEditTripDriverCommPercent(p);
                                  const amt = Math.round((editNetBeforeDr * p) / 100);
                                  setEditTripDriverCommission(amt);
                                }
                              }}
                              className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-bold text-purple-800 dark:text-purple-200 pr-7"
                            />
                            <span className="absolute right-2.5 top-1.5 text-xs font-bold text-purple-500 pointer-events-none">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-purple-700 dark:text-purple-300 font-semibold mb-1">
                            Commission Amount (BDT ৳)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={editTripDriverCommission === 0 ? '' : editTripDriverCommission}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const amt = Number(e.target.value);
                                setEditTripDriverCommission(amt);
                                if (editNetBeforeDr > 0) {
                                  setEditTripDriverCommPercent(Number(((amt / editNetBeforeDr) * 100).toFixed(1)));
                                }
                              }}
                              className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-black text-purple-700 dark:text-purple-300 pr-7"
                            />
                            <span className="absolute right-2.5 top-1.5 text-xs font-bold text-purple-500 pointer-events-none">৳</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-purple-200 dark:border-purple-900 font-mono">
                        <span className="text-slate-600 dark:text-slate-300">
                          Net Surplus (Fare − Expenses): <strong className="text-emerald-700 dark:text-emerald-400">{formatBDT(editNetBeforeDr)}</strong>
                        </span>
                        <span className="text-purple-700 dark:text-purple-300 font-bold">
                          Driver: {formatBDT(editTripDriverCommission)} {editTripDriverCommPercent ? `(${editTripDriverCommPercent}%)` : ''} • Owner Profit: {formatBDT(Math.max(0, editNetBeforeDr - editTripDriverCommission))}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="text-[11px] text-rose-700 dark:text-rose-400 font-bold bg-rose-100 dark:bg-rose-900/30 rounded-lg px-3 py-1.5 flex justify-between">
                  <span>Total Expense:</span>
                  <span>{formatBDT(editTripDiesel + editTripToll + editTripFerry + editTripKhoraki + editTripPolice + editTripLabour + editTripCommission + editTripDriverCommission + editTripOther)}</span>
                </div>
              </div>

              {/* Route & Other Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Loading Point (Origin) *</label>
                  <input type="text" value={editTripOrigin} onChange={(e) => setEditTripOrigin(e.target.value)} placeholder="e.g. Dhaka Tejgaon" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Unloading Point (Destination) *</label>
                  <input type="text" value={editTripDestination} onChange={(e) => setEditTripDestination(e.target.value)} placeholder="e.g. Chittagong Port" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Assigned Driver Name
                  </label>
                  <input
                    type="text"
                    list="edit-trip-driver-list"
                    value={editTripDriver}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditTripDriver(val);
                      const match = allDrivers.find((d) => d.name.toLowerCase() === val.toLowerCase());
                      if (match?.phone) setEditTripDriverPhone(match.phone);
                    }}
                    placeholder="e.g. Abdul Karim"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                  <datalist id="edit-trip-driver-list">
                    {allDrivers.map((d) => (
                      <option key={d.name} value={d.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Driver Phone Number
                  </label>
                  <input
                    type="text"
                    value={editTripDriverPhone}
                    onChange={(e) => setEditTripDriverPhone(e.target.value)}
                    placeholder="e.g. 01700-000000"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Customer / Consignee</label>
                  <input type="text" value={editTripCustomer} onChange={(e) => setEditTripCustomer(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Cargo Details</label>
                  <input type="text" value={editTripCargo} onChange={(e) => setEditTripCargo(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Remarks & Notes</label>
                  <input type="text" value={editTripRemarks} onChange={(e) => setEditTripRemarks(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs" />
                </div>
              </div>

              {/* Net Profit Preview */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Trip Net Profit:</span>
                <span className={`font-mono font-black text-sm ${editTripFare - (editTripDiesel + editTripToll + editTripFerry + editTripKhoraki + editTripPolice + editTripLabour + editTripCommission + editTripDriverCommission + editTripOther) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatBDT(editTripFare - (editTripDiesel + editTripToll + editTripFerry + editTripKhoraki + editTripPolice + editTripLabour + editTripCommission + editTripDriverCommission + editTripOther))}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button type="button" onClick={() => setShowEditTripModal(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-black text-xs shadow-xs cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>{isSubmitting ? 'Saving...' : 'Update Trip'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── MODAL: TRIP EXTENSION & DEMURRAGE (ROAD JAM / DETENTION DELAY) ── */}
      {showTripDelayModal && delayTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowTripDelayModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-amber-300 dark:border-amber-700 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    Trip Delay Extension & Demurrage
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {delayTrip.tripOrVehicleCode} • [{delayTrip.registrationNumber}]
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTripDelayModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTripExtensionAndDemurrage} className="space-y-3.5 text-xs">
              {/* Trip Context Card */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Party / Client:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{delayTrip.customerName || delayTrip.clientName || 'Garments Client'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Route:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">{delayTrip.origin} ➔ {delayTrip.destination}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Driver:</span>
                  <span className="font-semibold">{resolveTripDriverName(delayTrip)} {delayTrip.driverPhone ? `📞 ${delayTrip.driverPhone}` : ''}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Current Expected Return:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {delayTrip.expectedReturnDate || delayTrip.date || 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Step 1: Extend Duration */}
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-900 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-amber-600" />
                    <span>Extend Trip Duration (Road Jam / Unloading Delay) *</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    +{delayExtraDays} {delayExtraDays === 1 ? 'Day' : 'Days'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">Quick Add:</span>
                  {[1, 2, 3, 4].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleSetDelayDays(d)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        delayExtraDays === d
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      +{d} {d === 1 ? 'Day' : 'Days'}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    New Expected Return Date (Truck stays locked BUSY until this date):
                  </label>
                  <input
                    type="date"
                    required
                    value={delayNewReturnDate}
                    onChange={(e) => handleReturnDateChange(e.target.value)}
                    className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-3 py-1.5 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              {/* Step 2: Demurrage (Detention Billing to Client) */}
              <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-purple-900 dark:text-purple-300 text-[11px] flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delayBillDemurrage}
                      onChange={(e) => setDelayBillDemurrage(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Bill Demurrage / Holding Fine to Client</span>
                  </label>
                  {delayBillDemurrage && (
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 font-mono">
                      {formatBDT(delayDemurrageAmount)}
                    </span>
                  )}
                </div>

                {delayBillDemurrage && (
                  <div className="space-y-2 pt-1 border-t border-purple-200 dark:border-purple-800/60">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-600 dark:text-slate-400 font-semibold mb-0.5">
                          Daily Rate (BDT/day)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={delayDemurrageDailyRate}
                          onChange={(e) => {
                            const rate = Number(e.target.value);
                            setDelayDemurrageDailyRate(rate);
                            setDelayDemurrageAmount(rate * delayExtraDays);
                          }}
                          className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 dark:text-slate-400 font-semibold mb-0.5">
                          Total Demurrage (BDT)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={delayDemurrageAmount}
                          onChange={(e) => setDelayDemurrageAmount(Number(e.target.value))}
                          className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-black text-purple-700 dark:text-purple-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 font-semibold mb-0.5">
                        Delay Reason (Shows on Bill & Challan)
                      </label>
                      <select
                        value={delayReason}
                        onChange={(e) => setDelayReason(e.target.value)}
                        className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                      >
                        <option value="Factory Unloading Delay (Exceeded standard 24h)">Factory Unloading Delay (Exceeded 24h)</option>
                        <option value="Port Berth Congestion / Offloading Delay">Port Berth Congestion / Offloading Delay</option>
                        <option value="Highway Jam & Traffic Disruption">Highway Jam & Traffic Disruption</option>
                        <option value="Customs Clearance & Inspection Delay">Customs Clearance & Inspection Delay</option>
                        <option value="Client Storage / Delayed Confirmation">Client Storage / Delayed Confirmation</option>
                        <option value="Road Block / Political Disruption">Road Block / Political Disruption</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Extra Driver Khoraki for delay */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    Additional Driver Delay Khoraki / Allowance (BDT)
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">
                    (Expense for {delayExtraDays} extra days)
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={delayDriverKhoraki}
                  onChange={(e) => setDelayDriverKhoraki(Number(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-mono"
                />
              </div>

              {/* Live Financial Summary */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Original Freight Fare:</span>
                  <span>{formatBDT(delayTrip.tripRevenue || 0)}</span>
                </div>
                {delayBillDemurrage && delayDemurrageAmount > 0 && (
                  <div className="flex justify-between text-purple-700 dark:text-purple-300 font-bold">
                    <span>+ Added Demurrage ({delayExtraDays}d @ {formatBDT(delayDemurrageDailyRate)}):</span>
                    <span>+{formatBDT(delayDemurrageAmount)}</span>
                  </div>
                )}
                {delayDriverKhoraki > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>+ Extra Driver Khoraki Expense:</span>
                    <span>+{formatBDT(delayDriverKhoraki)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 text-sm">
                  <span>Updated Total Billed to Client:</span>
                  <span>{formatBDT((Number(delayTrip.tripRevenue || 0)) + (Number(delayTrip.demurrageAmount || 0)) + (delayBillDemurrage ? delayDemurrageAmount : 0))}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTripDelayModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-black text-xs shadow-xs cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save Extension & Apply Demurrage</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── MODAL: EDIT TRUCK / VEHICLE ── */}
      {showEditVehicleModal && editingVehicle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowEditVehicleModal(false)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-sky-300 dark:border-sky-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="h-5 w-5 text-sky-600" />
                  <span>Edit Vehicle — {editingVehicle.registrationNumber}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update registration, driver, odometer, and BRTA documentation details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditVehicleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditVehicle} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editVehReg}
                    onChange={(e) => setEditVehReg(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Truck Name / Model
                  </label>
                  <input
                    type="text"
                    value={editVehName}
                    onChange={(e) => setEditVehName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Assigned Driver
                  </label>
                  <input
                    type="text"
                    value={editVehDriver}
                    onChange={(e) => setEditVehDriver(e.target.value)}
                    placeholder="e.g. Md. Kalam Hossain"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Driver Mobile / Phone
                  </label>
                  <input
                    type="text"
                    value={editVehDriverPhone}
                    onChange={(e) => setEditVehDriverPhone(e.target.value)}
                    placeholder="e.g. 01711-223344"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Current Odometer (KM)
                  </label>
                  <input
                    type="number"
                    value={editVehOdometer}
                    onChange={(e) => setEditVehOdometer(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Payload Capacity (Tons)
                  </label>
                  <input
                    type="number"
                    value={editVehCapacity}
                    onChange={(e) => setEditVehCapacity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Vehicle Status
                  </label>
                  <select
                    value={editVehStatus}
                    onChange={(e) => setEditVehStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="available">Available / Ready</option>
                    <option value="active">On Trip / Dispatched</option>
                    <option value="maintenance">Maintenance / Workshop</option>
                  </select>
                </div>
              </div>

              {/* BRTA Documents Expiry */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                  BRTA Statutory Documents Validity
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Tax Token Expiry</label>
                    <input
                      type="date"
                      value={editVehTaxToken}
                      onChange={(e) => setEditVehTaxToken(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Fitness Certificate Expiry</label>
                    <input
                      type="date"
                      value={editVehFitness}
                      onChange={(e) => setEditVehFitness(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Insurance Expiry</label>
                    <input
                      type="date"
                      value={editVehInsurance}
                      onChange={(e) => setEditVehInsurance(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Route Permit Expiry</label>
                    <input
                      type="date"
                      value={editVehRoutePermit}
                      onChange={(e) => setEditVehRoutePermit(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditVehicleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-black text-xs shadow-xs cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>{isSubmitting ? 'Saving...' : 'Update Trip'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TRUCK DETAILS & FINANCIAL LEDGER PROFILE ── */}
      {selectedTruckForDetails && selectedTruckStats && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={() => setSelectedTruckForDetails(null)}
        >
          <div
            className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-mono">
                      {selectedTruckForDetails.registrationNumber}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        selectedTruckForDetails.status === 'active' || selectedTruckForDetails.status === 'running'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : selectedTruckForDetails.status === 'available'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {selectedTruckForDetails.status === 'active' || selectedTruckForDetails.status === 'running'
                        ? '🚚 On Highway Trip'
                        : selectedTruckForDetails.status === 'available'
                        ? 'Ready for Trip'
                        : 'In Workshop / Repair'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedTruckForDetails.vehicleType} • {selectedTruckForDetails.truckBodyType || 'Covered'} • Added to Fleet:{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {selectedTruckForDetails.date || 'Fleet Inception'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTruckForStatement(selectedTruckForDetails);
                    setStatementSelectedMonth(truckDetailsSelectedMonth);
                    setShowTruckMonthlyStatementModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/60 shadow-2xs cursor-pointer"
                  title="Download or Print Monthly Performance & Income Statement PDF"
                >
                  <FileText className="h-3.5 w-3.5 text-purple-600" />
                  <span>Monthly Statement (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const veh = selectedTruckForDetails;
                    setSelectedTruckForDetails(null);
                    handleOpenEditVehicle(veh);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ✏ Edit Truck
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTruckForDetails(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Interactive Month Filter & Statement Export Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="font-bold text-slate-700 dark:text-slate-300">Statement Month Filter:</span>
                <select
                  value={truckDetailsSelectedMonth}
                  onChange={(e) => setTruckDetailsSelectedMonth(e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1 font-bold text-xs focus:outline-none focus:border-purple-500 cursor-pointer uppercase text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">All Recorded History ({selectedTruckStats.allTimeTripsCount} Trips)</option>
                  {selectedTruckStats.availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                {truckDetailsSelectedMonth !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setTruckDetailsSelectedMonth('ALL')}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Reset to All
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTruckForStatement(selectedTruckForDetails);
                  setStatementSelectedMonth(truckDetailsSelectedMonth);
                  setShowTruckMonthlyStatementModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print {truckDetailsSelectedMonth !== 'ALL' ? truckDetailsSelectedMonth : 'Full'} Statement</span>
              </button>
            </div>

            {/* 4 Financial & Telemetry Performance Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-sans font-bold flex items-center justify-between">
                  <span>Total Freight Revenue</span>
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                  {formatBDT(selectedTruckStats.totalRevenue)}
                </div>
                <div className="text-[10px] text-emerald-600 font-sans">
                  Total freight revenue from {selectedTruckStats.truckTrips.length} trips
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-1">
                <div className="text-[11px] text-rose-800 dark:text-rose-300 font-sans font-bold flex items-center justify-between">
                  <span>Total Operating Expenses</span>
                  <DollarSign className="h-3.5 w-3.5 text-rose-600" />
                </div>
                <div className="text-lg font-black text-rose-700 dark:text-rose-400">
                  {formatBDT(selectedTruckStats.grandTotalExpenses)}
                </div>
                <div className="text-[10px] text-rose-600 font-sans truncate">
                  Fuel, toll, khoraki, commission & maintenance
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-[11px] text-slate-700 dark:text-slate-300 font-sans font-bold flex items-center justify-between">
                  <span>Net Profit Margin</span>
                  <Percent className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div
                  className={`text-lg font-black ${
                    selectedTruckStats.netProfit >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatBDT(selectedTruckStats.netProfit)}
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  {selectedTruckStats.netProfit >= 0 ? 'Profitable Vehicle' : 'High Expenses'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 space-y-1">
                <div className="text-[11px] text-sky-800 dark:text-sky-300 font-sans font-bold flex items-center justify-between">
                  <span>Total Mileage & Trips</span>
                  <Navigation className="h-3.5 w-3.5 text-sky-600" />
                </div>
                <div className="text-lg font-black text-sky-700 dark:text-sky-400">
                  {selectedTruckStats.totalKm.toLocaleString()} KM
                </div>
                <div className="text-[10px] text-sky-600 font-sans">
                  {selectedTruckStats.completedTrips} completed trips ({selectedTruckStats.activeTrips} running)
                </div>
              </div>
            </div>

            {/* Sub-Tabs Bar */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1 text-xs">
              <button
                type="button"
                onClick={() => setTruckDetailsActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  truckDetailsActiveTab === 'overview'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Overview & Driver
              </button>
              <button
                type="button"
                onClick={() => setTruckDetailsActiveTab('trips')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  truckDetailsActiveTab === 'trips'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Trip Ledger ({selectedTruckStats.truckTrips.length})
              </button>
              <button
                type="button"
                onClick={() => setTruckDetailsActiveTab('fuel')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  truckDetailsActiveTab === 'fuel'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Fuel Logs ({selectedTruckStats.truckFuelLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setTruckDetailsActiveTab('maintenance')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  truckDetailsActiveTab === 'maintenance'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Maintenance ({selectedTruckStats.truckMaintLogs.length})
              </button>
            </div>

            {/* Sub-Tab 1: Overview */}
            {truckDetailsActiveTab === 'overview' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Truck Technical Specifications */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1.5">
                      <Truck className="h-4 w-4 text-emerald-600" />
                      <span>Vehicle Specifications & Profile</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Registration Number:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedTruckForDetails.registrationNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Truck Code / ID:</span>
                        <span className="font-mono font-semibold">{selectedTruckForDetails.tripOrVehicleCode}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Model & Brand:</span>
                        <span className="font-semibold">{selectedTruckForDetails.vehicleType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Body Type:</span>
                        <span className="font-semibold uppercase">{selectedTruckForDetails.truckBodyType || 'Covered'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Payload Capacity (Tons):</span>
                        <span className="font-bold text-emerald-600">{selectedTruckForDetails.capacityTons || 15} Ton</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Current Odometer:</span>
                        <span className="font-mono font-bold">{selectedTruckForDetails.currentOdometer || selectedTruckForDetails.distanceKm || 0} KM</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Engine Number:</span>
                        <span className="font-mono text-[11px]">{selectedTruckForDetails.engineNumber || 'ENG-HINO-883921'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Chassis Number:</span>
                        <span className="font-mono text-[11px]">{selectedTruckForDetails.chassisNumber || 'CHS-500-772910'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Vehicle Purchase Value:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {selectedTruckForDetails.purchasePrice ? formatBDT(selectedTruckForDetails.purchasePrice) : 'BDT 2,800,000'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Date Added to Fleet:</span>
                        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                          {selectedTruckForDetails.date || '2026-11-01'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Driver & Legal Documents */}
                  <div className="space-y-3">
                    {/* Driver Box */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1.5">
                        <Users className="h-4 w-4 text-purple-600" />
                        <span>Assigned Driver Details</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Driver Name:</span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {selectedTruckForDetails.driverName || 'No Driver Assigned'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Mobile Phone:</span>
                          <span className="font-mono font-semibold text-emerald-600">
                            {selectedTruckStats.assignedDriver?.phone || selectedTruckForDetails.driverPhone || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Driving License:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {selectedTruckStats.assignedDriver?.license || 'BRTA Verified Professional'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Monthly Basic Salary:</span>
                          <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                            {formatBDT(selectedTruckStats.assignedDriver?.salary || 5000)} / Month
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BRTA Documents Expiry Strip */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1.5">
                        <ShieldCheck className="h-4 w-4 text-sky-600" />
                        <span>BRTA Statutory Documents Validity</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Tax Token:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedTruckForDetails.taxTokenExpiry || '2027-06-30'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Fitness Certificate:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedTruckForDetails.fitnessExpiry || '2027-05-31'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Insurance:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedTruckForDetails.insuranceExpiry || '2027-08-31'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Route Permit:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedTruckForDetails.routePermitExpiry || '2027-12-31'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Trips Ledger */}
            {truckDetailsActiveTab === 'trips' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    Showing {selectedTruckStats.truckTrips.length} Trips {truckDetailsSelectedMonth !== 'ALL' ? `for ${truckDetailsSelectedMonth}` : '(All Time)'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTruckForStatement(selectedTruckForDetails);
                      setStatementSelectedMonth(truckDetailsSelectedMonth);
                      setShowTruckMonthlyStatementModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Download Monthly Statement PDF</span>
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[45vh] border border-slate-200 dark:border-slate-700 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2.5">Date & Code</th>
                        <th className="py-2 px-2.5">Route & Customer</th>
                        <th className="py-2 px-2.5">Cargo</th>
                        <th className="py-2 px-2.5 text-right">Freight Fare</th>
                        <th className="py-2 px-2.5 text-right">Trip Expense</th>
                        <th className="py-2 px-2.5 text-right">Net Profit</th>
                        <th className="py-2 px-2.5 text-center">Status</th>
                        <th className="py-2 px-2.5 text-center">Challan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {selectedTruckStats.truckTrips.map((t, i) => {
                        const tripCost = Number(t.tripExpense || 0);
                        const profit = Number(t.tripRevenue || 0) - tripCost;
                        return (
                          <tr key={t.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-2.5 whitespace-nowrap font-mono">
                              <div className="font-bold text-slate-900 dark:text-white">{t.tripOrVehicleCode}</div>
                              <div className="text-[10px] text-slate-400">{t.date}</div>
                            </td>
                            <td className="py-2 px-2.5">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {t.loadingLocation || t.origin} ➔ {t.deliveryLocation || t.destination}
                              </div>
                              <div className="text-[10px] text-slate-400">{t.customerName || 'Party'}</div>
                            </td>
                            <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300 max-w-[140px] truncate">
                              {t.cargoDetails}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-600">
                              {formatBDT(t.tripRevenue)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-rose-600">
                              {formatBDT(tripCost)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {formatBDT(profit)}
                            </td>
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  t.status === 'completed'
                                    ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                              >
                                {t.status === 'completed' ? 'Completed' : 'Running'}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openTripChallanModal(t)}
                                className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold cursor-pointer"
                              >
                                Slip
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {selectedTruckStats.truckTrips.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                            No trips recorded for this truck yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Fuel History */}
            {truckDetailsActiveTab === 'fuel' && (
              <div className="space-y-2">
                <div className="overflow-x-auto max-h-[45vh] border border-slate-200 dark:border-slate-700 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Filling Station / Location</th>
                        <th className="py-2 px-3 text-right">Litres</th>
                        <th className="py-2 px-3 text-right">Price/L</th>
                        <th className="py-2 px-3 text-right">Total Cost</th>
                        <th className="py-2 px-3 text-right">Odometer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {selectedTruckStats.truckFuelLogs.map((f, i) => (
                        <tr key={f.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono">{f.date}</td>
                          <td className="py-2 px-3 font-semibold">{f.fuelStation || f.origin || 'Filling Station'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-sky-600">{f.fuelLitres || 0} L</td>
                          <td className="py-2 px-3 text-right font-mono">৳{f.fuelRate || 108}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-rose-600">{formatBDT(f.fuelCost)}</td>
                          <td className="py-2 px-3 text-right font-mono">{f.startOdometer || 0} KM</td>
                        </tr>
                      ))}
                      {selectedTruckStats.truckFuelLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                            No fuel logs recorded for this vehicle.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab 4: Maintenance History */}
            {truckDetailsActiveTab === 'maintenance' && (
              <div className="space-y-2">
                <div className="overflow-x-auto max-h-[45vh] border border-slate-200 dark:border-slate-700 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Garage & Mechanic</th>
                        <th className="py-2 px-3">Problem & Parts Replaced</th>
                        <th className="py-2 px-3 text-right">Parts Cost</th>
                        <th className="py-2 px-3 text-right">Labour</th>
                        <th className="py-2 px-3 text-right">Total Cost</th>
                        <th className="py-2 px-3">Warranty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {selectedTruckStats.truckMaintLogs.map((m, i) => (
                        <tr key={m.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono">{m.date}</td>
                          <td className="py-2 px-3">
                            <div className="font-semibold">{m.garageName || m.origin || 'Workshop'}</div>
                            <div className="text-[10px] text-slate-400">{m.mechanicName || m.driverName}</div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold">{m.cargoDetails || m.maintenanceDetails}</div>
                            {m.partsReplaced && <div className="text-[10px] text-amber-600 font-bold">Parts: {m.partsReplaced}</div>}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">{formatBDT(m.partsCost || 0)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatBDT(m.labourCost || 0)}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-rose-600">{formatBDT(m.maintenanceCost)}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-emerald-600 font-bold">{m.warrantyExpiryDate || '—'}</td>
                        </tr>
                      ))}
                      {selectedTruckStats.truckMaintLogs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                            No workshop maintenance records found. Vehicle is in good condition.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex-wrap">
              {(() => {
                const activeCheck = getTruckActiveTrip(selectedTruckForDetails.registrationNumber);
                const isBusy = activeCheck.isOnTrip;
                if (isBusy) {
                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={true}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs border border-slate-300 dark:border-slate-700 opacity-60 cursor-not-allowed"
                        title={`Truck is currently on highway trip until ${activeCheck.returnDateFormatted}`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>On Trip (Locked until {activeCheck.returnDateFormatted})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const trip = allTrips.find(
                            (t) =>
                              normalizeReg(t.registrationNumber) === normalizeReg(selectedTruckForDetails.registrationNumber) &&
                              (t.status === 'active' || t.status === 'running') &&
                              !t.actualReturnDate
                          );
                          handleCancelActiveTrip(trip?.id, selectedTruckForDetails.registrationNumber);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                        title="Cancel active trip to immediately release this truck to available status"
                      >
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span>Cancel Trip & Release Truck</span>
                      </button>
                    </div>
                  );
                }
                return (
                  <button
                    type="button"
                    onClick={() => {
                      const reg = selectedTruckForDetails.registrationNumber;
                      setSelectedTruckForDetails(null);
                      resetTripFormState();
                      setTripTruckReg(reg);
                      setShowAddTripModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Start Trip for {selectedTruckForDetails.registrationNumber}</span>
                  </button>
                );
              })()}

              <button
                type="button"
                onClick={() => setSelectedTruckForDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: GARMENTS CONTRACT DETAILS & TRIP LEDGER ── */}
      {selectedGarmentsForDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={() => setSelectedGarmentsForDetails(null)}
        >
          <div
            className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-900/60 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                    {selectedGarmentsForDetails.contract.tripOrVehicleCode}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span>{selectedGarmentsForDetails.contract.clientName || selectedGarmentsForDetails.contract.customerName}</span>
                  </h2>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedGarmentsForDetails.contract.factoryLocation || selectedGarmentsForDetails.contract.origin || 'Industrial Area'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-purple-500" />
                    <span>{selectedGarmentsForDetails.contract.contactPerson || 'Logistics In-Charge'}</span>
                  </span>
                  {selectedGarmentsForDetails.contract.contactPhone && (
                    <a
                      href={`tel:${selectedGarmentsForDetails.contract.contactPhone}`}
                      className="flex items-center gap-1 font-mono font-bold text-purple-600 hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>{selectedGarmentsForDetails.contract.contactPhone}</span>
                    </a>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGarmentsForDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contract Type & Rate Banner */}
            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                  Billing Structure & Payment Model
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>
                    {selectedGarmentsForDetails.contract.billingType === 'monthly'
                      ? 'Monthly Fixed Contract'
                      : 'Day / Per-Trip Rate Contract'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                    {formatBDT(selectedGarmentsForDetails.contract.agreedRate || 0)}{' '}
                    {selectedGarmentsForDetails.contract.billingType === 'monthly' ? '/ Month' : '/ Trip'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono">
                Contract Start: {selectedGarmentsForDetails.contract.startDate || '2026-01-10'} • Status:{' '}
                <span className="font-bold text-emerald-600 uppercase">
                  {selectedGarmentsForDetails.contract.contractStatus || 'Active'}
                </span>
              </div>
            </div>

            {/* 4 Financial KPI Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-0.5">
                <div className="text-[11px] text-slate-500 font-semibold">Total Trips Dispatched</div>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {selectedGarmentsForDetails.totalTrips}
                </div>
                <div className="text-[10px] text-emerald-600 font-bold">
                  {selectedGarmentsForDetails.activeTrips} Active Running
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-0.5">
                <div className="text-[11px] text-slate-500 font-semibold">Total Billed / Revenue</div>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {formatBDT(selectedGarmentsForDetails.totalBilled)}
                </div>
                <div className="text-[10px] text-slate-400">Freight & Service Value</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-0.5">
                <div className="text-[11px] text-slate-500 font-semibold">Advances Collected</div>
                <div className="text-xl font-black font-mono text-emerald-600">
                  {formatBDT(selectedGarmentsForDetails.totalAdvance)}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">Total Advances Paid</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-0.5">
                <div className="text-[11px] text-slate-500 font-semibold">Outstanding Due</div>
                <div className="text-xl font-black font-mono text-rose-600">
                  {formatBDT(selectedGarmentsForDetails.totalDue)}
                </div>
                <div className="text-[10px] text-rose-600 font-semibold">Total Outstanding Receivable</div>
              </div>
            </div>

            {/* Dedicated Assigned Fleet Section */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  <span>Dedicated Fleet Assigned ({selectedGarmentsForDetails.assignedTrucks.length} Trucks)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Fleet trucks and assigned drivers dedicated to this factory
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {selectedGarmentsForDetails.assignedTrucks.map((truckReg: string) => {
                  const veh = allVehicles.find((v) => normalizeReg(v.registrationNumber) === normalizeReg(truckReg));
                  const activeInfo = getTruckActiveTrip(truckReg);
                  const isBusy = activeInfo.isOnTrip;
                  return (
                    <div
                      key={truckReg}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{truckReg}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isBusy
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {isBusy ? `On Trip (${activeInfo.returnDateFormatted})` : 'Available'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {veh?.truckName || veh?.vehicleType} • {veh?.capacityTons ? `${veh.capacityTons} Ton` : ''}
                      </div>
                      <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Driver: {veh?.driverName || 'Assigned'}</span>
                        {veh?.driverPhone && <span className="font-mono">({veh.driverPhone})</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trip Ledger Table */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-purple-600" />
                  <span>Trip Ledger & History ({selectedGarmentsForDetails.clientTrips.length} Trips)</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  All dispatches, challan slips & billing ledger
                </span>
              </div>

              <div className="overflow-x-auto max-h-[35vh] border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-2.5">Date & Code</th>
                      <th className="py-2 px-2.5">Truck & Driver</th>
                      <th className="py-2 px-2.5">Route & Cargo</th>
                      <th className="py-2 px-2.5 text-right">Freight Fare</th>
                      <th className="py-2 px-2.5 text-right">Advance</th>
                      <th className="py-2 px-2.5 text-right">Due Balance</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                      <th className="py-2 px-2.5 text-center">Challan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {selectedGarmentsForDetails.clientTrips.map((t: ErpTransportOp, i: number) => {
                      const fare = Number(t.tripRevenue || t.estimatedTripFare || 0);
                      const adv = Number(t.advancePaid || 0);
                      const due = Math.max(0, fare - adv);
                      return (
                        <tr key={t.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-2.5 whitespace-nowrap font-mono">
                            <div className="font-bold text-slate-900 dark:text-white">{t.tripOrVehicleCode}</div>
                            <div className="text-[10px] text-slate-400">{t.date}</div>
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            <div className="font-bold font-mono text-slate-900 dark:text-white">{t.registrationNumber}</div>
                            <div className="text-[10px] text-slate-500">{t.driverName}</div>
                          </td>
                          <td className="py-2 px-2.5">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {t.loadingLocation || t.origin} ➔ {t.deliveryLocation || t.destination}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{t.cargoDetails}</div>
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatBDT(fare)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono text-emerald-600">
                            {formatBDT(adv)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-black text-rose-600">
                            {formatBDT(due)}
                          </td>
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                t.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {t.status === 'completed' ? 'Completed' : 'Running'}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openTripChallanModal(t)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                              title="Print / View Challan Slip"
                            >
                              <Printer className="h-3 w-3 text-slate-500" />
                              <span>Challan</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {selectedGarmentsForDetails.clientTrips.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                          No trips dispatched under this corporate contract yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const contract = selectedGarmentsForDetails.contract;
                    setSelectedGarmentsForDetails(null);
                    openCorporateTransportBill(contract);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                  title="View & Print Official Corporate Transport Bill (Rent + Demurrage Invoice)"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>📄 Transport Bill (Invoice)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const client = selectedGarmentsForDetails;
                    setSelectedGarmentsForDetails(null);
                    openCollectClientBillModal(client);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>{selectedGarmentsForDetails.contract?.billingType === 'monthly' ? '+ Receive Monthly Rent' : '+ Receive Payment'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const assigned = selectedGarmentsForDetails.assignedTrucks;
                    const avail = assigned.find((t: string) => !getTruckActiveTrip(t).isOnTrip);
                    const contract = selectedGarmentsForDetails.contract;
                    setSelectedGarmentsForDetails(null);
                    openQuickGarmentsDispatch(avail || assigned[0], contract);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>+ Start Trip for this Factory</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGarmentsForDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: QUICK GARMENTS TRIP ── */}
      {showQuickGarmentsDispatchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowQuickGarmentsDispatchModal(false)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                    <Truck className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Start Garments Trip
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Fast 1-Click
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Select a dedicated truck to auto-fill factory address, driver and agreed rate.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowQuickGarmentsDispatchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickGarmentsDispatch} className="space-y-3.5 text-xs">
              {/* Auto Challan Number & Order Number */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      Challan Number *
                    </label>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      ✨ Auto-Generated
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={quickDispatchChallanNo}
                    onChange={(e) => setQuickDispatchChallanNo(e.target.value)}
                    placeholder="e.g. CHAL-2026-001"
                    className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold text-xs text-purple-700 dark:text-purple-300 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      Order Number *
                    </label>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                      ✨ Auto-Generated
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={quickDispatchOrderNo}
                    onChange={(e) => setQuickDispatchOrderNo(e.target.value)}
                    placeholder="e.g. ORD-2026-001"
                    className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Corporate Garments Factory Selector */}
              <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-purple-600" />
                    <span>Corporate Client / Factory *</span>
                  </label>
                  {quickDispatchContract && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                      {quickDispatchCompanyTrucks.length} Dedicated Trucks Allocated
                    </span>
                  )}
                </div>
                <select
                  required
                  value={quickDispatchContract?.id || ''}
                  onChange={(e) => {
                    const found = allGarmentsContracts.find((c) => c.id === e.target.value);
                    if (found) handleQuickDispatchCompanyChange(found);
                  }}
                  className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-bold text-xs text-purple-900 dark:text-purple-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Choose Corporate Company --</option>
                  {allGarmentsContracts.map((c) => {
                    let count = 0;
                    if (Array.isArray(c.assignedTrucks)) count = c.assignedTrucks.length;
                    else if (c.assignedTrucksJson) {
                      try { count = JSON.parse(c.assignedTrucksJson).length; } catch {}
                    }
                    return (
                      <option key={c.id} value={c.id}>
                        {c.clientName || c.customerName} ({count} Dedicated Trucks • {c.billingType === 'monthly' ? 'Monthly Contract' : `${formatBDT(c.agreedRate || 0)}/trip`})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 1. Select Dedicated Truck (SCOPED STRICTLY TO SELECTED COMPANY) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    Select Dedicated Truck for {quickDispatchContract?.clientName || 'Selected Company'} *
                  </label>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    {quickDispatchCompanyTrucks.filter((v) => !getTruckActiveTrip(v.registrationNumber).isOnTrip).length} Available of {quickDispatchCompanyTrucks.length}
                  </span>
                </div>

                {/* Truck Digit / Driver Search Filter */}
                <div className="mb-1.5 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={quickDispatchTruckSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickDispatchTruckSearch(val);
                      if (val.trim()) {
                        const digitsQ = val.replace(/\D/g, '');
                        const cleanQ = val.replace(/[^a-z0-9]/gi, '').toLowerCase();
                        const matches = quickDispatchCompanyTrucks.filter((v) => {
                          const dReg = (v.registrationNumber || '').replace(/\D/g, '');
                          const cReg = (v.registrationNumber || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
                          const mDriver = (v.driverName || '').toLowerCase().includes(cleanQ);
                          return (digitsQ.length >= 2 && dReg.includes(digitsQ)) || cReg.includes(cleanQ) || mDriver;
                        });
                        if (matches.length === 1 && !getTruckActiveTrip(matches[0].registrationNumber).isOnTrip) {
                          handleQuickTruckChange(matches[0].registrationNumber);
                        }
                      }
                    }}
                    placeholder="Search truck digits (e.g. 9171, 8393, Kalam)..."
                    className="w-full bg-transparent text-xs font-semibold focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  {quickDispatchTruckSearch && (
                    <button
                      type="button"
                      onClick={() => setQuickDispatchTruckSearch('')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 px-1 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  required
                  value={quickDispatchTruck}
                  onChange={(e) => handleQuickTruckChange(e.target.value)}
                  className="w-full rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20 px-3 py-2.5 font-mono font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Truck from {quickDispatchContract?.clientName || 'Company'} Fleet --</option>
                  {quickDispatchCompanyTrucks
                    .filter((v) => {
                      if (!quickDispatchTruckSearch.trim()) return true;
                      const digitsQ = quickDispatchTruckSearch.replace(/\D/g, '');
                      const cleanQ = quickDispatchTruckSearch.replace(/[^a-z0-9]/gi, '').toLowerCase();
                      const dReg = (v.registrationNumber || '').replace(/\D/g, '');
                      const cReg = (v.registrationNumber || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
                      const mDriver = (v.driverName || '').toLowerCase().includes(cleanQ);
                      const mPhone = (v.driverPhone || '').replace(/\D/g, '').includes(digitsQ);
                      return (digitsQ.length >= 2 && dReg.includes(digitsQ)) || cReg.includes(cleanQ) || mDriver || mPhone;
                    })
                    .map((v) => {
                      const digits = (v.registrationNumber || '').replace(/\D/g, '').slice(-4);
                      const activeInfo = getTruckActiveTrip(v.registrationNumber);
                      const isBusy = activeInfo.isOnTrip;
                      const phoneLabel = v.driverPhone ? ` 📞 ${v.driverPhone}` : '';
                      return (
                        <option
                          key={v.id}
                          value={v.registrationNumber}
                          disabled={isBusy}
                          className={isBusy ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 italic' : 'font-bold'}
                        >
                          [{digits || 'TRK'}] {v.registrationNumber} ({cleanTruckName(v.truckName || v.vehicleType)}) • {v.driverName || 'Driver'}{phoneLabel} {isBusy ? `🚫 [BUSY: On Trip until ${activeInfo.returnDateFormatted}]` : '✓ [READY]'}
                        </option>
                      );
                    })}
                </select>
                {quickDispatchCompanyTrucks.length > 0 && quickDispatchCompanyTrucks.every((v) => getTruckActiveTrip(v.registrationNumber).isOnTrip) && (
                  <div className="mt-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>All {quickDispatchCompanyTrucks.length} trucks allocated to {quickDispatchContract?.clientName} are currently on active trips.</span>
                  </div>
                )}
              </div>

              {/* 2. Auto-filled Summary Box */}
              {(() => {
                const c = quickDispatchContract || getTruckAssignedGarments(quickDispatchTruck);
                const veh = allVehicles.find((v) => normalizeReg(v.registrationNumber) === normalizeReg(quickDispatchTruck));
                return (
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5 text-xs">
                    <div className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Auto-Filled from Contract</span>
                      <span className="font-mono text-emerald-600 font-bold">
                        {c?.billingType === 'monthly' ? 'Monthly Contract' : 'Per Trip Rate'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Client / Factory:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {c?.clientName || 'General Client'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Factory Loading Point:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                          {c?.factoryLocation || c?.origin || 'Ashulia, Savar'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Assigned Driver:</span>
                        <span className="font-semibold text-emerald-600">
                          {veh?.driverName || 'Driver Assigned'} {veh?.driverPhone ? `(${veh.driverPhone})` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Agreed Freight Rate:</span>
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                          {formatBDT(c?.agreedRate || quickDispatchFare || 15000)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 3. Destination (Unloading Point) with Quick-Pills */}
              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  Unloading Point / Delivery Destination *
                </label>
                <input
                  type="text"
                  required
                  value={quickDispatchDest}
                  onChange={(e) => setQuickDispatchDest(e.target.value)}
                  placeholder="e.g. Chittagong Port (Incoterm CFS)"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400">Quick Pick:</span>
                  {[
                    'Chittagong Port (In-Bond / CFS)',
                    'Dhaka Airport Cargo Village',
                    'Benapole Land Port',
                    'DEPZ Savar Depot',
                  ].map((dest) => (
                    <button
                      key={dest}
                      type="button"
                      onClick={() => setQuickDispatchDest(dest)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                        quickDispatchDest === dest
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {dest.split(' ')[0]} {dest.split(' ')[1] || ''}
                    </button>
                  ))}
                </div>

                {/* Dynamic Highway Route & Distance Indicator */}
                {(() => {
                  const orig = quickDispatchContract?.factoryLocation || quickDispatchContract?.origin || 'Ashulia, Savar';
                  const distInfo = calculateHighwayDistance(orig, quickDispatchDest || 'Chittagong Port');
                  return (
                    <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                        <Navigation className="h-3.5 w-3.5 text-emerald-600" />
                        <span>⚡ Route: {distInfo.routeName}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                        {distInfo.km} KM
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* 4. Fare, Date & Advances */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Dispatch Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={quickDispatchDate}
                    onChange={(e) => setQuickDispatchDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Base Freight Rent (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="0"
                    value={quickDispatchFare === 0 ? '' : quickDispatchFare}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setQuickDispatchFare(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold text-xs text-purple-700 dark:text-purple-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Advance Collected (BDT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={quickDispatchAdvance === 0 ? '' : quickDispatchAdvance}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setQuickDispatchAdvance(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs text-emerald-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Demurrage & Vehicle Detention Breakdown */}
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Demurrage & Vehicle Detention (Extra Waiting Charge)</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 font-mono">
                    {quickDispatchDemurrage > 0 ? `+BDT ${quickDispatchDemurrage.toLocaleString()} Added to Bill` : 'No Detention'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block mb-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Detention Days
                    </label>
                    <select
                      value={quickDispatchDemurrageDays}
                      onChange={(e) => {
                        const days = Number(e.target.value);
                        setQuickDispatchDemurrageDays(days);
                        setQuickDispatchDemurrage(days * quickDispatchDemurrageDailyRate);
                        setQuickDispatchDriverDelayKhoraki(days * 500);
                      }}
                      className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-2 py-1.5 font-bold text-xs"
                    >
                      <option value={0}>0 Days (On-time Unloading)</option>
                      <option value={1}>1 Day Detention</option>
                      <option value={2}>2 Days Detention</option>
                      <option value={3}>3 Days Detention</option>
                      <option value={4}>4 Days Detention</option>
                      <option value={5}>5 Days Detention</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Daily Demurrage Rate (BDT/day)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      placeholder="0"
                      value={quickDispatchDemurrageDailyRate === 0 ? '' : quickDispatchDemurrageDailyRate}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const rate = Number(e.target.value.replace(/^0+(?=\d)/, ''));
                        setQuickDispatchDemurrageDailyRate(rate);
                        setQuickDispatchDemurrage(quickDispatchDemurrageDays * rate);
                      }}
                      className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Total Demurrage Billed (BDT)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={quickDispatchDemurrage === 0 ? '' : quickDispatchDemurrage}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, '');
                        setQuickDispatchDemurrage(v === '' ? 0 : Number(v));
                      }}
                      className="w-full rounded-lg border border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-bold text-xs text-amber-800 dark:text-amber-300"
                    />
                  </div>
                </div>

                {quickDispatchDemurrageDays > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/80 dark:border-amber-900/40">
                    <div>
                      <label className="block mb-1 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        Detention Cause / Delay Reason
                      </label>
                      <select
                        value={quickDispatchDemurrageReason}
                        onChange={(e) => setQuickDispatchDemurrageReason(e.target.value)}
                        className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px]"
                      >
                        <option value="Factory Unloading Delay (Exceeded 24h standard)">Factory Unloading Delay</option>
                        <option value="Port / CFS Berth Congestion & Yard Hold">Port / CFS Congestion</option>
                        <option value="Factory Closed / Weekend / Public Holiday">Factory Closed / Holiday</option>
                        <option value="Customs & Shipping Document Hold">Customs Document Hold</option>
                        <option value="Receiver Labor Shortage at Offloading Point">Receiver Labor Shortage</option>
                        <option value="Truck Detained on Route / Highway Hold">Truck Stopped / Detained on Route</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        Driver Extra Delay Khoraki / Allowance (BDT)
                      </label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={quickDispatchDriverDelayKhoraki === 0 ? '' : quickDispatchDriverDelayKhoraki}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const v = e.target.value.replace(/^0+(?=\d)/, '');
                          setQuickDispatchDriverDelayKhoraki(v === '' ? 0 : Number(v));
                        }}
                        className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Trip Duration & Expected Return Date */}
              <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-sky-600" />
                    <span>Trip Duration & Expected Return Date *</span>
                  </label>
                  <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                    Returns: <strong className="font-mono">{quickDispatchReturnDate}</strong>
                  </span>
                </div>

                {/* Duration Quick-Select Pills */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickDispatchDurationDays(1);
                      const d = new Date(quickDispatchDate);
                      setQuickDispatchReturnDate(d.toISOString().slice(0, 10));
                    }}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      quickDispatchDurationDays === 1
                        ? 'border-emerald-500 bg-white dark:bg-slate-800 shadow-2xs ring-1 ring-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">1 Day</div>
                    <div className="text-[10px] text-slate-500">Same Day Delivery</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickDispatchDurationDays(2);
                      const d = new Date(quickDispatchDate);
                      d.setDate(d.getDate() + 2);
                      setQuickDispatchReturnDate(d.toISOString().slice(0, 10));
                    }}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      quickDispatchDurationDays === 2
                        ? 'border-emerald-500 bg-white dark:bg-slate-800 shadow-2xs ring-1 ring-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">2 Days (Up-Down)</div>
                    <div className="text-[10px] text-slate-500">Round Trip / Return</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickDispatchDurationDays(3);
                      const d = new Date(quickDispatchDate);
                      d.setDate(d.getDate() + 3);
                      setQuickDispatchReturnDate(d.toISOString().slice(0, 10));
                    }}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      quickDispatchDurationDays === 3
                        ? 'border-emerald-500 bg-white dark:bg-slate-800 shadow-2xs ring-1 ring-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">3 Days</div>
                    <div className="text-[10px] text-slate-500">Long Route / Border</div>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <span className="text-slate-500 shrink-0">Custom Return Date:</span>
                  <input
                    type="date"
                    required
                    value={quickDispatchReturnDate}
                    min={quickDispatchDate}
                    onChange={(e) => {
                      setQuickDispatchReturnDate(e.target.value);
                      setQuickDispatchDurationDays(0);
                    }}
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  🔒 This truck will be locked as <strong>On Trip</strong> until this date. Starting new trips on it will be disabled.
                </p>
              </div>

              {/* 5. Driver Khoraki Cash & Cargo Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Driver Road Khoraki (BDT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={quickDispatchKhoraki === 0 ? '' : quickDispatchKhoraki}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value.replace(/^0+(?=\d)/, '');
                      setQuickDispatchKhoraki(v === '' ? 0 : Number(v));
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Cargo / Load Details
                  </label>
                  <input
                    type="text"
                    value={quickDispatchCargo}
                    onChange={(e) => setQuickDispatchCargo(e.target.value)}
                    placeholder="e.g. RMG Garments Export Cartons"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Live Fare & Khoraki Summary Box */}
              <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block font-medium">Total Billed to Client (Rent + Demurrage)</span>
                  <span className="text-base font-black font-mono text-emerald-400">
                    {formatBDT(Number(quickDispatchFare || 0) + Number(quickDispatchDemurrage || 0))}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block font-medium">Driver Total Khoraki</span>
                  <span className="font-mono font-bold text-amber-300">
                    {formatBDT(Number(quickDispatchKhoraki || 0) + Number(quickDispatchDriverDelayKhoraki || 0))}
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickGarmentsDispatchModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Starting Trip...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Confirm & Start Trip</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: COLLECT GARMENTS CLIENT MONTHLY BILL ── */}
      {showCollectClientBillModal && targetClientForBill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowCollectClientBillModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const isMonthly = targetClientForBill.contract?.billingType === 'monthly';
              const companyName = targetClientForBill.contract?.clientName || targetClientForBill.contract?.customerName || 'Corporate Client';
              return (
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {isMonthly ? `Receive Monthly Rent — ${companyName}` : `Receive Payment — ${companyName}`}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isMonthly
                          ? 'Record monthly fixed contract rent into Cash or Bank'
                          : 'Record trip freight payment or settle dues into Cash or Bank'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCollectClientBillModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              );
            })()}

            <form onSubmit={handleCollectGarmentsClientBill} className="space-y-3.5 text-xs">
              {/* Client & Contract Info Summary */}
              <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {targetClientForBill.contract?.clientName || targetClientForBill.contract?.customerName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                    {targetClientForBill.contract?.billingType === 'monthly' ? 'Monthly Fixed Contract' : 'Per-Trip Rate Basis'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-purple-100 dark:border-purple-900/40 text-center">
                  <div className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/60">
                    <span className="text-[10px] text-slate-400 block font-semibold">Total Billed</span>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {formatBDT(targetClientForBill.totalBilled)}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/60">
                    <span className="text-[10px] text-slate-400 block font-semibold">Already Paid</span>
                    <span className="font-mono font-bold text-xs text-emerald-600">
                      {formatBDT(targetClientForBill.totalAdvance)}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/60">
                    <span className="text-[10px] text-slate-400 block font-semibold">Outstanding Due</span>
                    <span className="font-mono font-black text-xs text-rose-600">
                      {formatBDT(targetClientForBill.totalDue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Payment Amount Received (BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">৳</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={clientBillPayAmount}
                    onChange={(e) => setClientBillPayAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {targetClientForBill.totalDue > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-slate-400">Quick Fill:</span>
                    <button
                      type="button"
                      onClick={() => setClientBillPayAmount(targetClientForBill.totalDue)}
                      className="text-[10px] px-2 py-0.5 rounded border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
                    >
                      Pay Full Due ({formatBDT(targetClientForBill.totalDue)})
                    </button>
                  </div>
                )}
              </div>

              {/* Date & Wallet */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={clientBillPayDate}
                    onChange={(e) => setClientBillPayDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Deposit To Wallet / Bank *
                  </label>
                  <select
                    value={clientBillWalletId}
                    onChange={(e) => setClientBillWalletId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-semibold text-xs focus:outline-none focus:border-emerald-500"
                  >
                    {treasuryWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatBDT(w.balance || 0)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  Payment Notes / Cheque / Transaction Ref
                </label>
                <input
                  type="text"
                  value={clientBillNotes}
                  onChange={(e) => setClientBillNotes(e.target.value)}
                  placeholder="e.g. Bank transfer ref / Cheque #109282"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCollectClientBillModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                  <span>{targetClientForBill?.contract?.billingType === 'monthly' ? 'Confirm Monthly Rent Deposit' : 'Confirm Payment Receipt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT GARMENTS CONTRACT ── */}
      {showAddGarmentsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowAddGarmentsModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  <span>{editingGarmentsContract ? 'Edit Garments Contract' : 'Add New Garments Contract'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Assign dedicated fleet trucks and configure trip or monthly billing rates for corporate RMG factory clients.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddGarmentsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGarmentsContract} className="space-y-4 text-xs">
              {/* Client & Factory Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Garments / Corporate Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={garmentsClientName}
                    onChange={(e) => setGarmentsClientName(e.target.value)}
                    placeholder="e.g. Ananta Apparels Ltd. / Ha-Meem Group / Square Fashions"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-bold text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Factory Address / Loading Point
                  </label>
                  <input
                    type="text"
                    value={garmentsLocation}
                    onChange={(e) => setGarmentsLocation(e.target.value)}
                    placeholder="e.g. Nischintapur, Ashulia, Savar"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={garmentsContactPerson}
                    onChange={(e) => setGarmentsContactPerson(e.target.value)}
                    placeholder="e.g. Engr. Farhan Tanvir (Logistics In-Charge)"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={garmentsContactPhone}
                    onChange={(e) => setGarmentsContactPhone(e.target.value)}
                    placeholder="e.g. 01711-445566"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Contract Start Date
                  </label>
                  <input
                    type="date"
                    value={garmentsStartDate}
                    onChange={(e) => setGarmentsStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Billing Model & Agreed Rate */}
              <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-3">
                <div className="text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-purple-600" />
                  <span>Billing Model & Agreed Rates</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                      Payment / Billing Model *
                    </label>
                    <select
                      value={garmentsBillingType}
                      onChange={(e) => setGarmentsBillingType(e.target.value as any)}
                      className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-3 py-2 font-bold text-xs focus:outline-none focus:border-purple-500"
                    >
                      <option value="day_trip">Day / Per-Trip Rate Contract</option>
                      <option value="monthly">Monthly Fixed Contract</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                      {garmentsBillingType === 'monthly'
                        ? 'Monthly Fixed Freight Rate (BDT) *'
                        : 'Agreed Freight Rate per Trip (BDT) *'}
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={garmentsAgreedRate}
                      onChange={(e) => setGarmentsAgreedRate(Number(e.target.value))}
                      placeholder={garmentsBillingType === 'monthly' ? '220000' : '15000'}
                      className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono font-bold text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  {garmentsBillingType === 'monthly'
                    ? 'Monthly Contract: Dedicated fleet trucks operate exclusively for this client with consolidated monthly billing.'
                    : 'Per-Trip Rate: Billed per dispatch based on agreed rate upon trip completion and challan delivery.'}
                </p>
              </div>

              {/* Dedicated Fleet Selection: 7 Fleet Trucks with Checkboxes */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Assign Dedicated Trucks from Fleet (Select from 7 Trucks)</span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-600">
                    {garmentsAssignedTrucks.length} Trucks Selected
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Selected fleet trucks will auto-fill driver name, contact phone, factory loading address, and agreed trip rate upon trip dispatch.
                </p>

                {/* Truck Digit / Name Filter */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={contractTruckSearch}
                    onChange={(e) => setContractTruckSearch(e.target.value)}
                    placeholder="Search truck digits, plate or driver (e.g. 9171, 8393, Kalam)..."
                    className="w-full bg-transparent text-xs font-semibold focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  {contractTruckSearch && (
                    <button
                      type="button"
                      onClick={() => setContractTruckSearch('')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 px-1 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
                  {allVehicles
                    .filter((veh) => {
                      if (!contractTruckSearch.trim()) return true;
                      const digitsQ = contractTruckSearch.replace(/\D/g, '');
                      const cleanQ = contractTruckSearch.replace(/[^a-z0-9]/gi, '').toLowerCase();
                      const dReg = (veh.registrationNumber || '').replace(/\D/g, '');
                      const cReg = (veh.registrationNumber || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
                      const mDriver = (veh.driverName || '').toLowerCase().includes(cleanQ);
                      const mPhone = (veh.driverPhone || '').replace(/\D/g, '').includes(digitsQ);
                      return (digitsQ.length >= 2 && dReg.includes(digitsQ)) || cReg.includes(cleanQ) || mDriver || mPhone;
                    })
                    .map((veh) => {
                      const isChecked = garmentsAssignedTrucks.includes(veh.registrationNumber);
                      const digits = (veh.registrationNumber || '').replace(/\D/g, '').slice(-4);
                      return (
                        <label
                          key={veh.id}
                          className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGarmentsAssignedTrucks([...garmentsAssignedTrucks, veh.registrationNumber]);
                              } else {
                                setGarmentsAssignedTrucks(
                                  garmentsAssignedTrucks.filter((r) => r !== veh.registrationNumber)
                                );
                              }
                            }}
                            className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                          />
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="font-mono font-bold text-xs truncate">
                              <span className="text-purple-600 dark:text-purple-400 font-extrabold mr-1">[{digits || 'TRK'}]</span>
                              {veh.registrationNumber}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {veh.truckName || veh.vehicleType} • {veh.capacityTons ? `${veh.capacityTons}T` : ''} ({veh.truckBodyType || 'covered'})
                            </div>
                            <div className="text-[10px] text-emerald-600 font-semibold truncate flex items-center gap-1">
                              <Users className="h-2.5 w-2.5" />
                              <span>{veh.driverName || 'Driver Assigned'}</span>
                              {veh.driverPhone && <span className="font-mono text-slate-500 ml-1">📞 {veh.driverPhone}</span>}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Status & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Contract Status
                  </label>
                  <select
                    value={garmentsStatus}
                    onChange={(e) => setGarmentsStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed / Expired</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    Remarks & Payment Terms
                  </label>
                  <input
                    type="text"
                    value={garmentsRemarks}
                    onChange={(e) => setGarmentsRemarks(e.target.value)}
                    placeholder="e.g. Payment settled within 7 days of challan slip submission"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddGarmentsModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{editingGarmentsContract ? 'Update Contract' : 'Save Garments Contract'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 11: TRUCKS UNDER MAINTENANCE & WORKSHOP (RED CARD DETAIL) ── */}
      {showMaintenanceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowMaintenanceModal(false)}
        >
          <div
            className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border-2 border-rose-400 dark:border-rose-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-rose-200 dark:border-rose-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
                  <Wrench className="h-6 w-6 text-rose-600 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                      Vehicles Under Maintenance & Workshop Status
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                      {dashboardKpis.maintenanceCount} in workshop
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Workshop locations, mechanic contacts, problems, replacement parts and warranties
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Demurrage Summary Strip */}
            {activeMaintenanceList.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 space-y-2">
                <div className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Estimated Potential Demurrage / Revenue Loss During Garage Downtime
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-[10px] text-amber-700 dark:text-amber-400 border-b border-amber-200 dark:border-amber-800/50">
                        <th className="text-left pb-1 pr-2">Truck Number</th>
                        <th className="text-left pb-1 pr-2">Service Entry Date</th>
                        <th className="text-center pb-1 pr-2">Days</th>
                        <th className="text-right pb-1 pr-2">Daily Avg Revenue</th>
                        <th className="text-right pb-1">Estimated Demurrage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeMaintenanceList.map((m, idx) => (
                        <tr key={m.id || idx} className="border-b border-amber-100 dark:border-amber-900/40">
                          <td className="py-1 pr-2 font-mono font-bold text-slate-900 dark:text-white">{m.truckReg}</td>
                          <td className="py-1 pr-2 text-slate-600 dark:text-slate-400">{m.date}</td>
                          <td className="py-1 pr-2 text-center font-bold text-rose-600">{m.daysInGarage} Days</td>
                          <td className="py-1 pr-2 text-right font-mono text-slate-700 dark:text-slate-300">{formatBDT(m.avgDailyRevenue)}</td>
                          <td className="py-1 text-right font-mono font-black text-rose-700 dark:text-rose-400">{formatBDT(m.demurrage)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="pt-2 text-right font-extrabold text-amber-800 dark:text-amber-300 text-xs">Total Estimated Demurrage:</td>
                        <td className="pt-2 text-right font-mono font-black text-rose-700 dark:text-rose-300 text-sm">
                          {formatBDT(activeMaintenanceList.reduce((s, m) => s + (m.demurrage || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 italic">
                  * Daily avg revenue = vehicle completed trip average fare ÷ 2 days (est. trip duration). Defaulted to BDT 5,000/day if no prior trip history.
                </p>
              </div>
            )}

            {/* List of Vehicles under repair */}
            <div className="space-y-4">
              {activeMaintenanceList.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="p-4 rounded-2xl border-2 border-rose-200 dark:border-rose-900/70 bg-rose-50/40 dark:bg-rose-950/20 space-y-3.5 shadow-2xs"
                >
                  {/* Vehicle Headline */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 dark:border-rose-900/40 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-rose-600" />
                      <div>
                        <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          {m.truckReg}
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold">{m.truckName}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      {m.status}
                    </span>
                  </div>

                  {/* 2-Column Details Requested by User */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Box 1: Garage & Shop Info */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1">
                        <Building2 className="h-3.5 w-3.5 text-rose-600" />
                        <span>Workshop & Garage Details</span>
                      </div>
                      <div className="space-y-1 text-slate-700 dark:text-slate-300">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Garage / Workshop Name:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{m.garageName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Address / Location:</span>
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="h-3 w-3 text-slate-400" /> {m.garageAddress}
                          </span>
                        </div>
                        <div className="pt-1 border-t">
                          <span className="text-[10px] text-slate-400 block">Assigned Mechanic:</span>
                          <span className="font-bold">{m.mechanicName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Mechanic Contact Phone:</span>
                          <a
                            href={`tel:${m.mechanicPhone}`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-emerald-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" /> {m.mechanicPhone}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Box 2: Problem & Replacement Parts */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1">
                        <Wrench className="h-3.5 w-3.5 text-amber-600" />
                        <span>Problem & Parts Description</span>
                      </div>
                      <div className="space-y-1 text-slate-700 dark:text-slate-300">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Vehicle Issue / Fault:</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {m.problemDescription}
                          </span>
                        </div>
                        <div className="pt-1 border-t">
                          <span className="text-[10px] text-slate-400 block">Replaced / Serviced Parts:</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            {m.partsReplaced}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Tyre / Battery Serial No:</span>
                          <span className="font-mono font-bold">{m.tyreOrBatterySerial || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Warranty Expiry Date:</span>
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <ShieldCheck className="h-3 w-3" /> {m.warranty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financials Strip */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Parts Cost:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatBDT(m.partsCost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Mechanic Labour Charge:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatBDT(m.labourCost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Repair Expense:</span>
                        <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                          {formatBDT(m.totalCost)}
                        </span>
                      </div>
                      <div className="border-l pl-3 border-amber-200 dark:border-amber-800">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-semibold">
                          In Garage: {m.daysInGarage} Days — Estimated Demurrage:
                        </span>
                        <span className="font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                          {formatBDT(m.demurrage)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      Service Date: {m.date}
                    </div>
                  </div>
                </div>
              ))}

              {activeMaintenanceList.length === 0 && (
                <div className="p-8 text-center space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    All Fleet Trucks Operational
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    All fleet trucks are currently fit and active in service. Click below to record new garage maintenance.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowMaintenanceModal(false);
                  setShowAddServiceModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Send Another Truck to Workshop</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 12: MONTHLY REVENUE REPORT DETAIL ─────────────────── */}
      {showMonthlyRevenueModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowMonthlyRevenueModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Monthly Gross Revenue Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">
                    Period: {selectedMonth !== 'ALL' ? MONTH_NAMES.find((m) => m.code === selectedMonth)?.nameEn : 'All Months'} {selectedYear}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowMonthlyRevenueModal(false)} className="text-slate-400 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900 dark:text-emerald-200">Total Monthly Gross Revenue:</span>
              <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                +{formatBDT(dashboardKpis.monthlyRevenue)}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 font-bold border-b">
                  <tr>
                    <th className="py-2 px-3">Trip / Ref</th>
                    <th className="py-2 px-3">Party & Route</th>
                    <th className="py-2 px-3">Vehicle</th>
                    <th className="py-2 px-3 text-right">Fare (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allTrips
                    .filter((t) => selectedMonth === 'ALL' || (t.date && t.date.startsWith(`${selectedYear}-${selectedMonth}`)))
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono font-bold">{t.tripOrVehicleCode}</td>
                        <td className="py-2 px-3">
                          <div className="font-semibold">{t.customerName}</div>
                          <div className="text-[10px] text-slate-400">{t.origin} ➔ {t.destination}</div>
                        </td>
                        <td className="py-2 px-3 font-bold text-emerald-700">{t.registrationNumber}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatBDT(t.tripRevenue)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowMonthlyRevenueModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 13: MONTHLY EXPENSES REPORT DETAIL ────────────────── */}
      {showMonthlyExpenseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => setShowMonthlyExpenseModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-rose-600" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Monthly Operating Expenses Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">
                    Period: {selectedMonth !== 'ALL' ? MONTH_NAMES.find((m) => m.code === selectedMonth)?.nameEn : 'All Months'} {selectedYear}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowMonthlyExpenseModal(false)} className="text-slate-400 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs">
              <span className="font-bold text-rose-900 dark:text-rose-200">Total Monthly Expenses:</span>
              <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                -{formatBDT(dashboardKpis.monthlyExpenses)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border space-y-2 text-xs">
              <div className="font-bold">Expense Heads Included:</div>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Diesel Fuel & Refueling Invoices</li>
                <li>Bridge Tolls, Ferry Charges & Highway Taxes</li>
                <li>Driver & Helper Trip Khoraki Allowances</li>
                <li>Workshop Repairs, Spare Parts & Battery Replacements</li>
                <li>Traffic & Road Allowances</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowMonthlyExpenseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 14: REAL-WORLD CORPORATE TRANSPORT BILL (A4 Printable Monthly Invoice) ── */}
      {showCorporateBillModal && selectedCorporateBillContract && (
        <CorporateTransportBillModal
          isOpen={showCorporateBillModal}
          onClose={() => {
            setShowCorporateBillModal(false);
            setSelectedCorporateBillContract(null);
          }}
          contract={selectedCorporateBillContract}
          clientTrips={corporateBillTrips}
          businessName="REGARDSAGRO ENTERPRISE"
          businessAddress="Tejgaon Industrial Area, Dhaka-1208, Bangladesh"
          businessPhone="01719714211, 017787779, 01707300599"
          businessEmail="regardsagro747@gmail.com"
          onUpdateTripDemurrage={handleUpdateTripDemurrage}
          onReceivePayment={(clientItem) => {
            setShowCorporateBillModal(false);
            openCollectClientBillModal(clientItem);
          }}
          lang="en"
        />
      )}

      {/* ── MODAL 15: MONTHLY TRUCK PERFORMANCE & INCOME STATEMENT (A4 Printable PDF) ── */}
      {showTruckMonthlyStatementModal && selectedTruckForStatement && (
        <MonthlyTruckStatementModal
          isOpen={showTruckMonthlyStatementModal}
          onClose={() => {
            setShowTruckMonthlyStatementModal(false);
            setSelectedTruckForStatement(null);
          }}
          truck={selectedTruckForStatement}
          allVehicles={allVehicles}
          onSelectTruck={(v) => setSelectedTruckForStatement(v)}
          allTrips={allTrips}
          allFuelLogs={allFuelLogs}
          allMaintLogs={allMaintenanceLogs}
          initialMonth={statementSelectedMonth}
          businessName={activeBusiness?.nameBn || activeBusiness?.name || 'REGARDSAGRO ENTERPRISE'}
          businessAddress="JL Manson 2nd Floor, 7/1 BRDC Road, Tejgaon, Dhaka-1208, Bangladesh"
          businessPhone="01719714211, 017787779, 01707300599"
          businessEmail="regardsagro747@gmail.com"
          lang="en"
        />
      )}
    </div>
  );
}
