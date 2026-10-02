const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const RolePermission = sequelize.define('RolePermission', {
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
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'roles',
      key: 'id'
    }
  },
  module_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'modules',
      key: 'id'
    }
  },
  module_key: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Redundant module key for faster lookups without joins'
  },
  can_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  can_write: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  can_edit: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  can_delete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  permission_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Legacy permission reference for backward compatibility'
  }
}, {
  tableName: 'role_permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = RolePermission;
