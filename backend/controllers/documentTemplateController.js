const { DocumentTemplate, DocumentTemplateVersion, LoanAgreement, Loan, User, MembershipApplication, ActivityLog } = require('../models');
const { sequelize } = require('../db/connection');
const { generateContractPdf, DEFAULT_MURABAHA_TERMS, DEFAULT_WAKALA_TERMS } = require('../utils/contractPdfGenerator');

/**
 * Built-in default document templates for Standard/IMAN tenants
 */
const DEFAULT_DOC_TEMPLATES = [
  {
    name: 'Official Murabaha Sales Contract',
    type: 'murabaha_contract',
    version: 1,
    is_active: true,
    is_default: true,
    tenant_id: 'default',
    layout_config: {
      theme: 'iman_emerald',
      colors: {
        primary: '#047857',
        secondary: '#B45309',
        text: '#111827',
        background: '#FFFFFF',
        border: '#E5E7EB',
        accent: '#ECFDF5'
      },
      typography: {
        font_family: 'Inter, sans-serif',
        font_scale: 'medium',
        heading_weight: 'bold',
        body_size: '9pt'
      },
      header: {
        org_name: 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY',
        chapter: 'Gombe State Chapter',
        registration_no: 'IMAN/COOP/2024/001',
        address: 'Federal Medical Centre Complex, Gombe State, Nigeria',
        phone: '+234 806 573 6114',
        email: 'info@imancooperative.org',
        website: 'www.imancooperative.org',
        contract_title: 'MURABAHA SALES CONTRACT'
      },
      logo: {
        position: 'left',
        width: 65,
        height: 65,
        show_on_print: true
      },
      sections: {
        show_logo: true,
        show_header: true,
        show_metadata: true,
        show_borrower_card: true,
        show_financing_card: true,
        show_breakdown_card: true,
        show_schedule: true,
        show_terms: true,
        show_signatures: true,
        show_stamp: true,
        show_qr_code: true,
        show_watermark: true,
        show_footer: true
      },
      terms: DEFAULT_MURABAHA_TERMS,
      stamp: {
        show: true,
        text: 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY • OFFICIAL VERIFIED SEAL • GOMBE STATE',
        color: '#047857'
      },
      footer: {
        text: 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY • Official Murabaha Agreement',
        show_page_number: true
      }
    }
  },
  {
    name: 'Agent Financing Agreement (Wakala)',
    type: 'agent_agreement',
    version: 1,
    is_active: true,
    is_default: false,
    tenant_id: 'default',
    layout_config: {
      theme: 'royal_navy',
      colors: {
        primary: '#1E3A8A',
        secondary: '#0284C7',
        text: '#0F172A',
        background: '#FFFFFF',
        border: '#E2E8F0',
        accent: '#F0F9FF'
      },
      typography: {
        font_family: 'Inter, sans-serif',
        font_scale: 'medium',
        heading_weight: 'bold',
        body_size: '9pt'
      },
      header: {
        org_name: 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY',
        chapter: 'Gombe State Chapter',
        registration_no: 'IMAN/COOP/2024/001',
        address: 'Federal Medical Centre Complex, Gombe State, Nigeria',
        phone: '+234 806 573 6114',
        email: 'info@imancooperative.org',
        website: 'www.imancooperative.org',
        contract_title: 'AGENT FINANCING AGREEMENT (WAKALA)'
      },
      logo: {
        position: 'left',
        width: 65,
        height: 65,
        show_on_print: true
      },
      sections: {
        show_logo: true,
        show_header: true,
        show_metadata: true,
        show_borrower_card: true,
        show_financing_card: true,
        show_breakdown_card: true,
        show_schedule: false,
        show_terms: true,
        show_signatures: true,
        show_stamp: true,
        show_qr_code: true,
        show_watermark: true,
        show_footer: true
      },
      terms: DEFAULT_WAKALA_TERMS,
      stamp: {
        show: true,
        text: 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY • OFFICIAL VERIFIED SEAL • GOMBE STATE',
        color: '#1E3A8A'
      },
      footer: {
        text: 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY • Agent Financing Agreement',
        show_page_number: true
      }
    }
  }
];

/**
 * Standard FMCKSMCS Contract Clauses
 */
const FMCK_DEFAULT_LOAN_TERMS = [
  {
    clause_no: 1,
    title: 'LOAN & FINANCING DECLARATION',
    text: 'Federal Medical Centre Kumo Staff Multi-Purpose Cooperative Society Ltd ("Cooperative") approves and disburses the credit or financing facility to the Member ("Borrower") under the terms, conditions, and repayment schedule specified herein.'
  },
  {
    clause_no: 2,
    title: 'DISBURSEMENT & COMMENCEMENT',
    text: 'The Borrower confirms receipt or designated electronic remittance of the approved principal sum into their verified salary account and unconditionally accepts responsibility for scheduled monthly amortisation.'
  },
  {
    clause_no: 3,
    title: 'PAYROLL DEDUCTION & REPAYMENT COMMITMENT',
    text: 'The Borrower irrevocably authorizes Federal Medical Centre Kumo / IPPIS payroll department and the Cooperative to deduct the agreed consecutive monthly installments directly from their monthly remuneration until the facility is fully liquidated.'
  },
  {
    clause_no: 4,
    title: 'DEFAULT & COOPERATIVE RECOVERY REMEDIES',
    text: 'In the event of default, salary stoppage, or delay in repayment, the Cooperative reserves the full right to place a lien on the member\'s monthly thrift savings, dividend allocations, terminal benefits, and call upon the approved guarantor(s) in accordance with Cooperative Bye-Laws.'
  },
  {
    clause_no: 5,
    title: 'EARLY LIQUIDATION POLICY',
    text: 'The Borrower may liquidate the outstanding loan principal early at any time without penalty fees upon formal written notification to the Cooperative Secretariat.'
  },
  {
    clause_no: 6,
    title: 'BINDING ELECTRONIC ACCEPTANCE',
    text: 'The Borrower acknowledges that digital confirmation and electronic acceptance through the FMCKSMCS Member Portal constitutes an authentic, irrevocable, and legally binding contract under the Nigerian Evidence Act and Cooperative Societies Regulations.'
  }
];

const FMCK_DEFAULT_WAKALA_TERMS = [
  {
    clause_no: 1,
    title: 'AGENCY APPOINTMENT & FINANCING (WAKALA)',
    text: 'The Member ("Principal") appoints Federal Medical Centre Kumo Staff MPCS Ltd ("Agent") as its non-exclusive agent to purchase, inspect, and deliver goods/commodities on behalf of the Member using the approved financing facility.'
  },
  {
    clause_no: 2,
    title: 'FIDUCIARY RESPONSIBILITY & DUE CARE',
    text: 'The Agent shall exercise due diligence, care, and good faith in executing the procurement according to the specifications agreed with the Member.'
  },
  {
    clause_no: 3,
    title: 'DISCLOSURE & AUDIT INSPECTION',
    text: 'All supplier receipts, delivery waybills, and procurement records shall remain accessible for Member review and official cooperative audit verification.'
  }
];

/**
 * Built-in default document templates for FMCKSMCS tenant
 */
const FMCK_DEFAULT_DOC_TEMPLATES = [
  {
    name: 'Official FMCKSMCS Loan Agreement',
    type: 'murabaha_contract',
    version: 1,
    is_active: true,
    is_default: true,
    tenant_id: 'fmcksmcs',
    layout_config: {
      theme: 'fmck_emerald',
      colors: {
        primary: '#03490b',
        secondary: '#5cd674',
        text: '#111827',
        background: '#FFFFFF',
        border: '#DCFCE7',
        accent: '#F0FDF4'
      },
      typography: {
        font_family: 'Inter, sans-serif',
        font_scale: 'medium',
        heading_weight: 'bold',
        body_size: '9pt'
      },
      header: {
        org_name: 'Federal Medical Centre Kumo Staff MPCS Ltd',
        chapter: 'Federal Medical Centre Kumo',
        registration_no: 'FMCK/MPCS/2024/001',
        address: 'Federal Medical Centre Kumo, Gombe State, Nigeria',
        phone: '+234 810 588 0201',
        email: 'info@fmcksmcs.com',
        website: 'www.fmcksmcs.com',
        contract_title: 'LOAN & FINANCING AGREEMENT'
      },
      logo: {
        url: '/fmck-logo.png',
        position: 'left',
        width: 65,
        height: 65,
        show_on_print: true
      },
      sections: {
        show_logo: true,
        show_header: true,
        show_metadata: true,
        show_borrower_card: true,
        show_financing_card: true,
        show_breakdown_card: true,
        show_schedule: true,
        show_terms: true,
        show_signatures: true,
        show_stamp: true,
        show_qr_code: true,
        show_watermark: true,
        show_footer: true
      },
      terms: FMCK_DEFAULT_LOAN_TERMS,
      stamp: {
        show: true,
        text: 'FEDERAL MEDICAL CENTRE KUMO STAFF MPCS LTD • OFFICIAL VERIFIED SEAL',
        color: '#03490b'
      },
      footer: {
        text: 'FEDERAL MEDICAL CENTRE KUMO STAFF MPCS LTD • Official Loan Agreement',
        show_page_number: true
      }
    }
  },
  {
    name: 'Staff Welfare & Financing Agreement (Wakala)',
    type: 'agent_agreement',
    version: 1,
    is_active: true,
    is_default: false,
    tenant_id: 'fmcksmcs',
    layout_config: {
      theme: 'fmck_emerald',
      colors: {
        primary: '#03490b',
        secondary: '#5cd674',
        text: '#111827',
        background: '#FFFFFF',
        border: '#DCFCE7',
        accent: '#F0FDF4'
      },
      typography: {
        font_family: 'Inter, sans-serif',
        font_scale: 'medium',
        heading_weight: 'bold',
        body_size: '9pt'
      },
      header: {
        org_name: 'Federal Medical Centre Kumo Staff MPCS Ltd',
        chapter: 'Federal Medical Centre Kumo',
        registration_no: 'FMCK/MPCS/2024/001',
        address: 'Federal Medical Centre Kumo, Gombe State, Nigeria',
        phone: '+234 810 588 0201',
        email: 'info@fmcksmcs.com',
        website: 'www.fmcksmcs.com',
        contract_title: 'STAFF WELFARE & FINANCING AGREEMENT'
      },
      logo: {
        url: '/fmck-logo.png',
        position: 'left',
        width: 65,
        height: 65,
        show_on_print: true
      },
      sections: {
        show_logo: true,
        show_header: true,
        show_metadata: true,
        show_borrower_card: true,
        show_financing_card: true,
        show_breakdown_card: true,
        show_schedule: false,
        show_terms: true,
        show_signatures: true,
        show_stamp: true,
        show_qr_code: true,
        show_watermark: true,
        show_footer: true
      },
      terms: FMCK_DEFAULT_WAKALA_TERMS,
      stamp: {
        show: true,
        text: 'FEDERAL MEDICAL CENTRE KUMO STAFF MPCS LTD • OFFICIAL VERIFIED SEAL',
        color: '#03490b'
      },
      footer: {
        text: 'FEDERAL MEDICAL CENTRE KUMO STAFF MPCS LTD • Staff Welfare Agreement',
        show_page_number: true
      }
    }
  }
];

/**
 * Helper to determine clean tenant ID
 */
function getResolvedTenantId(req) {
  const tid = req.tenantId || req.tenant?.id || req.headers['x-tenant-id'] || req.query?.tenant || 'default';
  const clean = String(tid).toLowerCase().trim();
  if (clean === 'fmcksmcs' || clean === 'fmck') return 'fmcksmcs';
  return clean || 'default';
}

/**
 * Ensure database tables and default seed templates exist per tenant
 */
async function ensureTablesAndDefaultsExist(tenantId = 'default') {
  try {
    const isFmck = tenantId === 'fmcksmcs' || tenantId === 'fmck';
    const targetTenant = isFmck ? 'fmcksmcs' : 'default';

    await DocumentTemplate.sync();
    await DocumentTemplateVersion.sync();

    // Idempotent column check for production
    try {
      await sequelize.query(`
        ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
        ALTER TABLE document_template_versions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
      `);
    } catch (colErr) {
      // Column may already exist or running SQLite in memory
    }

    const count = await DocumentTemplate.count({ where: { tenant_id: targetTenant } });
    if (count === 0) {
      const templatesToSeed = isFmck ? FMCK_DEFAULT_DOC_TEMPLATES : DEFAULT_DOC_TEMPLATES;
      for (const tpl of templatesToSeed) {
        const toCreate = { ...tpl, tenant_id: targetTenant };
        const created = await DocumentTemplate.create(toCreate);
        await DocumentTemplateVersion.create({
          template_id: created.id,
          version: 1,
          layout_config: created.layout_config,
          change_summary: isFmck ? 'Initial FMCKSMCS official template' : 'Initial system default template',
          tenant_id: targetTenant
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('ensureTablesAndDefaultsExist notice:', err.message);
  }
}

/**
 * GET /document-templates
 * Fetch all document templates scoped to active tenant
 */
exports.getTemplates = async (req, res) => {
  try {
    const tenantId = getResolvedTenantId(req);
    await ensureTablesAndDefaultsExist(tenantId);

    const templates = await DocumentTemplate.findAll({
      where: { tenant_id: tenantId },
      order: [['is_default', 'DESC'], ['id', 'ASC']]
    });
    return res.json({ success: true, templates });
  } catch (error) {
    console.error('getTemplates error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve document templates' });
  }
};

/**
 * GET /document-templates/:id
 * Fetch single document template
 */
exports.getTemplateById = async (req, res) => {
  try {
    const tenantId = getResolvedTenantId(req);
    await ensureTablesAndDefaultsExist(tenantId);
    const { id } = req.params;

    const template = await DocumentTemplate.findOne({
      where: { id, tenant_id: tenantId }
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Document template not found' });
    }
    return res.json({ success: true, template });
  } catch (error) {
    console.error('getTemplateById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve document template' });
  }
};

/**
 * PUT /document-templates/:id
 * Update document template, bump version and record version history
 */
exports.updateTemplate = async (req, res) => {
  try {
    const tenantId = getResolvedTenantId(req);
    await ensureTablesAndDefaultsExist(tenantId);
    const { id } = req.params;
    const { name, layout_config, change_summary, is_active } = req.body;
    const userId = req.user ? req.user.id : null;

    const template = await DocumentTemplate.findOne({
      where: { id, tenant_id: tenantId }
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Document template not found' });
    }

    const newVersion = (template.version || 1) + 1;

    template.name = name || template.name;
    template.layout_config = layout_config || template.layout_config;
    if (is_active !== undefined) template.is_active = is_active;
    template.version = newVersion;
    template.updated_by = userId;
    await template.save();

    // Create immutable version record with auto-sync retry
    try {
      await DocumentTemplateVersion.create({
        template_id: template.id,
        version: newVersion,
        layout_config: template.layout_config,
        change_summary: change_summary || `Updated contract template to v${newVersion}`,
        created_by: userId,
        tenant_id: tenantId
      });
    } catch (verErr) {
      console.warn('DocumentTemplateVersion insert failed, syncing and retrying:', verErr.message);
      await DocumentTemplateVersion.sync();
      await DocumentTemplateVersion.create({
        template_id: template.id,
        version: newVersion,
        layout_config: template.layout_config,
        change_summary: change_summary || `Updated contract template to v${newVersion}`,
        created_by: userId,
        tenant_id: tenantId
      });
    }

    if (ActivityLog && typeof ActivityLog.logActivity === 'function') {
      await ActivityLog.logActivity(
        userId,
        'DOCUMENT_TEMPLATE_UPDATED',
        'document_template',
        template.id,
        `Updated document template "${template.name}" to v${newVersion}`,
        { templateId: template.id, version: newVersion, changeSummary: change_summary },
        req
      ).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Document template updated to version ${newVersion}`,
      template
    });
  } catch (error) {
    console.error('updateTemplate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update document template' });
  }
};

/**
 * GET /document-templates/:id/versions
 * Get all historical versions of a document template
 */
exports.getVersions = async (req, res) => {
  try {
    const tenantId = getResolvedTenantId(req);
    await ensureTablesAndDefaultsExist(tenantId);
    const { id } = req.params;
    const versions = await DocumentTemplateVersion.findAll({
      where: { template_id: id },
      order: [['version', 'DESC']]
    });
    return res.json({ success: true, versions });
  } catch (error) {
    console.error('getVersions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve template versions' });
  }
};

/**
 * POST /document-templates/:id/restore/:versionId
 * Rollback template to a previous version
 */
exports.restoreVersion = async (req, res) => {
  try {
    const tenantId = getResolvedTenantId(req);
    await ensureTablesAndDefaultsExist(tenantId);
    const { id, versionId } = req.params;
    const userId = req.user ? req.user.id : null;

    const template = await DocumentTemplate.findOne({
      where: { id, tenant_id: tenantId }
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Document template not found' });
    }

    const versionRecord = await DocumentTemplateVersion.findOne({
      where: { id: versionId, template_id: id }
    });

    if (!versionRecord) {
      return res.status(404).json({ success: false, message: 'Historical version not found' });
    }

    const newVersion = (template.version || 1) + 1;
    template.layout_config = versionRecord.layout_config;
    template.version = newVersion;
    template.updated_by = userId;
    await template.save();

    await DocumentTemplateVersion.create({
      template_id: template.id,
      version: newVersion,
      layout_config: template.layout_config,
      change_summary: `Restored layout from historical version ${versionRecord.version}`,
      created_by: userId,
      tenant_id: tenantId
    });

    if (ActivityLog && typeof ActivityLog.logActivity === 'function') {
      await ActivityLog.logActivity(
        userId,
        'DOCUMENT_TEMPLATE_RESTORED',
        'document_template',
        template.id,
        `Restored document template "${template.name}" from v${versionRecord.version} to v${newVersion}`,
        { templateId: template.id, restoredFrom: versionRecord.version, newVersion },
        req
      ).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Template successfully restored to version ${versionRecord.version} (now saved as v${newVersion})`,
      template
    });
  } catch (error) {
    console.error('restoreVersion error:', error);
    return res.status(500).json({ success: false, message: 'Failed to restore template version' });
  }
};

/**
 * POST /document-templates/:id/reset
 * Reset template to system factory preset according to tenant
 */
exports.resetToDefault = async (req, res) => {
  try {
    const tenantId = getResolvedTenantId(req);
    await ensureTablesAndDefaultsExist(tenantId);
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const template = await DocumentTemplate.findOne({
      where: { id, tenant_id: tenantId }
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Document template not found' });
    }

    const isFmck = tenantId === 'fmcksmcs';
    const presetList = isFmck ? FMCK_DEFAULT_DOC_TEMPLATES : DEFAULT_DOC_TEMPLATES;
    const defaultPreset = presetList.find(t => t.type === template.type) || presetList[0];
    const newVersion = (template.version || 1) + 1;

    template.layout_config = defaultPreset.layout_config;
    template.version = newVersion;
    template.updated_by = userId;
    await template.save();

    await DocumentTemplateVersion.create({
      template_id: template.id,
      version: newVersion,
      layout_config: template.layout_config,
      change_summary: `Reset template to ${isFmck ? 'FMCKSMCS' : 'standard'} factory default baseline`,
      created_by: userId,
      tenant_id: tenantId
    });

    return res.json({
      success: true,
      message: 'Template reset to factory default successfully',
      template
    });
  } catch (error) {
    console.error('resetToDefault error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset template' });
  }
};

/**
 * POST /document-templates/test-print
 * Generate sample watermarked A4 contract PDF using active or customized layout
 * Strictly preview only: NO financial transactions or contract rows are altered.
 */
exports.testPrintContract = async (req, res) => {
  try {
    const tenantId = getResolvedTenantId(req);
    const isFmck = tenantId === 'fmcksmcs';
    const defaultList = isFmck ? FMCK_DEFAULT_DOC_TEMPLATES : DEFAULT_DOC_TEMPLATES;

    const layoutConfig = req.body.layout_config ||
      (await DocumentTemplate.findOne({ where: { is_default: true, tenant_id: tenantId } }))?.layout_config ||
      defaultList[0].layout_config;

    const sampleContractData = isFmck ? {
      id: 152,
      agreement_reference: 'FMCK-AG-00152',
      loan_id: 234,
      type: req.body.type || 'murabaha_contract',
      version: '1.0',
      status: 'accepted',
      created_at: new Date(),
      action_timestamp: new Date(),
      signature_reference: `FMCK-SIG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-38762`,
      borrower_name: 'Mohammed Kabir Ahmed',
      borrower_psn: '38762',
      borrower_email: 'mkabirahmed143@gmail.com',
      borrower_phone: '0810 588 0201',
      borrower_facility: 'Federal Medical Centre Kumo, Gombe State',
      principal_amount: 800000,
      profit_markup: 80000,
      total_sale_price: 880000,
      tenure_months: 7,
      monthly_repayment: 125714.28,
      ip_address: req.ip || '197.210.55.102',
      first_repayment_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      repayments: [
        { installment_no: 1, repayment_date: '2026-10-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 2, repayment_date: '2026-11-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 3, repayment_date: '2026-12-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 4, repayment_date: '2027-01-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 5, repayment_date: '2027-02-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 6, repayment_date: '2027-03-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 7, repayment_date: '2027-04-25', amount: 125714.28, status: 'SCHEDULED' }
      ]
    } : {
      id: 152,
      agreement_reference: 'AG-00152',
      loan_id: 234,
      type: req.body.type || 'murabaha_contract',
      version: '1.0',
      status: 'accepted',
      created_at: new Date(),
      action_timestamp: new Date(),
      signature_reference: `SIG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-38762`,
      borrower_name: 'Mohammed Kabir Ahmed',
      borrower_psn: '38762',
      borrower_email: 'mkabirahmed143@gmail.com',
      borrower_phone: '0806 573 6114',
      borrower_facility: 'Federal Medical Centre Complex, Gombe State',
      principal_amount: 800000,
      profit_markup: 80000,
      total_sale_price: 880000,
      tenure_months: 7,
      monthly_repayment: 125714.28,
      ip_address: req.ip || '197.210.55.102',
      first_repayment_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      repayments: [
        { installment_no: 1, repayment_date: '2026-10-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 2, repayment_date: '2026-11-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 3, repayment_date: '2026-12-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 4, repayment_date: '2027-01-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 5, repayment_date: '2027-02-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 6, repayment_date: '2027-03-25', amount: 125714.28, status: 'SCHEDULED' },
        { installment_no: 7, repayment_date: '2027-04-25', amount: 125714.28, status: 'SCHEDULED' }
      ]
    };

    const pdfBuffer = await generateContractPdf(layoutConfig, sampleContractData, { isTest: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${isFmck ? 'sample_fmck_loan_contract.pdf' : 'sample_murabaha_sales_contract.pdf'}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('testPrintContract error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate sample contract PDF' });
  }
};

/**
 * GET /loans/agreements/verify/:ref (Public Endpoint)
 * Public agreement verification: Returns safe authenticated metadata and masked borrower PII
 */
exports.verifyAgreementPublic = async (req, res) => {
  try {
    const { ref } = req.params;
    let agreement = null;

    // Check if ref is AG-00XXX or direct ID
    if (/^AG-\d+$/i.test(ref) || /^FMCK-AG-\d+$/i.test(ref)) {
      const idNum = parseInt(ref.replace(/^(FMCK-)?AG-0*/i, ''), 10);
      agreement = await LoanAgreement.findByPk(idNum, {
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
        ]
      });
    } else if (!isNaN(parseInt(ref, 10))) {
      agreement = await LoanAgreement.findByPk(parseInt(ref, 10), {
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
        ]
      });
    }

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'No official agreement matching this verification reference was found in the cooperative registry.'
      });
    }

    const user = agreement.user || {};
    const membership = user.membershipApplication || {};
    const rawName = membership.name || user.name || 'Member';
    const rawPsn = membership.psn || '00000';
    const userTenant = user.tenant_id || membership.tenant_id || 'default';
    const isFmck = userTenant === 'fmcksmcs' || userTenant === 'fmck';

    // Mask member name (e.g. M**** K**** A****)
    const maskedName = rawName
      .split(' ')
      .map(part => part.length > 1 ? part[0] + '*'.repeat(Math.min(part.length - 1, 4)) : part)
      .join(' ');

    // Mask PSN (e.g. ***62)
    const maskedPsn = rawPsn.length > 2
      ? '*'.repeat(rawPsn.length - 2) + rawPsn.slice(-2)
      : '***';

    return res.json({
      success: true,
      verified: true,
      agreement: {
        agreement_reference: isFmck ? `FMCK-AG-${String(agreement.id).padStart(5, '0')}` : `AG-${String(agreement.id).padStart(5, '0')}`,
        loan_id: `#${agreement.loan_id}`,
        contract_type: agreement.type === 'agent_agreement' ? 'Staff Welfare & Financing Agreement' : (isFmck ? 'Official Loan Agreement' : 'Murabaha Sales Contract'),
        status: agreement.status.toUpperCase(),
        version: `v${agreement.version || '1.0'}`,
        signing_date: agreement.created_at || agreement.action_timestamp,
        signature_reference: agreement.signature_reference || `SIG-${new Date(agreement.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${maskedPsn}`,
        organization: isFmck ? 'Federal Medical Centre Kumo Staff MPCS Ltd' : 'IMAN Multipurpose Cooperative Society',
        chapter: isFmck ? 'Federal Medical Centre Kumo' : 'Gombe State Chapter',
        masked_member: {
          name: maskedName,
          psn: maskedPsn
        }
      }
    });
  } catch (error) {
    console.error('verifyAgreementPublic error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify agreement' });
  }
};
