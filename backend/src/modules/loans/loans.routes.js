const express = require('express');
const multer = require('multer');
const path = require('path');

// --- Legacy imports (functions not yet extracted) ---
const {
  getLoans, getLoanById, updateLoan, deleteLoan,
  getLoanStats, getDisbursedStats, getCurrentLoans,
  submitAgreement, getAgreements, getAllAgreements,
  bulkImportLoans, bulkUpdateLoans,
  getPayslipDocuments, servePayslip, serveEducationalDocument
} = require('../../../controllers/loanController');

// --- Modular imports ---
const { createLoan } = require('./controllers/loan.controller');
const { validateGrantor, respondToGuaranteeRequest, getGuaranteeRequests, getGuaranteeSummary } = require('./controllers/loan-guarantee.controller');
const { approveLoan, rejectLoan, reverseDisbursement, reverseApproval, liquidateLoan, getLoanLiquidationReceipt } = require('./controllers/loan-approval.controller');

const { authenticateToken } = require('../../../middleware/auth');

const router = express.Router();

// Configure multer for Bulk Import (CSV/Excel)
const bulkUpload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension);

    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
    }
  }
});

// Configure multer for Payslips / Educational Documents (Images/PDF)
const payslipUpload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension);

    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Images (JPG, PNG) and PDF are allowed.'), false);
    }
  }
});

// GET /loans - Get all loans
router.get('/', authenticateToken, getLoans);

// POST /loans/bulk-import - Bulk import loans (admin)
router.post('/bulk-import', authenticateToken, bulkUpload.single('file'), bulkImportLoans);

// POST /loans/bulk-status - Bulk update loan status (admin)
router.post('/bulk-status', authenticateToken, bulkUpdateLoans);

// POST /loans/bulk-update - Alias for bulk-status for backward compatibility
router.post('/bulk-update', authenticateToken, bulkUpdateLoans);

// GET /loans/agreements - Get all agreements (admin) - MUST BE BEFORE /:id
router.get('/agreements', authenticateToken, getAllAgreements);

// GET /loans/stats - Get loan statistics
router.get('/stats', authenticateToken, getLoanStats);

// GET /loans/stats/disbursed - Get disbursed loan statistics with filters
router.get('/stats/disbursed', authenticateToken, getDisbursedStats);

// GET /loans/my-loans - Get current user's loans
router.get('/my-loans', authenticateToken, getCurrentLoans);

// POST /loans/validate-grantor - Validate grantor PSN
router.post('/validate-grantor', authenticateToken, validateGrantor);

// GET /loans/payslips - Get all payslip documents (admin) - MUST BE BEFORE /:id
router.get('/payslips', authenticateToken, getPayslipDocuments);

// GET /loans/guarantee/requests - Get current user's guarantee requests
router.get('/guarantee/requests', authenticateToken, getGuaranteeRequests);

// GET /loans/guarantee/summary - Get summary of open guarantee requests per guarantor (admin)
router.get('/guarantee/summary', authenticateToken, getGuaranteeSummary);

// GET /loans/educational-documents/:id - Get educational document
router.get('/educational-documents/:id', authenticateToken, serveEducationalDocument);

// GET /loans/liquidations/:id/receipt - Download liquidation receipt
router.get('/liquidations/:id/receipt', authenticateToken, getLoanLiquidationReceipt);

// GET /loans/:id/payslip - Get payslip document
router.get('/:id/payslip', authenticateToken, servePayslip);

// GET /loans/:id - Get loan by ID
router.get('/:id', authenticateToken, getLoanById);

// POST /loans - Create new loan application
router.post(
  '/',
  authenticateToken,
  payslipUpload.fields([
    { name: 'payslip', maxCount: 1 },
    { name: 'admission_letter', maxCount: 1 },
    { name: 'student_id_card', maxCount: 1 },
    { name: 'education_other', maxCount: 3 }
  ]),
  createLoan
);

// POST /loans/apply - Create new loan application (alias for frontend compatibility)
router.post(
  '/apply',
  authenticateToken,
  payslipUpload.fields([
    { name: 'payslip', maxCount: 1 },
    { name: 'admission_letter', maxCount: 1 },
    { name: 'student_id_card', maxCount: 1 },
    { name: 'education_other', maxCount: 3 }
  ]),
  createLoan
);

// PUT /loans/:id - Update loan
router.put('/:id', authenticateToken, updateLoan);

// PATCH /loans/:id - Update loan (alias for PUT to support frontend usage)
router.patch('/:id', authenticateToken, updateLoan);

// DELETE /loans/:id - Delete loan (only pending loans)
router.delete('/:id', authenticateToken, deleteLoan);

// POST /loans/:id/reverse-disbursement - Reverse disbursement status
router.post('/:id/reverse-disbursement', authenticateToken, reverseDisbursement);

// POST /loans/:id/reverse-approval - Reverse approval status
router.post('/:id/reverse-approval', authenticateToken, reverseApproval);

// PUT /loans/:id/guarantee - Respond to guarantee request
router.put('/:id/guarantee', authenticateToken, respondToGuaranteeRequest);

// POST /loans/:id/agreement - Submit agreement status
router.post('/:id/agreement', authenticateToken, submitAgreement);

// GET /loans/:id/agreements - Get agreement history
router.get('/:id/agreements', authenticateToken, getAgreements);

// POST /loans/:id/approve - Approve loan (Chairman/Admin)
router.post('/:id/approve', authenticateToken, approveLoan);

// POST /loans/:id/reject - Reject loan (Chairman/Admin)
router.post('/:id/reject', authenticateToken, rejectLoan);

// POST /loans/:id/liquidate - Liquidate a loan from contributions
router.post('/:id/liquidate', authenticateToken, liquidateLoan);

module.exports = router;
