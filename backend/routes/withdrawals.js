const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Get eligibility (Member)
router.get('/eligibility', authenticateToken, withdrawalController.getEligibility);

// Request withdrawal (Member)
router.post('/request', authenticateToken, withdrawalController.requestWithdrawal);

// Check eligibility for a user (Admin)
router.get('/admin/eligibility/:userId', authenticateToken, authorizeRole(['admin', 'super_admin']), withdrawalController.getAdminEligibility);

// Request withdrawal on behalf of user (Admin)
router.post('/admin/request', authenticateToken, authorizeRole(['admin', 'super_admin']), withdrawalController.adminRequestWithdrawal);

// Get all withdrawals (Member sees own, Admin sees all)
router.get('/', authenticateToken, withdrawalController.getWithdrawals);

// Approve/Reject (Treasurer, Chairman, Admin)
router.put('/:id/status', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer', 'chairman']), withdrawalController.updateStatus);

module.exports = router;
