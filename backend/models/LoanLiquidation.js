const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const LoanLiquidation = sequelize.define('LoanLiquidation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  loan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'loans', key: 'id' }
  },
  member_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  member_psn: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  member_name: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  admin_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  admin_role: {
    type: DataTypes.STRING(40),
    allowNull: true
  },
  admin_name: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  loan_repayment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'loan_repayments', key: 'id' }
  },
  contribution_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'contributions', key: 'id' }
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  loan_balance_before: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  loan_balance_after: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  contribution_balance_before: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  contribution_balance_after: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'loan_liquidations',
  timestamps: false
});

module.exports = LoanLiquidation;

