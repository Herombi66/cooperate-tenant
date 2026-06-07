jest.mock('../models', () => {
  const transaction = {
    commit: jest.fn(),
    rollback: jest.fn()
  };

  const LoanRepayment = {
    findByPk: jest.fn(),
    update: jest.fn(),
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
    create: jest.fn().mockResolvedValue(true)
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

const { updateLoanRepayment } = require('../controllers/loanRepaymentController');
const { LoanRepayment } = require('../models');

describe('Update Loan Repayment', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { id: 1 },
      body: {},
      user: { id: 1, role: 'admin' }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  it('should update repayment status to verified', async () => {
    const mockRepayment = {
      id: 1,
      status: 'pending',
      notes: 'old notes',
      update: jest.fn().mockResolvedValue(true),
      loan: { update: jest.fn() } // If it updates loan balance
    };

    LoanRepayment.findByPk.mockResolvedValue(mockRepayment);
    req.body = { status: 'verified' };

    await updateLoanRepayment(req, res);

    expect(LoanRepayment.findByPk).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ transaction: expect.any(Object) })
    );
    expect(mockRepayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'verified'
      }),
      expect.objectContaining({ transaction: expect.any(Object) })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true
    }));
  });

  it('should update repayment status to rejected with notes', async () => {
    const mockRepayment = {
      id: 1,
      status: 'pending',
      notes: 'old notes',
      update: jest.fn().mockResolvedValue(true)
    };

    LoanRepayment.findByPk.mockResolvedValue(mockRepayment);
    req.body = { status: 'rejected', notes: 'Invalid proof' };

    await updateLoanRepayment(req, res);

    expect(mockRepayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        notes: 'Invalid proof'
      }),
      expect.objectContaining({ transaction: expect.any(Object) })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true
    }));
  });

  it('should return 404 if repayment not found', async () => {
    LoanRepayment.findByPk.mockResolvedValue(null);

    await updateLoanRepayment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false
    }));
  });

  it('should return 400 for invalid status', async () => {
    const mockRepayment = {
      id: 1,
      status: 'pending',
      notes: 'old notes',
      update: jest.fn().mockResolvedValue(true)
    };
    LoanRepayment.findByPk.mockResolvedValue(mockRepayment);
    req.body = { status: 'approved' };

    await updateLoanRepayment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false
    }));
  });

  it('should return 400 when trying to verify non-pending repayment', async () => {
    const mockRepayment = {
      id: 1,
      status: 'verified',
      notes: 'old notes',
      update: jest.fn().mockResolvedValue(true)
    };
    LoanRepayment.findByPk.mockResolvedValue(mockRepayment);
    req.body = { status: 'verified' };

    await updateLoanRepayment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false
    }));
  });
});
