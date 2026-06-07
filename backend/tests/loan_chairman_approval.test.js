const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize } = require('../db/connection');
const {
  User,
  Loan,
  MembershipApplication,
  ActivityLog,
  Notification
} = require('../models');

jest.setTimeout(60000);

describe('Chairman Loan Approval and Rejection API', () => {
  let chairmanUser;
  let chairmanToken;
  let memberUser;
  let memberToken;

  beforeAll(async () => {
    if (process.env.NODE_ENV === 'test') {
      await sequelize.sync({ force: true });
    } else {
      console.warn('Not in test environment, skipping force sync to protect data');
    }

    const chairmanMembership = await MembershipApplication.create({
      name: 'Chairman Tester',
      psn: 'CHAIRMAN_TEST_001',
      email: 'chairman.test@example.com',
      phone: '1111111111',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Chairman Kin',
      next_of_kin_phone: '1111111112',
      status: 'approved',
      application_date: new Date()
    });

    chairmanUser = await User.create({
      psn: 'CHAIRMAN_TEST_001',
      name: 'Chairman Tester',
      email: 'chairman.test@example.com',
      password_hash: 'hashed_password',
      role: 'chairman',
      status: 'active',
      membership_application_id: chairmanMembership.id
    });

    const memberMembership = await MembershipApplication.create({
      name: 'Member Tester',
      psn: 'MEMBER_TEST_001',
      email: 'member.test@example.com',
      phone: '2222222222',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Member Kin',
      next_of_kin_phone: '2222222223',
      status: 'approved',
      application_date: new Date()
    });

    memberUser = await User.create({
      psn: 'MEMBER_TEST_001',
      name: 'Member Tester',
      email: 'member.test@example.com',
      password_hash: 'hashed_password',
      role: 'member',
      status: 'active',
      membership_application_id: memberMembership.id
    });

    chairmanToken = jwt.sign(
      { id: chairmanUser.id, psn: chairmanUser.psn, role: chairmanUser.role, name: chairmanUser.name },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    memberToken = jwt.sign(
      { id: memberUser.id, psn: memberUser.psn, role: memberUser.role, name: memberUser.name },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    await Loan.destroy({ where: {} });
    await ActivityLog.destroy({ where: {} });
    await Notification.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('allows chairman to approve a pending loan and logs activity', async () => {
    const loan = await Loan.create({
      user_id: memberUser.id,
      amount_requested: 80000,
      loan_type: 'cash',
      repayment_period_months: 12,
      status: 'pending',
      application_date: new Date()
    });

    const response = await request(app)
      .post(`/loans/${loan.id}/approve`)
      .set('Authorization', `Bearer ${chairmanToken}`)
      .send({ amount_approved: 80000 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Loan approved successfully');

    const updatedLoan = await Loan.findByPk(loan.id);
    expect(updatedLoan.status).toBe('waiting_disbursement');
    expect(updatedLoan.approved_by).toBe(chairmanUser.id);
    expect(Number(updatedLoan.amount_approved)).toBe(80000);

    const log = await ActivityLog.findOne({
      where: { resource_id: loan.id, action: 'approve_loan' }
    });
    expect(log).toBeTruthy();
    expect(log.user_id).toBe(chairmanUser.id);

    const notification = await Notification.findOne({
      where: { user_id: memberUser.id, type: 'loan_approved' }
    });
    expect(notification).toBeTruthy();
  });

  it('prevents non-privileged user from approving a loan', async () => {
    const loan = await Loan.create({
      user_id: memberUser.id,
      amount_requested: 50000,
      loan_type: 'cash',
      repayment_period_months: 6,
      status: 'pending',
      application_date: new Date()
    });

    const response = await request(app)
      .post(`/loans/${loan.id}/approve`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ amount_approved: 50000 });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Access denied. Only Chairman and Admins can approve loans.');
  });

  it('requires a rejection reason', async () => {
    const loan = await Loan.create({
      user_id: memberUser.id,
      amount_requested: 60000,
      loan_type: 'cash',
      repayment_period_months: 10,
      status: 'pending',
      application_date: new Date()
    });

    const response = await request(app)
      .post(`/loans/${loan.id}/reject`)
      .set('Authorization', `Bearer ${chairmanToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Rejection reason is required');
  });

  it('allows chairman to reject a pending loan and logs activity', async () => {
    const loan = await Loan.create({
      user_id: memberUser.id,
      amount_requested: 70000,
      loan_type: 'cash',
      repayment_period_months: 9,
      status: 'pending',
      application_date: new Date()
    });

    const response = await request(app)
      .post(`/loans/${loan.id}/reject`)
      .set('Authorization', `Bearer ${chairmanToken}`)
      .send({ reason: 'Insufficient collateral' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Loan rejected successfully');

    const updatedLoan = await Loan.findByPk(loan.id);
    expect(updatedLoan.status).toBe('rejected');
    expect(updatedLoan.approved_by).toBe(chairmanUser.id);

    const log = await ActivityLog.findOne({
      where: { resource_id: loan.id, action: 'reject_loan' }
    });
    expect(log).toBeTruthy();
    expect(log.user_id).toBe(chairmanUser.id);

    const notification = await Notification.findOne({
      where: { user_id: memberUser.id, type: 'loan_rejected' }
    });
    expect(notification).toBeTruthy();
  });

  it('prevents rejecting disbursed or active loans directly', async () => {
    const loan = await Loan.create({
      user_id: memberUser.id,
      amount_requested: 90000,
      loan_type: 'cash',
      repayment_period_months: 12,
      status: 'disbursed',
      application_date: new Date()
    });

    const response = await request(app)
      .post(`/loans/${loan.id}/reject`)
      .set('Authorization', `Bearer ${chairmanToken}`)
      .send({ reason: 'Post-disbursement review issue' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Cannot reject loan in 'disbursed' status");
  });
});

