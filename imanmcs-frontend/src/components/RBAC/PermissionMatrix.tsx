import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Check, X, Copy, RefreshCw, Save, AlertTriangle, 
  Search, Filter, CheckCircle2, Lock, ArrowRight, Info
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { usePermissions } from '../../contexts/PermissionContext';

interface Role {
  id: number;
  name: string;
  description: string;
  is_system: boolean;
}

interface ModuleItem {
  id: number;
  key: string;
  name: string;
  description: string;
  category: string;
  route_path: string;
  is_system: boolean;
}

interface MatrixEntry {
  role_id: number;
  module_id: number;
  module_key: string;
  can_read: boolean;
  can_write: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const FINANCIAL_MODULES = ['loans', 'contributions', 'savings', 'expenses', 'profit_distribution', 'accounts', 'repayments'];

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'System Administrator',
  chairman: 'Chairman',
  treasurer: 'Treasurer',
  secretary: 'General Secretary',
  assistant_secretary: 'Assistant Secretary',
  financial_secretary: 'Financial Secretary',
  auditor: 'Internal Auditor',
  state_auditor: 'State Auditor',
  pro: 'Public Relations Officer (PRO)',
  member: 'Standard Member'
};

export const PermissionMatrix: React.FC = () => {
  const { refreshPermissions } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [matrix, setMatrix] = useState<Record<number, Record<number, MatrixEntry>>>({});
  const [initialMatrix, setInitialMatrix] = useState<Record<number, Record<number, MatrixEntry>>>({});
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceRoleId, setCopySourceRoleId] = useState<number | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [pendingDeleteWarning, setPendingDeleteWarning] = useState<{ moduleName: string; proceed: () => void } | null>(null);

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rbac/matrix');
      if (res.data?.success) {
        setRoles(res.data.roles || []);
        setModules(res.data.modules || []);
        setMatrix(res.data.matrix || {});
        // Deep clone for dirty state comparison
        setInitialMatrix(JSON.parse(JSON.stringify(res.data.matrix || {})));

        if (!selectedRoleId && res.data.roles?.length > 0) {
          // Default selection to Chairman or first executive role
          const execRole = res.data.roles.find((r: Role) => r.name === 'chairman') || res.data.roles[0];
          setSelectedRoleId(execRole.id);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load permission matrix');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = useMemo(() => {
    return roles.find(r => r.id === selectedRoleId);
  }, [roles, selectedRoleId]);

  const isAdminRole = useMemo(() => {
    return selectedRole?.name === 'admin' || selectedRole?.name === 'super_admin';
  }, [selectedRole]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    modules.forEach(m => set.add(m.category || 'General'));
    return Array.from(set);
  }, [modules]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      const matchCat = categoryFilter === 'all' || m.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.key.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [modules, categoryFilter, searchQuery]);

  // Check dirty changes for selected role
  const dirtyCount = useMemo(() => {
    if (!selectedRoleId || !matrix[selectedRoleId] || !initialMatrix[selectedRoleId]) return 0;
    let count = 0;
    const current = matrix[selectedRoleId];
    const initial = initialMatrix[selectedRoleId];
    modules.forEach(m => {
      const c = current[m.id];
      const i = initial[m.id];
      if (c && i) {
        if (c.can_read !== i.can_read || c.can_write !== i.can_write || c.can_edit !== i.can_edit || c.can_delete !== i.can_delete) {
          count++;
        }
      }
    });
    return count;
  }, [selectedRoleId, matrix, initialMatrix, modules]);

  // Toggle single permission checkbox
  const handleToggle = (moduleId: number, field: 'can_read' | 'can_write' | 'can_edit' | 'can_delete') => {
    if (isAdminRole || !selectedRoleId) return;

    const mod = modules.find(m => m.id === moduleId);
    const currentValue = !!matrix[selectedRoleId]?.[moduleId]?.[field];
    const newValue = !currentValue;

    // Trigger warning if enabling delete on financial module
    if (field === 'can_delete' && newValue && mod && FINANCIAL_MODULES.includes(mod.key)) {
      setPendingDeleteWarning({
        moduleName: mod.name,
        proceed: () => {
          applyToggle(moduleId, field, newValue);
          setPendingDeleteWarning(null);
        }
      });
      return;
    }

    applyToggle(moduleId, field, newValue);
  };

  const applyToggle = (moduleId: number, field: 'can_read' | 'can_write' | 'can_edit' | 'can_delete', newValue: boolean) => {
    if (!selectedRoleId) return;
    setMatrix(prev => {
      const roleCopy = { ...(prev[selectedRoleId] || {}) };
      const entry = { ...(roleCopy[moduleId] || { role_id: selectedRoleId, module_id: moduleId, module_key: '', can_read: false, can_write: false, can_edit: false, can_delete: false }) };
      
      entry[field] = newValue;
      // Auto-enable read if write, edit or delete is enabled
      if (newValue && (field === 'can_write' || field === 'can_edit' || field === 'can_delete')) {
        entry.can_read = true;
      }

      roleCopy[moduleId] = entry;
      return { ...prev, [selectedRoleId]: roleCopy };
    });
  };

  // Bulk actions for currently filtered modules
  const handleBulkAction = (action: 'all' | 'read_only' | 'none') => {
    if (isAdminRole || !selectedRoleId) return;

    setMatrix(prev => {
      const roleCopy = { ...(prev[selectedRoleId] || {}) };
      filteredModules.forEach(m => {
        const entry = { ...(roleCopy[m.id] || { role_id: selectedRoleId, module_id: m.id, module_key: m.key, can_read: false, can_write: false, can_edit: false, can_delete: false }) };
        if (action === 'all') {
          entry.can_read = true;
          entry.can_write = true;
          entry.can_edit = true;
          entry.can_delete = true;
        } else if (action === 'read_only') {
          entry.can_read = true;
          entry.can_write = false;
          entry.can_edit = false;
          entry.can_delete = false;
        } else if (action === 'none') {
          entry.can_read = false;
          entry.can_write = false;
          entry.can_edit = false;
          entry.can_delete = false;
        }
        roleCopy[m.id] = entry;
      });
      return { ...prev, [selectedRoleId]: roleCopy };
    });
  };

  // Save changes
  const handleSave = async () => {
    if (!selectedRoleId || dirtyCount === 0) return;
    try {
      setSaving(true);
      const permissionsToSave = modules.map(m => {
        const entry = matrix[selectedRoleId]?.[m.id] || { can_read: false, can_write: false, can_edit: false, can_delete: false };
        return {
          module_id: m.id,
          module_key: m.key,
          can_read: entry.can_read,
          can_write: entry.can_write,
          can_edit: entry.can_edit,
          can_delete: entry.can_delete
        };
      });

      const res = await api.put(`/rbac/roles/${selectedRoleId}/module-permissions`, {
        permissions: permissionsToSave
      });

      if (res.data?.success) {
        toast.success(`Permissions for ${ROLE_DISPLAY_NAMES[selectedRole?.name || ''] || selectedRole?.name} updated successfully!`);
        // Refresh and update initialMatrix
        await fetchMatrix();
        try {
          await refreshPermissions();
        } catch (_) {}
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // Discard changes
  const handleDiscard = () => {
    if (!selectedRoleId) return;
    setMatrix(prev => ({
      ...prev,
      [selectedRoleId]: JSON.parse(JSON.stringify(initialMatrix[selectedRoleId] || {}))
    }));
    toast('Changes discarded', { icon: '↩️' });
  };

  // Copy permissions from source role
  const handleCopyPermissions = async () => {
    if (!copySourceRoleId || !selectedRoleId) return;
    try {
      const res = await api.post('/rbac/copy-permissions', {
        sourceRoleId: copySourceRoleId,
        targetRoleId: selectedRoleId
      });
      if (res.data?.success) {
        toast.success('Permissions copied successfully!');
        setShowCopyModal(false);
        await fetchMatrix();
        try {
          await refreshPermissions();
        } catch (_) {}
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to copy permissions');
    }
  };

  // Reset to system defaults
  const handleResetToDefaults = async () => {
    if (!selectedRoleId) return;
    try {
      setResetting(true);
      const res = await api.post('/rbac/reset-defaults', {
        roleId: selectedRoleId
      });
      if (res.data?.success) {
        toast.success(`Reset ${selectedRole?.name} permissions to defaults.`);
        setShowResetConfirmModal(false);
        await fetchMatrix();
        try {
          await refreshPermissions();
        } catch (_) {}
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset permissions');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mb-3" />
        <p className="text-gray-600 font-medium">Loading permission matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Role Selection Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Shield className="w-5 h-5 text-primary-600 mr-2" />
              Executive Role Permission Matrix
            </h2>
            <p className="text-sm text-gray-500">
              Control granular Read, Write, Edit, and Delete access across all cooperative modules.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isAdminRole && (
              <>
                <button
                  onClick={() => setShowCopyModal(true)}
                  className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                  title="Copy permissions from another role"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy From Role
                </button>
                <button
                  onClick={() => setShowResetConfirmModal(true)}
                  className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition"
                  title="Reset to system recommended defaults"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reset Defaults
                </button>
              </>
            )}
          </div>
        </div>

        {/* Executive Roles Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {roles.map(r => {
            const isSelected = r.id === selectedRoleId;
            const isAdm = r.name === 'admin' || r.name === 'super_admin';
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-500 ring-offset-1'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isAdm && <Lock className="w-3 h-3 text-amber-400" />}
                {ROLE_DISPLAY_NAMES[r.name] || r.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Admin Protected Notice */}
      {isAdminRole && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <strong>System Safeguard:</strong> The {ROLE_DISPLAY_NAMES[selectedRole?.name || ''] || selectedRole?.name} role possesses permanent, unrestricted administrative privileges across all modules. These privileges are protected and cannot be revoked to prevent administrative lockouts.
          </div>
        </div>
      )}

      {/* 2. Controls & Bulk Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Actions (Disabled for admin roles) */}
        {!isAdminRole && (
          <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
            <span className="text-xs font-semibold text-gray-500">Bulk Actions:</span>
            <button
              onClick={() => handleBulkAction('all')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Full Access
            </button>
            <button
              onClick={() => handleBulkAction('read_only')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
            >
              Read Only
            </button>
            <button
              onClick={() => handleBulkAction('none')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* 3. Permission Table Matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-2/5">Module</th>
                <th className="py-3.5 px-4 w-1/5">Category</th>
                <th className="py-3.5 px-3 text-center">Read</th>
                <th className="py-3.5 px-3 text-center">Write</th>
                <th className="py-3.5 px-3 text-center">Edit</th>
                <th className="py-3.5 px-3 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No modules match your search filter.
                  </td>
                </tr>
              ) : (
                filteredModules.map(mod => {
                  const isFinancial = FINANCIAL_MODULES.includes(mod.key);
                  const perm = matrix[selectedRoleId || 0]?.[mod.id] || {
                    can_read: isAdminRole,
                    can_write: isAdminRole,
                    can_edit: isAdminRole,
                    can_delete: isAdminRole
                  };

                  return (
                    <tr key={mod.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{mod.name}</span>
                          {!mod.is_system && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                              Custom
                            </span>
                          )}
                          {isFinancial && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                              Financial
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">{mod.description || mod.route_path}</p>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                          {mod.category || 'General'}
                        </span>
                      </td>

                      {/* Read Toggle */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isAdminRole ? true : !!perm.can_read}
                          disabled={isAdminRole}
                          onChange={() => handleToggle(mod.id, 'can_read')}
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer disabled:opacity-50"
                        />
                      </td>

                      {/* Write Toggle */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isAdminRole ? true : !!perm.can_write}
                          disabled={isAdminRole}
                          onChange={() => handleToggle(mod.id, 'can_write')}
                          className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                        />
                      </td>

                      {/* Edit Toggle */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isAdminRole ? true : !!perm.can_edit}
                          disabled={isAdminRole}
                          onChange={() => handleToggle(mod.id, 'can_edit')}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                        />
                      </td>

                      {/* Delete Toggle */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isAdminRole ? true : !!perm.can_delete}
                          disabled={isAdminRole}
                          onChange={() => handleToggle(mod.id, 'can_delete')}
                          className={`w-4 h-4 rounded border-gray-300 cursor-pointer disabled:opacity-50 ${
                            isFinancial ? 'text-red-600 focus:ring-red-500' : 'text-gray-700 focus:ring-gray-500'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Sticky Bottom Save Bar */}
        {!isAdminRole && dirtyCount > 0 && (
          <div className="bg-amber-50 border-t border-amber-200 px-6 py-3 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" />
              <span>You have <strong>{dirtyCount}</strong> unsaved permission change(s) for <strong>{ROLE_DISPLAY_NAMES[selectedRole?.name || ''] || selectedRole?.name}</strong>.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDiscard}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Financial Warning Modal */}
      {pendingDeleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900">Sensitive Financial Deletion Warning</h3>
            </div>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              You are granting <strong>DELETE</strong> permissions for <strong>{pendingDeleteWarning.moduleName}</strong> to the <strong>{ROLE_DISPLAY_NAMES[selectedRole?.name || ''] || selectedRole?.name}</strong> role.
              Deleting financial records carries significant compliance and auditing risks. Are you sure you wish to enable this?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingDeleteWarning(null)}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={pendingDeleteWarning.proceed}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow"
              >
                I Understand, Enable Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy From Role Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center">
              <Copy className="w-5 h-5 text-primary-600 mr-2" />
              Copy Permissions to {ROLE_DISPLAY_NAMES[selectedRole?.name || ''] || selectedRole?.name}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Select an existing role to copy all of its module permission settings to the current role.
            </p>

            <div className="space-y-3 mb-6">
              <label className="text-xs font-semibold text-gray-700">Source Role</label>
              <select
                value={copySourceRoleId || ''}
                onChange={(e) => setCopySourceRoleId(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white"
              >
                <option value="">-- Choose Role --</option>
                {roles
                  .filter(r => r.id !== selectedRoleId)
                  .map(r => (
                    <option key={r.id} value={r.id}>
                      {ROLE_DISPLAY_NAMES[r.name] || r.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCopyModal(false)}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCopyPermissions}
                disabled={!copySourceRoleId}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Copy Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Defaults Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900">Reset to System Defaults?</h3>
            </div>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              This will overwrite all custom permissions for <strong>{ROLE_DISPLAY_NAMES[selectedRole?.name || ''] || selectedRole?.name}</strong> and restore the cooperative standard configuration. This action will be recorded in the audit trail.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                disabled={resetting}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                disabled={resetting}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow"
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
