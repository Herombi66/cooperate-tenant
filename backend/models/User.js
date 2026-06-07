const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  membership_application_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'membership_applications',
      key: 'id'
    }
    // Removed unique constraint to allow multiple accounts per member
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'member'
  },
  additional_role: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    comment: 'Additional administrative role without affecting core membership'
  },
  is_default_password: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },
  can_liquidate_loans: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  can_create_animal_requests: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
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
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true, // Enable soft delete
  deletedAt: 'deleted_at'
});

// Define associations after model definition

// Instance methods
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password_hash;
  return values;
};

// Virtual fields for backward compatibility
User.prototype.getPsn = function() {
  return this.membershipApplication?.psn;
};

User.prototype.getName = function() {
  return this.membershipApplication?.name;
};

User.prototype.getEmail = function() {
  return this.membershipApplication?.email;
};

User.prototype.getPhone = function() {
  return this.membershipApplication?.phone;
};

User.prototype.getFacilityName = function() {
  return this.membershipApplication?.facility_name;
};

User.prototype.getNextOfKinName = function() {
  return this.membershipApplication?.next_of_kin_name;
};

User.prototype.getNextOfKinPhone = function() {
  return this.membershipApplication?.next_of_kin_phone;
};

User.prototype.getSavings = function() {
  return this.membershipApplication?.savings;
};

User.prototype.getInvestment = function() {
  return this.membershipApplication?.investment;
};

User.prototype.getTargetSaving = function() {
  return this.membershipApplication?.target_saving;
};

User.prototype.getTargetPeriod = function() {
  return this.membershipApplication?.target_period;
};

module.exports = User;
