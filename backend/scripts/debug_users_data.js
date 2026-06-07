require('dotenv').config();
const { User, MembershipApplication } = require('../models');

async function checkUsersData() {
  try {
    const users = await User.findAll({
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication'
      }]
    });

    console.log(`Found ${users.length} users.`);
    
    users.forEach(u => {
      const app = u.membershipApplication;
      if (!app) {
        console.log(`❌ User ${u.id} has no membership application!`);
      } else {
        if (!app.name) console.log(`❌ User ${u.id} has NULL name!`);
      }
      
      if (!u.role) console.log(`❌ User ${u.id} has NULL role!`);
      if (!u.status) console.log(`❌ User ${u.id} has NULL status!`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsersData();
