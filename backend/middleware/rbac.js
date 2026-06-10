const { User, Role, Permission } = require('../models');

/**
 * Middleware to check if a user has a specific permission.
 * Assumes req.user is already populated by authenticateToken.
 */
const can = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // If user object doesn't have roles preloaded, fetch them
      let user = req.user;
      if (!user.roles) {
        user = await User.findByPk(req.user.id, {
          include: [{
            model: Role,
            as: 'roles',
            include: [{
              model: Permission,
              as: 'permissions'
            }]
          }]
        });
        req.user = user;
      }

      // Check if user is super_admin
      if (user.role === 'super_admin' || user.roles?.some(r => r.name === 'super_admin')) {
        return next();
      }

      // Check if any of the user's roles have the required permission
      const hasPermission = user.roles?.some(role => 
        role.permissions?.some(p => p.name === permissionName)
      );

      if (hasPermission) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permissionName}`
      });

    } catch (error) {
      console.error('❌ [RBAC Middleware] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during permission check'
      });
    }
  };
};

module.exports = {
  can
};
