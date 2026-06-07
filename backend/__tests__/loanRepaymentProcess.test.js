const { updateLoanRepayment, bulkVerifyLoanRepayments } = require('../controllers/loanRepaymentController');
const { LoanRepayment, Loan, sequelize, ActivityLog } = require('../models');

// Mock dependencies
jest.mock('../models', () => ({
  LoanRepayment: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    sum: jest.fn(),
    update: jest.fn() // For static update
  },
  Loan: {
    findByPk: jest.fn()
  },
  ActivityLog: {
    logActivity: jest.fn(),
    create: jest.fn()
  },
  sequelize: {
    transaction: jest.fn()
  },
  Sequelize: {
    Op: { in: 'in' }
  }
}));

describe('Loan Repayment Processing', () => {
  let req, res, mockTransaction;

  beforeEach(() => {
    req = {
      params: { id: 1 },
      body: {},
      user: { id: 1, name: 'Admin', role: 'admin' }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };
    sequelize.transaction.mockResolvedValue(mockTransaction);
    jest.clearAllMocks();
  });

  describe('updateLoanRepayment', () => {
    it('should verify repayment and complete loan if fully paid', async () => {
      const mockRepayment = {
        id: 1,
        loan_id: 100,
        status: 'pending',
        repayment_amount: 5000,
        update: jest.fn(),
        loan: {
          id: 100,
          amount_approved: 10000,
          status: 'active',
          update: jest.fn()
        }
      };

      req.body = { status: 'verified' };
      LoanRepayment.findByPk.mockResolvedValue(mockRepayment);
      
      // Mock finding the loan
      Loan.findByPk.mockResolvedValue(mockRepayment.loan);
      
      // Mock sum of repayments (including this one, it should be 10000)
      LoanRepayment.sum.mockResolvedValue(10000);

      await updateLoanRepayment(req, res);

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(mockRepayment.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'verified' }),
        expect.objectContaining({ transaction: mockTransaction })
      );
      expect(LoanRepayment.sum).toHaveBeenCalled();
      expect(mockRepayment.loan.update).toHaveBeenCalledWith(
        { status: 'completed' },
        expect.objectContaining({ transaction: mockTransaction })
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should verify repayment but keep loan active if partially paid', async () => {
      const mockRepayment = {
        id: 1,
        loan_id: 100,
        status: 'pending',
        repayment_amount: 5000,
        update: jest.fn(),
        loan: {
          id: 100,
          amount_approved: 20000,
          status: 'active',
          update: jest.fn()
        }
      };

      req.body = { status: 'verified' };
      LoanRepayment.findByPk.mockResolvedValue(mockRepayment);
      Loan.findByPk.mockResolvedValue(mockRepayment.loan);
      LoanRepayment.sum.mockResolvedValue(5000); // Only 5000 paid so far

      await updateLoanRepayment(req, res);

      expect(mockRepayment.loan.update).not.toHaveBeenCalled(); // Should not complete loan
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });
});
