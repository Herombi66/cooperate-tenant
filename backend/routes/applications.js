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
router.get('/', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer', 'chairman', 'secretary', 'assistant_secretary', 'financial_secretary', 'auditor', 'pro', 'state_auditor']), getApplications);
router.get('/:id', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer', 'chairman', 'secretary', 'assistant_secretary', 'financial_secretary', 'auditor', 'pro', 'state_auditor']), getApplicationById);

// Admin routes for member management through applications
router.post('/admin/create-member', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer', 'chairman', 'secretary', 'assistant_secretary', 'financial_secretary']), (req, res) => {
  // Add auto_approve flag for admin direct creation
  req.body.auto_approve = true;
  return submitApplication(req, res);
});

router.post('/admin/bulk-import', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer', 'chairman', 'secretary', 'assistant_secretary', 'financial_secretary']), uploadMiddleware, bulkImportApplications);

const EXCO_AND_ADMIN_ROLES = [
  'admin', 'super_admin', 'chairman', 'president', 'vice_chairman', 
  'secretary', 'assistant_secretary', 'treasurer', 'financial_secretary', 
  'auditor', 'state_auditor', 'pro', 'trustee', 'welfare_officer'
];

// Application status management (supports both PUT and POST)
router.put('/:id/status', authenticateToken, authorizeRole(EXCO_AND_ADMIN_ROLES), updateApplicationStatus);
router.post('/:id/status', authenticateToken, authorizeRole(EXCO_AND_ADMIN_ROLES), updateApplicationStatus);
router.delete('/:id', authenticateToken, authorizeRole(EXCO_AND_ADMIN_ROLES), deleteApplication);

// Approval & Rejection routes (supports both PUT and POST for full frontend compatibility)
router.put('/:id/approve', authenticateToken, authorizeRole(EXCO_AND_ADMIN_ROLES), (req, res) => {
  req.body = req.body || {};
  req.body.status = 'approved';
  return updateApplicationStatus(req, res);
});
router.post('/:id/approve', authenticateToken, authorizeRole(EXCO_AND_ADMIN_ROLES), (req, res) => {
  req.body = req.body || {};
  req.body.status = 'approved';
  return updateApplicationStatus(req, res);
});
router.put('/:id/reject', authenticateToken, authorizeRole(EXCO_AND_ADMIN_ROLES), (req, res) => {
  req.body = req.body || {};
  req.body.status = 'rejected';
  req.body.rejection_reason = req.body.reason || req.body.rejection_reason || 'Rejected by reviewer';
  return updateApplicationStatus(req, res);
});
router.post('/:id/reject', authenticateToken, authorizeRole(EXCO_AND_ADMIN_ROLES), (req, res) => {
  req.body = req.body || {};
  req.body.status = 'rejected';
  req.body.rejection_reason = req.body.reason || req.body.rejection_reason || 'Rejected by reviewer';
  return updateApplicationStatus(req, res);
});

module.exports = router;
