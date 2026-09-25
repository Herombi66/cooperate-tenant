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
  initialSaving: string;
  initialInvestment: string;
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
  initialSaving: '',
  initialInvestment: '',
  targetMonthlySaving: '',
  reasonForJoining: '',
};

export const FMC_DEPARTMENTS = [
  'Clinical Services (Doctors / Medical Officers)',
  'Nursing Services Directorate',
  'Pharmacy Directorate',
  'Medical Laboratory & Diagnostic Services',
  'General Administration & HR Records',
  'Finance, Accounts & Audit',
  'Works, Biomedical & Physical Maintenance',
  'Health Information Management (HIM)',
  'Nutrition & Dietetics',
  'Radiology & Radiography',
  'Physiotherapy & Rehabilitation',
  'Dental Services',
  'Community Health / Public Health',
  'Security & Safety Services',
  'Other Hospital Directorate'
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
  const [submittedData, setSubmittedData] = useState<{
    data: FmcksFormData;
    applicationId?: string;
    totalContribution: number;
    submissionDate: string;
  } | null>(null);

  // Compute calculated values
  const savingAmount = parseFloat(formData.initialSaving) || 0;
  const investmentAmount = parseFloat(formData.initialInvestment) || 0;
  const totalInitialContribution = savingAmount + investmentAmount;
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
      case 'initialSaving': {
        const val = parseFloat(value);
        if (!value.trim() || isNaN(val) || val <= 0) return 'Initial Saving amount is required';
        return '';
      }
      case 'initialInvestment': {
        const val = parseFloat(value);
        if (!value.trim() || isNaN(val) || val < 0) return 'Initial Investment amount is required';
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
    if (['initialSaving', 'initialInvestment', 'targetMonthlySaving'].includes(field)) {
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

    // Check minimum combined initial contribution
    if (totalInitialContribution < 5000) {
      newErrors.totalContribution = 'Minimum required: ₦5,000 combined savings and investment';
    }

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

      if (totalInitialContribution < 5000) {
        toast.error('Total Initial Contribution must be at least ₦5,000 (combined savings and investment)');
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
        savings: savingAmount,
        investment: investmentAmount,
        total_initial_contribution: totalInitialContribution,
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
          initial_saving: savingAmount,
          initial_investment: investmentAmount,
          total_initial_contribution: totalInitialContribution,
          entrance_fee: 1500,
          entrance_fee_note: '₦1,500 entrance fee will be deducted from first contribution',
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

      setSubmittedData({
        data: { ...formData },
        applicationId: appId,
        totalContribution: totalInitialContribution,
        submissionDate
      });

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
  if (submittedData) {
    const { data, applicationId, totalContribution, submissionDate } = submittedData;
    return (
      <div className="fmck-form-root max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-teal-900/10 overflow-hidden my-6">
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
          .fmck-form-root select,
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
        {/* Top Celebration Header */}
        <div className="bg-[#0F3D3D] text-white px-6 sm:px-8 py-8 text-center relative overflow-hidden">
          <div className="inline-flex p-3 bg-white/10 rounded-full text-[#D6A94A] mb-3">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Application Submitted Successfully
          </h2>
          <p className="text-emerald-100/90 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Your FMCKSMCS membership application has been submitted successfully. Your application will be reviewed, and you will be contacted using the information provided.
          </p>
          {applicationId && (
            <div className="mt-4 inline-block bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-mono tracking-wider text-[#D6A94A]">
              REFERENCE NO: {applicationId}
            </div>
          )}
        </div>

        {/* Official Printable Registration Slip */}
        <div className="p-6 sm:p-8 space-y-6">
          <div 
            id="fmck-printable-slip" 
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 sm:p-8 bg-[#FBF9F5] text-slate-800"
          >
            <div className="text-center pb-4 border-b border-slate-200">
              <div className="flex justify-center mb-2">
                <img src={fmckLogo} alt="FMC Kumo Logo" className="w-14 h-14 object-contain" />
              </div>
              <span className="text-[11px] font-mono tracking-widest text-[#B8862F] uppercase block font-semibold">
                Federal Medical Centre, Kumo, Gombe State
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F3D3D] tracking-tight mt-0.5">
                FMC KUMO STAFF MULTIPURPOSE COOPERATIVE SOCIETY LTD
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Official Membership Enrollment & Payroll Checkoff Slip
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-sm border-b border-slate-200">
              <div>
                <span className="text-xs uppercase text-slate-400 font-mono block">Applicant Full Name</span>
                <span className="font-semibold text-slate-900 text-base">{data.fullName}</span>
              </div>
              <div>
                <span className="text-xs uppercase text-slate-400 font-mono block">Staff File / IPPIS Number</span>
                <span className="font-mono font-bold text-[#0F3D3D] text-base">{data.ippisNumber}</span>
              </div>
              <div>
                <span className="text-xs uppercase text-slate-400 font-mono block">Department</span>
                <span className="font-medium text-slate-800">{data.department}</span>
              </div>
              <div>
                <span className="text-xs uppercase text-slate-400 font-mono block">Unit & Cadre</span>
                <span className="font-medium text-slate-800">{data.unit} • {data.cadre}</span>
              </div>
              <div>
                <span className="text-xs uppercase text-slate-400 font-mono block">Official Email</span>
                <span className="font-medium text-slate-800">{data.email}</span>
              </div>
              <div>
                <span className="text-xs uppercase text-slate-400 font-mono block">Phone Number</span>
                <span className="font-medium text-slate-800">{data.phone}</span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="py-4 border-b border-slate-200 space-y-2">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-mono font-semibold block mb-2">
                Contribution Breakdown
              </span>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Initial Saving Amount:</span>
                <span className="font-mono font-medium">{formatNaira(data.initialSaving)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Initial Investment Amount:</span>
                <span className="font-mono font-medium">{formatNaira(data.initialInvestment)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#0F3D3D] pt-2 border-t border-slate-300">
                <span>Total Initial Contribution:</span>
                <span className="font-mono text-lg text-[#0F3D3D]">{formatNaira(totalContribution)}</span>
              </div>
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5 mt-2 text-xs text-amber-900 flex items-start gap-2">
                <span className="font-bold text-amber-700">★ Note:</span>
                <span>The <strong>₦1,500 entrance fee</strong> will be deducted from your first contribution.</span>
              </div>
              {parseFloat(data.targetMonthlySaving) > 0 && (
                <div className="flex justify-between text-sm pt-2 text-slate-600">
                  <span>Target Monthly Saving:</span>
                  <span className="font-mono font-semibold text-slate-900">{formatNaira(data.targetMonthlySaving)} / month</span>
                </div>
              )}
            </div>

            <div className="pt-4 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span>Date Generated: <strong>{submissionDate}</strong></span>
              <span className="italic">Secretariat Desk: Suite 4, Admin Block, FMC Kumo</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => {
                setSubmittedData(null);
                setFormData(initialFormValues);
                if (onClose) onClose();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition cursor-pointer"
            >
              {onClose ? 'Close Modal' : 'Submit Another Application'}
            </button>
          </div>
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
                <option value="">Select Hospital Directorate</option>
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
                Setup your opening cooperative balance and investment allocation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Initial Saving Amount */}
            <div>
              <label htmlFor="initialSaving" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Initial Saving Amount (₦) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-semibold">
                  ₦
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  id="initialSaving"
                  value={formData.initialSaving}
                  onChange={e => handleInputChange('initialSaving', e.target.value)}
                  onBlur={() => handleBlur('initialSaving')}
                  placeholder="3000"
                  className={`w-full pl-8 pr-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 font-mono text-slate-900 outline-none transition ${
                    touched.initialSaving && errors.initialSaving 
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                      : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                  }`}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                {touched.initialSaving && errors.initialSaving ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.initialSaving}</span>
                  </p>
                ) : (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Formatted: {formatNaira(formData.initialSaving || 0)}
                  </span>
                )}
              </div>
            </div>

            {/* Initial Investment Amount */}
            <div>
              <label htmlFor="initialInvestment" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Initial Investment Amount (₦) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-semibold">
                  ₦
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  id="initialInvestment"
                  value={formData.initialInvestment}
                  onChange={e => handleInputChange('initialInvestment', e.target.value)}
                  onBlur={() => handleBlur('initialInvestment')}
                  placeholder="2000"
                  className={`w-full pl-8 pr-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 font-mono text-slate-900 outline-none transition ${
                    touched.initialInvestment && errors.initialInvestment 
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                      : 'border-slate-300 focus:border-[#0F3D3D] focus:ring-2 focus:ring-[#0F3D3D]/15'
                  }`}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                {touched.initialInvestment && errors.initialInvestment ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.initialInvestment}</span>
                  </p>
                ) : (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Formatted: {formatNaira(formData.initialInvestment || 0)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Read-Only Calculated Field: Total Initial Contribution */}
          <div className="bg-[#FBF9F5] border border-slate-300/80 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                  Read-Only Calculated Field
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-900">
                  Total Initial Contribution
                </span>
                <span className="text-xs text-slate-500 block font-mono">
                  (Initial Saving + Initial Investment)
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                  totalInitialContribution >= 5000 ? 'text-[#0F3D3D]' : 'text-amber-700'
                }`}>
                  {formatNaira(totalInitialContribution)}
                </span>
              </div>
            </div>

            {/* Required Notice Directly Below Total */}
            <div className="mt-3.5 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs sm:text-sm text-amber-950 flex items-start gap-2.5">
              <span className="text-amber-700 font-bold text-base leading-none">ℹ</span>
              <div>
                <p className="font-semibold text-amber-900">
                  Minimum required: ₦5,000 combined. ₦1,500 entrance fee will be deducted from your first contribution.
                </p>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  Example: Initial Saving: ₦3,000 + Initial Investment: ₦2,000 = Total Initial Contribution: ₦5,000.
                </p>
              </div>
            </div>

            {/* Validation warning if below 5000 */}
            {totalInitialContribution > 0 && totalInitialContribution < 5000 && (
              <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>The combined contribution is currently below the required ₦5,000 minimum threshold.</span>
              </p>
            )}
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
