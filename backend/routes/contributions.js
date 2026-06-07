const express = require('express');
const {
  getContributions,
  getContributionById,
  createContribution,
  updateContribution,
  deleteContribution,
  getContributionStats,
  createContributionByPsn,
  bulkUploadContributions,
  getFeeDeductions,
  upload
} = require('../controllers/contributionController');
const {
  submitIncreaseRequest,
  getMyCommitment,
  getMyIncreaseRequests,
  listIncreaseRequests,
  approveIncreaseRequest,
  rejectIncreaseRequest,
  exportIncreaseRequestsPdf
} = require('../controllers/contributionIncreaseRequestController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const User = require('../models/User');
const MembershipApplication = require('../models/MembershipApplication');

const router = express.Router();

// GET /contributions - Get all contributions
router.get('/', authenticateToken, getContributions);

// GET /contributions/stats - Get contribution statistics
router.get('/stats', authenticateToken, getContributionStats);

// POST /contributions/increase-requests - Member submits request
router.post('/increase-requests', authenticateToken, upload.single('supporting_document'), submitIncreaseRequest);

// GET /contributions/increase-requests/my - Member views own requests
router.get('/increase-requests/my', authenticateToken, getMyIncreaseRequests);

// GET /contributions/commitment - Member views current commitment and limits
router.get('/commitment', authenticateToken, getMyCommitment);

// GET /contributions/increase-requests - Admin views requests
router.get(
  '/increase-requests',
  authenticateToken,
  authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'manager', 'operator', 'state_auditor']),
  listIncreaseRequests
);

// POST /contributions/increase-requests/:id/approve - Admin approves
router.post(
  '/increase-requests/:id/approve',
  authenticateToken,
  authorizeRole(['admin', 'super_admin', 'treasurer']),
  approveIncreaseRequest
);

// POST /contributions/increase-requests/:id/reject - Admin rejects
router.post(
  '/increase-requests/:id/reject',
  authenticateToken,
  authorizeRole(['admin', 'super_admin', 'treasurer']),
  rejectIncreaseRequest
);

// POST /contributions/increase-requests/export/pdf - Admin exports current list to PDF
router.post(
  '/increase-requests/export/pdf',
  authenticateToken,
  authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'state_auditor']),
  exportIncreaseRequestsPdf
);

// GET /contributions/validate-psn/:psn - Validate PSN and get member info
router.get(
  '/validate-psn/:psn',
  authenticateToken,
  authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'manager', 'operator', 'state_auditor']),
  async (req, res) => {
  try {
    const { psn } = req.params;

    if (!psn) {
      return res.status(400).json({
        success: false,
        message: 'PSN is required'
      });
    }

    // Find user by PSN
    const user = await User.findOne({
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        where: { psn: psn.trim() }
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No member found with PSN: ${psn}`
      });
    }

    res.json({
      success: true,
      member: {
        id: user.id,
        psn: user.membershipApplication.psn,
        name: user.membershipApplication.name,
        email: user.membershipApplication.email,
        configurations: {
          savings: parseFloat(user.membershipApplication.savings) || 0,
          investment: parseFloat(user.membershipApplication.investment) || 0,
          targetSaving: parseFloat(user.membershipApplication.target_saving) || 0
        }
      }
    });

  } catch (error) {
    console.error('Validate PSN error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /contributions - Create new contribution
router.post('/', authenticateToken, createContribution);

// GET /contributions/:id - Get contribution by ID
router.get('/:id', authenticateToken, getContributionById);

// POST /contributions/by-psn - Create contribution by PSN (admin function)
router.post(
  '/by-psn',
  authenticateToken,
  authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'manager', 'operator']),
  createContributionByPsn
);

// POST /contributions/bulk-upload - Bulk upload contributions from CSV
router.post('/bulk-upload', 
  (req, res, next) => {
    console.log('📂 [BULK UPLOAD] Request hitting route wrapper');
    authenticateToken(req, res, next);
  },
  (req, res, next) => {
    console.log('📂 [BULK UPLOAD] Auth passed. Starting Multer...');
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('❌ [BULK UPLOAD] Multer Error:', err);
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message
        });
      }
      console.log('📂 [BULK UPLOAD] Multer finished. File:', req.file ? req.file.originalname : 'NONE');
      next();
    });
  }, 
  authorizeRole(['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'manager', 'operator']),
  bulkUploadContributions
);

// PUT /contributions/:id - Update contribution
router.put('/:id', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer']), updateContribution);

// DELETE /contributions/:id - Delete contribution
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer']), deleteContribution);

module.exports = router;
