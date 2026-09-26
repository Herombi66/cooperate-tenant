process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_document_secret_12345';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const {
  sequelize,
  User,
  MembershipApplication,
  DocumentTemplate,
  DocumentTemplateVersion,
  LoanAgreement,
  Loan
} = require('../models');

describe('Document Template Designer & Murabaha Contract API', () => {
  let adminUser;
  let adminToken;
  let memberUser;
  let memberToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // 1. Admin User Setup
    const adminApp = await MembershipApplication.create({
      name: 'System Admin',
      psn: 'ADMIN-01',
      email: 'admin.designer@imanmcs.local',
      phone: '08011112222',
      facility_name: 'HQ Secretariat',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '08011112223',
      status: 'approved'
    });
    adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: 'hashedpassword',
      role: 'admin',
      status: 'active'
    });
    adminToken = jwt.sign({ id: adminUser.id, role: 'admin' }, process.env.JWT_SECRET);

    // 2. Member User Setup
    const memberApp = await MembershipApplication.create({
      name: 'Mohammed Kabir Ahmed',
      psn: '38762',
      email: 'mkabirahmed143@gmail.com',
      phone: '08065736114',
      facility_name: 'Federal Medical Centre, Gombe',
      next_of_kin_name: 'Amina Kabir',
      next_of_kin_phone: '08012345678',
      status: 'approved'
    });
    memberUser = await User.create({
      membership_application_id: memberApp.id,
      password_hash: 'hashedpassword',
      role: 'member',
      status: 'active'
    });
    memberToken = jwt.sign({ id: memberUser.id, role: 'member' }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('1. Template Auto-Seeding & Retrieval', () => {
    it('GET /document-templates should auto-seed default templates and return them', async () => {
      const res = await request(app)
        .get('/document-templates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.templates)).toBe(true);
      expect(res.body.templates.length).toBeGreaterThanOrEqual(2);

      const murabahaTpl = res.body.templates.find(t => t.type === 'murabaha_contract');
      expect(murabahaTpl).toBeDefined();
      expect(murabahaTpl.name).toContain('Murabaha');
      expect(murabahaTpl.layout_config.colors.primary).toBe('#047857');
      expect(murabahaTpl.version).toBe(1);
    });

    it('GET /document-templates/:id should retrieve specific template', async () => {
      const allRes = await request(app)
        .get('/document-templates')
        .set('Authorization', `Bearer ${adminToken}`);

      const firstId = allRes.body.templates[0].id;

      const res = await request(app)
        .get(`/document-templates/${firstId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.template.id).toBe(firstId);
    });
  });

  describe('2. Customization, Versioning & Rollback', () => {
    let templateId;

    it('PUT /document-templates/:id should update layout, bump version and create version history', async () => {
      const allRes = await request(app)
        .get('/document-templates')
        .set('Authorization', `Bearer ${adminToken}`);

      templateId = allRes.body.templates[0].id;
      const initialVersion = allRes.body.templates[0].version;

      const updatedLayout = {
        ...allRes.body.templates[0].layout_config,
        colors: {
          ...allRes.body.templates[0].layout_config.colors,
          primary: '#1E3A8A' // Royal Navy
        },
        header: {
          ...allRes.body.templates[0].layout_config.header,
          chapter: 'Bauchi State Chapter'
        }
      };

      const res = await request(app)
        .put(`/document-templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Customized Murabaha Contract',
          layout_config: updatedLayout,
          change_summary: 'Switched to Royal Navy and updated chapter'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.template.version).toBe(initialVersion + 1);
      expect(res.body.template.layout_config.colors.primary).toBe('#1E3A8A');

      // Verify version history record was created
      const verRes = await request(app)
        .get(`/document-templates/${templateId}/versions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verRes.status).toBe(200);
      expect(verRes.body.versions.length).toBeGreaterThanOrEqual(2);
      expect(verRes.body.versions[0].version).toBe(initialVersion + 1);
    });

    it('POST /document-templates/:id/restore/:versionId should rollback to historical version', async () => {
      const verRes = await request(app)
        .get(`/document-templates/${templateId}/versions`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Version 1 is the initial version
      const v1Record = verRes.body.versions.find(v => v.version === 1);
      expect(v1Record).toBeDefined();

      const restoreRes = await request(app)
        .post(`/document-templates/${templateId}/restore/${v1Record.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.success).toBe(true);
      // Colors should be restored to #047857
      expect(restoreRes.body.template.layout_config.colors.primary).toBe('#047857');
    });

    it('POST /document-templates/:id/reset should reset template to factory preset', async () => {
      const resetRes = await request(app)
        .post(`/document-templates/${templateId}/reset`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      expect(resetRes.body.template.layout_config.colors.primary).toBe('#047857');
    });
  });

  describe('3. Test Print & PDF Rendering', () => {
    it('POST /document-templates/test-print should return sample watermarked PDF buffer without database side-effects', async () => {
      const res = await request(app)
        .post('/document-templates/test-print')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'murabaha_contract'
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('sample_murabaha_sales_contract.pdf');
      expect(res.body).toBeDefined();
      const pdfHeader = res.body.slice(0, 5).toString();
      expect(pdfHeader).toBe('%PDF-');
    });
  });

  describe('4. Public Verification Endpoint', () => {
    it('GET /document-templates/verify/:ref should return safe metadata and masked member PII', async () => {
      const loan = await Loan.create({
        user_id: memberUser.id,
        loan_type: 'cash',
        amount_requested: 800000,
        amount_approved: 800000,
        repayment_period_months: 7,
        monthly_repayment: 125714,
        total_repayment: 880000,
        status: 'active'
      });

      const agreement = await LoanAgreement.create({
        loan_id: loan.id,
        user_id: memberUser.id,
        type: 'murabaha_contract',
        status: 'accepted',
        version: '1.0',
        signature_reference: 'SIG-20260925-38762'
      });

      const ref = `AG-${String(agreement.id).padStart(5, '0')}`;
      const res = await request(app)
        .get(`/document-templates/verify/${ref}`); // Zero auth required

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verified).toBe(true);
      expect(res.body.agreement.agreement_reference).toBe(ref);
      expect(res.body.agreement.contract_type).toBe('Murabaha Sales Contract');
      expect(res.body.agreement.status).toBe('ACCEPTED');

      // Verify PII is masked (Mohammed Kabir Ahmed -> M**** K**** A****, 38762 -> ***62)
      expect(res.body.agreement.masked_member.name).toContain('****');
      expect(res.body.agreement.masked_member.psn).toBe('***62');
      expect(res.body.agreement.masked_member.email).toBeUndefined();
    });

    it('GET /document-templates/verify/:ref should return 404 for invalid agreement reference', async () => {
      const res = await request(app).get('/document-templates/verify/AG-99999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Access Control Guard', () => {
    it('PUT /document-templates/:id should reject unauthorized member role with 403', async () => {
      const allRes = await request(app)
        .get('/document-templates')
        .set('Authorization', `Bearer ${adminToken}`);

      const tplId = allRes.body.templates[0].id;

      const res = await request(app)
        .put(`/document-templates/${tplId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Hacked Template'
        });

      expect(res.status).toBe(403);
    });
  });
});
