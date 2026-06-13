const { User, MembershipApplication, Tenant } = require('./models');

async function fix() {
  try {
    const users = await User.findAll({
      where: { tenant_id: 'default', role: 'admin' },
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication'
      }],
      skipTenant: true // We need to read users without tenant scoping
    });
    
    for (const u of users) {
      if (u.membershipApplication && u.membershipApplication.psn.endsWith('-ADM-001')) {
        const tenantId = u.membershipApplication.psn.split('-ADM-001')[0];
        console.log(`Fixing user ${u.id} (PSN: ${u.membershipApplication.psn}). Updating tenant_id from 'default' to '${tenantId}'`);
        await u.update({ tenant_id: tenantId }, { skipTenant: true });
      }
    }
    console.log('Fix complete.');
  } catch (e) {
    console.error(e);
  }
  process.exit();
}

fix();
