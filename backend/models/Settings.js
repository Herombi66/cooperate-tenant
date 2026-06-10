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
      isIn: [['general', 'contributions', 'loans', 'profits', 'notifications']]
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
  general: ['cooperative_name', 'registration_number', 'address', 'contact_email', 'contact_phone', 'cooperative_logo'],
  contributions: ['minimum_savings', 'minimum_investment', 'minimum_target_savings', 'registration_fee', 'monthly_admin_fee'],
  loans: ['max_cash_loan', 'investment_loan_multiplier', 'default_repayment_period', 'late_payment_fee', 'agent_agreement_template', 'murabaha_contract_template'],
  profits: ['profit_sharing_frequency', 'reserve_fund_percentage', 'education_fund_percentage', 'committee_bonus_percentage', 'bad_debt_reserve_percentage', 'general_reserve_percentage'],
  notifications: ['email_notifications', 'sms_notifications', 'reminder_days']
};

// Validation helper
Settings.isValidCategory = function(category) {
  return Object.keys(this.CATEGORIES).includes(category);
};

Settings.isValidKeyForCategory = function(key, category) {
  return this.CATEGORIES[category] && this.CATEGORIES[category].includes(key);
};

module.exports = Settings;
