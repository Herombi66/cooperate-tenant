const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { authenticateToken } = require('../../../../middleware/auth');
const { can } = require('../../../../middleware/rbac');

// Public route to get theme and config
router.get('/config', tenantController.getPublicConfig);

// Protected route to update theme
router.post('/theme', authenticateToken, can('manage_settings'), tenantController.updateTheme);

module.exports = router;
