
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
      const tenantId = req.tenantId || 'default';
      const settings = await tenantSettingsService.get(tenantId);
      
      res.json({
        success: true,
        settings
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
      const tenantId = req.tenantId || 'default';
      const newSettings = req.body;
      
      // Only allow admins to update settings
      if (!['admin', 'super_admin', 'chairman'].includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update settings'
        });
      }
      
      const updatedSettings = await tenantSettingsService.update(tenantId, newSettings);
      
      res.json({
        success: true,
        message: 'Settings updated successfully',
        settings: updatedSettings
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
   * Reset settings to defaults
   */
  async resetSettings(req, res) {
    try {
      const tenantId = req.tenantId || 'default';
      
      if (!['admin', 'super_admin'].includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to reset settings'
        });
      }
      
      const settings = await tenantSettingsService.reset(tenantId);
      
      res.json({
        success: true,
        message: 'Settings reset to defaults',
        settings
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
        settings: defaults
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
