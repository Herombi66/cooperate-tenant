const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/connection');
const { User, MembershipApplication, Contribution, ContributionWithdrawal, Loan } = require('../models');
const jwt = require('jsonwebtoken');

const createToken = (user, membershipApplication) => {
  return jwt.sign(
    { id: user.id, psn: membershipApplication?.psn || 'ADM001', role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
};

describe('Target Savings Withdrawals API', () => {
  let adminUser, adminMembership, adminToken;
  let memberUser, memberMembership, memberToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Create Admin
    adminMembership = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADM001',
      email: 'admin@example.com',
      phone: '08011111111',
      facility_name: 'HQ',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '08011111112',
      savings: 0,
      investment: 0
    });

    adminUser = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'hashed',
      role: 'admin',
      status: 'active'
    });

    adminToken = createToken(adminUser, adminMembership);

    // Create Member
    memberMembership = await MembershipApplication.create({
      name: 'Target Saver',
      psn: 'TS001',
      email: 'saver@example.com',
      phone: '08022222222',
      facility_name: 'City Clinic',
      next_of_kin_name: 'Saver NOK',
      next_of_kin_phone: '08022222223',
      savings: 50000,
      investment: 0,
      target_saving: 200000,
      target_period: 10
    });

    memberUser = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'hashed',
      role: 'member',
      status: 'active'
    });

    memberToken = createToken(memberUser, memberMembership);

    // Seed approved contributions with target_saving
    await Contribution.create({
      user_id: memberUser.id,
      savings: 10000,
      investment: 0,
      target_saving: 50000,
      payment_method: 'bank_transfer',
      total_amount: 60000,
      status: 'approved',
      contribution_date: new Date(),
      month: 1,
      year: new Date().getFullYear()
    });

    await Contribution.create({
      user_id: memberUser.id,
      savings: 10000,
      investment: 0,
      target_saving: 30000,
      payment_method: 'bank_transfer',
      total_amount: 40000,
      status: 'approved',
      contribution_date: new Date(),
      month: 2,
      year: new Date().getFullYear()
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('Target savings eligibility returns total contributed and available balance (₦80,000)', async () => {
    const res = await request(app)
      .get('/withdrawals/target-savings/eligibility')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.eligible).toBe(true);
    expect(res.body.total_target_contributed).toBe(80000);
    expect(res.body.total_target_withdrawn).toBe(0);
    expect(res.body.available_target_balance).toBe(80000);
    expect(res.body.target_saving_goal).toBe(200000);
  });

  test('Admin can view target savings members directory', async () => {
    const res = await request(app)
      .get('/withdrawals/target-savings/members')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.members)).toBe(true);
    const member = res.body.members.find(m => m.userId === memberUser.id);
    expect(member).toBeDefined();
    expect(member.total_target_contributed).toBe(80000);
    expect(member.available_target_balance).toBe(80000);
    expect(res.body.summary.total_contributed).toBe(80000);
  });

  test('Admin fails to execute target savings withdrawal if amount exceeds available balance', async () => {
    const res = await request(app)
      .post('/withdrawals/target-savings/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: memberUser.id,
        amount: 95000,
        reason: 'Overdraft test'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/exceeds available/i);
  });

  test('Admin executes target savings withdrawal with auto_disburse = true', async () => {
    const res = await request(app)
      .post('/withdrawals/target-savings/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: memberUser.id,
        amount: 30000,
        reason: 'School fees target reached',
        payment_method: 'bank_transfer',
        reference: 'TXN-TARGET-001',
        auto_disburse: true
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.withdrawal.withdrawal_type).toBe('target_savings');
    expect(res.body.withdrawal.status).toBe('disbursed');
    expect(res.body.withdrawal.amount).toBe(30000);
    expect(res.body.withdrawal.disbursed_by).toBe(adminUser.id);
    expect(res.body.withdrawal.disbursed_at).not.toBeNull();

    // Verify updated available balance is now 50,000
    const checkRes = await request(app)
      .get(`/withdrawals/target-savings/eligibility/${memberUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.available_target_balance).toBe(50000);
    expect(checkRes.body.total_target_withdrawn).toBe(30000);
  });

  test('Member can request target savings withdrawal within remaining balance', async () => {
    const res = await request(app)
      .post('/withdrawals/target-savings/request')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        amount: 20000,
        reason: 'Partial medical target withdrawal'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.withdrawal.status).toBe('pending');
    expect(res.body.withdrawal.withdrawal_type).toBe('target_savings');
    expect(res.body.withdrawal.amount).toBe(20000);
  });

  test('Admin updates status of target savings withdrawal to disbursed', async () => {
    // Find pending withdrawal
    const pending = await ContributionWithdrawal.findOne({
      where: { user_id: memberUser.id, status: 'pending', withdrawal_type: 'target_savings' }
    });
    expect(pending).not.toBeNull();

    const res = await request(app)
      .put(`/withdrawals/${pending.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'disbursed',
        notes: 'Disbursed via direct transfer'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.withdrawal.status).toBe('disbursed');
    expect(res.body.withdrawal.disbursed_by).toBe(adminUser.id);
    expect(res.body.withdrawal.disbursed_at).not.toBeNull();

    // Now total withdrawn should be 50,000, available should be 30,000
    const checkRes = await request(app)
      .get('/withdrawals/target-savings/eligibility')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(checkRes.body.total_target_withdrawn).toBe(50000);
    expect(checkRes.body.available_target_balance).toBe(30000);
  });

  test('Target savings withdrawals are separate from regular 30% withdrawals', async () => {
    // Member has 100,000 total contributions across all types.
    // Regular 30% withdrawal should be 30% of 100,000 = 30,000.
    // Target savings withdrawals did not consume the 1x/year regular withdrawal slot.
    const regRes = await request(app)
      .get('/withdrawals/eligibility')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(regRes.status).toBe(200);
    expect(regRes.body.eligible).toBe(true);
    expect(regRes.body.maxAmount).toBe(30000);
  });
});
