const express = require('express');
const {
  getAdminStats,
  getMemberStats,
  getChairmanStats,
  getTreasurerStats,
  getCurrentUserStats,
  getActivityLogs,
  getUnifiedDashboardData,
  trackWhatsappGroupInviteClick,
  getWhatsappGroupInviteHealth
} = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /dashboard/unified - Unified dashboard data
router.get('/unified', authenticateToken, getUnifiedDashboardData);

// GET /dashboard/stats - Admin dashboard statistics
router.get('/stats', authenticateToken, getAdminStats);

// GET /dashboard/activity-logs - Activity logs for admin
router.get('/activity-logs', authenticateToken, getActivityLogs);

// GET /dashboard/member/stats - Current user member statistics
router.get('/member/stats', authenticateToken, getCurrentUserStats);

// GET /dashboard/member/:userId/stats - Member-specific statistics
router.get('/member/:userId/stats', authenticateToken, getMemberStats);

// GET /dashboard/chairman/stats - Chairman dashboard statistics
router.get('/chairman/stats', authenticateToken, getChairmanStats);

// GET /dashboard/treasurer/stats - Treasurer dashboard statistics
router.get('/treasurer/stats', authenticateToken, getTreasurerStats);

// POST /dashboard/engagement/whatsapp-group-click - Track engagement for WhatsApp invite link
router.post('/engagement/whatsapp-group-click', authenticateToken, trackWhatsappGroupInviteClick);

// GET /dashboard/health/whatsapp-group - Health check for WhatsApp invite link
router.get('/health/whatsapp-group', authenticateToken, getWhatsappGroupInviteHealth);

module.exports = router;
