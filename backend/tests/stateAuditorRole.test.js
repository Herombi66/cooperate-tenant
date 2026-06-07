const request = require('supertest');
const app = require('../app');
const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  MembershipApplication,
  Contribution,
  ContributionWithdrawal,
  Loan,
  LoanRepayment,
  ProfitShare,
  Settings,
  ActivityLog
} = require('../models');
const jwt = require('jsonwebtoken');

jest.mock('../services/emailService', () => ({
  initialize: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendContributionReceiptEmail: jest.fn(),
  sendLoanApplicationEmail: jest.fn(),
  sendLoanApprovedEmail: jest.fn(),
  sendLoanRejectedEmail: jest.fn(),
  sendNotificationEmail: jest.fn(),
  sendGuarantorNotificationEmail: jest.fn()
}));

describe('RBAC - State Auditor role', () => {
  let adminToken;
  let stateAuditorToken;
  let memberUser;
  let auditorLoginPassword;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.NODE_ENV = 'test';

    await sequelize.sync({ force: true });

    await Settings.bulkCreate([
      { key: 'registration_fee', value: '1500' },
      { key: 'monthly_admin_fee', value: '1000' },
      { key: 'reserve_fund_percentage', value: '10' },
      { key: 'education_fund_percentage', value: '5' },
      { key: 'committee_bonus_percentage', value: '5' },
      { key: 'bad_debt_reserve_percentage', value: '3.5' },
      { key: 'general_reserve_percentage', value: '2.8' }
    ]);

    const adminApp = await MembershipApplication.create({
      name: 'Admin',
      psn: 'ADMIN_001',
      email: 'admin@example.com',
      phone: '08000000001',
      facility_name: 'HQ',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08000000002',
      status: 'approved',
      savings: 3000,
      investment: 3000,
      target_saving: 1000
    });
    const adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: 'hash',
      role: 'admin',
      status: 'active'
    });
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role, name: adminApp.name }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const auditorApp = await MembershipApplication.create({
      name: 'State Auditor',
      psn: 'AUDITOR_001',
      email: 'auditor@example.com',
      phone: '08000000003',
      facility_name: 'HQ',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08000000004',
      status: 'approved',
      savings: 3000,
      investment: 3000,
      target_saving: 1000
    });
    auditorLoginPassword = 'AuditorPass123!';
    const auditorPasswordHash = await bcrypt.hash(auditorLoginPassword, 10);
    const auditorUser = await User.create({
      membership_application_id: auditorApp.id,
      password_hash: auditorPasswordHash,
      role: 'state_auditor',
      status: 'active'
    });
    stateAuditorToken = jwt.sign({ id: auditorUser.id, role: auditorUser.role, name: auditorApp.name }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const memberApp = await MembershipApplication.create({
      name: 'Member One',
      psn: 'MEM_001',
      email: 'mem1@example.com',
      phone: '08000000005',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08000000006',
      status: 'approved',
      savings: 3000,
      investment: 3000,
      target_saving: 1000
    });
    memberUser = await User.create({
      membership_application_id: memberApp.id,
      password_hash: 'hash',
      role: 'member',
      status: 'active'
    });

    await Contribution.bulkCreate([
      {
        user_id: memberUser.id,
        savings: 5000,
        investment: 0,
        target_saving: 0,
        total_amount: 5000,
        month: 1,
        year: 2026,
        status: 'approved',
        payment_method: 'cash',
        contribution_date: new Date('2026-01-05T00:00:00.000Z')
      },
      {
        user_id: memberUser.id,
        savings: 2000,
        investment: 3000,
        target_saving: 0,
        total_amount: 5000,
        month: 1,
        year: 2026,
        status: 'approved',
        payment_method: 'cash',
        contribution_date: new Date('2026-01-15T00:00:00.000Z')
      }
    ]);

    await ContributionWithdrawal.create({
      user_id: memberUser.id,
      amount: 1000,
      reason: 'Test withdrawal',
      year: 2026,
      status: 'approved'
    });

    const loan = await Loan.create({
      user_id: memberUser.id,
      loan_type: 'cash',
      amount_requested: 10000,
      amount_approved: 10000,
      repayment_period_months: 10,
      total_repayment: 10000,
      monthly_repayment: 1000,
      status: 'disbursed',
      application_date: new Date('2026-01-03T00:00:00.000Z')
    });

    await LoanRepayment.create({
      loan_id: loan.id,
      user_id: memberUser.id,
      repayment_amount: 2500,
      repayment_date: '2026-01-20',
      payment_method: 'cash',
      status: 'verified',
      recorded_by: adminUser.id
    });

    await ProfitShare.create({
      user_id: memberUser.id,
      period: '2026-M01',
      total_investment_pool: 100000,
      total_profit: 20000,
      member_investment: 5000,
      share_percentage: 5,
      profit_amount: 1000,
      status: 'paid'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('allows State Auditor to generate standard reports', async () => {
    const res = await request(app)
      .get('/reports/financial?period=2026')
      .set('Authorization', `Bearer ${stateAuditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report).toBeDefined();
  });

  it('allows State Auditor to login using PSN suffix', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ psn: 'AUDITOR_001_state_auditor', password: auditorLoginPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('state_auditor');
  });

  it('allows State Auditor to generate member statement (json/csv/pdf)', async () => {
    const jsonRes = await request(app)
      .get('/reports/member-statement?psn=MEM_001&period=2026')
      .set('Authorization', `Bearer ${stateAuditorToken}`);

    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.success).toBe(true);
    expect(jsonRes.body.report?.member?.psn).toBe('MEM_001');

    const csvRes = await request(app)
      .get('/reports/member-statement?psn=MEM_001&period=2026&format=csv')
      .set('Authorization', `Bearer ${stateAuditorToken}`);

    expect(csvRes.status).toBe(200);
    expect(String(csvRes.headers['content-type'] || '')).toContain('text/csv');

    const pdfRes = await request(app)
      .get('/reports/member-statement?psn=MEM_001&period=2026&format=pdf')
      .set('Authorization', `Bearer ${stateAuditorToken}`);

    expect(pdfRes.status).toBe(200);
    expect(String(pdfRes.headers['content-type'] || '')).toContain('application/pdf');
  });

  it('allows State Auditor to view activity logs and logs State Auditor views', async () => {
    const res = await request(app)
      .get('/dashboard/activity-logs?page=1&limit=5')
      .set('Authorization', `Bearer ${stateAuditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const log = await ActivityLog.findOne({
      where: { action: 'state_auditor_view', user_role: 'state_auditor' },
      order: [['created_at', 'DESC']]
    });
    expect(log).not.toBeNull();
  });

  it('blocks State Auditor from creating/modifying financial records', async () => {
    const postContribution = await request(app)
      .post('/contributions/by-psn')
      .set('Authorization', `Bearer ${stateAuditorToken}`)
      .send({ psn: 'MEM_001', totalAmount: 5000, month: 1, year: 2026, paymentMethod: 'cash' });

    expect(postContribution.status).toBe(403);

    const updateMember = await request(app)
      .put(`/members/${memberUser.id}`)
      .set('Authorization', `Bearer ${stateAuditorToken}`)
      .send({ status: 'suspended' });

    expect(updateMember.status).toBe(403);
  });
});
