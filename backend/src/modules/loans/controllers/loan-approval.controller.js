/**
 * Loan Approval Controller
 * Handles approve, reject, reverse, bulk update, and liquidation logic.
 */
const { Loan, User, Contribution, LoanRepayment, LoanLiquidation, Notification, MembershipApplication, LoanAgreement, ActivityLog } = require('../../../../models');
const emailService = process.env.NODE_ENV === 'test'
  ? { sendLoanApprovedEmail: async () => {}, sendLoanRejectedEmail: async () => {}, sendLoanLiquidationNotice: async () => {}, sendLoanDisbursedEmail: async () => {} }
  : require('../../../../services/emailService');
const { Op, Transaction } = require('sequelize');
const { sequelize } = require('../../../../db/connection');
let PDFDocument;
try { PDFDocument = require('pdfkit'); } catch {}

const approveLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, amount_approved } = req.body;
        const allowedRoles = ['admin', 'super_admin', 'chairman'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Only Chairman and Admins can approve loans.' });
        }
        const loan = await Loan.findByPk(id);
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
        if (!['pending', 'awaiting_admin_review'].includes(loan.status)) {
            return res.status(400).json({ success: false, message: `Cannot approve loan in '${loan.status}' status.` });
        }
        const updateData = { status: 'waiting_disbursement', approved_by: req.user.id, approval_date: new Date() };
        if (amount_approved) { updateData.amount_approved = amount_approved; }
        else if (!loan.amount_approved) { updateData.amount_approved = loan.amount_requested; }
        const previousStatus = loan.status;
        await loan.update(updateData);
        await ActivityLog.logActivity(req.user, 'approve_loan', 'loan', loan.id, `Loan #${loan.id} approved by ${req.user.role} (${req.user.name}). Reason: ${reason || 'N/A'}`, { previousStatus, newStatus: 'waiting_disbursement', reason }, req);
        await Notification.create({ user_id: loan.user_id, type: 'loan_approved', title: 'Loan Application Approved', message: `Your loan application for ₦${parseFloat(updateData.amount_approved || loan.amount_approved).toLocaleString()} has been approved and is waiting for disbursement.`, is_read: false });
        try {
            const user = await User.findByPk(loan.user_id, { include: [{ model: MembershipApplication, as: 'membershipApplication' }] });
            if (user && emailService.sendLoanApprovedEmail) { await emailService.sendLoanApprovedEmail(loan, user); }
        } catch (e) { console.error('Failed to send approval email:', e); }
        res.json({ success: true, message: 'Loan approved successfully', loan });
    } catch (error) {
        console.error('Approve loan error:', error);
        res.status(500).json({ success: false, message: 'Server error approving loan' });
    }
};

const rejectLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason || reason.trim() === '') { return res.status(400).json({ success: false, message: 'Rejection reason is required' }); }
        const allowedRoles = ['admin', 'super_admin', 'chairman'];
        if (!allowedRoles.includes(req.user.role)) { return res.status(403).json({ success: false, message: 'Access denied.' }); }
        const loan = await Loan.findByPk(id);
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
        if (['active', 'disbursed', 'completed', 'defaulted'].includes(loan.status)) {
            return res.status(400).json({ success: false, message: `Cannot reject loan in '${loan.status}' status.` });
        }
        const previousStatus = loan.status;
        await loan.update({ status: 'rejected', approved_by: req.user.id, approval_date: new Date() });
        await ActivityLog.logActivity(req.user, 'reject_loan', 'loan', loan.id, `Loan #${loan.id} rejected. Reason: ${reason || 'N/A'}`, { previousStatus, newStatus: 'rejected', reason }, req);
        await Notification.create({ user_id: loan.user_id, type: 'loan_rejected', title: 'Loan Application Rejected', message: `Your loan application has been rejected. ${reason ? 'Reason: ' + reason : ''}`, is_read: false });
        try {
            const user = await User.findByPk(loan.user_id, { include: [{ model: MembershipApplication, as: 'membershipApplication' }] });
            if (user && emailService.sendLoanRejectedEmail) { await emailService.sendLoanRejectedEmail(loan, user, reason); }
        } catch (e) { console.error('Failed to send rejection email:', e); }
        res.json({ success: true, message: 'Loan rejected successfully', loan });
    } catch (error) {
        console.error('Reject loan error:', error);
        res.status(500).json({ success: false, message: 'Server error rejecting loan' });
    }
};

const reverseDisbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findByPk(id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (!['disbursed', 'active'].includes(loan.status)) {
      return res.status(400).json({ success: false, message: `Cannot reverse disbursement for loan with status: ${loan.status}` });
    }
    const previousStatus = loan.status;
    await loan.update({ status: 'approved', disbursement_date: null, disbursed_by: null, monthly_repayment: null, total_repayment: null, first_repayment_date: null });
    if (req.user) {
      await ActivityLog.logActivity(req.user, 'reverse_disbursement', 'loan', loan.id, `Disbursement reversed for Loan #${loan.id}`, { previousStatus, newStatus: 'approved' }, req);
      await Notification.create({ user_id: loan.user_id, type: 'loan_update', title: 'Disbursement Reversed', message: `The disbursement for your loan #${loan.id} has been reversed.`, is_read: false });
    }
    res.json({ success: true, message: 'Disbursement reversed successfully', loan });
  } catch (error) {
    console.error('Reverse disbursement error:', error);
    res.status(500).json({ success: false, message: 'Server error reversing disbursement' });
  }
};

const reverseApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findByPk(id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (!['approved', 'waiting_disbursement'].includes(loan.status)) {
      return res.status(400).json({ success: false, message: `Cannot reverse approval for loan with status: ${loan.status}` });
    }
    const previousStatus = loan.status;
    await loan.update({ status: 'pending', approval_date: null, approved_by: null, amount_approved: null });
    if (req.user) {
      await ActivityLog.logActivity(req.user, 'reverse_approval', 'loan', loan.id, `Approval reversed for Loan #${loan.id}`, { previousStatus, newStatus: 'pending' }, req);
      await Notification.create({ user_id: loan.user_id, type: 'loan_update', title: 'Approval Reversed', message: `The approval for your loan #${loan.id} has been reversed.`, is_read: false });
    }
    res.json({ success: true, message: 'Approval reversed successfully', loan });
  } catch (error) {
    console.error('Reverse approval error:', error);
    res.status(500).json({ success: false, message: 'Server error reversing approval' });
  }
};

// Re-export liquidateLoan and getLoanLiquidationReceipt from legacy for now
// These are complex and tightly coupled — will be extracted in a future pass
const { liquidateLoan, getLoanLiquidationReceipt } = require('../../../../controllers/loanController');

module.exports = {
  approveLoan,
  rejectLoan,
  reverseDisbursement,
  reverseApproval,
  liquidateLoan,
  getLoanLiquidationReceipt
};
