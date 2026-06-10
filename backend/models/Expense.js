const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const Expense = sequelize.define('Expense', {
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
  description: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending'
  },
  expense_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  recipient: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  payment_method: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  receipt_number: {
    type: DataTypes.STRING(100),
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
  approval_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paid_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of file paths/URLs for receipts and supporting documents'
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12
    }
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 2020,
      max: 2050
    }
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
  tableName: 'expenses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['status'] },
    { fields: ['category'] },
    { fields: ['created_at'] },
    { fields: ['year', 'month'] }
  ]
});

// Instance methods
Expense.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

module.exports = Expense;
