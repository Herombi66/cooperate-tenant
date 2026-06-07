'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LayyahApplication extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LayyahApplication.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      LayyahApplication.belongsTo(models.User, { foreignKey: 'group_leader_id', as: 'groupLeader' });
      LayyahApplication.hasMany(models.LayyahApplication, {
        foreignKey: 'group_id',
        as: 'groupMembers',
        constraints: false
      });
    }
  }

  LayyahApplication.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    kind: {
      type: DataTypes.ENUM('individual', 'group'),
      allowNull: false,
      defaultValue: 'individual'
    },
    animal_category: {
      type: DataTypes.ENUM('ram', 'sheep', 'goat', 'cow'),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    price_min: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    price_max: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    applied_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    amount_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected', 'disbursed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'layyah_applications',
        key: 'id'
      }
    },
    group_leader_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    group_member_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    group_role: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'member'
    },
    applicant_name: {
      type: DataTypes.STRING,
      allowNull: true // Will be populated from user relation
    },
    user_psn: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    approved_by: {
      type: DataTypes.STRING,
      allowNull: true // Store admin name who approved
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'LayyahApplication',
    tableName: 'layyah_applications',
    timestamps: true,
    paranoid: false, // No soft deletes for now
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['animal_category']
      },
      {
        fields: ['kind']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['applied_amount']
      },
      {
        fields: ['user_id', 'created_at']
      }
    ]
  });

  return LayyahApplication;
};
