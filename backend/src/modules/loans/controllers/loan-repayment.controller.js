const { LoanRepayment, Loan, User, MembershipApplication, ActivityLog, sequelize } = require('../../../../models');
const { Op } = require('sequelize');
const multer = require('multer');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Configure multer for bulk upload
const upload = multer({ dest: 'uploads/' });

// Helper to check and update loan status based on total repayments
const checkAndUpdateLoanStatus = async (loanId, transaction) => {
  const loan = await Loan.findByPk(loanId, { transaction });
  if (!loan) return;

  const totalPaidRaw = await LoanRepayment.sum('repayment_amount', {
    where: {
      loan_id: loanId,
      status: 'verified'
    },
    transaction
  });
  
  const totalPaid = parseFloat(totalPaidRaw || 0);
  const targetAmount = parseFloat(loan.total_repayment || loan.amount_approved || loan.amount_requested || 0);
  
  // If fully paid (allow small epsilon for float comparison if needed, but exact >= is usually fine for currency if stored properly)
  if (targetAmount > 0 && totalPaid >= targetAmount && loan.status !== 'completed') {
    await loan.update({ status: 'completed' }, { transaction });
    
    // Log loan completion
    await ActivityLog.create({
      action: 'LOAN_COMPLETED',
      description: `Loan #${loan.id} automatically marked as completed after full repayment`,
      resource_type: 'Loan',
      resource_id: loan.id,
      metadata: { totalPaid, targetAmount }
    }, { transaction });
    
    return true;
  }
  return false;
};

const getLoanRepayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, user_id, loan_id, psn, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (status) whereClause.status = status;
    if (user_id) whereClause.user_id = user_id;
    if (loan_id) whereClause.loan_id = loan_id;

    if (search && String(search).trim() !== '') {
      const q = String(search).trim();
      const isNumeric = /^\d+$/.test(q);
      if (isNumeric) {
        whereClause.loan_id = Number(q);
      } else {
        const members = await MembershipApplication.findAll({
          where: {
            [Op.or]: [
              { psn: q },
              { name: { [Op.like]: `%${q}%` } }
            ]
          },
          attributes: ['id'],
          raw: true
        });
        if (members.length === 0) {
          return res.json({
            success: true,
            repayments: [],
            pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
          });
        }
        const memberIds = members.map((m) => m.id);
        const users = await User.findAll({
          where: { membership_application_id: { [Op.in]: memberIds } },
          attributes: ['id'],
          raw: true
        });
        if (users.length === 0) {
          return res.json({
            success: true,
            repayments: [],
            pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
          });
        }
        whereClause.user_id = { [Op.in]: users.map((u) => u.id) };
      }
    }

    if (psn) {
        // Find member by PSN first
        const member = await MembershipApplication.findOne({
             where: { psn: psn.toString().trim() }
        });
        
        if (member) {
             const user = await User.findOne({ where: { membership_application_id: member.id } });
             if (user) {
                 whereClause.user_id = user.id;
             } else {
                 return res.json({
                     success: true,
                     repayments: [],
                     pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
                 });
             }
        } else {
             return res.json({
                 success: true,
                 repayments: [],
                 pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
             });
        }
    }

    const { count, rows } = await LoanRepayment.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [['repayment_date', 'DESC'], ['created_at', 'DESC']],
      include: [{
        model: Loan,
        as: 'loan',
        attributes: ['id', 'loan_type', 'amount_requested', 'amount_approved', 'status'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['id'],
          include: [{
            model: MembershipApplication,
            as: 'membershipApplication',
            attributes: ['name', 'psn']
          }]
        }]
      }, {
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn']
        }]
      }, {
        model: User,
        as: 'recordedBy',
        attributes: ['id'],
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }]
    });

    // Transform the data for frontend
    const transformedRows = rows.map(repayment => ({
      id: repayment.id,
      loanId: repayment.loan_id,
      memberPsn: repayment.user?.membershipApplication?.psn || 'Unknown',
      memberName: repayment.user?.membershipApplication?.name || 'Unknown User',
      loanAmount: repayment.loan?.amount_approved || repayment.loan?.amount_requested || 0,
      repaymentAmount: parseFloat(repayment.repayment_amount),
      repaymentDate: repayment.repayment_date,
      paymentMethod: repayment.payment_method,
      status: repayment.status,
      recordedBy: repayment.recordedBy?.membershipApplication?.name || 'System',
      uploadDate: repayment.created_at,
      notes: repayment.notes,
      loanType: repayment.loan?.loan_type || 'Unknown',
      loanStatus: repayment.loan?.status || 'Unknown'
    }));

    // Calculate Active Loan Summary if filtering by user
    let activeLoanSummary = null;
    if (whereClause.user_id) {
        try {
            const activeLoan = await Loan.findOne({
                where: {
                    user_id: whereClause.user_id,
                    status: { [Op.in]: ['active', 'disbursed', 'defaulted'] }
                },
                order: [['created_at', 'DESC']]
            });

            if (activeLoan) {
                const totalPaidRaw = await LoanRepayment.sum('repayment_amount', {
                    where: {
                        loan_id: activeLoan.id,
                        status: 'verified'
                    }
                });
                
                const totalPaid = parseFloat(totalPaidRaw || 0);
                const totalRepayment = parseFloat(activeLoan.total_repayment || activeLoan.amount_approved || 0);
                const remainingBalance = Math.max(0, totalRepayment - totalPaid);

                activeLoanSummary = {
                    loanId: activeLoan.id,
                    amountApproved: parseFloat(activeLoan.amount_approved || 0),
                    totalRepayment: totalRepayment,
                    totalPaid: totalPaid,
                    remainingBalance: remainingBalance,
                    status: activeLoan.status,
                    formattedRemainingBalance: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(remainingBalance)
                };
            }
        } catch (summError) {
            console.error('Error calculating active loan summary:', summError);
            // Don't fail the whole request if summary fails
        }
    }

    res.json({
      success: true,
      activeLoanSummary,
      repayments: transformedRows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ [LoanRepaymentController] Get loan repayments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error fetching loan repayments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getLoanRepaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const repayment = await LoanRepayment.findByPk(id, {
      include: [{
        model: Loan,
        as: 'loan',
        attributes: ['id', 'loan_type', 'amount_requested', 'amount_approved', 'status', 'repayment_period_months'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['id'],
          include: [{
            model: MembershipApplication,
            as: 'membershipApplication',
            attributes: ['name', 'psn', 'email']
          }]
        }]
      }, {
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn', 'email']
        }]
      }, {
        model: User,
        as: 'recordedBy',
        attributes: ['id'],
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }]
    });

    if (!repayment) {
      return res.status(404).json({
        success: false,
        message: 'Loan repayment not found'
      });
    }

    // Transform for frontend
    const transformedRepayment = {
      id: repayment.id,
      loanId: repayment.loan_id,
      memberPsn: repayment.user?.membershipApplication?.psn || 'Unknown',
      memberName: repayment.user?.membershipApplication?.name || 'Unknown User',
      memberEmail: repayment.user?.membershipApplication?.email || '',
      loanAmount: repayment.loan?.amount_approved || repayment.loan?.amount_requested || 0,
      loanType: repayment.loan?.loan_type || 'Unknown',
      loanStatus: repayment.loan?.status || 'Unknown',
      repaymentPeriod: repayment.loan?.repayment_period_months || 0,
      repaymentAmount: parseFloat(repayment.repayment_amount),
      repaymentDate: repayment.repayment_date,
      paymentMethod: repayment.payment_method,
      status: repayment.status,
      recordedBy: repayment.recordedBy?.membershipApplication?.name || 'System',
      notes: repayment.notes,
      createdAt: repayment.created_at,
      updatedAt: repayment.updated_at
    };

    res.json({
      success: true,
      repayment: transformedRepayment
    });

  } catch (error) {
    console.error('Get loan repayment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const createLoanRepayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      loan_id,
      repayment_amount,
      repayment_date,
      payment_method,
      notes
    } = req.body;

    // Validate required fields
    if (!loan_id || !repayment_amount || !repayment_date || !payment_method) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Loan ID, repayment amount, date, and payment method are required'
      });
    }

    // Find the loan
    const loan = await Loan.findByPk(loan_id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id']
      }],
      transaction: t
    });

    if (!loan) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    // Check if loan is disbursed or active
    // Active loans are considered disbursed and eligible for repayment
    if (!['disbursed', 'active'].includes(loan.status)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot record repayment for a loan that is not disbursed (status must be active or disbursed)'
      });
    }

    // Validate repayment amount
    const amount = parseFloat(repayment_amount);
    if (amount <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Repayment amount must be greater than 0'
      });
    }

    // Create the repayment record
    const repayment = await LoanRepayment.create({
      loan_id: loan_id,
      user_id: loan.user_id,
      repayment_amount: amount,
      repayment_date: repayment_date,
      payment_method: payment_method,
      status: 'verified', // Auto-verify for admin recorded payments
      recorded_by: req.user.id,
      notes: notes || null
    }, { transaction: t });

    // Check loan balance and update status if needed
    await checkAndUpdateLoanStatus(loan_id, t);

    await t.commit();

    // Fetch the created repayment with associations
    const repaymentWithDetails = await LoanRepayment.findByPk(repayment.id, {
      include: [{
        model: Loan,
        as: 'loan',
        attributes: ['id', 'loan_type', 'amount_requested', 'amount_approved'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['id'],
          include: [{
            model: MembershipApplication,
            as: 'membershipApplication',
            attributes: ['name', 'psn']
          }]
        }]
      }, {
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn']
        }]
      }, {
        model: User,
        as: 'recordedBy',
        attributes: ['id'],
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }]
    });

    // Log activity
    try {
      if (req.user) {
        await ActivityLog.create({
          user_id: req.user.id,
          user_name: req.user.name || 'Unknown',
          user_role: req.user.role || 'unknown',
          action: 'CREATE_LOAN_REPAYMENT',
          resource_type: 'LoanRepayment',
          resource_id: repayment.id,
          description: `Recorded repayment of ${amount}`,
          metadata: { loan_id, amount, payment_method }
        });
      }
    } catch (e) { console.error("Logging failed", e); }

    // Transform for response
    const transformedRepayment = {
      id: repaymentWithDetails.id,
      loanId: repaymentWithDetails.loan_id,
      memberPsn: repaymentWithDetails.user?.membershipApplication?.psn || 'Unknown',
      memberName: repaymentWithDetails.user?.membershipApplication?.name || 'Unknown User',
      loanAmount: repaymentWithDetails.loan?.amount_approved || repaymentWithDetails.loan?.amount_requested || 0,
      repaymentAmount: parseFloat(repaymentWithDetails.repayment_amount),
      repaymentDate: repaymentWithDetails.repayment_date,
      paymentMethod: repaymentWithDetails.payment_method,
      status: repaymentWithDetails.status,
      recordedBy: repaymentWithDetails.recordedBy?.membershipApplication?.name || 'System',
      notes: repaymentWithDetails.notes,
      createdAt: repaymentWithDetails.created_at
    };

    res.status(201).json({
      success: true,
      message: 'Loan repayment recorded successfully',
      repayment: transformedRepayment
    });

  } catch (error) {
    console.error('Create loan repayment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateLoanRepayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const role = String(req.user?.role || '');
    const allowedRoles = ['admin', 'super_admin', 'treasurer', 'chairman'];
    if (!allowedRoles.includes(role)) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient privileges.'
      });
    }

    const statusValue = status !== undefined && status !== null ? String(status).trim().toLowerCase() : undefined;
    const allowedStatuses = ['pending', 'verified', 'rejected'];
    if (statusValue !== undefined && !allowedStatuses.includes(statusValue)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid status '${statusValue}'. Allowed: pending, verified, rejected.`
      });
    }

    if (statusValue === 'pending') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot set repayment status back to pending.'
      });
    }

    const repayment = await LoanRepayment.findByPk(id, { transaction: t });

    if (!repayment) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Loan repayment not found'
      });
    }

    const oldStatus = repayment.status;

    if (statusValue && String(oldStatus).toLowerCase() !== 'pending') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot update repayment status from '${oldStatus}'. Only pending repayments can be verified/rejected.`
      });
    }

    // Update the repayment
    await repayment.update({
      status: statusValue || repayment.status,
      notes: notes !== undefined ? notes : repayment.notes
    }, { transaction: t });

    // If status changed to verified, check loan balance
    if (statusValue === 'verified' && oldStatus !== 'verified') {
      await checkAndUpdateLoanStatus(repayment.loan_id, t);
    }

    await t.commit();

    // Log activity
    try {
      if (req.user) {
        await ActivityLog.create({
          user_id: req.user.id,
          user_name: req.user.name || 'Unknown',
          user_role: req.user.role || 'unknown',
          action: 'UPDATE_LOAN_REPAYMENT',
          resource_type: 'LoanRepayment',
          resource_id: id,
          description: statusValue ? `Repayment status updated to ${statusValue}` : 'Repayment updated',
          metadata: { oldStatus, newStatus: statusValue, notes }
        });
      }
    } catch (e) { console.error("Logging failed", e); }

    res.json({
      success: true,
      message: 'Loan repayment updated successfully'
    });

  } catch (error) {
    await t.rollback();
    console.error('Update loan repayment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const deleteLoanRepayment = async (req, res) => {
  try {
    const { id } = req.params;

    const repayment = await LoanRepayment.findByPk(id);

    if (!repayment) {
      return res.status(404).json({
        success: false,
        message: 'Loan repayment not found'
      });
    }

    // Only allow deletion of pending repayments
    if (repayment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete verified repayments'
      });
    }

    await repayment.destroy();

    res.json({
      success: true,
      message: 'Loan repayment deleted successfully'
    });

  } catch (error) {
    console.error('Delete loan repayment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getLoanRepaymentStats = async (req, res) => {
  try {
    const { year, month } = req.query;

    const whereClause = {};
    if (year) {
      whereClause.repayment_date = {
        [require('sequelize').Op.gte]: `${year}-01-01`,
        [require('sequelize').Op.lt]: `${parseInt(year) + 1}-01-01`
      };
    }
    if (month && year) {
      whereClause.repayment_date = {
        [require('sequelize').Op.gte]: `${year}-${month.padStart(2, '0')}-01`,
        [require('sequelize').Op.lt]: month === '12'
          ? `${parseInt(year) + 1}-01-01`
          : `${year}-${(parseInt(month) + 1).toString().padStart(2, '0')}-01`
      };
    }

    const [totalRepayments, verifiedRepayments, totalAmount] = await Promise.all([
      LoanRepayment.count({ where: { ...whereClause, status: 'verified' } }),
      LoanRepayment.sum('repayment_amount', { where: { ...whereClause, status: 'verified' } }),
      LoanRepayment.sum('repayment_amount', { where: whereClause })
    ]);

    res.json({
      success: true,
      stats: {
        total_repayments: totalRepayments || 0,
        verified_repayments: verifiedRepayments || 0,
        total_amount: totalAmount || 0
      }
    });

  } catch (error) {
    console.error('Get loan repayment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getLoanById = async (req, res) => {
  try {
    const { loanId } = req.params;

    let loan;
    
    // Check if input is numeric (likely a Loan ID)
    const isNumeric = /^\d+$/.test(loanId);
    
    // Define includes reused for both queries
    const loanIncludes = [{
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn', 'email']
        }]
    }];

    if (isNumeric) {
        loan = await Loan.findByPk(loanId, {
            include: loanIncludes
        });
    }

    // If not found by ID or not numeric, try searching by PSN
    if (!loan) {
        // Find user by PSN
        const member = await MembershipApplication.findOne({
            where: { psn: loanId.toString().trim() },
            include: [{ model: User, as: 'user' }]
        });

        if (member && member.user) {
            // Find active loan for this user
            // Prioritize 'active' or 'disbursed' loans
            loan = await Loan.findOne({
                where: { 
                    user_id: member.user.id,
                    status: { [Op.or]: ['active', 'disbursed', 'approved'] } 
                },
                order: [['created_at', 'DESC']], // Get latest
                include: loanIncludes
            });
        }
    }

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found. Please check Loan ID or PSN (ensure member has an active loan).'
      });
    }

    // Transform for frontend
    const transformedLoan = {
      id: loan.id,
      loanType: loan.loan_type,
      amountRequested: loan.amount_requested,
      amountApproved: loan.amount_approved,
      status: loan.status,
      memberPsn: loan.user?.membershipApplication?.psn || 'Unknown',
      memberName: loan.user?.membershipApplication?.name || 'Unknown User',
      memberEmail: loan.user?.membershipApplication?.email || '',
      repaymentPeriod: loan.repayment_period_months || 0,
      monthlyRepayment: loan.monthly_repayment || 0,
      totalRepayment: loan.total_repayment || 0
    };

    res.json({
      success: true,
      loan: transformedLoan
    });

  } catch (error) {
    console.error('Get loan by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getUserLoanRepayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const repayments = await LoanRepayment.findAll({
      where: { user_id: userId },
      order: [['repayment_date', 'DESC']],
      include: [{
        model: Loan,
        as: 'loan',
        attributes: ['id', 'loan_type', 'amount_requested', 'amount_approved', 'total_repayment', 'status']
      }, {
        model: User,
        as: 'recordedBy',
        attributes: ['id'],
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }]
    });

    // Transform for frontend
    const transformedRepayments = repayments.map(repayment => ({
      id: repayment.id,
      loanId: repayment.loan_id,
      loanType: repayment.loan?.loan_type || 'Unknown',
      loanAmount: repayment.loan?.total_repayment || repayment.loan?.amount_approved || repayment.loan?.amount_requested || 0,
      repaymentAmount: parseFloat(repayment.repayment_amount),
      repaymentDate: repayment.repayment_date,
      paymentMethod: repayment.payment_method,
      status: repayment.status,
      recordedBy: repayment.recordedBy?.membershipApplication?.name || 'System',
      notes: repayment.notes,
      createdAt: repayment.created_at
    }));

    res.json({
      success: true,
      repayments: transformedRepayments
    });

  } catch (error) {
    console.error('Get user loan repayments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const bulkVerifyLoanRepayments = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { repayment_ids } = req.body;

    const role = String(req.user?.role || '');
    const allowedRoles = ['admin', 'super_admin', 'treasurer', 'chairman'];
    if (!allowedRoles.includes(role)) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient privileges.'
      });
    }

    if (!repayment_ids || !Array.isArray(repayment_ids) || repayment_ids.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No repayment IDs provided'
      });
    }

    const uniqueIds = Array.from(new Set(repayment_ids.map((x) => String(x).trim()).filter(Boolean)));
    const numericIds = uniqueIds.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    if (numericIds.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No valid repayment IDs provided'
      });
    }

    const allRepayments = await LoanRepayment.findAll({
      where: { id: { [Op.in]: numericIds } },
      transaction: t
    });

    const repaymentById = new Map(allRepayments.map((r) => [Number(r.id), r]));
    const verifiedIds = [];
    const skipped = [];
    const failed = [];
    const affectedLoanIds = new Set();

    for (const id of numericIds) {
      const repayment = repaymentById.get(id);
      if (!repayment) {
        skipped.push({ id, reason: 'NOT_FOUND' });
        continue;
      }
      const currentStatus = String(repayment.status || '').toLowerCase();
      if (currentStatus !== 'pending') {
        skipped.push({ id, reason: `NOT_PENDING:${currentStatus}` });
        continue;
      }
      try {
        await repayment.update({ status: 'verified' }, { transaction: t });
        verifiedIds.push(id);
        affectedLoanIds.add(repayment.loan_id);
      } catch (e) {
        failed.push({ id, message: e?.message || 'Failed to verify repayment' });
      }
    }

    for (const loanId of Array.from(affectedLoanIds)) {
      await checkAndUpdateLoanStatus(loanId, t);
    }

    await t.commit();

    try {
      if (req.user) {
        const logs = [];
        for (const id of verifiedIds) {
          logs.push({
            user_id: req.user.id,
            user_name: req.user.name || 'Unknown',
            user_role: req.user.role || 'unknown',
            action: 'VERIFY_LOAN_REPAYMENT',
            resource_type: 'LoanRepayment',
            resource_id: id,
            description: `Verified loan repayment #${id} via bulk verification`,
            metadata: { mode: 'bulk' }
          });
        }
        for (const s of skipped) {
          logs.push({
            user_id: req.user.id,
            user_name: req.user.name || 'Unknown',
            user_role: req.user.role || 'unknown',
            action: 'VERIFY_LOAN_REPAYMENT_SKIPPED',
            resource_type: 'LoanRepayment',
            resource_id: s.id,
            description: `Skipped verification for repayment #${s.id}`,
            metadata: { reason: s.reason, mode: 'bulk' }
          });
        }
        for (const f of failed) {
          logs.push({
            user_id: req.user.id,
            user_name: req.user.name || 'Unknown',
            user_role: req.user.role || 'unknown',
            action: 'VERIFY_LOAN_REPAYMENT_FAILED',
            resource_type: 'LoanRepayment',
            resource_id: f.id,
            description: `Failed verification for repayment #${f.id}`,
            metadata: { message: f.message, mode: 'bulk' }
          });
        }
        logs.push({
          user_id: req.user.id,
          user_name: req.user.name || 'Unknown',
          user_role: req.user.role || 'unknown',
          action: 'BULK_VERIFY_REPAYMENTS',
          resource_type: 'LoanRepayment',
          resource_id: null,
          description: `Bulk verification processed. Verified: ${verifiedIds.length}, skipped: ${skipped.length}, failed: ${failed.length}.`,
          metadata: { requested: numericIds.length, verified: verifiedIds.length, skipped: skipped.length, failed: failed.length, repayment_ids: numericIds }
        });
        await ActivityLog.bulkCreate(logs);
      }
    } catch (e) { console.error("Logging failed", e); }

    res.json({
      success: true,
      message: 'Bulk verification processed',
      summary: {
        requested: numericIds.length,
        verified: verifiedIds.length,
        skipped: skipped.length,
        failed: failed.length
      },
      verified_ids: verifiedIds,
      skipped,
      failed
    });

  } catch (error) {
    await t.rollback();
    console.error('Bulk verify loan repayments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getLoanRepayments,
  getLoanRepaymentById,
  createLoanRepayment,
  updateLoanRepayment,
  deleteLoanRepayment,
  getLoanRepaymentStats,
  getLoanById,
  getUserLoanRepayments,
  upload,
  bulkUploadLoanRepayments,
  bulkVerifyLoanRepayments
};

// Bulk upload loan repayments from CSV/Excel
async function bulkUploadLoanRepayments(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let rows = [];

    const cleanUp = () => {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    };

    const getVal = (obj, candidates) => {
      for (const c of candidates) {
        if (obj[c] !== undefined && obj[c] !== null && String(obj[c]).trim() !== '') return obj[c];
      }
      return undefined;
    };

    // Parse file into rows
    if (ext === '.xlsx' || ext === '.xls') {
      try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
      } catch (error) {
        cleanUp();
        console.error('❌ [LOAN REPAYMENT BULK] Excel parsing error:', error);
        return res.status(400).json({ success: false, message: 'Error parsing Excel file' });
      }
      cleanUp();
    } else {
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (data) => rows.push(data))
          .on('end', () => {
            cleanUp();
            resolve();
          })
          .on('error', (error) => {
            cleanUp();
            console.error('❌ [LOAN REPAYMENT BULK] CSV parsing error:', error);
            reject(error);
          });
      }).catch(() => {
        return res.status(400).json({ success: false, message: 'Error parsing CSV file' });
      });
    }

    let successful = 0;
    let failed = 0;
    const errors = [];

    for (const row of rows) {
      try {
        // Allow referencing either Loan ID or PSN
        const loanIdVal = getVal(row, ['Loan_ID', 'loan_id', 'LoanId', 'loanId', 'Loan ID']);
        const psnVal = getVal(row, ['PSN', 'psn', 'Psn']);

        const amountVal = getVal(row, ['Repayment_Amount', 'repayment_amount', 'Amount', 'amount']);
        let dateVal = getVal(row, ['Repayment_Date', 'repayment_date', 'Date', 'date', 'Period', 'period']);
        
        // Normalize Payment Method
        let methodVal = getVal(row, ['Payment_Method', 'payment_method', 'Payment Method', 'method']);
        if (methodVal) {
          const m = String(methodVal).toLowerCase().trim();
          if (m.includes('transfer')) methodVal = 'bank_transfer';
          else if (m.includes('salary')) methodVal = 'salary_deduction';
          else if (m.includes('mobile')) methodVal = 'mobile_money';
          else if (m.includes('cash')) methodVal = 'cash';
          else if (m.includes('cheque')) methodVal = 'cheque';
        } else {
          methodVal = 'bank_transfer'; // Default
        }

        const notesVal = getVal(row, ['Notes', 'notes']);

        if ((!loanIdVal && !psnVal) || !amountVal || !dateVal) {
          failed++;
          errors.push({ row: row.__ROW_INDEX__, error: 'Missing required fields: Loan_ID/PSN, Repayment_Amount, Repayment_Date' });
          continue;
        }

        const amount = parseFloat(String(amountVal).trim());
        if (isNaN(amount) || amount <= 0) {
          failed++;
          errors.push({ row: row.__ROW_INDEX__, error: 'Repayment amount must be a positive number' });
          continue;
        }

        // Normalize date; support YYYY-MM by using first day of month
        // Also support DD/MM/YYYY or DD-MM-YYYY
        let repaymentDate;
        const dateStr = String(dateVal).trim();
        
        if (/^\d{4}-\d{2}$/.test(dateStr)) {
          repaymentDate = `${dateStr}-01`;
        } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(dateStr)) {
          const parts = dateStr.split(/[/-]/);
          // Assume DD/MM/YYYY -> YYYY-MM-DD
          repaymentDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else {
          repaymentDate = dateStr;
        }

        // Resolve loan
        let loan;
        if (loanIdVal) {
          loan = await Loan.findByPk(parseInt(String(loanIdVal).trim()));
        } else if (psnVal) {
          const user = await User.findOne({
            include: [{
              model: MembershipApplication,
              as: 'membershipApplication',
              where: { psn: String(psnVal).trim() }
            }]
          });
          if (!user) {
            failed++;
            errors.push({ row: row.__ROW_INDEX__, error: `No member found with PSN: ${psnVal}` });
            continue;
          }
          loan = await Loan.findOne({
            where: { user_id: user.id, status: 'disbursed' },
            order: [['updated_at', 'DESC']]
          });
        }

        if (!loan) {
          failed++;
          errors.push({ row: row.__ROW_INDEX__, error: 'No disbursed loan found for provided identifier' });
          continue;
        }

        // Create pending repayment for verification
        await LoanRepayment.create({
          loan_id: loan.id,
          user_id: loan.user_id,
          repayment_amount: amount,
          repayment_date: repaymentDate,
          payment_method: methodVal,
          status: 'pending',
          recorded_by: req.user?.id || null,
          notes: notesVal || 'Bulk upload'
        });

        successful++;
      } catch (error) {
        failed++;
        errors.push({ row: row.__ROW_INDEX__, error: error.message });
      }
    }

    return res.json({
      success: true,
      message: `Bulk upload completed. ${successful} repayments created, ${failed} failed.`,
      successful,
      failed,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    console.error('❌ Bulk upload loan repayments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during bulk upload'
    });
  }
}
