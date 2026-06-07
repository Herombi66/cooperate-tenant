const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/auth');

// GET settings (can be viewed by anyone, will return defaults if no auth)
router.get('/', settingsController.getSettings);

// Get settings by category (publicly accessible for loan application forms)
router.get('/category/:category', settingsController.getSettingsByCategory);

// Protected routes (require authentication)
router.use(authenticateToken);

// Update settings (admin/treasurer only)
router.put('/', settingsController.updateSettings);

// Approve and Reject Settings (President only)
router.post('/approve', settingsController.approveSettings);
router.post('/reject', settingsController.rejectSettings);

// Upload logo (admin/treasurer only)
router.post('/logo', settingsController.uploadLogoMiddleware, settingsController.uploadLogo);

// Reset all settings to defaults (admin only)
router.post('/reset', settingsController.resetSettings);

module.exports = router;
