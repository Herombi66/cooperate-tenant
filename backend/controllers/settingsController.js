const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');
const multer = require('multer');

// Helper function to log activity
async function logActivity({ user_id, action, resource_type, resource_id, description, metadata }) {
  try {
    await ActivityLog.create({
      user_id,
      action,
      resource_type,
      resource_id,
      description,
      metadata
    });
  } catch (error) {
    console.error('Failed to log settings activity:', error);
    // Don't break the main operation if logging fails
  }
}

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all settings formatted for frontend
exports.getSettings = async (req, res) => {
  try {
    const allSettings = await Settings.findAll({
      order: [
        ['category', 'ASC'],
        ['key', 'ASC']
      ]
    });

    // Format settings into a flat object for frontend consumption
    const formattedSettings = {};

    // Set default values if no settings exist yet
    const defaults = {
      // General Settings
      cooperative_name: 'IMAN Multi-Purpose Cooperative Society',
      registration_number: 'IMAN/COOP/2024/001',
      address: 'Gombe State, Nigeria',
      contact_email: 'info@imancooperative.org',
      contact_phone: '+234-xxx-xxx-xxxx',
      cooperative_logo: null,

      // Financial
      administrative_fee_monthly: 1000,
      entrance_fee: 5000,
      minimum_shares: 20000,
      maximum_shares_percent: 20,

      // Contribution Settings
      fixed_deposit_percent: 20,
      investment_fund_percent: 30,
      savings_percent: 50,
      minimum_savings: 1000,
      minimum_investment: 5000,
      minimum_target_savings: 2000,
      registration_fee: 2000,
      monthly_admin_fee: 200,

      // Loan Settings
      cash_loan_limit: 500000,
      cash_loan_processing_fee: 1000,
      venture_loan_multiplier: 10,
      venture_loan_limit: 1000000,
      venture_loan_interest_percent: 5,
      emergency_loan_limit: 20000,
      max_cash_loan: 100000,
      investment_loan_multiplier: 3,
      default_repayment_period: 12,
      late_payment_fee: 5,
      agent_agreement_template: '<h2>Agent Agreement</h2><p>This Agreement is made on [Date] between [Cooperative Name] (Principal) and [Member Name] (Agent).</p><p>1. <strong>Appointment:</strong> The Principal appoints the Agent to purchase the Goods...</p>',
      murabaha_contract_template: '<h2>Murabaha Contract</h2><p>This Contract is made on [Date] between [Cooperative Name] and [Member Name].</p><p>1. <strong>Sale:</strong> The Seller sells the Goods to the Buyer for the Total Price...</p>',

      // Profit Sharing Settings
      profit_interest_percent: 5,
      profit_reserve_fund_percent: 10,
      profit_education_fund_percent: 5.5,
      profit_committee_bonus_percent: 5,
      profit_bad_debt_reserve_percent: 3.5,
      profit_charity_percent: 3,
      profit_general_reserve_percent: 2,
      profit_sharing_frequency: 'quarterly',
      reserve_fund_percentage: 10,
      education_fund_percentage: 5,
      committee_bonus_percentage: 5,
      bad_debt_reserve_percentage: 3.5,
      general_reserve_percentage: 2.8,

      // Notification Settings
      email_notifications: true,
      sms_notifications: true,
      reminder_days: 7,
    };

    // Apply settings from database or use defaults
    for (const [key, defaultValue] of Object.entries(defaults)) {
      const dbSetting = allSettings.find(s => s.key === key);
      const value = dbSetting && dbSetting.status === 'active' ? parseSettingValue(dbSetting.value, defaultValue) : defaultValue;
      formattedSettings[key] = {
        value,
        status: dbSetting ? dbSetting.status : 'active',
        proposed_value: dbSetting && dbSetting.proposed_value ? parseSettingValue(dbSetting.proposed_value, null) : null
      };
    }

    // Group settings by category for the response
    const settingsByCategory = {
      general: {},
      contributions: {},
      loans: {},
      profits: {},
      notifications: {}
    };

    for (const [key, obj] of Object.entries(formattedSettings)) {
      const setting = allSettings.find(s => s.key === key);
      const category = setting?.category || getCategoryByKey(key);

      if (settingsByCategory[category]) {
        settingsByCategory[category][key] = {
          value: obj.value,
          status: obj.status,
          proposed_value: obj.proposed_value,
          description: setting?.description || '',
          lastUpdated: setting?.updated_at || null
        };
      }
    }

    res.json({
      success: true,
      data: formattedSettings,
      metadata: {
        totalSettings: allSettings.length,
        categories: Object.keys(settingsByCategory).length,
        byCategory: settingsByCategory
      }
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update multiple settings
exports.updateSettings = async (req, res) => {
  const { user } = req;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required to modify settings'
    });
  }

  if (!['admin', 'treasurer', 'president'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to modify settings'
    });
  }

  const updates = req.body;
  const errors = [];
  const updatedKeys = [];

  try {
    // Validate settings before updating
    const validationResults = validateSettings(updates);
    if (!validationResults.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Settings validation failed',
        errors: validationResults.errors
      });
    }

    // Update each setting
    for (const [key, value] of Object.entries(updates)) {
      try {
        const category = getCategoryByKey(key);
        const description = getDescriptionByKey(key);

        const existingSetting = await Settings.findOne({ where: { key } });
        
        if (existingSetting) {
          existingSetting.proposed_value = serializeSettingValue(value);
          existingSetting.status = 'pending_approval';
          await existingSetting.save();
        } else {
          await Settings.create({
            key,
            value: serializeSettingValue(value),
            proposed_value: serializeSettingValue(value),
            status: 'pending_approval',
            category,
            description
          });
        }

        updatedKeys.push(key);

        // Log activity
        await logActivity({
          user_id: user.id,
          action: 'UPDATE',
          resource_type: 'settings',
          resource_id: key,
          description: `Updated setting: ${key}`,
          metadata: {
            old_value: await getCurrentSettingValue(key),
            new_value: value
          }
        });

      } catch (error) {
        console.error(`Failed to update setting ${key}:`, error);
        errors.push(`Failed to update ${key}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Successfully updated ${updatedKeys.length} settings`,
      data: {
        updatedKeys,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Approve Settings (President Only)
exports.approveSettings = async (req, res) => {
  const { user } = req;
  if (!user || user.role !== 'president') {
    return res.status(403).json({ success: false, message: 'Only the President can approve settings' });
  }

  try {
    const pendingSettings = await Settings.findAll({ where: { status: 'pending_approval' } });
    let approvedCount = 0;

    for (const setting of pendingSettings) {
      setting.value = setting.proposed_value;
      setting.proposed_value = null;
      setting.status = 'active';
      await setting.save();
      approvedCount++;
    }

    await logActivity({
      user_id: user.id, action: 'APPROVE', resource_type: 'settings', resource_id: 'all',
      description: `Approved ${approvedCount} pending settings`
    });

    res.json({ success: true, message: `Approved ${approvedCount} settings` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve settings' });
  }
};

// Reject Settings (President Only)
exports.rejectSettings = async (req, res) => {
  const { user } = req;
  if (!user || user.role !== 'president') {
    return res.status(403).json({ success: false, message: 'Only the President can reject settings' });
  }

  try {
    const pendingSettings = await Settings.findAll({ where: { status: 'pending_approval' } });
    let rejectedCount = 0;

    for (const setting of pendingSettings) {
      setting.proposed_value = null;
      setting.status = 'active';
      await setting.save();
      rejectedCount++;
    }

    await logActivity({
      user_id: user.id, action: 'REJECT', resource_type: 'settings', resource_id: 'all',
      description: `Rejected ${rejectedCount} pending settings`
    });

    res.json({ success: true, message: `Rejected ${rejectedCount} settings` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject settings' });
  }
};
// Get settings by category
exports.getSettingsByCategory = async (req, res) => {
  const { category } = req.params;

  if (!Settings.isValidCategory(category)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category',
      validCategories: Object.keys(Settings.CATEGORIES)
    });
  }

  try {
    const settings = await Settings.findAll({
      where: { category },
      order: [['key', 'ASC']]
    });

    const formattedSettings = {};
    settings.forEach(setting => {
      formattedSettings[setting.key] = parseSettingValue(setting.value);
    });

    res.json({
      success: true,
      data: formattedSettings,
      category,
      count: settings.length
    });

  } catch (error) {
    console.error(`Error fetching ${category} settings:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to load ${category} settings`,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reset settings to defaults
exports.resetSettings = async (req, res) => {
  const { user } = req;

  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can reset settings'
    });
  }

  try {
    // Delete all settings records (they will be recreated with defaults on next fetch)
    const deletedCount = await Settings.destroy({
      where: {},
      force: true // Hard delete
    });

    // Log activity
    await logActivity({
      user_id: user.id,
      action: 'DELETE',
      resource_type: 'settings',
      resource_id: 'all',
      description: 'Reset all settings to defaults',
      metadata: { deletedCount }
    });

    res.json({
      success: true,
      message: 'All settings have been reset to defaults',
      data: { deletedCount }
    });

  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.uploadLogoMiddleware = (req, res, next) => {
  logoUpload.single('logo')(req, res, (err) => {
    if (err) {
      console.error('Logo upload validation error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Logo upload failed'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file uploaded'
      });
    }

    next();
  });
};

exports.uploadLogo = async (req, res) => {
  const { user } = req;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required to upload logo'
    });
  }

  if (!['admin', 'treasurer'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to upload logo'
    });
  }

  try {
    const file = req.file;
    const base64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64}`;

    await Settings.upsert({
      key: 'cooperative_logo',
      value: serializeSettingValue(dataUri),
      category: 'general',
      description: getDescriptionByKey('cooperative_logo')
    });

    await logActivity({
      user_id: user.id,
      action: 'UPDATE',
      resource_type: 'settings',
      resource_id: 'cooperative_logo',
      description: 'Updated cooperative logo',
      metadata: {
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }
    });

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logo: dataUri
      }
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo'
    });
  }
};

// Helper functions
function parseSettingValue(value) {
  if (typeof value === 'string') {
    // Try to parse as JSON first, then as boolean or number
    try {
      return JSON.parse(value);
    } catch {
      if (value === 'true') return true;
      if (value === 'false') return false;
      const numValue = parseFloat(value);
      return isNaN(numValue) ? value : numValue;
    }
  }
  return value;
}

function serializeSettingValue(value) {
  // Convert to string format for PostgreSQL JSONB storage
  return JSON.stringify(value);
}

function getCategoryByKey(key) {
  for (const [category, keys] of Object.entries(Settings.CATEGORIES)) {
    if (keys.includes(key)) {
      return category;
    }
  }
  return 'general'; // Default category
}

function getDescriptionByKey(key) {
  const descriptions = {
    // General
    cooperative_name: 'Name of the cooperative organization',
    registration_number: 'Official registration number',
    address: 'Physical address of the cooperative',
    contact_email: 'Primary contact email address',
    contact_phone: 'Primary contact phone number',

    // Contributions
    minimum_savings: 'Minimum monthly savings amount (₦)',
    minimum_investment: 'Minimum monthly investment amount (₦)',
    minimum_target_savings: 'Minimum target savings amount (₦)',
    registration_fee: 'One-time member registration fee (₦)',
    monthly_admin_fee: 'Monthly administrative service fee (₦)',

    // Loans
    max_cash_loan: 'Maximum cash loan amount (₦)',
    investment_loan_multiplier: 'Investment-to-loan multiplier',
    default_repayment_period: 'Maximum repayment period (months)',
    late_payment_fee: 'Late payment penalty percentage (%)',
    agent_agreement_template: 'HTML template for Agent Agreement',
    murabaha_contract_template: 'HTML template for Murabaha Contract',

    // Profits
    profit_sharing_frequency: 'Frequency of profit distribution',
    reserve_fund_percentage: 'Main reserve fund percentage (%)',
    education_fund_percentage: 'Education and training fund percentage (%)',
    committee_bonus_percentage: 'Committee bonus percentage (%)',
    bad_debt_reserve_percentage: 'Bad debt reserve percentage (%)',
    general_reserve_percentage: 'General operations reserve percentage (%)',

    // Notifications
    email_notifications: 'Enable email notifications',
    sms_notifications: 'Enable SMS notifications',
    reminder_days: 'Days before due date to send reminders'
  };

  return descriptions[key] || `${key} setting`;
}

function validateSettings(updates) {
  const errors = [];
  const result = { isValid: true, errors };

  // Numeric validations
  const numericKeys = [
    'minimum_savings', 'minimum_investment', 'minimum_target_savings',
    'registration_fee', 'monthly_admin_fee', 'max_cash_loan',
    'investment_loan_multiplier', 'default_repayment_period', 'late_payment_fee'
  ];

  for (const key of numericKeys) {
    if (updates[key] !== undefined) {
      const value = parseFloat(updates[key]);
      if (isNaN(value) || value < 0) {
        errors.push(`${key}: Must be a positive number`);
        result.isValid = false;
      }
    }
  }

  // Percentage validations (0-100)
  const percentageKeys = [
    'reserve_fund_percentage', 'education_fund_percentage', 'committee_bonus_percentage',
    'bad_debt_reserve_percentage', 'general_reserve_percentage', 'late_payment_fee'
  ];

  for (const key of percentageKeys) {
    if (updates[key] !== undefined) {
      const value = parseFloat(updates[key]);
      if (value < 0 || value > 100) {
        errors.push(`${key}: Must be between 0 and 100`);
        result.isValid = false;
      }
    }
  }

  // Profit sharing frequency validation
  if (updates.profit_sharing_frequency && !['monthly', 'quarterly', 'annually'].includes(updates.profit_sharing_frequency)) {
    errors.push('profit_sharing_frequency: Must be monthly, quarterly, or annually');
    result.isValid = false;
  }

  // Total profit allocations validation
  const totalProfits = [
    updates.reserve_fund_percentage || 10,
    updates.education_fund_percentage || 5,
    updates.committee_bonus_percentage || 5,
    updates.bad_debt_reserve_percentage || 3.5,
    updates.general_reserve_percentage || 2.8
  ].reduce((sum, val) => sum + parseFloat(val), 0);

  if (totalProfits > 100) {
    errors.push(`Total profit deductions (${totalProfits.toFixed(1)}%) exceed 100%. Members would receive negative share.`);
    result.isValid = false;
  }

  // Reminder days validation
  if (updates.reminder_days !== undefined) {
    const days = parseInt(updates.reminder_days);
    if (days < 1 || days > 30) {
      errors.push('reminder_days: Must be between 1 and 30 days');
      result.isValid = false;
    }
  }

  return result;
}

async function getCurrentSettingValue(key) {
  try {
    const setting = await Settings.findOne({ where: { key } });
    return setting ? setting.value : null;
  } catch {
    return null;
  }
}

// Export validation function for use elsewhere
exports.validateSettings = validateSettings;
