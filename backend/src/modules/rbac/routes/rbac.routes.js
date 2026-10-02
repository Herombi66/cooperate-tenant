const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbac.controller');
const { authenticateToken, requireAdmin } = require('../../../../middleware/auth');
const { can } = require('../../../../middleware/rbac');

// 1. Current user effective permissions (accessible to all authenticated users)
router.get('/my-permissions', authenticateToken, rbacController.getMyPermissions);

// 2. Permission matrix (Admin/Super Admin only)
router.get('/matrix', authenticateToken, requireAdmin, rbacController.getMatrix);

// 3. Module permissions management
router.put('/roles/:id/module-permissions', authenticateToken, requireAdmin, rbacController.updateRoleModulePermissions);
router.post('/roles/:id/module-permissions', authenticateToken, requireAdmin, rbacController.updateRoleModulePermissions);
router.post('/bulk-update', authenticateToken, requireAdmin, rbacController.bulkUpdatePermissions);
router.post('/copy-permissions', authenticateToken, requireAdmin, rbacController.copyRolePermissions);
router.post('/reset-defaults', authenticateToken, requireAdmin, rbacController.resetToDefaults);

// 4. Dynamic Module management
router.get('/modules', authenticateToken, rbacController.getModules);
router.post('/modules', authenticateToken, requireAdmin, rbacController.createModule);
router.delete('/modules/:id', authenticateToken, requireAdmin, rbacController.deleteModule);

// 5. Audit Trail for permission changes
router.get('/audit-logs', authenticateToken, requireAdmin, rbacController.getRbacAuditLogs);

// 6. Role management routes (backward compatible)
router.get('/roles', authenticateToken, can('manage_roles'), rbacController.getRoles);
router.post('/roles', authenticateToken, requireAdmin, rbacController.createRole);
router.put('/roles/:id', authenticateToken, requireAdmin, rbacController.updateRole);
router.post('/roles/:id/permissions', authenticateToken, requireAdmin, rbacController.updateRoleModulePermissions);
router.delete('/roles/:id', authenticateToken, requireAdmin, rbacController.deleteRole);

// 7. Legacy Permissions & User Roles
router.get('/permissions', authenticateToken, can('manage_roles'), rbacController.getPermissions);
router.post('/user-roles', authenticateToken, requireAdmin, rbacController.assignUserRole);

module.exports = router;
