require('dotenv').config();
const emailService = require('../services/emailService');

async function runTest() {
  console.log('🧪 Testing sendRoleAssignmentEmail Fix...');

  const member = {
    name: 'Test Member',
    email: process.env.TEST_EMAIL || 'test@example.com',
    psn: 'TEST_PSN'
  };

  const roleDetails = {
    role: 'secretary',
    password: 'temp_password_123',
    username: 'TEST_PSN_secretary'
  };

  try {
    console.log('📧 Attempting to send role assignment email...');
    const result = await emailService.sendRoleAssignmentEmail(member, roleDetails);
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('   Message ID:', result.messageId);
      console.log('   Provider:', result.provider || 'unknown');
    } else {
      console.error('❌ Email sending failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

runTest();