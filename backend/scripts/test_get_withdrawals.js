
const { sequelize, ContributionWithdrawal, User, MembershipApplication } = require('../models');

async function testGetWithdrawals() {
  try {
    console.log('🧪 Testing getWithdrawals query...');
    
    // Simulate query parameters
    const limit = 10;
    const offset = 0;
    const whereClause = {}; // No filters

    const { count, rows } = await ContributionWithdrawal.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id'],
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'email', 'psn']
        }]
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Query successful! Found ${count} records.`);
    
    if (rows.length > 0) {
      const sample = rows[0].get({ plain: true });
      console.log('Sample record:', JSON.stringify(sample, null, 2));
      
      // Test formatting logic
      if (sample.user && sample.user.membershipApplication) {
        sample.user.name = sample.user.membershipApplication.name;
        sample.user.email = sample.user.membershipApplication.email;
        sample.user.psn = sample.user.membershipApplication.psn;
        delete sample.user.membershipApplication;
      }
      console.log('Formatted sample:', JSON.stringify(sample, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }
}

testGetWithdrawals();
