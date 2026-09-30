require('dotenv').config();
const { sequelize } = require('../db/connection');
const { MembershipApplication, User } = require('../models');
const bcrypt = require('bcryptjs');

async function seedRoles() {
  console.log('🔄 Seeding role accounts for FMCK tenant...');

  const roleDefinitions = [
    {
      psn: 'FMCK-ADM-001',
      name: 'FMCK Administrator',
      email: 'admin@fmck.org',
      role: 'admin',
      password: 'admin123',
      phone: '08012345678'
    },
    {
      psn: 'FMCK-CHM-001',
      name: 'Dr. Aliyu Chairman',
      email: 'chairman@fmck.org',
      role: 'chairman',
      password: 'chairman123',
      phone: '08022223333'
    },
    {
      psn: 'FMCK-SEC-001',
      name: 'Hajia Fatima Secretary',
      email: 'secretary@fmck.org',
      role: 'secretary',
      password: 'secretary123',
      phone: '08033334444'
    },
    {
      psn: 'FMCK-ASEC-001',
      name: 'Usman Assistant Secretary',
      email: 'asst.secretary@fmck.org',
      role: 'assistant_secretary',
      password: 'asstsecretary123',
      phone: '08044445555'
    },
    {
      psn: 'FMCK-FIN-001',
      name: 'Zainab Financial Secretary',
      email: 'fin.secretary@fmck.org',
      role: 'financial_secretary',
      password: 'finsecretary123',
      phone: '08055556666'
    },
    {
      psn: 'FMCK-TRS-001',
      name: 'Mallam Bello Treasurer',
      email: 'treasurer@fmck.org',
      role: 'treasurer',
      password: 'treasurer123',
      phone: '08066667777'
    },
    {
      psn: 'FMCK-AUD-001',
      name: 'Ahmed Auditor',
      email: 'auditor@fmck.org',
      role: 'auditor',
      password: 'auditor123',
      phone: '08077778888'
    },
    {
      psn: 'FMCK-PRO-001',
      name: 'Maryam Public Relations',
      email: 'pro@fmck.org',
      role: 'pro',
      password: 'pro123',
      phone: '08088889999'
    },
    {
      psn: 'IPPIS-1001',
      name: 'Dr. Ibrahim Kumo',
      email: 'kumo@fmck.org',
      role: 'member',
      password: 'member123',
      phone: '08098765432'
    }
  ];

  for (const def of roleDefinitions) {
    let app = await MembershipApplication.findOne({ where: { psn: def.psn }, skipTenant: true });
    if (!app) {
      app = await MembershipApplication.create({
        psn: def.psn,
        name: def.name,
        email: def.email,
        phone: def.phone,
        facility_name: 'Federal Medical Centre Kumo',
        next_of_kin_name: 'Next of Kin',
        next_of_kin_phone: '08000000000',
        status: 'approved',
        savings: 150000,
        investment: 50000
      }, { skipTenant: true });
    }

    const hashedPassword = await bcrypt.hash(def.password, 10);
    let user = await User.findOne({
      where: { membership_application_id: app.id, role: def.role },
      skipTenant: true
    });

    if (!user) {
      user = await User.create({
        membership_application_id: app.id,
        tenant_id: 'fmcksmcs',
        password_hash: hashedPassword,
        role: def.role,
        status: 'active',
        is_default_password: false
      }, { skipTenant: true });
      console.log(`✅ Created ${def.role} account: PSN=${def.psn} | Password=${def.password}`);
    } else {
      await user.update({
        password_hash: hashedPassword,
        status: 'active',
        is_default_password: false
      }, { skipTenant: true });
      console.log(`✅ Updated ${def.role} account: PSN=${def.psn} | Password=${def.password}`);
    }
  }

  // Also update user 3 and 4 (PSN 11212)
  const app11212 = await MembershipApplication.findOne({ where: { psn: '11212' }, skipTenant: true });
  if (app11212) {
    const memberHash = await bcrypt.hash('member123', 10);
    const secHash = await bcrypt.hash('secretary123', 10);

    const uMember = await User.findOne({ where: { membership_application_id: app11212.id, role: 'member' }, skipTenant: true });
    if (uMember) {
      await uMember.update({ password_hash: memberHash, is_default_password: false }, { skipTenant: true });
      console.log('✅ Updated PSN 11212 member password to: member123');
    }

    const uSec = await User.findOne({ where: { membership_application_id: app11212.id, role: 'secretary' }, skipTenant: true });
    if (uSec) {
      await uSec.update({ password_hash: secHash, is_default_password: false }, { skipTenant: true });
      console.log('✅ Updated PSN 11212_secretary password to: secretary123');
    }
  }

  console.log('\n🎉 All role accounts created/updated successfully!');
  process.exit(0);
}

seedRoles().catch(err => {
  console.error('❌ Error seeding roles:', err);
  process.exit(1);
});
