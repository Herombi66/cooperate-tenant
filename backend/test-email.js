require('dotenv').config();
const emailService = require('./services/emailService');

const recipientEmail = process.argv[2];

if (!recipientEmail) {
    console.error('Please provide a recipient email address.');
    console.log('Usage: node test-email.js <recipient-email>');
    process.exit(1);
}

console.log('---------------------------------------------------');
console.log('🧪 Zoho SMTP Email Test Script');
console.log('---------------------------------------------------');
console.log(`Target Recipient: ${recipientEmail}`);
console.log(`Sender: ${process.env.EMAIL_FROM || 'Not Set'}`);
console.log(`SMTP Host: ${process.env.SMTP_HOST || 'smtp.zoho.com'}`);
console.log('---------------------------------------------------');

async function runTest() {
    try {
        console.log('Attempting to send test email via Zoho SMTP...');
        const result = await emailService.sendEmail({
            to: recipientEmail,
            subject: 'IMAN MCS - Zoho SMTP Test Email',
            template: 'welcome',
            context: {
                name: 'Zoho Test User',
                psn: 'ZOHO_TEST',
                status: 'Test',
                actionUrl: 'https://imancooperative.vercel.app/login',
                year: new Date().getFullYear()
            }
        });

        if (result && result.success) {
            console.log('---------------------------------------------------');
            console.log('✅ SUCCESS: Email sent successfully via Zoho SMTP!');
            console.log('Message ID:', result.messageId);
            console.log('---------------------------------------------------');
            console.log('Check the recipient inbox (and spam folder).');
        } else {
            console.log('---------------------------------------------------');
            console.log('❌ FAILURE: Email could not be sent.');
            console.log('Result:', result);
            console.log('---------------------------------------------------');
        }

    } catch (error) {
        console.error('❌ Unexpected Error:', error);
    }
}

runTest();
