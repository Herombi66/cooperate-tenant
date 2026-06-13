import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Trophy, DollarSign, Calendar, Download,
  PieChart, BarChart3, Target, CheckCircle, Loader, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProfitShareService } from '../services/profitShareService';
import toast from 'react-hot-toast';

export const MyProfitShare: React.FC = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState('2025'); // Default to current year
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [profitShares, setProfitShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchMyProfitShares();
      // Auto-refresh every 30 seconds to ensure data consistency with admin updates
      const interval = setInterval(() => {
        fetchMyProfitShares();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const fetchMyProfitShares = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      // Use dedicated member API endpoint instead of admin endpoint
      const data = await ProfitShareService.getMyProfitShares();
      setProfitShares(data.profitShares || []);
    } catch (err: any) {
      console.error('Failed to fetch profit shares:', err);
      setError(err.message || 'Failed to load profit shares');
      toast.error('Failed to load profit shares');
    } finally {
      setLoading(false);
    }
  };

  // More robust year filtering - extract year from period
  const getYearFromPeriod = (period: string): string => {
    // Handle formats like "2025", "2024-Q4", "Quarter 4 2025", "2025-Q1" etc.
    const yearMatch = period.match(/(\d{4})/);
    return yearMatch ? yearMatch[1] : period;
  };

  const filteredShares = profitShares.filter(share =>
    getYearFromPeriod(share.period) === selectedYear
  );

  const totalEarned = profitShares.filter(s => s.status === 'paid').reduce((sum, share) => sum + Number(share.profit_amount || 0), 0);
  const yearlyEarned = filteredShares.filter(s => s.status === 'paid').reduce((sum, share) => sum + Number(share.profit_amount || 0), 0);
  const pendingAmount = profitShares.filter(s => s.status === 'approved' || s.status === 'calculated').reduce((sum, share) => sum + Number(share.profit_amount || 0), 0);

  // Calculate current investment from member investment contributions across all periods
  const currentInvestment = profitShares.reduce((sum, share) => sum + Number(share.member_investment || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-primary-100 text-primary-800';
      case 'calculated': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Normalize status for better UX - show "pending" instead of technical "calculated"
  const normalizeStatus = (status: string): string => {
    switch (status) {
      case 'paid': return 'paid';
      case 'approved': return 'approved';
      case 'calculated': return 'pending';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-primary-500 mr-3" />
        <span className="text-gray-600">Loading your profit shares...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profit Share</h1>
        <p className="text-gray-600">View your actual investment returns and profit distributions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earned</p>
              <p className="text-2xl font-bold text-gray-900">₦{totalEarned.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{selectedYear} Earnings</p>
              <p className="text-2xl font-bold text-gray-900">₦{yearlyEarned.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-primary-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">₦{pendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Investment</p>
              <p className="text-2xl font-bold text-gray-900">₦{currentInvestment.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Year Selector */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="2030">2030</option>
              <option value="2029">2029</option>
              <option value="2028">2028</option>
              <option value="2027">2027</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
            </select>

            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Table View
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'chart'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📈 Chart View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {filteredShares.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Share %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calculated Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredShares.map((share) => (
                    <tr key={share.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{share.period}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">₦{Number(share.member_investment || 0).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{Number(share.share_percentage || 0).toFixed(2)}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">₦{Number(share.profit_amount || 0).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(share.status)}`}>
                          {share.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                          <span className="capitalize">{normalizeStatus(share.status)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{share.calculated_at}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <div className="text-4xl">📊</div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Profit Shares Yet</h3>
                <p className="text-gray-500">
                  {selectedYear >= '2024' ? 'Admin needs to calculate profit shares for this year.' : 'You didn\'t have any profit shares in this year.'}
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-gray-400">To see profit shares:</p>
                  <ol className="text-sm text-gray-400 list-decimal list-inside space-y-1">
                    <li>Admin must calculate profits for the selected year</li>
                    <li>Your investments are automatically included</li>
                    <li>You'll see your proportional share of profits</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Profit Share Trends</h3>
          {profitShares.length > 0 ? (
            <div className="space-y-6">
              {filteredShares.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-4">{selectedYear} Profit Shares</h4>
                  <div className="h-64 flex items-end justify-between space-x-2">
                    {filteredShares.slice().reverse().map((share, index) => {
                      const maxShare = Math.max(...filteredShares.map(s => Number(s.profit_amount || 0)));
                      const height = maxShare > 0 ? (Number(share.profit_amount || 0) / maxShare) * 100 : 0;

                      return (
                        <div key={share.id} className="flex-1 flex flex-col items-center">
                          <div className="text-xs text-gray-600 mb-2">
                            ₦{(Number(share.profit_amount || 0) / 1000).toFixed(0)}k
                          </div>
                          <div
                            className={`w-full rounded-t-lg ${
                              normalizeStatus(share.status) === 'paid' ? 'bg-green-500' :
                              normalizeStatus(share.status) === 'approved' ? 'bg-primary-500' : 'bg-yellow-500'
                            }`}
                            style={{ height: `${height}%` }}
                            title={`${share.period}: ₦${Number(share.profit_amount || 0).toLocaleString()} (${normalizeStatus(share.status)})`}
                          ></div>
                          <div className="text-xs text-gray-600 mt-2 text-center">
                            {share.period}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border-b border-gray-200">
                  <div className="text-gray-400 mb-2">
                    <div className="text-2xl">📊</div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    No chart data for {selectedYear}. Showing all-time summary instead.
                  </p>
                  {/* Show summary chart for all data */}
                  <div className="h-32 flex items-end justify-center space-x-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-2">Total Earned</div>
                      <div className="bg-green-500 w-12 h-16 rounded-t flex items-end justify-center">
                        <span className="text-xs text-white font-bold">₦{(totalEarned / 1000).toFixed(0)}k</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-2">Pending</div>
                      <div className="bg-yellow-500 w-12 h-12 rounded-t flex items-end justify-center">
                        <span className="text-xs text-white font-bold">₦{(pendingAmount / 1000).toFixed(0)}k</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-6">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-sm">Paid (₦{totalEarned.toLocaleString()})</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-primary-500 rounded mr-2"></div>
                  <span className="text-sm">Approved</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                  <span className="text-sm">Pending (₦{pendingAmount.toLocaleString()})</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <div className="text-4xl">📈</div>
              </div>
              <p className="text-gray-500">No profit share data available to display.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyProfitShare;
