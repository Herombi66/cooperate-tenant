import React, { useState } from 'react';
import { 
  Shield, Grid, FolderPlus, Users, History, Plus
} from 'lucide-react';
import { PermissionMatrix } from '../components/RBAC/PermissionMatrix';
import { ModuleManagementModal } from '../components/RBAC/ModuleManagementModal';
import { RbacAuditLogsTab } from '../components/RBAC/RbacAuditLogsTab';
import { useNavigate } from 'react-router-dom';

export const RolesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'modules' | 'audit'>('matrix');
  const [showModuleModal, setShowModuleModal] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-7 h-7 text-primary-600 mr-2.5" />
            Role & Permission Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Dynamic Role-Based Access Control (RBAC) governing officer access, actions, and module visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModuleModal(true)}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition"
          >
            <FolderPlus className="w-4 h-4 mr-1.5 text-primary-600" />
            Manage Modules
          </button>
          <button
            onClick={() => navigate('/user-management')}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition"
          >
            <Users className="w-4 h-4 mr-1.5" />
            User Management
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-1 border-b-2 font-semibold text-xs transition flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Grid className="w-4 h-4" />
            Permission Matrix
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-1 border-b-2 font-semibold text-xs transition flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="w-4 h-4" />
            Permission Audit Trail
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'matrix' && <PermissionMatrix />}
      {activeTab === 'audit' && <RbacAuditLogsTab />}

      {/* Dynamic Module Management Modal */}
      <ModuleManagementModal
        isOpen={showModuleModal}
        onClose={() => setShowModuleModal(false)}
      />
    </div>
  );
};
