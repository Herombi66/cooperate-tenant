'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */

  }

  Notification.init({
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'guarantor_request, loan_approved, loan_rejected, etc.'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional structured data for the notification'
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    broadcast_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'broadcast_messages',
        key: 'id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: false, // We manually set created_at
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['is_read']
      },
      {
        fields: ['created_at']
      }
    ]
  });
  return Notification;
};
