const request = require('supertest');
const app = require('../app'); // Correct import
const { User, MembershipApplication, sequelize } = require('../models');
const jwt = require('jsonwebtoken');

describe('Member Search Limit Test', () => {
  let adminToken;
  let createdApps = [];

  beforeAll(async () => {
    // Ensure clean state
    await sequelize.sync({ force: true });

    // Create admin user
    const adminApp = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADMIN_SEARCH_TEST',
      email: 'admin_search@test.com',
      phone: '08000000000',
      facility_name: 'Test Facility',
      next_of_kin_name: 'NOK',
      next_of_kin_phone: '08000000000',
      status: 'approved'
    });

    const adminUser = await User.create({
      membership_application_id: adminApp.id,
      role: 'admin',
      status: 'active',
      password_hash: 'hash'
    });

    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, process.env.JWT_SECRET || 'test-secret');

    // Create 15 matching members
    for (let i = 1; i <= 15; i++) {
      const app = await MembershipApplication.create({
        name: `Search Match ${i}`,
        psn: `SEARCH_MATCH_${i.toString().padStart(3, '0')}`,
        email: `search${i}@test.com`,
        phone: `080000000${i}`,
        facility_name: 'Test Facility',
        next_of_kin_name: 'NOK',
        next_of_kin_phone: '08000000000',
        status: 'approved'
      });
      createdApps.push(app);
    }
  });

  afterAll(async () => {
    // Cleanup
    await User.destroy({ where: { role: 'admin' }, force: true });
    await MembershipApplication.destroy({ where: { psn: { [require('sequelize').Op.like]: 'SEARCH_MATCH_%' } }, force: true });
    await MembershipApplication.destroy({ where: { psn: 'ADMIN_SEARCH_TEST' }, force: true });
    await sequelize.close();
  });

  test('should return more than 10 results for search', async () => {
    const res = await request(app)
      .get('/users/search?q=SEARCH_MATCH')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.members.length).toBeGreaterThan(10);
    expect(res.body.members.length).toBe(15);
  });
});
