process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_receipt_secret_12345';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const {
  sequelize,
  User,
  MembershipApplication,
  ReceiptTemplate,
  ReceiptTemplateVersion,
  ReceiptRecord,
  ActivityLog
} = require('../models');
const { issueReceiptRecord } = require('../controllers/receiptTemplateController');

describe('Custom Receipt Designer & Verification API', () => {
  let adminUser;
  let adminToken;
  let treasurerUser;
  let treasurerToken;
  let memberUser;
  let memberToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // 1. Admin User
    const adminApp = await MembershipApplication.create({
      name: 'Receipt Administrator',
      psn: 'ADMIN-REC-01',
      email: 'admin.rec@imanmcs.local',
      phone: '08011112222',
      facility_name: 'HQ',
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

    // 2. Treasurer User
    const treasurerApp = await MembershipApplication.create({
      name: 'Treasury Officer',
      psn: 'TREAS-01',
      email: 'treasurer.rec@imanmcs.local',
      phone: '08022223333',
      facility_name: 'HQ',
      next_of_kin_name: 'Treas NOK',
      next_of_kin_phone: '08022223334',
      status: 'approved'
    });
    treasurerUser = await User.create({
      membership_application_id: treasurerApp.id,
      password_hash: 'hashedpassword',
      role: 'treasurer',
      status: 'active'
    });
    treasurerToken = jwt.sign({ id: treasurerUser.id, role: 'treasurer' }, process.env.JWT_SECRET);

    // 3. Regular Member User
    const memberApp = await MembershipApplication.create({
      name: 'Ibrahim Muhammad Danjuma',
      psn: 'MEM/2024/0987',
      email: 'ibrahim.danjuma@imanmcs.local',
      phone: '08033334444',
      facility_name: 'State Specialist Hospital',
      next_of_kin_name: 'Member NOK',
      next_of_kin_phone: '08033334445',
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

  describe('1. Template Seeding and Listing', () => {
    it('seeds and returns default receipt templates for authorized viewers', async () => {
      const res = await request(app)
        .get('/receipt-templates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.templates)).toBe(true);
      expect(res.body.templates.length).toBeGreaterThanOrEqual(6);

      const types = res.body.templates.map(t => t.type);
      expect(types).toContain('default');
      expect(types).toContain('contribution');
      expect(types).toContain('loan_repayment');
      expect(types).toContain('savings');
      expect(types).toContain('investment');
      expect(types).toContain('membership');
    });

    it('allows treasurer to view templates but rejects regular member', async () => {
      const treasRes = await request(app)
        .get('/receipt-templates')
        .set('Authorization', `Bearer ${treasurerToken}`);
      expect(treasRes.status).toBe(200);

      const memRes = await request(app)
        .get('/receipt-templates')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(memRes.status).toBe(403);
    });

    it('rejects unauthenticated requests to /receipt-templates with 401', async () => {
      const res = await request(app).get('/receipt-templates');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Customizing Templates & Version History', () => {
    let contributionTemplate;

    beforeAll(async () => {
      contributionTemplate = await ReceiptTemplate.findOne({ where: { type: 'contribution' } });
    });

    it('allows admin to update template layout, bumping version to v2 and saving version record', async () => {
      const updatedConfig = {
        ...contributionTemplate.layout_config,
        header: {
          ...contributionTemplate.layout_config.header,
          receipt_title: 'CUSTOM THRIFT & CONTRIBUTION RECEIPT'
        },
        colors: {
          ...contributionTemplate.layout_config.colors,
          primary: '#065F46'
        }
      };

      const res = await request(app)
        .put(`/receipt-templates/${contributionTemplate.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Customized Thrift Receipt',
          paper_size: 'A4',
          layout_config: updatedConfig,
          change_summary: 'Changed title and primary emerald color'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.template.version).toBe(2);
      expect(res.body.template.layout_config.header.receipt_title).toBe('CUSTOM THRIFT & CONTRIBUTION RECEIPT');

      // Check version history
      const versionsRes = await request(app)
        .get(`/receipt-templates/${contributionTemplate.id}/versions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(versionsRes.status).toBe(200);
      expect(versionsRes.body.versions.length).toBeGreaterThanOrEqual(2);
      expect(versionsRes.body.versions[0].version).toBe(2);
    });

    it('prevents regular members from updating templates', async () => {
      const res = await request(app)
        .put(`/receipt-templates/${contributionTemplate.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hacked Receipt' });

      expect(res.status).toBe(403);
    });

    it('allows admin to rollback to version 1', async () => {
      const versionsRes = await request(app)
        .get(`/receipt-templates/${contributionTemplate.id}/versions`)
        .set('Authorization', `Bearer ${adminToken}`);

      const v1 = versionsRes.body.versions.find(v => v.version === 1);
      expect(v1).toBeDefined();

      const rollbackRes = await request(app)
        .post(`/receipt-templates/${contributionTemplate.id}/rollback`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ version_id: v1.id });

      expect(rollbackRes.status).toBe(200);
      expect(rollbackRes.body.success).toBe(true);
      expect(rollbackRes.body.template.version).toBe(3);
      expect(rollbackRes.body.template.layout_config.header.receipt_title).toBe('CONTRIBUTION RECEIPT');
    });

    it('gracefully self-heals and creates receipt_template_versions table if it was missing', async () => {
      await sequelize.getQueryInterface().dropTable('receipt_template_versions');

      const res = await request(app)
        .put(`/receipt-templates/${contributionTemplate.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Self-Healed Receipt',
          paper_size: 'A4',
          layout_config: contributionTemplate.layout_config,
          change_summary: 'Self-healing table verification'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Test Print (Zero Ledger Effect)', () => {
    it('generates a watermarked test PDF without recording any financial transaction', async () => {
      const defaultTemplate = await ReceiptTemplate.findOne({ where: { type: 'default' } });

      const res = await request(app)
        .post('/receipt-templates/test-print')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: defaultTemplate.id,
          paper_size: 'A4'
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('receipt_test_');

      // Verify no ReceiptRecord was created for test prints
      const testRecords = await ReceiptRecord.count({
        where: { transaction_type: 'Sample' }
      });
      expect(testRecords).toBe(0);
    });
  });

  describe('4. Historical Snapshot Preservation & Public Verification', () => {
    let issuedRecord;

    beforeAll(async () => {
      // Simulate real transaction issuing an immutable receipt record
      issuedRecord = await issueReceiptRecord({
        transactionType: 'contribution',
        transactionId: 101,
        memberId: memberUser.id,
        amount: 35000.00,
        paymentMethod: 'Direct Debit',
        customItems: [{ description: 'Monthly Savings Thrift', amount: 35000.00 }]
      });
    });

    it('creates an immutable snapshot with cryptographic verification hash', () => {
      expect(issuedRecord).toBeDefined();
      expect(issuedRecord.receipt_number).toMatch(/^IMAN-REC-\d{4}-[A-F0-9]{6}$/);
      expect(Number(issuedRecord.amount)).toBe(35000.00);
      expect(issuedRecord.verification_hash).toBeDefined();
      expect(issuedRecord.snapshot_data).toBeDefined();
      expect(issuedRecord.snapshot_data.member.name).toBe('Ibrahim Muhammad Danjuma');
    });

    it('allows public verification without authentication and safely masks member PII', async () => {
      const res = await request(app)
        .get(`/receipt-templates/verify/${issuedRecord.receipt_number}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verified).toBe(true);
      expect(res.body.receipt.receipt_number).toBe(issuedRecord.receipt_number);
      expect(res.body.receipt.amount).toBe(35000.00);

      // Verify strict PII protection
      expect(res.body.receipt.masked_member_name).toBe('I*** M*** D***');
      expect(res.body.receipt.masked_member_id).toBe('MEM***87');
      expect(res.body.receipt.phone).toBeUndefined();
      expect(res.body.receipt.email).toBeUndefined();
      expect(res.body.receipt.bvn).toBeUndefined();
      expect(res.body.receipt.nin).toBeUndefined();
    });

    it('rejects invalid or tampered receipt numbers with 404', async () => {
      const res = await request(app)
        .get('/receipt-templates/verify/IMAN-REC-FAKE-999999');

      expect(res.status).toBe(404);
      expect(res.body.verified).toBe(false);
    });

    it('also verifies sample receipts dynamically for instant preview testing', async () => {
      const res = await request(app)
        .get('/receipt-templates/verify/IMAN-TEST-123456');

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);
      expect(res.body.receipt.is_sample || res.body.is_sample).toBe(true);
    });
  });
});
