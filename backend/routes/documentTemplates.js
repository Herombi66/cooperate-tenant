const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, authorizeRole } = require('../middleware/auth');
const documentTemplateController = require('../controllers/documentTemplateController');

// 1. PUBLIC ROUTES (Zero Authentication Required)
// Dynamic QR Code verification: /document-templates/verify/:ref
router.get('/verify/:ref', documentTemplateController.verifyAgreementPublic);

// 2. PROTECTED ROUTES (Authenticated)
router.use(authenticateToken);

// View templates (Admins, Treasurers, Auditors, Leadership)
const allowedViewers = ['admin', 'super_admin', 'treasurer', 'auditor', 'state_auditor', 'chairman', 'secretary'];
router.get('/', authorizeRole(allowedViewers), documentTemplateController.getTemplates);
router.get('/:id', authorizeRole(allowedViewers), documentTemplateController.getTemplateById);
router.get('/:id/versions', authorizeRole(allowedViewers), documentTemplateController.getVersions);

// Test Print (Sample watermarked contract PDF, preview only)
router.post('/test-print', authorizeRole(allowedViewers), documentTemplateController.testPrintContract);

// 3. ADMIN ONLY ROUTES (Customization, mutations, rollback, reset)
router.put('/:id', requireAdmin, documentTemplateController.updateTemplate);
router.post('/:id/restore/:versionId', requireAdmin, documentTemplateController.restoreVersion);
router.post('/:id/reset', requireAdmin, documentTemplateController.resetToDefault);

module.exports = router;
