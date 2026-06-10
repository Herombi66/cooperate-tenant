const { Loan, User, Contribution, LoanRepayment, LoanLiquidation, Notification, MembershipApplication, LoanAgreement, ActivityLog, EducationalDocument } = require('../models');
const emailService = process.env.NODE_ENV === 'test'
  ? {
      sendGuarantorNotificationEmail: async () => {},
      sendLoanDisbursedEmail: async () => {},
      sendAgreementRejectionAlert: async () => {},
      sendLoanApprovedEmail: async () => {},
      sendLoanRejectedEmail: async () => {},
      sendLoanLiquidationNotice: async () => {}
    }
  : require('../services/emailService');
const { Op, Transaction } = require('sequelize');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { sequelize } = require('../db/connection');
let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch {}

const normalizePsn = (value) => (value == null ? '' : String(value)).trim();

const maskPsn = (psn) => {
  const s = normalizePsn(psn);
  if (!s) return null;
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${'*'.repeat(s.length - 4)}${s.slice(-4)}`;
};

const buildApprovedMemberPsnWhere = (cleanPsn) => {
  const lower = normalizePsn(cleanPsn).toLowerCase();
  return {
    [Op.and]: [
      sequelize.where(sequelize.fn('LOWER', sequelize.col('psn')), lower),
      { status: 'approved' }
    ]
  };
};

const logGuarantorPsnValidationAttempt = async ({
  req,
  outcome,
  code,
  message,
  psn,
  targetUserId,
  guarantorMembershipApplicationId,
  guarantorUserId
}) => {
  const actor = req?.user
    ? { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null }
    : null;

  await ActivityLog.logActivity(
    actor,
    'guarantor_psn_validation_attempt',
    'loan',
    null,
    message || null,
    {
      outcome,
      code,
      psn: normalizePsn(psn) || null,
      masked_psn: maskPsn(psn),
      target_user_id: targetUserId || null,
      guarantor_membership_application_id: guarantorMembershipApplicationId || null,
      guarantor_user_id: guarantorUserId || null
    },
    req
  );
};

const getLoans = async (req, res) => {
  console.log('DEBUG: getLoans called with:', req.query);
  try {
    const { page = 1, limit = 10, status, user_id, loan_type, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    
    // Security: Non-admins can only see their own loans
    const canViewAllLoans = ['admin', 'super_admin', 'chairman', 'secretary', 'treasurer'].includes(req.user.role);
    if (!canViewAllLoans) {
        whereClause.user_id = req.user.id;
    } else if (user_id) {
        // Admins can filter by user_id - Ensure integer
        const parsedUserId = parseInt(user_id);
        if (!isNaN(parsedUserId)) {
            whereClause.user_id = parsedUserId;
        }
    }

    if (status && status !== 'all') {
        if (status === 'active') {
            // Map 'active' to include both 'active' and 'disbursed' statuses
            // This ensures we catch all running loans regardless of which specific status tag is used
            whereClause.status = { [Op.or]: ['active', 'disbursed'] };
        } else {
            whereClause.status = status;
        }
    }
    
    if (loan_type && loan_type !== 'all') whereClause.loan_type = loan_type;

    // Search logic
    if (search) {
      const searchOp = sequelize.options.dialect === 'postgres' ? Op.iLike : Op.like;
      
      // Construct search conditions
      const searchConditions = [
        { '$user.membershipApplication.name$': { [searchOp]: `%${search}%` } }, 
        { '$user.membershipApplication.psn$': { [searchOp]: `%${search}%` } },
        { '$user.membershipApplication.email$': { [searchOp]: `%${search}%` } }
      ];

      // Add ID search - handling dialect differences safely
      // For Postgres, we need to cast to text. For SQLite, it usually auto-casts or works with LIKE.
      // We use the model name 'Loan' which Sequelize uses as the default alias.
      searchConditions.push(
        sequelize.where(
          sequelize.cast(sequelize.col('Loan.id'), 'text'), 
          { [searchOp]: `%${search}%` }
        )
      );

      whereClause[Op.or] = searchConditions;
    }

    console.log(`🔍 [LoanController] Fetching loans with params:`, { page, limit, status, user_id, search, role: req.user.role });

    const { count, rows } = await Loan.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [['application_date', 'DESC'], ['id', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn', 'email', 'phone']
        }],
        attributes: ['id', 'role']
      }, {
        model: LoanAgreement,
        as: 'agreements'
      }, {
        model: User,
        as: 'approvedBy',
        attributes: ['id']
      }],
      subQuery: false // Required for searching nested associations with limit
    });

    // Transform data for frontend
    const uiLoans = rows.map(loan => {
      // Use plain object but prefer direct access for associations if toJSON fails
      const loanData = loan.toJSON();
      
      // Robust accessor for user and membership
      const user = loan.user || {};
      const membership = user.membershipApplication || {};
      
      // Fallback: If user is missing in loan object but we have user_id, it's a data integrity issue
      // We can't fix it here without an extra query, but we can label it better.
      const memberName = membership.name || (user.name ? user.name : 'Unknown');
      const memberPsn = membership.psn || 'Unknown';
      const memberEmail = membership.email || (user.email ? user.email : 'Unknown');
      const memberPhone = membership.phone || 'Unknown';

      return {
        ...loanData,
        // Flattened fields for compatibility (though frontend should prefer nested)
        memberPsn,
        memberName,
        memberEmail,
        memberPhone,
        
        // Ensure numbers are numbers
        amount: parseFloat(loanData.amount_requested || 0),
        amount_requested: parseFloat(loanData.amount_requested || 0),
        amount_approved: loanData.amount_approved ? parseFloat(loanData.amount_approved) : null,
        monthly_repayment: loanData.monthly_repayment ? parseFloat(loanData.monthly_repayment) : null,
        total_repayment: loanData.total_repayment ? parseFloat(loanData.total_repayment) : null,
        
        // Formatting
        loan_type: loanData.loan_type || 'cash',
        status: loanData.status || 'pending',
        
        // Guarantor info
        guarantor_status: loanData.guarantor_approved === null
          ? 'pending'
          : (loanData.guarantor_approved ? 'approved' : 'rejected')
      };
    });

    const loanIds = uiLoans.map((l) => l.id).filter((id) => id !== undefined && id !== null);
    const repaymentRows = loanIds.length
      ? await LoanRepayment.findAll({
          attributes: [
            'loan_id',
            [sequelize.fn('SUM', sequelize.col('repayment_amount')), 'total_repaid'],
          ],
          where: {
            loan_id: { [Op.in]: loanIds },
            status: 'verified',
          },
          group: ['loan_id'],
          raw: true,
        })
      : [];

    const repaidByLoanId = new Map(
      repaymentRows.map((r) => [Number(r.loan_id), parseFloat(r.total_repaid || 0)])
    );

    for (const loan of uiLoans) {
      const repaid = repaidByLoanId.get(Number(loan.id)) || 0;
      const baseTotal =
        loan.total_repayment !== null && loan.total_repayment !== undefined
          ? parseFloat(loan.total_repayment || 0)
          : loan.amount_approved !== null && loan.amount_approved !== undefined
            ? parseFloat(loan.amount_approved || 0)
            : parseFloat(loan.amount_requested || loan.amount || 0);

      loan.totalRepaid = repaid;
      loan.remainingBalance = Math.max(0, baseTotal - repaid);

      loan.type = loan.loan_type;
      loan.repaymentPeriod = loan.repayment_period_months;
      loan.monthlyRepayment = loan.monthly_repayment ? parseFloat(loan.monthly_repayment) : 0;
      loan.applicationDate = loan.application_date;
      loan.approvalDate = loan.approval_date;
      loan.disbursementDate = loan.disbursement_date;
    }
 
    res.json({
      success: true,
      loans: uiLoans,
      pagination: {
        pages: Math.ceil(count / parseInt(limit)),
        page: parseInt(page),
        total: count,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ [LoanController] Error getting loans:', error);
    // Always return the error message for now to help with debugging the 500 error
    res.status(500).json({ 
        success: false, 
        message: 'Server error retrieving loans', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
};

const getLoanById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate that ID is a number
        if (isNaN(parseInt(id))) {
            return res.status(400).json({ message: 'Invalid loan ID' });
        }

        const loan = await Loan.findByPk(id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    
    const loanData = loan.toJSON();
    
    const user = await User.findByPk(loan.user_id, {
        include: [{ model: MembershipApplication, as: 'membershipApplication' }]
    });
    loanData.user = user ? { 
        id: user.id, 
        name: user.membershipApplication?.name,
        psn: user.membershipApplication?.psn,
        email: user.membershipApplication?.email
    } : null;

    if (loan.loan_type === 'educational') {
        const docs = await EducationalDocument.findAll({ where: { loan_id: loan.id } });
        loanData.educationalDocuments = docs;
    }

    const agreements = await LoanAgreement.findAll({ where: { loan_id: loan.id } });
    loanData.agreements = agreements;

    res.json({ success: true, loan: loanData });
  } catch (error) {
    console.error('Error getting loan by id:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const EDUCATIONAL_LOAN_MAX_AMOUNT = process.env.EDUCATIONAL_LOAN_MAX_AMOUNT
  ? parseFloat(process.env.EDUCATIONAL_LOAN_MAX_AMOUNT)
  : null;

const EDUCATIONAL_GRACE_MONTHS = process.env.EDUCATIONAL_LOAN_GRACE_MONTHS
  ? parseInt(process.env.EDUCATIONAL_LOAN_GRACE_MONTHS, 10)
  : 6;

const runEducationalVerification = async (loan, user, documents, req) => {
  try {
    let status = 'pending';
    const reasons = [];

    if (!documents.admission_letter || !documents.student_id_card) {
      status = 'rejected';
      reasons.push('Missing required admission letter or student ID card');
    } else {
      const admissionSizeOk = documents.admission_letter.size > 10 * 1024;
      const idIsImage = documents.student_id_card.mime_type.startsWith('image/');

      if (!admissionSizeOk || !idIsImage) {
        status = 'pending';
        reasons.push('Documents require manual review based on basic heuristics');
      } else {
        status = 'approved';
      }
    }

    await ActivityLog.logActivity(
      user,
      'educational_verification',
      'loan',
      loan.id,
      `Educational loan verification status: ${status}`,
      {
        verificationStatus: status,
        reasons,
        documents: Object.keys(documents),
      },
      req
    );

    return status;
  } catch (err) {
    console.error('Educational verification error:', err);
    return 'pending';
  }
};

const createLoan = async (req, res) => {
  try {
    // Support both camelCase (from legacy/other clients) and snake_case (from current frontend)
    const body = req.body;
    const amount = body.amount || body.amount_requested;
    const tenure = body.tenure || body.repayment_period_months;
    const loanType = body.loanType || body.loan_type;
    const { purpose, guarantor_name, guarantor_phone, guarantor_relationship, guarantor_psn, memberPsn } = body;
    let payslip_url = body.payslip_url;

    // Track grantor details for post-creation notifications
    let grantorUser = null;
    let grantorMembership = null;

    const uploadedFiles = req.files || (req.file ? { payslip: [req.file] } : {});
    const primaryPayslip = uploadedFiles.payslip && uploadedFiles.payslip[0] ? uploadedFiles.payslip[0] : null;
    const admissionLetter = uploadedFiles.admission_letter && uploadedFiles.admission_letter[0] ? uploadedFiles.admission_letter[0] : null;
    const studentIdCard = uploadedFiles.student_id_card && uploadedFiles.student_id_card[0] ? uploadedFiles.student_id_card[0] : null;
    const otherDocs = uploadedFiles.education_other || [];

    const storedEducationDocs = {};

    if (primaryPayslip) {
      try {
        const payslipStorage = require('../services/payslipStorage');
        const stored = payslipStorage.storeEncrypted(
          primaryPayslip.path,
          primaryPayslip.mimetype,
          primaryPayslip.originalname
        );
        payslip_url = stored.encPath;
      } catch (e) {
        console.error('Payslip encryption failed:', e);
        payslip_url = primaryPayslip.path.replace(/\\/g, '/');
      }
    }
    
    // Determine user ID
    let targetUserId = req.user.id;
    let targetUserPsn = req.user?.membershipApplication?.psn || null;
    
    // Allow admins to create loans for others
    if (['admin', 'super_admin', 'secretary'].includes(req.user.role) && memberPsn) {
        const cleanMemberPsn = memberPsn.trim();
        // Find user directly via association to handle duplicate PSNs correctly
        // This ensures we find the User that is actually linked to a Membership with this PSN
        const user = await User.findOne({
            include: [{
                model: MembershipApplication,
                as: 'membershipApplication',
                where: sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('psn')), 
                    cleanMemberPsn.toLowerCase()
                )
            }]
        });

        if (!user) {
            return res.status(404).json({ success: false, message: `User account for PSN ${cleanMemberPsn} not found` });
        }
        
        targetUserId = user.id;
        targetUserPsn = user?.membershipApplication?.psn || cleanMemberPsn;
    }
    
    console.log('📝 Creating loan application:', {
        user_id: targetUserId,
        requested_by: req.user.id,
        amount,
        tenure,
        loanType,
        guarantor_psn,
        has_payslip: !!payslip_url
    });

    // Validate Grantor PSN if provided
    if (guarantor_psn) {
        const cleanPsn = normalizePsn(guarantor_psn);
        
        // 1. Format Check
        const psnRegex = /^[A-Za-z0-9_]{3,20}$/;
        if (!psnRegex.test(cleanPsn)) {
             await logGuarantorPsnValidationAttempt({
               req,
               outcome: 'failed',
               code: 'INVALID_FORMAT',
               message: 'Guarantor PSN failed format validation.',
               psn: cleanPsn,
               targetUserId
             });
             return res.status(400).json({ success: false, message: 'Invalid guarantor PSN format. Must be 3-20 alphanumeric characters.' });
        }

        if (targetUserPsn && cleanPsn.toLowerCase() === normalizePsn(targetUserPsn).toLowerCase()) {
          await logGuarantorPsnValidationAttempt({
            req,
            outcome: 'failed',
            code: 'SELF_GUARANTOR',
            message: 'Guarantor PSN validation failed: applicant cannot guarantee self.',
            psn: cleanPsn,
            targetUserId
          });
          return res.status(400).json({ success: false, message: 'You cannot be your own guarantor.' });
        }

        // 2. Existence Check against active (approved) members (case-insensitive)
        const grantorApp = await MembershipApplication.findOne({
          where: buildApprovedMemberPsnWhere(cleanPsn)
        });
        
        if (!grantorApp) {
             await logGuarantorPsnValidationAttempt({
               req,
               outcome: 'failed',
               code: 'GUARANTOR_PSN_NOT_FOUND',
               message: 'Guarantor PSN validation failed: PSN not found among active members.',
               psn: cleanPsn,
               targetUserId
             });
             return res.status(404).json({
               success: false,
               message: 'Guarantor PSN does not match any active registered member. Please enter a valid member PSN.'
             });
        }
        
        grantorMembership = grantorApp;
        grantorUser = await User.findOne({
          where: { membership_application_id: grantorApp.id },
          attributes: ['id', 'membership_application_id']
        });

        await logGuarantorPsnValidationAttempt({
          req,
          outcome: 'success',
          code: 'OK',
          message: 'Guarantor PSN validated successfully.',
          psn: cleanPsn,
          targetUserId,
          guarantorMembershipApplicationId: grantorApp.id,
          guarantorUserId: grantorUser?.id || null
        });
    }

    if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'User not authenticated or user ID missing' });
    }

    const amountNum = typeof amount === 'number' ? amount : parseFloat(String(amount));
    const tenureNum = typeof tenure === 'number' ? tenure : parseInt(String(tenure), 10);

    if (!Number.isFinite(amountNum) || amountNum <= 0 || !Number.isFinite(tenureNum) || tenureNum <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount or repayment period' });
    }

    if (tenureNum < 1 && loanType === 'emergency') {
      return res.status(400).json({ success: false, message: 'Repayment period must be at least 1 month' });
    } else if (tenureNum < 3 && loanType !== 'emergency') {
      return res.status(400).json({ success: false, message: 'Repayment period must be at least 3 months' });
    }

    if (loanType === 'emergency' && tenureNum > 6) {
      return res.status(400).json({
        success: false,
        message: 'Repayment period for emergency loans cannot exceed 6 months.',
        max_repayment_months: 6
      });
    }

    if (['investment', 'educational', 'venture'].includes(String(loanType)) && tenureNum > 24) {
      return res.status(400).json({
        success: false,
        message: 'Repayment period for venture, investment and educational loans cannot exceed 24 months.',
        max_repayment_months: 24
      });
    }

    // MANDATORY PAYSLIP CHECK
    if (!payslip_url) {
      return res.status(400).json({ success: false, message: 'Payslip attachment is required for all loan applications.' });
    }

    const totalSavingsVal = parseFloat(
      (await Contribution.sum('savings', { where: { user_id: targetUserId, status: 'approved' } })) || 0
    ) || 0;
    const totalInvestmentVal = parseFloat(
      (await Contribution.sum('investment', { where: { user_id: targetUserId, status: 'approved' } })) || 0
    ) || 0;
    const totalContributions = totalSavingsVal + totalInvestmentVal;

    if (loanType === 'cash') {
      const maxCash = Math.min(500000, totalContributions * 0.5 * 3);
      if (amountNum > maxCash) {
        return res.status(400).json({ success: false, message: `Cash loan cannot exceed max limit of ₦${maxCash.toLocaleString()}` });
      }
    } else if (loanType === 'venture') {
      const maxVenture = Math.min(1000000, totalContributions * 0.3 * 10);
      if (amountNum > maxVenture) {
        return res.status(400).json({ success: false, message: `Venture loan cannot exceed max limit of ₦${maxVenture.toLocaleString()}` });
      }
    } else if (loanType === 'emergency') {
      if (amountNum > 20000) {
        return res.status(400).json({ success: false, message: `Emergency loan cannot exceed ₦20,000` });
      }
    } else if (loanType === 'educational') {
      const maxEducationalLoan = totalInvestmentVal * 3;
      if (amountNum > maxEducationalLoan) {
        return res.status(400).json({
          success: false,
          message: `Educational loan cannot exceed 3x your total investment (₦${maxEducationalLoan.toLocaleString()})`,
          max_amount: maxEducationalLoan,
          total_investment: totalInvestmentVal
        });
      }
    } else if (loanType === 'investment') {
      const maxInvestmentLoan = totalInvestmentVal * 3;
      if (amountNum > maxInvestmentLoan) {
        return res.status(400).json({
          success: false,
          message: `Investment loan cannot exceed 3x your total investment (₦${maxInvestmentLoan.toLocaleString()})`,
          max_amount: maxInvestmentLoan,
          total_investment: totalInvestmentVal
        });
      }
    }

    // Check for active loans
    const activeStatuses = ['pending', 'waiting_disbursement', 'approved', 'active', 'disbursed', 'defaulted', 'awaiting_admin_review'];
    const activeLoan = await Loan.findOne({
      where: {
        user_id: targetUserId,
        status: {
          [Op.in]: activeStatuses
        }
      }
    });

    if (activeLoan) {
        console.warn(`⚠️ Blocked duplicate loan application for user ${targetUserId} (Has active loan #${activeLoan.id})`);
        return res.status(400).json({
            success: false,
            message: targetUserId === req.user.id 
                ? 'You cannot apply for a new loan while you have an active loan. Please complete or cancel your current loan first.'
                : 'This member already has an active loan application or running loan.'
        });
    }

    let riskAssessment = null;
    try {
      const borrower = await User.findByPk(targetUserId, {
        include: [{ model: MembershipApplication, as: 'membershipApplication' }]
      });
      const startedAt = borrower?.membershipApplication?.created_at || borrower?.created_at || new Date();
      const months = Math.max(
        1,
        Math.floor((Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
      );
      const totalSavings = totalSavingsVal;
      const totalInvestment = totalInvestmentVal;

      const flags = [];
      if (months < 3) flags.push('NEW_MEMBER');
      if (loanType === 'cash' && amountNum > 500000) flags.push('HIGH_CASH_AMOUNT');
      if (['investment', 'educational', 'venture'].includes(String(loanType)) && totalInvestment > 0 && amountNum / totalInvestment > 2.5) flags.push('HIGH_LTV');
      if ((totalSavings + totalInvestment) < 5000) flags.push('LOW_CONTRIBUTION_HISTORY');

      const creditScore = Math.max(
        300,
        Math.min(
          850,
          Math.round(
            350 +
              Math.min(250, months * 10) +
              Math.min(150, (totalSavings + totalInvestment) / 10000 * 10) +
              (flags.length === 0 ? 80 : 0)
          )
        )
      );

      riskAssessment = {
        credit_score: creditScore,
        provider: 'internal',
        membership_months: months,
        totals: { savings: totalSavings, investment: totalInvestment },
        flags
      };
    } catch (e) {}

    const newLoan = await Loan.create({
      user_id: targetUserId,
      amount_requested: amountNum,
      repayment_period_months: tenureNum,
      loan_type: loanType || 'cash',
      interest_rate: loanType === 'venture' ? 5 : 0,
      purpose,
      guarantor_name,
      guarantor_phone,
      guarantor_relationship,
      guarantor_psn,
      payslip_url,
      status: 'pending',
      application_date: new Date()
    });

    try {
      await ActivityLog.logActivity(
        req.user,
        'create_loan',
        'loan',
        newLoan.id,
        `Created ${loanType || 'cash'} loan application (₦${amountNum.toLocaleString()} / ${tenureNum} months)`,
        {
          loan_type: loanType || 'cash',
          amount_requested: amountNum,
          repayment_period_months: tenureNum,
          has_payslip: !!payslip_url,
          risk_assessment: riskAssessment
        },
        req
      );
    } catch (e) {}

    if (loanType === 'educational') {
      const payslipStorage = require('../services/payslipStorage');

      const createDocRecord = async (file, docType) => {
        if (!file) return null;
        try {
          const stored = payslipStorage.storeEncrypted(
            file.path,
            file.mimetype,
            file.originalname
          );
          const record = await EducationalDocument.create({
            loan_id: newLoan.id,
            user_id: targetUserId,
            doc_type: docType,
            enc_path: stored.encPath,
            original_name: file.originalname,
            mime_type: file.mimetype,
            size: file.size
          });

          storedEducationDocs[docType] = {
            id: record.id,
            enc_path: record.enc_path,
            original_name: record.original_name,
            mime_type: record.mime_type,
            size: record.size
          };
        } catch (err) {
          console.error(`Failed to store educational document [${docType}]:`, err);
        }
      };

      await createDocRecord(admissionLetter, 'admission_letter');
      await createDocRecord(studentIdCard, 'student_id_card');

      if (otherDocs && otherDocs.length > 0) {
        for (const file of otherDocs) {
          await createDocRecord(file, 'other');
        }
      }

      const verificationStatus = await runEducationalVerification(newLoan, req.user, storedEducationDocs, req);
      newLoan.setDataValue('verification_status', verificationStatus);
    }
    
    // Log if admin created it
    if (targetUserId !== req.user.id) {
         await ActivityLog.logActivity(
            req.user,
            'create_loan_on_behalf',
            'loan',
            newLoan.id,
            `Loan created for member (User ID: ${targetUserId}) by admin`,
            { loan_id: newLoan.id, member_user_id: targetUserId },
            req
        );
    }

    // Notify grantor if loan lists a grantor PSN
    if (grantorUser) {
        try {
            await Notification.create({
                user_id: grantorUser.id,
                type: 'guarantor_request',
                title: 'New Loan Guarantee Request',
                message: 'A member has listed you as grantor for a new loan application. Please review and respond.',
                data: {
                    loan_id: newLoan.id,
                    borrower_user_id: targetUserId
                }
            });
        } catch (notifError) {
            console.error('Failed to create guarantor notification:', notifError);
        }

        // Optional email alert to grantor (if email templates are configured)
        try {
            if (emailService.sendGuarantorNotificationEmail && grantorMembership) {
                await emailService.sendGuarantorNotificationEmail(
                    {
                        name: grantorMembership.name,
                        email: grantorMembership.email,
                        psn: grantorMembership.psn
                    },
                    {
                        loanId: newLoan.id,
                        loanAmount: amount
                    }
                );
            }
        } catch (emailError) {
            console.error('Failed to send guarantor notification email:', emailError);
        }
    }
    
    res.json({ success: true, message: 'Loan application submitted', loan: newLoan, risk_assessment: riskAssessment });
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({ success: false, message: error.message, error: error.toString() });
  }
};

const getPayslipDocuments = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, startDate, endDate } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const whereClause = {
            payslip_url: {
                [Op.not]: null,
                [Op.ne]: ''
            }
        };

        if (startDate && endDate) {
            whereClause.application_date = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // Search logic
        if (search) {
            const searchOp = sequelize.options.dialect === 'postgres' ? Op.iLike : Op.like;
            const searchConditions = [
                { '$user.membershipApplication.name$': { [searchOp]: `%${search}%` } },
                { '$user.membershipApplication.psn$': { [searchOp]: `%${search}%` } },
                sequelize.where(
                    sequelize.cast(sequelize.col('Loan.id'), 'text'),
                    { [searchOp]: `%${search}%` }
                )
            ];
            whereClause[Op.or] = searchConditions;
        }

        const { count, rows } = await Loan.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: offset,
            order: [['application_date', 'DESC']],
            include: [{
                model: User,
                as: 'user',
                include: [{
                    model: MembershipApplication,
                    as: 'membershipApplication',
                    attributes: ['name', 'psn', 'email', 'phone']
                }],
                attributes: ['id']
            }]
        });

        res.json({
            success: true,
            documents: rows,
            pagination: {
                total: count,
                pages: Math.ceil(count / parseInt(limit)),
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching payslip documents:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
};

const servePayslip = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await Loan.findByPk(id);

        if (!loan || !loan.payslip_url) {
            return res.status(404).json({ success: false, message: 'Payslip not found' });
        }

        // Security: Ensure admin or owner
        const isAdmin = ['admin', 'super_admin', 'secretary', 'treasurer', 'chairman'].includes(req.user.role);
        if (!isAdmin && req.user.id !== loan.user_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Audit Log
        if (isAdmin) {
             await ActivityLog.logActivity(
                req.user,
                'view_payslip',
                'loan',
                loan.id,
                `Viewed payslip for Loan #${loan.id}`,
                { loan_id: loan.id, payslip_url: loan.payslip_url },
                req
            );
        }

        // Construct absolute path
        // stored path might be relative like "uploads/file.pdf" or absolute
        let filePath = loan.payslip_url;
        if (!path.isAbsolute(filePath)) {
            filePath = path.join(__dirname, '..', filePath);
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File not found on server' });
        }

        // If encrypted, decrypt and stream
        if (path.extname(filePath).toLowerCase() === '.enc') {
            const payslipStorage = require('../services/payslipStorage');
            const encAbs = filePath;
            const meta = payslipStorage.getMeta(encAbs);
            const contentType = meta?.original_mime || 'application/octet-stream';
            const buffer = payslipStorage.decryptToBuffer(encAbs);
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Cache-Control', 'private, max-age=300');
            const stat = fs.statSync(encAbs);
            const etag = `${stat.size}-${stat.mtimeMs}`;
            res.setHeader('ETag', etag);
            // Simple conditional request support
            if (req.headers['if-none-match'] === etag) {
              return res.status(304).end();
            }
            return res.end(buffer);
        } else {
            // Set headers to ensure file is viewed inline (not downloaded)
            const ext = path.extname(filePath).toLowerCase();
            let contentType = 'application/octet-stream';
            
            if (ext === '.pdf') {
                contentType = 'application/pdf';
            } else if (ext === '.jpg' || ext === '.jpeg') {
                contentType = 'image/jpeg';
            } else if (ext === '.png') {
                contentType = 'image/png';
            } else {
                // Try to detect from file signature if extension is missing or unknown
                try {
                    const fd = fs.openSync(filePath, 'r');
                    const buffer = Buffer.alloc(4);
                    fs.readSync(fd, buffer, 0, 4, 0);
                    fs.closeSync(fd);
                    
                    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
                        contentType = 'application/pdf';
                    } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
                        contentType = 'image/png';
                    } else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
                        contentType = 'image/jpeg';
                    }
                } catch (e) {
                    console.error('Error detecting mime type:', e);
                }
            }

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Cache-Control', 'private, max-age=300');
            return res.sendFile(filePath);
        }

    } catch (error) {
        console.error('Error serving payslip:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findByPk(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    // Security Check
    const canManageLoans = ['admin', 'super_admin', 'chairman', 'treasurer', 'secretary'].includes(req.user.role);
    
    if (!canManageLoans) {
        if (loan.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to loan' });
        }
        if (loan.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Cannot update loan after it has been processed' });
        }
        
        // Restrict allowed fields for non-admins
        const allowedUpdates = ['amount_requested', 'repayment_period_months', 'purpose', 'guarantor_name', 'guarantor_phone', 'guarantor_relationship', 'guarantor_psn'];
        const updates = Object.keys(req.body);
        const hasIllegalUpdates = updates.some(key => !allowedUpdates.includes(key));
        
        if (hasIllegalUpdates) {
             return res.status(403).json({ success: false, message: 'Unauthorized field updates' });
        }
    }

    const requestedTenureRaw = req.body.repayment_period_months ?? req.body.tenure;
    if (requestedTenureRaw !== undefined) {
      const requestedTenure = typeof requestedTenureRaw === 'number'
        ? requestedTenureRaw
        : parseInt(String(requestedTenureRaw), 10);
      const effectiveLoanType = String(req.body.loan_type ?? req.body.loanType ?? loan.loan_type);

      if (!Number.isFinite(requestedTenure) || requestedTenure <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid repayment period' });
      }

      if (['investment', 'educational'].includes(effectiveLoanType) && requestedTenure > 24) {
        return res.status(400).json({
          success: false,
          message: 'Repayment period for investment and educational loans cannot exceed 24 months.',
          max_repayment_months: 24
        });
      }
    }

    const previousStatus = loan.status;
    const newStatus = req.body.status;
    
    // Update fields
    await loan.update(req.body);

    // Log Activity
    if (req.user) {
        const description = `Loan #${loan.id} updated. Status: ${previousStatus} -> ${newStatus || previousStatus}`;
        await ActivityLog.logActivity(
            req.user,
            'update_loan',
            'loan',
            loan.id,
            description,
            { 
                previousStatus, 
                newStatus: newStatus || previousStatus, 
                changes: req.body 
            },
            req
        );
    }

    // Check if loan is being disbursed or approved with an amount
    // Logic: If status changes to 'disbursed' (or is 'disbursed') OR if amount_approved is updated
    if ((newStatus === 'disbursed' && previousStatus !== 'disbursed') || 
        (req.body.amount_approved && loan.status === 'disbursed')) {
        
        console.log(`💰 Processing disbursement for Loan #${loan.id} (${loan.loan_type})`);
        
        const amountApproved = parseFloat(loan.amount_approved);
        const tenure = loan.repayment_period_months || 12;
        
        const { LoanStrategyFactory } = require('../src/modules/loans/strategies');
        const strategy = LoanStrategyFactory.getStrategy(req.tenant, req.tenantSettings);
        
        const scheduleData = strategy.calculateRepaymentSchedule(
          amountApproved, 
          tenure, 
          loan.interest_rate, 
          new Date()
        );

        const updatePayload = {
          total_repayment: scheduleData.totalAmount,
          monthly_repayment: scheduleData.monthlyPayment,
          disbursement_date: new Date()
        };

        if (loan.loan_type === 'educational') {
          const firstRepayment = new Date();
          firstRepayment.setMonth(firstRepayment.getMonth() + (Number.isFinite(EDUCATIONAL_GRACE_MONTHS) ? EDUCATIONAL_GRACE_MONTHS : 0));
          updatePayload.first_repayment_date = firstRepayment;
        }

        await loan.update(updatePayload);
        
        console.log(`   - Total Repayment: ₦${scheduleData.totalAmount}`);
        console.log(`   - Monthly Repayment: ₦${scheduleData.monthlyPayment}`);

        // 4. Create Notification
        try {
            await Notification.create({
                user_id: loan.user_id,
                type: 'loan_disbursed',
                title: 'Loan Disbursed',
                message: `Your loan of ₦${amountApproved.toLocaleString()} has been disbursed.`,
                data: { 
                    loan_id: loan.id, 
                    amount: amountApproved,
                    total_repayment: scheduleData.totalAmount,
                    monthly_repayment: scheduleData.monthlyPayment,
                    disbursement_date: new Date()
                }
            });
            console.log(`   - Notification created for user ${loan.user_id}`);
        } catch (notifError) {
            console.error('   - Failed to create notification:', notifError);
        }

        // 5. Send Email
        try {
            const user = await User.findByPk(loan.user_id, {
                include: [{ model: MembershipApplication, as: 'membershipApplication' }]
            });
            
            if (user) {
                const emailUser = {
                    name: user.membershipApplication?.name || user.name,
                    email: user.membershipApplication?.email || user.email
                };
                await emailService.sendLoanDisbursedEmail(loan, emailUser);
                console.log(`   - Email sent to ${emailUser.email}`);
            }
        } catch (emailError) {
            console.error('   - Failed to send email:', emailError);
        }
    }

    res.json({ success: true, message: 'Loan updated', loan });
  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findByPk(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    // Allow admin to delete any loan, but restrict regular users to pending only
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
    if (!isAdmin && loan.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Cannot delete processed loan' });
    }

    // Log the deletion before it happens
    if (req.user) {
        await ActivityLog.logActivity(
            req.user,
            'delete_loan',
            'loan',
            loan.id,
            `Loan #${loan.id} deleted by ${req.user.role}`,
            { loan_data: loan.toJSON() },
            req
        );
    }

    await loan.destroy();
    res.json({ success: true, message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



const getLoanStats = async (req, res) => {
    try {
        const totalLoans = await Loan.count();
        const activeLoans = await Loan.count({ where: { status: 'active' } });
        const pendingLoans = await Loan.count({ where: { status: 'pending' } });
        
        // Calculate total amount (sum of amount_approved for approved/disbursed loans)
        const totalAmountResult = await Loan.sum('amount_approved', {
            where: {
                status: {
                    // Removed 'completed' as it is not a valid ENUM value in the database
                    [Op.in]: ['approved', 'disbursed', 'active', 'waiting_disbursement']
                }
            }
        });
        
        const totalAmount = totalAmountResult || 0;
        
        res.json({ success: true, stats: { totalLoans, activeLoans, pendingLoans, totalAmount } });
    } catch (error) {
        console.error('❌ [Stats] Error getting loan stats:', error);
        console.error('❌ [Stats] Error stack:', error.stack);
        res.status(500).json({ success: false, message: 'Server error', debug: error.message });
    }
};

const getDisbursedStats = async (req, res) => {
    try {
        const { period, loan_type, start_date, end_date } = req.query;
        const whereClause = {
            status: { [Op.in]: ['disbursed', 'active'] }
        };
        if (loan_type && loan_type !== 'all') whereClause.loan_type = loan_type;
        if (start_date || end_date) {
            const start = start_date ? new Date(start_date) : new Date('1970-01-01');
            const end = end_date ? new Date(end_date) : new Date();
            whereClause.disbursement_date = { [Op.between]: [start, end] };
        } else {
            if (period === 'this_month') {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                whereClause.disbursement_date = { [Op.between]: [start, end] };
            } else if (period === 'this_year') {
                const now = new Date();
                const start = new Date(now.getFullYear(), 0, 1);
                const end = new Date(now.getFullYear() + 1, 0, 1);
                whereClause.disbursement_date = { [Op.between]: [start, end] };
            } else if (period === 'last_6_months') {
                const end = new Date();
                const start = new Date();
                start.setMonth(start.getMonth() - 6);
                whereClause.disbursement_date = { [Op.between]: [start, end] };
            }
        }
        const totalResult = await Loan.sum('amount_approved', { where: whereClause });
        const total = totalResult || 0;
        let series = [];
        if (period === 'last_6_months' || period === 'this_year') {
            const dialect = sequelize.options.dialect;
            let monthCol;
            
            if (dialect === 'postgres') {
                monthCol = sequelize.fn('TO_CHAR', sequelize.col('disbursement_date'), 'YYYY-MM');
            } else {
                // SQLite
                monthCol = sequelize.fn('strftime', '%Y-%m', sequelize.col('disbursement_date') / 1000, 'unixepoch');
                // Note: sequelize might handle date objects differently depending on storage
                // If stored as ISO string in SQLite (default for Sequelize), use:
                monthCol = sequelize.fn('strftime', '%Y-%m', sequelize.col('disbursement_date'));
            }

            const rows = await Loan.findAll({
                where: whereClause,
                attributes: [
                    [monthCol, 'month'],
                    [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount_approved')), 0), 'total']
                ],
                group: [monthCol],
                order: [[monthCol, 'ASC']],
                raw: true
            });
            series = rows.map(r => ({ month: r.month, total: parseFloat(r.total || 0) }));
        }
        res.json({ success: true, stats: { total_disbursed: total, series } });
    } catch (error) {
        console.error('Error getting disbursed stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getCurrentLoans = async (req, res) => {
    req.query.user_id = req.user.id;
    return getLoans(req, res);
};

const respondToGuaranteeRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; 
        console.log(`📝 Responding to guarantee request: Loan ${id}, Status ${status}, User ${req.user.id}`);
        
        const loan = await Loan.findByPk(id);
        if (!loan) {
            console.warn(`⚠️ Loan ${id} not found for guarantee response`);
            return res.status(404).json({ success: false, message: 'Loan not found' });
        }
        
        // Verify user is the guarantor (security check)
        const user = await User.findByPk(req.user.id, { include: [{ model: MembershipApplication, as: 'membershipApplication' }] });
        if (user && user.membershipApplication && loan.guarantor_psn !== user.membershipApplication.psn) {
             console.warn(`⛔ User ${req.user.id} (PSN ${user.membershipApplication.psn}) tried to respond to guarantee for Loan ${id} (Guarantor PSN ${loan.guarantor_psn})`);
             return res.status(403).json({ success: false, message: 'Unauthorized: You are not the guarantor' });
        }

        await loan.update({ 
            guarantor_approved: status === 'approved',
            guarantor_response_date: new Date(),
            guarantor_response_notes: req.body.notes || ''
        });
        
        console.log(`✅ Guarantee response recorded for Loan ${id}`);
        res.json({ success: true, message: 'Response recorded' });
    } catch (error) {
        console.error('❌ Error responding to guarantee request:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getGuaranteeRequests = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, { include: [{ model: MembershipApplication, as: 'membershipApplication' }] });
        if (!user || !user.membershipApplication) {
            console.log(`⚠️ Guarantee requests: User ${req.user.id} has no membership application`);
            return res.json({ success: true, requests: [], guarantee_requests: [] });
        }
        
        const psn = user.membershipApplication.psn;
        console.log(`🔍 Checking guarantee requests for PSN: ${psn}`);
        
        const requests = await Loan.findAll({ 
            where: { 
                guarantor_psn: psn
            },
            order: [['application_date', 'DESC'], ['id', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'user',
                    include: [{ model: MembershipApplication, as: 'membershipApplication' }]
                }
            ]
        });
        
        console.log(`✅ Found ${requests.length} guarantee requests for PSN ${psn}`);
        res.json({ success: true, requests, guarantee_requests: requests });
    } catch (error) {
        console.error('❌ Error getting guarantee requests:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getGuaranteeSummary = async (req, res) => {
    try {
        const allowedRoles = ['admin', 'super_admin', 'treasurer', 'chairman', 'secretary'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Only admins can view guarantee summary.' });
        }

        const rows = await Loan.findAll({
            attributes: [
                'guarantor_psn',
                [sequelize.fn('COUNT', sequelize.col('id')), 'open_requests']
            ],
            where: {
                guarantor_psn: { [Op.ne]: null },
                guarantor_approved: null,
                status: 'pending'
            },
            group: ['guarantor_psn'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
        });

        const summary = rows.map(row => {
            const plain = row.toJSON();
            return {
                guarantor_psn: plain.guarantor_psn,
                open_requests: parseInt(plain.open_requests, 10) || 0
            };
        });

        res.json({ success: true, summary });
    } catch (error) {
        console.error('❌ Error getting guarantee summary:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const submitAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, status, ip_address } = req.body;
    const userId = req.user.id;

    console.log(`📝 Processing agreement submission: Loan ${id}, Type ${type}, Status ${status}, User ${userId}`);

    const loan = await Loan.findByPk(id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    if (loan.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const agreement = await LoanAgreement.create({
      loan_id: id,
      user_id: userId,
      type,
      status,
      ip_address,
      version: '1.0'
    });

    console.log(`✅ Agreement recorded: ID ${agreement.id}`);

    if (type === 'agent_agreement' && status === 'rejected') {
      console.log(`⚠️ Agent Agreement Rejected for Loan ${id}. Updating status and notifying admins.`);
      
      await loan.update({ status: 'awaiting_admin_review' });

      const admins = await User.findAll({ where: { role: 'admin' } });
      
      const member = await User.findByPk(userId, {
        include: [{ model: MembershipApplication, as: 'membershipApplication' }]
      });

      for (const admin of admins) {
          try {
            await Notification.create({
               user_id: admin.id,
               type: 'loan_alert',
               title: 'Agent Agreement Rejected',
               message: `Member ${member.membershipApplication?.name || member.name} rejected Agent Agreement for Loan #${id}.`,
               data: { loan_id: id }
            });
          } catch (notifError) {
            console.error('Failed to create notification:', notifError);
          }

          try {
             await emailService.sendAgreementRejectionAlert(admin, loan, member);
          } catch (emailError) {
             console.error('Failed to send email alert:', emailError);
          }
      }
    }
    
    if (type === 'murabaha_contract' && status === 'accepted') {
        console.log(`✅ Murabaha Contract Accepted for Loan ${id}. activating loan.`);
        await loan.update({ status: 'active' });
    }

    res.json({ success: true, message: 'Agreement status recorded', agreement });

  } catch (error) {
    console.error('Error submitting agreement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAgreements = async (req, res) => {
    try {
        const { id } = req.params;
        const agreements = await LoanAgreement.findAll({
            where: { loan_id: id },
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, agreements });
    } catch (error) {
        console.error('Error fetching agreements:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getAllAgreements = async (req, res) => {
    try {
        // Role check
        const allowedRoles = ['admin', 'super_admin', 'treasurer', 'chairman', 'secretary'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Insufficient privileges.' });
        }

        const { page = 1, limit = 10, status, type } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        console.log(`🔍 [LoanController] Fetching agreements with params:`, { page, limit, status, type });

        const whereClause = {};
        if (status) {
            if (status === 'active') whereClause.status = 'accepted';
            else whereClause.status = status;
        }
        if (type) whereClause.type = type;

        const { count, rows } = await LoanAgreement.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Loan,
                    as: 'loan'
                },
                {
                    model: User,
                    as: 'user',
                    include: [{ model: MembershipApplication, as: 'membershipApplication' }]
                }
            ],
            limit: parseInt(limit),
            offset: offset,
            order: [['created_at', 'DESC']]
        });

        // Transform to include user name from membership application
        const agreements = rows.map(agreement => {
            const ag = agreement.toJSON();
            if (ag.user && ag.user.membershipApplication) {
                ag.user_name = ag.user.membershipApplication.name;
                ag.user_psn = ag.user.membershipApplication.psn;
            } else {
                ag.user_name = 'Unknown';
                ag.user_psn = 'Unknown';
            }
            return ag;
        });

        res.json({
            success: true,
            agreements: agreements,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('❌ [LOANS] Error fetching all agreements:', error);
        console.error('❌ [LOANS] Stack:', error.stack);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

const bulkImportLoans = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let rows = [];

    if (fileExtension === '.csv') {
       const results = [];
       await new Promise((resolve, reject) => {
         fs.createReadStream(req.file.path)
           .pipe(csv())
           .on('data', (data) => results.push(data))
           .on('end', resolve)
           .on('error', reject);
       });
       rows = results;
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
       const workbook = XLSX.readFile(req.file.path);
       const sheetName = workbook.SheetNames[0];
       rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
       if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
       return res.status(400).json({ success: false, message: 'Invalid file type' });
    }

    // Cleanup file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'File is empty' });
    }

    const errors = [];
    const validLoans = [];

    // Pre-fetch all users to map PSN to ID
    const allMembers = await MembershipApplication.findAll({
        attributes: ['psn', 'id'],
        include: [{ model: User, as: 'user', attributes: ['id'] }]
    });
    
    const psnToUserIdMap = new Map();
    allMembers.forEach(m => {
        if (m.psn && m.user) {
            psnToUserIdMap.set(m.psn.toString().trim().toUpperCase(), m.user.id);
        }
    });

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Header is 1
        const errorList = [];

        // Helper to find value case-insensitively
        const getVal = (keys) => {
            for (let k of keys) {
                if (row[k] !== undefined) return row[k];
            }
            // Try searching keys
            const rowKeys = Object.keys(row);
            for (let k of keys) {
                const found = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
                if (found) return row[found];
            }
            return undefined;
        };

        const psn = getVal(['PSN', 'psn', 'Psn']);
        const type = getVal(['Type', 'type', 'loan_type', 'Loan Type']);
        const amount = getVal(['loan_amount', 'amount', 'amount_requested', 'Loan Amount']);
        const period = getVal(['repayment_period', 'period', 'repayment_period_months', 'Repayment Period']);

        // Validation
        if (!psn) errorList.push('Missing PSN');
        else if (!psnToUserIdMap.has(psn.toString().trim().toUpperCase())) errorList.push(`Member not found with PSN: ${psn}`);

        if (!type) errorList.push('Missing Loan Type');
        else {
            const validTypes = ['cash', 'investment'];
            if (!validTypes.includes(type.toString().toLowerCase())) errorList.push(`Invalid Loan Type (must be cash or investment): ${type}`);
        }

        if (!amount) errorList.push('Missing Amount');
        else if (isNaN(amount) || parseFloat(amount) <= 0) errorList.push(`Invalid Amount: ${amount}`);

        if (!period) errorList.push('Missing Repayment Period');
        else if (isNaN(period) || parseInt(period) <= 0) errorList.push(`Invalid Repayment Period: ${period}`);

        if (errorList.length > 0) {
            errors.push({ row: rowNum, errors: errorList, data: row });
        } else {
            const loanData = {
                user_id: psnToUserIdMap.get(psn.toString().trim().toUpperCase()),
                loan_type: type.toString().toLowerCase(),
                amount_requested: parseFloat(amount),
                repayment_period_months: parseInt(period),
                status: 'pending',
                application_date: new Date(),
                interest_rate: 0
            };

            // Auto-approval logic
            if (req.body.autoApprove === 'true' || req.body.autoApprove === true) {
                const AUTO_APPROVE_LIMIT = 50000;
                if (loanData.amount_requested <= AUTO_APPROVE_LIMIT && loanData.loan_type === 'cash') {
                    loanData.status = 'waiting_disbursement';
                    loanData.amount_approved = loanData.amount_requested;
                    loanData.approved_by = req.user.id;
                    loanData.approval_date = new Date();
                }
            }

            validLoans.push(loanData);
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors,
            totalRows: rows.length,
            failedRows: errors.length
        });
    }

    // Insert
    const result = await sequelize.transaction(async (t) => {
        return await Loan.bulkCreate(validLoans, { transaction: t });
    });

    res.json({
        success: true,
        message: `Successfully imported ${result.length} loans`,
        count: result.length
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const bulkUpdateLoans = async (req, res) => {
    // Security Check
    const allowedRoles = ['admin', 'super_admin', 'chairman'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Access denied. Insufficient privileges.' });
    }

    const t = await sequelize.transaction();
    try {
        const { loanIds, status, reason } = req.body;
        const userId = req.user.id;

        if (!Array.isArray(loanIds) || loanIds.length === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'No loans selected' });
        }

        if (!['approved', 'rejected', 'waiting_disbursement', 'disbursed'].includes(status)) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        // Fetch loans
        const loans = await Loan.findAll({
            where: {
                id: { [Op.in]: loanIds }
            },
            include: [{ model: User, as: 'user' }],
            transaction: t
        });

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const loan of loans) {
            try {
                // State machine validation
                if (status === 'waiting_disbursement' && loan.status !== 'pending' && loan.status !== 'awaiting_admin_review') {
                     throw new Error(`Loan #${loan.id} cannot be approved (Status: ${loan.status})`);
                }
                if (status === 'rejected' && ['active', 'completed', 'disbursed'].includes(loan.status)) {
                     throw new Error(`Loan #${loan.id} cannot be rejected (Status: ${loan.status})`);
                }
                if (status === 'disbursed' && loan.status !== 'waiting_disbursement') {
                     throw new Error(`Loan #${loan.id} cannot be disbursed (Status: ${loan.status}). Must be 'waiting_disbursement'.`);
                }

                const updateData = {
                    status: status,
                    approved_by: status === 'waiting_disbursement' ? userId : loan.approved_by,
                    approval_date: status === 'waiting_disbursement' ? new Date() : loan.approval_date,
                    amount_approved: status === 'waiting_disbursement' ? loan.amount_requested : loan.amount_approved
                };

                // Disbursement specific logic
                if (status === 'disbursed') {
                    const amountApproved = parseFloat(loan.amount_approved);
                    let totalRepayment = amountApproved;

                    // 1. Automatically add 10% profit margin for investment loans
                    if (loan.loan_type === 'investment') {
                        const profitMargin = amountApproved * 0.10;
                        totalRepayment = amountApproved + profitMargin;
                    }

                    // 2. Calculate monthly repayment
                    const tenure = loan.repayment_period_months || 12;
                    const monthlyRepayment = totalRepayment / tenure;

                    updateData.total_repayment = totalRepayment;
                    updateData.monthly_repayment = monthlyRepayment;
                    updateData.disbursement_date = new Date();
                }

                if (reason) {
                    // Append reason to notes or similar field if exists, but Loan model doesn't seem to have notes in createLoan.
                    // Assuming no notes field on Loan based on previous Read. 
                    // However, we can log it in ActivityLog.
                }

                await loan.update(updateData, { transaction: t });

                // Log Activity
                await ActivityLog.logActivity(
                    req.user,
                    `bulk_${status}`,
                    'loan',
                    loan.id,
                    `Bulk ${status} by ${req.user.name}. Reason: ${reason || 'N/A'}`,
                    { previousStatus: loan.status, newStatus: status },
                    req
                );

                // Notification
                let notifTitle = '';
                let notifMessage = '';
                let notifType = `loan_${status}`;

                if (status === 'waiting_disbursement') {
                    notifTitle = 'Loan Application Approved';
                    notifMessage = `Your loan application for ${loan.amount_requested} has been approved.`;
                } else if (status === 'rejected') {
                    notifTitle = 'Loan Application Rejected';
                    notifMessage = `Your loan application for ${loan.amount_requested} has been rejected. ${reason ? 'Reason: ' + reason : ''}`;
                } else if (status === 'disbursed') {
                    notifTitle = 'Loan Disbursed';
                    notifMessage = `Your loan of ${loan.amount_approved} has been disbursed.`;
                }

                await Notification.create({
                    user_id: loan.user_id,
                    type: notifType,
                    title: notifTitle,
                    message: notifMessage,
                    is_read: false
                }, { transaction: t });

                // Send Email (Fire and forget, outside transaction ideally, but inside loop is fine for now)
                try {
                    if (loan.user) {
                        // Re-fetch user with membership if needed, but bulk fetch didn't include membershipApplication
                        // Optimization: We could include MembershipApplication in the bulk fetch.
                        // For now, we'll try to use what we have or fetch if missing.
                        // The email service needs membershipApplication usually.
                        const userWithProfile = await User.findByPk(loan.user_id, {
                            include: [{ model: MembershipApplication, as: 'membershipApplication' }],
                            transaction: t
                        });

                        if (userWithProfile) {
                            const emailUser = {
                                name: userWithProfile.membershipApplication?.name || userWithProfile.name,
                                email: userWithProfile.membershipApplication?.email || userWithProfile.email
                            };

                            if (status === 'disbursed') {
                                await emailService.sendLoanDisbursedEmail(loan, emailUser);
                            }
                            // Add other email types if needed (approved/rejected)
                        }
                    }
                } catch (emailError) {
                    console.error(`Failed to send email for loan ${loan.id}:`, emailError);
                }

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(err.message);
            }
        }

        await t.commit();
        res.json({ success: true, results });

    } catch (error) {
        await t.rollback();
        console.error('Bulk update error:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

const reverseDisbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findByPk(id);
    
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    if (!['disbursed', 'active'].includes(loan.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot reverse disbursement for loan with status: ${loan.status}` 
      });
    }

    const previousStatus = loan.status;
    
    await loan.update({
      status: 'approved',
      disbursement_date: null,
      disbursed_by: null,
      monthly_repayment: null,
      total_repayment: null,
      first_repayment_date: null
    });

    if (req.user) {
      await ActivityLog.logActivity(
        req.user,
        'reverse_disbursement',
        'loan',
        loan.id,
        `Disbursement reversed for Loan #${loan.id} by ${req.user.role}`,
        { previousStatus, newStatus: 'approved' },
        req
      );

      await Notification.create({
        user_id: loan.user_id,
        type: 'loan_update',
        title: 'Disbursement Reversed',
        message: `The disbursement for your loan #${loan.id} has been reversed. Your loan is now back in approved status.`,
        is_read: false
      });
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
    
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    if (!['approved', 'waiting_disbursement'].includes(loan.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot reverse approval for loan with status: ${loan.status}` 
      });
    }

    const previousStatus = loan.status;
    
    await loan.update({
      status: 'pending',
      approval_date: null,
      approved_by: null,
      amount_approved: null
    });

    if (req.user) {
      await ActivityLog.logActivity(
        req.user,
        'reverse_approval',
        'loan',
        loan.id,
        `Approval reversed for Loan #${loan.id} by ${req.user.role}`,
        { previousStatus, newStatus: 'pending' },
        req
      );

      await Notification.create({
        user_id: loan.user_id,
        type: 'loan_update',
        title: 'Approval Reversed',
        message: `The approval for your loan #${loan.id} has been reversed. Your application is now pending again.`,
        is_read: false
      });
    }

    res.json({ success: true, message: 'Approval reversed successfully', loan });
  } catch (error) {
    console.error('Reverse approval error:', error);
    res.status(500).json({ success: false, message: 'Server error reversing approval' });
  }
};

const serveEducationalDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await EducationalDocument.findByPk(id);

        if (!doc) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Security check: Admin or owner
        const isAdmin = ['admin', 'super_admin', 'secretary', 'treasurer', 'chairman'].includes(req.user.role);
        if (!isAdmin && req.user.id !== doc.user_id) {
             return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const payslipStorage = require('../services/payslipStorage');
        
        if (!fs.existsSync(doc.enc_path)) {
             return res.status(404).json({ success: false, message: 'File not found on server' });
        }

        const buffer = payslipStorage.decryptToBuffer(doc.enc_path);
        
        res.setHeader('Content-Type', doc.mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);
        res.setHeader('Cache-Control', 'private, max-age=300');
        
        return res.end(buffer);

    } catch (error) {
        console.error('Error serving educational doc:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const validateGrantor = async (req, res) => {
  try {
    const psn = normalizePsn(req.body?.psn);
    const applicantId = req.user.id;

    if (!psn) {
      await logGuarantorPsnValidationAttempt({
        req,
        outcome: 'failed',
        code: 'PSN_REQUIRED',
        message: 'Guarantor PSN validation failed: PSN is required.',
        psn: null,
        targetUserId: applicantId
      });
      return res.status(400).json({ success: false, message: 'PSN is required', code: 'PSN_REQUIRED' });
    }

    // 1. Format Validation (Alphanumeric, e.g., 3-20 chars)
    // Pattern: ^[A-Za-z0-9_]{3,20}$
    const psnRegex = /^[A-Za-z0-9_]{3,20}$/;
    if (!psnRegex.test(psn)) {
      await logGuarantorPsnValidationAttempt({
        req,
        outcome: 'failed',
        code: 'INVALID_FORMAT',
        message: 'Guarantor PSN failed format validation.',
        psn,
        targetUserId: applicantId
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid PSN format. Must be 3-20 alphanumeric characters.', 
        code: 'INVALID_FORMAT',
        expected_pattern: '^[A-Za-z0-9_]{3,20}$'
      });
    }

    if (req.user?.membershipApplication?.psn && psn.toLowerCase() === normalizePsn(req.user.membershipApplication.psn).toLowerCase()) {
      await logGuarantorPsnValidationAttempt({
        req,
        outcome: 'failed',
        code: 'SELF_GUARANTOR',
        message: 'Guarantor PSN validation failed: applicant cannot guarantee self.',
        psn,
        targetUserId: applicantId
      });
      return res.status(400).json({ success: false, message: 'You cannot be your own guarantor.', code: 'SELF_GRANTOR' });
    }

    // 2. Database Verification against active (approved) members
    const grantorApplication = await MembershipApplication.findOne({
      where: buildApprovedMemberPsnWhere(psn)
    });

    if (!grantorApplication) {
       await logGuarantorPsnValidationAttempt({
         req,
         outcome: 'failed',
         code: 'GUARANTOR_PSN_NOT_FOUND',
         message: 'Guarantor PSN validation failed: PSN not found among active members.',
         psn,
         targetUserId: applicantId
       });
       return res.status(404).json({ success: false, message: 'PSN not found in system.', code: 'PSN_NOT_FOUND' });
    }

    const grantorUser = await User.findOne({
      where: { membership_application_id: grantorApplication.id },
      attributes: ['id', 'membership_application_id']
    });

    await logGuarantorPsnValidationAttempt({
      req,
      outcome: 'success',
      code: 'OK',
      message: 'Guarantor PSN validated successfully.',
      psn,
      targetUserId: applicantId,
      guarantorMembershipApplicationId: grantorApplication.id,
      guarantorUserId: grantorUser?.id || null
    });

    return res.json({ 
        success: true, 
        message: 'Grantor is valid.',
        grantor: {
            name: grantorApplication.name,
            psn: grantorApplication.psn,
            email: grantorApplication.email,
            phone: grantorApplication.phone,
            id: grantorUser?.id || grantorApplication.id
        }
    });

  } catch (error) {
    console.error('Validate grantor error:', error);
    try {
        await logGuarantorPsnValidationAttempt({
          req,
          outcome: 'failed',
          code: 'SERVER_ERROR',
          message: 'Guarantor PSN validation failed due to server error.',
          psn: req.body?.psn || null,
          targetUserId: req.user?.id || null
        });
    } catch (logError) {
        console.error('Failed to log validation error:', logError);
    }
    res.status(500).json({ success: false, message: 'Server error during validation' });
  }
};

const approveLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, amount_approved } = req.body;

        // Role Check
        const allowedRoles = ['admin', 'super_admin', 'chairman'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Only Chairman and Admins can approve loans.' });
        }

        const loan = await Loan.findByPk(id);
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

        // Status Transition Validation
        if (!['pending', 'awaiting_admin_review'].includes(loan.status)) {
            return res.status(400).json({ success: false, message: `Cannot approve loan in '${loan.status}' status.` });
        }

        const updateData = {
            status: 'waiting_disbursement',
            approved_by: req.user.id,
            approval_date: new Date()
        };

        if (amount_approved) {
            updateData.amount_approved = amount_approved;
        } else if (!loan.amount_approved) {
            updateData.amount_approved = loan.amount_requested;
        }

        const previousStatus = loan.status;
        await loan.update(updateData);

        // Audit Log
        await ActivityLog.logActivity(
            req.user,
            'approve_loan',
            'loan',
            loan.id,
            `Loan #${loan.id} approved by ${req.user.role} (${req.user.name}). Reason: ${reason || 'N/A'}`,
            { previousStatus, newStatus: 'waiting_disbursement', reason },
            req
        );

        // Notification
        await Notification.create({
            user_id: loan.user_id,
            type: 'loan_approved',
            title: 'Loan Application Approved',
            message: `Your loan application for ₦${parseFloat(updateData.amount_approved || loan.amount_approved).toLocaleString()} has been approved and is waiting for disbursement.`,
            is_read: false
        });

        // Email (Async)
        try {
            const user = await User.findByPk(loan.user_id, {
                include: [{ model: MembershipApplication, as: 'membershipApplication' }]
            });
            if (user) {
                // Assuming emailService has sendLoanApprovedEmail, if not fallback to generic or skip
                 if (emailService.sendLoanApprovedEmail) {
                     await emailService.sendLoanApprovedEmail(loan, user);
                 }
            }
        } catch (e) {
            console.error('Failed to send approval email:', e);
        }

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

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ success: false, message: 'Rejection reason is required' });
        }

        // Role Check
        const allowedRoles = ['admin', 'super_admin', 'chairman'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Only Chairman and Admins can reject loans.' });
        }

        const loan = await Loan.findByPk(id);
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

        // Status Transition Validation
        // Prevent rejecting active/disbursed loans without reversal first
        if (['active', 'disbursed', 'completed', 'defaulted'].includes(loan.status)) {
            return res.status(400).json({ success: false, message: `Cannot reject loan in '${loan.status}' status. Reverse disbursement first.` });
        }

        const previousStatus = loan.status;
        await loan.update({
            status: 'rejected',
            approved_by: req.user.id, // Record who rejected it
            approval_date: new Date()
        });

        // Audit Log
        await ActivityLog.logActivity(
            req.user,
            'reject_loan',
            'loan',
            loan.id,
            `Loan #${loan.id} rejected by ${req.user.role} (${req.user.name}). Reason: ${reason || 'N/A'}`,
            { previousStatus, newStatus: 'rejected', reason },
            req
        );

        // Notification
        await Notification.create({
            user_id: loan.user_id,
            type: 'loan_rejected',
            title: 'Loan Application Rejected',
            message: `Your loan application has been rejected. ${reason ? 'Reason: ' + reason : ''}`,
            is_read: false
        });

        // Email
        try {
            const user = await User.findByPk(loan.user_id, {
                include: [{ model: MembershipApplication, as: 'membershipApplication' }]
            });
            if (user && emailService.sendLoanRejectedEmail) {
                await emailService.sendLoanRejectedEmail(loan, user, reason);
            }
        } catch (e) {
            console.error('Failed to send rejection email:', e);
        }

        res.json({ success: true, message: 'Loan rejected successfully', loan });

    } catch (error) {
        console.error('Reject loan error:', error);
        res.status(500).json({ success: false, message: 'Server error rejecting loan' });
    }
};

const liquidateLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const confirm = req.body?.confirm === true;
        const requestedAmountRaw = req.body?.amount;
        const adminUser = req.user;

        const allowedRoles = ['admin', 'super_admin', 'treasurer', 'chairman'];
        if (!allowedRoles.includes(adminUser.role) || !adminUser.can_liquidate_loans) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Loan liquidation permission required.'
            });
        }

        const loan = await Loan.findByPk(id);
        if (!loan) {
            return res.status(404).json({ success: false, message: 'Loan not found' });
        }

        if (!['active', 'disbursed', 'defaulted'].includes(loan.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot liquidate loan in '${loan.status}' status.`
            });
        }

        const totalRepaymentRaw = loan.total_repayment ?? loan.amount_approved ?? loan.amount_requested ?? 0;
        const totalRepayment = parseFloat(totalRepaymentRaw) || 0;
        if (totalRepayment <= 0) {
            return res.status(400).json({ success: false, message: 'Loan repayment total is invalid.' });
        }

        const totalRepaidResult = await LoanRepayment.sum('repayment_amount', {
            where: { loan_id: loan.id, user_id: loan.user_id, status: 'verified' }
        });
        const totalRepaid = parseFloat(totalRepaidResult || 0);
        const remainingBalance = Math.max(0, Math.round((totalRepayment - totalRepaid) * 100) / 100);

        if (remainingBalance <= 0) {
            return res.status(400).json({ success: false, message: 'Loan is already fully repaid.' });
        }

        const contributionBalanceResult = await Contribution.sum('total_amount', {
            where: { user_id: loan.user_id, status: 'approved' }
        });
        const contributionBalance = parseFloat(contributionBalanceResult || 0);

        if (!confirm) {
            let requestedAmount = null;
            if (requestedAmountRaw !== undefined && requestedAmountRaw !== null && String(requestedAmountRaw).trim() !== '') {
                const parsed = parseFloat(requestedAmountRaw);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                    return res.status(400).json({ success: false, message: 'Invalid liquidation amount' });
                }
                requestedAmount = parsed;
            }
            const maxDeductible = Math.max(0, Math.min(remainingBalance, contributionBalance));
            const amountToDeduct = requestedAmount == null ? remainingBalance : requestedAmount;
            if (amountToDeduct > maxDeductible) {
                return res.status(400).json({
                    success: false,
                    message: 'Liquidation amount exceeds available contribution balance or remaining loan balance',
                    remaining_loan_balance: remainingBalance,
                    contribution_balance: contributionBalance,
                    max_deductible: maxDeductible
                });
            }
            return res.json({
                success: true,
                requires_confirmation: true,
                loan_id: loan.id,
                remaining_loan_balance: remainingBalance,
                contribution_balance: contributionBalance,
                max_deductible: maxDeductible,
                amount_to_deduct: amountToDeduct
            });
        }

        const now = new Date();
        const repaymentDate = now.toISOString().slice(0, 10);
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        let committedDeducted = 0;
        let committedRemainingBefore = remainingBalance;
        let committedRemainingAfter = remainingBalance;
        let committedContributionBalanceBefore = contributionBalance;
        let committedContributionBalanceAfter = contributionBalance;
        let committedLiquidationId = null;

        await sequelize.transaction(
            { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
            async (transaction) => {
                const lockedLoan = await Loan.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
                if (!lockedLoan) {
                    throw new Error('LOAN_NOT_FOUND');
                }

                if (!['active', 'disbursed', 'defaulted'].includes(lockedLoan.status)) {
                    throw new Error('INVALID_LOAN_STATUS');
                }

                const lockedTotalRepaymentRaw = lockedLoan.total_repayment ?? lockedLoan.amount_approved ?? lockedLoan.amount_requested ?? 0;
                const lockedTotalRepayment = parseFloat(lockedTotalRepaymentRaw) || 0;

                const repaidInTxResult = await LoanRepayment.sum('repayment_amount', {
                    where: { loan_id: lockedLoan.id, user_id: lockedLoan.user_id, status: 'verified' },
                    transaction
                });
                const repaidInTx = parseFloat(repaidInTxResult || 0);
                const remainingInTx = Math.max(0, Math.round((lockedTotalRepayment - repaidInTx) * 100) / 100);

                if (remainingInTx <= 0) {
                    throw new Error('ALREADY_REPAID');
                }

                const contributionBalanceInTxResult = await Contribution.sum('total_amount', {
                    where: { user_id: lockedLoan.user_id, status: 'approved' },
                    transaction
                });
                const contributionBalanceInTx = parseFloat(contributionBalanceInTxResult || 0);

                const amountInTx = (() => {
                    if (requestedAmountRaw !== undefined && requestedAmountRaw !== null && String(requestedAmountRaw).trim() !== '') {
                        const parsed = parseFloat(requestedAmountRaw);
                        return parsed;
                    }
                    return remainingInTx;
                })();

                if (!Number.isFinite(amountInTx) || amountInTx <= 0) {
                    throw new Error('INVALID_AMOUNT');
                }
                if (amountInTx - 1e-9 > remainingInTx) {
                    throw new Error('AMOUNT_EXCEEDS_LOAN');
                }
                if (amountInTx - 1e-9 > contributionBalanceInTx) {
                    throw new Error('INSUFFICIENT_CONTRIBUTIONS');
                }

                const contributionDeduction = await Contribution.create({
                    user_id: lockedLoan.user_id,
                    savings: -amountInTx,
                    investment: 0,
                    target_saving: 0,
                    payment_method: 'cash',
                    total_amount: -amountInTx,
                    contribution_date: now,
                    month,
                    year,
                    status: 'approved',
                    approved_by: adminUser.id,
                    approval_date: now,
                    notes: `Loan liquidation deduction for loan #${lockedLoan.id}`
                }, { transaction });

                const repayment = await LoanRepayment.create({
                    loan_id: lockedLoan.id,
                    user_id: lockedLoan.user_id,
                    repayment_amount: amountInTx,
                    repayment_date: repaymentDate,
                    payment_method: 'contribution_deduction',
                    status: 'verified',
                    recorded_by: adminUser.id,
                    notes: `Liquidated from contributions by admin user_id=${adminUser.id}`
                }, { transaction });

                const remainingAfter = Math.max(0, Math.round((remainingInTx - amountInTx) * 100) / 100);
                const newStatus = remainingAfter <= 0 ? 'completed' : lockedLoan.status;
                await lockedLoan.update({ status: newStatus }, { transaction });

                const member = await User.findByPk(lockedLoan.user_id, {
                    transaction,
                    include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['name', 'psn'] }],
                    attributes: ['id', 'membership_application_id']
                });

                const liquidation = await LoanLiquidation.create({
                    loan_id: lockedLoan.id,
                    member_user_id: lockedLoan.user_id,
                    member_psn: member?.membershipApplication?.psn || null,
                    member_name: member?.membershipApplication?.name || null,
                    admin_user_id: adminUser.id,
                    admin_role: adminUser.role || null,
                    admin_name: adminUser?.membershipApplication?.name || null,
                    loan_repayment_id: repayment.id,
                    contribution_id: contributionDeduction.id,
                    amount: amountInTx,
                    loan_balance_before: remainingInTx,
                    loan_balance_after: remainingAfter,
                    contribution_balance_before: contributionBalanceInTx,
                    contribution_balance_after: contributionBalanceInTx - amountInTx
                }, { transaction });

                committedDeducted = amountInTx;
                committedRemainingBefore = remainingInTx;
                committedRemainingAfter = remainingAfter;
                committedContributionBalanceBefore = contributionBalanceInTx;
                committedContributionBalanceAfter = contributionBalanceInTx - amountInTx;
                committedLiquidationId = liquidation.id;
            }
        );

        await ActivityLog.logActivity(
            {
                id: adminUser.id,
                role: adminUser.role,
                name: adminUser?.membershipApplication?.name || null
            },
            'liquidate_loan_from_contributions',
            'loan',
            loan.id,
            `Liquidated loan #${loan.id} by deducting ₦${Number(committedDeducted).toLocaleString()} from member contributions`,
            {
                loan_id: loan.id,
                member_user_id: loan.user_id,
                liquidation_id: committedLiquidationId,
                deducted_amount: committedDeducted,
                loan_balance_before: committedRemainingBefore,
                loan_balance_after: committedRemainingAfter,
                member_contribution_balance_before: committedContributionBalanceBefore,
                member_contribution_balance_after: committedContributionBalanceAfter
            },
            req
        );

        await Notification.create({
            user_id: loan.user_id,
            type: 'loan_liquidated',
            title: 'Loan Liquidated from Contributions',
            message: `₦${Number(committedDeducted).toLocaleString()} was deducted from your contribution balance towards your outstanding loan.`,
            is_read: false
        });

        await Notification.create({
            user_id: adminUser.id,
            type: 'loan_liquidation_success',
            title: 'Loan Liquidation Successful',
            message: `Loan #${loan.id} liquidation processed successfully. Amount deducted: ₦${Number(committedDeducted).toLocaleString()}.`,
            is_read: false
        });

        if (emailService.sendLoanLiquidationNotice) {
            try {
                const member = await User.findByPk(loan.user_id, {
                    include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['name', 'email'] }]
                });
                if (member?.membershipApplication?.email) {
                    await emailService.sendLoanLiquidationNotice(member.membershipApplication.email, {
                        memberName: member.membershipApplication.name,
                        loanId: loan.id,
                        amount: committedDeducted
                    });
                }
            } catch (e) {
                console.error('Failed to send loan liquidation email:', e);
            }
        }

        res.json({
            success: true,
            message: 'Loan liquidated successfully',
            loan_id: loan.id,
            liquidation_id: committedLiquidationId,
            receipt_url: committedLiquidationId ? `/loans/liquidations/${committedLiquidationId}/receipt` : null,
            deducted_amount: committedDeducted,
            remaining_loan_balance_before: committedRemainingBefore,
            remaining_loan_balance_after: committedRemainingAfter,
            contribution_balance_before: committedContributionBalanceBefore,
            contribution_balance_after: committedContributionBalanceAfter
        });
    } catch (error) {
        const code = error?.message;
        if (code === 'INSUFFICIENT_CONTRIBUTIONS') {
            return res.status(400).json({ success: false, message: 'Insufficient contribution balance to liquidate this loan.' });
        }
        if (code === 'INVALID_AMOUNT') {
            return res.status(400).json({ success: false, message: 'Invalid liquidation amount.' });
        }
        if (code === 'AMOUNT_EXCEEDS_LOAN') {
            return res.status(400).json({ success: false, message: 'Liquidation amount exceeds the remaining loan balance.' });
        }
        if (code === 'ALREADY_REPAID') {
            return res.status(400).json({ success: false, message: 'Loan is already fully repaid.' });
        }
        if (code === 'INVALID_LOAN_STATUS') {
            return res.status(400).json({ success: false, message: 'Loan is not eligible for liquidation.' });
        }
        if (code === 'LOAN_NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Loan not found' });
        }
        console.error('Loan liquidation error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during loan liquidation.' });
    }
};

const getLoanLiquidationReceipt = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid liquidation id' });
        }
        if (!PDFDocument) {
            return res.status(500).json({ success: false, message: 'PDF receipt is not available on this server' });
        }

        const liquidation = await LoanLiquidation.findByPk(id);
        if (!liquidation) {
            return res.status(404).json({ success: false, message: 'Liquidation record not found' });
        }

        const allowedRoles = ['admin', 'super_admin', 'treasurer', 'chairman'];
        const isAdminAllowed = allowedRoles.includes(req.user.role) && req.user.can_liquidate_loans;
        const isMember = req.user.id === liquidation.member_user_id;
        if (!isAdminAllowed && !isMember) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const exportDate = new Date().toISOString().slice(0, 10);
        const filename = `loan_liquidation_receipt_${liquidation.loan_id}_${exportDate}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const doc = new PDFDocument({ size: 'A4', margin: 48 });
        doc.pipe(res);

        const sanitizeText = (value) => {
            if (value == null) return '';
            return String(value).replace(/[<>]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
        };
        const formatNgn = (n) => {
            const num = Number(n);
            if (!Number.isFinite(num)) return '';
            return `₦${Math.round(num).toLocaleString('en-US')}`;
        };

        doc.fontSize(18).text('Loan Liquidation Receipt', { align: 'center' });
        doc.moveDown(0.8);

        doc.fontSize(11).fillColor('#333');
        doc.text(`Receipt ID: ${liquidation.id}`);
        doc.text(`Date: ${new Date(liquidation.created_at || Date.now()).toLocaleString()}`);
        doc.moveDown(0.8);

        doc.fontSize(12).fillColor('#000').text('Member', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(11).fillColor('#333');
        doc.text(`Name: ${sanitizeText(liquidation.member_name || 'Unknown')}`);
        doc.text(`PSN: ${sanitizeText(liquidation.member_psn || '')}`);
        doc.moveDown(0.8);

        doc.fontSize(12).fillColor('#000').text('Loan', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(11).fillColor('#333');
        doc.text(`Loan ID: ${liquidation.loan_id}`);
        doc.text(`Liquidation Amount: ${formatNgn(liquidation.amount)}`);
        doc.text(`Loan Balance Before: ${formatNgn(liquidation.loan_balance_before)}`);
        doc.text(`Loan Balance After: ${formatNgn(liquidation.loan_balance_after)}`);
        doc.moveDown(0.8);

        doc.fontSize(12).fillColor('#000').text('Contributions', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(11).fillColor('#333');
        doc.text(`Contribution Balance Before: ${formatNgn(liquidation.contribution_balance_before)}`);
        doc.text(`Contribution Balance After: ${formatNgn(liquidation.contribution_balance_after)}`);
        doc.moveDown(0.8);

        doc.fontSize(12).fillColor('#000').text('Processed By', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(11).fillColor('#333');
        doc.text(`Admin Name: ${sanitizeText(liquidation.admin_name || 'Unknown')}`);
        doc.text(`Admin Role: ${sanitizeText(liquidation.admin_role || '')}`);
        doc.moveDown(1.2);

        doc.fontSize(10).fillColor('#666').text('This receipt confirms a contribution deduction applied towards an outstanding loan balance.');
        doc.end();
    } catch (error) {
        console.error('Get loan liquidation receipt error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
  validateGrantor,
  approveLoan,
  rejectLoan,
  getLoans,
  getLoanById,
  createLoan,
  updateLoan,
  deleteLoan,
  getLoanStats,
  getDisbursedStats,
  getCurrentLoans,
  respondToGuaranteeRequest,
  getGuaranteeRequests,
  getGuaranteeSummary,
  submitAgreement,
  getAgreements,
  getAllAgreements,
  bulkImportLoans,
  bulkUpdateLoans,
  reverseDisbursement,
  reverseApproval,
  getPayslipDocuments,
  servePayslip,
  serveEducationalDocument,
  liquidateLoan,
  getLoanLiquidationReceipt
};
