require('dotenv').config();
const { sequelize } = require('../db/connection');
const { 
  Tenant, 
  PlatformAdmin, 
  MembershipApplication, 
  User,
  Settings 
} = require('../models');
const bcrypt = require('bcryptjs');
const repairDatabase = require('../db/repair');

async function setup() {
  console.log('🔄 Running repairDatabase and syncing models...');
  await repairDatabase();
  await sequelize.sync();
  console.log('✅ Database schema verified and models synchronized.');

  // 1. Ensure Default Tenant
  let defaultTenant = await Tenant.findOne({ where: { id: 'default' } });
  if (!defaultTenant) {
    defaultTenant = await Tenant.create({
      id: 'default',
      name: 'IMAN Cooperative Society',
      cooperative_type: 'islamic',
      subdomain: 'default',
      status: 'active',
      theme: {
        primaryColor: '#0ea5e9',
        secondaryColor: '#38bdf8'
      },
      features: {
        landing_page: true,
        loans: true,
        layyah: true,
        expenses: true,
        profit_sharing: true,
        withdrawals: true
      }
    });
    console.log('✅ Created default tenant.');
  }

  // 2. Ensure FMCKSMCS Tenant
  let fmckTenant = await Tenant.findOne({ where: { id: 'fmcksmcs' } });
  if (!fmckTenant) {
    fmckTenant = await Tenant.create({
      id: 'fmcksmcs',
      name: 'Federal Medical Centre Kumo Staff MPCS Ltd',
      domain: null,
      subdomain: 'fmcksmcs',
      cooperative_type: 'conventional',
      theme: {
        primaryColor: '#03490b',
        secondaryColor: '#5cd674'
      },
      features: {
        landing_page: true,
        loans: true,
        layyah: false, // conventional coop, no layyah
        expenses: true,
        profit_sharing: true,
        withdrawals: false // disabled for FMCK
      },
      status: 'active'
    });
    console.log('✅ Created FMCKSMCS tenant.');
  } else {
    // Update to ensure correct config
    await fmckTenant.update({
      name: 'Federal Medical Centre Kumo Staff MPCS Ltd',
      cooperative_type: 'conventional',
      theme: {
        primaryColor: '#03490b',
        secondaryColor: '#5cd674'
      },
      features: {
        landing_page: true,
        loans: true,
        layyah: false,
        expenses: true,
        profit_sharing: true,
        withdrawals: false
      }
    });
    console.log('✅ Updated existing FMCKSMCS tenant.');
  }

  // 3. Ensure Platform Super Admin
  const superAdminEmail = 'superadmin@platform.com';
  let platformAdmin = await PlatformAdmin.findOne({ where: { email: superAdminEmail } });
  if (!platformAdmin) {
    const password_hash = await bcrypt.hash('admin123', 10);
    platformAdmin = await PlatformAdmin.create({
      name: 'Super Admin',
      email: superAdminEmail,
      password_hash,
      role: 'super_admin',
      status: 'active'
    });
    console.log('✅ Created platform superadmin (superadmin@platform.com / admin123).');
  }

  // 3b. Ensure Default Tenant Super Admin (ADM001)
  const defaultAdminPsn = 'ADM001';
  let defaultAdminApp = await MembershipApplication.findOne({ where: { psn: defaultAdminPsn }, skipTenant: true });
  if (!defaultAdminApp) {
    defaultAdminApp = await MembershipApplication.create({
      psn: defaultAdminPsn,
      name: 'Default Super Admin',
      email: 'admin@default.com',
      phone: '08000000000',
      facility_name: 'Main Secretariat',
      next_of_kin_name: 'Next of Kin',
      next_of_kin_phone: '08000000001',
      status: 'approved',
      tenant_id: 'default',
      savings: 100000,
      investment: 100000
    }, { skipTenant: true });
  }

  let defaultAdminUser = await User.findOne({ where: { membership_application_id: defaultAdminApp.id }, skipTenant: true });
  const defaultAdminHash = await bcrypt.hash('admin123', 10);
  if (!defaultAdminUser) {
    defaultAdminUser = await User.create({
      membership_application_id: defaultAdminApp.id,
      tenant_id: 'default',
      password_hash: defaultAdminHash,
      role: 'super_admin',
      status: 'active',
      is_default_password: false
    }, { skipTenant: true });
    console.log('✅ Created Default Admin user (ADM001 / admin123).');
  } else {
    await defaultAdminUser.update({
      password_hash: defaultAdminHash,
      is_default_password: false,
      status: 'active'
    }, { skipTenant: true });
  }

  // 4. Ensure FMCK Admin User
  const adminPsn = 'FMCK-ADM-001';
  let adminApp = await MembershipApplication.findOne({ where: { psn: adminPsn }, skipTenant: true });
  if (!adminApp) {
    adminApp = await MembershipApplication.create({
      psn: adminPsn,
      name: 'FMCK Administrator',
      email: 'fmcksmcs@gmail.com',
      phone: '08012345678',
      facility_name: 'Federal Medical Centre Kumo',
      next_of_kin_name: 'Next of Kin',
      next_of_kin_phone: '08012345679',
      status: 'approved',
      tenant_id: 'fmcksmcs',
      savings: 50000,
      investment: 50000
    }, { skipTenant: true });
  } else {
    await adminApp.update({ tenant_id: 'fmcksmcs', email: 'fmcksmcs@gmail.com' }, { skipTenant: true });
  }

  let adminUser = await User.findOne({ where: { membership_application_id: adminApp.id }, skipTenant: true });
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  if (!adminUser) {
    adminUser = await User.create({
      membership_application_id: adminApp.id,
      tenant_id: 'fmcksmcs',
      password_hash: adminPasswordHash,
      role: 'admin',
      status: 'active',
      is_default_password: false
    }, { skipTenant: true });
    console.log('✅ Created FMCK Admin user (FMCK-ADM-001 / admin123).');
  } else {
    await adminUser.update({
      tenant_id: 'fmcksmcs',
      password_hash: adminPasswordHash,
      is_default_password: false,
      status: 'active'
    }, { skipTenant: true });
  }

  // 5. Ensure FMCK Member User (using IPPIS number)
  const memberIppis = 'IPPIS-1001';
  let memberApp = await MembershipApplication.findOne({ where: { psn: memberIppis }, skipTenant: true });
  if (!memberApp) {
    memberApp = await MembershipApplication.create({
      psn: memberIppis,
      name: 'Dr. Ibrahim Kumo',
      email: 'kumo@fmck.org',
      phone: '08098765432',
      facility_name: 'Federal Medical Centre Kumo',
      next_of_kin_name: 'Amina Kumo',
      next_of_kin_phone: '08098765433',
      status: 'approved',
      tenant_id: 'fmcksmcs',
      savings: 250000,
      investment: 100000,
      monthly_income: 450000
    }, { skipTenant: true });
  } else {
    await memberApp.update({ tenant_id: 'fmcksmcs' }, { skipTenant: true });
  }

  let memberUser = await User.findOne({ where: { membership_application_id: memberApp.id }, skipTenant: true });
  const memberPasswordHash = await bcrypt.hash('member123', 10);
  if (!memberUser) {
    memberUser = await User.create({
      membership_application_id: memberApp.id,
      tenant_id: 'fmcksmcs',
      password_hash: memberPasswordHash,
      role: 'member',
      status: 'active',
      is_default_password: false
    }, { skipTenant: true });
    console.log('✅ Created FMCK Member user (IPPIS-1001 / member123).');
  } else {
    await memberUser.update({
      password_hash: memberPasswordHash,
      is_default_password: false,
      status: 'active'
    }, { skipTenant: true });
  }

  console.log('\n🎉 Setup completed successfully!');
  console.log('Summary:');
  console.log('- Tenant: FMCKSMCS (Federal Medical Centre Kumo Staff MPCS Ltd)');
  console.log('- Admin Login: PSN/IPPIS: FMCK-ADM-001 or admin@fmck.org | Password: admin123');
  console.log('- Member Login: IPPIS: IPPIS-1001 or kumo@fmck.org | Password: member123');
  console.log('- Platform Admin: superadmin@platform.com | Password: admin123');

  process.exit(0);
}

setup().catch(err => {
  console.error('❌ Error during setup:', err);
  process.exit(1);
});
