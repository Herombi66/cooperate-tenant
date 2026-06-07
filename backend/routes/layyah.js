const express = require('express');
const {
  getLayyahStats,
  getLayyahApplications,
  getLayyahAnimalCatalog,
  createLayyahApplication,
  updateLayyahApplication,
  reverseLayyahApplicationStatus,
  getLayyahApplicants,
  exportLayyahApplications,
  updateLayyahAppliedAmount,
  streamLayyahEvents,
  logAdminClientError,
  getLayyahGroups,
  getMyApplications,
  requestToJoinGroup,
  leaveGroup,
  getLayyahGroupById,
  getGroupMembers,
  manageGroupMembership,
  respondToGroupInvitation,
  addMemberToGroup,
  disqualifyGroupMember,
  updateGroupMemberRole,
  updateGroupSettings,
  repairInvalidDisbursedApplications,
  revertAllDisbursedApplications,
  getSeasonalProgramStatus,
  updateSeasonalProgramStatus
} = require('../controllers/layyahController');

const {
  listAnimalAcquisitionRequests,
  getAnimalAcquisitionRequestById,
  createAnimalAcquisitionRequestValidation,
  createAnimalAcquisitionRequest,
  updateAnimalAcquisitionRequestValidation,
  updateAnimalAcquisitionRequest,
  submitAnimalAcquisitionRequest,
  approveAnimalAcquisitionRequest,
  rejectAnimalAcquisitionRequestValidation,
  rejectAnimalAcquisitionRequest,
  deleteAnimalAcquisitionRequest
} = require('../controllers/animalAcquisitionRequestController');
const { authenticateToken, authorizeRole, requirePermission } = require('../middleware/auth');
const { ActivityLog } = require('../models');

const router = express.Router();

// GET /layyah/stats - Get layyah statistics
router.get('/stats', authenticateToken, getLayyahStats);

// GET /layyah/catalog/animal-categories - Livestock catalog for animal types
router.get('/catalog/animal-categories', authenticateToken, getLayyahAnimalCatalog);

// GET /layyah/applications - Get layyah applications
router.get('/applications', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer']), getLayyahApplications);

// GET /layyah/applications/export - Export layyah applications (csv/xlsx/pdf)
router.get('/applications/export', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer']), exportLayyahApplications);

// POST /layyah/applications - Create layyah application
router.post('/applications', authenticateToken, createLayyahApplication);

// PUT /layyah/applications/:id - Update layyah application
router.put('/applications/:id', authenticateToken, async (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  const allowed = role === 'admin' || role === 'super_admin' || role === 'treasurer';
  if (allowed) return next();

  try {
    const desired = req.body?.status != null ? String(req.body.status) : null;
    if (desired && desired === 'disbursed') {
      await ActivityLog.logActivity(
        { id: req.user?.id, role: req.user?.role, name: req.user?.membershipApplication?.name || req.user?.name || null },
        'layyah_disburse_unauthorized_attempt',
        'layyah_application',
        Number(req.params.id) || null,
        'Unauthorized attempt to set layyah application status to disbursed',
        { requested_status: desired },
        req
      );
    }
  } catch {}

  return res.status(403).json({
    success: false,
    message: 'Access denied. Insufficient privileges.'
  });
}, updateLayyahApplication);

router.post(
  '/admin/applications/:id/reverse',
  authenticateToken,
  authorizeRole(['admin', 'super_admin', 'treasurer', 'chairman']),
  reverseLayyahApplicationStatus
);

router.get('/stream', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer']), streamLayyahEvents);

router.get('/admin/applicants', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer']), getLayyahApplicants);
router.post('/admin/client-error', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer']), logAdminClientError);
router.patch('/:memberId/amount', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer']), updateLayyahAppliedAmount);
router.post('/admin/repair-disbursed', authenticateToken, authorizeRole(['super_admin', 'treasurer']), repairInvalidDisbursedApplications);
router.post('/admin/revert-all-disbursed', authenticateToken, authorizeRole(['super_admin', 'treasurer']), revertAllDisbursedApplications);

// GET /layyah/groups - Get layyah groups
router.get('/groups', authenticateToken, getLayyahGroups);

// GET /layyah/groups/:id - Get layyah group details
router.get('/groups/:id', authenticateToken, getLayyahGroupById);

// GET /layyah/applications/me - Get current user's applications
router.get('/applications/me', authenticateToken, getMyApplications);

// POST /layyah/groups/:id/join - Request to join a group
router.post('/groups/:id/join', authenticateToken, requestToJoinGroup);

// POST /layyah/groups/:id/leave - Leave a group
router.post('/groups/:id/leave', authenticateToken, leaveGroup);

// GET /layyah/groups/:id/members - Get group members
router.get('/groups/:id/members', authenticateToken, getGroupMembers);

// PUT /layyah/group-members/:id - Manage group membership (approve/reject)
router.put('/group-members/:id', authenticateToken, manageGroupMembership);

// PUT /layyah/group-members/:id/respond - Member responds to invitation
router.put('/group-members/:id/respond', authenticateToken, respondToGroupInvitation);

// POST /layyah/groups/:id/add-member - Invite member to group (leader/admin)
router.post('/groups/:id/add-member', authenticateToken, addMemberToGroup);

// DELETE /layyah/group-members/:id/disqualify - Admin removes/disqualifies a member from a group
router.delete('/group-members/:id/disqualify', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer']), disqualifyGroupMember);

// PATCH /layyah/group-members/:id/role - Admin updates group member role
router.patch('/group-members/:id/role', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer']), updateGroupMemberRole);

// PATCH /layyah/groups/:id/settings - Admin updates group settings
router.patch('/groups/:id/settings', authenticateToken, authorizeRole(['admin', 'super_admin', 'treasurer']), updateGroupSettings);

// Compatibility aliases for older clients / deployments
router.post('/groups/:id/invite', authenticateToken, addMemberToGroup);
router.post('/groups/:id/invite-member', authenticateToken, addMemberToGroup);
router.post('/groups/:id/members', authenticateToken, addMemberToGroup);

// GET /layyah/seasonal-program/status - Get seasonal program status
router.get('/seasonal-program/status', authenticateToken, getSeasonalProgramStatus);

// PUT /layyah/seasonal-program/status - Update seasonal program status
router.put('/seasonal-program/status', authenticateToken, updateSeasonalProgramStatus);

// Animal acquisition requests (admin-created purchase requests on behalf of members)
router.get('/purchase-requests', authenticateToken, requirePermission('animal-request-create'), listAnimalAcquisitionRequests);
router.get('/purchase-requests/:id', authenticateToken, requirePermission('animal-request-create'), getAnimalAcquisitionRequestById);
router.post(
  '/purchase-requests',
  authenticateToken,
  requirePermission('animal-request-create'),
  createAnimalAcquisitionRequestValidation,
  createAnimalAcquisitionRequest
);
router.put(
  '/purchase-requests/:id',
  authenticateToken,
  requirePermission('animal-request-create'),
  updateAnimalAcquisitionRequestValidation,
  updateAnimalAcquisitionRequest
);
router.post('/purchase-requests/:id/submit', authenticateToken, requirePermission('animal-request-create'), submitAnimalAcquisitionRequest);
router.post(
  '/purchase-requests/:id/approve',
  authenticateToken,
  requirePermission('animal-request-create'),
  approveAnimalAcquisitionRequest
);
router.post(
  '/purchase-requests/:id/reject',
  authenticateToken,
  requirePermission('animal-request-create'),
  rejectAnimalAcquisitionRequestValidation,
  rejectAnimalAcquisitionRequest
);
router.delete('/purchase-requests/:id', authenticateToken, requirePermission('animal-request-create'), deleteAnimalAcquisitionRequest);

module.exports = router;
