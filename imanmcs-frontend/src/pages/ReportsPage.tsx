import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Calendar,
  TrendingUp, DollarSign, Users, CreditCard, Receipt, Loader, AlertTriangle, Upload
} from 'lucide-react';
import ReportsService, {
  FinancialReportData,
  MemberReportData,
  LoanReportData,
  ExpenseReportData,
  ProfitSharingReportData,
  ComplianceReportData,
  MemberStatementReportData,
  GeneralLedgerReportData
} from '../services/reportsService';
import api from '../services/api';

type ReportData =
  | FinancialReportData
  | MemberReportData
  | LoanReportData
  | ExpenseReportData
  | ProfitSharingReportData
  | ComplianceReportData
  | MemberStatementReportData
  | GeneralLedgerReportData;

export const ReportsPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const minYear = 2020;
  const yearOptions = Array.from(
    { length: Math.max(1, currentYear - minYear + 1) },
    (_, i) => String(currentYear - i)
  );

  const [selectedPeriod, setSelectedPeriod] = useState(String(currentYear));
  const [reportType, setReportType] = useState('financial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [statementPsn, setStatementPsn] = useState('');
  const [uploadDateFrom, setUploadDateFrom] = useState('');
  const [uploadDateTo, setUploadDateTo] = useState('');
  const [uploadType, setUploadType] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadBatches, setUploadBatches] = useState<any[]>([]);
  const [uploadMetrics, setUploadMetrics] = useState<any | null>(null);

  // Fetch data when reportType or selectedPeriod changes
  useEffect(() => {
    fetchReportData();
  }, [reportType, selectedPeriod, uploadDateFrom, uploadDateTo, uploadType, uploadStatus, statementPsn]);

  const fetchReportData = async () => {
    if (!loading) {
      setLoading(true);
      setError(null);

      try {
        if (reportType === 'uploads') {
          setReportData(null);
          const params: any = { page: 1, limit: 50 };
          if (uploadType) params.type = uploadType;
          if (uploadStatus) params.status = uploadStatus;
          if (uploadDateFrom) params.date_from = uploadDateFrom;
          if (uploadDateTo) params.date_to = uploadDateTo;

          const [listRes, metricsRes] = await Promise.all([
            api.get('/bulk-uploads', { params }),
            api.get('/bulk-uploads/metrics', { params: { type: uploadType || undefined, date_from: uploadDateFrom || undefined, date_to: uploadDateTo || undefined } })
          ]);

          if (listRes.data?.success) setUploadBatches(listRes.data.batches || []);
          if (metricsRes.data?.success) setUploadMetrics(metricsRes.data.metrics || null);
          return;
        }

        let data: ReportData;
        switch (reportType) {
          case 'financial':
            data = await ReportsService.getFinancialReport({ period: selectedPeriod });
            break;
          case 'members':
            data = await ReportsService.getMemberReport({ period: selectedPeriod });
            break;
          case 'loans':
            data = await ReportsService.getLoanReport({ period: selectedPeriod });
            break;
          case 'expenses':
            data = await ReportsService.getExpenseReport({ period: selectedPeriod });
            break;
          case 'profit':
            data = await ReportsService.getProfitSharingReport({ period: selectedPeriod });
            break;
          case 'compliance':
            data = await ReportsService.getComplianceReport({ period: selectedPeriod });
            break;
          case 'member-statement': {
            const psn = statementPsn.trim();
            if (!psn) {
              setReportData(null);
              setLoading(false);
              return;
            }
            data = await ReportsService.getMemberStatementReport({ psn, period: selectedPeriod });
            break;
          }
          case 'general-ledger':
            data = await ReportsService.getGeneralLedgerReport({ period: selectedPeriod });
            break;
          default:
            throw new Error('Invalid report type');
        }
        setReportData(data);
      } catch (err) {
        console.error('Failed to fetch report data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report data');
        setReportData(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const reports = [
    {
      id: 'financial',
      name: 'Financial Summary Report',
      description: 'Comprehensive financial overview including contributions, loans, and profit sharing',
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'members',
      name: 'Member Activity Report',
      description: 'Member registration, contributions, and engagement statistics',
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'loans',
      name: 'Loan Portfolio Report',
      description: 'Loan applications, approvals, disbursements, and repayment tracking',
      icon: CreditCard,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'expenses',
      name: 'Expense Analysis Report',
      description: 'Cooperative expenses breakdown including salaries, operations, and PRs',
      icon: Receipt,
      color: 'bg-orange-100 text-orange-600',
    },
    {
      id: 'profit',
      name: 'Profit Sharing Report',
      description: 'Investment performance and Sharia-compliant profit distribution',
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'compliance',
      name: 'Compliance & Audit Report',
      description: 'Regulatory compliance and internal audit findings',
      icon: FileText,
      color: 'bg-gray-100 text-gray-600',
    },
    {
      id: 'member-statement',
      name: 'Member Statement',
      description: 'Audit-ready statement with contributions, withdrawals, loans, and repayments (PDF/CSV)',
      icon: FileText,
      color: 'bg-amber-100 text-amber-600',
    },
    {
      id: 'general-ledger',
      name: 'General Ledger',
      description: 'Cooperative-wide ledger totals for the selected year (JSON/CSV)',
      icon: FileText,
      color: 'bg-slate-100 text-slate-600',
    },
    {
      id: 'uploads',
      name: 'Bulk Upload Reports',
      description: 'Contribution imports and loan repayment uploads with error reports and performance metrics',
      icon: Upload,
      color: 'bg-indigo-100 text-indigo-600',
    },
  ];

  const renderFinancialReport = () => {
    if (!reportData || !('totalContributions' in reportData)) return null;

    const data = reportData as FinancialReportData;
    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Contributions</p>
                <p className="text-2xl font-bold text-gray-900">₦{(data.totalContributions / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Loans Outstanding</p>
                <p className="text-2xl font-bold text-gray-900">₦{(data.outstandingAmount / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Profit Generated</p>
                <p className="text-2xl font-bold text-gray-900">₦{(data.profitGenerated / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Receipt className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">₦{(data.totalExpenses / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contribution Breakdown */}
        {data.totalContributions > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contribution Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">₦{(data.savingsContributions / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-gray-600">Savings Contributions</div>
                <div className="text-xs text-gray-500">{((data.savingsContributions / data.totalContributions) * 100).toFixed(1)}% of total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">₦{(data.investmentContributions / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-gray-600">Investment Contributions</div>
                <div className="text-xs text-gray-500">{((data.investmentContributions / data.totalContributions) * 100).toFixed(1)}% of total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">₦{(data.targetSavingsContributions / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-gray-600">Target Savings</div>
                <div className="text-xs text-gray-500">{((data.targetSavingsContributions / data.totalContributions) * 100).toFixed(1)}% of total</div>
              </div>
            </div>
          </div>
        )}

        {/* Loan Performance */}
        {(data.totalLoans > 0 || data.loansAmount > 0) && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Portfolio Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{data.totalLoans}</div>
                <div className="text-sm text-gray-600">Total Loans</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">₦{(data.loansAmount / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-gray-600">Total Disbursed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">₦{(data.repaidAmount / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-gray-600">Amount Repaid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {data.loansAmount > 0 ? ((data.repaidAmount / data.loansAmount) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-sm text-gray-600">Repayment Rate</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMemberReport = () => {
    if (!reportData || !('memberStats' in reportData)) return null;

    const data = reportData as MemberReportData;
    const stats = data.memberStats;
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Activity Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalMembers}</div>
            <div className="text-sm text-gray-600">Total Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.activeMembers}</div>
            <div className="text-sm text-gray-600">Active Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.contributionRatio}</div>
            <div className="text-sm text-gray-600">Contribution Ratio</div>
          </div>
        </div>
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Report generated on {new Date(data.generatedAt).toLocaleDateString()}</p>
        </div>
      </div>
    );
  };

  const renderLoanReport = () => {
    if (!reportData || !('portfolioSummary' in reportData)) return null;
    const data = reportData as LoanReportData;
    const rows = Array.isArray(data.portfolioSummary) ? data.portfolioSummary : [];
    const totalCount = rows.reduce((sum: number, r: any) => sum + Number(r.count || 0), 0);
    const totalAmount = rows.reduce((sum: number, r: any) => sum + Number(r.total_amount || 0), 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Loans (Filtered)</div>
            <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Approved Amount</div>
            <div className="text-2xl font-bold text-gray-900">₦{Number(totalAmount).toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Portfolio Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Interest</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-sm text-gray-500">No loan records found for this period.</td>
                  </tr>
                ) : (
                  rows.map((r: any) => (
                    <tr key={String(r.status)} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{String(r.status || 'unknown')}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{Number(r.count || 0)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">₦{Number(r.total_amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{Number(r.avg_interest || 0).toFixed(2)}%</td>
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

  const renderExpenseReport = () => {
    if (!reportData || !('expenseBreakdown' in reportData)) return null;
    const data = reportData as ExpenseReportData;
    const rows = Array.isArray(data.expenseBreakdown) ? data.expenseBreakdown : [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Expenses</div>
            <div className="text-2xl font-bold text-gray-900">₦{Number(data.totalExpenses || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Top Category</div>
            <div className="text-2xl font-bold text-gray-900">{String(data.topExpenseCategories?.[0]?.category || '—')}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Expense Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-sm text-gray-500">No expenses found for this period.</td>
                  </tr>
                ) : (
                  rows.map((r: any) => (
                    <tr key={String(r.category)} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{String(r.category || 'unknown')}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{Number(r.count || 0)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">₦{Number(r.total_amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">₦{Number(r.avg_amount || 0).toLocaleString()}</td>
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

  const renderProfitReport = () => {
    if (!reportData || !('summary' in reportData)) return null;
    const data = reportData as any;
    const summary = data.summary || {};
    const recent = Array.isArray(data.recentShares) ? data.recentShares : [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Profit Distributed</div>
            <div className="text-2xl font-bold text-gray-900">₦{Number(summary.totalProfitDistributed || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Paid Shares</div>
            <div className="text-2xl font-bold text-gray-900">{Number(summary.paidShares || 0)}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Pending Shares</div>
            <div className="text-2xl font-bold text-gray-900">{Number(summary.pendingShares || 0)}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Unique Members</div>
            <div className="text-2xl font-bold text-gray-900">{Number(summary.uniqueMembers || 0)}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Profit Shares</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PSN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-sm text-gray-500">No profit share records found.</td>
                  </tr>
                ) : (
                  recent.map((r: any) => (
                    <tr key={String(r.id)} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{String(r.memberName || 'Unknown')}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{String(r.memberPSN || '—')}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">₦{Number(r.profitAmount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{String(r.status || '')}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
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

  const renderComplianceReport = () => {
    if (!reportData || !('complianceStatus' in reportData)) return null;
    const data = reportData as ComplianceReportData;
    const status = data.complianceStatus || {};
    const risks = data.riskIndicators || {};

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(status).map((k) => (
              <div key={k} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                <div className="text-sm text-gray-700">{k}</div>
                <div className={`text-sm font-semibold ${String((status as any)[k]) === 'PASS' ? 'text-green-700' : 'text-yellow-700'}`}>
                  {String((status as any)[k])}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Indicators</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-xs text-gray-500">High</div>
              <div className="text-lg font-semibold text-gray-900">{String(risks.high)}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-xs text-gray-500">Medium</div>
              <div className="text-lg font-semibold text-gray-900">{String(risks.medium)}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-xs text-gray-500">Low</div>
              <div className="text-lg font-semibold text-gray-900">{String(risks.low)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const downloadUploadBatchFile = async (batchId: number, kind: 'report_csv' | 'report_pdf' | 'errors_csv' | 'errors_xlsx') => {
    try {
      const exportDate = new Date().toISOString().slice(0, 10);
      const map: Record<string, { url: string; filename: string; mime: string }> = {
        report_csv: { url: `/bulk-uploads/${batchId}/report.csv`, filename: `upload_${batchId}_report_${exportDate}.csv`, mime: 'text/csv' },
        report_pdf: { url: `/bulk-uploads/${batchId}/report.pdf`, filename: `upload_${batchId}_report_${exportDate}.pdf`, mime: 'application/pdf' },
        errors_csv: { url: `/bulk-uploads/${batchId}/errors.csv`, filename: `upload_${batchId}_errors_${exportDate}.csv`, mime: 'text/csv' },
        errors_xlsx: { url: `/bulk-uploads/${batchId}/errors.xlsx`, filename: `upload_${batchId}_failed_records_${exportDate}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      };
      const spec = map[kind];
      const res = await api.get(spec.url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: spec.mime });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = spec.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Download failed');
    }
  };

  const downloadMemberStatement = async (kind: 'pdf' | 'csv') => {
    const psn = statementPsn.trim();
    if (!psn) {
      alert('Enter a PSN first.');
      return;
    }
    try {
      const exportDate = new Date().toISOString().slice(0, 10);
      const res = await api.get('/reports/member-statement', {
        params: { psn, period: selectedPeriod, format: kind },
        responseType: 'blob'
      });
      const mime = kind === 'pdf' ? 'application/pdf' : 'text/csv';
      const blob = new Blob([res.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `member_statement_${psn}_${selectedPeriod}_${exportDate}.${kind}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Download failed');
    }
  };

  const downloadGeneralLedger = async () => {
    try {
      const exportDate = new Date().toISOString().slice(0, 10);
      const res = await api.get('/reports/general-ledger', {
        params: { period: selectedPeriod, format: 'csv' },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `general_ledger_${selectedPeriod}_${exportDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Download failed');
    }
  };

  const renderMemberStatement = () => {
    const data = reportData && 'balances' in reportData && 'member' in reportData ? (reportData as MemberStatementReportData) : null;
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Member Statement</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Member PSN</label>
              <input
                value={statementPsn}
                onChange={(e) => setStatementPsn(e.target.value)}
                placeholder="Enter PSN (e.g., 30446)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadMemberStatement('pdf')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white"
              >
                Download PDF
              </button>
              <button
                onClick={() => downloadMemberStatement('csv')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>

        {data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Contribution Balance</div>
                <div className="text-2xl font-bold text-gray-900">₦{Number(data.balances.contribution_balance || 0).toLocaleString()}</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Approved Contributions</div>
                <div className="text-2xl font-bold text-gray-900">₦{Number(data.balances.total_contributions_approved || 0).toLocaleString()}</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Approved Withdrawals</div>
                <div className="text-2xl font-bold text-gray-900">₦{Number(data.balances.total_withdrawals_approved || 0).toLocaleString()}</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Outstanding Loans</div>
                <div className="text-2xl font-bold text-gray-900">₦{Number(data.balances.total_outstanding_loans || 0).toLocaleString()}</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Member</div>
              <div className="text-lg font-semibold text-gray-900">
                {data.member.name} ({data.member.psn})
              </div>
              <div className="text-sm text-gray-700">{data.member.email}</div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderGeneralLedger = () => {
    const data = reportData && 'totals' in reportData ? (reportData as GeneralLedgerReportData) : null;
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">General Ledger</h3>
            <p className="text-sm text-gray-600">Totals for the selected year</p>
          </div>
          <button onClick={downloadGeneralLedger} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white">
            Download CSV
          </button>
        </div>

        {data ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Contributions</div>
              <div className="text-2xl font-bold text-gray-900">₦{Number(data.totals.contributions || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Withdrawals</div>
              <div className="text-2xl font-bold text-gray-900">₦{Number(data.totals.withdrawals || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Loan Approved</div>
              <div className="text-2xl font-bold text-gray-900">₦{Number(data.totals.loan_approved || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Loan Repayments</div>
              <div className="text-2xl font-bold text-gray-900">₦{Number(data.totals.loan_repayments || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Expenses</div>
              <div className="text-2xl font-bold text-gray-900">₦{Number(data.totals.expenses || 0).toLocaleString()}</div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderTableView = () => {
    return (
      <div className="space-y-6">
        {reportType === 'financial' && renderFinancialReport()}
        {reportType === 'members' && renderMemberReport()}
        {reportType === 'loans' && renderLoanReport()}
        {reportType === 'expenses' && renderExpenseReport()}
        {reportType === 'profit' && renderProfitReport()}
        {reportType === 'compliance' && renderComplianceReport()}
        {reportType === 'member-statement' && renderMemberStatement()}
        {reportType === 'general-ledger' && renderGeneralLedger()}
        {reportType === 'uploads' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Upload Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <input
                    type="date"
                    value={uploadDateFrom}
                    onChange={(e) => setUploadDateFrom(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <input
                    type="date"
                    value={uploadDateTo}
                    onChange={(e) => setUploadDateTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">All</option>
                    <option value="contributions_import">Contributions Import</option>
                    <option value="loan_repayments_import">Loan Repayments Upload</option>
                    <option value="members_import">Members Import</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={uploadStatus}
                    onChange={(e) => setUploadStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">All</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>

              {uploadMetrics ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500">Batches</div>
                    <div className="text-lg font-semibold text-gray-900">{uploadMetrics.batches}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500">Total Records</div>
                    <div className="text-lg font-semibold text-gray-900">{uploadMetrics.total_records}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500">Success Rate</div>
                    <div className="text-lg font-semibold text-gray-900">{Math.round((uploadMetrics.success_rate || 0) * 100)}%</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500">Avg Duration</div>
                    <div className="text-lg font-semibold text-gray-900">{Math.round((uploadMetrics.average_duration_ms || 0) / 1000)}s</div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Downloads</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadBatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-6 text-sm text-gray-500">No batches found.</td>
                      </tr>
                    ) : (
                      uploadBatches.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">#{b.id}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{b.type}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{b.status}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {b.success_count}/{b.total_records} (fail: {b.failure_count})
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{b.created_at ? new Date(b.created_at).toLocaleString() : '—'}</td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => downloadUploadBatchFile(b.id, 'report_pdf')}
                                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-white"
                              >
                                Report PDF
                              </button>
                              <button
                                onClick={() => downloadUploadBatchFile(b.id, 'report_csv')}
                                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-white"
                              >
                                Report CSV
                              </button>
                              <button
                                onClick={() => downloadUploadBatchFile(b.id, 'errors_xlsx')}
                                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-white"
                              >
                                Failed XLSX
                              </button>
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
        )}
      </div>
    );
  };

  const renderChart = () => {
    return (
      <div className="text-center py-8">
        <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Visual Charts Coming Soon</h3>
        <p className="text-gray-600">Interactive charts will be available in the next update. Table view shows complete data.</p>
      </div>
    );
  };

  const renderGraph = () => {
    return (
      <div className="text-center py-8">
        <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Analytics Coming Soon</h3>
        <p className="text-gray-600">Advanced graphs and analytics will be available in the next update.</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive reporting for cooperative operations and compliance</p>
        </div>
        <div className="flex space-x-3">
          {reportType !== 'uploads' ? (
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <button
            onClick={() => {
              if (reportType === 'uploads') {
                alert('Use the download buttons in the Bulk Upload Reports table.');
                return;
              }
              if (!reportData) {
                alert('No data to export. Please select a report first.');
                return;
              }

              let csvContent = '';

              if ('totalContributions' in reportData) {
                const data = reportData as FinancialReportData;
                csvContent = [
                  ['IMAN Cooperative Financial Report', selectedPeriod].join(','),
                  [''], ['Metric', 'Amount (₦)', 'Percentage'].join(','),
                  ['Total Contributions', data.totalContributions, '100%'].join(','),
                  ['- Savings Contributions', data.savingsContributions, `${data.totalContributions > 0 ? ((data.savingsContributions / data.totalContributions) * 100).toFixed(1) : 0}%`].join(','),
                  ['- Investment Contributions', data.investmentContributions, `${data.totalContributions > 0 ? ((data.investmentContributions / data.totalContributions) * 100).toFixed(1) : 0}%`].join(','),
                  ['- Target Savings', data.targetSavingsContributions, `${data.totalContributions > 0 ? ((data.targetSavingsContributions / data.totalContributions) * 100).toFixed(1) : 0}%`].join(','),
                  [''], ['Loan Portfolio', '', ''].join(','),
                  ['Total Loans', data.totalLoans, ''].join(','),
                  ['Loans Amount', data.loansAmount, ''].join(','),
                  ['Repaid Amount', data.repaidAmount, `${data.loansAmount > 0 ? ((data.repaidAmount / data.loansAmount) * 100).toFixed(1) : 0}%`].join(','),
                  ['Outstanding Amount', data.outstandingAmount, ''].join(','),
                  [''], ['Financial Performance', '', ''].join(','),
                  ['Total Expenses', data.totalExpenses, ''].join(','),
                  ['Profit Generated', data.profitGenerated, ''].join(','),
                  ['Profit Distributed', data.profitDistributed, ''].join(',')
                ].join('\n');
              } else if ('memberStats' in reportData) {
                const data = reportData as MemberReportData;
                csvContent = [
                  ['IMAN Cooperative Member Report', selectedPeriod].join(','),
                  [''], ['Metric', 'Count', 'Percentage'].join(','),
                  ['Total Members', data.memberStats.totalMembers, '100%'].join(','),
                  ['Active Members', data.memberStats.activeMembers, `${data.memberStats.totalMembers > 0 ? ((data.memberStats.activeMembers / data.memberStats.totalMembers) * 100).toFixed(1) : 0}%`].join(','),
                  ['Contribution Ratio', data.memberStats.contributionRatio || 'N/A', ''].join(',')
                ].join('\n');
              } else {
                csvContent = [
                  ['IMAN Cooperative Report', selectedPeriod].join(','),
                  [''], ['Report Type', reportType].join(','),
                  ['Period', selectedPeriod].join(','),
                  ['Generated On', new Date().toLocaleDateString()].join(',')
                ].join('\n');
              }

              // Create and download file
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${reportType}_report_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
            className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div
            key={report.id}
            onClick={() => {
              setReportType(report.id);
              setError(null);
            }}
            className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
              reportType === report.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center mb-3">
              <div className={`p-2 rounded-lg ${report.color}`}>
                <report.icon className="w-6 h-6" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">{report.name}</h3>
            </div>
            <p className="text-sm text-gray-600">{report.description}</p>
          </div>
        ))}
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {reports.find(r => r.id === reportType)?.name} - {selectedPeriod}
          </h2>
        </div>
        <div className="p-6">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-primary-500 mr-3" />
              <span className="text-gray-600">Loading {reports.find(r => r.id === reportType)?.name.toLowerCase()}...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-6 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-800">Error: {error}</span>
              </div>
              <button
                onClick={() => fetchReportData()}
                className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              >
                Retry
              </button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && reportData && renderTableView()}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
