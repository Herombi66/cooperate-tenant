import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, DollarSign, CreditCard, TrendingUp, AlertCircle, CheckCircle,
  FileText, Settings, Upload, Download, PlusCircle, Receipt,
  BarChart3, Calculator, UserPlus, FileSpreadsheet, Heart, Loader,
  Activity, Eye, Filter, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { StatsCard } from '../UI/StatsCard';
import { RecentActivity } from '../UI/RecentActivity';
import { DashboardService, DashboardStats, ActivityLog, ActivityLogsResponse, ExpenseData } from '../../services/dashboardService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ActivityItem {
  id: string;
  description: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

export const AdminDashboard: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [totalActivityPages, setTotalActivityPages] = useState(1);
  const [activityFilter, setActivityFilter] = useState('');
  const navigate = useNavigate();
  const [recentLoans, setRecentLoans] = useState<ActivityItem[]>([]);
  const [recentMemberActivities, setRecentMemberActivities] = useState<ActivityItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchActivityLogs();
    fetchRecentActivities();
    fetchExpenses();
  }, []);

  useEffect(() => {
    fetchActivityLogs();
  }, [activityPage, activityFilter]);

  const fetchExpenses = async () => {
    try {
        setExpensesLoading(true);
        const expenseData = await DashboardService.getExpenses();
        setExpenses(expenseData.slice(0, 5)); // show latest 5
    } catch (error) {
        toast.error("Failed to load recent expenses.");
    } finally {
        setExpensesLoading(false);
    }
  }

  const handleApproveExpense = (id: number) => {
    alert(`Approving expense ${id}`);
    // Here you would call a service to approve the expense
    // and then refetch the expenses
  }

  const handleRejectExpense = (id: number) => {
      alert(`Rejecting expense ${id}`);
      // Here you would call a service to reject the expense
      // and then refetch the expenses
  }

  const mapActionToStatus = (action: string): 'pending' | 'approved' | 'rejected' | 'completed' => {
    switch(action.toLowerCase()) {
      case 'create':
      case 'apply':
        return 'pending';
      case 'approve':
        return 'approved';
      case 'reject':
        return 'rejected';
      case 'update':
      case 'login':
      case 'logout':
      case 'register':
        return 'completed';
      default:
        return 'pending';
    }
  }

  const fetchRecentActivities = async () => {
    try {
      // Recent Loans
      const loanLogs = await DashboardService.getActivityLogs({ resource_type: 'loan', limit: 5 });
      const mappedLoans = loanLogs.logs.map(log => ({
        id: log.id.toString(),
        description: log.description || 'Loan activity',
        amount: log.metadata?.amount ? `₦${log.metadata.amount.toLocaleString()}` : '',
        status: mapActionToStatus(log.action),
      }));
      setRecentLoans(mappedLoans);

      // Recent Member Activities
      const memberLogs = await DashboardService.getActivityLogs({ resource_type: 'user', limit: 5 });
       const mappedMembers = memberLogs.logs.map(log => ({
        id: log.id.toString(),
        description: log.description || 'Member activity',
        amount: '', // Member activities might not have an amount
        status: mapActionToStatus(log.action),
      }));
      setRecentMemberActivities(mappedMembers);

    } catch (error) {
      toast.error("Failed to load recent activities");
    }
  }


  // Don't render content if no user (loading or not authenticated)
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
          <span className="ml-4 text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await DashboardService.getAdminStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err);
      setError(err.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setActivityLoading(true);
      const params: any = { page: activityPage, limit: 10 };
      if (activityFilter) {
        params.resource_type = activityFilter;
      }
      const data: ActivityLogsResponse = await DashboardService.getActivityLogs(params);
      setActivityLogs(data.logs);
      setTotalActivityPages(data.pagination.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch activity logs:', err);
      toast.error('Failed to load activity logs');
    } finally {
      setActivityLoading(false);
    }
  };

  // Fallback stats for when data is loading or failed to load
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

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'created':
        return '➕';
      case 'update':
      case 'updated':
        return '✏️';
      case 'delete':
      case 'deleted':
        return '🗑️';
      case 'login':
        return '🔐';
      case 'logout':
        return '🚪';
      default:
        return '📝';
    }
  };

  const getResourceTypeColor = (resourceType: string) => {
    switch (resourceType.toLowerCase()) {
      case 'user':
        return 'bg-blue-100 text-blue-800';
      case 'contribution':
        return 'bg-green-100 text-green-800';
      case 'loan':
        return 'bg-yellow-100 text-yellow-800';
      case 'expense':
        return 'bg-red-100 text-red-800';
      case 'application':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
          <span className="ml-2 text-gray-600">Loading dashboard data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={fetchDashboardStats}
              className="ml-auto px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Stats Grid */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Members"
              value={currentStats.totalMembers.toLocaleString()}
              icon={Users}
              color="blue"
              trend={{ value: 12, isPositive: true }}
            />
            <StatsCard
              title="Total Contributions"
              value={`₦${(currentStats.totalContributions / 1000000).toFixed(1)}M`}
              icon={DollarSign}
              color="green"
              trend={{ value: 8.5, isPositive: true }}
            />
            <StatsCard
              title="Pending Loans"
              value={currentStats.pendingLoans.toString()}
              icon={CreditCard}
              color="yellow"
              trend={{ value: 3, isPositive: false }}
            />
            <StatsCard
              title="Monthly Expenses"
              value={`₦${(currentStats.monthlyExpenses / 1000).toFixed(0)}K`}
              icon={Receipt}
              color="orange"
              trend={{ value: 5.2, isPositive: false }}
            />
          </div>

          {/* Second Row Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Profit Shared"
              value={`₦${(currentStats.totalProfitShared / 1000000).toFixed(1)}M`}
              icon={TrendingUp}
              color="purple"
              trend={{ value: 15.2, isPositive: true }}
            />
            <StatsCard
              title="Total Reserves"
              value={`₦${(currentStats.totalReserves / 1000000).toFixed(1)}M`}
              icon={Calculator}
              color="gold"
              trend={{ value: 8.7, isPositive: true }}
            />
            <StatsCard
              title="Pending Expenses"
              value={currentStats.pendingExpenses.toString()}
              icon={AlertCircle}
              color="orange"
              trend={{ value: 2, isPositive: false }}
            />
            <StatsCard
              title="New Applications"
              value={currentStats.activeApplications.toString()}
              icon={FileText}
              color="blue"
              trend={{ value: 4, isPositive: true }}
            />
          </div>

          {/* Layyah Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Layyah Applications"
              value={currentStats.totalLayyahApplications.toString()}
              icon={Heart}
              color="green"
              trend={{ value: 12, isPositive: true }}
            />
            <StatsCard
              title="Pending Layyah"
              value={currentStats.pendingLayyahApplications.toString()}
              icon={AlertCircle}
              color="yellow"
              trend={{ value: 2, isPositive: false }}
            />
            <StatsCard
              title="Active Groups"
              value={currentStats.activeLayyahGroups.toString()}
              icon={Users}
              color="blue"
              trend={{ value: 1, isPositive: true }}
            />
          </div>
        </>
      )}

      {/* Enhanced Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/members')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
          >
            <UserPlus className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">Add New Member</div>
            <div className="text-sm text-gray-500">Register a new cooperative member</div>
          </button>
          <button
            onClick={() => navigate('/contributions')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
          >
            <Upload className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">Upload Contributions</div>
            <div className="text-sm text-gray-500">Bulk upload member contributions</div>
          </button>
          <button
            onClick={() => navigate('/expenses')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
          >
            <Receipt className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">Manage Expenses</div>
            <div className="text-sm text-gray-500">Track cooperative expenses</div>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
          >
            <Settings className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">System Settings</div>
            <div className="text-sm text-gray-500">Configure system parameters</div>
          </button>
        </div>
      </div>

      {/* Additional Quick Actions Row */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Management Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/loans')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
          >
            <CreditCard className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">Review Loans</div>
            <div className="text-sm text-gray-500">Process pending loan applications</div>
          </button>
          <button
            onClick={() => navigate('/loan-repayments')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
          >
            <Receipt className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">Loan Repayments</div>
            <div className="text-sm text-gray-500">Upload and verify loan repayments</div>
          </button>
          <button
            onClick={() => navigate('/profit-sharing')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
          >
            <Calculator className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">Profit Sharing</div>
            <div className="text-sm text-gray-500">Calculate and distribute profits</div>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
          >
            <BarChart3 className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">View Reports</div>
            <div className="text-sm text-gray-500">Generate financial reports</div>
          </button>
          <button
            onClick={() => navigate('/admin-layyah')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
          >
            <Heart className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">Layyah Management</div>
            <div className="text-sm text-gray-500">Manage commodity trading applications</div>
          </button>
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                System Activity Log
              </h3>
              <p className="text-sm text-gray-600">Track all user activities and system events</p>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Activities</option>
                <option value="user">User Actions</option>
                <option value="contribution">Contributions</option>
                <option value="loan">Loans</option>
                <option value="expense">Expenses</option>
                <option value="application">Applications</option>
              </select>
              <button
                onClick={fetchActivityLogs}
                disabled={activityLoading}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${activityLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activityLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-primary-500 mr-2" />
              <span className="text-gray-600">Loading activity logs...</span>
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No activity logs found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getActionIcon(log.action)}</span>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {log.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.user_name || 'System'}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {log.user_role || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResourceTypeColor(log.resource_type)}`}>
                        {log.resource_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {log.description || 'No description'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalActivityPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {activityPage} of {totalActivityPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActivityPage(Math.max(1, activityPage - 1))}
                disabled={activityPage === 1}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">
                {activityPage}
              </span>
              <button
                onClick={() => setActivityPage(Math.min(totalActivityPages, activityPage + 1))}
                disabled={activityPage === totalActivityPages}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity
          title="Recent Loan Applications"
          items={recentLoans}
        />
        <RecentActivity
          title="Recent Member Activities"
          items={recentMemberActivities}
        />
      </div>
    </div>
  );

  const renderExpensesTab = () => (
    <div className="space-y-6">
      {/* Expenses Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cooperative Expenses</h3>
          <button
            onClick={() => navigate('/expenses')}
            className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Expense
          </button>
        </div>

        {/* Expense Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Staff Salaries</p>
                <p className="text-2xl font-bold text-blue-900">₦350,000</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Office Operations</p>
                <p className="text-2xl font-bold text-green-900">₦75,000</p>
              </div>
              <Settings className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Other Expenses</p>
                <p className="text-2xl font-bold text-purple-900">₦25,000</p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="overflow-x-auto">
          {expensesLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-primary-500 mr-2" />
                    <span className="text-gray-600">Loading expenses...</span>
                </div>
            ) : (
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {expenses.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                            No recent expenses found.
                        </td>
                    </tr>
                ) : (
                    expenses.map(expense => (
                        <tr key={expense.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.category}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₦{expense.amount.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                expense.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                expense.status.toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                                {expense.status}
                            </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {expense.status.toLowerCase() === 'pending' ? (
                                    <>
                                        <button
                                            onClick={() => handleApproveExpense(expense.id)}
                                            className="text-green-600 hover:text-green-900 mr-3"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleRejectExpense(expense.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Reject
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => navigate(`/expenses/${expense.id}`)}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        View
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
            )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'expenses'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reports
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'expenses' && renderExpensesTab()}
      {activeTab === 'members' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Member Management</h3>
            <button
              onClick={() => navigate('/members')}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Go to Members
            </button>
          </div>
          <p className="text-gray-600 mb-4">Manage cooperative members, registrations, and profiles.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/members')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <Users className="w-6 h-6 text-blue-500 mb-2" />
              <div className="font-medium">View All Members</div>
              <div className="text-sm text-gray-500">Browse member directory</div>
            </button>
            <button
              onClick={() => navigate('/members')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <UserPlus className="w-6 h-6 text-green-500 mb-2" />
              <div className="font-medium">Add New Member</div>
              <div className="text-sm text-gray-500">Register new cooperative member</div>
            </button>
            <button
              onClick={() => navigate('/members')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <Upload className="w-6 h-6 text-purple-500 mb-2" />
              <div className="font-medium">Import Members</div>
              <div className="text-sm text-gray-500">Bulk import from Excel</div>
            </button>
          </div>
        </div>
      )}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Reports & Analytics</h3>
            <button
              onClick={() => navigate('/reports')}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Go to Reports
            </button>
          </div>
          <p className="text-gray-600 mb-4">Generate comprehensive reports for cooperative operations.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/reports')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <DollarSign className="w-6 h-6 text-green-500 mb-2" />
              <div className="font-medium">Financial Reports</div>
              <div className="text-sm text-gray-500">Contributions, loans, profits</div>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <Users className="w-6 h-6 text-blue-500 mb-2" />
              <div className="font-medium">Member Reports</div>
              <div className="text-sm text-gray-500">Activity and engagement</div>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <FileText className="w-6 h-6 text-purple-500 mb-2" />
              <div className="font-medium">Compliance Reports</div>
              <div className="text-sm text-gray-500">Regulatory compliance</div>
            </button>
          </div>
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <Settings className="w-4 h-4 mr-2" />
              Go to Settings
            </button>
          </div>
          <p className="text-gray-600 mb-4">Configure cooperative parameters and system preferences.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <DollarSign className="w-6 h-6 text-green-500 mb-2" />
              <div className="font-medium">Contribution Settings</div>
              <div className="text-sm text-gray-500">Minimum amounts and ratios</div>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <CreditCard className="w-6 h-6 text-blue-500 mb-2" />
              <div className="font-medium">Loan Configuration</div>
              <div className="text-sm text-gray-500">Limits and repayment terms</div>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <TrendingUp className="w-6 h-6 text-purple-500 mb-2" />
              <div className="font-medium">Profit Sharing</div>
              <div className="text-sm text-gray-500">Distribution frequency and fees</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
