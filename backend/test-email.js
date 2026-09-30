const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const emailService = require('./services/emailService');
const config = require('./config/email');

const recipientEmail = process.argv[2] || 'zigs360@gmail.com';

console.log('---------------------------------------------------');
console.log('🧪 FMCK SMCS Email Diagnostic Test Script');
console.log('---------------------------------------------------');
console.log(`Target Recipient : ${recipientEmail}`);
console.log(`Sender Name      : ${config.from?.name || 'FMCK SMCS'}`);
console.log(`Sender Address   : ${config.from?.address || config.from?.email}`);
console.log(`SMTP Host        : ${config.smtp?.host}`);
console.log(`SMTP Port        : ${config.smtp?.port} (secure: ${config.smtp?.secure})`);
console.log(`SMTP User        : ${config.smtp?.auth?.user}`);
console.log(`SMTP Pass set?   : ${!!config.smtp?.auth?.pass}`);
console.log(`Email Enabled    : ${config.enabled}`);
console.log('---------------------------------------------------');

async function runTest() {
    try {
        console.log(`Attempting to send live test email to ${recipientEmail}...`);
        const result = await emailService.sendEmail({
            to: recipientEmail,
            subject: 'FMCK SMCS - Live Email System Diagnostic',
            template: 'welcome',
            context: {
                recipient_name: 'Test Member',
                member_name: 'Test Member',
                member_id: 'FMCK/TEST/001',
                psn: 'FMCK/TEST/001',
                member_email: recipientEmail,
                email: recipientEmail,
                temporary_password: 'TestPassword2026!',
                login_url: 'https://www.fmcksmcs.com',
                cooperative_name: 'FMCK SMCS',
                support_email: 'fmcksmcs@gmail.com',
                support_phone: '+234 810 588 0201',
                current_year: new Date().getFullYear().toString()
            }
        });

        if (result && result.success) {
            console.log('---------------------------------------------------');
            console.log('✅ SUCCESS: Live email sent successfully!');
            console.log('Provider   :', result.provider);
            console.log('Message ID :', result.messageId);
            console.log('---------------------------------------------------');
            console.log(`Check inbox and spam folder for ${recipientEmail}.`);
            process.exit(0);
        } else {
            console.log('---------------------------------------------------');
            console.log('❌ FAILURE: Email could not be sent.');
            console.log('Result:', result);
            console.log('---------------------------------------------------');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Unexpected Error:', error.message);
        process.exit(1);
    }
}

runTest();
