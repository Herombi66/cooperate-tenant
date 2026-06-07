const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize } = require('../db/connection');
// Import models from index.js to ensure they are initialized and associated correctly
const { 
  User, 
  Loan, 
  MembershipApplication, 
  ActivityLog, 
  Notification 
} = require('../models');

// Increase timeout for DB sync and email service initialization
jest.setTimeout(60000);

describe('Loan Reverse Actions & Admin Delete API', () => {
  let adminToken;
  let adminUser;
  let regularUser;
  let regularToken;
  let loan;

  beforeAll(async () => {
    // Sync database (force true to reset tables for test)
    // NOTE: Ensure this runs against a TEST database to avoid data loss
    if (process.env.NODE_ENV === 'test') {
        await sequelize.sync({ force: true });
    } else {
        console.warn('⚠️ Not in test environment, skipping force sync to protect data');
        // We might want to just authenticate as existing admin if not in test env
        // But for verification script, we assume test env or safe execution
    }

    // Create membership for admin
    const adminMembership = await MembershipApplication.create({
      name: 'Admin Tester',
      psn: 'ADMIN_TEST_001',
      email: 'admin.test@example.com',
      phone: '1111111111',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Admin Kin',
      next_of_kin_phone: '1111111112',
      status: 'approved',
      application_date: new Date()
    });

    // Create admin user
    adminUser = await User.create({
      psn: 'ADMIN_TEST_001',
      name: 'Admin Tester',
      email: 'admin.test@example.com',
      password_hash: 'hashed_password',
      role: 'admin',
      status: 'active',
      membership_application_id: adminMembership.id
    });

    // Create membership for regular user
    const userMembership = await MembershipApplication.create({
        name: 'Regular Tester',
        psn: 'USER_TEST_001',
        email: 'user.test@example.com',
        phone: '2222222222',
        facility_name: 'Test Facility',
        next_of_kin_name: 'User Kin',
        next_of_kin_phone: '2222222223',
        status: 'approved',
        application_date: new Date()
    });
  
      // Create regular user
    regularUser = await User.create({
        psn: 'USER_TEST_001',
        name: 'Regular Tester',
        email: 'user.test@example.com',
        password_hash: 'hashed_password',
        role: 'member',
        status: 'active',
        membership_application_id: userMembership.id
    });

    // Generate tokens
    adminToken = jwt.sign(
      { id: adminUser.id, psn: adminUser.psn, role: adminUser.role },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    regularToken = jwt.sign(
        { id: regularUser.id, psn: regularUser.psn, role: regularUser.role },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // Clean up loans and logs before each test
    await Loan.destroy({ where: {} });
    await ActivityLog.destroy({ where: {} });
    await Notification.destroy({ where: {} });

    // Create a base loan for testing
    loan = await Loan.create({
      user_id: regularUser.id,
      amount_requested: 50000,
      loan_type: 'cash',
      repayment_period_months: 12,
      status: 'pending', // Start as pending
      application_date: new Date()
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /loans/:id/reverse-approval', () => {
    it('should reverse an approved loan back to pending', async () => {
        // Setup: Approve the loan first
        await loan.update({
            status: 'approved',
            approved_by: adminUser.id,
            approval_date: new Date(),
            amount_approved: 50000
        });

        const response = await request(app)
            .post(`/loans/${loan.id}/reverse-approval`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('reversed successfully');

        // Verify DB updates
        const updatedLoan = await Loan.findByPk(loan.id);
        expect(updatedLoan.status).toBe('pending');
        expect(updatedLoan.approved_by).toBeNull();
        expect(updatedLoan.approval_date).toBeNull();
        expect(updatedLoan.amount_approved).toBeNull();

        // Verify Activity Log
        const log = await ActivityLog.findOne({
            where: { resource_id: loan.id, action: 'reverse_approval' }
        });
        expect(log).toBeTruthy();
        expect(log.user_id).toBe(adminUser.id);

        // Verify Notification
        const notification = await Notification.findOne({
            where: { user_id: regularUser.id, type: 'loan_update' }
        });
        expect(notification).toBeTruthy();
        expect(notification.title).toContain('Approval Reversed');
    });

    it('should fail if loan is not in approved state', async () => {
        // Loan is pending by default
        const response = await request(app)
            .post(`/loans/${loan.id}/reverse-approval`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Cannot reverse approval for loan with status');
    });
  });

  describe('POST /loans/:id/reverse-disbursement', () => {
    it('should reverse a disbursed loan back to approved', async () => {
        // Setup: Disburse the loan first
        await loan.update({
            status: 'disbursed',
            approved_by: adminUser.id,
            approval_date: new Date(),
            amount_approved: 50000,
            disbursed_by: adminUser.id,
            disbursement_date: new Date(),
            total_repayment: 55000,
            monthly_repayment: 4583.33
        });

        const response = await request(app)
            .post(`/loans/${loan.id}/reverse-disbursement`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('reversed successfully');

        // Verify DB updates
        const updatedLoan = await Loan.findByPk(loan.id);
        expect(updatedLoan.status).toBe('approved');
        expect(updatedLoan.disbursed_by).toBeNull();
        expect(updatedLoan.disbursement_date).toBeNull();
        expect(updatedLoan.monthly_repayment).toBeNull();
        expect(updatedLoan.total_repayment).toBeNull();
        // Should still be approved
        expect(Number(updatedLoan.amount_approved)).toBe(50000);

        // Verify Activity Log
        const log = await ActivityLog.findOne({
            where: { resource_id: loan.id, action: 'reverse_disbursement' }
        });
        expect(log).toBeTruthy();

        // Verify Notification
        const notification = await Notification.findOne({
            where: { user_id: regularUser.id, type: 'loan_update' }
        });
        expect(notification).toBeTruthy();
        expect(notification.title).toContain('Disbursement Reversed');
    });

    it('should fail if loan is not in disbursed state', async () => {
        // Loan is pending by default
        const response = await request(app)
            .post(`/loans/${loan.id}/reverse-disbursement`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Cannot reverse disbursement for loan with status');
    });
  });

  describe('DELETE /loans/:id (Admin Override)', () => {
    it('should allow admin to delete a processed loan', async () => {
        // Setup: Make loan active (processed)
        await loan.update({ status: 'active' });

        const response = await request(app)
            .delete(`/loans/${loan.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Loan deleted successfully');

        const deletedLoan = await Loan.findByPk(loan.id);
        expect(deletedLoan).toBeNull();

        // Check log exists (even if loan is gone, log should persist if not cascade deleted, or we mock logging)
        // Note: ActivityLog usually doesn't cascade delete on entity delete if configured for audit
        const log = await ActivityLog.findOne({
            where: { resource_id: loan.id, action: 'delete_loan' }
        });
        expect(log).toBeTruthy();
    });

    it('should prevent regular user from deleting a processed loan', async () => {
        // Setup: Make loan active (processed)
        await loan.update({ status: 'active' });

        const response = await request(app)
            .delete(`/loans/${loan.id}`)
            .set('Authorization', `Bearer ${regularToken}`);

        expect(response.status).toBe(400); // Or 403 depending on implementation, controller says 400
        expect(response.body.message).toBe('Cannot delete processed loan');
    });

    it('should allow regular user to delete their own pending loan', async () => {
        // Loan is pending by default and belongs to regularUser
        const response = await request(app)
            .delete(`/loans/${loan.id}`)
            .set('Authorization', `Bearer ${regularToken}`);

        expect(response.status).toBe(200);
        
        const deletedLoan = await Loan.findByPk(loan.id);
        expect(deletedLoan).toBeNull();
    });
  });
});
