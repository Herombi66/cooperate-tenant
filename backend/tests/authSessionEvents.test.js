process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize, User, MembershipApplication, ActivityLog } = require('../models');

describe('Auth session events', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('logs idle warning events for authenticated users', async () => {
    const membership = await MembershipApplication.create({
      name: 'Member One',
      psn: 'PSN001',
      email: 'm1@test.local',
      phone: '0800',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0801',
      status: 'approved'
    });
    const user = await User.create({
      membership_application_id: membership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
    const token = jwt.sign({ id: user.id }, 'test_secret');

    const res = await request(app)
      .post('/auth/session-events')
      .set('Authorization', `Bearer ${token}`)
      .send({ event: 'idle_warning', metadata: { idle_for_ms: 50000 } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const logged = await ActivityLog.findOne({
      where: { user_id: user.id, action: 'auth_idle_warning', resource_type: 'auth_session' }
    });
    expect(logged).toBeTruthy();
    expect(logged.metadata.event).toBe('idle_warning');
  });

  it('rejects invalid events', async () => {
    const membership = await MembershipApplication.create({
      name: 'Member Two',
      psn: 'PSN002',
      email: 'm2@test.local',
      phone: '0802',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0803',
      status: 'approved'
    });
    const user = await User.create({
      membership_application_id: membership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
    const token = jwt.sign({ id: user.id }, 'test_secret');

    const res = await request(app)
      .post('/auth/session-events')
      .set('Authorization', `Bearer ${token}`)
      .send({ event: 'something_else' });

    expect(res.status).toBe(400);
  });
});

