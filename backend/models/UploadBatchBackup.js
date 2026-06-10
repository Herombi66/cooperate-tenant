const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const UploadBatchBackup = sequelize.define('UploadBatchBackup', {
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
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'upload_batches', key: 'id' }
  },
  resource_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  resource_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  previous_state: {
    type: DataTypes.JSON,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'upload_batch_backups',
  timestamps: false
});

module.exports = UploadBatchBackup;

