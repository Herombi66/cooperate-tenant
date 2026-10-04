const express = require('express');
const { searchMembers, assignMemberRole, assignAdditionalRole, removeUserRole, getUsersWithRoles, adminResetPassword } = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

const adminOnly = authorizeRole(['admin', 'super_admin']);

// GET /users/search - Search members
router.get('/search', authenticateToken, adminOnly, searchMembers);

// GET /users - Get all users with roles
router.get('/', authenticateToken, adminOnly, getUsersWithRoles);

// POST /users/:membershipApplicationId/role - Assign role to member
router.post('/:membershipApplicationId/role', authenticateToken, adminOnly, assignMemberRole);

// POST /users/:userId/additional-role - Assign additional role to member
router.post('/:userId/additional-role', authenticateToken, adminOnly, assignAdditionalRole);

// POST /users/:userId/reset-password - Admin reset password
router.post('/:userId/reset-password', authenticateToken, adminOnly, adminResetPassword);

// DELETE /users/:userId/role - Remove user role/account
router.delete('/:userId/role', authenticateToken, adminOnly, removeUserRole);

module.exports = router;
