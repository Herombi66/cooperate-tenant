import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Save, RefreshCw, DollarSign,
  Percent, CreditCard, Bell, Loader, FileText
} from 'lucide-react';
import settingsService, { Settings as SystemSettings } from '../services/settingsService';
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
      const hasChangesNow = Object.keys(settings).some(key => {
        return settings[key as keyof SystemSettings] !== originalSettings[key as keyof SystemSettings];
      });
      setHasChanges(hasChangesNow);
    }
  }, [settings, originalSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const changes: Record<string, any> = {};
      Object.keys(settings).forEach(key => {
        if (settings[key as keyof SystemSettings] !== originalSettings[key as keyof SystemSettings]) {
          changes[key] = settings[key as keyof SystemSettings];
        }
      });

      if (Object.keys(changes).length === 0) {
        toast('No changes to save');
        return;
      }

      const result = await settingsService.updateSettings(changes);

      if (result.success) {
        toast.success('Settings saved successfully!');
        setOriginalSettings({ ...settings });
        setHasChanges(false);
      } else {
        toast.error(result.message || 'Failed to save settings');
      }
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
      </div>
    </motion.div>
  );
};
