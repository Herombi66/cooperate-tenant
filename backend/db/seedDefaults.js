const bcrypt = require('bcryptjs');
const { Tenant, PlatformAdmin, MembershipApplication, User } = require('../models');

async function seedDefaults() {
  try {
    console.log('🌱 Checking / seeding default tenants and admin accounts...');

    // 1. Default Tenant
    let defaultTenant = await Tenant.findOne({ where: { id: 'default' } });
    if (!defaultTenant) {
      defaultTenant = await Tenant.create({
        id: 'default',
        name: 'IMAN Cooperative Society',
        cooperative_type: 'islamic',
        subdomain: 'default',
        status: 'active',
        features: {
          landing_page: true,
          loans: true,
          layyah: true,
          expenses: true,
          profit_sharing: true,
          withdrawals: true
        }
      });
      console.log('✅ Created default tenant');
    }

    // 2. FMCK Tenant
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
          layyah: false,
          expenses: true,
          profit_sharing: true,
          withdrawals: false
        },
        status: 'active'
      });
      console.log('✅ Created FMCKSMCS tenant');
    }

    const defaultPasswordHash = await bcrypt.hash('admin123', 10);

    // 3. Platform Super Admin (superadmin@platform.com)
    let platformAdmin = await PlatformAdmin.findOne({ where: { email: 'superadmin@platform.com' } });
    if (!platformAdmin) {
      await PlatformAdmin.create({
        name: 'Super Admin',
        email: 'superadmin@platform.com',
        password_hash: defaultPasswordHash,
        role: 'super_admin',
        status: 'active'
      });
      console.log('✅ Created platform superadmin (superadmin@platform.com / admin123)');
    }

    // 4. FMCK Admin User (FMCK-ADM-001 / fmcksmcs@gmail.com)
    let fmckApp = await MembershipApplication.findOne({
      where: { psn: 'FMCK-ADM-001' },
      skipTenant: true
    });
    if (!fmckApp) {
      fmckApp = await MembershipApplication.create({
        psn: 'FMCK-ADM-001',
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
      console.log('✅ Created FMCK Admin application (FMCK-ADM-001)');
    } else {
      await fmckApp.update({
        email: 'fmcksmcs@gmail.com',
        tenant_id: 'fmcksmcs',
        status: 'approved'
      }, { skipTenant: true });
    }

    let fmckUser = await User.findOne({
      where: { membership_application_id: fmckApp.id },
      skipTenant: true
    });
    if (!fmckUser) {
      fmckUser = await User.create({
        membership_application_id: fmckApp.id,
        tenant_id: 'fmcksmcs',
        password_hash: defaultPasswordHash,
        role: 'admin',
        status: 'active',
        is_default_password: false
      }, { skipTenant: true });
      console.log('✅ Created FMCK Admin user (FMCK-ADM-001 / admin123)');
    } else {
      await fmckUser.update({
        tenant_id: 'fmcksmcs',
        password_hash: defaultPasswordHash,
        status: 'active',
        is_default_password: false
      }, { skipTenant: true });
      console.log('✅ Verified & updated FMCK Admin password (FMCK-ADM-001 / admin123)');
    }

    // 5. Default Tenant Admin (ADM001 / admin@default.com)
    let defaultApp = await MembershipApplication.findOne({
      where: { psn: 'ADM001' },
      skipTenant: true
    });
    if (!defaultApp) {
      defaultApp = await MembershipApplication.create({
        psn: 'ADM001',
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
      console.log('✅ Created Default Admin application (ADM001)');
    }

    let defaultUser = await User.findOne({
      where: { membership_application_id: defaultApp.id },
      skipTenant: true
    });
    if (!defaultUser) {
      defaultUser = await User.create({
        membership_application_id: defaultApp.id,
        tenant_id: 'default',
        password_hash: defaultPasswordHash,
        role: 'super_admin',
        status: 'active',
        is_default_password: false
      }, { skipTenant: true });
      console.log('✅ Created Default Admin user (ADM001 / admin123)');
    } else {
      await defaultUser.update({
        tenant_id: 'default',
        password_hash: defaultPasswordHash,
        status: 'active',
        is_default_password: false
      }, { skipTenant: true });
    }

    console.log('🎉 Default tenants and admin credentials successfully verified!');
  } catch (err) {
    console.error('⚠️ seedDefaults warning:', err.message);
  }
}

module.exports = seedDefaults;
