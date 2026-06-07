
const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../../../../middleware/auth');
const settingsController = require('../controllers/settings.controller');

// Get settings - authenticated users
router.get('/', authenticateToken, settingsController.getSettings);

// Get default settings - authenticated users
router.get('/defaults', authenticateToken, settingsController.getDefaultSettings);

// Update settings - admin/chairman only
router.put('/', authenticateToken, authorizeRole(['admin', 'super_admin', 'chairman']), settingsController.updateSettings);

// Reset settings - admin only
router.post('/reset', authenticateToken, authorizeRole(['admin', 'super_admin']), settingsController.resetSettings);

module.exports = router;
