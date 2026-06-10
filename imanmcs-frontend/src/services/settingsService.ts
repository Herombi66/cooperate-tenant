import api from './api';

export interface Settings {
  // General Settings
  cooperative_name: string;
  registration_number: string;
  address: string;
  contact_email: string;
  contact_phone: string;

  // Contribution Settings
  minimum_savings: number;
  minimum_investment: number;
  minimum_target_savings: number;
  registration_fee: number;
  monthly_admin_fee: number;

  // Loan Settings
  max_cash_loan: number;
  investment_loan_multiplier: number;
  default_repayment_period: number;
  late_payment_fee: number;

  // Profit Sharing Settings
  profit_sharing_frequency: 'monthly' | 'quarterly' | 'annually';
  reserve_fund_percentage: number;
  education_fund_percentage: number;
  committee_bonus_percentage: number;
  bad_debt_reserve_percentage: number;
  general_reserve_percentage: number;

  // Notification Settings
  email_notifications: boolean;
  sms_notifications: boolean;
  reminder_days: number;

  // Agreement Templates
  agent_agreement_template: string;
  murabaha_contract_template: string;
}

export interface SettingsResponse {
  success: boolean;
  data?: Settings;
  settings?: Settings;
  metadata?: {
    totalSettings: number;
    categories: number;
    byCategory?: any;
  };
  message?: string;
}

class SettingsService {
  private apiUrl = '/settings';

  async getSettings(): Promise<Settings> {
    try {
      const response = await api.get<SettingsResponse>(this.apiUrl);
      if (response.data.success) {
        return (response.data.settings || response.data.data) as Settings;
      }
      throw new Error('Failed to fetch settings');
    } catch (error) {
      console.error('Settings fetch error:', error);
      throw error;
    }
  }

  async updateSettings(updates: Partial<Settings>): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.put<{ success: boolean; message: string; data?: any }>(this.apiUrl, updates);
      return {
        success: response.data.success,
        message: response.data.message || (response.data.success ? 'Settings updated successfully' : 'Failed to update settings')
      };
    } catch (error: any) {
      console.error('Settings update error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update settings');
    }
  }

  async resetSettings(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/reset`);
      return {
        success: response.data.success,
        message: response.data.message || 'Settings reset successfully'
      };
    } catch (error: any) {
      console.error('Settings reset error:', error);
      throw new Error(error.response?.data?.message || 'Failed to reset settings');
    }
  }
}

export const settingsService = new SettingsService();
export default settingsService;
