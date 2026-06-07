// services/brevoEmailService.js
const SibApiV3Sdk = require('sib-api-v3-sdk');
const config = require('../config/email');

class BrevoEmailService {
  constructor() {
    this.initialized = false;
    this.apiInstance = null;
    this.templateMap = config.brevo.templateIds;
    if (process.env.NODE_ENV !== 'test') {
      this.initialize();
    }
  }

  initialize() {
    if (!config.brevo || !config.brevo.apiKey) {
      console.log('❌ [BrevoService] API key not configured');
      return;
    }

    try {
      const defaultClient = SibApiV3Sdk.ApiClient.instance;
      const apiKey = defaultClient.authentications['api-key'];
      apiKey.apiKey = config.brevo.apiKey;

      this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      this.initialized = true;
      console.log('✅ [BrevoService] Initialized successfully');
      console.log(`📧 [BrevoService] Available templates:`, Object.keys(this.templateMap).filter(t => this.templateMap[t] > 0));
    } catch (error) {
      console.error('❌ [BrevoService] Initialization failed:', error.message);
    }
  }

  getTemplateId(templateName) {
    const templateId = this.templateMap[templateName];
    
    if (!templateId) {
      console.warn(`⚠️ [BrevoService] No template ID found for: ${templateName}`);
      console.log(`📧 Available templates:`, Object.keys(this.templateMap).filter(t => this.templateMap[t] > 0));
      return null;
    }
    
    if (templateId === 0) {
      console.warn(`⚠️ [BrevoService] Template ${templateName} is disabled (ID: 0)`);
      return null;
    }
    
    return templateId;
  }

  async sendEmail(emailData) {
    if (!this.initialized || !this.apiInstance) {
      throw new Error('Brevo service not initialized');
    }

    try {
      const { to, subject, template, context, attachments = [], replyTo } = emailData;

      // Prepare recipient
      const recipient = Array.isArray(to) 
        ? to.map(email => ({ email }))
        : [{ email: to }];

      // Get template ID
      const templateId = this.getTemplateId(template);
      
      if (!templateId && !emailData.html && !emailData.text) {
        throw new Error(`No template ID found for: ${template}. Please create template in Brevo or provide HTML/text content`);
      }

      // Prepare sendSmtpEmail object
      const sendSmtpEmail = {
        to: recipient,
        subject: subject,
        sender: {
          name: config.brevo.senderName,
          email: config.brevo.senderEmail
        },
        replyTo: replyTo ? { email: replyTo } : undefined,
        params: context || {}
      };

      // Only add headers if they exist and are not empty
      if (emailData.headers && Object.keys(emailData.headers).length > 0) {
        sendSmtpEmail.headers = emailData.headers;
      }

      // Only add tags if they exist and are not empty
      if (emailData.tags && emailData.tags.length > 0) {
        sendSmtpEmail.tags = emailData.tags;
      }

      // Use template if available
      if (templateId) {
        sendSmtpEmail.templateId = templateId;
        console.log(`📧 [BrevoService] Using template: ${template} (ID: ${templateId})`);
      } else if (emailData.html) {
        sendSmtpEmail.htmlContent = emailData.html;
        sendSmtpEmail.textContent = emailData.text || this.generatePlainText(emailData.html);
        console.log(`📧 [BrevoService] Using inline HTML for: ${template}`);
      } else {
        sendSmtpEmail.textContent = emailData.text;
      }

      // Add attachments if any
      if (attachments.length > 0) {
        sendSmtpEmail.attachment = attachments.map(attachment => ({
          name: attachment.filename,
          content: attachment.content.toString('base64')
        }));
      }

      // Send email
      console.log(`📧 [BrevoService] Sending email to: ${to}`);
      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.log(`✅ [BrevoService] Email sent: ${response.messageId}`);
      return {
        success: true,
        messageId: response.messageId,
        provider: 'brevo',
        response: response
      };

    } catch (error) {
      console.error('❌ [BrevoService] Send failed:', error.message);
      if (error.response) {
        console.error('❌ [BrevoService] Error details:', error.response.body);
      }
      throw error;
    }
  }

  generatePlainText(html) {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Test connection
  async testConnection() {
    if (!this.initialized) {
      return { success: false, error: 'Not initialized' };
    }
    
    try {
      // Try to get account info
      const accountApi = new SibApiV3Sdk.AccountApi();
      const account = await accountApi.getAccount();
      
      return {
        success: true,
        account: {
          email: account.email,
          firstName: account.firstName,
          lastName: account.lastName,
          credits: account.credits
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new BrevoEmailService();
