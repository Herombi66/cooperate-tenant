const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const AuditNote = sequelize.define('AuditNote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  auditor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  auditor_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  entity_type: {
    type: DataTypes.ENUM(
      'transaction',
      'member',
      'loan',
      'report',
      'contribution',
      'expense',
      'profit_share',
      'reconciliation',
      'general'
    ),
    allowNull: false,
    defaultValue: 'general'
  },
  entity_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('open', 'under_review', 'resolved', 'closed'),
    defaultValue: 'open',
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSON,
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
  tableName: 'audit_notes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['auditor_id'] },
    { fields: ['entity_type'] },
    { fields: ['entity_id'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

AuditNote.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

module.exports = AuditNote;
