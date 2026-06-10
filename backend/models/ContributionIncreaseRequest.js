const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const ContributionIncreaseRequest = sequelize.define('ContributionIncreaseRequest', {
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
    references: { model: 'users', key: 'id' }
  },
  membership_application_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'membership_applications', key: 'id' }
  },
  current_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  requested_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'PENDING',
    validate: {
      isIn: [['PENDING', 'APPROVED', 'REJECTED']]
    }
  },
  member_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  review_comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  supporting_document_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  supporting_document_name: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  supporting_document_mime: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  supporting_document_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  requested_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  reviewed_at: {
    type: DataTypes.DATE,
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
  tableName: 'contribution_increase_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'uniq_contrib_increase_pending_per_membership',
      unique: true,
      fields: ['membership_application_id'],
      where: { status: 'PENDING' }
    }
  ]
});

module.exports = ContributionIncreaseRequest;
