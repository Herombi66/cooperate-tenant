const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const DirectMessage = sequelize.define('DirectMessage', {
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
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  recipient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed', 'read'),
    allowNull: false,
    defaultValue: 'sent'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  attachment_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  attachment_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  attachment_mime: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  attachment_size: {
    type: DataTypes.INTEGER,
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
  tableName: 'direct_messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['recipient_id'] },
    { fields: ['sender_id'] },
    { fields: ['status'] }
  ]
});

module.exports = DirectMessage;
