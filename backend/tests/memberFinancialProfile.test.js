process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize, User, MembershipApplication, Contribution, Loan, LoanRepayment } = require('../models');

describe('Member Financial Profile (Admin)', () => {
  jest.setTimeout(30000);
  let adminToken;
  let memberToken;
  let memberUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const adminMembership = await MembershipApplication.create({
      name: 'Admin Finance',
      psn: 'ADMIN_FIN_001',
      email: 'admin_fin@test.local',
      phone: '3000000000',
      facility_name: 'Admin Facility',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '3000000001',
      status: 'approved'
    });

    const admin = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'password',
      role: 'admin',
      status: 'active',
      can_liquidate_loans: true
    });

    adminToken = jwt.sign({ id: admin.id }, 'test_secret');

    const memberMembership = await MembershipApplication.create({
      name: 'Member Finance',
      psn: 'MEM_FIN_001',
      email: 'mem_fin@test.local',
      phone: '0800000000',
      facility_name: 'Facility A',
      next_of_kin_name: 'Nok A',
      next_of_kin_phone: '0800000001',
      status: 'approved',
      savings: 3000,
      investment: 3000,
      target_saving: 0
    });

    memberUser = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });

    memberToken = jwt.sign({ id: memberUser.id }, 'test_secret');

    await Contribution.create({
      user_id: memberUser.id,
      savings: 1000,
      investment: 0,
      target_saving: 0,
      payment_method: 'cash',
      total_amount: 1000,
      month: 3,
      year: 2026,
      status: 'approved',
      contribution_date: new Date('2026-03-01T00:00:00.000Z')
    });

    await Contribution.create({
      user_id: memberUser.id,
      savings: 500,
      investment: 0,
      target_saving: 0,
      payment_method: 'cash',
      total_amount: 500,
      month: 4,
      year: 2026,
      status: 'pending',
      contribution_date: new Date('2026-04-01T00:00:00.000Z')
    });

    const loan = await Loan.create({
      user_id: memberUser.id,
      loan_type: 'cash',
      amount_requested: 10000,
      amount_approved: 10000,
      interest_rate: 0,
      repayment_period_months: 2,
      monthly_repayment: 5000,
      total_repayment: 10000,
      status: 'active'
    });

    await LoanRepayment.create({
      loan_id: loan.id,
      user_id: memberUser.id,
      repayment_amount: 3000,
      repayment_date: '2026-03-05',
      payment_method: 'cash',
      status: 'verified',
      recorded_by: admin.id,
      notes: 'First'
    });

    await LoanRepayment.create({
      loan_id: loan.id,
      user_id: memberUser.id,
      repayment_amount: 2000,
      repayment_date: '2026-03-10',
      payment_method: 'bank_transfer',
      status: 'pending',
      recorded_by: admin.id,
      notes: 'Pending'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('allows admin to view financial profile with contributions, loan and repayments', async () => {
    const res = await request(app)
      .get(`/members/${memberUser.id}/financial-profile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.member.id).toBe(memberUser.id);
    expect(res.body.profile.contributions.total_approved).toBe(1000);
    expect(Array.isArray(res.body.profile.contributions.history)).toBe(true);
    expect(res.body.profile.loan).toBeTruthy();
    expect(res.body.profile.loan.remaining_balance).toBe(7000);
    expect(Array.isArray(res.body.profile.repayments)).toBe(true);
    expect(res.body.profile.repayments.length).toBe(2);
  });

  it('blocks non-admin roles from viewing financial profile', async () => {
    const res = await request(app)
      .get(`/members/${memberUser.id}/financial-profile`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

