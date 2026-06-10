const express = require('express');
const router = express.Router();
const customFieldController = require('../controllers/customField.controller');
const { authenticateToken, authorizeRole } = require('../../../../middleware/auth');

// Public route to get fields needed for registration forms
router.get('/:entityType', customFieldController.getCustomFields);

// Protected routes to manage custom fields
router.post('/', authenticateToken, authorizeRole('admin'), customFieldController.createCustomField);
router.delete('/:id', authenticateToken, authorizeRole('admin'), customFieldController.deleteCustomField);

module.exports = router;
