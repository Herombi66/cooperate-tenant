const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

// Import models
const User = require('./User');
const MembershipApplication = require('./MembershipApplication');
const Contribution = require('./Contribution');
const Loan = require('./Loan');
const Expense = require('./Expense');
const ProfitShare = require('./ProfitShare');
const Notification = require('./Notification')(sequelize, DataTypes);
const BroadcastMessage = require('./BroadcastMessage');
const LoanRepayment = require('./LoanRepayment')(sequelize, DataTypes);
const ActivityLog = require('./ActivityLog');
const EmailLog = require('./EmailLog');
const Settings = require('./Settings');
const LayyahApplication = require('./LayyahApplication')(sequelize, DataTypes);
const AnimalAcquisitionRequest = require('./AnimalAcquisitionRequest')(sequelize, DataTypes);
const LoanAgreement = require('./LoanAgreement');
const ContributionWithdrawal = require('./ContributionWithdrawal');
const Complaint = require('./Complaint');
const DirectMessage = require('./DirectMessage');
const EducationalDocument = require('./EducationalDocument');
const ContributionIncreaseRequest = require('./ContributionIncreaseRequest');
const LoanLiquidation = require('./LoanLiquidation');
const UploadBatch = require('./UploadBatch');
const UploadRecordError = require('./UploadRecordError');
const UploadBatchBackup = require('./UploadBatchBackup');

// Platform and Tenant Models
const Tenant = require('./Tenant');
const CustomField = require('./CustomField');
const PlatformAdmin = require('./PlatformAdmin');

// Define associations (only once)
User.belongsTo(MembershipApplication, {
  foreignKey: 'membership_application_id',
  as: 'membershipApplication'
});

MembershipApplication.hasOne(User, {
  foreignKey: 'membership_application_id',
  as: 'user'
});

ContributionIncreaseRequest.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

ContributionIncreaseRequest.belongsTo(MembershipApplication, {
  foreignKey: 'membership_application_id',
  as: 'membershipApplication'
});

ContributionIncreaseRequest.belongsTo(User, {
  foreignKey: 'reviewed_by',
  as: 'reviewedBy'
});

User.hasMany(ContributionIncreaseRequest, {
  foreignKey: 'user_id',
  as: 'contributionIncreaseRequests'
});

MembershipApplication.hasMany(ContributionIncreaseRequest, {
  foreignKey: 'membership_application_id',
  as: 'contributionIncreaseRequests'
});

UploadBatch.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'createdBy'
});

User.hasMany(UploadBatch, {
  foreignKey: 'created_by',
  as: 'uploadBatches'
});

UploadRecordError.belongsTo(UploadBatch, {
  foreignKey: 'batch_id',
  as: 'batch'
});

UploadBatch.hasMany(UploadRecordError, {
  foreignKey: 'batch_id',
  as: 'errors'
});

UploadBatchBackup.belongsTo(UploadBatch, {
  foreignKey: 'batch_id',
  as: 'batch'
});

UploadBatch.hasMany(UploadBatchBackup, {
  foreignKey: 'batch_id',
  as: 'backups'
});

// Contribution associations
Contribution.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(Contribution, {
  foreignKey: 'user_id',
  as: 'contributions'
});

// ContributionWithdrawal associations
ContributionWithdrawal.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

ContributionWithdrawal.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approvedBy'
});

User.hasMany(ContributionWithdrawal, {
  foreignKey: 'user_id',
  as: 'contributionWithdrawals'
});

// Loan associations
Loan.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Loan.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approvedBy'
});

Loan.belongsTo(User, {
  foreignKey: 'disbursed_by',
  as: 'disbursedBy'
});

User.hasMany(Loan, {
  foreignKey: 'user_id',
  as: 'loans'
});

User.hasMany(Loan, {
  foreignKey: 'approved_by',
  as: 'approvedLoans'
});

User.hasMany(Loan, {
  foreignKey: 'disbursed_by',
  as: 'disbursedLoans'
});

//// Expense associations (approved/paid by users)
Expense.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approvedBy'
});

Expense.belongsTo(User, {
  foreignKey: 'paid_by',
  as: 'paidBy'
});

User.hasMany(Expense, {
  foreignKey: 'approved_by',
  as: 'approvedExpenses'
});

User.hasMany(Expense, {
  foreignKey: 'paid_by',
  as: 'paidExpenses'
});

// Notification associations
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications'
});

// Loan Repayment associations
LoanRepayment.belongsTo(Loan, {
  foreignKey: 'loan_id',
  as: 'loan'
});

LoanRepayment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

LoanRepayment.belongsTo(User, {
  foreignKey: 'recorded_by',
  as: 'recordedBy'
});

LoanRepayment.belongsTo(UploadBatch, {
  foreignKey: 'upload_batch_id',
  as: 'uploadBatch'
});

Loan.hasMany(LoanRepayment, {
  foreignKey: 'loan_id',
  as: 'repayments'
});

User.hasMany(LoanRepayment, {
  foreignKey: 'user_id',
  as: 'loanRepayments'
});

// Loan Liquidation associations
LoanLiquidation.belongsTo(Loan, {
  foreignKey: 'loan_id',
  as: 'loan'
});

LoanLiquidation.belongsTo(User, {
  foreignKey: 'member_user_id',
  as: 'member'
});

LoanLiquidation.belongsTo(User, {
  foreignKey: 'admin_user_id',
  as: 'admin'
});

LoanLiquidation.belongsTo(LoanRepayment, {
  foreignKey: 'loan_repayment_id',
  as: 'loanRepayment'
});

LoanLiquidation.belongsTo(Contribution, {
  foreignKey: 'contribution_id',
  as: 'contribution'
});

Loan.hasMany(LoanLiquidation, {
  foreignKey: 'loan_id',
  as: 'liquidations'
});

User.hasMany(LoanLiquidation, {
  foreignKey: 'member_user_id',
  as: 'loanLiquidations'
});

// Activity Log associations
ActivityLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(ActivityLog, {
  foreignKey: 'user_id',
  as: 'activityLogs'
});

// Profit Share associations
ProfitShare.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

ProfitShare.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approvedBy'
});

ProfitShare.belongsTo(User, {
  foreignKey: 'paid_by',
  as: 'paidBy'
});

User.hasMany(ProfitShare, {
  foreignKey: 'user_id',
  as: 'profitShares'
});

User.hasMany(ProfitShare, {
  foreignKey: 'approved_by',
  as: 'approvedProfitShares'
});

User.hasMany(ProfitShare, {
  foreignKey: 'paid_by',
  as: 'paidProfitShares'
});

// Layyah Application associations
LayyahApplication.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

LayyahApplication.belongsTo(User, {
  foreignKey: 'group_leader_id',
  as: 'groupLeader'
});

LayyahApplication.hasMany(LayyahApplication, {
  foreignKey: 'group_id',
  as: 'groupMembers',
  constraints: false
});

User.hasMany(LayyahApplication, {
  foreignKey: 'user_id',
  as: 'layyahApplications'
});

User.hasMany(LayyahApplication, {
  foreignKey: 'group_leader_id',
  as: 'ledLayyahGroups'
});

AnimalAcquisitionRequest.belongsTo(User, {
  foreignKey: 'member_user_id',
  as: 'member'
});

AnimalAcquisitionRequest.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'createdBy'
});

AnimalAcquisitionRequest.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approvedBy'
});

AnimalAcquisitionRequest.belongsTo(User, {
  foreignKey: 'rejected_by',
  as: 'rejectedBy'
});

User.hasMany(AnimalAcquisitionRequest, {
  foreignKey: 'member_user_id',
  as: 'animalAcquisitionRequests'
});

User.hasMany(AnimalAcquisitionRequest, {
  foreignKey: 'created_by',
  as: 'createdAnimalAcquisitionRequests'
});

// Loan Agreement associations
LoanAgreement.belongsTo(Loan, {
  foreignKey: 'loan_id',
  as: 'loan'
});

LoanAgreement.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Loan.hasMany(LoanAgreement, {
  foreignKey: 'loan_id',
  as: 'agreements'
});

User.hasMany(LoanAgreement, {
  foreignKey: 'user_id',
  as: 'agreements'
});

// Broadcast associations
BroadcastMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
User.hasMany(BroadcastMessage, { foreignKey: 'sender_id' });

BroadcastMessage.hasMany(Notification, { foreignKey: 'broadcast_id', as: 'notifications' });
Notification.belongsTo(BroadcastMessage, { foreignKey: 'broadcast_id', as: 'broadcast' });

// Complaint associations
Complaint.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Complaint.belongsTo(User, {
  foreignKey: 'assigned_to',
  as: 'assignedTo'
});

User.hasMany(Complaint, {
  foreignKey: 'user_id',
  as: 'complaints'
});

// Educational document associations
EducationalDocument.belongsTo(Loan, {
  foreignKey: 'loan_id',
  as: 'loan'
});

EducationalDocument.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Loan.hasMany(EducationalDocument, {
  foreignKey: 'loan_id',
  as: 'educationDocuments'
});

User.hasMany(EducationalDocument, {
  foreignKey: 'user_id',
  as: 'educationDocuments'
});

User.hasMany(Complaint, {
  foreignKey: 'assigned_to',
  as: 'assignedComplaints'
});

// Direct message associations
DirectMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
DirectMessage.belongsTo(User, { foreignKey: 'recipient_id', as: 'recipient' });
User.hasMany(DirectMessage, { foreignKey: 'sender_id', as: 'sentMessages' });
User.hasMany(DirectMessage, { foreignKey: 'recipient_id', as: 'receivedMessages' });

// Export models
const models = {
  User,
  MembershipApplication,
  Contribution,
  ContributionIncreaseRequest,
  Loan,
  Expense,
  ProfitShare,
  Notification,
  LoanRepayment,
  LoanLiquidation,
  ActivityLog,
  Settings,
  LayyahApplication,
  AnimalAcquisitionRequest,
  LoanAgreement,
  ContributionWithdrawal,
  BroadcastMessage,
  Complaint,
  DirectMessage,
  EducationalDocument,
  UploadBatch,
  UploadBatchBackup,
  UploadRecordError,
  EmailLog,
  Tenant,
  CustomField,
  PlatformAdmin,
  sequelize
};

module.exports = models;
