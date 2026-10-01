import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Save, RefreshCw, DollarSign,
  Percent, CreditCard, Loader, FileText,
  Building2, Image as ImageIcon, MapPin, Mail, Phone,
  Globe, Shield, Calendar, Layers, Bot, Upload,
  CheckCircle2, AlertCircle, Eye, EyeOff, Sparkles,
  TrendingUp, Briefcase, Key, Copy, Check, Users,
  ArrowUpRight, Clock, HelpCircle, Landmark, Receipt, Tag,
  Download, Trash2, BookOpen, FileCheck
} from 'lucide-react';
import { Settings as SystemSettings, EnabledModules, AISettings, BylawInfo } from '../services/settingsService';
import settingsService from '../services/settingsService';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bylawFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [bylawInfo, setBylawInfo] = useState<BylawInfo | null>(null);
  const [uploadingBylaw, setUploadingBylaw] = useState(false);
  const [deletingBylaw, setDeletingBylaw] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<string>('Growth Plan');
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [billingComparisonCycle, setBillingComparisonCycle] = useState<'monthly' | 'annual'>('annual');

  const defaultEnabledModules: EnabledModules = {
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
  };

  const defaultAISettings: AISettings = {
    enabled: true,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    api_key: '',
    loan_risk_scoring: true,
    financial_advisor: true,
    document_ocr: true,
    auto_reporting: true
  };

  const [settings, setSettings] = useState<SystemSettings>({
    // 1. Name
    cooperative_name: 'IMAN Multi-Purpose Cooperative Society',
    registration_number: 'IMAN/COOP/2024/001',

    // 2. Logo
    cooperative_logo: '/logo.png',

    // 3. Address
    address: 'Gombe State, Nigeria',

    // 4. Contact details
    contact_email: 'info@imancooperative.org',
    contact_phone: '+234-800-000-0000',
    contact_website: 'https://imancooperative.org',
    support_phone: '+234-800-111-2222',

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
          '₦150 / per member billing (25% Savings)',
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
          '₦100 / per member billing (50% Volume Discount)',
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
      payment_reference_format: 'COOP-IMAN-[MONTH_YEAR]',
      support_email: 'billing@platform.cooperative.org',
      support_phone: '+234 800 123 4567'
    },

    // 14. Enabled modules
    enabled_modules: defaultEnabledModules,

    // 15. AI settings
    ai_settings: defaultAISettings,

    // Notifications & Templates
    email_notifications: true,
    sms_notifications: false,
    reminder_days: 7,
    agent_agreement_template: '',
    murabaha_contract_template: '',
  });

  const [theme, setTheme] = useState({
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
    accentColor: '#ff6b00',
    customLogoUrl: '/logo.png',
    landingPageHeroTitle: 'Welcome to Your Cooperative',
    landingPageHeroSubtitle: 'Manage your finances, loans, and contributions in one place',
    faviconUrl: '/favicon.ico'
  });
  const [originalTheme, setOriginalTheme] = useState({ ...theme });

  const [customFields, setCustomFields] = useState<any[]>([]);
  const [newField, setNewField] = useState({ entity_type: 'User', field_name: '', field_key: '', field_type: 'text', is_required: false });

  const [originalSettings, setOriginalSettings] = useState<SystemSettings>({} as SystemSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const loadedSettings = await settingsService.getSettings();

      const merged: SystemSettings = {
        ...settings,
        ...loadedSettings,
        enabled_modules: {
          ...defaultEnabledModules,
          ...(loadedSettings.enabled_modules || {})
        },
        ai_settings: {
          ...defaultAISettings,
          ...(loadedSettings.ai_settings || {})
        }
      };

      setSettings(merged);
      setOriginalSettings(JSON.parse(JSON.stringify(merged)));

      // Load Theme from public endpoint
      try {
        const themeResponse = await api.get('/tenant/config');
        if (themeResponse.data?.data?.theme) {
          setTheme(themeResponse.data.data.theme);
          setOriginalTheme(themeResponse.data.data.theme);
        }
      } catch (err) {
        console.warn('Could not load tenant theme:', err);
      }

      // Load Custom Fields
      try {
        const cfResponse = await api.get('/custom-fields/User');
        if (cfResponse.data?.success) {
          setCustomFields(cfResponse.data.data || []);
        }
      } catch (err) {
        console.warn('Could not load custom fields:', err);
      }

      // Load Cooperative Bylaw
      try {
        const bylawRes = await settingsService.getBylaw();
        if (bylawRes?.bylaw) {
          setBylawInfo(bylawRes.bylaw);
        } else {
          setBylawInfo(null);
        }
      } catch (err) {
        console.warn('Could not load bylaw:', err);
      }

      setHasChanges(false);
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      toast.error(error?.message || 'Failed to load settings. Using defaults.');
      setOriginalSettings({ ...settings });
    } finally {
      setLoading(false);
    }
  };

  const handleBylawUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Only PDF documents (.pdf) are allowed as cooperative bylaws.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds the 25 MB limit.');
      return;
    }

    try {
      setUploadingBylaw(true);
      const res = await settingsService.uploadBylaw(file);
      if (res.success && res.bylaw) {
        setBylawInfo(res.bylaw);
        toast.success('Cooperative bylaw uploaded successfully! Members can now download it.');
      } else {
        toast.error(res.message || 'Failed to upload bylaw');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error uploading bylaw');
    } finally {
      setUploadingBylaw(false);
      if (bylawFileInputRef.current) bylawFileInputRef.current.value = '';
    }
  };

  const handleDeleteBylaw = async () => {
    if (!confirm('Are you sure you want to delete the cooperative bylaw? Members will no longer be able to download it.')) {
      return;
    }

    try {
      setDeletingBylaw(true);
      const res = await settingsService.deleteBylaw();
      if (res.success) {
        setBylawInfo(null);
        toast.success('Cooperative bylaw removed successfully.');
      } else {
        toast.error(res.message || 'Failed to remove bylaw');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting bylaw');
    } finally {
      setDeletingBylaw(false);
    }
  };

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleModuleToggle = (moduleKey: keyof EnabledModules) => {
    setSettings(prev => ({
      ...prev,
      enabled_modules: {
        ...(prev.enabled_modules || defaultEnabledModules),
        [moduleKey]: !prev.enabled_modules?.[moduleKey]
      }
    }));
  };

  const handleAISettingChange = (key: keyof AISettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      ai_settings: {
        ...(prev.ai_settings || defaultAISettings),
        [key]: value
      }
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo file size must be less than 5MB');
      return;
    }

    try {
      setUploadingLogo(true);
      const res = await settingsService.uploadLogo(file);
      if (res.success && res.logoUrl) {
        handleSettingChange('cooperative_logo', res.logoUrl);
        setTheme(prev => ({ ...prev, customLogoUrl: res.logoUrl }));
        toast.success('Logo uploaded successfully!');
      }
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast.error(error?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Check dirty state
  useEffect(() => {
    if (Object.keys(originalSettings).length > 0) {
      const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      const themeChanged = JSON.stringify(theme) !== JSON.stringify(originalTheme);
      setHasChanges(settingsChanged || themeChanged);
    }
  }, [settings, originalSettings, theme, originalTheme]);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Save cooperative settings
      const result = await settingsService.updateSettings(settings);
      if (!result.success) throw new Error(result.message);

      // Save theme if changed
      const themeChanges = JSON.stringify(theme) !== JSON.stringify(originalTheme);
      if (themeChanges) {
        await api.post('/tenant/theme', { theme });
        setOriginalTheme({ ...theme });
      }

      toast.success('Cooperative settings saved successfully!');
      setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      setHasChanges(false);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = confirm('Are you sure you want to discard all unsaved changes and reload settings?');
    if (!confirmed) return;

    try {
      await loadSettings();
      toast('Settings reloaded');
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error(error?.message || 'Failed to reload settings');
    }
  };

  // Helper for currency preset
  const handleCurrencyPreset = (code: string, symbol: string, name: string) => {
    setSettings(prev => ({
      ...prev,
      currency_code: code,
      currency_symbol: symbol,
      currency_name: name
    }));
  };

  // Calculate profit sharing total
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
    handleSettingChange('member_dividend_percentage', remainder);
    toast.success(`Member dividend balanced to ${remainder}%`);
  };

  // Calculate subscription remaining days
  const getSubscriptionDaysRemaining = () => {
    if (!settings.subscription_expiry) return null;
    const expiry = new Date(settings.subscription_expiry).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const subscriptionDays = getSubscriptionDaysRemaining();

  const handleAddCustomField = async () => {
    if (!newField.field_name || !newField.field_key) {
      toast.error('Field name and key are required');
      return;
    }
    try {
      const res = await api.post('/custom-fields', newField);
      if (res.data.success) {
        toast.success('Custom field added!');
        setCustomFields([...customFields, res.data.data]);
        setNewField({ entity_type: 'User', field_name: '', field_key: '', field_type: 'text', is_required: false });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add custom field');
    }
  };

  const handleDeleteCustomField = async (id: number) => {
    if (!confirm('Are you sure you want to delete this custom field? Existing data will not be shown in forms anymore.')) return;
    try {
      const res = await api.delete(`/custom-fields/${id}`);
      if (res.data.success) {
        toast.success('Custom field deleted');
        setCustomFields(customFields.filter(f => f.id !== id));
      }
    } catch (error) {
      toast.error('Failed to delete custom field');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-700 font-medium">Loading cooperative settings...</span>
      </div>
    );
  }

  const tabs = [
    { id: 'general', name: 'General & Identity', icon: Building2, count: '1-5' },
    { id: 'fees', name: 'Fees', icon: CreditCard, count: '10-11' },
    { id: 'contributions', name: 'Contribution Rules', icon: DollarSign, count: '6' },
    { id: 'loans', name: 'Loan Rules', icon: CreditCard, count: '7' },
    { id: 'investments', name: 'Investment Rules', icon: TrendingUp, count: '8' },
    { id: 'profit', name: 'Profit Distribution', icon: Percent, count: '9' },
    { id: 'subscription', name: 'Subscription & Plan', icon: Shield, count: '12-13' },
    { id: 'modules', name: 'Enabled Modules', icon: Layers, count: '14' },
    { id: 'ai', name: 'AI Settings', icon: Bot, count: '15' },
    { id: 'agreements', name: 'Agreements', icon: FileText },
    { id: 'theme', name: 'Theme', icon: Sparkles },
    { id: 'custom_fields', name: 'Custom Fields', icon: Briefcase }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Super Admin / Tenant Admin Role Badge */}
      {isSuperAdmin ? (
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-primary-700 text-white rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-purple-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Super Admin Mode</span>
                <span className="text-[11px] bg-yellow-400 text-purple-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Full Platform Authority</span>
              </div>
              <p className="text-xs text-purple-100 mt-0.5">
                You have global privileges to modify all 15 cooperative policies, subscription licensing, and module provisioning for this tenant.
              </p>
            </div>
          </div>
          <a
            href="/platform/dashboard"
            className="text-xs bg-white text-purple-800 hover:bg-purple-50 font-bold px-3.5 py-2 rounded-lg transition inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-sm"
          >
            <span>Platform Dashboard</span>
            <span>&rarr;</span>
          </a>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Tenant Cooperative Administration:</strong> You can manage branding, financial policies, fees, and rules. Subscription licensing and enabled modules are provisioned centrally by the Super Admin.
            </span>
          </div>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cooperative Settings</h1>
              <p className="text-sm text-gray-500">
                Manage organization identity, financial rules, subscription, features, and AI configuration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex items-center px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm ${
              hasChanges && !saving
                ? 'bg-primary-600 text-white hover:bg-primary-700 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <nav className="flex px-4 py-2 gap-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">

        {/* 1. GENERAL & IDENTITY (Name, Logo, Address, Contact details, Currency) */}
        {activeTab === 'general' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-600" />
                Cooperative Identity & Contact Details
              </h2>
              <p className="text-sm text-gray-500">Official name, branding logo, physical location, and contact information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Name */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-800">
                  Cooperative Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.cooperative_name || ''}
                  onChange={(e) => handleSettingChange('cooperative_name', e.target.value)}
                  placeholder="e.g. IMAN Multi-Purpose Cooperative Society"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                <span className="text-xs text-gray-400">Displayed on member receipts, contracts, certificates, and headers.</span>
              </div>

              {/* Registration Number */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={settings.registration_number || ''}
                  onChange={(e) => handleSettingChange('registration_number', e.target.value)}
                  placeholder="e.g. IMAN/COOP/2024/001"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              {/* 2. Logo */}
              <div className="space-y-1.5 md:col-span-2 p-5 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary-600" />
                  Cooperative Logo
                </label>
                <p className="text-xs text-gray-500 mb-4">
                  Upload an official logo or provide an image URL. Recommended dimensions: square or 4:3 (e.g. 512x512 PNG).
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Preview */}
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                    {settings.cooperative_logo ? (
                      <img
                        src={settings.cooperative_logo}
                        alt="Cooperative Logo"
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <div className="flex items-center gap-3">
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
                        className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                      >
                        {uploadingLogo ? (
                          <Loader className="w-4 h-4 animate-spin text-primary-600" />
                        ) : (
                          <Upload className="w-4 h-4 text-gray-600" />
                        )}
                        {uploadingLogo ? 'Uploading...' : 'Upload New Logo'}
                      </button>

                      {settings.cooperative_logo && (
                        <button
                          type="button"
                          onClick={() => handleSettingChange('cooperative_logo', '')}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <span className="text-xs text-gray-500 block mb-1">Or direct image URL:</span>
                      <input
                        type="text"
                        value={settings.cooperative_logo || ''}
                        onChange={(e) => handleSettingChange('cooperative_logo', e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cooperative Bylaws (PDF Document) */}
              <div className="space-y-2 md:col-span-2 p-5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Official Cooperative Bylaws (PDF)
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Upload the constitution and bylaws of the cooperative in PDF format. Registered members will be able to download this document from their dashboard.
                    </p>
                  </div>
                  {bylawInfo && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 self-start sm:self-auto shrink-0">
                      <FileCheck className="w-3.5 h-3.5" />
                      Active Bylaw Published
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  {bylawInfo ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center shrink-0 font-bold text-xs uppercase tracking-wider">
                          PDF
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-md">
                            {bylawInfo.filename || 'Cooperative_Bylaws.pdf'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {Math.round(bylawInfo.size / 1024)} KB • Uploaded on {new Date(bylawInfo.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={settingsService.getDownloadBylawUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </a>

                        <input
                          type="file"
                          ref={bylawFileInputRef}
                          onChange={handleBylawUpload}
                          accept=".pdf,application/pdf"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => bylawFileInputRef.current?.click()}
                          disabled={uploadingBylaw}
                          className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          {uploadingBylaw ? (
                            <Loader className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>{uploadingBylaw ? 'Uploading...' : 'Replace'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDeleteBylaw}
                          disabled={deletingBylaw}
                          className="px-2.5 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                          title="Remove Bylaw"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-lg p-6 bg-white/70 dark:bg-gray-800/50 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          No cooperative bylaw has been uploaded yet
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Upload your cooperative constitution or bye-law document (PDF, up to 25 MB)
                        </p>
                      </div>

                      <div>
                        <input
                          type="file"
                          ref={bylawFileInputRef}
                          onChange={handleBylawUpload}
                          accept=".pdf,application/pdf"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => bylawFileInputRef.current?.click()}
                          disabled={uploadingBylaw}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          {uploadingBylaw ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span>{uploadingBylaw ? 'Uploading PDF...' : 'Upload Bylaw (PDF)'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Address */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  Physical / Head Office Address
                </label>
                <textarea
                  rows={2}
                  value={settings.address || ''}
                  onChange={(e) => handleSettingChange('address', e.target.value)}
                  placeholder="e.g. Suite 401, Central Business District, Gombe State, Nigeria"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              {/* 4. Contact Details */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-500" />
                  Contact Email
                </label>
                <input
                  type="email"
                  value={settings.contact_email || ''}
                  onChange={(e) => handleSettingChange('contact_email', e.target.value)}
                  placeholder="info@imancooperative.org"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-500" />
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={settings.contact_phone || ''}
                  onChange={(e) => handleSettingChange('contact_phone', e.target.value)}
                  placeholder="+234-800-000-0000"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-gray-500" />
                  Official Website
                </label>
                <input
                  type="url"
                  value={settings.contact_website || ''}
                  onChange={(e) => handleSettingChange('contact_website', e.target.value)}
                  placeholder="https://imancooperative.org"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-500" />
                  Dedicated Support Phone
                </label>
                <input
                  type="text"
                  value={settings.support_phone || ''}
                  onChange={(e) => handleSettingChange('support_phone', e.target.value)}
                  placeholder="+234-800-111-2222"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              {/* 5. Currency */}
              <div className="md:col-span-2 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      Currency Settings
                    </h3>
                    <p className="text-xs text-gray-500">Configure default accounting and member transaction currency</p>
                  </div>

                  {/* Quick presets */}
                  <div className="flex gap-1.5">
                    {[
                      { code: 'NGN', sym: '₦', name: 'Nigerian Naira' },
                      { code: 'USD', sym: '$', name: 'US Dollar' },
                      { code: 'EUR', sym: '€', name: 'Euro' },
                      { code: 'GBP', sym: '£', name: 'British Pound' },
                      { code: 'KES', sym: 'KSh', name: 'Kenyan Shilling' },
                      { code: 'GHS', sym: 'GH₵', name: 'Ghanaian Cedi' }
                    ].map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleCurrencyPreset(c.code, c.sym, c.name)}
                        className={`px-2.5 py-1 text-xs rounded-md border font-medium transition ${
                          settings.currency_code === c.code
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {c.code} ({c.sym})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Currency Code</label>
                    <input
                      type="text"
                      value={settings.currency_code || ''}
                      onChange={(e) => handleSettingChange('currency_code', e.target.value.toUpperCase())}
                      placeholder="NGN"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Currency Symbol</label>
                    <input
                      type="text"
                      value={settings.currency_symbol || ''}
                      onChange={(e) => handleSettingChange('currency_symbol', e.target.value)}
                      placeholder="₦"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Currency Name</label>
                    <input
                      type="text"
                      value={settings.currency_name || ''}
                      onChange={(e) => handleSettingChange('currency_name', e.target.value)}
                      placeholder="Nigerian Naira"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. FEES (Registration Fee, Monthly Administrative Fee) */}
        {activeTab === 'fees' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-600" />
                Cooperative Fees & Automatic Deductions
              </h2>
              <p className="text-sm text-gray-500">Configure entry fees and regular operational service charges</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 10. Registration Fee */}
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                      10
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Registration Fee</h3>
                      <p className="text-xs text-gray-500">One-time membership onboarding fee</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Onboarding</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Fee Amount ({settings.currency_symbol || '₦'})</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">
                      {settings.currency_symbol || '₦'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={settings.registration_fee ?? 2000}
                      onChange={(e) => handleSettingChange('registration_fee', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div>
                    <label className="text-sm font-medium text-gray-800">Auto-deduct on first deposit</label>
                    <p className="text-xs text-gray-500">Automatically debit from member's initial wallet deposit</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auto_deduct_registration_fee ?? true}
                      onChange={(e) => handleSettingChange('auto_deduct_registration_fee', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>

              {/* 11. Monthly Administrative Fee */}
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      11
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Monthly Administrative Fee</h3>
                      <p className="text-xs text-gray-500">Recurring maintenance fee for cooperative operations</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Recurring</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Fee Amount ({settings.currency_symbol || '₦'})</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">
                      {settings.currency_symbol || '₦'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={settings.monthly_admin_fee ?? 1000}
                      onChange={(e) => handleSettingChange('monthly_admin_fee', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div>
                    <label className="text-sm font-medium text-gray-800">Auto-deduct on monthly contribution</label>
                    <p className="text-xs text-gray-500">Deduct administrative fee directly from monthly contribution</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auto_deduct_monthly_admin_fee ?? true}
                      onChange={(e) => handleSettingChange('auto_deduct_monthly_admin_fee', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. CONTRIBUTION RULES (Item 6) */}
        {activeTab === 'contributions' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Contribution Rules
              </h2>
              <p className="text-sm text-gray-500">Rules governing regular monthly savings, target savings, voluntary deposits, and withdrawals</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Minimum Monthly Savings ({settings.currency_symbol || '₦'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.minimum_savings ?? 1000}
                  onChange={(e) => handleSettingChange('minimum_savings', parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Standard monthly mandatory contribution amount for active members.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Minimum Target Savings Amount ({settings.currency_symbol || '₦'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.minimum_target_savings ?? 2000}
                  onChange={(e) => handleSettingChange('minimum_target_savings', parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Minimum monthly or total goal required to create a target savings plan.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Target Savings Minimum Lock Period (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.target_savings_min_period ?? 6}
                  onChange={(e) => handleSettingChange('target_savings_min_period', parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Duration during which target savings are committed before maturation.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Savings Lock Period Before Withdrawals (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.savings_withdrawal_lock_months ?? 6}
                  onChange={(e) => handleSettingChange('savings_withdrawal_lock_months', parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Minimum active saving months before a member can request a partial withdrawal.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Maximum Savings Withdrawal Limit (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.max_savings_withdrawal_percent ?? 70}
                    onChange={(e) => handleSettingChange('max_savings_withdrawal_percent', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm">%</span>
                </div>
                <span className="text-xs text-gray-500">Maximum percentage of accumulated regular savings a member may withdraw while maintaining active status.</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <label className="text-sm font-semibold text-gray-800">Allow Voluntary Additional Savings</label>
                  <p className="text-xs text-gray-500">Permit members to make one-off ad-hoc deposits anytime</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_voluntary_savings ?? true}
                    onChange={(e) => handleSettingChange('allow_voluntary_savings', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 4. LOAN RULES (Item 7) */}
        {activeTab === 'loans' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Loan Rules & Financing Policies
              </h2>
              <p className="text-sm text-gray-500">Establish maximum financing limits, multiplier criteria, tenures, rates, and guarantor requirements</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Maximum Overall Loan Amount ({settings.currency_symbol || '₦'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.max_loan_amount ?? 1000000}
                  onChange={(e) => handleSettingChange('max_loan_amount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Absolute ceiling for any single loan facility across all categories.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Maximum Cash / Personal Loan ({settings.currency_symbol || '₦'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.max_cash_loan ?? 500000}
                  onChange={(e) => handleSettingChange('max_cash_loan', parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Maximum limit for unsecured cash or quick-disbursement loans.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Savings / Investment Loan Multiplier
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={settings.investment_loan_multiplier ?? 3}
                    onChange={(e) => handleSettingChange('investment_loan_multiplier', parseFloat(e.target.value) || 1)}
                    className="w-full pr-10 pl-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm font-bold">x</span>
                </div>
                <span className="text-xs text-gray-500">Members can borrow up to this multiple of their savings/shares balance (e.g. 3x).</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Default Repayment Period (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={settings.default_repayment_period ?? 12}
                  onChange={(e) => handleSettingChange('default_repayment_period', parseInt(e.target.value) || 12)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Standard amortization schedule duration for new loans.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Minimum Membership Duration (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.min_membership_months_for_loan ?? 6}
                  onChange={(e) => handleSettingChange('min_membership_months_for_loan', parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Months of active membership required before becoming eligible to apply.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Loan Administrative / Markup Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.loan_interest_rate ?? 5}
                    onChange={(e) => handleSettingChange('loan_interest_rate', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm">%</span>
                </div>
                <span className="text-xs text-gray-500">Administrative profit markup or interest rate applied to principal.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Late Payment Penalty Fee (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={settings.late_payment_fee ?? 5}
                    onChange={(e) => handleSettingChange('late_payment_fee', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm">%</span>
                </div>
                <span className="text-xs text-gray-500">Penalty surcharge applied to overdue monthly installments.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Maximum Active Loans Per Member
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.max_active_loans_per_member ?? 2}
                  onChange={(e) => handleSettingChange('max_active_loans_per_member', parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Concurrent active loan facilities allowed per member.</span>
              </div>

              {/* Guarantors */}
              <div className="md:col-span-2 p-5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Require Member Guarantors</h4>
                  <p className="text-xs text-gray-500">Ensure applicants provide active cooperative members as loan guarantors</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 font-medium">Min Guarantors:</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      disabled={!settings.require_guarantors}
                      value={settings.min_guarantors_count ?? 2}
                      onChange={(e) => handleSettingChange('min_guarantors_count', parseInt(e.target.value) || 1)}
                      className="w-16 px-2.5 py-1 text-xs border border-gray-300 rounded-lg text-center bg-white"
                    />
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.require_guarantors ?? true}
                      onChange={(e) => handleSettingChange('require_guarantors', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. INVESTMENT RULES (Item 8) */}
        {activeTab === 'investments' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Investment Rules
              </h2>
              <p className="text-sm text-gray-500">Set minimum subscription thresholds, lock maturities, projected ROI, and liquidation policies</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Minimum Investment Amount ({settings.currency_symbol || '₦'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.minimum_investment ?? 5000}
                  onChange={(e) => handleSettingChange('minimum_investment', parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Minimum unit capital subscription for investment opportunities.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Investment Lock Period (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.investment_lock_period_months ?? 12}
                  onChange={(e) => handleSettingChange('investment_lock_period_months', parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Standard lock-in holding duration before investment maturity.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Expected / Target Annual ROI (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={settings.expected_roi_percent ?? 15}
                    onChange={(e) => handleSettingChange('expected_roi_percent', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm">%</span>
                </div>
                <span className="text-xs text-gray-500">Estimated or targeted annual return rate advertised to members.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Early Liquidation Penalty (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={!settings.allow_early_liquidation}
                    value={settings.early_termination_penalty_percent ?? 10}
                    onChange={(e) => handleSettingChange('early_termination_penalty_percent', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3.5 py-2.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm">%</span>
                </div>
                <span className="text-xs text-gray-500">Penalty fee charged on premature redemption of investment capital.</span>
              </div>

              <div className="md:col-span-2 flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <label className="text-sm font-semibold text-gray-800">Allow Early Liquidation / Premature Termination</label>
                  <p className="text-xs text-gray-500">Allow members to cash out their investment before the contractual lock period ends</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_early_liquidation ?? false}
                    onChange={(e) => handleSettingChange('allow_early_liquidation', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 6. PROFIT DISTRIBUTION RULES (Item 9) */}
        {activeTab === 'profit' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-amber-600" />
                  Profit Distribution Rules
                </h2>
                <p className="text-sm text-gray-500">Statutory reserves, committee bonuses, educational allocations, and member dividends</p>
              </div>

              {/* Total allocation meter */}
              <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${
                Math.abs(profitTotal - 100) < 0.1
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider">Total Allocation</div>
                  <div className="text-lg font-bold">{profitTotal.toFixed(1)}%</div>
                </div>
                {Math.abs(profitTotal - 100) >= 0.1 && (
                  <button
                    type="button"
                    onClick={autoBalanceDividend}
                    className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-2.5 py-1 rounded font-medium transition"
                  >
                    Auto Balance (100%)
                  </button>
                )}
                {Math.abs(profitTotal - 100) < 0.1 && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-800">
                  Profit Sharing Frequency
                </label>
                <select
                  value={settings.profit_sharing_frequency || 'quarterly'}
                  onChange={(e) => handleSettingChange('profit_sharing_frequency', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="bi-annually">Bi-Annually (Every 6 Months)</option>
                  <option value="annually">Annually</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Statutory Reserve Fund (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.reserve_fund_percentage ?? 10}
                    onChange={(e) => handleSettingChange('reserve_fund_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm">%</span>
                </div>
                <span className="text-xs text-gray-500">Mandatory legal reserve required for cooperative stability.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Education & Training Fund (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.education_fund_percentage ?? 5}
                    onChange={(e) => handleSettingChange('education_fund_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm">%</span>
                </div>
                <span className="text-xs text-gray-500">Allocated for member educational workshops and cooperative training.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Committee / Management Bonus (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.committee_bonus_percentage ?? 5}
                    onChange={(e) => handleSettingChange('committee_bonus_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm">%</span>
                </div>
                <span className="text-xs text-gray-500">Honorarium allocated to executive committee and leadership.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Bad Debt Provision (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.bad_debt_reserve_percentage ?? 3.5}
                    onChange={(e) => handleSettingChange('bad_debt_reserve_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm">%</span>
                </div>
                <span className="text-xs text-gray-500">Contingency reserve for loan default risk mitigation.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  General Operations Reserve (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.general_reserve_percentage ?? 2.8}
                    onChange={(e) => handleSettingChange('general_reserve_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm">%</span>
                </div>
                <span className="text-xs text-gray-500">Operational development and capital asset maintenance.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800 text-emerald-800">
                  Member Dividend Pool (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.member_dividend_percentage ?? 73.7}
                    onChange={(e) => handleSettingChange('member_dividend_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3.5 py-2.5 border-2 border-emerald-300 rounded-lg text-sm font-bold bg-emerald-50/50"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-700 text-sm font-bold">%</span>
                </div>
                <span className="text-xs text-gray-500">Net dividend distributed to all eligible members based on their savings/investment volume.</span>
              </div>
            </div>
          </div>
        )}

        {/* 7. SUBSCRIPTION & PLAN (Items 12 & 13) */}
        {activeTab === 'subscription' && (
          <div className="space-y-8">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-primary-600" />
                    Cooperative Plan & Billing Specifications
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Official cooperative subscription tier, license status, amount payable, and billing settlement details
                  </p>
                </div>

                {!isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUpgradePlan('Growth Plan');
                      setShowUpgradeModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:from-primary-700 hover:to-indigo-700 transition shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Request Plan Upgrade</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Platform Governance Notice (Tenant View) */}
            {!isSuperAdmin && (
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-sm flex items-start gap-3 shadow-xs">
                <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-950">Platform-Governed Licensing & Pricing</h4>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Your cooperative subscription tier, renewal date, and billing fee are managed centrally by the Platform Super Admin. Below is your official plan statement, amount payable, and settlement instructions.
                  </p>
                </div>
              </div>
            )}

            {/* 1. EXECUTIVE BILLING & AMOUNT PAYABLE HERO CARD */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-primary-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
              {/* Background ambient glow */}
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute right-40 top-0 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Side: Active Plan & Amount Payable */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md text-yellow-300 border border-white/10 shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      {settings.subscription_plan || 'Growth Plan'}
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Tag className="w-3.5 h-3.5" />
                      {settings.subscription_rate_per_member
                        ? `₦${settings.subscription_rate_per_member} / PER MEMBER`
                        : 'Custom Rate'} • {settings.subscription_member_bracket || '501 Up to 1,000 members'}
                    </span>
                    
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      (settings.subscription_payment_status || 'paid') === 'paid'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {(settings.subscription_payment_status || 'paid') === 'paid' ? 'Payment Settled' : 'Payment Pending'}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300 uppercase tracking-wider">
                      {settings.subscription_status || 'active'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Amount Payable ({settings.subscription_billing_cycle === 'annual' ? 'Annual Subscription' : 'Monthly Subscription'})
                    </span>
                    <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-1 flex items-baseline gap-2">
                      <span>{settings.currency_symbol || '₦'}{(Number(settings.subscription_amount_payable ?? 150000)).toLocaleString()}</span>
                      <span className="text-sm sm:text-base font-normal text-slate-400">
                        / {settings.subscription_billing_cycle === 'annual' ? 'year' : 'month'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                    {settings.subscription_billing_notes ||
                      'Growth operational plan with ₦150/member rate, automated reminders, AI risk scoring, and investment portfolios.'}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary-400" />
                      <span>Next Due Date: <strong>{settings.subscription_next_billing_date ? new Date(settings.subscription_next_billing_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'December 31, 2027'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-400" />
                      <span>Invoice Ref: <strong className="font-mono text-emerald-300">{settings.subscription_invoice_reference || 'INV-2025-IMAN-001'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Countdown & Entitlements Badge */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
                    <Clock className="w-5 h-5 text-primary-400 mx-auto mb-1.5" />
                    <div className="text-2xl sm:text-3xl font-black text-white">
                      {subscriptionDays !== null && subscriptionDays > 0 ? subscriptionDays : 0}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
                      Days Until Renewal
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
                    <Users className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
                    <div className="text-2xl sm:text-3xl font-black text-white">
                      {(settings.subscription_member_limit || 10000).toLocaleString()}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
                      Member Limit
                    </div>
                  </div>

                  <div className="col-span-2 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">License Certificate Key</span>
                      <span className="text-[10px] text-emerald-400 font-semibold uppercase">Verified Active</span>
                    </div>
                    <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 border border-white/10">
                      <span className="font-mono text-xs text-yellow-200 truncate">
                        COOP-LIC-IMAN-ENT-2025-9941
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('COOP-LIC-IMAN-ENT-2025-9941');
                          toast.success('License key copied!');
                        }}
                        className="p-1 hover:text-white text-slate-400 transition ml-2"
                        title="Copy License Key"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. OFFICIAL BANK PAYMENT SETTLEMENT DETAILS */}
            <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-amber-50/70 rounded-2xl border-2 border-amber-200/80 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold">
                    <Landmark className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Official Platform Settlement & Subscription Payment Account
                    </h3>
                    <p className="text-xs text-amber-900">
                      Use these platform bank details to remit subscription renewals and invoice balances
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const acc = settings.subscription_payment_instructions?.account_number || '3128945012';
                    navigator.clipboard.writeText(acc);
                    setCopiedAccount(true);
                    toast.success('Account number copied to clipboard!');
                    setTimeout(() => setCopiedAccount(false), 3000);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 text-xs font-bold rounded-xl transition shadow-xs self-start sm:self-auto"
                >
                  {copiedAccount ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
                  <span>{copiedAccount ? 'Copied!' : 'Copy Account Number'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-amber-200/70 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Bank Name</span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {settings.subscription_payment_instructions?.bank_name || 'First Bank of Nigeria'}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200/70 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Account Number</span>
                  <p className="text-sm font-mono font-black text-primary-700 mt-0.5 tracking-wider">
                    {settings.subscription_payment_instructions?.account_number || '3128945012'}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200/70 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Beneficiary / Account Name</span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {settings.subscription_payment_instructions?.account_name || 'Cooperative Core Technologies Ltd'}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200/70 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Payment Reference Code</span>
                  <p className="text-sm font-mono font-bold text-amber-900 mt-0.5">
                    {settings.subscription_payment_instructions?.payment_reference_format || 'COOP-IMAN-2025'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-200/60 flex flex-wrap items-center justify-between text-xs text-amber-900 gap-2">
                <span>
                  After transfer, kindly email your proof of payment to{' '}
                  <strong className="text-primary-700">{settings.subscription_payment_instructions?.support_email || 'billing@platform.cooperative.org'}</strong>.
                </span>
                <span className="font-semibold text-gray-700">
                  Billing Helpline: {settings.subscription_payment_instructions?.support_phone || '+234 800 123 4567'}
                </span>
              </div>
            </div>

            {/* 3. PLATFORM PLAN TIERS CATALOG & COMPARISON */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary-600" />
                    Platform Plan Tiers & Specifications
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Explore available cooperative tiers, compare feature bundles, and request an upgrade
                  </p>
                </div>

                {/* Billing cycle comparison toggle */}
                <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50 shadow-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setBillingComparisonCycle('monthly')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      billingComparisonCycle === 'monthly'
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Monthly Pricing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingComparisonCycle('annual')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      billingComparisonCycle === 'annual'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span>Annual Pricing</span>
                    <span className="text-[10px] bg-yellow-400 text-purple-950 px-1.5 py-0.2 rounded font-black">2 Mo Free</span>
                  </button>
                </div>
              </div>

              {/* Tiers Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  {
                    id: 'starter',
                    name: 'Starter Plan',
                    rate: 200,
                    bracket: '1 UP TO 500 MEMBERS',
                    badge: 'Starter',
                    popular: false,
                    desc: 'Essential digital tools for emerging and community-based cooperatives.',
                    features: [
                      '1 Up to 500 Members Capacity',
                      '₦200 / Per Member Rate',
                      'Savings & Contributions Module',
                      'Standard Loan Processing & Amortization',
                      'Passbooks & Printable Receipts',
                      'Automated Monthly Statement Generation',
                      'Standard Email Support'
                    ]
                  },
                  {
                    id: 'growth',
                    name: 'Growth Plan',
                    rate: 150,
                    bracket: '501 Up to 1,000 members',
                    badge: 'Popular',
                    popular: true,
                    desc: 'High-performance suite for growing cooperatives with investment and asset portfolios.',
                    features: [
                      '501 Up to 1,000 Members Capacity',
                      '₦150 / Per Member Rate (25% Savings)',
                      'All Starter Features Included',
                      'Fixed-Yield Investment Portfolios',
                      'Layyah Livestock Pool Management',
                      'AI Financial Advisor & Risk Scoring',
                      'Automated SMS & Email Reminders',
                      'Priority Support Desk (12h SLA)'
                    ]
                  },
                  {
                    id: 'pro',
                    name: 'PRO Plan',
                    rate: 100,
                    bracket: '1001 Up to 1,500 members',
                    badge: 'High Volume',
                    popular: false,
                    desc: 'Maximum power, bespoke customizations, and advanced governance controls.',
                    features: [
                      '1001 Up to 1,500 Members Capacity',
                      '₦100 / Per Member Rate (50% Discount)',
                      'All Growth Features Included',
                      'Complete AI Intelligence Suite (OCR + Auto Audit)',
                      'Multi-Level Executive Approvals',
                      'Receipt & Legal Contract Designer',
                      'Dedicated Account Manager & 24/7 SLA'
                    ]
                  },
                  {
                    id: 'custom',
                    name: 'Custom Plan',
                    rate: null,
                    bracket: 'Unlimited / Negotiated',
                    badge: 'Bespoke',
                    popular: false,
                    desc: 'Tailored enterprise architecture for apex federations and large multi-branch unions.',
                    features: [
                      '1,501+ Members / Unlimited Scale',
                      'Negotiated Custom Rate Per Member',
                      'Multi-Branch Federation Aggregation',
                      'Custom ERP & Core Banking Integration',
                      'On-Premises or Dedicated Cloud Infrastructure',
                      'Dedicated Solutions Architect & SLA'
                    ]
                  }
                ].map((tier) => {
                  const isCurrent = settings.subscription_plan?.toLowerCase().includes(tier.id) ||
                    (tier.id === 'custom' && !['starter', 'growth', 'pro'].some(t => settings.subscription_plan?.toLowerCase().includes(t)));
                  return (
                    <div
                      key={tier.id}
                      className={`rounded-2xl p-6 flex flex-col justify-between transition-all relative border-2 ${
                        isCurrent
                          ? 'border-primary-600 bg-white shadow-lg ring-2 ring-primary-100'
                          : tier.badge === 'Popular'
                          ? 'border-amber-300 bg-white shadow-md'
                          : tier.badge === 'High Volume'
                          ? 'border-indigo-300 bg-white shadow-md'
                          : tier.badge === 'Bespoke'
                          ? 'border-purple-300 bg-white shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {/* Badges */}
                      {isCurrent ? (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm uppercase tracking-wider whitespace-nowrap">
                          Current Active Plan
                        </span>
                      ) : tier.badge === 'Popular' ? (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm uppercase tracking-wider whitespace-nowrap">
                          Popular
                        </span>
                      ) : tier.badge === 'High Volume' ? (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm uppercase tracking-wider whitespace-nowrap">
                          High Volume
                        </span>
                      ) : tier.badge === 'Bespoke' ? (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm uppercase tracking-wider whitespace-nowrap">
                          Bespoke
                        </span>
                      ) : null}

                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-black text-gray-900">{tier.name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            tier.badge === 'Popular'
                              ? 'bg-amber-100 text-amber-800'
                              : tier.badge === 'High Volume'
                              ? 'bg-indigo-100 text-indigo-800'
                              : tier.badge === 'Bespoke'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {tier.badge}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 min-h-[32px]">{tier.desc}</p>

                        <div className="mt-4 pt-4 border-t border-gray-100">
                          {tier.rate ? (
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-black text-gray-900">
                                {settings.currency_symbol || '₦'}{tier.rate}
                              </span>
                              <span className="text-xs font-bold text-gray-500 uppercase">
                                / PER MEMBER
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-baseline">
                              <span className="text-2xl font-black text-gray-900">
                                Custom Rate
                              </span>
                            </div>
                          )}
                          <span className="inline-block text-[11px] font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md mt-2">
                            {tier.bracket}
                          </span>
                        </div>

                        <div className="mt-5 space-y-2.5">
                          <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Included Features</span>
                          <ul className="space-y-2 text-xs text-gray-600">
                            {tier.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-100">
                        {isCurrent ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 px-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Active Subscription</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUpgradePlan(tier.name);
                              setShowUpgradeModal(true);
                            }}
                            className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                          >
                            <span>Request {tier.name}</span>
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. SUPER ADMIN CONTROLS (Rendered when Super Admin is viewing SettingsPage) */}
            {isSuperAdmin && (
              <div className="bg-purple-50/70 border-2 border-purple-200 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-purple-950">
                      Super Admin Inline Pricing & Licensing Overrides
                    </h3>
                    <p className="text-xs text-purple-800">
                      You are in Super Admin mode. You can directly edit the Amount Payable, status, and renewal timeline for this tenant.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Rate Per Member */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Rate Per Member ({settings.currency_symbol || '₦'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={settings.subscription_rate_per_member ?? 150}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value) || 0;
                        handleSettingChange('subscription_rate_per_member', rate);
                        if (settings.subscription_member_limit) {
                          handleSettingChange('subscription_amount_payable', settings.subscription_member_limit * rate);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold bg-white text-gray-900"
                    />
                  </div>

                  {/* Member Bracket */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Member Bracket
                    </label>
                    <input
                      type="text"
                      value={settings.subscription_member_bracket || '501 Up to 1,000 members'}
                      onChange={(e) => handleSettingChange('subscription_member_bracket', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold text-gray-900"
                    />
                  </div>

                  {/* Amount Payable */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-gray-800">
                        Amount Payable ({settings.currency_symbol || '₦'})
                      </label>
                      {settings.subscription_rate_per_member && settings.subscription_member_limit && (
                        <button
                          type="button"
                          onClick={() => {
                            const calculated = (settings.subscription_member_limit || 0) * (settings.subscription_rate_per_member || 0);
                            handleSettingChange('subscription_amount_payable', calculated);
                          }}
                          className="text-[10px] text-purple-700 hover:text-purple-900 font-bold"
                        >
                          Auto-Calc
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={settings.subscription_amount_payable ?? 150000}
                      onChange={(e) => handleSettingChange('subscription_amount_payable', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold bg-white"
                    />
                  </div>

                  {/* Billing Cycle */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={settings.subscription_billing_cycle || 'annual'}
                      onChange={(e) => handleSettingChange('subscription_billing_cycle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={settings.subscription_payment_status || 'paid'}
                      onChange={(e) => handleSettingChange('subscription_payment_status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="paid">Paid (In Good Standing)</option>
                      <option value="pending">Pending Payment</option>
                      <option value="overdue">Overdue</option>
                      <option value="waived">Waived</option>
                    </select>
                  </div>

                  {/* Subscription Status */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Subscription Status
                    </label>
                    <select
                      value={settings.subscription_status || 'active'}
                      onChange={(e) => handleSettingChange('subscription_status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="past_due">Past Due</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={settings.subscription_expiry ? settings.subscription_expiry.split('T')[0] : '2027-12-31'}
                      onChange={(e) => handleSettingChange('subscription_expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    />
                  </div>

                  {/* Next Billing Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Next Billing Date
                    </label>
                    <input
                      type="date"
                      value={settings.subscription_next_billing_date ? settings.subscription_next_billing_date.split('T')[0] : '2027-12-31'}
                      onChange={(e) => handleSettingChange('subscription_next_billing_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    />
                  </div>

                  {/* Member Limit */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Member Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settings.subscription_member_limit ?? 10000}
                      onChange={(e) => handleSettingChange('subscription_member_limit', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    />
                  </div>

                  {/* Invoice Reference */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Invoice Reference
                    </label>
                    <input
                      type="text"
                      value={settings.subscription_invoice_reference || 'INV-2025-IMAN-001'}
                      onChange={(e) => handleSettingChange('subscription_invoice_reference', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* UPGRADE REQUEST MODAL */}
            {showUpgradeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-gray-100 max-h-[90vh] my-auto overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Request Plan Upgrade</h3>
                        <p className="text-xs text-gray-500">Contact Platform Administration</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="bg-primary-50 p-4 rounded-xl border border-primary-200">
                      <span className="text-[10px] font-bold uppercase text-primary-700">Requested Plan Tier</span>
                      <h4 className="text-base font-bold text-primary-950 mt-0.5">{selectedUpgradePlan}</h4>
                      <p className="text-primary-800 mt-1">
                        Our platform team will review your cooperative's member volume and provision the upgraded features seamlessly.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-gray-700">Cooperative Society Name</label>
                      <input
                        type="text"
                        readOnly
                        value={settings.cooperative_name}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-gray-700">Contact Email</label>
                      <input
                        type="text"
                        readOnly
                        value={settings.contact_email}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-gray-700">Message / Custom Requirements</label>
                      <textarea
                        rows={3}
                        placeholder="Provide details about expected membership growth or specific feature requests..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toast.success(`Upgrade request for ${selectedUpgradePlan} submitted to Platform Super Admin!`);
                        setShowUpgradeModal(false);
                      }}
                      className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      Submit Upgrade Request
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 8. ENABLED MODULES (Item 14) */}
        {activeTab === 'modules' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary-600" />
                Enabled Modules & Features
              </h2>
              <p className="text-sm text-gray-500">Enable or disable core functional modules for this cooperative tenant</p>
            </div>

            {!isSuperAdmin && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3 shadow-sm">
                <Layers className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900">Provisioned by Platform Super Admin</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Module provisioning is managed centrally by the Platform Super Admin according to your enterprise license package. Only the Super Admin can activate or deactivate tenant modules.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'loans' as keyof EnabledModules, title: 'Loans Module', desc: 'Loan applications, multi-stage approval workflows, and amortization schedules.', icon: CreditCard, color: 'text-indigo-600 bg-indigo-50' },
                { key: 'contributions' as keyof EnabledModules, title: 'Contributions Module', desc: 'Monthly member savings, target savings goals, and deposits tracking.', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
                { key: 'investments' as keyof EnabledModules, title: 'Investments Module', desc: 'Fixed-yield cooperative investments, capital tracking, and ROI portfolios.', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
                { key: 'layyah' as keyof EnabledModules, title: 'Layyah Livestock Booking', desc: 'Livestock purchase pooling, member shares, and sacrificial distribution.', icon: Sparkles, color: 'text-rose-600 bg-rose-50' },
                { key: 'expenses' as keyof EnabledModules, title: 'Expenses & Vendor Management', desc: 'Operational expenditures, budget tracking, and vendor disbursements.', icon: CreditCard, color: 'text-amber-600 bg-amber-50' },
                { key: 'profit_sharing' as keyof EnabledModules, title: 'Profit Sharing Engine', desc: 'Automated periodic dividend calculation and distribution to member wallets.', icon: Percent, color: 'text-teal-600 bg-teal-50' },
                { key: 'withdrawals' as keyof EnabledModules, title: 'Member Withdrawals', desc: 'Self-service withdrawal requests, policy checks, and treasury payouts.', icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
                { key: 'receipt_designer' as keyof EnabledModules, title: 'Receipt Designer', desc: 'Custom receipt templates, typography, barcodes, and printable vouchers.', icon: FileText, color: 'text-orange-600 bg-orange-50' },
                { key: 'document_designer' as keyof EnabledModules, title: 'Document & Contract Designer', desc: 'Automated generation of loan contracts, agreements, and certificates.', icon: FileText, color: 'text-sky-600 bg-sky-50' },
                { key: 'member_portal' as keyof EnabledModules, title: 'Member Self-Service Portal', desc: 'Dedicated mobile & web dashboard for members to view passbooks & apply online.', icon: Building2, color: 'text-violet-600 bg-violet-50' },
              ].map((mod) => {
                const isEnabled = settings.enabled_modules?.[mod.key] ?? true;
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.key}
                    onClick={() => {
                      if (isSuperAdmin) {
                        handleModuleToggle(mod.key);
                      } else {
                        toast.error('Module provisioning is restricted to the Super Admin');
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                      isSuperAdmin ? 'cursor-pointer' : 'cursor-not-allowed'
                    } ${
                      isEnabled
                        ? 'bg-white border-primary-300 shadow-sm ring-1 ring-primary-100'
                        : 'bg-gray-50 border-gray-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${mod.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900">{mod.title}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{mod.desc}</p>
                      </div>
                    </div>

                    <label className={`relative inline-flex items-center shrink-0 mt-1 ${isSuperAdmin ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        disabled={!isSuperAdmin}
                        checked={isEnabled}
                        onChange={() => {
                          if (isSuperAdmin) {
                            handleModuleToggle(mod.key);
                          } else {
                            toast.error('Module provisioning is restricted to the Super Admin');
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className={`w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600 ${!isSuperAdmin ? 'opacity-60' : ''}`}></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 9. AI SETTINGS (Item 15) */}
        {activeTab === 'ai' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600" />
                  AI Settings & Intelligent Automation
                </h2>
                <p className="text-sm text-gray-500">Configure AI provider, models, and smart features for cooperative management</p>
              </div>

              {/* Master AI toggle */}
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                <span className="text-sm font-semibold text-gray-800">Master AI Switch</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.ai_settings?.enabled ?? true}
                    onChange={(e) => handleAISettingChange('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Provider */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  AI Engine / Provider
                </label>
                <select
                  disabled={!settings.ai_settings?.enabled}
                  value={settings.ai_settings?.provider || 'gemini'}
                  onChange={(e) => handleAISettingChange('provider', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
                >
                  <option value="gemini">Google Gemini (Recommended)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="anthropic">Anthropic (Claude 3.5)</option>
                  <option value="custom">Custom / Local LLM Endpoint</option>
                </select>
                <span className="text-xs text-gray-500">LLM vendor handling intelligence, OCR, and risk scoring.</span>
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  AI Model Name
                </label>
                <input
                  type="text"
                  disabled={!settings.ai_settings?.enabled}
                  value={settings.ai_settings?.model || 'gemini-2.5-flash'}
                  onChange={(e) => handleAISettingChange('model', e.target.value)}
                  placeholder="e.g. gemini-2.5-flash or gpt-4o"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                />
                <span className="text-xs text-gray-500">Specific model version identifier.</span>
              </div>

              {/* API Key */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 flex items-center justify-between">
                  <span>API Key</span>
                  <span className="text-xs text-gray-400 font-normal">Encrypted securely in tenant secrets</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    disabled={!settings.ai_settings?.enabled}
                    value={settings.ai_settings?.api_key || ''}
                    onChange={(e) => handleAISettingChange('api_key', e.target.value)}
                    placeholder="Enter API key (e.g. AIzaSy... or sk-...)"
                    className="w-full pl-3.5 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* AI Features Grid */}
              <div className="md:col-span-2 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Intelligent Capabilities</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'loan_risk_scoring' as keyof AISettings, title: 'AI Loan Risk Scoring', desc: 'Predict default probability and calculate recommended credit limits.' },
                    { key: 'financial_advisor' as keyof AISettings, title: 'Member Financial Advisor', desc: 'Provide intelligent savings recommendations and budgeting tips.' },
                    { key: 'document_ocr' as keyof AISettings, title: 'Smart Document OCR', desc: 'Extract data automatically from uploaded payment slips, ID cards, and receipts.' },
                    { key: 'auto_reporting' as keyof AISettings, title: 'Automated Audit & Insights', desc: 'Generate executive summaries and anomaly alerts for committee meetings.' },
                  ].map((feat) => {
                    const isFeatureOn = !!settings.ai_settings?.[feat.key];
                    return (
                      <div
                        key={feat.key}
                        className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-4"
                      >
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{feat.title}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{feat.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            disabled={!settings.ai_settings?.enabled}
                            checked={isFeatureOn}
                            onChange={(e) => handleAISettingChange(feat.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 10. AGREEMENT TEMPLATES */}
        {activeTab === 'agreements' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                Legal Agreements & Contract Templates
              </h2>
              <p className="text-sm text-gray-500">Configure legally-binding contract templates generated upon loan approval</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Agent Agreement Template (HTML / Text)
                </label>
                <textarea
                  rows={8}
                  value={settings.agent_agreement_template || ''}
                  onChange={(e) => handleSettingChange('agent_agreement_template', e.target.value)}
                  placeholder="<h2>Agent Agreement</h2><p>This Agreement is made on [Date]...</p>"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Murabaha Contract Template (HTML / Text)
                </label>
                <textarea
                  rows={8}
                  value={settings.murabaha_contract_template || ''}
                  onChange={(e) => handleSettingChange('murabaha_contract_template', e.target.value)}
                  placeholder="<h2>Murabaha Contract</h2><p>This Contract is made on [Date]...</p>"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 11. THEME */}
        {activeTab === 'theme' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Branding & Public Landing Page Theme
              </h2>
              <p className="text-sm text-gray-500">Customize brand palette and member welcome messages</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.primaryColor || '#2563eb'}
                    onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-10 h-10 p-0.5 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.primaryColor || '#2563eb'}
                    onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.secondaryColor || '#ffffff'}
                    onChange={(e) => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-10 h-10 p-0.5 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.secondaryColor || '#ffffff'}
                    onChange={(e) => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.accentColor || '#ff6b00'}
                    onChange={(e) => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="w-10 h-10 p-0.5 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.accentColor || '#ff6b00'}
                    onChange={(e) => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="md:col-span-3 space-y-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Landing Page Hero Title</label>
                  <input
                    type="text"
                    value={theme.landingPageHeroTitle || ''}
                    onChange={(e) => setTheme(prev => ({ ...prev, landingPageHeroTitle: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Landing Page Hero Subtitle</label>
                  <textarea
                    rows={2}
                    value={theme.landingPageHeroSubtitle || ''}
                    onChange={(e) => setTheme(prev => ({ ...prev, landingPageHeroSubtitle: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 12. CUSTOM FIELDS */}
        {activeTab === 'custom_fields' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary-600" />
                Member Custom Profile Fields
              </h2>
              <p className="text-sm text-gray-500">Add dynamic registration fields specific to your cooperative members</p>
            </div>

            {/* Add Field Form */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-gray-800">Add New Dynamic Field</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Field Name (Label)</label>
                  <input
                    type="text"
                    value={newField.field_name}
                    onChange={(e) => setNewField(prev => ({ ...prev, field_name: e.target.value }))}
                    placeholder="e.g. Next of Kin Phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Field Key (Unique identifier)</label>
                  <input
                    type="text"
                    value={newField.field_key}
                    onChange={(e) => setNewField(prev => ({ ...prev, field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                    placeholder="e.g. nok_phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Field Type</label>
                  <select
                    value={newField.field_type}
                    onChange={(e) => setNewField(prev => ({ ...prev, field_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
                  >
                    <option value="text">Text Input</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="textarea">Long Text Area</option>
                    <option value="select">Dropdown Select</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 pb-2.5">
                    <input
                      type="checkbox"
                      checked={newField.is_required}
                      onChange={(e) => setNewField(prev => ({ ...prev, is_required: e.target.checked }))}
                      className="rounded text-primary-600"
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="flex-1 py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium transition"
                  >
                    Add Field
                  </button>
                </div>
              </div>
            </div>

            {/* List of Custom Fields */}
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">Field Label</th>
                    <th className="px-4 py-3">Key</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Required</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {customFields.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        No custom profile fields defined yet.
                      </td>
                    </tr>
                  ) : (
                    customFields.map((field) => (
                      <tr key={field.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{field.field_name}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{field.field_key}</td>
                        <td className="px-4 py-3 capitalize text-gray-700">{field.field_type}</td>
                        <td className="px-4 py-3">
                          {field.is_required ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">Yes</span>
                          ) : (
                            <span className="text-gray-500">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomField(field.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Floating Save Bar when changes exist */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 border border-gray-700"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium">You have unsaved changes</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs text-gray-300 hover:text-white transition"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : 'Save Now'}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SettingsPage;
