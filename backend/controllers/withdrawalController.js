const { sequelize } = require('../db/connection');
const { Op } = require('sequelize');
const { 
  ContributionWithdrawal, 
  Contribution, 
  Loan, 
  User, 
  MembershipApplication,
  ActivityLog
} = require('../models');
const emailService = require('../services/emailService');

const getEligibility = async (req, res) => {
  console.log('🔍 getEligibility called for user:', req.user ? req.user.id : 'unknown');
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const user_id = req.user.id;
    const currentYear = new Date().getFullYear();

    console.log(`Checking eligibility for user_id: ${user_id}`);

    // 1. Check for active loans
    let activeLoan = null;
    try {
        activeLoan = await Loan.findOne({
        where: {
            user_id,
            status: {
            [Op.in]: ['pending', 'waiting_disbursement', 'approved', 'active', 'disbursed', 'defaulted', 'awaiting_admin_review']
            }
        }
        });
    } catch (loanError) {
        console.error('Error checking active loans:', loanError);
        // Continue, assuming no active loan if query fails (or handle differently?)
        // Safer to fail open or closed? Fail closed for financial safety.
        throw new Error('Failed to check active loans');
    }

    if (activeLoan) {
      return res.json({
        success: true,
        eligible: false,
        reason: 'You have an active loan.',
        maxAmount: 0,
        totalContributions: 0
      });
    }

    // 2. Check for existing withdrawal this year
    const existingWithdrawal = await ContributionWithdrawal.findOne({
      where: {
        user_id,
        year: currentYear,
        status: {
          [Op.not]: 'rejected'
        }
      }
    });

    if (existingWithdrawal) {
      return res.json({
        success: true,
        eligible: false,
        reason: `You have already submitted a withdrawal request for ${currentYear}.`,
        maxAmount: 0,
        totalContributions: 0
      });
    }

    // 3. Calculate Total Contributions (Gross)
    const totalGrossContributions = await Contribution.sum('total_amount', {
      where: {
        user_id,
        status: 'approved'
      }
    }) || 0;

    // 4. Calculate Total Withdrawals (Approved/Disbursed)
    const totalWithdrawals = await ContributionWithdrawal.sum('amount', {
      where: {
        user_id,
        status: {
          [Op.in]: ['approved', 'disbursed']
        }
      }
    }) || 0;

    // 5. Net Balance
    const grossVal = parseFloat(totalGrossContributions) || 0;
    const withdrawnVal = parseFloat(totalWithdrawals) || 0;
    const netBalance = grossVal - withdrawnVal;

    // 6. Max Withdrawal Amount (30%)
    const maxAmount = netBalance * 0.30;

    res.json({
      success: true,
      eligible: maxAmount > 0,
      reason: maxAmount > 0 ? null : 'Insufficient contribution balance.',
      maxAmount: parseFloat(maxAmount.toFixed(2)),
      totalContributions: parseFloat(netBalance.toFixed(2))
    });

  } catch (error) {
    console.error('❌ Get withdrawal eligibility error FULL STACK:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      // Only show stack in dev, but show message always
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const requestWithdrawal = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.user || !req.user.id) {
        await t.rollback();
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const user_id = req.user.id;
    const { amount, reason } = req.body;
    const currentYear = new Date().getFullYear();

    // Re-validate eligibility within transaction
    // 1. Active Loan
    const activeLoan = await Loan.findOne({
      where: {
        user_id,
        status: { [Op.in]: ['pending', 'waiting_disbursement', 'approved', 'active', 'disbursed', 'defaulted', 'awaiting_admin_review'] }
      },
      transaction: t
    });

    if (activeLoan) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Active loan found.' });
    }

    // 2. Annual Limit
    const existingWithdrawal = await ContributionWithdrawal.findOne({
      where: {
        user_id,
        year: currentYear,
        status: { [Op.not]: 'rejected' }
      },
      transaction: t
    });

    if (existingWithdrawal) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Withdrawal limit reached for this year.' });
    }

    // 3. Balance Check
    const totalGross = await Contribution.sum('total_amount', {
      where: { user_id, status: 'approved' },
      transaction: t
    }) || 0;

    const totalWithdrawn = await ContributionWithdrawal.sum('amount', {
      where: { user_id, status: { [Op.in]: ['approved', 'disbursed'] } },
      transaction: t
    }) || 0;

    const grossVal = parseFloat(totalGross) || 0;
    const withdrawnVal = parseFloat(totalWithdrawn) || 0;
    const netBalance = grossVal - withdrawnVal;
    const maxAmount = parseFloat((netBalance * 0.30).toFixed(2));
    const requestedAmount = parseFloat(amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (parseFloat(requestedAmount.toFixed(2)) !== maxAmount) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Withdrawal amount must be exactly 30% of your eligible contributions (₦${maxAmount.toFixed(2)}).`
      });
    }

    // Create Request
    const withdrawal = await ContributionWithdrawal.create({
      user_id,
      amount: maxAmount,
      reason,
      year: currentYear,
      status: 'pending'
    }, { transaction: t });

    await t.commit();

    await ActivityLog.logActivity(
      req.user,
      'request_withdrawal',
      'withdrawal',
      withdrawal.id,
      `Member submitted withdrawal request for ₦${maxAmount.toFixed(2)} (${currentYear})`,
      { year: currentYear, amount: maxAmount },
      req
    );

    // Send Notification (Async)
    // emailService.sendWithdrawalRequestNotification(user_id, withdrawal); // Assuming this method exists or we create it

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully.',
      withdrawal
    });

  } catch (error) {
    await t.rollback();
    console.error('Request withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getAdminEligibility = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const user_id = parseInt(userId);
    const currentYear = new Date().getFullYear();

    // 1. Check for active loans
    let activeLoan = null;
    try {
        activeLoan = await Loan.findOne({
        where: {
            user_id,
            status: {
            [Op.in]: ['pending', 'waiting_disbursement', 'approved', 'active', 'disbursed', 'defaulted', 'awaiting_admin_review']
            }
        }
        });
    } catch (loanError) {
        console.error('Error checking active loans:', loanError);
        throw new Error('Failed to check active loans');
    }

    if (activeLoan) {
      return res.json({
        success: true,
        eligible: false,
        reason: 'User has an active loan.',
        maxAmount: 0,
        totalContributions: 0
      });
    }

    // 2. Check for existing withdrawal this year
    const existingWithdrawal = await ContributionWithdrawal.findOne({
      where: {
        user_id,
        year: currentYear,
        status: {
          [Op.not]: 'rejected'
        }
      }
    });

    if (existingWithdrawal) {
      return res.json({
        success: true,
        eligible: false,
        reason: `User already submitted a withdrawal request for ${currentYear}.`,
        maxAmount: 0,
        totalContributions: 0
      });
    }

    // 3. Calculate Total Contributions (Gross)
    const totalGrossContributions = await Contribution.sum('total_amount', {
      where: {
        user_id,
        status: 'approved'
      }
    }) || 0;

    // 4. Calculate Total Withdrawals (Approved/Disbursed)
    const totalWithdrawals = await ContributionWithdrawal.sum('amount', {
      where: {
        user_id,
        status: {
          [Op.in]: ['approved', 'disbursed']
        }
      }
    }) || 0;

    // 5. Net Balance
    const grossVal = parseFloat(totalGrossContributions) || 0;
    const withdrawnVal = parseFloat(totalWithdrawals) || 0;
    const netBalance = grossVal - withdrawnVal;

    // 6. Max Withdrawal Amount (30%)
    const maxAmount = netBalance * 0.30;

    res.json({
      success: true,
      eligible: maxAmount > 0,
      reason: maxAmount > 0 ? null : 'Insufficient contribution balance.',
      maxAmount: parseFloat(maxAmount.toFixed(2)),
      totalContributions: parseFloat(netBalance.toFixed(2))
    });

  } catch (error) {
    console.error('Get admin eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const adminRequestWithdrawal = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId, amount, reason } = req.body;
    
    if (!userId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const user_id = parseInt(userId);
    const currentYear = new Date().getFullYear();

    // Re-validate eligibility within transaction
    // 1. Active Loan
    const activeLoan = await Loan.findOne({
      where: {
        user_id,
        status: { [Op.in]: ['pending', 'waiting_disbursement', 'approved', 'active', 'disbursed', 'defaulted', 'awaiting_admin_review'] }
      },
      transaction: t
    });

    if (activeLoan) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Active loan found for this user.' });
    }

    // 2. Annual Limit
    const existingWithdrawal = await ContributionWithdrawal.findOne({
      where: {
        user_id,
        year: currentYear,
        status: { [Op.not]: 'rejected' }
      },
      transaction: t
    });

    if (existingWithdrawal) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Withdrawal limit reached for this user this year.' });
    }

    // 3. Balance Check
    const totalGross = await Contribution.sum('total_amount', {
      where: { user_id, status: 'approved' },
      transaction: t
    }) || 0;

    const totalWithdrawn = await ContributionWithdrawal.sum('amount', {
      where: { user_id, status: { [Op.in]: ['approved', 'disbursed'] } },
      transaction: t
    }) || 0;

    const grossVal = parseFloat(totalGross) || 0;
    const withdrawnVal = parseFloat(totalWithdrawn) || 0;
    const netBalance = grossVal - withdrawnVal;
    const maxAmount = parseFloat((netBalance * 0.30).toFixed(2));
    const requestedAmount = parseFloat(amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (parseFloat(requestedAmount.toFixed(2)) !== maxAmount) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Withdrawal amount must be exactly 30% of eligible contributions (₦${maxAmount.toFixed(2)}).` 
      });
    }

    // Create Request
    const withdrawal = await ContributionWithdrawal.create({
      user_id,
      amount: maxAmount,
      reason: reason || 'Admin initiated withdrawal',
      year: currentYear,
      status: 'pending' // Admin requests still need to go through standard flow or auto-approve? Let's keep it pending for consistency unless requested otherwise.
    }, { transaction: t });

    await t.commit();

    // Log Activity
    await ActivityLog.logActivity(
      req.user,
      'create_withdrawal_on_behalf',
      'withdrawal',
      withdrawal.id,
      `Admin initiated withdrawal for user ${userId}`,
      { beneficiary_id: userId, amount: requestedAmount, reason },
      req
    );

    // Send Notification
    try {
        const beneficiary = await User.findByPk(user_id, {
            include: [{ model: MembershipApplication, as: 'membershipApplication' }]
        });
        const userEmail = beneficiary?.membershipApplication?.email;
        if (userEmail) {
            await emailService.sendEmail(
                userEmail, 
                'Withdrawal Request Initiated', 
                `A withdrawal request for ${withdrawal.amount} has been initiated on your behalf by an administrator.`
            );
        }
    } catch (e) {
        console.error("Failed to send notification email", e);
    }

    res.status(201).json({
      success: true,
      message: 'Withdrawal request initiated successfully.',
      withdrawal
    });

  } catch (error) {
    await t.rollback();
    console.error('Admin request withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getWithdrawals = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    // If not admin/treasurer, only show own withdrawals
    if (!req.user.role || !['admin', 'super_admin', 'treasurer', 'chairman'].includes(req.user.role)) {
      whereClause.user_id = req.user.id;
    } else if (req.query.user_id) {
        whereClause.user_id = req.query.user_id;
    }

    if (status) whereClause.status = status;

    const { count, rows } = await ContributionWithdrawal.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'email', 'psn']
        }]
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // Flatten user data for frontend compatibility
    const formattedWithdrawals = rows.map(row => {
      try {
        const withdrawal = row.get({ plain: true });
        if (withdrawal.user && withdrawal.user.membershipApplication) {
          withdrawal.user.name = withdrawal.user.membershipApplication.name;
          withdrawal.user.email = withdrawal.user.membershipApplication.email;
          withdrawal.user.psn = withdrawal.user.membershipApplication.psn;
          delete withdrawal.user.membershipApplication;
        } else if (withdrawal.user) {
            // Handle case where user exists but membership application is missing
            withdrawal.user.name = 'Unknown';
            withdrawal.user.email = 'N/A';
            withdrawal.user.psn = 'N/A';
        }
        return withdrawal;
      } catch (err) {
        console.error('Error formatting withdrawal row:', err);
        return row;
      }
    });

    res.json({
      success: true,
      withdrawals: formattedWithdrawals,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const approver_id = req.user.id;

    if (!['approved', 'rejected', 'disbursed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    if (status === 'rejected' && (!rejection_reason || rejection_reason.toString().trim() === '')) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const withdrawal = await ContributionWithdrawal.findByPk(id, {
        include: [{ 
            model: User, 
            as: 'user',
            include: [{
                model: MembershipApplication,
                as: 'membershipApplication',
                attributes: ['email', 'name']
            }]
        }]
    });
    
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    withdrawal.status = status;
    withdrawal.approved_by = approver_id;
    if (status === 'approved') withdrawal.approved_at = new Date();
    if (status === 'rejected') withdrawal.rejection_reason = rejection_reason;

    await withdrawal.save();

    await ActivityLog.logActivity(
      req.user,
      'update_withdrawal_status',
      'withdrawal',
      withdrawal.id,
      `Withdrawal #${withdrawal.id} status updated to ${status}`,
      { status, rejection_reason: status === 'rejected' ? rejection_reason : null },
      req
    );

    // Send Notification
    const user = withdrawal.user;
    const userEmail = user?.membershipApplication?.email;

    if (userEmail) {
        let subject = `Withdrawal Request ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        let text = `Your withdrawal request for ${withdrawal.amount} has been ${status}.`;
        if (status === 'rejected') text += ` Reason: ${rejection_reason}`;
        
        try {
             await emailService.sendEmail(userEmail, subject, text);
        } catch (e) {
            console.error("Failed to send email", e);
        }
    }

    res.json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      withdrawal
    });

  } catch (error) {
    console.error('Update withdrawal status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getEligibility,
  requestWithdrawal,
  getWithdrawals,
  updateStatus,
  getAdminEligibility,
  adminRequestWithdrawal
};
