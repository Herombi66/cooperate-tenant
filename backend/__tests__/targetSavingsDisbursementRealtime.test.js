const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/connection');
const { User, MembershipApplication, Contribution, ContributionWithdrawal, Notification } = require('../models');
const jwt = require('jsonwebtoken');

const createToken = (user, membershipApplication) => {
  return jwt.sign(
    { id: user.id, psn: membershipApplication?.psn || 'ADM001', role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
};

describe('Target Savings Disbursement Realtime Balance & Member Account Updates', () => {
  let adminUser, adminMembership, adminToken;
  let memberUser, memberMembership, memberToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Create Admin
    adminMembership = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADM_DISB_01',
      email: 'admin_disb@example.com',
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
      name: 'Disbursement Member',
      psn: 'MBR_DISB_01',
      email: 'member_disb@example.com',
      phone: '08022222222',
      facility_name: 'Clinic',
      next_of_kin_name: 'Member NOK',
      next_of_kin_phone: '08022222223',
      savings: 50000,
      investment: 20000,
      target_saving: 250000
    });

    memberUser = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'hashed',
      role: 'member',
      status: 'active'
    });

    memberToken = createToken(memberUser, memberMembership);

    // Add approved contributions: 50,000 savings, 20,000 investment, 100,000 target savings
    await Contribution.create({
      user_id: memberUser.id,
      savings: 50000,
      investment: 20000,
      target_saving: 100000,
      total_amount: 170000,
      payment_method: 'bank_transfer',
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should return initial real-time target savings balance of 100,000', async () => {
    const res = await request(app)
      .get('/dashboard/unified')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const stats = res.body.data.member.stats;
    expect(stats.totalSavings).toBe(50000);
    expect(stats.totalInvestment).toBe(20000);
    expect(stats.targetSavingsBalance).toBe(100000);
    expect(stats.totalTargetWithdrawn).toBe(0);
    expect(stats.totalContributions).toBe(170000);
  });

  it('should disburse target savings and immediately deduct from member real-time balance', async () => {
    // Admin executes target savings withdrawal of 40,000 with immediate disbursement
    const executeRes = await request(app)
      .post('/withdrawals/target-savings/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        user_id: memberUser.id,
        amount: 40000,
        disburse_now: true,
        bank_name: 'GTBank',
        account_number: '0123456789',
        account_name: 'Disbursement Member',
        payout_method: 'bank_transfer',
        notes: 'Target goal reached payout'
      });

    expect(executeRes.status).toBe(201);
    expect(executeRes.body.success).toBe(true);
    expect(executeRes.body.withdrawal.status).toBe('disbursed');
    expect(executeRes.body.remaining_target_savings_balance).toBe(60000);

    // Verify member dashboard reflects updated real-time balance immediately
    const dashRes = await request(app)
      .get('/dashboard/unified')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(dashRes.status).toBe(200);
    const stats = dashRes.body.data.member.stats;
    expect(stats.targetSavingsBalance).toBe(60000); // 100,000 - 40,000
    expect(stats.totalTargetWithdrawn).toBe(40000);
    expect(stats.totalContributions).toBe(130000); // 50,000 + 20,000 + 60,000

    // Verify disbursement is included in recent transactions
    const recentTx = dashRes.body.data.member.recentContributions;
    const disbTx = recentTx.find(tx => tx.is_withdrawal && tx.total_amount === -40000);
    expect(disbTx).toBeDefined();
    expect(disbTx.status).toBe('disbursed');

    // Verify in-app notification was created for the member
    const notif = await Notification.findOne({
      where: { user_id: memberUser.id, type: 'payout' },
      order: [['created_at', 'DESC']]
    });
    expect(notif).toBeDefined();
    expect(notif.title).toContain('Target Savings Disbursed');
    expect(notif.message).toContain('40,000');
  });

  it('should reflect disbursed amount on member financial profile and passbook history', async () => {
    const res = await request(app)
      .get(`/members/${memberUser.id}/financial-profile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const contrib = res.body.profile.contributions;
    expect(contrib.total_target_saving).toBe(60000);
    expect(contrib.total_target_withdrawn).toBe(40000);
    expect(contrib.net_balance).toBe(130000);
    expect(contrib.disbursements.length).toBeGreaterThan(0);
    expect(contrib.disbursements[0].amount).toBe(-40000);
    expect(contrib.disbursements[0].status).toBe('disbursed');
  });

  it('should update real-time balance and create notification when a pending withdrawal is updated to disbursed', async () => {
    // Member requests 20,000 target savings withdrawal
    const reqRes = await request(app)
      .post('/withdrawals/target-savings/request')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        amount: 20000,
        reason: 'School fees'
      });

    expect(reqRes.status).toBe(201);
    const withdrawalId = reqRes.body.withdrawal.id;

    // Admin approves & marks as disbursed
    const updateRes = await request(app)
      .put(`/withdrawals/${withdrawalId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'disbursed',
        payout_reference: 'REF-TX-999'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);

    // Check dashboard again
    const dashRes = await request(app)
      .get('/dashboard/unified')
      .set('Authorization', `Bearer ${memberToken}`);

    const stats = dashRes.body.data.member.stats;
    expect(stats.targetSavingsBalance).toBe(40000); // 60,000 - 20,000
    expect(stats.totalTargetWithdrawn).toBe(60000); // 40,000 + 20,000
    expect(stats.totalContributions).toBe(110000); // 50,000 + 20,000 + 40,000
  });
});
