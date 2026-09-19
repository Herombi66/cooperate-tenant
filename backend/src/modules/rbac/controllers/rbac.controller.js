const { Role, Permission, PermissionCategory, RolePermission, User, UserRole } = require('../../../../models');

class RBACController {
  
  // Get all roles with their permissions
  async getRoles(req, res) {
    try {
      const roles = await Role.findAll({
        include: [{
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'name', 'category_id', 'description']
        }]
      });
      res.json({ success: true, roles, data: roles });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch roles' });
    }
  }

  // Create a new role
  async createRole(req, res) {
    try {
      const { name, description, permission_ids } = req.body;
      
      const role = await Role.create({
        name,
        description,
        is_system: false,
        tenant_id: req.tenantId || 'default'
      });

      if (permission_ids && permission_ids.length > 0) {
        const rolePermissions = permission_ids.map(id => ({
          role_id: role.id,
          permission_id: id
        }));
        await RolePermission.bulkCreate(rolePermissions);
      }

      res.status(201).json({ success: true, message: 'Role created successfully', data: role });
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ success: false, message: 'Failed to create role' });
    }
  }

  // Update a role and its permissions
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { name, description, permission_ids } = req.body;

      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      if (name) {
        await role.update({ name, description });
      }

      const pIds = permission_ids || req.body.permissionIds;
      if (pIds && Array.isArray(pIds)) {
        // Clear existing permissions
        await RolePermission.destroy({ where: { role_id: role.id } });
        
        // Add new permissions
        const rolePermissions = pIds.map(permId => ({
          role_id: role.id,
          permission_id: permId
        }));
        await RolePermission.bulkCreate(rolePermissions);
      }

      res.json({ success: true, message: 'Role updated successfully' });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ success: false, message: 'Failed to update role' });
    }
  }

  // Update permissions for a role
  async updateRolePermissions(req, res) {
    try {
      const { id } = req.params;
      const permissionIds = req.body.permissionIds || req.body.permission_ids || [];

      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      await RolePermission.destroy({ where: { role_id: role.id } });

      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permId => ({
          role_id: role.id,
          permission_id: permId
        }));
        await RolePermission.bulkCreate(rolePermissions);
      }

      res.json({ success: true, message: 'Permissions updated successfully' });
    } catch (error) {
      console.error('Error updating role permissions:', error);
      res.status(500).json({ success: false, message: 'Failed to update permissions' });
    }
  }

  // Delete a role
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

  // Get all permissions grouped by category
  async getPermissions(req, res) {
    try {
      const categories = await PermissionCategory.findAll({
        include: [{
          model: Permission,
          as: 'permissions'
        }]
      });

      // Also flatten permissions with their category name for frontend consumption
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

  // Assign role to user
  async assignUserRole(req, res) {
    try {
      const { user_id, role_id } = req.body;
      
      const user = await User.findByPk(user_id);
      const role = await Role.findByPk(role_id);

      if (!user || !role) {
        return res.status(404).json({ success: false, message: 'User or Role not found' });
      }

      await UserRole.findOrCreate({
        where: { user_id, role_id }
      });

      res.json({ success: true, message: 'Role assigned successfully' });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ success: false, message: 'Failed to assign role' });
    }
  }
}

module.exports = new RBACController();
