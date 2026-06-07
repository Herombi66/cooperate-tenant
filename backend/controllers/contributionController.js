const XLSX = require('xlsx');
const { sequelize } = require('../db/connection');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const uploadDir = path.resolve(__dirname, '..', 'uploads');
try {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
} catch {}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      } catch {}
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const safe = String(file.originalname || 'upload').replace(/[^a-zA-Z0-9._-]+/g, '_');
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // Limit to 10MB
});

const { User, Contribution, ActivityLog, MembershipApplication, Settings, Notification, UploadBatch, UploadRecordError } = require('../models');
const { Op } = require('sequelize');
const emailService = process.env.NODE_ENV === 'test'
  ? { sendEmail: async () => {} }
  : require('../services/emailService');

// Helper: load registration and monthly admin fees from Settings with safe defaults
async function getFeeConfig() {
  try {
    const rows = await Settings.findAll({
      where: { key: { [Op.in]: ['registration_fee', 'monthly_admin_fee'] } }
    });
    const map = {};
    for (const r of rows) {
      const raw = r.value;
      let parsed = 0;
      if (typeof raw === 'number') parsed = raw;
      else if (typeof raw === 'string') parsed = parseFloat(raw);
      else if (raw && typeof raw === 'object' && raw.hasOwnProperty('value')) parsed = parseFloat(raw.value);
      else parsed = parseFloat(String(raw));
      map[r.key] = isNaN(parsed) ? 0 : parsed;
    }
    return {
      registrationFee: map.registration_fee ?? 1500,
      monthlyAdminFee: map.monthly_admin_fee ?? 1000
    };
  } catch (e) {
    return { registrationFee: 1500, monthlyAdminFee: 1000 };
  }
}

// Helper: determine applicable fee for a user based on contribution history
async function determineApplicableFee(userId, options = {}) {
  const { registrationFee, monthlyAdminFee } = await getFeeConfig();
  const month = options?.month;
  const year = options?.year;
  const transaction = options?.transaction;

  const contributionsCount = await Contribution.count({ where: { user_id: userId }, transaction });
  if (contributionsCount === 0) {
    return { type: 'registration_fee', amount: registrationFee };
  }
  if (month != null && year != null) {
    const monthInt = parseInt(String(month), 10);
    const yearInt = parseInt(String(year), 10);
    if (Number.isFinite(monthInt) && Number.isFinite(yearInt)) {
      const existingInPeriod = await Contribution.count({
        where: { user_id: userId, month: monthInt, year: yearInt },
        transaction
      });
      if (existingInPeriod > 0) {
        return { type: 'none', amount: 0 };
      }
    }
  }
  return { type: 'monthly_admin_fee', amount: monthlyAdminFee };
}

const ALLOWED_PAYMENT_METHODS = ['bank_transfer', 'salary_deduction'];

function sanitizePaymentMethod(raw) {
  const base = raw == null ? '' : String(raw);
  return base
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s_-]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePaymentMethod(raw) {
  const cleaned = sanitizePaymentMethod(raw).toLowerCase();
  if (!cleaned) return '';

  const compact = cleaned.replace(/[\s_-]+/g, '');
  if (compact === 'banktransfer' || (cleaned.includes('bank') && cleaned.includes('transfer'))) return 'bank_transfer';
  if (compact === 'salarydeduction' || (cleaned.includes('salary') && cleaned.includes('deduct'))) return 'salary_deduction';

  if (cleaned === 'bank_transfer' || cleaned === 'salary_deduction') return cleaned;
  return cleaned.replace(/\s+/g, '_');
}

function isAllowedPaymentMethod(method) {
  const m = String(method || '').trim().toLowerCase();
  return ALLOWED_PAYMENT_METHODS.includes(m);
}

// Helper: scale three buckets proportionally to a target total
function scaleBuckets(savings, investment, targetSaving, targetTotal) {
  const currentTotal = (parseFloat(savings) || 0) + (parseFloat(investment) || 0) + (parseFloat(targetSaving) || 0);
  if (currentTotal <= 0) return { savings: 0, investment: 0, targetSaving: 0 };
  const factor = targetTotal / currentTotal;
  const s = Math.round((savings * factor) * 100) / 100;
  const i = Math.round((investment * factor) * 100) / 100;
  const t = Math.round((targetSaving * factor) * 100) / 100;
  // Fix rounding drift
  const drift = targetTotal - (s + i + t);
  if (Math.abs(drift) > 0.005) {
    // Add drift to the largest bucket
    const maxVal = Math.max(s, i, t);
    if (maxVal === s) return { savings: Math.round((s + drift) * 100) / 100, investment: i, targetSaving: t };
    if (maxVal === i) return { savings: s, investment: Math.round((i + drift) * 100) / 100, targetSaving: t };
    return { savings: s, investment: i, targetSaving: Math.round((t + drift) * 100) / 100 };
  }
  return { savings: s, investment: i, targetSaving: t };
}

// Get all contributions with pagination and filtering
const getContributions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, user_id, month, year, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (status) whereClause.status = status;
    const requesterRole = String(req.user?.role || '').toLowerCase().trim();
    if (requesterRole === 'member') {
      whereClause.user_id = req.user?.id;
    } else if (user_id) {
      whereClause.user_id = user_id;
    }
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const includeClause = [{
      model: User,
      as: 'user',
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        attributes: ['psn', 'name', 'email'],
        where: search ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { psn: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        } : undefined
      }],
      attributes: ['id'],
      required: !!search // If searching, we need the user to match
    }];

    const { count, rows } = await Contribution.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [['contribution_date', 'DESC']],
      include: includeClause
    });

    res.json({
      success: true,
      contributions: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getContributionById = async (req, res) => {
  try {
    const { id } = req.params;

    const contribution = await Contribution.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'psn', 'email']
      }]
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Contribution not found'
      });
    }

    res.json({
      success: true,
      contribution
    });

  } catch (error) {
    console.error('Get contribution by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const createContribution = async (req, res) => {
  try {
    let { user_id, member_psn, period, savings, investment, target_saving, month, year, notes, payment_method } = req.body;

    const requesterRole = String(req.user?.role || '').toLowerCase().trim();
    const isMemberRequester = requesterRole === 'member';
    const isPrivilegedRequester = ['admin', 'super_admin', 'treasurer', 'chairman', 'secretary', 'manager', 'operator'].includes(requesterRole);

    if (!isMemberRequester && !isPrivilegedRequester) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (isMemberRequester) {
      user_id = req.user?.id;
      member_psn = undefined;
    }

    // Resolve user_id from member_psn if provided
    if (!user_id && member_psn) {
      const user = await User.findOne({
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          where: { psn: member_psn }
        }]
      });
      
      if (user) {
        user_id = user.id;
      } else {
        return res.status(404).json({
          success: false,
          message: `User with PSN ${member_psn} not found`
        });
      }
    }

    // Parse period (YYYY-MM) if provided
    if (period && (!month || !year)) {
      const [yearStr, monthStr] = period.split('-');
      year = parseInt(yearStr);
      month = parseInt(monthStr);
    }

    // Validate user exists
    const user = await User.findByPk(user_id, {
      include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['id', 'status'] }]
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (isMemberRequester && Number(user.id) !== Number(req.user?.id)) {
      return res.status(403).json({ success: false, message: 'Members can only submit contributions for their own account.' });
    }

    if (!user.membershipApplication || String(user.membershipApplication.status || '').toLowerCase() !== 'approved') {
      return res.status(400).json({ success: false, message: 'Member profile is not approved for contributions.' });
    }

    // RBAC: Prevent executive roles from receiving contributions
    const RESTRICTED_ROLES = ['chairman', 'treasurer', 'secretary'];
    if (RESTRICTED_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Contributions are not allowed for ${user.role} accounts. Please use the regular member account.`
      });
    }

    const monthInt = parseInt(String(month), 10);
    const yearInt = parseInt(String(year), 10);
    if (!Number.isFinite(monthInt) || !Number.isFinite(yearInt) || monthInt < 1 || monthInt > 12 || yearInt < 2020 || yearInt > 2050) {
      return res.status(400).json({ success: false, message: 'Invalid month/year. Use month 1-12 and year 2020-2050.' });
    }

    const savingsAmount = parseFloat(savings) || 0;
    const investmentAmount = parseFloat(investment) || 0;
    const targetSavingAmount = parseFloat(target_saving) || 0;

    if (savingsAmount < 0 || investmentAmount < 0 || targetSavingAmount < 0) {
      return res.status(400).json({ success: false, message: 'Contribution amounts cannot be negative' });
    }

    const totalAmount = savingsAmount + investmentAmount + targetSavingAmount;
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Total amount must be greater than 0' });
    }

    const normalizedMethod = normalizePaymentMethod(payment_method || '');
    if (!isAllowedPaymentMethod(normalizedMethod)) {
      const detected = sanitizePaymentMethod(payment_method);
      return res.status(400).json({
        success: false,
        message: `Invalid payment method '${detected || '(empty)'}'. Allowed: bank transfer, salary deduction.`
      });
    }

  // Apply membership/admin fee
  const fee = await determineApplicableFee(user_id, { month: monthInt, year: yearInt });
  if (fee.amount > 0 && totalAmount <= fee.amount) {
    return res.status(400).json({
      success: false,
      message: `Contribution must exceed required ${fee.type.replace('_', ' ')} of ₦${fee.amount}`
    });
  }
  const netTotal = Math.round((totalAmount - fee.amount) * 100) / 100;
  const scaled = scaleBuckets(savingsAmount, investmentAmount, targetSavingAmount, netTotal);

  // Create contribution
  const contribution = await Contribution.create({
    user_id,
    savings: scaled.savings,
    investment: scaled.investment,
    target_saving: scaled.targetSaving,
    total_amount: netTotal,
    month: monthInt,
    year: yearInt,
    notes,
    payment_method: normalizedMethod,
    contribution_date: new Date()
  });

  // Fetch with user data
  const contributionWithUser = await Contribution.findByPk(contribution.id, {
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
  });

  // Audit log fee deduction
  try {
    if (fee.amount > 0 && ActivityLog && req.user) {
      await ActivityLog.logActivity(
        req.user,
        'apply_fee_deduction',
        'contribution',
        contribution.id,
        `Applied ${fee.type} of ₦${fee.amount} for contribution`,
        { original_total: totalAmount, net_total: netTotal, fee },
        req
      );
    }
  } catch (e) {
    console.error('Fee deduction audit log failed:', e);
  }

  // Notify member (Fee notifications removed as per policy update)
  /* 
  try {
    await Notification.create({
      user_id,
      type: 'fee_deducted',
      title: 'Fee Deducted',
      message: `A ${fee.type.replace('_', ' ')} of ₦${fee.amount} was deducted from your contribution for ${month}/${year}.`,
      data: { contribution_id: contribution.id, fee },
      is_read: false
    });
  } catch (e) {
    console.error('Failed to create fee notification:', e);
  }
  */

  res.status(201).json({
    success: true,
    message: 'Contribution created successfully',
    contribution: contributionWithUser,
    fee_applied: fee
  });

} catch (error) {
    console.error('Create contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getFeeDeductions = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    // Security check: Users can only view their own deductions unless admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.id !== parseInt(user_id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to deductions history'
      });
    }

    const deductions = await ActivityLog.findAll({
      where: {
        user_id: user_id,
        action: 'apply_fee_deduction',
        resource_type: 'contribution'
      },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'description', 'metadata', 'created_at']
    });

    res.json({
      success: true,
      deductions: deductions.map(d => ({
        id: d.id,
        description: d.description,
        amount: d.metadata?.fee?.amount || 0,
        type: d.metadata?.fee?.type || 'unknown',
        date: d.created_at,
        original_total: d.metadata?.original_total,
        net_total: d.metadata?.net_total
      }))
    });

  } catch (error) {
    console.error('Get fee deductions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const { savings, investment, target_saving, status, notes, approved_by, date } = req.body;

    const contribution = await Contribution.findByPk(id);

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Contribution not found'
      });
    }

    // Store old values for audit log
    const oldValues = {
        savings: contribution.savings,
        investment: contribution.investment,
        target_saving: contribution.target_saving,
        total_amount: contribution.total_amount,
        status: contribution.status,
        notes: contribution.notes,
        contribution_date: contribution.contribution_date
    };

    const savingsAmount = savings !== undefined ? parseFloat(savings) || 0 : parseFloat(contribution.savings) || 0;
    const investmentAmount = investment !== undefined ? parseFloat(investment) || 0 : parseFloat(contribution.investment) || 0;
    const targetSavingAmount = target_saving !== undefined ? parseFloat(target_saving) || 0 : parseFloat(contribution.target_saving) || 0;
    
    // Validation: Prevent negative amounts
    if (savingsAmount < 0 || investmentAmount < 0 || targetSavingAmount < 0) {
        return res.status(400).json({
            success: false,
            message: 'Contribution amounts cannot be negative'
        });
    }

    const totalAmount = savingsAmount + investmentAmount + targetSavingAmount;

    const updateData = {
      savings: savingsAmount,
      investment: investmentAmount,
      target_saving: targetSavingAmount,
      total_amount: totalAmount,
      notes
    };

    // Update date if provided
    if (date) {
        const newDate = new Date(date);
        const today = new Date();
        // Validation: Prevent future dates
        if (newDate > today) {
             return res.status(400).json({
                success: false,
                message: 'Contribution date cannot be in the future'
            });
        }
        updateData.contribution_date = newDate;
        updateData.month = newDate.getMonth() + 1;
        updateData.year = newDate.getFullYear();
    }

    if (status) {
      updateData.status = status;
      if (status === 'approved' && approved_by) {
        updateData.approved_by = approved_by;
        updateData.approval_date = new Date();
      }
    }

    await contribution.update(updateData);

    // Fetch updated contribution with user data
    const updatedContribution = await Contribution.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        include: [{
            model: MembershipApplication,
            as: 'membershipApplication',
            attributes: ['name', 'psn']
        }],
        attributes: ['id', 'name', 'psn', 'email']
      }]
    });

    // Audit Logging
    if (ActivityLog && req.user) {
        try {
            await ActivityLog.create({
                user_id: req.user.id,
                user_name: req.user.name || 'Admin',
                user_role: req.user.role,
                action: 'UPDATE_CONTRIBUTION',
                resource_type: 'CONTRIBUTION',
                resource_id: contribution.id,
                description: `Updated contribution for member ${updatedContribution.user?.membershipApplication?.psn || updatedContribution.user_id}`,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                metadata: {
                    old_values: oldValues,
                    new_values: updateData
                }
            });
        } catch (logError) {
            console.error('Failed to log contribution update:', logError);
        }
    }

    res.json({
      success: true,
      message: 'Contribution updated successfully',
      contribution: updatedContribution
    });

  } catch (error) {
    console.error('Update contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const deleteContribution = async (req, res) => {
  try {
    const { id } = req.params;

    const contribution = await Contribution.findByPk(id);

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Contribution not found'
      });
    }

    await contribution.destroy();

    res.json({
      success: true,
      message: 'Contribution deleted successfully'
    });

  } catch (error) {
    console.error('Delete contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getContributionStats = async (req, res) => {
  try {
    const { year, month } = req.query;

    const whereClause = {};
    if (year) whereClause.year = year;
    if (month) whereClause.month = month;

    const [totalContributions, approvedContributions, pendingContributions] = await Promise.all([
      Contribution.count({ where: { ...whereClause, status: 'approved' } }),
      Contribution.sum('total_amount', { where: { ...whereClause, status: 'approved' } }),
      Contribution.count({ where: { ...whereClause, status: 'pending' } })
    ]);

    res.json({
      success: true,
      stats: {
        total_contributions: totalContributions || 0,
        total_amount: approvedContributions || 0,
        pending_contributions: pendingContributions || 0
      }
    });

  } catch (error) {
    console.error('Get contribution stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


// Create contribution by PSN (admin function)
const createContributionByPsn = async (req, res) => {
  try {
    const { psn, totalAmount, month, year, paymentMethod, notes } = req.body;

    console.log('🔄 [CONTRIBUTION] REQUEST BODY:', JSON.stringify(req.body, null, 2));
    console.log('🔄 [CONTRIBUTION] Extracted values:', { psn, totalAmount, month, year, paymentMethod, notes });

    // Validate required fields
    if (!psn || !totalAmount || !month || !year) {
      console.log('❌ [CONTRIBUTION] VALIDATION FAILED:', {
        psn: !!psn,
        totalAmount: !!totalAmount,
        month: !!month,
        year: !!year,
        typeChecks: {
          psn: typeof psn,
          totalAmount: typeof totalAmount,
          month: typeof month,
          year: typeof year
        }
      });
      return res.status(400).json({
        success: false,
        message: 'PSN, total amount, month, and year are required'
      });
    }

    // Find user by PSN
    const user = await User.findOne({
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        where: { psn: psn.trim() }
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No member found with PSN: ${psn}`
      });
    }

    // RBAC: Prevent executive roles from receiving contributions
    const RESTRICTED_ROLES = ['chairman', 'treasurer', 'secretary'];
    if (RESTRICTED_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Contributions are not allowed for ${user.role} accounts. Please use the regular member account.`
      });
    }

    const monthInt = parseInt(String(month), 10);
    const yearInt = parseInt(String(year), 10);
    if (!Number.isFinite(monthInt) || !Number.isFinite(yearInt) || monthInt < 1 || monthInt > 12 || yearInt < 2020 || yearInt > 2050) {
      return res.status(400).json({ success: false, message: 'Invalid month/year. Use month 1-12 and year 2020-2050.' });
    }

    if (!user.membershipApplication || String(user.membershipApplication.status || '').toLowerCase() !== 'approved') {
      return res.status(400).json({ success: false, message: 'Member profile is not approved for contributions.' });
    }

    const totalContributionAmount = parseFloat(totalAmount);
    if (!Number.isFinite(totalContributionAmount) || totalContributionAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total amount must be greater than 0'
      });
    }

  // Get member's configured FIXED monthly amounts (not ratios)
  const memberSavings = parseFloat(user.membershipApplication.savings) || 0;
  const memberInvestment = parseFloat(user.membershipApplication.investment) || 0;
  const memberTargetSaving = parseFloat(user.membershipApplication.target_saving) || 0;

  console.log('🔍 [CONTRIBUTION] Member configured amounts:', {
    savings: memberSavings,
    investment: memberInvestment,
    targetSaving: memberTargetSaving
  });

  // Calculate total configured contribution
  const totalConfigured = memberSavings + memberInvestment + memberTargetSaving;

  if (totalConfigured === 0) {
    return res.status(400).json({
      success: false,
      message: 'Member has no contribution amounts configured. Please update their membership settings.'
    });
  }

  const normalizedMethod = normalizePaymentMethod(paymentMethod || '');
  if (!isAllowedPaymentMethod(normalizedMethod)) {
    const detected = sanitizePaymentMethod(paymentMethod);
    return res.status(400).json({
      success: false,
      message: `Invalid payment method '${detected || '(empty)'}'. Allowed: bank transfer, salary deduction.`
    });
  }

  // Apply fee and compute net amount
  const fee = await determineApplicableFee(user.id, { month: monthInt, year: yearInt });
  if (fee.amount > 0 && totalContributionAmount <= fee.amount) {
    return res.status(400).json({
      success: false,
      message: `Contribution must exceed required ${fee.type.replace('_', ' ')} of ₦${fee.amount}`
    });
  }
  const netAmount = Math.round((totalContributionAmount - fee.amount) * 100) / 100;

  // Distribute the total amount PROPORTIONALLY based on configured preferences
  const savingsRatio = memberSavings / totalConfigured;
  const investmentRatio = memberInvestment / totalConfigured;
  const targetRatio = memberTargetSaving / totalConfigured;

  console.log('💰 [CONTRIBUTION] Distribution Ratios:', {
    savingsRatio: savingsRatio.toFixed(4),
    investmentRatio: investmentRatio.toFixed(4),
    targetRatio: targetRatio.toFixed(4)
  });

  let savingsAmount = netAmount * savingsRatio;
  let investmentAmount = netAmount * investmentRatio;
  let targetSavingAmount = netAmount * targetRatio;

  // Round to 2 decimal places
  savingsAmount = Math.round(savingsAmount * 100) / 100;
  investmentAmount = Math.round(investmentAmount * 100) / 100;
  targetSavingAmount = Math.round(targetSavingAmount * 100) / 100;

  // Adjust for rounding errors to ensure exact match with totalContributionAmount
  const currentTotal = savingsAmount + investmentAmount + targetSavingAmount;
  const difference = netAmount - currentTotal;

  if (Math.abs(difference) > 0.005) {
    console.log('⚖️ [CONTRIBUTION] Adjusting for rounding difference:', difference);
    // Add difference to the largest category to minimize impact
    if (memberSavings >= memberInvestment && memberSavings >= memberTargetSaving) {
      savingsAmount += difference;
    } else if (memberInvestment >= memberSavings && memberInvestment >= memberTargetSaving) {
      investmentAmount += difference;
    } else {
      targetSavingAmount += difference;
    }
    
    // Ensure we are still at 2 decimals
    savingsAmount = Math.round(savingsAmount * 100) / 100;
    investmentAmount = Math.round(investmentAmount * 100) / 100;
    targetSavingAmount = Math.round(targetSavingAmount * 100) / 100;
  }

  console.log('✅ [CONTRIBUTION] Final Distributed Amounts:', {
    savings: savingsAmount.toFixed(2),
    investment: investmentAmount.toFixed(2),
    targetSaving: targetSavingAmount.toFixed(2),
    total: (savingsAmount + investmentAmount + targetSavingAmount).toFixed(2),
    originalTotal: totalContributionAmount,
    netAmount,
    fee
  });

  // Create contribution
  const contribution = await Contribution.create({
    user_id: user.id,
    savings: Math.round(savingsAmount * 100) / 100, // Round to 2 decimal places
    investment: Math.round(investmentAmount * 100) / 100,
    target_saving: Math.round(targetSavingAmount * 100) / 100, // ✅ ADDED THIS!
    total_amount: netAmount,
    month: monthInt,
    year: yearInt,
    contribution_date: new Date(),
    payment_method: normalizedMethod,
    notes: notes || 'Added by admin',
    status: 'approved', // Auto-approve admin contributions
    approved_by: req.user?.id || null,
    approval_date: new Date()
  });

  console.log('✅ [CONTRIBUTION] SAVED to database:', {
    savings: Math.round(savingsAmount * 100) / 100,
    investment: Math.round(investmentAmount * 100) / 100,
    targetSaving: Math.round(targetSavingAmount * 100) / 100, // ✅ CONFIRMING
    total: netAmount
  });

  // Fetch with user data
  const contributionWithUser = await Contribution.findByPk(contribution.id, {
    include: [{
      model: User,
      as: 'user',
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        attributes: ['psn', 'name', 'email']
      }],
      attributes: ['id']
    }]
  });

  // Audit log fee deduction
  try {
    if (fee.amount > 0 && ActivityLog && req.user) {
      await ActivityLog.logActivity(
        req.user,
        'apply_fee_deduction',
        'contribution',
        contribution.id,
        `Applied ${fee.type} of ₦${fee.amount} for contribution`,
        { original_total: totalContributionAmount, net_total: netAmount, fee },
        req
      );
    }
  } catch (e) {
    console.error('Fee deduction audit log failed:', e);
  }

  // Notify member (Fee notifications removed as per policy update)
  /*
  try {
    await Notification.create({
      user_id: user.id,
      type: 'fee_deducted',
      title: 'Fee Deducted',
      message: `A ${fee.type.replace('_', ' ')} of ₦${fee.amount} was deducted from your contribution for ${month}/${year}.`,
      data: { contribution_id: contribution.id, fee },
      is_read: false
    });
  } catch (e) {
    console.error('Failed to create fee notification:', e);
  }
  */

  console.log('✅ [CONTRIBUTION] Successfully created contribution ID:', contribution.id);

  res.status(201).json({
    success: true,
    message: `Contribution of ₦${totalContributionAmount.toLocaleString()} created successfully for ${user.membershipApplication.name} (${psn})`,
    contribution: contributionWithUser,
    distribution: {
      savings: savingsAmount.toFixed(2),
      investment: investmentAmount.toFixed(2),
      targetSaving: targetSavingAmount.toFixed(2)
    },
    fee_applied: fee
  });

  } catch (error) {
    console.error('❌ Create contribution by PSN error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};



// Bulk upload contributions from CSV/Excel with batch tracking
const bulkUploadContributions = async (req, res) => {
  const normalizeRole = (role) => String(role || '').toLowerCase().trim();
  const canUpload = (user) => {
    const role = normalizeRole(user?.role);
    return ['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'manager', 'operator'].includes(role);
  };

  const isTransientDbError = (err) => {
    const code = err?.original?.code || err?.parent?.code || err?.code;
    const msg = String(err?.message || '').toLowerCase();
    return (
      code === '40001' ||
      code === '40P01' ||
      code === '57P01' ||
      msg.includes('deadlock') ||
      msg.includes('could not serialize') ||
      msg.includes('timeout') ||
      msg.includes('econnreset')
    );
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const withRetries = async (fn, attempts = 3) => {
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        if (!isTransientDbError(e) || i === attempts - 1) throw e;
        await sleep(150 * Math.pow(2, i));
      }
    }
    throw lastErr;
  };

  const normalizeKey = (key) => String(key || '').toLowerCase().trim().replace(/\s+/g, '_');

  const pick = (row, keys) => {
    for (const k of keys) {
      const normalized = normalizeKey(k);
      const candidates = [k, normalized];
      for (const c of candidates) {
        if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') return row[c];
      }
    }
    return undefined;
  };

    const toUtcDateOnly = (d) => {
      const dt = d instanceof Date ? d : new Date(d);
      if (!(dt instanceof Date) || isNaN(dt.getTime())) return null;
      return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
    };

    const ymdUtc = (d) => {
      const dt = toUtcDateOnly(d);
      if (!dt) return '';
      const yyyy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const parsePaymentDate = (raw, monthInt, yearInt) => {
      if (raw == null || String(raw).trim() === '') {
        if (Number.isFinite(monthInt) && Number.isFinite(yearInt)) return new Date(Date.UTC(yearInt, monthInt - 1, 1));
        return null;
      }

      if (raw instanceof Date) return toUtcDateOnly(raw);

      if (typeof raw === 'number' && Number.isFinite(raw)) {
        const excelMs = (raw - 25569) * 86400 * 1000;
        return toUtcDateOnly(new Date(excelMs));
      }

      const s = String(raw).replace(/[\r\n\t]+/g, ' ').trim();
      if (!s) return null;
      const iso = /^\d{4}-\d{2}-\d{2}$/;
      if (iso.test(s)) return toUtcDateOnly(new Date(`${s}T00:00:00Z`));

      const parts = s.split(/[^\d]+/).filter(Boolean);
      if (parts.length >= 3) {
        const a = parseInt(parts[0], 10);
        const b = parseInt(parts[1], 10);
        const c = parseInt(parts[2], 10);
        if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
          let yyyy = a;
          let mm = b;
          let dd = c;
          if (a <= 31 && c >= 2000) {
            yyyy = c;
            dd = a;
            mm = b;
          } else if (a <= 12 && b <= 31 && c >= 2000) {
            yyyy = c;
            mm = a;
            dd = b;
          }
          if (yyyy >= 2020 && yyyy <= 2050 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
            return new Date(Date.UTC(yyyy, mm - 1, dd));
          }
        }
      }

      const dt = new Date(s);
      if (!isNaN(dt.getTime())) return toUtcDateOnly(dt);
      if (Number.isFinite(monthInt) && Number.isFinite(yearInt)) return new Date(Date.UTC(yearInt, monthInt - 1, 1));
      return null;
    };

  const parseMonth = (val) => {
    if (!val) return NaN;
    const v = String(val).trim().toLowerCase();
    if (!isNaN(parseInt(v))) return parseInt(v);
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const index = months.findIndex((m) => v.startsWith(m));
    if (index !== -1) return index + 1;
    const shortIndex = shortMonths.indexOf(v.substring(0, 3));
    if (shortIndex !== -1) return shortIndex + 1;
    return NaN;
  };

  const parseAmount = (raw) => {
    const amount = parseFloat(String(raw || '').replace(/,/g, '').trim());
    return Number.isFinite(amount) ? amount : NaN;
  };

  const UPLOAD_TYPE = 'contributions_import';

  const processBatch = async ({ batchId, filePath, originalName, adminId, adminRole, reqCtx, prevalidate }) => {
    const start = Date.now();
    let results = [];
    let successCount = 0;
    let failureCount = 0;
    let successTotalAmount = 0;
    let duplicateInFileCount = 0;
    let duplicateInSystemCount = 0;
    let ineligibleMemberCount = 0;
    let invalidPaymentDateCount = 0;
    const errorsToCreate = [];

    const safeUnlink = () => {
      try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
    };

    const addError = (rowNumber, recordKey, errorCode, message, fields, rawRecord) => {
      errorsToCreate.push({
        batch_id: batchId,
        row_number: rowNumber,
        record_key: recordKey,
        error_code: errorCode,
        message,
        fields: fields || null,
        raw_record: rawRecord || null
      });
      failureCount += 1;
    };

    const flushErrors = async () => {
      if (errorsToCreate.length === 0) return;
      const chunk = errorsToCreate.splice(0, errorsToCreate.length);
      await UploadRecordError.bulkCreate(chunk);
    };

    const updateProgress = async (payload) => {
      const batch = await UploadBatch.findByPk(batchId);
      if (!batch) return;
      await batch.update({
        ...payload,
        metadata: {
          ...(batch.metadata || {}),
          ...(payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
          processed_records: successCount + failureCount,
          started_at: (batch.metadata || {}).started_at || new Date(start).toISOString()
        }
      });
    };

    try {
      const ext = path.extname(originalName || '').toLowerCase();

      if (ext === '.xlsx' || ext === '.xls') {
        const workbook = XLSX.readFile(filePath, { cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        results = rawRows.map((r) => {
          const out = {};
          for (const k of Object.keys(r)) out[normalizeKey(k)] = r[k];
          return out;
        });
      } else {
        results = await new Promise((resolve, reject) => {
          const rows = [];
          fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
              const out = {};
              for (const k of Object.keys(data)) out[normalizeKey(k)] = data[k];
              rows.push(out);
            })
            .on('end', () => resolve(rows))
            .on('error', reject);
        });
      }

      await updateProgress({ total_records: results.length, metadata: { prevalidate: !!prevalidate } });

      const psnsInFile = Array.from(new Set(results.map((r) => {
        const v = pick(r, ['psn', 'member_id', 'id']);
        return v == null ? '' : String(v).trim();
      }).filter(Boolean)));

      const approvedMembershipRows = psnsInFile.length
        ? await MembershipApplication.findAll({
            where: { psn: { [Op.in]: psnsInFile } },
            attributes: ['id', 'psn', 'status'],
            raw: true
          })
        : [];
      const membershipByPsn = new Map(approvedMembershipRows.map((m) => [String(m.psn).trim(), m]));

      const userRows = psnsInFile.length
        ? await User.findAll({
            where: { status: 'active' },
            attributes: ['id', 'role', 'status'],
            include: [{
              model: MembershipApplication,
              as: 'membershipApplication',
              where: { psn: { [Op.in]: psnsInFile }, status: 'approved' },
              attributes: ['psn', 'status'],
              required: true
            }],
            required: true
          })
        : [];

      const userByPsn = new Map();
      for (const u of userRows) {
        const psnVal = String(u.membershipApplication?.psn || '').trim();
        if (!psnVal) continue;
        const prev = userByPsn.get(psnVal);
        if (!prev) userByPsn.set(psnVal, u);
        else if (String(prev.role || '') !== 'member' && String(u.role || '') === 'member') userByPsn.set(psnVal, u);
      }

      const candidateTuples = [];
      const minMax = { min: null, max: null };
      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const psn = pick(row, ['psn', 'member_id', 'id']);
        const psnKey = psn == null ? '' : String(psn).trim();
        const user = psnKey ? userByPsn.get(psnKey) : null;
        if (!user) continue;

        let monthVal = pick(row, ['month', 'period']);
        let yearVal = pick(row, ['year']);
        if (monthVal && typeof monthVal === 'string' && monthVal.includes('-') && (!yearVal || String(yearVal).trim() === '')) {
          const parts = monthVal.split('-');
          if (parts.length >= 2) {
            yearVal = parts[0];
            monthVal = parts[1];
          }
        }
        const monthInt = parseMonth(monthVal);
        const yearInt = parseInt(String(yearVal || '').trim(), 10);

        const paymentDateVal = pick(row, ['payment_date', 'payment date', 'paid_on', 'paid on', 'transaction_date', 'transaction date', 'date']);
        const paymentDate = parsePaymentDate(paymentDateVal, monthInt, yearInt);
        if (!paymentDate) continue;

        const totalAmountVal = pick(row, ['total_amount', 'total amount', 'amount', 'total']);
        const savingsVal = pick(row, ['savings']);
        const investmentVal = pick(row, ['investment']);
        const targetSavingVal = pick(row, ['target_saving', 'target saving', 'target']);
        const amount = (() => {
          if (totalAmountVal !== undefined && totalAmountVal !== null && String(totalAmountVal).trim() !== '') return parseAmount(totalAmountVal);
          const s = parseAmount(savingsVal || 0);
          const inv = parseAmount(investmentVal || 0);
          const t = parseAmount(targetSavingVal || 0);
          const sum = (Number.isFinite(s) ? s : 0) + (Number.isFinite(inv) ? inv : 0) + (Number.isFinite(t) ? t : 0);
          return sum;
        })();
        if (!Number.isFinite(amount) || amount <= 0) continue;

        const amountKey = (Math.round(amount * 100) / 100).toFixed(2);
        const key = `${user.id}|${amountKey}|${ymdUtc(paymentDate)}`;
        candidateTuples.push({ key, user_id: user.id, paymentDate, amountKey });
        if (!minMax.min || paymentDate < minMax.min) minMax.min = paymentDate;
        if (!minMax.max || paymentDate > minMax.max) minMax.max = paymentDate;
      }

      const existingKeySet = new Set();
      if (candidateTuples.length > 0) {
        const userIds = Array.from(new Set(candidateTuples.map((t) => t.user_id)));
        const from = minMax.min;
        const to = new Date(minMax.max.getTime() + 24 * 60 * 60 * 1000 - 1);
        const existing = await Contribution.findAll({
          where: {
            user_id: { [Op.in]: userIds },
            contribution_date: { [Op.between]: [from, to] }
          },
          attributes: ['user_id', 'total_amount', 'contribution_date'],
          raw: true
        });
        for (const e of existing) {
          const uid = Number(e.user_id);
          const amt = (Math.round(parseFloat(e.total_amount || 0) * 100) / 100).toFixed(2);
          const d = e.contribution_date ? toUtcDateOnly(e.contribution_date) : null;
          if (!d) continue;
          existingKeySet.add(`${uid}|${amt}|${ymdUtc(d)}`);
        }
      }

      const seenInFile = new Set();

      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const rowNumber = i + 2;

        const psn = pick(row, ['psn', 'member_id', 'id']);
        let monthVal = pick(row, ['month', 'period']);
        let yearVal = pick(row, ['year']);
        const paymentMethod = pick(row, ['payment_method', 'method', 'payment']) || '';
        const typeVal = pick(row, ['type', 'contribution_type']);
        const paymentDateVal = pick(row, ['payment_date', 'payment date', 'paid_on', 'paid on', 'transaction_date', 'transaction date', 'date']);

        const savingsVal = pick(row, ['savings']);
        const investmentVal = pick(row, ['investment']);
        const targetSavingVal = pick(row, ['target_saving', 'target saving', 'target']);
        const totalAmountVal = pick(row, ['total_amount', 'total amount', 'amount', 'total']);

        if (monthVal && typeof monthVal === 'string' && monthVal.includes('-') && (!yearVal || String(yearVal).trim() === '')) {
          const parts = monthVal.split('-');
          if (parts.length >= 2) {
            yearVal = parts[0];
            monthVal = parts[1];
          }
        }

        const monthIntForDate = parseMonth(monthVal);
        const yearIntForDate = parseInt(String(yearVal || '').trim(), 10);
        const parsedPaymentDate = parsePaymentDate(paymentDateVal, monthIntForDate, yearIntForDate);
        if (parsedPaymentDate && (!monthVal || !yearVal)) {
          monthVal = monthVal || String(parsedPaymentDate.getUTCMonth() + 1);
          yearVal = yearVal || String(parsedPaymentDate.getUTCFullYear());
        }

        const rawRecord = {
          psn: psn ?? null,
          month: monthVal ?? null,
          year: yearVal ?? null,
          payment_date: paymentDateVal ?? null,
          payment_method: paymentMethod ?? null,
          type: typeVal ?? null,
          total_amount: totalAmountVal ?? null,
          savings: savingsVal ?? null,
          investment: investmentVal ?? null,
          target_saving: targetSavingVal ?? null
        };

        const missing = [];
        if (!psn) missing.push('PSN');
        if (!monthVal) missing.push('Month/Period');
        if (!yearVal) missing.push('Year');
        if (!typeVal && !totalAmountVal && !savingsVal && !investmentVal && !targetSavingVal) missing.push('Amount');

        const recordKey = psn ? `psn:${String(psn).trim()}` : null;

        if (missing.length > 0) {
          addError(rowNumber, recordKey, 'MISSING_FIELDS', `Missing required field(s): ${missing.join(', ')}`, { column: missing.join(', '), suggestion: 'Fill the missing values and re-upload.' }, rawRecord);
          continue;
        }

        const monthInt = parseMonth(monthVal);
        const yearInt = parseInt(String(yearVal).trim(), 10);
        if (!Number.isFinite(monthInt) || !Number.isFinite(yearInt) || monthInt < 1 || monthInt > 12) {
          addError(rowNumber, recordKey, 'INVALID_PERIOD', 'Invalid Month/Year format.', { column: 'Month/Year', value: `${monthVal}/${yearVal}`, suggestion: 'Use Month (1-12) and Year (e.g., 2026) or Period as YYYY-MM.' }, rawRecord);
          continue;
        }

        const paymentDate = parsePaymentDate(paymentDateVal, monthInt, yearInt);
        if (!paymentDate) {
          invalidPaymentDateCount += 1;
          addError(
            rowNumber,
            recordKey,
            'INVALID_PAYMENT_DATE',
            `Invalid payment date '${String(paymentDateVal || '').trim() || '(empty)'}'. Use YYYY-MM-DD.`,
            { column: 'Payment_Date', detected_value: String(paymentDateVal || ''), suggestion: 'Use a valid date (e.g., 2026-03-15).' },
            rawRecord
          );
          continue;
        }

        const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
        if (!isAllowedPaymentMethod(normalizedPaymentMethod)) {
          const detected = sanitizePaymentMethod(paymentMethod);
          const allowedLabel = 'bank transfer, salary deduction';
          addError(
            rowNumber,
            recordKey,
            'INVALID_PAYMENT_METHOD',
            `Invalid payment method '${detected || '(empty)'}'. Allowed: ${allowedLabel}.`,
            {
              column: 'Payment_Method',
              detected_value: detected || '',
              normalized_value: normalizedPaymentMethod || '',
              allowed_values: ['bank transfer', 'salary deduction'],
              suggestion: `Use only: ${allowedLabel}.`
            },
            rawRecord
          );
          continue;
        }

        const amount = (() => {
          if (totalAmountVal !== undefined && totalAmountVal !== null && String(totalAmountVal).trim() !== '') return parseAmount(totalAmountVal);
          const s = parseAmount(savingsVal || 0);
          const inv = parseAmount(investmentVal || 0);
          const t = parseAmount(targetSavingVal || 0);
          const sum = (Number.isFinite(s) ? s : 0) + (Number.isFinite(inv) ? inv : 0) + (Number.isFinite(t) ? t : 0);
          return sum;
        })();

        if (!Number.isFinite(amount) || amount <= 0) {
          addError(rowNumber, recordKey, 'INVALID_AMOUNT', 'Amount must be a positive number.', { column: 'Amount', value: totalAmountVal ?? null, suggestion: 'Enter a number greater than 0.' }, rawRecord);
          continue;
        }

        const member = psn == null ? null : userByPsn.get(String(psn).trim());
        const membership = psn == null ? null : membershipByPsn.get(String(psn).trim());
        if (!membership) {
          ineligibleMemberCount += 1;
          addError(rowNumber, recordKey, 'MEMBER_NOT_FOUND', `No member found with PSN '${String(psn).trim()}'.`, { suggestion: 'Ensure the PSN exists and is correct.' }, rawRecord);
          continue;
        }
        if (String(membership.status || '').toLowerCase() !== 'approved') {
          ineligibleMemberCount += 1;
          addError(rowNumber, recordKey, 'MEMBER_NOT_APPROVED', `Member PSN '${String(psn).trim()}' is not approved/active.`, { suggestion: 'Ensure the member is registered and approved, then retry.' }, rawRecord);
          continue;
        }
        if (!member) {
          ineligibleMemberCount += 1;
          addError(rowNumber, recordKey, 'MEMBER_NOT_FOUND', `No active user account found for PSN '${String(psn).trim()}'.`, { suggestion: 'Ensure the member has an active account and is not disabled.' }, rawRecord);
          continue;
        }
        const restricted = ['chairman', 'treasurer', 'secretary'];
        if (restricted.includes(String(member.role || '').toLowerCase())) {
          ineligibleMemberCount += 1;
          addError(rowNumber, recordKey, 'RESTRICTED_ROLE', `Skipped: ${member.role} accounts cannot receive contributions`, { suggestion: 'Use the regular member account PSN.' }, rawRecord);
          continue;
        }

        const amountKey = (Math.round(amount * 100) / 100).toFixed(2);
        const key = `${member.id}|${amountKey}|${ymdUtc(paymentDate)}`;
        if (seenInFile.has(key)) {
          duplicateInFileCount += 1;
          addError(
            rowNumber,
            recordKey,
            'DUPLICATE_IN_FILE',
            `Duplicate contribution in file for PSN '${String(psn).trim()}', amount ${amountKey}, date ${ymdUtc(paymentDate)}.`,
            { detected_value: sanitizePaymentMethod(paymentMethod), suggestion: 'Remove the duplicate row from the spreadsheet.' },
            rawRecord
          );
          continue;
        }
        seenInFile.add(key);
        if (existingKeySet.has(key)) {
          duplicateInSystemCount += 1;
          addError(
            rowNumber,
            recordKey,
            'DUPLICATE_IN_SYSTEM',
            `Duplicate contribution already exists for PSN '${String(psn).trim()}', amount ${amountKey}, date ${ymdUtc(paymentDate)}.`,
            { suggestion: 'Change the payment date/amount or remove the duplicate entry.' },
            rawRecord
          );
          continue;
        }

        try {
          if (prevalidate) {
            successCount += 1;
            successTotalAmount += amount;
            continue;
          }

          await withRetries(async () => {
            const t = await sequelize.transaction();
            try {
              const processResult = typeVal
                ? await processTypedContribution(String(psn).trim(), String(typeVal).trim(), amount, monthInt, yearInt, paymentMethod, adminId, t, paymentDate)
                : await processContributionForPsn(String(psn).trim(), amount, monthInt, yearInt, paymentMethod, adminId, t, paymentDate);

              if (!processResult.success) {
                throw new Error(processResult.error || 'Unknown processing error');
              }
              await t.commit();
            } catch (e) {
              await t.rollback();
              throw e;
            }
          }, 3);

          successCount += 1;
          successTotalAmount += amount;
        } catch (e) {
          const msg = e?.message || 'Failed to process row';
          const code =
            msg.toLowerCase().includes('no member found') ? 'MEMBER_NOT_FOUND'
              : msg.toLowerCase().includes('cannot receive contributions') ? 'RESTRICTED_ROLE'
                : msg.toLowerCase().includes('no contribution amounts configured') ? 'NO_MEMBER_CONFIGURATION'
                  : 'PROCESSING_ERROR';

          addError(rowNumber, recordKey, code, msg, { suggestion: 'Fix the row values and re-upload.' }, rawRecord);
        }

        if ((i + 1) % 25 === 0) {
          await flushErrors();
          await updateProgress({
            success_count: successCount,
            failure_count: failureCount,
            status: 'PROCESSING',
            metadata: {
              success_total_amount: Math.round(successTotalAmount * 100) / 100,
              duplicate_in_file: duplicateInFileCount,
              duplicate_in_system: duplicateInSystemCount,
              ineligible_members: ineligibleMemberCount,
              invalid_payment_dates: invalidPaymentDateCount
            }
          });
        }
      }

      await flushErrors();
      const status = failureCount > 0 ? 'FAILED' : (successCount === 0 ? 'FAILED' : 'COMPLETED');
      await updateProgress({
        total_records: results.length,
        success_count: successCount,
        failure_count: failureCount,
        status,
        completed_at: new Date(),
        metadata: {
          processed_records: successCount + failureCount,
          success_total_amount: Math.round(successTotalAmount * 100) / 100,
          duplicate_in_file: duplicateInFileCount,
          duplicate_in_system: duplicateInSystemCount,
          ineligible_members: ineligibleMemberCount,
          invalid_payment_dates: invalidPaymentDateCount,
          duration_ms: Date.now() - start
        }
      });

      await ActivityLog.logActivity(
        { id: adminId, role: adminRole, name: null },
        'bulk_upload_contributions',
        'upload_batch',
        batchId,
        `Uploaded contributions in batch #${batchId}`,
        { batch_id: batchId, type: UPLOAD_TYPE, total_records: results.length, success_count: successCount, failure_count: failureCount },
        reqCtx
      );

      try {
        const admin = await User.findByPk(adminId, {
          include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['email', 'name'] }],
          attributes: ['id']
        });
        const email = admin?.membershipApplication?.email;
        if (email) {
          await emailService.sendEmail({
            to: email,
            subject: `Bulk Contributions Upload ${status} (Batch #${batchId})`,
            template: null,
            context: null,
            text: `Your bulk contributions upload has ${status}.\n\nTotal: ${results.length}\nSuccessful: ${successCount}\nFailed: ${failureCount}\n\nYou can review the report in the admin dashboard or download it from /bulk-uploads/${batchId}/report.pdf`
          });
        }
      } catch (e) {
        console.error('Bulk contributions upload email failed:', e?.message || e);
      }
    } catch (error) {
      console.error('Bulk contributions upload processing error:', error);
      try {
        const batch = await UploadBatch.findByPk(batchId);
        if (batch) {
          await batch.update({
            status: 'FAILED',
            completed_at: new Date(),
            metadata: { ...(batch.metadata || {}), duration_ms: Date.now() - start, fatal_error: error?.message || 'Unknown error' }
          });
        }
      } catch {}
    } finally {
      safeUnlink();
    }
  };

  try {
    if (!canUpload(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const batch = await UploadBatch.create({
      type: UPLOAD_TYPE,
      status: 'PROCESSING',
      original_filename: req.file.originalname,
      stored_filename: req.file.filename || null,
      created_by: req.user?.id || null,
      metadata: {
        file_size: req.file.size,
        mimetype: req.file.mimetype,
        upload_path: req.file.path,
        started_at: new Date().toISOString()
      }
    });

    const sync = process.env.NODE_ENV === 'test' || String(req.query?.sync || '').toLowerCase() === 'true';
    if (sync) {
      await processBatch({
        batchId: batch.id,
        filePath: req.file.path,
        originalName: req.file.originalname,
        adminId: req.user.id,
        adminRole: req.user.role,
        reqCtx: req,
        prevalidate: String(req.query?.prevalidate || '').toLowerCase() === 'true'
      });
      const refreshed = await UploadBatch.findByPk(batch.id);
      return res.json({
        success: true,
        batch_id: batch.id,
        type: batch.type,
        status: refreshed?.status || batch.status,
        total_records: refreshed?.total_records || 0,
        success_count: refreshed?.success_count || 0,
        failure_count: refreshed?.failure_count || 0
      });
    }

    res.json({ success: true, batch_id: batch.id, type: batch.type, status: batch.status });
    setImmediate(() => {
      processBatch({
        batchId: batch.id,
        filePath: req.file.path,
        originalName: req.file.originalname,
        adminId: req.user.id,
        adminRole: req.user.role,
        reqCtx: req,
        prevalidate: String(req.query?.prevalidate || '').toLowerCase() === 'true'
      }).catch(() => {});
    });
  } catch (error) {
    console.error('Bulk upload contributions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during bulk upload' });
  }
};

// Helper function to process a single contribution (reused from createContributionByPsn)
async function processContributionForPsn(psn, totalAmount, month, year, paymentMethod, adminId, transaction, paymentDate) {
  try {
    // Find user by PSN
    const user = await User.findOne({
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        where: { psn: psn.trim() }
      }],
      transaction
    });

    if (!user) {
      return { success: false, error: `No member found with PSN: ${psn}` };
    }

    // RBAC: Prevent executive roles from receiving contributions
    const RESTRICTED_ROLES = ['chairman', 'treasurer', 'secretary'];
    if (RESTRICTED_ROLES.includes(user.role)) {
      return { success: false, error: `Skipped: ${user.role} accounts cannot receive contributions` };
    }

    const totalContributionAmount = parseFloat(totalAmount);
    if (totalContributionAmount <= 0) {
      return { success: false, error: 'Total amount must be greater than 0' };
    }

    // Get member's configured FIXED monthly amounts (not ratios)
    const memberSavings = parseFloat(user.membershipApplication.savings) || 0;
    const memberInvestment = parseFloat(user.membershipApplication.investment) || 0;
    const memberTargetSaving = parseFloat(user.membershipApplication.target_saving) || 0;

    // Calculate total configured contribution
    const totalConfigured = memberSavings + memberInvestment + memberTargetSaving;

    if (totalConfigured === 0) {
      return { success: false, error: 'Member has no contribution amounts configured' };
    }

    const monthInt = parseInt(String(month), 10);
    const yearInt = parseInt(String(year), 10);
    if (!Number.isFinite(monthInt) || !Number.isFinite(yearInt) || monthInt < 1 || monthInt > 12 || yearInt < 2020 || yearInt > 2050) {
      return { success: false, error: 'Invalid month/year' };
    }

    if (!user.membershipApplication || String(user.membershipApplication.status || '').toLowerCase() !== 'approved') {
      return { success: false, error: 'Member profile is not approved for contributions.' };
    }

    const normalizedMethod = normalizePaymentMethod(paymentMethod || '');
    if (!isAllowedPaymentMethod(normalizedMethod)) {
      const detected = sanitizePaymentMethod(paymentMethod);
      return { success: false, error: `Invalid payment method '${detected || '(empty)'}'. Allowed: bank transfer, salary deduction.` };
    }

    const fee = await determineApplicableFee(user.id, { month: monthInt, year: yearInt, transaction });
    if (fee.amount > 0 && totalContributionAmount <= fee.amount) {
      return { success: false, error: `Contribution must exceed ${fee.type.replace('_', ' ')} of ₦${fee.amount}` };
    }
    const finalTotalAmount = Math.round((totalContributionAmount - fee.amount) * 100) / 100;

    // Distribute the total amount PROPORTIONALLY based on configured preferences
    const savingsRatio = memberSavings / totalConfigured;
    const investmentRatio = memberInvestment / totalConfigured;
    const targetRatio = memberTargetSaving / totalConfigured;

    let savingsAmount = finalTotalAmount * savingsRatio;
    let investmentAmount = finalTotalAmount * investmentRatio;
    let targetSavingAmount = finalTotalAmount * targetRatio;

    // Round to 2 decimal places
    savingsAmount = Math.round(savingsAmount * 100) / 100;
    investmentAmount = Math.round(investmentAmount * 100) / 100;
    targetSavingAmount = Math.round(targetSavingAmount * 100) / 100;

    // Adjust for rounding errors to ensure exact match with finalTotalAmount
    const currentTotal = savingsAmount + investmentAmount + targetSavingAmount;
    const difference = finalTotalAmount - currentTotal;

    if (Math.abs(difference) > 0.005) {
      // Add difference to the largest category to minimize impact
      if (memberSavings >= memberInvestment && memberSavings >= memberTargetSaving) {
        savingsAmount += difference;
      } else if (memberInvestment >= memberSavings && memberInvestment >= memberTargetSaving) {
        investmentAmount += difference;
      } else {
        targetSavingAmount += difference;
      }
      
      // Ensure we are still at 2 decimals
      savingsAmount = Math.round(savingsAmount * 100) / 100;
      investmentAmount = Math.round(investmentAmount * 100) / 100;
      targetSavingAmount = Math.round(targetSavingAmount * 100) / 100;
    }

    const contributionDate = paymentDate instanceof Date && !isNaN(paymentDate.getTime())
      ? new Date(Date.UTC(paymentDate.getUTCFullYear(), paymentDate.getUTCMonth(), paymentDate.getUTCDate()))
      : new Date(Date.UTC(yearInt, monthInt - 1, 1));

    const newContribution = await Contribution.create({
      user_id: user.id,
      savings: savingsAmount,
      investment: investmentAmount,
      target_saving: targetSavingAmount,
      total_amount: finalTotalAmount,
      month: monthInt,
      year: yearInt,
      contribution_date: contributionDate,
      payment_method: normalizedMethod,
      notes: 'Bulk upload',
      status: 'approved',
      approved_by: adminId || null,
      approval_date: new Date()
    }, { transaction });
    const contributionId = newContribution.id;

    if (fee.amount > 0 && ActivityLog && adminId) {
       // We need to fetch the admin user object to pass to logActivity, 
       // but logActivity expects a req.user object or similar.
       // Since we are in a helper, we might not have the full req context easily passed down 
       // except via args. We have adminId.
       // For now, we can try to manually create the log entry or skip it if too complex.
       // The original createContribution uses ActivityLog.logActivity which is a wrapper.
       // Let's manually create the ActivityLog entry to avoid dependency issues.
       try {
         await ActivityLog.create({
           user_id: adminId,
           user_name: 'System/Admin', // Placeholder
           user_role: 'admin',
           action: 'apply_fee_deduction',
           resource_type: 'contribution',
           resource_id: contributionId,
           description: `Applied ${fee.type} of ₦${fee.amount} for contribution (Bulk)`,
           ip_address: '127.0.0.1',
           metadata: { original_total: totalContributionAmount, net_total: finalTotalAmount, fee }
         }, { transaction });
       } catch (e) {
         console.error('Fee log error:', e);
       }
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Process contribution for PSN error:', error);
    return { success: false, error: error.message };
  }
}

// Helper to process a single typed contribution row (Type + Amount)
async function processTypedContribution(psn, type, amount, month, year, paymentMethod, adminId, transaction, paymentDate) {
  try {
    const user = await User.findOne({
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        where: { psn: psn.trim() }
      }],
      transaction
    });

    if (!user) {
      return { success: false, error: `No member found with PSN: ${psn}` };
    }

    // RBAC: Prevent executive roles from receiving contributions
    const RESTRICTED_ROLES = ['chairman', 'treasurer', 'secretary'];
    if (RESTRICTED_ROLES.includes(user.role)) {
      return { success: false, error: `Skipped: ${user.role} accounts cannot receive contributions` };
    }

    const t = String(type).toLowerCase().replace(/\s+/g, '_');
    const isSavings = t === 'savings';
    const isInvestment = t === 'investment';
    const isTarget = t === 'target_savings' || t === 'target_saving' || t === 'target';

    if (!isSavings && !isInvestment && !isTarget) {
      return { success: false, error: `Unknown Type "${type}". Use savings, investment, or target_savings` };
    }

    const monthInt = parseInt(String(month), 10);
    const yearInt = parseInt(String(year), 10);
    if (!Number.isFinite(monthInt) || !Number.isFinite(yearInt) || monthInt < 1 || monthInt > 12 || yearInt < 2020 || yearInt > 2050) {
      return { success: false, error: 'Invalid month/year' };
    }

    if (!user.membershipApplication || String(user.membershipApplication.status || '').toLowerCase() !== 'approved') {
      return { success: false, error: 'Member profile is not approved for contributions.' };
    }

    const normalizedMethod = normalizePaymentMethod(paymentMethod || '');
    if (!isAllowedPaymentMethod(normalizedMethod)) {
      const detected = sanitizePaymentMethod(paymentMethod);
      return { success: false, error: `Invalid payment method '${detected || '(empty)'}'. Allowed: bank transfer, salary deduction.` };
    }

    const fee = await determineApplicableFee(user.id, { month: monthInt, year: yearInt, transaction });
    if (fee.amount > 0 && amount <= fee.amount) {
      return { success: false, error: `Contribution must exceed ${fee.type.replace('_', ' ')} of ₦${fee.amount}` };
    }
    const netAmount = Math.round((amount - fee.amount) * 100) / 100;

    const savingsAmount = isSavings ? netAmount : 0;
    const investmentAmount = isInvestment ? netAmount : 0;
    const targetSavingAmount = isTarget ? netAmount : 0;
    const totalContributionAmount = netAmount;

    const contributionDate = paymentDate instanceof Date && !isNaN(paymentDate.getTime())
      ? new Date(Date.UTC(paymentDate.getUTCFullYear(), paymentDate.getUTCMonth(), paymentDate.getUTCDate()))
      : new Date(Date.UTC(yearInt, monthInt - 1, 1));

    const created = await Contribution.create({
      user_id: user.id,
      savings: Math.round(savingsAmount * 100) / 100,
      investment: Math.round(investmentAmount * 100) / 100,
      target_saving: Math.round(targetSavingAmount * 100) / 100,
      total_amount: totalContributionAmount,
      month: monthInt,
      year: yearInt,
      contribution_date: contributionDate,
      payment_method: normalizedMethod,
      notes: 'Bulk upload (typed)',
      status: 'approved',
      approved_by: adminId || null,
      approval_date: new Date()
    }, { transaction });

    if (fee.amount > 0 && ActivityLog && adminId) {
      try {
        await ActivityLog.create({
          user_id: adminId,
          user_name: 'System/Admin',
          user_role: 'admin',
          action: 'apply_fee_deduction',
          resource_type: 'contribution',
          resource_id: created.id,
          description: `Applied ${fee.type} of ₦${fee.amount} for contribution (Bulk Typed)`,
          ip_address: '127.0.0.1',
          metadata: { original_total: amount, net_total: netAmount, fee }
        }, { transaction });
      } catch (e) {
        console.error('Fee log error:', e);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Process typed contribution error:', error);
    return { success: false, error: error.message };
  }
}

async function reprocessContributionUploadRecord(record, adminId, transaction) {
  const normalizeKey = (key) => String(key || '').toLowerCase().trim().replace(/\s+/g, '_');
  const pick = (row, keys) => {
    if (!row || typeof row !== 'object') return undefined;
    for (const k of keys) {
      const normalized = normalizeKey(k);
      const candidates = [k, normalized];
      for (const c of candidates) {
        if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') return row[c];
      }
    }
    return undefined;
  };
  const parseMonth = (val) => {
    if (!val) return NaN;
    const v = String(val).trim().toLowerCase();
    if (!isNaN(parseInt(v))) return parseInt(v, 10);
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const index = months.findIndex((m) => v.startsWith(m));
    if (index !== -1) return index + 1;
    const shortIndex = shortMonths.indexOf(v.substring(0, 3));
    if (shortIndex !== -1) return shortIndex + 1;
    return NaN;
  };
  const parseAmount = (raw) => {
    const amount = parseFloat(String(raw || '').replace(/,/g, '').trim());
    return Number.isFinite(amount) ? amount : NaN;
  };

  const psn = pick(record, ['psn', 'member_id', 'id']);
  let monthVal = pick(record, ['month', 'period']);
  let yearVal = pick(record, ['year']);
  const paymentMethod = pick(record, ['payment_method', 'method', 'payment']) || '';
  const paymentDateVal = pick(record, ['payment_date', 'payment date', 'paid_on', 'paid on', 'transaction_date', 'transaction date', 'date']);
  const typeVal = pick(record, ['type', 'contribution_type']);

  const savingsVal = pick(record, ['savings']);
  const investmentVal = pick(record, ['investment']);
  const targetSavingVal = pick(record, ['target_saving', 'target saving', 'target']);
  const totalAmountVal = pick(record, ['total_amount', 'total amount', 'amount', 'total']);

  if (monthVal && typeof monthVal === 'string' && monthVal.includes('-') && (!yearVal || String(yearVal).trim() === '')) {
    const parts = monthVal.split('-');
    if (parts.length >= 2) {
      yearVal = parts[0];
      monthVal = parts[1];
    }
  }

  if (!psn || !monthVal || !yearVal) return { success: false, error: 'Missing PSN/Month/Year' };

  const monthInt = parseMonth(monthVal);
  const yearInt = parseInt(String(yearVal).trim(), 10);
  if (!Number.isFinite(monthInt) || !Number.isFinite(yearInt) || monthInt < 1 || monthInt > 12) {
    return { success: false, error: 'Invalid Month/Year format.' };
  }

  const toUtcDateOnly = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    if (!(dt instanceof Date) || isNaN(dt.getTime())) return null;
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  };

  const parsePaymentDate = (raw) => {
    if (raw == null || String(raw).trim() === '') return new Date(Date.UTC(yearInt, monthInt - 1, 1));
    if (raw instanceof Date) return toUtcDateOnly(raw);
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      const excelMs = (raw - 25569) * 86400 * 1000;
      return toUtcDateOnly(new Date(excelMs));
    }
    const s = String(raw).replace(/[\r\n\t]+/g, ' ').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return toUtcDateOnly(new Date(`${s}T00:00:00Z`));
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return toUtcDateOnly(dt);
    return null;
  };

  const paymentDate = parsePaymentDate(paymentDateVal);
  if (!paymentDate) return { success: false, error: `Invalid payment date '${String(paymentDateVal || '').trim() || '(empty)'}'. Allowed format: YYYY-MM-DD.` };

  const normalizedMethod = normalizePaymentMethod(paymentMethod || '');
  if (!isAllowedPaymentMethod(normalizedMethod)) {
    const detected = sanitizePaymentMethod(paymentMethod);
    return { success: false, error: `Invalid payment method '${detected || '(empty)'}'. Allowed: bank transfer, salary deduction.` };
  }

  const amount = (() => {
    if (totalAmountVal !== undefined && totalAmountVal !== null && String(totalAmountVal).trim() !== '') return parseAmount(totalAmountVal);
    const s = parseAmount(savingsVal || 0);
    const inv = parseAmount(investmentVal || 0);
    const t = parseAmount(targetSavingVal || 0);
    const sum = (Number.isFinite(s) ? s : 0) + (Number.isFinite(inv) ? inv : 0) + (Number.isFinite(t) ? t : 0);
    return sum;
  })();

  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Amount must be a positive number.' };

  if (typeVal && String(typeVal).trim() !== '') {
    return await processTypedContribution(String(psn).trim(), String(typeVal).trim(), amount, monthInt, yearInt, normalizedMethod, adminId, transaction, paymentDate);
  }
  return await processContributionForPsn(String(psn).trim(), amount, monthInt, yearInt, normalizedMethod, adminId, transaction, paymentDate);
}

module.exports = {
  getContributions,
  getContributionById,
  createContribution,
  updateContribution,
  deleteContribution,
  getContributionStats,
  createContributionByPsn,
  bulkUploadContributions,
  getFeeDeductions,
  upload,
  reprocessContributionUploadRecord
};
