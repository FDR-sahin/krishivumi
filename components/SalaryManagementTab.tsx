'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  Wallet,
  Landmark,
  Banknote,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Download,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building2,
  ChevronDown,
  UserPlus,
  FileSpreadsheet,
  X,
  CreditCard,
  RefreshCw,
  Edit,
  UserCheck,
  Eye,
  History,
  FileText
} from 'lucide-react';
import {
  ErpBusiness,
  ErpAccount,
  ErpJournalEntry,
  ErpStakeholder,
  ErpUser,
  UserRole,
  formatBDT,
  formatToEnglishBusiness,
  formatToEnglishDesignation,
} from '@/lib/erp-types';
import { settleStakeholderPayment, createStakeholderRecord, updateStakeholderRecord } from '@/lib/erp-service';

const formatCompactBDT = (amt: number): string => {
  if (amt >= 10000000) return `৳${(amt / 10000000).toFixed(1)}Cr`;
  if (amt >= 100000) return `৳${(amt / 100000).toFixed(1)}L`;
  if (amt >= 1000) return `৳${(amt / 1000).toFixed(1)}k`;
  return `৳${amt}`;
};

export interface SalaryManagementTabProps {
  businesses: ErpBusiness[];
  allBusinesses?: ErpBusiness[];
  accounts: ErpAccount[];
  journalEntries: ErpJournalEntry[];
  stakeholders: ErpStakeholder[];
  erpUsers?: ErpUser[];
  currentUser?: ErpUser;
  userRole: UserRole;
  assignedBusinessFilter: string;
  lang?: 'en' | 'bn';
  onShowNotice?: (msg: string) => void;
  onShowError?: (msg: string) => void;
  onRefreshData?: () => void;
  onOpenProfile?: (email?: string, name?: string, role?: string) => void;
  onSetActiveSlip?: (slip: any) => void;
}

const MONTH_OPTIONS = [
  { code: '01', nameEn: 'January', nameBn: 'জানুয়ারি' },
  { code: '02', nameEn: 'February', nameBn: 'ফেব্রুয়ারি' },
  { code: '03', nameEn: 'March', nameBn: 'মার্চ' },
  { code: '04', nameEn: 'April', nameBn: 'এপ্রিল' },
  { code: '05', nameEn: 'May', nameBn: 'মে' },
  { code: '06', nameEn: 'June', nameBn: 'জুন' },
  { code: '07', nameEn: 'July', nameBn: 'জুলাই' },
  { code: '08', nameEn: 'August', nameBn: 'আগস্ট' },
  { code: '09', nameEn: 'September', nameBn: 'সেপ্টেম্বর' },
  { code: '10', nameEn: 'October', nameBn: 'অক্টোবর' },
  { code: '11', nameEn: 'November', nameBn: 'নভেম্বর' },
  { code: '12', nameEn: 'December', nameBn: 'ডিসেম্বর' },
];

const YEAR_OPTIONS = ['2025', '2026', '2027'];

export default function SalaryManagementTab({
  businesses,
  allBusinesses = [],
  accounts,
  journalEntries,
  stakeholders,
  erpUsers = [],
  currentUser,
  userRole,
  assignedBusinessFilter,
  lang = 'en',
  onShowNotice,
  onShowError,
  onRefreshData,
  onOpenProfile,
  onSetActiveSlip,
}: SalaryManagementTabProps) {
  const bn = false;

  // 1. Role-based Business List
  const isBusinessManager = userRole === 'business_manager';
  const bmAssignedBizId =
    assignedBusinessFilter !== 'ALL'
      ? assignedBusinessFilter
      : currentUser?.assignedBusinesses?.split(',')[0]?.trim() || '';

  const accessibleBusinesses = useMemo(() => {
    if (isBusinessManager && bmAssignedBizId) {
      const match = (allBusinesses.length > 0 ? allBusinesses : businesses).filter(
        (b) => b.id === bmAssignedBizId || (currentUser?.assignedBusinesses && currentUser.assignedBusinesses.includes(b.id))
      );
      return match.length > 0 ? match : businesses;
    }
    return businesses.length > 0 ? businesses : allBusinesses;
  }, [isBusinessManager, bmAssignedBizId, businesses, allBusinesses, currentUser]);

  // Main Sub-tabs: 'employees' | 'monthly' | 'payment' | 'due' | 'reports' | 'dues_legacy'
  const [activeSubTab, setActiveSubTab] = useState<
    'employees' | 'monthly' | 'payment' | 'due' | 'reports' | 'dues_legacy'
  >('monthly');

  // Shared Global Date Filter for Payroll
  const currentDate = new Date();
  const currentMonthCode = String(currentDate.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(currentDate.getFullYear());

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthCode);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedBizId, setSelectedBizId] = useState<string>(
    isBusinessManager && bmAssignedBizId ? bmAssignedBizId : 'ALL'
  );

  // Common Search & Filters
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'terminated'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [reportMethodFilter, setReportMethodFilter] = useState<'all' | 'cash' | 'bank'>('all');

  // Modals state
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<ErpStakeholder | null>(null);

  // Salary Payment Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTargetEmployee, setPaymentTargetEmployee] = useState<ErpStakeholder | null>(null);
  const [paymentPeriodMonth, setPaymentPeriodMonth] = useState<string>(currentMonthCode);
  const [paymentPeriodYear, setPaymentPeriodYear] = useState<string>(currentYearStr);
  const [paymentSourceType, setPaymentSourceType] = useState<'cash' | 'bank'>('cash');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentBonus, setPaymentBonus] = useState<number>(0);
  const [paymentDeduction, setPaymentDeduction] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentFormError, setPaymentFormError] = useState<string | null>(null);

  // Employee Add/Edit Form State
  const [empName, setEmpName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [empBizId, setEmpBizId] = useState(accessibleBusinesses[0]?.id || '');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empDepartment, setEmpDepartment] = useState('');
  const [empManager, setEmpManager] = useState('');
  const [empSalary, setEmpSalary] = useState<number>(20000);
  const [empJoiningDate, setEmpJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [empPhone, setEmpPhone] = useState('+880 1711-000000');
  const [empEmail, setEmpEmail] = useState('');
  const [empAddress, setEmpAddress] = useState('Bangladesh');
  const [empNid, setEmpNid] = useState('');
  const [empEmergency, setEmpEmergency] = useState('');
  const [empStatus, setEmpStatus] = useState<'active' | 'inactive' | 'terminated'>('active');
  const [empNotes, setEmpNotes] = useState('');
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  // Cash and Bank Accounts list
  const cashAccounts = useMemo(() => {
    return accounts.filter((a) => a.subType === 'cash' || a.name.toLowerCase().includes('cash') || a.name.includes('ক্যাশ'));
  }, [accounts]);

  const bankAccounts = useMemo(() => {
    return accounts.filter((a) => a.subType === 'bank' || a.name.toLowerCase().includes('bank') || a.name.includes('ব্যাংক'));
  }, [accounts]);

  const availableWallets = paymentSourceType === 'cash' ? cashAccounts : bankAccounts;

  // Selected Account object
  const currentSelectedAccount = useMemo(() => {
    return availableWallets.find((a) => a.id === selectedAccountId) || availableWallets[0] || null;
  }, [availableWallets, selectedAccountId]);

  // All Employees list
  const allEmployees = useMemo(() => {
    return stakeholders.filter((s) => s.stakeholderType === 'employee');
  }, [stakeholders]);

  // Accessible Employees filtered by RBAC
  const roleFilteredEmployees = useMemo(() => {
    if (isBusinessManager && bmAssignedBizId) {
      return allEmployees.filter(
        (s) => s.businessId === bmAssignedBizId || (currentUser?.assignedBusinesses && currentUser.assignedBusinesses.includes(s.businessId))
      );
    }
    return allEmployees;
  }, [allEmployees, isBusinessManager, bmAssignedBizId, currentUser]);

  // Helper to get Business Name
  const getBusinessName = (bizId?: string, rawName?: string) => {
    return formatToEnglishBusiness(rawName, bizId);
  };

  // Helper to parse salary period and calculate paid amount for an employee in a given month/year
  const getEmployeePaidAmount = (emp: ErpStakeholder, monthCode: string, yearStr: string) => {
    const targetPeriodTag = `${yearStr}-${monthCode}`;
    const targetMonthName = MONTH_OPTIONS.find((m) => m.code === monthCode);
    const monthBn = targetMonthName?.nameBn || '';
    const monthEn = targetMonthName?.nameEn || '';

    const matchingEntries = journalEntries.filter((j) => {
      if (j.transactionType !== 'payroll') return false;
      if (j.status === 'reversed') return false;

      // Match employee by counterpartyName or ID
      const matchesEmp =
        (j.counterpartyName && j.counterpartyName.toLowerCase() === emp.name.toLowerCase()) ||
        (j.description && j.description.includes(emp.name)) ||
        (j.description && j.description.includes(`EMP:${emp.id}`)) ||
        (j.description && j.description.includes(`EMP:${emp.code}`));

      if (!matchesEmp) return false;

      // Check if entry specifies PERIOD tag: e.g. [PERIOD:2026-11]
      const periodMatch = j.description?.match(/\[PERIOD:(\d{4}-\d{2})\]/);
      if (periodMatch) {
        return periodMatch[1] === targetPeriodTag;
      }

      // If no PERIOD tag, check month name in description
      if (j.description && (j.description.includes(monthBn) || j.description.includes(monthEn))) {
        // Also verify year if present
        if (j.description.includes(yearStr) || j.date?.startsWith(yearStr)) {
          return true;
        }
      }

      // Fallback: match by transaction date YYYY-MM
      return j.date && j.date.startsWith(targetPeriodTag);
    });

    return matchingEntries.reduce((sum, j) => sum + (Number(j.amount) || 0), 0);
  };

  // Helper to open Payment Modal prefilled
  const handleOpenPayment = (emp: ErpStakeholder, mCode: string = selectedMonth, yStr: string = selectedYear) => {
    setPaymentTargetEmployee(emp);
    setPaymentPeriodMonth(mCode);
    setPaymentPeriodYear(yStr);

    const paidSoFar = getEmployeePaidAmount(emp, mCode, yStr);
    const remainingDue = Math.max(0, (emp.monthlySalaryOrCreditLimit || 20000) - paidSoFar);

    setPaymentAmount(remainingDue > 0 ? remainingDue : emp.monthlySalaryOrCreditLimit || 20000);
    setPaymentBonus(0);
    setPaymentDeduction(0);
    setPaymentSourceType('cash');
    setSelectedAccountId(cashAccounts[0]?.id || accounts[0]?.id || '');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentReference(`PAY-${emp.code || 'EMP'}-${Date.now().toString().slice(-4)}`);
    setPaymentNote(`Monthly Salary Disbursement for ${emp.name}`);
    setPaymentFormError(null);
    setShowPaymentModal(true);
  };

  // Process Salary Payment Submit
  const handleProcessPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetEmployee) return;

    const netAmount = Math.max(0, paymentAmount + paymentBonus - paymentDeduction);
    if (netAmount <= 0) {
      setPaymentFormError('Payment amount must be greater than zero.');
      return;
    }

    const walletId = selectedAccountId || availableWallets[0]?.id;
    if (!walletId) {
      setPaymentFormError('Please select a valid Cash or Bank Account.');
      return;
    }

    const selectedAcc = accounts.find((a) => a.id === walletId);
    if (selectedAcc && selectedAcc.balance < netAmount) {
      // Warning for insufficient balance
      const proceed = confirm(
        `Warning: Selected account "${selectedAcc.name}" has balance of ${formatBDT(selectedAcc.balance)}, which is less than payment amount ${formatBDT(netAmount)}. Do you still want to proceed?`
      );
      if (!proceed) return;
    }

    // Validation: prevent paying more than remaining due
    const paidSoFar = getEmployeePaidAmount(paymentTargetEmployee, paymentPeriodMonth, paymentPeriodYear);
    const currentDue = Math.max(0, (paymentTargetEmployee.monthlySalaryOrCreditLimit || 0) - paidSoFar);

    if (currentDue > 0 && paymentAmount > currentDue) {
      setPaymentFormError(
        `Payment amount (${formatBDT(paymentAmount)}) cannot exceed the remaining salary due (${formatBDT(currentDue)}) for this period.`
      );
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentFormError(null);

    try {
      const monthObj = MONTH_OPTIONS.find((m) => m.code === paymentPeriodMonth);
      const periodLabel = `${monthObj?.nameEn || 'Month'} ${paymentPeriodYear}`;
      const periodTag = `${paymentPeriodYear}-${paymentPeriodMonth}`;

      // Build structured note
      const formulaParts: string[] = [];
      if (paymentBonus > 0) formulaParts.push(`Bonus/Allowance: +৳${paymentBonus}`);
      if (paymentDeduction > 0) formulaParts.push(`Deduction: -৳${paymentDeduction}`);
      const formulaStr = formulaParts.length > 0 ? ` (${formulaParts.join(', ')})` : '';

      const structuredNote = `[PERIOD:${periodTag}] [EMP:${paymentTargetEmployee.id}] [CODE:${paymentTargetEmployee.code}] [METHOD:${paymentSourceType}] [ACC:${selectedAcc?.name || 'Account'}] ${periodLabel} Salary Disbursement${formulaStr} - ${paymentNote.trim()}`;

      const refNo = await settleStakeholderPayment({
        stakeholderId: paymentTargetEmployee.id,
        walletAccountId: walletId,
        amount: netAmount,
        date: paymentDate,
        note: structuredNote,
      });

      // Generate printable slip
      if (onSetActiveSlip) {
        onSetActiveSlip({
          type: 'salary_payslip',
          slipNo: refNo || paymentReference || `PAY-${Date.now().toString().slice(-6)}`,
          date: paymentDate,
          businessName: paymentTargetEmployee.businessName || getBusinessName(paymentTargetEmployee.businessId),
          recipientName: paymentTargetEmployee.name,
          designation: paymentTargetEmployee.designationOrCategory,
          recipientPhone: paymentTargetEmployee.phone,
          appointedBy: paymentTargetEmployee.appointedBy || 'Management',
          amount: netAmount,
          paymentMethod: selectedAcc ? `${selectedAcc.name} (${paymentSourceType.toUpperCase()})` : paymentSourceType.toUpperCase(),
          note: `${periodLabel} Salary Paid${formulaStr}`,
          totalAmount: netAmount,
          enteredBy: currentUser?.displayName || currentUser?.email || 'Admin',
        });
      }

      setShowPaymentModal(false);
      if (onShowNotice) {
        onShowNotice(
          `Successfully disbursed ${formatBDT(netAmount)} salary to ${paymentTargetEmployee.name} via ${paymentSourceType.toUpperCase()} (${selectedAcc?.name || 'Account'})!`
        );
      }
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setPaymentFormError(err.message || 'Failed to process salary payment.');
      if (onShowError) onShowError(err.message || 'Failed to process salary payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Add/Edit Employee Modal
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmpName('');
    setEmpCode(`EMP-${Math.floor(100 + Math.random() * 900)}`);
    setEmpBizId(accessibleBusinesses[0]?.id || '');
    setEmpDesignation('Farm Incharge');
    setEmpDepartment('Broiler Shed 1');
    setEmpManager(erpUsers.find((u) => u.role === 'business_manager')?.displayName || 'General Manager');
    setEmpSalary(20000);
    setEmpJoiningDate(new Date().toISOString().split('T')[0]);
    setEmpPhone('+880 1711-000000');
    setEmpEmail('');
    setEmpAddress('Agro Complex, Gazipur');
    setEmpNid('');
    setEmpEmergency('+880 1700-000000');
    setEmpStatus('active');
    setEmpNotes('');
    setShowAddEmployeeModal(true);
  };

  const handleOpenEditEmployee = (emp: ErpStakeholder) => {
    setEditingEmployee(emp);
    setEmpName(emp.name);
    setEmpCode(emp.code);
    setEmpBizId(emp.businessId);
    setEmpDesignation(emp.designationOrCategory);

    // Parse department and manager from notes or fields
    const deptMatch = emp.notes?.match(/\[DEPT:(.*?)\]/);
    setEmpDepartment(deptMatch ? deptMatch[1] : 'General Operations');
    setEmpManager(emp.appointedBy || 'General Manager');
    setEmpSalary(emp.monthlySalaryOrCreditLimit || 20000);
    setEmpJoiningDate(emp.joiningDate || emp.appointedAt || new Date().toISOString().split('T')[0]);
    setEmpPhone(emp.phone);
    setEmpEmail(emp.email || '');
    setEmpAddress(emp.address || '');
    setEmpNid(emp.nidNumber || '');
    setEmpEmergency(emp.emergencyContact || '');
    setEmpStatus(emp.status || 'active');
    setEmpNotes(emp.notes || '');
    setShowAddEmployeeModal(true);
  };

  // Save Employee (Create or Update)
  const handleSaveEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) {
      alert('Employee Name is required.');
      return;
    }

    setIsSavingEmployee(true);
    try {
      const targetBiz = (allBusinesses.length > 0 ? allBusinesses : businesses).find((b) => b.id === empBizId);
      const bizName = targetBiz ? targetBiz.name : 'Agro Enterprise';

      // Preserve previous assignment history when editing
      let updatedNotes = empNotes;
      const deptTag = `[DEPT:${empDepartment.trim()}]`;

      if (editingEmployee) {
        const changes: string[] = [];
        if (editingEmployee.businessId !== empBizId) {
          changes.push(`Biz: ${getBusinessName(editingEmployee.businessId)} → ${bizName}`);
        }
        if (editingEmployee.designationOrCategory !== empDesignation) {
          changes.push(`Role: ${editingEmployee.designationOrCategory} → ${empDesignation}`);
        }
        if (editingEmployee.appointedBy !== empManager) {
          changes.push(`Manager: ${editingEmployee.appointedBy} → ${empManager}`);
        }

        if (changes.length > 0) {
          const timestamp = new Date().toISOString().split('T')[0];
          const auditLog = `\n[Assignment Log ${timestamp}]: ${changes.join(' | ')}`;
          updatedNotes = `${updatedNotes}${auditLog}`;
        }
      }

      if (!updatedNotes.includes('[DEPT:')) {
        updatedNotes = `${deptTag} ${updatedNotes}`.trim();
      } else {
        updatedNotes = updatedNotes.replace(/\[DEPT:.*?\]/, deptTag);
      }

      const payload = {
        stakeholderType: 'employee' as const,
        code: empCode.trim() || `EMP-${Date.now().toString().slice(-4)}`,
        name: empName.trim(),
        phone: empPhone.trim(),
        email: empEmail.trim(),
        address: empAddress.trim(),
        businessId: empBizId,
        businessName: bizName,
        designationOrCategory: empDesignation.trim(),
        monthlySalaryOrCreditLimit: Number(empSalary) || 0,
        outstandingBalance: 0,
        status: empStatus,
        appointedBy: empManager.trim(),
        appointedAt: empJoiningDate,
        joiningDate: empJoiningDate,
        salaryEffectiveFrom: empJoiningDate,
        nidNumber: empNid.trim(),
        emergencyContact: empEmergency.trim(),
        notes: updatedNotes,
      };

      if (editingEmployee) {
        await updateStakeholderRecord(editingEmployee.id, payload);
        if (onShowNotice) onShowNotice(`Employee ${payload.name} updated successfully!`);
      } else {
        await createStakeholderRecord(
          payload,
          currentUser?.ownerId || 'demo-owner-id',
          currentUser?.email || 'admin@regardsagro.com'
        );
        if (onShowNotice) onShowNotice(`New Employee ${payload.name} added successfully!`);
      }

      setShowAddEmployeeModal(false);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      if (onShowError) onShowError(err.message || 'Failed to save employee record.');
    } finally {
      setIsSavingEmployee(false);
    }
  };

  // Monthly Salary Table Data Calculation
  const monthlySalaryData = useMemo(() => {
    return roleFilteredEmployees
      .filter((emp) => {
        if (selectedBizId !== 'ALL' && emp.businessId !== selectedBizId) return false;
        if (employeeSearch.trim()) {
          const q = employeeSearch.toLowerCase();
          const match =
            emp.name.toLowerCase().includes(q) ||
            emp.code.toLowerCase().includes(q) ||
            emp.phone.includes(q) ||
            emp.designationOrCategory.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .map((emp) => {
        const monthlySalary = emp.monthlySalaryOrCreditLimit || 20000;
        const paidAmount = getEmployeePaidAmount(emp, selectedMonth, selectedYear);
        const dueAmount = Math.max(0, monthlySalary - paidAmount);

        let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        if (paidAmount >= monthlySalary && monthlySalary > 0) {
          status = 'paid';
        } else if (paidAmount > 0) {
          status = 'partial';
        }

        return {
          employee: emp,
          monthlySalary,
          paidAmount,
          dueAmount,
          status,
        };
      })
      .filter((row) => {
        if (paymentStatusFilter === 'all') return true;
        return row.status === paymentStatusFilter;
      });
  }, [roleFilteredEmployees, selectedBizId, employeeSearch, selectedMonth, selectedYear, paymentStatusFilter, journalEntries]);

  // Monthly KPI Totals
  const monthlyKpis = useMemo(() => {
    const totalEmployees = monthlySalaryData.length;
    const totalSalary = monthlySalaryData.reduce((sum, r) => sum + r.monthlySalary, 0);
    const totalPaid = monthlySalaryData.reduce((sum, r) => sum + r.paidAmount, 0);
    const totalDue = monthlySalaryData.reduce((sum, r) => sum + r.dueAmount, 0);

    return {
      totalEmployees,
      totalSalary,
      totalPaid,
      totalDue,
    };
  }, [monthlySalaryData]);

  // Salary Due Records Across All Periods / Months
  const salaryDueRecords = useMemo(() => {
    const dueList: {
      employee: ErpStakeholder;
      monthCode: string;
      monthName: string;
      yearStr: string;
      periodLabel: string;
      totalSalary: number;
      totalPaid: number;
      remainingDue: number;
      daysOverdue: number;
    }[] = [];

    // Check last 6 months including current
    const monthsToCheck = [
      { m: '11', y: '2026' },
      { m: '10', y: '2026' },
      { m: '09', y: '2026' },
      { m: '08', y: '2026' },
      { m: '07', y: '2026' },
    ];

    roleFilteredEmployees.forEach((emp) => {
      if (selectedBizId !== 'ALL' && emp.businessId !== selectedBizId) return;
      if (employeeSearch.trim()) {
        const q = employeeSearch.toLowerCase();
        if (
          !emp.name.toLowerCase().includes(q) &&
          !emp.code.toLowerCase().includes(q) &&
          !emp.designationOrCategory.toLowerCase().includes(q)
        ) {
          return;
        }
      }

      monthsToCheck.forEach(({ m, y }) => {
        if (selectedMonth !== 'ALL' && m !== selectedMonth) return;
        if (selectedYear !== 'ALL' && y !== selectedYear) return;

        const totalSalary = emp.monthlySalaryOrCreditLimit || 20000;
        const totalPaid = getEmployeePaidAmount(emp, m, y);
        const remainingDue = Math.max(0, totalSalary - totalPaid);

        if (remainingDue > 0) {
          const mObj = MONTH_OPTIONS.find((opt) => opt.code === m);
          dueList.push({
            employee: emp,
            monthCode: m,
            monthName: bn ? mObj?.nameBn || m : mObj?.nameEn || m,
            yearStr: y,
            periodLabel: `${mObj?.nameEn || m} ${y}`,
            totalSalary,
            totalPaid,
            remainingDue,
            daysOverdue: m === currentMonthCode && y === currentYearStr ? 0 : 30,
          });
        }
      });
    });

    return dueList;
  }, [roleFilteredEmployees, selectedBizId, employeeSearch, selectedMonth, selectedYear, journalEntries, bn]);

  // Salary Reports Transactions & Audit
  const salaryReportEntries = useMemo(() => {
    return journalEntries
      .filter((j) => {
        if (j.transactionType !== 'payroll') return false;
        if (selectedBizId !== 'ALL' && j.businessId !== selectedBizId) return false;

        // Month & Year Filter
        if (selectedYear !== 'ALL' && !j.date?.startsWith(selectedYear)) {
          // Check if period tag matches
          if (!j.description?.includes(`[PERIOD:${selectedYear}`)) return false;
        }
        if (selectedMonth !== 'ALL') {
          const targetTag = `${selectedYear === 'ALL' ? '2026' : selectedYear}-${selectedMonth}`;
          const hasTag = j.description?.includes(`[PERIOD:${targetTag}]`);
          const hasDate = j.date?.includes(`-${selectedMonth}-`);
          if (!hasTag && !hasDate) return false;
        }

        // Method Filter (Cash vs Bank)
        if (reportMethodFilter !== 'all') {
          const creditAcc = accounts.find((a) => a.id === j.creditAccountId);
          const isBank = creditAcc?.subType === 'bank' || j.creditAccountName?.toLowerCase().includes('bank');
          const isCash = creditAcc?.subType === 'cash' || j.creditAccountName?.toLowerCase().includes('cash');

          if (reportMethodFilter === 'cash' && !isCash) return false;
          if (reportMethodFilter === 'bank' && !isBank) return false;
        }

        // Employee filter
        if (employeeSearch.trim()) {
          const q = employeeSearch.toLowerCase();
          const matches =
            j.counterpartyName?.toLowerCase().includes(q) ||
            j.description?.toLowerCase().includes(q) ||
            j.referenceNo?.toLowerCase().includes(q);
          if (!matches) return false;
        }

        return true;
      })
      .map((j) => {
        const creditAcc = accounts.find((a) => a.id === j.creditAccountId);
        const isBank = creditAcc?.subType === 'bank' || j.creditAccountName?.toLowerCase().includes('bank');
        const method: 'cash' | 'bank' = isBank ? 'bank' : 'cash';

        return {
          id: j.id,
          referenceNo: j.referenceNo,
          date: j.date,
          employeeName: j.counterpartyName || 'Staff Member',
          businessName: j.businessName,
          amount: j.amount,
          method,
          accountName: j.creditAccountName || (isBank ? 'Corporate Bank' : 'Cash in Hand'),
          note: j.description,
          enteredBy: (j as any).enteredBy || 'Admin',
        };
      });
  }, [journalEntries, selectedBizId, selectedMonth, selectedYear, reportMethodFilter, employeeSearch, accounts]);

  // Report Summary Totals
  const reportTotals = useMemo(() => {
    const totalPaid = salaryReportEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalCash = salaryReportEntries.filter((e) => e.method === 'cash').reduce((sum, e) => sum + e.amount, 0);
    const totalBank = salaryReportEntries.filter((e) => e.method === 'bank').reduce((sum, e) => sum + e.amount, 0);

    const baseBudget = monthlyKpis.totalSalary;
    const totalDue = Math.max(0, baseBudget - totalPaid);

    return {
      totalBudget: baseBudget,
      totalPaid,
      totalDue,
      totalCash,
      totalBank,
    };
  }, [salaryReportEntries, monthlyKpis]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (salaryReportEntries.length === 0) {
      alert('No salary records found to export for the selected filter.');
      return;
    }

    const headers = ['Date', 'Voucher Ref', 'Employee Name', 'Business Unit', 'Payment Method', 'Account', 'Amount (BDT)', 'Note'];
    const rows = salaryReportEntries.map((e) => [
      e.date,
      e.referenceNo,
      `"${e.employeeName.replace(/"/g, '""')}"`,
      `"${e.businessName.replace(/"/g, '""')}"`,
      e.method.toUpperCase(),
      `"${e.accountName.replace(/"/g, '""')}"`,
      e.amount,
      `"${(e.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Salary_Report_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & NAVIGATION TOOLBAR */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/30">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Salary Management & Workforce Payroll</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Live ERP
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  End-to-end salary generation, Cash/Bank disbursal, arrears tracking, and compliance audit trail
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tab Navigation Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl overflow-x-auto [scrollbar-width:none]">
            {[
              { id: 'monthly' as const, label: 'Monthly Salary', icon: Calendar },
              { id: 'employees' as const, label: 'Employee Management', icon: Users },
              { id: 'payment' as const, label: 'Salary Payment', icon: CreditCard },
              { id: 'due' as const, label: 'Salary Due', icon: Clock, count: salaryDueRecords.length },
              { id: 'reports' as const, label: 'Salary Reports', icon: FileSpreadsheet },
              { id: 'dues_legacy' as const, label: 'Customer/Supplier Dues', icon: Building2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200/60 dark:ring-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-extrabold">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Filter Strip (Business, Month, Year) */}
        {activeSubTab !== 'dues_legacy' && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Business Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Business:</span>
                <select
                  value={selectedBizId}
                  disabled={isBusinessManager && !!bmAssignedBizId}
                  onChange={(e) => setSelectedBizId(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 disabled:opacity-75 cursor-pointer"
                >
                  {!isBusinessManager && <option value="ALL">All 5 Businesses</option>}
                  {accessibleBusinesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff by name/ID..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-48 sm:w-60 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {employeeSearch && (
                  <button
                    type="button"
                    onClick={() => setEmployeeSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Actions Right Side */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddEmployee}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs shadow-emerald-600/30 cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>+ Add Employee</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. TAB CONTENT PANELS */}

      {/* =========================================================================
          SECTION B: MONTHLY SALARY (Default Master Workspace)
         ========================================================================= */}
      {activeSubTab === 'monthly' && (
        <div className="space-y-5">
          {/* 4 Professional KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Total Employees</span>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
                {monthlyKpis.totalEmployees} <span className="text-xs font-normal text-slate-400">Staff</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                In {selectedBizId === 'ALL' ? 'all 5 divisions' : getBusinessName(selectedBizId)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Total Salary Budget</span>
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
                {formatBDT(monthlyKpis.totalSalary)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Agreed payroll for {MONTH_OPTIONS.find((m) => m.code === selectedMonth)?.nameEn} {selectedYear}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Total Paid</span>
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatBDT(monthlyKpis.totalPaid)}
              </div>
              <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {monthlyKpis.totalSalary > 0
                  ? `${Math.round((monthlyKpis.totalPaid / monthlyKpis.totalSalary) * 100)}% Disbursed`
                  : '0% Disbursed'}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Total Due</span>
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                {formatBDT(monthlyKpis.totalDue)}
              </div>
              <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                {monthlyKpis.totalDue > 0 ? 'Pending payout balance' : 'All salaries cleared'}
              </div>
            </div>
          </div>

          {/* Payment Status Filter Tabs & Table Header */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Salary Register — {MONTH_OPTIONS.find((m) => m.code === selectedMonth)?.nameEn} {selectedYear}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {monthlySalaryData.length} Staff
                </span>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                {(['all', 'paid', 'partial', 'unpaid'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPaymentStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                      paymentStatusFilter === st
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="max-h-[50vh] overflow-y-auto overflow-x-auto [scrollbar-width:thin] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Business Unit</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4 text-right">Monthly Salary</th>
                    <th className="py-3 px-4 text-right">Paid Amount</th>
                    <th className="py-3 px-4 text-right">Due Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthlySalaryData.map(({ employee: emp, monthlySalary, paidAmount, dueAmount, status }) => {
                    const isFullyPaid = status === 'paid';
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 ring-1 ring-slate-300 dark:ring-slate-600 overflow-hidden">
                              {emp.photoUrl ? (
                                <img src={emp.photoUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                emp.name.slice(0, 1).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{emp.name}</span>
                                <span className="px-1.5 py-0.2 rounded-md font-mono text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  {emp.code}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">{emp.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {formatToEnglishBusiness(emp.businessName, emp.businessId)}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                          {formatToEnglishDesignation(emp.designationOrCategory)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatBDT(monthlySalary)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {paidAmount > 0 ? formatBDT(paidAmount) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {dueAmount > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">{formatBDT(dueAmount)}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">৳0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {status === 'paid' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Paid
                            </span>
                          )}
                          {status === 'partial' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              <Clock className="h-3 w-3" /> Partial
                            </span>
                          )}
                          {status === 'unpaid' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                              <AlertCircle className="h-3 w-3" /> Unpaid
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isFullyPaid ? (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Settled
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(emp, selectedMonth, selectedYear)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs shadow-emerald-600/30 cursor-pointer active:scale-98"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Pay Salary</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {monthlySalaryData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                        No employees found matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION A: EMPLOYEE MANAGEMENT (Directory, Roles & History)
         ========================================================================= */}
      {activeSubTab === 'employees' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Workforce Employee Directory & Assignments</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600">
                    {roleFilteredEmployees.length} Total
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage staff details, assigned managers, department/farm assignments, and compensation
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>

                <button
                  type="button"
                  onClick={handleOpenAddEmployee}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>+ New Employee</span>
                </button>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto overflow-x-auto [scrollbar-width:thin] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Name & Contact</th>
                    <th className="py-3 px-4">Business Unit</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Department / Field</th>
                    <th className="py-3 px-4">Assigned Manager</th>
                    <th className="py-3 px-4">Joining Date</th>
                    <th className="py-3 px-4 text-right">Monthly Salary</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {roleFilteredEmployees
                    .filter((emp) => {
                      if (selectedBizId !== 'ALL' && emp.businessId !== selectedBizId) return false;
                      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
                      if (employeeSearch.trim()) {
                        const q = employeeSearch.toLowerCase();
                        return (
                          emp.name.toLowerCase().includes(q) ||
                          emp.code.toLowerCase().includes(q) ||
                          emp.phone.includes(q) ||
                          emp.designationOrCategory.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((emp) => {
                      const deptMatch = emp.notes?.match(/\[DEPT:(.*?)\]/);
                      const deptName = deptMatch ? deptMatch[1] : 'General Operations';

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200">
                            {emp.code}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                            <div className="text-[10px] text-slate-400">{emp.phone}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {formatToEnglishBusiness(emp.businessName, emp.businessId)}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                            {formatToEnglishDesignation(emp.designationOrCategory)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {deptName}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300">
                            {emp.appointedBy || 'General Manager'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">
                            {emp.joiningDate || emp.appointedAt || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatBDT(emp.monthlySalaryOrCreditLimit || 0)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                emp.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : emp.status === 'inactive'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenPayment(emp)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 dark:text-emerald-300 transition-colors cursor-pointer"
                                title="Pay Salary"
                              >
                                Pay
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditEmployee(emp)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Edit Employee & Assignments"
                              >
                                <Edit className="h-3.5 w-3.5" />
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
        </div>
      )}

      {/* =========================================================================
          SECTION C: SALARY PAYMENT SYSTEM (Interactive Disbursal Workspace)
         ========================================================================= */}
      {activeSubTab === 'payment' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Pay Form */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Process Salary Disbursal</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select payment source (Cash/Bank), specify employee, and generate verified ledger entries
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Select Employee */}
              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Select Employee to Pay:
                </label>
                <select
                  value={paymentTargetEmployee?.id || ''}
                  onChange={(e) => {
                    const found = roleFilteredEmployees.find((emp) => emp.id === e.target.value);
                    if (found) handleOpenPayment(found, selectedMonth, selectedYear);
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">-- Choose an Employee --</option>
                  {roleFilteredEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code}) — {getBusinessName(emp.businessId)} · Salary: {formatBDT(emp.monthlySalaryOrCreditLimit)}
                    </option>
                  ))}
                </select>
              </div>

              {paymentTargetEmployee && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {paymentTargetEmployee.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {paymentTargetEmployee.designationOrCategory} · {getBusinessName(paymentTargetEmployee.businessId)}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-[10px] text-slate-400">Agreed Salary</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatBDT(paymentTargetEmployee.monthlySalaryOrCreditLimit)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-between text-xs">
                    <div>
                      Already Paid for {MONTH_OPTIONS.find((m) => m.code === paymentPeriodMonth)?.nameEn}:{' '}
                      <strong className="text-emerald-600">
                        {formatBDT(getEmployeePaidAmount(paymentTargetEmployee, paymentPeriodMonth, paymentPeriodYear))}
                      </strong>
                    </div>
                    <div>
                      Remaining Due:{' '}
                      <strong className="text-rose-600">
                        {formatBDT(
                          Math.max(
                            0,
                            paymentTargetEmployee.monthlySalaryOrCreditLimit -
                              getEmployeePaidAmount(paymentTargetEmployee, paymentPeriodMonth, paymentPeriodYear)
                          )
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* PAYMENT SOURCE TOGGLE (CASH VS BANK) */}
              <div>
                <label className="block mb-2 font-bold text-slate-700 dark:text-slate-300">
                  Payment Source (Required):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentSourceType('cash');
                      setSelectedAccountId(cashAccounts[0]?.id || '');
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      paymentSourceType === 'cash'
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-extrabold text-xs">1. Cash (Cash Vault)</div>
                      <div className="text-[10px] text-slate-500">Deduct from Cash in Hand</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentSourceType('bank');
                      setSelectedAccountId(bankAccounts[0]?.id || '');
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      paymentSourceType === 'bank'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Landmark className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-extrabold text-xs">2. Bank Account</div>
                      <div className="text-[10px] text-slate-500">Deduct from Corporate Bank</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Specific Cash or Bank Account Dropdown */}
              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Select {paymentSourceType === 'cash' ? 'Cash Account / Vault' : 'Corporate Bank Account'}:
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {availableWallets.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — Current Balance: {formatBDT(acc.balance)}
                    </option>
                  ))}
                </select>
                {currentSelectedAccount && (
                  <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Available Liquidity:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatBDT(currentSelectedAccount.balance)}
                    </strong>
                  </div>
                )}
              </div>

              {/* Amount Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Base Amount (BDT):
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Bonus / Allowance (+):
                  </label>
                  <input
                    type="number"
                    value={paymentBonus}
                    onChange={(e) => setPaymentBonus(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold text-xs text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Deduction / Advance (-):
                  </label>
                  <input
                    type="number"
                    value={paymentDeduction}
                    onChange={(e) => setPaymentDeduction(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold text-xs text-rose-600"
                  />
                </div>
              </div>

              {/* Date & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Disbursal Date:
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Voucher / Cheque Reference:
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. CHEQUE-10294 or PAY-491"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Error message */}
              {paymentFormError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{paymentFormError}</span>
                </div>
              )}

              {/* Net Payout Summary Banner */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Net Disbursal Amount
                  </span>
                  <div className="text-xl font-mono font-black text-emerald-400">
                    {formatBDT(Math.max(0, paymentAmount + paymentBonus - paymentDeduction))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!paymentTargetEmployee || isSubmittingPayment}
                  onClick={handleProcessPaymentSubmit}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmittingPayment ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Confirm & Disburse</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Account Liquidity Overview */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Treasury Disbursal Liquidity
              </h3>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Cash Accounts (Vaults)</span>
                </div>
                {cashAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{acc.name}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBDT(acc.balance)}
                    </span>
                  </div>
                ))}

                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pt-2">
                  <Landmark className="h-3.5 w-3.5 text-blue-600" />
                  <span>Corporate Bank Accounts</span>
                </div>
                {bankAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{acc.name}</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatBDT(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 text-xs text-blue-950 dark:text-blue-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span>Strict Double-Entry Guarantee:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Paying via Cash automatically debits the Payroll Expense account and credits Cash in Hand. Paying via
                Bank debits Payroll Expense and credits the corporate bank account. No duplicate entries are created.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION D: SALARY DUE (Arrears & Historical Unpaid Settlement)
         ========================================================================= */}
      {activeSubTab === 'due' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-rose-600" />
                  <span>Salary Due & Outstanding Arrears Tracker</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {salaryDueRecords.length} Unsettled Dues
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clear outstanding salaries from any past month without overwriting or duplicating current period payroll
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Arrears Balance:</span>
                <div className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                  {formatBDT(salaryDueRecords.reduce((sum, d) => sum + d.remainingDue, 0))}
                </div>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto overflow-x-auto [scrollbar-width:thin] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Business Unit</th>
                    <th className="py-3 px-4">Salary Month</th>
                    <th className="py-3 px-4 text-right">Agreed Salary</th>
                    <th className="py-3 px-4 text-right">Paid So Far</th>
                    <th className="py-3 px-4 text-right">Remaining Due</th>
                    <th className="py-3 px-4 text-center">Due Aging</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {salaryDueRecords.map((item, idx) => (
                    <tr key={`${item.employee.id}-${item.periodLabel}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{item.employee.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.employee.code}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          {formatToEnglishBusiness(item.employee.businessName, item.employee.businessId)}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                        {item.periodLabel}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatBDT(item.totalSalary)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {item.totalPaid > 0 ? formatBDT(item.totalPaid) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatBDT(item.remainingDue)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.daysOverdue === 0
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {item.daysOverdue === 0 ? 'Current Month' : 'Past Overdue'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenPayment(item.employee, item.monthCode, item.yearStr)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
                        >
                          <CreditCard className="h-3 w-3" />
                          <span>Settle Due</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {salaryDueRecords.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                        🎉 Excellent! No outstanding salary dues recorded across any month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION E: SALARY REPORTS (Disbursal Audit, CSV Export & Print)
         ========================================================================= */}
      {activeSubTab === 'reports' && (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Budget</span>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                {formatBDT(reportTotals.totalBudget)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Paid Out</span>
              <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatBDT(reportTotals.totalPaid)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Due Balance</span>
              <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                {formatBDT(reportTotals.totalDue)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600 flex items-center gap-1">
                <Banknote className="h-3 w-3" /> Paid via Cash
              </span>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                {formatBDT(reportTotals.totalCash)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-blue-600 flex items-center gap-1">
                <Landmark className="h-3 w-3" /> Paid via Bank
              </span>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                {formatBDT(reportTotals.totalBank)}
              </div>
            </div>
          </div>

          {/* Audit Ledger Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Salary Disbursal Audit Trail & Reports</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600">
                    {salaryReportEntries.length} Transactions
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={reportMethodFilter}
                  onChange={(e) => setReportMethodFilter(e.target.value as any)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="cash">Cash Only</option>
                  <option value="bank">Bank Only</option>
                </select>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto overflow-x-auto [scrollbar-width:thin] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-3 px-4">Date / Voucher</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Business Unit</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Source Account</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4">Audit Note</th>
                    <th className="py-3 px-4 text-center">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {salaryReportEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">{entry.date}</div>
                        <div className="font-mono text-[10px] text-slate-400">{entry.referenceNo}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                        {entry.employeeName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          {formatToEnglishBusiness(entry.businessName)}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            entry.method === 'cash'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200'
                          }`}
                        >
                          {entry.method === 'cash' ? <Banknote className="h-3 w-3" /> : <Landmark className="h-3 w-3" />}
                          {entry.method.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                        {entry.accountName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatBDT(entry.amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate" title={entry.note}>
                        {entry.note}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSetActiveSlip) {
                              onSetActiveSlip({
                                type: 'salary_payslip',
                                slipNo: entry.referenceNo,
                                date: entry.date,
                                businessName: formatToEnglishBusiness(entry.businessName),
                                recipientName: entry.employeeName,
                                designation: 'Staff',
                                amount: entry.amount,
                                paymentMethod: `${entry.accountName} (${entry.method.toUpperCase()})`,
                                note: entry.note,
                                totalAmount: entry.amount,
                                enteredBy: entry.enteredBy,
                              });
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          View Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                  {salaryReportEntries.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                        No transactions recorded for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION F: CUSTOMER & SUPPLIER DUES (Preserving Existing Functionality)
         ========================================================================= */}
      {activeSubTab === 'dues_legacy' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>Customer Receivables & Supplier Payables</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Outstanding credit sales to wholesale buyers and due payables to feed/seed suppliers
            </p>

            <div className="mt-4 max-h-[50vh] overflow-y-auto overflow-x-auto [scrollbar-width:thin] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-2.5 px-3">Party Type</th>
                    <th className="py-2.5 px-3">Name & Contact</th>
                    <th className="py-2.5 px-3">Business</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stakeholders
                    .filter((s) => s.stakeholderType === 'customer' || s.stakeholderType === 'supplier')
                    .map((party) => (
                      <tr key={party.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              party.stakeholderType === 'customer'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {party.stakeholderType === 'customer' ? 'Customer (Receivable)' : 'Supplier (Payable)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">{party.name}</div>
                          <div className="text-[10px] text-slate-400">{party.phone}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {formatToEnglishBusiness(party.businessName, party.businessId)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {formatBDT(party.outstandingBalance || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="text-[11px] text-slate-400">Recorded in ledger</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD / EDIT EMPLOYEE MODAL
         ========================================================================= */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-600" />
                <span>{editingEmployee ? 'Edit Employee & Assignment' : 'Add New Workforce Employee'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEmployeeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. Md. Rafiqul Islam"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Employee ID / Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    placeholder="e.g. EMP-101"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Assigned Business Unit *
                  </label>
                  <select
                    value={empBizId}
                    disabled={isBusinessManager && !!bmAssignedBizId}
                    onChange={(e) => setEmpBizId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-semibold cursor-pointer"
                  >
                    {accessibleBusinesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Designation / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    placeholder="e.g. Senior Poultry Incharge"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Department / Farm / Field *
                  </label>
                  <input
                    type="text"
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    placeholder="e.g. Broiler Shed 1 or Pond 2"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-semibold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Assigned / Reporting Manager
                  </label>
                  <input
                    type="text"
                    value={empManager}
                    onChange={(e) => setEmpManager(e.target.value)}
                    placeholder="e.g. Babu Ahmed (Branch Manager)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Agreed Monthly Salary (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    value={empSalary}
                    onChange={(e) => setEmpSalary(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={empJoiningDate}
                    onChange={(e) => setEmpJoiningDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Employment Status
                  </label>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold cursor-pointer"
                  >
                    <option value="active">Active (On Duty)</option>
                    <option value="inactive">Inactive / On Leave</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  National ID (NID) & Emergency Contact
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={empNid}
                    onChange={(e) => setEmpNid(e.target.value)}
                    placeholder="NID Number (Optional)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
                  />
                  <input
                    type="text"
                    value={empEmergency}
                    onChange={(e) => setEmpEmergency(e.target.value)}
                    placeholder="Emergency Phone"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEmployee}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-sm"
                >
                  {isSavingEmployee ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: SALARY PAYMENT MODAL (Cash vs Bank Selection)
         ========================================================================= */}
      {showPaymentModal && paymentTargetEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  <span>Disburse Salary Payment</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paying for {MONTH_OPTIONS.find((m) => m.code === paymentPeriodMonth)?.nameEn} {paymentPeriodYear}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProcessPaymentSubmit} className="space-y-4 text-xs">
              {/* Employee Summary Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {paymentTargetEmployee.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {paymentTargetEmployee.designationOrCategory} · {paymentTargetEmployee.code}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Monthly Agreed</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatBDT(paymentTargetEmployee.monthlySalaryOrCreditLimit)}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-mono text-xs">
                  <div>
                    Paid So Far:{' '}
                    <strong className="text-emerald-600">
                      {formatBDT(getEmployeePaidAmount(paymentTargetEmployee, paymentPeriodMonth, paymentPeriodYear))}
                    </strong>
                  </div>
                  <div>
                    Remaining Due:{' '}
                    <strong className="text-rose-600">
                      {formatBDT(
                        Math.max(
                          0,
                          paymentTargetEmployee.monthlySalaryOrCreditLimit -
                            getEmployeePaidAmount(paymentTargetEmployee, paymentPeriodMonth, paymentPeriodYear)
                        )
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {/* PAYMENT SOURCE SELECTOR (CASH OR BANK) */}
              <div>
                <label className="block mb-1.5 font-bold text-slate-700 dark:text-slate-300">
                  Select Payment Method (Source) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentSourceType('cash');
                      setSelectedAccountId(cashAccounts[0]?.id || '');
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                      paymentSourceType === 'cash'
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Banknote className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="text-left">
                      <div className="font-bold">1. Cash Payment</div>
                      <div className="text-[10px] text-slate-500">Deduct Cash in Hand</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentSourceType('bank');
                      setSelectedAccountId(bankAccounts[0]?.id || '');
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                      paymentSourceType === 'bank'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Landmark className="h-5 w-5 text-blue-600 shrink-0" />
                    <div className="text-left">
                      <div className="font-bold">2. Bank Transfer</div>
                      <div className="text-[10px] text-slate-500">Deduct Bank Account</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Specific Account Selection */}
              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Select {paymentSourceType === 'cash' ? 'Cash Account' : 'Bank Account'} *
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-bold cursor-pointer"
                >
                  {availableWallets.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — Balance: {formatBDT(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Inputs */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Base Amount (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Bonus (+)
                  </label>
                  <input
                    type="number"
                    value={paymentBonus}
                    onChange={(e) => setPaymentBonus(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Deduction (-)
                  </label>
                  <input
                    type="number"
                    value={paymentDeduction}
                    onChange={(e) => setPaymentDeduction(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Reference / Check No
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. SLIP-102"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-mono"
                  />
                </div>
              </div>

              {paymentFormError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold">
                  {paymentFormError}
                </div>
              )}

              {/* Total Summary Footer */}
              <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Final Payout</span>
                  <div className="text-xl font-mono font-black text-emerald-400">
                    {formatBDT(Math.max(0, paymentAmount + paymentBonus - paymentDeduction))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-3 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md"
                  >
                    {isSubmittingPayment ? 'Processing...' : 'Confirm Disbursal'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
