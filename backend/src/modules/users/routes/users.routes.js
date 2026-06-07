
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../../middleware/auth');
const usersController = require('../controllers/users.controller');

// Search members - authenticated users
router.get('/search', authenticateToken, usersController.searchMembers);

module.exports = router;
