const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseStats
} = require('../controllers/expenseController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf'
    ];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'), false);
    }
  }
});

// GET /expenses - Get all expenses
router.get('/', authenticateToken, getExpenses);

// GET /expenses/stats/summary - Get expense statistics
router.get('/stats/summary', authenticateToken, getExpenseStats);

// GET /expenses/:id - Get expense by ID
router.get('/:id', authenticateToken, getExpenseById);

// POST /expenses - Create new expense
router.post('/', authenticateToken, upload.single('receipt'), createExpense);

// PUT /expenses/:id - Update expense
router.put('/:id', authenticateToken, updateExpense);

// DELETE /expenses/:id - Delete expense (only pending expenses)
router.delete('/:id', authenticateToken, deleteExpense);

module.exports = router;
