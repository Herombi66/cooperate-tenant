const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const {
  getAuditorDashboard,
  getAuditTransactions,
  getMemberAudit,
  getMemberAuditStatement,
  getMemberTimeline,
  getLoanAudit,
  getContributionAudit,
  getInvestmentAudit,
  getProfitDistributionAudit,
  getIncomeExpenseAudit,
  getAuditExceptions,
  getReconciliation,
  getAuditNotes,
  createAuditNote,
  updateAuditNote,
  getAuditReports,
  getInvestmentProfitAudit
} = require('../controllers/auditController');

// All audit routes require authentication
router.use(authenticateToken);

// Role guard for Auditor endpoints
router.use((req, res, next) => {
  const allowed = ['auditor', 'state_auditor', 'admin', 'super_admin'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Auditor oversight privileges required.'
    });
  }
  next();
});

// 1. Auditor Dashboard
router.get('/dashboard', getAuditorDashboard);

// 2. All Transactions
router.get('/transactions', getAuditTransactions);

// 3. Individual Member Audit
router.get('/members/:id', getMemberAudit);
router.get('/members/:id/statement', getMemberAuditStatement);
router.get('/members/:id/timeline', getMemberTimeline);

// 4. Loan Audit
router.get('/loans', getLoanAudit);

// 5. Contribution Audit
router.get('/contributions', getContributionAudit);

// 6. Investment Audit
router.get('/investments', getInvestmentAudit);

// 6b. Dedicated Investment Profits Audit & Detailed Drilldown
router.get('/investment-profits', getInvestmentProfitAudit);

// 7. Profit Distribution Audit
router.get('/profit-distribution', getProfitDistributionAudit);

// 8. Income & Expenses Audit
router.get('/income-expenses', getIncomeExpenseAudit);

// 9. Exceptions & Suspicious Transactions
router.get('/exceptions', getAuditExceptions);

// 10. Financial Reconciliation
router.get('/reconciliation', getReconciliation);

// 11. Audit Notes
router.get('/notes', getAuditNotes);
router.post('/notes', createAuditNote);
router.put('/notes/:id', updateAuditNote);

// 12. Audit Reports
router.get('/reports', getAuditReports);

module.exports = router;
