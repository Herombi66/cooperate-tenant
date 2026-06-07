import React, { useEffect, useState } from 'react';
import { RefreshCw, Percent, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

type Eligibility = {
  eligible: boolean;
  reason: string | null;
  maxAmount: number;
  totalContributions: number;
};

type Withdrawal = {
  id: number;
  amount: number;
  status: string;
  year: number;
  reason?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  approved_at?: string | null;
  disbursed_at?: string | null;
};

export const WithdrawalsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [reason, setReason] = useState('');

  const fetchEligibility = async () => {
    const res = await api.get('/withdrawals/eligibility');
    setEligibility(res.data || null);
  };

  const fetchHistory = async () => {
    const res = await api.get('/withdrawals', { params: { page: 1, limit: 50 } });
    setHistory(res.data?.withdrawals || []);
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchEligibility(), fetchHistory()]);
    } catch (e) {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const requestWithdrawal = async () => {
    if (!eligibility?.eligible) return;
    try {
      setLoading(true);
      await api.post('/withdrawals/request', {
        amount: eligibility.maxAmount,
        reason: reason.trim() || null
      });
      toast.success('Withdrawal request submitted');
      setReason('');
      await refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
          <p className="text-gray-600">Request 30% withdrawal (once per calendar year)</p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Eligibility</h2>
        </div>

        {!eligibility ? (
          <div className="text-sm text-gray-600">Loading...</div>
        ) : eligibility.eligible ? (
          <div className="space-y-3">
            <div className="flex items-center text-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              You are eligible to request a withdrawal this year.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600">Eligible Contributions</div>
                <div className="text-xl font-bold text-gray-900">₦{Number(eligibility.totalContributions || 0).toLocaleString()}</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600">Withdrawal Amount (30%)</div>
                <div className="text-xl font-bold text-primary-600">₦{Number(eligibility.maxAmount || 0).toLocaleString()}</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Why are you requesting a withdrawal?"
              />
            </div>
            <button
              onClick={requestWithdrawal}
              className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-60"
              disabled={loading}
            >
              Request ₦{Number(eligibility.maxAmount || 0).toLocaleString()}
            </button>
          </div>
        ) : (
          <div className="flex items-start text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5" />
            <div>
              <div className="font-medium">Not eligible</div>
              <div>{eligibility.reason || 'You cannot request a withdrawal right now.'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">History</h2>
        {history.length === 0 ? (
          <div className="text-sm text-gray-600">No withdrawal history.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{w.year}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">₦{Number(w.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 capitalize">{w.status}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{new Date(w.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {w.status === 'rejected' ? w.rejection_reason || '-' : w.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

