const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const CustomField = sequelize.define('CustomField', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenant_id: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  entity_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g., User, Loan, Contribution'
  },
  field_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'The display name, e.g., BVN Number'
  },
  field_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'The JSON key, e.g., bvn_number'
  },
  field_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'text',
    comment: 'text, number, date, select'
  },
  is_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of strings for select type fields'
  }
}, {
  tableName: 'custom_fields',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CustomField;
