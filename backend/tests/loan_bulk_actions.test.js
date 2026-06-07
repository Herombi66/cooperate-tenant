const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize } = require('../db/connection');
const User = require('../models/User');
const Loan = require('../models/Loan');
const MembershipApplication = require('../models/MembershipApplication');

jest.setTimeout(60000);

describe('Loan Bulk Actions API', () => {
  let adminToken;
  let adminUser;
  let loans = [];

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });

    // Create membership application for admin
    const membership = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADMIN001',
      email: 'admin@example.com',
      phone: '1234567890',
      facility_name: 'HQ',
      next_of_kin_name: 'Kin',
      next_of_kin_phone: '0987654321',
      status: 'approved',
      application_date: new Date()
    });

    // Create admin user
    adminUser = await User.create({
      psn: 'ADMIN001',
      name: 'Admin User',
      email: 'admin@example.com',
      password_hash: 'hashed_password', // Mock hash
      role: 'admin',
      status: 'active',
      membership_application_id: membership.id
    });

    // Generate token
    adminToken = jwt.sign(
      { id: adminUser.id, psn: adminUser.psn, role: adminUser.role },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // Clear loans
    await Loan.destroy({ where: {} });

    // Create test loans
    loans = await Loan.bulkCreate([
      {
        user_id: adminUser.id, // Using admin as borrower for simplicity
        amount_requested: 50000,
        loan_type: 'cash',
        repayment_period_months: 12,
        status: 'pending',
        application_date: new Date()
      },
      {
        user_id: adminUser.id,
        amount_requested: 100000,
        loan_type: 'cash',
        repayment_period_months: 12,
        status: 'pending',
        application_date: new Date()
      },
      {
        user_id: adminUser.id,
        amount_requested: 20000,
        loan_type: 'cash',
        repayment_period_months: 6,
        status: 'rejected', // Already rejected
        application_date: new Date()
      }
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /loans/bulk-status', () => {
    it('should bulk approve pending loans', async () => {
      const loanIds = [loans[0].id, loans[1].id];
      
      const response = await request(app)
        .post('/loans/bulk-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          loanIds,
          status: 'waiting_disbursement'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results.success).toBe(2);
      expect(response.body.results.failed).toBe(0);

      // Verify in DB
      const updatedLoans = await Loan.findAll({
        where: {
          id: loanIds
        }
      });

      updatedLoans.forEach(loan => {
        expect(loan.status).toBe('waiting_disbursement');
        expect(loan.approved_by).toBe(adminUser.id);
      });
    });

    it('should bulk reject pending loans', async () => {
      const loanIds = [loans[0].id];
      
      const response = await request(app)
        .post('/loans/bulk-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          loanIds,
          status: 'rejected',
          reason: 'Bulk rejection test'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const updatedLoan = await Loan.findByPk(loanIds[0]);
      expect(updatedLoan.status).toBe('rejected');
    });

    it('should fail validation for invalid transition', async () => {
      // Try to approve a rejected loan
      const loanIds = [loans[2].id]; 
      
      const response = await request(app)
        .post('/loans/bulk-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          loanIds,
          status: 'waiting_disbursement'
        });

      // The API should return 200 with failed count for partial/full failures in bulk ops
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results.failed).toBe(1);
      expect(response.body.results.errors[0]).toContain('cannot be approved');
    });

    it('should return 400 if no loanIds provided', async () => {
      const response = await request(app)
        .post('/loans/bulk-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'waiting_disbursement'
        });

      expect(response.status).toBe(400);
    });
  });
});
