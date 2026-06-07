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
    count: jest.fn()
  },
  Contribution: {
    sum: jest.fn()
  },
  MembershipApplication: {
    findOne: jest.fn()
  },
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
  sendGuarantorNotificationEmail: jest.fn(),
}));

jest.mock('../services/payslipStorage', () => ({
  storeEncrypted: jest.fn().mockReturnValue({ encPath: 'uploads/payslips/encrypted.enc' }),
}));

const { createLoan } = require('../controllers/loanController');
const { Loan, User, ActivityLog, Notification, MembershipApplication, Contribution } = require('../models');
const emailService = require('../services/emailService');

describe('Loan Controller - createLoan', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1, role: 'member' },
      body: {
        amount: 50000,
        tenure: 12,
        loanType: 'cash',
        purpose: 'Emergency',
        guarantor_psn: 'GRANTOR01',
        guarantor_name: 'Guarantor',
        guarantor_phone: '08012345678',
        guarantor_relationship: 'Brother'
      },
      files: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    // Default mocks
    Loan.findOne.mockResolvedValue(null); // No active loan
    Loan.count.mockResolvedValue(0); // Grantor has no defaulted loans
    User.findOne.mockResolvedValue({ id: 2, membership_application_id: 999 });
    Contribution.sum.mockResolvedValue(0);
    MembershipApplication.findOne.mockResolvedValue({
      id: 999,
      psn: 'GRANTOR01',
      name: 'Valid Grantor',
      email: 'grantor@example.com',
      status: 'approved'
    });
  });

  it('should reject loan application without payslip', async () => {
    // No payslip in req.files or req.body.payslip_url
    req.files = {}; 
    req.file = undefined;
    req.body.payslip_url = undefined;

    await createLoan(req, res);

    // This expectation is what we WANT to happen after the fix.
    // Currently, it will likely FAIL this test (meaning it will succeed or fail with a different error).
    // If it succeeds, res.json will be called with success: true.
    
    // To make the test "pass" (fail as expected) before the fix, we check for what currently happens? 
    // No, I want to use this test to verify the fix. So it should fail now.
    
    // Note: If the code proceeds, it calls Loan.create.
    // So if Loan.create IS called, then the validation failed to stop it.
    if (Loan.create.mock.calls.length > 0) {
        // Validation failed to catch it
        throw new Error('Loan was created despite missing payslip!');
    }

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('Payslip attachment is required')
    }));
  });

  it('should accept loan application with uploaded payslip', async () => {
    req.files = {
      payslip: [{
        path: 'temp/path/file.jpg',
        mimetype: 'image/jpeg',
        originalname: 'payslip.jpg'
      }]
    };

    Loan.create.mockResolvedValue({
      id: 101,
      status: 'pending',
      setDataValue: jest.fn()
    });

    await createLoan(req, res);

    expect(Loan.create).toHaveBeenCalled();
    // Should create an in-app notification for the grantor
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 2,
      type: 'guarantor_request',
    }));

    // Should NOT return 400 for payslip
    if (res.status.mock.calls.length > 0) {
        expect(res.status).not.toHaveBeenCalledWith(400);
    }
  });

  it('should reject loan application when guarantor PSN does not match an active registered member', async () => {
    req.files = {
      payslip: [{
        path: 'temp/path/file.jpg',
        mimetype: 'image/jpeg',
        originalname: 'payslip.jpg'
      }]
    };

    MembershipApplication.findOne.mockResolvedValueOnce(null);

    await createLoan(req, res);

    expect(Loan.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('Guarantor PSN')
    }));
  });

  it('should reject educational loan above 3x total investment', async () => {
    req.body.loanType = 'educational';
    req.body.amount = 50000;
    req.files = {
      payslip: [{
        path: 'temp/path/file.jpg',
        mimetype: 'image/jpeg',
        originalname: 'payslip.jpg'
      }]
    };

    Contribution.sum.mockResolvedValueOnce(10000); // max 30000

    await createLoan(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('Educational loan cannot exceed 3x')
    }));
  });

  it('should accept educational loan within 3x total investment', async () => {
    req.body.loanType = 'educational';
    req.body.amount = 30000;
    req.files = {
      payslip: [{
        path: 'temp/path/file.jpg',
        mimetype: 'image/jpeg',
        originalname: 'payslip.jpg'
      }]
    };

    Contribution.sum.mockResolvedValueOnce(10000); // max 30000
    Loan.create.mockResolvedValue({
      id: 104,
      status: 'pending',
      setDataValue: jest.fn()
    });

    await createLoan(req, res);

    expect(Loan.create).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  it('should reject investment loan with repayment period above 24 months', async () => {
    req.body.loanType = 'investment';
    req.body.amount = 20000;
    req.body.tenure = 36;
    req.files = {
      payslip: [{
        path: 'temp/path/file.jpg',
        mimetype: 'image/jpeg',
        originalname: 'payslip.jpg'
      }]
    };

    await createLoan(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('cannot exceed 24')
    }));
  });

  it('should reject educational loan with repayment period above 24 months', async () => {
    req.body.loanType = 'educational';
    req.body.amount = 20000;
    req.body.tenure = 36;
    req.files = {
      payslip: [{
        path: 'temp/path/file.jpg',
        mimetype: 'image/jpeg',
        originalname: 'payslip.jpg'
      }]
    };
    Contribution.sum.mockResolvedValueOnce(100000);

    await createLoan(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('cannot exceed 24')
    }));
  });

  it('should not notify grantor when no guarantor_psn is provided', async () => {
    req.body.guarantor_psn = undefined;
    req.files = {
      payslip: [{
        path: 'temp/path/file.jpg',
        mimetype: 'image/jpeg',
        originalname: 'payslip.jpg'
      }]
    };

    Loan.create.mockResolvedValue({
      id: 102,
      status: 'pending',
      setDataValue: jest.fn()
    });

    await createLoan(req, res);

    expect(Loan.create).toHaveBeenCalled();
    expect(Notification.create).not.toHaveBeenCalled();
    expect(emailService.sendGuarantorNotificationEmail).not.toHaveBeenCalled();
  });

  it('should handle email failure gracefully while keeping notification', async () => {
    req.files = {
      payslip: [{
        path: 'temp/path/file.jpg',
        mimetype: 'image/jpeg',
        originalname: 'payslip.jpg'
      }]
    };

    Loan.create.mockResolvedValue({
      id: 103,
      status: 'pending',
      setDataValue: jest.fn()
    });

    emailService.sendGuarantorNotificationEmail.mockRejectedValueOnce(new Error('Network error'));

    await createLoan(req, res);

    // In-app notification should still be created
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 2,
      type: 'guarantor_request',
    }));

    // Response should still be success, not a 500
    if (res.status.mock.calls.length > 0) {
      expect(res.status).not.toHaveBeenCalledWith(500);
    }
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true
    }));
  });
});
