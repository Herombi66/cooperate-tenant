process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize, User, MembershipApplication, ActivityLog } = require('../models');

describe('Admin Security Center API - Real Data Verification', () => {
  let adminUser;
  let adminToken;
  let memberUser;
  let memberToken;
  let testIncident;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Create Admin User
    const adminApp = await MembershipApplication.create({
      name: 'System Administrator',
      psn: 'ADMIN001',
      email: 'admin@imanmcs.local',
      phone: '0800000001',
      facility_name: 'HQ',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '0800000002',
      status: 'approved'
    });
    adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: 'hashedpassword',
      role: 'admin',
      status: 'active'
    });
    adminToken = jwt.sign({ id: adminUser.id, role: 'admin' }, 'test_secret');

    // Create Normal Member User
    const memberApp = await MembershipApplication.create({
      name: 'Regular Member',
      psn: 'MEM001',
      email: 'member@imanmcs.local',
      phone: '0800000003',
      facility_name: 'Branch A',
      next_of_kin_name: 'Member NOK',
      next_of_kin_phone: '0800000004',
      status: 'approved'
    });
    memberUser = await User.create({
      membership_application_id: memberApp.id,
      password_hash: 'hashedpassword',
      role: 'member',
      status: 'active'
    });
    memberToken = jwt.sign({ id: memberUser.id, role: 'member' }, 'test_secret');

    // Seed real ActivityLog events for real-data testing
    await ActivityLog.create({
      user_id: null,
      user_name: 'PSN: MEM999',
      user_role: 'unauthenticated',
      action: 'auth_login_failed',
      resource_type: 'security_auth',
      description: 'Failed login for PSN "MEM999": Invalid password',
      ip_address: '197.210.55.12'
    });

    await ActivityLog.create({
      user_id: memberUser.id,
      user_name: 'Regular Member',
      user_role: 'member',
      action: 'auth_login_success',
      resource_type: 'security_auth',
      description: 'Successful login for Regular Member',
      ip_address: '102.89.44.10'
    });

    testIncident = await ActivityLog.create({
      user_id: null,
      user_name: 'Scanner Bot',
      user_role: 'unauthenticated',
      action: 'suspicious_burst_failed_logins',
      resource_type: 'suspicious_activity',
      description: 'Multiple failed logins detected from IP 197.210.55.12',
      ip_address: '197.210.55.12'
    });

    await ActivityLog.create({
      user_id: adminUser.id,
      user_name: 'System Administrator',
      user_role: 'admin',
      action: 'auth_admin_session_started',
      resource_type: 'security_admin_session',
      description: 'Administrative session initiated by System Administrator',
      ip_address: '102.89.33.15'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('rejects unauthenticated requests to /security/overview with 401', async () => {
    const res = await request(app).get('/security/overview');
    expect(res.status).toBe(401);
  });

  it('rejects regular members from /security/overview with 403', async () => {
    const res = await request(app)
      .get('/security/overview')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows admin to fetch /security/overview with all 8 real metrics', async () => {
    const res = await request(app)
      .get('/security/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.metrics).toBeDefined();

    const m = res.body.data.metrics;
    expect(typeof m.failed_logins).toBe('number');
    expect(typeof m.successful_logins).toBe('number');
    expect(typeof m.suspicious_activities).toBe('number');
    expect(typeof m.new_admin_sessions).toBe('number');
    expect(typeof m.large_transactions).toBe('number');
    expect(typeof m.permission_changes).toBe('number');
    expect(typeof m.data_exports).toBe('number');
    expect(typeof m.system_errors).toBe('number');

    // Matches real seeded records
    expect(m.failed_logins).toBe(1);
    expect(m.successful_logins).toBe(1);
    expect(m.suspicious_activities).toBe(1);
    expect(m.new_admin_sessions).toBe(1);

    expect(res.body.data.posture).toBeDefined();
  });

  it('allows admin to query /security/incidents with category and search filter', async () => {
    const res = await request(app)
      .get('/security/incidents?category=failed_logins&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.incidents)).toBe(true);
    expect(res.body.data.incidents.length).toBeGreaterThan(0);
    expect(res.body.data.incidents[0].category).toBe('failed_logins');
  });

  it('allows admin to block and unblock an IP address', async () => {
    const testIp = '203.0.113.42';

    // 1. Block IP
    const blockRes = await request(app)
      .post('/security/action')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        actionType: 'block_ip',
        targetIp: testIp
      });

    expect(blockRes.status).toBe(200);
    expect(blockRes.body.success).toBe(true);

    // Verify settings lists the blocked IP
    const settingsRes = await request(app)
      .get('/security/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(settingsRes.body.data.blockedIps).toContain(testIp);

    // 2. Unblock IP
    const unblockRes = await request(app)
      .post('/security/action')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        actionType: 'unblock_ip',
        targetIp: testIp
      });

    expect(unblockRes.status).toBe(200);
    expect(unblockRes.body.success).toBe(true);
  });

  it('allows admin to suspend/lock a user and force password reset', async () => {
    // Lock user
    const lockRes = await request(app)
      .post('/security/action')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        actionType: 'lock_user',
        targetUserId: memberUser.id
      });

    expect(lockRes.status).toBe(200);
    expect(lockRes.body.success).toBe(true);

    const updatedUser = await User.findByPk(memberUser.id);
    expect(updatedUser.status).toBe('suspended');

    // Force password reset
    const resetRes = await request(app)
      .post('/security/action')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        actionType: 'force_password_reset',
        targetUserId: memberUser.id
      });

    expect(resetRes.status).toBe(200);
    const resetUser = await User.findByPk(memberUser.id);
    expect(resetUser.is_default_password).toBe(true);

    // Unlock user
    const unlockRes = await request(app)
      .post('/security/action')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        actionType: 'unlock_user',
        targetUserId: memberUser.id
      });

    expect(unlockRes.status).toBe(200);
    const restoredUser = await User.findByPk(memberUser.id);
    expect(restoredUser.status).toBe('active');
  });

  it('allows admin to resolve and dismiss real incidents', async () => {
    const resolveRes = await request(app)
      .post('/security/action')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        actionType: 'resolve_incident',
        incidentId: String(testIncident.id),
        resolutionNotes: 'Investigated and cleared - verified as legitimate stress testing.'
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.success).toBe(true);

    // Verify incident reflects resolved status
    const listRes = await request(app)
      .get(`/security/incidents?search=${testIncident.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const item = listRes.body.data.incidents.find(i => String(i.id) === String(testIncident.id));
    expect(item).toBeDefined();
    expect(item.status).toBe('resolved');
    expect(item.resolution_notes).toContain('stress testing');
  });

  it('exports real incident audit log as CSV', async () => {
    const exportRes = await request(app)
      .get('/security/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toContain('text/csv');
    expect(exportRes.text).toContain('Incident ID');
    expect(exportRes.text).toContain('Category');
  });
});
