const request = require('supertest');
const app = require('../app');
const {
  sequelize,
  User,
  MembershipApplication,
  Contribution,
  Loan,
  Expense,
  ProfitShare,
  LayyahApplication
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

describe('Chairman & Treasurer Dashboard Real-Time Overview Tests', () => {
  let chairmanToken;
  let treasurerToken;
  let memberToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
    await sequelize.sync({ force: true });

    // 1. Create Chairman user
    const chairmanApp = await MembershipApplication.create({
      name: 'Chairman User',
      psn: 'CHAIRMAN_001',
      email: 'chairman@imanmcs.com',
      phone: '08011111111',
      facility_name: 'Main Hospital',
      next_of_kin_name: 'Kin Name',
      next_of_kin_phone: '08011111112',
      status: 'approved',
      application_date: new Date()
    });
    const chairman = await User.create({
      membership_application_id: chairmanApp.id,
      password_hash: 'hash',
      role: 'chairman',
      status: 'active'
    });
    chairmanToken = jwt.sign({ id: chairman.id, role: chairman.role }, process.env.JWT_SECRET);

    // 2. Create Treasurer user
    const treasurerApp = await MembershipApplication.create({
      name: 'Treasurer User',
      psn: 'TREASURER_001',
      email: 'treasurer@imanmcs.com',
      phone: '08022222222',
      facility_name: 'Central Clinic',
      next_of_kin_name: 'Kin Name',
      next_of_kin_phone: '08022222223',
      status: 'approved',
      application_date: new Date()
    });
    const treasurer = await User.create({
      membership_application_id: treasurerApp.id,
      password_hash: 'hash',
      role: 'treasurer',
      status: 'active'
    });
    treasurerToken = jwt.sign({ id: treasurer.id, role: treasurer.role }, process.env.JWT_SECRET);

    // 3. Create regular Member
    const memberApp = await MembershipApplication.create({
      name: 'Regular Member',
      psn: 'MEMBER_001',
      email: 'member@imanmcs.com',
      phone: '08033333333',
      facility_name: 'North Health Center',
      next_of_kin_name: 'Kin Name',
      next_of_kin_phone: '08033333334',
      status: 'approved',
      application_date: new Date()
    });
    const member = await User.create({
      membership_application_id: memberApp.id,
      password_hash: 'hash',
      role: 'member',
      status: 'active'
    });
    memberToken = jwt.sign({ id: member.id, role: member.role }, process.env.JWT_SECRET);

    // 4. Pending membership application (New Applications)
    await MembershipApplication.create({
      name: 'Pending Applicant',
      psn: 'APPLICANT_999',
      email: 'pending@imanmcs.com',
      phone: '08099999999',
      facility_name: 'South Clinic',
      next_of_kin_name: 'Kin Name',
      next_of_kin_phone: '08099999990',
      status: 'pending',
      application_date: new Date()
    });

    // 5. Approved contribution
    await Contribution.create({
      user_id: member.id,
      amount: 100000,
      total_amount: 100000,
      savings: 70000,
      investment: 30000,
      type: 'monthly_saving',
      status: 'approved',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      date: new Date(),
      payment_method: 'bank_transfer'
    });

    // 6. Pending loan
    await Loan.create({
      user_id: member.id,
      amount_requested: 250000,
      amount_approved: 250000,
      repayment_period_months: 12,
      loan_type: 'cash',
      status: 'pending',
      total_repayment: 250000,
      monthly_repayment: 20833,
      payslip_url: 'http://example.com',
      application_date: new Date()
    });

    // 7. Monthly expense (paid) and pending expense
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    await Expense.create({
      description: 'Office Electricity',
      amount: 25000,
      status: 'paid',
      month: currentMonth,
      year: currentYear,
      category: 'utilities',
      payment_method: 'transfer',
      expense_date: new Date()
    });
    await Expense.create({
      description: 'Stationery Supplies',
      amount: 15000,
      status: 'pending',
      month: currentMonth,
      year: currentYear,
      category: 'stationery',
      payment_method: 'cash',
      expense_date: new Date()
    });

    // 8. Profit distribution
    await ProfitShare.create({
      user_id: member.id,
      period: '2025-Q1',
      total_investment_pool: 1000000,
      total_profit: 100000,
      member_investment: 30000,
      share_percentage: 3.0,
      profit_amount: 15000,
      status: 'approved',
      calculated_at: new Date(),
      approved_at: new Date()
    });

    // 9. Layyah applications & groups
    await LayyahApplication.create({
      user_id: member.id,
      kind: 'group',
      animal_category: 'ram',
      quantity: 1,
      price_min: 100000,
      price_max: 150000,
      applied_amount: 120000,
      status: 'approved',
      group_id: null,
      group_member_count: 3
    });
    await LayyahApplication.create({
      user_id: member.id,
      kind: 'individual',
      animal_category: 'goat',
      quantity: 1,
      price_min: 40000,
      price_max: 60000,
      applied_amount: 50000,
      status: 'pending',
      group_id: null
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Chairman Dashboard Real-Time Stats', () => {
    it('should return all 11 real-time stats for Chairman', async () => {
      const res = await request(app)
        .get('/dashboard/chairman/stats')
        .set('Authorization', "Bearer " + chairmanToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const stats = res.body.data;

      expect(stats).toHaveProperty('totalMembers');
      expect(stats.totalMembers).toBeGreaterThanOrEqual(3);

      expect(stats).toHaveProperty('totalContributions');
      expect(stats.totalContributions).toBe(100000);

      expect(stats).toHaveProperty('pendingLoans');
      expect(stats.pendingLoans).toBe(1);

      expect(stats).toHaveProperty('monthlyExpenses');
      expect(stats.monthlyExpenses).toBe(25000);

      expect(stats).toHaveProperty('totalProfitShared');
      expect(stats.totalProfitShared).toBe(15000);

      expect(stats).toHaveProperty('totalReserves');
      expect(stats.totalReserves).toBe(75000);

      expect(stats).toHaveProperty('pendingExpenses');
      expect(stats.pendingExpenses).toBe(1);

      expect(stats).toHaveProperty('activeApplications');
      expect(stats.activeApplications).toBe(1);

      expect(stats).toHaveProperty('totalLayyahApplications');
      expect(stats.totalLayyahApplications).toBe(2);

      expect(stats).toHaveProperty('pendingLayyahApplications');
      expect(stats.pendingLayyahApplications).toBe(1);

      expect(stats).toHaveProperty('activeLayyahGroups');
      expect(stats.activeLayyahGroups).toBe(1);
    });

    it('should deny access to regular member', async () => {
      const res = await request(app)
        .get('/dashboard/chairman/stats')
        .set('Authorization', "Bearer " + memberToken);

      expect(res.status).toBe(403);
    });
  });

  describe('Treasurer Dashboard Real-Time Stats', () => {
    it('should return all 11 real-time stats for Treasurer', async () => {
      const res = await request(app)
        .get('/dashboard/treasurer/stats')
        .set('Authorization', "Bearer " + treasurerToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const stats = res.body.data;

      expect(stats.totalMembers).toBeGreaterThanOrEqual(3);
      expect(stats.totalContributions).toBe(100000);
      expect(stats.pendingLoans).toBe(1);
      expect(stats.monthlyExpenses).toBe(25000);
      expect(stats.totalProfitShared).toBe(15000);
      expect(stats.totalReserves).toBe(75000);
      expect(stats.pendingExpenses).toBe(1);
      expect(stats.activeApplications).toBe(1);
      expect(stats.totalLayyahApplications).toBe(2);
      expect(stats.pendingLayyahApplications).toBe(1);
      expect(stats.activeLayyahGroups).toBe(1);
    });

    it('should deny access to regular member', async () => {
      const res = await request(app)
        .get('/dashboard/treasurer/stats')
        .set('Authorization', "Bearer " + memberToken);

      expect(res.status).toBe(403);
    });
  });
});
