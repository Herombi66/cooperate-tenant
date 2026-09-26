import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  Search,
  Filter,
  TrendingUp,
  CreditCard,
  DollarSign,
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface InvestmentProfitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateFilterMode?: 'disbursement' | 'collection';
  initialStartDate?: string;
  initialEndDate?: string;
}

export const InvestmentProfitsModal: React.FC<InvestmentProfitsModalProps> = ({
  isOpen,
  onClose,
  initialDateFilterMode = 'disbursement',
  initialStartDate = '',
  initialEndDate = ''
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [dateFilterMode, setDateFilterMode] = useState<'disbursement' | 'collection'>(initialDateFilterMode);
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [reportData, setReportData] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('dateFilterMode', dateFilterMode);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (search.trim()) params.append('search', search.trim());
      if (status) params.append('status', status);

      const res = await api.get(`/audit/investment-profits?${params.toString()}`);
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching investment profits audit:', err);
      toast.error(err.response?.data?.message || 'Failed to load investment profits audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, dateFilterMode, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      params.append('export', 'csv');
      params.append('dateFilterMode', dateFilterMode);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (search.trim()) params.append('search', search.trim());
      if (status) params.append('status', status);

      const response = await api.get(`/audit/investment-profits?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `investment-profits-audit-${dateFilterMode}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Investment profit audit CSV downloaded successfully');
    } catch (err) {
      console.error('CSV export failed', err);
      toast.error('Failed to export CSV');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const summary = reportData?.summary || {};
  const reconciliation = reportData?.reconciliation || {};
  const loans = reportData?.loans || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-lime-800 via-lime-700 to-amber-700 text-white px-6 py-5 flex items-center justify-between border-b-4 border-amber-400">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-200 border border-amber-300/30">
              <Shield className="w-3.5 h-3.5" /> SINGLE SOURCE OF TRUTH • MURABAHA & INVESTMENT LOANS
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-amber-300" />
              Investment Profits Audit Breakdown
            </h2>
            <p className="text-xs sm:text-sm text-lime-100">
              Profit component recorded directly in Murabaha sales contracts. Excludes non-revenue principal flows.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/20"
              title="Export filtered records to CSV"
            >
              <Download className="w-4 h-4 text-amber-300" /> Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/20"
              title="Print breakdown report"
            >
              <Printer className="w-4 h-4 text-lime-200" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition ml-2"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-gray-50 border-b border-gray-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Date Filtering Toggle */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-300 shadow-sm text-xs font-medium">
              <span className="text-gray-500 pl-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-lime-700" /> Date Mode:
              </span>
              <button
                type="button"
                onClick={() => setDateFilterMode('disbursement')}
                className={`px-3 py-1 rounded-md transition ${
                  dateFilterMode === 'disbursement'
                    ? 'bg-lime-700 text-white font-bold shadow'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                By Disbursement Date
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('collection')}
                className={`px-3 py-1 rounded-md transition ${
                  dateFilterMode === 'collection'
                    ? 'bg-amber-600 text-white font-bold shadow'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                By Collection / Payment Date
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-white border border-gray-300 text-xs font-semibold text-gray-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-lime-500"
              >
                <option value="">All Loan Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed / Fully Paid</option>
                <option value="approved">Approved</option>
                <option value="disbursed">Disbursed</option>
                <option value="overdue">Overdue / Arrears</option>
                <option value="defaulted">Defaulted</option>
              </select>
            </div>
          </div>

          {/* Search and Date Range Input */}
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Member Name, PSN, Loan ID, or Agreement Ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs"
              />
              <span>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-lime-700 hover:bg-lime-800 text-white rounded-lg font-semibold text-xs transition"
              >
                Filter
              </button>
              {(startDate || endDate || search || status) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setSearch('');
                    setStatus('');
                  }}
                  className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium text-xs transition"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-lime-50 border border-lime-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-lime-800 block">
                Total Profit Generated
              </span>
              <div className="text-xl sm:text-2xl font-black text-lime-900 mt-1">
                ₦{Number(summary.totalProfitGenerated || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-lime-700 mt-1 block">
                From {summary.totalLoansCount || 0} Investment Loans
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 block">
                Profit Collected to Date
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1">
                ₦{Number(summary.totalProfitCollected || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-700 mt-1 block">
                Proportionate cash inflows
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 block">
                Outstanding Profit
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-900 mt-1">
                ₦{Number(summary.totalOutstandingProfit || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-amber-700 mt-1 block">
                Pending future installment collections
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-700 block">
                Total Murabaha Disbursed
              </span>
              <div className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                ₦{Number(summary.totalDisbursedAmount || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-gray-500 mt-1 block">
                Total Repayment: ₦{Number(summary.totalRepaymentAmount || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Reconciliation Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-100 gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-lime-700" />
                <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">
                  Audit Profit Reconciliation Equation
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-lime-100 text-lime-800">
                {reconciliation.isBalanced ? '✓ Equation Balanced & Verified' : '⚠ Discrepancy Flagged'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500">1. Total Profit Generated</p>
                <p className="text-lg font-bold text-gray-900">
                  ₦{Number(reconciliation.totalProfitGenerated || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-400">Total contractual profit margin</p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-xs text-emerald-800">2. Less: Profit Collected</p>
                <p className="text-lg font-bold text-emerald-900">
                  - ₦{Number(reconciliation.totalProfitCollected || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-emerald-600">Calculated proportionately per repayment</p>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-800">3. Equals: Outstanding Profit</p>
                <p className="text-lg font-bold text-amber-900">
                  = ₦{Number(reconciliation.outstandingProfit || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-amber-600">Uncollected contractual profit receivable</p>
              </div>
            </div>

            {reconciliation.byStatus && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-2.5 rounded bg-gray-50 border border-gray-100 flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Active Loans ({reconciliation.byStatus.active?.count || 0})</span>
                  <span className="font-bold text-gray-800">₦{Number(reconciliation.byStatus.active?.profitGenerated || 0).toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded bg-gray-50 border border-gray-100 flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Completed ({reconciliation.byStatus.completed?.count || 0})</span>
                  <span className="font-bold text-emerald-700">₦{Number(reconciliation.byStatus.completed?.profitCollected || 0).toLocaleString()} collected</span>
                </div>
                <div className="p-2.5 rounded bg-gray-50 border border-gray-100 flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Overdue / Arrears ({reconciliation.byStatus.other?.count || 0})</span>
                  <span className="font-bold text-amber-700">₦{Number(reconciliation.byStatus.other?.profitGenerated || 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Auditor Note:</strong> Cooperative revenue strictly counts administrative fees, registration fees, and the <em>profit markup portion</em> of Murabaha contracts. Disbursed principal and principal repayments are asset exchanges on the balance sheet and are not recorded as organizational revenue.
              </span>
            </div>
          </div>

          {/* Loans Audit Breakdown Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-50/60">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-lime-700" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800">
                  Investment Loans & Murabaha Ledger ({loans.length} Records)
                </h4>
              </div>
              <span className="text-xs text-gray-500">
                Mode: <strong className="text-gray-800 capitalize">{dateFilterMode} Date</strong>
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-xs text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-600 mx-auto mb-2"></div>
                Loading investment profits audit records...
              </div>
            ) : loans.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-500">
                No investment loans found matching the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-lime-50/80 text-lime-950 uppercase font-semibold border-b border-lime-200">
                    <tr>
                      <th className="py-3 px-3">Loan ID</th>
                      <th className="py-3 px-3">Agreement Ref</th>
                      <th className="py-3 px-3">Member</th>
                      <th className="py-3 px-3">PSN</th>
                      <th className="py-3 px-3">Disbursed Date</th>
                      <th className="py-3 px-3 text-right">Disbursed (₦)</th>
                      <th className="py-3 px-3 text-center">Rate</th>
                      <th className="py-3 px-3 text-right">Profit Generated (₦)</th>
                      <th className="py-3 px-3 text-right">Total Sale (₦)</th>
                      <th className="py-3 px-3 text-right">Profit Collected (₦)</th>
                      <th className="py-3 px-3 text-right">Outstanding Profit (₦)</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {loans.map((item: any) => (
                      <tr key={item.loanId} className="hover:bg-lime-50/30 transition">
                        <td className="py-3 px-3 font-mono font-bold text-gray-900">
                          LN-{String(item.loanId).padStart(4, '0')}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-600">
                          {item.agreementRef}
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-900">
                          {item.memberName}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-500 text-[11px]">
                          {item.memberPsn}
                        </td>
                        <td className="py-3 px-3 text-gray-500">
                          {item.disbursementDate ? new Date(item.disbursementDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-800">
                          ₦{Number(item.disbursedAmount).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-lime-800">
                          {item.profitRate}
                        </td>
                        <td className="py-3 px-3 text-right font-bold font-mono text-lime-800">
                          ₦{Number(item.profitAmount).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-800">
                          ₦{Number(item.totalRepayment).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          ₦{Number(item.profitCollected).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">
                          ₦{Number(item.outstandingProfit).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'active' || item.status === 'disbursed'
                                ? 'bg-lime-100 text-lime-800'
                                : item.status === 'overdue' || item.status === 'defaulted'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold text-gray-900 border-t border-gray-300">
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-right uppercase text-[11px] tracking-wider">
                        Audit Totals ({loans.length} Loans):
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        ₦{Number(summary.totalDisbursedAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">—</td>
                      <td className="py-3 px-3 text-right font-mono text-lime-900">
                        ₦{Number(summary.totalProfitGenerated || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        ₦{Number(summary.totalRepaymentAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-800">
                        ₦{Number(summary.totalProfitCollected || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-800">
                        ₦{Number(summary.totalOutstandingProfit || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Official Cooperative Audit Document • Read-Only
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-semibold transition"
          >
            Close Drilldown
          </button>
        </div>

      </div>
    </div>
  );
};
