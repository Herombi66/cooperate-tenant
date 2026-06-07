const { sequelize } = require('../db/connection');
const { Op } = require('sequelize');
const { 
  ContributionWithdrawal, 
  Contribution, 
  Loan, 
  User, 
  MembershipApplication 
} = require('../models');

async function testEligibility() {
  try {
    console.log('🧪 Testing eligibility logic...');
    
    // 1. Get a user
    const user = await User.findOne({
        include: [{
            model: MembershipApplication,
            as: 'membershipApplication'
        }]
    });

    if (!user) {
        console.log('⚠️ No users found in database to test with.');
        process.exit(0);
    }

    const user_id = user.id;
    console.log(`👤 Testing for User ID: ${user_id} (${user.membershipApplication?.name})`);

    const currentYear = new Date().getFullYear();

    // 2. Check active loans
    console.log('  Checking active loans...');
    const activeLoan = await Loan.findOne({
      where: {
        user_id,
        loan_type: 'investment',
        status: {
          [Op.in]: ['active', 'disbursed', 'defaulted', 'awaiting_admin_review']
        }
      }
    });
    console.log(`  Active Loan: ${activeLoan ? 'Yes' : 'No'}`);

    // 3. Check existing withdrawal
    console.log('  Checking existing withdrawals...');
    const existingWithdrawal = await ContributionWithdrawal.findOne({
      where: {
        user_id,
        year: currentYear,
        status: {
          [Op.not]: 'rejected'
        }
      }
    });
    console.log(`  Existing Withdrawal: ${existingWithdrawal ? 'Yes' : 'No'}`);

    // 4. Calculate Total Contributions
    console.log('  Calculating contributions...');
    const totalGrossContributions = await Contribution.sum('total_amount', {
      where: {
        user_id,
        status: 'approved'
      }
    }) || 0;
    console.log(`  Total Gross: ${totalGrossContributions}`);

    // 5. Calculate Total Withdrawals
    console.log('  Calculating total withdrawals...');
    const totalWithdrawals = await ContributionWithdrawal.sum('amount', {
      where: {
        user_id,
        status: {
          [Op.in]: ['approved', 'disbursed']
        }
      }
    }) || 0;
    console.log(`  Total Withdrawn: ${totalWithdrawals}`);

    const netBalance = totalGrossContributions - totalWithdrawals;
    const maxAmount = netBalance * 0.30;

    console.log(`  Net Balance: ${netBalance}`);
    console.log(`  Max Amount (30%): ${maxAmount}`);

    console.log('✅ Eligibility checks completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Eligibility check failed:', error);
    process.exit(1);
  }
}

testEligibility();
