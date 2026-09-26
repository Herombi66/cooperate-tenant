const { DocumentTemplate, DocumentTemplateVersion, LoanAgreement, Loan, User, MembershipApplication, ActivityLog } = require('../models');
const { generateContractPdf, DEFAULT_MURABAHA_TERMS, DEFAULT_WAKALA_TERMS } = require('../utils/contractPdfGenerator');

/**
 * Built-in default document templates
 */
const DEFAULT_DOC_TEMPLATES = [
  {
    name: 'Official Murabaha Sales Contract',
    type: 'murabaha_contract',
    version: 1,
    is_active: true,
    is_default: true,
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
 * Ensure database tables and default seed templates exist
 */
async function ensureTablesAndDefaultsExist() {
  try {
    await DocumentTemplate.sync();
    await DocumentTemplateVersion.sync();

    const count = await DocumentTemplate.count();
    if (count === 0) {
      for (const tpl of DEFAULT_DOC_TEMPLATES) {
        const created = await DocumentTemplate.create(tpl);
        await DocumentTemplateVersion.create({
          template_id: created.id,
          version: 1,
          layout_config: created.layout_config,
          change_summary: 'Initial system default template'
        });
      }
    }
  } catch (err) {
    console.warn('ensureTablesAndDefaultsExist notice:', err.message);
  }
}

/**
 * GET /document-templates
 * Fetch all document templates (with auto-seed fallback)
 */
exports.getTemplates = async (req, res) => {
  try {
    await ensureTablesAndDefaultsExist();
    const templates = await DocumentTemplate.findAll({
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
    await ensureTablesAndDefaultsExist();
    const { id } = req.params;
    const template = await DocumentTemplate.findByPk(id);
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
    await ensureTablesAndDefaultsExist();
    const { id } = req.params;
    const { name, layout_config, change_summary, is_active } = req.body;
    const userId = req.user ? req.user.id : null;

    const template = await DocumentTemplate.findByPk(id);
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
        created_by: userId
      });
    } catch (verErr) {
      console.warn('DocumentTemplateVersion insert failed, syncing and retrying:', verErr.message);
      await DocumentTemplateVersion.sync();
      await DocumentTemplateVersion.create({
        template_id: template.id,
        version: newVersion,
        layout_config: template.layout_config,
        change_summary: change_summary || `Updated contract template to v${newVersion}`,
        created_by: userId
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
    await ensureTablesAndDefaultsExist();
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
    await ensureTablesAndDefaultsExist();
    const { id, versionId } = req.params;
    const userId = req.user ? req.user.id : null;

    const template = await DocumentTemplate.findByPk(id);
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
      created_by: userId
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
 * Reset template to system factory preset
 */
exports.resetToDefault = async (req, res) => {
  try {
    await ensureTablesAndDefaultsExist();
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const template = await DocumentTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Document template not found' });
    }

    const defaultPreset = DEFAULT_DOC_TEMPLATES.find(t => t.type === template.type) || DEFAULT_DOC_TEMPLATES[0];
    const newVersion = (template.version || 1) + 1;

    template.layout_config = defaultPreset.layout_config;
    template.version = newVersion;
    template.updated_by = userId;
    await template.save();

    await DocumentTemplateVersion.create({
      template_id: template.id,
      version: newVersion,
      layout_config: template.layout_config,
      change_summary: 'Reset template to system factory default',
      created_by: userId
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
    const layoutConfig = req.body.layout_config || (await DocumentTemplate.findOne({ where: { is_default: true } }))?.layout_config || DEFAULT_DOC_TEMPLATES[0].layout_config;

    const sampleContractData = {
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
      borrower_facility: 'Federal Medical Centre / Ministry of Health',
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
    res.setHeader('Content-Disposition', 'attachment; filename="sample_murabaha_sales_contract.pdf"');
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
    if (/^AG-\d+$/i.test(ref)) {
      const idNum = parseInt(ref.replace(/^AG-0*/i, ''), 10);
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
        agreement_reference: `AG-${String(agreement.id).padStart(5, '0')}`,
        loan_id: `#${agreement.loan_id}`,
        contract_type: agreement.type === 'agent_agreement' ? 'Agent Agreement (Wakala)' : 'Murabaha Sales Contract',
        status: agreement.status.toUpperCase(),
        version: `v${agreement.version || '1.0'}`,
        signing_date: agreement.created_at || agreement.action_timestamp,
        signature_reference: agreement.signature_reference || `SIG-${new Date(agreement.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${maskedPsn}`,
        organization: 'IMAN Multipurpose Cooperative Society',
        chapter: 'Gombe State Chapter',
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
