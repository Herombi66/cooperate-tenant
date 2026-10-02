/**
 * Module Access Middleware
 * Verifies that the requested functional module is enabled in cooperative settings
 */
const requireModule = (moduleKey) => {
  return (req, res, next) => {
    const enabledModules = req.tenantSettings?.enabled_modules;
    
    // If enabled_modules is explicitly configured and this module is disabled (false), block access
    if (enabledModules && enabledModules[moduleKey] === false) {
      const moduleName = String(moduleKey).replace(/_/g, ' ');
      return res.status(403).json({
        success: false,
        code: 'MODULE_DISABLED',
        message: `The ${moduleName} module is currently disabled in this cooperative's settings.`
      });
    }

    next();
  };
};

module.exports = {
  requireModule
};
