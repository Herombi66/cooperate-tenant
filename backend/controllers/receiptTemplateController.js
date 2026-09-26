const crypto = require('crypto');
const { ReceiptTemplate, ReceiptTemplateVersion, ReceiptRecord, User, MembershipApplication, ActivityLog } = require('../models');
const { generateReceiptPdf } = require('../utils/receiptGenerator');
const { generateQRCodeDataURL } = require('../utils/qrHelper');

/**
 * Built-in default layout configurations for 6 standard template types
 */
const DEFAULT_TEMPLATES = [
  {
    name: 'General Master Receipt',
    type: 'default',
    paper_size: 'A4',
    is_active: true,
    is_default: true,
    version: 1,
    layout_config: {
      theme: 'iman_emerald',
      colors: {
        primary: '#0F766E',
        secondary: '#D97706',
        text: '#1F2937',
        background: '#FFFFFF',
        border: '#E5E7EB',
        accent: '#F3F4F6'
      },
      typography: {
        font_family: 'Inter, sans-serif',
        font_scale: 'medium',
        heading_weight: 'bold',
        body_size: '10pt',
        text_align: 'left'
      },
      header: {
        org_name: 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY',
        tagline: 'Empowering Members Through Faith, Integrity & Mutual Cooperation',
        registration_no: 'IMAN/COOP/2024/001',
        address: 'Gombe State, Nigeria',
        phone: '+234 800 000 0000',
        email: 'info@imancooperative.org',
        website: 'www.imancooperative.org',
        receipt_title: 'OFFICIAL RECEIPT'
      },
      logo: {
        url: '/logo.png',
        position: 'center',
        width: 70,
        height: 70,
        show_on_print: true
      },
      border_style: 'solid',
      sections: {
        show_logo: true,
        show_header: true,
        show_metadata: true,
        show_member_details: true,
        show_breakdown: true,
        show_summary: true,
        show_qr_code: true,
        show_barcode: true,
        show_signatures: true,
        show_stamp: true,
        show_notes: true,
        show_watermark: true
      },
      watermark: {
        text: 'OFFICIAL RECEIPT',
        opacity: 0.1,
        rotation: -30
      },
      stamp: {
        text: 'IMAN COOPERATIVE SOCIETY • OFFICIAL VERIFIED SEAL',
        color: '#0F766E',
        show_date: true
      },
      signature: {
        title: 'Authorized Treasury Officer',
        show_line: true
      },
      notes: {
        text: 'Thank you for your valued participation in IMAN Multi-Purpose Cooperative Society. Non-transferable and issued under the Cooperative Bye-Laws.'
      }
    }
  },
  {
    name: 'Thrift & Special Contribution Receipt',
    type: 'contribution',
    paper_size: 'A4',
    is_active: true,
    is_default: false,
    version: 1,
    layout_config: {
      theme: 'iman_emerald',
      colors: {
        primary: '#047857',
        secondary: '#B45309',
        text: '#111827',
        background: '#FFFFFF',
        border: '#D1D5DB',
        accent: '#ECFDF5'
      },
      typography: {
        font_family: 'Inter, sans-serif',
        font_scale: 'medium',
        heading_weight: 'bold',
        body_size: '10pt',
        text_align: 'left'
      },
      header: {
        org_name: 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY',
        tagline: 'Monthly Thrift, Savings & Special Contribution',
        registration_no: 'IMAN/COOP/2024/001',
        address: 'Gombe State, Nigeria',
        phone: '+234 800 000 0000',
        email: 'contributions@imancooperative.org',
        website: 'www.imancooperative.org',
        receipt_title: 'CONTRIBUTION RECEIPT'
      },
      logo: {
        url: '/logo.png',
        position: 'center',
        width: 70,
        height: 70,
        show_on_print: true
      },
      border_style: 'solid',
      sections: {
        show_logo: true,
        show_header: true,
        show_metadata: true,
        show_member_details: true,
        show_breakdown: true,
        show_summary: true,
        show_qr_code: true,
        show_barcode: true,
        show_signatures: true,
        show_stamp: true,
        show_notes: true,
        show_watermark: true
      },
      watermark: {
        text: 'CONTRIBUTION PAID',
        opacity: 0.12,
        rotation: -30
      },
      stamp: {
        text: 'IMAN COOPERATIVE • CONTRIBUTIONS DESK',
        color: '#047857',
        show_date: true
      },
      signature: {
        title: 'Treasurer / Financial Secretary',
        show_line: true
      },
      notes: {
        text: 'Your contribution strengthens our collective economic resilience. Monthly balance reflects on your member portal dashboard.'
      }
    }
  },
  {
    name: 'Loan Repayment & Liquidation Receipt',
    type: 'loan_repayment',
    paper_size: 'A4',
    is_active: true,
    is_default: false,
    version: 1,
    layout_config: {
      theme: 'royal_navy',
      colors: {
        primary: '#1E3A8A',
        secondary: '#C2410C',
        text: '#1F2937',
        background: '#FFFFFF',
        border: '#CBD5E1',
        accent: '#EFF6FF'
      },
      typography: {
        font_family: 'Inter, sans-serif',
        font_scale: 'medium',
        heading_weight: 'bold',
        body_size: '10pt',
        text_align: 'left'
      },
      header: {
        org_name: 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY',
        tagline: 'Credit & Islamic Financing Operations',
        registration_no: 'IMAN/COOP/2024/001',
        address: 'Gombe State, Nigeria',
        phone: '+234 800 000 0000',
        email: 'credit@imancooperative.org',
        website: 'www.imancooperative.org',
        receipt_title: 'LOAN REPAYMENT RECEIPT'
      },
      logo: {
        url: '/logo.png',
        position: 'center',
        width: 70,
        height: 70,
        show_on_print: true
      },
      border_style: 'solid',
      sections: {
        show_logo: true,
        show_header: true,
        show_metadata: true,
        show_member_details: true,
        show_breakdown: true,
        show_summary: true,
        show_qr_code: true,
        show_barcode: true,
        show_signatures: true,
        show_stamp: true,
        show_notes: true,
        show_watermark: true
      },
      watermark: {
        text: 'REPAYMENT ACKNOWLEDGED',
        opacity: 0.1,
        rotation: -30
      },
      stamp: {
        text: 'IMAN COOPERATIVE • CREDIT DEPARTMENT',
        color: '#1E3A8A',
        show_date: true
      },
      signature: {
        title: 'Credit & Risk Committee Head',
        show_line: true
      },
      notes: {
        text: 'Repayment successfully applied towards loan tenure. Murabaha contracts comply with non-interest Islamic finance principles.'
      }
    }
  },
  {
    name: 'Savings Deposit Receipt (Thermal 80mm)',
    type: 'savings',
    paper_size: 'thermal_80',
    is_active: true,
    is_default: false,
    version: 1,
    layout_config: {
      theme: 'modern_teal',
      colors: {
        primary: '#0D9488',
        secondary: '#E11D48',
        text: '#111827',
        background: '#FFFFFF',
        border: '#E5E7EB',
        accent: '#F0FDFA'
      },
      typography: {
        font_family: 'Courier, monospace',
        font_scale: 'compact',
        heading_weight: 'bold',
        body_size: '9pt',
        text_align: 'center'
      },
      header: {
        org_name: 'IMAN COOPERATIVE SOCIETY',
        tagline: 'Target & Voluntary Savings',
        registration_no: 'IMAN/COOP/2024/001',
        address: 'Gombe State, Nigeria',
        phone: '+234 800 000 0000',
        email: 'info@imancooperative.org',
        website: 'www.imancooperative.org',
        receipt_title: 'SAVINGS DEPOSIT SLIP'
      },
      logo: {
        url: '/logo.png',
        position: 'center',
        width: 50,
        height: 50,
        show_on_print: false
      },
      border_style: 'dashed',
      sections: {
        show_logo: false,
        show_header: true,
        show_metadata: true,
        show_member_details: true,
        show_breakdown: true,
        show_summary: true,
        show_qr_code: true,
        show_barcode: true,
        show_signatures: false,
        show_stamp: true,
        show_notes: true,
        show_watermark: false
      },
      watermark: {
        text: '',
        opacity: 0,
        rotation: 0
      },
      stamp: {
        text: 'IMAN COOP • TELLER VERIFIED',
        color: '#0D9488',
        show_date: true
      },
      signature: {
        title: 'Cashier / Teller',
        show_line: false
      },
      notes: {
        text: 'Thank you for saving with IMAN MCS. Keep this slip safe.'
      }
    }
  },
  {
    name: 'Investment & Murabaha Receipt',
    type: 'investment',
    paper_size: 'A4',
    is_active: true,
    is_default: false,
    version: 1,
    layout_config: {
      theme: 'executive_slate',
      colors: {
        primary: '#334155',
        secondary: '#D97706',
        text: '#0F172A',
        background: '#FFFFFF',
        border: '#CBD5E1',
        accent: '#F8FAFC'
      },
      typography: {
        font_family: 'Merriweather, serif',
        font_scale: 'medium',
        heading_weight: 'bold',
        body_size: '10pt',
        text_align: 'left'
      },
      header: {
        org_name: 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY',
        tagline: 'Ethical & Shari’ah Compliant Capital Investment',
        registration_no: 'IMAN/COOP/2024/001',
        address: 'Gombe State, Nigeria',
        phone: '+234 800 000 0000',
        email: 'investments@imancooperative.org',
        website: 'www.imancooperative.org',
        receipt_title: 'INVESTMENT CERTIFICATE RECEIPT'
      },
      logo: {
        url: '/logo.png',
        position: 'center',
        width: 75,
        height: 75,
        show_on_print: true
      },
      border_style: 'double',
      sections: {
        show_logo: true,
        show_header: true,
        show_metadata: true,
        show_member_details: true,
        show_breakdown: true,
        show_summary: true,
        show_qr_code: true,
        show_barcode: true,
        show_signatures: true,
        show_stamp: true,
        show_notes: true,
        show_watermark: true
      },
      watermark: {
        text: 'CAPITAL ALLOCATION',
        opacity: 0.08,
        rotation: -30
      },
      stamp: {
        text: 'IMAN COOPERATIVE • INVESTMENT BOARD',
        color: '#334155',
        show_date: true
      },
      signature: {
        title: 'Investment Committee Chairman',
        show_line: true
      },
      notes: {
        text: 'This receipt confirms capital participation in IMAN Cooperative ventures. Profit distribution adheres to audited cooperative shares.'
      }
    }
  },
  {
    name: 'Membership Registration & Dues Receipt',
    type: 'membership',
    paper_size: 'A5',
    is_active: true,
    is_default: false,
    version: 1,
    layout_config: {
      theme: 'iman_emerald',
      colors: {
        primary: '#0F766E',
        secondary: '#B45309',
        text: '#1F2937',
        background: '#FFFFFF',
        border: '#E2E8F0',
        accent: '#F0FDFA'
      },
      typography: {
        font_family: 'Inter, sans-serif',
        font_scale: 'medium',
        heading_weight: 'bold',
        body_size: '9pt',
        text_align: 'left'
      },
      header: {
        org_name: 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY',
        tagline: 'Member Onboarding & Annual Administration Dues',
        registration_no: 'IMAN/COOP/2024/001',
        address: 'Gombe State, Nigeria',
        phone: '+234 800 000 0000',
        email: 'membership@imancooperative.org',
        website: 'www.imancooperative.org',
        receipt_title: 'MEMBERSHIP DUES RECEIPT'
      },
      logo: {
        url: '/logo.png',
        position: 'center',
        width: 60,
        height: 60,
        show_on_print: true
      },
      border_style: 'solid',
      sections: {
        show_logo: true,
        show_header: true,
        show_metadata: true,
        show_member_details: true,
        show_breakdown: true,
        show_summary: true,
        show_qr_code: true,
        show_barcode: true,
        show_signatures: true,
        show_stamp: true,
        show_notes: true,
        show_watermark: true
      },
      watermark: {
        text: 'OFFICIAL MEMBER',
        opacity: 0.1,
        rotation: -30
      },
      stamp: {
        text: 'IMAN COOPERATIVE • SECRETARIAT',
        color: '#0F766E',
        show_date: true
      },
      signature: {
        title: 'General Secretary',
        show_line: true
      },
      notes: {
        text: 'Welcome to IMAN Multi-Purpose Cooperative Society. Carry your Member PSN for all official transactions.'
      }
    }
  },
  {
    name: 'Official Expense & Payment Voucher Receipt',
    type: 'expense',
    paper_size: 'A4',
    is_active: true,
    is_default: false,
    version: 1,
    layout_config: {
      theme: 'iman_emerald',
      colors: {
        primary: '#0F766E',
        secondary: '#D97706',
        text: '#1F2937',
        background: '#FFFFFF',
        border: '#E5E7EB',
        accent: '#F0FDFA'
      },
      typography: {
        font_family: 'Inter, sans-serif',
        font_scale: 'medium',
        heading_weight: 'bold',
        body_size: '10pt',
        text_align: 'left'
      },
      header: {
        org_name: 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY',
        tagline: 'Disbursement Voucher & Expenditure Management',
        registration_no: 'IMAN/COOP/2024/001',
        address: 'Gombe State, Nigeria',
        phone: '+234 800 000 0000',
        email: 'accounts@imancooperative.org',
        website: 'www.imancooperative.org',
        receipt_title: 'OFFICIAL PAYMENT VOUCHER'
      },
      logo: {
        url: '/logo.png',
        position: 'center',
        width: 70,
        height: 70,
        show_on_print: true
      },
      border_style: 'solid',
      sections: {
        show_logo: true,
        show_header: true,
        show_metadata: true,
        show_member_details: true,
        show_breakdown: true,
        show_summary: true,
        show_qr_code: true,
        show_barcode: true,
        show_signatures: true,
        show_stamp: true,
        show_notes: true,
        show_watermark: true
      },
      watermark: {
        text: 'PAYMENT DISBURSED',
        opacity: 0.1,
        rotation: -30
      },
      stamp: {
        text: 'IMAN COOPERATIVE • DISBURSEMENTS & EXPENDITURE DESK',
        color: '#0F766E',
        show_date: true
      },
      signature: {
        title: 'Treasurer / Financial Officer',
        show_line: true
      },
      notes: {
        text: 'Official payment disbursement voucher and expense receipt issued by IMAN Multi-Purpose Cooperative Society.'
      }
    }
  }
];

let tablesEnsured = false;
async function ensureTablesAndDefaultsExist() {
  if (tablesEnsured) return;
  try {
    await ReceiptTemplate.sync();
    await ReceiptTemplateVersion.sync();
    await ReceiptRecord.sync();
    tablesEnsured = true;
  } catch (syncErr) {
    console.warn('[ReceiptTemplateController] sync warning:', syncErr.message);
  }
  await ensureDefaultTemplatesExist();
}

/**
 * Ensure default templates exist in database
 */
async function ensureDefaultTemplatesExist() {
  try {
    await ReceiptTemplate.sync();
    await ReceiptTemplateVersion.sync();
    await ReceiptRecord.sync();
    for (const t of DEFAULT_TEMPLATES) {
      const existing = await ReceiptTemplate.findOne({ where: { type: t.type } });
      if (!existing) {
        const created = await ReceiptTemplate.create(t);
        await ReceiptTemplateVersion.create({
          template_id: created.id,
          version: 1,
          layout_config: created.layout_config,
          change_summary: 'Initial System Standard Baseline'
        });
      }
    }
  } catch (err) {
    console.warn('[ReceiptTemplateController] ensureDefaultTemplatesExist notice:', err.message);
  }
}

/**
 * Helper: Generate cryptographic verification hash for receipts
 */
function generateVerificationHash(receiptNumber, transactionType, amount, issuedAt) {
  const secret = process.env.JWT_SECRET || 'iman_secure_receipt_hmac_secret_2026';
  const data = `${receiptNumber}|${transactionType}|${amount}|${new Date(issuedAt).getTime()}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * GET /receipt-templates
 * Lists all receipt templates
 */
exports.getTemplates = async (req, res) => {
  try {
    await ensureTablesAndDefaultsExist();

    const templates = await ReceiptTemplate.findAll({
      order: [
        ['is_default', 'DESC'],
        ['is_active', 'DESC'],
        ['id', 'ASC']
      ],
      include: [
        { model: User, as: 'creator', attributes: ['id', 'role'] },
        { model: User, as: 'updater', attributes: ['id', 'role'] }
      ]
    });

    return res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('getTemplates error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch receipt templates' });
  }
};

/**
 * GET /receipt-templates/:id
 * Get single template by ID
 */
exports.getTemplateById = async (req, res) => {
  try {
    await ensureTablesAndDefaultsExist();
    const { id } = req.params;
    const template = await ReceiptTemplate.findByPk(id, {
      include: [
        {
          model: ReceiptTemplateVersion,
          as: 'versions',
          order: [['version', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Receipt template not found' });
    }

    return res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('getTemplateById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch receipt template' });
  }
};

/**
 * POST /receipt-templates
 * Create a new receipt template
 */
exports.createTemplate = async (req, res) => {
  try {
    await ensureTablesAndDefaultsExist();
    const { name, type, paper_size, layout_config, is_active } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!name || !layout_config) {
      return res.status(400).json({ success: false, message: 'Template name and layout configuration are required' });
    }

    const template = await ReceiptTemplate.create({
      name,
      type: type || 'default',
      paper_size: paper_size || 'A4',
      layout_config,
      is_active: is_active !== false,
      version: 1,
      created_by: userId,
      updated_by: userId
    });

    // Record initial version 1 with auto-sync retry
    try {
      await ReceiptTemplateVersion.create({
        template_id: template.id,
        version: 1,
        layout_config,
        change_summary: 'Initial template creation',
        created_by: userId
      });
    } catch (verErr) {
      console.warn('ReceiptTemplateVersion create fallback:', verErr.message);
      await ReceiptTemplateVersion.sync();
      await ReceiptTemplateVersion.create({
        template_id: template.id,
        version: 1,
        layout_config,
        change_summary: 'Initial template creation',
        created_by: userId
      });
    }

    if (ActivityLog && typeof ActivityLog.logActivity === 'function') {
      await ActivityLog.logActivity(
        userId,
        'RECEIPT_TEMPLATE_CREATED',
        'receipt_template',
        template.id,
        `Created receipt template: ${template.name} (${template.type})`,
        { templateId: template.id, name: template.name },
        req
      ).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: 'Receipt template created successfully',
      template
    });
  } catch (error) {
    console.error('createTemplate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create receipt template' });
  }
};

/**
 * PUT /receipt-templates/:id
 * Update template layout and bump version
 */
exports.updateTemplate = async (req, res) => {
  try {
    await ensureTablesAndDefaultsExist();
    const { id } = req.params;
    const { name, paper_size, layout_config, change_summary, is_active } = req.body;
    const userId = req.user ? req.user.id : null;

    const template = await ReceiptTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Receipt template not found' });
    }

    const newVersion = (template.version || 1) + 1;

    template.name = name || template.name;
    template.paper_size = paper_size || template.paper_size;
    template.layout_config = layout_config || template.layout_config;
    if (is_active !== undefined) template.is_active = is_active;
    template.version = newVersion;
    template.updated_by = userId;
    await template.save();

    // Create immutable version record with automatic table sync retry if relation was missing
    try {
      await ReceiptTemplateVersion.create({
        template_id: template.id,
        version: newVersion,
        layout_config: template.layout_config,
        change_summary: change_summary || `Updated template to version ${newVersion}`,
        created_by: userId
      });
    } catch (verErr) {
      console.warn('ReceiptTemplateVersion insert failed, ensuring table exists and retrying:', verErr.message);
      await ReceiptTemplateVersion.sync();
      await ReceiptTemplateVersion.create({
        template_id: template.id,
        version: newVersion,
        layout_config: template.layout_config,
        change_summary: change_summary || `Updated template to version ${newVersion}`,
        created_by: userId
      });
    }

    if (ActivityLog && typeof ActivityLog.logActivity === 'function') {
      await ActivityLog.logActivity(
        userId,
        'RECEIPT_TEMPLATE_UPDATED',
        'receipt_template',
        template.id,
        `Updated receipt template "${template.name}" to v${newVersion}`,
        { templateId: template.id, version: newVersion, changeSummary: change_summary },
        req
      ).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Receipt template updated to version ${newVersion}`,
      template
    });
  } catch (error) {
    console.error('updateTemplate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update receipt template' });
  }
};

/**
 * POST /receipt-templates/:id/activate
 * Set template as active or default for its type
 */
exports.activateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { make_default } = req.body;
    const userId = req.user ? req.user.id : null;

    const template = await ReceiptTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Receipt template not found' });
    }

    template.is_active = true;
    if (make_default) {
      // De-default other templates of same type
      await ReceiptTemplate.update(
        { is_default: false },
        { where: { type: template.type } }
      );
      template.is_default = true;
    }
    template.updated_by = userId;
    await template.save();

    return res.json({
      success: true,
      message: `Template "${template.name}" is now active${make_default ? ' and set as default' : ''}`,
      template
    });
  } catch (error) {
    console.error('activateTemplate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to activate template' });
  }
};

/**
 * GET /receipt-templates/:id/versions
 * List all historical versions of a template
 */
exports.getTemplateVersions = async (req, res) => {
  try {
    await ensureTablesAndDefaultsExist();
    const { id } = req.params;
    const versions = await ReceiptTemplateVersion.findAll({
      where: { template_id: id },
      order: [['version', 'DESC']],
      include: [
        { model: User, as: 'creator', attributes: ['id', 'role'] }
      ]
    });

    return res.json({
      success: true,
      versions
    });
  } catch (error) {
    console.error('getTemplateVersions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch template version history' });
  }
};

/**
 * POST /receipt-templates/:id/rollback
 * Rollback template to a specific past version
 */
exports.restoreTemplateVersion = async (req, res) => {
  try {
    await ensureTablesAndDefaultsExist();
    const { id } = req.params;
    const { version_id } = req.body;
    const userId = req.user ? req.user.id : null;

    const template = await ReceiptTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const targetVersion = await ReceiptTemplateVersion.findOne({
      where: { template_id: id, id: version_id }
    });

    if (!targetVersion) {
      return res.status(404).json({ success: false, message: 'Target version not found' });
    }

    const nextVersion = (template.version || 1) + 1;
    template.layout_config = targetVersion.layout_config;
    template.version = nextVersion;
    template.updated_by = userId;
    await template.save();

    try {
      await ReceiptTemplateVersion.create({
        template_id: template.id,
        version: nextVersion,
        layout_config: targetVersion.layout_config,
        change_summary: `Restored configuration from v${targetVersion.version}`,
        created_by: userId
      });
    } catch (verErr) {
      console.warn('ReceiptTemplateVersion rollback create retry:', verErr.message);
      await ReceiptTemplateVersion.sync();
      await ReceiptTemplateVersion.create({
        template_id: template.id,
        version: nextVersion,
        layout_config: targetVersion.layout_config,
        change_summary: `Restored configuration from v${targetVersion.version}`,
        created_by: userId
      });
    }

    if (ActivityLog && typeof ActivityLog.logActivity === 'function') {
      await ActivityLog.logActivity(
        userId,
        'RECEIPT_TEMPLATE_RESTORED',
        'receipt_template',
        template.id,
        `Restored template "${template.name}" to layout from v${targetVersion.version}`,
        { templateId: template.id, restoredFromVersion: targetVersion.version, newVersion: nextVersion },
        req
      ).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Template rolled back to layout from v${targetVersion.version} (now v${nextVersion})`,
      template
    });
  } catch (error) {
    console.error('restoreTemplateVersion error:', error);
    return res.status(500).json({ success: false, message: 'Failed to restore template version' });
  }
};

/**
 * POST /receipt-templates/:id/reset
 * Reverts template layout to system default
 */
exports.resetTemplateToDefault = async (req, res) => {
  try {
    await ensureTablesAndDefaultsExist();
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const template = await ReceiptTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const defaultMatch = DEFAULT_TEMPLATES.find(t => t.type === template.type) || DEFAULT_TEMPLATES[0];

    const nextVersion = (template.version || 1) + 1;
    template.layout_config = defaultMatch.layout_config;
    template.paper_size = defaultMatch.paper_size;
    template.version = nextVersion;
    template.updated_by = userId;
    await template.save();

    try {
      await ReceiptTemplateVersion.create({
        template_id: template.id,
        version: nextVersion,
        layout_config: defaultMatch.layout_config,
        change_summary: 'Reset to system default template baseline',
        created_by: userId
      });
    } catch (verErr) {
      console.warn('ReceiptTemplateVersion reset create retry:', verErr.message);
      await ReceiptTemplateVersion.sync();
      await ReceiptTemplateVersion.create({
        template_id: template.id,
        version: nextVersion,
        layout_config: defaultMatch.layout_config,
        change_summary: 'Reset to system default template baseline',
        created_by: userId
      });
    }

    if (ActivityLog && typeof ActivityLog.logActivity === 'function') {
      await ActivityLog.logActivity(
        userId,
        'RECEIPT_TEMPLATE_RESET',
        'receipt_template',
        template.id,
        `Reset template "${template.name}" to factory default baseline`,
        { templateId: template.id, newVersion: nextVersion },
        req
      ).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Template reset to system default baseline (v${nextVersion})`,
      template
    });
  } catch (error) {
    console.error('resetTemplateToDefault error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset template' });
  }
};

/**
 * POST /receipt-templates/test-print
 * Generate a watermarked sample PDF without affecting any transaction or ledger records
 */
exports.testPrintReceipt = async (req, res) => {
  try {
    const { template_id, paper_size, layout_config } = req.body;

    let config = layout_config;
    let size = paper_size;

    if (template_id && !config) {
      const template = await ReceiptTemplate.findByPk(template_id);
      if (template) {
        config = template.layout_config;
        size = size || template.paper_size;
      }
    }

    if (!config) {
      config = DEFAULT_TEMPLATES[0].layout_config;
      size = size || 'A4';
    }

    const sampleData = {
      receipt_number: `IMAN-TEST-${Date.now().toString().slice(-6)}`,
      issue_date: new Date().toISOString().slice(0, 10),
      payment_method: 'Bank Transfer (Sample)',
      transaction_type: 'Monthly Thrift Contribution (Sample)',
      amount: 25000.00,
      balance_after: 250000.00,
      verification_hash: generateVerificationHash('IMAN-TEST-SAMPLE', 'Sample', 25000, new Date()),
      member: {
        name: 'Malam Ibrahim Danjuma (Sample Member)',
        psn: 'IMAN/MEM/2024/0042',
        facility: 'State Specialist Hospital Gombe'
      },
      items: [
        { description: 'Monthly Savings Thrift Contribution (Thrift Fund)', amount: 20000.00 },
        { description: 'Administrative & Welfare Levy', amount: 5000.00 }
      ]
    };

    const pdfBuffer = await generateReceiptPdf(config, sampleData, {
      paperSize: size,
      isTest: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt_test_${sampleData.receipt_number}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('testPrintReceipt error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate test print' });
  }
};

/**
 * GET /receipts/verify/:receiptNumber
 * Public endpoint to verify receipt authenticity.
 * Exposes strictly safe non-PII metadata.
 */
exports.verifyReceiptPublic = async (req, res) => {
  try {
    await ensureTablesAndDefaultsExist();
    const { receiptNumber } = req.params;

    if (!receiptNumber || receiptNumber.trim() === '') {
      return res.status(400).json({ success: false, message: 'Receipt number is required' });
    }

    // Special test receipt handling
    if (receiptNumber.startsWith('IMAN-TEST') || receiptNumber.includes('SAMPLE')) {
      return res.json({
        success: true,
        verified: true,
        is_sample: true,
        receipt: {
          receipt_number: receiptNumber,
          cooperative_name: 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY',
          status: 'verified_sample',
          badge: 'Official Sample Receipt',
          transaction_type: 'Sample Contribution',
          amount: 25000.00,
          currency: 'NGN',
          issued_at: new Date().toISOString(),
          masked_member_name: 'I*** D***',
          masked_member_id: 'MEM-***42',
          verification_hash_snippet: 'a1b2c3d4e5f6...'
        }
      });
    }

    const record = await ReceiptRecord.findOne({
      where: { receipt_number: receiptNumber },
      include: [
        {
          model: User,
          as: 'member',
          include: [
            {
              model: MembershipApplication,
              as: 'membershipApplication',
              attributes: ['name', 'psn']
            }
          ]
        }
      ]
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'No official receipt found matching this receipt number. Please ensure the code is authentic.'
      });
    }

    // Verify hash integrity
    const calculatedHash = generateVerificationHash(
      record.receipt_number,
      record.transaction_type,
      record.amount,
      record.issued_at
    );

    const isTamperFree = record.verification_hash === calculatedHash;

    // Mask name: "Ibrahim Danjuma" -> "I*** D***"
    const fullName = record.member?.membershipApplication?.name || record.snapshot_data?.member?.name || 'Cooperative Member';
    const maskedName = fullName.split(' ').map(part => part.charAt(0) + '***').join(' ');

    const rawPsn = record.member?.membershipApplication?.psn || record.snapshot_data?.member?.psn || '';
    const maskedPsn = rawPsn ? rawPsn.slice(0, 3) + '***' + rawPsn.slice(-2) : 'MEM-***';

    return res.json({
      success: true,
      verified: isTamperFree,
      receipt: {
        receipt_number: record.receipt_number,
        cooperative_name: record.snapshot_data?.header?.org_name || 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY',
        status: isTamperFree ? 'verified' : 'integrity_warning',
        badge: isTamperFree ? 'Official Verified Receipt' : 'Integrity Mismatch',
        transaction_type: record.transaction_type,
        payment_method: record.payment_method,
        amount: Number(record.amount),
        currency: 'NGN',
        issued_at: record.issued_at,
        masked_member_name: maskedName,
        masked_member_id: maskedPsn,
        verification_hash_snippet: (record.verification_hash || '').slice(0, 16) + '...'
      }
    });
  } catch (error) {
    console.error('verifyReceiptPublic error:', error);
    return res.status(500).json({ success: false, message: 'Receipt verification failed' });
  }
};

/**
 * GET /receipts/record/:receiptNumber
 * Retrieves full issued receipt record with immutable snapshot
 */
exports.getReceiptRecord = async (req, res) => {
  try {
    await ensureTablesAndDefaultsExist();
    const { receiptNumber } = req.params;
    const record = await ReceiptRecord.findOne({
      where: { receipt_number: receiptNumber }
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Receipt record not found' });
    }

    return res.json({
      success: true,
      record
    });
  } catch (error) {
    console.error('getReceiptRecord error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve receipt record' });
  }
};

/**
 * Internal Helper: Issue Receipt Record with Immutable Snapshot
 * Preserves rendered configuration so subsequent template edits never mutate historical receipts.
 */
exports.issueReceiptRecord = async ({
  transactionType,
  transactionId,
  memberId,
  amount,
  paymentMethod,
  receiptNumber: customReceiptNumber = null,
  recipientName = null,
  recipientDetails = null,
  customItems = [],
  balanceAfter = null
}) => {
  try {
    await ensureTablesAndDefaultsExist();

    // Find active template for transaction type, or default
    let template = await ReceiptTemplate.findOne({
      where: { type: transactionType, is_active: true }
    });
    if (!template) {
      template = await ReceiptTemplate.findOne({
        where: { is_default: true, is_active: true }
      }) || await ReceiptTemplate.findOne();
    }

    const templateConfig = template ? template.layout_config : DEFAULT_TEMPLATES[0].layout_config;
    const templateId = template ? template.id : null;
    const templateVersion = template ? template.version : 1;

    // Generate receipt number: IMAN-REC-YYYY-XXXXXX or use supplied
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const receiptNumber = customReceiptNumber || `IMAN-REC-${year}-${randomHex}`;

    const issuedAt = new Date();
    const verificationHash = generateVerificationHash(receiptNumber, transactionType, amount, issuedAt);

    // Fetch member details
    let memberDetails = null;
    if (memberId) {
      const user = await User.findByPk(memberId, {
        include: [{ model: MembershipApplication, as: 'membershipApplication' }]
      });
      if (user && user.membershipApplication) {
        memberDetails = {
          name: user.membershipApplication.name,
          psn: user.membershipApplication.psn,
          facility: user.membershipApplication.facility_name
        };
      }
    }

    if (!memberDetails && (recipientName || recipientDetails)) {
      memberDetails = recipientDetails || {
        name: recipientName,
        psn: 'Official Payee / Beneficiary',
        facility: 'Expense Disbursement'
      };
    }

    const snapshotData = {
      header: templateConfig.header,
      colors: templateConfig.colors,
      typography: templateConfig.typography,
      border_style: templateConfig.border_style,
      sections: templateConfig.sections,
      watermark: templateConfig.watermark,
      stamp: templateConfig.stamp,
      signature: templateConfig.signature,
      notes: templateConfig.notes,
      member: memberDetails,
      items: customItems.length > 0 ? customItems : [
        { description: transactionType, amount }
      ],
      balance_after: balanceAfter,
      receipt_number: receiptNumber,
      issued_at: issuedAt,
      payment_method: paymentMethod || 'Bank Transfer'
    };

    const record = await ReceiptRecord.create({
      receipt_number: receiptNumber,
      transaction_type: transactionType,
      transaction_id: transactionId,
      member_id: memberId,
      amount,
      payment_method: paymentMethod || 'Bank Transfer',
      snapshot_data: snapshotData,
      template_id: templateId,
      template_version: templateVersion,
      verification_hash: verificationHash,
      issued_at: issuedAt
    });

    return record;
  } catch (error) {
    console.error('issueReceiptRecord error:', error);
    return null;
  }
};

exports.generateVerificationHash = generateVerificationHash;
