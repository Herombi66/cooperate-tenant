const { check, validationResult } = require('express-validator');
let sanitizeHtml;
try {
  sanitizeHtml = require('sanitize-html');
} catch {
  sanitizeHtml = null;
}
const { Op } = require('sequelize');
const { sequelize } = require('../db/connection');
const { AnimalAcquisitionRequest, User, MembershipApplication, ActivityLog } = require('../models');
const emailService = require('../services/emailService');

const MAX_REASON_CHARS = 2000;

const escapeHtml = (value) => {
  return (value ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const stripHtmlToText = (html) => {
  return (html ?? '')
    .toString()
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const sanitizeReasonHtml = (html) => {
  const raw = (html ?? '').toString();
  if (!raw.trim()) return { html: null, text: null };

  if (!sanitizeHtml) {
    const text = stripHtmlToText(raw);
    const safeHtml = text ? `<p>${escapeHtml(text)}</p>` : '';
    return { html: safeHtml || null, text: text || null };
  }

  const sanitized = sanitizeHtml(raw, {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'a', 'blockquote'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
    }
  });

  const text = sanitizeHtml(sanitized, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
  return { html: sanitized, text };
};

const normalizeDate = (value) => {
  if (value == null) return null;
  const v = value.toString().trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return v.slice(0, 10);
};

const mapRequest = (row) => {
  const member = row.member?.membershipApplication;
  const createdBy = row.createdBy?.membershipApplication;
  return {
    id: row.id,
    member_user_id: row.member_user_id,
    member: member
      ? {
          id: row.member?.id,
          psn: member.psn,
          name: member.name,
          email: member.email
        }
      : null,
    created_by: row.created_by,
    created_by_user: createdBy
      ? {
          id: row.createdBy?.id,
          psn: createdBy.psn,
          name: createdBy.name,
          email: createdBy.email
        }
      : null,
    animal_category: row.animal_category,
    quantity: row.quantity,
    delivery_start_date: row.delivery_start_date,
    delivery_end_date: row.delivery_end_date,
    reason_html: row.reason_html,
    reason_text: row.reason_text,
    status: row.status,
    rejection_reason: row.rejection_reason,
    submitted_at: row.submitted_at,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    rejected_by: row.rejected_by,
    rejected_at: row.rejected_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
};

const baseInclude = [
  {
    model: User,
    as: 'member',
    attributes: ['id'],
    required: false,
    include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['psn', 'name', 'email'] }]
  },
  {
    model: User,
    as: 'createdBy',
    attributes: ['id'],
    required: false,
    include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['psn', 'name', 'email'] }]
  }
];

const listAnimalAcquisitionRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, q } = req.query;
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (parsedPage - 1) * parsedLimit;

    const whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const search = (q ?? '').toString().trim();
    const dialect = sequelize.getDialect();
    const searchOp = dialect === 'postgres' ? Op.iLike : Op.like;

    const memberWhere =
      search.length >= 2
        ? {
            [Op.or]: [
              { psn: { [searchOp]: `%${search}%` } },
              { name: { [searchOp]: `%${search}%` } },
              { email: { [searchOp]: `%${search}%` } }
            ]
          }
        : undefined;

    const include = [
      {
        model: User,
        as: 'member',
        attributes: ['id'],
        required: !!memberWhere,
        include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['psn', 'name', 'email'], where: memberWhere }]
      },
      baseInclude[1]
    ];

    const { rows, count } = await AnimalAcquisitionRequest.findAndCountAll({
      where: whereClause,
      include,
      limit: parsedLimit,
      offset,
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    return res.json({
      success: true,
      items: rows.map(mapRequest),
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(count / parsedLimit)
      }
    });
  } catch (error) {
    console.error('List animal acquisition requests error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load requests' });
  }
};

const getAnimalAcquisitionRequestById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const row = await AnimalAcquisitionRequest.findByPk(id, { include: baseInclude });
    if (!row) return res.status(404).json({ success: false, message: 'Request not found' });
    return res.json({ success: true, item: mapRequest(row) });
  } catch (error) {
    console.error('Get animal acquisition request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load request' });
  }
};

const createAnimalAcquisitionRequestValidation = [
  check('member_user_id').isInt({ min: 1 }).withMessage('member_user_id is required'),
  check('animal_category').optional({ nullable: true }).isString().isLength({ min: 1, max: 40 }),
  check('quantity').optional({ nullable: true }).isInt({ min: 1, max: 99 }),
  check('delivery_start_date').optional({ nullable: true }).isISO8601().withMessage('delivery_start_date must be a date'),
  check('delivery_end_date').optional({ nullable: true }).isISO8601().withMessage('delivery_end_date must be a date'),
  check('reason_html').optional({ nullable: true }).isString().isLength({ max: 20000 })
];

const createAnimalAcquisitionRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const memberUserId = parseInt(req.body.member_user_id);
    const memberUser = await User.findByPk(memberUserId, {
      include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['psn', 'name', 'email'] }]
    });
    if (!memberUser) return res.status(404).json({ success: false, message: 'Member not found' });

    const { html: reasonHtml, text: reasonText } = sanitizeReasonHtml(req.body.reason_html);
    const reasonChars = (reasonText || '').length;
    if (reasonChars > MAX_REASON_CHARS) {
      return res.status(400).json({ success: false, message: `Reason must be ${MAX_REASON_CHARS} characters or fewer.` });
    }

    const payload = {
      member_user_id: memberUserId,
      created_by: req.user.id,
      animal_category: (req.body.animal_category ?? 'ram').toString(),
      quantity: req.body.quantity != null ? parseInt(req.body.quantity) : 1,
      delivery_start_date: normalizeDate(req.body.delivery_start_date),
      delivery_end_date: normalizeDate(req.body.delivery_end_date),
      reason_html: reasonHtml,
      reason_text: reasonText,
      status: 'draft'
    };

    const row = await AnimalAcquisitionRequest.create(payload);

    await ActivityLog.logActivity(
      req.user,
      'animal_request_created',
      'animal_acquisition_request',
      row.id,
      `Created animal acquisition request ${row.id}`,
      { member_user_id: memberUserId, status: 'draft' },
      req
    );

    const io = req.app.get('io');
    if (io) io.emit('animal_request_changed', { id: row.id, status: row.status, event: 'created' });

    const hydrated = await AnimalAcquisitionRequest.findByPk(row.id, { include: baseInclude });
    return res.status(201).json({ success: true, item: mapRequest(hydrated || row) });
  } catch (error) {
    console.error('Create animal acquisition request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create request' });
  }
};

const updateAnimalAcquisitionRequestValidation = [
  check('animal_category').optional({ nullable: true }).isString().isLength({ min: 1, max: 40 }),
  check('quantity').optional({ nullable: true }).isInt({ min: 1, max: 99 }),
  check('delivery_start_date').optional({ nullable: true }).isISO8601().withMessage('delivery_start_date must be a date'),
  check('delivery_end_date').optional({ nullable: true }).isISO8601().withMessage('delivery_end_date must be a date'),
  check('reason_html').optional({ nullable: true }).isString().isLength({ max: 20000 })
];

const updateAnimalAcquisitionRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const row = await AnimalAcquisitionRequest.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: 'Request not found' });
    if (row.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft requests can be edited' });
    }
    if (row.created_by !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updates = {};
    if (req.body.animal_category != null) updates.animal_category = req.body.animal_category.toString();
    if (req.body.quantity != null) updates.quantity = parseInt(req.body.quantity);
    if (req.body.delivery_start_date != null) updates.delivery_start_date = normalizeDate(req.body.delivery_start_date);
    if (req.body.delivery_end_date != null) updates.delivery_end_date = normalizeDate(req.body.delivery_end_date);
    if (req.body.reason_html != null) {
      const { html: reasonHtml, text: reasonText } = sanitizeReasonHtml(req.body.reason_html);
      const reasonChars = (reasonText || '').length;
      if (reasonChars > MAX_REASON_CHARS) {
        return res.status(400).json({ success: false, message: `Reason must be ${MAX_REASON_CHARS} characters or fewer.` });
      }
      updates.reason_html = reasonHtml;
      updates.reason_text = reasonText;
    }

    await row.update(updates);

    await ActivityLog.logActivity(
      req.user,
      'animal_request_updated',
      'animal_acquisition_request',
      row.id,
      `Updated animal acquisition request ${row.id}`,
      { status: row.status },
      req
    );

    const io = req.app.get('io');
    if (io) io.emit('animal_request_changed', { id: row.id, status: row.status, event: 'updated' });

    const hydrated = await AnimalAcquisitionRequest.findByPk(row.id, { include: baseInclude });
    return res.json({ success: true, item: mapRequest(hydrated || row) });
  } catch (error) {
    console.error('Update animal acquisition request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update request' });
  }
};

const submitAnimalAcquisitionRequest = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const result = await sequelize.transaction(async (t) => {
      const row = await AnimalAcquisitionRequest.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!row) return { error: { status: 404, message: 'Request not found' } };
      if (row.status !== 'draft') return { error: { status: 400, message: 'Only draft requests can be submitted' } };
      if (row.created_by !== req.user.id && req.user.role !== 'super_admin') {
        return { error: { status: 403, message: 'Access denied' } };
      }

      const missing = [];
      if (!row.animal_category) missing.push('animal_category');
      if (!row.quantity) missing.push('quantity');
      if (!row.delivery_start_date) missing.push('delivery_start_date');
      if (!row.delivery_end_date) missing.push('delivery_end_date');
      if (!row.reason_text || !row.reason_text.trim()) missing.push('reason');
      if ((row.reason_text || '').length > MAX_REASON_CHARS) missing.push('reason');
      if (missing.length) {
        return { error: { status: 400, message: `Missing or invalid fields: ${missing.join(', ')}` } };
      }

      await row.update({ status: 'pending', submitted_at: new Date() }, { transaction: t });
      return { row };
    });

    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

    const row = await AnimalAcquisitionRequest.findByPk(id, { include: baseInclude });

    await ActivityLog.logActivity(
      req.user,
      'animal_request_submitted',
      'animal_acquisition_request',
      id,
      `Submitted animal acquisition request ${id}`,
      { status: 'pending' },
      req
    );

    const memberEmail = row?.member?.membershipApplication?.email;
    const memberName = row?.member?.membershipApplication?.name;
    const adminEmail = req.user?.membershipApplication?.email;
    const adminName = req.user?.membershipApplication?.name;

    const commonContext = {
      request_id: id,
      member_name: memberName,
      member_email: memberEmail,
      animal_category: row?.animal_category,
      quantity: row?.quantity,
      delivery_start_date: row?.delivery_start_date,
      delivery_end_date: row?.delivery_end_date,
      status: 'Pending',
      reason_html: row?.reason_html || ''
    };

    if (memberEmail) {
      await emailService.sendEmail({
        to: memberEmail,
        subject: `Layyah Purchase Request #${id} Submitted`,
        template: 'animal_request_confirmation',
        context: {
          ...commonContext,
          recipient_name: memberName || 'Member',
          portal_link: (require('../config/email').urls.memberPortal || '').toString()
        },
        tags: ['layyah', 'animal-request', 'member']
      });
    }

    if (adminEmail) {
      await emailService.sendEmail({
        to: adminEmail,
        subject: `Layyah Purchase Request #${id} Submitted`,
        template: 'animal_request_confirmation',
        context: {
          ...commonContext,
          recipient_name: adminName || 'Administrator',
          portal_link: (require('../config/email').urls.adminPortal || '').toString()
        },
        tags: ['layyah', 'animal-request', 'admin']
      });
    }

    const io = req.app.get('io');
    if (io) io.emit('animal_request_changed', { id, status: 'pending', event: 'submitted' });

    return res.json({ success: true, item: mapRequest(row) });
  } catch (error) {
    console.error('Submit animal acquisition request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit request' });
  }
};

const approveAnimalAcquisitionRequest = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const result = await sequelize.transaction(async (t) => {
      const row = await AnimalAcquisitionRequest.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!row) return { error: { status: 404, message: 'Request not found' } };
      if (row.status !== 'pending') return { error: { status: 400, message: 'Only pending requests can be approved' } };
      await row.update({ status: 'approved', approved_by: req.user.id, approved_at: new Date() }, { transaction: t });
      return { row };
    });

    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

    await ActivityLog.logActivity(
      req.user,
      'animal_request_approved',
      'animal_acquisition_request',
      id,
      `Approved animal acquisition request ${id}`,
      { status: 'approved' },
      req
    );

    const row = await AnimalAcquisitionRequest.findByPk(id, { include: baseInclude });
    const memberEmail = row?.member?.membershipApplication?.email;
    const memberName = row?.member?.membershipApplication?.name;
    const adminEmail = req.user?.membershipApplication?.email;
    const adminName = req.user?.membershipApplication?.name;

    const commonContext = {
      request_id: id,
      member_name: memberName,
      member_email: memberEmail,
      animal_category: row?.animal_category,
      quantity: row?.quantity,
      delivery_start_date: row?.delivery_start_date,
      delivery_end_date: row?.delivery_end_date,
      status: 'Approved',
      reason_html: row?.reason_html || ''
    };

    if (memberEmail) {
      await emailService.sendEmail({
        to: memberEmail,
        subject: `Layyah Purchase Request #${id} Approved`,
        template: 'animal_request_confirmation',
        context: {
          ...commonContext,
          recipient_name: memberName || 'Member',
          portal_link: (require('../config/email').urls.memberPortal || '').toString()
        },
        tags: ['layyah', 'animal-request', 'member']
      });
    }

    if (adminEmail) {
      await emailService.sendEmail({
        to: adminEmail,
        subject: `Layyah Purchase Request #${id} Approved`,
        template: 'animal_request_confirmation',
        context: {
          ...commonContext,
          recipient_name: adminName || 'Administrator',
          portal_link: (require('../config/email').urls.adminPortal || '').toString()
        },
        tags: ['layyah', 'animal-request', 'admin']
      });
    }

    const io = req.app.get('io');
    if (io) io.emit('animal_request_changed', { id, status: 'approved', event: 'approved' });

    return res.json({ success: true, item: mapRequest(row) });
  } catch (error) {
    console.error('Approve animal acquisition request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve request' });
  }
};

const rejectAnimalAcquisitionRequestValidation = [
  check('rejection_reason').isString().trim().isLength({ min: 2, max: 1000 }).withMessage('rejection_reason is required')
];

const rejectAnimalAcquisitionRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const reason = req.body.rejection_reason.toString().trim();

    const result = await sequelize.transaction(async (t) => {
      const row = await AnimalAcquisitionRequest.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!row) return { error: { status: 404, message: 'Request not found' } };
      if (row.status !== 'pending') return { error: { status: 400, message: 'Only pending requests can be rejected' } };
      await row.update(
        { status: 'rejected', rejection_reason: reason, rejected_by: req.user.id, rejected_at: new Date() },
        { transaction: t }
      );
      return { row };
    });

    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

    await ActivityLog.logActivity(
      req.user,
      'animal_request_rejected',
      'animal_acquisition_request',
      id,
      `Rejected animal acquisition request ${id}`,
      { status: 'rejected' },
      req
    );

    const row = await AnimalAcquisitionRequest.findByPk(id, { include: baseInclude });
    const memberEmail = row?.member?.membershipApplication?.email;
    const memberName = row?.member?.membershipApplication?.name;
    const adminEmail = req.user?.membershipApplication?.email;
    const adminName = req.user?.membershipApplication?.name;

    const commonContext = {
      request_id: id,
      member_name: memberName,
      member_email: memberEmail,
      animal_category: row?.animal_category,
      quantity: row?.quantity,
      delivery_start_date: row?.delivery_start_date,
      delivery_end_date: row?.delivery_end_date,
      status: 'Rejected',
      reason_html: row?.reason_html || '',
      rejection_reason: row?.rejection_reason || ''
    };

    if (memberEmail) {
      await emailService.sendEmail({
        to: memberEmail,
        subject: `Layyah Purchase Request #${id} Rejected`,
        template: 'animal_request_confirmation',
        context: {
          ...commonContext,
          recipient_name: memberName || 'Member',
          portal_link: (require('../config/email').urls.memberPortal || '').toString()
        },
        tags: ['layyah', 'animal-request', 'member']
      });
    }

    if (adminEmail) {
      await emailService.sendEmail({
        to: adminEmail,
        subject: `Layyah Purchase Request #${id} Rejected`,
        template: 'animal_request_confirmation',
        context: {
          ...commonContext,
          recipient_name: adminName || 'Administrator',
          portal_link: (require('../config/email').urls.adminPortal || '').toString()
        },
        tags: ['layyah', 'animal-request', 'admin']
      });
    }

    const io = req.app.get('io');
    if (io) io.emit('animal_request_changed', { id, status: 'rejected', event: 'rejected' });

    return res.json({ success: true, item: mapRequest(row) });
  } catch (error) {
    console.error('Reject animal acquisition request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
};

const deleteAnimalAcquisitionRequest = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const row = await AnimalAcquisitionRequest.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: 'Request not found' });
    if (row.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft requests can be deleted' });
    if (row.created_by !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await row.destroy();

    await ActivityLog.logActivity(
      req.user,
      'animal_request_deleted',
      'animal_acquisition_request',
      id,
      `Deleted animal acquisition request ${id}`,
      null,
      req
    );

    const io = req.app.get('io');
    if (io) io.emit('animal_request_changed', { id, status: 'deleted', event: 'deleted' });

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete animal acquisition request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete request' });
  }
};

module.exports = {
  listAnimalAcquisitionRequests,
  getAnimalAcquisitionRequestById,
  createAnimalAcquisitionRequestValidation,
  createAnimalAcquisitionRequest,
  updateAnimalAcquisitionRequestValidation,
  updateAnimalAcquisitionRequest,
  submitAnimalAcquisitionRequest,
  approveAnimalAcquisitionRequest,
  rejectAnimalAcquisitionRequestValidation,
  rejectAnimalAcquisitionRequest,
  deleteAnimalAcquisitionRequest
};
