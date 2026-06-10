const express = require('express');
const router = express.Router();

const notificationsModule = require('./notifications');
const loansModule = require('./loans');
const settingsModule = require('./settings');
const usersModule = require('./users');
const rbacModule = require('./rbac');
const tenantModule = require('./tenant');

// Define routes here as modules are migrated
router.use('/notifications', notificationsModule.routes);
router.use('/loans', loansModule.routes);
router.use('/settings', settingsModule.routes);
router.use('/users', usersModule.routes);
router.use('/rbac', rbacModule.routes);
router.use('/tenant', tenantModule.routes);
router.use('/custom-fields', require('./tenant/routes/customField.routes'));
router.use('/platform', require('./platform/routes/platform.routes'));

module.exports = router;
