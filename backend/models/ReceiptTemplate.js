const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const ReceiptTemplate = sequelize.define('ReceiptTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'default',
    validate: {
      isIn: [['default', 'contribution', 'loan_repayment', 'savings', 'investment', 'membership', 'expense']]
    }
  },
  paper_size: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'A4',
    validate: {
      isIn: [['A4', 'A5', 'thermal_80', 'thermal_58']]
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  layout_config: {
    type: DataTypes.JSON,
    allowNull: false
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'receipt_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['type'] },
    { fields: ['is_active'] },
    { fields: ['is_default'] }
  ]
});

module.exports = ReceiptTemplate;
