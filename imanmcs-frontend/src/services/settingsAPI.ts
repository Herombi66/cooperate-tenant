import api from './api';

export interface SettingsData {
  cooperative_name: string;
  registration_number: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  minimum_savings: number;
  minimum_investment: number;
  minimum_target_savings: number;
  registration_fee: number;
  monthly_admin_fee: number;
  max_cash_loan: number;
  investment_loan_multiplier: number;
  default_repayment_period: number;
  late_payment_fee: number;
  profit_sharing_frequency: string;
  reserve_fund_percentage: number;
  education_fund_percentage: number;
  committee_bonus_percentage: number;
  bad_debt_reserve_percentage: number;
  general_reserve_percentage: number;
  email_notifications: boolean;
  sms_notifications: boolean;
  reminder_days: number;
}

const settingsAPI = {
  getSettings: async (): Promise<SettingsData> => {
    const response = await api.get('/settings');
    return response.data.data;
  },

  updateSettings: async (updates: Partial<SettingsData>): Promise<SettingsData> => {
    const response = await api.put('/settings', updates);
    return response.data.data;
  }
};

export default settingsAPI;
