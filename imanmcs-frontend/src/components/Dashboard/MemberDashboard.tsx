import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, TrendingUp, User, AlertTriangle, Loader } from 'lucide-react';
import { StatsCard } from '../UI/StatsCard';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardService, MemberStats } from '../../services/dashboardService';
import toast from 'react-hot-toast';

export const MemberDashboard: React.FC = () => {
  const { user } = useAuth();
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchMemberStats();
    }
  }, [user?.id]);

  const fetchMemberStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await DashboardService.getMemberStats(parseInt(user.id));
      setMemberStats(data);
    } catch (err: any) {
      console.error('Failed to fetch member stats:', err);
      setError(err.message || 'Failed to load member data');
      toast.error('Failed to load member statistics');
    } finally {
      setLoading(false);
    }
  };

  // Fallback stats for when data is loading or failed to load
  const fallbackStats = {
    totalContributions: 0,
    pendingLoans: 0,
    approvedLoans: 0,
    monthlySavings: 0,
    investmentBalance: 0,
    profitShare: 0,
  };

  const currentStats = memberStats || fallbackStats;

  // Calculate derived values
  const totalSavings = currentStats.totalContributions * 0.6; // Assume 60% savings
  const totalInvestment = currentStats.investmentBalance;
  const targetSavings = currentStats.monthlySavings * 12; // Annual target
  const availableLoanLimit = currentStats.investmentBalance * 3; // 3x investment
  const currentLoan = currentStats.approvedLoans > 0 ? currentStats.totalContributions * 0.5 : 0; // Mock current loan

  const showPasswordWarning = user?.is_default_password;

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
          <span className="ml-2 text-gray-600">Loading your dashboard...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={fetchMemberStats}
              className="ml-auto px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Password Warning */}
      {!loading && !error && showPasswordWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Please update your password
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                You're using a default password. Please update it for security.
              </p>
            </div>
            <button className="ml-auto bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700">
              Update Now
            </button>
          </div>
        </div>
      )}

      {/* Personal Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Savings"
            value={`₦${totalSavings.toLocaleString()}`}
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="Investment/Shares"
            value={`₦${totalInvestment.toLocaleString()}`}
            icon={TrendingUp}
            color="blue"
          />
          <StatsCard
            title="Available Loan Limit"
            value={`₦${availableLoanLimit.toLocaleString()}`}
            icon={CreditCard}
            color="purple"
          />
          <StatsCard
            title="Profit Share (2024)"
            value={`₦${currentStats.profitShare.toLocaleString()}`}
            icon={TrendingUp}
            color="gold"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <CreditCard className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">Apply for Loan</div>
            <div className="text-sm text-gray-500">Submit a new loan application</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <User className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">Update Profile</div>
            <div className="text-sm text-gray-500">Manage your personal information</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <DollarSign className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">View Contributions</div>
            <div className="text-sm text-gray-500">Check your contribution history</div>
          </button>
        </div>
      </div>

      {/* Account Summary */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Savings:</span>
                <span className="font-medium">₦{totalSavings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Investment/Shares:</span>
                <span className="font-medium">₦{totalInvestment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target Savings:</span>
                <span className="font-medium">₦{targetSavings.toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="text-gray-900 font-medium">Total Balance:</span>
                <span className="font-bold text-primary-600">
                  ₦{(totalSavings + totalInvestment + targetSavings).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Loan:</span>
                <span className="font-medium">₦{currentLoan.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available Limit:</span>
                <span className="font-medium text-green-600">₦{availableLoanLimit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Status:</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  currentStats.approvedLoans > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {currentStats.approvedLoans > 0 ? 'Active' : 'No Active Loans'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};