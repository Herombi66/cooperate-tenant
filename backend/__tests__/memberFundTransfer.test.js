const request = require('supertest');
const app = require('../app');
const {
  User,
  MembershipApplication,
  Contribution,
  ContributionWithdrawal,
  sequelize
} = require('../models');
const jwt = require('jsonwebtoken');

describe('Member Financial Profile: Savings/Investment Breakdown & Fund Transfer', () => {
  let adminToken;
  let adminUser;
  let memberUser;
  let membershipApp;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Create an admin user and token
    const adminApp = await MembershipApplication.create({
      name: 'System Admin Profile',
      psn: 'ADMIN_FIN_001',
      email: 'admin_fin001@example.com',
      phone: '08000000010',
      facility_name: 'HQ Financial',
      next_of_kin_name: 'NOK Fin Admin',
      next_of_kin_phone: '08000000020',
      savings: 0,
      investment: 0,
      status: 'approved'
    });

    adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: 'hash',
      role: 'admin',
      status: 'active'
    });

    adminToken = jwt.sign(
      { id: adminUser.id, role: 'admin', psn: 'ADMIN_FIN_001' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    membershipApp = await MembershipApplication.create({
      name: 'Test Financial Member',
      psn: `PSN_FIN_${Date.now()}`,
      email: `member_fin_${Date.now()}@example.com`,
      phone: '08012345671',
      facility_name: 'University Hospital',
      next_of_kin_name: 'NOK Fin Member',
      next_of_kin_phone: '08098765431',
      savings: 50000,
      investment: 20000,
      status: 'approved'
    });

    memberUser = await User.create({
      membership_application_id: membershipApp.id,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      role: 'member',
      status: 'active'
    });
  });

  it('should return financial profile with savings, investment, and target savings breakdown', async () => {
    // 1. Initial approved contribution
    await Contribution.create({
      user_id: memberUser.id,
      savings: 100000,
      investment: 50000,
      target_saving: 30000,
      total_amount: 180000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    // 2. Add approved target savings withdrawal of ₦10,000
    await ContributionWithdrawal.create({
      user_id: memberUser.id,
      amount: 10000,
      reason: 'Partial target savings withdrawal',
      year: 2026,
      status: 'disbursed',
      withdrawal_type: 'target_savings',
      payment_method: 'bank_transfer',
      approved_by: adminUser.id,
      approved_at: new Date()
    });

    const res = await request(app)
      .get(`/members/${memberUser.id}/financial-profile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.contributions.total_approved).toBe(180000);
    expect(res.body.profile.contributions.total_savings).toBe(100000);
    expect(res.body.profile.contributions.total_investment).toBe(50000);
    expect(res.body.profile.contributions.total_target_saving).toBe(20000); // 30,000 - 10,000
    expect(res.body.profile.contributions.history[0].savings).toBe(100000);
    expect(res.body.profile.contributions.history[0].investment).toBe(50000);
    expect(res.body.profile.contributions.history[0].target_saving).toBe(30000);
  });

  it('should transfer funds from savings to investment account', async () => {
    // Add savings of ₦100,000 and investment of ₦20,000
    await Contribution.create({
      user_id: memberUser.id,
      savings: 100000,
      investment: 20000,
      target_saving: 0,
      total_amount: 120000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    const res = await request(app)
      .post(`/members/${memberUser.id}/transfer-funds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        destination: 'investment',
        amount: 40000,
        notes: 'Member requested share capital increase'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transfer.amount).toBe(40000);
    expect(res.body.transfer.destination).toBe('investment');
    expect(res.body.transfer.updated_savings).toBe(60000); // 100k - 40k
    expect(res.body.transfer.updated_destination_balance).toBe(60000); // 20k + 40k

    // Verify financial profile totals
    const profileRes = await request(app)
      .get(`/members/${memberUser.id}/financial-profile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(profileRes.body.profile.contributions.total_savings).toBe(60000);
    expect(profileRes.body.profile.contributions.total_investment).toBe(60000);
    expect(profileRes.body.profile.contributions.total_approved).toBe(120000); // Unchanged!
  });

  it('should transfer funds from savings to target savings account', async () => {
    // Add savings of ₦80,000 and target savings of ₦10,000
    await Contribution.create({
      user_id: memberUser.id,
      savings: 80000,
      investment: 0,
      target_saving: 10000,
      total_amount: 90000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    const res = await request(app)
      .post(`/members/${memberUser.id}/transfer-funds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        destination: 'target_saving',
        amount: 30000,
        notes: 'Move to target savings'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transfer.updated_savings).toBe(50000); // 80k - 30k
    expect(res.body.transfer.updated_destination_balance).toBe(40000); // 10k + 30k

    const profileRes = await request(app)
      .get(`/members/${memberUser.id}/financial-profile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(profileRes.body.profile.contributions.total_savings).toBe(50000);
    expect(profileRes.body.profile.contributions.total_target_saving).toBe(40000);
  });

  it('should reject transfer when amount exceeds available savings', async () => {
    await Contribution.create({
      user_id: memberUser.id,
      savings: 25000,
      investment: 0,
      target_saving: 0,
      total_amount: 25000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    const res = await request(app)
      .post(`/members/${memberUser.id}/transfer-funds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        destination: 'investment',
        amount: 50000
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/insufficient savings/i);
  });

  it('should reject transfer with invalid amount or destination', async () => {
    const resInvalidAmount = await request(app)
      .post(`/members/${memberUser.id}/transfer-funds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        destination: 'investment',
        amount: -500
      });

    expect(resInvalidAmount.status).toBe(400);
    expect(resInvalidAmount.body.success).toBe(false);

    const resInvalidDest = await request(app)
      .post(`/members/${memberUser.id}/transfer-funds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        destination: 'unknown_account',
        amount: 5000
      });

    expect(resInvalidDest.status).toBe(400);
    expect(resInvalidDest.body.success).toBe(false);

    const resSameAccount = await request(app)
      .post(`/members/${memberUser.id}/transfer-funds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        source: 'investment',
        destination: 'investment',
        amount: 5000
      });

    expect(resSameAccount.status).toBe(400);
    expect(resSameAccount.body.success).toBe(false);
    expect(resSameAccount.body.message).toMatch(/cannot be the same/i);
  });

  it('should transfer funds from investment to savings account', async () => {
    // Member has ₦70,000 in investment and ₦30,000 in savings
    await Contribution.create({
      user_id: memberUser.id,
      savings: 30000,
      investment: 70000,
      target_saving: 0,
      total_amount: 100000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    const res = await request(app)
      .post(`/members/${memberUser.id}/transfer-funds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        source: 'investment',
        destination: 'savings',
        amount: 25000,
        notes: 'Member liquidated shares to savings'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transfer.source).toBe('investment');
    expect(res.body.transfer.destination).toBe('savings');
    expect(res.body.transfer.amount).toBe(25000);
    expect(res.body.transfer.updated_source_balance).toBe(45000); // 70k - 25k
    expect(res.body.transfer.updated_destination_balance).toBe(55000); // 30k + 25k

    // Verify financial profile
    const profileRes = await request(app)
      .get(`/members/${memberUser.id}/financial-profile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(profileRes.body.profile.contributions.total_investment).toBe(45000);
    expect(profileRes.body.profile.contributions.total_savings).toBe(55000);
    expect(profileRes.body.profile.contributions.total_approved).toBe(100000);
  });

  it('should transfer funds from investment to target savings account', async () => {
    await Contribution.create({
      user_id: memberUser.id,
      savings: 10000,
      investment: 50000,
      target_saving: 5000,
      total_amount: 65000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    const res = await request(app)
      .post(`/members/${memberUser.id}/transfer-funds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        source: 'investment',
        destination: 'target_saving',
        amount: 20000,
        notes: 'Move investment return to target savings'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transfer.source).toBe('investment');
    expect(res.body.transfer.destination).toBe('target_saving');
    expect(res.body.transfer.updated_source_balance).toBe(30000); // 50k - 20k
    expect(res.body.transfer.updated_destination_balance).toBe(25000); // 5k + 20k
  });

  it('should reject transfer when amount exceeds available investment balance', async () => {
    await Contribution.create({
      user_id: memberUser.id,
      savings: 50000,
      investment: 15000,
      target_saving: 0,
      total_amount: 65000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    const res = await request(app)
      .post(`/members/${memberUser.id}/transfer-funds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        source: 'investment',
        destination: 'savings',
        amount: 30000
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/insufficient investment balance/i);
  });

  it('should transfer funds from target savings to savings account', async () => {
    await Contribution.create({
      user_id: memberUser.id,
      savings: 20000,
      investment: 0,
      target_saving: 60000,
      total_amount: 80000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    const res = await request(app)
      .post(`/members/${memberUser.id}/transfer-funds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        source: 'target_saving',
        destination: 'savings',
        amount: 25000,
        notes: 'Move matured target savings to regular savings'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transfer.source).toBe('target_saving');
    expect(res.body.transfer.destination).toBe('savings');
    expect(res.body.transfer.updated_source_balance).toBe(35000); // 60k - 25k
    expect(res.body.transfer.updated_destination_balance).toBe(45000); // 20k + 25k
  });

  afterAll(async () => {
    await sequelize.close();
  });
});