const request = require('supertest');
const app = require('../app');
const { sequelize, User, MembershipApplication, Contribution, Loan, LoanRepayment, ActivityLog } = require('../models');
const jwt = require('jsonwebtoken');

describe('Dashboard API Integration Tests', () => {
  let userToken;
  let userId;
  let originalFetch;

  jest.setTimeout(60000);

  beforeAll(async () => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });

    // Sync database
    await sequelize.sync({ force: true });

    // Create a regular user with membership
    const membership = await MembershipApplication.create({
      name: 'Dashboard Test User',
      psn: 'DASH_TEST_001',
      email: 'dash_test@example.com',
      phone: '1234567890',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Test Kin',
      next_of_kin_phone: '0987654321',
      status: 'approved',
      application_date: new Date(),
      target_saving: 50000
    });

    const user = await User.create({
      membership_application_id: membership.id,
      password_hash: 'hashedpassword',
      role: 'member',
      status: 'active'
    });
    userId = user.id;

    // Create token for user
    userToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await sequelize.close();
  });

  describe('GET /dashboard/member/stats', () => {
    it('should return default stats for new user with no data', async () => {
      const res = await request(app)
        .get('/dashboard/member/stats')
        .set('Authorization', `Bearer ${userToken}`);

      if (res.status !== 200) {
        console.error('Dashboard Error:', res.body);
      }

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      
      const stats = res.body.data;
      expect(stats.totalSavings).toBe(0);
      expect(stats.targetSavings).toBe(50000);
      expect(stats.loanBalance).toBe(0);
    });

    it('should calculate stats correctly with contributions and loans', async () => {
      // 1. Add approved contribution
      await Contribution.create({
        user_id: userId,
        amount: 10000,
        type: 'monthly_saving',
        status: 'approved',
        payment_method: 'bank_transfer',
        payment_reference: 'REF123',
        savings: 8000,
        investment: 2000,
        total_amount: 10000,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        date: new Date()
      });

      // 2. Add disbursed loan
      const loan = await Loan.create({
        user_id: userId,
        amount_requested: 50000,
        amount_approved: 50000,
        repayment_period_months: 10,
        loan_type: 'cash',
        total_repayment: 50000, // No interest
        monthly_repayment: 5000,
        status: 'disbursed',
        payslip_url: 'http://example.com',
        application_date: new Date()
      });

      // 3. Add loan repayment
      await LoanRepayment.create({
        loan_id: loan.id,
        user_id: userId,
        amount: 5000,
        repayment_amount: 5000,
        payment_method: 'bank_transfer',
        payment_reference: 'REP123',
        status: 'verified', // 'approved' is not a valid status for LoanRepayment, use 'verified'
        payment_date: new Date(),
        repayment_date: new Date(),
        recorded_by: userId // In test, user records their own repayment for simplicity
      });

      const res = await request(app)
        .get('/dashboard/member/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      
      const stats = res.body.data;
      expect(Number(stats.totalSavings)).toBe(8000);
      expect(Number(stats.totalInvestment)).toBe(2000);
      
      // Loan Balance: 50000 - 5000 = 45000
      expect(Number(stats.loanBalance)).toBe(45000);
      expect(Number(stats.totalPaidLoans)).toBe(5000);
      expect(Number(stats.totalCashLoans)).toBe(50000);
    });
  });

  describe('WhatsApp Group Invite (engagement + health)', () => {
    it('tracks WhatsApp group invite clicks in activity logs', async () => {
      const res = await request(app)
        .post('/dashboard/engagement/whatsapp-group-click')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ source: 'member_dashboard' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const log = await ActivityLog.findOne({
        where: { user_id: userId, action: 'whatsapp_group_invite_click', resource_type: 'engagement' },
        order: [['created_at', 'DESC']]
      });
      expect(log).toBeTruthy();
    });

    it('returns WhatsApp group invite health status', async () => {
      const res = await request(app)
        .get('/dashboard/health/whatsapp-group')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('ok');
      expect(res.body.data).toHaveProperty('checked_at');
    });
  });
});
