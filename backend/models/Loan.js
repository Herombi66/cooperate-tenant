const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const Loan = sequelize.define('Loan', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Flexible schema field for custom tenant data'
  },
  tenant_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'default'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  loan_type: {
    type: DataTypes.ENUM('cash', 'investment', 'educational', 'venture', 'emergency'),
    allowNull: false
  },
  amount_requested: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  amount_approved: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  interest_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0 // Sharia-compliant, no interest
  },
  repayment_period_months: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  monthly_repayment: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  total_repayment: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'waiting_disbursement', 'approved', 'rejected', 'active', 'disbursed', 'defaulted', 'awaiting_admin_review', 'completed'),
    defaultValue: 'pending'
  },
  application_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  approval_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  disbursement_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  first_repayment_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  disbursed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  collateral_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  guarantor_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  guarantor_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  guarantor_relationship: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  guarantor_psn: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  guarantor_approved: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: null
  },
  guarantor_response_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  guarantor_response_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payslip_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'loans',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['status'] },
    { fields: ['created_at'] },
    { fields: ['user_id'] }
  ]
});

// Instance methods
Loan.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

module.exports = Loan;
