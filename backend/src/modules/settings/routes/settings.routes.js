const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken, authorizeRole } = require('../../../../middleware/auth');
const settingsController = require('../controllers/settings.controller');

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const allowedAdminRoles = ['admin', 'super_admin', 'chairman', 'president', 'treasurer'];

// Get settings - authenticated users
router.get('/', authenticateToken, settingsController.getSettings);

// Get default settings - authenticated users
router.get('/defaults', authenticateToken, settingsController.getDefaultSettings);

// Update settings - admin/leadership
router.put('/', authenticateToken, authorizeRole(allowedAdminRoles), settingsController.updateSettings);

// Upload logo
router.post('/logo', authenticateToken, authorizeRole(allowedAdminRoles), logoUpload.single('logo'), settingsController.uploadLogo);

const bylawController = require('../../../../controllers/bylawController');

// Reset settings - admin only
router.post('/reset', authenticateToken, authorizeRole(['admin', 'super_admin', 'chairman', 'president']), settingsController.resetSettings);

// Bylaw routes
router.get('/bylaw', authenticateToken, bylawController.getBylaw);
router.get('/bylaw/download', authenticateToken, bylawController.downloadBylaw);
router.post('/bylaw', authenticateToken, authorizeRole(allowedAdminRoles), bylawController.upload.single('bylaw'), bylawController.uploadBylaw);
router.delete('/bylaw', authenticateToken, authorizeRole(allowedAdminRoles), bylawController.deleteBylaw);

module.exports = router;
