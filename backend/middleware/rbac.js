const { User, Role, Module, RolePermission, Permission } = require('../models');

/**
 * Helper to fetch a user's combined roles
 */
async function getUserRoleNames(user) {
  const roleNames = new Set();
  if (user.role) roleNames.add(user.role.toLowerCase());
  if (user.additional_role) roleNames.add(user.additional_role.toLowerCase());

  // Also check if user has many-to-many roles
  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach(r => roleNames.add(r.name.toLowerCase()));
  } else if (user.id) {
    try {
      const fullUser = await User.findByPk(user.id, {
        include: [{ model: Role, as: 'roles', attributes: ['name'] }]
      });
      if (fullUser?.roles) {
        fullUser.roles.forEach(r => roleNames.add(r.name.toLowerCase()));
      }
    } catch (e) {
      // Ignore if association lookup fails in non-relational test runs
    }
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
      if (roleNames.includes('super_admin') || roleNames.includes('admin')) {
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

      // Find all roles associated with user
      const roles = await Role.findAll({
        where: { name: roleNames },
        attributes: ['id', 'name']
      });

      if (!roles || roles.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Access denied. No active executive role assigned.`
        });
      }

      const roleIds = roles.map(r => r.id);

      // Check if any of user's roles has permission for this module
      // First try module_key lookup
      let hasPerm = await RolePermission.findOne({
        where: {
          role_id: roleIds,
          module_key: moduleKey,
          [permColumn]: true
        }
      });

      // If not found by key, try via Module association lookup
      if (!hasPerm) {
        const mod = await Module.findOne({ where: { key: moduleKey }, attributes: ['id'] });
        if (mod) {
          hasPerm = await RolePermission.findOne({
            where: {
              role_id: roleIds,
              module_id: mod.id,
              [permColumn]: true
            }
          });
        }
      }

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
        }]
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
