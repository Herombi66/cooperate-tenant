const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getSecurityOverview,
  getSecurityIncidents,
  takeSecurityAction,
  getSecuritySettings,
  updateSecuritySettings,
  exportSecurityReport,
  simulateSecurityEvent
} = require('../controllers/securityController');

// All security routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// 1. Security Overview / Metric Cards
router.get('/overview', getSecurityOverview);

// 2. Incidents & Event Investigation
router.get('/incidents', getSecurityIncidents);

// 3. Administrative Security Action (Block IP, Lock User, Password Reset, Resolve Incident)
router.post('/action', takeSecurityAction);

// 4. Security Center Settings & Blocked IPs
router.get('/settings', getSecuritySettings);
router.post('/settings', updateSecuritySettings);

// 5. Export Security Audit Log CSV
router.get('/export', exportSecurityReport);

// 6. Realtime simulation trigger (for testing live alerts & socket broadcasting)
router.post('/simulate', simulateSecurityEvent);

module.exports = router;
