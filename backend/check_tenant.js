const { Tenant } = require('./models');

async function check() {
  const t = await Tenant.findOne({ where: { id: 'WUROJULI' }});
  if (t) console.log('Tenant:', t.toJSON());
  else console.log('Tenant WUROJULI not found.');
  
  const allT = await Tenant.findAll();
  console.log('All Tenants domains/subdomains:');
  allT.forEach(x => console.log(x.id, 'domain:', x.domain, 'subdomain:', x.subdomain));
  
  process.exit();
}

check();
