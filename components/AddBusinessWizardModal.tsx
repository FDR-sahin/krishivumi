'use client';

import React, { useState } from 'react';
import {
  X,
  Building2,
  Check,
  Bird,
  Beef,
  ShieldCheck,
  Fish,
  Truck,
  Factory,
  Wheat,
  Store,
  Plus,
} from 'lucide-react';
import { BUSINESS_TEMPLATES, BusinessTemplateType } from '@/lib/erp-types';
import { createDynamicBusiness } from '@/lib/erp-service';

interface AddBusinessWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  actorEmail: string;
  userRole: string;
  onSuccess: (newBusinessId: string) => void;
}

const AVAILABLE_MODULES = [
  { id: 'accounting', label: 'Double-Entry Accounting' },
  { id: 'inventory', label: 'Stock & Warehouse Control' },
  { id: 'sales_pos', label: 'Wholesale & Retail Sales' },
  { id: 'procurement', label: 'Supplier Procurement' },
  { id: 'hr_payroll', label: 'Employee & Payroll' },
  { id: 'batch_tracking', label: 'Production Batch Tracking' },
  { id: 'livestock_health', label: 'Veterinary & Bio-Health' },
  { id: 'fleet_trips', label: 'Vehicle & Trip Dispatch' },
];

const ICON_OPTIONS = [
  { name: 'Bird', label: 'Poultry', Icon: Bird },
  { name: 'Beef', label: 'Cattle / Dairy', Icon: Beef },
  { name: 'ShieldCheck', label: 'Goat / Livestock', Icon: ShieldCheck },
  { name: 'Fish', label: 'Fisheries', Icon: Fish },
  { name: 'Truck', label: 'Transport', Icon: Truck },
  { name: 'Factory', label: 'Agro Processing', Icon: Factory },
  { name: 'Wheat', label: 'Crops / Rice / Feed', Icon: Wheat },
  { name: 'Store', label: 'Wholesale / Retail', Icon: Store },
];

export default function AddBusinessWizardModal({
  isOpen,
  onClose,
  ownerId,
  actorEmail,
  userRole,
  onSuccess,
}: AddBusinessWizardModalProps) {
  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplateType>('custom');
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Agro Processing & Trading');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('Factory');
  const [location, setLocation] = useState('Bogura Industrial Park, Bangladesh');
  const [contactPhone, setContactPhone] = useState('+880 1711-900100');
  const [managerName, setManagerName] = useState('');
  const [enabledModules, setEnabledModules] = useState<string[]>([
    'accounting',
    'inventory',
    'sales_pos',
    'procurement',
  ]);
  const [customFieldsSpec, setCustomFieldsSpec] = useState(
    'License No, Daily Capacity (MT), Quality Grade'
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (tplType: BusinessTemplateType) => {
    setSelectedTemplate(tplType);
    const found = BUSINESS_TEMPLATES.find((t) => t.templateType === tplType);
    if (found) {
      setName(found.title === 'Dairy Products / Agro Processing' ? 'Dairy Products & Chilling Plant' : `${found.title} Unit #2`);
      setNameBn(found.titleBn);
      setCategory(found.category);
      setDescription(found.description);
      setIconName(found.iconName);
      setEnabledModules(found.defaultModules);
      setCustomFieldsSpec(found.defaultCustomFields.join(', '));
      setCode(`BIZ-${tplType.toUpperCase().slice(0, 4)}-06`);
    }
  };

  const toggleModule = (modId: string) => {
    setEnabledModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (userRole !== 'super_admin') {
      setErrorMsg('Permission Denied: Only Super Admin can create new businesses.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Please enter a valid Business Name.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: code.trim() || `BIZ-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        nameBn: nameBn.trim() || name.trim(),
        category: category.trim() || 'Agro Enterprise',
        templateType: mode === 'template' ? selectedTemplate : ('custom' as BusinessTemplateType),
        description: description.trim() || 'Dynamic business unit managed via RegardsAgro ERP.',
        iconName,
        location: location.trim() || 'Dhaka, Bangladesh',
        contactPhone: contactPhone.trim() || '+880 1700-000000',
        managerName: managerName.trim() || 'Operations Manager',
        status: 'active' as const,
        enabledModules: enabledModules.join(','),
        customFieldsSpec: customFieldsSpec.trim(),
        currency: 'BDT',
      };

      const res = await fetch('/api/erp/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'business',
          payload,
          userRole,
        }),
      });
      const check = await res.json();
      if (!res.ok || !check.ok) {
        throw new Error(check.error || 'Validation failed');
      }

      const newId = await createDynamicBusiness(payload, ownerId, actorEmail);
      onSuccess(newId);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create business');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Create New Business Unit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dynamically provision a new agro, trading, or logistics business into the central ERP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Option Switcher */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('template')}
              className={`py-2.5 px-4 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                mode === 'template'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Option A: Use Existing Agro Template
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('custom');
                setSelectedTemplate('custom');
              }}
              className={`py-2.5 px-4 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                mode === 'custom'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Option B: Create Custom Business
            </button>
          </div>

          {mode === 'template' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Select Specialized Business Template
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {BUSINESS_TEMPLATES.map((tpl) => {
                  const active = selectedTemplate === tpl.templateType;
                  return (
                    <button
                      key={tpl.templateType}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl.templateType)}
                      className={`text-left p-3.5 rounded-lg border transition-colors ${
                        active
                          ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {tpl.title}
                        </span>
                        {active && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Presets for Option B Custom Businesses */}
          {mode === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Quick Custom Industry Presets (Or enter any custom business below)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Dairy Products & Ghee Plant', nameBn: 'Dairy Products & Ghee Plant', cat: 'Dairy Processing', icon: 'Factory' },
                  { name: 'Fish Feed Mill Business', nameBn: 'Fish Feed Mill Business', cat: 'Feed Manufacturing', icon: 'Factory' },
                  { name: 'Auto Rice Mill & Trading', nameBn: 'Auto Rice Mill & Trading', cat: 'Grain Trading', icon: 'Wheat' },
                  { name: 'Agricultural Land & Seed Estate', nameBn: 'Agricultural Land & Seed Estate', cat: 'Crop & Land', icon: 'Wheat' },
                  { name: 'Vegetable & Cold Storage Wholesale', nameBn: 'Vegetable & Cold Storage Wholesale', cat: 'Wholesale Trading', icon: 'Store' },
                  { name: 'Agro Retail Superstore', nameBn: 'Agro Retail Superstore', cat: 'Retail Business', icon: 'Store' },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setName(preset.name);
                      setNameBn(preset.nameBn);
                      setCategory(preset.cat);
                      setIconName(preset.icon);
                      setCode(`BIZ-${preset.cat.slice(0, 4).toUpperCase()}-07`);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-colors"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Core Business Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Business Name (English) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Fish Feed Manufacturing Unit"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Business Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., BIZ-FEED-06"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Business Display Name
              </label>
              <input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="e.g. Fish Feed Processing Business"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Business Category *
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Feed Mill / Rice Trading"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Business Icon
              </label>
              <select
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt.name} value={opt.name}>
                    {opt.label} ({opt.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location / Site Address
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Business Manager Name
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="e.g., Md. Ashraful Islam"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Business Description & Operational Scope
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the operations, target market, and production workflow..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Enable / Disable Modules */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Enable / Disable ERP Modules for this Business
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AVAILABLE_MODULES.map((mod) => {
                const checked = enabledModules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors ${
                      checked
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center ${
                        checked ? 'bg-emerald-600 text-white' : 'border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </div>
                    <span className="truncate">{mod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Fields Spec */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Custom Business Fields / KPIs (Comma-separated)
            </label>
            <input
              type="text"
              value={customFieldsSpec}
              onChange={(e) => setCustomFieldsSpec(e.target.value)}
              placeholder="e.g., Moisture %, Milling Yield, Storage Silo ID, BSTI Batch No"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 px-4 py-3 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {submitting ? 'Provisioning Business...' : 'Launch Business on Main Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
