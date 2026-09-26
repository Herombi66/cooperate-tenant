const request = require('supertest');
const fs = require('fs');
const app = require('../app');
const { sequelize } = require('../db/connection');
const { User, MembershipApplication, Contribution, Loan, Settings, SystemBackup } = require('../models');
const jwt = require('jsonwebtoken');

const createToken = (user, membershipApplication) => {
  return jwt.sign(
    { id: user.id, psn: membershipApplication?.psn || 'ADM001', role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
};

describe('System Backup & Data Export API', () => {
  let adminUser, adminMembership, adminToken;
  let memberUser, memberMembership, memberToken;
  let createdBackupId;
  let createdFilepath;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Seed Admin
    adminMembership = await MembershipApplication.create({
      name: 'Super Administrator',
      psn: 'ADM-BACKUP-01',
      email: 'admin.backup@example.com',
      phone: '08099990001',
      facility_name: 'HQ',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '08099990002',
      savings: 0,
      investment: 0
    });

    adminUser = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'hashed_secret_password',
      role: 'admin',
      status: 'active'
    });

    adminToken = createToken(adminUser, adminMembership);

    // Seed Regular Member
    memberMembership = await MembershipApplication.create({
      name: 'Regular Member',
      psn: 'MEM-BACKUP-01',
      email: 'member.backup@example.com',
      phone: '08099990003',
      facility_name: 'Branch Clinic',
      next_of_kin_name: 'Member NOK',
      next_of_kin_phone: '08099990004',
      savings: 25000,
      investment: 10000
    });

    memberUser = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'member_secret_password',
      role: 'member',
      status: 'active'
    });

    memberToken = createToken(memberUser, memberMembership);

    // Seed sample Settings and Contributions
    await Settings.create({
      key: 'cooperative_name',
      value: JSON.stringify('IMAN Multi-Purpose Cooperative Society'),
      category: 'general'
    });

    await Contribution.create({
      user_id: memberUser.id,
      savings: 25000,
      investment: 10000,
      target_saving: 5000,
      payment_method: 'bank_transfer',
      total_amount: 40000,
      status: 'approved',
      month: 1,
      year: new Date().getFullYear()
    });
  });

  afterAll(async () => {
    // Clean up created test backup file if still present
    if (createdFilepath && fs.existsSync(createdFilepath)) {
      try {
        fs.unlinkSync(createdFilepath);
      } catch (e) {}
    }
    await sequelize.close();
  });

  test('Non-admin user cannot access backup endpoints (403 Forbidden)', async () => {
    const listRes = await request(app)
      .get('/settings/backups')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(listRes.status).toBe(403);

    const createRes = await request(app)
      .post('/settings/backups')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ format: 'json' });

    expect(createRes.status).toBe(403);
  });

  test('Admin can create a full JSON system backup with sanitized credentials', async () => {
    const res = await request(app)
      .post('/settings/backups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        format: 'json',
        notes: 'Pre-upgrade manual snapshot'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.backup).toBeDefined();
    expect(res.body.backup.format).toBe('json');
    expect(res.body.backup.status).toBe('completed');
    expect(res.body.backup.total_records).toBeGreaterThan(0);

    createdBackupId = res.body.backup.id;
    createdFilepath = res.body.backup.filepath;

    // Verify file exists on disk and structure is valid
    expect(fs.existsSync(createdFilepath)).toBe(true);
    const rawContent = fs.readFileSync(createdFilepath, 'utf8');
    const parsed = JSON.parse(rawContent);

    expect(parsed.system).toContain('IMAN');
    expect(parsed.data).toBeDefined();
    expect(parsed.data.users).toBeDefined();

    // Verify sensitive password hashes are redacted
    parsed.data.users.forEach(u => {
      expect(u.password_hash).toBeUndefined();
      expect(u.reset_password_token).toBeUndefined();
    });
  });

  test('Admin can create a full SQL dump system backup', async () => {
    const res = await request(app)
      .post('/settings/backups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        format: 'sql',
        notes: 'SQL Dump export test'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.backup.format).toBe('sql');

    const sqlFile = res.body.backup.filepath;
    expect(fs.existsSync(sqlFile)).toBe(true);
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    expect(sqlContent).toContain('BEGIN;');
    expect(sqlContent).toContain('COMMIT;');
    expect(sqlContent).toContain('INSERT INTO "settings"');

    // Clean up SQL test file
    try {
      fs.unlinkSync(sqlFile);
    } catch (e) {}
  });

  test('Admin can list backups and get backup stats', async () => {
    const listRes = await request(app)
      .get('/settings/backups')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    const statsRes = await request(app)
      .get('/settings/backups/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.success).toBe(true);
    expect(statsRes.body.stats.total_backups).toBeGreaterThanOrEqual(1);
    expect(statsRes.body.stats.total_storage_bytes).toBeGreaterThan(0);
    expect(statsRes.body.stats.supported_tables).toBeGreaterThan(10);
  });

  test('Admin can download a backup file', async () => {
    expect(createdBackupId).toBeDefined();

    const res = await request(app)
      .get(`/settings/backups/${createdBackupId}/download`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename=/i);
    expect(res.headers['content-type']).toMatch(/application\/json/i);
  });

  test('Admin can export a module directly to CSV', async () => {
    const res = await request(app)
      .get('/settings/backups/export-csv/members')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/i);
    expect(res.headers['content-disposition']).toMatch(/members_export_/i);
    expect(res.text).toContain('name');
    expect(res.text).toContain('Super Administrator');
    expect(res.text).toContain('Regular Member');
  });

  test('Admin can delete a backup and its physical file', async () => {
    expect(createdBackupId).toBeDefined();

    const deleteRes = await request(app)
      .delete(`/settings/backups/${createdBackupId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify record is gone from DB
    const checkRecord = await SystemBackup.findByPk(createdBackupId);
    expect(checkRecord).toBeNull();

    // Verify file is gone from disk
    expect(fs.existsSync(createdFilepath)).toBe(false);
  });
});
