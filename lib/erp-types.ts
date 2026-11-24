import { z } from 'zod';

export const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export type UserRole = 'super_admin' | 'super_manager' | 'business_manager' | 'employee';
export type BusinessTemplateType = 'poultry' | 'cattle' | 'goat' | 'fish' | 'transport' | 'custom';

export interface PermissionMatrix {
  canCreateBusiness: boolean;
  canManageUsers: boolean;
  canManageManagers?: boolean;
  canManageEmployees?: boolean;
  canViewConsolidatedProfit: boolean;
  canPostAccounting: boolean;
  canReverseTransactions: boolean;
  canManageInventory: boolean;
  canDeleteRecords: boolean;
  allowedModules: string[];
}

export interface ErpUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedBusinesses: string; // comma-separated business codes or 'ALL'
  permissionsJson: string; // JSON string of PermissionMatrix
  status: 'active' | 'suspended' | 'invited';
  mfaEnabled: boolean;
  lastLoginAt: string;
  ownerId: string;
  appointedBy?: string;
  appointedByRole?: UserRole;
  phone?: string;
  monthlySalary?: number;
  photoUrl?: string;
  nidNumber?: string;
  designation?: string;
  address?: string;
  emergencyContact?: string;
  createdAt?: string;
}

export interface ErpBusiness {
  id: string;
  code: string;
  name: string;
  nameBn: string;
  category: string;
  templateType: BusinessTemplateType;
  description: string;
  iconName: string;
  location: string;
  contactPhone: string;
  managerName: string;
  status: 'active' | 'inactive' | 'archived';
  enabledModules: string; // comma-separated modules
  customFieldsSpec: string; // comma-separated or JSON custom fields
  currency: string;
  ownerId: string;
}

export interface ErpAccount {
  id: string;
  code: string;
  name: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subType:
    | 'cash'
    | 'bank'
    | 'receivable'
    | 'payable'
    | 'inventory'
    | 'loan'
    | 'operating_revenue'
    | 'operating_expense'
    | 'payroll'
    | 'capital';
  businessId: string; // 'ALL' or specific business id/code
  balance: number;
  currency: string;
  isActive: boolean;
  ownerId: string;
}

export interface ErpJournalEntry {
  id: string;
  referenceNo: string;
  date: string;
  businessId: string;
  businessName: string;
  transactionType:
    | 'income'
    | 'expense'
    | 'purchase'
    | 'sale'
    | 'cash_to_bank'
    | 'bank_to_cash'
    | 'payroll'
    | 'reversal'
    | 'adjustment';
  category: string;
  description: string;
  debitAccountId: string;
  debitAccountName: string;
  creditAccountId: string;
  creditAccountName: string;
  amount: number;
  paymentStatus: 'paid' | 'partial' | 'due';
  dueAmount: number;
  counterpartyName: string;
  status: 'posted' | 'reversed';
  reversedByEntryId: string;
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  actorDesignation?: string;
  actorPhoto?: string;
  ownerId: string;
}

export interface ErpInventoryItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category:
    | 'feed'
    | 'medicine'
    | 'vaccine'
    | 'seed_fingerling'
    | 'equipment'
    | 'fertilizer'
    | 'fuel_parts'
    | 'finished_goods'
    | 'other';
  businessId: string;
  businessName: string;
  warehouse: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  sellingPrice: number;
  expiryDate: string;
  supplierName: string;
  ownerId: string;
}

export interface ErpStockMovement {
  id: string;
  itemId: string;
  itemName: string;
  businessId: string;
  movementType: 'purchase' | 'consumption' | 'sale' | 'transfer' | 'adjustment';
  quantity: number;
  unitCost: number;
  sourceLocation: string;
  destinationLocation: string;
  notes: string;
  date: string;
  ownerId: string;
}

export interface ErpStakeholder {
  id: string;
  stakeholderType: 'employee' | 'supplier' | 'customer';
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  businessId: string;
  businessName: string;
  designationOrCategory: string;
  monthlySalaryOrCreditLimit: number;
  outstandingBalance: number;
  status: 'active' | 'inactive' | 'terminated';
  appointedBy?: string;
  appointedByRole?: UserRole;
  appointedAt?: string;
  joiningDate?: string;
  salaryEffectiveFrom?: string;
  photoUrl?: string;
  nidNumber?: string;
  emergencyContact?: string;
  notes?: string;
  createdAt?: string;
  ownerId: string;
}

export interface ErpPoultryBatch {
  id: string;
  batchCode: string;
  businessId: string;
  chickPurchaseDate: string;
  chickenType: 'Broiler' | 'Layer' | 'Sonali' | 'Deshi' | 'Breeder';
  shedNumber: string;
  supplierName: string;
  initialQuantity: number;
  mortalityCount: number;
  sickBirdsCount: number;
  soldBirdsCount: number;
  purchaseCost: number;
  starterFeedKg: number;
  growerFeedKg: number;
  finisherFeedKg: number;
  feedCost: number;
  medicineCost: number;
  labourAndUtilityCost: number;
  otherExpense: number;
  totalSoldKg: number;
  gradeBreakdown: string;
  pricePerKg: number;
  totalSalesRevenue: number;
  outstandingDue: number;
  vaccineScheduleNotes: string;
  status: 'active' | 'harvested' | 'closed';
  ownerId: string;
}

export interface ErpLivestockRecord {
  id: string;
  animalTag: string;
  species: 'cattle' | 'goat';
  businessId: string;
  name: string;
  breed: string;
  gender: 'Male' | 'Female';
  ageMonths: number;
  purchaseDate: string;
  purchasePrice: number;
  currentWeightKg: number;
  healthStatus: 'Healthy' | 'Under Observation' | 'Treatment' | 'Pregnant' | 'Lactating' | 'Sold';
  feedCost: number;
  medicineAndVetCost: number;
  vaccinationHistory: string;
  breedingAndOffspringNotes: string;
  parentTag: string;
  totalMilkLiters: number;
  milkSalesRevenue: number;
  animalSalePrice: number;
  status: 'active' | 'sold' | 'deceased';
  ownerId: string;
}

export interface ErpFishCycle {
  id: string;
  cycleCode: string;
  pondId: string;
  pondName: string;
  businessId: string;
  areaDecimals: number;
  depthFeet: number;
  location: string;
  waterQualityNotes: string;
  fishSpecies: string;
  stockingDate: string;
  initialQuantity: number;
  mortalityCount: number;
  fingerlingCost: number;
  feedCost: number;
  medicineAndLimeCost: number;
  labourCost: number;
  harvestDate: string;
  harvestWeightKg: number;
  totalSalesRevenue: number;
  status: 'active' | 'harvested' | 'fallow';
  ownerId: string;
}

export interface ErpTransportOp {
  id: string;
  tripOrVehicleCode: string;
  recordType?: 'trip' | 'vehicle' | 'vehicle_maintenance' | 'fuel' | 'driver' | 'expense' | string;
  businessId: string;
  registrationNumber: string;
  vehicleType: string;
  truckName?: string;
  brand?: string;
  model?: string;
  manufacturingYear?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  chassisNumber?: string;
  engineNumber?: string;
  fuelType?: string;
  currentOdometer?: number;
  driverName: string;
  driverPhone?: string;
  receiverPhone?: string;
  orderNumber?: string;
  driverAddress?: string;
  driverNid?: string;
  driverLicense?: string;
  licenseExpiry?: string;
  joiningDate?: string;
  driverMonthlySalary?: number;
  driverAllowance?: number;
  salaryAdvance?: number;
  salaryDue?: number;
  helperName?: string;
  helperAllowance?: number;
  origin: string;
  destination: string;
  route?: string;
  loadingLocation?: string;
  deliveryLocation?: string;
  cargoDetails: string;
  customerName: string;
  distanceKm: number;
  startOdometer?: number;
  endOdometer?: number;
  fuelCost: number;
  fuelLitres?: number;
  fuelRate?: number;
  fuelStation?: string;
  tollCost: number;
  ferryCost?: number;
  driverKhoraki?: number;
  policeRoadCost?: number;
  labourLoadingCost?: number;
  brokerName?: string;
  brokerCommissionRate?: number;
  returnLoadingPoint?: string;
  returnUnloadingPoint?: string;
  returnFare?: number;
  returnDriverCash?: number;
  // Garments & Corporate Dedicated Fleet Contracts
  clientName?: string;
  factoryLocation?: string;
  contactPerson?: string;
  contactPhone?: string;
  startDate?: string;
  billingType?: 'day_trip' | 'monthly' | string;
  agreedRate?: number;
  assignedTrucks?: string[];
  assignedTrucksJson?: string;
  assignedGarments?: string;
  contractStatus?: 'active' | 'paused' | 'completed' | string;

  truckBodyType?: 'open' | 'covered' | 'trailer' | 'pickup' | string;
  capacityTons?: number;
  tyreOrBatterySerial?: string;
  warrantyExpiryDate?: string;
  commission?: number;
  driverCommission?: number;
  tripExpense?: number;
  estimatedTripFare?: number;
  advancePaid?: number;
  expenseCategory?: string;
  expenseDescription?: string;
  maintenanceCost: number;
  maintenanceDetails: string;
  garageName?: string;
  garageAddress?: string;
  mechanicName?: string;
  mechanicPhone?: string;
  problemDescription?: string;
  partsReplaced?: string;
  partsCost?: number;
  labourCost?: number;
  otherCosts?: number;
  serviceWarranty?: string;
  tripRevenue: number;
  advanceReceived?: number;
  remainingDue?: number;
  outstandingDue: number;
  netIncome?: number;
  taxTokenNumber?: string;
  taxTokenExpiry: string;
  fitnessNumber?: string;
  fitnessExpiry: string;
  insuranceNumber?: string;
  insuranceExpiry: string;
  routePermitNumber?: string;
  routePermitExpiry?: string;
  nextServiceDate: string;
  nextServiceKm?: number;
  date: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  status: 'active' | 'completed' | 'maintenance' | 'available' | 'inactive' | 'planned' | 'cancelled' | string;
  imageUrl?: string;
  paymentMethod?: 'cash' | 'bank' | string;
  paymentAccountId?: string;
  remarks?: string;
  ownerId: string;
}

export interface ErpAuditLog {
  id: string;
  action: string;
  module: string;
  businessId: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
  actorEmail: string;
  actorName?: string;
  actorPhoto?: string;
  actorDesignation?: string;
  actorRole?: string;
  ownerId: string;
  createdAt?: unknown;
}

export interface ErpNotification {
  id: string;
  title: string;
  message: string;
  category:
    | 'low_inventory'
    | 'medicine_expiry'
    | 'vaccination'
    | 'animal_health'
    | 'payroll'
    | 'receivable'
    | 'vehicle_doc'
    | 'maintenance'
    | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  businessId: string;
  isRead: boolean;
  ownerId: string;
}

// Validation Schemas synchronized with firebase-blueprint.json
export const BusinessInputSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  nameBn: z.string().max(120).default(''),
  category: z.string().min(1).max(64),
  templateType: z.enum(['poultry', 'cattle', 'goat', 'fish', 'transport', 'custom']),
  description: z.string().max(500).default(''),
  iconName: z.string().min(1).max(40),
  location: z.string().max(160).default(''),
  contactPhone: z.string().max(40).default(''),
  managerName: z.string().max(100).default(''),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  enabledModules: z.string().max(600),
  customFieldsSpec: z.string().max(1500).default(''),
  currency: z.string().min(1).max(10).default('BDT'),
});

export const JournalEntryInputSchema = z.object({
  referenceNo: z.string().min(1).max(64),
  date: z.string().min(1).max(32),
  businessId: z.string().min(1).max(128),
  businessName: z.string().min(1).max(120),
  transactionType: z.enum([
    'income',
    'expense',
    'purchase',
    'sale',
    'cash_to_bank',
    'bank_to_cash',
    'payroll',
    'reversal',
    'adjustment',
  ]),
  category: z.string().min(1).max(80),
  description: z.string().max(400),
  debitAccountId: z.string().min(1).max(128),
  debitAccountName: z.string().min(1).max(120),
  creditAccountId: z.string().min(1).max(128),
  creditAccountName: z.string().min(1).max(120),
  amount: z.number().nonnegative(),
  paymentStatus: z.enum(['paid', 'partial', 'due']),
  dueAmount: z.number().nonnegative(),
  counterpartyName: z.string().max(120),
});

export function formatBDT(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('en-IN').format(abs);
  return `${isNegative ? '-' : ''}৳ ${formatted}`;
}

export const BUSINESS_TEMPLATES: {
  templateType: BusinessTemplateType;
  title: string;
  titleBn: string;
  category: string;
  iconName: string;
  defaultModules: string[];
  defaultCustomFields: string[];
  description: string;
}[] = [
  {
    templateType: 'poultry',
    title: 'Poultry Farming',
    titleBn: 'Poultry Farming',
    category: 'Livestock & Poultry',
    iconName: 'Bird',
    defaultModules: ['batch_management', 'daily_mortality', 'feed_schedule', 'vaccine_medicine', 'grading_sales', 'accounting', 'inventory'],
    defaultCustomFields: ['Shed Capacity', 'Ventilation Type', 'Biosecurity Grade'],
    description: 'Complete batch-based broiler, layer, and breeder poultry management with FCR, mortality, starter/grower/finisher feed, and grading sales.',
  },
  {
    templateType: 'cattle',
    title: 'Cattle Farming',
    titleBn: 'Cattle Farming',
    category: 'Dairy & Beef Fattening',
    iconName: 'Beef',
    defaultModules: ['individual_animal', 'milk_production', 'vet_vaccination', 'breeding_pregnancy', 'calf_tracking', 'accounting', 'inventory'],
    defaultCustomFields: ['Milking Parlour ID', 'Ear Tag RFID', 'Lactation Cycle'],
    description: 'Individual cattle tracking (CAT-0001), daily milk production & sales, veterinary history, breeding/pregnancy, and lifetime profitability.',
  },
  {
    templateType: 'goat',
    title: 'Goat Farming',
    titleBn: 'Goat Farming',
    category: 'Small Ruminant Livestock',
    iconName: 'ShieldCheck',
    defaultModules: ['individual_goat', 'family_tree', 'kids_management', 'health_vaccination', 'weight_growth', 'accounting', 'inventory'],
    defaultCustomFields: ['Sire Tag', 'Dam Tag', 'Slatted Floor Shed'],
    description: 'Individual goat management with lineage family tree, Black Bengal & Jamunapari breeding, vaccination, weight tracking, and sales.',
  },
  {
    templateType: 'fish',
    title: 'Fish Farming',
    titleBn: 'Fish Farming',
    category: 'Aquaculture & Fisheries',
    iconName: 'Fish',
    defaultModules: ['pond_management', 'production_cycle', 'water_quality', 'fingerling_stocking', 'harvest_sales', 'accounting', 'inventory'],
    defaultCustomFields: ['Dissolved Oxygen (mg/L)', 'Water pH Level', 'Aerator Count'],
    description: 'Pond-based multi-species aquaculture cycle management with water quality logs (pH, DO, ammonia), feed conversion, and harvest profitability.',
  },
  {
    templateType: 'transport',
    title: 'Truck & Transport Business',
    titleBn: 'Truck & Transport Business',
    category: 'Logistics & Fleet',
    iconName: 'Truck',
    defaultModules: ['vehicle_fleet', 'trip_ledger', 'document_expiry', 'fuel_toll_tracking', 'maintenance_service', 'accounting', 'inventory'],
    defaultCustomFields: ['BRTA Fitness Expiry', 'Tax Token Expiry', 'GPS Tracker ID'],
    description: 'Commercial vehicle fleet management, trip-wise revenue & fuel/toll expenses, BRTA document expiry alerts, and maintenance scheduling.',
  },
  {
    templateType: 'custom',
    title: 'Dairy Products / Agro Processing',
    titleBn: 'Dairy Products / Agro Processing',
    category: 'Agro Processing & Trading',
    iconName: 'Factory',
    defaultModules: ['production_batches', 'quality_control', 'cold_chain_inventory', 'b2b_wholesale', 'accounting', 'inventory'],
    defaultCustomFields: ['BSTI License No', 'Cold Storage Temp (C)', 'Batch Shelf Life'],
    description: 'Configurable enterprise template for Dairy Products, Fish Feed Mill, Rice Trading, Vegetable Wholesale, or Cold Storage operations.',
  },
];

export function formatToEnglishBusiness(name?: string, bizId?: string): string {
  const id = String(bizId || '').trim();
  if (id === 'BIZ-POULTRY-01' || id.includes('POULTRY')) return 'Poultry Farming';
  if (id === 'BIZ-CATTLE-02' || id.includes('CATTLE')) return 'Cattle Farming';
  if (id === 'BIZ-GOAT-03' || id.includes('GOAT')) return 'Goat Farming';
  if (id === 'BIZ-FISH-04' || id.includes('FISH')) return 'Fish Farming';
  if (id === 'BIZ-TRANS-05' || id === 'BIZ-TRAN-06' || id.includes('TRANS')) return 'Truck & Transport Business';

  const n = String(name || '').trim();
  if (!n) return 'Agro Business';
  if (n.includes('পোল্ট্রি') || n.toLowerCase().includes('poultry')) return 'Poultry Farming';
  if (n.includes('গবাদি') || n.includes('গরু') || n.includes('ডেইরি') || n.toLowerCase().includes('cattle')) return 'Cattle Farming';
  if (n.includes('ছাগল') || n.toLowerCase().includes('goat')) return 'Goat Farming';
  if (n.includes('মৎস্য') || n.includes('মাছ') || n.toLowerCase().includes('fish')) return 'Fish Farming';
  if (n.includes('ট্রাক') || n.includes('পরিবহন') || n.toLowerCase().includes('trans')) return 'Truck & Transport Business';
  return n;
}

export function formatToEnglishCategory(cat?: string): string {
  const c = String(cat || '').trim();
  if (!c) return 'General Operation';
  if (c.includes('বাচ্চা') && c.includes('ক্রয়')) return 'Day-Old Chicks (DOC) Purchase';
  if (c.includes('বাচ্চা')) return 'Chicks / Flock Purchase';
  if (c.includes('খাবার') || c.includes('ফিড')) return 'Animal Feed & Nutrition';
  if (c.includes('ওষুধ') || c.includes('ভ্যাকসিন') || c.includes('চিকিৎসা')) return 'Veterinary & Vaccines';
  if (c.includes('বেতন') || c.includes('মজুরি') || c.includes('রিম্যুনারেশন')) return 'Staff Salaries & Wages';
  if (c.includes('ডিজেল') || c.includes('জ্বালানী') || c.includes('ফুয়েল')) return 'Diesel & Fuel';
  if (c.includes('টোল') || c.includes('ঘাট')) return 'Highway Tolls & Transit';
  if (c.includes('চালক') || c.includes('ড্রাইভার')) return 'Driver Allowance';
  if (c.includes('মেরামত') || c.includes('সার্ভিসিং')) return 'Equipment Maintenance';
  if (c.includes('ডিম') && c.includes('বিক্রি')) return 'Egg Sales Revenue';
  if (c.includes('মুরগি') && c.includes('বিক্রি')) return 'Broiler & Poultry Sales';
  if (c.includes('দুধ') && c.includes('বিক্রি')) return 'Dairy & Fresh Milk Sales';
  if (c.includes('মাছ') && c.includes('বিক্রি')) return 'Fish Harvest Sales';
  if (c.includes('গরু') && c.includes('বিক্রি')) return 'Cattle & Live Bull Sales';
  if (c.includes('ছাগল') && c.includes('বিক্রি')) return 'Goat & Meat Sales';
  if (c.includes('ট্রাক') || c.includes('ভাড়া') || c.includes('ট্রিপ')) return 'Commercial Freight Revenue';
  if (c.includes('বাকি আদায়') || c.includes('Due Collection')) return 'Customer Due Collection (Accounts Receivable)';
  if (c.includes('সাপ্লায়ার পাওনা') || c.includes('Due Settlement')) return 'Supplier Due Settlement (Accounts Payable)';
  if (c.includes('বিক্রি') || c.includes('আয়')) return c.replace(/বিক্রি|আয়/g, 'Sales / Revenue');
  if (c.includes('খরচ') || c.includes('ব্যয়')) return c.replace(/খরচ|ব্যয়/g, 'Operational Cost');
  return c;
}

export function formatToEnglishDescription(desc?: string, fallbackCat?: string): string {
  let d = String(desc || '').trim();
  if (!d) return formatToEnglishCategory(fallbackCat);
  d = d.replace(/পোল্ট্রি ফার্মিং/g, 'Poultry Farming')
       .replace(/গবাদি পশু খামার/g, 'Cattle Farming')
       .replace(/ছাগল পালন খামার/g, 'Goat Farming')
       .replace(/মৎস্য চাষ প্রকল্প/g, 'Fish Farming')
       .replace(/ট্রাক ও পরিবহন ব্যবসা/g, 'Truck & Transport Business');
  d = d.replace(/পণ্য বিক্রি \(Sales\)/g, 'Product Sales')
       .replace(/পণ্য বিক্রি/g, 'Product Sales')
       .replace(/খামার খরচ \(Expense\)/g, 'Operating Expense')
       .replace(/খামার খরচ/g, 'Farm Operating Cost')
       .replace(/মুরগি বিক্রি/g, 'Broiler Sales')
       .replace(/ডিম বিক্রি/g, 'Egg Sales')
       .replace(/দুধ বিক্রি/g, 'Milk Sales')
       .replace(/মাছ বিক্রি/g, 'Fish Harvest Sales')
       .replace(/গরু বিক্রি/g, 'Cattle Sales')
       .replace(/ছাগল বিক্রি/g, 'Goat Sales')
       .replace(/ট্রিপ ভাড়া/g, 'Trip Freight Fare')
       .replace(/ফিড ক্রয়/g, 'Feed Purchase')
       .replace(/খাবার ক্রয়/g, 'Animal Feed Purchase')
       .replace(/ওষুধ ক্রয়/g, 'Medicine / Vet Purchase')
       .replace(/ডিজেল/g, 'Diesel Fuel')
       .replace(/বেতন প্রদান/g, 'Salary Payment')
       .replace(/বাকি আদায়/g, 'Due Collection')
       .replace(/সাপ্লায়ার পরিশোধ/g, 'Supplier Payment')
       .replace(/মালিকের ডিপোজিট/g, 'Owner Capital Deposit')
       .replace(/নগদ জমা/g, 'Cash Deposit')
       .replace(/ব্যাংক ট্রান্সফার/g, 'Bank Transfer')
       .replace(/খরচ বাবদ/g, 'Expense for')
       .replace(/বিক্রি বাবদ/g, 'Sales revenue for')
       .replace(/বাবদ/g, 'for')
       .replace(/হিসাব/g, 'Account');
  return d;
}

export function formatToEnglishAccount(accName?: string, code?: string): string {
  const n = String(accName || '').trim();
  const c = String(code || '').trim();
  if (c === '1010' || n.includes('নগদ') || n.includes('ক্যাশ')) return 'Central Cash in Hand (HQ Vault)';
  if (c === '1020' || n.includes('ইসলামী') || n.includes('Islami')) return 'Islami Bank PLC — Corporate A/C';
  if (c === '1025' || n.includes('ব্র্যাক') || n.includes('BRAC')) return 'BRAC Bank PLC — Agro SME A/C';
  if (c === '1100' || n.includes('বাকী') || n.includes('বাকি') || n.includes('Receivable')) return 'Accounts Receivable (Wholesale Buyers)';
  if (c === '1200' || n.includes('মজুত') || n.includes('ইনভেন্টরি') || n.includes('Inventory')) return 'Feed, Medicine & Biological Inventory';
  if (c === '2010' || n.includes('পাওনাদার') || n.includes('Payable')) return 'Accounts Payable (Feed & Vet Suppliers)';
  if (c === '3010' || n.includes('মূলধন') || n.includes('Equity')) return 'Sponsor Equity & Retained Capital';
  if (c === '4010' || n.includes('বিক্রি') || n.includes('আয়') || n.includes('Revenue')) return 'Operating Sales & Freight Revenue';
  if (c === '5010' || n.includes('খরচ') || n.includes('ব্যয়') || n.includes('Expense')) return 'Direct Farm, Feed, Vet & Fleet Expenses';
  if (c === '5020' || n.includes('বেতন') || n.includes('Payroll')) return 'Staff Salaries & Farm Wages';
  return n;
}

export function formatToEnglishParty(party?: string): string {
  const p = String(party || '').trim();
  if (p === 'পাইকারি ক্রেতা') return 'Wholesale Buyer';
  if (p === 'সাপ্লায়ার' || p === 'সাপ্লায়ার') return 'Supplier / Vendor';
  if (p === 'দোকানের নাম') return 'Retail Outlet';
  return p;
}

export function formatToEnglishDesignation(desig?: string): string {
  const d = String(desig || '').trim();
  if (d.includes('স্বত্বাধিকারী') || d.includes('চেয়ারম্যান')) return 'Owner & Chairman';
  if (d.includes('জেনারেল ম্যানেজার') || d.includes('COO')) return 'General Manager (COO)';
  if (d.includes('ম্যানেজার') || d.includes('ইনচার্জ')) return 'Branch Manager';
  if (d.includes('কর্মী') || d.includes('লেবার')) return 'Farm Staff';
  if (d.includes('ড্রাইভার') || d.includes('চালক')) return 'Fleet Driver';
  return d;
}
