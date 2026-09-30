import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard } from '../components/Dashboard/AdminDashboard';
import { MemberDashboard } from '../components/Dashboard/MemberDashboard';
import { TreasurerDashboard } from '../components/Dashboard/TreasurerDashboard';
import { ChairmanDashboard } from '../components/Dashboard/ChairmanDashboard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const renderDashboard = () => {
    switch (user.role) {
      case 'admin':
      case 'super_admin':
      case 'secretary':
      case 'assistant_secretary':
      case 'auditor':
      case 'state_auditor':
      case 'pro':
        return <AdminDashboard />;
      case 'member':
        return <MemberDashboard />;
      case 'treasurer':
      case 'financial_secretary':
        return <TreasurerDashboard />;
      case 'chairman':
        return <ChairmanDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name}
        </h1>
        <div className="text-sm text-gray-500">
          Role: <span className="capitalize font-medium">{user.role?.replace(/_/g, ' ')}</span>
        </div>
      </div>
      {renderDashboard()}
    </div>
  );
};