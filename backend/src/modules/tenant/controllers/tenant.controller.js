const { Tenant } = require('../../../../models');

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

      // We only return safe, public data here
      res.json({
        success: true,
        data: {
          id: tenant.id,
          name: tenant.name,
          cooperative_type: tenant.cooperative_type,
          theme: tenant.theme || {
            primaryColor: '#0055ff', // Default primary
            secondaryColor: '#ffffff',
            logoUrl: '/logo.png'
          },
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

      // Update the theme column
      await Tenant.update({ theme }, { where: { id: tenant.id } });

      res.json({
        success: true,
        message: 'Theme updated successfully',
        theme
      });

    } catch (error) {
      console.error('Error updating tenant theme:', error);
      res.status(500).json({ success: false, message: 'Failed to update theme' });
    }
  }
}

module.exports = new TenantController();
