import React, { useState, useEffect } from 'react';
import {
  DollarSign, Calendar, TrendingUp, Download, Filter,
  CheckCircle, Clock, Target, PiggyBank, BarChart3, Upload, X, FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Contribution {
  id: string;
  period: string;
  savings: number;
  investment: number;
  fixedDeposit: number;
  targetSaving: number;
  adminFee: number;
  total: number;
  date: string;
  status: 'confirmed' | 'pending' | 'processing';
}

interface ContributionIncreaseRequest {
  id: number;
  current_amount: string;
  requested_amount: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  member_note: string | null;
  review_comment: string | null;
  supporting_document_url?: string | null;
  supporting_document_name?: string | null;
  requested_at: string;
  reviewed_at?: string | null;
}

interface CommitmentInfo {
  current_amount: number;
  rules: {
    min: number;
    max: number;
    min_increase_percent: number;
    max_increase_percent: number | null;
  };
  pending_request: ContributionIncreaseRequest | null;
}

export const MyContributions: React.FC = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [commitment, setCommitment] = useState<CommitmentInfo | null>(null);
  const [increaseRequests, setIncreaseRequests] = useState<ContributionIncreaseRequest[]>([]);
  const [loadingIncreaseRequests, setLoadingIncreaseRequests] = useState(false);
  const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [requestedAmount, setRequestedAmount] = useState('');
  const [memberNote, setMemberNote] = useState('');
  const [supportingDoc, setSupportingDoc] = useState<File | null>(null);
  const [submittingIncrease, setSubmittingIncrease] = useState(false);

  useEffect(() => {
    fetchMyContributions();
    fetchCommitment();
    fetchMyIncreaseRequests();
  }, []);

  const fetchCommitment = async () => {
    try {
      const res = await api.get('/contributions/commitment');
      if (res.data?.success) {
        setCommitment(res.data.commitment as CommitmentInfo);
      }
    } catch {
      setCommitment(null);
    }
  };

  const fetchMyIncreaseRequests = async () => {
    try {
      setLoadingIncreaseRequests(true);
      const res = await api.get('/contributions/increase-requests/my');
      if (res.data?.success) {
        setIncreaseRequests((res.data.requests || []) as ContributionIncreaseRequest[]);
      } else {
        setIncreaseRequests([]);
      }
    } catch {
      setIncreaseRequests([]);
    } finally {
      setLoadingIncreaseRequests(false);
    }
  };

  const submitIncreaseRequest = async () => {
    const amount = Number(requestedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid requested amount');
      return;
    }
    if (!memberNote.trim()) {
      toast.error('Please provide a justification / reason');
      return;
    }

    try {
      setSubmittingIncrease(true);
      const form = new FormData();
      form.append('requested_amount', String(amount));
      form.append('member_note', memberNote.trim());
      if (supportingDoc) {
        form.append('supporting_document', supportingDoc);
      }

      const res = await api.post('/contributions/increase-requests', form);
      if (res.data?.success) {
        toast.success('Request submitted');
        setShowIncreaseModal(false);
        setRequestedAmount('');
        setMemberNote('');
        setSupportingDoc(null);
        await fetchCommitment();
        await fetchMyIncreaseRequests();
      } else {
        toast.error(res.data?.message || 'Failed to submit request');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmittingIncrease(false);
    }
  };

  const fetchMyContributions = async () => {
    try {
      setLoading(true);
      // Get contributions for the current user (member)
      const response = await api.get('/contributions/', {
        params: {
          user_id: user?.id // Only get contributions for the current user
        }
      });

      // Transform the backend data to match our interface
      const contribData = response.data.contributions.map((contrib: any) => ({
        id: contrib.id.toString(),
        period: `${contrib.month}/${contrib.year}`,
        savings: parseFloat(contrib.savings) || 0,
        investment: parseFloat(contrib.investment) || 0,
        fixedDeposit: parseFloat(contrib.fixed_deposit) || 0,
        targetSaving: parseFloat(contrib.target_saving) || 0,
        adminFee: 1000,
        total: parseFloat(contrib.total_amount) || 0,
        date: new Date(contrib.contribution_date).toLocaleDateString('en-US'),
        status: contrib.status === 'approved' ? 'confirmed' : contrib.status
      }));

      setContributions(contribData);
    } catch (error) {
      console.error('Error fetching contributions:', error);
      toast.error('Failed to load your contributions');
      // Fallback to empty array
      setContributions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredContributions = contributions.filter(contrib =>
    selectedPeriod === 'all' || contrib.period.includes(selectedPeriod)
  );

  const totalSavings = contributions.reduce((sum, contrib) => sum + contrib.savings, 0);
  const totalInvestment = contributions.reduce((sum, contrib) => sum + contrib.investment, 0);
  const totalFixedDeposit = contributions.reduce((sum, contrib) => sum + contrib.fixedDeposit, 0);
  const totalTargetSaving = contributions.reduce((sum, contrib) => sum + contrib.targetSaving, 0);
  const grandTotal = totalSavings + totalInvestment + totalFixedDeposit + totalTargetSaving + (contributions.length * 1000);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-primary-100 text-primary-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const exportContributions = () => {
    const csvContent = [
      ['Period', 'Savings (₦)', 'Investment (₦)', 'Fixed Deposit (₦)', 'Target Saving (₦)', 'Admin Fee (₦)', 'Total (₦)', 'Date', 'Status'].join(','),
      ...filteredContributions.map(contrib => [
        contrib.period,
        contrib.savings,
        contrib.investment,
        contrib.fixedDeposit,
        contrib.targetSaving,
        contrib.adminFee,
        contrib.total,
        contrib.date,
        contrib.status
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_contributions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Contributions</h1>
        <p className="text-gray-600">Track your savings, investment, and target saving contributions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <PiggyBank className="w-8 h-8 text-primary-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Savings</p>
              <p className="text-2xl font-bold text-gray-900">₦{totalSavings.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Investment</p>
              <p className="text-2xl font-bold text-gray-900">₦{totalInvestment.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Fixed Deposit</p>
              <p className="text-2xl font-bold text-gray-900">₦{totalFixedDeposit.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Grand Total</p>
              <p className="text-2xl font-bold text-gray-900">₦{grandTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Contribution Commitment</h2>
            <p className="text-sm text-gray-600">Request an increase to your monthly commitment</p>
            <div className="mt-3 space-y-1 text-sm text-gray-700">
              <div>
                Current commitment:{' '}
                <span className="font-medium">
                  ₦{Number(commitment?.current_amount || 0).toLocaleString()}
                </span>
              </div>
              {commitment?.rules ? (
                <div className="text-gray-600">
                  Limits: ₦{Number(commitment.rules.min).toLocaleString()} – ₦{Number(commitment.rules.max).toLocaleString()}
                  {Number(commitment.rules.min_increase_percent) > 0 ? (
                    <> · Min increase: {Number(commitment.rules.min_increase_percent)}%</>
                  ) : null}
                  {commitment.rules.max_increase_percent !== null ? (
                    <> · Max increase: {Number(commitment.rules.max_increase_percent)}%</>
                  ) : null}
                </div>
              ) : null}
              {commitment?.pending_request ? (
                <div className="text-yellow-700">
                  Pending request: ₦{Number(commitment.pending_request.requested_amount).toLocaleString()} (submitted{' '}
                  {new Date(commitment.pending_request.requested_at).toLocaleDateString('en-US')})
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIncreaseModal(true)}
              disabled={!!commitment?.pending_request}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-white ${
                commitment?.pending_request ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600'
              }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Request Increase
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Increase Requests</h2>
            <p className="text-sm text-gray-600">Track your submitted requests and decisions</p>
          </div>
          {loadingIncreaseRequests ? (
            <span className="text-sm text-gray-500">Loading…</span>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Comment</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {increaseRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-sm text-gray-500">
                    No increase requests yet.
                  </td>
                </tr>
              ) : (
                increaseRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(r.requested_at).toLocaleDateString('en-US')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      ₦{Number(r.current_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₦{Number(r.requested_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : r.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-[280px]">
                      {r.member_note || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {r.supporting_document_url ? (
                        <a
                          href={`${api.defaults.baseURL}${r.supporting_document_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-primary-600 hover:text-primary-700"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          {r.supporting_document_name || 'View'}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-[280px]">
                      {r.review_comment || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Periods</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
            
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
          
          <button 
            onClick={exportContributions}
            className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Savings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fixed Deposit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContributions.map((contribution) => (
                  <tr key={contribution.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{contribution.period}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₦{contribution.savings.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₦{contribution.investment.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₦{contribution.fixedDeposit.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₦{contribution.adminFee.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">₦{contribution.total.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contribution.date}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contribution.status)}`}>
                        {getStatusIcon(contribution.status)}
                        <span className="ml-1 capitalize">{contribution.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Contribution Trends</h3>
          
          {/* Chart visualization using CSS bars */}
          <div className="space-y-6">
            {filteredContributions.slice(0, 6).map((contribution, index) => (
              <div key={contribution.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{contribution.period}</span>
                  <span>₦{contribution.total.toLocaleString()}</span>
                </div>
                
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div className="flex h-6 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary-500 flex items-center justify-center text-white text-xs font-medium"
                        style={{ width: `${(contribution.savings / contribution.total) * 100}%` }}
                        title={`Savings: ₦${contribution.savings.toLocaleString()}`}
                      >
                        {contribution.savings > 0 && 'S'}
                      </div>
                      <div 
                        className="bg-purple-500 flex items-center justify-center text-white text-xs font-medium"
                        style={{ width: `${(contribution.investment / contribution.total) * 100}%` }}
                        title={`Investment: ₦${contribution.investment.toLocaleString()}`}
                      >
                        {contribution.investment > 0 && 'I'}
                      </div>
                      <div 
                        className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                        style={{ width: `${(contribution.targetSaving / contribution.total) * 100}%` }}
                        title={`Target Saving: ₦${contribution.targetSaving.toLocaleString()}`}
                      >
                        {contribution.targetSaving > 0 && 'T'}
                      </div>
                      <div 
                        className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium"
                        style={{ width: `${(contribution.fixedDeposit / contribution.total) * 100}%` }}
                        title={`Fixed Deposit: ₦${contribution.fixedDeposit.toLocaleString()}`}
                      >
                        {contribution.fixedDeposit > 0 && 'F'}
                      </div>
                      <div 
                        className="bg-gray-500 flex items-center justify-center text-white text-xs font-medium"
                        style={{ width: `${(contribution.adminFee / contribution.total) * 100}%` }}
                        title={`Admin Fee: ₦${contribution.adminFee.toLocaleString()}`}
                      >
                        {contribution.adminFee > 0 && 'A'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Savings: ₦{contribution.savings.toLocaleString()}</span>
                  <span>Investment: ₦{contribution.investment.toLocaleString()}</span>
                  <span>Target: ₦{contribution.targetSaving.toLocaleString()}</span>
                  <span>Fixed: ₦{contribution.fixedDeposit.toLocaleString()}</span>
                  <span>Admin: ₦{contribution.adminFee.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="mt-6 flex justify-center space-x-6 flex-wrap">
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-primary-500 rounded mr-2"></div>
              <span className="text-sm">Savings</span>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
              <span className="text-sm">Investment</span>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
              <span className="text-sm">Target Saving</span>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
              <span className="text-sm">Fixed Deposit</span>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
              <span className="text-sm">Admin Fee</span>
            </div>
          </div>
        </div>
      )}

      {showIncreaseModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Request Contribution Increase</h3>
              <button
                onClick={() => setShowIncreaseModal(false)}
                className="p-2 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-600">
                Current:{' '}
                <span className="font-medium text-gray-900">₦{Number(commitment?.current_amount || 0).toLocaleString()}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Requested new amount (₦)</label>
                <input
                  type="number"
                  min={0}
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., 10000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Justification / Reason</label>
                <textarea
                  value={memberNote}
                  onChange={(e) => setMemberNote(e.target.value)}
                  rows={4}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Explain why you need a higher contribution amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Supporting document (optional)</label>
                <input
                  type="file"
                  onChange={(e) => setSupportingDoc(e.target.files?.[0] || null)}
                  className="mt-1 w-full text-sm text-gray-600"
                />
                <p className="mt-1 text-xs text-gray-500">Accepted up to 10MB.</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowIncreaseModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitIncreaseRequest}
                disabled={submittingIncrease}
                className={`px-4 py-2 rounded-lg text-white ${
                  submittingIncrease ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600'
                }`}
              >
                {submittingIncrease ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
