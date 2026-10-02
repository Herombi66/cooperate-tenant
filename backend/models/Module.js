const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const Module = sequelize.define('Module', {
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
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique identifier for the module (e.g. members, contributions, loans)'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Human-readable display name (e.g. Members Directory, Contributions)'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'General',
    comment: 'Module category e.g. Operations, Financial, Administration, Compliance'
  },
  route_path: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Frontend route path associated with this module'
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'System modules cannot be deleted by administrators'
  }
}, {
  tableName: 'modules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Module;
