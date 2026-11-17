import { getDb } from './mongodb';

export async function seedInitialErpDataIfEmptyMongo(
  ownerId: string,
  actorEmail: string
): Promise<boolean> {
  const db = await getDb();
  const existingBizCount = await db.collection('businesses').countDocuments({ ownerId });
  if (existingBizCount > 0) {
    return false;
  }

  const now = new Date();
  const suffix = ownerId.slice(-6);

  const businesses = [
    {
      _id: `biz-poultry-${suffix}`,
      code: 'BIZ-POULTRY',
      name: 'Poultry Farming',
      nameBn: 'পোল্ট্রি ফার্মিং',
      category: 'Livestock & Poultry',
      templateType: 'poultry',
      description: 'Commercial Broiler, Layer & Sonali batch operations in Gazipur Agro Zone.',
      iconName: 'Bird',
      location: 'Sreepur, Gazipur, Bangladesh',
      contactPhone: '+880 1711-245890',
      managerName: 'Engr. Mahmudul Hasan',
      status: 'active',
      enabledModules:
        'batch_management,daily_mortality,feed_schedule,vaccine_medicine,grading_sales,accounting,inventory',
      customFieldsSpec: 'Shed Capacity: 15,000 Birds | Tunnel Ventilation',
      currency: 'BDT',
      ownerId,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: `biz-cattle-${suffix}`,
      code: 'BIZ-CATTLE',
      name: 'Cattle Farming',
      nameBn: 'গবাদি পশু খামার',
      category: 'Dairy & Beef Fattening',
      templateType: 'cattle',
      description: 'Holstein Friesian & Sahiwal dairy production and premium bull fattening unit.',
      iconName: 'Beef',
      location: 'Savar Dairy Belt, Dhaka',
      contactPhone: '+880 1712-883410',
      managerName: 'Dr. Kamrul Islam (DVM)',
      status: 'active',
      enabledModules:
        'individual_animal,milk_production,vet_vaccination,breeding_pregnancy,calf_tracking,accounting,inventory',
      customFieldsSpec: 'Milking Parlour: DeLaval 12-Point | Chiller: 3000L',
      currency: 'BDT',
      ownerId,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: `biz-goat-${suffix}`,
      code: 'BIZ-GOAT',
      name: 'Goat Farming',
      nameBn: 'ছাগল পালন খামার',
      category: 'Small Ruminant Livestock',
      templateType: 'goat',
      description: 'Purebred Black Bengal & Jamunapari slatted-floor breeding and meat production.',
      iconName: 'ShieldCheck',
      location: 'Kumarkhali, Kushtia, Bangladesh',
      contactPhone: '+880 1819-410299',
      managerName: 'Md. Rafiqul Alam',
      status: 'active',
      enabledModules:
        'individual_goat,family_tree,kids_management,health_vaccination,weight_growth,accounting,inventory',
      customFieldsSpec: 'Slatted Sheds: 4 | PPR Free Certified',
      currency: 'BDT',
      ownerId,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: `biz-fish-${suffix}`,
      code: 'BIZ-FISH',
      name: 'Fish Farming',
      nameBn: 'মৎস্য চাষ প্রকল্প',
      category: 'Aquaculture & Fisheries',
      templateType: 'fish',
      description:
        'Scientific polyculture ponds (Rui, Katla, Monosex Tilapia, Pabda) with automated aerators.',
      iconName: 'Fish',
      location: 'Trishal, Mymensingh, Bangladesh',
      contactPhone: '+880 1715-992011',
      managerName: 'Shahriar Kabir (Fisheries MSc)',
      status: 'active',
      enabledModules:
        'pond_management,production_cycle,water_quality,fingerling_stocking,harvest_sales,accounting,inventory',
      customFieldsSpec: 'Total Water Area: 420 Decimals | Paddle Aerators: 16',
      currency: 'BDT',
      ownerId,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: `biz-trans-${suffix}`,
      code: 'BIZ-TRANS',
      name: 'Truck & Transport Business',
      nameBn: 'ট্রাক ও পরিবহন ব্যবসা',
      category: 'Logistics & Fleet',
      templateType: 'transport',
      description:
        'Covered van, refrigerated milk tanker, and live-bird carrier fleet across Bangladesh.',
      iconName: 'Truck',
      location: 'Tejgaon Industrial Area, Dhaka',
      contactPhone: '+880 1911-334455',
      managerName: 'Capt. (Retd.) Tariqul Islam',
      status: 'active',
      enabledModules:
        'vehicle_fleet,trip_ledger,document_expiry,fuel_toll_tracking,maintenance_service,accounting,inventory',
      customFieldsSpec: 'Active Fleet: 8 Commercial Vehicles | GPS Fleet Telemetry',
      currency: 'BDT',
      ownerId,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.collection('businesses').insertMany(businesses as unknown as never[]);

  const accCashId = `acc-cash-${suffix}`;
  const accBankIslamiId = `acc-bank1-${suffix}`;
  const accBankBracId = `acc-bank2-${suffix}`;
  const accArId = `acc-ar-${suffix}`;
  const accApId = `acc-ap-${suffix}`;
  const accInvId = `acc-inv-${suffix}`;
  const accRevId = `acc-rev-${suffix}`;
  const accExpId = `acc-exp-${suffix}`;
  const accPayId = `acc-pay-${suffix}`;
  const accCapId = `acc-cap-${suffix}`;

  const accounts = [
    { _id: accCashId, code: '1010', name: 'Central Cash in Hand (HQ Vault)', accountType: 'asset', subType: 'cash', businessId: 'ALL', balance: 0, currentBalance: 0, openingBalance: 0 },
    { _id: accBankIslamiId, code: '1020', name: 'Islami Bank PLC — Corporate A/C', accountType: 'asset', subType: 'bank', businessId: 'ALL', balance: 0, currentBalance: 0, openingBalance: 0 },
    { _id: accBankBracId, code: '1025', name: 'BRAC Bank PLC — Agro SME A/C', accountType: 'asset', subType: 'bank', businessId: 'ALL', balance: 0, currentBalance: 0, openingBalance: 0 },
    { _id: accArId, code: '1100', name: 'Accounts Receivable (Wholesale Buyers)', accountType: 'asset', subType: 'receivable', businessId: 'ALL', balance: 0, currentBalance: 0, openingBalance: 0 },
    { _id: accInvId, code: '1200', name: 'Feed, Medicine & Biological Inventory', accountType: 'asset', subType: 'inventory', businessId: 'ALL', balance: 0, currentBalance: 0, openingBalance: 0 },
    { _id: accApId, code: '2010', name: 'Accounts Payable (Feed & Vet Suppliers)', accountType: 'liability', subType: 'payable', businessId: 'ALL', balance: 0, currentBalance: 0, openingBalance: 0 },
    { _id: accCapId, code: '3010', name: 'Sponsor Equity & Retained Capital', accountType: 'equity', subType: 'capital', businessId: 'ALL', balance: 0, currentBalance: 0, openingBalance: 0 },
    { _id: accRevId, code: '4010', name: 'Operating Sales & Freight Revenue', accountType: 'revenue', subType: 'operating_revenue', businessId: 'ALL', balance: 0, currentBalance: 0, openingBalance: 0 },
    { _id: accExpId, code: '5010', name: 'Direct Farm, Feed, Vet & Fleet Expenses', accountType: 'expense', subType: 'operating_expense', businessId: 'ALL', balance: 0, currentBalance: 0, openingBalance: 0 },
    { _id: accPayId, code: '5020', name: 'Staff Salaries & Farm Wages', accountType: 'expense', subType: 'payroll', businessId: 'ALL', balance: 0, currentBalance: 0, openingBalance: 0 },
  ].map((a) => ({
    ...a,
    currency: 'BDT',
    isActive: true,
    ownerId,
    createdAt: now,
    updatedAt: now,
  }));

  await db.collection('accounts').insertMany(accounts as unknown as never[]);

  await db.collection('audit_logs').insertOne({
    _id: `aud-init-${suffix}`,
    action: 'INITIALIZE_ENTERPRISE_ERP',
    module: 'System Architecture',
    businessId: 'ALL',
    details:
      'Provisioned 5 core agro businesses and central chart of accounts with clean ৳0 balance.',
    severity: 'info',
    actorEmail: actorEmail.slice(0, 160),
    ownerId,
    createdAt: now,
  } as unknown as never);

  return true;
}

