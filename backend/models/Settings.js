const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenant_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'default'
  },
  key: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  value: {
    type: DataTypes.JSON,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: [['general', 'contributions', 'loans', 'investments', 'profits', 'notifications', 'subscription', 'modules', 'ai']]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['key']
    },
    {
      fields: ['category']
    }
  ]
});

// Define valid categories and their default values
Settings.CATEGORIES = {
  general: ['cooperative_name', 'registration_number', 'address', 'contact_email', 'contact_phone', 'contact_website', 'support_phone', 'cooperative_logo', 'currency_code', 'currency_symbol', 'currency_name'],
  contributions: ['minimum_savings', 'minimum_target_savings', 'target_savings_min_period', 'allow_voluntary_savings', 'savings_withdrawal_lock_months', 'max_savings_withdrawal_percent', 'registration_fee', 'auto_deduct_registration_fee', 'monthly_admin_fee', 'auto_deduct_monthly_admin_fee'],
  loans: ['max_loan_amount', 'max_cash_loan', 'investment_loan_multiplier', 'default_repayment_period', 'min_membership_months_for_loan', 'loan_interest_rate', 'late_payment_fee', 'max_active_loans_per_member', 'require_guarantors', 'min_guarantors_count', 'agent_agreement_template', 'murabaha_contract_template'],
  investments: ['minimum_investment', 'investment_lock_period_months', 'expected_roi_percent', 'allow_early_liquidation', 'early_termination_penalty_percent'],
  profits: ['profit_sharing_frequency', 'reserve_fund_percentage', 'education_fund_percentage', 'committee_bonus_percentage', 'bad_debt_reserve_percentage', 'general_reserve_percentage', 'member_dividend_percentage'],
  notifications: ['email_notifications', 'sms_notifications', 'reminder_days'],
  subscription: [
    'subscription_status',
    'subscription_plan',
    'subscription_expiry',
    'subscription_billing_cycle',
    'subscription_amount_payable',
    'subscription_currency',
    'subscription_rate_per_member',
    'subscription_member_bracket',
    'subscription_payment_status',
    'subscription_payment_method',
    'subscription_next_billing_date',
    'subscription_invoice_reference',
    'subscription_member_limit',
    'subscription_billing_notes',
    'subscription_pricing_tiers',
    'subscription_payment_instructions'
  ],
  modules: ['enabled_modules'],
  ai: ['ai_settings']
};

// Validation helper
Settings.isValidCategory = function(category) {
  return Object.keys(this.CATEGORIES).includes(category);
};

Settings.isValidKeyForCategory = function(key, category) {
  return this.CATEGORIES[category] && this.CATEGORIES[category].includes(key);
};

module.exports = Settings;
