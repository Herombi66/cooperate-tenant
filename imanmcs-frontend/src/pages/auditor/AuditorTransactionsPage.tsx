import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Receipt,
  FileText,
  Calendar,
  DollarSign,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Plus
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const AuditorTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [transactionType, setTransactionType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Audit Note Modal State
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');
  const [noteStatus, setNoteStatus] = useState<string>('open');
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (transactionType) params.append('transactionType', transactionType);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/audit/transactions?${params.toString()}`);
      if (res.data.success) {
        setTransactions(res.data.data.transactions || []);
      }
    } catch (err) {
      console.error('Error fetching audit transactions', err);
      toast.error('Failed to load transaction ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [transactionType, status]);

  const handleAddAuditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      setSubmittingNote(true);
      const res = await api.post('/audit/notes', {
        entity_type: 'transaction',
        entity_id: selectedTx?.id,
        note: noteText,
        status: noteStatus
      });
      if (res.data.success) {
        toast.success('Audit note recorded successfully');
        setShowNoteModal(false);
        setNoteText('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record audit note');
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-lime-700" /> Complete Transaction Audit Ledger
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Read-only examination of all cooperative financial activities, inflows, outflows, and operational adjustments.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by ID, Member, PSN, Description, Ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500"
            />
          </div>

          <div>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500"
            >
              <option value="">All Transaction Types</option>
              <option value="Contribution">Contributions</option>
              <option value="Loan Disbursement">Loan Disbursements</option>
              <option value="Loan Repayment">Loan Repayments</option>
              <option value="Expense">Expenses</option>
            </select>
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500"
            >
              <option value="">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="verified">Verified</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected / Cancelled</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchTransactions}
              className="flex-1 bg-lime-600 hover:bg-lime-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
          <Calendar className="w-4 h-4 text-amber-600" />
          <span>Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          />
          <button
            onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); setTransactionType(''); setStatus(''); }}
            className="text-gray-500 hover:text-gray-800 underline ml-2"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="font-medium">No transactions matched your audit criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-lime-50/70 text-lime-900 text-xs uppercase font-semibold border-b border-lime-100">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Member / Party</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-mono text-xs font-medium text-gray-900">{tx.id}</td>
                    <td className="py-3 px-4 text-xs">
                      <div>{tx.date}</div>
                      <div className="text-gray-400">{tx.time}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{tx.member_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{tx.member_psn}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      ₦{Number(tx.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        ['approved', 'verified', 'paid'].includes(tx.status)
                          ? 'bg-lime-100 text-lime-800'
                          : tx.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="p-1.5 hover:bg-lime-100 rounded text-lime-700 transition"
                        title="Audit Details & Notes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 border border-gray-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-lime-700" /> Transaction Audit Inspection
              </h3>
              <button onClick={() => setSelectedTx(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-3 py-4 text-sm">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div>
                  <span className="text-xs text-gray-500 block">Transaction ID:</span>
                  <span className="font-mono font-semibold text-gray-900">{selectedTx.id}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Reference No:</span>
                  <span className="font-mono text-gray-900">{selectedTx.reference_number || 'None'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Member / Party:</span>
                  <span className="font-semibold text-gray-900">{selectedTx.member_name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">PSN / ID:</span>
                  <span className="font-mono text-gray-900">{selectedTx.member_psn}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Amount:</span>
                  <span className="text-base font-bold text-lime-700">₦{Number(selectedTx.amount).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Payment Method:</span>
                  <span className="text-gray-900">{selectedTx.payment_method}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Recorded By:</span>
                  <span className="text-gray-900">{selectedTx.recorded_by || 'System'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Approved By:</span>
                  <span className="text-gray-900">{selectedTx.approved_by || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Status:</span>
                  <span className="font-semibold uppercase text-xs text-gray-800">{selectedTx.status}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Timestamp:</span>
                  <span className="text-gray-700 text-xs">{new Date(selectedTx.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500 block font-medium">Description / Narration:</span>
                <p className="text-gray-800 text-sm mt-0.5 bg-white p-2 border rounded border-gray-200">
                  {selectedTx.description}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowNoteModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition"
              >
                <MessageSquare className="w-4 h-4" /> Add Audit Note
              </button>

              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Audit Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-amber-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" /> Record Audit Observation
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Attach an audit observation note to record <strong>{selectedTx?.id}</strong>. Notes do not alter financial data.
            </p>

            <form onSubmit={handleAddAuditNote} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Status</label>
                <select
                  value={noteStatus}
                  onChange={(e) => setNoteStatus(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                >
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Audit Finding / Note</label>
                <textarea
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter detailed audit observation, inquiry, or resolution notes..."
                  className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-gray-900 rounded font-medium disabled:opacity-50"
                >
                  {submittingNote ? 'Saving...' : 'Save Audit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
