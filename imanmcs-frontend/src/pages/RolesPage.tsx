import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Loader, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Permission {
  id: number;
  name: string;
  category: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  tenant_id: string;
  permissions?: Permission[];
}

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/rbac/roles'),
        api.get('/rbac/permissions')
      ]);

      const fetchedRoles = rolesRes.data?.roles || rolesRes.data?.data || (Array.isArray(rolesRes.data) ? rolesRes.data : []);
      setRoles(fetchedRoles);

      // Handle both flattened array of permissions and category-grouped response
      let fetchedPerms: Permission[] = [];
      if (Array.isArray(permsRes.data?.permissions)) {
        fetchedPerms = permsRes.data.permissions;
      } else if (Array.isArray(permsRes.data?.data)) {
        // If data is array of categories containing permissions
        const dataArr = permsRes.data.data;
        if (dataArr.length > 0 && dataArr[0].permissions) {
          dataArr.forEach((cat: any) => {
            if (Array.isArray(cat.permissions)) {
              cat.permissions.forEach((p: any) => {
                fetchedPerms.push({
                  id: p.id,
                  name: p.name,
                  category: cat.name || 'General',
                  description: p.description
                });
              });
            }
          });
        } else {
          fetchedPerms = dataArr;
        }
      } else if (Array.isArray(permsRes.data)) {
        fetchedPerms = permsRes.data;
      }

      setPermissions(fetchedPerms);
    } catch (error: any) {
      toast.error('Failed to load roles and permissions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Role name is required');
      return;
    }
    try {
      await api.post('/rbac/roles', { name: newRoleName.trim() });
      toast.success('Role created successfully');
      setIsCreating(false);
      setNewRoleName('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create role');
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/rbac/roles/${id}`);
      toast.success('Role deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete role');
    }
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions?.map(p => p.id) || []);
  };

  const handleSavePermissions = async () => {
    if (!editingRole) return;
    try {
      await api.post(`/rbac/roles/${editingRole.id}/permissions`, {
        permissionIds: selectedPermissions
      });
      toast.success('Permissions updated');
      setEditingRole(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    }
  };

  const togglePermission = (permId: number) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter(id => id !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, perm) => {
    const cat = perm.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage user roles and their access levels.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary-700 transition w-fit shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Role
        </button>
      </div>

      {isCreating && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-6 rounded-lg border border-border shadow-sm flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1">New Role Name</label>
            <input
              type="text"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Loan Officer"
            />
          </div>
          <div className="flex space-x-2">
            <button onClick={handleCreateRole} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
              Save
            </button>
            <button onClick={() => setIsCreating(false)} className="bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {roles.map(role => (
          <div key={role.id} className="bg-card rounded-lg border border-border shadow-sm p-6 transition">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Shield className="w-6 h-6 text-primary-500 mr-3" />
                <h3 className="text-xl font-bold text-foreground capitalize">{role.name}</h3>
                {role.tenant_id === 'system' || (role as any).is_system ? (
                  <span className="ml-3 px-2 py-0.5 bg-muted text-xs font-semibold rounded text-muted-foreground border border-border">System Role</span>
                ) : null}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(role)}
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-800 p-2 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded transition"
                  title="Edit permissions"
                >
                  <Edit className="w-5 h-5" />
                </button>
                {role.tenant_id !== 'system' && !(role as any).is_system && (
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
                    title="Delete role"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {role.permissions && role.permissions.length > 0 ? (
                role.permissions.map(p => (
                  <span key={p.id} className="px-3 py-1 bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 text-sm rounded-full border border-primary-200 dark:border-primary-800">
                    {p.name}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground italic text-sm">No permissions assigned</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingRole && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-card border border-border text-foreground rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Edit Permissions: <span className="capitalize">{editingRole.name}</span></h2>
              <button onClick={() => setEditingRole(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category}>
                  <h3 className="text-base font-semibold text-foreground mb-3 capitalize border-b border-border pb-2">{category}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {perms.map(perm => (
                      <label key={perm.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="mt-1 h-4 w-4 text-primary-600 rounded border-border focus:ring-primary-500"
                        />
                        <div>
                          <p className="font-medium text-foreground text-sm">{perm.name}</p>
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end space-x-3 rounded-b-xl">
              <button onClick={() => setEditingRole(null)} className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition text-foreground">
                Cancel
              </button>
              <button onClick={handleSavePermissions} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center shadow-sm">
                <Save className="w-4 h-4 mr-2" />
                Save Permissions
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
