const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const ActivityLog = sequelize.define('ActivityLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  user_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  user_role: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  action: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  resource_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  resource_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'activity_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Helper function to log activity
ActivityLog.logActivity = async function(user, action, resourceType, resourceId = null, description = null, metadata = null, req = null) {
  try {
    const logData = {
      user_id: user?.id || null,
      user_name: user?.name || null,
      user_role: user?.role || null,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      description,
      metadata,
      ip_address: req?.ip || req?.connection?.remoteAddress || null,
      user_agent: (req && typeof req.get === 'function' ? req.get('User-Agent') : null) || null
    };

    await ActivityLog.create(logData);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking the main functionality
  }
};

module.exports = ActivityLog;
