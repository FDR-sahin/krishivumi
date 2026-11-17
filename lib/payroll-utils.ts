import { ErpStakeholder, ErpUser, ErpBusiness, formatBDT } from './erp-types';

export interface PayrollCycleInfo {
  currentYear: number;
  currentMonthNameBn: string;
  currentMonthNameEn: string;
  daysInMonth: number;
  currentDay: number;
  daysRemaining: number;
  isThreeDaysBeforeMonthEnd: boolean;
  joiningDateStr: string;
  isJoinedCurrentMonth: boolean;
  daysWorkedInCurrentMonth: number;
  monthlyAgreedSalary: number;
  payableForCurrentMonth: number;
  isProrated: boolean;
  cycleStatus: 'paid' | 'accruing' | 'due_for_payout' | 'overdue';
  statusBadgeBn: string;
  statusBadgeEn: string;
  statusColor: string;
}

const MONTH_NAMES_BN = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getPayrollCycleInfo(
  joiningDateRaw?: string,
  monthlySalary: number = 0,
  paidAmountThisPeriod: number = 0,
  referenceDate: Date = new Date(),
  forceSimulation: boolean = false
): PayrollCycleInfo {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemaining = daysInMonth - currentDay;

  const currentMonthNameBn = MONTH_NAMES_BN[currentMonth];
  const currentMonthNameEn = MONTH_NAMES_EN[currentMonth];

  // 3-day reminder is triggered on or after (daysInMonth - 3), e.g. 28th, 29th, 30th/31st of month
  const isThreeDaysBeforeMonthEnd = forceSimulation || daysRemaining <= 3;

  // Determine joining date
  const cleanJoin = String(joiningDateRaw || '').trim().split('T')[0];
  const joinMatch = cleanJoin.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let isJoinedCurrentMonth = false;
  let daysWorkedInCurrentMonth = daysInMonth;
  let joiningDateStr = cleanJoin || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

  if (joinMatch) {
    const jYear = Number(joinMatch[1]);
    const jMonth = Number(joinMatch[2]) - 1;
    const jDay = Number(joinMatch[3]);

    if (jYear === currentYear && jMonth === currentMonth) {
      isJoinedCurrentMonth = true;
      daysWorkedInCurrentMonth = Math.max(1, daysInMonth - jDay + 1);
    } else if (jYear > currentYear || (jYear === currentYear && jMonth > currentMonth)) {
      // Future date edge case
      daysWorkedInCurrentMonth = 0;
    }
  }

  const isProrated = isJoinedCurrentMonth && daysWorkedInCurrentMonth < daysInMonth;
  const payableForCurrentMonth = isProrated
    ? Math.round((monthlySalary / daysInMonth) * daysWorkedInCurrentMonth)
    : monthlySalary;

  let cycleStatus: 'paid' | 'accruing' | 'due_for_payout' | 'overdue' = 'accruing';
  let statusBadgeBn = 'কার্যকাল চলমান';
  let statusBadgeEn = 'Accruing';
  let statusColor = 'text-blue-700 bg-blue-500/10 border-blue-500/20';

  if (paidAmountThisPeriod >= payableForCurrentMonth && payableForCurrentMonth > 0) {
    cycleStatus = 'paid';
    statusBadgeBn = `✓ ${currentMonthNameBn} পরিশোধিত (${formatBDT(paidAmountThisPeriod)})`;
    statusBadgeEn = `✓ ${currentMonthNameEn} Paid (${formatBDT(paidAmountThisPeriod)})`;
    statusColor = 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  } else if (paidAmountThisPeriod > 0) {
    cycleStatus = 'due_for_payout';
    const remainingDue = payableForCurrentMonth - paidAmountThisPeriod;
    statusBadgeBn = `আংশিক প্রদত্ত (বাকি ${formatBDT(remainingDue)})`;
    statusBadgeEn = `Partial (Remaining ${formatBDT(remainingDue)})`;
    statusColor = 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else if (isThreeDaysBeforeMonthEnd) {
    cycleStatus = 'due_for_payout';
    statusBadgeBn = `🔔 বেতন প্রদানের সময় হয়েছে (${formatBDT(payableForCurrentMonth)})`;
    statusBadgeEn = `🔔 Payroll Due Now (${formatBDT(payableForCurrentMonth)})`;
    statusColor = 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30 animate-pulse';
  } else if (isJoinedCurrentMonth) {
    cycleStatus = 'accruing';
    statusBadgeBn = `চলমান কার্যদিবস: ${daysWorkedInCurrentMonth} দিন (${formatBDT(payableForCurrentMonth)})`;
    statusBadgeEn = `Active Days: ${daysWorkedInCurrentMonth}d (${formatBDT(payableForCurrentMonth)})`;
    statusColor = 'text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/20';
  } else {
    cycleStatus = 'accruing';
    statusBadgeBn = `${currentMonthNameBn} মাসের কার্যকাল চলমান`;
    statusBadgeEn = `${currentMonthNameEn} Month in Progress`;
    statusColor = 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  }

  return {
    currentYear,
    currentMonthNameBn,
    currentMonthNameEn,
    daysInMonth,
    currentDay,
    daysRemaining,
    isThreeDaysBeforeMonthEnd,
    joiningDateStr,
    isJoinedCurrentMonth,
    daysWorkedInCurrentMonth,
    monthlyAgreedSalary: monthlySalary,
    payableForCurrentMonth,
    isProrated,
    cycleStatus,
    statusBadgeBn,
    statusBadgeEn,
    statusColor,
  };
}

export interface EnterprisePayrollSummary {
  staffCount: number;
  totalStaffBudget: number;
  managerCount: number;
  totalManagerBudget: number;
  grandTotalMonthlyPayroll: number;
  daysRemaining: number;
  isThreeDaysBeforeMonthEnd: boolean;
  divisionBreakdown: {
    bizId: string;
    bizName: string;
    bizNameBn: string;
    staffCount: number;
    totalBudget: number;
    managerName: string;
    managerSalary: number;
  }[];
  alertTitleBn: string;
  alertTitleEn: string;
  alertMessageBn: string;
  alertMessageEn: string;
}

export function getEnterprisePayrollSummary(
  stakeholders: ErpStakeholder[] = [],
  erpUsers: ErpUser[] = [],
  businesses: ErpBusiness[] = [],
  referenceDate: Date = new Date(),
  forceSimulation: boolean = false
): EnterprisePayrollSummary {
  const activeStaff = stakeholders.filter(
    (s) => s.stakeholderType === 'employee' && s.status === 'active'
  );
  const activeManagers = erpUsers.filter(
    (u) => u.role === 'business_manager' && u.status === 'active'
  );

  const totalStaffBudget = activeStaff.reduce(
    (sum, s) => sum + (s.monthlySalaryOrCreditLimit || 0),
    0
  );
  const totalManagerBudget = activeManagers.reduce(
    (sum, u) => sum + (u.monthlySalary || 35000),
    0
  );
  const grandTotalMonthlyPayroll = totalStaffBudget + totalManagerBudget;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemaining = daysInMonth - currentDay;
  const isThreeDaysBeforeMonthEnd = forceSimulation || daysRemaining <= 3;

  const divisionBreakdown = businesses.map((biz) => {
    const bizStaff = activeStaff.filter(
      (s) =>
        s.businessId === biz.id ||
        (biz.templateType === 'poultry' && (s.businessId?.includes('biz-poultry') || s.businessName?.toLowerCase().includes('poultry'))) ||
        (biz.templateType === 'cattle' && (s.businessId?.includes('biz-cattle') || s.businessName?.toLowerCase().includes('cattle') || s.businessName?.includes('গরু'))) ||
        (biz.templateType === 'goat' && (s.businessId?.includes('biz-goat') || s.businessName?.toLowerCase().includes('goat') || s.businessName?.includes('ছাগল'))) ||
        (biz.templateType === 'fish' && (s.businessId?.includes('biz-fish') || s.businessName?.toLowerCase().includes('fish') || s.businessName?.includes('মাছ'))) ||
        (biz.templateType === 'transport' && (s.businessId?.includes('biz-trans') || s.businessName?.toLowerCase().includes('transport') || s.businessName?.includes('ট্রাক')))
    );
    const bizMgr = activeManagers.find(
      (u) => u.assignedBusinesses === 'ALL' || u.assignedBusinesses?.includes(biz.id)
    );

    const bSalary = bizStaff.reduce((sum, s) => sum + (s.monthlySalaryOrCreditLimit || 0), 0);
    const mMgrSalary = bizMgr?.monthlySalary || 35000;

    return {
      bizId: biz.id,
      bizName: biz.name,
      bizNameBn: biz.nameBn || biz.name,
      staffCount: bizStaff.length,
      totalBudget: bSalary,
      managerName: biz.managerName || bizMgr?.displayName || 'মোঃ রফিকুল ইসলাম',
      managerSalary: mMgrSalary,
    };
  });

  const monthBn = MONTH_NAMES_BN[currentMonth];
  const monthEn = MONTH_NAMES_EN[currentMonth];

  const alertTitleBn = `🔔 মাসিক বেতন পরিশোধের সময় হয়েছে (${monthBn} ২০২৬)`;
  const alertTitleEn = `🔔 Monthly Payroll Due Notice (${monthEn} 2026)`;

  const alertMessageBn = `চলতি মাসের আর মাত্র ${Math.max(1, daysRemaining)} দিন বাকি! ৫টি ব্যবসা ও ৫ জন বিজনেস ম্যানেজারের মোট ${activeStaff.length + activeManagers.length} জন জনবলের সর্বমোট বেতন ${formatBDT(grandTotalMonthlyPayroll)} পরিশোধের সময় হয়েছে। ক্যাশ ভল্ট ও ব্যাংক ব্যালেন্স যাচাই করে পে-রোল অনুমোদন দিন।`;
  const alertMessageEn = `Only ${Math.max(1, daysRemaining)} days remaining this month! Total payroll of ${formatBDT(grandTotalMonthlyPayroll)} across ${activeStaff.length + activeManagers.length} staff & division managers is ready for executive approval and disbursement.`;

  return {
    staffCount: activeStaff.length,
    totalStaffBudget,
    managerCount: activeManagers.length,
    totalManagerBudget,
    grandTotalMonthlyPayroll,
    daysRemaining,
    isThreeDaysBeforeMonthEnd,
    divisionBreakdown,
    alertTitleBn,
    alertTitleEn,
    alertMessageBn,
    alertMessageEn,
  };
}
