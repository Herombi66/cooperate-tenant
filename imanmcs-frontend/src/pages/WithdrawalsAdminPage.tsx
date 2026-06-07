import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

type WithdrawalRow = {
  id: number;
  amount: number;
  status: string;
  year: number;
  reason?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  approved_at?: string | null;
  disbursed_at?: string | null;
  user?: {
    membershipApplication?: {
      name?: string;
      psn?: string;
      email?: string;
      phone?: string;
    };
  };
};

export const WithdrawalsAdminPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('all');
  const [rows, setRows] = useState<WithdrawalRow[]>([]);

  const params = useMemo(() => {
    const p: any = { page: 1, limit: 50 };
    if (status !== 'all') p.status = status;
    return p;
  }, [status]);

  const fetchRows = async () => {
    const res = await api.get('/withdrawals', { params });
    setRows(res.data?.withdrawals || []);
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await fetchRows();
    } catch (e) {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [params]);

  const updateStatus = async (id: number, next: 'approved' | 'rejected' | 'disbursed') => {
    let rejection_reason: string | undefined;
    if (next === 'rejected') {
      const raw = prompt('Rejection reason:');
      if (!raw || raw.trim() === '') return;
      rejection_reason = raw.trim();
    }

    if (next === 'approved' && !confirm('Approve this withdrawal request?')) return;
    if (next === 'disbursed' && !confirm('Mark this withdrawal as disbursed?')) return;

    try {
      setLoading(true);
      await api.put(`/withdrawals/${id}/status`, { status: next, rejection_reason });
      toast.success(`Withdrawal ${next}`);
      await fetchRows();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const canApprove = (w: WithdrawalRow) => w.status === 'pending';
  const canReject = (w: WithdrawalRow) => w.status === 'pending';
  const canDisburse = (w: WithdrawalRow) => w.status === 'approved';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawal Requests</h1>
          <p className="text-gray-600">Approve, reject, and mark withdrawals as disbursed</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="disbursed">Disbursed</option>
          </select>
          <button
            onClick={refresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PSN</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-600">No withdrawals found.</td>
                </tr>
              ) : (
                rows.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{w.user?.membershipApplication?.name || 'Unknown'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{w.user?.membershipApplication?.psn || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{w.year}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">₦{Number(w.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 capitalize">{w.status}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{new Date(w.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {w.status === 'rejected' ? w.rejection_reason || '-' : w.reason || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        {canApprove(w) && (
                          <button
                            onClick={() => updateStatus(w.id, 'approved')}
                            className="inline-flex items-center px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50"
                            disabled={loading}
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </button>
                        )}
                        {canReject(w) && (
                          <button
                            onClick={() => updateStatus(w.id, 'rejected')}
                            className="inline-flex items-center px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                            disabled={loading}
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </button>
                        )}
                        {canDisburse(w) && (
                          <button
                            onClick={() => updateStatus(w.id, 'disbursed')}
                            className="inline-flex items-center px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
                            disabled={loading}
                            title="Disburse"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Disburse
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

