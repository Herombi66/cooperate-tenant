const request = require('supertest');
const app = require('../app');
const { sequelize, User, MembershipApplication, Loan } = require('../models');
const jwt = require('jsonwebtoken');

describe('Loan API Integration Tests', () => {
  let userToken;
  let adminToken;
  let userId;
  let adminId;

  // Increase timeout for database sync
  jest.setTimeout(60000);

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.NODE_ENV = 'test';

    // Sync database (force true to clean up previous tests if any)
    await sequelize.sync({ force: true });

    // Create a regular user with membership
    const membership = await MembershipApplication.create({
      name: 'Test User',
      psn: 'TEST_PSN_001',
      email: 'test@example.com',
      phone: '1234567890',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Test Kin',
      next_of_kin_phone: '0987654321',
      status: 'approved',
      application_date: new Date()
    });

    const user = await User.create({
      membership_application_id: membership.id,
      password_hash: 'hashedpassword',
      role: 'member',
      status: 'active'
    });
    userId = user.id;

    // Create token for user
    userToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Create an admin user
    const adminMembership = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADMIN_PSN_001',
      email: 'admin@example.com',
      phone: '1111111111',
      facility_name: 'Admin Facility',
      next_of_kin_name: 'Admin Kin',
      next_of_kin_phone: '1111111112',
      status: 'approved',
      application_date: new Date()
    });

    const admin = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'hashedpassword',
      role: 'admin',
      status: 'active'
    });
    adminId = admin.id;

    adminToken = jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /loans (Application)', () => {
    it('should create a new loan application successfully', async () => {
      const res = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${userToken}`)
        .field('amount_requested', '50000')
        .field('repayment_period_months', '12')
        .field('loan_type', 'cash')
        .field('purpose', 'Personal use')
        .attach('payslip', Buffer.from('%PDF-1.4\n%'), 'payslip.pdf');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.loan).toHaveProperty('id');
      expect(parseFloat(res.body.loan.amount_requested)).toBe(50000);
      expect(res.body.loan.status).toBe('pending');
      
      // Verify database persistence
      const loan = await Loan.findByPk(res.body.loan.id);
      expect(loan).not.toBeNull();
      expect(parseFloat(loan.amount_requested)).toBe(50000);
      expect(loan.guarantor_approved).toBeNull(); // Should be null initially
      expect(loan.payslip_url).toBeTruthy();
    });

    it('should fail validation when required fields are missing', async () => {
      const invalidData = {
        amount_requested: 50000
        // Missing repayment_period_months and loan_type
      };

      const res = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData);

      expect(res.status).not.toBe(200); // Should be 400 or 500 depending on handling
      // Based on controller: if (!amount || !tenure) throws Error -> 500
      expect(res.body.success).toBe(false);
    });

    it('should prevent duplicate active loans', async () => {
        // User already has a pending loan from first test
        const res = await request(app)
            .post('/loans')
            .set('Authorization', `Bearer ${userToken}`)
            .field('amount_requested', '20000')
            .field('repayment_period_months', '6')
            .field('loan_type', 'cash')
            .attach('payslip', Buffer.from('%PDF-1.4\n%'), 'payslip-2.pdf');
        
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/active loan/i);
    });
  });

  describe('GET /loans', () => {
    it('should retrieve loans for authenticated user', async () => {
      const res = await request(app)
        .get('/loans')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.loans)).toBe(true);
      expect(res.body.loans.length).toBeGreaterThan(0);
      
      // Check data structure
      const loan = res.body.loans[0];
      expect(loan).toHaveProperty('amount_requested');
      expect(loan).toHaveProperty('status');
      expect(loan).toHaveProperty('memberPsn'); // Flattened field
    });

    it('should filter loans by status', async () => {
      const res = await request(app)
        .get('/loans?status=pending')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      res.body.loans.forEach(loan => {
        expect(loan.status).toBe('pending');
      });
    });

    it('should handle search functionality (admin)', async () => {
        // Create another user to search for
        // But simpler to just search for the existing user
        const res = await request(app)
            .get('/loans?search=TEST_PSN')
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.loans.length).toBeGreaterThan(0);
        expect(res.body.loans[0].memberPsn).toContain('TEST_PSN');
    });
  });

  describe('Authorization Checks', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/loans');
      expect(res.status).toBe(401); // Or 403
    });
  });
});
