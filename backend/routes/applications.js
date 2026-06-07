const express = require('express');
const multer = require('multer');
const { submitApplication, checkDuplicateApplication, getApplications, getApplicationById, bulkImportApplications, updateApplicationStatus, deleteApplication } = require('../controllers/applicationController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];

    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype) || allowedExtensions.includes(`.${fileExtension}`);

    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
    }
  }
});

// Wrapper middleware to handle Multer errors
const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.message === 'Invalid file type. Only CSV and Excel files are allowed.') {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      // Handle file size error from Multer
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.'
        });
      }
      return next(err);
    }
    next();
  });
};

// Public route - Submit membership application
router.post('/apply', submitApplication);
router.post('/check-duplicate', checkDuplicateApplication);

// Protected routes - Require authentication
router.get('/', authenticateToken, getApplications);
router.get('/:id', authenticateToken, getApplicationById);

// Admin routes for member management through applications
router.post('/admin/create-member', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer', 'chairman']), (req, res) => {
  // Add auto_approve flag for admin direct creation
  req.body.auto_approve = true;
  return submitApplication(req, res);
});

router.post('/admin/bulk-import', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer', 'chairman']), uploadMiddleware, bulkImportApplications);

// Application status management
router.put('/:id/status', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer', 'chairman']), updateApplicationStatus);
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer', 'chairman']), deleteApplication);

// Legacy route for frontend compatibility
router.put('/:id/approve', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer', 'chairman']), updateApplicationStatus);

module.exports = router;
