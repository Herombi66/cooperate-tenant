const { User, sequelize } = require('../models');
const { Op } = require('sequelize');

async function inspectRoles() {
  try {
    console.log('Inspecting User Roles...');
    
    // Check User 97 specifically
    const user97 = await User.findByPk(97);
    if (user97) {
        console.log(`User 97: Role=${user97.role}, Additional=${user97.additional_role}, Status=${user97.status}`);
    } else {
        console.log('User 97 not found.');
    }

    // Find all executives
    const executives = await User.findAll({
      where: {
        role: {
          [Op.in]: ['chairman', 'treasurer', 'secretary', 'admin', 'super_admin']
        }
      }
    });

    console.log(`Found ${executives.length} executive/admin accounts:`);
    executives.forEach(u => {
      console.log(`ID: ${u.id}, Role: ${u.role}, Additional: ${u.additional_role}, PSN: ${u.membership_application_id}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

inspectRoles();
