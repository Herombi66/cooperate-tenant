const { LayyahApplication, User, ActivityLog, Notification, Loan, LoanRepayment, LoanLiquidation } = require('../models');
const Settings = require('../models/Settings');
const { sequelize } = require('../db/connection');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch {}

const ANIMAL_TYPE_MAP = {
  cow: 'Cow',
  buffalo: 'Buffalo',
  goat: 'Goat',
  sheep: 'Sheep',
  ram: 'Sheep'
};

const sanitizeText = (value) => {
  if (value == null) return '';
  return String(value).replace(/[<>]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
};

const getAnimalType = (animalCategory) => {
  const key = String(animalCategory || '').trim().toLowerCase();
  return sanitizeText(ANIMAL_TYPE_MAP[key] || (key ? key[0].toUpperCase() + key.slice(1) : 'Unknown'));
};

const getLayyahAnimalCatalog = async (req, res) => {
  const icons = {
    ram: '🐏',
    sheep: '🐑',
    goat: '🐐',
    cow: '🐄',
    buffalo: '🐃'
  };

  const seen = new Set();
  const items = Object.entries(ANIMAL_TYPE_MAP)
    .map(([value, label]) => ({
      value,
      label: sanitizeText(label),
      icon: icons[value] || '🐾'
    }))
    .filter((item) => {
      if (seen.has(item.value)) return false;
      seen.add(item.value);
      return true;
    });

  return res.json({ success: true, items });
};

const formatNgnNumber = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '';
  return Math.round(num).toLocaleString('en-US');
};

const getPriceBracket = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) return null;

  const brackets = [
    { key: '0_25', min: 0, max: 25000 },
    { key: '25_50', min: 25000, max: 50000 },
    { key: '50_75', min: 50000, max: 75000 },
    { key: '75_100', min: 75000, max: 100000 },
    { key: '100_plus', min: 100000, max: null }
  ];

  for (const b of brackets) {
    if (b.max == null) {
      if (value >= b.min) return b;
      continue;
    }
    if (value >= b.min && value < b.max) return b;
  }
  return null;
};

const formatPriceRange = ({ priceMin, priceMax, appliedAmount }) => {
  const min = priceMin != null ? Number(priceMin) : null;
  const max = priceMax != null ? Number(priceMax) : null;

  if (Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= 0) {
    return sanitizeText(`${formatNgnNumber(min)} – ${formatNgnNumber(max)} NGN`);
  }

  const bracket = getPriceBracket(appliedAmount);
  if (!bracket) return sanitizeText('—');
  if (bracket.max == null) return sanitizeText(`${formatNgnNumber(bracket.min)}+ NGN`);
  return sanitizeText(`${formatNgnNumber(bracket.min)} – ${formatNgnNumber(bracket.max)} NGN`);
};

const ADMIN_ROLES = ['admin', 'super_admin', 'treasurer'];
const DUPLICATE_WINDOW_HOURS = Number(process.env.LAYYAH_DUPLICATE_WINDOW_HOURS || 168);
const DUPLICATE_ACTIVE_STATUSES = ['pending', 'under_review', 'approved', 'disbursed'];

const sseClients = new Set();

const sendSseEvent = (event, data) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of Array.from(sseClients)) {
    try {
      client.write(payload);
    } catch {
      try {
        sseClients.delete(client);
      } catch {}
    }
  }
};

const streamLayyahEvents = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);
  res.write(`event: ready\ndata: {}\n\n`);

  const interval = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {}\n\n`);
    } catch {}
  }, 25000);

  req.on('close', () => {
    clearInterval(interval);
    sseClients.delete(res);
  });
};

const getLayyahApplicants = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      q = '',
      status,
      date_from,
      date_to,
      amount_min,
      amount_max,
      animal_type,
      price_bracket,
      kind,
      sort,
      order
    } = req.query;

    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, parseInt(limit) || 25));
    const offset = (safePage - 1) * safeLimit;

    const whereClause = { group_id: null };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (kind && kind !== 'all') {
      whereClause.kind = kind;
    }

    if (date_from || date_to) {
      const from = date_from ? new Date(date_from) : new Date('1970-01-01');
      const to = date_to ? new Date(date_to) : new Date();
      whereClause.created_at = { [Op.between]: [from, to] };
    }

    if (amount_min != null || amount_max != null) {
      const min = amount_min != null && amount_min !== '' ? Number(amount_min) : null;
      const max = amount_max != null && amount_max !== '' ? Number(amount_max) : null;
      if (min != null && Number.isFinite(min) && max != null && Number.isFinite(max)) {
        whereClause.applied_amount = { [Op.between]: [min, max] };
      } else if (min != null && Number.isFinite(min)) {
        whereClause.applied_amount = { [Op.gte]: min };
      } else if (max != null && Number.isFinite(max)) {
        whereClause.applied_amount = { [Op.lte]: max };
      }
    }

    if (animal_type) {
      const rawAnimal = String(animal_type || '').trim().toLowerCase();
      if (rawAnimal) {
        whereClause.animal_category = rawAnimal === 'sheep' ? { [Op.in]: ['sheep', 'ram'] } : rawAnimal;
      }
    }

    if (price_bracket) {
      const key = String(price_bracket || '').trim();
      const bracket =
        key === '0_25'
          ? { min: 0, max: 25000 }
          : key === '25_50'
            ? { min: 25000, max: 50000 }
            : key === '50_75'
              ? { min: 50000, max: 75000 }
              : key === '75_100'
                ? { min: 75000, max: 100000 }
                : key === '100_plus'
                  ? { min: 100000, max: null }
                  : null;
      if (bracket) {
        whereClause.applied_amount = bracket.max == null ? { [Op.gte]: bracket.min } : { [Op.between]: [bracket.min, bracket.max] };
      }
    }

    const search = String(q || '').trim();
    const dialect = sequelize.getDialect();
    const searchOp = dialect === 'postgres' ? Op.iLike : Op.like;
    const searchLike = `%${search}%`;

    if (search) {
      whereClause[Op.and] = whereClause[Op.and] || [];
      whereClause[Op.and].push({
        [Op.or]: [
          { applicant_name: { [searchOp]: searchLike } },
          { user_psn: { [searchOp]: searchLike } },
          { '$user.membershipApplication.name$': { [searchOp]: searchLike } },
          { '$user.membershipApplication.psn$': { [searchOp]: searchLike } },
          { '$user.membershipApplication.email$': { [searchOp]: searchLike } },
          { '$user.membershipApplication.phone$': { [searchOp]: searchLike } }
        ]
      });
    }

    const sortMap = {
      created_at: ['created_at', 'DESC'],
      animal_type: ['animal_category', 'ASC'],
      price_range: ['applied_amount', 'ASC']
    };
    const sortKey = sortMap[sort] ? sort : 'created_at';
    const sortCol = sortMap[sortKey][0];
    const sortDir = (order || '').toString().trim().toLowerCase() === 'asc' ? 'ASC' : sortMap[sortKey][1];

    const { rows, count } = await LayyahApplication.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id'],
          required: false,
          include: [
            {
              model: require('../models').MembershipApplication,
              as: 'membershipApplication',
              attributes: ['name', 'psn', 'email', 'phone'],
              required: false
            }
          ]
        }
      ],
      limit: safeLimit,
      offset,
      order: [[sortCol, sortDir], ['id', 'DESC']]
    });

    const items = rows.map((app) => ({
      member_id: app.user_id,
      application_id: app.id,
      name: app.user?.membershipApplication?.name || app.applicant_name || 'Unknown',
      psn: app.user?.membershipApplication?.psn || app.user_psn || null,
      email: app.user?.membershipApplication?.email || null,
      phone: app.user?.membershipApplication?.phone || null,
      kind: app.kind,
      animal_category: app.animal_category,
      animal_type: getAnimalType(app.animal_category),
      quantity: app.quantity,
      price_min: app.price_min,
      price_max: app.price_max,
      applied_amount: app.applied_amount != null ? app.applied_amount : app.price_max,
      price_range: formatPriceRange({ priceMin: app.price_min, priceMax: app.price_max, appliedAmount: app.applied_amount != null ? app.applied_amount : app.price_max }),
      application_date: app.created_at,
      status: app.status,
      amount_version: app.amount_version || 1
    }));

    res.json({
      success: true,
      items,
      pagination: {
        total: count,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(count / safeLimit)
      }
    });
  } catch (error) {
    console.error('Get layyah applicants error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const buildCsvCell = (value) => {
  if (value == null) return '';
  const raw = String(value);
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n') || raw.includes('\r')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const buildLayyahExportRows = async (query, { transaction } = {}) => {
  const {
    q = '',
    status,
    date_from,
    date_to,
    amount_min,
    amount_max,
    animal_type,
    price_bracket,
    kind
  } = query || {};

  const whereClause = { group_id: null };

  if (status && status !== 'all') {
    whereClause.status = status;
  }

  if (kind && kind !== 'all') {
    whereClause.kind = kind;
  }

  if (date_from || date_to) {
    const from = date_from ? new Date(date_from) : new Date('1970-01-01');
    const to = date_to ? new Date(date_to) : new Date();
    whereClause.created_at = { [Op.between]: [from, to] };
  }

  if (amount_min != null || amount_max != null) {
    const min = amount_min != null && amount_min !== '' ? Number(amount_min) : null;
    const max = amount_max != null && amount_max !== '' ? Number(amount_max) : null;
    if (min != null && Number.isFinite(min) && max != null && Number.isFinite(max)) {
      whereClause.applied_amount = { [Op.between]: [min, max] };
    } else if (min != null && Number.isFinite(min)) {
      whereClause.applied_amount = { [Op.gte]: min };
    } else if (max != null && Number.isFinite(max)) {
      whereClause.applied_amount = { [Op.lte]: max };
    }
  }

  if (animal_type) {
    const rawAnimal = String(animal_type || '').trim().toLowerCase();
    if (rawAnimal) {
      whereClause.animal_category = rawAnimal === 'sheep' ? { [Op.in]: ['sheep', 'ram'] } : rawAnimal;
    }
  }

  if (price_bracket) {
    const key = String(price_bracket || '').trim();
    const bracket =
      key === '0_25'
        ? { min: 0, max: 25000 }
        : key === '25_50'
          ? { min: 25000, max: 50000 }
          : key === '50_75'
            ? { min: 50000, max: 75000 }
            : key === '75_100'
              ? { min: 75000, max: 100000 }
              : key === '100_plus'
                ? { min: 100000, max: null }
                : null;
    if (bracket) {
      whereClause.applied_amount = bracket.max == null ? { [Op.gte]: bracket.min } : { [Op.between]: [bracket.min, bracket.max] };
    }
  }

  const search = String(q || '').trim();
  const dialect = sequelize.getDialect();
  const searchOp = dialect === 'postgres' ? Op.iLike : Op.like;

  const membershipWhere =
    search
      ? {
          [Op.or]: [
            { name: { [searchOp]: `%${search}%` } },
            { email: { [searchOp]: `%${search}%` } },
            { phone: { [searchOp]: `%${search}%` } }
          ]
        }
      : undefined;

  const rows = await LayyahApplication.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [
          {
            model: require('../models').MembershipApplication,
            as: 'membershipApplication',
            attributes: ['name', 'psn', 'email', 'phone'],
            required: true,
            where: membershipWhere
          }
        ]
      }
    ],
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    transaction
  });

  return rows.map((app) => {
    const name = app.user?.membershipApplication?.name || app.applicant_name || 'Unknown';
    const psn = app.user?.membershipApplication?.psn || app.user_psn || null;
    const min = app.price_min != null ? Number(app.price_min) : null;
    const max = app.price_max != null ? Number(app.price_max) : null;
    const appliedAmount = app.applied_amount != null ? Number(app.applied_amount) : app.price_max != null ? Number(app.price_max) : null;
    return {
      full_name: name,
      psn,
      animal_type: getAnimalType(app.animal_category),
      requested_amount_min: min,
      requested_amount_max: max,
      price_range: formatPriceRange({ priceMin: min, priceMax: max, appliedAmount }),
      submission_date: app.created_at,
      status: app.status
    };
  });
};

const exportLayyahApplications = async (req, res) => {
  try {
    const formatRaw = (req.query?.format || 'csv').toString().trim().toLowerCase();
    const format = formatRaw === 'xlsx' || formatRaw === 'excel' ? 'xlsx' : formatRaw === 'pdf' ? 'pdf' : 'csv';

    const statusRaw = req.query?.status != null ? String(req.query.status).trim() : '';
    if (statusRaw) {
      const allowed = new Set(['all', 'pending', 'under_review', 'approved', 'rejected', 'disbursed']);
      if (!allowed.has(statusRaw)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status filter',
          details: { allowed: Array.from(allowed) }
        });
      }
    }

    const rows = await buildLayyahExportRows(req.query);

    await ActivityLog.logActivity(
      { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || req.user?.name || null },
      'layyah_applications_export',
      'layyah_application',
      null,
      `Exported layyah applications as ${format}`,
      { format, filters: req.query || {} },
      req
    );

    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const statusPart = statusRaw && statusRaw !== 'all' ? statusRaw : 'all';
    const safeStatus = statusPart.replace(/[^a-z0-9_]+/gi, '').toLowerCase() || 'all';
    const baseFilename = `layyah_applications_${safeStatus}_${dateStamp}`;

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          'Full Name': r.full_name,
          'PSN': r.psn,
          'Animal Type': r.animal_type,
          'Requested Amount Min': r.requested_amount_min,
          'Requested Amount Max': r.requested_amount_max,
          'Price Range': r.price_range,
          'Submission Date': r.submission_date ? new Date(r.submission_date).toISOString() : null,
          'Status': r.status
        })),
        { skipHeader: false }
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Layyah Applications');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${baseFilename}.xlsx`);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      if (!PDFDocument) {
        return res.status(400).json({ success: false, message: 'PDF export is not available on this server.' });
      }

      const pdfBuffer = await new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ size: 'A4', margin: 36 });
          const chunks = [];
          doc.on('data', (d) => chunks.push(d));
          doc.on('end', () => resolve(Buffer.concat(chunks)));
          doc.on('error', reject);

          doc.fontSize(16).text('Layyah Applications Export', { align: 'left' });
          doc.moveDown(0.5);
          doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
          doc.moveDown(1);

          const header = ['Full Name', 'PSN', 'Animal', 'Price Range', 'Min', 'Max', 'Submitted', 'Status'];
          doc.fontSize(10).text(header.join(' | '));
          doc.moveDown(0.3);
          doc.text('-'.repeat(110));
          doc.moveDown(0.5);

          doc.fontSize(9);
          for (const r of rows) {
            const submitted = r.submission_date ? new Date(r.submission_date).toISOString().slice(0, 10) : '';
            doc.text(
              [
                r.full_name || '',
                r.psn || '',
                r.animal_type || '',
                r.price_range || '',
                r.requested_amount_min != null ? String(r.requested_amount_min) : '',
                r.requested_amount_max != null ? String(r.requested_amount_max) : '',
                submitted,
                r.status || ''
              ].join(' | ')
            );
          }
          doc.end();
        } catch (e) {
          reject(e);
        }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${baseFilename}.pdf`);
      return res.send(pdfBuffer);
    }

    const header = [
      'Full Name',
      'PSN',
      'Animal Type',
      'Requested Amount Min',
      'Requested Amount Max',
      'Price Range',
      'Submission Date',
      'Status'
    ];
    const lines = [header.map(buildCsvCell).join(',')];
    for (const r of rows) {
      lines.push(
        [
          buildCsvCell(r.full_name),
          buildCsvCell(r.psn),
          buildCsvCell(r.animal_type),
          buildCsvCell(r.requested_amount_min),
          buildCsvCell(r.requested_amount_max),
          buildCsvCell(r.price_range),
          buildCsvCell(r.submission_date ? new Date(r.submission_date).toISOString() : ''),
          buildCsvCell(r.status)
        ].join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${baseFilename}.csv`);
    return res.send(lines.join('\n'));
  } catch (error) {
    console.error('Export layyah applications error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const logAdminClientError = async (req, res) => {
  try {
    const { member_id, application_id, old_amount, new_amount, admin_id, timestamp, error } = req.body || {};
    await ActivityLog.logActivity(
      {
        id: req.user?.id,
        role: req.user?.role,
        name: req.user?.membershipApplication?.name || req.user?.name || null
      },
      'layyah_admin_client_error',
      'layyah_application',
      application_id || null,
      'Client-side error reported by admin UI',
      {
        member_id: member_id || null,
        application_id: application_id || null,
        old_amount: old_amount ?? null,
        new_amount: new_amount ?? null,
        admin_id: admin_id || req.user?.id || null,
        timestamp: timestamp || new Date().toISOString(),
        error: error || null
      },
      req
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Log layyah admin client error:', err);
    res.status(500).json({ success: false, message: 'Failed to log error' });
  }
};

const parseIfMatchVersion = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const match = raw.match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
};

const updateLayyahAppliedAmount = async (req, res) => {
  try {
    const memberId = Number(req.params.memberId);
    if (!Number.isFinite(memberId)) {
      return res.status(400).json({ success: false, message: 'Invalid memberId' });
    }

    const hasAuthorizationHeader = !!req.headers['authorization'];
    if (!hasAuthorizationHeader) {
      const csrfHeader = String(req.headers['x-csrf-token'] || req.headers['x-xsrf-token'] || '');
      const csrfCookie = String(req.cookies?.csrf_token || '');
      if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
        return res.status(403).json({ success: false, message: 'CSRF validation failed' });
      }
    }

    const applicationId = req.body?.application_id != null ? Number(req.body.application_id) : null;
    const rawAmount = req.body?.applied_amount;
    const amount = typeof rawAmount === 'string' || typeof rawAmount === 'number' ? Number(rawAmount) : NaN;

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid applied amount' });
    }

    const rounded = Math.round(amount * 100) / 100;
    const ifMatch = parseIfMatchVersion(req.headers['if-match']);

    const result = await sequelize.transaction(async (transaction) => {
      const where = {
        user_id: memberId,
        group_id: null
      };
      if (applicationId) {
        where.id = applicationId;
      }

      const application = await LayyahApplication.findOne({
        where,
        order: [['created_at', 'DESC'], ['id', 'DESC']],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!application) {
        return { error: { status: 404, message: 'Application not found' } };
      }

      const currentVersion = application.amount_version || 1;
      if (ifMatch != null && ifMatch !== currentVersion) {
        return {
          error: {
            status: 412,
            message: 'Amount was modified by another user',
            current: {
              applied_amount: application.applied_amount != null ? application.applied_amount : application.price_max,
              amount_version: currentVersion
            }
          }
        };
      }

      const oldAmount = application.applied_amount != null ? Number(application.applied_amount) : Number(application.price_max);
      const nextVersion = currentVersion + 1;

      await application.update(
        {
          applied_amount: rounded,
          amount_version: nextVersion
        },
        { transaction }
      );

      await ActivityLog.logActivity(
        {
          id: req.user?.id,
          role: req.user?.role,
          name: req.user?.membershipApplication?.name || req.user?.name || null
        },
        'layyah_amount_updated',
        'layyah_application',
        application.id,
        'Layyah applied amount updated',
        {
          member_id: memberId,
          application_id: application.id,
          old_amount: oldAmount,
          new_amount: rounded,
          from_version: currentVersion,
          to_version: nextVersion
        },
        req
      );

      return {
        updated: {
          member_id: memberId,
          application_id: application.id,
          applied_amount: rounded,
          amount_version: nextVersion,
          old_amount: oldAmount
        }
      };
    });

    if (result?.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
        current: result.error.current
      });
    }

    res.setHeader('ETag', `W/"${result.updated.amount_version}"`);
    sendSseEvent('amount_updated', {
      member_id: result.updated.member_id,
      application_id: result.updated.application_id,
      applied_amount: result.updated.applied_amount,
      amount_version: result.updated.amount_version,
      updated_by: req.user?.id || null
    });

    res.json({
      success: true,
      item: result.updated
    });
  } catch (error) {
    console.error('Update layyah applied amount error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getLayyahLoanTenureMonths = () => {
  const raw = process.env.LAYYAH_LOAN_TENURE_MONTHS;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return 12;
};

const buildLayyahLoanPurpose = (applicationId) => {
  return `Layyah disbursement for application #${applicationId}`;
};

const findExistingLayyahDisbursementLoan = async ({ applicationId, transaction }) => {
  const purpose = buildLayyahLoanPurpose(applicationId);
  try {
    return await Loan.findOne({
      where: { purpose },
      transaction
    });
  } catch {
    return null;
  }
};

const disburseLayyahApplicationToLoan = async ({ application, adminUser, req, transaction }) => {
  const existing = await findExistingLayyahDisbursementLoan({ applicationId: application.id, transaction });
  if (existing) return existing;

  const principalRaw =
    application.applied_amount != null
      ? Number(application.applied_amount)
      : application.price_max != null
        ? Number(application.price_max)
        : NaN;

  const principal = Math.round(principalRaw * 100) / 100;
  if (!Number.isFinite(principal) || principal <= 0) {
    const err = new Error('Invalid disbursement amount');
    err.statusCode = 400;
    throw err;
  }

  const tenure = getLayyahLoanTenureMonths();
  const profitMargin = Math.round(principal * 0.1 * 100) / 100;
  const totalRepayment = Math.round((principal + profitMargin) * 100) / 100;
  const monthlyRepayment = Math.round((totalRepayment / tenure) * 100) / 100;

  const firstRepaymentDate = new Date();
  firstRepaymentDate.setMonth(firstRepaymentDate.getMonth() + 1);

  const loan = await Loan.create(
    {
      user_id: application.user_id,
      loan_type: 'investment',
      amount_requested: principal,
      amount_approved: principal,
      repayment_period_months: tenure,
      monthly_repayment: monthlyRepayment,
      total_repayment: totalRepayment,
      status: 'disbursed',
      approval_date: new Date(),
      disbursement_date: new Date(),
      first_repayment_date: firstRepaymentDate,
      approved_by: adminUser?.id || null,
      disbursed_by: adminUser?.id || null,
      purpose: buildLayyahLoanPurpose(application.id),
      notes: JSON.stringify({
        source: 'layyah',
        layyah_application_id: application.id,
        profit_margin_rate: 0.1,
        profit_margin_amount: profitMargin
      })
    },
    { transaction }
  );

  await ActivityLog.logActivity(
    {
      id: adminUser?.id,
      role: adminUser?.role,
      name: adminUser?.membershipApplication?.name || adminUser?.name || null
    },
    'layyah_disbursed_to_loan',
    'loan',
    loan.id,
    'Layyah application disbursed into an investment loan',
    {
      layyah_application_id: application.id,
      member_id: application.user_id,
      principal,
      profit_margin_amount: profitMargin,
      total_repayment: totalRepayment,
      tenure_months: tenure
    },
    req
  );

  try {
    await Notification.create(
      {
        user_id: application.user_id,
        type: 'layyah_disbursed',
        title: 'Layyah Application Disbursed',
        message: `Your Layyah application has been disbursed as an investment loan.`,
        data: { loan_id: loan.id, layyah_application_id: application.id, total_repayment: totalRepayment }
      },
      { transaction }
    );
  } catch {}

  return loan;
};

const getLayyahStats = async (req, res) => {
  try {
    const dialect = sequelize.getDialect();
    const disbursedWhere =
      dialect === 'postgres'
        ? sequelize.where(sequelize.cast(sequelize.col('status'), 'text'), 'disbursed')
        : { status: 'disbursed' };

    const [totalApplications, pendingApplications, underReviewApplications, groupApplications, approvedApplications, rejectedApplications, disbursedApplications, activeGroupsResult, individualApplications] = await Promise.all([
      LayyahApplication.count(),
      LayyahApplication.count({ where: { status: 'pending' } }),
      LayyahApplication.count({ where: { status: 'under_review' } }),
      LayyahApplication.count({ where: { kind: 'group' } }),
      LayyahApplication.count({ where: { status: 'approved' } }),
      LayyahApplication.count({ where: { status: 'rejected' } }),
      LayyahApplication.count({ where: disbursedWhere }),
      LayyahApplication.count({
        where: {
          kind: 'group',
          status: 'approved',
          group_member_count: { [require('sequelize').Op.lt]: 5 }
        }
      }),
      LayyahApplication.count({ where: { kind: 'individual', group_id: null } })
    ]);

    // Calculate financial projections
    const pendingAndApproved = await LayyahApplication.findAll({
      where: {
        status: { [require('sequelize').Op.in]: ['pending', 'under_review', 'approved'] }
      },
      attributes: ['applied_amount', 'price_max', 'kind', 'status', 'quantity']
    });

    let projectedExpenditure = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;
    let individualAmount = 0;
    let groupAmount = 0;

    pendingAndApproved.forEach(app => {
      const amount = Number(app.applied_amount || app.price_max || 0);
      projectedExpenditure += amount;

      if (app.status === 'approved') approvedAmount += amount;
      else pendingAmount += amount;

      if (app.kind === 'group') groupAmount += amount;
      else individualAmount += amount;
    });

    const stats = {
      total_applications: totalApplications,
      pending_applications: pendingApplications,
      under_review_applications: underReviewApplications,
      group_applications: groupApplications,
      individual_applications: individualApplications,
      approved_applications: approvedApplications,
      rejected_applications: rejectedApplications,
      disbursed_applications: disbursedApplications,
      total_commodities: pendingAndApproved.filter(a => a.status === 'approved').reduce((s, a) => s + (a.quantity || 0), 0),
      active_groups: activeGroupsResult,
      financials: {
        projected_total: projectedExpenditure,
        pending_total: pendingAmount,
        approved_total: approvedAmount,
        individual_total: individualAmount,
        group_total: groupAmount
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get layyah stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getLayyahApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const [applications, total] = await Promise.all([
      LayyahApplication.findAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id'],
          include: [{
            model: require('../models').MembershipApplication,
            as: 'membershipApplication',
            attributes: ['name', 'psn']
          }]
        }, {
          model: User,
          as: 'groupLeader',
          attributes: ['id'],
          required: false,
          include: [{
            model: require('../models').MembershipApplication,
            as: 'membershipApplication',
            attributes: ['name'],
            required: false
          }]
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      }),
      LayyahApplication.count({ where: whereClause })
    ]);

    const applicationsData = applications.map(app => ({
      id: app.id,
      kind: app.kind,
      animal_category: app.animal_category,
      animal_type: getAnimalType(app.animal_category),
      quantity: app.quantity,
      price_min: app.price_min,
      price_max: app.price_max,
      applied_amount: app.applied_amount != null ? app.applied_amount : app.price_max,
      amount_version: app.amount_version || 1,
      price_range: formatPriceRange({
        priceMin: app.price_min,
        priceMax: app.price_max,
        appliedAmount: app.applied_amount != null ? app.applied_amount : app.price_max
      }),
      purpose: app.purpose,
      status: app.status,
      applicant_name: app.applicant_name || app.user?.membershipApplication?.name,
      user_psn: app.user?.membershipApplication?.psn,
      group_leader_name: app.groupLeader?.membershipApplication?.name || null,
      rejection_reason: app.rejection_reason,
      notes: app.notes,
      created_at: app.created_at,
      updated_at: app.updated_at
    }));

    res.json({
      success: true,
      applications: applicationsData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get layyah applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const createLayyahApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      kind = 'individual',
      animal_category,
      quantity = 1,
      price_min,
      price_max,
      purpose
    } = req.body;

    // Check if seasonal program is enabled
    const seasonalStatus = await Settings.findOne({ where: { key: 'layyah_seasonal_program_enabled' } });
    const isEnabled = seasonalStatus ? seasonalStatus.value === true || seasonalStatus.value === 'true' : false;

    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        message: 'The Layyah seasonal program is currently closed. Applications are not being accepted at this time.'
      });
    }

    // Validate required fields
    if (!animal_category || !price_min || !price_max) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing: animal_category, price_min, price_max'
      });
    }

    if (price_min >= price_max) {
      return res.status(400).json({
        success: false,
        message: 'Price minimum must be less than maximum'
      });
    }

    const user = await User.findByPk(userId, {
      include: [{
        model: require('../models').MembershipApplication,
        as: 'membershipApplication',
        attributes: ['name', 'psn']
      }]
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000);
    const dialect = LayyahApplication.sequelize.getDialect();

    const application = await LayyahApplication.sequelize.transaction(async (transaction) => {
      const existingForUser = await LayyahApplication.findOne({
        where: {
          user_id: userId,
          group_id: null,
          status: { [Op.in]: DUPLICATE_ACTIVE_STATUSES }
        },
        order: [['created_at', 'DESC'], ['id', 'DESC']],
        transaction,
        ...(dialect === 'postgres' ? { lock: transaction.LOCK.UPDATE } : {})
      });

      if (existingForUser) {
        await ActivityLog.logActivity(
          { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null },
          'layyah_application_duplicate_blocked',
          'layyah_application',
          existingForUser.id,
          'Duplicate layyah application blocked (member already has an application)',
          {
            existing_application_id: existingForUser.id,
            existing_status: existingForUser.status
          },
          req
        );

        const err = new Error('Duplicate application detected');
        err.statusCode = 409;
        err.details = {
          existing_application_id: existingForUser.id,
          existing_status: existingForUser.status
        };
        throw err;
      }

      const existing = await LayyahApplication.findOne({
        where: {
          user_id: userId,
          kind,
          animal_category,
          group_id: null,
          status: { [Op.in]: DUPLICATE_ACTIVE_STATUSES },
          created_at: { [Op.gte]: windowStart }
        },
        order: [['created_at', 'DESC']],
        transaction,
        ...(dialect === 'postgres' ? { lock: transaction.LOCK.UPDATE } : {})
      });

      if (existing) {
        await ActivityLog.logActivity(
          { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null },
          'layyah_application_duplicate_blocked',
          'layyah_application',
          existing.id,
          `Duplicate layyah application blocked (kind=${kind}, animal=${animal_category})`,
          {
            kind,
            animal_category,
            window_hours: DUPLICATE_WINDOW_HOURS,
            existing_application_id: existing.id,
            existing_created_at: existing.created_at,
            existing_status: existing.status
          },
          req
        );

        const err = new Error('Duplicate application detected');
        err.statusCode = 409;
        err.details = {
          existing_application_id: existing.id,
          existing_status: existing.status,
          existing_created_at: existing.created_at,
          window_hours: DUPLICATE_WINDOW_HOURS
        };
        throw err;
      }

      const applicationData = {
        user_id: userId,
        kind,
        animal_category,
        quantity: parseInt(quantity),
        price_min: parseFloat(price_min),
        price_max: parseFloat(price_max),
        applied_amount: parseFloat(price_max),
        amount_version: 1,
        purpose,
        applicant_name: user.membershipApplication?.name || 'Unknown',
        user_psn: user.membershipApplication?.psn || null,
        status: 'pending'
      };

      if (kind === 'group') {
        applicationData.group_leader_id = userId;
      }

      return LayyahApplication.create(applicationData, { transaction });
    });

    res.status(201).json({
      success: true,
      message: 'Layyah application submitted successfully',
      application: {
        id: application.id,
        kind: application.kind,
        animal_category: application.animal_category,
        quantity: application.quantity,
        price_min: application.price_min,
        price_max: application.price_max,
        applied_amount: application.applied_amount != null ? application.applied_amount : application.price_max,
        amount_version: application.amount_version || 1,
        purpose: application.purpose,
        status: application.status,
        applicant_name: application.applicant_name,
        created_at: application.created_at
      }
    });

  } catch (error) {
    if (error?.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate application detected. You already have a Layyah application.',
        details: error.details
      });
    }
    console.error('Create layyah application error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await LayyahApplication.findAll({
      where: { user_id: userId },
      include: [{
        model: User,
        as: 'groupLeader',
        attributes: ['id'],
        required: false,
        include: [{
          model: require('../models').MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name'],
          required: false
        }]
      }],
      order: [['created_at', 'DESC']]
    });

    const applicationsData = applications.map(app => ({
      id: app.id,
      kind: app.kind,
      animal_category: app.animal_category,
      animal_type: getAnimalType(app.animal_category),
      quantity: app.quantity,
      price_min: app.price_min,
      price_max: app.price_max,
      applied_amount: app.applied_amount != null ? app.applied_amount : app.price_max,
      amount_version: app.amount_version || 1,
      price_range: formatPriceRange({
        priceMin: app.price_min,
        priceMax: app.price_max,
        appliedAmount: app.applied_amount != null ? app.applied_amount : app.price_max
      }),
      purpose: app.purpose,
      status: app.status,
      applicant_name: app.applicant_name,
      group_leader_name: app.groupLeader?.membershipApplication?.name || null,
      rejection_reason: app.rejection_reason,
      notes: app.notes,
      created_at: app.created_at,
      updated_at: app.updated_at
    }));

    res.json({
      success: true,
      applications: applicationsData
    });

  } catch (error) {
    console.error('Get my layyah applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateLayyahApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason, notes } = req.body;

    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update layyah applications'
      });
    }

    const allowedStatuses = ['pending', 'under_review', 'approved', 'rejected', 'disbursed'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
        details: { allowed: allowedStatuses }
      });
    }

    // Get admin's name
    const adminUser = await User.findByPk(req.user.id, {
      include: [{
        model: require('../models').MembershipApplication,
        as: 'membershipApplication',
        attributes: ['name']
      }]
    });

    const decisionMaker = adminUser.membershipApplication?.name || 'Admin';

    const result = await sequelize.transaction(async (transaction) => {
      const locked = await LayyahApplication.findByPk(parseInt(id), { transaction, lock: transaction.LOCK.UPDATE });
      if (!locked) {
        return { error: { status: 404, message: 'Application not found' } };
      }

      const previousStatus = locked.status;
      const targetStatus = status || previousStatus;
      const disburseRoles = new Set(['super_admin', 'treasurer']);

      if (previousStatus === 'rejected' || previousStatus === 'disbursed') {
        if (targetStatus !== previousStatus) {
          return { error: { status: 400, message: 'Finalized applications cannot be changed' } };
        }
      }

      if (targetStatus === 'under_review' && previousStatus !== 'pending' && previousStatus !== 'under_review') {
        return { error: { status: 400, message: 'Invalid status transition', details: { from: previousStatus, to: targetStatus } } };
      }

      if ((targetStatus === 'approved' || targetStatus === 'rejected') && !['pending', 'under_review', 'approved'].includes(previousStatus)) {
        return { error: { status: 400, message: 'Invalid status transition', details: { from: previousStatus, to: targetStatus } } };
      }

      if (targetStatus === 'disbursed') {
        if (!disburseRoles.has(String(req.user?.role || '').toLowerCase())) {
          return { error: { status: 403, message: 'Only treasurer or super_admin can disburse Layyah applications' } };
        }
        if (previousStatus !== 'approved') {
          return { error: { status: 400, message: 'Only approved applications can be disbursed' } };
        }
        if (locked.kind !== 'individual' || locked.group_id) {
          return { error: { status: 400, message: 'Only individual (non-group) applications can be disbursed' } };
        }
      }

      const updateData = {
        status: targetStatus,
        updated_at: new Date()
      };

      if (targetStatus === 'rejected') {
        updateData.rejection_reason = rejection_reason || locked.rejection_reason || null;
      }

      if (targetStatus === 'under_review') {
        updateData.rejection_reason = null;
      }

      if (targetStatus === 'approved') {
        updateData.approved_by = decisionMaker;
        updateData.approved_at = new Date();
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      await locked.update(updateData, { transaction });

      let loan = null;
      let finalStatus = locked.status;

      if (targetStatus === 'disbursed') {
        loan =
          (await findExistingLayyahDisbursementLoan({ applicationId: locked.id, transaction })) ||
          (await disburseLayyahApplicationToLoan({ application: locked, adminUser, req, transaction }));
        if (!loan?.id) {
          return { error: { status: 500, message: 'Failed to create disbursement record' } };
        }
        await locked.update({ status: 'disbursed', updated_at: new Date() }, { transaction });
        finalStatus = 'disbursed';
      }

      await ActivityLog.logActivity(
        { id: req.user.id, role: req.user.role, name: decisionMaker },
        'layyah_application_status_changed',
        'layyah_application',
        locked.id,
        `Layyah application status changed from ${previousStatus} to ${finalStatus}`,
        { from: previousStatus, to: finalStatus, requested: targetStatus, rejection_reason: targetStatus === 'rejected' ? (rejection_reason || null) : null, loan_id: loan?.id || null },
        req
      );

      return { id: locked.id, previousStatus, status: finalStatus, loan_id: loan?.id || null, targetStatus };
    });

    if (result?.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message, details: result.error.details });
    }

    const application = await LayyahApplication.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: require('../models').MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn']
        }]
      }]
    });

    try {
      const applicantUserId = application.user_id;

      if (application.status === 'under_review') {
        await Notification.create({
          user_id: applicantUserId,
          type: 'layyah_application_under_review',
          title: 'Layyah Application Under Review',
          message: `Your Layyah application is now under review by ${decisionMaker}.`,
          data: { application_id: application.id, status: application.status }
        });
      }

      if (application.status === 'approved') {
        await Notification.create({
          user_id: applicantUserId,
          type: 'layyah_application_approved',
          title: 'Layyah Application Approved',
          message: `Your Layyah application has been approved by ${decisionMaker}.`,
          data: { application_id: application.id, status: application.status }
        });
      }

      if (application.status === 'rejected') {
        await Notification.create({
          user_id: applicantUserId,
          type: 'layyah_application_rejected',
          title: 'Layyah Application Rejected',
          message: `Your Layyah application has been rejected by ${decisionMaker}.${rejection_reason ? ` Reason: ${rejection_reason}` : ''}`,
          data: { application_id: application.id, status: application.status }
        });
      }

      // Disbursement notification is handled by disburseLayyahApplicationToLoan
    } catch (notificationError) {
      console.log('Layyah application status notification failed:', notificationError);
    }

    sendSseEvent('status_updated', {
      application_id: application.id,
      member_id: application.user_id,
      previous_status: result.previousStatus,
      status: application.status,
      updated_by: req.user?.id || null,
      loan_id: result.loan_id || null
    });

    return res.json({
      success: true,
      message: 'Layyah application updated successfully',
      application: {
        id: application.id,
        kind: application.kind,
        animal_category: application.animal_category,
        quantity: application.quantity,
        price_min: application.price_min,
        price_max: application.price_max,
        applied_amount: application.applied_amount != null ? application.applied_amount : application.price_max,
        purpose: application.purpose,
        status: application.status,
        applicant_name: application.applicant_name,
        user_psn: application.user?.membershipApplication?.psn,
        rejection_reason: application.rejection_reason,
        notes: application.notes,
        approved_by: application.approved_by,
        approved_at: application.approved_at,
        created_at: application.created_at,
        updated_at: application.updated_at
      },
      loan: result.loan_id ? { id: result.loan_id } : null
    });

  } catch (error) {
    console.error('Update layyah application error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const reverseLayyahApplicationStatus = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const reversalRoles = new Set(['admin', 'super_admin', 'treasurer', 'chairman']);
    if (!reversalRoles.has(role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient privileges.' });
    }

    const { id } = req.params;
    const toStatus = String(req.body?.to_status || '').trim();
    const reason = sanitizeText(req.body?.reason || '');

    if (!toStatus) {
      return res.status(400).json({ success: false, message: 'Target status (to_status) is required' });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Reversal reason is required' });
    }

    const allowedTargets = new Set(['approved', 'under_review', 'pending']);
    if (!allowedTargets.has(toStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target status for reversal',
        details: { allowed: Array.from(allowedTargets) }
      });
    }

    const adminUser = await User.findByPk(req.user.id, {
      include: [{
        model: require('../models').MembershipApplication,
        as: 'membershipApplication',
        attributes: ['name']
      }]
    });

    const decisionMaker = adminUser?.membershipApplication?.name || req.user?.membershipApplication?.name || req.user?.name || 'Admin';

    const result = await sequelize.transaction(async (transaction) => {
      const locked = await LayyahApplication.findByPk(Number(id), { transaction, lock: transaction.LOCK.UPDATE });
      if (!locked) {
        return { error: { status: 404, message: 'Application not found' } };
      }

      const fromStatus = locked.status;

      const canReverseDisbursed = fromStatus === 'disbursed' && toStatus === 'approved';
      const canReverseApproved = fromStatus === 'approved' && (toStatus === 'under_review' || toStatus === 'pending');

      if (!canReverseDisbursed && !canReverseApproved) {
        return {
          error: {
            status: 400,
            message: 'Invalid reversal transition',
            details: { from: fromStatus, to: toStatus }
          }
        };
      }

      let affectedLoanId = null;

      if (fromStatus === 'disbursed') {
        if (locked.kind !== 'individual' || locked.group_id) {
          return { error: { status: 400, message: 'Only individual (non-group) applications can be reversed from disbursed' } };
        }

        const loan = await findExistingLayyahDisbursementLoan({ applicationId: locked.id, transaction });
        if (loan?.id) {
          const [repaymentCount, liquidationCount] = await Promise.all([
            LoanRepayment.count({ where: { loan_id: loan.id }, transaction }),
            LoanLiquidation.count({ where: { loan_id: loan.id }, transaction })
          ]);

          if ((repaymentCount || 0) > 0 || (liquidationCount || 0) > 0) {
            return {
              error: {
                status: 400,
                message: 'Cannot reverse a disbursed application with repayment activity',
                details: { loan_id: loan.id, repayment_count: repaymentCount || 0, liquidation_count: liquidationCount || 0 }
              }
            };
          }

          const oldPurpose = loan.purpose || buildLayyahLoanPurpose(locked.id);
          const reversedPurpose = `REVERSED: ${oldPurpose}`;
          const mergedNotes = [loan.notes, `Reversed via Layyah approval reversal. Reason: ${reason}`].filter(Boolean).join('\n');

          await loan.update(
            { status: 'rejected', purpose: reversedPurpose, notes: mergedNotes, updated_at: new Date() },
            { transaction }
          );

          affectedLoanId = loan.id;
        }

        await locked.update(
          {
            status: 'approved',
            updated_at: new Date(),
            rejection_reason: null,
            approved_at: locked.approved_at || locked.updated_at || new Date(),
            approved_by: locked.approved_by || null
          },
          { transaction }
        );
      } else if (fromStatus === 'approved') {
        const updateData = {
          status: toStatus,
          updated_at: new Date(),
          rejection_reason: null,
          approved_by: null,
          approved_at: null
        };

        await locked.update(updateData, { transaction });
      }

      await ActivityLog.logActivity(
        { id: req.user.id, role: req.user.role, name: decisionMaker },
        'layyah_application_status_reversed',
        'layyah_application',
        locked.id,
        `Layyah application status reversed from ${fromStatus} to ${toStatus}`,
        { from: fromStatus, to: toStatus, reason, loan_id: affectedLoanId },
        req
      );

      return { application_id: locked.id, member_id: locked.user_id, fromStatus, toStatus, loan_id: affectedLoanId };
    });

    if (result?.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message, details: result.error.details });
    }

    const application = await LayyahApplication.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: require('../models').MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn']
        }]
      }]
    });

    try {
      if (application?.user_id && application.status === 'under_review') {
        await Notification.create({
          user_id: application.user_id,
          type: 'layyah_application_under_review',
          title: 'Layyah Application Under Review',
          message: `Your Layyah application is now under review by ${decisionMaker}.`,
          data: { application_id: application.id, status: application.status }
        });
      }

      if (application?.user_id && application.status === 'approved') {
        await Notification.create({
          user_id: application.user_id,
          type: 'layyah_application_approved',
          title: 'Layyah Application Approved',
          message: `Your Layyah application has been approved by ${decisionMaker}.`,
          data: { application_id: application.id, status: application.status }
        });
      }
    } catch {}

    sendSseEvent('status_updated', {
      application_id: application.id,
      member_id: application.user_id,
      previous_status: result.fromStatus,
      status: application.status,
      updated_by: req.user?.id || null,
      loan_id: result.loan_id || null
    });

    return res.json({
      success: true,
      message: 'Layyah application reversal processed successfully',
      application: {
        id: application.id,
        kind: application.kind,
        animal_category: application.animal_category,
        quantity: application.quantity,
        price_min: application.price_min,
        price_max: application.price_max,
        applied_amount: application.applied_amount != null ? application.applied_amount : application.price_max,
        purpose: application.purpose,
        status: application.status,
        applicant_name: application.applicant_name,
        user_psn: application.user?.membershipApplication?.psn,
        rejection_reason: application.rejection_reason,
        notes: application.notes,
        approved_by: application.approved_by,
        approved_at: application.approved_at,
        created_at: application.created_at,
        updated_at: application.updated_at
      },
      affected_loan_id: result.loan_id || null
    });
  } catch (error) {
    console.error('Reverse layyah application status error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const repairInvalidDisbursedApplications = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'super_admin' && role !== 'treasurer') {
      return res.status(403).json({ success: false, message: 'Only treasurer or super_admin can run this repair' });
    }

    const fixed = [];
    await sequelize.transaction(async (transaction) => {
      const candidates = await LayyahApplication.findAll({
        where: { status: 'disbursed', kind: 'individual', group_id: null },
        attributes: ['id', 'user_id', 'approved_by', 'approved_at', 'updated_at'],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      for (const app of candidates) {
        const loan = await findExistingLayyahDisbursementLoan({ applicationId: app.id, transaction });
        if (loan) continue;

        await app.update(
          {
            status: 'approved',
            approved_at: app.approved_at || app.updated_at || new Date(),
            approved_by: app.approved_by || null,
            updated_at: new Date()
          },
          { transaction }
        );

        fixed.push({ application_id: app.id, member_id: app.user_id });

        await ActivityLog.logActivity(
          { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || req.user?.name || null },
          'layyah_disbursed_repaired',
          'layyah_application',
          app.id,
          'Reverted invalid disbursed status (no disbursement record found)',
          { application_id: app.id, member_id: app.user_id },
          req
        );
      }
    });

    for (const row of fixed) {
      sendSseEvent('status_updated', {
        application_id: row.application_id,
        member_id: row.member_id,
        previous_status: 'disbursed',
        status: 'approved',
        updated_by: req.user?.id || null,
        loan_id: null
      });
    }

    return res.json({ success: true, fixed_count: fixed.length, fixed });
  } catch (error) {
    console.error('Repair invalid disbursed applications error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const revertAllDisbursedApplications = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'super_admin' && role !== 'treasurer') {
      return res.status(403).json({ success: false, message: 'Only treasurer or super_admin can run this action' });
    }

    const fixed = [];
    const relatedLoans = [];
    await sequelize.transaction(async (transaction) => {
      const candidates = await LayyahApplication.findAll({
        where: { status: 'disbursed' },
        attributes: ['id', 'user_id', 'approved_by', 'approved_at', 'updated_at', 'kind', 'group_id'],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      for (const app of candidates) {
        const loan = await findExistingLayyahDisbursementLoan({ applicationId: app.id, transaction });
        if (loan?.id) {
          relatedLoans.push({ application_id: app.id, loan_id: loan.id });
        }

        await app.update(
          {
            status: 'approved',
            approved_at: app.approved_at || app.updated_at || new Date(),
            approved_by: app.approved_by || null,
            updated_at: new Date()
          },
          { transaction }
        );

        fixed.push({ application_id: app.id, member_id: app.user_id, kind: app.kind, group_id: app.group_id || null });

        await ActivityLog.logActivity(
          { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || req.user?.name || null },
          'layyah_disbursed_mass_reverted',
          'layyah_application',
          app.id,
          'Reverted disbursed status to approved (mass correction)',
          { application_id: app.id, member_id: app.user_id, kind: app.kind, group_id: app.group_id || null, had_loan: !!loan?.id },
          req
        );
      }
    });

    for (const row of fixed) {
      sendSseEvent('status_updated', {
        application_id: row.application_id,
        member_id: row.member_id,
        previous_status: 'disbursed',
        status: 'approved',
        updated_by: req.user?.id || null,
        loan_id: null
      });
    }

    return res.json({
      success: true,
      fixed_count: fixed.length,
      fixed,
      related_loans: relatedLoans
    });
  } catch (error) {
    console.error('Revert all disbursed applications error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getLayyahGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      scope = 'available',
      page = 1,
      limit = 12,
      q,
      animal_category,
      availability,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page));
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (parsedPage - 1) * parsedLimit;

    const whereClause = {
      kind: 'group'
    };
    const andClauses = [];

    if (scope !== 'my') {
      whereClause.status = 'approved';
    }

    const groupCountIsNullOr = (clause) => ({
      [Op.or]: [{ group_member_count: clause }, { group_member_count: { [Op.is]: null } }]
    });

    if (scope === 'available') {
      andClauses.push(groupCountIsNullOr({ [Op.lt]: 4 }));
    }

    if (availability === 'open' && whereClause.status === 'approved') {
      andClauses.push(groupCountIsNullOr({ [Op.lt]: 4 }));
    }
    if (availability === 'full' && whereClause.status === 'approved') {
      andClauses.push({ group_member_count: { [Op.gte]: 4 } });
    }

    if (animal_category) {
      const raw = String(animal_category || '').trim().toLowerCase();
      whereClause.animal_category = raw === 'sheep' ? { [Op.in]: ['sheep', 'ram'] } : raw;
    }

    if (q) {
      const isPostgres = LayyahApplication.sequelize?.getDialect?.() === 'postgres';
      const searchOp = isPostgres ? Op.iLike : Op.like;
      andClauses.push({
        [Op.or]: [
        { applicant_name: { [searchOp]: `%${q}%` } },
        { purpose: { [searchOp]: `%${q}%` } },
        { user_psn: { [searchOp]: `%${q}%` } },
        { animal_category: { [searchOp]: `%${q}%` } }
        ]
      });
    }

    if (scope === 'my') {
      const myMembershipRows = await LayyahApplication.findAll({
        where: { user_id: userId, kind: 'individual', group_id: { [Op.ne]: null } },
        attributes: ['group_id']
      });
      const myGroupIds = myMembershipRows.map((r) => r.group_id).filter((v) => v != null);

      andClauses.push({
        [Op.or]: [{ user_id: userId }, ...(myGroupIds.length ? [{ id: { [Op.in]: myGroupIds } }] : [])]
      });
    }
    if (andClauses.length > 0) {
      whereClause[Op.and] = andClauses;
    }

    const sortMap = {
      created_at: ['created_at', 'DESC'],
      price_min: ['price_min', 'DESC'],
      price_max: ['price_max', 'DESC'],
      members: ['group_member_count', 'DESC']
    };

    const sortKey = sortMap[sort] ? sort : 'created_at';
    const sortCol = sortMap[sortKey][0];
    const sortDir = (order || '').toString().toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const { rows, count } = await LayyahApplication.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: require('../models').MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn']
        }]
      }],
      limit: parsedLimit,
      offset,
      order: [[sortCol, sortDir]]
    });

    const groupIds = rows.map(g => g.id);
    if (groupIds.length === 0) {
      return res.json({
        success: true,
        groups: [],
        pagination: {
          total: count,
          page: parsedPage,
          limit: parsedLimit,
          pages: Math.ceil(count / parsedLimit)
        }
      });
    }

    const pendingCounts = await LayyahApplication.findAll({
      where: {
        kind: 'individual',
        status: 'pending',
        group_id: { [Op.in]: groupIds }
      },
      attributes: ['group_id', [LayyahApplication.sequelize.fn('COUNT', LayyahApplication.sequelize.col('id')), 'pending_count']],
      group: ['group_id']
    });

    const pendingCountMap = {};
    for (const row of pendingCounts) {
      pendingCountMap[row.group_id] = parseInt(row.dataValues.pending_count) || 0;
    }

    const myMemberships = await LayyahApplication.findAll({
      where: {
        kind: 'individual',
        group_id: { [Op.in]: groupIds },
        user_id: userId
      },
      attributes: ['id', 'group_id', 'status']
    });

    const membershipMap = {};
    for (const m of myMemberships) {
      membershipMap[m.group_id] = { id: m.id, status: m.status };
    }

    const groupsData = rows.map(group => {
      const groupId = group.id;
      const membership = membershipMap[groupId] || null;
      const userRole = group.user_id === userId ? 'owner' : membership ? 'member' : 'guest';
      const memberCount = (group.group_member_count || 0) + 1;
      const pendingCount = pendingCountMap[groupId] || 0;
      const availableSlots = Math.max(0, 5 - memberCount - pendingCount);

      return {
        id: groupId,
        group_name: `${group.animal_category} Layyah Group`,
        description: group.purpose || '',
        animal_category: group.animal_category,
        price_min: group.price_min,
        price_max: group.price_max,
        created_at: group.created_at,
        group_type: 'public',
        member_count: memberCount,
        pending_count: pendingCount,
        available_slots: availableSlots,
        status: group.status,
        applicant_name: group.applicant_name,
        user_psn: group.user?.membershipApplication?.psn,
        user_role: userRole,
        membership: membership ? { id: membership.id, status: membership.status } : null
      };
    });

    res.json({
      success: true,
      groups: groupsData,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(count / parsedLimit)
      }
    });

  } catch (error) {
    console.error('Get layyah groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const requestToJoinGroup = async (req, res) => {
  try {
    const { id } = req.params; // Group application ID
    const userId = req.user.id;

    // Check if seasonal program is enabled
    const seasonalStatus = await Settings.findOne({ where: { key: 'layyah_seasonal_program_enabled' } });
    const isEnabled = seasonalStatus ? seasonalStatus.value === true || seasonalStatus.value === 'true' : false;

    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        message: 'The Layyah seasonal program is currently closed. Group join requests are not being accepted at this time.'
      });
    }

    const joinResult = await sequelize.transaction(async (transaction) => {
      const groupApplication = await LayyahApplication.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!groupApplication) return { error: { status: 404, message: 'Group not found' } };

      if (groupApplication.kind !== 'group' || groupApplication.status !== 'approved') {
        return { error: { status: 400, message: 'This is not an available group for joining' } };
      }

      const pendingCount = await LayyahApplication.count({
        where: { group_id: id, kind: 'individual', status: 'pending' },
        transaction
      });
      const currentMembers = Number(groupApplication.group_member_count || 0);
      if ((currentMembers + pendingCount) >= 4) {
        return { error: { status: 400, message: 'This group is already full' } };
      }

      const existingMembership = await LayyahApplication.findOne({
        where: { user_id: userId, group_id: id, kind: 'individual' },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (existingMembership) {
        return { error: { status: 400, message: 'You have already requested to join this group' } };
      }

      const created = await LayyahApplication.create(
        {
          user_id: userId,
          kind: 'individual',
          group_id: id,
          group_leader_id: groupApplication.user_id,
          animal_category: groupApplication.animal_category,
          price_min: groupApplication.price_min,
          price_max: groupApplication.price_max,
          quantity: 1,
          purpose: 'Group membership request',
          status: 'pending',
          applicant_name: req.user.membershipApplication?.name || 'Unknown',
          user_psn: req.user.membershipApplication?.psn || null
        },
        { transaction }
      );

      await ActivityLog.logActivity(
        req.user,
        'layyah_group_join_requested',
        'layyah_group',
        Number(id),
        'Requested to join layyah group',
        { group_id: Number(id), member_application_id: created.id },
        req
      );

      return { created, groupApplication };
    });

    if (joinResult?.error) {
      return res.status(joinResult.error.status).json({ success: false, message: joinResult.error.message });
    }

    // Send notification to group leader
    try {
      const { Notification } = require('../models');
      await Notification.create({
        user_id: joinResult.groupApplication.user_id,
        type: 'group_join_request',
        title: 'Group Join Request',
        message: `${req.user.membershipApplication?.name} wants to join your Layyah group for ${joinResult.groupApplication.animal_category}.`,
        data: {
          group_id: id,
          requester_name: req.user.membershipApplication?.name,
          requester_psn: req.user.membershipApplication?.psn,
          animal_category: joinResult.groupApplication.animal_category,
          action_required: 'approve_join_request'
        }
      });
    } catch (notificationError) {
      console.log('Group join notification failed, but request created:', notificationError);
    }

    res.json({
      success: true,
      message: 'Join request sent successfully. The group leader will be notified.',
      group_request: {
        group_id: id,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Request to join group error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await sequelize.transaction(async (transaction) => {
      const groupApplication = await LayyahApplication.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!groupApplication || groupApplication.kind !== 'group') {
        return { error: { status: 404, message: 'Group not found' } };
      }

      if (groupApplication.user_id === userId) {
        return { error: { status: 400, message: 'Group leader cannot leave their own group' } };
      }

      const membership = await LayyahApplication.findOne({
        where: { user_id: userId, group_id: id, kind: 'individual' },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!membership) {
        return { error: { status: 404, message: 'You are not a member of this group' } };
      }

      await membership.destroy({ transaction });

      const approvedCount = await LayyahApplication.count({
        where: { group_id: id, kind: 'individual', status: 'approved' },
        transaction
      });
      await groupApplication.update({ group_member_count: approvedCount }, { transaction });

      await ActivityLog.logActivity(
        req.user,
        'layyah_group_left',
        'layyah_group',
        Number(id),
        'Left layyah group',
        { group_id: Number(id) },
        req
      );

      return { ok: true };
    });

    if (result?.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    res.json({ success: true, message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getLayyahGroupById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const group = await LayyahApplication.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: require('../models').MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn']
        }]
      }]
    });

    if (!group || group.kind !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const pendingCount = await LayyahApplication.count({
      where: { kind: 'individual', status: 'pending', group_id: id }
    });

    const membership = await LayyahApplication.findOne({
      where: { kind: 'individual', group_id: id, user_id: userId },
      attributes: ['id', 'status']
    });

    const userRole = group.user_id === userId ? 'owner' : membership ? 'member' : 'guest';
    const memberCount = (group.group_member_count || 0) + 1;
    const availableSlots = Math.max(0, 5 - memberCount - pendingCount);

    res.json({
      success: true,
      group: {
        id: group.id,
        group_name: `${group.animal_category} Layyah Group`,
        description: group.purpose || '',
        animal_category: group.animal_category,
        price_min: group.price_min,
        price_max: group.price_max,
        created_at: group.created_at,
        group_type: 'public',
        member_count: memberCount,
        pending_count: pendingCount,
        available_slots: availableSlots,
        status: group.status,
        applicant_name: group.applicant_name,
        user_psn: group.user?.membershipApplication?.psn,
        user_role: userRole,
        membership: membership ? { id: membership.id, status: membership.status } : null
      }
    });
  } catch (error) {
    console.error('Get layyah group by id error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // First check if this is a group application
    const groupApplication = await LayyahApplication.findByPk(id);
    if (!groupApplication || groupApplication.kind !== 'group') {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isGroupLeader = groupApplication.user_id === userId;
    const isAdmin = ADMIN_ROLES.includes(req.user.role) || req.user.role === 'chairman';
    const isMember = await LayyahApplication.findOne({
      where: { user_id: userId, group_id: id, kind: 'individual', status: 'approved' },
      attributes: ['id']
    });

    if (!isGroupLeader && !isAdmin && !isMember) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this group' });
    }

    const memberStatuses = (isGroupLeader || isAdmin) ? ['approved', 'pending'] : ['approved'];
    const members = await LayyahApplication.findAll({
      where: {
        group_id: id,
        kind: 'individual',
        status: memberStatuses
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: require('../models').MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn', 'email', 'phone']
        }]
      }],
      order: [['created_at', 'ASC']]
    });

    // Add group leader to the list
    const leaderData = await LayyahApplication.findAll({
      where: {
        id: id
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: require('../models').MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn', 'email', 'phone']
        }]
      }]
    });

    const allMembers = leaderData.concat(members);
    const membersData = allMembers.map(member => ({
      id: member.id,
      user_id: member.user_id,
      applicant_name: member.applicant_name || member.user?.membershipApplication?.name,
      user_psn: member.user?.membershipApplication?.psn,
      user_email: member.user?.membershipApplication?.email,
      user_phone: member.user?.membershipApplication?.phone,
      animal_category: member.animal_category,
      price_min: member.price_min,
      price_max: member.price_max,
      status: member.status,
      group_role: member.group_role,
      created_at: member.created_at,
      updated_at: member.updated_at,
      is_group_leader: member.id === groupApplication.id
    }));

    res.json({
      success: true,
      members: membersData
    });

  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const manageGroupMembership = async (req, res) => {
  try {
    const { id } = req.params; // Member application ID
    const { action, notes } = req.body;

    // Find the member application
    const memberApplication = await LayyahApplication.findByPk(id);
    if (!memberApplication || memberApplication.kind !== 'individual') {
      return res.status(404).json({
        success: false,
        message: 'Member application not found'
      });
    }

    // Check if user is authorized (group leader or admin)
    const isGroupLeader = memberApplication.group_leader_id === req.user.id;
    const isAdmin = ADMIN_ROLES.includes(req.user.role) || req.user.role === 'chairman';

    if (!isGroupLeader && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to manage this group membership'
      });
    }

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be approve or reject'
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const updateResult = await sequelize.transaction(async (transaction) => {
      const lockedMember = await LayyahApplication.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!lockedMember) return { error: { status: 404, message: 'Member application not found' } };
      const previousStatus = lockedMember.status;

      await lockedMember.update(
        {
          status: newStatus,
          rejection_reason: action === 'reject' ? notes : null,
          updated_at: new Date()
        },
        { transaction }
      );

      if (action === 'approve' && lockedMember.group_id) {
        const groupApplication = await LayyahApplication.findByPk(lockedMember.group_id, { transaction, lock: transaction.LOCK.UPDATE });
        if (groupApplication) {
          const approvedCount = await LayyahApplication.count({
            where: { group_id: lockedMember.group_id, kind: 'individual', status: 'approved' },
            transaction
          });
          await groupApplication.update({ group_member_count: approvedCount }, { transaction });
        }
      }

      await ActivityLog.logActivity(
        req.user,
        'layyah_group_membership_status_changed',
        'layyah_group',
        lockedMember.group_id ? Number(lockedMember.group_id) : null,
        `Group membership status changed from ${previousStatus} to ${newStatus}`,
        { member_application_id: lockedMember.id, from: previousStatus, to: newStatus, notes: notes || null },
        req
      );

      return { lockedMember };
    });

    if (updateResult?.error) {
      return res.status(updateResult.error.status).json({ success: false, message: updateResult.error.message });
    }

    // Send notification to the member
    try {
      const notificationMessage = action === 'approve'
        ? `YourLAY request to join the Layyah group has been approved.`
        : `Your request to join the Layyah group has been rejected.${notes ? ` Reason: ${notes}` : ''}`;

      await require('../models').Notification.create({
        user_id: memberApplication.user_id,
        type: action === 'approve' ? 'group_join_approved' : 'group_join_rejected',
        title: `Layyah Group ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: notificationMessage,
        data: {
          group_id: memberApplication.group_id,
          member_id: id,
          action: action,
          notes: notes,
          decision_maker: req.user.id
        }
      });
    } catch (notificationError) {
      console.log('Member notification failed, but membership updated:', notificationError);
    }

    // Fetch updated member data with user info
    const updatedMember = await LayyahApplication.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: require('../models').MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn', 'email']
        }]
      }]
    });

    res.json({
      success: true,
      message: `Member ${action}d successfully`,
      member: {
        id: updatedMember.id,
        applicant_name: updatedMember.applicant_name || updatedMember.user?.membershipApplication?.name,
        user_psn: updatedMember.user?.membershipApplication?.psn,
        status: updatedMember.status,
        rejection_reason: updatedMember.rejection_reason,
        updated_at: updatedMember.updated_at
      }
    });

  } catch (error) {
    console.error('Manage group membership error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const respondToGroupInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const userId = req.user.id;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be accept or decline' });
    }

    const memberApplication = await LayyahApplication.findByPk(id);
    if (!memberApplication || memberApplication.kind !== 'individual' || !memberApplication.group_id) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    if (memberApplication.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to respond to this invitation' });
    }

    if (memberApplication.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This invitation is no longer pending' });
    }

    if (String(memberApplication.purpose || '').toLowerCase().indexOf('invitation') === -1) {
      return res.status(400).json({ success: false, message: 'This pending record is not an invitation' });
    }

    const groupId = memberApplication.group_id;

    const result = await sequelize.transaction(async (transaction) => {
      const locked = await LayyahApplication.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!locked) return { error: { status: 404, message: 'Invitation not found' } };
      if (locked.user_id !== userId) return { error: { status: 403, message: 'You are not authorized to respond to this invitation' } };
      if (locked.status !== 'pending') return { error: { status: 400, message: 'This invitation is no longer pending' } };

      const newStatus = action === 'accept' ? 'approved' : 'rejected';
      await locked.update({ status: newStatus, updated_at: new Date() }, { transaction });

      const groupApplication = await LayyahApplication.findByPk(groupId, { transaction, lock: transaction.LOCK.UPDATE });
      if (groupApplication && action === 'accept') {
        const approvedCount = await LayyahApplication.count({
          where: { group_id: groupId, kind: 'individual', status: 'approved' },
          transaction
        });
        await groupApplication.update({ group_member_count: approvedCount }, { transaction });
      }

      await ActivityLog.logActivity(
        req.user,
        'layyah_group_invitation_responded',
        'layyah_group',
        Number(groupId),
        `Layyah group invitation ${action}ed`,
        { group_id: Number(groupId), member_application_id: locked.id, action, new_status: newStatus },
        req
      );

      try {
        await Notification.create(
          {
            user_id: locked.group_leader_id,
            type: action === 'accept' ? 'layyah_invite_accepted' : 'layyah_invite_declined',
            title: action === 'accept' ? 'Invitation Accepted' : 'Invitation Declined',
            message: `${req.user.membershipApplication?.name || 'A member'} has ${action}ed your Layyah group invitation.`,
            data: { group_id: groupId, member_application_id: locked.id, action }
          },
          { transaction }
        );
      } catch {}

      return { member_application: locked };
    });

    if (result?.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    return res.json({
      success: true,
      message: action === 'accept' ? 'Invitation accepted' : 'Invitation declined',
      member_application: {
        id: result.member_application.id,
        status: result.member_application.status,
        group_id: result.member_application.group_id
      }
    });
  } catch (error) {
    console.error('Respond to group invitation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const addMemberToGroup = async (req, res) => {
  try {
    const { id } = req.params; // Group ID
    const { member_psn } = req.body;

    // Find the group application
    const groupApplication = await LayyahApplication.findByPk(id);
    if (!groupApplication || groupApplication.kind !== 'group') {
      return res.status(404).json({
        success: false,
        message: 'Valid group not found'
      });
    }
    if (groupApplication.status === 'rejected' || groupApplication.status === 'disbursed') {
      return res.status(400).json({
        success: false,
        message: 'This group is not accepting invitations'
      });
    }

    const isLeader = groupApplication.user_id === req.user.id;
    const isAdmin = ADMIN_ROLES.includes(req.user.role) || req.user.role === 'chairman';
    if (!isLeader && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to invite members to this group'
      });
    }

    // Check if group is full
    const pendingCount = await LayyahApplication.count({
      where: { group_id: id, kind: 'individual', status: 'pending' }
    });
    const currentMembers = groupApplication.group_member_count || 0;
    if ((currentMembers + pendingCount) >= 4) {
      return res.status(400).json({
        success: false,
        message: 'Group is already full'
      });
    }

    // Find the member by PSN
    const memberMembershipApp = await require('../models').MembershipApplication.findOne({
      where: { psn: member_psn, status: 'approved' }
    });

    if (!memberMembershipApp) {
      return res.status(404).json({
        success: false,
        message: 'Member with this PSN not found'
      });
    }

    const memberUser = await require('../models').User.findOne({
      where: { membership_application_id: memberMembershipApp.id }
    });

    if (!memberUser) {
      return res.status(404).json({
        success: false,
        message: 'Member user account not found'
      });
    }

    // Check if member is already in this group
    const existingMembership = await LayyahApplication.findOne({
      where: {
        user_id: memberUser.id,
        group_id: id,
        kind: 'individual'
      }
    });

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        message: 'Member is already in this group'
      });
    }

    const invite = await LayyahApplication.create({
      user_id: memberUser.id,
      kind: 'individual',
      group_id: id,
      group_leader_id: groupApplication.user_id,
      animal_category: groupApplication.animal_category,
      price_min: groupApplication.price_min,
      price_max: groupApplication.price_max,
      quantity: 1,
      purpose: 'Group invitation',
      status: 'pending',
      applicant_name: memberMembershipApp.name,
      user_psn: memberMembershipApp.psn
    });

    await ActivityLog.logActivity(
      req.user,
      'layyah_group_invitation_sent',
      'layyah_group',
      Number(id),
      'Layyah group invitation sent',
      { group_id: Number(id), invited_user_id: memberUser.id, invited_psn: memberMembershipApp.psn, member_application_id: invite.id },
      req
    );

    // Send notification to the invited member
    try {
      await require('../models').Notification.create({
        user_id: memberUser.id,
        type: 'layyah_group_invitation',
        title: 'Layyah Group Invitation',
        message: `You have been invited to join a Layyah group for ${groupApplication.animal_category}.`,
        data: {
          group_id: id,
          member_application_id: invite.id,
          invited_by: req.user.id,
          animal_category: groupApplication.animal_category
        }
      });
    } catch (notificationError) {
      console.log('Member notification failed, but invite created:', notificationError);
    }

    res.json({
      success: true,
      message: `Invitation sent to ${memberMembershipApp.name}`,
      member: {
        id: memberUser.id,
        name: memberMembershipApp.name,
        psn: memberMembershipApp.psn,
        email: memberMembershipApp.email
      }
    });

  } catch (error) {
    console.error('Add member to group error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getSeasonalProgramStatus = async (req, res) => {
  try {
    const setting = await Settings.findOne({
      where: { key: 'layyah_seasonal_program_enabled' }
    });
    const rawValue = setting ? setting.value : undefined;
    const enabled = rawValue === undefined ? true : rawValue === true || rawValue === 'true' || rawValue === 1 || rawValue === '1';
    res.json({
      success: true,
      enabled
    });
  } catch (error) {
    console.error('Get seasonal program status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load seasonal program status'
    });
  }
};

const disqualifyGroupMember = async (req, res) => {
  try {
    const { id } = req.params; // Member application ID
    const { reason } = req.body;

    if (!ADMIN_ROLES.includes(req.user.role) && req.user.role !== 'chairman') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to disqualify group members'
      });
    }

    const memberApplication = await LayyahApplication.findByPk(id);
    if (!memberApplication || memberApplication.kind !== 'individual' || !memberApplication.group_id) {
      return res.status(404).json({
        success: false,
        message: 'Member application not found or not part of a group'
      });
    }

    const groupId = memberApplication.group_id;

    await sequelize.transaction(async (transaction) => {
      // Disqualify the member
      await memberApplication.update({
        status: 'rejected',
        rejection_reason: reason || 'Disqualified by administrator',
        notes: `Disqualified from group #${groupId} by admin. Reason: ${reason || 'Not specified'}`,
        group_id: null, // Remove from group
        updated_at: new Date()
      }, { transaction });

      // Update group member count
      const groupApplication = await LayyahApplication.findByPk(groupId, { transaction, lock: transaction.LOCK.UPDATE });
      if (groupApplication) {
        const approvedCount = await LayyahApplication.count({
          where: { group_id: groupId, kind: 'individual', status: 'approved' },
          transaction
        });
        await groupApplication.update({ group_member_count: approvedCount }, { transaction });
      }

      await ActivityLog.logActivity(
        req.user,
        'layyah_member_disqualified',
        'layyah_group',
        Number(groupId),
        `Member ${memberApplication.applicant_name} disqualified from group by admin`,
        {
          member_application_id: memberApplication.id,
          group_id: Number(groupId),
          reason: reason || 'Not specified',
          admin_id: req.user.id
        },
        req
      );
    });

    // Notify member
    try {
      await require('../models').Notification.create({
        user_id: memberApplication.user_id,
        type: 'layyah_disqualified',
        title: 'Disqualified from Layyah Group',
        message: `You have been disqualified from your Layyah group by an administrator. Reason: ${reason || 'Not specified'}.`,
        data: { group_id: groupId, member_id: id, reason }
      });
    } catch {}

    res.json({
      success: true,
      message: 'Member disqualified and removed from group successfully'
    });

  } catch (error) {
    console.error('Disqualify group member error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateGroupMemberRole = async (req, res) => {
  try {
    const { id } = req.params; // Member application ID
    const { role } = req.body; // 'leader', 'member', 'moderator'

    if (!ADMIN_ROLES.includes(req.user.role) && req.user.role !== 'chairman') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to manage group roles'
      });
    }

    if (!['leader', 'member', 'moderator'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    const memberApplication = await LayyahApplication.findByPk(id);
    if (!memberApplication || !memberApplication.group_id) {
      return res.status(404).json({
        success: false,
        message: 'Member application not found or not part of a group'
      });
    }

    const oldRole = memberApplication.group_role;
    await memberApplication.update({ group_role: role });

    await ActivityLog.logActivity(
      req.user,
      'layyah_member_role_updated',
      'layyah_application',
      id,
      `Member role updated from ${oldRole} to ${role}`,
      {
        application_id: id,
        group_id: memberApplication.group_id,
        old_role: oldRole,
        new_role: role
      },
      req
    );

    res.json({
      success: true,
      message: 'Group member role updated successfully',
      role
    });
  } catch (error) {
    console.error('Update group member role error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateGroupSettings = async (req, res) => {
  try {
    const { id } = req.params; // Group application ID
    const { status, notes, settings } = req.body;

    if (!ADMIN_ROLES.includes(req.user.role) && req.user.role !== 'chairman') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update group settings'
      });
    }

    const groupApplication = await LayyahApplication.findByPk(id);
    if (!groupApplication || groupApplication.kind !== 'group') {
      return res.status(404).json({
        success: false,
        message: 'Group application not found'
      });
    }

    const updates = {};
    if (status) updates.status = status;
    if (notes) updates.notes = notes;
    if (settings) {
      // Ensure settings is stored as JSON or however it's defined
      updates.metadata = { ...groupApplication.metadata, ...settings };
    }

    await groupApplication.update(updates);

    await ActivityLog.logActivity(
      req.user,
      'layyah_group_settings_updated',
      'layyah_group',
      id,
      'Group settings updated by administrator',
      {
        group_id: id,
        updates
      },
      req
    );

    res.json({
      success: true,
      message: 'Group settings updated successfully'
    });
  } catch (error) {
    console.error('Update group settings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateSeasonalProgramStatus = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['admin', 'super_admin', 'treasurer', 'chairman', 'secretary'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update seasonal program status'
      });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Enabled flag must be a boolean'
      });
    }

    const [setting, created] = await Settings.findOrCreate({
      where: { key: 'layyah_seasonal_program_enabled' },
      defaults: {
        value: enabled,
        category: 'general',
        description: 'Controls whether the Layyah seasonal program is enabled'
      }
    });

    if (!created) {
      setting.value = enabled;
      await setting.save();
    }

    res.json({
      success: true,
      enabled,
      message: `Seasonal program ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Update seasonal program status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update seasonal program status'
    });
  }
};

module.exports = {
  getLayyahStats,
  getLayyahApplications,
  getLayyahAnimalCatalog,
  createLayyahApplication,
  updateLayyahApplication,
  reverseLayyahApplicationStatus,
  repairInvalidDisbursedApplications,
  revertAllDisbursedApplications,
  getLayyahApplicants,
  exportLayyahApplications,
  updateLayyahAppliedAmount,
  streamLayyahEvents,
  logAdminClientError,
  getLayyahGroups,
  getMyApplications,
  requestToJoinGroup,
  leaveGroup,
  getLayyahGroupById,
  getGroupMembers,
  manageGroupMembership,
  respondToGroupInvitation,
  addMemberToGroup,
  disqualifyGroupMember,
  updateGroupMemberRole,
  updateGroupSettings,
  getSeasonalProgramStatus,
  updateSeasonalProgramStatus
};
