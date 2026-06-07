
process.env.NODE_ENV = 'test';
const { sequelize, User, MembershipApplication, Loan, LoanRepayment } = require('../models');
const loanRepaymentController = require('../controllers/loanRepaymentController');

// Mock Response Object
const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.body = {};
  res.status = (code) => { 
    res.statusCode = code; 
    return res; 
  };
  res.json = (data) => { 
    res.body = data; 
    return res; 
  };
  return res;
};

// Mock Request Object
const mockReq = (body, user) => {
    return {
        body,
        user,
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Test' }
    };
};

async function runTest() {
  try {
    console.log('🧪 Starting Loan Repayment Validation Test...');
    await sequelize.sync({ force: true });

    // Create User
    const app = await MembershipApplication.create({ 
        psn: 'TEST001', 
        name: 'Test User', 
        email: 'test@test.com', 
        phone: '1234567890',
        dob: new Date('1990-01-01'),
        address: 'Test Address',
        facility_name: 'Test Facility',
        facility_address: 'Test Facility Address',
        state_of_origin: 'Test State',
        lga: 'Test LGA',
        occupation: 'Tester',
        next_of_kin_name: 'Kin',
        next_of_kin_phone: '0987654321',
        savings: 1000, investment: 1000, target_saving: 0
    });
    const user = await User.create({ 
        membership_application_id: app.id, 
        role: 'member', 
        password_hash: 'hash' 
    });

    // Create Active Loan
    const activeLoan = await Loan.create({
        user_id: user.id,
        loan_type: 'cash',
        amount_requested: 50000,
        amount_approved: 50000,
        repayment_period_months: 10,
        status: 'active', // <--- This is the key
        disbursement_date: new Date()
    });

    // Create Disbursed Loan (Control)
    const disbursedLoan = await Loan.create({
        user_id: user.id,
        loan_type: 'cash',
        amount_requested: 50000,
        amount_approved: 50000,
        repayment_period_months: 10,
        status: 'disbursed',
        disbursement_date: new Date()
    });

    // Test 1: Repayment for Active Loan (Currently Fails, Should Pass)
    console.log('\n📝 Test 1: Repayment for ACTIVE Loan');
    const req1 = mockReq(
        { 
            loan_id: activeLoan.id, 
            repayment_amount: 5000, 
            repayment_date: new Date(), 
            payment_method: 'bank_transfer' 
        },
        { id: user.id, role: 'admin', name: 'Admin' } // Use valid user ID
    );
    const res1 = mockRes();
    
    await loanRepaymentController.createLoanRepayment(req1, res1);
    
    if (res1.statusCode === 201) {
        console.log('✅ PASSED: Active loan repayment accepted.');
    } else {
        console.log('❌ FAILED: Active loan repayment rejected. Status:', res1.statusCode, 'Message:', res1.body.message);
    }

    // Test 2: Repayment for Disbursed Loan (Should Pass)
    console.log('\n📝 Test 2: Repayment for DISBURSED Loan');
    const req2 = mockReq(
        { 
            loan_id: disbursedLoan.id, 
            repayment_amount: 5000, 
            repayment_date: new Date(), 
            payment_method: 'bank_transfer' 
        },
        { id: user.id, role: 'admin', name: 'Admin' } // Use valid user ID
    );
    const res2 = mockRes();
    
    await loanRepaymentController.createLoanRepayment(req2, res2);

    if (res2.statusCode === 201) {
        console.log('✅ PASSED: Disbursed loan repayment accepted.');
    } else {
        console.log('❌ FAILED: Disbursed loan repayment rejected. Status:', res2.statusCode, 'Message:', res2.body.message);
    }

  } catch (error) {
    console.error('Test Error:', error);
  } finally {
      // Clean up handled by force sync next time, but good to close connection? 
      // In this environment, we just let script exit.
  }
}

runTest();
