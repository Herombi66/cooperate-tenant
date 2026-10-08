import React, { useState, useId } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Send, 
  Wallet, 
  User, 
  FileText, 
  Sparkles, 
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  Briefcase,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import fmckLogo from '../Assets/logo.png';

export interface FmcksFormData {
  fullName: string;
  ippisNumber: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  department: string;
  unit: string;
  cadre: string;
  contribution: string;
  targetMonthlySaving: string;
  reasonForJoining: string;
}

const initialFormValues: FmcksFormData = {
  fullName: '',
  ippisNumber: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  department: '',
  unit: '',
  cadre: '',
  contribution: '',
  targetMonthlySaving: '',
  reasonForJoining: '',
};

export const FMC_DEPARTMENTS = [
  'Admin Department',
  'Audit Department',
  'Community Medicine',
  'Dental Department',
  'Engineering Department',
  'ENT Department',
  'Finance and Accounts Department',
  'HCS (Doctors)',
  'Health Information Management Department',
  'ICT Unit',
  'Information & Protocol Unit',
  'Laboratory Services Department',
  'Legal Unit',
  'Nursing Services Department',
  'Nutrition & Dietetics (Catering) Unit',
  'Pharmacy Department',
  'Physiotherapy Department',
  'Procurement Unit',
  'Radiology Department',
  'Research, Planning & Statistics Unit',
  'Social Welfare Unit',
  'Store Unit'
];

export const formatNaira = (val: number | string): string => {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return '₦0.00';
  return '₦' + num.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const isValidNigerianPhone = (phone: string): boolean => {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  // Matches 080..., 070..., 090..., 081..., +234..., 234...
  return /^(\+?234|0)[789][01]\d{8}$/.test(clean);
};

export const sanitizePsn = (val: string): string => {
  const cleaned = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleaned.length >= 5) return cleaned.slice(0, 20);
  return `FMCK${cleaned.padStart(5, '0')}`.slice(0, 20);
};

export const FmcksApplicationForm: React.FC<{
  onClose?: () => void;
  isModal?: boolean;
}> = ({ onClose, isModal = false }) => {
  const formUid = useId();
  const [formData, setFormData] = useState<FmcksFormData>(initialFormValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submissionReference, setSubmissionReference] = useState<string | null>(null);

  // Compute calculated values
  const contributionAmount = parseFloat(formData.contribution) || 0;
  const entranceFee = 2000;
  const remainingContribution = Math.max(0, contributionAmount - entranceFee);
  const targetMonthlyNum = parseFloat(formData.targetMonthlySaving) || 0;

  // Real-time validation
  const validateField = (name: keyof FmcksFormData, value: string): string => {
    switch (name) {
      case 'fullName':
        if (!value.trim()) return 'Full Name is required';
        if (value.trim().length < 3) return 'Please enter your complete legal name';
        return '';
      case 'ippisNumber':
        if (!value.trim()) return 'IPPIS Number is required';
        if (value.trim().length < 4) return 'Valid IPPIS / Staff number required';
        return '';
      case 'email':
        if (!value.trim()) return 'Email Address is required';
        if (!isValidEmail(value)) return 'Please provide a valid email address (e.g. name@domain.com)';
        return '';
      case 'phone':
        if (!value.trim()) return 'Phone Number is required';
        if (!isValidNigerianPhone(value)) return 'Please enter a valid 11-digit Nigerian phone (e.g. 0803 123 4567 or +234...)';
        return '';
      case 'dateOfBirth':
        if (!value) return 'Date of Birth is required';
        return '';
      case 'gender':
        if (!value) return 'Please select your gender';
        return '';
      case 'department':
        if (!value) return 'Hospital Department is required';
        return '';
      case 'unit':
        if (!value.trim()) return 'Unit / Ward / Section is required';
        return '';
      case 'cadre':
        if (!value.trim()) return 'Cadre / Professional Designation is required';
        return '';
      case 'contribution': {
        const val = parseFloat(value);
        if (!value.trim() || isNaN(val) || val <= 0) return 'Contribution amount is required';
        if (val < 5000) return 'Minimum initial contribution is ₦5,000. ₦2,000 entrance fee will be deducted from this amount.';
        return '';
      }
      case 'reasonForJoining':
        if (!value.trim()) return 'Reason for joining is required';
        if (value.trim().length < 15) return 'Please provide a brief explanation (at least 15 characters)';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (field: keyof FmcksFormData, value: string) => {
    // Only accept numeric and period for money fields
    if (['contribution', 'targetMonthlySaving'].includes(field)) {
      if (value !== '' && !/^\d*\.?\d*$/.test(value)) {
        return;
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));

    const errorMsg = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: errorMsg }));
  };

  const handleBlur = (field: keyof FmcksFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: errorMsg }));
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};
    const keys = Object.keys(formData) as (keyof FmcksFormData)[];
    
    keys.forEach(key => {
      // targetMonthlySaving is optional
      if (key === 'targetMonthlySaving') return;
      const errorMsg = validateField(key, formData[key]);
      if (errorMsg) newErrors[key] = errorMsg;
    });

    setErrors(newErrors);
    setTouched(keys.reduce((acc, k) => ({ ...acc, [k]: true }), {}));

    return Object.keys(newErrors).length === 0;
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear the form? All entered information will be discarded.')) {
      setFormData(initialFormValues);
      setErrors({});
      setTouched({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions if already submitting
    if (isLoading) return;

    // Immediately enter loading state
    setIsLoading(true);

    // Give browser/React event loop a frame to paint the spinner and disabled state
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      if (!validateAll()) {
        toast.error('Please review the form. Some required fields are missing or invalid.');
        return;
      }

      if (contributionAmount < 5000) {
        toast.error('Minimum initial contribution is ₦5,000. ₦2,000 entrance fee will be deducted from this amount.');
        return;
      }
      const sanitizedPsnVal = sanitizePsn(formData.ippisNumber);
      const submissionDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const refNumber = `FMCK-APP-${Math.floor(100000 + Math.random() * 900000)}`;

      const applicationPayload = {
        name: formData.fullName.trim(),
        psn: sanitizedPsnVal,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        facility_name: `FMC Kumo - ${formData.department}`,
        department: formData.department,
        unit: formData.unit.trim(),
        cadre: formData.cadre.trim(),
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        contribution: contributionAmount,
        savings: remainingContribution,
        investment: 0,
        total_initial_contribution: contributionAmount,
        target_saving: targetMonthlyNum,
        target_period: 12,
        reference_number: refNumber,
        tenant_id: 'fmcksmcs',
        metadata: {
          cooperative: 'FMC Kumo Staff MPCS Ltd',
          tenant_id: 'fmcksmcs',
          reference_number: refNumber,
          ippis_number: formData.ippisNumber.trim(),
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          department: formData.department,
          unit: formData.unit.trim(),
          cadre: formData.cadre.trim(),
          contribution: contributionAmount,
          entrance_fee: entranceFee,
          remaining_contribution: remainingContribution,
          initial_contribution: contributionAmount,
          total_initial_contribution: contributionAmount,
          initial_saving: remainingContribution,
          initial_investment: 0,
          entrance_fee_note: '₦2,000 entrance fee will be deducted from first contribution',
          target_monthly_saving: targetMonthlyNum,
          reason_for_joining: formData.reasonForJoining.trim(),
          submitted_at: new Date().toISOString()
        }
      };

      let appId = refNumber;

      const response = await api.post('/applications/apply', applicationPayload, {
        headers: { 'x-tenant-id': 'fmcksmcs' }
      });

      if (response.data?.application?.metadata?.reference_number) {
        appId = response.data.application.metadata.reference_number;
      } else if (response.data?.application?.id || response.data?.application_id) {
        appId = `FMCK-APP-${response.data?.application?.id || response.data?.application_id}`;
      }

      setSubmissionReference(appId);
      toast.success('Your FMCKSMCS membership application has been submitted successfully!');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error(err.response?.data?.message || 'An application with this IPPIS, email or phone already exists.');
      } else if (err?.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Failed to submit application. Please verify details and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── CONFIRMATION VIEW ──────────────────────────────────────────────────
  if (submissionReference) {
    return (
      <div className={`fmck-form-root max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden ${isModal ? 'my-0' : 'my-8'}`}>
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <p className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-100 max-w-lg leading-relaxed">
            Your membership application has been submitted successfully and is now pending review.
          </p>

          {onClose && (
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 w-full flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl transition cursor-pointer"
              >
                Close Window
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN APPLICATION FORM VIEW ────────────────────────────────────────
  return (
    <div className={`fmck-form-root max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-teal-900/10 overflow-hidden ${isModal ? 'my-0' : 'my-8'}`}>
      <style>{`
        .fmck-form-root,
        .fmck-form-root * {
          cursor: auto;
        }
        .fmck-form-root {
          cursor: default;
        }
        .fmck-form-root input[type="text"],
        .fmck-form-root input[type="email"],
        .fmck-form-root input[type="tel"],
        .fmck-form-root input[type="number"],
        .fmck-form-root input[type="date"],
        .fmck-form-root textarea {
          cursor: text !important;
        }
        .fmck-form-root select {
          cursor: pointer !important;
        }
        .fmck-form-root button:not(:disabled),
        .fmck-form-root a,
        .fmck-form-root [role="button"] {
          cursor: pointer !important;
        }
        .fmck-form-root button:disabled,
        .fmck-form-root input:disabled,
        .fmck-form-root select:disabled,
        .fmck-form-root textarea:disabled {
          cursor: not-allowed !important;
        }
      `}</style>
      {/* Brand Header */}
      <div className="bg-[#0F3D3D] text-white px-6 sm:px-8 py-7 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-white p-1 shadow-md shrink-0 border border-[#D6A94A]/40 flex items-center justify-center overflow-hidden">
              <img src={fmckLogo} alt="FMC Kumo Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tracking-widest text-[#D6A94A] uppercase font-semibold">
                  Membership Enrollment
                </span>
                <span className="bg-emerald-800/80 text-emerald-200 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  FMC KUMO
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                FMCKSMCS Membership Application Form
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-0.5">
                Federal Medical Centre Kumo Staff Multipurpose Cooperative Society Ltd
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-white/60 hover:text-white p-1 rounded-lg transition"
              aria-label="Close form"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-8">
        {/* ── SECTION 1: APPLICANT INFORMATION ────────────────────────── */}
        <section aria-labelledby={`${formUid}-section-applicant`} className="space-y-5">
          <div className="border-b border-slate-200 pb-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-[#0F3D3D]/10 text-[#0F3D3D] rounded-lg">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 id={`${formUid}-section-applicant`} className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                1. Applicant Information
              </h2>
              <p className="text-xs text-slate-500">
                Your official identification details as registered in hospital payroll records
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={e => handleInputChange('fullName', e.target.value)}
                onBlur={() => handleBlur('fullName')}
                placeholder="e.g. Dr. Haruna Bello Garba"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 text-slate-900 outline-none transition ${
                  touched.fullName && errors.fullName 
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                    : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                }`}
              />
              {touched.fullName && errors.fullName && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.fullName}</span>
                </p>
              )}
            </div>

            {/* IPPIS Number */}
            <div>
              <label htmlFor="ippisNumber" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                IPPIS Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ippisNumber"
                value={formData.ippisNumber}
                onChange={e => handleInputChange('ippisNumber', e.target.value)}
                onBlur={() => handleBlur('ippisNumber')}
                placeholder="e.g. IPPIS/142920 or 142920"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 font-mono text-slate-900 outline-none transition ${
                  touched.ippisNumber && errors.ippisNumber 
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                    : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                }`}
              />
              {touched.ippisNumber && errors.ippisNumber && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.ippisNumber}</span>
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="e.g. h.bello@fmckumo.gov.ng"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 text-slate-900 outline-none transition ${
                  touched.email && errors.email 
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                    : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                }`}
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={e => handleInputChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                placeholder="e.g. 0803 123 4567"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 font-mono text-slate-900 outline-none transition ${
                  touched.phone && errors.phone 
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                    : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                }`}
              />
              {touched.phone && errors.phone && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={e => handleInputChange('dateOfBirth', e.target.value)}
                onBlur={() => handleBlur('dateOfBirth')}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 text-slate-900 outline-none transition ${
                  touched.dateOfBirth && errors.dateOfBirth 
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                    : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                }`}
              />
              {touched.dateOfBirth && errors.dateOfBirth && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.dateOfBirth}</span>
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={e => handleInputChange('gender', e.target.value)}
                onBlur={() => handleBlur('gender')}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 text-slate-900 outline-none transition ${
                  touched.gender && errors.gender 
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                    : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                }`}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {touched.gender && errors.gender && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.gender}</span>
                </p>
              )}
            </div>

            {/* Department */}
            <div>
              <label htmlFor="department" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                id="department"
                value={formData.department}
                onChange={e => handleInputChange('department', e.target.value)}
                onBlur={() => handleBlur('department')}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 text-slate-900 outline-none transition ${
                  touched.department && errors.department 
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                    : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                }`}
              >
                <option value="">Select Department</option>
                {FMC_DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {touched.department && errors.department && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.department}</span>
                </p>
              )}
            </div>

            {/* Unit */}
            <div>
              <label htmlFor="unit" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Unit / Section <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="unit"
                value={formData.unit}
                onChange={e => handleInputChange('unit', e.target.value)}
                onBlur={() => handleBlur('unit')}
                placeholder="e.g. ICU, Special Care Baby Unit, Internal Audit"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 text-slate-900 outline-none transition ${
                  touched.unit && errors.unit 
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                    : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                }`}
              />
              {touched.unit && errors.unit && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.unit}</span>
                </p>
              )}
            </div>

            {/* Cadre */}
            <div>
              <label htmlFor="cadre" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Cadre / Designation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="cadre"
                value={formData.cadre}
                onChange={e => handleInputChange('cadre', e.target.value)}
                onBlur={() => handleBlur('cadre')}
                placeholder="e.g. Senior Medical Officer, Nursing Officer II"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 text-slate-900 outline-none transition ${
                  touched.cadre && errors.cadre 
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                    : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                }`}
              />
              {touched.cadre && errors.cadre && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.cadre}</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── SECTION 2: INITIAL CONTRIBUTION ─────────────────────────── */}
        <section aria-labelledby={`${formUid}-section-contribution`} className="space-y-5">
          <div className="border-b border-slate-200 pb-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-[#B8862F]/15 text-[#B8862F] rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 id={`${formUid}-section-contribution`} className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                2. Initial Contribution
              </h2>
              <p className="text-xs text-slate-500">
                Setup your opening cooperative contribution
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Single Unified Contribution Field */}
            <div className="max-w-md">
              <label htmlFor="contribution" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Contribution (₦) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-semibold">
                  ₦
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  id="contribution"
                  value={formData.contribution}
                  onChange={e => handleInputChange('contribution', e.target.value)}
                  onBlur={() => handleBlur('contribution')}
                  placeholder="5000"
                  className={`w-full pl-8 pr-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 font-mono text-slate-900 outline-none transition ${
                    touched.contribution && errors.contribution 
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                      : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                  }`}
                />
              </div>

              {/* Informative notice directly below the field */}
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                Minimum required: ₦5,000. ₦2,000 entrance fee will be deducted from your first contribution.
              </p>

              {/* Error message if invalid or < 5000 */}
              {touched.contribution && errors.contribution ? (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.contribution}</span>
                </p>
              ) : null}
            </div>

            {/* Financial Breakdown Card */}
            <div className="bg-[#FBF9F5] border border-slate-300/80 rounded-xl p-4 sm:p-5 max-w-xl">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  Contribution Breakdown
                </span>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  FMCK Opening Ledger
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Contribution:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatNaira(contributionAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-amber-800">
                  <span className="flex items-center gap-1">
                    <span>Entrance Fee:</span>
                    <span className="text-[10px] text-amber-700/80">(deducted from first contribution)</span>
                  </span>
                  <span className="font-mono font-semibold">
                    -₦2,000.00
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base font-bold text-[#0F3D3D] pt-2 border-t border-slate-200">
                  <span>Remaining Contribution:</span>
                  <span className="font-mono text-lg text-[#0F3D3D]">
                    {formatNaira(remainingContribution)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: MONTHLY SAVING TARGET ────────────────────────── */}
        <section aria-labelledby={`${formUid}-section-monthly`} className="space-y-4">
          <div className="border-b border-slate-200 pb-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-[#0F3D3D]/10 text-[#0F3D3D] rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 id={`${formUid}-section-monthly`} className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                3. Monthly Saving Target
              </h2>
              <p className="text-xs text-slate-500">
                Specify your planned monthly contribution through hospital payroll checkoff
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="targetMonthlySaving" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Target Monthly Saving (₦) <span className="text-slate-400 font-normal normal-case">(Optional)</span>
            </label>
            <div className="relative max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-semibold">
                ₦
              </span>
              <input
                type="text"
                inputMode="decimal"
                id="targetMonthlySaving"
                value={formData.targetMonthlySaving}
                onChange={e => handleInputChange('targetMonthlySaving', e.target.value)}
                placeholder="e.g. 10000"
                className="w-full pl-8 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-slate-50/50 font-mono text-slate-900 outline-none transition focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {formData.targetMonthlySaving && parseFloat(formData.targetMonthlySaving) > 0 ? (
                <span className="font-mono text-[#0F3D3D] font-medium">
                  Projected monthly checkoff: {formatNaira(formData.targetMonthlySaving)} / month.
                </span>
              ) : (
                'Leaving this field empty is valid; you can establish or adjust your monthly checkoff target anytime after admission.'
              )}
            </p>
          </div>
        </section>

        {/* ── SECTION 4: REASON FOR JOINING ────────────────────────────── */}
        <section aria-labelledby={`${formUid}-section-reason`} className="space-y-4">
          <div className="border-b border-slate-200 pb-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-[#0F3D3D]/10 text-[#0F3D3D] rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 id={`${formUid}-section-reason`} className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                4. Reason for Joining <span className="text-red-500">*</span>
              </h2>
              <p className="text-xs text-slate-500">
                Provide brief context for the FMCKSMCS Executive Review Committee
              </p>
            </div>
          </div>

          <div>
            <textarea
              id="reasonForJoining"
              rows={4}
              value={formData.reasonForJoining}
              onChange={e => handleInputChange('reasonForJoining', e.target.value)}
              onBlur={() => handleBlur('reasonForJoining')}
              placeholder="Please briefly explain why you would like to join FMCKSMCS."
              className={`w-full px-3.5 py-3 text-sm rounded-xl border bg-slate-50/50 text-slate-900 outline-none transition resize-y ${
                touched.reasonForJoining && errors.reasonForJoining 
                  ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                  : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
              }`}
            />
            {touched.reasonForJoining && errors.reasonForJoining && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.reasonForJoining}</span>
              </p>
            )}
          </div>
        </section>

        {/* ── SECTION 5: ACTION BUTTONS ────────────────────────────────── */}
        <div className="border-t border-slate-200 pt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset / Clear Form</span>
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[240px] inline-flex items-center justify-center gap-2.5 px-8 py-3 bg-[#0F3D3D] hover:bg-[#164f4f] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Submitting Application...</span>
              </>
            ) : (
              <>
                <span>Submit Application</span>
                <Send className="w-4 h-4 shrink-0" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
