const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const PlatformAdmin = sequelize.define('PlatformAdmin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'super_admin'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'platform_admins',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

PlatformAdmin.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password_hash;
  return values;
};

module.exports = PlatformAdmin;
