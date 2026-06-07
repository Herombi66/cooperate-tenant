
const tenantSettingsService = require('../modules/settings/services/tenant-settings.service');

/**
 * Tenant Context Middleware
 * Attaches tenantId and tenantSettings to the request object
 */
const tenantContext = async (req, res, next) => {
  try {
    // Extract tenantId from:
    // 1. Request header (x-tenant-id)
    // 2. Subdomain (future)
    // 3. Default to 'default'
    
    req.tenantId = req.headers['x-tenant-id'] || 'default';
    
    // Get tenant settings
    req.tenantSettings = await tenantSettingsService.get(req.tenantId);
    
    next();
  } catch (error) {
    console.error('Error in tenant context middleware:', error);
    // Fallback to defaults on error
    req.tenantId = 'default';
    req.tenantSettings = tenantSettingsService.getDefaultSettings();
    next();
  }
};

module.exports = tenantContext;
