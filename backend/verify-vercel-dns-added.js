const dns = require('dns').promises;

console.log('🔍 Checking AWS SES DNS Records in Vercel...\n');

const records = [
  // AWS SES DKIM Records
  {
    name: '5emgd32wqlkwj7vhgec3p56tyqcjtx3k._domainkey.www.imanmcs.com',
    type: 'CNAME',
    expected: '5emgd32wqlkwj7vhgec3p56tyqcjtx3k.dkim.amazonses.com'
  },
  {
    name: 'o2r4d4qfgmkjrhs5j7n4av6a2umachlb._domainkey.www.imanmcs.com',
    type: 'CNAME',
    expected: 'o2r4d4qfgmkjrhs5j7n4av6a2umachlb.dkim.amazonses.com'
  },
  {
    name: 'zqwr3y3t2fdnrojg52ntu4ng4kty7fgt._domainkey.www.imanmcs.com',
    type: 'CNAME',
    expected: 'zqwr3y3t2fdnrojg52ntu4ng4kty7fgt.dkim.amazonses.com'
  },
  // AWS SES MX Record
  {
    name: 'imanmcs.www.imanmcs.com',
    type: 'MX',
    expected: 'feedback-smtp.us-east-1.amazonses.com'
  },
  // AWS SES TXT Records
  {
    name: 'imanmcs.www.imanmcs.com',
    type: 'TXT',
    expected: 'v=spf1 include:amazonses.com ~all'
  },
  {
    name: '_dmarc.www.imanmcs.com',
    type: 'TXT',
    expected: 'v=DMARC1; p=none;'
  },
  // Existing Brevo Records (should still exist)
  {
    name: 'brevo1._domainkey.imanmcs.com',
    type: 'CNAME',
    expected: 'b1.imanmcs-com.dkim.brevo.com'
  },
  {
    name: 'brevo2._domainkey.imanmcs.com',
    type: 'CNAME',
    expected: 'b2.imanmcs-com.dkim.brevo.com'
  },
  {
    name: '_dmarc.imanmcs.com',
    type: 'TXT',
    expected: 'v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com'
  }
];

async function checkRecord(record) {
  try {
    let result;
    if (record.type === 'CNAME') {
      result = await dns.resolveCname(record.name);
    } else if (record.type === 'MX') {
      const mx = await dns.resolveMx(record.name);
      result = mx.map(m => m.exchange);
    } else if (record.type === 'TXT') {
      const txt = await dns.resolveTxt(record.name);
      result = txt.flat();
    }
    
    if (result && result.some(r => r.includes(record.expected))) {
      return { found: true, provider: record.name.includes('brevo') ? 'Brevo' : 'AWS SES' };
    }
  } catch (error) {
    // Record doesn't exist
  }
  return { found: false, provider: record.name.includes('brevo') ? 'Brevo' : 'AWS SES' };
}

async function verifyAll() {
  console.log('Checking DNS records...\n');
  
  const results = await Promise.all(records.map(checkRecord));
  
  let awsCount = 0;
  let brevoCount = 0;
  
  records.forEach((record, i) => {
    const prefix = record.name.split('.')[0];
    if (results[i].found) {
      console.log(`✅ ${results[i].provider}: ${prefix}`);
      if (results[i].provider === 'AWS SES') awsCount++;
      else brevoCount++;
    } else {
      console.log(`❌ ${results[i].provider}: ${prefix} (Not found)`);
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`AWS SES Records: ${awsCount}/6 configured`);
  console.log(`Brevo Records: ${brevoCount}/3 configured`);
  
  if (awsCount >= 4) {
    console.log('\n✅ AWS SES DNS mostly configured!');
    console.log('AWS should auto-verify your domain soon.');
  } else if (awsCount === 0) {
    console.log('\n❌ No AWS SES records found.');
    console.log('Add them in Vercel Dashboard → Domains → imanmcs.com → DNS Records');
  }
}

verifyAll().catch(console.error);
