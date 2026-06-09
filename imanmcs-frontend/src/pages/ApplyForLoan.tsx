import React, { useMemo, useState, useEffect } from 'react';
import {
  CreditCard, Upload, User, DollarSign, Calendar,
  FileText, AlertCircle, CheckCircle, Info, Loader, ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import AgentAgreementModal from '../components/AgentAgreementModal';

interface MemberData {
  totalInvestment: number;
  totalSavings: number;
  activeLoanBalance: number;
  membershipDuration: number;
  psn: string;
  name: string;
  hasActiveLoan?: boolean;
  existingLoan?: {
    id: string;
    status: string;
    amount_requested: number;
    application_date: string;
  };
}

const ApplyForLoan: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const draftKey = 'loan_application_draft_v1';
  const [loanType, setLoanType] = useState<'cash' | 'venture' | 'emergency'>('cash');
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [showValidation, setShowValidation] = useState(false);
  const [grantorValidation, setGrantorValidation] = useState<{
    status: 'idle' | 'loading' | 'valid' | 'invalid';
    memberName?: string;
    message?: string;
  }>({ status: 'idle' });
  const [formData, setFormData] = useState({
    amount: '',
    tenure: '3',
    grantorPsn: '',
    purpose: '',
    payslip: null as File | null,
    admissionLetter: null as File | null,
    studentIdCard: null as File | null,
    otherDocs: [] as File[]
  });
  const [showAgentAgreement, setShowAgentAgreement] = useState(false);
  const [submittedLoanId, setSubmittedLoanId] = useState<number | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});

  // Fetch real member data on component mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          step?: 1 | 2 | 3 | 4;
          loanType?: 'cash' | 'venture' | 'emergency';
          formData?: {
            amount?: string;
            tenure?: string;
            grantorPsn?: string;
            purpose?: string;
          };
        };

        if (parsed.loanType && (parsed.loanType === 'cash' || parsed.loanType === 'venture' || parsed.loanType === 'emergency')) {
          setLoanType(parsed.loanType);
        }

        if (parsed.step && [1, 2, 3, 4].includes(parsed.step)) {
          setStep(parsed.step);
        }

        if (parsed.formData) {
          setFormData((prev) => ({
            ...prev,
            amount: parsed.formData?.amount ?? prev.amount,
            tenure: parsed.formData?.tenure ?? prev.tenure,
            grantorPsn: parsed.formData?.grantorPsn ?? prev.grantorPsn,
            purpose: parsed.formData?.purpose ?? prev.purpose
          }));
        }
      }
    } catch {}

    fetchMemberData();
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          step,
          loanType,
          formData: {
            amount: formData.amount,
            tenure: formData.tenure,
            grantorPsn: formData.grantorPsn,
            purpose: formData.purpose
          }
        })
      );
    } catch {}
  }, [draftKey, step, loanType, formData.amount, formData.tenure, formData.grantorPsn, formData.purpose]);

  const fetchMemberData = async () => {
    try {
      setLoading(true);

      // Fetch member profile data
      const memberResponse = await api.get('/auth/me');
      const memberInfo = memberResponse.data.user;

      // Fetch dynamic settings
      try {
        const settingsResponse = await api.get('/settings/');
        const activeSettings = settingsResponse.data.settings.filter((s: any) => s.status === 'active');
        const settingsMap: Record<string, any> = {};
        activeSettings.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSettings(settingsMap);
      } catch (err) {
        console.error('Failed to fetch settings, using defaults', err);
      }

      // Fetch total contributions (savings + investment)
      const contributionsResponse = await api.get('/contributions', {
        params: { user_id: memberInfo.id }
      });

      // Calculate total savings and investment
      let totalSavings = 0;
      let totalInvestment = 0;

      if (contributionsResponse.data.contributions && contributionsResponse.data.contributions.length > 0) {
        contributionsResponse.data.contributions.forEach((contribution: any) => {
          if (contribution.status && contribution.status !== 'approved') return;
          // Sum the individual amount fields from contributions
          totalSavings += parseFloat(contribution.savings || 0);
          totalInvestment += parseFloat(contribution.investment || 0);
        });
      }

      // Fetch active loans to calculate loan balance
      const loansResponse = await api.get('/loans', {
        params: { user_id: memberInfo.id, status: 'active' }
      });

      let activeLoanBalance = 0;
      if (loansResponse.data.loans && loansResponse.data.loans.length > 0) {
        activeLoanBalance = loansResponse.data.loans.reduce((total: number, loan: any) =>
          total + parseFloat(loan.amount_approved || 0), 0
        );
      }

      // Calculate membership duration (months since join date)
      const joinDate = new Date(memberInfo.created_at);
      const now = new Date();
      const membershipDuration = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

      const realMemberData: MemberData = {
        totalInvestment: totalInvestment,
        totalSavings: totalSavings,
        activeLoanBalance: activeLoanBalance,
        membershipDuration: Math.max(membershipDuration, 1), // At least 1 month
        psn: memberInfo.psn || '',
        name: memberInfo.name || ''
      };

      setMemberData(realMemberData);

    } catch (error) {
      console.error('Error fetching member data:', error);
      toast.error('Failed to load member data for loan calculations');

      // Fallback to basic data if API fails
      setMemberData({
        totalInvestment: 0,
        totalSavings: 0,
        activeLoanBalance: 0,
        membershipDuration: 1,
        psn: user?.psn || '',
        name: user?.name || ''
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate loan limits based on new rules and dynamic settings
  const totalContributions = memberData ? (memberData.totalSavings + memberData.totalInvestment) : 0;
  
  // Use settings if available, otherwise fallback to defaults
  const cashMaxAbsolute = settings.cash_loan_limit ? parseFloat(settings.cash_loan_limit) : 500000;
  const cashMultiplier = settings.cash_loan_multiplier ? parseFloat(settings.cash_loan_multiplier) : 3;
  const ventureMaxAbsolute = settings.venture_loan_limit ? parseFloat(settings.venture_loan_limit) : 1000000;
  const ventureMultiplier = settings.venture_loan_multiplier ? parseFloat(settings.venture_loan_multiplier) : 10;
  const maxEmergencyAbsolute = settings.emergency_loan_limit ? parseFloat(settings.emergency_loan_limit) : 20000;

  const maxCashLoan = Math.min(cashMaxAbsolute, totalContributions * 0.5 * cashMultiplier);
  const maxVentureLoan = Math.min(ventureMaxAbsolute, totalContributions * 0.3 * ventureMultiplier);
  const maxEmergencyLoan = maxEmergencyAbsolute;
  
  const maxTenureMonths = loanType === 'cash' ? 12 : loanType === 'venture' ? 24 : 6;
  const tenureOptions = useMemo(() => {
    return loanType === 'cash' ? [3, 6, 9, 12] : loanType === 'venture' ? [3, 6, 9, 12, 18, 24] : [1, 2, 3, 6];
  }, [loanType]);

  useEffect(() => {
    const currentTenure = parseInt(formData.tenure || '0', 10);
    if (!Number.isFinite(currentTenure) || currentTenure <= 0) return;
    if (currentTenure > maxTenureMonths) {
      setFormData((prev) => ({ ...prev, tenure: String(maxTenureMonths) }));
      toast(`Repayment period adjusted to ${maxTenureMonths} months for this loan type.`, { icon: 'ℹ️' });
    }
  }, [loanType, maxTenureMonths, formData.tenure]);

  const tenureWarning =
    loanType === 'cash'
      ? 'Maximum repayment period for cash loans is 12 months.'
      : loanType === 'venture'
      ? 'Maximum repayment period for venture loans is 24 months.'
      : 'Maximum repayment period for emergency loans is 6 months.';

  const canProceedStep1 = () => {
    const amount = parseFloat(formData.amount || '0');
    const tenure = parseInt(formData.tenure || '0', 10);
    if (!formData.amount || !Number.isFinite(amount) || amount <= 0) return false;
    if (amount < 10000) return false;
    if (!Number.isFinite(tenure) || tenure < 3) return false;
    if ((loanType === 'cash' && amount > maxCashLoan) || 
        (loanType === 'venture' && amount > maxVentureLoan) || 
        (loanType === 'emergency' && amount > maxEmergencyLoan)) return false;
    if (loanType === 'venture' && tenure > 24) return false;
    if (loanType === 'cash' && tenure > 12) return false;
    if (loanType === 'emergency' && tenure > 6) return false;
    return true;
  };

  const canProceedStep2 = () => {
    if (!formData.grantorPsn || formData.grantorPsn.trim().length < 5) return false;
    if (!formData.purpose || formData.purpose.trim().length < 20) return false;
    return true;
  };

  const canProceedStep3 = () => {
    return !!formData.payslip;
  };

  const goNext = async () => {
    setShowValidation(true);
    if (step === 1 && !canProceedStep1()) {
      toast.error('Please complete the loan details correctly before continuing.');
      return;
    }
    if (step === 2 && !canProceedStep2()) {
      toast.error('Please provide a valid grantor PSN and a detailed purpose before continuing.');
      return;
    }
    if (step === 3 && !canProceedStep3()) {
      toast.error('Please upload your recent payslip before continuing.');
      return;
    }

    if (step === 2) {
      const psn = formData.grantorPsn.trim();
      setGrantorValidation({ status: 'loading' });
      const result = await validateGrantor(psn);
      if (!result.isValid) {
        setGrantorValidation({ status: 'invalid', message: result.message || 'Invalid guarantor PSN. Please check and try again.' });
        toast.error(result.message || 'Invalid guarantor PSN. Please check and try again.');
        return;
      }
      setGrantorValidation({ status: 'valid', memberName: result.memberName, message: undefined });
    }

    setStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev));
  };

  const goBack = () => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev));

  const handleInputChange = (field: string, value: string) => {
    if (field === 'grantorPsn') {
      setGrantorValidation({ status: 'idle' });
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateUpload = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxBytes = 5 * 1024 * 1024;
    if (!allowed.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPG, PNG, or PDF.');
      return false;
    }
    if (file.size > maxBytes) {
      toast.error('File is too large. Maximum size is 5MB.');
      return false;
    }
    return true;
  };

  const handleFileUpload = (file: File) => {
    if (!validateUpload(file)) return;
    setFormData(prev => ({
      ...prev,
      payslip: file
    }));
  };

  const handleEducationFile = (field: 'admissionLetter' | 'studentIdCard', file: File | null) => {
    if (file && !validateUpload(file)) return;
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const handleOtherDocs = (files: FileList | null) => {
    const next = files ? Array.from(files) : [];
    for (const f of next) {
      if (!validateUpload(f)) return;
    }
    setFormData(prev => ({
      ...prev,
      otherDocs: next
    }));
  };

  const validateGrantor = async (psn: string): Promise<{isValid: boolean, memberName?: string, memberId?: number, message?: string}> => {
    try {
      // Check if grantor PSN exists and is valid
      const response = await api.get('/members/validate-grantor', {
        params: { psn: psn.trim() }
      });

      if (response.data.success) {
        return {
          isValid: true,
          memberName: response.data.member.name,
          memberId: response.data.member.id
        };
      }

      return { isValid: false, message: response.data?.message || 'Invalid guarantor PSN.' };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to validate guarantor right now. Please check your connection and try again.';
      console.error('Grantor validation error:', error);
      return { isValid: false, message };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);

    console.log('Loan application submission started...');

    // Step 1: Validate loan amount
    const amount = parseFloat(formData.amount);

    if (!formData.amount || amount <= 0) {
      toast.error('Please enter a valid loan amount');
      return;
    }

    if (loanType === 'cash' && amount > maxCashLoan) {
      toast.error(`You are exceeding your cash limit. Maximum allowed is ₦${maxCashLoan.toLocaleString()}`);
      return;
    }

    if (loanType === 'venture' && amount > maxVentureLoan) {
      toast.error(`You are exceeding your venture limit. Maximum allowed is ₦${maxVentureLoan.toLocaleString()}`);
      return;
    }

    if (loanType === 'emergency' && amount > maxEmergencyLoan) {
      toast.error(`You are exceeding your emergency limit. Maximum allowed is ₦${maxEmergencyLoan.toLocaleString()}`);
      return;
    }

    if (amount < 10000) {
      toast.error('Minimum loan amount is ₦10,000');
      return;
    }

    // Step 2: Validate grantor PSN
    if (!formData.grantorPsn || !formData.grantorPsn.trim()) {
      toast.error('Please enter grantor PSN');
      return;
    }

    if (formData.grantorPsn.trim().length < 5) {
      toast.error('Please enter a valid PSN (5-8 characters)');
      return;
    }

    // Check if user is trying to be their own grantor
    if (user?.psn && formData.grantorPsn.trim().toLowerCase() === user.psn.toLowerCase()) {
      toast.error('You cannot be your own grantor');
      return;
    }

    // Validate grantor PSN exists
    toast.loading('Validating grantor...');
    const grantorValidation = await validateGrantor(formData.grantorPsn.trim());

    if (!grantorValidation.isValid) {
      toast.dismiss();
      toast.error('Invalid grantor PSN. Please check and try again.');
      return;
    }

    toast.dismiss();
    toast.success(`Found grantor: ${grantorValidation.memberName}`);

    // Step 3: Validate loan purpose
    if (!formData.purpose || !formData.purpose.trim()) {
      toast.error('Please provide a detailed loan purpose');
      return;
    }

    if (formData.purpose.trim().length < 20) {
      toast.error('Please provide a more detailed purpose (at least 20 characters)');
      return;
    }

    // Step 4: Validate repayment tenure
    const tenure = parseInt(formData.tenure);
    if (loanType === 'emergency' && (tenure < 1 || tenure > 6)) {
      toast.error('Repayment period must be between 1 and 6 months');
      return;
    } else if (loanType !== 'emergency' && (tenure < 3 || tenure > 24)) {
      toast.error('Repayment period must be between 3 and 24 months');
      return;
    }

    // Step 5: Calculate and validate monthly payment
    let totalRepayment = amount;
    if (loanType === 'venture') {
      totalRepayment = amount * 1.05; // 5% interest
    }
    const monthlyPayment = totalRepayment / tenure;
    if (monthlyPayment > 100000) { // Assuming max affordable monthly payment
      toast.error(`Monthly payment (₦${monthlyPayment.toLocaleString()}) exceeds maximum affordable amount`);
      return;
    }

    if (!formData.payslip) {
      toast.error('Please upload your recent payslip');
      return;
    }

    // Step 6: Submit loan application
    try {
      toast.loading('Submitting loan application...');

      const payload = new FormData();
      payload.append('loan_type', loanType);
      payload.append('amount_requested', amount.toString());
      payload.append('repayment_period_months', tenure.toString());
      payload.append('purpose', formData.purpose.trim());
      payload.append('guarantor_psn', formData.grantorPsn.trim());
      payload.append('guarantor_name', grantorValidation.memberName || 'Cooperative Member');
      payload.append('guarantor_phone', '000-000-0000');
      payload.append('guarantor_relationship', 'Cooperative Member');
      payload.append(
        'notes',
        `Grantor PSN: ${formData.grantorPsn.trim()} | Member: ${grantorValidation.memberName} | Monthly Payment: ₦${Math.round(monthlyPayment).toLocaleString()}`
      );
      payload.append('payslip', formData.payslip);

      if (loanType === 'educational') {
        if (formData.admissionLetter) payload.append('admission_letter', formData.admissionLetter);
        if (formData.studentIdCard) payload.append('student_id_card', formData.studentIdCard);
        for (const f of formData.otherDocs) payload.append('education_other', f);
      }

      const response = await api.post('/loans', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.dismiss();

      try {
        sessionStorage.removeItem(draftKey);
      } catch {}

      // Reset form on success
      setFormData({
        amount: '',
        tenure: '6',
        grantorPsn: '',
        purpose: '',
        payslip: null as File | null,
        admissionLetter: null as File | null,
        studentIdCard: null as File | null,
        otherDocs: []
      });
      setGrantorValidation({ status: 'idle' });
      setStep(1);
      setShowValidation(false);

      // Show success message
      toast.success(
        `🎉 Loan application submitted successfully!\n\nLoan ID: ${response.data.loan.id}\n\nAmount: ₦${amount.toLocaleString()}\nMonthly Payment: ₦${Math.round(monthlyPayment).toLocaleString()}\n\nGrantor: ${grantorValidation.memberName} (${formData.grantorPsn.trim()})\n\nThe grantor will be notified to approve your request.`,
        { duration: 10000 }
      );

      console.log('Loan application submitted successfully:', response.data);

      if (loanType === 'investment') {
        setSubmittedLoanId(response.data.loan.id);
        setShowAgentAgreement(true);
      } else {
        navigate('/my-loans');
      }

    } catch (error: any) {
      toast.dismiss();
      console.error('Loan application error:', error);

      const errorData = error.response?.data;
      if (errorData?.existing_loan) {
        // User already has an active loan - show detailed information
        const existingLoan = errorData.existing_loan;
        const statusText = existingLoan.status.replace('_', ' ').toUpperCase();

        toast.error(
          `You already have an active loan application!\n\n` +
          `Loan ID: ${existingLoan.id}\n` +
          `Status: ${statusText}\n` +
          `Amount: ₦${existingLoan.amount_requested.toLocaleString()}\n` +
          `Applied: ${new Date(existingLoan.application_date).toLocaleDateString()}\n\n` +
          `You can only apply for a new loan after your current loan is fully paid off.`,
          { duration: 8000 }
        );
      } else {
        const message = errorData?.message || 'Failed to submit loan application';
        toast.error(message);
      }
    }
  };

  const calculateMonthlyPayment = () => {
    const amount = parseFloat(formData.amount) || 0;
    const tenure = parseInt(formData.tenure) || 1;
    let totalRepayment = amount;
    if (loanType === 'venture') {
      totalRepayment = amount * 1.05;
    }
    return totalRepayment / tenure;
  };

  const eligibilityPreview = useMemo(() => {
    const amount = parseFloat(formData.amount || '0') || 0;
    const tenure = parseInt(formData.tenure || '0', 10) || 0;
    const investment = memberData?.totalInvestment || 0;
    const savings = memberData?.totalSavings || 0;
    const months = memberData?.membershipDuration || 1;
    const flags: string[] = [];

    if (months < 3) flags.push('New member');
    if (!formData.payslip) flags.push('Payslip required');
    if (loanType === 'cash' && amount > 500000) flags.push('High cash amount');
    if (loanType === 'venture' && investment > 0 && amount > maxVentureLoan) flags.push('High amount vs investment');
    if ((investment + savings) < 5000) flags.push('Low contribution history');
    if (loanType === 'venture' && tenure > 24) flags.push('Tenure must be ≤ 24 months');
    if (loanType === 'cash' && tenure > 12) flags.push('Tenure must be ≤ 12 months');
    if (loanType === 'emergency' && tenure > 6) flags.push('Tenure must be ≤ 6 months');

    const score = Math.max(
      300,
      Math.min(
        850,
        Math.round(
          380 +
            Math.min(250, months * 10) +
            Math.min(150, (investment + savings) / 10000 * 10) +
            (flags.length === 0 ? 70 : 0) -
            flags.length * 15
        )
      )
    );

    return { score, flags };
  }, [formData.amount, formData.tenure, formData.payslip, loanType, memberData]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="relative overflow-hidden rounded-xl border border-iman-gold-light/60 bg-gradient-to-br from-white to-primary-50 p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 loan-stripe" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-iman-gold-light/40 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-primary-200/40 blur-3xl" aria-hidden="true" />

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Apply for Loan</h1>
            <p className="text-gray-700">
              Submit your loan application with required documents
            </p>
          </div>
          <span className="sr-only">Decorative brand stripe</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">Application progress</div>
            <div className="flex items-center gap-2" aria-label="Loan application steps">
              {[
                { n: 1, label: 'Loan details' },
                { n: 2, label: 'Purpose & grantor' },
                { n: 3, label: 'Documents' },
                { n: 4, label: 'Review' }
              ].map((s, idx) => {
                const isActive = step === s.n;
                const isDone = step > s.n;
                return (
                  <div key={s.n} className="flex items-center">
                    <div
                      className={[
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border',
                        isDone ? 'bg-primary-500 text-white border-primary-500' : isActive ? 'bg-primary-50 text-primary-700 border-primary-300' : 'bg-white text-gray-500 border-gray-200'
                      ].join(' ')}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      {isDone ? <CheckCircle className="w-4 h-4" aria-hidden="true" /> : s.n}
                    </div>
                    {idx < 3 && <div className="w-10 h-px bg-gray-200 mx-2" aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Step {step} of 4: {step === 1 ? 'Choose product, amount, and repayment period' : step === 2 ? 'Provide purpose and grantor' : step === 3 ? 'Upload documents securely' : 'Confirm and submit'}
          </div>
        </div>
      </div>

      {/* Active Loan Warning */}
      {memberData?.hasActiveLoan && memberData?.existingLoan && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Active Loan Detected</h3>
              <p className="text-red-800 mb-3">
                You currently have an active loan application and cannot apply for a new loan until it is fully paid off.
              </p>
              <div className="bg-white rounded-lg p-4 border border-red-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Loan ID:</span>
                    <p className="text-gray-900">{memberData.existingLoan.id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <p className="text-gray-900 capitalize">{memberData.existingLoan.status.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Amount:</span>
                    <p className="text-gray-900">₦{memberData.existingLoan.amount_requested.toLocaleString()}</p>
                  </div>
                  <div className="md:col-span-3">
                    <span className="font-medium text-gray-700">Applied Date:</span>
                    <p className="text-gray-900">{new Date(memberData.existingLoan.application_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <p className="text-red-700 text-sm mt-3">
                Please complete your current loan before applying for a new one. Contact the cooperative administration if you need assistance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Agent Agreement Modal */}
      <AgentAgreementModal
        isOpen={showAgentAgreement}
        onClose={() => setShowAgentAgreement(false)}
        loanId={submittedLoanId || 0}
        onSuccess={() => navigate('/my-loans')}
      />

      {/* Loan Eligibility Summary */}
      <div className="bg-blue-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <Info className="w-5 h-5 mr-2" />
          Your Loan Eligibility
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Cash Loan</h4>
            <p className="text-2xl font-bold text-green-600">₦{maxCashLoan.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Max ₦{(settings.cash_loan_limit ? parseFloat(settings.cash_loan_limit) : 500000).toLocaleString()} ({settings.cash_loan_multiplier || 3}x 50% contribution)</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Venture Loan</h4>
            <p className="text-2xl font-bold text-purple-600">₦{maxVentureLoan.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Max ₦{(settings.venture_loan_limit ? parseFloat(settings.venture_loan_limit) : 1000000).toLocaleString()} ({settings.venture_loan_multiplier || 10}x 30% contribution)</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Emergency Loan</h4>
            <p className="text-2xl font-bold text-red-600">₦{maxEmergencyLoan.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Max ₦{(settings.emergency_loan_limit ? parseFloat(settings.emergency_loan_limit) : 20000).toLocaleString()} for emergencies.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Form */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Loan Application Form</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <div className="space-y-6" aria-label="Step 1: Loan details">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Loan Type *</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        type="button"
                        onClick={() => setLoanType('cash')}
                        className={`p-4 border-2 rounded-lg text-left cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          loanType === 'cash' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        aria-pressed={loanType === 'cash'}
                      >
                        <div className="flex items-center">
                          <DollarSign className="w-6 h-6 text-green-500 mr-3" aria-hidden="true" />
                          <div>
                            <h4 className="font-medium">Cash Loan</h4>
                            <p className="text-sm text-gray-600">Up to ₦{(settings.cash_loan_limit ? parseFloat(settings.cash_loan_limit) : 500000).toLocaleString()} • max 12 months</p>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoanType('venture')}
                        className={`p-4 border-2 rounded-lg text-left cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          loanType === 'venture' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        aria-pressed={loanType === 'venture'}
                      >
                        <div className="flex items-center">
                          <CreditCard className="w-6 h-6 text-purple-500 mr-3" aria-hidden="true" />
                          <div>
                            <h4 className="font-medium">Venture Loan</h4>
                            <p className="text-sm text-gray-600">Up to ₦{(settings.venture_loan_limit ? parseFloat(settings.venture_loan_limit) : 1000000).toLocaleString()} • max 24 months</p>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoanType('emergency')}
                        className={`p-4 border-2 rounded-lg text-left cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          loanType === 'emergency' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        aria-pressed={loanType === 'emergency'}
                      >
                        <div className="flex items-center">
                          <AlertCircle className="w-6 h-6 text-red-500 mr-3" aria-hidden="true" />
                          <div>
                            <h4 className="font-medium">Emergency Loan</h4>
                            <p className="text-sm text-gray-600">Up to ₦{(settings.emergency_loan_limit ? parseFloat(settings.emergency_loan_limit) : 20000).toLocaleString()} • max 6 months</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount (₦) *</label>
                      <input
                        type="number"
                        required
                        min="1000"
                        max={loanType === 'cash' ? maxCashLoan : loanType === 'venture' ? maxVentureLoan : maxEmergencyLoan}
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className={[
                          'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                          showValidation && !formData.amount ? 'border-red-300' : 'border-gray-300'
                        ].join(' ')}
                        placeholder="Enter loan amount"
                        aria-invalid={showValidation && !formData.amount}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum: ₦{(loanType === 'cash' ? maxCashLoan : loanType === 'venture' ? maxVentureLoan : maxEmergencyLoan).toLocaleString()}
                      </p>
                      {showValidation &&
                        (() => {
                          const amount = parseFloat(formData.amount || '0');
                          const maxAllowed = loanType === 'cash' ? maxCashLoan : maxInvestmentLoan;
                          if (!formData.amount) return <p className="mt-1 text-sm text-red-600">Loan amount is required.</p>;
                          if (!Number.isFinite(amount) || amount <= 0) return <p className="mt-1 text-sm text-red-600">Enter a valid loan amount.</p>;
                          if (amount < 10000) return <p className="mt-1 text-sm text-red-600">Minimum loan amount is ₦10,000.</p>;
                          if (amount > maxAllowed) return <p className="mt-1 text-sm text-red-600">Amount exceeds the maximum for this loan type.</p>;
                          return null;
                        })()}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Repayment Period *</label>
                      <select
                        required
                        value={formData.tenure}
                        onChange={(e) => handleInputChange('tenure', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        aria-describedby="tenure-hint"
                      >
                        {tenureOptions.map((m) => (
                          <option key={m} value={String(m)}>{m} months</option>
                        ))}
                      </select>
                      <div id="tenure-hint" className="mt-1 text-xs text-gray-600">
                        {tenureWarning}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canProceedStep1()}
                      className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6" aria-label="Step 2: Purpose and grantor">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grantor PSN *</label>
                    <input
                      type="text"
                      required
                      value={formData.grantorPsn}
                      onChange={(e) => handleInputChange('grantorPsn', e.target.value)}
                      onBlur={async () => {
                        const psn = formData.grantorPsn.trim();
                        if (!psn || psn.length < 5) return;
                        setGrantorValidation({ status: 'loading' });
                        const result = await validateGrantor(psn);
                        if (!result.isValid) {
                          setGrantorValidation({ status: 'invalid', message: result.message || 'Invalid guarantor PSN. Please check and try again.' });
                          return;
                        }
                        setGrantorValidation({ status: 'valid', memberName: result.memberName, message: undefined });
                      }}
                      className={[
                        'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                        showValidation && (!formData.grantorPsn || formData.grantorPsn.trim().length < 5) ? 'border-red-300' : 'border-gray-300'
                      ].join(' ')}
                      placeholder="Enter grantor's PSN"
                      aria-invalid={showValidation && (!formData.grantorPsn || formData.grantorPsn.trim().length < 5)}
                    />
                    <p className="text-sm text-gray-500 mt-1">PSN of the cooperative member who will guarantee your loan.</p>
                    {showValidation && (!formData.grantorPsn || formData.grantorPsn.trim().length < 5) && (
                      <p className="mt-1 text-sm text-red-600">Grantor PSN is required (minimum 5 characters).</p>
                    )}
                    {grantorValidation.status === 'loading' && (
                      <p className="mt-1 text-sm text-gray-600">Validating guarantor PSN…</p>
                    )}
                    {grantorValidation.status === 'valid' && (
                      <p className="mt-1 text-sm text-green-700">Guarantor found: {grantorValidation.memberName || 'Cooperative member'}</p>
                    )}
                    {grantorValidation.status === 'invalid' && (
                      <p className="mt-1 text-sm text-red-600">{grantorValidation.message || 'Invalid guarantor PSN. Please check and try again.'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {loanType === 'venture' ? 'Venture to Embark On *' : 'Purpose of Loan *'}
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.purpose}
                      onChange={(e) => handleInputChange('purpose', e.target.value)}
                      className={[
                        'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                        showValidation && (!formData.purpose || formData.purpose.trim().length < 20) ? 'border-red-300' : 'border-gray-300'
                      ].join(' ')}
                      placeholder={loanType === 'venture' ? "Describe the venture you intend to embark on (at least 20 characters)..." : "Describe the purpose of this loan (at least 20 characters)..."}
                      aria-invalid={showValidation && (!formData.purpose || formData.purpose.trim().length < 20)}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {loanType === 'venture' ? 'Provide clear details of your venture.' : 'Provide a clear purpose to support faster review.'}
                    </p>
                    {showValidation && (!formData.purpose || formData.purpose.trim().length < 20) && (
                      <p className="mt-1 text-sm text-red-600">Purpose is required (minimum 20 characters).</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 font-medium w-full sm:w-auto"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canProceedStep2() || grantorValidation.status === 'loading'}
                      className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6" aria-label="Step 3: Documents">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Payslip *</label>
                    <div className={[
                      'border-2 border-dashed rounded-lg p-6 text-center',
                      showValidation && !formData.payslip ? 'border-red-300 bg-red-50/30' : 'border-gray-300'
                    ].join(' ')}>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-sm text-gray-700 mb-2">
                        {formData.payslip ? formData.payslip.name : 'Choose a JPG, PNG, or PDF (max 5MB)'}
                      </p>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                        className="hidden"
                        id="payslip-upload"
                      />
                      <label
                        htmlFor="payslip-upload"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                      >
                        Choose file
                      </label>
                      <p className="text-xs text-gray-500 mt-2">Files are stored securely.</p>
                    </div>
                    {showValidation && !formData.payslip && (
                      <p className="mt-2 text-sm text-red-600">Payslip upload is required to continue.</p>
                    )}
                  </div>

                  {loanType === 'educational' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Admission Letter (optional)</label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleEducationFile('admissionLetter', e.target.files?.[0] || null)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Student ID Card (optional)</label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleEducationFile('studentIdCard', e.target.files?.[0] || null)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Other Documents (optional)</label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          multiple
                          onChange={(e) => handleOtherDocs(e.target.files)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 font-medium w-full sm:w-auto"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canProceedStep3()}
                      className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6" aria-label="Step 4: Review and submit">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-900">Review</div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between gap-2"><span className="text-gray-600">Loan type</span><span className="font-medium capitalize text-gray-900">{loanType}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-gray-600">Tenure</span><span className="font-medium text-gray-900">{formData.tenure} months</span></div>
                      <div className="flex justify-between gap-2 sm:col-span-2"><span className="text-gray-600">Amount</span><span className="font-medium text-gray-900">₦{parseFloat(formData.amount || '0').toLocaleString()}</span></div>
                      <div className="flex justify-between gap-2 sm:col-span-2"><span className="text-gray-600">Grantor PSN</span><span className="font-medium text-gray-900">{formData.grantorPsn || '-'}</span></div>
                      <div className="sm:col-span-2">
                        <div className="text-gray-600">Purpose</div>
                        <div className="mt-1 text-gray-900">{formData.purpose || '-'}</div>
                      </div>
                      <div className="flex justify-between gap-2 sm:col-span-2"><span className="text-gray-600">Payslip</span><span className="font-medium text-gray-900">{formData.payslip ? formData.payslip.name : 'Not uploaded'}</span></div>
                    </div>
                    {loanType !== 'cash' && (
                      <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                        Investment and educational loans have a maximum repayment period of 24 months. This rule is enforced both in the app and on the server.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 font-medium"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium"
                    >
                      <CreditCard className="w-5 h-5 mr-2" aria-hidden="true" />
                      Submit Loan Application
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Loan Summary & Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Automated Eligibility Check</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Internal credit score</span>
              <span className="font-semibold text-gray-900">{eligibilityPreview.score}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
              <div
                className="h-full bg-primary-500 transition-all"
                style={{ width: `${Math.round(((eligibilityPreview.score - 300) / 550) * 100)}%` }}
              />
            </div>
            <div className="mt-3 text-xs text-gray-600">
              This is an internal automated check based on your cooperative history and selected loan terms.
            </div>
            {eligibilityPreview.flags.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="text-xs font-semibold text-amber-900">Flags</div>
                <ul className="mt-2 text-xs text-amber-800 space-y-1">
                  {eligibilityPreview.flags.slice(0, 5).map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Loan Summary */}
          {formData.amount && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Loan Type:</span>
                  <span className="font-medium capitalize">{loanType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">₦{parseFloat(formData.amount || '0').toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tenure:</span>
                  <span className="font-medium">{formData.tenure} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Payment:</span>
                  <span className="font-medium text-green-600">₦{calculateMonthlyPayment().toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Loan Requirements */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                <span className="text-sm">Active cooperative membership</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                <span className="text-sm">Valid grantor with active membership</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                <span className="text-sm">Recent payslip (within 3 months)</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                <span className="text-sm">No outstanding loan balance</span>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Important Notes
            </h3>
            <ul className="text-sm text-yellow-800 space-y-2">
              <li>• Loans are Sharia-compliant with no interest charges</li>
              <li>• Processing time is 3-5 business days</li>
              <li>• Grantor must approve the guarantee request</li>
              <li>• Monthly deductions will be made from salary</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyForLoan;
