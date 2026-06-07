const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../app');
const { sequelize, User, MembershipApplication, ActivityLog } = require('../models');

describe('Secretary access controls', () => {
  let token;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.NODE_ENV = 'test';

    await sequelize.sync({ force: true });

    const membershipApplication = await MembershipApplication.create({
      name: 'Secretary User',
      psn: 'SECRETARY001',
      email: 'secretary@example.com',
      phone: '08000000000',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Test NOK',
      next_of_kin_phone: '08000000001',
      status: 'approved'
    });

    const user = await User.create({
      membership_application_id: membershipApplication.id,
      password_hash: 'hashed',
      role: 'secretary',
      status: 'active',
      is_default_password: false
    });

    token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('allows viewing chairman stats and logs access', async () => {
    const response = await request(app)
      .get('/dashboard/chairman/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);

    const logCount = await ActivityLog.count({ where: { action: 'secretary_view' } });
    expect(logCount).toBeGreaterThanOrEqual(1);
  });

  test('blocks secretary from creating expenses', async () => {
    const response = await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'X' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('success', false);
  });

  test('blocks secretary from updating expenses', async () => {
    const response = await request(app)
      .put('/expenses/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('success', false);
  });

  test('allows secretary to view loans', async () => {
    const response = await request(app)
      .get('/loans')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(Array.isArray(response.body.loans)).toBe(true);
  });
});

