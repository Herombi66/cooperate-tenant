const express = require('express');
const router = express.Router();

const notificationsModule = require('./notifications');
const loansModule = require('./loans');
const settingsModule = require('./settings');
const usersModule = require('./users');

// Define routes here as modules are migrated
router.use('/notifications', notificationsModule.routes);
router.use('/loans', loansModule.routes);
router.use('/settings', settingsModule.routes);
router.use('/users', usersModule.routes);

module.exports = router;
