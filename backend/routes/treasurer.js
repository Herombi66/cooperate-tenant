const express = require('express');
const { getTreasurerStats } = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /treasurer/stats
router.get('/stats', authenticateToken, getTreasurerStats);

module.exports = router;
