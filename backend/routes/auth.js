const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { login, getProfile, updateProfile, changePassword, logout, getCsrfToken, logSessionEvent } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for login attempts - COMPLETELY DISABLED FOR TESTING
// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000, // Very high limit for testing
//   message: {
//     success: false,
//     message: 'Too many login attempts, please try again later'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Skip rate limiting for now
const loginLimiter = (req, res, next) => next();

// Configure multer for profile image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// POST /auth/login
router.post('/login', loginLimiter, login);

// POST /auth/logout
router.post('/logout', logout);

router.post('/session-events', authenticateToken, logSessionEvent);

// GET /auth/me - Protected route to get current user profile
router.get('/me', authenticateToken, getProfile);

router.get('/csrf', authenticateToken, getCsrfToken);

// PUT /auth/profile - Protected route to update user profile with image upload
router.put('/profile', authenticateToken, upload.single('profileImage'), updateProfile);

// PUT /auth/change-password - Protected route to change user password
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;
