const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const ProfitShare = sequelize.define('ProfitShare', {
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
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  period: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Format: YYYY-Q1/Q2/Q3/Q4 or YYYY-M01/M02/etc'
  },
  total_investment_pool: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  total_profit: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  member_investment: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  share_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  profit_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('calculated', 'approved', 'paid', 'cancelled'),
    defaultValue: 'calculated'
  },
  calculated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  approved_at: {
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
  paid_at: {
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
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'profit_sharing',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['period']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
ProfitShare.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

module.exports = ProfitShare;
