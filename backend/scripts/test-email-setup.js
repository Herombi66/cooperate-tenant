require('dotenv').config(); 
 
 console.log('🔧 Testing Email Configuration...\n'); 
 
 console.log('1. Environment Variables:'); 
 console.log(`   NODE_ENV: ${process.env.NODE_ENV}`); 
 console.log(`   EMAIL_ENABLED: ${process.env.EMAIL_ENABLED}`); 
 console.log(`   EMAIL_PROVIDER_PRIMARY: ${process.env.EMAIL_PROVIDER_PRIMARY}`); 
 console.log(`   BREVO_API_KEY: ${process.env.BREVO_API_KEY ? '✅ Set' : '❌ Missing'}`); 
 console.log(`   BREVO_SENDER_EMAIL: ${process.env.BREVO_SENDER_EMAIL}`); 
 console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`); 
 console.log(`   TEST_EMAIL: ${process.env.TEST_EMAIL}`); 
 
 console.log('\n2. Template IDs:'); 
 console.log(`   Welcome: ${process.env.BREVO_TEMPLATE_WELCOME}`); 
 console.log(`   Role Assignment: ${process.env.BREVO_TEMPLATE_ROLE_ASSIGNMENT}`); 
 console.log(`   Admin Password Reset: ${process.env.BREVO_TEMPLATE_ADMIN_PASSWORD_RESET}`); 
 console.log(`   Loan Disbursement: ${process.env.BREVO_TEMPLATE_LOAN_DISBURSEMENT}`); 
 console.log(`   Complaint Confirm: ${process.env.BREVO_TEMPLATE_COMPLAINT_CONFIRM}`); 
 
 console.log('\n⚠️  IMPORTANT:'); 
 console.log('   - Update Template IDs after creating templates in Brevo'); 
 console.log('   - Change TEST_EMAIL to your real email'); 
 console.log('   - Verify sender emails are confirmed in Brevo & Zoho'); 
 
 console.log('\n✅ Next Steps:'); 
 console.log('   1. Create templates in Brevo dashboard'); 
 console.log('   2. Update Template IDs in .env'); 
 console.log('   3. Run: node scripts/test-email-setup.js');