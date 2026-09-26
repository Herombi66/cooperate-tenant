import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Filter, Eye, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const AuditorLoansPage: React.FC = () => {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>('');
  const [loanType, setLoanType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (loanType !== 'all') params.append('loanType', loanType);
      if (search) params.append('search', search);

      const res = await api.get(`/audit/loans?${params.toString()}`);
      if (res.data.success) {
        setLoans(res.data.data?.loans || []);
      }
    } catch (err) {
      console.error('Error fetching loan audit', err);
      toast.error('Failed to load loan audit records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [status, loanType]);

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-lime-700" /> Dedicated Loan Portfolio Audit
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Independent oversight of loan applications, disbursements, repayment schedules, and arrears tracking.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search member name or PSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLoans()}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500"
          />
        </div>

        <select
          value={loanType}
          onChange={(e) => setLoanType(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500"
        >
          <option value="all">All Loan Types</option>
          <option value="cash">Cash Loan</option>
          <option value="investment">Investment Loan</option>
          <option value="educational">Educational Loan</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500"
        >
          <option value="">All Statuses</option>
          <option value="disbursed">Active / Disbursed</option>
          <option value="completed">Fully Paid</option>
          <option value="pending">Pending</option>
          <option value="defaulted">Overdue / Defaulted</option>
          <option value="rejected">Rejected</option>
        </select>

        <button
          onClick={fetchLoans}
          className="px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white text-xs font-semibold rounded-lg"
        >
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">Loading loan records...</div>
        ) : loans.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">No loan records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-lime-50 text-lime-900 uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-3">Loan ID</th>
                  <th className="py-3 px-3">Member</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Approved</th>
                  <th className="py-3 px-3">Repaid</th>
                  <th className="py-3 px-3">Outstanding</th>
                  <th className="py-3 px-3">Repayments</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {loans.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-900">LN-{l.id}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-gray-900">{l.member_name}</div>
                      <div className="text-gray-400 font-mono text-[10px]">{l.member_psn}</div>
                    </td>
                    <td className="py-2.5 px-3 uppercase text-gray-700">{l.loan_type}</td>
                    <td className="py-2.5 px-3 font-semibold">₦{Number(l.amount_approved).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-lime-700">₦{Number(l.amount_repaid).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-orange-700 font-bold">₦{Number(l.outstanding_balance).toLocaleString()}</td>
                    <td className="py-2.5 px-3">{l.repayments_count} paid</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.status === 'completed' ? 'bg-green-100 text-green-800' :
                        l.status === 'disbursed' || l.status === 'active' ? 'bg-lime-100 text-lime-800' :
                        l.status === 'defaulted' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => setSelectedLoan(l)}
                        className="p-1 text-lime-700 hover:bg-lime-50 rounded"
                        title="View Loan Repayments"
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

      {/* Repayments History Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-gray-200">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Loan #{selectedLoan.id} - Audit History</h3>
              <button onClick={() => setSelectedLoan(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="py-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span>Member: <strong>{selectedLoan.member_name}</strong></span>
                <span>PSN: <strong>{selectedLoan.member_psn}</strong></span>
              </div>
              <div className="flex justify-between">
                <span>Total Approved: <strong>₦{Number(selectedLoan.amount_approved).toLocaleString()}</strong></span>
                <span>Total Repaid: <strong className="text-lime-700">₦{Number(selectedLoan.amount_repaid).toLocaleString()}</strong></span>
              </div>
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-2 mb-1">Repayment Schedule Logs</h4>
            <div className="max-h-48 overflow-y-auto border rounded divide-y text-xs">
              {selectedLoan.repayments_history?.length === 0 ? (
                <p className="p-3 text-gray-400">No repayments recorded yet.</p>
              ) : (
                selectedLoan.repayments_history.map((r: any) => (
                  <div key={r.id} className="p-2 flex justify-between items-center">
                    <span>{r.repayment_date} ({r.payment_method})</span>
                    <span className="font-bold text-lime-700">₦{Number(r.repayment_amount).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedLoan(null)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-xs font-semibold rounded text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
