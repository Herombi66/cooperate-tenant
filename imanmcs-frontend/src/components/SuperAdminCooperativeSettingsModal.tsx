import React, { useState, useEffect, useRef } from 'react';
import {
  X, Building2, Image as ImageIcon, MapPin, Mail, Phone,
  Globe, DollarSign, CreditCard, TrendingUp, Percent,
  Shield, Layers, Bot, Save, Loader, Upload, CheckCircle2,
  Calendar, Key, Sparkles, Eye, EyeOff, FileText, AlertCircle,
  Clock, Tag, Check, Hash, AlertTriangle, Receipt, Landmark,
  ExternalLink, Copy, Lock, UserCheck, RefreshCw, User
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import toast from 'react-hot-toast';

interface SuperAdminCoopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: { id: string; name: string } | null; // null means Global Defaults mode
  onSuccess?: () => void;
}

export const SuperAdminCooperativeSettingsModal: React.FC<SuperAdminCoopSettingsModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPricingConfig, setShowPricingConfig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tenant Admin Security State
  const [adminInfo, setAdminInfo] = useState<{
    id: number;
    name: string;
    email: string;
    psn: string;
    phone?: string;
    role: string;
    status: string;
    is_default_password?: boolean;
  } | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [showCustomPassword, setShowCustomPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetResult, setResetResult] = useState<{
    newPassword: string;
    isCustom: boolean;
    name: string;
    email: string;
    psn: string;
    timestamp: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const defaultSettings = {
    // 1. Name
    cooperative_name: '',
    registration_number: '',

    // Domain & Routing
    domain: '',
    subdomain: '',

    // 2. Logo
    cooperative_logo: '/logo.png',

    // 3. Address
    address: '',

    // 4. Contact details
    contact_email: '',
    contact_phone: '',
    contact_website: '',
    support_phone: '',

    // 5. Currency
    currency_code: 'NGN',
    currency_symbol: '₦',
    currency_name: 'Nigerian Naira',

    // 6. Contribution rules
    minimum_savings: 1000,
    minimum_target_savings: 2000,
    target_savings_min_period: 6,
    allow_voluntary_savings: true,
    savings_withdrawal_lock_months: 6,
    max_savings_withdrawal_percent: 70,

    // 7. Loan rules
    max_loan_amount: 1000000,
    max_cash_loan: 500000,
    investment_loan_multiplier: 3,
    default_repayment_period: 12,
    min_membership_months_for_loan: 6,
    loan_interest_rate: 5,
    late_payment_fee: 5,
    max_active_loans_per_member: 2,
    require_guarantors: true,
    min_guarantors_count: 2,

    // 8. Investment rules
    minimum_investment: 5000,
    investment_lock_period_months: 12,
    expected_roi_percent: 15,
    allow_early_liquidation: false,
    early_termination_penalty_percent: 10,

    // 9. Profit distribution rules
    profit_sharing_frequency: 'quarterly',
    reserve_fund_percentage: 10,
    education_fund_percentage: 5,
    committee_bonus_percentage: 5,
    bad_debt_reserve_percentage: 3.5,
    general_reserve_percentage: 2.8,
    member_dividend_percentage: 73.7,

    // 10. Registration fee
    registration_fee: 2000,
    auto_deduct_registration_fee: true,

    // 11. Monthly administrative fee
    monthly_admin_fee: 1000,
    auto_deduct_monthly_admin_fee: true,

    // 12. Subscription status & Plan Tier
    subscription_status: 'active',
    subscription_plan: 'Growth Plan',

    // 13. Subscription expiry & Billing Specifications
    subscription_expiry: '2027-12-31',
    subscription_billing_cycle: 'monthly',
    subscription_rate_per_member: 150,
    subscription_member_bracket: '501 Up to 1,000 members',
    subscription_amount_payable: 150000,
    subscription_currency: 'NGN',
    subscription_payment_status: 'paid',
    subscription_payment_method: 'Bank Transfer',
    subscription_next_billing_date: '2027-12-31',
    subscription_invoice_reference: 'INV-2025-IMAN-001',
    subscription_member_limit: 1000,
    subscription_billing_notes: 'Growth plan active with ₦150/member rate, automated reminders, and investment portfolios.',
    subscription_pricing_tiers: [
      {
        id: 'starter',
        name: 'Starter Plan',
        rate_per_member: 200,
        currency: 'NGN',
        min_members: 1,
        max_members: 500,
        member_bracket: '1 UP TO 500 MEMBERS',
        badge: 'Starter',
        description: 'Essential digital tools for emerging and community-based cooperatives.',
        features: [
          '1 up to 500 Members',
          '₦200 / per member billing',
          'Savings & Share Contributions Module',
          'Standard Loan Processing & Amortization',
          'Digital Passbooks & Receipt Vouchers',
          'Automated Monthly Statement Generation',
          'Standard Email Support'
        ]
      },
      {
        id: 'growth',
        name: 'Growth Plan',
        rate_per_member: 150,
        currency: 'NGN',
        min_members: 501,
        max_members: 1000,
        member_bracket: '501 Up to 1,000 members',
        popular: true,
        badge: 'Popular',
        description: 'High-performance suite for growing cooperatives with investment and asset portfolios.',
        features: [
          '501 up to 1,000 Members',
          '₦150 / per member billing',
          'All Starter Features Included',
          'Fixed-Yield Investment Portfolios',
          'Layyah Livestock Pool Management',
          'AI Financial Advisor & Loan Risk Scoring',
          'Automated SMS & Email Notifications',
          'Priority Support Desk (12h SLA)'
        ]
      },
      {
        id: 'pro',
        name: 'PRO Plan',
        rate_per_member: 100,
        currency: 'NGN',
        min_members: 1001,
        max_members: 1500,
        member_bracket: '1001 Up to 1,500 members',
        badge: 'High Volume',
        description: 'Maximum power, bespoke customizations, and unlimited institutional capabilities.',
        features: [
          '1,001 up to 1,500 Members',
          '₦100 / per member billing',
          'All Functional Modules Unlocked',
          'Complete AI Intelligence Suite (OCR + Auto Audit)',
          'Custom Domain & Complete Brand Whitelabeling',
          'Multi-Level Executive Approvals & Audit Logs',
          'Receipt & Legal Contract Designer',
          'Dedicated Platform Account Manager & 24/7 Phone Support'
        ]
      },
      {
        id: 'custom',
        name: 'Custom Plan',
        rate_per_member: null,
        currency: 'NGN',
        min_members: 1501,
        max_members: 0,
        member_bracket: 'Unlimited / Negotiated',
        badge: 'Bespoke',
        description: 'Tailored enterprise architecture for apex federations and large multi-branch unions.',
        features: [
          '1,501+ Members / Unlimited Scale',
          'Negotiated Custom Rate Per Member',
          'Multi-Branch Federation Aggregation',
          'Custom ERP & Core Banking Integration',
          'On-Premises or Dedicated Cloud Infrastructure',
          'Dedicated Solutions Architect & SLA'
        ]
      }
    ],
    subscription_payment_instructions: {
      bank_name: 'First Bank of Nigeria',
      account_name: 'Cooperative Core Technologies Ltd',
      account_number: '3128945012',
      sort_code: '011151003',
      payment_reference_format: 'COOP-[TENANT_ID]-[MONTH_YEAR]',
      support_email: 'billing@platform.cooperative.org',
      support_phone: '+234 800 123 4567'
    },

    // 14. Enabled modules
    enabled_modules: {
      loans: true,
      contributions: true,
      investments: true,
      layyah: true,
      expenses: true,
      profit_sharing: true,
      withdrawals: true,
      receipt_designer: true,
      document_designer: true,
      member_portal: true
    },

    // 15. AI settings
    ai_settings: {
      enabled: true,
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      api_key: '',
      loan_risk_scoring: true,
      financial_advisor: true,
      document_ocr: true,
      auto_reporting: true
    },

    agent_agreement_template: '',
    murabaha_contract_template: ''
  };

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, tenant]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setResetResult(null);
      setCustomPassword('');
      const token = localStorage.getItem('platformToken');
      const endpoint = tenant
        ? `${API_URL}/platform/tenants/${tenant.id}/settings`
        : `${API_URL}/platform/settings/defaults`;

      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success && (res.data.settings || res.data.data)) {
        const loaded = res.data.settings || res.data.data;
        setSettings({
          ...defaultSettings,
          ...loaded,
          enabled_modules: {
            ...defaultSettings.enabled_modules,
            ...(loaded.enabled_modules || {})
          },
          ai_settings: {
            ...defaultSettings.ai_settings,
            ...(loaded.ai_settings || {})
          }
        });
      }

      if (res.data.admin) {
        setAdminInfo(res.data.admin);
      } else {
        setAdminInfo(null);
      }
    } catch (err: any) {
      console.error('Failed to load cooperative settings for super admin:', err);
      toast.error('Could not load settings. Using defaults.');
      setSettings(defaultSettings);
      setAdminInfo(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleModuleToggle = (moduleKey: string) => {
    setSettings(prev => ({
      ...prev,
      enabled_modules: {
        ...prev.enabled_modules,
        [moduleKey]: !prev.enabled_modules[moduleKey as keyof typeof prev.enabled_modules]
      }
    }));
  };

  const handleAISettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      ai_settings: {
        ...prev.ai_settings,
        [key]: value
      }
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }

    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = () => {
      handleChange('cooperative_logo', reader.result as string);
      setUploadingLogo(false);
      toast.success('Logo preview loaded');
    };
    reader.onerror = () => {
      setUploadingLogo(false);
      toast.error('Failed to read image');
    };
    reader.readAsDataURL(file);
  };

  const handleCurrencyPreset = (code: string, sym: string, name: string) => {
    setSettings(prev => ({
      ...prev,
      currency_code: code,
      currency_symbol: sym,
      currency_name: name
    }));
  };

  const profitTotal = (
    Number(settings.reserve_fund_percentage || 0) +
    Number(settings.education_fund_percentage || 0) +
    Number(settings.committee_bonus_percentage || 0) +
    Number(settings.bad_debt_reserve_percentage || 0) +
    Number(settings.general_reserve_percentage || 0) +
    Number(settings.member_dividend_percentage || 0)
  );

  const autoBalanceDividend = () => {
    const deductions = (
      Number(settings.reserve_fund_percentage || 0) +
      Number(settings.education_fund_percentage || 0) +
      Number(settings.committee_bonus_percentage || 0) +
      Number(settings.bad_debt_reserve_percentage || 0) +
      Number(settings.general_reserve_percentage || 0)
    );
    const remainder = Math.max(0, parseFloat((100 - deductions).toFixed(2)));
    handleChange('member_dividend_percentage', remainder);
    toast.success(`Member dividend balanced to ${remainder}%`);
  };

  const getDaysRemaining = () => {
    if (!settings.subscription_expiry) return null;
    const expiry = new Date(settings.subscription_expiry).getTime();
    const now = new Date().getTime();
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  };
  const daysLeft = getDaysRemaining();

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('platformToken');
      const endpoint = tenant
        ? `${API_URL}/platform/tenants/${tenant.id}/settings`
        : `${API_URL}/platform/settings/defaults`;

      const res = await axios.put(endpoint, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success(
          tenant
            ? `Settings saved for ${tenant.name}!`
            : 'Global cooperative default settings saved!'
        );
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      console.error('Save settings error:', err);
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAdminPassword = async () => {
    if (!tenant) return;
    if (customPassword && customPassword.trim().length > 0 && customPassword.trim().length < 6) {
      toast.error('Custom password must be at least 6 characters long');
      return;
    }

    const actionText = customPassword.trim()
      ? `set the specified custom password for ${adminInfo?.name || tenant.name + ' Admin'}`
      : `generate a new secure random password for ${adminInfo?.name || tenant.name + ' Admin'}`;

    if (!window.confirm(`Are you sure you want to ${actionText}?`)) {
      return;
    }

    try {
      setResettingPassword(true);
      const token = localStorage.getItem('platformToken');
      const res = await axios.post(
        `${API_URL}/platform/tenants/${tenant.id}/reset-admin-password`,
        {
          password: customPassword.trim() || undefined,
          userId: adminInfo?.id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.data.success) {
        toast.success(res.data.message || 'Administrator password updated successfully!');
        setResetResult({
          newPassword: res.data.data.newPassword,
          isCustom: res.data.data.isCustom,
          name: res.data.data.name,
          email: res.data.data.email,
          psn: res.data.data.psn,
          timestamp: new Date().toLocaleTimeString()
        });
        setCustomPassword('');
        setAdminInfo(prev => ({
          id: res.data.data.userId || prev?.id || 1,
          name: res.data.data.name || prev?.name || `${tenant.name} Administrator`,
          email: res.data.data.email || prev?.email || '',
          psn: res.data.data.psn || prev?.psn || '',
          phone: prev?.phone || '',
          role: 'admin',
          status: 'active',
          is_default_password: true
        }));
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      toast.error(err.response?.data?.message || 'Failed to reset administrator password');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCopyPassword = () => {
    if (!resetResult?.newPassword) return;
    navigator.clipboard.writeText(resetResult.newPassword);
    setCopiedPassword(true);
    toast.success('Password copied to clipboard!');
    setTimeout(() => setCopiedPassword(false), 3000);
  };

  const tabs = [
    { id: 'general', name: 'General & Identity', icon: Building2 },
    { id: 'domain', name: 'Domain & Routing', icon: Globe },
    ...(tenant ? [{ id: 'admin_security', name: 'Admin Security', icon: Key }] : []),
    { id: 'fees', name: 'Fees', icon: CreditCard },
    { id: 'contributions', name: 'Contribution Rules', icon: DollarSign },
    { id: 'loans', name: 'Loan Rules', icon: CreditCard },
    { id: 'investments', name: 'Investment Rules', icon: TrendingUp },
    { id: 'profit', name: 'Profit Distribution', icon: Percent },
    { id: 'subscription', name: 'Subscription & Plan', icon: Shield },
    { id: 'modules', name: 'Enabled Modules', icon: Layers },
    { id: 'ai', name: 'AI Settings', icon: Bot },
    { id: 'agreements', name: 'Agreements', icon: FileText }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-gray-100 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {tenant ? `Cooperative Settings — ${tenant.name}` : 'Global Cooperative Defaults'}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {tenant
                  ? `Tenant ID: ${tenant.id} • Configure policies, financial rules, subscription status, and module provisioning`
                  : 'Master defaults template applied when onboarding any new cooperative on the platform'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-6 bg-white overflow-x-auto shrink-0">
          <nav className="flex gap-2 py-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-bold border border-primary-200 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 animate-spin text-primary-600" />
              <span className="ml-3 text-sm font-medium text-gray-600">Loading cooperative settings...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: GENERAL & IDENTITY (1-5) */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Name */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        1. Cooperative Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={settings.cooperative_name || ''}
                        onChange={(e) => handleChange('cooperative_name', e.target.value)}
                        placeholder="e.g. FMC Keffi Staff Cooperative Society"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Registration Number</label>
                      <input
                        type="text"
                        value={settings.registration_number || ''}
                        onChange={(e) => handleChange('registration_number', e.target.value)}
                        placeholder="e.g. COOP/REG/2024/099"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* Domain & Subdomain Quick Card */}
                    <div className="md:col-span-2 p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">Custom Domain & Subdomain Access</span>
                            {settings.domain ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                {settings.domain}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-gray-200 text-gray-700 font-medium px-2 py-0.5 rounded-full">
                                {settings.subdomain ? `${settings.subdomain}.imanmcs.com` : 'Default routing'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Configure dedicated white-label hostnames and DNS routing for this tenant
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('domain')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-sm self-start sm:self-auto shrink-0 flex items-center gap-1"
                      >
                        <span>Configure Domain</span>
                        <span>&rarr;</span>
                      </button>
                    </div>

                    {/* 2. Logo */}
                    <div className="md:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <label className="block text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-primary-600" />
                        2. Cooperative Logo
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl border border-gray-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                          {settings.cooperative_logo ? (
                            <img
                              src={settings.cooperative_logo}
                              alt="Logo"
                              className="w-full h-full object-contain p-1"
                              onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-gray-300" />
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleLogoUpload}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className="px-3 py-1.5 bg-white border border-gray-300 text-xs font-medium rounded-lg hover:bg-gray-50 flex items-center gap-1.5 shadow-sm"
                          >
                            <Upload className="w-3.5 h-3.5 text-gray-600" />
                            {uploadingLogo ? 'Reading...' : 'Upload Logo'}
                          </button>
                          <input
                            type="text"
                            value={settings.cooperative_logo || ''}
                            onChange={(e) => handleChange('cooperative_logo', e.target.value)}
                            placeholder="Or paste direct image URL (https://...)"
                            className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Address */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" />
                        3. Address
                      </label>
                      <textarea
                        rows={2}
                        value={settings.address || ''}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="Head office physical address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* 4. Contact Details */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                        4. Contact Email
                      </label>
                      <input
                        type="email"
                        value={settings.contact_email || ''}
                        onChange={(e) => handleChange('contact_email', e.target.value)}
                        placeholder="contact@cooperative.org"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-500" />
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        value={settings.contact_phone || ''}
                        onChange={(e) => handleChange('contact_phone', e.target.value)}
                        placeholder="+234-800-000-0000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-gray-500" />
                        Official Website
                      </label>
                      <input
                        type="url"
                        value={settings.contact_website || ''}
                        onChange={(e) => handleChange('contact_website', e.target.value)}
                        placeholder="https://cooperative.org"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-500" />
                        Support Helpline
                      </label>
                      <input
                        type="text"
                        value={settings.support_phone || ''}
                        onChange={(e) => handleChange('support_phone', e.target.value)}
                        placeholder="+234-800-111-2222"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* 5. Currency */}
                    <div className="md:col-span-2 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          5. Accounting Currency
                        </label>
                        <div className="flex gap-1">
                          {[
                            { code: 'NGN', sym: '₦', name: 'Nigerian Naira' },
                            { code: 'USD', sym: '$', name: 'US Dollar' },
                            { code: 'EUR', sym: '€', name: 'Euro' },
                            { code: 'GBP', sym: '£', name: 'British Pound' }
                          ].map(c => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => handleCurrencyPreset(c.code, c.sym, c.name)}
                              className="px-2 py-0.5 text-[10px] rounded border border-gray-200 hover:bg-gray-100 font-medium"
                            >
                              {c.code} ({c.sym})
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={settings.currency_code}
                          onChange={(e) => handleChange('currency_code', e.target.value.toUpperCase())}
                          placeholder="Code (NGN)"
                          className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          value={settings.currency_symbol}
                          onChange={(e) => handleChange('currency_symbol', e.target.value)}
                          placeholder="Symbol (₦)"
                          className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          value={settings.currency_name}
                          onChange={(e) => handleChange('currency_name', e.target.value)}
                          placeholder="Name (Nigerian Naira)"
                          className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: DOMAIN & ROUTING */}
              {activeTab === 'domain' && (
                <div className="space-y-6">
                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900">
                          {tenant ? `Domain Configuration — ${tenant.name}` : 'Platform Domain Defaults'}
                        </h3>
                        {settings.domain ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Custom Domain Active
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            Platform Subdomain
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Configure how members and administrators access this cooperative. Assign a white-labeled custom domain (e.g., <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-700">coopname.org</code>) or manage its platform subdomain routing.
                      </p>
                    </div>
                  </div>

                  {/* Domain Form Fields */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Custom Domain Input */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <Globe className="w-4 h-4 text-primary-600" />
                            Custom Domain (White-Label)
                          </label>
                          {settings.domain && (
                            <a
                              href={`https://${settings.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 hover:underline"
                            >
                              <span>Test Domain</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={settings.domain || ''}
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                              handleChange('domain', val);
                            }}
                            placeholder="e.g. portal.mycooperative.org or coopname.com"
                            className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                          />
                          <div className="absolute right-3 top-2.5 text-gray-400">
                            <Globe className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1.5">
                          Enter domain without protocol prefix (<code className="bg-gray-100 px-1 py-0.5 rounded">https://</code>). Leave blank to disable custom domain.
                        </p>
                      </div>

                      {/* Subdomain Input */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <Tag className="w-4 h-4 text-indigo-600" />
                            Platform Subdomain
                          </label>
                          {settings.subdomain && (
                            <span className="text-xs text-emerald-600 font-mono font-medium">
                              https://{settings.subdomain}.imanmcs.com
                            </span>
                          )}
                        </div>
                        <div className="flex">
                          <input
                            type="text"
                            value={settings.subdomain || ''}
                            onChange={(e) => handleChange('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="e.g. keffi-staff"
                            className="w-full pl-3 pr-2 py-2.5 border border-gray-300 rounded-l-xl text-sm font-mono focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none border-r-0"
                          />
                          <div className="bg-gray-100 border border-gray-300 rounded-r-xl px-3 py-2.5 text-gray-600 flex items-center font-mono text-xs font-medium border-l-0 shrink-0">
                            .imanmcs.com
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1.5">
                          Platform subdomain slug routed through multi-tenant reverse proxy.
                        </p>
                      </div>
                    </div>

                    {/* Multi-Tenant Routing Engine Indicator */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <h4 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        Multi-Tenant Routing Engine Status
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider">Tenant Identifier</span>
                          <span className="font-mono font-bold text-gray-900 mt-0.5 block">{tenant?.id || 'default'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider">Active Hostname</span>
                          <span className="font-mono font-bold text-indigo-700 mt-0.5 block truncate">
                            {settings.domain || (settings.subdomain ? `${settings.subdomain}.imanmcs.com` : 'Platform Default')}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider">Routing Mechanism</span>
                          <span className="text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Tenant Context Middleware
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* DNS Configuration Instructions */}
                    <div className="p-5 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          DNS
                        </div>
                        <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                          DNS Configuration Guide (Connect External Domain)
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1">
                          <div className="font-bold text-gray-900 flex items-center justify-between">
                            <span>CNAME Record</span>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">Subdomains</span>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Point your subdomain (e.g., <code className="text-indigo-600">portal</code> or <code className="text-indigo-600">app</code>) to:
                          </p>
                          <div className="font-mono text-xs bg-indigo-50 text-indigo-900 px-2.5 py-1.5 rounded-lg border border-indigo-200 select-all font-semibold">
                            imanmcs-project.vercel.app
                          </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1">
                          <div className="font-bold text-gray-900 flex items-center justify-between">
                            <span>A-Record</span>
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">Apex / Root</span>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Point your apex domain (@) directly to the server IP:
                          </p>
                          <div className="font-mono text-xs bg-indigo-50 text-indigo-900 px-2.5 py-1.5 rounded-lg border border-indigo-200 select-all font-semibold">
                            209.38.106.28
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-indigo-800 bg-white/60 p-2.5 rounded-lg border border-indigo-100 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          Once DNS propagates (usually 5-15 mins), requests arriving from this domain will automatically load this tenant's logo, colors, policies, and landing page.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ADMIN SECURITY & CREDENTIALS */}
              {activeTab === 'admin_security' && tenant && (
                <div className="space-y-6">
                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Key className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900">
                          Admin Security & Password Reset — {tenant.name}
                        </h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-700" />
                          Platform Super Admin Access
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Manage login credentials for this cooperative's primary administrator. You can reset their password to an automatically generated secure key or assign an optional custom password.
                      </p>
                    </div>
                  </div>

                  {/* Tenant Administrator Details Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">
                            {adminInfo?.name || `${tenant.name} Administrator`}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Tenant Administrator Account (Role: {adminInfo?.role || 'admin'})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {adminInfo?.is_default_password ? (
                          <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Default Password Active
                          </span>
                        ) : (
                          <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Account Verified
                          </span>
                        )}
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          Status: {adminInfo?.status || 'active'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
                      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                        <span className="text-gray-500 font-medium block mb-1">Login Username / PSN</span>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-gray-900 text-sm select-all">
                            {adminInfo?.psn || `${tenant.id.toUpperCase()}-ADM-001`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(adminInfo?.psn || `${tenant.id.toUpperCase()}-ADM-001`);
                              toast.success('Login ID copied to clipboard');
                            }}
                            className="p-1 text-gray-400 hover:text-gray-700 rounded transition"
                            title="Copy Login ID"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                        <span className="text-gray-500 font-medium block mb-1">Official Email Address</span>
                        <span className="font-semibold text-gray-900 text-sm truncate block select-all">
                          {adminInfo?.email || 'admin@' + tenant.id.toLowerCase() + '.coop'}
                        </span>
                      </div>

                      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                        <span className="text-gray-500 font-medium block mb-1">Phone Number</span>
                        <span className="font-semibold text-gray-900 text-sm truncate block select-all">
                          {adminInfo?.phone || settings.contact_phone || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reset Password Form Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary-600" />
                        Reset Administrator Password
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Type an optional custom password below, or leave it completely blank to automatically generate a secure randomized password.
                      </p>
                    </div>

                    <div className="max-w-xl space-y-2">
                      <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
                        <span>Custom Password (Optional)</span>
                        <button
                          type="button"
                          onClick={() => setShowCustomPassword(!showCustomPassword)}
                          className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-normal"
                        >
                          {showCustomPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {showCustomPassword ? 'Hide' : 'Show'}
                        </button>
                      </label>
                      <div className="relative">
                        <input
                          type={showCustomPassword ? 'text' : 'password'}
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder="Leave blank to auto-generate a secure password"
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {customPassword.trim().length > 0 ? (
                          <span className={customPassword.trim().length >= 6 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                            {customPassword.trim().length >= 6
                              ? '✓ Custom password meets minimum length requirement (min 6 characters)'
                              : `Must be at least 6 characters (currently ${customPassword.trim().length})`}
                          </span>
                        ) : (
                          'If left empty, a randomized password like Admin@849210 will be automatically generated.'
                        )}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleResetAdminPassword}
                        disabled={resettingPassword || (customPassword.trim().length > 0 && customPassword.trim().length < 6)}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                      >
                        {resettingPassword ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            <span>{customPassword.trim() ? 'Set Custom Password' : 'Reset & Generate Password'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Reset Result Card Banner */}
                  {resetResult && (
                    <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 space-y-3 shadow-md animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>Admin Password Reset Successfully!</span>
                          <span className="text-[11px] font-normal text-emerald-700">({resetResult.timestamp})</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {resetResult.isCustom ? 'Custom Password' : 'Auto-Generated'}
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs text-gray-500 font-medium block">
                            Credentials for {resetResult.name} ({resetResult.psn || resetResult.email}):
                          </span>
                          <span className="font-mono text-lg font-bold text-gray-900 select-all tracking-wide">
                            {resetResult.newPassword}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                            copiedPassword
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
                          }`}
                        >
                          {copiedPassword ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy Password</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-emerald-800">
                        <AlertCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>
                          Please copy and share this password with the tenant administrator. The account has been marked with a default password flag so they will be prompted to update it on login.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: FEES (10 & 11) */}
              {activeTab === 'fees' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 10. Registration Fee */}
                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900">10. Registration Fee</h4>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded-full">Onboarding</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fee Amount ({settings.currency_symbol})</label>
                        <input
                          type="number"
                          min="0"
                          value={settings.registration_fee}
                          onChange={(e) => handleChange('registration_fee', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold bg-white"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-600">Auto-deduct on first deposit</span>
                        <input
                          type="checkbox"
                          checked={settings.auto_deduct_registration_fee}
                          onChange={(e) => handleChange('auto_deduct_registration_fee', e.target.checked)}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                      </div>
                    </div>

                    {/* 11. Monthly Administrative Fee */}
                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900">11. Monthly Administrative Fee</h4>
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 font-semibold rounded-full">Monthly</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fee Amount ({settings.currency_symbol})</label>
                        <input
                          type="number"
                          min="0"
                          value={settings.monthly_admin_fee}
                          onChange={(e) => handleChange('monthly_admin_fee', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold bg-white"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-600">Auto-deduct monthly</span>
                        <input
                          type="checkbox"
                          checked={settings.auto_deduct_monthly_admin_fee}
                          onChange={(e) => handleChange('auto_deduct_monthly_admin_fee', e.target.checked)}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTRIBUTION RULES (6) */}
              {activeTab === 'contributions' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800">6. Contribution Rules</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Monthly Savings ({settings.currency_symbol})</label>
                      <input
                        type="number"
                        min="0"
                        value={settings.minimum_savings}
                        onChange={(e) => handleChange('minimum_savings', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Target Savings ({settings.currency_symbol})</label>
                      <input
                        type="number"
                        min="0"
                        value={settings.minimum_target_savings}
                        onChange={(e) => handleChange('minimum_target_savings', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Target Savings Lock Period (Months)</label>
                      <input
                        type="number"
                        min="1"
                        value={settings.target_savings_min_period}
                        onChange={(e) => handleChange('target_savings_min_period', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Withdrawal Lock Period (Months)</label>
                      <input
                        type="number"
                        min="0"
                        value={settings.savings_withdrawal_lock_months}
                        onChange={(e) => handleChange('savings_withdrawal_lock_months', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Savings Withdrawal Limit (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={settings.max_savings_withdrawal_percent}
                        onChange={(e) => handleChange('max_savings_withdrawal_percent', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs font-medium text-gray-800">Allow Voluntary Additional Deposits</span>
                      <input
                        type="checkbox"
                        checked={settings.allow_voluntary_savings}
                        onChange={(e) => handleChange('allow_voluntary_savings', e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: LOAN RULES (7) */}
              {activeTab === 'loans' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800">7. Loan Rules & Credit Policies</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Overall Loan Amount ({settings.currency_symbol})</label>
                      <input
                        type="number"
                        min="0"
                        value={settings.max_loan_amount}
                        onChange={(e) => handleChange('max_loan_amount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Cash Loan ({settings.currency_symbol})</label>
                      <input
                        type="number"
                        min="0"
                        value={settings.max_cash_loan}
                        onChange={(e) => handleChange('max_cash_loan', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Savings/Shares Loan Multiplier (e.g. 3x)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        step="0.5"
                        value={settings.investment_loan_multiplier}
                        onChange={(e) => handleChange('investment_loan_multiplier', parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Default Repayment Period (Months)</label>
                      <input
                        type="number"
                        min="1"
                        value={settings.default_repayment_period}
                        onChange={(e) => handleChange('default_repayment_period', parseInt(e.target.value) || 12)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Min Membership Wait Period (Months)</label>
                      <input
                        type="number"
                        min="0"
                        value={settings.min_membership_months_for_loan}
                        onChange={(e) => handleChange('min_membership_months_for_loan', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Loan Markup / Interest Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.loan_interest_rate}
                        onChange={(e) => handleChange('loan_interest_rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Late Payment Penalty (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.late_payment_fee}
                        onChange={(e) => handleChange('late_payment_fee', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Active Loans Per Member</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={settings.max_active_loans_per_member}
                        onChange={(e) => handleChange('max_active_loans_per_member', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <span className="text-xs font-semibold text-gray-800">Require Guarantors</span>
                        <p className="text-[10px] text-gray-500">Min {settings.min_guarantors_count} guarantors required</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={settings.min_guarantors_count}
                          onChange={(e) => handleChange('min_guarantors_count', parseInt(e.target.value) || 1)}
                          className="w-12 px-1 py-1 text-xs border border-gray-300 rounded text-center"
                        />
                        <input
                          type="checkbox"
                          checked={settings.require_guarantors}
                          onChange={(e) => handleChange('require_guarantors', e.target.checked)}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: INVESTMENT RULES (8) */}
              {activeTab === 'investments' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800">8. Investment Rules</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Investment Unit ({settings.currency_symbol})</label>
                      <input
                        type="number"
                        min="0"
                        value={settings.minimum_investment}
                        onChange={(e) => handleChange('minimum_investment', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Lock Period (Months)</label>
                      <input
                        type="number"
                        min="1"
                        value={settings.investment_lock_period_months}
                        onChange={(e) => handleChange('investment_lock_period_months', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Target Annualized ROI (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={settings.expected_roi_percent}
                        onChange={(e) => handleChange('expected_roi_percent', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Early Liquidation Penalty (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.early_termination_penalty_percent}
                        onChange={(e) => handleChange('early_termination_penalty_percent', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs font-semibold text-gray-800">Allow Premature Early Liquidation</span>
                      <input
                        type="checkbox"
                        checked={settings.allow_early_liquidation}
                        onChange={(e) => handleChange('allow_early_liquidation', e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: PROFIT DISTRIBUTION (9) */}
              {activeTab === 'profit' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800">9. Profit Distribution Rules</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${Math.abs(profitTotal - 100) < 0.1 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        Total: {profitTotal.toFixed(1)}%
                      </span>
                      {Math.abs(profitTotal - 100) >= 0.1 && (
                        <button
                          type="button"
                          onClick={autoBalanceDividend}
                          className="text-[10px] bg-amber-200 hover:bg-amber-300 px-2 py-0.5 rounded font-bold"
                        >
                          Auto Balance
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Distribution Frequency</label>
                      <select
                        value={settings.profit_sharing_frequency}
                        onChange={(e) => handleChange('profit_sharing_frequency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="bi-annually">Bi-Annually (Every 6 Months)</option>
                        <option value="annually">Annually</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Reserve Fund (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.reserve_fund_percentage}
                        onChange={(e) => handleChange('reserve_fund_percentage', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Education Fund (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.education_fund_percentage}
                        onChange={(e) => handleChange('education_fund_percentage', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Committee Bonus (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.committee_bonus_percentage}
                        onChange={(e) => handleChange('committee_bonus_percentage', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Bad Debt Reserve (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.bad_debt_reserve_percentage}
                        onChange={(e) => handleChange('bad_debt_reserve_percentage', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">General Operations Reserve (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.general_reserve_percentage}
                        onChange={(e) => handleChange('general_reserve_percentage', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 mb-1">Member Dividend Pool (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.member_dividend_percentage}
                        onChange={(e) => handleChange('member_dividend_percentage', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border-2 border-emerald-300 rounded-lg text-sm font-bold bg-emerald-50/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: SUBSCRIPTION & PLAN (12 & 13) */}
              {activeTab === 'subscription' && (
                <div className="space-y-6">
                  {/* Executive Header Banner */}
                  <div className="p-5 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-primary-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-yellow-300">
                          Super Admin License & Billing Control
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          settings.subscription_payment_status === 'paid' ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-300 text-amber-950'
                        }`}>
                          {settings.subscription_payment_status === 'paid' ? 'Payment Settled' : 'Payment Due'}
                        </span>
                      </div>
                      <h4 className="text-xl font-bold mt-1.5 flex items-center gap-2">
                        <span>{settings.subscription_plan || 'Enterprise Plan'}</span>
                        <span className="text-sm font-normal text-purple-200">
                          ({settings.subscription_billing_cycle === 'annual' ? 'Billed Annually' : 'Billed Monthly'})
                        </span>
                      </h4>
                      <p className="text-xs text-purple-100 mt-1">
                        Amount Payable: <strong className="text-white text-sm font-bold">{settings.currency_symbol || '₦'}{(Number(settings.subscription_amount_payable || 0)).toLocaleString()}</strong> • Status: <span className="font-bold uppercase tracking-wider">{settings.subscription_status}</span>
                      </p>
                    </div>
                    {daysLeft !== null && (
                      <div className="text-center px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 min-w-[120px]">
                        <div className="text-2xl font-black">{daysLeft > 0 ? daysLeft : 0}</div>
                        <div className="text-[10px] uppercase tracking-wider text-purple-200 font-semibold">Days Until Expiry</div>
                      </div>
                    )}
                  </div>

                  {/* 1. Quick Plan Tier Picker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Select Cooperative Plan Tier
                      </label>
                      <span className="text-[11px] text-gray-500">Auto-sets pricing & member limits, fully editable below</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      {[
                        {
                          id: 'starter',
                          name: 'Starter Plan',
                          rate: 200,
                          bracket: '1 UP TO 500 MEMBERS',
                          members: 500,
                          badge: 'Starter',
                          highlight: false
                        },
                        {
                          id: 'growth',
                          name: 'Growth Plan',
                          rate: 150,
                          bracket: '501 Up to 1,000 members',
                          members: 1000,
                          badge: 'Popular',
                          highlight: true
                        },
                        {
                          id: 'pro',
                          name: 'PRO Plan',
                          rate: 100,
                          bracket: '1001 Up to 1,500 members',
                          members: 1500,
                          badge: 'High Volume',
                          highlight: false
                        },
                        {
                          id: 'custom',
                          name: 'Custom Plan',
                          rate: null,
                          bracket: 'Unlimited / Negotiated',
                          members: 0,
                          badge: 'Bespoke',
                          highlight: false
                        },
                      ].map((tier) => {
                        const isCurrent = settings.subscription_plan?.toLowerCase().includes(tier.id) ||
                          (tier.id === 'custom' && !['starter', 'growth', 'pro'].some(t => settings.subscription_plan?.toLowerCase().includes(t)));
                        return (
                          <div
                            key={tier.id}
                            onClick={() => {
                              handleChange('subscription_plan', tier.name);
                              handleChange('subscription_rate_per_member', tier.rate ?? 0);
                              handleChange('subscription_member_bracket', tier.bracket);
                              if (tier.members > 0) {
                                handleChange('subscription_member_limit', tier.members);
                              }
                              if (tier.rate) {
                                const activeLimit = settings.subscription_member_limit || tier.members;
                                handleChange('subscription_amount_payable', activeLimit * tier.rate);
                              }
                            }}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                              isCurrent
                                ? 'border-primary-600 bg-primary-50/60 ring-2 ring-primary-200 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                tier.badge === 'Popular'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : tier.badge === 'High Volume'
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : tier.badge === 'Bespoke'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {tier.badge}
                              </span>
                              {isCurrent && <CheckCircle2 className="w-4 h-4 text-primary-600" />}
                            </div>
                            <div className="font-bold text-sm text-gray-900">{tier.name}</div>
                            <div className="text-xs text-primary-700 font-black mt-1">
                              {tier.rate ? `${settings.currency_symbol || '₦'}${tier.rate} / PER MEMBER` : 'Custom Rate'}
                            </div>
                            <div className="text-[10px] text-gray-600 font-semibold mt-1">
                              {tier.bracket}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Billing Cycle & Amount Payable Configuration */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                          Billing Cycle, Rate & Amount Payable (Super Admin Override)
                        </h4>
                        <p className="text-[11px] text-gray-500">Super Admin can set per-member rate, member bracket, and final negotiated amount payable</p>
                      </div>
                      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-white shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            handleChange('subscription_billing_cycle', 'monthly');
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                            settings.subscription_billing_cycle === 'monthly'
                              ? 'bg-primary-600 text-white shadow-xs'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleChange('subscription_billing_cycle', 'annual');
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                            settings.subscription_billing_cycle === 'annual'
                              ? 'bg-primary-600 text-white shadow-xs'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Annual (12 Mo)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Rate Per Member */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Rate Per Member ({settings.currency_symbol || '₦'})
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={settings.subscription_rate_per_member ?? 150}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value) || 0;
                              handleChange('subscription_rate_per_member', rate);
                              if (settings.subscription_member_limit) {
                                handleChange('subscription_amount_payable', settings.subscription_member_limit * rate);
                              }
                            }}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm font-bold bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-primary-600 font-bold text-sm">
                            {settings.currency_symbol || '₦'}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500">e.g. ₦200, ₦150, ₦100 or negotiated</span>
                      </div>

                      {/* Member Bracket */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Member Bracket
                        </label>
                        <input
                          type="text"
                          value={settings.subscription_member_bracket || '501 Up to 1,000 members'}
                          onChange={(e) => handleChange('subscription_member_bracket', e.target.value)}
                          placeholder="e.g. 501 Up to 1,000 members"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold text-gray-900"
                        />
                        <span className="text-[10px] text-gray-500">Tier capacity specification</span>
                      </div>

                      {/* Amount Payable */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-gray-800">
                            Amount Payable ({settings.currency_symbol || '₦'}) <span className="text-red-500">*</span>
                          </label>
                          {settings.subscription_rate_per_member && settings.subscription_member_limit && (
                            <button
                              type="button"
                              onClick={() => {
                                const calculated = (settings.subscription_member_limit || 0) * (settings.subscription_rate_per_member || 0);
                                handleChange('subscription_amount_payable', calculated);
                              }}
                              className="text-[10px] text-primary-600 hover:text-primary-800 font-bold"
                            >
                              Auto-Calculate
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={settings.subscription_amount_payable ?? 150000}
                            onChange={(e) => handleChange('subscription_amount_payable', parseFloat(e.target.value) || 0)}
                            className="w-full pl-8 pr-3 py-2 border-2 border-primary-300 rounded-lg text-sm font-bold bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-primary-600 font-bold text-sm">
                            {settings.currency_symbol || '₦'}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500">Total payable billed to cooperative</span>
                      </div>

                      {/* Payment Status */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Payment Settlement Status
                        </label>
                        <select
                          value={settings.subscription_payment_status || 'paid'}
                          onChange={(e) => handleChange('subscription_payment_status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium"
                        >
                          <option value="paid">Paid (In Good Standing)</option>
                          <option value="pending">Pending Payment (Invoice Sent)</option>
                          <option value="overdue">Overdue / Past Due</option>
                          <option value="waived">Waived / Complimentary</option>
                        </select>
                        <span className="text-[10px] text-gray-500">Cooperative invoice settlement standing</span>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Payment Settlement Method
                        </label>
                        <select
                          value={settings.subscription_payment_method || 'Bank Transfer'}
                          onChange={(e) => handleChange('subscription_payment_method', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium"
                        >
                          <option value="Bank Transfer">Bank Transfer / Wire</option>
                          <option value="Direct Debit">Direct Debit</option>
                          <option value="Card">Debit/Credit Card Online</option>
                          <option value="Cheque">Bankers Cheque</option>
                          <option value="Offline">Offline / Cash Voucher</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 3. Detailed Licensing, Dates & Limits */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Status */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Platform Subscription Status
                      </label>
                      <select
                        value={settings.subscription_status}
                        onChange={(e) => handleChange('subscription_status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="active">Active (Fully Licensed)</option>
                        <option value="trial">Trial Period</option>
                        <option value="past_due">Past Due (Grace Period)</option>
                        <option value="suspended">Suspended</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Subscription Expiry / Renewal Date
                      </label>
                      <input
                        type="date"
                        value={settings.subscription_expiry ? settings.subscription_expiry.split('T')[0] : '2027-12-31'}
                        onChange={(e) => handleChange('subscription_expiry', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* Next Billing Date */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Next Invoice Date
                      </label>
                      <input
                        type="date"
                        value={settings.subscription_next_billing_date ? settings.subscription_next_billing_date.split('T')[0] : '2027-12-31'}
                        onChange={(e) => handleChange('subscription_next_billing_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* Member Limit */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Member Capacity Limit
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={settings.subscription_member_limit ?? 10000}
                        onChange={(e) => handleChange('subscription_member_limit', parseInt(e.target.value) || 0)}
                        placeholder="e.g. 10000 (0 for unlimited)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <span className="text-[10px] text-gray-500">Maximum registered members allowed</span>
                    </div>

                    {/* Invoice Reference */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Invoice Reference Code
                      </label>
                      <input
                        type="text"
                        value={settings.subscription_invoice_reference || `INV-2025-${(tenant?.id || 'COOP').toUpperCase()}-001`}
                        onChange={(e) => handleChange('subscription_invoice_reference', e.target.value)}
                        placeholder="e.g. INV-2025-IMAN-001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      />
                      <span className="text-[10px] text-gray-500">Tracked on tenant receipts & billing ledger</span>
                    </div>

                    {/* License Certificate Key */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        License Certificate Key
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={`COOP-LIC-${(tenant?.id || 'GLOBAL').toUpperCase()}-ENT-9941`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500 font-mono"
                      />
                      <span className="text-[10px] text-gray-500">Cryptographically signed key</span>
                    </div>
                  </div>

                  {/* Super Admin Billing Notes */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Billing Remarks & Notes for Cooperative (Visible to Tenant)
                    </label>
                    <textarea
                      rows={2}
                      value={settings.subscription_billing_notes || ''}
                      onChange={(e) => handleChange('subscription_billing_notes', e.target.value)}
                      placeholder="e.g. Enterprise package approved with custom 10% multi-year discount. SLA includes dedicated account manager."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>

                  {/* 4. Global Platform Plan Prices & Official Bank Details Collapsible */}
                  <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4">
                    <button
                      type="button"
                      onClick={() => setShowPricingConfig(!showPricingConfig)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-indigo-700" />
                        <span className="text-xs font-bold text-indigo-900">
                          Configure Platform Tier Standard Prices & Bank Settlement Details
                        </span>
                      </div>
                      <span className="text-xs text-indigo-600 font-semibold">
                        {showPricingConfig ? '▲ Hide Platform Config' : '▼ Expand Platform Config'}
                      </span>
                    </button>

                    {showPricingConfig && (
                      <div className="mt-4 pt-4 border-t border-indigo-100 space-y-4">
                        <p className="text-xs text-gray-600">
                          These standard prices populate new cooperative accounts and determine default pricing for all platform tiers.
                        </p>

                        {/* Platform Standard Per-Member Tiers */}
                        <div className="bg-white p-3.5 rounded-lg border border-indigo-200 space-y-3">
                          <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-indigo-600" />
                            Platform Standard Tier Pricing & Member Brackets (Default Platform Catalog)
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                              <span className="text-[10px] font-bold text-gray-600 uppercase">Starter Plan</span>
                              <div className="text-sm font-black text-gray-900 mt-0.5">₦200 <span className="text-[10px] font-normal text-gray-500">/ member</span></div>
                              <div className="text-[10px] text-gray-500 mt-0.5">1 UP TO 500 MEMBERS</div>
                            </div>
                            <div className="p-2.5 bg-amber-50/70 rounded-lg border border-amber-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-amber-900 uppercase">Growth Plan</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded">Popular</span>
                              </div>
                              <div className="text-sm font-black text-amber-950 mt-0.5">₦150 <span className="text-[10px] font-normal text-amber-700">/ member</span></div>
                              <div className="text-[10px] text-amber-800 mt-0.5">501 Up to 1,000 members</div>
                            </div>
                            <div className="p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-indigo-900 uppercase">PRO Plan</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-200 text-indigo-900 rounded">High Volume</span>
                              </div>
                              <div className="text-sm font-black text-indigo-950 mt-0.5">₦100 <span className="text-[10px] font-normal text-indigo-700">/ member</span></div>
                              <div className="text-[10px] text-indigo-800 mt-0.5">1001 Up to 1,500 members</div>
                            </div>
                            <div className="p-2.5 bg-purple-50/70 rounded-lg border border-purple-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-purple-900 uppercase">Custom Plan</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-200 text-purple-900 rounded">Bespoke</span>
                              </div>
                              <div className="text-sm font-black text-purple-950 mt-0.5">Custom Rate</div>
                              <div className="text-[10px] text-purple-800 mt-0.5">Unlimited / Negotiated</div>
                            </div>
                          </div>
                        </div>

                        {/* Bank Details Config */}
                        <div className="bg-white p-3.5 rounded-lg border border-indigo-200 space-y-3">
                          <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                            Official Platform Bank Settlement Account (Displayed on all Tenant Invoices)
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Bank Name</label>
                              <input
                                type="text"
                                value={settings.subscription_payment_instructions?.bank_name || 'First Bank of Nigeria'}
                                onChange={(e) => handleChange('subscription_payment_instructions', {
                                  ...(settings.subscription_payment_instructions || {}),
                                  bank_name: e.target.value
                                })}
                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Account Number</label>
                              <input
                                type="text"
                                value={settings.subscription_payment_instructions?.account_number || '3128945012'}
                                onChange={(e) => handleChange('subscription_payment_instructions', {
                                  ...(settings.subscription_payment_instructions || {}),
                                  account_number: e.target.value
                                })}
                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Account Name</label>
                              <input
                                type="text"
                                value={settings.subscription_payment_instructions?.account_name || 'Cooperative Core Technologies Ltd'}
                                onChange={(e) => handleChange('subscription_payment_instructions', {
                                  ...(settings.subscription_payment_instructions || {}),
                                  account_name: e.target.value
                                })}
                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Billing Support Email</label>
                              <input
                                type="text"
                                value={settings.subscription_payment_instructions?.support_email || 'billing@platform.cooperative.org'}
                                onChange={(e) => handleChange('subscription_payment_instructions', {
                                  ...(settings.subscription_payment_instructions || {}),
                                  support_email: e.target.value
                                })}
                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Billing Support Phone</label>
                              <input
                                type="text"
                                value={settings.subscription_payment_instructions?.support_phone || '+234 800 123 4567'}
                                onChange={(e) => handleChange('subscription_payment_instructions', {
                                  ...(settings.subscription_payment_instructions || {}),
                                  support_phone: e.target.value
                                })}
                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 8: ENABLED MODULES (14) */}
              {activeTab === 'modules' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">14. Provisioned Modules (Super Admin)</h3>
                      <p className="text-xs text-gray-500">Enable or disable individual modules for this tenant</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'loans', title: 'Loans Module', desc: 'Loan applications and repayment schedules' },
                      { key: 'contributions', title: 'Contributions Module', desc: 'Savings plans and monthly deposits' },
                      { key: 'investments', title: 'Investments Module', desc: 'Fixed-yield portfolios and yields' },
                      { key: 'layyah', title: 'Layyah Livestock', desc: 'Sacrificial animal booking and shares' },
                      { key: 'expenses', title: 'Expense Tracker', desc: 'Operational expenditures and vendor invoices' },
                      { key: 'profit_sharing', title: 'Profit Sharing Engine', desc: 'Automated dividend calculations' },
                      { key: 'withdrawals', title: 'Member Withdrawals', desc: 'Self-service withdrawal requests' },
                      { key: 'receipt_designer', title: 'Receipt Designer', desc: 'Printable receipts and thermal slips' },
                      { key: 'document_designer', title: 'Document Designer', desc: 'Automated loan contracts and agreements' },
                      { key: 'member_portal', title: 'Member Portal', desc: 'Dedicated member self-service portal' }
                    ].map(mod => {
                      const isEnabled = !!settings.enabled_modules[mod.key as keyof typeof settings.enabled_modules];
                      return (
                        <div
                          key={mod.key}
                          onClick={() => handleModuleToggle(mod.key)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            isEnabled ? 'bg-primary-50/50 border-primary-200' : 'bg-gray-50 border-gray-200 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-gray-900">{mod.title}</div>
                            <div className="text-[10px] text-gray-500">{mod.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleModuleToggle(mod.key)}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 9: AI SETTINGS (15) */}
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">15. Master AI Automation Switch</h4>
                      <p className="text-xs text-gray-500">Enable intelligent features across this cooperative</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.ai_settings.enabled}
                      onChange={(e) => handleAISettingChange('enabled', e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">AI Provider</label>
                      <select
                        value={settings.ai_settings.provider}
                        onChange={(e) => handleAISettingChange('provider', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI (GPT-4o)</option>
                        <option value="anthropic">Anthropic (Claude 3.5)</option>
                        <option value="custom">Custom / Local LLM</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Model Name</label>
                      <input
                        type="text"
                        value={settings.ai_settings.model}
                        onChange={(e) => handleAISettingChange('model', e.target.value)}
                        placeholder="e.g. gemini-2.5-flash"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                        <span>API Key (Super Admin Provisioned)</span>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                        >
                          {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {showApiKey ? 'Hide' : 'Show'}
                        </button>
                      </label>
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={settings.ai_settings.api_key}
                        onChange={(e) => handleAISettingChange('api_key', e.target.value)}
                        placeholder="Enter API Key (sk-... or AIzaSy...)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 grid grid-cols-2 gap-3 pt-2">
                      {[
                        { key: 'loan_risk_scoring', title: 'AI Loan Risk Scoring' },
                        { key: 'financial_advisor', title: 'Member Financial Advisor' },
                        { key: 'document_ocr', title: 'Smart Document OCR' },
                        { key: 'auto_reporting', title: 'Automated Audit Reports' }
                      ].map(feat => (
                        <div key={feat.key} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-800">{feat.title}</span>
                          <input
                            type="checkbox"
                            checked={!!settings.ai_settings[feat.key as keyof typeof settings.ai_settings]}
                            onChange={(e) => handleAISettingChange(feat.key, e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 10: AGREEMENTS */}
              {activeTab === 'agreements' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Agent Agreement Template (HTML / Text)</label>
                    <textarea
                      rows={5}
                      value={settings.agent_agreement_template || ''}
                      onChange={(e) => handleChange('agent_agreement_template', e.target.value)}
                      placeholder="<h2>Agent Agreement</h2>..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Murabaha Contract Template (HTML / Text)</label>
                    <textarea
                      rows={5}
                      value={settings.murabaha_contract_template || ''}
                      onChange={(e) => handleChange('murabaha_contract_template', e.target.value)}
                      placeholder="<h2>Murabaha Contract</h2>..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving Settings...' : 'Save Cooperative Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminCooperativeSettingsModal;
