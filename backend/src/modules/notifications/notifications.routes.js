const express = require('express');
const {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  createNotification,
  deleteNotification,
  bulkDeleteNotifications
} = require('./notifications.controller');
const { authenticateToken } = require('../../../middleware/auth');

const router = express.Router();

// GET /notifications/unread-count - Get unread notifications count
router.get('/unread-count', authenticateToken, getUnreadCount);

// GET /notifications - Get current user's notifications
router.get('/', authenticateToken, getUserNotifications);

// POST /notifications - Create new notification (admin only for testing)
router.post('/', authenticateToken, createNotification);

// PUT /notifications/:id/read - Mark notification as read
// PUT /notifications/all/read - Mark all notifications as read
router.put('/:id/read', authenticateToken, markAsRead);
router.put('/mark-all-read', authenticateToken, (req, res) => {
  req.params.id = 'all';
  markAsRead(req, res);
});

// DELETE /notifications/:id - Delete notification
router.delete('/:id', authenticateToken, deleteNotification);

// DELETE /notifications - Clear all notifications
router.delete('/', authenticateToken, bulkDeleteNotifications);

module.exports = router;
