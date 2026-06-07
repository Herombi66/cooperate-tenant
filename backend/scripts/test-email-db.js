require('dotenv').config();
const { sequelize, User, MembershipApplication } = require('../models');
const emailService = require('../services/emailService');

async function runTest() {
  console.log('🔌 Connecting to Digital Ocean Database...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }

  const testEmail = process.env.TEST_EMAIL;
  if (!testEmail) {
    console.error('❌ TEST_EMAIL is not defined in .env');
    process.exit(1);
  }

  console.log(`\n🔍 Searching for user with email: ${testEmail}`);
  
  try {
    // Try to find the specific user first
    let user = await User.findOne({
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        where: { email: testEmail }
      }]
    });

    let recipientEmail = testEmail;
    let context = {};

    if (user) {
      console.log(`✅ Found exact user match: ${user.membershipApplication.name} (ID: ${user.id})`);
      context = {
        name: user.membershipApplication.name,
        psn: user.membershipApplication.psn,
        role: user.role,
        year: new Date().getFullYear(),
        actionUrl: process.env.MEMBER_PORTAL_URL || 'https://www.imanmcs.com'
      };
    } else {
      console.log('⚠️  User not found. Fetching latest user for simulation context...');
      // Fallback: Get latest user for data, but send to test email
      user = await User.findOne({
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication'
        }],
        order: [['created_at', 'DESC']]
      });

      if (!user) {
        console.error('❌ No users found in database at all.');
        process.exit(1);
      }

      console.log(`ℹ️  Using data from user: ${user.membershipApplication.name} (ID: ${user.id})`);
      console.log(`ℹ️  Sending email to SAFE ADDRESS: ${recipientEmail}`);
      
      context = {
        name: `[TEST] ${user.membershipApplication.name}`,
        psn: user.membershipApplication.psn,
        role: user.role,
        year: new Date().getFullYear(),
        actionUrl: process.env.MEMBER_PORTAL_URL || 'https://www.imanmcs.com'
      };
    }

    console.log('\n📧 Sending Test Email...');
    const result = await emailService.sendEmail({
      to: recipientEmail,
      subject: 'IMAN MCS - Database Integration Test',
      template: 'welcome', // Using 'welcome' as it's a standard template
      context: context
    });

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('   Provider:', result.provider || 'unknown');
      console.log('   Message ID:', result.messageId);
    } else {
      console.error('❌ Email sending failed:', result.error);
    }

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed.');
  }
}

runTest();