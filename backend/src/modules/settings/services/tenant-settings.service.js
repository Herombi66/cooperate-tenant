
const { Settings } = require('../../../../models');

/**
 * Tenant Settings Service
 * Manages configuration settings for tenants with sensible defaults
 */
class TenantSettingsService {
  /**
   * Get default settings (fallback for all tenants)
   */
  getDefaultSettings() {
    return {
      // Loan settings
      maxLoanAmount: 500000,
      interestRate: {
        cash: 0.05,
        venture: 0.10,
        emergency: 0.03,
        educational: 0.04,
        investment: 0.06
      },
      maxRepaymentMonths: {
        cash: 24,
        venture: 36,
        emergency: 6,
        educational: 36,
        investment: 36
      },
      minRepaymentMonths: {
        cash: 3,
        venture: 6,
        emergency: 1,
        educational: 6,
        investment: 6
      },
      
      // Contribution settings
      contributionRules: {
        minAmount: 100,
        feePercentage: 0.02,
        registrationFee: 1500,
        monthlyAdminFee: 1000
      },
      contributionAllocation: {
        savings: 0.5,
        investment: 0.3,
        targetSaving: 0.2
      },
      
      // Withdrawal settings
      withdrawalPolicy: {
        minAmount: 100,
        maxPercentage: 0.8,
        processingDays: 3
      },
      
      // Profit sharing settings
      profitSharingMethod: 'equal', // 'equal', 'contribution-based', 'hybrid'
      profitSharingRatio: {
        members: 0.7,
        cooperative: 0.3
      },
      
      // Approval flows
      approvalFlows: {
        loan: ['secretary', 'treasurer', 'chairman'],
        withdrawal: ['treasurer', 'chairman'],
        expense: ['treasurer', 'chairman']
      },
      
      // Communication settings
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true
      }
    };
  }

  /**
   * Get settings for a specific tenant
   * Merges custom settings with defaults
   */
  async get(tenantId = 'default') {
    try {
      const defaults = this.getDefaultSettings();
      
      const customSetting = await Settings.findOne({
        where: { key: `tenant:${tenantId}:config` }
      });

      if (!customSetting) {
        return defaults;
      }

      let customSettings;
      try {
        customSettings = typeof customSetting.value === 'string' 
          ? JSON.parse(customSetting.value)
          : customSetting.value;
      } catch {
        customSettings = {};
      }

      // Deep merge
      return this.deepMerge(defaults, customSettings);
    } catch (error) {
      console.error('Error getting tenant settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Update settings for a specific tenant
   */
  async update(tenantId, newSettings) {
    const key = `tenant:${tenantId}:config`;
    
    const existing = await Settings.findOne({ where: { key } });
    
    if (existing) {
      let currentSettings;
      try {
        currentSettings = typeof existing.value === 'string'
          ? JSON.parse(existing.value)
          : existing.value;
      } catch {
        currentSettings = {};
      }
      
      const mergedSettings = this.deepMerge(currentSettings, newSettings);
      
      await existing.update({
        value: JSON.stringify(mergedSettings),
        updatedAt: new Date()
      });
      
      return mergedSettings;
    } else {
      const mergedSettings = this.deepMerge(this.getDefaultSettings(), newSettings);
      
      await Settings.create({
        key,
        value: JSON.stringify(mergedSettings),
        description: `Settings for tenant ${tenantId}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return mergedSettings;
    }
  }

  /**
   * Reset tenant settings to defaults
   */
  async reset(tenantId) {
    const key = `tenant:${tenantId}:config`;
    await Settings.destroy({ where: { key } });
    return this.getDefaultSettings();
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] &amp;&amp; typeof source[key] === 'object' &amp;&amp; !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

module.exports = new TenantSettingsService();
