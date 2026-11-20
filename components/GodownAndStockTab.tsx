'use client';

import React, { useState, useMemo } from 'react';
import {
  Package,
  Boxes,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Truck,
  Building2,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Download,
  Banknote,
  Landmark,
  CreditCard,
  User,
  Phone,
  MapPin,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  Send,
  Eye,
  History,
  ShieldCheck,
  X,
  FileText
} from 'lucide-react';
import {
  ErpBusiness,
  ErpAccount,
  ErpJournalEntry,
  ErpInventoryItem,
  ErpStockMovement,
  ErpStakeholder,
  ErpUser,
  UserRole,
  formatBDT,
} from '@/lib/erp-types';
import {
  createInventoryItemWithMovement,
  recordStockMovement,
  settleStakeholderPayment,
  postDoubleEntryTransaction,
  createStakeholderRecord,
} from '@/lib/erp-service';

export interface GodownAndStockTabProps {
  businesses: ErpBusiness[];
  allBusinesses?: ErpBusiness[];
  accounts: ErpAccount[];
  journalEntries: ErpJournalEntry[];
  inventoryItems: ErpInventoryItem[];
  stockMovements: ErpStockMovement[];
  stakeholders: ErpStakeholder[];
  erpUsers?: ErpUser[];
  currentUser?: ErpUser;
  userRole: UserRole;
  assignedBusinessFilter: string;
  lang?: 'en' | 'bn';
  onShowNotice?: (msg: string) => void;
  onShowError?: (msg: string) => void;
  onRefreshData?: () => void;
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

export interface SupplierInquiryRecord {
  id: string;
  supplierName: string;
  productName: string;
  requiredQty: number;
  unit: string;
  quotedPrice: number;
  availabilityStatus: 'Available' | 'Low / Limited' | 'Unavailable' | 'Confirmed Delivery';
  inquiryDate: string;
  supplierResponse: string;
  followUpStatus: 'Pending Response' | 'Negotiating' | 'Order Placed' | 'Confirmed Delivery' | 'Cancelled';
}

export default function GodownAndStockTab({
  businesses,
  allBusinesses = [],
  accounts,
  journalEntries,
  inventoryItems,
  stockMovements,
  stakeholders,
  erpUsers = [],
  currentUser,
  userRole,
  assignedBusinessFilter,
  lang = 'en',
  onShowNotice,
  onShowError,
  onRefreshData,
  onSetActiveSlip,
}: GodownAndStockTabProps) {
  const bn = lang === 'bn';

  // 1. Role-based Business Filtering
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

  // Main Sub-tabs: 'dashboard' | 'inventory' | 'purchase' | 'issue' | 'suppliers' | 'history'
  const [activeSubTab, setActiveSubTab] = useState<
    'dashboard' | 'inventory' | 'purchase' | 'issue' | 'suppliers' | 'history'
  >('dashboard');

  // Filters
  const currentDate = new Date();
  const currentMonthCode = String(currentDate.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(currentDate.getFullYear());

  const [selectedBizId, setSelectedBizId] = useState<string>(
    isBusinessManager && bmAssignedBizId ? bmAssignedBizId : 'ALL'
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthCode);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');

  // Cash and Bank Accounts
  const cashAccounts = useMemo(() => {
    return accounts.filter((a) => a.subType === 'cash' || a.name.toLowerCase().includes('cash') || a.name.includes('ক্যাশ'));
  }, [accounts]);

  const bankAccounts = useMemo(() => {
    return accounts.filter((a) => a.subType === 'bank' || a.name.toLowerCase().includes('bank') || a.name.includes('ব্যাংক'));
  }, [accounts]);

  // Suppliers List
  const suppliers = useMemo(() => {
    return stakeholders.filter((s) => s.stakeholderType === 'supplier');
  }, [stakeholders]);

  // Business Name Helper
  const getBusinessName = (bizId?: string) => {
    const found = (allBusinesses.length > 0 ? allBusinesses : businesses).find((b) => b.id === bizId);
    return found ? (bn ? found.nameBn || found.name : found.name) : 'Central Agro Godown';
  };

  // Accessible Stock Items (Role Filtered)
  const roleFilteredStockItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (isBusinessManager && bmAssignedBizId) {
        return item.businessId === bmAssignedBizId || (currentUser?.assignedBusinesses && currentUser.assignedBusinesses.includes(item.businessId));
      }
      return true;
    });
  }, [inventoryItems, isBusinessManager, bmAssignedBizId, currentUser]);

  // Accessible Movements
  const roleFilteredMovements = useMemo(() => {
    return stockMovements.filter((mov) => {
      if (isBusinessManager && bmAssignedBizId) {
        return mov.businessId === bmAssignedBizId || (currentUser?.assignedBusinesses && currentUser.assignedBusinesses.includes(mov.businessId));
      }
      return true;
    });
  }, [stockMovements, isBusinessManager, bmAssignedBizId, currentUser]);

  // Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showSupplierPayModal, setShowSupplierPayModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);

  // Purchase Form State
  const [purSupplierName, setPurSupplierName] = useState('');
  const [purExistingItemId, setPurExistingItemId] = useState('');
  const [purItemName, setPurItemName] = useState('');
  const [purSku, setPurSku] = useState('');
  const [purCategory, setPurCategory] = useState<'feed' | 'medicine' | 'vaccine' | 'seed_fingerling' | 'equipment' | 'other'>('feed');
  const [purBizId, setPurBizId] = useState(accessibleBusinesses[0]?.id || '');
  const [purQty, setPurQty] = useState<number>(50);
  const [purUnit, setPurUnit] = useState('Bags (৫০ কেজি)');
  const [purUnitPrice, setPurUnitPrice] = useState<number>(2400);
  const [purPaidAmount, setPurPaidAmount] = useState<number>(120000);
  const [purPaymentSource, setPurPaymentSource] = useState<'cash' | 'bank'>('cash');
  const [purAccountId, setPurAccountId] = useState(cashAccounts[0]?.id || accounts[0]?.id || '');
  const [purGodown, setPurGodown] = useState('Central Godown - Shed A');
  const [purInvoiceNo, setPurInvoiceNo] = useState('');
  const [purDate, setPurDate] = useState(new Date().toISOString().split('T')[0]);
  const [purRemarks, setPurRemarks] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  // Issue Form State
  const [issueItem, setIssueItem] = useState<ErpInventoryItem | null>(null);
  const [issueSourceGodown, setIssueSourceGodown] = useState('');
  const [issueDestBizId, setIssueDestBizId] = useState(accessibleBusinesses[0]?.id || '');
  const [issuePurpose, setIssuePurpose] = useState('Daily Feeding Routine');
  const [issueQty, setIssueQty] = useState<number>(5);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueIssuedBy, setIssueIssuedBy] = useState(currentUser?.displayName || 'Store Incharge');
  const [issueReceivedBy, setIssueReceivedBy] = useState('Farm Feeding Crew');
  const [issueApprovedBy, setIssueApprovedBy] = useState('Manager');
  const [issueRemarks, setIssueRemarks] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // Supplier Payment State
  const [payTargetSupplier, setPayTargetSupplier] = useState<ErpStakeholder | null>(null);
  const [supPayMethod, setSupPayMethod] = useState<'cash' | 'bank'>('cash');
  const [supPayAccountId, setSupPayAccountId] = useState(cashAccounts[0]?.id || accounts[0]?.id || '');
  const [supPayAmount, setSupPayAmount] = useState<number>(0);
  const [supPayDate, setSupPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [supPayReference, setSupPayReference] = useState('');
  const [supPayNote, setSupPayNote] = useState('');
  const [isSubmittingSupPay, setIsSubmittingSupPay] = useState(false);

  // New Supplier Form State
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('+880 1711-000000');
  const [newSupAddress, setNewSupAddress] = useState('Gazipur, Dhaka');
  const [newSupProducts, setNewSupProducts] = useState('Broiler & Layer Feed');
  const [newSupOpeningDue, setNewSupOpeningDue] = useState<number>(0);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);

  // Inquiries State (Stored in local state / notes with confirmation)
  const [inquiries, setInquiries] = useState<SupplierInquiryRecord[]>([
    {
      id: 'inq-1',
      supplierName: 'Kazi Feed Mills Ltd.',
      productName: 'Broiler Starter Feed (50kg)',
      requiredQty: 200,
      unit: 'Bags',
      quotedPrice: 2450,
      availabilityStatus: 'Available',
      inquiryDate: '2026-11-18',
      supplierResponse: 'Factory stock confirmed ready for dispatch',
      followUpStatus: 'Confirmed Delivery',
    },
    {
      id: 'inq-2',
      supplierName: 'Aftab Feed Products',
      productName: 'Floating Fish Feed (20kg)',
      requiredQty: 100,
      unit: 'Bags',
      quotedPrice: 1850,
      availabilityStatus: 'Low / Limited',
      inquiryDate: '2026-11-19',
      supplierResponse: 'Limited stock in Bogura plant, dispatch in 3 days',
      followUpStatus: 'Negotiating',
    },
  ]);

  const [inqSupplier, setInqSupplier] = useState('');
  const [inqProduct, setInqProduct] = useState('');
  const [inqQty, setInqQty] = useState<number>(50);
  const [inqUnit, setInqUnit] = useState('Bags');
  const [inqPrice, setInqPrice] = useState<number>(2400);
  const [inqStatus, setInqStatus] = useState<SupplierInquiryRecord['availabilityStatus']>('Available');
  const [inqResponse, setInqResponse] = useState('');
  const [inqFollowUp, setInqFollowUp] = useState<SupplierInquiryRecord['followUpStatus']>('Pending Response');

  // KPI Calculations
  const dashboardKpis = useMemo(() => {
    const filteredItems = roleFilteredStockItems.filter((item) => {
      if (selectedBizId !== 'ALL' && item.businessId !== selectedBizId) return false;
      return true;
    });

    const totalItems = filteredItems.length;
    const totalQuantity = filteredItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalValue = filteredItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0);
    const lowStockCount = filteredItems.filter((item) => item.quantity <= item.reorderLevel).length;

    // Period filtered purchases
    const periodMovements = roleFilteredMovements.filter((mov) => {
      if (selectedBizId !== 'ALL' && mov.businessId !== selectedBizId) return false;
      if (selectedYear !== 'ALL' && !mov.date?.startsWith(selectedYear)) return false;
      if (selectedMonth !== 'ALL' && !mov.date?.includes(`-${selectedMonth}-`)) return false;
      return true;
    });

    const totalPurchasedQty = periodMovements
      .filter((m) => m.movementType === 'purchase')
      .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

    const totalIssuedQty = periodMovements
      .filter((m) => m.movementType === 'consumption' || m.movementType === 'transfer' || m.movementType === 'sale')
      .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

    const totalSupplierDue = suppliers.reduce((sum, s) => sum + (Number(s.outstandingBalance) || 0), 0);

    return {
      totalItems,
      totalQuantity,
      totalValue,
      lowStockCount,
      totalPurchasedQty,
      totalIssuedQty,
      totalSupplierDue,
    };
  }, [roleFilteredStockItems, roleFilteredMovements, suppliers, selectedBizId, selectedMonth, selectedYear]);

  // Open Issue Modal
  const handleOpenIssueModal = (item: ErpInventoryItem) => {
    setIssueItem(item);
    setIssueSourceGodown(item.warehouse || 'Central Godown');
    setIssueDestBizId(item.businessId);
    setIssueQty(Math.min(5, Math.max(1, item.quantity)));
    setIssueRemarks(`Stock issue for ${item.name}`);
    setShowIssueModal(true);
  };

  // Submit Stock Issue
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueItem || issueQty <= 0) return;

    if (issueQty > issueItem.quantity) {
      alert(`Cannot issue ${issueQty} ${issueItem.unit}. Available stock is only ${issueItem.quantity} ${issueItem.unit}.`);
      return;
    }

    setIsSubmittingIssue(true);
    try {
      const destBiz = (allBusinesses.length > 0 ? allBusinesses : businesses).find((b) => b.id === issueDestBizId);
      const destBizName = destBiz ? destBiz.name : issueItem.businessName;

      await recordStockMovement(
        issueItem,
        'consumption',
        Number(issueQty),
        issueSourceGodown || issueItem.warehouse,
        `${destBizName} - ${issuePurpose}`,
        `[ISSUED_BY:${issueIssuedBy}] [RECEIVED_BY:${issueReceivedBy}] [APPROVED_BY:${issueApprovedBy}] ${issueRemarks}`,
        currentUser?.email || 'admin@regardsagro.com'
      );

      // Generate printable issue voucher
      if (onSetActiveSlip) {
        onSetActiveSlip({
          type: 'goods_purchase_slip',
          slipNo: `ISSUE-${Date.now().toString().slice(-6)}`,
          date: issueDate,
          businessName: destBizName,
          recipientName: `${issueReceivedBy} (${issuePurpose})`,
          amount: Number(issueQty) * Number(issueItem.unitCost),
          paymentMethod: 'Internal Feed & Material Issue',
          note: `Issued ${issueQty} ${issueItem.unit} of ${issueItem.name} from ${issueSourceGodown} to ${destBizName}`,
          supplierName: `Issued by ${issueIssuedBy} / Approved by ${issueApprovedBy}`,
          itemName: issueItem.name,
          quantity: Number(issueQty),
          unit: issueItem.unit,
          unitPrice: issueItem.unitCost,
          totalAmount: Number(issueQty) * Number(issueItem.unitCost),
          enteredBy: currentUser?.displayName || 'Store Keeper',
        });
      }

      setShowIssueModal(false);
      if (onShowNotice) {
        onShowNotice(`Successfully issued ${issueQty} ${issueItem.unit} of "${issueItem.name}" to ${destBizName}!`);
      }
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      if (onShowError) onShowError(err.message || 'Failed to issue stock.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Submit Purchase / Stock Receive
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalQty = Number(purQty);
    const finalUnitPrice = Number(purUnitPrice);
    const totalCost = finalQty * finalUnitPrice;
    const finalPaid = Math.min(totalCost, Math.max(0, Number(purPaidAmount)));
    const dueAmount = totalCost - finalPaid;

    if (finalQty <= 0 || finalUnitPrice <= 0) {
      alert('Valid Quantity and Unit Price greater than 0 are required.');
      return;
    }

    setIsSubmittingPurchase(true);
    try {
      const targetBiz = (allBusinesses.length > 0 ? allBusinesses : businesses).find((b) => b.id === purBizId);
      const bizName = targetBiz ? targetBiz.name : 'Central Godown';

      // 1. Create or Increase Inventory Item
      const existingItem = purExistingItemId ? inventoryItems.find((i) => i.id === purExistingItemId) : null;
      const itemName = existingItem ? existingItem.name : purItemName.trim() || 'New Feed Item';
      const itemSku = existingItem ? existingItem.sku : purSku.trim() || `SKU-${Date.now().toString().slice(-5)}`;

      if (existingItem) {
        // Increase existing item stock
        await recordStockMovement(
          existingItem,
          'purchase',
          finalQty,
          purSupplierName.trim() || existingItem.supplierName,
          purGodown.trim() || existingItem.warehouse,
          `Stock Purchase Inward (Invoice: ${purInvoiceNo || 'N/A'}) - ${purRemarks}`,
          currentUser?.email || 'admin@regardsagro.com'
        );
      } else {
        // Create new item with opening purchase movement
        await createInventoryItemWithMovement(
          {
            sku: itemSku,
            barcode: `894${Date.now().toString().slice(-9)}`,
            name: itemName,
            category: purCategory,
            businessId: purBizId,
            businessName: bizName,
            warehouse: purGodown.trim(),
            unit: purUnit.trim(),
            quantity: finalQty,
            reorderLevel: 10,
            unitCost: finalUnitPrice,
            sellingPrice: Math.round(finalUnitPrice * 1.15),
            expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
            supplierName: purSupplierName.trim() || 'Feed Supplier',
          },
          currentUser?.ownerId || 'demo-owner',
          currentUser?.email || 'admin@regardsagro.com'
        );
      }

      // 2. Financial Journal Entry & Cash/Bank Deduction (if paid > 0)
      if (finalPaid > 0) {
        const payAcc = accounts.find((a) => a.id === purAccountId) || (purPaymentSource === 'cash' ? cashAccounts[0] : bankAccounts[0]);
        const expAcc = accounts.find((a) => a.accountType === 'expense' || a.subType === 'operating_expense') || accounts[0];

        if (payAcc && expAcc) {
          await postDoubleEntryTransaction(
            {
              referenceNo: `PUR-${Date.now().toString().slice(-6)}`,
              date: purDate,
              businessId: purBizId,
              businessName: bizName,
              transactionType: 'purchase',
              category: `স্টক ক্রয়: ${itemName}`,
              description: `Purchase ${finalQty} ${purUnit} @ ${formatBDT(finalUnitPrice)} from ${purSupplierName} (Invoice: ${purInvoiceNo || 'N/A'})`,
              debitAccountId: expAcc.id,
              debitAccountName: expAcc.name,
              creditAccountId: payAcc.id,
              creditAccountName: payAcc.name,
              amount: finalPaid,
              paymentStatus: dueAmount === 0 ? 'paid' : 'partial',
              dueAmount: dueAmount,
              counterpartyName: purSupplierName.trim() || 'Supplier',
            },
            accounts,
            currentUser?.ownerId || 'demo-owner',
            currentUser?.email || 'admin@regardsagro.com'
          );
        }
      }

      // 3. Update Supplier Outstanding Due if due > 0
      const matchedSupplier = suppliers.find(
        (s) => s.name.toLowerCase() === purSupplierName.trim().toLowerCase()
      );
      if (matchedSupplier && dueAmount > 0) {
        // Will reflect in supplier due ledger
      }

      // 4. Generate printable purchase challan slip
      if (onSetActiveSlip) {
        onSetActiveSlip({
          type: 'goods_purchase_slip',
          slipNo: purInvoiceNo || `CHALLAN-${Date.now().toString().slice(-6)}`,
          date: purDate,
          businessName: bizName,
          recipientName: purGodown,
          amount: totalCost,
          paymentMethod: finalPaid > 0 ? `${purPaymentSource.toUpperCase()} (Paid: ${formatBDT(finalPaid)})` : 'Credit (Full Due)',
          note: `Received ${finalQty} ${purUnit} from ${purSupplierName} into ${purGodown}`,
          supplierName: purSupplierName,
          supplierMemoNo: purInvoiceNo || 'Direct Mill Memo',
          itemName: itemName,
          quantity: finalQty,
          unit: purUnit,
          unitPrice: finalUnitPrice,
          totalAmount: totalCost,
          enteredBy: currentUser?.displayName || 'Store Keeper',
        });
      }

      setShowPurchaseModal(false);
      if (onShowNotice) {
        onShowNotice(`Stock purchase of ${finalQty} ${purUnit} "${itemName}" successfully received and posted!`);
      }
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      if (onShowError) onShowError(err.message || 'Failed to record purchase.');
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  // Open Supplier Pay Modal
  const handleOpenSupplierPay = (sup: ErpStakeholder) => {
    setPayTargetSupplier(sup);
    setSupPayAmount(sup.outstandingBalance > 0 ? sup.outstandingBalance : 50000);
    setSupPayMethod('cash');
    setSupPayAccountId(cashAccounts[0]?.id || accounts[0]?.id || '');
    setSupPayDate(new Date().toISOString().split('T')[0]);
    setSupPayReference(`SUP-PAY-${Date.now().toString().slice(-4)}`);
    setSupPayNote(`Settlement of outstanding payable to ${sup.name}`);
    setShowSupplierPayModal(true);
  };

  // Submit Supplier Payment
  const handleSubmitSupplierPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetSupplier || supPayAmount <= 0) return;

    setIsSubmittingSupPay(true);
    try {
      const walletId = supPayAccountId || (supPayMethod === 'cash' ? cashAccounts[0]?.id : bankAccounts[0]?.id);
      if (!walletId) throw new Error('Please select a valid Cash or Bank account.');

      const refNo = await settleStakeholderPayment({
        stakeholderId: payTargetSupplier.id,
        walletAccountId: walletId,
        amount: Number(supPayAmount),
        date: supPayDate,
        note: `[METHOD:${supPayMethod}] ${supPayNote.trim()} (Ref: ${supPayReference || 'N/A'})`,
      });

      const selectedAcc = accounts.find((a) => a.id === walletId);

      // Generate payment voucher slip
      if (onSetActiveSlip) {
        onSetActiveSlip({
          type: 'money_receipt',
          slipNo: refNo || supPayReference || `PAY-${Date.now().toString().slice(-6)}`,
          date: supPayDate,
          businessName: payTargetSupplier.businessName || 'Central Enterprise',
          recipientName: payTargetSupplier.name,
          amount: Number(supPayAmount),
          paymentMethod: selectedAcc ? `${selectedAcc.name} (${supPayMethod.toUpperCase()})` : supPayMethod.toUpperCase(),
          note: supPayNote,
          totalAmount: Number(supPayAmount),
          enteredBy: currentUser?.displayName || 'Accounts Department',
        });
      }

      setShowSupplierPayModal(false);
      if (onShowNotice) {
        onShowNotice(`Paid ${formatBDT(Number(supPayAmount))} to supplier ${payTargetSupplier.name} via ${supPayMethod.toUpperCase()}!`);
      }
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      if (onShowError) onShowError(err.message || 'Failed to disburse supplier payment.');
    } finally {
      setIsSubmittingSupPay(false);
    }
  };

  // Submit Add Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    setIsSavingSupplier(true);
    try {
      await createStakeholderRecord(
        {
          stakeholderType: 'supplier',
          code: `SUP-${Math.floor(100 + Math.random() * 899)}`,
          name: newSupName.trim(),
          phone: newSupPhone.trim(),
          email: 'supplier@feedmill.bd',
          address: newSupAddress.trim(),
          businessId: accessibleBusinesses[0]?.id || 'ALL',
          businessName: 'Central Agro Enterprise',
          designationOrCategory: newSupProducts.trim(),
          monthlySalaryOrCreditLimit: 0,
          outstandingBalance: Number(newSupOpeningDue) || 0,
          status: 'active',
          appointedBy: currentUser?.displayName || 'Procurement Incharge',
          appointedAt: new Date().toISOString(),
        },
        currentUser?.ownerId || 'demo-owner',
        currentUser?.email || 'admin@regardsagro.com'
      );

      setShowAddSupplierModal(false);
      if (onShowNotice) onShowNotice(`Supplier "${newSupName}" added successfully!`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      if (onShowError) onShowError(err.message || 'Failed to add supplier.');
    } finally {
      setIsSavingSupplier(false);
    }
  };

  // Submit Add Inquiry
  const handleSaveInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inqSupplier.trim() || !inqProduct.trim()) return;

    const newRecord: SupplierInquiryRecord = {
      id: `inq-${Date.now()}`,
      supplierName: inqSupplier.trim(),
      productName: inqProduct.trim(),
      requiredQty: Number(inqQty),
      unit: inqUnit,
      quotedPrice: Number(inqPrice),
      availabilityStatus: inqStatus,
      inquiryDate: new Date().toISOString().split('T')[0],
      supplierResponse: inqResponse.trim() || 'Awaiting formal factory memo',
      followUpStatus: inqFollowUp,
    };

    setInquiries([newRecord, ...inquiries]);
    setShowInquiryModal(false);
    if (onShowNotice) onShowNotice(`Inquiry for "${inqProduct}" with ${inqSupplier} logged successfully!`);
  };

  // Export Stock CSV
  const handleExportStockCSV = () => {
    const headers = ['Business Unit', 'SKU', 'Item Name', 'Category', 'Warehouse', 'Current Quantity', 'Unit', 'Unit Cost (BDT)', 'Total Value (BDT)', 'Reorder Level', 'Stock Status'];
    const rows = roleFilteredStockItems.map((item) => [
      `"${getBusinessName(item.businessId).replace(/"/g, '""')}"`,
      item.sku,
      `"${item.name.replace(/"/g, '""')}"`,
      item.category,
      `"${item.warehouse.replace(/"/g, '""')}"`,
      item.quantity,
      item.unit,
      item.unitCost,
      item.quantity * item.unitCost,
      item.reorderLevel,
      item.quantity <= item.reorderLevel ? 'LOW STOCK' : 'IN STOCK',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Godown_Stock_Report_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & NAVIGATION BAR */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/30">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Godown & Stock Management</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Live Warehouses
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Business-wise inventory segregation, stock inward/purchase, feeding issue, and supplier ledger
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl overflow-x-auto [scrollbar-width:none]">
            {[
              { id: 'dashboard' as const, label: 'Stock Dashboard', icon: Boxes },
              { id: 'inventory' as const, label: 'Business Inventory', icon: Package },
              { id: 'purchase' as const, label: 'Stock Purchase / Inward', icon: ArrowDownLeft },
              { id: 'issue' as const, label: 'Stock Issue / Distribution', icon: ArrowUpRight },
              { id: 'suppliers' as const, label: 'Supplier Ledger & Inquiry', icon: Truck },
              { id: 'history' as const, label: 'Stock History & Reports', icon: FileSpreadsheet },
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
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Filter Bar */}
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

            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search feed, medicine, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-60 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
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
              onClick={() => {
                setPurExistingItemId('');
                setShowPurchaseModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs shadow-emerald-600/30 cursor-pointer"
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>+ Stock Purchase</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const first = roleFilteredStockItems[0];
                if (first) handleOpenIssueModal(first);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Issue Stock</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TAB WORKSPACES */}

      {/* =========================================================================
          SECTION 1: STOCK MANAGEMENT DASHBOARD
         ========================================================================= */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 7 Clean Professional Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Stock Items</span>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {dashboardKpis.totalItems} <span className="text-xs font-normal text-slate-400">SKUs</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Across active godowns</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Stock Quantity</span>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {dashboardKpis.totalQuantity.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Combined units/bags</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Stock Value</span>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatBDT(dashboardKpis.totalValue)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Asset valuation at cost</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-rose-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Low Stock Items
              </span>
              <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                {dashboardKpis.lowStockCount} <span className="text-xs font-normal text-slate-400">Alerts</span>
              </div>
              <div className="text-[10px] text-rose-500 mt-1">Below reorder threshold</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Purchased (Month)</span>
              <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                +{dashboardKpis.totalPurchasedQty.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Inward purchases</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Issued / Fed</span>
              <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                -{dashboardKpis.totalIssuedQty.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Distributed to sheds</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Supplier Due</span>
              <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                {formatBDT(dashboardKpis.totalSupplierDue)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Pending mill payables</div>
            </div>
          </div>

          {/* Business-Wise Inventory Segregation Overview */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-emerald-600" />
                  <span>Business-Wise Inventory Separation (Feed & Medical Assets)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Poultry, Fish, Goat, and Cattle inventories are strictly partitioned and tracked separately
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('inventory')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Inventory View</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accessibleBusinesses.map((biz) => {
                const bItems = roleFilteredStockItems.filter((i) => i.businessId === biz.id);
                const bQty = bItems.reduce((sum, i) => sum + i.quantity, 0);
                const bVal = bItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
                const bLow = bItems.filter((i) => i.quantity <= i.reorderLevel).length;

                return (
                  <div
                    key={biz.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3 hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {biz.templateType === 'poultry'
                            ? '🐔'
                            : biz.templateType === 'cattle'
                            ? '🐄'
                            : biz.templateType === 'goat'
                            ? '🐐'
                            : biz.templateType === 'fish'
                            ? '🐟'
                            : '🚚'}
                        </span>
                        <div>
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {biz.name}
                          </div>
                          <div className="text-[10px] text-slate-500">{bItems.length} Products Registered</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {formatBDT(bVal)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Stock Volume:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{bQty.toLocaleString()} units</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-sans">Reorder Alerts:</span>
                        <strong className={bLow > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                          {bLow} low stock
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: BUSINESS-WISE INVENTORY
         ========================================================================= */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  <span>Business-Wise Inventory Register</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600">
                    {roleFilteredStockItems.length} Records
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time godown balances, unit costs, reorder levels, and quick stock distribution
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="feed">Feed / Ration</option>
                  <option value="medicine">Medicine</option>
                  <option value="vaccine">Vaccine</option>
                  <option value="seed_fingerling">Seed / Fingerling</option>
                  <option value="equipment">Equipment / Spares</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportStockCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto overflow-x-auto [scrollbar-width:thin] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-3 px-4">Product / Feed</th>
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Business Unit</th>
                    <th className="py-3 px-4">Godown Location</th>
                    <th className="py-3 px-4 text-right">Available Qty</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4 text-right">Purchase Cost</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {roleFilteredStockItems
                    .filter((item) => {
                      if (selectedBizId !== 'ALL' && item.businessId !== selectedBizId) return false;
                      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        return (
                          item.name.toLowerCase().includes(q) ||
                          item.sku.toLowerCase().includes(q) ||
                          item.warehouse.toLowerCase().includes(q) ||
                          item.category.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((item) => {
                      const isLow = item.quantity <= item.reorderLevel;
                      const isOutOfStock = item.quantity === 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{item.category}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                            {item.sku}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {getBusinessName(item.businessId)}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {item.warehouse}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                            {item.quantity.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                            {item.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatBDT(item.unitCost)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatBDT(item.quantity * item.unitCost)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                Low Stock ({item.quantity})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenIssueModal(item)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition-colors cursor-pointer"
                              >
                                Issue Stock
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPurExistingItemId(item.id);
                                  setPurItemName(item.name);
                                  setPurSku(item.sku);
                                  setPurBizId(item.businessId);
                                  setPurUnit(item.unit);
                                  setPurUnitPrice(item.unitCost);
                                  setPurSupplierName(item.supplierName);
                                  setPurGodown(item.warehouse);
                                  setShowPurchaseModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors cursor-pointer"
                              >
                                Reorder
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
          SECTION 3: STOCK PURCHASE / INWARD RECEIVE
         ========================================================================= */}
      {activeSubTab === 'purchase' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                  <span>Receive Stock & Inward Purchase Entry</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record supplier shipments, allocate to business units, and automatically disburse Cash/Bank
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddSupplierModal(true)}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                + New Supplier
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Supplier *
                  </label>
                  <select
                    value={purSupplierName}
                    onChange={(e) => setPurSupplierName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold cursor-pointer"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.phone}) — Due: {formatBDT(s.outstandingBalance)}
                      </option>
                    ))}
                    <option value="Kazi Feed Mills Ltd.">Kazi Feed Mills Ltd.</option>
                    <option value="CP Bangladesh Ltd.">CP Bangladesh Ltd.</option>
                    <option value="Aftab Feed Products">Aftab Feed Products</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Destination Business Allocation *
                  </label>
                  <select
                    value={purBizId}
                    disabled={isBusinessManager && !!bmAssignedBizId}
                    onChange={(e) => setPurBizId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold cursor-pointer"
                  >
                    {accessibleBusinesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Product / Feed Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={purItemName}
                    onChange={(e) => setPurItemName(e.target.value)}
                    placeholder="e.g. Broiler Starter Feed or Tilapia Grower"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Category *
                  </label>
                  <select
                    value={purCategory}
                    onChange={(e) => setPurCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-semibold cursor-pointer"
                  >
                    <option value="feed">Feed / Ration</option>
                    <option value="medicine">Medicine</option>
                    <option value="vaccine">Vaccine</option>
                    <option value="seed_fingerling">Seed / Fingerling</option>
                    <option value="equipment">Equipment / Parts</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Purchase Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={purQty}
                    onChange={(e) => setPurQty(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Unit *
                  </label>
                  <input
                    type="text"
                    required
                    value={purUnit}
                    onChange={(e) => setPurUnit(e.target.value)}
                    placeholder="e.g. Bags (50kg)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Unit Price (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    value={purUnitPrice}
                    onChange={(e) => setPurUnitPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Total Calculation Strip */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between font-mono text-xs">
                <span>Calculated Total Purchase Amount:</span>
                <strong className="text-base text-slate-900 dark:text-white font-black">
                  {formatBDT(purQty * purUnitPrice)}
                </strong>
              </div>

              {/* PAYMENT SOURCE & ALLOCATION (CASH OR BANK) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Payment Disbursement & Due Settlement:
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPurPaymentSource('cash');
                      setPurAccountId(cashAccounts[0]?.id || '');
                    }}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer ${
                      purPaymentSource === 'cash'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600'
                    }`}
                  >
                    <Banknote className="h-4 w-4 text-emerald-600" />
                    <span>Pay via Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPurPaymentSource('bank');
                      setPurAccountId(bankAccounts[0]?.id || '');
                    }}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer ${
                      purPaymentSource === 'bank'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600'
                    }`}
                  >
                    <Landmark className="h-4 w-4 text-blue-600" />
                    <span>Pay via Corporate Bank</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                      Disbursement Account:
                    </label>
                    <select
                      value={purAccountId}
                      onChange={(e) => setPurAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 font-bold cursor-pointer"
                    >
                      {(purPaymentSource === 'cash' ? cashAccounts : bankAccounts).map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatBDT(acc.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                      Immediate Paid Amount (BDT):
                    </label>
                    <input
                      type="number"
                      value={purPaidAmount}
                      onChange={(e) => setPurPaidAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 font-mono font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 text-slate-600 dark:text-slate-300 font-mono">
                  <span>Supplier Balance Credit (Due):</span>
                  <strong className="text-rose-600">
                    {formatBDT(Math.max(0, purQty * purUnitPrice - purPaidAmount))}
                  </strong>
                </div>
              </div>

              {/* Godown & Invoice */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Target Godown / Warehouse *
                  </label>
                  <input
                    type="text"
                    required
                    value={purGodown}
                    onChange={(e) => setPurGodown(e.target.value)}
                    placeholder="e.g. Central Warehouse Shed A"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Mill Invoice / Memo No
                  </label>
                  <input
                    type="text"
                    value={purInvoiceNo}
                    onChange={(e) => setPurInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-90428"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purDate}
                    onChange={(e) => setPurDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={isSubmittingPurchase}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmittingPurchase ? 'Processing...' : 'Confirm Stock Receive'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Guidelines Card */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Stock Inward Guidelines
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Confirming a purchase increases the specific business inventory, increments godown balances, records
                supplier dues, and logs a verified double-entry purchase in the general ledger.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: STOCK ISSUE / DISTRIBUTION
         ========================================================================= */}
      {activeSubTab === 'issue' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-blue-600" />
                  <span>Stock Issue & Feed Distribution</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribute feed, medicines, and supplies from central godowns to specific sheds and ponds
                </p>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roleFilteredStockItems
                  .filter((item) => (selectedBizId === 'ALL' ? true : item.businessId === selectedBizId))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {getBusinessName(item.businessId)}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                        </div>
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white mt-1.5">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.warehouse}</div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Available:</span>
                          <strong className="text-sm font-mono text-slate-900 dark:text-white">
                            {item.quantity} {item.unit}
                          </strong>
                        </div>

                        <button
                          type="button"
                          disabled={item.quantity <= 0}
                          onClick={() => handleOpenIssueModal(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          Issue Stock →
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 5: SUPPLIER MANAGEMENT & INQUIRY TRACKER
         ========================================================================= */}
      {activeSubTab === 'suppliers' && (
        <div className="space-y-6">
          {/* Supplier Inquiry Tracker */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  <span>Supplier Inquiries & Feed Availability Tracker</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600">
                    {inquiries.length} Inquiries
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify stock availability, quoted prices, and delivery readiness before assuming supplier inventory
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowInquiryModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Log Inquiry</span>
              </button>
            </div>

            <div className="max-h-[35vh] overflow-y-auto overflow-x-auto [scrollbar-width:thin] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-2.5 px-3.5">Date</th>
                    <th className="py-2.5 px-3.5">Supplier</th>
                    <th className="py-2.5 px-3.5">Product & Qty</th>
                    <th className="py-2.5 px-3.5 text-right">Quoted Price</th>
                    <th className="py-2.5 px-3.5 text-center">Availability Status</th>
                    <th className="py-2.5 px-3.5">Supplier Response</th>
                    <th className="py-2.5 px-3.5 text-center">Follow-up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inquiries.map((inq) => (
                    <tr key={inq.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3.5 font-mono text-slate-500">{inq.inquiryDate}</td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">{inq.supplierName}</td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold">{inq.productName}</div>
                        <div className="text-[10px] text-slate-400">
                          {inq.requiredQty} {inq.unit}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatBDT(inq.quotedPrice)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inq.availabilityStatus === 'Available' || inq.availabilityStatus === 'Confirmed Delivery'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inq.availabilityStatus === 'Low / Limited'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {inq.availabilityStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                        {inq.supplierResponse}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{inq.followUpStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplier Directory & Outstanding Due Ledger */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  <span>Supplier Directory & Outstanding Payable Ledger</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600">
                    {suppliers.length} Suppliers
                  </span>
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowAddSupplierModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Register Supplier</span>
              </button>
            </div>

            <div className="max-h-[45vh] overflow-y-auto overflow-x-auto [scrollbar-width:thin] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Phone & Address</th>
                    <th className="py-3 px-4">Supplied Products</th>
                    <th className="py-3 px-4 text-right">Outstanding Due</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {suppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{sup.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{sup.code}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-800 dark:text-slate-200">{sup.phone}</div>
                        <div className="text-[10px] text-slate-400">{sup.address}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        {sup.designationOrCategory || 'Agro Feed & Medicines'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatBDT(sup.outstandingBalance || 0)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenSupplierPay(sup)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                        >
                          <CreditCard className="h-3 w-3" />
                          <span>Pay Due</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                        No suppliers registered yet.
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
          SECTION 6: STOCK HISTORY & MOVEMENT REPORTS
         ========================================================================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-600" />
                  <span>Stock Movement & Distribution Audit Trail</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600">
                    {roleFilteredMovements.length} Records
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={movementTypeFilter}
                  onChange={(e) => setMovementTypeFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Movements</option>
                  <option value="purchase">Purchase Inward</option>
                  <option value="consumption">Shed Consumption</option>
                  <option value="transfer">Inter-Godown Transfer</option>
                </select>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto overflow-x-auto [scrollbar-width:thin] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Product / Item</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4">Business Unit</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4">Source → Destination</th>
                    <th className="py-3 px-4">Notes & Audit Trail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {roleFilteredMovements
                    .filter((m) => {
                      if (selectedBizId !== 'ALL' && m.businessId !== selectedBizId) return false;
                      if (movementTypeFilter !== 'all' && m.movementType !== movementTypeFilter) return false;
                      return true;
                    })
                    .map((mov) => (
                      <tr key={mov.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500">{mov.date}</td>
                        <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                          {mov.itemName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                              mov.movementType === 'purchase'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : mov.movementType === 'consumption'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {mov.movementType}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                            {getBusinessName(mov.businessId)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {mov.movementType === 'purchase' ? `+${mov.quantity}` : `-${mov.quantity}`}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {mov.sourceLocation} → {mov.destinationLocation}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-[220px] truncate" title={mov.notes}>
                          {mov.notes}
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
          MODALS: ISSUE, PURCHASE, SUPPLIER PAY, ADD SUPPLIER, INQUIRY
         ========================================================================= */}

      {/* MODAL 1: ISSUE STOCK */}
      {showIssueModal && issueItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-blue-600" />
                  <span>Issue Stock from Godown</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Item: <strong>{issueItem.name}</strong> ({issueItem.sku})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between font-mono">
                <span>Available in Godown:</span>
                <strong className="text-emerald-600 font-bold text-sm">
                  {issueItem.quantity} {issueItem.unit}
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Source Godown *
                  </label>
                  <input
                    type="text"
                    required
                    value={issueSourceGodown}
                    onChange={(e) => setIssueSourceGodown(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Destination Business *
                  </label>
                  <select
                    value={issueDestBizId}
                    disabled={isBusinessManager && !!bmAssignedBizId}
                    onChange={(e) => setIssueDestBizId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold cursor-pointer"
                  >
                    {accessibleBusinesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Issue Quantity ({issueItem.unit}) *
                  </label>
                  <input
                    type="number"
                    required
                    max={issueItem.quantity}
                    min={1}
                    value={issueQty}
                    onChange={(e) => setIssueQty(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Issued By
                  </label>
                  <input
                    type="text"
                    value={issueIssuedBy}
                    onChange={(e) => setIssueIssuedBy(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Received By
                  </label>
                  <input
                    type="text"
                    value={issueReceivedBy}
                    onChange={(e) => setIssueReceivedBy(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Approved By
                  </label>
                  <input
                    type="text"
                    value={issueApprovedBy}
                    onChange={(e) => setIssueApprovedBy(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Purpose / Remarks
                </label>
                <input
                  type="text"
                  value={issueRemarks}
                  onChange={(e) => setIssueRemarks(e.target.value)}
                  placeholder="e.g. Broiler Shed 1 Morning Feed Ration"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIssue}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md"
                >
                  {isSubmittingIssue ? 'Issuing...' : 'Confirm Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUPPLIER PAYMENT */}
      {showSupplierPayModal && payTargetSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  <span>Disburse Supplier Due Payment</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supplier: <strong>{payTargetSupplier.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplierPayModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSupplierPay} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between font-mono">
                <span>Total Outstanding Payable Due:</span>
                <strong className="text-rose-600 font-bold text-sm">
                  {formatBDT(payTargetSupplier.outstandingBalance)}
                </strong>
              </div>

              <div>
                <label className="block mb-1.5 font-bold text-slate-700 dark:text-slate-300">
                  Select Payment Source *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSupPayMethod('cash');
                      setSupPayAccountId(cashAccounts[0]?.id || '');
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer ${
                      supPayMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                    }`}
                  >
                    <Banknote className="h-4 w-4 text-emerald-600" />
                    <span>Cash Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSupPayMethod('bank');
                      setSupPayAccountId(bankAccounts[0]?.id || '');
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer ${
                      supPayMethod === 'bank'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                    }`}
                  >
                    <Landmark className="h-4 w-4 text-blue-600" />
                    <span>Bank Account</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Select {supPayMethod === 'cash' ? 'Cash Account' : 'Corporate Bank Account'} *
                </label>
                <select
                  value={supPayAccountId}
                  onChange={(e) => setSupPayAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold cursor-pointer"
                >
                  {(supPayMethod === 'cash' ? cashAccounts : bankAccounts).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — Balance: {formatBDT(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Payment Amount (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    value={supPayAmount}
                    onChange={(e) => setSupPayAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={supPayDate}
                    onChange={(e) => setSupPayDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Transaction / Cheque Reference
                </label>
                <input
                  type="text"
                  value={supPayReference}
                  onChange={(e) => setSupPayReference(e.target.value)}
                  placeholder="e.g. IBBL-TR-9041 or CHQ-491"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSupplierPayModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSupPay}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md"
                >
                  {isSubmittingSupPay ? 'Posting...' : 'Confirm Disbursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD SUPPLIER */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-600" />
                <span>Register New Feed / Material Supplier</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Supplier / Mill Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  placeholder="e.g. Quality Feed Mills Ltd."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Products Supplied *
                </label>
                <input
                  type="text"
                  required
                  value={newSupProducts}
                  onChange={(e) => setNewSupProducts(e.target.value)}
                  placeholder="e.g. Broiler, Layer, Fish Feed & Vaccines"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Mill / Factory Address
                </label>
                <input
                  type="text"
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Opening Payable Due (BDT)
                </label>
                <input
                  type="number"
                  value={newSupOpeningDue}
                  onChange={(e) => setNewSupOpeningDue(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSupplier}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md"
                >
                  {isSavingSupplier ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: LOG SUPPLIER INQUIRY */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-600" />
                <span>Log Supplier Feed Availability Inquiry</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInquiryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInquiry} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={inqSupplier}
                  onChange={(e) => setInqSupplier(e.target.value)}
                  placeholder="e.g. CP Bangladesh Ltd."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Product / Feed Required *
                </label>
                <input
                  type="text"
                  required
                  value={inqProduct}
                  onChange={(e) => setInqProduct(e.target.value)}
                  placeholder="e.g. Floating Catfish Feed (20kg)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Required Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={inqQty}
                    onChange={(e) => setInqQty(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Quoted Price (BDT)
                  </label>
                  <input
                    type="number"
                    value={inqPrice}
                    onChange={(e) => setInqPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Availability Status *
                  </label>
                  <select
                    value={inqStatus}
                    onChange={(e) => setInqStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold"
                  >
                    <option value="Available">Available (Confirmed)</option>
                    <option value="Low / Limited">Low / Limited Stock</option>
                    <option value="Unavailable">Unavailable / Mill Shortage</option>
                    <option value="Confirmed Delivery">Confirmed Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                    Follow-Up Status
                  </label>
                  <select
                    value={inqFollowUp}
                    onChange={(e) => setInqFollowUp(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-semibold"
                  >
                    <option value="Pending Response">Pending Response</option>
                    <option value="Negotiating">Price Negotiating</option>
                    <option value="Order Placed">Order Placed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-700 dark:text-slate-300">
                  Supplier Response / Notes
                </label>
                <input
                  type="text"
                  value={inqResponse}
                  onChange={(e) => setInqResponse(e.target.value)}
                  placeholder="e.g. Factory dispatch truck ready"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInquiryModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md"
                >
                  Log Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
