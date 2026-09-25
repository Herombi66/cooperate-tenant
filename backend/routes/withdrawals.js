const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

/**
 * Check if withdrawals are disabled for this tenant (FMCKSMCS)
 */
const checkTenantWithdrawalAccess = (req, res, next) => {
  const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'] || req.user?.tenant_id || req.query?.tenant || '';
  const tenantName = (req.tenant?.name || '').toLowerCase();
  const normalizedId = String(tenantId).toLowerCase();

  const isFmck = normalizedId === 'fmcksmcs' || 
                 normalizedId === 'fmck' || 
                 tenantName.includes('kumo') || 
                 tenantName.includes('fmck');

  if (isFmck) {
    return res.status(403).json({
      success: false,
      message: 'Withdrawals module is not available for this cooperative.'
    });
  }
  next();
};

router.use(checkTenantWithdrawalAccess);

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
