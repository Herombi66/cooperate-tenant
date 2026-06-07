const request = require('supertest');
const app = require('../app');
const { sequelize, User, MembershipApplication, Loan, Expense, Contribution, ProfitShare, Settings, ActivityLog } = require('../models');
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

describe('Reports API - Compliance, Loan Portfolio, Expenses', () => {
  let adminToken;
  let adminUser;

  jest.setTimeout(60000);

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.NODE_ENV = 'test';

    await sequelize.sync({ force: true });

    const membership = await MembershipApplication.create({
      name: 'Reports Admin',
      psn: 'REPORTS_ADMIN_001',
      email: 'reports_admin@example.com',
      phone: '08000000000',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Next Of Kin',
      next_of_kin_phone: '08000000001',
      status: 'approved',
      application_date: new Date(),
      target_saving: 50000
    });

    adminUser = await User.create({
      membership_application_id: membership.id,
      password_hash: 'hashedpassword',
      role: 'admin',
      status: 'active'
    });

    adminToken = jwt.sign(
      { id: adminUser.id, role: adminUser.role, name: membership.name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await Settings.bulkCreate([
      { key: 'registration_fee', value: '1500' },
      { key: 'monthly_admin_fee', value: '1000' },
      { key: 'reserve_fund_percentage', value: '10' },
      { key: 'education_fund_percentage', value: '5' },
      { key: 'committee_bonus_percentage', value: '5' },
      { key: 'bad_debt_reserve_percentage', value: '3.5' },
      { key: 'general_reserve_percentage', value: '2.8' }
    ]);

    await Loan.bulkCreate([
      {
        user_id: adminUser.id,
        loan_type: 'cash',
        amount_requested: 50000,
        amount_approved: 50000,
        repayment_period_months: 10,
        total_repayment: 50000,
        monthly_repayment: 5000,
        status: 'approved'
      },
      {
        user_id: adminUser.id,
        loan_type: 'cash',
        amount_requested: 75000,
        amount_approved: 75000,
        repayment_period_months: 15,
        total_repayment: 75000,
        monthly_repayment: 5000,
        status: 'disbursed'
      }
    ]);

    await Contribution.bulkCreate([
      {
        user_id: adminUser.id,
        savings: 5000,
        investment: 0,
        target_saving: 0,
        total_amount: 5000,
        month: 1,
        year: 2025,
        status: 'approved',
        payment_method: 'cash',
        contribution_date: new Date('2025-01-10T00:00:00.000Z')
      },
      {
        user_id: adminUser.id,
        savings: 2000,
        investment: 3000,
        target_saving: 0,
        total_amount: 5000,
        month: 1,
        year: 2025,
        status: 'approved',
        payment_method: 'cash',
        contribution_date: new Date('2025-01-20T00:00:00.000Z')
      }
    ]);

    await Expense.bulkCreate([
      {
        description: 'Office rent',
        category: 'rent',
        amount: 100000,
        status: 'paid',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      },
      {
        description: 'Utilities',
        category: 'utilities',
        amount: 50000,
        status: 'paid',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      }
    ]);

    await ProfitShare.bulkCreate([
      {
        user_id: adminUser.id,
        period: '2025-M01',
        total_investment_pool: 100000,
        total_profit: 20000,
        member_investment: 5000,
        share_percentage: 5,
        profit_amount: 1000,
        status: 'paid'
      },
      {
        user_id: adminUser.id,
        period: '2025-M02',
        total_investment_pool: 120000,
        total_profit: 24000,
        member_investment: 5000,
        share_percentage: 4.17,
        profit_amount: 1000,
        status: 'paid'
      }
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('returns loan portfolio report data and logs activity', async () => {
    const res = await request(app)
      .get('/reports/loans')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report).toBeDefined();
    expect(Array.isArray(res.body.report.portfolioSummary)).toBe(true);

    const log = await ActivityLog.findOne({
      where: { user_id: adminUser.id, action: 'VIEW_REPORT', resource_type: 'report' },
      order: [['created_at', 'DESC']]
    });

    expect(log).not.toBeNull();
  });

  it('returns expense analysis report data and logs activity', async () => {
    const res = await request(app)
      .get('/reports/expenses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report).toBeDefined();
    expect(res.body.report.totalExpenses).toBeGreaterThan(0);
    expect(Number(res.headers['x-report-gen-ms'] || 0)).toBeGreaterThanOrEqual(0);

    const log = await ActivityLog.findOne({
      where: { user_id: adminUser.id, action: 'VIEW_REPORT', resource_type: 'report' },
      order: [['created_at', 'DESC']]
    });

    expect(log).not.toBeNull();
  });

  it('returns compliance and audit report data and logs activity', async () => {
    const res = await request(app)
      .get('/reports/compliance')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report).toBeDefined();
    expect(res.body.report.complianceStatus).toBeDefined();

    const log = await ActivityLog.findOne({
      where: { user_id: adminUser.id, action: 'VIEW_REPORT', resource_type: 'report' },
      order: [['created_at', 'DESC']]
    });

    expect(log).not.toBeNull();
  });

  it('returns financial report data', async () => {
    const res = await request(app)
      .get('/reports/financial?period=2025')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report).toBeDefined();
    expect(res.body.report.totalContributions).toBeGreaterThan(0);
    expect(Number(res.headers['x-report-gen-ms'] || 0)).toBeGreaterThanOrEqual(0);
  });

  it('returns member report data', async () => {
    const res = await request(app)
      .get('/reports/members?period=2025')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report).toBeDefined();
    expect(res.body.report.memberStats).toBeDefined();
  });

  it('returns profit sharing report data via both routes', async () => {
    const a = await request(app)
      .get('/reports/profit-sharing?period=2025')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(a.status).toBe(200);
    expect(a.body.success).toBe(true);
    expect(a.body.report).toBeDefined();
    expect(a.body.report.summary).toBeDefined();

    const b = await request(app)
      .get('/reports/profit-share?period=2025')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(b.status).toBe(200);
    expect(b.body.success).toBe(true);
  });

  it('returns financial tracking report data', async () => {
    const res = await request(app)
      .get('/reports/financial-tracking?period=2025')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report).toBeDefined();
    expect(res.body.report.adminFees).toBeDefined();
  });
});
