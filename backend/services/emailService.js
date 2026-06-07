// services/mailservice.js
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/email');
const { EmailLog } = require('../models');
const brevoService = require('./brevoEmailService');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isSmtpConnected = false;
    if (process.env.NODE_ENV !== 'test') {
      this.initialize();
    }
  }

  async initialize() {
    if (!config.enabled) {
      console.log('📧 [EmailService] Disabled via configuration.');
      return;
    }

    // Initialize SMTP (Secondary/Fallback)
    try {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.auth,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: config.smtp.connectionTimeout,
        greetingTimeout: config.smtp.greetingTimeout,
        socketTimeout: config.smtp.socketTimeout
      });

      // Verify connection
      await this.transporter.verify();
      this.isSmtpConnected = true;
      console.log(`✅ [EmailService] Connected to SMTP (Fallback): ${config.smtp.host}`);
    } catch (error) {
      console.error('❌ [EmailService] SMTP Connection failed:', error.message);
      this.isSmtpConnected = false;
    }

    // Test Brevo connection
    if (config.brevo.enabled) {
      const brevoTest = await brevoService.testConnection();
      if (brevoTest.success) {
        console.log(`✅ [EmailService] Brevo connected: ${brevoTest.account.email}`);
        console.log(`💰 Brevo credits: ${brevoTest.account.credits}`);
      } else {
        console.error('❌ [EmailService] Brevo connection test failed:', brevoTest.error);
      }
    }
  }

  /**
   * Send a single email with Failover Strategy
   * Strategy: Brevo API -> SMTP
   */
  async sendEmail({ to, subject, template, context, text, attachments = [], replyTo, headers, tags }) {
    const emailData = { to, subject, template, context, text, attachments, replyTo, headers, tags };
    let result = null;
    let providerUsed = null;
    let errorLog = [];

    // 1. Try Primary Provider: Brevo
    if (config.brevo.enabled) {
      try {
        console.log(`📧 [EmailService] Attempting Brevo for ${template}...`);
        result = await brevoService.sendEmail(emailData);
        providerUsed = 'brevo';
        console.log(`✅ [EmailService] Sent via Brevo to ${to}`);
      } catch (brevoError) {
        console.warn('⚠️ [EmailService] Brevo failed:', brevoError.message);
        errorLog.push({ provider: 'brevo', error: brevoError.message });
      }
    }

    // 2. Try Fallback: SMTP
    if (!result && this.isSmtpConnected) {
      try {
        console.log(`📧 [EmailService] Attempting SMTP fallback for ${template}...`);
        
        // Load template if needed
        let html = null;
        if (template) {
          try {
            html = await this.loadTemplate(template, context);
          } catch (err) {
            console.warn(`⚠️ [EmailService] Template load failed: ${err.message}`);
          }
        }

        const mailOptions = {
          from: config.from,
          to,
          subject,
          text: text || 'Please view this email in a HTML compatible client.',
          html: html,
          attachments,
          replyTo: replyTo,
          headers: headers
        };

        const info = await this.transporter.sendMail(mailOptions);
        result = { success: true, messageId: info.messageId, provider: 'smtp' };
        providerUsed = 'smtp';
        console.log(`✅ [EmailService] Sent via SMTP to ${to}`);
      } catch (smtpError) {
        console.error('❌ [EmailService] SMTP failed:', smtpError.message);
        errorLog.push({ provider: 'smtp', error: smtpError.message });
      }
    }

    // 3. Log Result
    if (result && result.success) {
      await this.logEmail(to, subject, template, 'sent', result.messageId, context, providerUsed);
      return result;
    } else {
      // All providers failed
      const failureMessage = errorLog.map(e => `${e.provider}: ${e.error}`).join(' | ');
      console.error('❌ [EmailService] ALL PROVIDERS FAILED:', failureMessage);

      await this.logEmail(to, subject, template, 'failed', null, context, failureMessage);
      return { success: false, error: failureMessage };
    }
  }

  async logEmail(to, subject, template, status, messageId, context, error = null, provider = null) {
    try {
      await EmailLog.create({
        to_email: Array.isArray(to) ? to.join(',') : to,
        subject,
        template: template || null,
        status,
        message_id: messageId,
        error_message: error,
        provider: provider,
        metadata: {
          context: context || null,
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.error('❌ [EmailService] Failed to log email:', logError.message);
    }
  }

  async loadTemplate(templateName, context) {
    try {
      const templatePath = path.join(config.templateDir, `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateContent);
      return compiledTemplate(context);
    } catch (error) {
      console.warn(`⚠️ [EmailService] Template '${templateName}' not found:`, error.message);
      return null;
    }
  }

  // ==================== SPECIFIC EMAIL METHODS ====================

  // 1. WELCOME EMAIL
  async sendWelcomeEmail(member, password) {
    const { name, email, psn } = member;
    
    const context = {
      member_name: name,
      psn: psn,
      email: email,
      default_password: password,
      login_link: `${config.urls.memberPortal}/login`,
      support_email: config.support.email,
      support_phone: config.support.phone,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: email,
      subject: 'Welcome to IMAN MCS - Membership Approved!',
      template: 'welcome',
      context: context,
      replyTo: config.support.email,
      tags: ['welcome', 'registration']
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send welcome email');
    }

    return result;
  }

  // 2. ROLE ASSIGNMENT
  async sendRoleAssignmentEmail(member, roleDetails) {
    const { name, email, psn } = member;
    const { role, username, password } = roleDetails;

    const context = {
      full_name: name.toUpperCase(),
      role: role.toUpperCase(),
      username: username || `${psn}_${role.toLowerCase()}`,
      password: password,
      creation_date: new Date().toLocaleDateString('en-NG', {
        year: 'numeric', month: 'long', day: 'numeric'
      }),
      login_link: `${config.urls.memberPortal}/login`,
      support_email: config.support.email,
      support_phone: config.support.phone,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: email,
      subject: `IMAN MCS - Official Account Creation: ${role.toUpperCase()} Role Assigned`,
      template: 'role_assignment',
      context: context,
      replyTo: 'security@imanmcs.com',
      tags: ['role_assignment', role.toLowerCase()]
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send role assignment email');
    }

    return result;
  }

  // 3. ADMIN PASSWORD RESET
  async sendAdminPasswordResetEmail(member, newPassword, adminName = "System Administrator") {
    const { name, email } = member;

    const context = {
      full_name: name.toUpperCase(),
      admin_name: adminName,
      reset_time: new Date().toLocaleString('en-NG'),
      new_password: newPassword,
      login_link: `${config.urls.memberPortal}/login`,
      support_email: config.support.email,
      support_phone: config.support.phone,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: email,
      subject: `🔐 IMAN MCS - Administrator Password Reset for ${name.split(' ')[0]}`,
      template: 'admin_password_reset',
      context: context,
      replyTo: 'security@imanmcs.com',
      tags: ['admin_password_reset', 'security']
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send admin password reset email');
    }

    return result;
  }

  // 4. LOAN DISBURSEMENT
  async sendLoanDisbursementEmail(member, loanDetails) {
    const { name, email } = member;
    const { loanId, loanAmount, disbursedAmount } = loanDetails;

    const context = {
      member_name: name,
      loan_id: loanId,
      loan_amount: this.formatCurrency(loanAmount),
      disbursed_amount: this.formatCurrency(disbursedAmount),
      disbursement_date: new Date().toLocaleDateString('en-NG'),
      disbursement_method: 'Bank Transfer',
      transaction_ref: loanDetails.transactionRef || `TRX${Date.now()}`,
      support_email: config.support.email,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: email,
      subject: `🎉 IMAN MCS - Loan #${loanId} Disbursed Successfully`,
      template: 'loan_disbursement',
      context: context,
      replyTo: 'loans@imanmcs.com',
      tags: ['loan_disbursement', `loan_${loanId}`]
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send loan disbursement email');
    }

    return result;
  }

  // 5. GUARANTOR NOTIFICATION (Loan application uses their PSN)
  async sendGuarantorNotificationEmail(grantor, loanDetails) {
    const { name, email } = grantor;
    const { loanId, loanAmount } = loanDetails;

    if (!email) {
      console.warn('📧 [EmailService] Skipping guarantor notification email - no email on file');
      return { success: false, error: 'No email for grantor' };
    }

    const context = {
      grantor_name: name,
      loan_id: loanId,
      loan_amount: this.formatCurrency(loanAmount),
      request_date: new Date().toLocaleString('en-NG'),
      support_email: config.support.email,
      current_year: new Date().getFullYear().toString()
    };

    const text = `
Dear ${name},

You have been listed as a grantor for a new loan application (Loan #${loanId}) on the IMAN MCS platform.

Loan amount: ${this.formatCurrency(loanAmount)}

Please log in to your IMAN MCS account to review and respond to this guarantee request.

If you were not expecting this request, please contact IMAN MCS support immediately.

IMAN MCS Support
${config.support.email}
    `;

    const result = await this.sendEmail({
      to: email,
      subject: `IMAN MCS - Loan Guarantee Request (Loan #${loanId})`,
      template: 'guarantor_request',
      context: context,
      text: text,
      replyTo: 'loans@imanmcs.com',
      tags: ['guarantor_request', `loan_${loanId}`]
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send guarantor notification email');
    }

    return result;
  }

  // 6. COMPLAINT CONFIRMATION
  async sendComplaintConfirmationEmail(member, complaintDetails) {
    const { name, email } = member;
    const { ticketId, category, priority, description } = complaintDetails;

    const priorityColors = {
      'High': '#dc3545',
      'Medium': '#ffc107',
      'Low': '#28a745'
    };

    const context = {
      member_name: name,
      ticket_id: ticketId,
      submission_date: new Date().toLocaleString('en-NG'),
      category: category,
      priority: priority,
      priority_color: priorityColors[priority] || '#6c757d',
      complaint_text: description,
      response_time: '24 hours',
      resolution_time: '5-7 working days',
      track_link: `${config.urls.memberPortal}/support/tickets/${ticketId}`,
      support_email: config.support.email,
      support_phone: config.support.phone,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: email,
      subject: `✅ IMAN MCS - Complaint #${ticketId} Received`,
      template: 'complaint_confirmation',
      context: context,
      replyTo: 'support@imanmcs.com',
      tags: ['complaint', `priority_${priority.toLowerCase()}`]
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send complaint confirmation email');
    }

    return result;
  }

  // 7. ADMIN COMPLAINT ALERT
  async sendNewComplaintAlertToAdmin(admin, complaint, member) {
    const { name: adminName, email: adminEmail } = admin.membershipApplication || admin;
    const { name: memberName } = member.membershipApplication || member;
    const { tracking_id, title, category, priority, description } = complaint;

    const context = {
      admin_name: adminName,
      member_name: memberName,
      ticket_id: tracking_id,
      title: title,
      category: category,
      priority: priority,
      description: description,
      submission_date: new Date().toLocaleString('en-NG'),
      admin_link: `${config.urls.memberPortal}/admin/complaints/${complaint.id}`,
      support_email: config.support.email,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: adminEmail,
      subject: `🚨 NEW COMPLAINT: [${priority.toUpperCase()}] ${title} (${tracking_id})`,
      template: 'admin_complaint_alert',
      context: context,
      replyTo: 'no-reply@imanmcs.com',
      tags: ['admin_alert', 'complaint', priority.toLowerCase()]
    });

    return result;
  }

  // 8. PASSWORD RESET (User initiated)
  async sendPasswordResetEmail(member, resetToken) {
    const { name, email } = member;
    const firstName = name.split(' ')[0] || name;

    const resetLink = `${config.urls.memberPortal}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Check if template exists
    const templateId = config.brevo.templateIds.password_reset;
    if (!templateId || templateId === 0) {
      // Fallback to simple email
      const text = `
Dear ${name},

You requested a password reset. Click the link below to reset your password:

${resetLink}

This link expires in 1 hour.

If you didn't request this, please ignore this email.

IMAN MCS Support
${config.support.email}
      `;

      return await this.sendEmail({
        to: email,
        subject: `IMAN MCS - Password Reset Request`,
        text: text,
        replyTo: 'security@imanmcs.com'
      });
    }

    const context = {
      first_name: firstName.toUpperCase(),
      email: email,
      reset_link: resetLink,
      expiry_time: '1 hour',
      support_email: config.support.email,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: email,
      subject: `IMAN MCS - Password Reset Request`,
      template: 'password_reset',
      context: context,
      replyTo: 'security@imanmcs.com'
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send password reset email');
    }

    return result;
  }

  // Helper method to format currency
  formatCurrency(amount) {
    if (!amount) return '₦0.00';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  }

  // Test all email methods
  async testAllTemplates(testEmail) {
    console.log('🧪 Testing all email templates...\n');
    
    const testMember = {
      name: 'Test User',
      email: testEmail,
      psn: '99999'
    };

    const tests = [
      {
        name: 'Welcome Email',
        fn: () => this.sendWelcomeEmail(testMember, 'TestPass123!')
      },
      {
        name: 'Role Assignment',
        fn: () => this.sendRoleAssignmentEmail(testMember, {
          role: 'chairman',
          username: 'test_chairman',
          password: 'Chair123!'
        })
      },
      {
        name: 'Admin Password Reset',
        fn: () => this.sendAdminPasswordResetEmail(testMember, 'AdminPass123!', 'Test Admin')
      },
      {
        name: 'Loan Disbursement',
        fn: () => this.sendLoanDisbursementEmail(testMember, {
          loanId: 'LOAN001',
          loanAmount: 500000,
          disbursedAmount: 480000
        })
      },
      {
        name: 'Complaint Confirmation',
        fn: () => this.sendComplaintConfirmationEmail(testMember, {
          ticketId: 'TICKET001',
          category: 'General',
          priority: 'Medium',
          description: 'Test complaint description for testing purposes.'
        })
      }
    ];

    const results = {};
    
    for (const test of tests) {
      try {
        console.log(`🧪 Testing: ${test.name}...`);
        const result = await test.fn();
        results[test.name] = { success: true, messageId: result.messageId };
        console.log(`✅ ${test.name}: Sent successfully\n`);
        
        // Delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        results[test.name] = { success: false, error: error.message };
        console.error(`❌ ${test.name}: ${error.message}\n`);
      }
    }
    
    console.log('📊 Test Results:');
    console.table(results);
    return results;
  }
}

// Singleton instance
module.exports = new EmailService();
