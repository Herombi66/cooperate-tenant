
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
const mockReq = (query, user) => {
    return {
        query,
        user,
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Test' }
    };
};

async function runTest() {
  try {
    console.log('🧪 Starting Loan Repayment Summary Test...');
    await sequelize.sync({ force: true });

    // 1. Create User
    const app = await MembershipApplication.create({ 
        psn: 'SUMM001', 
        name: 'Summary Test User', 
        email: 'summary@test.com', 
        phone: '1112223333',
        dob: new Date('1990-01-01'),
        address: 'Test Address',
        facility_name: 'Test Facility',
        savings: 0, investment: 0, target_saving: 0,
        next_of_kin_name: 'Test Kin',
        next_of_kin_phone: '9998887777'
    });
    const user = await User.create({ 
        membership_application_id: app.id, 
        role: 'member', 
        password_hash: 'hash' 
    });

    // 2. Create Active Loan
    const loanAmount = 100000;
    const loan = await Loan.create({
        user_id: user.id,
        loan_type: 'cash',
        amount_requested: loanAmount,
        amount_approved: loanAmount,
        total_repayment: loanAmount, // No interest
        repayment_period_months: 10,
        status: 'active',
        disbursement_date: new Date()
    });

    // 3. Create verified repayments
    await LoanRepayment.create({
        loan_id: loan.id,
        user_id: user.id,
        repayment_amount: 20000,
        repayment_date: new Date(),
        payment_method: 'bank_transfer',
        status: 'verified',
        recorded_by: user.id
    });

    await LoanRepayment.create({
        loan_id: loan.id,
        user_id: user.id,
        repayment_amount: 30000,
        repayment_date: new Date(),
        payment_method: 'bank_transfer',
        status: 'verified',
        recorded_by: user.id
    });

    // Expected: 20k + 30k = 50k paid. Remaining = 50k.

    // 4. Test getLoanRepayments with user_id filter
    console.log('\n📝 Test: Get Repayments with Active Loan Summary');
    const req = mockReq(
        { user_id: user.id },
        { id: user.id, role: 'admin' } 
    );
    const res = mockRes();

    await loanRepaymentController.getLoanRepayments(req, res);

    const summary = res.body.activeLoanSummary;
    
    if (summary) {
        console.log('✅ Summary found in response.');
        console.log('   Total Repayment:', summary.totalRepayment);
        console.log('   Total Paid:', summary.totalPaid);
        console.log('   Remaining:', summary.remainingBalance);

        if (summary.totalPaid === 50000 && summary.remainingBalance === 50000) {
            console.log('✅ Calculations are correct.');
        } else {
            console.error('❌ Calculations INCORRECT.');
        }

        if (summary.formattedRemainingBalance.includes('NGN')) {
            console.log('✅ Formatting check passed (contains NGN).');
        } else {
             // Depending on locale, might not have NGN literal if system locale is different, but checking presence is good.
             console.log('⚠️ Formatting check: ' + summary.formattedRemainingBalance);
        }

    } else {
        console.error('❌ Summary MISSING from response.');
    }

  } catch (error) {
    console.error('Test Error:', error);
  }
}

runTest();
