const { 
  Role, 
  Module, 
  RolePermission, 
  Permission, 
  PermissionCategory, 
  User, 
  UserRole,
  ActivityLog 
} = require('../../../../models');
const { seedModulesAndRBAC } = require('../../../../db/seedModulesAndRBAC');
const { getUserRoleNames } = require('../../../../middleware/rbac');

class RBACController {
  
  // 1. Get complete permission matrix
  async getMatrix(req, res) {
    try {
      // Ensure seed has run so no roles or modules are missing
      await seedModulesAndRBAC();

      const roles = await Role.findAll({
        order: [['id', 'ASC']]
      });

      const modules = await Module.findAll({
        order: [['category', 'ASC'], ['name', 'ASC']]
      });

      const rolePermissions = await RolePermission.findAll();

      // Build structured matrix map: roleId -> moduleId -> { can_read, can_write, can_edit, can_delete }
      const matrix = {};
      roles.forEach(r => {
        matrix[r.id] = {};
        modules.forEach(m => {
          matrix[r.id][m.id] = {
            role_id: r.id,
            module_id: m.id,
            module_key: m.key,
            can_read: r.name === 'admin' || r.name === 'super_admin',
            can_write: r.name === 'admin' || r.name === 'super_admin',
            can_edit: r.name === 'admin' || r.name === 'super_admin',
            can_delete: r.name === 'admin' || r.name === 'super_admin'
          };
        });
      });

      rolePermissions.forEach(rp => {
        if (matrix[rp.role_id] && matrix[rp.role_id][rp.module_id]) {
          matrix[rp.role_id][rp.module_id] = {
            id: rp.id,
            role_id: rp.role_id,
            module_id: rp.module_id,
            module_key: rp.module_key,
            can_read: rp.can_read,
            can_write: rp.can_write,
            can_edit: rp.can_edit,
            can_delete: rp.can_delete
          };
        }
      });

      res.json({
        success: true,
        roles,
        modules,
        matrix
      });
    } catch (error) {
      console.error('❌ [RBAC Controller] Error getting matrix:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve permission matrix' });
    }
  }

  // 2. Update permissions for a specific role across modules
  async updateRoleModulePermissions(req, res) {
    try {
      const { id } = req.params; // roleId
      const { permissions } = req.body; // array of { module_id, can_read, can_write, can_edit, can_delete }

      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      // Safeguard: Admin / Super Admin cannot be downgraded or restricted
      if (role.name === 'admin' || role.name === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Security Violation: Administrator privileges cannot be modified or downgraded.'
        });
      }

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ success: false, message: 'Permissions array is required' });
      }

      // Capture previous permissions for audit trail
      const previousPerms = await RolePermission.findAll({ where: { role_id: role.id } });
      const prevMap = {};
      previousPerms.forEach(p => {
        prevMap[p.module_id] = { r: p.can_read, w: p.can_write, e: p.can_edit, d: p.can_delete };
      });

      const auditChanges = [];

      for (const item of permissions) {
        const moduleId = item.module_id;
        const mod = await Module.findByPk(moduleId);
        if (!mod) continue;

        const prev = prevMap[moduleId] || { r: false, w: false, e: false, d: false };
        const next = {
          r: !!item.can_read,
          w: !!item.can_write,
          e: !!item.can_edit,
          d: !!item.can_delete
        };

        const changed = prev.r !== next.r || prev.w !== next.w || prev.e !== next.e || prev.d !== next.d;

        let [record] = await RolePermission.findOrCreate({
          where: { role_id: role.id, module_id: moduleId },
          defaults: {
            tenant_id: role.tenant_id || 'default',
            module_key: mod.key,
            can_read: next.r,
            can_write: next.w,
            can_edit: next.e,
            can_delete: next.d
          }
        });

        if (changed) {
          await record.update({
            module_key: mod.key,
            can_read: next.r,
            can_write: next.w,
            can_edit: next.e,
            can_delete: next.d
          });

          auditChanges.push({
            module: mod.name,
            moduleKey: mod.key,
            previous: prev,
            updated: next
          });
        }
      }

      // Record in ActivityLog Audit Trail
      if (auditChanges.length > 0) {
        await ActivityLog.logActivity(
          req.user,
          'update_role_permissions',
          'rbac',
          role.id,
          `Updated permissions for role '${role.name}' across ${auditChanges.length} module(s).`,
          {
            roleName: role.name,
            changesCount: auditChanges.length,
            changes: auditChanges
          },
          req
        );
      }

      res.json({
        success: true,
        message: `Permissions for ${role.name} updated successfully`,
        updatedCount: auditChanges.length
      });
    } catch (error) {
      console.error('❌ [RBAC Controller] Error updating role permissions:', error);
      res.status(500).json({ success: false, message: 'Failed to update role permissions' });
    }
  }

  // 3. Bulk update permissions
  async bulkUpdatePermissions(req, res) {
    try {
      const { updates } = req.body; // array of { role_id, module_id, can_read, can_write, can_edit, can_delete }
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ success: false, message: 'Updates array is required' });
      }

      let modifiedCount = 0;
      for (const item of updates) {
        const role = await Role.findByPk(item.role_id);
        if (!role || role.name === 'admin' || role.name === 'super_admin') continue;

        const mod = await Module.findByPk(item.module_id);
        if (!mod) continue;

        let [record] = await RolePermission.findOrCreate({
          where: { role_id: role.id, module_id: mod.id },
          defaults: {
            tenant_id: role.tenant_id || 'default',
            module_key: mod.key,
            can_read: !!item.can_read,
            can_write: !!item.can_write,
            can_edit: !!item.can_edit,
            can_delete: !!item.can_delete
          }
        });

        await record.update({
          module_key: mod.key,
          can_read: !!item.can_read,
          can_write: !!item.can_write,
          can_edit: !!item.can_edit,
          can_delete: !!item.can_delete
        });
        modifiedCount++;
      }

      await ActivityLog.logActivity(
        req.user,
        'bulk_update_permissions',
        'rbac',
        null,
        `Bulk updated permissions across ${modifiedCount} module assignment(s).`,
        { modifiedCount },
        req
      );

      res.json({ success: true, message: `Successfully updated ${modifiedCount} permission entries.` });
    } catch (error) {
      console.error('❌ [RBAC Controller] Error bulk updating permissions:', error);
      res.status(500).json({ success: false, message: 'Failed to bulk update permissions' });
    }
  }

  // 4. Copy permissions from one role to another
  async copyRolePermissions(req, res) {
    try {
      const { sourceRoleId, targetRoleId } = req.body;
      const sourceRole = await Role.findByPk(sourceRoleId);
      const targetRole = await Role.findByPk(targetRoleId);

      if (!sourceRole || !targetRole) {
        return res.status(404).json({ success: false, message: 'Source or Target role not found' });
      }

      if (targetRole.name === 'admin' || targetRole.name === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Administrator roles cannot be overwritten.'
        });
      }

      const sourcePerms = await RolePermission.findAll({ where: { role_id: sourceRole.id } });

      for (const sp of sourcePerms) {
        let [targetPerm] = await RolePermission.findOrCreate({
          where: { role_id: targetRole.id, module_id: sp.module_id },
          defaults: {
            tenant_id: targetRole.tenant_id || 'default',
            module_key: sp.module_key,
            can_read: sp.can_read,
            can_write: sp.can_write,
            can_edit: sp.can_edit,
            can_delete: sp.can_delete
          }
        });

        await targetPerm.update({
          module_key: sp.module_key,
          can_read: sp.can_read,
          can_write: sp.can_write,
          can_edit: sp.can_edit,
          can_delete: sp.can_delete
        });
      }

      await ActivityLog.logActivity(
        req.user,
        'copy_role_permissions',
        'rbac',
        targetRole.id,
        `Copied all permissions from role '${sourceRole.name}' to '${targetRole.name}'.`,
        { sourceRole: sourceRole.name, targetRole: targetRole.name },
        req
      );

      res.json({
        success: true,
        message: `Successfully copied permissions from ${sourceRole.name} to ${targetRole.name}.`
      });
    } catch (error) {
      console.error('❌ [RBAC Controller] Error copying permissions:', error);
      res.status(500).json({ success: false, message: 'Failed to copy permissions' });
    }
  }

  // 5. Reset permissions to system defaults
  async resetToDefaults(req, res) {
    try {
      const { roleId } = req.body;
      let targetRoleName = null;

      if (roleId) {
        const role = await Role.findByPk(roleId);
        if (!role) {
          return res.status(404).json({ success: false, message: 'Role not found' });
        }
        targetRoleName = role.name;
      }

      await seedModulesAndRBAC(targetRoleName);

      await ActivityLog.logActivity(
        req.user,
        'reset_permissions_default',
        'rbac',
        roleId || null,
        targetRoleName 
          ? `Reset permissions for role '${targetRoleName}' to system defaults.`
          : `Reset all executive roles to system default permissions.`,
        { targetRole: targetRoleName || 'ALL' },
        req
      );

      res.json({
        success: true,
        message: targetRoleName 
          ? `Permissions for ${targetRoleName} reset to system defaults successfully.`
          : 'All role permissions reset to system defaults successfully.'
      });
    } catch (error) {
      console.error('❌ [RBAC Controller] Error resetting permissions:', error);
      res.status(500).json({ success: false, message: 'Failed to reset permissions' });
    }
  }

  // 6. Get all modules
  async getModules(req, res) {
    try {
      const { search, category } = req.query;
      const where = {};
      if (category && category !== 'all') {
        where.category = category;
      }

      const modules = await Module.findAll({
        where,
        order: [['category', 'ASC'], ['name', 'ASC']]
      });

      let filtered = modules;
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = modules.filter(m => 
          m.name.toLowerCase().includes(q) || 
          m.key.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q))
        );
      }

      res.json({ success: true, modules: filtered, data: filtered });
    } catch (error) {
      console.error('❌ [RBAC Controller] Error getting modules:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch modules' });
    }
  }

  // 7. Create a new custom module dynamically without modifying code
  async createModule(req, res) {
    try {
      const { key, name, description, category, route_path } = req.body;

      if (!key || !name) {
        return res.status(400).json({ success: false, message: 'Module key and name are required' });
      }

      const formattedKey = key.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

      const existing = await Module.findOne({ where: { key: formattedKey } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Module with key '${formattedKey}' already exists` });
      }

      const module = await Module.create({
        key: formattedKey,
        name: name.trim(),
        description: description?.trim() || null,
        category: category?.trim() || 'General',
        route_path: route_path?.trim() || `/${formattedKey}`,
        is_system: false,
        tenant_id: req.tenantId || 'default'
      });

      // Automatically provision default permissions for all roles
      const roles = await Role.findAll();
      const newPerms = roles.map(role => {
        const isAdmin = role.name === 'admin' || role.name === 'super_admin';
        return {
          role_id: role.id,
          module_id: module.id,
          module_key: module.key,
          tenant_id: role.tenant_id || 'default',
          can_read: isAdmin,
          can_write: isAdmin,
          can_edit: isAdmin,
          can_delete: isAdmin
        };
      });

      await RolePermission.bulkCreate(newPerms);

      await ActivityLog.logActivity(
        req.user,
        'create_module',
        'rbac',
        module.id,
        `Created new custom module '${module.name}' (${module.key}).`,
        { moduleKey: module.key, name: module.name, category: module.category },
        req
      );

      res.status(201).json({
        success: true,
        message: 'Module created successfully',
        module
      });
    } catch (error) {
      console.error('❌ [RBAC Controller] Error creating module:', error);
      res.status(500).json({ success: false, message: 'Failed to create module' });
    }
  }

  // 8. Delete a custom module
  async deleteModule(req, res) {
    try {
      const { id } = req.params;
      const module = await Module.findByPk(id);

      if (!module) {
        return res.status(404).json({ success: false, message: 'Module not found' });
      }

      if (module.is_system) {
        return res.status(403).json({
          success: false,
          message: 'System modules are core to cooperative operations and cannot be deleted.'
        });
      }

      await RolePermission.destroy({ where: { module_id: module.id } });
      await module.destroy();

      await ActivityLog.logActivity(
        req.user,
        'delete_module',
        'rbac',
        module.id,
        `Deleted custom module '${module.name}' (${module.key}).`,
        { moduleKey: module.key, name: module.name },
        req
      );

      res.json({ success: true, message: `Module '${module.name}' deleted successfully.` });
    } catch (error) {
      console.error('❌ [RBAC Controller] Error deleting module:', error);
      res.status(500).json({ success: false, message: 'Failed to delete module' });
    }
  }

  // 9. Get current logged in user's permissions map
  async getMyPermissions(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const roleNames = await getUserRoleNames(req.user);
      const isAdmin = roleNames.includes('super_admin') || roleNames.includes('admin');

      const allModules = await Module.findAll({
        attributes: ['id', 'key', 'name', 'category', 'route_path']
      });

      const permissionsMap = {};

      if (isAdmin) {
        allModules.forEach(m => {
          permissionsMap[m.key] = {
            read: true,
            write: true,
            edit: true,
            delete: true,
            moduleName: m.name,
            routePath: m.route_path
          };
        });
      } else {
        // Query user's roles
        const roles = await Role.findAll({
          where: { name: roleNames },
          attributes: ['id', 'name']
        });

        const roleIds = roles.map(r => r.id);
        const rolePermissions = await RolePermission.findAll({
          where: { role_id: roleIds }
        });

        allModules.forEach(m => {
          // Check if any role grants read, write, edit, delete
          const matchingPerms = rolePermissions.filter(rp => 
            rp.module_id === m.id || rp.module_key === m.key
          );

          const canRead = matchingPerms.some(p => p.can_read);
          const canWrite = matchingPerms.some(p => p.can_write);
          const canEdit = matchingPerms.some(p => p.can_edit);
          const canDelete = matchingPerms.some(p => p.can_delete);

          permissionsMap[m.key] = {
            read: canRead,
            write: canWrite,
            edit: canEdit,
            delete: canDelete,
            moduleName: m.name,
            routePath: m.route_path
          };
        });
      }

      res.json({
        success: true,
        roles: roleNames,
        isAdmin,
        permissions: permissionsMap
      });
    } catch (error) {
      console.error('❌ [RBAC Controller] Error getting user permissions:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user permissions' });
    }
  }

  // 10. Get RBAC Audit Logs
  async getRbacAuditLogs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const { count, rows: logs } = await ActivityLog.findAndCountAll({
        where: { resource_type: 'rbac' },
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      res.json({
        success: true,
        logs,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('❌ [RBAC Controller] Error getting audit logs:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
    }
  }

  // ================= BACKWARD COMPATIBLE METHODS =================

  async getRoles(req, res) {
    try {
      const roles = await Role.findAll({
        include: [{
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'name', 'category_id', 'description'],
          required: false
        }],
        order: [['id', 'ASC']]
      });
      res.json({ success: true, roles, data: roles });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch roles' });
    }
  }

  async createRole(req, res) {
    try {
      const { name, description } = req.body;
      const formattedName = name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

      const existing = await Role.findOne({ where: { name: formattedName } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Role '${formattedName}' already exists` });
      }

      const role = await Role.create({
        name: formattedName,
        description,
        is_system: false,
        tenant_id: req.tenantId || 'default'
      });

      // Provision default blank permissions for all modules
      const modules = await Module.findAll();
      const perms = modules.map(m => ({
        role_id: role.id,
        module_id: m.id,
        module_key: m.key,
        tenant_id: role.tenant_id || 'default',
        can_read: false,
        can_write: false,
        can_edit: false,
        can_delete: false
      }));
      await RolePermission.bulkCreate(perms);

      res.status(201).json({ success: true, message: 'Role created successfully', data: role });
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ success: false, message: 'Failed to create role' });
    }
  }

  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      if (role.is_system && name && name !== role.name) {
        return res.status(403).json({ success: false, message: 'Cannot rename system role' });
      }

      await role.update({ description });
      res.json({ success: true, message: 'Role updated successfully' });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ success: false, message: 'Failed to update role' });
    }
  }

  async deleteRole(req, res) {
    try {
      const { id } = req.params;
      const role = await Role.findByPk(id);

      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      if (role.is_system) {
        return res.status(403).json({ success: false, message: 'Cannot delete a system role' });
      }

      await RolePermission.destroy({ where: { role_id: role.id } });
      await UserRole.destroy({ where: { role_id: role.id } });
      await role.destroy();

      res.json({ success: true, message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ success: false, message: 'Failed to delete role' });
    }
  }

  async getPermissions(req, res) {
    try {
      const categories = await PermissionCategory.findAll({
        include: [{
          model: Permission,
          as: 'permissions'
        }]
      });

      const flatPermissions = [];
      categories.forEach(cat => {
        if (cat.permissions && Array.isArray(cat.permissions)) {
          cat.permissions.forEach(p => {
            flatPermissions.push({
              id: p.id,
              name: p.name,
              category: cat.name,
              category_id: p.category_id,
              description: p.description
            });
          });
        }
      });

      res.json({
        success: true,
        data: categories,
        categories,
        permissions: flatPermissions
      });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
    }
  }

  async assignUserRole(req, res) {
    try {
      const { user_id, role_id } = req.body;
      const user = await User.findByPk(user_id);
      const role = await Role.findByPk(role_id);

      if (!user || !role) {
        return res.status(404).json({ success: false, message: 'User or Role not found' });
      }

      await UserRole.findOrCreate({
        where: { user_id, role_id },
        defaults: { tenant_id: user.tenant_id || 'default' }
      });

      await ActivityLog.logActivity(
        req.user,
        'assign_user_role',
        'rbac',
        user.id,
        `Assigned role '${role.name}' to user '${user.name || user.email}'.`,
        { userId: user.id, roleName: role.name },
        req
      );

      res.json({ success: true, message: 'Role assigned successfully' });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ success: false, message: 'Failed to assign role' });
    }
  }
}

module.exports = new RBACController();
