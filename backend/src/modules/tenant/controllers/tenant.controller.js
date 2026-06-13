const { Tenant } = require('../../../../models');

// Define default theme configuration with all required fields
const DEFAULT_THEME = {
  primaryColor: '#0055ff',
  secondaryColor: '#f3f4f6',
  accentColor: '#ff6b00',
  customLogoUrl: '/logo.png',
  landingPageHeroTitle: 'Welcome to Your Cooperative',
  landingPageHeroSubtitle: 'Manage your finances, loans, and contributions in one place',
  faviconUrl: '/favicon.ico'
};

class TenantController {
  
  /**
   * Get public configuration for the current tenant.
   * This endpoint is unauthenticated and used by the frontend to apply theming before login.
   */
  async getPublicConfig(req, res) {
    try {
      const tenant = req.tenant; // Injected by tenant-context middleware

      if (!tenant) {
        return res.status(404).json({ success: false, message: 'Tenant not found' });
      }

      // Merge tenant's theme with defaults to ensure all fields exist
      const theme = {
        ...DEFAULT_THEME,
        ...(tenant.theme || {})
      };

      // We only return safe, public data here
      res.json({
        success: true,
        data: {
          id: tenant.id,
          name: tenant.name,
          cooperative_type: tenant.cooperative_type,
          theme,
          features: tenant.features || {
            landing_page: true,
            loans: true,
 layyah: true,
            expenses: true,
            profit_sharing: true,
            withdrawals: true
          }
        }
      });

    } catch (error) {
      console.error('Error fetching tenant config:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch tenant configuration' });
    }
  }

  /**
   * Update the tenant theme configuration.
   * Requires Admin permissions.
   */
  async updateTheme(req, res) {
    try {
      const tenant = req.tenant;
      const { theme } = req.body;

      if (!theme) {
        return res.status(400).json({ success: false, message: 'Theme payload is required' });
      }

      // Merge incoming theme with defaults to ensure consistency
      const updatedTheme = {
        ...DEFAULT_THEME,
        ...theme
      };

      // Update the theme column
      await Tenant.update({ theme: updatedTheme }, { where: { id: tenant.id } });

      res.json({
        success: true,
        message: 'Theme updated successfully',
        theme: updatedTheme
      });

    } catch (error) {
      console.error('Error updating tenant theme:', error);
      res.status(500).json({ success: false, message: 'Failed to update theme' });
    }
  }
}

module.exports = new TenantController();
