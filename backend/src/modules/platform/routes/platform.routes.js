const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platform.controller');
const jwt = require('jsonwebtoken');

// Middleware to protect platform routes
const authenticatePlatformAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    if (!decoded.platformAdmin) {
      return res.status(403).json({ success: false, message: 'Platform admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Auth
router.post('/auth/login', platformController.login);

// Tenants CRUD (Protected)
router.use('/tenants', authenticatePlatformAdmin);
router.get('/tenants', platformController.getTenants);
router.post('/tenants', platformController.createTenant);
router.put('/tenants/:id', platformController.updateTenant);

module.exports = router;
