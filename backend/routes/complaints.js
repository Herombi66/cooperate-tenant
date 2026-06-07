const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const multer = require('multer');
const path = require('path');
const complaintController = require('../controllers/complaintController');
const { authenticateToken: auth } = require('../middleware/auth');

// Validation rules
const createComplaintValidation = [
    check('title', 'Title is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('category', 'Category is required').isIn(['technical', 'service', 'financial', 'other']),
    check('priority', 'Priority must be low, medium, or high').isIn(['low', 'medium', 'high'])
];

const complaintUpload = multer({
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

// Routes
router.post('/', auth, complaintUpload.single('attachment'), createComplaintValidation, complaintController.createComplaint);
router.get('/', auth, complaintController.getComplaints);
router.get('/stats', auth, complaintController.getStats);
router.post('/bulk', auth, complaintController.bulkAction);
router.get('/:id', auth, complaintController.getComplaintById);
router.put('/:id', auth, complaintController.updateComplaint);

module.exports = router;
