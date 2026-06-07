const request = require('supertest');
const app = require('../app');
const { sequelize, User, MembershipApplication } = require('../models');
const jwt = require('jsonwebtoken');

describe('Contribution Fee Deductions', () => {
  let memberUser;
  let memberToken;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });

    const adminApp = await MembershipApplication.create({
      name: 'Fee Test Admin',
      psn: 'FEE_ADMIN_001',
      email: 'fee_admin@example.com',
      phone: '08000001000',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Kin',
      next_of_kin_phone: '08000001001',
      status: 'approved'
    });

    adminUser = await User.create({
      membership_application_id: adminApp.id,
      role: 'admin',
      status: 'active',
      password_hash: 'hashed'
    });

    adminToken = jwt.sign({ id: adminUser.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const appRecord = await MembershipApplication.create({
      name: 'Fee Test Member',
      psn: 'FEE_TEST_001',
      email: 'fee_test@example.com',
      phone: '08000000000',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Kin',
      next_of_kin_phone: '08000000001',
      status: 'approved',
      savings: 3000,
      investment: 3000,
      target_saving: 1000
    });

    memberUser = await User.create({
      membership_application_id: appRecord.id,
      role: 'member',
      status: 'active',
      password_hash: 'hashed'
    });

    memberToken = jwt.sign({ id: memberUser.id, role: 'member' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('applies registration fee on first contribution and scales buckets', async () => {
    const res = await request(app)
      .post('/contributions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        user_id: memberUser.id,
        savings: 5000,
        investment: 3000,
        target_saving: 2000,
        month: 1,
        year: 2026,
        payment_method: 'bank_transfer'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.fee_applied).toBeDefined();
    expect(res.body.fee_applied.type).toBe('registration_fee');
    expect(res.body.fee_applied.amount).toBeGreaterThan(0);

    const contribution = res.body.contribution;
    expect(contribution.total_amount).toBeCloseTo(10000 - res.body.fee_applied.amount, 2);
    const sumBuckets = parseFloat(contribution.savings) + parseFloat(contribution.investment) + parseFloat(contribution.target_saving);
    expect(sumBuckets).toBeCloseTo(contribution.total_amount, 2);
  });

  test('applies monthly admin fee on subsequent contribution', async () => {
    const res = await request(app)
      .post('/contributions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        user_id: memberUser.id,
        savings: 4000,
        investment: 4000,
        target_saving: 2000,
        month: 2,
        year: 2026,
        payment_method: 'bank_transfer'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.fee_applied).toBeDefined();
    expect(res.body.fee_applied.type).toBe('monthly_admin_fee');
    expect(res.body.fee_applied.amount).toBeGreaterThan(0);

    const contribution = res.body.contribution;
    const expectedNet = 10000 - res.body.fee_applied.amount;
    expect(contribution.total_amount).toBeCloseTo(expectedNet, 2);
    const sumBuckets = parseFloat(contribution.savings) + parseFloat(contribution.investment) + parseFloat(contribution.target_saving);
    expect(sumBuckets).toBeCloseTo(contribution.total_amount, 2);
  });

  test('allows multiple contributions in the same month and does not reapply monthly admin fee', async () => {
    const res = await request(app)
      .post('/contributions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        user_id: memberUser.id,
        savings: 2000,
        investment: 2000,
        target_saving: 1000,
        month: 2,
        year: 2026,
        payment_method: 'bank_transfer'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.fee_applied).toBeDefined();
    expect(res.body.fee_applied.type).toBe('none');
    expect(res.body.fee_applied.amount).toBe(0);
  });

  test('allows multiple admin contributions by PSN in the same month', async () => {
    const payload = {
      psn: 'FEE_TEST_001',
      totalAmount: 5000,
      month: 3,
      year: 2026,
      paymentMethod: 'bank_transfer'
    };

    const first = await request(app)
      .post('/contributions/by-psn')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(first.status).toBe(201);
    expect(first.body.success).toBe(true);

    const second = await request(app)
      .post('/contributions/by-psn')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(second.status).toBe(201);
    expect(second.body.success).toBe(true);

    const count = await require('../models').Contribution.count({ where: { user_id: memberUser.id, month: 3, year: 2026 } });
    expect(count).toBe(2);
  });
});

