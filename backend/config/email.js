// config/email.js
const path = require('path');
require('dotenv').config();

module.exports = {
  // Primary Provider: Brevo
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    enabled: process.env.EMAIL_PROVIDER_PRIMARY === 'brevo' || !!process.env.BREVO_API_KEY,
    
    // Sender Information
    senderName: process.env.BREVO_SENDER_NAME || 'IMAN MCS',
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@imanmcs.com',
    
    // Template IDs - THESE ARE CRITICAL! Update after creating templates in Brevo
    templateIds: {
      welcome: parseInt(process.env.BREVO_TEMPLATE_WELCOME) || 1,
      role_assignment: parseInt(process.env.BREVO_TEMPLATE_ROLE_ASSIGNMENT) || 2,
      admin_password_reset: parseInt(process.env.BREVO_TEMPLATE_ADMIN_PASSWORD_RESET) || 3,
      loan_disbursement: parseInt(process.env.BREVO_TEMPLATE_LOAN_DISBURSEMENT) || 4,
      complaint_confirmation: parseInt(process.env.BREVO_TEMPLATE_COMPLAINT_CONFIRM) || 5,
      
      // Additional templates (set to 0 if not created yet)
      password_reset: parseInt(process.env.BREVO_TEMPLATE_PASSWORD_RESET) || 0,
      loan_approval: parseInt(process.env.BREVO_TEMPLATE_LOAN_APPROVAL) || 0,
      loan_status_update: parseInt(process.env.BREVO_TEMPLATE_LOAN_STATUS) || 0,
      complaint_admin_alert: parseInt(process.env.BREVO_TEMPLATE_COMPLAINT_ADMIN) || 0,
      withdrawal_status: parseInt(process.env.BREVO_TEMPLATE_WITHDRAWAL_STATUS) || 0,
      support_ticket: parseInt(process.env.BREVO_TEMPLATE_SUPPORT) || 0
    }
  },

  // Secondary/Fallback: SMTP (Zoho, AWS, etc.)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // DigitalOcean/Cloud specific timeouts
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  },
  
  // Default Sender (for SMTP fallback)
  from: {
    name: process.env.EMAIL_FROM_NAME || 'IMAN MCS',
    email: process.env.EMAIL_FROM_EMAIL || 'noreply@imanmcs.com'
  },
  
  // Application URLs
  urls: {
    memberPortal: process.env.MEMBER_PORTAL_URL || 'https://app.imanmcs.com',
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
  
  // Feature Flags
  enabled: process.env.EMAIL_ENABLED !== 'false',
  
  // Rate Limiting (Emails per second)
  rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT) || 5,
  
  // Logging
  debug: process.env.EMAIL_DEBUG === 'true'
};