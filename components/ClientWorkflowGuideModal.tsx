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
  lang = 'en',
}: ClientWorkflowGuideModalProps) {
  const [activeTab, setActiveTab] = useState<string>('super_admin');

  if (!isOpen) return null;

  const chapters = [
    {
      id: 'super_admin',
      icon: '👑',
      title: '1. Super Admin Login & Setup',
      subtitle: 'Ownership access, credentials, and initial preparation',
    },
    {
      id: 'general_manager',
      icon: '🎖️',
      title: '2. Appointing General Manager (COO)',
      subtitle: 'Central supervision and cross-division executive oversight',
    },
    {
      id: 'business_managers',
      icon: '🏢',
      title: '3. Division Managers Appointment',
      subtitle: 'In-charge roles for Poultry, Cattle, Goat, Fish, and Transport',
    },
    {
      id: 'staff_hiring',
      icon: '👷',
      title: '4. Staff Hiring & Joining Date',
      subtitle: 'Onboarding field technicians, shed caretakers, and fleet drivers',
    },
    {
      id: 'payroll_cycle',
      icon: '🔔',
      title: '5. Payroll Cycle & 3-Day Alert',
      subtitle: 'Monthly accrual, mid-month prorated formula, and reminders',
    },
    {
      id: 'five_businesses',
      icon: '🚜',
      title: '6. Five Production Operations',
      subtitle: 'Batch telemetry, cattle tagging, milk, feed, and trip logistics',
    },
    {
      id: 'accounting_treasury',
      icon: '💰',
      title: '7. Central Accounting & Treasury',
      subtitle: 'Double-entry journals, cash vaults, and banking transfers',
    },
    {
      id: 'inventory_stock',
      icon: '📦',
      title: '8. Warehouse Inventory Tracking',
      subtitle: 'Feed sacks, medicines, diesel stock, and reorder thresholds',
    },
    {
      id: 'pnl_reports',
      icon: '📊',
      title: '9. P&L Financial Reports',
      subtitle: 'Net margins, executive audits, and client delivery handover',
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
                  RegardsAgro Enterprise — Standard Operating Procedure (SOP Manual)
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  Version 2.0 Live
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                End-to-end operational guide: managerial hierarchy, division telemetry, payroll cycles, accounting, and P&L governance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Guide</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              Table of Contents
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
                      {chap.title}
                    </div>
                    <div className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {chap.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chapter Content Details */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 text-slate-700 dark:text-slate-300 text-xs">
            {/* CHAPTER 1 */}
            {activeTab === 'super_admin' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold">
                    Chapter 1 · Master Ownership
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Super Admin Login & Master Setup
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Secure single-tenant administrative access and core executive command center.
                  </p>
                </div>

                <div className="space-y-3.5 leading-relaxed">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                    <div className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>1.1 Master Credentials:</span>
                    </div>
                    <p>
                      The system is secured by a designated Super Admin ownership identity:
                      <br />
                      Authorized Identity: <strong className="font-mono text-emerald-700 dark:text-emerald-300">sahinmiah1204@gmail.com</strong>
                      <br />
                      Super Admins possess root-level authorization to create users, adjust permissions, configure fiscal accounts, and view all 5 business ledgers.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">1.2 Executive Dashboard Overview:</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                      <li><strong>Top Command Bar:</strong> Quick Sale Entry, Quick Expense Entry, New Unit Setup, and Audited Financial Statements.</li>
                      <li><strong>4 Financial Core Cards:</strong> Consolidated Revenue, Total Operating Expenses, Net Profit Margin, and Liquid Cash/Bank Treasury.</li>
                      <li><strong>5 Specialized Business Units:</strong> Real-time production telemetry for Poultry, Cattle, Goat, Fish, and Transport.</li>
                      <li><strong>Operational Treasury:</strong> Physical cash drawers, corporate bank accounts, and payroll disbursement status.</li>
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
                    Chapter 2 · Organizational Leadership
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Appointing Chief General Manager (COO / Super Manager)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Delegating operational supervision to an executive General Manager to oversee all 5 businesses.
                  </p>
                </div>

                <div className="space-y-3.5 leading-relaxed">
                  <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-500/20 space-y-2">
                    <div className="font-extrabold text-purple-900 dark:text-purple-200 text-sm">
                      2.1 Step-by-Step Procedure to Appoint a General Manager:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
                      <li>Navigate to the left navigation sidebar and click <strong>&ldquo;Team & Access Control&rdquo;</strong>.</li>
                      <li>Click the top right action button: <strong>&ldquo;+ Add New User & Role&rdquo;</strong>.</li>
                      <li>Under Role Assignment, select <strong>&ldquo;🎖️ Super Manager (Chief Operating Officer / GM)&rdquo;</strong>.</li>
                      <li>Enter the manager&apos;s Full Name, Corporate Email, Phone Number, and a secure initial password, then save.</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">2.2 General Manager Permissions & Governance Scope:</div>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                      <li><strong>Cross-Division Access:</strong> Supervises all 5 business divisions, operational accounting vouchers, warehouse stocks, and consolidated P&L.</li>
                      <li><strong>Managerial Appointment:</strong> Empowered to hire and assign Division Managers for Poultry, Cattle, Goat, Fish, and Transport.</li>
                      <li><strong>Executive Reporting:</strong> Prepares audited management reports and cost reviews directly for the owner.</li>
                      <li><strong>Security Safeguard:</strong> A General Manager cannot modify or delete the root Super Admin ownership account.</li>
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
                    Chapter 3 · Divisional Management
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Appointing Division Business Managers & Scope Isolation
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Each farming and logistics division operates under a designated in-charge manager.
                  </p>
                </div>

                <div className="space-y-3.5 leading-relaxed">
                  <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                    <div className="font-bold text-blue-900 dark:text-blue-200 text-sm">
                      3.1 Two Efficient Methods to Appoint a Business Manager:
                    </div>
                    <div className="space-y-2 pl-2">
                      <p>
                        <strong>Method A (Directly Inside the Business Console):</strong><br />
                        Open the targeted business (e.g., Cattle Farming) ➔ In the top section, click <strong>&ldquo;👔 Assign / Change Manager&rdquo;</strong> ➔ Enter the manager&apos;s name and mobile to appoint in 1 click.
                      </p>
                      <p>
                        <strong>Method B (Via Team & Access Control):</strong><br />
                        Select Role as <strong>&ldquo;Business Manager&rdquo;</strong>, choose the specific division (e.g., Cattle Farming) to lock the manager&apos;s scope strictly to that unit.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-amber-900 dark:text-amber-200">
                    <div className="font-bold flex items-center gap-2">
                      <span>⚠️ Strict Role Scoping Policy:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      When a Division Business Manager (e.g., Cattle Manager) logs in, their access is strictly scoped to their assigned division. They cannot view or alter financial entries, staff, or telemetry belonging to Poultry, Fish, or Transport.
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
                    Chapter 4 · Workforce Management
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Staff Hiring, Joining Date & Monthly Salary Setup
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Standard protocol for onboarding field caretakers, technicians, and commercial drivers.
                  </p>
                </div>

                <div className="space-y-3.5 leading-relaxed">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      4.1 How to Register New Field Staff:
                    </div>
                    <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                      <li>Open the targeted business division console (e.g., Cattle Farming).</li>
                      <li>Directly below the top KPI cards, locate the <strong>&ldquo;Divisional Team, Manager & Workforce&rdquo;</strong> section.</li>
                      <li>Click the action button: <strong>&ldquo;+ Hire New Staff&rdquo;</strong>.</li>
                      <li>The business unit is automatically linked to the active division.</li>
                      <li>Enter the employee&apos;s Full Name, Mobile Number, and select their exact <strong>Joining Date</strong> from the calendar.</li>
                      <li>Input the agreed <strong>Monthly Salary (BDT)</strong> and permanent address, then save.</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="font-bold text-slate-900 dark:text-white">4.2 One-Click Designation Presets:</div>
                    <p className="text-[11px] text-slate-500">
                      Presets are tailored per industry: for Cattle (<em>Milking Caretaker, Veterinary Assistant</em>); for Poultry (<em>Shed In-Charge, Feeding & Vaccine Operator</em>); for Transport (<em>Heavy Truck Driver, Fleet Assistant</em>).
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
                    Chapter 5 · Payroll & Reminders
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Monthly Payroll Cycle, Prorated Formula & 3-Day Early Alert
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Salaries accrue across the calendar month and are mathematically prorated for mid-month joiners.
                  </p>
                </div>

                <div className="space-y-3.5 leading-relaxed">
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/20 space-y-2">
                    <div className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                      5.1 Monthly Cycle & Prorated Calculation Rules:
                    </div>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
                      <li><strong>Days 1 through 24 of Month:</strong> Employee status is marked as <em>&ldquo;Current Month Accruing&rdquo;</em> (in-progress working period, not an overdue liability).</li>
                      <li><strong>Mid-Month Joining:</strong> If an employee joins on November 15 in a 30-day month, they work 16 days. The formula automatically computes: <code className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-bold">(Monthly Salary ÷ 30) × 16 Days</code>.</li>
                      <li><strong>Final 3 Days (28th to 30th/31st):</strong> Status automatically switches to <em>&ldquo;🔔 Ready for Disbursement&rdquo;</em>.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">5.2 Automated 3-Day Notification System:</div>
                    <p className="text-slate-600 dark:text-slate-400">
                      During the last 3 days of the month, a high-priority alert appears on the notification bell and top dashboard:
                      <br />
                      <em>&ldquo;🔔 End of month payroll due. Total staff disbursement of ৳XX,XXX across 5 business units ready for processing.&rdquo;</em>
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
                    <div className="font-bold text-emerald-900 dark:text-emerald-200">5.3 Disbursement Responsibility Hierarchy:</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                      <li><strong>Division Managers&apos; Salaries:</strong> Disbursed by the General Manager or Owner.</li>
                      <li><strong>Field Caretakers & Drivers&apos; Salaries:</strong> Disbursed by their respective Division Manager or General Manager.</li>
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
                    Chapter 6 · Production Telemetry
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Daily Field Operations Across All 5 Enterprises
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Scientific telemetry and daily operational logging for each business module.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                    <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span>🐔 Poultry Farming (Broiler & Layer Hub)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      Shed batch tracking, DOC procurement, daily mortality logs, FCR feed conversion calculations, scheduled vaccinations, and 4-tier live bird grading (A, B, C, D) with egg production sales.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span>🐄 Cattle Farming (Dairy & Beef Fattening)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      Individual Tag ID profiles (e.g. CAT-0001), Holstein Friesian breed lineage, morning & evening milking telemetry (Liters), corn silage ration logs, ADG weight tracking, and lifetime P&L margin.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                    <div className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                      <span>🐐 Goat Farming (Black Bengal & Jamunapari)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      Slatted-floor shed management, sire/dam pedigree family trees, kid birth telemetry, deworming & PPR vaccines, live weight estimation, and Eid-ul-Adha meat production margins.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                    <div className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                      <span>🐟 Fish Farming (Aquaculture Fisheries)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      Pond surface decimal area, Rui-Katla-Tilapia fingerling stocking density, water pH & dissolved oxygen (DO) testing, floating feed metrics, paddle aerators, and netted harvest sales.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 md:col-span-2">
                    <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <span>🚚 Truck & Transport Logistics (Commercial Fleet)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      Vehicle fleet management (Open & Covered), inter-district freight routes, return back-load booking, diesel litre fuel logs, expressway toll & khoraki deductions, tyre/battery serial number tracking, and BRTA document expiry alerts.
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
                    Chapter 7 · Financial Governance
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Central Accounting, Vouchers & Treasury Cash/Bank
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Transparent, auditable double-entry bookkeeping eliminating financial discrepancies.
                  </p>
                </div>

                <div className="space-y-3.5 leading-relaxed">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">7.1 Automated Double-Entry Journal Flow:</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                      <li><strong>Sales Revenue:</strong> Debit Cash in Hand or Bank ➔ Credit Farm Sales Revenue Account.</li>
                      <li><strong>Operating Expense:</strong> Debit Feed / Medical Expense ➔ Credit Cash or Bank Account.</li>
                      <li><strong>Payroll Settlement:</strong> Debit Employee Salary Expense ➔ Credit Payment Wallet Account.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">7.2 Treasury Wallet & Liquidity Management:</div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Physical cash is tracked under <strong>&ldquo;Cash in Hand&rdquo;</strong>, while institutional funds reside in designated corporate bank accounts. Transfers between cash drawers and bank vaults are logged with 1-click contra entries.
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
                    Chapter 8 · Warehouse Audit
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Warehouse Godown & Inventory Stock Audit
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ensuring strict physical inventory control to eliminate feed wastage and unauthorized consumption.
                  </p>
                </div>

                <div className="space-y-3.5 leading-relaxed">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">8.1 Stock Inward & Consumption Outward (FIFO Control):</div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Purchases of broiler feed (50kg bags), corn silage, or pond lime automatically increase inventory balances. When shed managers feed animals, recording consumption automatically updates the stock ledger and calculates accurate unit costs.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-500/20 space-y-1">
                    <div className="font-bold text-sky-900 dark:text-sky-200">8.2 Automatic Reorder Threshold Alerts:</div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      When any essential feed or medicine drops below the 10-bag minimum safety threshold, the system displays an alert to trigger timely supplier replenishment.
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
                    Chapter 9 · Statements & Verification
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Profit & Loss (P&L) Reports & Handover Verification
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comprehensive performance auditing and client delivery quality assurance.
                  </p>
                </div>

                <div className="space-y-3.5 leading-relaxed">
                  <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                    <div className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                      9.1 Reading the Audited Profit & Loss Ledger:
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      Click <strong>&ldquo;Financial Reports&rdquo;</strong> in the left navigation to inspect monthly and quarterly revenue, cost of goods sold, feed and medicine costs, staff payroll, and bottom-line net profit.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white">9.2 Enterprise Handover Verification Checklist:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Clean database state (0 dummy artifacts)</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Root Super Admin ownership secured</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>English interface throughout all modules</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>High-density executive dashboard styling</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Role-based access & payroll scoping</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>3-day automated payroll alert system</span>
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
            <span>RegardsAgro ERP · Production Ready Enterprise System</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs cursor-pointer"
          >
            Got it / Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
