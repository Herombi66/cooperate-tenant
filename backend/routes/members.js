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
  getMemberFinancialProfile
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
router.get('/', authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'state_auditor']), getMembers);

// GET /members/export - Export members data (Staff only)
router.get('/export', authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'state_auditor']), exportMembers);

// POST /members/import - Bulk import members (Admin/Chairman/Secretary)
router.post('/import', upload.single('file'), authorizeRole(['admin', 'super_admin', 'chairman', 'secretary']), importMembers);

// GET /members/validate-grantor - Validate grantor PSN (Available to all authenticated users)
router.get('/validate-grantor', validateGrantor);

// POST /members - Create new member (Admin/Chairman/Secretary)
router.post('/', authorizeRole(['admin', 'super_admin', 'chairman', 'secretary']), createMember);

// GET /members/:id - Get member by ID (Staff only)
router.get('/:id', authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'state_auditor']), getMemberById);

// GET /members/:id/financial-profile - Get member financial profile (Admin/Treasurer/Chairman)
router.get('/:id/financial-profile', authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'state_auditor']), getMemberFinancialProfile);

// PUT /members/:id - Update member (Admin/Chairman)
router.put('/:id', authorizeRole(['admin', 'super_admin', 'chairman']), updateMember);

// PUT /members/:id/join-date - Update member join date (Admin only)
router.put('/:id/join-date', requireAdmin, updateMemberJoinDate);

// PUT /members/:id/suspend - Suspend member (Admin/Chairman)
router.put('/:id/suspend', authorizeRole(['admin', 'super_admin', 'chairman']), suspendMember);

// PUT /members/:id/activate - Activate member (Admin/Chairman)
router.put('/:id/activate', authorizeRole(['admin', 'super_admin', 'chairman']), activateMember);

// PUT /members/:id/reset-password - Reset member password (Admin/Chairman)
router.put('/:id/reset-password', authorizeRole(['admin', 'super_admin', 'chairman']), resetMemberPassword);

// DELETE /members/:id - Soft delete member (Admin only)
router.delete('/:id', requireAdmin, deleteMember);

module.exports = router;
