import React, { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { StatsCard } from '../UI/StatsCard';
import { RecentActivity } from '../UI/RecentActivity';
import { DashboardService, DashboardStats } from '../../services/dashboardService';
import toast from 'react-hot-toast';

export const ChairmanDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChairmanStats();
  }, []);

  const fetchChairmanStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await DashboardService.getChairmanStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch chairman stats:', err);
      setError(err.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  // Fallback stats
  const fallbackStats = {
    totalMembers: 0,
    totalContributions: 0,
    pendingLoans: 0,
    totalProfitShared: 0,
    pendingExpenses: 0,
    monthlyExpenses: 0,
    totalReserves: 0,
    activeApplications: 0,
    totalLayyahApplications: 0,
    pendingLayyahApplications: 0,
    activeLayyahGroups: 0,
  };

  const currentStats = stats || fallbackStats;

  const pendingApprovals = [
    { id: 1, type: 'Loan', member: 'Dr. Amina Hassan', amount: 75000, date: '2025-01-15' },
    { id: 2, type: 'Expense', description: 'Staff Salary Payment', amount: 45000, date: '2025-01-14' },
    { id: 3, type: 'Loan', member: 'Nurse Fatima Umar', amount: 50000, date: '2025-01-13' },
  ];

  const recentActivities = [
    { id: '1', description: 'Approved loan application for Dr. Musa Ibrahim', amount: '₦75,000', status: 'approved' as const },
    { id: '2', description: 'Authorized salary payment', amount: '₦45,000', status: 'completed' as const },
    { id: '3', description: 'Reviewed monthly report', amount: '', status: 'completed' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
          <span className="ml-2 text-gray-600">Loading chairman dashboard...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={fetchChairmanStats}
              className="ml-auto px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Members"
            value={currentStats.totalMembers.toString()}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
            color="blue"
          />
          <StatsCard
            title="Total Contributions"
            value={`₦${currentStats.totalContributions.toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: 8.5, isPositive: true }}
            color="green"
          />
          <StatsCard
            title="Pending Approvals"
            value={currentStats.pendingLoans.toString()}
            icon={AlertCircle}
            trend={{ value: 2, isPositive: false }}
            color="orange"
          />
          <StatsCard
            title="Monthly Profit"
            value={`₦${currentStats.totalProfitShared.toLocaleString()}`}
            icon={TrendingUp}
            trend={{ value: 15.2, isPositive: true }}
            color="purple"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {pendingApprovals.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.type === 'Loan' ? item.member : item.description}
                  </p>
                  <p className="text-sm text-gray-500">{item.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">₦{item.amount.toLocaleString()}</p>
                  <div className="flex space-x-2 mt-1">
                    <button className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200">
                      Approve
                    </button>
                    <button className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium">
            View All Pending Items
          </button>
        </div>

        {/* Recent Activities */}
        <RecentActivity title="Recent Activities" items={recentActivities} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors">
            <CheckCircle className="w-5 h-5 mr-2" />
            Review Loan Applications
          </button>
          <button className="flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            <DollarSign className="w-5 h-5 mr-2" />
            Authorize Payments
          </button>
          <button className="flex items-center justify-center p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
            <FileText className="w-5 h-5 mr-2" />
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
};
