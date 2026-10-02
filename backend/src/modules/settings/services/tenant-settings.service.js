const { Settings, Tenant } = require('../../../../models');

/**
 * Tenant Settings Service
 * Manages configuration settings for tenants with comprehensive defaults
 * covering all 15 Cooperative Settings components:
 * 1. Name
 * 2. Logo
 * 3. Address
 * 4. Contact details
 * 5. Currency
 * 6. Contribution rules
 * 7. Loan rules
 * 8. Investment rules
 * 9. Profit distribution rules
 * 10. Registration fee
 * 11. Monthly administrative fee
 * 12. Subscription status
 * 13. Subscription expiry
 * 14. Enabled modules
 * 15. AI settings
 */
class TenantSettingsService {
  /**
   * Get default settings (fallback for all tenants)
   */
  getDefaultSettings() {
    return {
      // 1. Name
      cooperative_name: 'IMAN Multi-Purpose Cooperative Society',
      registration_number: 'IMAN/COOP/2024/001',

      // 2. Logo
      cooperative_logo: '/logo.png',

      // 3. Address
      address: 'Gombe State, Nigeria',

      // 4. Contact details
      contact_email: 'info@imancooperative.org',
      contact_phone: '+234-800-000-0000',
      contact_website: 'https://imancooperative.org',
      support_phone: '+234-800-111-2222',

      // 5. Currency
      currency_code: 'NGN',
      currency_symbol: '₦',
      currency_name: 'Nigerian Naira',

      // 6. Contribution rules
      minimum_savings: 1000,
      minimum_target_savings: 2000,
      target_savings_min_period: 6,
      allow_voluntary_savings: true,
      savings_withdrawal_lock_months: 6,
      max_savings_withdrawal_percent: 70,

      // 7. Loan rules
      max_loan_amount: 1000000,
      max_cash_loan: 500000,
      investment_loan_multiplier: 3,
      default_repayment_period: 12,
      min_membership_months_for_loan: 6,
      loan_interest_rate: 5,
      late_payment_fee: 5,
      max_active_loans_per_member: 2,
      require_guarantors: true,
      min_guarantors_count: 2,

      // 8. Investment rules
      minimum_investment: 5000,
      investment_lock_period_months: 12,
      expected_roi_percent: 15,
      allow_early_liquidation: false,
      early_termination_penalty_percent: 10,

      // 9. Profit distribution rules
      profit_sharing_frequency: 'quarterly',
      reserve_fund_percentage: 10,
      education_fund_percentage: 5,
      committee_bonus_percentage: 5,
      bad_debt_reserve_percentage: 3.5,
      general_reserve_percentage: 2.8,
      member_dividend_percentage: 73.7,

      // 10. Registration fee
      registration_fee: 2000,
      auto_deduct_registration_fee: true,

      // 11. Monthly administrative fee
      monthly_admin_fee: 1000,
      auto_deduct_monthly_admin_fee: true,

      // 12. Subscription status & Plan Tier
      subscription_status: 'active', // 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled'
      subscription_plan: 'Growth Plan',

      // 13. Subscription expiry & Billing Specifications
      subscription_expiry: '2027-12-31',
      subscription_billing_cycle: 'monthly', // 'monthly' | 'annual'
      subscription_rate_per_member: 150,
      subscription_member_bracket: '501 Up to 1,000 members',
      subscription_amount_payable: 112500, // e.g. 750 members * ₦150
      subscription_currency: 'NGN',
      subscription_payment_status: 'paid', // 'paid' | 'pending' | 'overdue' | 'waived'
      subscription_payment_method: 'Bank Transfer',
      subscription_next_billing_date: '2027-12-31',
      subscription_invoice_reference: 'INV-2025-IMAN-001',
      subscription_member_limit: 1000,
      subscription_billing_notes: 'Growth plan active with ₦150/member rate, automated reminders, and investment portfolios.',
      subscription_pricing_tiers: [
        {
          id: 'starter',
          name: 'Starter Plan',
          rate_per_member: 200,
          currency: 'NGN',
          min_members: 1,
          max_members: 500,
          member_bracket: '1 UP TO 500 MEMBERS',
          badge: 'Starter',
          description: 'Essential digital tools for emerging and community-based cooperatives.',
          features: [
            '1 up to 500 Members',
            '₦200 / per member billing',
            'Savings & Share Contributions Module',
            'Standard Loan Processing & Amortization',
            'Digital Passbooks & Receipt Vouchers',
            'Automated Monthly Statement Generation',
            'Standard Email Support'
          ]
        },
        {
          id: 'growth',
          name: 'Growth Plan',
          rate_per_member: 150,
          currency: 'NGN',
          min_members: 501,
          max_members: 1000,
          member_bracket: '501 Up to 1,000 members',
          popular: true,
          badge: 'Popular',
          description: 'High-performance suite for growing cooperatives with investment and asset portfolios.',
          features: [
            '501 up to 1,000 Members',
            '₦150 / per member billing (25% Volume Savings)',
            'All Starter Features Included',
            'Fixed-Yield Investment Portfolios',
            'Layyah Livestock Pool Management',
            'AI Financial Advisor & Loan Risk Scoring',
            'Automated SMS & Email Notifications',
            'Priority Support Desk (12h SLA)'
          ]
        },
        {
          id: 'pro',
          name: 'PRO Plan',
          rate_per_member: 100,
          currency: 'NGN',
          min_members: 1001,
          max_members: 1500,
          member_bracket: '1001 Up to 1,500 members',
          badge: 'High Volume',
          description: 'Maximum power, bespoke customizations, and unlimited institutional capabilities.',
          features: [
            '1,001 up to 1,500 Members',
            '₦100 / per member billing (50% Volume Savings)',
            'All Functional Modules Unlocked',
            'Complete AI Intelligence Suite (OCR + Auto Audit)',
            'Custom Domain & Complete Brand Whitelabeling',
            'Multi-Level Executive Approvals & Audit Logs',
            'Receipt & Legal Contract Designer',
            'Dedicated Platform Account Manager & 24/7 Phone Support'
          ]
        },
        {
          id: 'custom',
          name: 'Custom Plan',
          rate_per_member: null,
          currency: 'NGN',
          min_members: 1501,
          max_members: 0,
          member_bracket: 'Unlimited / Negotiated',
          badge: 'Bespoke',
          description: 'Custom rate & tailored institutional deployments with enterprise SLA and core banking integrations.',
          features: [
            'Over 1,500+ Members (Unlimited)',
            'Custom Negotiated Rate & Flexible Terms',
            'Dedicated Cloud Instance or On-Premise',
            'Custom ERP & Banking Integration API',
            'Dedicated 24/7 Technical Account Manager'
          ]
        }
      ],
      subscription_payment_instructions: {
        bank_name: 'First Bank of Nigeria',
        account_name: 'Cooperative Core Technologies Ltd',
        account_number: '3128945012',
        sort_code: '011151003',
        payment_reference_format: 'COOP-[TENANT_ID]-[MONTH_YEAR]',
        support_email: 'billing@platform.cooperative.org',
        support_phone: '+234 800 123 4567'
      },

      // 14. Enabled modules
      enabled_modules: {
        loans: true,
        contributions: true,
        investments: true,
        layyah: true,
        expenses: true,
        profit_sharing: true,
        withdrawals: true,
        receipt_designer: true,
        document_designer: true,
        member_portal: true
      },

      // 15. AI settings
      ai_settings: {
        enabled: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        api_key: '',
        loan_risk_scoring: true,
        financial_advisor: true,
        document_ocr: true,
        auto_reporting: true
      },

      // Notifications & Templates
      email_notifications: true,
      sms_notifications: false,
      reminder_days: 7,
      agent_agreement_template: '<h2>Agent Agreement</h2><p>This Agreement is made on [Date] between [Cooperative Name] (Principal) and [Member Name] (Agent).</p><p>1. <strong>Appointment:</strong> The Principal appoints the Agent to purchase the Goods...</p>',
      murabaha_contract_template: '<h2>Murabaha Contract</h2><p>This Contract is made on [Date] between [Cooperative Name] and [Member Name].</p><p>1. <strong>Sale:</strong> The Seller sells the Goods to the Buyer for the Total Price...</p>'
    };
  }

  /**
   * Helper to map keys to Settings categories
   */
  getCategoryForKey(key) {
    if (['cooperative_name', 'registration_number', 'address', 'contact_email', 'contact_phone', 'contact_website', 'support_phone', 'cooperative_logo', 'currency_code', 'currency_symbol', 'currency_name'].includes(key)) {
      return 'general';
    }
    if (['minimum_savings', 'minimum_target_savings', 'target_savings_min_period', 'allow_voluntary_savings', 'savings_withdrawal_lock_months', 'max_savings_withdrawal_percent', 'registration_fee', 'auto_deduct_registration_fee', 'monthly_admin_fee', 'auto_deduct_monthly_admin_fee'].includes(key)) {
      return 'contributions';
    }
    if (['max_loan_amount', 'max_cash_loan', 'investment_loan_multiplier', 'default_repayment_period', 'min_membership_months_for_loan', 'loan_interest_rate', 'late_payment_fee', 'max_active_loans_per_member', 'require_guarantors', 'min_guarantors_count', 'agent_agreement_template', 'murabaha_contract_template'].includes(key)) {
      return 'loans';
    }
    if (['minimum_investment', 'investment_lock_period_months', 'expected_roi_percent', 'allow_early_liquidation', 'early_termination_penalty_percent'].includes(key)) {
      return 'investments';
    }
    if (['profit_sharing_frequency', 'reserve_fund_percentage', 'education_fund_percentage', 'committee_bonus_percentage', 'bad_debt_reserve_percentage', 'general_reserve_percentage', 'member_dividend_percentage'].includes(key)) {
      return 'profits';
    }
    if (['email_notifications', 'sms_notifications', 'reminder_days'].includes(key)) {
      return 'notifications';
    }
    if ([
      'subscription_status', 'subscription_plan', 'subscription_expiry',
      'subscription_billing_cycle', 'subscription_amount_payable', 'subscription_currency',
      'subscription_rate_per_member', 'subscription_member_bracket',
      'subscription_payment_status', 'subscription_payment_method', 'subscription_next_billing_date',
      'subscription_invoice_reference', 'subscription_member_limit', 'subscription_billing_notes',
      'subscription_pricing_tiers', 'subscription_payment_instructions'
    ].includes(key)) {
      return 'subscription';
    }
    if (['enabled_modules'].includes(key)) {
      return 'modules';
    }
    if (['ai_settings'].includes(key)) {
      return 'ai';
    }
    return 'general';
  }

  /**
   * Get settings for a specific tenant
   * Merges custom settings with defaults and tenant entity properties
   */
  async get(tenantId = 'default') {
    try {
      const defaults = this.getDefaultSettings();
      
      const customSetting = await Settings.findOne({
        where: { key: `tenant:${tenantId}:config` },
        skipTenant: true
      });

      let customSettings = {};
      if (customSetting) {
        try {
          customSettings = typeof customSetting.value === 'string' 
            ? JSON.parse(customSetting.value)
            : (customSetting.value || {});
        } catch {
          customSettings = {};
        }
      }

      // Check Tenant table for tenant-specific overrides
      let tenantData = null;
      try {
        tenantData = await Tenant.findByPk(tenantId);
      } catch (err) {
        // Non-blocking fallback
      }

      const merged = this.deepMerge(defaults, customSettings);

      if (tenantData) {
        if (tenantData.name) {
          merged.cooperative_name = tenantData.name;
        }
        if (tenantData.theme?.customLogoUrl || tenantData.theme?.logoUrl) {
          merged.cooperative_logo = tenantData.theme.customLogoUrl || tenantData.theme.logoUrl;
        }
        if (tenantData.features && typeof tenantData.features === 'object') {
          merged.enabled_modules = {
            ...merged.enabled_modules,
            ...tenantData.features
          };
        }
      }

      return merged;
    } catch (error) {
      console.error('Error getting tenant settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Update settings for a specific tenant
   */
  async update(tenantId = 'default', newSettings) {
    const key = `tenant:${tenantId}:config`;
    
    let existing = await Settings.findOne({ where: { key }, skipTenant: true });
    let currentSettings = {};
    
    if (existing) {
      try {
        currentSettings = typeof existing.value === 'string'
          ? JSON.parse(existing.value)
          : (existing.value || {});
      } catch {
        currentSettings = {};
      }
    } else {
      currentSettings = this.getDefaultSettings();
    }
    
    const mergedSettings = this.deepMerge(currentSettings, newSettings);
    
    if (existing) {
      await existing.update({
        tenant_id: tenantId,
        value: JSON.stringify(mergedSettings),
        updatedAt: new Date()
      });
    } else {
      try {
        await Settings.create({
          tenant_id: tenantId,
          key,
          value: JSON.stringify(mergedSettings),
          description: `Settings for tenant ${tenantId}`,
          category: 'general',
          createdAt: new Date(),
          updatedAt: new Date()
        }, { skipTenant: true });
      } catch (createErr) {
        if (createErr.name === 'SequelizeUniqueConstraintError' || createErr.original?.code === '23505') {
          existing = await Settings.findOne({ where: { key }, skipTenant: true });
          if (existing) {
            await existing.update({
              tenant_id: tenantId,
              value: JSON.stringify(mergedSettings),
              updatedAt: new Date()
            });
          }
        } else {
          throw createErr;
        }
      }
    }

    // Sync to Tenant model if applicable
    try {
      const tenant = await Tenant.findByPk(tenantId);
      if (tenant) {
        const tenantUpdates = {};
        if (newSettings.cooperative_name || newSettings.name) {
          tenantUpdates.name = newSettings.cooperative_name || newSettings.name;
        }
        if (newSettings.cooperative_logo || newSettings.logo) {
          const logo = newSettings.cooperative_logo || newSettings.logo;
          tenantUpdates.theme = {
            ...(tenant.theme || {}),
            customLogoUrl: logo,
            logoUrl: logo
          };
        }
        if (newSettings.enabled_modules && typeof newSettings.enabled_modules === 'object') {
          tenantUpdates.features = {
            ...(tenant.features || {}),
            ...newSettings.enabled_modules
          };
        }
        if (Object.keys(tenantUpdates).length > 0) {
          await tenant.update(tenantUpdates);
        }
      }
    } catch (tenantErr) {
      console.warn('Failed to sync settings to Tenant model:', tenantErr.message);
    }

    // Also sync flat keys to Settings table for individual lookups
    const flatKeysToSync = [
      'cooperative_name', 'cooperative_logo', 'address', 'contact_email', 'contact_phone',
      'currency_code', 'currency_symbol', 'currency_name',
      'minimum_savings', 'minimum_investment', 'minimum_target_savings',
      'registration_fee', 'monthly_admin_fee',
      'max_cash_loan', 'investment_loan_multiplier', 'default_repayment_period', 'late_payment_fee',
      'profit_sharing_frequency', 'reserve_fund_percentage', 'education_fund_percentage',
      'subscription_status', 'subscription_expiry', 'subscription_plan',
      'subscription_billing_cycle', 'subscription_amount_payable', 'subscription_currency',
      'subscription_rate_per_member', 'subscription_member_bracket',
      'subscription_payment_status', 'subscription_payment_method', 'subscription_next_billing_date',
      'subscription_invoice_reference', 'subscription_member_limit', 'subscription_billing_notes',
      'subscription_pricing_tiers', 'subscription_payment_instructions'
    ];

    for (const k of flatKeysToSync) {
      if (mergedSettings[k] !== undefined) {
        try {
          const serialized = typeof mergedSettings[k] === 'object'
            ? JSON.stringify(mergedSettings[k])
            : mergedSettings[k];
          const existingFlat = await Settings.findOne({ where: { key: k }, skipTenant: true });
          if (existingFlat) {
            await existingFlat.update({
              tenant_id: tenantId,
              value: serialized,
              description: `${k} setting`,
              category: this.getCategoryForKey(k)
            });
          } else {
            try {
              await Settings.create({
                tenant_id: tenantId,
                key: k,
                value: serialized,
                description: `${k} setting`,
                category: this.getCategoryForKey(k)
              }, { skipTenant: true });
            } catch (err) {
              if (err.name === 'SequelizeUniqueConstraintError' || err.original?.code === '23505') {
                const rec = await Settings.findOne({ where: { key: k }, skipTenant: true });
                if (rec) {
                  await rec.update({
                    tenant_id: tenantId,
                    value: serialized,
                    description: `${k} setting`,
                    category: this.getCategoryForKey(k)
                  });
                }
              }
            }
          }
        } catch (e) {
          // Non-blocking sync
        }
      }
    }
    
    return mergedSettings;
  }

  /**
   * Reset tenant settings to defaults
   */
  async reset(tenantId = 'default') {
    const key = `tenant:${tenantId}:config`;
    await Settings.destroy({ where: { key }, skipTenant: true });
    return this.getDefaultSettings();
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

module.exports = new TenantSettingsService();
