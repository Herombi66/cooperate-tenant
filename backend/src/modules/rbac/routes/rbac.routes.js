const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbac.controller');
const { authenticateToken } = require('../../../../middleware/auth');
const { can } = require('../../../../middleware/rbac');

// Role management routes
router.get('/roles', authenticateToken, can('manage_roles'), rbacController.getRoles);
router.post('/roles', authenticateToken, can('manage_roles'), rbacController.createRole);
router.put('/roles/:id', authenticateToken, can('manage_roles'), rbacController.updateRole);
router.delete('/roles/:id', authenticateToken, can('manage_roles'), rbacController.deleteRole);

// Permissions
router.get('/permissions', authenticateToken, can('manage_roles'), rbacController.getPermissions);

// User-Role Assignments
router.post('/user-roles', authenticateToken, can('manage_roles'), rbacController.assignUserRole);

module.exports = router;
