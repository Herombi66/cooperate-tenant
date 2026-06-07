process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize, User, MembershipApplication } = require('../models');

describe('Bulk Upload Tracking (Members Import)', () => {
  jest.setTimeout(30000);
  let adminToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const adminMembership = await MembershipApplication.create({
      name: 'Admin Bulk',
      psn: 'ADMIN_BULK_001',
      email: 'admin_bulk@test.local',
      phone: '3333333333',
      facility_name: 'Admin Facility',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '3333300000',
      status: 'approved'
    });

    const admin = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'password',
      role: 'admin',
      can_liquidate_loans: true
    });

    adminToken = jwt.sign({ id: admin.id }, 'test_secret');
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('creates a batch and persists per-row errors', async () => {
    const csv = [
      'PSN,Name,Email,Phone,Facility,Next of Kin Name,Next of Kin Phone,Savings,Investment,Target Saving,Target Period,Role,Status',
      'TESTP1,Valid User,valid1@test.local,0800000000,Facility A,Nok A,0800000001,3000,3000,0,12,member,active',
      'TESTP2,Bad User,,0800000002,Facility B,Nok B,0800000003,3000,3000,0,12,member,active'
    ].join('\n');

    const res = await request(app)
      .post('/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), 'members.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.batch_id).toBeDefined();

    const batchId = res.body.batch_id;

    const historyRes = await request(app)
      .get('/bulk-uploads')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.success).toBe(true);
    expect(Array.isArray(historyRes.body.batches)).toBe(true);

    const errorsRes = await request(app)
      .get(`/bulk-uploads/${batchId}/errors`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(errorsRes.status).toBe(200);
    expect(errorsRes.body.success).toBe(true);
    expect(Array.isArray(errorsRes.body.errors)).toBe(true);
    expect(errorsRes.body.errors.length).toBeGreaterThan(0);
  });
});
