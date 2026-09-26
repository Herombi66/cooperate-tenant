const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, authorizeRole } = require('../middleware/auth');
const receiptTemplateController = require('../controllers/receiptTemplateController');

// 1. PUBLIC ROUTES (Zero Authentication Required)
// Verification endpoint for QR codes: /receipt-templates/verify/:receiptNumber
router.get('/verify/:receiptNumber', receiptTemplateController.verifyReceiptPublic);

// 2. PROTECTED ROUTES (Authenticated)
router.use(authenticateToken);

// View templates (Admins, Treasurers, Auditors)
const allowedViewers = ['admin', 'super_admin', 'treasurer', 'auditor', 'state_auditor', 'chairman'];
router.get('/', authorizeRole(allowedViewers), receiptTemplateController.getTemplates);
router.get('/:id', authorizeRole(allowedViewers), receiptTemplateController.getTemplateById);
router.get('/:id/versions', authorizeRole(allowedViewers), receiptTemplateController.getTemplateVersions);

// Test Print (No financial transaction created)
router.post('/test-print', authorizeRole(allowedViewers), receiptTemplateController.testPrintReceipt);

// View issued receipt record by number
router.get('/record/:receiptNumber', receiptTemplateController.getReceiptRecord);

// 3. ADMIN ONLY ROUTES (Full customization, mutations, rollback, activation)
router.post('/', requireAdmin, receiptTemplateController.createTemplate);
router.put('/:id', requireAdmin, receiptTemplateController.updateTemplate);
router.post('/:id/activate', requireAdmin, receiptTemplateController.activateTemplate);
router.post('/:id/rollback', requireAdmin, receiptTemplateController.restoreTemplateVersion);
router.post('/:id/reset', requireAdmin, receiptTemplateController.resetTemplateToDefault);

module.exports = router;
