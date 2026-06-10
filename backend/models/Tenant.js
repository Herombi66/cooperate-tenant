const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.STRING(100),
    primaryKey: true,
    allowNull: false,
    comment: 'Unique slug for the tenant, e.g., default, coop1'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  domain: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    comment: 'Custom domain, e.g., coop1.com'
  },
  subdomain: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    comment: 'Subdomain on main platform, e.g., coop1'
  },
  cooperative_type: {
    type: DataTypes.ENUM('islamic', 'conventional'),
    allowNull: false,
    defaultValue: 'islamic'
  },
  theme: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'UI configuration: primary_color, secondary_color, logo_url, etc.'
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      landing_page: true,
      loans: true,
      layyah: true,
      expenses: true,
      profit_sharing: true,
      withdrawals: true
    },
    comment: 'Toggleable modular features for this tenant'
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'pending'),
    defaultValue: 'active'
  }
}, {
  tableName: 'tenants',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Tenant;
