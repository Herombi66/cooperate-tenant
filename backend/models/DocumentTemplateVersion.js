const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const DocumentTemplateVersion = sequelize.define('DocumentTemplateVersion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  template_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'document_templates',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  layout_config: {
    type: DataTypes.JSON,
    allowNull: false
  },
  change_summary: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'document_template_versions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['template_id', 'version'] }
  ]
});

module.exports = DocumentTemplateVersion;
