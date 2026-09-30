// config/email.js
const path = require('path');
require('dotenv').config();

module.exports = {
  // Primary Provider: Brevo
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    enabled: !!(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim() !== ''),
    
    // Sender Information
    senderName: process.env.BREVO_SENDER_NAME || process.env.SMTP_FROM_NAME || 'FMCK SMCS',
    senderEmail: process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || 'fmcksmcs@gmail.com',
    
    // Template IDs (0 uses inline dynamic HTML templates automatically)
    templateIds: {
      welcome: parseInt(process.env.BREVO_TEMPLATE_WELCOME) || 0,
      role_assignment: parseInt(process.env.BREVO_TEMPLATE_ROLE_ASSIGNMENT) || 0,
      admin_password_reset: parseInt(process.env.BREVO_TEMPLATE_ADMIN_PASSWORD_RESET) || 0,
      loan_disbursement: parseInt(process.env.BREVO_TEMPLATE_LOAN_DISBURSEMENT) || 0,
      complaint_confirmation: parseInt(process.env.BREVO_TEMPLATE_COMPLAINT_CONFIRM) || 0,
      password_reset: parseInt(process.env.BREVO_TEMPLATE_PASSWORD_RESET) || 0,
      loan_approval: parseInt(process.env.BREVO_TEMPLATE_LOAN_APPROVAL) || 0,
      loan_status_update: parseInt(process.env.BREVO_TEMPLATE_LOAN_STATUS) || 0,
      complaint_admin_alert: parseInt(process.env.BREVO_TEMPLATE_COMPLAINT_ADMIN) || 0,
      withdrawal_status: parseInt(process.env.BREVO_TEMPLATE_WITHDRAWAL_STATUS) || 0,
      support_ticket: parseInt(process.env.BREVO_TEMPLATE_SUPPORT) || 0
    }
  },

  // Secondary/Fallback: SMTP (Gmail, Zoho, AWS, etc.)
  smtp: {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587,
    secure: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true' || (parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) === 465),
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER || null,
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASS || null,
    },
    // Only enabled if host and credentials are explicitly provided
    enabled: !!(
      (process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com') &&
      (process.env.SMTP_USER || process.env.EMAIL_USER)
    ),
    connectionTimeout: parseInt(process.env.SMTP_TIMEOUT) || 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  },
  
  // Default Sender (for SMTP fallback)
  from: {
    name: process.env.SMTP_FROM_NAME || process.env.EMAIL_FROM_NAME || process.env.BREVO_SENDER_NAME || 'FMCK SMCS',
    address: process.env.SMTP_FROM || process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_FROM || process.env.BREVO_SENDER_EMAIL || 'fmcksmcs@gmail.com',
    email: process.env.SMTP_FROM || process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_FROM || process.env.BREVO_SENDER_EMAIL || 'fmcksmcs@gmail.com'
  },
  
  // Application URLs
  urls: {
    memberPortal: process.env.MEMBER_PORTAL_URL || 'https://www.fmcksmcs.com',
    adminPortal: process.env.ADMIN_PORTAL_URL || 'https://admin.imanmcs.com'
  },
  
  // Support Information
  support: {
    email: process.env.SUPPORT_EMAIL || 'admin@imanmcs.com',
    phone: process.env.SUPPORT_PHONE || '+234 700 IMAN MCS',
    emergency: process.env.EMERGENCY_CONTACT || '+234 08105880201'
  },
  
  // Template Directory (for fallback templates)
  templateDir: path.join(__dirname, '../templates'),
  
  // Feature Flags - active only when EMAIL_ENABLED is explicitly true or 1
  enabled: process.env.EMAIL_ENABLED === 'true' || process.env.EMAIL_ENABLED === '1',
  
  // Rate Limiting (Emails per second)
  rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT) || 5,
  
  // Logging
  debug: process.env.EMAIL_DEBUG === 'true'
};