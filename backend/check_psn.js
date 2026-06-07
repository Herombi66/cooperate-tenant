const { sequelize } = require('./db/connection');
const MembershipApplication = require('./models/MembershipApplication');
const User = require('./models/User');

async function checkPSN() {
  try {
    const psn = '33697';
    console.log(`Checking for PSN: ${psn}...`);

    const application = await MembershipApplication.findOne({
      where: { psn: psn }
    });

    if (application) {
      console.log('✅ Found in MembershipApplication:');
      console.log(JSON.stringify(application.toJSON(), null, 2));

      const user = await User.findOne({
        where: { membership_application_id: application.id }
      });

      if (user) {
        console.log('✅ Found in User table (linked via membership_application_id):');
        console.log(JSON.stringify(user.toJSON(), null, 2));
      } else {
        console.log('❌ Not found in User table.');
      }
    } else {
      console.log('❌ Not found in MembershipApplication.');
    }

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    // Attempt to close if possible, otherwise just exit
    try {
        if (sequelize.close) await sequelize.close();
    } catch (e) {
        console.log('Connection close not supported or failed, exiting...');
    }
    process.exit(0);
  }
}

checkPSN();
