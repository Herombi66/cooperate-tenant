const express = require('express');
const router = express.Router();
const loanRepaymentController = require('./controllers/loan-repayment.controller');
const loanRepaymentBulkUploadController = require('./controllers/loan-repayment-bulk.controller');
const { authenticateToken, authorizeRole } = require('../../../middleware/auth');

const VERIFICATION_ROLES = ['admin', 'super_admin', 'treasurer', 'chairman'];

// Admin/Treasurer routes for managing loan repayments
router.get('/', authenticateToken, loanRepaymentController.getLoanRepayments);
router.get('/stats', authenticateToken, loanRepaymentController.getLoanRepaymentStats);
router.post('/', authenticateToken, loanRepaymentController.createLoanRepayment);
router.post('/bulk-upload', authenticateToken, loanRepaymentController.upload.single('file'), loanRepaymentController.bulkUploadLoanRepayments);
router.post(
  '/bulk-upload-v2',
  authenticateToken,
  loanRepaymentBulkUploadController.upload.single('file'),
  loanRepaymentBulkUploadController.bulkUploadLoanRepayments
);
router.post('/bulk-upload-batches/:id/approve', authenticateToken, loanRepaymentBulkUploadController.approveBatch);
router.post('/bulk-upload-batches/:id/rollback', authenticateToken, loanRepaymentBulkUploadController.rollbackBatch);
router.post('/bulk-verify', authenticateToken, authorizeRole(VERIFICATION_ROLES), loanRepaymentController.bulkVerifyLoanRepayments);

// Get loan details by ID (for admin to lookup loan info)
router.get('/loan/:loanId', authenticateToken, loanRepaymentController.getLoanById);

// Individual repayment management
router.get('/:id', authenticateToken, loanRepaymentController.getLoanRepaymentById);
router.put('/:id', authenticateToken, authorizeRole(VERIFICATION_ROLES), loanRepaymentController.updateLoanRepayment);
router.delete('/:id', authenticateToken, loanRepaymentController.deleteLoanRepayment);

// Member routes for viewing their own repayments
router.get('/user/my-repayments', authenticateToken, loanRepaymentController.getUserLoanRepayments);

module.exports = router;
