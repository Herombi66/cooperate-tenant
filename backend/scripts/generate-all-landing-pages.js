const { Tenant } = require('../models');
const { writeLandingPageFile } = require('../src/services/landingPageGenerator.service');

async function generateAll() {
  console.log('🚀 Starting landing page generation for all existing tenants...');
  const tenants = await Tenant.findAll({ where: { status: 'active' } });
  
  console.log(`Found ${tenants.length} active tenants.`);
  for (const tenant of tenants) {
    if (tenant.id === 'default') continue; // default uses DefaultLandingPage.tsx
    try {
      const filePath = writeLandingPageFile(tenant);
      console.log(`✨ Generated: ${tenant.id} -> ${filePath}`);
    } catch (err) {
      console.error(`❌ Failed to generate for ${tenant.id}:`, err.message);
    }
  }
  console.log('✅ Completed generating landing page files for all tenants.');
  process.exit(0);
}

generateAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
