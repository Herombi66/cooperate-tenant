const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { sendDirectMessage, getMessageHistory, markMessageRead } = require('../controllers/directMessageController');

router.use(authenticateToken);

const messageUpload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension);
    if (isValidType) cb(null, true);
    else cb(new Error('Invalid file type. Only Images (JPG, PNG) and PDF are allowed.'), false);
  }
});

router.post('/', messageUpload.single('attachment'), sendDirectMessage);
router.get('/', getMessageHistory);
router.put('/:id/read', markMessageRead);

module.exports = router;
