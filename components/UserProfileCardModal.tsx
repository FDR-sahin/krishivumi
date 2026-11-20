'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Phone,
  Mail,
  CreditCard,
  MapPin,
  Calendar,
  Briefcase,
  Camera,
  Check,
  Building2,
  PhoneCall,
  Save,
  Edit3,
} from 'lucide-react';
import { UserRole } from '@/lib/erp-types';

export interface UserProfileData {
  id?: string;
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  nidNumber?: string;
  designation?: string;
  role?: UserRole | string;
  businessName?: string;
  businessNames?: string[];
  businessId?: string;
  address?: string;
  emergencyContact?: string;
  photoUrl?: string;
  joiningDate?: string;
  monthlySalary?: number;
  status?: string;
  appointedBy?: string;
  password?: string;
}

interface UserProfileCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfileData | null;
  canEdit?: boolean;
  onSave?: (updated: UserProfileData) => Promise<void>;
  lang?: 'bn' | 'en';
}

export default function UserProfileCardModal({
  isOpen,
  onClose,
  profile,
  canEdit = false,
  onSave,
  lang = 'en',
}: UserProfileCardModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bn = false;

  // Editable Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nidNumber, setNidNumber] = useState('');
  const [designation, setDesignation] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Sync state when profile opens
  React.useEffect(() => {
    if (profile) {
      setName(profile.displayName || profile.name || '');
      setPhone(profile.phone || '');
      setNidNumber(profile.nidNumber || '');
      setDesignation(profile.designation || '');
      setAddress(profile.address || '');
      setEmergencyContact(profile.emergencyContact || '');
      setPhotoUrl(profile.photoUrl || '');
      setNewPassword('');
      setIsEditing(false);
    }
  }, [profile]);

  if (!isOpen || !profile) return null;

  // Handle Photo File Upload with client-side canvas compression to max 300x300 JPEG
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoUrl(compressedDataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCopyPhone = () => {
    if (!profile.phone && !phone) return;
    navigator.clipboard.writeText(phone || profile.phone || '');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({
        ...profile,
        name,
        phone,
        nidNumber,
        designation,
        address,
        emergencyContact,
        photoUrl,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  // Helper for role badge label and styling
  const getRoleDetails = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return {
          title: bn ? 'সুপার অ্যাডমিন (মালিক / MD)' : 'Super Admin (Owner / MD)',
          badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
          gradient: 'from-emerald-600 to-teal-700',
        };
      case 'super_manager':
        return {
          title: bn ? 'জেনারেল ম্যানেজার (Super Manager)' : 'General Manager',
          badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          gradient: 'from-blue-600 to-indigo-700',
        };
      case 'business_manager':
        return {
          title: bn ? 'ইউনিট ম্যানেজার (Business Manager)' : 'Business Manager',
          badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
          gradient: 'from-purple-600 to-violet-700',
        };
      default:
        return {
          title: bn ? 'কর্মকর্তা / কর্মচারী (Staff)' : 'Officer / Staff',
          badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          gradient: 'from-amber-600 to-orange-700',
        };
    }
  };

  const roleInfo = getRoleDetails(profile.role);
  const initials = (profile.name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const activePhoto = isEditing ? photoUrl : profile.photoUrl || photoUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Cover Banner */}
        <div className={`h-24 sm:h-28 bg-gradient-to-r ${roleInfo.gradient} relative px-6 flex items-start justify-between pt-4`}>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              {bn ? 'অফিসিয়াল প্রোফাইল কার্ড' : 'Official Identity Card'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
            title={bn ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Profile Content Body */}
        <div className="px-6 pb-6 overflow-y-auto flex-1 -mt-12 sm:-mt-14 space-y-4">
          {/* Avatar and Primary Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="relative group">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 shadow-xl overflow-hidden flex items-center justify-center">
                {activePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activePhoto}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${roleInfo.gradient} text-white font-black text-3xl flex items-center justify-center`}>
                    {initials}
                  </div>
                )}
              </div>

              {/* Upload photo trigger */}
              {canEdit && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      fileInputRef.current?.click();
                    }}
                    className="absolute bottom-1 right-1 p-2 rounded-xl bg-slate-900/90 text-white hover:bg-emerald-600 shadow-lg transition-colors"
                    title={bn ? 'ছবি পরিবর্তন করুন' : 'Change photo'}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {/* Quick Actions (Call / Edit) */}
            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              {(profile.phone || phone) && (
                <a
                  href={`tel:${phone || profile.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  <span>{bn ? 'কল করুন' : 'Call'}</span>
                </a>
              )}

              {canEdit && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{bn ? 'এডিট করুন' : 'Edit Profile'}</span>
                </button>
              )}
            </div>
          </div>

          {/* VIEW MODE: Read-Only Info Card */}
          {!isEditing ? (
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {profile.name}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleInfo.badgeColor}`}>
                    {roleInfo.title}
                  </span>
                </div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>{profile.designation || (bn ? 'অফিসার / দায়িত্বপ্রাপ্ত' : 'Designated Officer')}</span>
                  {profile.businessName && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-400">{profile.businessName}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Identity & Verification Pill Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Phone */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 mt-0.5">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {bn ? 'মোবাইল নম্বর' : 'Phone Number'}
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {profile.phone || (bn ? 'দেওয়া হয়নি' : 'Not Provided')}
                      </div>
                    </div>
                  </div>
                  {profile.phone && (
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 transition-colors text-[10px]"
                      title="Copy"
                    >
                      {copiedPhone ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : 'Copy'}
                    </button>
                  )}
                </div>

                {/* National ID (NID) */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 mt-0.5">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {bn ? 'জাতীয় পরিচয়পত্র (NID)' : 'National ID (NID)'}
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {profile.nidNumber || (bn ? 'যাচাইকৃত নয় / নেই' : 'Not Recorded')}
                    </div>
                  </div>
                </div>

                {/* Email */}
                {profile.email && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 mt-0.5">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {bn ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                        {profile.email}
                      </div>
                    </div>
                  </div>
                )}

                {/* Joining Date */}
                {profile.joiningDate && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 mt-0.5">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {bn ? 'যোগদানের তারিখ' : 'Joining Date'}
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {profile.joiningDate}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Address & Emergency Contact */}
              {(profile.address || profile.emergencyContact) && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2 text-xs">
                  {profile.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {bn ? 'বর্তমান ঠিকানা: ' : 'Address: '}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">{profile.address}</span>
                      </div>
                    </div>
                  )}
                  {profile.emergencyContact && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {bn ? 'জরুরি যোগাযোগ: ' : 'Emergency Contact: '}
                        </span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {profile.emergencyContact}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status footer banner */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{bn ? 'সক্রিয় ও অনুমোদিত সদস্য' : 'Active & Verified Identity'}</span>
                </div>
                {profile.appointedBy && (
                  <div className="text-[11px] text-slate-400">
                    {bn ? `নিয়োগকারী: ${profile.appointedBy}` : `Appointed by: ${profile.appointedBy}`}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EDIT MODE: Profile Edit Form */
            <form onSubmit={handleSaveProfile} className="space-y-3.5 pt-1 text-xs">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Edit3 className="h-4 w-4 text-emerald-600" />
                  <span>{bn ? 'প্রোফাইল তথ্য হালনাগাদ করুন' : 'Update Profile Information'}</span>
                </h3>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'পূর্ণ নাম *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'পদবী / পোস্ট (Designation) *' : 'Designation / Post *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder={bn ? 'যেমন: সিনিয়র খামার ম্যানেজার' : 'e.g. Senior Farm Executive'}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'মোবাইল নম্বর *' : 'Phone Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1711-..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'জাতীয় পরিচয়পত্র নং (NID) *' : 'National ID (NID) *'}
                  </label>
                  <input
                    type="text"
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value)}
                    placeholder={bn ? '১০ বা ১৭ ডিজিটের এনআইডি' : '10 or 17 digit NID'}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                    {bn ? 'জরুরি যোগাযোগ নম্বর' : 'Emergency Contact'}
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="+880 1..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'বর্তমান ঠিকানা ও জেলা' : 'Current Address & District'}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={bn ? 'গ্রাম, ডাকঘর, থানা, জেলা' : 'Street, Police Station, District'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
              </div>

              {/* Preset Avatar selector */}
              <div>
                <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  {bn ? 'প্রোফাইল ছবি / অবতার নির্বাচন করুন' : 'Select Avatar Preset or Upload Photo'}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                  >
                    <Camera className="h-4 w-4 text-emerald-600" />
                    <span>{bn ? 'গ্যালারি / ক্যামেরা থেকে আপলোড' : 'Upload Image File'}</span>
                  </button>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      {bn ? 'ছবি মুছুন' : 'Remove Photo'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : bn ? 'সংরক্ষণ করুন' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
