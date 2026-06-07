const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const LoanAgreement = sequelize.define('LoanAgreement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  loan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'loans',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('agent_agreement', 'murabaha_contract'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('accepted', 'rejected', 'pending'),
    allowNull: false,
    defaultValue: 'pending'
  },
  version: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '1.0'
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  action_timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'loan_agreements',
  timestamps: true,
  underscored: true
});

module.exports = LoanAgreement;
