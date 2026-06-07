const express = require('express');
const {
  getPeriodData,
  getProfitShares,
  getMyProfitShares,
  calculateProfitShares,
  approveProfitShares,
  payProfitShares,
  getProfitShareStats,
  cancelProfitShares,
  getProfitShareById,
  getProfitSharePeriods
} = require('../controllers/profitShareController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /profit-shares/period-data - Get automatically calculated period data for profit calculation
router.get('/period-data', authenticateToken, getPeriodData);

// GET /profit-shares - Get all profit shares (admin)
router.get('/', authenticateToken, getProfitShares);

// GET /profit-shares/stats - Get profit sharing statistics
router.get('/stats', authenticateToken, getProfitShareStats);

// GET /profit-shares/periods - Get distinct periods for dropdown
router.get('/periods', authenticateToken, getProfitSharePeriods);

// GET /profit-shares/my - Get current user's profit shares (member view)
router.get('/my', authenticateToken, getMyProfitShares);

// GET /profit-shares/:id - Get profit share by ID
router.get('/:id', authenticateToken, getProfitShareById);

// POST /profit-shares/calculate - Calculate profit shares for a period
router.post('/calculate', authenticateToken, calculateProfitShares);

// POST /profit-shares/approve - Approve calculated profit shares
router.post('/approve', authenticateToken, approveProfitShares);

// POST /profit-shares/pay - Mark approved profit shares as paid
router.post('/pay', authenticateToken, payProfitShares);

// POST /profit-shares/cancel - Cancel profit shares
router.post('/cancel', authenticateToken, cancelProfitShares);

module.exports = router;
