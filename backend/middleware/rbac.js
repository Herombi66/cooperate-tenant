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

  // Also check if user has many-to-many roles attached to user object
  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach(r => {
      const name = typeof r === 'string' ? r : r?.name;
      if (name) roleNames.add(name.toLowerCase().trim());
    });
  }

  // Check UserRole table for this specific user.id ONLY (do not pull from sibling accounts)
  if (user.id && UserRole) {
    try {
      const uRoles = await UserRole.findAll({
        where: { user_id: user.id },
        attributes: ['role_id'],
        skipTenant: true
      });
      const roleIds = uRoles.map(ur => ur.role_id).filter(Boolean);
      if (roleIds.length > 0 && Role) {
        const foundRoles = await Role.findAll({
          where: { id: roleIds },
          attributes: ['name'],
          skipTenant: true
        });
        for (const r of foundRoles) {
          if (r.name) roleNames.add(r.name.toLowerCase().trim());
        }
      }
    } catch (_) {}
  }

  return Array.from(roleNames);
}

// Safe boolean helper: handles boolean, integer 1, string '1', 'true', 't'
const isTrue = v => !!v && (v === true || v === 1 || v === '1' || v === 'true' || v === 't' || v === 'yes');
const norm = s => (s || '').toString().toLowerCase().trim().replace(/[-_\s]+/g, '');

/**
 * Check if a user has permission for a specific module and action
 * @param {object} user - User object from req.user
 * @param {string} moduleKey - Unique key of the module (e.g. 'loans', 'members', 'member_applications')
 * @param {'read'|'write'|'edit'|'update'|'create'|'delete'} action - The operation being performed
 */
async function hasPermissionForModule(user, moduleKey, action = 'read') {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'admin') return true;

  const roleNames = await getUserRoleNames(user);
  if (roleNames.includes('super_admin') || roleNames.includes('admin')) return true;

  const targetNorm = norm(moduleKey);

  // Map known aliases
  const moduleAliases = [targetNorm];
  if (targetNorm === 'memberapplications' || targetNorm === 'applications' || targetNorm === 'memberapplication') {
    moduleAliases.push('memberapplications', 'applications', 'memberapplication', 'members');
  } else if (targetNorm === 'members') {
    moduleAliases.push('members', 'memberapplications');
  } else if (targetNorm === 'loanapplications' || targetNorm === 'loans') {
    moduleAliases.push('loanapplications', 'loans');
  }

  try {
    const allRoles = await Role.findAll({ skipTenant: true });
    const matchedRoles = allRoles.filter(r => {
      const rNorm = norm(r.name);
      return roleNames.some(rn => norm(rn) === rNorm || (r.name || '').toLowerCase() === (rn || '').toLowerCase());
    });

    if (!matchedRoles || matchedRoles.length === 0) return false;
    const roleIds = matchedRoles.map(r => r.id);

    const allModules = await Module.findAll({ skipTenant: true });
    const targetModules = allModules.filter(m => {
      const kNorm = norm(m.key);
      const nNorm = norm(m.name);
      return moduleAliases.includes(kNorm) || moduleAliases.includes(nNorm);
    });
    const targetModuleIds = targetModules.map(m => m.id);

    const perms = await RolePermission.findAll({
      where: { role_id: roleIds },
      skipTenant: true
    });

    const matchingPerms = perms.filter(p => {
      const pKeyNorm = norm(p.module_key);
      return (p.module_id && targetModuleIds.includes(p.module_id)) || moduleAliases.includes(pKeyNorm);
    });

    if (matchingPerms.length > 0) {
      const act = (action || 'read').toLowerCase();
      if (act === 'read') {
        return matchingPerms.some(p => isTrue(p.can_read));
      } else if (['write', 'create', 'edit', 'update'].includes(act)) {
        return matchingPerms.some(p => isTrue(p.can_write) || isTrue(p.can_edit));
      } else if (act === 'delete') {
        return matchingPerms.some(p => isTrue(p.can_delete));
      }
    }

    // Fallback: If executive officer role has default permissions for secretarial or administrative workflows
    const isExecutive = roleNames.some(rn => 
      ['chairman', 'secretary', 'assistant_secretary', 'treasurer', 'financial_secretary', 'auditor', 'pro'].includes(rn)
    );

    if (isExecutive && (moduleAliases.includes('memberapplications') || moduleAliases.includes('applications') || moduleAliases.includes('members'))) {
      if (roleNames.includes('assistant_secretary') || roleNames.includes('secretary') || roleNames.includes('chairman')) {
        return true;
      }
    }

    return false;
  } catch (err) {
    console.warn(`[hasPermissionForModule] Error checking '${moduleKey}' (${action}):`, err);
    return false;
  }
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

      const hasPerm = await hasPermissionForModule(req.user, moduleKey, action);

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
  getUserRoleNames,
  hasPermissionForModule
};
