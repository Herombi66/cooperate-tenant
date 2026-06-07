
const { User, MembershipApplication } = require('../models');
const { Op } = require('sequelize');

async function listRestrictedUsers() {
  try {
    const users = await User.findAll({
      where: {
        role: {
          [Op.in]: ['chairman', 'treasurer', 'secretary']
        }
      },
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        attributes: ['first_name', 'last_name', 'psn']
      }],
      raw: true,
      nest: true
    });

    console.log('--- Restricted Role Users ---');
    if (users.length === 0) {
      console.log('No users found with restricted roles.');
    } else {
      users.forEach(u => {
        console.log(`ID: ${u.id}, Role: ${u.role}, Name: ${u.membershipApplication.first_name} ${u.membershipApplication.last_name}, PSN: ${u.membershipApplication.psn}`);
      });
    }
    
    // Also check for user 97 specifically as requested to check status
    const user97 = await User.findByPk(97, {
       include: [{
        model: MembershipApplication,
        as: 'membershipApplication'
      }]
    });
    if (user97) {
        console.log('\n--- User 97 Status ---');
        console.log(`ID: ${user97.id}, Role: ${user97.role}, Name: ${user97.membershipApplication?.first_name} ${user97.membershipApplication?.last_name}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if main
if (require.main === module) {
  listRestrictedUsers().then(() => process.exit(0));
}
