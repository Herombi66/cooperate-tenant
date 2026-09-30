const tenantSettingsService = require('../services/tenant-settings.service');
const SettingsRepository = require('../repositories/settings.repository');

/**
 * Settings Controller
 * Handles HTTP requests for settings management
 */
class SettingsController {
  /**
   * Get all settings for current tenant
   */
  async getSettings(req, res) {
    try {
      const tenantId = req.tenantId || req.tenant?.id || 'default';
      const settings = await tenantSettingsService.get(tenantId);
      
      res.json({
        success: true,
        settings,
        data: settings
      });
    } catch (error) {
      console.error('Error getting settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get settings'
      });
    }
  }

  /**
   * Update settings for current tenant
   */
  async updateSettings(req, res) {
    try {
      const tenantId = req.tenantId || req.tenant?.id || 'default';
      const newSettings = req.body;
      
      // Allow administrative leadership roles to update settings
      const allowedRoles = ['admin', 'super_admin', 'chairman', 'president', 'treasurer'];
      if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update settings'
        });
      }
      
      const updatedSettings = await tenantSettingsService.update(tenantId, newSettings);
      
      res.json({
        success: true,
        message: 'Settings updated successfully',
        settings: updatedSettings,
        data: updatedSettings
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings'
      });
    }
  }

  /**
   * Upload logo
   */
  async uploadLogo(req, res) {
    try {
      const tenantId = req.tenantId || req.tenant?.id || 'default';
      const allowedRoles = ['admin', 'super_admin', 'chairman', 'president', 'treasurer'];
      if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to upload logo'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No logo file provided'
        });
      }

      const file = req.file;
      const base64 = file.buffer.toString('base64');
      const dataUri = `data:${file.mimetype};base64,${base64}`;

      await tenantSettingsService.update(tenantId, {
        cooperative_logo: dataUri
      });

      res.json({
        success: true,
        message: 'Logo uploaded successfully',
        data: {
          logo: dataUri
        },
        logo: dataUri
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload logo'
      });
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(req, res) {
    try {
      const tenantId = req.tenantId || req.tenant?.id || 'default';
      const allowedRoles = ['admin', 'super_admin', 'chairman', 'president'];
      
      if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to reset settings'
        });
      }
      
      const settings = await tenantSettingsService.reset(tenantId);
      
      res.json({
        success: true,
        message: 'Settings reset to defaults',
        settings,
        data: settings
      });
    } catch (error) {
      console.error('Error resetting settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset settings'
      });
    }
  }

  /**
   * Get default settings (for reference)
   */
  async getDefaultSettings(req, res) {
    try {
      const defaults = tenantSettingsService.getDefaultSettings();
      
      res.json({
        success: true,
        settings: defaults,
        data: defaults
      });
    } catch (error) {
      console.error('Error getting default settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get default settings'
      });
    }
  }
}

module.exports = new SettingsController();
