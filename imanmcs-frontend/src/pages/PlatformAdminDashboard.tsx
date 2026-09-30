import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Settings, Globe, Shield, LogOut, CheckCircle, XCircle, Layout,
  Activity, Users, Box, CreditCard, Heart, Receipt, TrendingUp, Percent,
  Paintbrush, Trash2, ExternalLink, Sliders, Copy, Check, Key, Lock,
  Eye, EyeOff, RefreshCw, Loader, AlertCircle, CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { SuperAdminCooperativeSettingsModal } from '../components/SuperAdminCooperativeSettingsModal';
import { API_URL } from '../config';

interface TenantFeatures {
  landing_page: boolean;
  loans: boolean;
  layyah: boolean;
  expenses: boolean;
  profit_sharing: boolean;
  withdrawals: boolean;
}

interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  subdomain: string | null;
  cooperative_type: string;
  status: string;
  created_at: string;
  features?: TenantFeatures;
  theme?: any;
}

const defaultFeatures: TenantFeatures = {
  landing_page: true,
  loans: true,
  layyah: true,
  expenses: true,
  profit_sharing: true,
  withdrawals: true
};

export const PlatformAdminDashboard: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [showCoopSettingsModal, setShowCoopSettingsModal] = useState(false);
  const [selectedCoopSettingsTenant, setSelectedCoopSettingsTenant] = useState<{ id: string; name: string } | null>(null);
  const [coopSettingsInitialTab, setCoopSettingsInitialTab] = useState<string>('general');

  // Edit Modal Reset Password State
  const [editModalCustomPassword, setEditModalCustomPassword] = useState('');
  const [showEditModalCustomPassword, setShowEditModalCustomPassword] = useState(false);
  const [editModalResetting, setEditModalResetting] = useState(false);
  const [editModalResetResult, setEditModalResetResult] = useState<{
    newPassword: string;
    isCustom: boolean;
    name: string;
    psn: string;
    timestamp: string;
  } | null>(null);
  const [editModalCopied, setEditModalCopied] = useState(false);

  const initialFormState = {
    id: '',
    name: '',
    domain: '',
    subdomain: '',
    cooperative_type: 'islamic',
    features: { ...defaultFeatures },
    theme: {
      landingPage: {
        heroTitle: '',
        heroSubtitle: '',
        aboutText: '',
        contactEmail: '',
        contactPhone: ''
      }
    },
    admin: {
      name: '',
      email: '',
      phone: '',
      password: ''
    }
  };

  const [formData, setFormData] = useState(initialFormState);
  
  const navigate = useNavigate();

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('platformToken');
      if (!token) {
        navigate('/platform/login');
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${API_URL}/platform/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setTenants(response.data.tenants);
      }
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('platformToken');
        navigate('/platform/login');
      } else {
        toast.error('Failed to load tenants');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('platformToken');
    localStorage.removeItem('platformAdmin');
    navigate('/platform/login');
  };

  const handleToggleFeature = (featureName: keyof TenantFeatures) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [featureName]: !prev.features[featureName]
      }
    }));
  };

  const handleLandingPageChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      theme: {
        ...(prev.theme || {}),
        landingPage: {
          ...(prev.theme?.landingPage || {}),
          [field]: value
        }
      }
    }));
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('platformToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      await axios.post(`${API_URL}/platform/tenants`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Tenant created successfully');
      localStorage.setItem('previewTenantId', formData.id);
      window.dispatchEvent(new CustomEvent('tenantChanged', { detail: formData.id }));
      setShowAddModal(false);
      setFormData(initialFormState);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create tenant');
    }
  };

  const handleOpenEditModal = (tenant: Tenant) => {
    setSelectedTenantId(tenant.id);
    setEditModalCustomPassword('');
    setEditModalResetResult(null);
    setEditModalCopied(false);
    setFormData({
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain || '',
      subdomain: tenant.subdomain || '',
      cooperative_type: tenant.cooperative_type,
      features: tenant.features || { ...defaultFeatures },
      theme: tenant.theme || initialFormState.theme,
      admin: { name: '', email: '', phone: '', password: '' }
    });
    setShowEditModal(true);
  };

  const handleEditModalResetPassword = async () => {
    if (!selectedTenantId) return;
    if (editModalCustomPassword && editModalCustomPassword.trim().length > 0 && editModalCustomPassword.trim().length < 6) {
      toast.error('Custom password must be at least 6 characters long');
      return;
    }

    const actionText = editModalCustomPassword.trim()
      ? `set the specified custom password for ${formData.name} administrator`
      : `generate a new secure random password for ${formData.name} administrator`;

    if (!window.confirm(`Are you sure you want to ${actionText}?`)) {
      return;
    }

    try {
      setEditModalResetting(true);
      const token = localStorage.getItem('platformToken');
      const res = await axios.post(
        `${API_URL}/platform/tenants/${selectedTenantId}/reset-admin-password`,
        {
          password: editModalCustomPassword.trim() || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.data.success) {
        toast.success(res.data.message || 'Administrator password updated successfully!');
        setEditModalResetResult({
          newPassword: res.data.data.newPassword,
          isCustom: res.data.data.isCustom,
          name: res.data.data.name,
          psn: res.data.data.psn,
          timestamp: new Date().toLocaleTimeString()
        });
        setEditModalCustomPassword('');
      }
    } catch (err: any) {
      console.error('Password reset error in edit modal:', err);
      toast.error(err.response?.data?.message || 'Failed to reset administrator password');
    } finally {
      setEditModalResetting(false);
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) return;

    try {
      const token = localStorage.getItem('platformToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      await axios.put(`${API_URL}/platform/tenants/${selectedTenantId}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Tenant updated successfully');
      setShowEditModal(false);
      setFormData(initialFormState);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update tenant');
    }
  };

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!window.confirm(`Are you sure you want to delete the tenant "${tenantName}"? This action cannot be undone and will permanently remove all associated data.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('platformToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      await axios.delete(`${API_URL}/platform/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Tenant deleted successfully');
      fetchTenants();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete tenant');
    }
  };

  // Modern Switch Component
  const ToggleSwitch = ({ label, enabled, onChange, icon: Icon, description }: any) => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-primary-100 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${enabled ? 'bg-primary-50 text-primary-600' : 'bg-gray-50 text-gray-400'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 ${
          enabled ? 'bg-primary-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

      <nav className="relative bg-white/70 backdrop-blur-xl border-b border-white/20 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                Super Admin
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Ecosystem Overview</h1>
            <p className="text-gray-500 mt-1 text-lg">Manage cooperatives and their modular features</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedCoopSettingsTenant(null);
                setShowCoopSettingsModal(true);
              }}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-50 via-indigo-50 to-white border border-purple-200 text-purple-900 hover:bg-purple-100/70 rounded-xl font-bold shadow-sm transition"
            >
              <CreditCard className="w-5 h-5 text-purple-700" />
              Platform Plan Pricing & Defaults
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium shadow-xl shadow-gray-900/20 hover:bg-gray-800 hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Onboard Cooperative
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 text-primary-600 rounded-xl">
                <Box className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Tenants</p>
                <p className="text-3xl font-bold text-gray-900">{tenants.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Cooperatives</p>
                <p className="text-3xl font-bold text-gray-900">{tenants.filter(t => t.status === 'active').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Custom Domains</p>
                <p className="text-3xl font-bold text-gray-900">{tenants.filter(t => t.domain).length}</p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {tenants.map((tenant) => {
              const isActive = tenant.status === 'active';
              return (
                <div 
                  key={tenant.id} 
                  className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary-100 transition-all duration-300 relative"
                >
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {tenant.status}
                    </span>
                    <button 
                      onClick={() => {
                        window.open(`/${tenant.id}`, '_blank');
                      }}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Open Dedicated Landing Page"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => navigate(`/platform/tenants/${tenant.id}/landing-page`)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Design Landing Page"
                    >
                      <Paintbrush className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedCoopSettingsTenant({ id: tenant.id, name: tenant.name });
                        setCoopSettingsInitialTab('admin_security');
                        setShowCoopSettingsModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Reset Administrator Password"
                    >
                      <Key className="w-5 h-5 text-amber-600" />
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedCoopSettingsTenant({ id: tenant.id, name: tenant.name });
                        setCoopSettingsInitialTab('general');
                        setShowCoopSettingsModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Configure 15 Cooperative Settings (Super Admin)"
                    >
                      <Sliders className="w-5 h-5 text-indigo-600" />
                    </button>
                    <button 
                      onClick={() => handleOpenEditModal(tenant)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit Tenant Settings"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Tenant"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform">
                    <span className="text-2xl font-bold text-gray-400 uppercase">
                      {tenant.name.substring(0, 1)}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-1">{tenant.name}</h3>
                  
                  <div className="flex flex-col gap-1.5 text-sm text-gray-500 mb-6">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      {tenant.domain ? (
                        <span className="font-medium text-gray-700 truncate">{tenant.domain}</span>
                      ) : (
                        <span className="truncate">{tenant.subdomain || tenant.id}.imanmcs.com</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <a
                        href={`/${tenant.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                        title="Open Dedicated Landing Page"
                      >
                        /{tenant.id}
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">Separate Landing Page</span>
                      </a>
                    </div>
                  </div>

                  {/* Plan & Amount Payable Summary */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs mb-4">
                    <div className="flex items-center gap-1.5 text-purple-900 font-bold">
                      <Shield className="w-3.5 h-3.5 text-purple-600" />
                      <span>Cooperative License</span>
                    </div>
                    <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-purple-200 text-[11px] shadow-2xs">
                      Managed by Super Admin
                    </span>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Active Modules</p>
                    <div className="flex flex-wrap gap-2">
                      {tenant.features?.loans !== false && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-50 text-primary-700 text-xs font-medium">
                          <CreditCard className="w-3 h-3" /> Loans
                        </span>
                      )}
                      {tenant.features?.layyah !== false && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-medium">
                          <Heart className="w-3 h-3" /> Layyah
                        </span>
                      )}
                      {tenant.features?.profit_sharing !== false && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
                          <TrendingUp className="w-3 h-3" /> Profit
                        </span>
                      )}
                      {tenant.features?.expenses !== false && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 text-xs font-medium">
                          <Receipt className="w-3 h-3" /> Exp
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => {
                          setSelectedCoopSettingsTenant({ id: tenant.id, name: tenant.name });
                          setCoopSettingsInitialTab('general');
                          setShowCoopSettingsModal(true);
                        }}
                        className="py-2 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition text-center"
                        title="Configure 15 Cooperative Settings & Policies"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Settings (15)</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCoopSettingsTenant({ id: tenant.id, name: tenant.name });
                          setCoopSettingsInitialTab('admin_security');
                          setShowCoopSettingsModal(true);
                        }}
                        className="py-2 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition text-center border border-amber-200 shadow-2xs"
                        title="Reset Tenant Admin Password"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span>Reset Password</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modern Add Tenant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] my-auto overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-100 p-6 flex justify-between items-center z-10 rounded-t-3xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Onboard Cooperative</h2>
                <p className="text-sm text-gray-500">Configure core details and modular features</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTenant} className="p-6">
              <div className="space-y-8">
                {/* Section 1: Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm">1</span>
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Cooperative Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                        placeholder="e.g., IMAN Abuja Cooperative"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Tenant ID (Slug) *</label>
                      <input
                        type="text"
                        required
                        value={formData.id}
                        onChange={(e) => setFormData({...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none font-mono text-sm"
                        placeholder="iman-abuja"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Type *</label>
                      <select
                        required
                        value={formData.cooperative_type}
                        onChange={(e) => setFormData({...formData, cooperative_type: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                      >
                        <option value="islamic">Islamic (Interest-Free)</option>
                        <option value="conventional">Conventional</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Domain Access</label>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={formData.domain}
                          onChange={(e) => setFormData({...formData, domain: e.target.value})}
                          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                          placeholder="Custom Domain (e.g. org.com)"
                        />
                        <div className="flex">
                          <input
                            type="text"
                            value={formData.subdomain}
                            onChange={(e) => setFormData({...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-l-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none border-r-0"
                            placeholder="Subdomain"
                          />
                          <div className="bg-gray-100 border border-gray-200 rounded-r-xl px-4 py-3 text-gray-500 flex items-center font-medium border-l-0">
                            .imanmcs.com
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Administrator Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm">2</span>
                    Administrator Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.admin?.name || ''}
                        onChange={(e) => setFormData({...formData, admin: { ...formData.admin, name: e.target.value }})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Password *</label>
                      <input
                        type="text"
                        required
                        value={formData.admin?.password || ''}
                        onChange={(e) => setFormData({...formData, admin: { ...formData.admin, password: e.target.value }})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                        placeholder="Enter secure password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.admin?.email || ''}
                        onChange={(e) => setFormData({...formData, admin: { ...formData.admin, email: e.target.value }})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                        placeholder="admin@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Phone *</label>
                      <input
                        type="text"
                        required
                        value={formData.admin?.phone || ''}
                        onChange={(e) => setFormData({...formData, admin: { ...formData.admin, phone: e.target.value }})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                        placeholder="+234 800 000 0000"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Modular Features */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm">3</span>
                    Enable Modules
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ToggleSwitch
                      label="Public Landing Page"
                      description="Allow public facing landing page"
                      icon={Layout}
                      enabled={formData.features.landing_page}
                      onChange={() => handleToggleFeature('landing_page')}
                    />
                    <ToggleSwitch
                      label="Loans & Credit"
                      description="Process loan applications"
                      icon={CreditCard}
                      enabled={formData.features.loans}
                      onChange={() => handleToggleFeature('loans')}
                    />
                    <ToggleSwitch
                      label="Layyah / Animal"
                      description="Festival animal requests"
                      icon={Heart}
                      enabled={formData.features.layyah}
                      onChange={() => handleToggleFeature('layyah')}
                    />
                    <ToggleSwitch
                      label="Profit Sharing"
                      description="Calculate and share dividends"
                      icon={TrendingUp}
                      enabled={formData.features.profit_sharing}
                      onChange={() => handleToggleFeature('profit_sharing')}
                    />
                    <ToggleSwitch
                      label="Expenses Management"
                      description="Track cooperative expenses"
                      icon={Receipt}
                      enabled={formData.features.expenses}
                      onChange={() => handleToggleFeature('expenses')}
                    />
                    <ToggleSwitch
                      label="Withdrawals"
                      description="Member savings withdrawals"
                      icon={Percent}
                      enabled={formData.features.withdrawals}
                      onChange={() => handleToggleFeature('withdrawals')}
                    />
                  </div>
                </div>

                {/* Section 4: Landing Page Customization */}
                {formData.features.landing_page && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm">4</span>
                      Landing Page Customization
                    </h3>
                    <div className="grid grid-cols-1 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Hero Title</label>
                        <input
                          type="text"
                          value={formData.theme?.landingPage?.heroTitle || ''}
                          onChange={(e) => handleLandingPageChange('heroTitle', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                          placeholder="e.g. Welcome to our Cooperative"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Hero Subtitle</label>
                        <textarea
                          rows={2}
                          value={formData.theme?.landingPage?.heroSubtitle || ''}
                          onChange={(e) => handleLandingPageChange('heroSubtitle', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none"
                          placeholder="Short description under the title..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">About Text</label>
                        <textarea
                          rows={3}
                          value={formData.theme?.landingPage?.aboutText || ''}
                          onChange={(e) => handleLandingPageChange('aboutText', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none"
                          placeholder="Mission and description of the cooperative..."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Email</label>
                          <input
                            type="email"
                            value={formData.theme?.landingPage?.contactEmail || ''}
                            onChange={(e) => handleLandingPageChange('contactEmail', e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                            placeholder="support@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
                          <input
                            type="text"
                            value={formData.theme?.landingPage?.contactPhone || ''}
                            onChange={(e) => handleLandingPageChange('contactPhone', e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                            placeholder="+234 800 000 0000"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium shadow-lg shadow-gray-900/20 hover:bg-gray-800 hover:-translate-y-0.5 transition-all"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Settings Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] my-auto overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-100 p-6 flex justify-between items-center z-10 rounded-t-3xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Settings: {formData.name}</h2>
                <p className="text-sm text-gray-500">Update landing page text and configuration</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTenant} className="p-6">
              <div className="space-y-8">
                {/* Section 1: Identity & Domain Configuration */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">1</span>
                    Identity & Domain Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Cooperative Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none font-medium"
                        placeholder="e.g. IMAN Abuja Cooperative"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Cooperative Type</label>
                      <select
                        value={formData.cooperative_type}
                        onChange={(e) => setFormData({...formData, cooperative_type: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none font-medium"
                      >
                        <option value="islamic">Islamic (Interest-Free)</option>
                        <option value="conventional">Conventional</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-primary-600" />
                          Custom Domain Access
                        </label>
                        {formData.domain && (
                          <a
                            href={`https://${formData.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 hover:underline"
                          >
                            <span>Test Live URL</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.domain}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                            setFormData({...formData, domain: val});
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none font-mono text-sm"
                          placeholder="e.g. portal.mycooperative.com or coopname.org"
                        />
                        <div className="absolute right-3 top-2.5 text-gray-400">
                          <Globe className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your apex domain or subdomain without http:// or trailing slashes.
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-semibold text-gray-800">
                          Platform Subdomain
                        </label>
                        {formData.subdomain && (
                          <span className="text-xs text-emerald-600 font-mono font-medium">
                            https://{formData.subdomain}.imanmcs.com
                          </span>
                        )}
                      </div>
                      <div className="flex">
                        <input
                          type="text"
                          value={formData.subdomain}
                          onChange={(e) => setFormData({...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                          className="w-full bg-white border border-gray-200 rounded-l-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none border-r-0 font-mono text-sm"
                          placeholder="tenant-slug"
                        />
                        <div className="bg-gray-100 border border-gray-200 rounded-r-xl px-4 py-2.5 text-gray-600 flex items-center font-mono text-sm font-medium border-l-0 shrink-0">
                          .imanmcs.com
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DNS Guidance Box */}
                  <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                      <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      DNS Setup Instructions for Custom Domain
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                        <span className="font-semibold text-gray-700 block mb-0.5">Option A: CNAME Record (Recommended)</span>
                        <div className="font-mono text-indigo-700 bg-indigo-50 px-2 py-1 rounded select-all mt-1">
                          CNAME &rarr; imanmcs-project.vercel.app
                        </div>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                        <span className="font-semibold text-gray-700 block mb-0.5">Option B: A-Record (Root Domain)</span>
                        <div className="font-mono text-indigo-700 bg-indigo-50 px-2 py-1 rounded select-all mt-1">
                          A &rarr; 209.38.106.28
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-indigo-700">
                      Once DNS propagates, our tenant routing engine automatically serves this cooperative's portal and branding on incoming traffic.
                    </p>
                  </div>
                </div>

                {/* Section 2: Modular Features */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm">2</span>
                    Enable Modules
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ToggleSwitch
                      label="Public Landing Page"
                      description="Allow public facing landing page"
                      icon={Layout}
                      enabled={formData.features.landing_page}
                      onChange={() => handleToggleFeature('landing_page')}
                    />
                    <ToggleSwitch
                      label="Loans & Credit"
                      description="Process loan applications"
                      icon={CreditCard}
                      enabled={formData.features.loans}
                      onChange={() => handleToggleFeature('loans')}
                    />
                    <ToggleSwitch
                      label="Layyah / Animal"
                      description="Festival animal requests"
                      icon={Heart}
                      enabled={formData.features.layyah}
                      onChange={() => handleToggleFeature('layyah')}
                    />
                    <ToggleSwitch
                      label="Profit Sharing"
                      description="Calculate and share dividends"
                      icon={TrendingUp}
                      enabled={formData.features.profit_sharing}
                      onChange={() => handleToggleFeature('profit_sharing')}
                    />
                    <ToggleSwitch
                      label="Expenses Management"
                      description="Track cooperative expenses"
                      icon={Receipt}
                      enabled={formData.features.expenses}
                      onChange={() => handleToggleFeature('expenses')}
                    />
                    <ToggleSwitch
                      label="Withdrawals"
                      description="Member savings withdrawals"
                      icon={Percent}
                      enabled={formData.features.withdrawals}
                      onChange={() => handleToggleFeature('withdrawals')}
                    />
                  </div>
                </div>

                {/* Section 3: Landing Page Customization */}
                {formData.features.landing_page && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm">3</span>
                    Landing Page Configuration
                  </h3>
                  <div className="grid grid-cols-1 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Hero Title</label>
                      <input
                        type="text"
                        value={formData.theme?.landingPage?.heroTitle || ''}
                        onChange={(e) => handleLandingPageChange('heroTitle', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                        placeholder="e.g. Welcome to our Cooperative"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Hero Subtitle</label>
                      <textarea
                        rows={2}
                        value={formData.theme?.landingPage?.heroSubtitle || ''}
                        onChange={(e) => handleLandingPageChange('heroSubtitle', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none"
                        placeholder="Short description under the title..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">About Text</label>
                      <textarea
                        rows={3}
                        value={formData.theme?.landingPage?.aboutText || ''}
                        onChange={(e) => handleLandingPageChange('aboutText', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none"
                        placeholder="Mission and description of the cooperative..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Email</label>
                        <input
                          type="email"
                          value={formData.theme?.landingPage?.contactEmail || ''}
                          onChange={(e) => handleLandingPageChange('contactEmail', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                          placeholder="support@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
                        <input
                          type="text"
                          value={formData.theme?.landingPage?.contactPhone || ''}
                          onChange={(e) => handleLandingPageChange('contactPhone', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                          placeholder="+234 800 000 0000"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Section 4: Administrator Security & Password Reset */}
                <div className="p-5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Key className="w-5 h-5 text-amber-600" />
                      Administrator Security & Password Reset
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                      Super Admin Access
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Reset this cooperative administrator's password. You can enter an optional custom password below or leave it completely blank to automatically generate a secure password.
                  </p>

                  <div className="space-y-2 max-w-lg">
                    <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
                      <span>Custom Password (Optional)</span>
                      <button
                        type="button"
                        onClick={() => setShowEditModalCustomPassword(!showEditModalCustomPassword)}
                        className="text-xs text-amber-800 hover:underline flex items-center gap-1 font-normal"
                      >
                        {showEditModalCustomPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showEditModalCustomPassword ? 'Hide' : 'Show'}
                      </button>
                    </label>
                    <input
                      type={showEditModalCustomPassword ? 'text' : 'password'}
                      value={editModalCustomPassword}
                      onChange={(e) => setEditModalCustomPassword(e.target.value)}
                      placeholder="Leave blank to auto-generate secure password"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                    />
                    <p className="text-[11px] text-gray-500">
                      {editModalCustomPassword.trim().length > 0 ? (
                        <span className={editModalCustomPassword.trim().length >= 6 ? 'text-emerald-600 font-medium' : 'text-amber-700 font-medium'}>
                          {editModalCustomPassword.trim().length >= 6
                            ? '✓ Valid custom password (minimum 6 characters)'
                            : `Must be at least 6 characters (currently ${editModalCustomPassword.trim().length})`}
                        </span>
                      ) : (
                        'If left blank, a random secure password like Admin@938201 will be automatically generated.'
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleEditModalResetPassword}
                      disabled={editModalResetting || (editModalCustomPassword.trim().length > 0 && editModalCustomPassword.trim().length < 6)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
                    >
                      {editModalResetting ? (
                        <>
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{editModalCustomPassword.trim() ? 'Set Custom Password' : 'Reset & Generate Password'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedCoopSettingsTenant({ id: formData.id, name: formData.name });
                        setCoopSettingsInitialTab('admin_security');
                        setShowCoopSettingsModal(true);
                      }}
                      className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold underline"
                    >
                      Open Full Admin Security Tab &rarr;
                    </button>
                  </div>

                  {editModalResetResult && (
                    <div className="bg-white border-2 border-emerald-400 rounded-xl p-4 space-y-2 shadow-sm animate-fade-in mt-3">
                      <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Password Reset Successful! ({editModalResetResult.timestamp})
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                          {editModalResetResult.isCustom ? 'Custom' : 'Auto-Generated'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                        <div>
                          <span className="text-[11px] text-gray-500 block">
                            Login ID: <strong className="text-gray-900 font-mono">{editModalResetResult.psn}</strong>
                          </span>
                          <span className="font-mono text-base font-bold text-gray-900 select-all">
                            {editModalResetResult.newPassword}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(editModalResetResult.newPassword);
                            setEditModalCopied(true);
                            toast.success('Password copied to clipboard!');
                            setTimeout(() => setEditModalCopied(false), 3000);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                            editModalCopied ? 'bg-emerald-600 text-white' : 'bg-emerald-200 hover:bg-emerald-300 text-emerald-900'
                          }`}
                        >
                          {editModalCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {editModalCopied ? 'Copied!' : 'Copy Password'}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Share this password with the cooperative administrator. They can now log in using their Login ID / PSN.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium shadow-lg shadow-gray-900/20 hover:bg-gray-800 hover:-translate-y-0.5 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Super Admin Cooperative Settings Modal (All 15 Components) */}
      <SuperAdminCooperativeSettingsModal
        isOpen={showCoopSettingsModal}
        onClose={() => setShowCoopSettingsModal(false)}
        tenant={selectedCoopSettingsTenant}
        initialTab={coopSettingsInitialTab}
        onSuccess={() => fetchTenants()}
      />
    </div>
  );
};
