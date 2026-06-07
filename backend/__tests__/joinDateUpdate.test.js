const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../app');
const { sequelize, User, MembershipApplication, ActivityLog } = require('../models');

describe('Admin Join Date Update', () => {
  let adminToken;
  let adminUser;
  let targetMember;
  let targetApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.NODE_ENV = 'test';

    // Sync database
    await sequelize.sync({ force: true });

    // Create Admin User
    const adminApp = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADMIN001',
      email: 'admin@example.com',
      phone: '08000000000',
      facility_name: 'HQ',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '08000000001',
      status: 'approved'
    });

    adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: 'hashed',
      role: 'admin',
      status: 'active',
      is_default_password: false
    });

    adminToken = jwt.sign({ id: adminUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Create Target Member
    targetApplication = await MembershipApplication.create({
      name: 'Target Member',
      psn: 'MEMBER001',
      email: 'member@example.com',
      phone: '08000000002',
      facility_name: 'Branch A',
      next_of_kin_name: 'Member NOK',
      next_of_kin_phone: '08000000003',
      status: 'approved',
      review_date: '2023-01-01' // Original join date
    });

    targetMember = await User.create({
      membership_application_id: targetApplication.id,
      password_hash: 'hashed',
      role: 'member',
      status: 'active',
      is_default_password: false
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('successfully updates member join date and logs activity', async () => {
    const newJoinDate = '2022-05-15';

    const response = await request(app)
      .put(`/members/${targetMember.id}/join-date`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ joinDate: newJoinDate });

    // 1. Verify Response
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.joinDate).toBe(newJoinDate);

    // 2. Verify Database Update
    const updatedApp = await MembershipApplication.findByPk(targetApplication.id);
    // review_date might be a Date object or string depending on Sequelize config
    const dbDate = new Date(updatedApp.review_date).toISOString().split('T')[0];
    expect(dbDate).toBe(newJoinDate);

    // 3. Verify Activity Log
    const log = await ActivityLog.findOne({
      where: {
        action: 'update_member_join_date',
        resource_id: targetMember.id
      },
      order: [['created_at', 'DESC']]
    });

    expect(log).toBeTruthy();
    expect(log.user_id).toBe(adminUser.id);
    expect(log.resource_type).toBe('member');
    expect(log.description).toContain('Updated member since date');
    expect(log.description).toContain(targetApplication.name);
    
    // Check metadata
    const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
    // previousDate might come back as full ISO string or YYYY-MM-DD depending on implementation
    expect(new Date(metadata.previousDate).toISOString().split('T')[0]).toBe('2023-01-01');
    expect(metadata.newDate).toBe(newJoinDate);
  });

  test('prevents future dates', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];

    const response = await request(app)
      .put(`/members/${targetMember.id}/join-date`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ joinDate: futureDateString });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('future');
  });

  test('validates date format', async () => {
    const response = await request(app)
      .put(`/members/${targetMember.id}/join-date`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ joinDate: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test('denies access to non-admin users', async () => {
    // Create a regular member token
    const memberToken = jwt.sign({ id: targetMember.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const response = await request(app)
      .put(`/members/${targetMember.id}/join-date`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ joinDate: '2022-01-01' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Access denied');
  });
});
