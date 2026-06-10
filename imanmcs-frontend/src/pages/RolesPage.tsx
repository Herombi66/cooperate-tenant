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
      setRoles(rolesRes.data.roles || []);
      setPermissions(permsRes.data.permissions || []);
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
      const res = await api.post('/rbac/roles', { name: newRoleName });
      toast.success('Role created');
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
      toast.error('Failed to delete role');
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
      toast.error('Failed to update permissions');
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-600">Manage user roles and their access levels.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Role
        </button>
      </div>

      {isCreating && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-end space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">New Role Name</label>
            <input
              type="text"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Loan Officer"
            />
          </div>
          <button onClick={handleCreateRole} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            Save
          </button>
          <button onClick={() => setIsCreating(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
            Cancel
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {roles.map(role => (
          <div key={role.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Shield className="w-6 h-6 text-primary-500 mr-3" />
                <h3 className="text-xl font-bold text-gray-800">{role.name}</h3>
                {role.tenant_id === 'system' && (
                  <span className="ml-3 px-2 py-1 bg-gray-100 text-xs font-semibold rounded text-gray-600">System Role</span>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(role)}
                  className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded"
                >
                  <Edit className="w-5 h-5" />
                </button>
                {role.tenant_id !== 'system' && (
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {role.permissions && role.permissions.length > 0 ? (
                role.permissions.map(p => (
                  <span key={p.id} className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full border border-primary-100">
                    {p.name}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 italic text-sm">No permissions assigned</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Permissions: {editingRole.name}</h2>
              <button onClick={() => setEditingRole(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 capitalize border-b pb-2">{category}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {perms.map(perm => (
                      <label key={perm.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="mt-1 h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{perm.name}</p>
                          <p className="text-xs text-gray-500">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
              <button onClick={() => setEditingRole(null)} className="px-4 py-2 border rounded-lg hover:bg-white">
                Cancel
              </button>
              <button onClick={handleSavePermissions} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center">
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
