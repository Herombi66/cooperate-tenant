const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  suspendMember,
  activateMember,
  deleteMember,
  resetMemberPassword,
  exportMembers,
  importMembers,
  validateGrantor,
  updateMemberJoinDate,
  getMemberFinancialProfile,
  transferFunds,
  getMemberStatement,
  getCloseAccountPreview,
  closeMemberAccount
} = require('../controllers/memberController');
const { authenticateToken, authorizeRole, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];

    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// GET /members - Get all members (Staff only)
router.get('/', authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'assistant_secretary', 'financial_secretary', 'auditor', 'state_auditor', 'pro']), getMembers);

// GET /members/export - Export members data (Staff only)
router.get('/export', authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'assistant_secretary', 'financial_secretary', 'auditor', 'state_auditor', 'pro']), exportMembers);

// POST /members/import - Bulk import members (Admin/Chairman/Secretary/Assistant Secretary)
router.post('/import', upload.single('file'), authorizeRole(['admin', 'super_admin', 'chairman', 'secretary', 'assistant_secretary']), importMembers);

// GET /members/validate-grantor - Validate grantor PSN (Available to all authenticated users)
router.get('/validate-grantor', validateGrantor);

// POST /members - Create new member (Admin/Chairman/Secretary/Assistant Secretary)
router.post('/', authorizeRole(['admin', 'super_admin', 'chairman', 'secretary', 'assistant_secretary']), createMember);

// GET /members/:id - Get member by ID (Staff only)
router.get('/:id', authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'assistant_secretary', 'financial_secretary', 'auditor', 'state_auditor', 'pro']), getMemberById);

// GET /members/:id/financial-profile - Get member financial profile (Admin/Treasurer/Chairman/FinSec/Auditor)
router.get('/:id/financial-profile', authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'financial_secretary', 'auditor', 'state_auditor']), getMemberFinancialProfile);

// GET /members/:id/statement - Get member running balance statement (Self or Staff)
router.get('/:id/statement', getMemberStatement);

// POST /members/:id/transfer-funds - Transfer funds between savings/investment/target accounts (Admin/Treasurer/Chairman/FinSec)
router.post('/:id/transfer-funds', authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'financial_secretary']), transferFunds);

// PUT /members/:id - Update member (Admin/Chairman/Secretary/Assistant Secretary)
router.put('/:id', authorizeRole(['admin', 'super_admin', 'chairman', 'secretary', 'assistant_secretary']), updateMember);

// PUT /members/:id/join-date - Update member join date (Admin only)
router.put('/:id/join-date', requireAdmin, updateMemberJoinDate);

// PUT /members/:id/suspend - Suspend member (Admin/Chairman)
router.put('/:id/suspend', authorizeRole(['admin', 'super_admin', 'chairman']), suspendMember);

// PUT /members/:id/activate - Activate member (Admin/Chairman)
router.put('/:id/activate', authorizeRole(['admin', 'super_admin', 'chairman']), activateMember);

// PUT /members/:id/reset-password - Reset member password (Admin/Chairman)
router.put('/:id/reset-password', authorizeRole(['admin', 'super_admin', 'chairman']), resetMemberPassword);

// GET /members/:id/close-preview - Preview account closure and loan liquidation (Admin/Chairman/Treasurer/FinSec)
router.get('/:id/close-preview', authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'financial_secretary']), getCloseAccountPreview);

// POST /members/:id/close-account - Close member account, liquidate loans & refund (Admin/Chairman/Treasurer/FinSec)
router.post('/:id/close-account', authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'financial_secretary']), closeMemberAccount);

// DELETE /members/:id - Soft delete member (Admin only)
router.delete('/:id', requireAdmin, deleteMember);

module.exports = router;
