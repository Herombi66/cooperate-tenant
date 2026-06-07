jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendGuarantorNotificationEmail: jest.fn(),
}));

const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/connection');
const { User, Loan, Notification, MembershipApplication, ActivityLog } = require('../models');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, psn: 'TESTPSN', role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

let adminToken;
let userToken;
let adminUser;
let regularUser;
let adminApp;
let userApp;
let loanId;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.NODE_ENV = 'test';

  // Sync database
  await sequelize.sync({ force: true });
  
  // Create Membership for Admin
  adminApp = await MembershipApplication.create({
    name: 'Admin Tester',
    email: `admin_bulk_disburse_${Date.now()}@test.com`,
    psn: `ADMIN${Date.now()}`,
    status: 'approved',
    phone: '08012345678',
    facility_name: 'Test Facility',
    next_of_kin_name: 'Next Admin',
    next_of_kin_phone: '08087654321'
  });

  adminUser = await User.create({
    membership_application_id: adminApp.id,
    password_hash: 'hashed_password',
    role: 'admin',
    status: 'active'
  });
  adminToken = generateToken(adminUser);

  // Create Membership for Regular User
  userApp = await MembershipApplication.create({
    name: 'Regular Tester',
    email: `user_bulk_disburse_${Date.now()}@test.com`,
    psn: `PSN${Date.now()}`,
    status: 'approved',
    phone: '08012345679',
    facility_name: 'Test Facility',
    next_of_kin_name: 'Next User',
    next_of_kin_phone: '08087654322'
  });

  regularUser = await User.create({
    membership_application_id: userApp.id,
    password_hash: 'hashed_password',
    role: 'member',
    status: 'active'
  });
  userToken = generateToken(regularUser);
});

afterAll(async () => {
  try {
    if (loanId) await Loan.destroy({ where: { id: loanId } });
    if (regularUser) await User.destroy({ where: { id: regularUser.id } });
    if (adminUser) await User.destroy({ where: { id: adminUser.id } });
    if (userApp) await MembershipApplication.destroy({ where: { id: userApp.id } });
    if (adminApp) await MembershipApplication.destroy({ where: { id: adminApp.id } });
  } catch (error) {
    console.warn('Cleanup failed:', error.message);
  }
});

describe('Bulk Disbursement API', () => {
  test('should bulk disburse a waiting loan', async () => {
    // 1. Create a loan in 'waiting_disbursement' status
    const loan = await Loan.create({
      user_id: regularUser.id,
      amount_requested: 50000,
      amount_approved: 50000,
      repayment_period_months: 10,
      loan_type: 'cash',
      purpose: 'Test Bulk Disburse',
      status: 'waiting_disbursement',
      application_date: new Date(),
      approval_date: new Date(),
      approved_by: adminUser.id
    });
    loanId = loan.id;

    // 2. Call bulk update
    const res = await request(app)
      .post('/loans/bulk-status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        loanIds: [loan.id],
        status: 'disbursed'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results.success).toBe(1);
    expect(res.body.results.failed).toBe(0);

    // 3. Verify Loan Update
    const updatedLoan = await Loan.findByPk(loan.id);
    expect(updatedLoan.status).toBe('disbursed');
    expect(updatedLoan.disbursement_date).not.toBeNull();
    // Cash loan: total repayment = amount approved (no interest/profit logic for cash loan in this system apparently, or simple)
    // Code says: let totalRepayment = amountApproved; if (investment) ...
    expect(parseFloat(updatedLoan.total_repayment)).toBe(50000);
    expect(parseFloat(updatedLoan.monthly_repayment)).toBe(5000); // 50000 / 10

    // 4. Verify Notification
    const notification = await Notification.findOne({
      where: {
        user_id: regularUser.id,
        type: 'loan_disbursed'
      },
      order: [['created_at', 'DESC']]
    });
    expect(notification).not.toBeNull();
    expect(notification.title).toBe('Loan Disbursed');
  }, 15000);

  test('should fail to disburse a pending loan', async () => {
    // Create pending loan
    const loan = await Loan.create({
      user_id: regularUser.id,
      amount_requested: 30000,
      repayment_period_months: 6,
      loan_type: 'cash',
      status: 'pending'
    });

    const response = await request(app)
      .post('/loans/bulk-update')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        loanIds: [loan.id],
        status: 'disbursed'
      });

    expect(response.status).toBe(200); // 200 OK because it returns results object with failures
    expect(response.body.results.failed).toBe(1);
    expect(response.body.results.errors[0]).toContain('cannot be disbursed');

    // Cleanup
    await loan.destroy();
  }, 15000);
});
