import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Save, RefreshCw, DollarSign,
  Percent, CreditCard, Bell, Loader, FileText
} from 'lucide-react';
import { Settings as SystemSettings } from '../services/settingsService';
import settingsService from '../services/settingsService';
import api from '../services/api'; // Add api for direct tenant theme calls
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SystemSettings>({
    cooperative_name: 'IMAN Multi-Purpose Cooperative Society',
    registration_number: 'IMAN/COOP/2024/001',
    address: 'Gombe State, Nigeria',
    contact_email: 'info@imancooperative.org',
    contact_phone: '+234-xxx-xxx-xxxx',
    minimum_savings: 1000,
    minimum_investment: 5000,
    minimum_target_savings: 2000,
    registration_fee: 2000,
    monthly_admin_fee: 200,
    max_cash_loan: 100000,
    investment_loan_multiplier: 3,
    default_repayment_period: 12,
    late_payment_fee: 5,
    profit_sharing_frequency: 'quarterly',
    reserve_fund_percentage: 10,
    education_fund_percentage: 5,
    committee_bonus_percentage: 5,
    bad_debt_reserve_percentage: 3.5,
    general_reserve_percentage: 2.8,

    email_notifications: true,
    sms_notifications: true,
    reminder_days: 7,
    agent_agreement_template: '',
    murabaha_contract_template: '',
  });

  const [theme, setTheme] = useState({
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
    logoUrl: '/logo.png'
  });
  const [originalTheme, setOriginalTheme] = useState({...theme});

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
      setSettings(loadedSettings);
      setOriginalSettings({ ...loadedSettings });

      // Load Theme from public endpoint
      const themeResponse = await api.get('/tenant/config');
      if (themeResponse.data?.data?.theme) {
         setTheme(themeResponse.data.data.theme);
         setOriginalTheme(themeResponse.data.data.theme);
      }

      // Load Custom Fields
      const cfResponse = await api.get('/custom-fields/User');
      if (cfResponse.data?.success) {
        setCustomFields(cfResponse.data.data || []);
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

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (Object.keys(originalSettings).length > 0) {
      const hasSettingsChanges = Object.keys(settings).some(key => {
        return settings[key as keyof SystemSettings] !== originalSettings[key as keyof SystemSettings];
      });
      const hasThemeChanges = Object.keys(theme).some(key => {
        return theme[key as keyof typeof theme] !== originalTheme[key as keyof typeof theme];
      });
      setHasChanges(hasSettingsChanges || hasThemeChanges);
    }
  }, [settings, originalSettings, theme, originalTheme]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const changes: Record<string, any> = {};
      Object.keys(settings).forEach(key => {
        if (settings[key as keyof SystemSettings] !== originalSettings[key as keyof SystemSettings]) {
          changes[key] = settings[key as keyof SystemSettings];
        }
      });

      const themeChanges = Object.keys(theme).some(key => theme[key as keyof typeof theme] !== originalTheme[key as keyof typeof theme]);

      if (Object.keys(changes).length === 0 && !themeChanges) {
        toast('No changes to save');
        return;
      }

      if (Object.keys(changes).length > 0) {
        const result = await settingsService.updateSettings(changes);
        if (!result.success) throw new Error(result.message);
      }

      if (themeChanges) {
         await api.post('/tenant/theme', { theme });
      }

      toast.success('Settings saved successfully!');
      setOriginalSettings({ ...settings });
      setOriginalTheme({ ...theme });
      setHasChanges(false);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = confirm('Are you sure you want to reset all settings to their last saved values? This will undo all unsaved changes.');
    if (!confirmed) return;

    try {
      await loadSettings();
      toast('Settings reloaded from server');
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error(error?.message || 'Failed to reset settings');
    }
  };

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
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure cooperative parameters and system preferences</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex items-center px-4 py-2 rounded-lg ${
              hasChanges && !saving
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex px-6">
            {[
              { id: 'general', name: 'General', icon: Settings },
              { id: 'contributions', name: 'Contributions', icon: DollarSign },
              { id: 'loans', name: 'Loans', icon: CreditCard },
              { id: 'profit', name: 'Profit Sharing', icon: Percent },
              { id: 'notifications', name: 'Notifications', icon: Bell },
              { id: 'agreements', name: 'Agreements', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon && <tab.icon className="w-4 h-4 mr-2" />}
                {tab.name}
              </button>
            ))}
            <button
              onClick={() => setActiveTab('theme')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'theme'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Theme
            </button>
            <button
              onClick={() => setActiveTab('custom_fields')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'custom_fields'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Custom Fields
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-lg shadow">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-500" />
                Cooperative Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cooperative Name</label>
                  <input
                    type="text"
                    value={settings.cooperative_name}
                    onChange={(e) => handleSettingChange('cooperative_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
                  <input
                    type="text"
                    value={settings.registration_number}
                    onChange={(e) => handleSettingChange('registration_number', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    value={settings.address}
                    onChange={(e) => handleSettingChange('address', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => handleSettingChange('contact_email', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                  <input
                    type="tel"
                    value={settings.contact_phone}
                    onChange={(e) => handleSettingChange('contact_phone', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contributions' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Minimum Contribution Amounts</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Savings (₦)</label>
                  <input
                    type="number"
                    value={settings.minimum_savings}
                    onChange={(e) => handleSettingChange('minimum_savings', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Investment (₦)</label>
                  <input
                    type="number"
                    value={settings.minimum_investment}
                    onChange={(e) => handleSettingChange('minimum_investment', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Target Savings (₦)</label>
                  <input
                    type="number"
                    value={settings.minimum_target_savings}
                    onChange={(e) => handleSettingChange('minimum_target_savings', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-blue-500" />
                Administrative Charges
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registration Fee (₦)</label>
                  <input
                    type="number"
                    value={settings.registration_fee}
                    onChange={(e) => handleSettingChange('registration_fee', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Admin Fee (₦)</label>
                  <input
                    type="number"
                    value={settings.monthly_admin_fee}
                    onChange={(e) => handleSettingChange('monthly_admin_fee', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-blue-500" />
                Loan Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Cash Loan (₦)</label>
                  <input
                    type="number"
                    value={settings.max_cash_loan}
                    onChange={(e) => handleSettingChange('max_cash_loan', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Investment Loan Multiplier</label>
                  <input
                    type="number"
                    value={settings.investment_loan_multiplier}
                    onChange={(e) => handleSettingChange('investment_loan_multiplier', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Repayment Period (months)</label>
                  <input
                    type="number"
                    value={settings.default_repayment_period}
                    onChange={(e) => handleSettingChange('default_repayment_period', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Late Payment Fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.late_payment_fee}
                    onChange={(e) => handleSettingChange('late_payment_fee', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profit' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Profit Sharing Configuration</h3>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Profit Sharing Frequency</label>
                <select
                  value={settings.profit_sharing_frequency}
                  onChange={(e) => handleSettingChange('profit_sharing_frequency', e.target.value)}
                  className="w-full md:w-1/3 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Percent className="w-5 h-5 mr-2 text-blue-500" />
                Profit Deductions & Allocations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reserve Fund (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.reserve_fund_percentage}
                    onChange={(e) => handleSettingChange('reserve_fund_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Education Fund (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.education_fund_percentage}
                    onChange={(e) => handleSettingChange('education_fund_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Committee Bonus (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.committee_bonus_percentage}
                    onChange={(e) => handleSettingChange('committee_bonus_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bad Debt Reserve (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.bad_debt_reserve_percentage}
                    onChange={(e) => handleSettingChange('bad_debt_reserve_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">General Reserve (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.general_reserve_percentage}
                    onChange={(e) => handleSettingChange('general_reserve_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Bell className="w-5 h-5 mr-2 text-blue-500" />
                Notification Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                    <p className="text-xs text-gray-500">Receive notifications via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={(e) => handleSettingChange('email_notifications', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
                    <p className="text-xs text-gray-500">Receive notifications via SMS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.sms_notifications}
                    onChange={(e) => handleSettingChange('sms_notifications', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Days Before Due Date</label>
                  <input
                    type="number"
                    value={settings.reminder_days}
                    onChange={(e) => handleSettingChange('reminder_days', parseInt(e.target.value) || 0)}
                    className="w-full md:w-32 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agreements' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-500" />
                Agreement Templates
              </h3>
              <p className="text-sm text-gray-500">
                Update the content of the agreements. You can use HTML tags for formatting (e.g., &lt;b&gt;, &lt;p&gt;, &lt;h2&gt;).
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent Agreement Template</label>
                <textarea
                  value={settings.agent_agreement_template || ''}
                  onChange={(e) => handleSettingChange('agent_agreement_template', e.target.value)}
                  rows={10}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter HTML content for Agent Agreement..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Murabaha Contract Template</label>
                <textarea
                  value={settings.murabaha_contract_template || ''}
                  onChange={(e) => handleSettingChange('murabaha_contract_template', e.target.value)}
                  rows={10}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter HTML content for Murabaha Contract..."
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-500" />
                  Branding Colors
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color (Hex)</label>
                    <div className="flex space-x-2">
                      <input
                        type="color"
                        value={theme.primaryColor}
                        onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                        className="h-10 w-10 border-0 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.primaryColor}
                        onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color (Hex)</label>
                    <div className="flex space-x-2">
                      <input
                        type="color"
                        value={theme.secondaryColor}
                        onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                        className="h-10 w-10 border-0 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.secondaryColor}
                        onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-500" />
                  Logo Setup
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo Image URL</label>
                    <input
                      type="text"
                      value={theme.logoUrl}
                      onChange={(e) => setTheme({ ...theme, logoUrl: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  {theme.logoUrl && (
                    <div className="mt-4 p-4 border rounded-lg bg-gray-50 flex items-center justify-center">
                      <img src={theme.logoUrl} alt="Preview" className="max-h-16" />
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Changes to the theme will take effect the next time the page is reloaded.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'custom_fields' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-500" />
                Dynamic Form Fields
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Add custom fields to member registration forms. These fields will be collected dynamically and stored safely without requiring system updates.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 items-end border p-4 rounded-lg bg-gray-50">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Entity</label>
                  <select disabled value={newField.entity_type} className="w-full px-3 py-2 border rounded bg-gray-100">
                    <option>User</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Field Name (Label)</label>
                  <input type="text" placeholder="e.g. Next of Kin BVN" value={newField.field_name} onChange={e => setNewField({...newField, field_name: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Field Key (JSON)</label>
                  <input type="text" placeholder="e.g. nok_bvn" value={newField.field_key} onChange={e => setNewField({...newField, field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={newField.field_type} onChange={e => setNewField({...newField, field_type: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <div className="flex-1 flex items-center justify-center">
                    <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={newField.is_required} onChange={e => setNewField({...newField, is_required: e.target.checked})} className="rounded text-blue-600" />
                      <span>Required</span>
                    </label>
                  </div>
                  <button onClick={handleAddCustomField} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                </div>
              </div>

              {customFields.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Entity</th>
                        <th className="px-4 py-3">Label</th>
                        <th className="px-4 py-3">Key</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Required</th>
                        <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customFields.map((field) => (
                        <tr key={field.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{field.entity_type}</td>
                          <td className="px-4 py-3">{field.field_name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{field.field_key}</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{field.field_type}</span></td>
                          <td className="px-4 py-3">
                            {field.is_required ? <span className="text-red-500 font-medium">Yes</span> : <span className="text-gray-400">No</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleDeleteCustomField(field.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                  No custom fields defined yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
