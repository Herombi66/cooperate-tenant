const { sequelize } = require('../db/connection');
const { ContributionIncreaseRequest, MembershipApplication, ActivityLog, Notification, Settings, User } = require('../models');
const { Op, Transaction } = require('sequelize');
const emailService = require('../services/emailService');
let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch {}

const allowedReviewerRoles = ['admin', 'super_admin', 'treasurer', 'chairman'];

const getContributionIncreaseRules = async () => {
  const defaults = { min: 0, max: 1000000000, min_increase_percent: 0, max_increase_percent: null };
  try {
    const rows = await Settings.findAll({
      where: {
        key: {
          [Op.in]: [
            'min_contribution_commitment',
            'max_contribution_commitment',
            'min_contribution_increase_percent',
            'max_contribution_increase_percent'
          ]
        }
      }
    });
    const map = {};
    for (const r of rows) {
      const raw = r.value;
      let parsed = 0;
      if (typeof raw === 'number') parsed = raw;
      else if (typeof raw === 'string') parsed = parseFloat(raw);
      else if (raw && typeof raw === 'object' && raw.hasOwnProperty('value')) parsed = parseFloat(raw.value);
      else parsed = parseFloat(String(raw));
      map[r.key] = isNaN(parsed) ? null : parsed;
    }
    return {
      min: map.min_contribution_commitment ?? defaults.min,
      max: map.max_contribution_commitment ?? defaults.max,
      min_increase_percent: map.min_contribution_increase_percent ?? defaults.min_increase_percent,
      max_increase_percent: map.max_contribution_increase_percent ?? defaults.max_increase_percent
    };
  } catch (e) {
    return defaults;
  }
};

const getReviewerEmails = async () => {
  try {
    const reviewers = await User.findAll({
      where: { role: { [Op.in]: allowedReviewerRoles } },
      include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['email', 'name'], required: false }],
      attributes: ['id', 'role']
    });
    const emails = [];
    for (const r of reviewers) {
      const email = r?.membershipApplication?.email;
      if (email) emails.push(email);
    }
    return Array.from(new Set(emails));
  } catch {
    return [];
  }
};

const submitIncreaseRequest = async (req, res) => {
  try {
    const requestedAmountRaw = req.body?.requested_amount;
    const memberNoteRaw = req.body?.member_note;
    const memberNote = (memberNoteRaw ?? '').toString().trim();
    const requestedAmount = parseFloat(requestedAmountRaw);

    if (!requestedAmountRaw || isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'requested_amount must be a positive number' });
    }

    if (!memberNote) {
      return res.status(400).json({ success: false, message: 'member_note (justification) is required' });
    }

    const membershipApplicationId = req.user?.membership_application_id;
    if (!membershipApplicationId) {
      return res.status(400).json({ success: false, message: 'Member profile is not linked to a membership application' });
    }

    if (req.user.role !== 'member') {
      return res.status(403).json({ success: false, message: 'Only member accounts can submit contribution increase requests' });
    }

    const rules = await getContributionIncreaseRules();

    const file = req.file || null;
    const supportingDocumentUrl = file ? `/uploads/${file.filename}` : null;
    const supportingDocumentName = file ? file.originalname : null;
    const supportingDocumentMime = file ? file.mimetype : null;
    const supportingDocumentSize = file ? file.size : null;

    let requestRecord = null;
    let membershipEmail = null;
    let memberName = null;
    let currentAmount = 0;

    try {
      await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
        const membership = await MembershipApplication.findByPk(membershipApplicationId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!membership) throw new Error('MEMBERSHIP_NOT_FOUND');

        membershipEmail = membership.email || null;
        memberName = membership.name || null;

        currentAmount = parseFloat(membership.contribution_amount_commitment || 0);
        if (requestedAmount <= currentAmount) throw new Error('NOT_GREATER_THAN_CURRENT');

        const minRequired = currentAmount * (1 + (Number(rules.min_increase_percent) || 0) / 100);
        if ((Number(rules.min_increase_percent) || 0) > 0 && requestedAmount + 1e-9 < minRequired) {
          throw new Error('BELOW_MIN_PERCENT');
        }

        if (rules.max_increase_percent !== null && rules.max_increase_percent !== undefined) {
          const maxAllowed = currentAmount * (1 + Number(rules.max_increase_percent) / 100);
          if (requestedAmount - 1e-9 > maxAllowed) throw new Error('ABOVE_MAX_PERCENT');
        }

        if (requestedAmount < rules.min || requestedAmount > rules.max) {
          throw new Error('OUTSIDE_LIMITS');
        }

        const existingPending = await ContributionIncreaseRequest.findOne({
          where: { membership_application_id: membershipApplicationId, status: 'PENDING' },
          transaction,
          lock: transaction.LOCK.KEY_SHARE
        });
        if (existingPending) throw new Error('ALREADY_PENDING');

        requestRecord = await ContributionIncreaseRequest.create({
          user_id: req.user.id,
          membership_application_id: membershipApplicationId,
          current_amount: currentAmount,
          requested_amount: requestedAmount,
          status: 'PENDING',
          member_note: memberNote,
          supporting_document_url: supportingDocumentUrl,
          supporting_document_name: supportingDocumentName,
          supporting_document_mime: supportingDocumentMime,
          supporting_document_size: supportingDocumentSize,
          requested_at: new Date()
        }, { transaction });
      });
    } catch (e) {
      const code = e?.message;
      if (code === 'MEMBERSHIP_NOT_FOUND') return res.status(404).json({ success: false, message: 'Membership application not found' });
      if (code === 'NOT_GREATER_THAN_CURRENT') return res.status(400).json({ success: false, message: 'Requested amount must be greater than current contribution amount' });
      if (code === 'BELOW_MIN_PERCENT') return res.status(400).json({ success: false, message: `Requested amount must be at least ${(Number(rules.min_increase_percent) || 0)}% higher than current amount` });
      if (code === 'ABOVE_MAX_PERCENT') return res.status(400).json({ success: false, message: `Requested amount cannot exceed ${(Number(rules.max_increase_percent) || 0)}% above current amount` });
      if (code === 'OUTSIDE_LIMITS') return res.status(400).json({ success: false, message: `Requested amount must be between ₦${rules.min} and ₦${rules.max}` });
      if (code === 'ALREADY_PENDING') return res.status(400).json({ success: false, message: 'You already have a pending contribution increase request' });
      if (e?.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ success: false, message: 'You already have a pending contribution increase request' });
      throw e;
    }

    await ActivityLog.logActivity(
      {
        id: req.user.id,
        role: req.user.role,
        name: req.user?.membershipApplication?.name || null
      },
      'submit_contribution_increase_request',
      'contribution_increase_request',
      requestRecord.id,
      `Member submitted contribution increase request from ₦${currentAmount} to ₦${requestedAmount}`,
      {
        request_id: requestRecord.id,
        membership_application_id: membershipApplicationId,
        current_amount: currentAmount,
        requested_amount: requestedAmount,
        supporting_document_url: supportingDocumentUrl || null
      },
      req
    );

    const reviewerEmails = await getReviewerEmails();
    if (membershipEmail) {
      void emailService.sendEmail({
        to: membershipEmail,
        subject: 'Contribution Increase Request Submitted',
        text: `Hello${memberName ? ' ' + memberName : ''},\n\nYour request to increase your contribution commitment from ₦${Number(currentAmount).toLocaleString()} to ₦${Number(requestedAmount).toLocaleString()} has been submitted and is pending review.\n\nRegards,\nIMAN MCS`
      });
    }
    if (reviewerEmails.length > 0) {
      void emailService.sendEmail({
        to: reviewerEmails,
        subject: 'New Contribution Increase Request Pending Approval',
        text: `A new contribution increase request has been submitted.\n\nMember: ${memberName || 'Unknown'}\nCurrent: ₦${Number(currentAmount).toLocaleString()}\nRequested: ₦${Number(requestedAmount).toLocaleString()}\nRequest ID: ${requestRecord.id}\n\nPlease review in the admin portal.\n\nIMAN MCS`
      });
    }

    res.status(201).json({ success: true, request: requestRecord });
  } catch (error) {
    console.error('Submit contribution increase request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getMyIncreaseRequests = async (req, res) => {
  try {
    const membershipApplicationId = req.user?.membership_application_id;
    if (!membershipApplicationId) {
      return res.status(400).json({ success: false, message: 'Member profile is not linked to a membership application' });
    }
    if (req.user.role !== 'member') {
      return res.status(403).json({ success: false, message: 'Only member accounts can view their contribution increase requests' });
    }
    const requests = await ContributionIncreaseRequest.findAll({
      where: { membership_application_id: membershipApplicationId },
      order: [['requested_at', 'DESC'], ['id', 'DESC']]
    });
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Get my contribution increase requests error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getMyCommitment = async (req, res) => {
  try {
    const membershipApplicationId = req.user?.membership_application_id;
    if (!membershipApplicationId) {
      return res.status(400).json({ success: false, message: 'Member profile is not linked to a membership application' });
    }
    if (req.user.role !== 'member') {
      return res.status(403).json({ success: false, message: 'Only member accounts can view contribution commitment' });
    }
    const membership = await MembershipApplication.findByPk(membershipApplicationId);
    if (!membership) return res.status(404).json({ success: false, message: 'Membership application not found' });

    const rules = await getContributionIncreaseRules();
    const pendingRequest = await ContributionIncreaseRequest.findOne({
      where: { membership_application_id: membershipApplicationId, status: 'PENDING' },
      order: [['requested_at', 'DESC'], ['id', 'DESC']]
    });

    res.json({
      success: true,
      commitment: {
        current_amount: parseFloat(membership.contribution_amount_commitment || 0),
        rules,
        pending_request: pendingRequest || null
      }
    });
  } catch (error) {
    console.error('Get my contribution commitment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const listIncreaseRequests = async (req, res) => {
  try {
    if (!allowedReviewerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { status = 'PENDING', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status.toString().toUpperCase();
    }

    const { count, rows } = await ContributionIncreaseRequest.findAndCountAll({
      where: whereClause,
      include: [
        { model: MembershipApplication, as: 'membershipApplication', attributes: ['id', 'psn', 'name', 'email'] },
        { model: User, as: 'reviewedBy', attributes: ['id', 'role'], required: false }
      ],
      order: [['requested_at', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      requests: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List contribution increase requests error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const approveIncreaseRequest = async (req, res) => {
  try {
    if (!allowedReviewerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const comment = (req.body?.comment || '').toString().trim();
    if (!comment) {
      return res.status(400).json({ success: false, message: 'comment is required' });
    }

    const now = new Date();
    let updatedRequest = null;
    let memberEmail = null;
    let memberName = null;
    let currentAmount = null;
    let requestedAmount = null;

    const rules = await getContributionIncreaseRules();

    await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
      const requestRecord = await ContributionIncreaseRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!requestRecord) {
        throw new Error('NOT_FOUND');
      }
      if (requestRecord.status !== 'PENDING') {
        throw new Error('NOT_PENDING');
      }

      const membership = await MembershipApplication.findByPk(requestRecord.membership_application_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!membership) {
        throw new Error('MEMBERSHIP_NOT_FOUND');
      }

      memberEmail = membership.email || null;
      memberName = membership.name || null;
      currentAmount = parseFloat(membership.contribution_amount_commitment || 0);
      requestedAmount = parseFloat(requestRecord.requested_amount);
      if (requestedAmount <= currentAmount) {
        throw new Error('INVALID_REQUESTED_AMOUNT');
      }

      const minRequired = currentAmount * (1 + (Number(rules.min_increase_percent) || 0) / 100);
      if ((Number(rules.min_increase_percent) || 0) > 0 && requestedAmount + 1e-9 < minRequired) {
        throw new Error('BELOW_MIN_PERCENT');
      }
      if (rules.max_increase_percent !== null && rules.max_increase_percent !== undefined) {
        const maxAllowed = currentAmount * (1 + Number(rules.max_increase_percent) / 100);
        if (requestedAmount - 1e-9 > maxAllowed) throw new Error('ABOVE_MAX_PERCENT');
      }
      if (requestedAmount < rules.min || requestedAmount > rules.max) {
        throw new Error('OUTSIDE_LIMITS');
      }

      await membership.update({ contribution_amount_commitment: requestedAmount }, { transaction });

      updatedRequest = await requestRecord.update({
        status: 'APPROVED',
        reviewed_by: req.user.id,
        reviewed_at: now,
        review_comment: comment
      }, { transaction });
    });

    await ActivityLog.logActivity(
      {
        id: req.user.id,
        role: req.user.role,
        name: req.user?.membershipApplication?.name || null
      },
      'approve_contribution_increase_request',
      'contribution_increase_request',
      id,
      `Contribution increase request #${id} approved`,
      {
        request_id: id,
        comment,
        current_amount: currentAmount,
        requested_amount: requestedAmount,
        membership_application_id: updatedRequest?.membership_application_id || null
      },
      req
    );

    await Notification.create({
      user_id: updatedRequest.user_id,
      type: 'contribution_increase_approved',
      title: 'Contribution Increase Approved',
      message: `Your request to increase your contribution commitment to ₦${Number(updatedRequest.requested_amount).toLocaleString()} was approved. Comment: ${comment}`,
      is_read: false
    });

    if (memberEmail) {
      void emailService.sendEmail({
        to: memberEmail,
        subject: 'Contribution Increase Request Approved',
        text: `Hello${memberName ? ' ' + memberName : ''},\n\nYour contribution increase request has been approved.\n\nCurrent: ₦${Number(currentAmount).toLocaleString()}\nNew: ₦${Number(requestedAmount).toLocaleString()}\nComment: ${comment}\n\nRegards,\nIMAN MCS`
      });
    }

    const reviewerEmails = await getReviewerEmails();
    if (reviewerEmails.length > 0) {
      void emailService.sendEmail({
        to: reviewerEmails,
        subject: `Contribution Increase Request #${id} Approved`,
        text: `Contribution increase request #${id} has been approved.\n\nMember: ${memberName || 'Unknown'}\nNew commitment: ₦${Number(requestedAmount).toLocaleString()}\nComment: ${comment}\n\nIMAN MCS`
      });
    }

    res.json({ success: true, request: updatedRequest });
  } catch (error) {
    const code = error?.message;
    if (code === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Request not found' });
    if (code === 'NOT_PENDING') return res.status(400).json({ success: false, message: 'Request is not pending' });
    if (code === 'MEMBERSHIP_NOT_FOUND') return res.status(404).json({ success: false, message: 'Membership application not found' });
    if (code === 'INVALID_REQUESTED_AMOUNT') return res.status(400).json({ success: false, message: 'Requested amount is no longer valid' });
    if (code === 'BELOW_MIN_PERCENT') return res.status(400).json({ success: false, message: 'Requested amount no longer meets the minimum increase requirement' });
    if (code === 'ABOVE_MAX_PERCENT') return res.status(400).json({ success: false, message: 'Requested amount exceeds the maximum allowed increase' });
    if (code === 'OUTSIDE_LIMITS') return res.status(400).json({ success: false, message: 'Requested amount is outside configured limits' });
    console.error('Approve contribution increase request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const rejectIncreaseRequest = async (req, res) => {
  try {
    if (!allowedReviewerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const comment = (req.body?.comment || '').toString().trim();
    if (!comment) {
      return res.status(400).json({ success: false, message: 'comment is required' });
    }
    const now = new Date();

    let requestRecord = null;
    let memberEmail = null;
    let memberName = null;

    await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
      requestRecord = await ContributionIncreaseRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!requestRecord) throw new Error('NOT_FOUND');
      if (requestRecord.status !== 'PENDING') throw new Error('NOT_PENDING');

      const membership = await MembershipApplication.findByPk(requestRecord.membership_application_id, { transaction, lock: transaction.LOCK.UPDATE });
      memberEmail = membership?.email || null;
      memberName = membership?.name || null;

      await requestRecord.update({
        status: 'REJECTED',
        reviewed_by: req.user.id,
        reviewed_at: now,
        review_comment: comment
      }, { transaction });
    });

    await ActivityLog.logActivity(
      {
        id: req.user.id,
        role: req.user.role,
        name: req.user?.membershipApplication?.name || null
      },
      'reject_contribution_increase_request',
      'contribution_increase_request',
      id,
      `Contribution increase request #${id} rejected`,
      { request_id: id, comment },
      req
    );

    await Notification.create({
      user_id: requestRecord.user_id,
      type: 'contribution_increase_rejected',
      title: 'Contribution Increase Rejected',
      message: `Your contribution increase request was rejected. Reason: ${comment}`,
      is_read: false
    });

    if (memberEmail) {
      void emailService.sendEmail({
        to: memberEmail,
        subject: 'Contribution Increase Request Rejected',
        text: `Hello${memberName ? ' ' + memberName : ''},\n\nYour contribution increase request has been rejected.\n\nReason: ${comment}\n\nRegards,\nIMAN MCS`
      });
    }

    const reviewerEmails = await getReviewerEmails();
    if (reviewerEmails.length > 0) {
      void emailService.sendEmail({
        to: reviewerEmails,
        subject: `Contribution Increase Request #${id} Rejected`,
        text: `Contribution increase request #${id} has been rejected.\n\nMember: ${memberName || 'Unknown'}\nReason: ${comment}\n\nIMAN MCS`
      });
    }

    res.json({ success: true, request: requestRecord });
  } catch (error) {
    const code = error?.message;
    if (code === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Request not found' });
    if (code === 'NOT_PENDING') return res.status(400).json({ success: false, message: 'Request is not pending' });
    console.error('Reject contribution increase request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const exportIncreaseRequestsPdf = async (req, res) => {
  try {
    if (!allowedReviewerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!PDFDocument) {
      return res.status(500).json({ success: false, message: 'PDF export is not available on this server' });
    }

    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const parsedIds = ids
      .map((v) => parseInt(v))
      .filter((v) => Number.isFinite(v) && v > 0);

    if (parsedIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No request ids provided' });
    }

    const requests = await ContributionIncreaseRequest.findAll({
      where: { id: { [Op.in]: parsedIds } },
      include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['name', 'psn'] }],
      order: [['requested_at', 'DESC'], ['id', 'DESC']]
    });

    const exportDate = new Date().toISOString().slice(0, 10);
    const filename = `contribution_increase_requests_${exportDate}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
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

    doc.fontSize(16).text('Contribution Increase Requests', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#444').text(`Export date: ${exportDate}`);
    doc.moveDown(0.5);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colName = Math.floor(pageWidth * 0.44);
    const colPsn = Math.floor(pageWidth * 0.18);
    const colAmount = Math.floor(pageWidth * 0.20);
    const colDate = pageWidth - colName - colPsn - colAmount;

    const startX = doc.page.margins.left;
    const headerY = doc.y;

    const drawHeader = () => {
      const y = doc.y;
      doc.fontSize(10).fillColor('#000');
      doc.text('Member Name', startX, y, { width: colName });
      doc.text('PSN', startX + colName, y, { width: colPsn });
      doc.text('Requested Amount', startX + colName + colPsn, y, { width: colAmount, align: 'right' });
      doc.text('Request Date', startX + colName + colPsn + colAmount, y, { width: colDate, align: 'right' });
      doc.moveDown(0.4);
      doc.strokeColor('#cccccc').moveTo(startX, doc.y).lineTo(startX + pageWidth, doc.y).stroke();
      doc.moveDown(0.3);
    };

    doc.y = headerY;
    drawHeader();

    for (const r of requests) {
      const rowTopY = doc.y;
      const name = sanitizeText(r?.membershipApplication?.name || 'Unknown');
      const psn = sanitizeText(r?.membershipApplication?.psn || '');
      const amount = formatNgn(r?.requested_amount);
      const date = r?.requested_at ? new Date(r.requested_at).toISOString().slice(0, 10) : '';

      const nameHeight = doc.heightOfString(name, { width: colName });
      const psnHeight = doc.heightOfString(psn, { width: colPsn });
      const rowHeight = Math.max(nameHeight, psnHeight, 12) + 6;
      const bottomY = rowTopY + rowHeight;

      if (bottomY > doc.page.height - doc.page.margins.bottom - 24) {
        doc.addPage();
        drawHeader();
      }

      const y = doc.y;
      doc.fontSize(10).fillColor('#000');
      doc.text(name, startX, y, { width: colName });
      doc.text(psn, startX + colName, y, { width: colPsn });
      doc.text(amount, startX + colName + colPsn, y, { width: colAmount, align: 'right' });
      doc.text(date, startX + colName + colPsn + colAmount, y, { width: colDate, align: 'right' });

      doc.y = y + rowHeight;
      doc.strokeColor('#eeeeee').moveTo(startX, doc.y).lineTo(startX + pageWidth, doc.y).stroke();
      doc.moveDown(0.2);
    }

    await ActivityLog.logActivity(
      {
        id: req.user.id,
        role: req.user.role,
        name: req.user?.membershipApplication?.name || null
      },
      'export_contribution_increase_requests_pdf',
      'contribution_increase_request',
      null,
      `Exported ${requests.length} contribution increase requests (PDF)`,
      { count: requests.length, ids: parsedIds },
      req
    );

    doc.end();
  } catch (error) {
    console.error('Export contribution increase requests PDF error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  submitIncreaseRequest,
  getMyCommitment,
  getMyIncreaseRequests,
  listIncreaseRequests,
  approveIncreaseRequest,
  rejectIncreaseRequest,
  exportIncreaseRequestsPdf
};
