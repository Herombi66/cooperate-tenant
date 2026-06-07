const request = require('supertest');
const app = require('../app');
const { sequelize, User, MembershipApplication, LayyahApplication, Complaint, Settings } = require('../models');
const jwt = require('jsonwebtoken');

describe('Layyah and Complaint Verification Tests', () => {
  let userToken;
  let adminToken;
  let userId;
  let adminId;
  let userPsn = 'TEST_USER_PSN_001';

  jest.setTimeout(60000);

  beforeAll(async () => {
    // Sync database (force true to reset for tests)
    // NOTE: In a real environment, we'd use a test DB
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });

    // Create a regular user with membership
    const membership = await MembershipApplication.create({
      name: 'Test User',
      psn: userPsn,
      email: 'test@example.com',
      phone: '1234567890',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Test Kin',
      next_of_kin_phone: '0987654321',
      status: 'approved',
      application_date: new Date()
    });

    const user = await User.create({
      membership_application_id: membership.id,
      password_hash: 'hashedpassword',
      role: 'member',
      status: 'active'
    });
    userId = user.id;

    // Create token for user
    userToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });

    // Create an admin user
    const adminMembership = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADMIN_PSN_001',
      email: 'admin@example.com',
      phone: '1111111111',
      facility_name: 'Admin HQ',
      next_of_kin_name: 'Admin Kin',
      next_of_kin_phone: '1111111112',
      status: 'approved',
      application_date: new Date()
    });

    const admin = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'adminpassword',
      role: 'admin',
      status: 'active'
    });
    adminId = admin.id;

    adminToken = jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Layyah Seasonal Program Toggle', () => {
    it('should block Layyah application when seasonal program is disabled', async () => {
      // Set seasonal program to disabled
      await Settings.upsert({ key: 'layyah_seasonal_program_enabled', value: 'false' });

      const res = await request(app)
        .post('/layyah/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          animal_category: 'ram',
          quantity: 1,
          price_min: 50000,
          price_max: 70000,
          purpose: 'Test application'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('currently closed');
    });

    it('should block group join request when seasonal program is disabled', async () => {
      // Create a dummy group application first (as admin, bypassing toggle if needed or enabling temporarily)
      await Settings.upsert({ key: 'layyah_seasonal_program_enabled', value: 'true' });
      
      const groupRes = await request(app)
        .post('/layyah/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          kind: 'group',
          animal_category: 'cow',
          quantity: 1,
          price_min: 200000,
          price_max: 300000,
          purpose: 'Group for testing'
        });
      
      const groupId = groupRes.body.application.id;
      // Approve it so it can be joined
      await LayyahApplication.update({ status: 'approved' }, { where: { id: groupId } });

      // Now disable the program
      await Settings.upsert({ key: 'layyah_seasonal_program_enabled', value: 'false' });

      const res = await request(app)
        .post(`/layyah/groups/${groupId}/join`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('currently closed');
    });

    it('should allow Layyah application when seasonal program is enabled and capture PSN', async () => {
      // Enable seasonal program
      await Settings.upsert({ key: 'layyah_seasonal_program_enabled', value: 'true' });

      const res = await request(app)
        .post('/layyah/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          animal_category: 'goat',
          quantity: 2,
          price_min: 30000,
          price_max: 45000,
          purpose: 'Test PSN capture'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      
      // Verify PSN in database
      const application = await LayyahApplication.findByPk(res.body.application.id);
      expect(application.user_psn).toBe(userPsn);
    });
  });

  describe('Complaint PSN Capture', () => {
    it('should capture PSN when creating a complaint', async () => {
      const res = await request(app)
        .post('/complaints')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Complaint',
          description: 'Testing PSN capture for complaints',
          category: 'technical',
          priority: 'medium'
        });

      expect(res.status).toBe(201);
      
      // Verify PSN in database
      const complaint = await Complaint.findByPk(res.body.complaint.id);
      expect(complaint.user_psn).toBe(userPsn);
    });
  });
});
