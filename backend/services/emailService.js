// services/mailservice.js
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/email');
const { EmailLog } = require('../models');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isSmtpConnected = false;
    this.createTransporter();
    if (process.env.NODE_ENV !== 'test') {
      this.initialize();
    }
  }

  createTransporter() {
    if (this.transporter) return this.transporter;

    console.log(`📧 [EmailService] Initializing Gmail Nodemailer (${config.smtp.auth.user})...`);
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.smtp.auth.user,
        pass: config.smtp.auth.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    return this.transporter;
  }

  async initialize() {
    try {
      this.createTransporter();
      await this.transporter.verify();
      this.isSmtpConnected = true;
      console.log(`✅ [EmailService] Gmail Nodemailer connected and verified (${config.smtp.auth.user})`);
    } catch (error) {
      console.warn(`⚠️ [EmailService] Gmail initial verification notice: ${error.message} (will connect on send)`);
    }
  }

  /**
   * Send a single email directly via Gmail Nodemailer
   */
  async sendEmail({ to, subject, template, context, text, attachments = [], replyTo, headers, tags }) {
    if (!this.transporter) {
      this.createTransporter();
    }

    // Pre-load HTML template or fallback
    let html = null;
    if (template) {
      try {
        html = await this.loadTemplate(template, context);
      } catch (err) {
        console.warn(`⚠️ [EmailService] Template load failed: ${err.message}`);
      }
    }

    const senderName = config.from?.name || 'FMCK SMCS';
    const senderAddress = config.from?.address || config.smtp?.auth?.user || 'fmcksmcs@gmail.com';
    const formattedFrom = `"${senderName}" <${senderAddress}>`;

    const mailOptions = {
      from: formattedFrom,
      to,
      subject,
      text: text || 'Please view this email in a HTML compatible client.',
      html: html,
      attachments,
      replyTo: replyTo || senderAddress,
      headers: headers
    };

    try {
      console.log(`📧 [EmailService] Sending via Gmail to ${to}: "${subject}"...`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ [EmailService] Sent successfully via Gmail to ${to} (MessageId: ${info.messageId})`);
      this.isSmtpConnected = true;

      await this.logEmail(to, subject, template, 'sent', info.messageId, context, null, 'gmail');
      return { success: true, messageId: info.messageId, provider: 'gmail' };
    } catch (error) {
      console.error(`❌ [EmailService] Gmail send failed to ${to}:`, error.message);
      await this.logEmail(to, subject, template, 'failed', null, context, error.message, 'gmail');
      return { success: false, error: error.message };
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
      console.warn(`⚠️ [EmailService] Template '${templateName}' not found or error:`, error.message);
      return this.generateFallbackHtml(templateName, context);
    }
  }

  /**
   * Helper to resolve tenant details (name, id, support email, phone)
   */
  resolveTenantInfo(tenantId = 'fmcksmcs') {
    const tid = (tenantId || 'fmcksmcs').toString().toLowerCase().trim();
    const isFmck = tid === 'fmcksmcs' || tid === 'fmck' || tid === 'default';

    return {
      tenantId: isFmck ? 'fmcksmcs' : tid,
      name: isFmck ? (config.from?.name || 'FMCK SMCS') : (config.from?.name || 'Cooperative Society'),
      supportEmail: config.support?.email || config.smtp?.auth?.user || 'fmcksmcs@gmail.com',
      supportPhone: config.support?.phone || '+234 810 588 0201'
    };
  }

  /**
   * Helper to construct tenant-aware portal URLs
   */
  getPortalUrl(pathname = '/login', tenantId = 'fmcksmcs') {
    const base = (config.urls?.memberPortal || process.env.FRONTEND_URL || process.env.APP_URL || 'https://www.fmcksmcs.com').replace(/\/+$/, '');
    const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const tid = (tenantId || 'fmcksmcs').toString().toLowerCase().trim();
    const targetTenant = (tid === 'default' || !tid) ? 'fmcksmcs' : tid;
    const separator = cleanPath.includes('?') ? '&' : '?';
    return `${base}${cleanPath}${separator}tenant=${encodeURIComponent(targetTenant)}`;
  }

  generateFallbackHtml(templateName, context = {}) {
    const orgName = context.cooperative_name || config.from?.name || 'FMCK SMCS';
    const fields = Object.entries(context)
      .filter(([k, v]) => v && typeof v !== 'object' && !['current_year', 'support_email', 'support_phone'].includes(k))
      .map(([k, v]) => `<tr><td style="padding:10px;font-weight:bold;color:#475569;border-bottom:1px solid #f1f5f9;text-transform:capitalize;">${k.replace(/_/g, ' ')}:</td><td style="padding:10px;color:#0f172a;border-bottom:1px solid #f1f5f9;word-break:break-all;">${v}</td></tr>`)
      .join('');

    const targetUrl = context.login_url || context.login_link || this.getPortalUrl('/login', context.tenant_id || 'fmcksmcs');

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="border-bottom: 2px solid #0F3D3D; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #0F3D3D; margin: 0 0 4px 0;">${orgName}</h2>
          <p style="color: #64748b; margin: 0; font-size: 14px;">Notification: ${templateName.replace(/_/g, ' ').toUpperCase()}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          ${fields}
        </table>
        ${targetUrl ? `
          <div style="margin: 24px 0; text-align: center;">
            <a href="${targetUrl}" style="background-color: #0F3D3D; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Access Member Portal</a>
          </div>
        ` : ''}
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center;">
          <p style="margin: 0 0 4px 0;">© ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
          <p style="margin: 0;">Support: ${config.support?.email || 'fmcksmcs@gmail.com'}</p>
        </div>
      </div>
    `;
  }

  // ==================== SPECIFIC EMAIL METHODS ====================

  // 1. WELCOME EMAIL
  async sendWelcomeEmail(member, password, tenantId = null) {
    const { name, email, psn } = member;
    const tid = tenantId || member.tenant_id || member.tenantId || 'fmcksmcs';
    const tenantInfo = this.resolveTenantInfo(tid);
    const portalLoginUrl = this.getPortalUrl('/login', tenantInfo.tenantId);
    
    const context = {
      recipient_name: name,
      member_name: name,
      full_name: name,
      member_id: psn,
      psn: psn,
      member_email: email,
      email: email,
      temporary_password: password,
      default_password: password,
      password: password,
      login_url: portalLoginUrl,
      login_link: portalLoginUrl,
      cooperative_name: tenantInfo.name,
      tenant_id: tenantInfo.tenantId,
      support_email: tenantInfo.supportEmail,
      support_phone: tenantInfo.supportPhone,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: email,
      subject: `Welcome to ${tenantInfo.name} - Membership Approved!`,
      template: 'welcome',
      context: context,
      replyTo: tenantInfo.supportEmail,
      tags: ['welcome', 'registration']
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send welcome email');
    }

    return result;
  }

  // 2. ROLE ASSIGNMENT
  async sendRoleAssignmentEmail(member, roleDetails, tenantId = null) {
    const { name, email, psn } = member;
    const { role, username, password } = roleDetails;
    const tid = tenantId || member.tenant_id || member.tenantId || 'fmcksmcs';
    const tenantInfo = this.resolveTenantInfo(tid);
    const portalLoginUrl = this.getPortalUrl('/login', tenantInfo.tenantId);

    const context = {
      full_name: name.toUpperCase(),
      role: role.toUpperCase(),
      username: username || `${psn}_${role.toLowerCase()}`,
      password: password,
      creation_date: new Date().toLocaleDateString('en-NG', {
        year: 'numeric', month: 'long', day: 'numeric'
      }),
      login_link: portalLoginUrl,
      login_url: portalLoginUrl,
      cooperative_name: tenantInfo.name,
      tenant_id: tenantInfo.tenantId,
      support_email: tenantInfo.supportEmail,
      support_phone: tenantInfo.supportPhone,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: email,
      subject: `${tenantInfo.name} - Official Account Creation: ${role.toUpperCase()} Role Assigned`,
      template: 'role_assignment',
      context: context,
      replyTo: tenantInfo.supportEmail,
      tags: ['role_assignment', role.toLowerCase()]
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send role assignment email');
    }

    return result;
  }

  // 3. ADMIN PASSWORD RESET
  async sendAdminPasswordResetEmail(member, newPassword, adminName = "System Administrator", tenantId = null) {
    const { name, email } = member;
    const tid = tenantId || member.tenant_id || member.tenantId || 'fmcksmcs';
    const tenantInfo = this.resolveTenantInfo(tid);
    const portalLoginUrl = this.getPortalUrl('/login', tenantInfo.tenantId);

    const context = {
      full_name: name.toUpperCase(),
      admin_name: adminName,
      reset_time: new Date().toLocaleString('en-NG'),
      new_password: newPassword,
      login_link: portalLoginUrl,
      login_url: portalLoginUrl,
      cooperative_name: tenantInfo.name,
      tenant_id: tenantInfo.tenantId,
      support_email: tenantInfo.supportEmail,
      support_phone: tenantInfo.supportPhone,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: email,
      subject: `🔐 ${tenantInfo.name} - Administrator Password Reset for ${name.split(' ')[0]}`,
      template: 'admin_password_reset',
      context: context,
      replyTo: tenantInfo.supportEmail,
      tags: ['admin_password_reset', 'security']
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send admin password reset email');
    }

    return result;
  }

  // 4. LOAN DISBURSEMENT
  async sendLoanDisbursementEmail(member, loanDetails, tenantId = null) {
    const { name, email } = member;
    const { loanId, loanAmount, disbursedAmount } = loanDetails;
    const tid = tenantId || member.tenant_id || member.tenantId || 'fmcksmcs';
    const tenantInfo = this.resolveTenantInfo(tid);

    const context = {
      member_name: name,
      loan_id: loanId,
      loan_amount: this.formatCurrency(loanAmount),
      disbursed_amount: this.formatCurrency(disbursedAmount),
      disbursement_date: new Date().toLocaleDateString('en-NG'),
      disbursement_method: 'Bank Transfer',
      transaction_ref: loanDetails.transactionRef || `TRX${Date.now()}`,
      cooperative_name: tenantInfo.name,
      tenant_id: tenantInfo.tenantId,
      support_email: tenantInfo.supportEmail,
      support_phone: tenantInfo.supportPhone,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: email,
      subject: `🎉 ${tenantInfo.name} - Loan #${loanId} Disbursed Successfully`,
      template: 'loan_disbursement',
      context: context,
      replyTo: tenantInfo.supportEmail,
      tags: ['loan_disbursement', `loan_${loanId}`]
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send loan disbursement email');
    }

    return result;
  }

  // 5. GUARANTOR NOTIFICATION (Loan application uses their PSN)
  async sendGuarantorNotificationEmail(grantor, loanDetails, tenantId = null) {
    const { name, email } = grantor;
    const { loanId, loanAmount } = loanDetails;
    const tid = tenantId || grantor.tenant_id || grantor.tenantId || 'fmcksmcs';
    const tenantInfo = this.resolveTenantInfo(tid);
    const portalLoginUrl = this.getPortalUrl('/login', tenantInfo.tenantId);

    if (!email) {
      console.warn('📧 [EmailService] Skipping guarantor notification email - no email on file');
      return { success: false, error: 'No email for grantor' };
    }

    const context = {
      grantor_name: name,
      loan_id: loanId,
      loan_amount: this.formatCurrency(loanAmount),
      request_date: new Date().toLocaleString('en-NG'),
      login_url: portalLoginUrl,
      cooperative_name: tenantInfo.name,
      tenant_id: tenantInfo.tenantId,
      support_email: tenantInfo.supportEmail,
      support_phone: tenantInfo.supportPhone,
      current_year: new Date().getFullYear().toString()
    };

    const text = `
Dear ${name},

You have been listed as a guarantor for a new loan application (Loan #${loanId}) on the ${tenantInfo.name} platform.

Loan amount: ${this.formatCurrency(loanAmount)}

Please log in to your account at ${portalLoginUrl} to review and respond to this guarantee request.

If you were not expecting this request, please contact ${tenantInfo.name} support immediately at ${tenantInfo.supportEmail}.

${tenantInfo.name} Support
${tenantInfo.supportEmail}
    `;

    const result = await this.sendEmail({
      to: email,
      subject: `${tenantInfo.name} - Loan Guarantee Request (Loan #${loanId})`,
      template: 'guarantor_request',
      context: context,
      text: text,
      replyTo: tenantInfo.supportEmail,
      tags: ['guarantor_request', `loan_${loanId}`]
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send guarantor notification email');
    }

    return result;
  }

  // 6. COMPLAINT CONFIRMATION
  async sendComplaintConfirmationEmail(member, complaintDetails, tenantId = null) {
    const { name, email } = member;
    const { ticketId, category, priority, description } = complaintDetails;
    const tid = tenantId || member.tenant_id || member.tenantId || 'fmcksmcs';
    const tenantInfo = this.resolveTenantInfo(tid);

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
      track_link: this.getPortalUrl(`/support/tickets/${ticketId}`, tenantInfo.tenantId),
      cooperative_name: tenantInfo.name,
      tenant_id: tenantInfo.tenantId,
      support_email: tenantInfo.supportEmail,
      support_phone: tenantInfo.supportPhone,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: email,
      subject: `✅ ${tenantInfo.name} - Complaint #${ticketId} Received`,
      template: 'complaint_confirmation',
      context: context,
      replyTo: tenantInfo.supportEmail,
      tags: ['complaint', `priority_${priority.toLowerCase()}`]
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send complaint confirmation email');
    }

    return result;
  }

  // 7. ADMIN COMPLAINT ALERT
  async sendNewComplaintAlertToAdmin(admin, complaint, member, tenantId = null) {
    const { name: adminName, email: adminEmail } = admin.membershipApplication || admin;
    const { name: memberName } = member.membershipApplication || member;
    const { tracking_id, title, category, priority, description } = complaint;
    const tid = tenantId || admin.tenant_id || member.tenant_id || 'fmcksmcs';
    const tenantInfo = this.resolveTenantInfo(tid);

    const context = {
      admin_name: adminName,
      member_name: memberName,
      ticket_id: tracking_id,
      title: title,
      category: category,
      priority: priority,
      description: description,
      submission_date: new Date().toLocaleString('en-NG'),
      admin_link: this.getPortalUrl(`/admin/complaints/${complaint.id}`, tenantInfo.tenantId),
      cooperative_name: tenantInfo.name,
      tenant_id: tenantInfo.tenantId,
      support_email: tenantInfo.supportEmail,
      support_phone: tenantInfo.supportPhone,
      current_year: new Date().getFullYear().toString()
    };

    const result = await this.sendEmail({
      to: adminEmail,
      subject: `🚨 NEW COMPLAINT: [${priority.toUpperCase()}] ${title} (${tracking_id})`,
      template: 'admin_complaint_alert',
      context: context,
      replyTo: tenantInfo.supportEmail,
      tags: ['admin_alert', 'complaint', priority.toLowerCase()]
    });

    return result;
  }

  // 8. PASSWORD RESET (User initiated or admin generated)
  async sendPasswordResetEmail(member, resetToken, tenantId = null) {
    const { name, email } = member;
    const firstName = (name || 'Member').split(' ')[0] || name;
    const tid = tenantId || member.tenant_id || member.tenantId || 'fmcksmcs';
    const tenantInfo = this.resolveTenantInfo(tid);

    // If resetToken looks like a temporary raw password rather than a hash/token, link to /login
    const isTempPassword = typeof resetToken === 'string' && resetToken.length <= 20 && !resetToken.includes('-');
    const resetLink = isTempPassword 
      ? this.getPortalUrl('/login', tenantInfo.tenantId)
      : this.getPortalUrl(`/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`, tenantInfo.tenantId);

    const context = {
      first_name: firstName.toUpperCase(),
      email: email,
      reset_link: resetLink,
      expiry_time: isTempPassword ? 'immediate' : '1 hour',
      cooperative_name: tenantInfo.name,
      tenant_id: tenantInfo.tenantId,
      support_email: tenantInfo.supportEmail,
      support_phone: tenantInfo.supportPhone,
      current_year: new Date().getFullYear().toString()
    };

    // If template exists, render it
    try {
      const result = await this.sendEmail({
        to: email,
        subject: `${tenantInfo.name} - Password Reset Request`,
        template: 'password_reset',
        context: context,
        replyTo: tenantInfo.supportEmail
      });
      return result;
    } catch (templateError) {
      console.warn(`⚠️ [EmailService] Password reset template error, falling back to text: ${templateError.message}`);
      const text = `
Dear ${name},

You received a password reset request for your account on ${tenantInfo.name}.

Link: ${resetLink}
${isTempPassword ? `Temporary Password: ${resetToken}` : 'This link expires in 1 hour.'}

If you didn't request this, please contact support.

${tenantInfo.name} Support
${tenantInfo.supportEmail}
      `;

      return await this.sendEmail({
        to: email,
        subject: `${tenantInfo.name} - Password Reset Request`,
        text: text,
        replyTo: tenantInfo.supportEmail
      });
    }
  }

  // 9. APPLICATION UNDER REVIEW EMAIL
  async sendUnderReviewEmail(application, tenantId = null) {
    const { name, email, psn } = application;
    const tid = tenantId || application.tenant_id || application.tenantId || 'fmcksmcs';
    const tenantInfo = this.resolveTenantInfo(tid);
    const portalLoginUrl = this.getPortalUrl('/login', tenantInfo.tenantId);

    const context = {
      recipient_name: name,
      member_name: name,
      full_name: name,
      psn: psn,
      member_email: email,
      email: email,
      application_status: 'Under Review',
      login_url: portalLoginUrl,
      login_link: portalLoginUrl,
      cooperative_name: tenantInfo.name,
      tenant_id: tenantInfo.tenantId,
      support_email: tenantInfo.supportEmail,
      support_phone: tenantInfo.supportPhone,
      current_year: new Date().getFullYear().toString()
    };

    const text = `
Dear ${name},

Your membership application for ${tenantInfo.name} has been received and is currently under review by our administration.

PSN / Staff ID: ${psn || 'N/A'}

You will receive an email notification once your application review is completed.

Portal: ${portalLoginUrl}

${tenantInfo.name} Support
${tenantInfo.supportEmail}
    `;

    return await this.sendEmail({
      to: email,
      subject: `${tenantInfo.name} - Membership Application Under Review`,
      context: context,
      text: text,
      replyTo: tenantInfo.supportEmail,
      tags: ['application', 'under_review']
    });
  }

  // 10. APPLICATION REJECTION EMAIL
  async sendRejectionEmail(application, rejectionReason = '', tenantId = null) {
    const { name, email, psn } = application;
    const tid = tenantId || application.tenant_id || application.tenantId || 'fmcksmcs';
    const tenantInfo = this.resolveTenantInfo(tid);
    const portalLoginUrl = this.getPortalUrl('/login', tenantInfo.tenantId);

    const context = {
      recipient_name: name,
      member_name: name,
      full_name: name,
      psn: psn,
      member_email: email,
      email: email,
      application_status: 'Declined',
      rejection_reason: rejectionReason || 'Requirements not met at this time.',
      login_url: portalLoginUrl,
      login_link: portalLoginUrl,
      cooperative_name: tenantInfo.name,
      tenant_id: tenantInfo.tenantId,
      support_email: tenantInfo.supportEmail,
      support_phone: tenantInfo.supportPhone,
      current_year: new Date().getFullYear().toString()
    };

    const text = `
Dear ${name},

Thank you for your interest in joining ${tenantInfo.name}.

After reviewing your membership application (PSN: ${psn || 'N/A'}), we regret to inform you that it could not be approved at this time.

Reason: ${rejectionReason || 'Requirements not met at this time.'}

If you have questions or need further clarification, please contact our support team at ${tenantInfo.supportEmail}.

${tenantInfo.name} Support
${tenantInfo.supportEmail}
    `;

    return await this.sendEmail({
      to: email,
      subject: `${tenantInfo.name} - Membership Application Status Update`,
      context: context,
      text: text,
      replyTo: tenantInfo.supportEmail,
      tags: ['application', 'rejected']
    });
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
