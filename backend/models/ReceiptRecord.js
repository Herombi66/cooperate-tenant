const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const ReceiptRecord = sequelize.define('ReceiptRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  receipt_number: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  transaction_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Bank Transfer'
  },
  snapshot_data: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Frozen copy of the transaction details and template layout at issuance'
  },
  template_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'receipt_templates',
      key: 'id'
    }
  },
  template_version: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  verification_hash: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  issued_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'receipt_records',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['receipt_number'] },
    { fields: ['transaction_type', 'transaction_id'] },
    { fields: ['member_id'] },
    { fields: ['verification_hash'] }
  ]
});

module.exports = ReceiptRecord;
