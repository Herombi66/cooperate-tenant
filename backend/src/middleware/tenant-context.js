const tenantSettingsService = require('../modules/settings/services/tenant-settings.service');
const { Tenant, User } = require('../../models');
const tenantStorage = require('./tenant-storage');
const jwt = require('jsonwebtoken');

/**
 * Tenant Context Middleware
 * Resolves the tenant based on custom domain, subdomain, or header
 * Attaches tenant and tenantSettings to the request object
 */
const tenantContext = async (req, res, next) => {
  try {
    const hostname = req.hostname;
    let tenant = null;

    // 1. Try to find by Custom Domain (e.g., coop1.com)
    tenant = await Tenant.findOne({ where: { domain: hostname, status: 'active' } });

    // 2. Try to find by Subdomain if not found (e.g., coop1.imanmcs.com -> coop1)
    if (!tenant) {
      // Assuming the main app runs on imanmcs.com or similar
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        const subdomain = parts[0];
        tenant = await Tenant.findOne({ where: { subdomain, status: 'active' } });
      }
    }

    // 3. Fallback to Header or Query param (used for local testing and preview)
    if (!tenant) {
      const headerTenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'] || req.query?.tenant;
      if (headerTenantId) {
        tenant = await Tenant.findOne({ where: { id: headerTenantId, status: 'active' } });
      }
    }

    // 3b. Fallback to JWT Authorization token if user is logged in
    if (!tenant && req.headers['authorization']) {
      try {
        const parts = req.headers['authorization'].split(' ');
        const token = parts.length === 2 ? parts[1] : null;
        if (token && process.env.JWT_SECRET) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded?.tenant_id) {
            tenant = await Tenant.findOne({ where: { id: decoded.tenant_id, status: 'active' } });
          } else if (decoded?.id) {
            const authUser = await User.findByPk(decoded.id);
            if (authUser?.tenant_id) {
              tenant = await Tenant.findOne({ where: { id: authUser.tenant_id, status: 'active' } });
            }
          }
        }
      } catch (jwtErr) {
        // Auth middleware will handle invalid tokens later
      }
    }

    // 4. Ultimate Fallback to Default Tenant
    if (!tenant) {
      tenant = await Tenant.findOne({ where: { id: 'default' } });
      
      if (!tenant) {
        // Create the default tenant if it doesn't exist (seed safeguard)
        tenant = await Tenant.create({
          id: 'default',
          name: 'Default Cooperative',
          cooperative_type: 'islamic',
          status: 'active'
        });
      }
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;
    
    // Get tenant settings
    req.tenantSettings = await tenantSettingsService.get(req.tenantId);
    
    tenantStorage.run(tenant.id, () => {
      next();
    });
  } catch (error) {
    console.error('Error in tenant context middleware:', error);
    // Fallback to defaults on error
    req.tenantId = 'default';
    req.tenant = { id: 'default', cooperative_type: 'islamic' };
    req.tenantSettings = tenantSettingsService.getDefaultSettings();
    tenantStorage.run('default', () => {
      next();
    });
  }
};

module.exports = tenantContext;
