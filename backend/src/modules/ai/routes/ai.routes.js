const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticateToken, requireRole } = require('../../../../middleware/auth');

// Allow admins to test AI connection
router.post('/test-connection', authenticateToken, (req, res) => aiController.testConnection(req, res));

// Get AI Insights for executives/admins
router.get('/insights', authenticateToken, (req, res) => aiController.getInsights(req, res));

module.exports = router;
