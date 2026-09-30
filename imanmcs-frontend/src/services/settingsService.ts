import api from './api';

export interface EnabledModules {
  loans: boolean;
  contributions: boolean;
  investments: boolean;
  layyah: boolean;
  expenses: boolean;
  profit_sharing: boolean;
  withdrawals: boolean;
  receipt_designer: boolean;
  document_designer: boolean;
  member_portal: boolean;
}

export interface AISettings {
  enabled: boolean;
  provider: 'gemini' | 'openai' | 'anthropic' | 'custom';
  model: string;
  api_key: string;
  loan_risk_scoring: boolean;
  financial_advisor: boolean;
  document_ocr: boolean;
  auto_reporting: boolean;
}

export interface SubscriptionPricingTier {
  id: string;
  name: string;
  rate_per_member?: number | null;
  monthly_price?: number;
  annual_price?: number;
  currency: string;
  min_members?: number;
  max_members?: number;
  member_limit?: number;
  member_bracket?: string;
  badge?: string;
  popular?: boolean;
  description: string;
  features: string[];
}

export interface SubscriptionPaymentInstructions {
  bank_name: string;
  account_name: string;
  account_number: string;
  sort_code?: string;
  payment_reference_format?: string;
  support_email?: string;
  support_phone?: string;
}

export interface Settings {
  // 1. Name
  cooperative_name: string;
  registration_number?: string;

  // 2. Logo
  cooperative_logo?: string | null;

  // 3. Address
  address: string;

  // 4. Contact details
  contact_email: string;
  contact_phone: string;
  contact_website?: string;
  support_phone?: string;

  // 5. Currency
  currency_code: string;
  currency_symbol: string;
  currency_name: string;

  // 6. Contribution rules
  minimum_savings: number;
  minimum_target_savings: number;
  target_savings_min_period?: number;
  allow_voluntary_savings?: boolean;
  savings_withdrawal_lock_months?: number;
  max_savings_withdrawal_percent?: number;

  // 7. Loan rules
  max_loan_amount?: number;
  max_cash_loan: number;
  investment_loan_multiplier: number;
  default_repayment_period: number;
  min_membership_months_for_loan?: number;
  loan_interest_rate?: number;
  late_payment_fee: number;
  max_active_loans_per_member?: number;
  require_guarantors?: boolean;
  min_guarantors_count?: number;

  // 8. Investment rules
  minimum_investment: number;
  investment_lock_period_months?: number;
  expected_roi_percent?: number;
  allow_early_liquidation?: boolean;
  early_termination_penalty_percent?: number;

  // 9. Profit distribution rules
  profit_sharing_frequency: 'monthly' | 'quarterly' | 'bi-annually' | 'annually';
  reserve_fund_percentage: number;
  education_fund_percentage: number;
  committee_bonus_percentage: number;
  bad_debt_reserve_percentage: number;
  general_reserve_percentage: number;
  member_dividend_percentage?: number;

  // 10. Registration fee
  registration_fee: number;
  auto_deduct_registration_fee?: boolean;

  // 11. Monthly administrative fee
  monthly_admin_fee: number;
  auto_deduct_monthly_admin_fee?: boolean;

  // 12. Subscription status & Plan Tier
  subscription_status?: 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled';
  subscription_plan?: string;

  // 13. Subscription expiry & Billing Specifications
  subscription_expiry?: string;
  subscription_billing_cycle?: 'monthly' | 'annual';
  subscription_amount_payable?: number;
  subscription_rate_per_member?: number;
  subscription_member_bracket?: string;
  subscription_currency?: string;
  subscription_payment_status?: 'paid' | 'pending' | 'overdue' | 'waived';
  subscription_payment_method?: string;
  subscription_next_billing_date?: string;
  subscription_invoice_reference?: string;
  subscription_member_limit?: number;
  subscription_billing_notes?: string;
  subscription_pricing_tiers?: SubscriptionPricingTier[];
  subscription_payment_instructions?: SubscriptionPaymentInstructions;

  // 14. Enabled modules
  enabled_modules?: EnabledModules;

  // 15. AI settings
  ai_settings?: AISettings;

  // Notification Settings
  email_notifications?: boolean;
  sms_notifications?: boolean;
  reminder_days?: number;

  // Agreement Templates
  agent_agreement_template?: string;
  murabaha_contract_template?: string;
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

  async updateSettings(updates: Partial<Settings>): Promise<{ success: boolean; message: string; settings?: Settings }> {
    try {
      const response = await api.put<{ success: boolean; message: string; settings?: Settings; data?: any }>(this.apiUrl, updates);
      return {
        success: response.data.success,
        message: response.data.message || (response.data.success ? 'Settings updated successfully' : 'Failed to update settings'),
        settings: response.data.settings || response.data.data
      };
    } catch (error: any) {
      console.error('Settings update error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update settings');
    }
  }

  async uploadLogo(file: File): Promise<{ success: boolean; logoUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await api.post<{ success: boolean; data?: { logo: string }; logo?: string }>(
        `${this.apiUrl}/logo`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      const logoUrl = response.data.data?.logo || response.data.logo || '';
      return {
        success: response.data.success,
        logoUrl
      };
    } catch (error: any) {
      console.error('Logo upload error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload logo');
    }
  }

  async resetSettings(): Promise<{ success: boolean; message: string; settings?: Settings }> {
    try {
      const response = await api.post<{ success: boolean; message: string; settings?: Settings; data?: any }>(`${this.apiUrl}/reset`);
      return {
        success: response.data.success,
        message: response.data.message || 'Settings reset successfully',
        settings: response.data.settings || response.data.data
      };
    } catch (error: any) {
      console.error('Settings reset error:', error);
      throw new Error(error.response?.data?.message || 'Failed to reset settings');
    }
  }
}

export const settingsService = new SettingsService();
export default settingsService;
