const { User } = require('./models');

async function fixCasing() {
  const users = await User.findAll({ skipTenant: true });
  for (let u of users) {
    if (u.tenant_id && u.tenant_id === u.tenant_id.toUpperCase() && u.tenant_id !== 'default') {
      const lowerId = u.tenant_id.toLowerCase();
      console.log(`Updating user ${u.id} tenant_id from ${u.tenant_id} to ${lowerId}`);
      await u.update({ tenant_id: lowerId }, { skipTenant: true });
    }
  }
}

fixCasing();
