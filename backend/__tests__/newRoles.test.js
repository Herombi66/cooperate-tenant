const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const app = require('../app');
const { sequelize } = require('../db/connection');
const { User, MembershipApplication } = require('../models');

describe('New Roles Suite (Secretary, Assistant Secretary, Financial Secretary, Auditor, PRO)', () => {
  let adminToken;
  let testMember;
  let testApp;

  const createTestApp = async (overrides = {}) => {
    return await MembershipApplication.create({
      psn: overrides.psn || `PSN_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: overrides.name || 'Test User',
      email: overrides.email || `user_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
      phone: '08011112222',
      facility_name: 'General Hospital',
      next_of_kin_name: 'Jane Doe',
      next_of_kin_phone: '08033334444',
      status: 'approved',
      savings: 50000,
      investment: 20000,
      ...overrides
    });
  };

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    testApp = await createTestApp({
      psn: 'PSN_ROLE_TEST_101',
      name: 'Role Test Member',
      email: 'roletest@example.com'
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    testMember = await User.create({
      membership_application_id: testApp.id,
      password_hash: hashedPassword,
      role: 'member',
      status: 'active'
    });

    const adminApp = await createTestApp({
      psn: 'PSN_ADMIN_ROLE_001',
      name: 'Admin User',
      email: 'admin_role@example.com'
    });

    const adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: hashedPassword,
      role: 'admin',
      status: 'active'
    });

    adminToken = jwt.sign(
      { id: adminUser.id, role: 'admin', psn: adminApp.psn },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const newRoles = ['secretary', 'assistant_secretary', 'financial_secretary', 'auditor', 'pro'];

  test('Validates that assignMemberRole accepts all new roles', async () => {
    for (const role of newRoles) {
      const appRecord = await createTestApp({
        psn: `PSN_${role.toUpperCase()}`,
        name: `${role} User`,
        email: `${role}@example.com`
      });

      const res = await request(app)
        .post(`/users/${appRecord.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.member.role).toBe(role);
    }
  });

  test('Validates that assignAdditionalRole creates leadership accounts for all new roles', async () => {
    for (const role of newRoles) {
      const res = await request(app)
        .post(`/users/${testMember.id}/additional-role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ additionalRole: role });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.newAccount.role).toBe(role);
    }
  });

  test('Role-specific login works with suffix for each new role', async () => {
    for (const role of newRoles) {
      const appRecord = await createTestApp({
        psn: `LOGIN_TEST_${role.toUpperCase()}`,
        name: `Login ${role}`,
        email: `login_${role}@example.com`
      });

      const hashedPassword = await bcrypt.hash('Secret123!', 10);
      await User.create({
        membership_application_id: appRecord.id,
        password_hash: hashedPassword,
        role: role,
        status: 'active'
      });

      const res = await request(app)
        .post('/auth/login')
        .send({
          psn: `${appRecord.psn}_${role}`,
          password: 'Secret123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe(role);
    }
  });

  test('GET /users with role filter works for new roles', async () => {
    const res = await request(app)
      .get('/users?role=secretary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.users.every(u => u.role === 'secretary')).toBe(true);
  });

  test('Staff members route allows access to secretary and auditor', async () => {
    const secApp = await createTestApp({ psn: 'SEC_ROUTE_001', name: 'Sec User', email: 'sec@example.com' });
    const secUser = await User.create({
      membership_application_id: secApp.id,
      password_hash: 'hash',
      role: 'secretary',
      status: 'active'
    });
    const secretaryToken = jwt.sign(
      { id: secUser.id, role: 'secretary', psn: secApp.psn },
      process.env.JWT_SECRET || 'test-secret'
    );

    const audApp = await createTestApp({ psn: 'AUD_ROUTE_001', name: 'Aud User', email: 'aud@example.com' });
    const audUser = await User.create({
      membership_application_id: audApp.id,
      password_hash: 'hash',
      role: 'auditor',
      status: 'active'
    });
    const auditorToken = jwt.sign(
      { id: audUser.id, role: 'auditor', psn: audApp.psn },
      process.env.JWT_SECRET || 'test-secret'
    );

    const secRes = await request(app)
      .get('/members')
      .set('Authorization', `Bearer ${secretaryToken}`);
    expect(secRes.status).toBe(200);

    const audRes = await request(app)
      .get('/members')
      .set('Authorization', `Bearer ${auditorToken}`);
    expect(audRes.status).toBe(200);
  });
});
