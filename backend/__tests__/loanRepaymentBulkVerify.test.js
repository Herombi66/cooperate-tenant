jest.mock('../models', () => {
  const transaction = {
    commit: jest.fn(),
    rollback: jest.fn()
  };

  const LoanRepayment = {
    findAll: jest.fn(),
    sum: jest.fn().mockResolvedValue(0)
  };

  const Loan = {
    findByPk: jest.fn().mockResolvedValue({
      id: 10,
      total_repayment: 1000,
      amount_approved: 1000,
      amount_requested: 1000,
      status: 'active',
      update: jest.fn().mockResolvedValue(true)
    })
  };

  const ActivityLog = {
    create: jest.fn().mockResolvedValue(true),
    bulkCreate: jest.fn().mockResolvedValue(true)
  };

  const sequelize = {
    transaction: jest.fn(() => Promise.resolve(transaction))
  };

  return {
    LoanRepayment,
    Loan,
    User: {},
    MembershipApplication: {},
    ActivityLog,
    sequelize
  };
});

const { bulkVerifyLoanRepayments } = require('../controllers/loanRepaymentController');
const { LoanRepayment } = require('../models');
const { Op } = require('sequelize');

describe('Bulk Verify Loan Repayments', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      user: { id: 1, role: 'admin' }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  it('should verify multiple repayments successfully', async () => {
    const repaymentIds = [1, 2, 3];
    req.body = { repayment_ids: repaymentIds };

    LoanRepayment.findAll.mockResolvedValue([
      { id: 1, loan_id: 10, status: 'pending', update: jest.fn().mockResolvedValue(true) },
      { id: 2, loan_id: 11, status: 'pending', update: jest.fn().mockResolvedValue(true) },
      { id: 3, loan_id: 10, status: 'pending', update: jest.fn().mockResolvedValue(true) }
    ]);

    await bulkVerifyLoanRepayments(req, res);

    expect(LoanRepayment.findAll).toHaveBeenCalledWith({
      where: {
        id: { [Op.in]: repaymentIds }
      },
      transaction: expect.any(Object)
    });

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Bulk verification processed',
      summary: { requested: 3, verified: 3, skipped: 0, failed: 0 },
      verified_ids: [1, 2, 3],
      skipped: [],
      failed: []
    });
  });

  it('should return 400 if no IDs provided', async () => {
    req.body = {};

    await bulkVerifyLoanRepayments(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'No repayment IDs provided'
    });
  });

  it('should handle database errors', async () => {
    req.body = { repayment_ids: [1] };
    LoanRepayment.findAll.mockResolvedValue([
      { id: 1, loan_id: 10, status: 'pending', update: jest.fn().mockRejectedValue(new Error('Database error')) }
    ]);

    await bulkVerifyLoanRepayments(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      summary: { requested: 1, verified: 0, skipped: 0, failed: 1 }
    }));
  });
});
