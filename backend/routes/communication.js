const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendBroadcast, getBroadcastHistory } = require('../controllers/communicationController');

// All routes require admin access
router.use(authenticateToken, requireAdmin);

router.post('/broadcast', sendBroadcast);
router.get('/history', getBroadcastHistory);

module.exports = router;
