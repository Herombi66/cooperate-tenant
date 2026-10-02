import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShieldCheck, X, FolderPlus, RefreshCw, Search } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface ModuleItem {
  id: number;
  key: string;
  name: string;
  description: string;
  category: string;
  route_path: string;
  is_system: boolean;
}

export const ModuleManagementModal: React.FC<{ isOpen: boolean; onClose: () => void; onModuleUpdated?: () => void }> = ({
  isOpen,
  onClose,
  onModuleUpdated
}) => {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Add form state
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [category, setCategory] = useState('Operations');
  const [routePath, setRoutePath] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchModules();
    }
  }, [isOpen]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rbac/modules');
      if (res.data?.success) {
        setModules(res.data.modules || []);
      }
    } catch (err: any) {
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) {
      toast.error('Module name and unique key are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/rbac/modules', {
        name,
        key,
        category,
        route_path: routePath || `/${key.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')}`,
        description
      });

      if (res.data?.success) {
        toast.success(`Module '${name}' created successfully!`);
        setName('');
        setKey('');
        setDescription('');
        setRoutePath('');
        setIsAdding(false);
        await fetchModules();
        if (onModuleUpdated) onModuleUpdated();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create module');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteModule = async (id: number, modName: string) => {
    if (!window.confirm(`Are you sure you want to delete custom module '${modName}'? This will remove all associated role permissions.`)) {
      return;
    }

    try {
      const res = await api.delete(`/rbac/modules/${id}`);
      if (res.data?.success) {
        toast.success(`Module '${modName}' deleted successfully.`);
        await fetchModules();
        if (onModuleUpdated) onModuleUpdated();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete module');
    }
  };

  if (!isOpen) return null;

  const filtered = modules.filter(m => 
    !search || 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.key.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center">
              <FolderPlus className="w-5 h-5 text-primary-600 mr-2" />
              Cooperative System Modules
            </h3>
            <p className="text-xs text-gray-500">
              Manage existing modules and dynamically register new modules for the permission matrix.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search modules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4 mr-1" />
              {isAdding ? 'Cancel' : 'Add New Module'}
            </button>
          </div>

          {/* Add Module Form */}
          {isAdding && (
            <form onSubmit={handleCreateModule} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Register New Module</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Module Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Procurement & Inventory"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!key) {
                        setKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                      }
                    }}
                    required
                    className="w-full text-xs border border-gray-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Unique Key * (lowercase_underscore)</label>
                  <input
                    type="text"
                    placeholder="e.g. procurement"
                    value={key}
                    onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    required
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Operations">Operations</option>
                    <option value="Financial">Financial</option>
                    <option value="Administration">Administration</option>
                    <option value="Compliance">Compliance</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Route Path</label>
                  <input
                    type="text"
                    placeholder="e.g. /procurement"
                    value={routePath}
                    onChange={(e) => setRoutePath(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short description of what this module does"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow"
                >
                  {submitting ? 'Registering...' : 'Save Module'}
                </button>
              </div>
            </form>
          )}

          {/* Module List */}
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary-600" />
              Loading modules...
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {filtered.map(m => (
                <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50/70 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{m.name}</span>
                      <code className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                        {m.key}
                      </code>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-700">
                        {m.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{m.description || m.route_path}</p>
                  </div>

                  <div>
                    {m.is_system ? (
                      <span className="inline-flex items-center text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-200" title="Core System Module">
                        <ShieldCheck className="w-3 h-3 mr-1 text-emerald-500" />
                        System
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDeleteModule(m.id, m.name)}
                        className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition"
                        title="Delete custom module"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
