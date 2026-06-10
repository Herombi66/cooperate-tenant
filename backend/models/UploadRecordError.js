const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const UploadRecordError = sequelize.define('UploadRecordError', {
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
  row_number: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  record_key: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  error_code: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fields: {
    type: DataTypes.JSON,
    allowNull: true
  },
  raw_record: {
    type: DataTypes.JSON,
    allowNull: true
  },
  corrected_record: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'FAILED',
    validate: {
      isIn: [['FAILED', 'RESOLVED', 'IGNORED']]
    }
  },
  resolved_at: {
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
  tableName: 'upload_record_errors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = UploadRecordError;
