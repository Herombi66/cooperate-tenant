const { getLoanRepayments } = require('../controllers/loanRepaymentController');
const { LoanRepayment, Loan, User, MembershipApplication } = require('../models');

// Mock dependencies
jest.mock('../models', () => ({
  LoanRepayment: {
    findAndCountAll: jest.fn()
  },
  Loan: {},
  User: {
    findOne: jest.fn()
  },
  MembershipApplication: {
    findOne: jest.fn()
  }
}));

describe('Loan Repayment Pagination', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      user: { id: 1 }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  it('should return paginated results with default limit 20', async () => {
    // Mock data
    const mockRepayments = Array(20).fill({
      id: 1,
      loan_id: 1,
      repayment_amount: 5000,
      repayment_date: '2025-01-01',
      status: 'verified',
      user: {
        membershipApplication: { name: 'Test User', psn: '123' }
      }
    });

    LoanRepayment.findAndCountAll.mockResolvedValue({
      count: 50,
      rows: mockRepayments
    });

    await getLoanRepayments(req, res);

    expect(LoanRepayment.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 20,
      offset: 0
    }));

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      pagination: {
        total: 50,
        page: 1,
        limit: 20,
        pages: 3 // Math.ceil(50/20)
      }
    }));
  });

  it('should respect custom page and limit', async () => {
    req.query = { page: 2, limit: 5 };

    LoanRepayment.findAndCountAll.mockResolvedValue({
      count: 50,
      rows: []
    });

    await getLoanRepayments(req, res);

    expect(LoanRepayment.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 5,
      offset: 5 // (2-1) * 5
    }));

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      pagination: {
        total: 50,
        page: 2,
        limit: 5,
        pages: 10
      }
    }));
  });
});
