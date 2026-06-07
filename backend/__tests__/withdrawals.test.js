const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/connection');
const { User, MembershipApplication, Contribution, Loan } = require('../models');
const jwt = require('jsonwebtoken');

const createToken = (user, membershipApplication) => {
  return jwt.sign(
    { id: user.id, psn: membershipApplication?.psn || 'MEM001', role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
};

describe('Withdrawals API - 30% once per year', () => {
  let memberUser;
  let memberMembership;
  let token;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    memberMembership = await MembershipApplication.create({
      name: 'Member One',
      psn: 'MEM001',
      email: 'member1@example.com',
      phone: '08000000002',
      facility_name: 'Member Hospital',
      next_of_kin_name: 'Member NOK',
      next_of_kin_phone: '08000000003',
      savings: 0,
      investment: 0
    });

    memberUser = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'hashed',
      role: 'member',
      status: 'active'
    });

    token = createToken(memberUser, memberMembership);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('eligibility returns 30% of contribution balance when no active loans', async () => {
    await Contribution.create({
      user_id: memberUser.id,
      savings: 100000,
      investment: 0,
      target_saving: 0,
      payment_method: 'cash',
      total_amount: 100000,
      status: 'approved',
      contribution_date: new Date(),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    });

    const res = await request(app)
      .get('/withdrawals/eligibility')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.eligible).toBe(true);
    expect(res.body.maxAmount).toBeCloseTo(30000, 2);
  });

  test('request must be exactly 30% amount', async () => {
    const res = await request(app)
      .post('/withdrawals/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, reason: 'test' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('request succeeds with exact 30% and blocks another request in same year', async () => {
    const eligible = await request(app)
      .get('/withdrawals/eligibility')
      .set('Authorization', `Bearer ${token}`);

    expect(eligible.status).toBe(200);
    const exact = eligible.body.maxAmount;

    const res = await request(app)
      .post('/withdrawals/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: exact, reason: 'annual' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const res2 = await request(app)
      .post('/withdrawals/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: exact, reason: 'again' });

    expect(res2.status).toBe(400);
    expect(res2.body.success).toBe(false);
  });

  test('eligibility rejects member with active loan', async () => {
    await Loan.create({
      user_id: memberUser.id,
      member_psn: memberMembership.psn,
      loan_type: 'cash',
      amount_requested: 10000,
      repayment_period_months: 3,
      purpose: 'test',
      status: 'active',
      application_date: new Date().toISOString(),
      guarantor_psn: 'G1',
      payslip_url: 'uploads/payslips/x.enc'
    });

    const res = await request(app)
      .get('/withdrawals/eligibility')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.eligible).toBe(false);
    expect(res.body.reason).toMatch(/active loan/i);
  });
});
