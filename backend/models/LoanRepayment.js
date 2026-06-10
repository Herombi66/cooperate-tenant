'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoanRepayment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define associations here
      LoanRepayment.belongsTo(models.Loan, {
        foreignKey: 'loan_id',
        as: 'loan'
      });

      LoanRepayment.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      LoanRepayment.belongsTo(models.User, {
        foreignKey: 'recorded_by',
        as: 'recordedBy'
      });
    }
  }

  LoanRepayment.init({
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
    loan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'loans',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    repayment_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    repayment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['cash', 'bank_transfer', 'salary_deduction', 'mobile_money', 'cheque', 'contribution_deduction']]
      }
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'verified',
      validate: {
        isIn: [['pending', 'verified', 'rejected']]
      }
    },
    recorded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    upload_batch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'upload_batches',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
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
    modelName: 'LoanRepayment',
    tableName: 'loan_repayments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['loan_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['repayment_date']
      },
      {
        fields: ['upload_batch_id']
      }
    ]
  });

  return LoanRepayment;
};
