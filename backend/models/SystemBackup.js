const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const SystemBackup = sequelize.define('SystemBackup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  filepath: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  format: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'json',
    validate: {
      isIn: [['json', 'sql', 'csv']]
    }
  },
  file_size: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  },
  total_records: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  table_counts: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'completed',
    validate: {
      isIn: [['completed', 'in_progress', 'failed']]
    }
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'system_backups',
  timestamps: false
});

module.exports = SystemBackup;
