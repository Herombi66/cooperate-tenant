const express = require('express');
const router = express.Router();
const {
  getFinancialReport,
  getMemberReport,
  getLoanReport,
  getExpenseReport,
  getProfitSharingReport,
  getComplianceReport,
  getFinancialTrackingReport,
  getMemberStatementReport,
  getGeneralLedgerReport
} = require('../controllers/reportsController');

// Middleware for authentication (assuming it's the same as other routes)
const { authenticateToken } = require('../middleware/auth');

// All report routes require admin authentication
router.use(authenticateToken);
router.use((req, res, next) => {
  const role = req.user?.role;
  const allowedRoles = ['admin', 'super_admin', 'chairman', 'secretary', 'treasurer', 'state_auditor'];
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient privileges for reports.'
    });
  }
  next();
});

// GET /reports/financial - Get financial summary report
router.get('/financial', getFinancialReport);

// GET /reports/financial-tracking - Fund allocations and admin fees
router.get('/financial-tracking', getFinancialTrackingReport);

// GET /reports/members - Get member activity report
router.get('/members', getMemberReport);

// GET /reports/loans - Get loan portfolio report
router.get('/loans', getLoanReport);

// GET /reports/expenses - Get expense analysis report
router.get('/expenses', getExpenseReport);

// GET /reports/profit-sharing - Get profit sharing analysis report
router.get('/profit-sharing', getProfitSharingReport);
// Backwards-compatible alias
router.get('/profit-share', getProfitSharingReport);

// GET /reports/compliance - Get compliance and audit report
router.get('/compliance', getComplianceReport);

// GET /reports/member-statement - Member account statement (json/csv/pdf)
router.get('/member-statement', getMemberStatementReport);

// GET /reports/general-ledger - General ledger (json/csv)
router.get('/general-ledger', getGeneralLedgerReport);

module.exports = router;
