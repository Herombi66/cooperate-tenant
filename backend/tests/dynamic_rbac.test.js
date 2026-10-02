const request = require('supertest');
const { sequelize } = require('../db/connection');
const { 
  User, 
  Role, 
  Module, 
  RolePermission, 
  ActivityLog, 
  MembershipApplication 
} = require('../models');
const { seedModulesAndRBAC } = require('../db/seedModulesAndRBAC');
const { requireModulePermission } = require('../middleware/rbac');
const app = require('../app');
const jwt = require('jsonwebtoken');

describe('Dynamic RBAC System & Module Permissions', () => {
  let adminUser, adminToken;
  let treasurerUser, treasurerToken;
  let chairmanUser, chairmanToken;
  let treasurerRole, chairmanRole, adminRole;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_12345';
    await sequelize.sync({ force: true });
    await seedModulesAndRBAC();

    adminRole = await Role.findOne({ where: { name: 'admin' } });
    treasurerRole = await Role.findOne({ where: { name: 'treasurer' } });
    chairmanRole = await Role.findOne({ where: { name: 'chairman' } });

    // Create Admin User
    const adminApp = await MembershipApplication.create({
      psn: 'ADM001',
      name: 'System Admin',
      email: 'admin@coop.com',
      phone: '08011111111',
      facility_name: 'Main Center',
      next_of_kin_name: 'Admin Kin',
      next_of_kin_phone: '08022222222',
      tenant_id: 'default',
      status: 'approved'
    });
    adminUser = await User.create({
      membership_application_id: adminApp.id,
      role: 'admin',
      tenant_id: 'default',
      password_hash: 'hash',
      status: 'active'
    });
    adminToken = jwt.sign({ id: adminUser.id, role: 'admin' }, process.env.JWT_SECRET);

    // Create Treasurer User
    const treasApp = await MembershipApplication.create({
      psn: 'TREAS001',
      name: 'Coop Treasurer',
      email: 'treasurer@coop.com',
      phone: '08033333333',
      facility_name: 'Main Center',
      next_of_kin_name: 'Treas Kin',
      next_of_kin_phone: '08044444444',
      tenant_id: 'default',
      status: 'approved'
    });
    treasurerUser = await User.create({
      membership_application_id: treasApp.id,
      role: 'treasurer',
      tenant_id: 'default',
      password_hash: 'hash',
      status: 'active'
    });
    treasurerToken = jwt.sign({ id: treasurerUser.id, role: 'treasurer' }, process.env.JWT_SECRET);

    // Create Chairman User
    const chairApp = await MembershipApplication.create({
      psn: 'CHAIR001',
      name: 'Coop Chairman',
      email: 'chairman@coop.com',
      phone: '08055555555',
      facility_name: 'Main Center',
      next_of_kin_name: 'Chair Kin',
      next_of_kin_phone: '08066666666',
      tenant_id: 'default',
      status: 'approved'
    });
    chairmanUser = await User.create({
      membership_application_id: chairApp.id,
      role: 'chairman',
      tenant_id: 'default',
      password_hash: 'hash',
      status: 'active'
    });
    chairmanToken = jwt.sign({ id: chairmanUser.id, role: 'chairman' }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('1. Seed initializes standard modules and roles', async () => {
    const moduleCount = await Module.count();
    const roleCount = await Role.count();
    const permCount = await RolePermission.count();

    expect(moduleCount).toBeGreaterThanOrEqual(18);
    expect(roleCount).toBeGreaterThanOrEqual(10);
    expect(permCount).toBeGreaterThan(100);
  });

  test('2. Admin can fetch complete permission matrix', async () => {
    const res = await request(app)
      .get('/rbac/matrix')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.roles.length).toBeGreaterThan(0);
    expect(res.body.modules.length).toBeGreaterThan(0);
    expect(res.body.matrix).toBeDefined();

    // Verify matrix entry for chairman on loans
    const loanMod = res.body.modules.find(m => m.key === 'loans');
    expect(res.body.matrix[chairmanRole.id][loanMod.id]).toBeDefined();
  });

  test('3. Non-admin cannot access permission matrix', async () => {
    const res = await request(app)
      .get('/rbac/matrix')
      .set('Authorization', `Bearer ${treasurerToken}`);

    expect(res.status).toBe(403);
  });

  test('4. Admin can update permissions for an executive role and audit trail is logged', async () => {
    const loanMod = await Module.findOne({ where: { key: 'loans' } });

    const updatePayload = {
      permissions: [
        {
          module_id: loanMod.id,
          can_read: true,
          can_write: false,
          can_edit: true,
          can_delete: false
        }
      ]
    };

    const res = await request(app)
      .put(`/rbac/roles/${treasurerRole.id}/module-permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify updated record in DB
    const updated = await RolePermission.findOne({
      where: { role_id: treasurerRole.id, module_id: loanMod.id }
    });
    expect(updated.can_write).toBe(false);
    expect(updated.can_edit).toBe(true);

    // Verify Audit Log
    const auditLogs = await ActivityLog.findAll({
      where: { resource_type: 'rbac', action: 'update_role_permissions' }
    });
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  test('5. Safeguard: Attempts to modify Administrator permissions are rejected', async () => {
    const loanMod = await Module.findOne({ where: { key: 'loans' } });

    const res = await request(app)
      .put(`/rbac/roles/${adminRole.id}/module-permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        permissions: [{ module_id: loanMod.id, can_read: false }]
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Administrator privileges cannot be modified');
  });

  test('6. Admin can dynamically create and delete custom modules', async () => {
    // Create custom module
    const createRes = await request(app)
      .post('/rbac/modules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Procurement & Logistics',
        key: 'procurement_logistics',
        category: 'Operations',
        description: 'Manage equipment procurement'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const newModuleId = createRes.body.module.id;

    // Verify module exists and permissions were auto-provisioned
    const perms = await RolePermission.findAll({ where: { module_id: newModuleId } });
    expect(perms.length).toBeGreaterThan(0);

    // System modules cannot be deleted
    const sysMod = await Module.findOne({ where: { is_system: true } });
    const delSysRes = await request(app)
      .delete(`/rbac/modules/${sysMod.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delSysRes.status).toBe(403);

    // Custom module can be deleted
    const delCustomRes = await request(app)
      .delete(`/rbac/modules/${newModuleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delCustomRes.status).toBe(200);
  });

  test('7. Authenticated user can fetch their effective permissions map', async () => {
    const res = await request(app)
      .get('/rbac/my-permissions')
      .set('Authorization', `Bearer ${treasurerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.permissions).toBeDefined();
    expect(res.body.permissions.contributions).toBeDefined();
    expect(res.body.isAdmin).toBe(false);
  });

  test('8. Reset to defaults restores default permissions for role', async () => {
    const res = await request(app)
      .post('/rbac/reset-defaults')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleId: treasurerRole.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
