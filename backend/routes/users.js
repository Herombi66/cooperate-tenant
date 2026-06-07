const express = require('express');
const { searchMembers, assignMemberRole, assignAdditionalRole, removeUserRole, getUsersWithRoles, adminResetPassword } = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /users/search - Search members (Admins only)
router.get('/search', authenticateToken, requireAdmin, searchMembers);

// GET /users - Get all users with roles (Admins only)
router.get('/', authenticateToken, requireAdmin, getUsersWithRoles);

// POST /users/:membershipApplicationId/role - Assign role to member (Admins only)
router.post('/:membershipApplicationId/role', authenticateToken, requireAdmin, assignMemberRole);

// POST /users/:userId/additional-role - Assign additional role to member (Admins only)
router.post('/:userId/additional-role', authenticateToken, requireAdmin, assignAdditionalRole);

// POST /users/:userId/reset-password - Admin reset password (Admins only)
router.post('/:userId/reset-password', authenticateToken, requireAdmin, adminResetPassword);

// DELETE /users/:userId/role - Remove user role/account (Admins only)
router.delete('/:userId/role', authenticateToken, requireAdmin, removeUserRole);

module.exports = router;
