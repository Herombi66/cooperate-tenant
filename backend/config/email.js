// config/email.js
const path = require('path');
require('dotenv').config();

const user = process.env.SMTP_USER || process.env.EMAIL_USER || 'fmcksmcs@gmail.com';
const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASS || 'usqulqqvafseimuj';

module.exports = {
  // Gmail Nodemailer Configuration
  smtp: {
    service: 'gmail',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587,
    auth: {
      user: user,
      pass: pass
    },
    enabled: true
  },
  
  // Default Sender
  from: {
    name: process.env.SMTP_FROM_NAME || process.env.EMAIL_FROM_NAME || 'FMCK SMCS',
    address: process.env.SMTP_FROM || process.env.EMAIL_FROM || user
  },
  
  // Application URLs
  urls: {
    memberPortal: process.env.MEMBER_PORTAL_URL || 'https://www.fmcksmcs.com',
    adminPortal: process.env.ADMIN_PORTAL_URL || 'https://www.fmcksmcs.com'
  },
  
  // Support Information
  support: {
    email: process.env.SUPPORT_EMAIL || user,
    phone: process.env.SUPPORT_PHONE || '+234 810 588 0201'
  },
  
  templateDir: path.join(__dirname, '../templates'),
  enabled: true
};