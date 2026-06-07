const bcrypt = require('bcryptjs');
const { sequelize } = require('../db/connection');
const { User, MembershipApplication } = require('../models');

const createSuperAdmin = async () => {
  try {
    console.log('🔐 Starting super admin creation...');

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', saltRounds);

    const applicationData = {
      psn: 'SUPERADMIN001',
      name: 'Super Administrator',
      email: 'superadmin@imancooperative.org',
      phone: '+2348000000000',
      facility_name: 'IMAN Cooperative HQ',
      next_of_kin_name: 'System Support',
      next_of_kin_phone: '+2348000000001',
      savings: 0,
      investment: 0,
      target_saving: 0,
      target_period: 0,
      status: 'approved',
      application_date: new Date(),
      approved_by: 'System',
      approved_at: new Date(),
      reviewed_by: null,
      review_date: new Date()
    };

    const application = await MembershipApplication.create(applicationData);
    console.log('✅ Membership application created successfully.');

    const userData = {
      membership_application_id: application.id,
      password_hash: hashedPassword,
      role: 'super_admin',
      is_default_password: true,
      status: 'active',
      can_liquidate_loans: true
    };

    const user = await User.create(userData);
    console.log('✅ Super admin account created successfully!');
    console.log('');
    console.log('📋 Super Admin Credentials:');
    console.log('   Email: superadmin@imancooperative.org');
    console.log('   Password: SuperAdmin123!');
    console.log('   PSN: SUPERADMIN001');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password immediately after first login!');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    await sequelize.close();
  }
};

if (require.main === module) {
  createSuperAdmin();
}

module.exports = createSuperAdmin;
