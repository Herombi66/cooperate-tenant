process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize, User, MembershipApplication, ActivityLog } = require('../models');

jest.mock('../services/emailService', () => ({
  initialize: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendContributionReceiptEmail: jest.fn(),
  sendLoanApplicationEmail: jest.fn(),
  sendLoanApprovedEmail: jest.fn(),
  sendLoanRejectedEmail: jest.fn(),
  sendNotificationEmail: jest.fn(),
  sendGuarantorNotificationEmail: jest.fn(),
  sendUnderReviewEmail: jest.fn(),
  sendRejectionEmail: jest.fn()
}));

describe('Membership Application Workflow (under_review + duplicate detection)', () => {
  jest.setTimeout(30000);

  let adminToken;
  let memberToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const adminMembership = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADM_MEM_001',
      email: 'admin-mem@test.local',
      phone: '0800000100',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000101',
      status: 'approved'
    });
    const adminUser = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'password',
      role: 'admin',
      status: 'active'
    });
    adminToken = jwt.sign({ id: adminUser.id }, process.env.JWT_SECRET);

    const memberMembership = await MembershipApplication.create({
      name: 'Member User',
      psn: 'MBR_MEM_100',
      email: 'member-mem@test.local',
      phone: '0800000102',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000103',
      status: 'approved'
    });
    const memberUser = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
    memberToken = jwt.sign({ id: memberUser.id }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('creates a membership application in pending status', async () => {
    const res = await request(app).post('/applications/apply').send({
      name: 'Applicant One',
      psn: 'APPL001',
      email: 'appl001@test.local',
      phone: '0800000200',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000201',
      savings: 5000,
      investment: 0,
      target_saving: 0,
      target_period: 12
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('pending');

    const stored = await MembershipApplication.findByPk(res.body.application.id);
    expect(stored).toBeTruthy();
    expect(stored.psn).toBe('APPL001');
    expect(stored.email).toBe('appl001@test.local');
  });

  it('rejects invalid PSN formats', async () => {
    const res = await request(app).post('/applications/apply').send({
      name: 'Applicant Invalid PSN',
      psn: 'INV@LID',
      email: 'appl-invalid-psn@test.local',
      phone: '0800000210',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000211',
      savings: 5000,
      investment: 0
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(String(res.body.message || '')).toMatch(/Invalid PSN format/i);
  });

  it('blocks duplicate submissions within the configured window', async () => {
    const res = await request(app).post('/applications/apply').send({
      name: 'Applicant One Duplicate',
      psn: 'APPL001',
      email: 'appl001@test.local',
      phone: '0800000200',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000201',
      savings: 5000,
      investment: 0
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBeDefined();
  });

  it('allows a new application if the previous one was rejected', async () => {
    const row = await MembershipApplication.findOne({
      where: { psn: 'APPL001' },
      order: [['application_date', 'ASC']]
    });
    await row.update({ status: 'rejected' });

    const res = await request(app).post('/applications/apply').send({
      name: 'Applicant One Retry',
      psn: 'APPL001',
      email: 'appl001@test.local',
      phone: '0800000200',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000201',
      savings: 5000,
      investment: 0
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('denies non-admin users from updating membership application status', async () => {
    const row = await MembershipApplication.findOne({
      where: { psn: 'APPL001', status: 'pending' },
      order: [['application_date', 'DESC']]
    });

    const res = await request(app)
      .put(`/applications/${row.id}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'under_review', review_notes: 'Trying to review' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows admin to move a pending membership application to under_review and logs activity', async () => {
    const row = await MembershipApplication.findOne({
      where: { psn: 'APPL001', status: 'pending' },
      order: [['application_date', 'DESC']]
    });

    const res = await request(app)
      .put(`/applications/${row.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'under_review', review_notes: 'Review started' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('under_review');

    const log = await ActivityLog.findOne({
      where: {
        action: 'membership_application_status_changed',
        resource_type: 'membership_application',
        resource_id: row.id
      },
      order: [['created_at', 'DESC']]
    });
    expect(log).not.toBeNull();
  });

  (sequelize.getDialect() === 'postgres' ? it : it.skip)(
    'blocks concurrent duplicate submissions (one succeeds, one conflicts)',
    async () => {
      const payload = {
        name: 'Concurrent Applicant',
        psn: 'APPL_CONC_01',
        email: 'appl-conc@test.local',
        phone: '0800000300',
        facility_name: 'Facility',
        next_of_kin_name: 'Nok',
        next_of_kin_phone: '0800000301',
        savings: 5000,
        investment: 0
      };

      const [a, b] = await Promise.allSettled([
        request(app).post('/applications/apply').send(payload),
        request(app).post('/applications/apply').send(payload)
      ]);

      const statuses = [a, b]
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value.status)
        .sort();

      expect(statuses).toEqual([200, 409]);
    }
  );
});
