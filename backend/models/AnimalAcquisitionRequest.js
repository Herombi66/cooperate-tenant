module.exports = (sequelize, DataTypes) => {
  const AnimalAcquisitionRequest = sequelize.define(
    'AnimalAcquisitionRequest',
    {
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
      member_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      animal_category: {
        type: DataTypes.STRING(40),
        allowNull: false
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      delivery_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      delivery_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      reason_html: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      reason_text: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'draft'
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      rejected_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      rejected_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      tableName: 'animal_acquisition_requests',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      paranoid: true,
      deletedAt: 'deleted_at'
    }
  );

  return AnimalAcquisitionRequest;
};
