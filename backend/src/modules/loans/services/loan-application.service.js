const { Loan, User, Contribution, Notification, MembershipApplication, ActivityLog, EducationalDocument } = require('../../../../models');
const { LoanStrategyFactory } = require('../strategies');
const emailService = process.env.NODE_ENV === 'test'
  ? { sendGuarantorNotificationEmail: async () => {} }
  : require('../../../../services/emailService');
const { Op } = require('sequelize');

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

const applyForLoan = async (userId, body, uploadedFiles, reqUser, req) => {
  const amount = body.amount || body.amount_requested;
  const tenure = body.tenure || body.repayment_period_months;
  const loanType = body.loanType || body.loan_type;
  const { purpose, guarantor_name, guarantor_phone, guarantor_relationship, guarantor_psn, memberPsn } = body;
  let payslip_url = body.payslip_url;

  let grantorUser = null;
  let grantorMembership = null;

  const primaryPayslip = uploadedFiles.payslip && uploadedFiles.payslip[0] ? uploadedFiles.payslip[0] : null;
  const admissionLetter = uploadedFiles.admission_letter && uploadedFiles.admission_letter[0] ? uploadedFiles.admission_letter[0] : null;
  const studentIdCard = uploadedFiles.student_id_card && uploadedFiles.student_id_card[0] ? uploadedFiles.student_id_card[0] : null;
  const otherDocs = uploadedFiles.education_other || [];

  const storedEducationDocs = {};

  if (primaryPayslip) {
    try {
      const payslipStorage = require('../../../../services/payslipStorage');
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

  let targetUserId = userId;

  if (['admin', 'super_admin', 'secretary'].includes(reqUser.role) && memberPsn) {
    const cleanMemberPsn = memberPsn.trim();
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
      throw new Error(`User account for PSN ${cleanMemberPsn} not found`);
    }
    targetUserId = user.id;
  }

  if (guarantor_psn) {
    const cleanPsn = guarantor_psn.trim();
    const psnRegex = /^[A-Za-z0-9_]{3,20}$/;
    if (!psnRegex.test(cleanPsn)) throw new Error('Invalid Grantor PSN format.');

    const grantorApp = await MembershipApplication.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('psn')), 
        cleanPsn.toLowerCase()
      ),
      include: [{ model: User, as: 'user' }]
    });

    if (!grantorApp) throw new Error(`Grantor with PSN ${cleanPsn} not found.`);
    if (!grantorApp.user) throw new Error(`Grantor (PSN: ${cleanPsn}) has not activated their account yet.`);
    
    grantorUser = grantorApp.user;
    grantorMembership = grantorApp;

    if (grantorUser.id === targetUserId) throw new Error('You cannot be your own grantor.');
    if (grantorUser.status !== 'active') throw new Error('Grantor account is not active.');

    const defaultedCount = await Loan.count({ where: { user_id: grantorUser.id, status: 'defaulted' } });
    if (defaultedCount > 0) throw new Error('Grantor is not eligible due to defaulted loans.');
  }

  const amountNum = typeof amount === 'number' ? amount : parseFloat(String(amount));
  const tenureNum = typeof tenure === 'number' ? tenure : parseInt(String(tenure), 10);

  if (!Number.isFinite(amountNum) || amountNum <= 0 || !Number.isFinite(tenureNum) || tenureNum <= 0) {
    throw new Error('Invalid amount or repayment period');
  }

  if (tenureNum < 1 && loanType === 'emergency') {
    throw new Error('Repayment period must be at least 1 month');
  } else if (tenureNum < 3 && loanType !== 'emergency') {
    throw new Error('Repayment period must be at least 3 months');
  }

  if (loanType === 'emergency' && tenureNum > 6) {
    throw new Error('Repayment period for emergency loans cannot exceed 6 months.');
  }

  if (['investment', 'educational', 'venture'].includes(String(loanType)) && tenureNum > 24) {
    throw new Error('Repayment period for venture, investment and educational loans cannot exceed 24 months.');
  }

  if (!payslip_url) {
    throw new Error('Payslip attachment is required for all loan applications.');
  }

  const totalSavingsVal = parseFloat(
    (await Contribution.sum('savings', { where: { user_id: targetUserId, status: 'approved' } })) || 0
  ) || 0;
  const totalInvestmentVal = parseFloat(
    (await Contribution.sum('investment', { where: { user_id: targetUserId, status: 'approved' } })) || 0
  ) || 0;

  // Initialize Strategy
  const strategy = LoanStrategyFactory.getStrategy(req.tenant, req.tenantSettings);
  
  // Validate Strategy Limits
  strategy.validateLimits(loanType, amountNum, totalSavingsVal, totalInvestmentVal);

  const activeStatuses = ['pending', 'waiting_disbursement', 'approved', 'active', 'disbursed', 'defaulted', 'awaiting_admin_review'];
  const activeLoan = await Loan.findOne({
    where: { user_id: targetUserId, status: { [Op.in]: activeStatuses } }
  });

  if (activeLoan) {
    throw new Error(targetUserId === reqUser.id ? 'You cannot apply for a new loan while you have an active loan. Please complete or cancel your current loan first.' : 'This member already has an active loan application or running loan.');
  }

  let riskAssessment = null;
  try {
    const borrower = await User.findByPk(targetUserId, {
      include: [{ model: MembershipApplication, as: 'membershipApplication' }]
    });
    const startedAt = borrower?.membershipApplication?.created_at || borrower?.created_at || new Date();
    const months = Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)));
    const flags = [];
    if (months < 3) flags.push('NEW_MEMBER');
    if (loanType === 'cash' && amountNum > 500000) flags.push('HIGH_CASH_AMOUNT');
    if (['investment', 'educational', 'venture'].includes(String(loanType)) && totalInvestmentVal > 0 && amountNum / totalInvestmentVal > 2.5) flags.push('HIGH_LTV');
    if ((totalSavingsVal + totalInvestmentVal) < 5000) flags.push('LOW_CONTRIBUTION_HISTORY');

    const creditScore = Math.max(300, Math.min(850, Math.round(350 + Math.min(250, months * 10) + Math.min(150, (totalSavingsVal + totalInvestmentVal) / 10000 * 10) + (flags.length === 0 ? 80 : 0))));
    riskAssessment = { credit_score: creditScore, provider: 'internal', membership_months: months, totals: { savings: totalSavingsVal, investment: totalInvestmentVal }, flags };
  } catch (e) {}

  const interestRate = strategy.calculateInterestRate(loanType, amountNum, tenureNum);

  const newLoan = await Loan.create({
    user_id: targetUserId,
    amount_requested: amountNum,
    repayment_period_months: tenureNum,
    loan_type: loanType || 'cash',
    interest_rate: interestRate,
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
    await ActivityLog.logActivity(reqUser, 'create_loan', 'loan', newLoan.id, `Created ${loanType || 'cash'} loan application (₦${amountNum.toLocaleString()} / ${tenureNum} months)`, { loan_type: loanType || 'cash', amount_requested: amountNum, repayment_period_months: tenureNum, has_payslip: !!payslip_url, risk_assessment: riskAssessment }, req);
  } catch (e) {}

  if (loanType === 'educational') {
    const payslipStorage = require('../../../../services/payslipStorage');
    const createDocRecord = async (file, docType) => {
      if (!file) return null;
      try {
        const stored = payslipStorage.storeEncrypted(file.path, file.mimetype, file.originalname);
        const record = await EducationalDocument.create({ loan_id: newLoan.id, user_id: targetUserId, doc_type: docType, enc_path: stored.encPath, original_name: file.originalname, mime_type: file.mimetype, size: file.size });
        storedEducationDocs[docType] = { id: record.id, enc_path: record.enc_path, original_name: record.original_name, mime_type: record.mime_type, size: record.size };
      } catch (err) { console.error(`Failed to store educational document [${docType}]:`, err); }
    };

    await createDocRecord(admissionLetter, 'admission_letter');
    await createDocRecord(studentIdCard, 'student_id_card');
    if (otherDocs && otherDocs.length > 0) {
      for (const file of otherDocs) await createDocRecord(file, 'other');
    }

    const verificationStatus = await runEducationalVerification(newLoan, reqUser, storedEducationDocs, req);
    newLoan.setDataValue('verification_status', verificationStatus);
  }

  if (targetUserId !== reqUser.id) {
    await ActivityLog.logActivity(reqUser, 'create_loan_on_behalf', 'loan', newLoan.id, `Loan created for member (User ID: ${targetUserId}) by admin`, { loan_id: newLoan.id, member_user_id: targetUserId }, req);
  }

  if (grantorUser) {
    try {
      await Notification.create({ user_id: grantorUser.id, type: 'guarantor_request', title: 'New Loan Guarantee Request', message: 'A member has listed you as grantor for a new loan application. Please review and respond.', data: { loan_id: newLoan.id, borrower_user_id: targetUserId } });
    } catch (e) {}
    try {
      if (emailService.sendGuarantorNotificationEmail && grantorMembership) {
        await emailService.sendGuarantorNotificationEmail({ name: grantorMembership.name, email: grantorMembership.email, psn: grantorMembership.psn }, { loanId: newLoan.id, loanAmount: amount });
      }
    } catch (e) {}
  }

  return { newLoan, riskAssessment };
};

module.exports = {
  applyForLoan
};
