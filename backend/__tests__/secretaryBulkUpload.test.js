const request = require('supertest');
const app = require('../app');
const { sequelize, User, MembershipApplication } = require('../models');
const jwt = require('jsonwebtoken');

describe('Secretary Bulk Upload Protection', () => {
  let secretaryToken;
  let adminToken;
  let secretaryUser;
  let adminUser;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    await sequelize.sync({ force: true });

    // Create Secretary User
    const secApp = await MembershipApplication.create({
      name: 'Secretary Upload Test',
      psn: 'SEC_UPLOAD_TEST',
      email: 'sec_upload@test.com',
      phone: '08000000005',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Test NOK',
      next_of_kin_phone: '08000000001',
      status: 'approved'
    });

    secretaryUser = await User.create({
      membership_application_id: secApp.id,
      password_hash: 'hashed',
      role: 'secretary',
      status: 'active',
      is_default_password: false
    });

    secretaryToken = jwt.sign(
      { id: secretaryUser.id, role: secretaryUser.role },
      process.env.JWT_SECRET
    );

    // Create Admin User (for comparison)
    const adminApp = await MembershipApplication.create({
      name: 'Admin Upload Test',
      psn: 'ADM_UPLOAD_TEST',
      email: 'adm_upload@test.com',
      phone: '08000000006',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '08000000002',
      status: 'approved'
    });

    adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: 'hashed',
      role: 'admin',
      status: 'active',
      is_default_password: false
    });

    adminToken = jwt.sign(
      { id: adminUser.id, role: adminUser.role },
      process.env.JWT_SECRET
    );
  });

  afterAll(async () => {
    if (secretaryUser) await secretaryUser.destroy({ force: true });
    if (adminUser) await adminUser.destroy({ force: true });
    await sequelize.close();
  });

  test('blocks secretary from accessing bulk upload endpoint', async () => {
    const res = await request(app)
      .post('/loan-repayments/bulk-upload')
      .set('Authorization', `Bearer ${secretaryToken}`)
      .attach('file', Buffer.from('dummy content'), 'test.csv');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Access denied/i);
  });

  test('allows admin to access bulk upload endpoint (auth check)', async () => {
    const res = await request(app)
      .post('/loan-repayments/bulk-upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('dummy content'), 'test.csv');

    expect(res.status).not.toBe(403);
  });
});
