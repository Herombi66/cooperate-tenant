const { User, Role, Module, RolePermission, Permission, UserRole } = require('../models');

/**
 * Helper to fetch a user's combined roles
 */
async function getUserRoleNames(user) {
  if (!user) return [];

  const roleNames = new Set();
  if (user.role) {
    roleNames.add(user.role.toLowerCase().trim());
  }
  if (user.additional_role) {
    roleNames.add(user.additional_role.toLowerCase().trim());
  }

  // Also check if user has many-to-many roles
  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach(r => {
      const name = typeof r === 'string' ? r : r.name;
      if (name) roleNames.add(name.toLowerCase().trim());
    });
  }

  // Check UserRole table for this user.id
  if (user.id && UserRole) {
    try {
      const uRoles = await UserRole.findAll({
        where: { user_id: user.id },
        include: [{ model: Role, attributes: ['name'] }],
        skipTenant: true
      });
      for (const ur of uRoles) {
        if (ur.Role?.name) {
          roleNames.add(ur.Role.name.toLowerCase().trim());
        }
      }
    } catch (_) {}
  }

  // CRITICAL: Look up sibling accounts if membership_application_id exists!
  // In this system, executive roles (e.g. assistant_secretary, secretary, etc.)
  // are created as separate user accounts tied to the same membership_application_id,
  // or assigned via additional roles.
  if (user.membership_application_id) {
    try {
      const siblingAccounts = await User.findAll({
        where: { 
          membership_application_id: user.membership_application_id,
          status: 'active'
        },
        attributes: ['id', 'role', 'additional_role'],
        skipTenant: true
      });

      for (const acc of siblingAccounts) {
        if (acc.role) roleNames.add(acc.role.toLowerCase().trim());
        if (acc.additional_role) roleNames.add(acc.additional_role.toLowerCase().trim());

        if (UserRole && acc.id !== user.id) {
          try {
            const accRoles = await UserRole.findAll({
              where: { user_id: acc.id },
              include: [{ model: Role, attributes: ['name'] }],
              skipTenant: true
            });
            for (const ur of accRoles) {
              if (ur.Role?.name) {
                roleNames.add(ur.Role.name.toLowerCase().trim());
              }
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  return Array.from(roleNames);
}

/**
 * Middleware to check dynamic module permission: Read, Write, Edit, Delete
 * @param {string} moduleKey - Unique key of the module (e.g. 'loans', 'members', 'contributions')
 * @param {'read'|'write'|'edit'|'delete'} action - The operation being performed
 */
const requireModulePermission = (moduleKey, action = 'read') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const roleNames = await getUserRoleNames(req.user);

      // Super Admin and Admin always have full system control and cannot be restricted
      if (roleNames.includes('super_admin') || roleNames.includes('admin') || req.user.role === 'admin' || req.user.role === 'super_admin') {
        return next();
      }

      // Format action column
      const colMap = {
        read: 'can_read',
        write: 'can_write',
        create: 'can_write',
        edit: 'can_edit',
        update: 'can_edit',
        delete: 'can_delete'
      };

      const permColumn = colMap[action.toLowerCase()] || 'can_read';

      // Find all roles associated with user (case- and format-insensitive)
      const allRoles = await Role.findAll({ skipTenant: true });
      const matchedRoles = allRoles.filter(r => {
        const dbNameNorm = (r.name || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
        return roleNames.some(rn => {
          const rnNorm = (rn || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
          return dbNameNorm === rnNorm || (r.name || '').toLowerCase() === (rn || '').toLowerCase();
        });
      });

      if (!matchedRoles || matchedRoles.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Access denied. No active executive role assigned.`
        });
      }

      const roleIds = matchedRoles.map(r => r.id);

      // Find the module
      const allModules = await Module.findAll({ skipTenant: true });
      const targetModule = allModules.find(m => 
        (m.key && m.key.toLowerCase() === moduleKey.toLowerCase()) ||
        (m.name && m.name.toLowerCase().replace(/[\s-]+/g, '_') === moduleKey.toLowerCase())
      );
      const targetModuleId = targetModule ? targetModule.id : null;

      // Check RolePermission
      const perms = await RolePermission.findAll({
        where: { role_id: roleIds },
        skipTenant: true
      });

      const matchingPerms = perms.filter(p => 
        (p.module_key && p.module_key.toLowerCase() === moduleKey.toLowerCase()) ||
        (targetModuleId && p.module_id === targetModuleId)
      );

      const hasPerm = matchingPerms.some(p => p[permColumn] === true);

      if (hasPerm) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Access denied. Insufficient permissions for module '${moduleKey}' (${action.toUpperCase()}).`
      });

    } catch (error) {
      console.error(`❌ [RBAC Module Check] Error checking '${moduleKey}' (${action}):`, error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during permission check'
      });
    }
  };
};

/**
 * Convenient shorthand helpers
 */
const canRead = (moduleKey) => requireModulePermission(moduleKey, 'read');
const canWrite = (moduleKey) => requireModulePermission(moduleKey, 'write');
const canEdit = (moduleKey) => requireModulePermission(moduleKey, 'edit');
const canDelete = (moduleKey) => requireModulePermission(moduleKey, 'delete');

/**
 * Legacy permission name checker (e.g. 'manage_roles', 'create_user')
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

      const roleNames = await getUserRoleNames(req.user);

      if (roleNames.includes('super_admin') || roleNames.includes('admin')) {
        return next();
      }

      // Check legacy permission associations if needed
      const roles = await Role.findAll({
        where: { name: roleNames },
        include: [{
          model: Permission,
          as: 'permissions',
          where: { name: permissionName },
          required: false
        }],
        skipTenant: true
      });

      const hasLegacy = roles.some(r => r.permissions && r.permissions.length > 0);
      if (hasLegacy) {
        return next();
      }

      // Map common legacy permission names to module actions
      const legacyToModule = {
        manage_roles: { module: 'user_management', action: 'edit' },
        manage_settings: { module: 'settings', action: 'edit' },
        view_users: { module: 'members', action: 'read' },
        create_user: { module: 'members', action: 'write' },
        edit_user: { module: 'members', action: 'edit' },
        delete_user: { module: 'members', action: 'delete' },
        view_loans: { module: 'loans', action: 'read' },
        apply_loan: { module: 'loan_applications', action: 'write' },
        approve_loan: { module: 'loan_applications', action: 'edit' },
        disburse_loan: { module: 'loans', action: 'edit' },
        view_contributions: { module: 'contributions', action: 'read' },
        record_contribution: { module: 'contributions', action: 'write' },
        view_expenses: { module: 'expenses', action: 'read' },
        record_expense: { module: 'expenses', action: 'write' },
        approve_expense: { module: 'expenses', action: 'edit' }
      };

      const mapped = legacyToModule[permissionName];
      if (mapped) {
        return requireModulePermission(mapped.module, mapped.action)(req, res, next);
      }

      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permissionName}`
      });

    } catch (error) {
      console.error('❌ [RBAC Legacy Middleware] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during permission check'
      });
    }
  };
};

module.exports = {
  requireModulePermission,
  canRead,
  canWrite,
  canEdit,
  canDelete,
  can,
  getUserRoleNames
};
