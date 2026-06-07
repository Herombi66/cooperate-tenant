const { sequelize, User, MembershipApplication, ActivityLog } = require('../models');
const { updateMemberJoinDate } = require('../controllers/memberController');
require('dotenv').config();

async function runVerification() {
  console.log('🚀 Starting verification on DigitalOcean Database...');
  
  // const transaction = await sequelize.transaction(); // REMOVED transaction to allow controller to see data
  
  let adminApp, adminUser, memberApp, memberUser;

  try {
    // 1. Create Dummy Admin
    console.log('👤 Creating dummy admin...');
    adminApp = await MembershipApplication.create({
      name: 'Test Admin DO',
      psn: 'TEST_ADMIN_DO',
      email: 'test_admin_do@example.com',
      phone: '00000000000',
      facility_name: 'Test HQ',
      next_of_kin_name: 'Test NOK',
      next_of_kin_phone: '00000000002',
      status: 'approved',
      savings: 0,
      investment: 0,
      target_saving: 0,
      target_period: 0
    });

    adminUser = await User.create({
      membership_application_id: adminApp.id,
      role: 'admin',
      status: 'active',
      password_hash: 'dummy_hash'
    });

    // 2. Create Dummy Member
    console.log('👤 Creating dummy member...');
    memberApp = await MembershipApplication.create({
      name: 'Test Member DO',
      psn: 'TEST_MEMBER_DO',
      email: 'test_member_do@example.com',
      phone: '00000000001',
      facility_name: 'Test Branch',
      next_of_kin_name: 'Test NOK Member',
      next_of_kin_phone: '00000000003',
      status: 'approved',
      review_date: '2020-01-01', // Original date
      savings: 0,
      investment: 0,
      target_saving: 0,
      target_period: 0
    });

    memberUser = await User.create({
      membership_application_id: memberApp.id,
      role: 'member',
      status: 'active',
      password_hash: 'dummy_hash'
    });

    console.log(`✅ Created Member ID: ${memberUser.id}, Original Date: 2020-01-01`);

    // 3. Mock Req/Res for Controller
    const newJoinDate = '2025-01-01';
    const req = {
      user: adminUser,
      params: { id: memberUser.id },
      body: { joinDate: newJoinDate },
      get: (header) => 'Test Script' // Mock header getter
    };

    const res = {
      status: (code) => {
        console.log(`Response Status: ${code}`);
        return {
            json: (data) => {
                console.log('Response JSON:', data);
                return data;
            }
        };
      },
      json: (data) => {
        console.log('Response JSON:', data);
        return data;
      }
    };

    // 4. Call Controller Function
    console.log('🔄 Calling updateMemberJoinDate...');
    await updateMemberJoinDate(req, res);

    // 5. Verify DB Update
    const updatedApp = await MembershipApplication.findByPk(memberApp.id);
    // Date from DB might be object
    const dbDate = new Date(updatedApp.review_date).toISOString().split('T')[0];
    
    console.log(`🔍 Verified DB Date: ${dbDate}`);
    
    if (dbDate === newJoinDate) {
        console.log('✅ Date updated successfully!');
    } else {
        console.error('❌ Date update FAILED!');
    }

    // 6. Verify Activity Log
    const log = await ActivityLog.findOne({
        where: {
            action: 'update_member_join_date',
            resource_id: memberUser.id
        }
    });

    if (log) {
        console.log('✅ Activity Log found:', log.description);
        // Clean up log
        await log.destroy();
    } else {
        console.error('❌ Activity Log NOT found!');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up test data...');
    if (memberUser) await memberUser.destroy({ force: true });
    if (memberApp) await memberApp.destroy({ force: true });
    if (adminUser) await adminUser.destroy({ force: true });
    if (adminApp) await adminApp.destroy({ force: true });
    
    await sequelize.close();
    console.log('✨ Cleanup complete.');
  }
}

runVerification();
