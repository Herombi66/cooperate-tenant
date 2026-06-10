require('dotenv').config();
const { sequelize } = require('./db/connection');

async function fix() {
  try {
    await sequelize.query('ALTER TABLE tenants ADD COLUMN features JSON;');
    console.log('✅ Added features column');
  } catch (e) {
    console.log('ℹ️ Column may already exist:', e.message);
  }

  try {
    const defaultFeatures = JSON.stringify({
      landing_page: true,
      loans: true,
      layyah: true,
      expenses: true,
      profit_sharing: true,
      withdrawals: true
    });
    await sequelize.query(`UPDATE tenants SET features = '${defaultFeatures}'`);
    console.log('✅ Updated existing tenants with default features');
  } catch (e) {
    console.error('❌ Failed to update features:', e.message);
  }
}

fix();
