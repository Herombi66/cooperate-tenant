const { approveLoan, rejectLoan } = require('../controllers/loanController');
const { Loan, User, ActivityLog, Notification } = require('../models');

// Mock dependencies
jest.mock('../models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  Loan: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  MembershipApplication: {},
  ActivityLog: {
    logActivity: jest.fn(),
  },
  Notification: {
    create: jest.fn(),
  },
  EducationalDocument: {},
  LoanAgreement: {},
  sequelize: {
    transaction: (cb) => cb({ rollback: jest.fn(), commit: jest.fn() })
  }
}));

jest.mock('../services/emailService', () => ({
  sendLoanApplicationEmail: jest.fn(),
  sendLoanStatusEmail: jest.fn(),
  sendLoanApprovedEmail: jest.fn(),
  sendLoanRejectedEmail: jest.fn(),
  sendGuarantorNotificationEmail: jest.fn(),
}));

describe('Loan Controller - Chairman Approval/Rejection', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('approveLoan', () => {
    it('should allow chairman to approve a pending loan', async () => {
      req = {
        user: { id: 10, role: 'chairman', name: 'Chairman User' },
        params: { id: 1 },
        body: { amount_approved: 50000 }
      };

      const mockLoan = {
        id: 1,
        status: 'pending',
        amount: 50000,
        user_id: 2,
        update: jest.fn().mockImplementation(function(data) {
          Object.assign(this, data);
          return Promise.resolve(this);
        }),
        User: { id: 2, email: 'member@example.com', name: 'Member' }
      };
      
      Loan.findByPk.mockResolvedValue(mockLoan);

      await approveLoan(req, res);

      expect(mockLoan.status).toBe('waiting_disbursement');
      expect(mockLoan.amount_approved).toBe(50000);
      expect(mockLoan.approved_by).toBe(10);
      expect(mockLoan.approval_date).toBeDefined();
      expect(mockLoan.update).toHaveBeenCalled();
      
      expect(ActivityLog.logActivity).toHaveBeenCalledWith(
        req.user,
        'approve_loan',
        'loan',
        1,
        expect.stringContaining('Loan #1 approved by chairman'),
        expect.anything(),
        req
      );

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Loan approved successfully'
      }));
    });

    it('should prevent member from approving a loan', async () => {
      req = {
        user: { id: 3, role: 'member', name: 'Regular Member' },
        params: { id: 1 },
        body: { amount_approved: 50000 }
      };

      await approveLoan(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Access denied')
      }));
      expect(Loan.findByPk).not.toHaveBeenCalled();
    });

    it('should fail if loan is not in valid status', async () => {
        req = {
          user: { id: 10, role: 'chairman', name: 'Chairman User' },
          params: { id: 1 },
          body: { amount_approved: 50000 }
        };
  
        const mockLoan = {
          id: 1,
          status: 'rejected', // Invalid status for approval
          amount: 50000,
          user_id: 2,
          update: jest.fn(),
          User: { id: 2, email: 'member@example.com', name: 'Member' }
        };
        
        Loan.findByPk.mockResolvedValue(mockLoan);
  
        await approveLoan(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: false,
          message: expect.stringContaining("Cannot approve loan in 'rejected' status")
        }));
        expect(mockLoan.update).not.toHaveBeenCalled();
      });
  });

  describe('rejectLoan', () => {
    it('should allow chairman to reject a loan', async () => {
      req = {
        user: { id: 10, role: 'chairman', name: 'Chairman User' },
        params: { id: 1 },
        body: { reason: 'Risk too high' }
      };

      const mockLoan = {
        id: 1,
        status: 'pending',
        user_id: 2,
        update: jest.fn().mockImplementation(function(data) {
          Object.assign(this, data);
          return Promise.resolve(this);
        }),
        User: { id: 2, email: 'member@example.com', name: 'Member' }
      };
      
      Loan.findByPk.mockResolvedValue(mockLoan);

      await rejectLoan(req, res);

      expect(mockLoan.status).toBe('rejected');
      expect(mockLoan.update).toHaveBeenCalled();
      
      expect(ActivityLog.logActivity).toHaveBeenCalledWith(
        req.user,
        'reject_loan',
        'loan',
        1,
        expect.stringContaining('Loan #1 rejected by chairman'),
        expect.objectContaining({ reason: 'Risk too high' }),
        req
      );

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Loan rejected successfully'
      }));
    });

    it('should require a reason for rejection', async () => {
        req = {
          user: { id: 10, role: 'chairman', name: 'Chairman User' },
          params: { id: 1 },
          body: { reason: '' } // Empty reason
        };
  
        // We don't even need to mock loan finding if validation happens first,
        // but the controller does Role Check -> Find Loan -> Validation (Wait, reason check is first now?)
        // Let's check my edit.
        // My edit put reason check BEFORE role check.
        // So Loan.findByPk should NOT be called if I did it right.
        
        // Wait, looking at my SearchReplace:
        // +         const { reason } = req.body;
        // + 
        // +         if (!reason || reason.trim() === '') {
        // +             return res.status(400).json({ success: false, message: 'Rejection reason is required' });
        // +         }
        // + 
        // +         // Role Check
        
        // Yes, reason check is first. So Loan.findByPk won't be called.
        
        await rejectLoan(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: false,
          message: 'Rejection reason is required'
        }));
        expect(Loan.findByPk).not.toHaveBeenCalled();
      });
  });
});
