import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  CreditCard,
  TrendingUp,
  Receipt,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Calendar,
  Filter,
  ArrowRight,
  Eye,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { InvestmentProfitsModal } from '../../components/auditor/InvestmentProfitsModal';

export const AuditorDashboard: React.FC = () => {
  const [period, setPeriod] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateFilterMode, setDateFilterMode] = useState<'disbursement' | 'collection'>('disbursement');
  const [isProfitModalOpen, setIsProfitModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      let url = `/audit/dashboard?period=${period}&dateFilterMode=${dateFilterMode}`;
      if (period === 'custom' && startDate && endDate) {
        url = `/audit/dashboard?startDate=${startDate}&endDate=${endDate}&dateFilterMode=${dateFilterMode}`;
      }
      const res = await api.get(url);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load auditor dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [period, dateFilterMode]);

  const summary = data?.cooperativeSummary || {};
  const investmentProfits = summary.investmentProfits || {};
  const revenueSources = summary.revenueSources || {};
  const reconciliation = summary.reconciliation || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner - IMAN Lemon Green & Gold */}
      <div className="bg-gradient-to-r from-lime-800 via-lime-700 to-amber-700 text-white p-6 rounded-xl shadow-lg border-b-4 border-amber-400">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-200 rounded-full text-xs font-semibold mb-2 border border-amber-300/30">
              <Shield className="w-4 h-4" /> INDEPENDENT AUDIT & OVERSIGHT PORTAL
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cooperative Audit Dashboard</h1>
            <p className="text-lime-100 text-sm mt-1">
              Independent oversight of cooperative accounts, member statements, transactions, loans, and reconciliation.
            </p>
          </div>

          {/* Quick Date Range Filter */}
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20 flex flex-wrap items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-300" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-gray-900 text-white text-sm rounded px-3 py-1.5 border border-lime-400/40 focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {period === 'custom' && (
              <div className="flex items-center gap-2 mt-2 md:mt-0">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-900 text-white text-xs px-2 py-1 rounded border border-gray-600"
                />
                <span className="text-xs text-lime-200">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-900 text-white text-xs px-2 py-1 rounded border border-gray-600"
                />
                <button
                  onClick={fetchDashboard}
                  className="bg-amber-500 hover:bg-amber-600 text-gray-900 text-xs font-semibold px-2.5 py-1 rounded"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lime-600"></div>
          <span className="ml-3 text-gray-600 font-medium">Gathering audit records...</span>
        </div>
      ) : (
        <>
          {/* Key Oversight Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Membership Card */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Membership</span>
                <span className="p-2 bg-lime-100 text-lime-800 rounded-lg">
                  <Users className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {Number(summary.totalRegisteredMembers || 0).toLocaleString()}
              </div>
              <div className="mt-2 text-xs flex justify-between text-gray-600 pt-2 border-t border-gray-100">
                <span className="text-lime-700 font-medium">{summary.activeMembers || 0} Active</span>
                <span className="text-gray-400">{summary.inactiveMembers || 0} Inactive</span>
              </div>
            </div>

            {/* Total Contributions */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Contributions</span>
                <span className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                ₦{Number(summary.totalContributions || 0).toLocaleString()}
              </div>
              <div className="mt-2 text-xs flex justify-between text-gray-600 pt-2 border-t border-gray-100">
                <span>Savings: ₦{Number(summary.totalSavings || 0).toLocaleString()}</span>
                <span>Invest: ₦{Number(summary.totalInvestments || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Outstanding Loans */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding Loans</span>
                <span className="p-2 bg-orange-100 text-orange-800 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                ₦{Number(summary.totalOutstandingLoans || 0).toLocaleString()}
              </div>
              <div className="mt-2 text-xs flex justify-between text-gray-600 pt-2 border-t border-gray-100">
                <span>Disbursed: ₦{Number(summary.totalDisbursedLoans || 0).toLocaleString()}</span>
                <span className="text-lime-700">Repaid: ₦{Number(summary.totalLoanRepayments || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Cooperative Reserves */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Reserves</span>
                <span className="p-2 bg-lime-100 text-lime-800 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-bold text-lime-700 mt-2">
                ₦{Number(summary.totalReserves || 0).toLocaleString()}
              </div>
              <div className="mt-2 text-xs flex justify-between text-gray-600 pt-2 border-t border-gray-100">
                <span>Income: ₦{Number(summary.totalIncome || 0).toLocaleString()}</span>
                <span>Expenses: ₦{Number(summary.totalExpenses || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Secondary Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Investment Profits Overview Card */}
            <div 
              onClick={() => setIsProfitModalOpen(true)}
              className="bg-gradient-to-br from-lime-50 to-amber-50 p-4 rounded-xl border border-lime-300 hover:border-lime-500 shadow-sm hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-lime-900 uppercase tracking-wider">Investment Profits</span>
                <span className="p-2 bg-lime-600 text-white rounded-lg group-hover:scale-105 transition">
                  <TrendingUp className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-black text-lime-900 mt-2">
                ₦{Number(investmentProfits.totalProfitGenerated || 0).toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] space-y-1 text-gray-700 pt-2 border-t border-lime-200">
                <div className="flex justify-between">
                  <span>Collected to Date:</span>
                  <span className="font-bold text-emerald-700">₦{Number(investmentProfits.totalProfitCollected || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Outstanding Profit:</span>
                  <span className="font-bold text-amber-800">₦{Number(investmentProfits.totalOutstandingProfit || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500 pt-0.5">
                  <span>Total Contracts:</span>
                  <span className="font-medium text-gray-800">{investmentProfits.totalLoansCount || 0} Loans</span>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-lime-800 group-hover:text-lime-900">
                <span>View Murabaha Ledger</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Pending Approvals / Transactions</p>
                <p className="text-xl font-bold text-gray-900">{summary.totalPendingTransactions || 0}</p>
                <p className="text-xs text-blue-600">Pending review across loans & contributions</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Reversed / Cancelled Records</p>
                <p className="text-xl font-bold text-gray-900">{summary.totalReversedCancelledTransactions || 0}</p>
                <p className="text-xs text-red-600">Rejected contributions or cancelled loans</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-700 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Distributed Profit Dividends</p>
                <p className="text-xl font-bold text-gray-900">₦{Number(summary.totalDistributedProfit || 0).toLocaleString()}</p>
                <p className="text-xs text-purple-600">Total member dividend allocations</p>
              </div>
            </div>
          </div>

          {/* Revenue & Income Sources Audit Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-200 gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lime-100 text-lime-800 mb-1">
                  <Shield className="w-3.5 h-3.5" /> REVENUE & INCOME SOURCES AUDIT
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Cooperative Operational Revenue Streams
                </h3>
                <p className="text-xs text-gray-500">
                  Formula: <strong>Total Revenue = Registration Fees + Administrative Monthly Fees + Investment Profits + Other Revenue Sources</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsProfitModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lime-700 hover:bg-lime-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <Eye className="w-4 h-4" /> Audit Murabaha Profit Details
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Registration Fees */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                  Registration / Entrance Fees
                </span>
                <div className="text-xl font-bold text-gray-900">
                  ₦{Number(revenueSources.registrationFees || 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-gray-500">
                  Audited entrance fee for registered cooperative members.
                </p>
              </div>

              {/* Administrative Monthly Fees */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                  Administrative Monthly Fees
                </span>
                <div className="text-xl font-bold text-gray-900">
                  ₦{Number(revenueSources.adminMonthlyFees || 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-gray-500">
                  Monthly cooperative administrative charges & levies.
                </p>
              </div>

              {/* Investment Profits */}
              <div className="p-4 rounded-xl border-2 border-lime-400 bg-lime-50/40 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-lime-900 uppercase tracking-wider">
                    Investment Profits
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-lime-200 text-lime-800">
                    MURABAHA
                  </span>
                </div>
                <div className="text-xl font-black text-lime-900">
                  ₦{Number(revenueSources.investmentProfits || 0).toLocaleString()}
                </div>
                <div className="text-[11px] space-y-0.5 text-gray-600 pt-1 border-t border-lime-200">
                  <div className="flex justify-between">
                    <span>Collected:</span>
                    <span className="font-semibold text-emerald-700">₦{Number(revenueSources.investmentProfitCollected || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outstanding:</span>
                    <span className="font-semibold text-amber-700">₦{Number(revenueSources.investmentProfitOutstanding || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Other Revenue */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                  Other Revenue Sources
                </span>
                <div className="text-xl font-bold text-gray-900">
                  ₦{Number(revenueSources.otherRevenue || 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-gray-500">
                  Loan admin levies, forms, and passbook issuance fees.
                </p>
              </div>
            </div>

            {/* Total Revenue Highlight Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-lime-900 via-lime-800 to-amber-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-l-4 border-amber-400">
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-amber-300 block">
                  Total Cooperative Audited Revenue
                </span>
                <p className="text-xs text-lime-200 mt-0.5">
                  Recognized organizational revenue. Principal disbursements and loan repayments are balance sheet exchanges and strictly excluded.
                </p>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white whitespace-nowrap">
                ₦{Number(revenueSources.totalRevenue || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Investment Profit Reconciliation Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-200 gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-lime-700" />
                  Investment Profit Reconciliation
                </h3>
                <p className="text-xs text-gray-500">
                  Reconciles contractual profit markup against actual cash repayments collected.
                </p>
              </div>

              {/* Date Filter Toggle Mode */}
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg text-xs font-medium border border-gray-300">
                <span className="text-gray-500 pl-2">Filter By:</span>
                <button
                  type="button"
                  onClick={() => setDateFilterMode('disbursement')}
                  className={`px-3 py-1 rounded-md transition ${
                    dateFilterMode === 'disbursement'
                      ? 'bg-lime-700 text-white font-bold shadow'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Disbursement Date
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode('collection')}
                  className={`px-3 py-1 rounded-md transition ${
                    dateFilterMode === 'collection'
                      ? 'bg-amber-600 text-white font-bold shadow'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Collection / Payment Date
                </button>
              </div>
            </div>

            {/* Reconciliation Equation Visual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  1. Total Profit Generated
                </span>
                <div className="text-xl font-bold text-gray-900 mt-1">
                  ₦{Number(reconciliation.totalProfitGenerated || 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Total contractual profit markup across all Murabaha sales.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  2. Less: Profit Collected
                </span>
                <div className="text-xl font-bold text-emerald-900 mt-1">
                  - ₦{Number(reconciliation.totalProfitCollected || 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Proportionately recognized from verified loan repayments.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                  3. Equals: Outstanding Profit
                </span>
                <div className="text-xl font-bold text-amber-900 mt-1">
                  = ₦{Number(reconciliation.outstandingProfit || 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  Uncollected profit portion awaiting future installments.
                </p>
              </div>
            </div>

            {/* Status Breakdown Pills */}
            {reconciliation.byStatus && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-gray-800 block">Active Contracts</span>
                    <span className="text-[11px] text-gray-500">{reconciliation.byStatus.active?.count || 0} ongoing loans</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    ₦{Number(reconciliation.byStatus.active?.profitGenerated || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-gray-800 block">Completed / Fully Paid</span>
                    <span className="text-[11px] text-gray-500">{reconciliation.byStatus.completed?.count || 0} contracts settled</span>
                  </div>
                  <span className="font-bold text-emerald-700">
                    ₦{Number(reconciliation.byStatus.completed?.profitCollected || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-gray-800 block">Overdue / Arrears</span>
                    <span className="text-[11px] text-gray-500">{reconciliation.byStatus.other?.count || 0} flagged contracts</span>
                  </div>
                  <span className="font-bold text-amber-700">
                    ₦{Number(reconciliation.byStatus.other?.profitGenerated || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-lime-700" /> Audit Navigation & Deep Inspection
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                to="/auditor/transactions"
                className="p-4 rounded-lg border border-gray-200 hover:border-lime-500 hover:bg-lime-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 group-hover:text-lime-800">All Transactions</span>
                  <Receipt className="w-5 h-5 text-lime-600" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Audit the complete cooperative general ledger and 18 transaction types.</p>
              </Link>

              <Link
                to="/auditor/members"
                className="p-4 rounded-lg border border-gray-200 hover:border-lime-500 hover:bg-lime-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 group-hover:text-lime-800">Individual Member Audit</span>
                  <Users className="w-5 h-5 text-lime-600" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Select any member to inspect 13-point summaries and bank statements.</p>
              </Link>

              <Link
                to="/auditor/reconciliation"
                className="p-4 rounded-lg border border-gray-200 hover:border-amber-500 hover:bg-amber-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 group-hover:text-amber-800">Financial Reconciliation</span>
                  <CheckCircle className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Compare Opening Balance + Credits - Debits with Closing Balance.</p>
              </Link>

              <Link
                to="/auditor/exceptions"
                className="p-4 rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 group-hover:text-red-800">Audit Exceptions</span>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Review flagged items: large transfers, reversals, and unreferenced payments.</p>
              </Link>

              <Link
                to="/auditor/loans"
                className="p-4 rounded-lg border border-gray-200 hover:border-lime-500 hover:bg-lime-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 group-hover:text-lime-800">Loan Portfolio Audit</span>
                  <CreditCard className="w-5 h-5 text-lime-600" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Inspect loan applications, disbursements, repayments, and arrears.</p>
              </Link>

              <Link
                to="/auditor/reports"
                className="p-4 rounded-lg border border-gray-200 hover:border-lime-500 hover:bg-lime-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 group-hover:text-lime-800">Audit Reports (16 Types)</span>
                  <FileText className="w-5 h-5 text-lime-600" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Generate official audit reports with PDF/CSV exports and auditor sign-off.</p>
              </Link>

              <button
                type="button"
                onClick={() => setIsProfitModalOpen(true)}
                className="text-left p-4 rounded-lg border-2 border-lime-300 hover:border-lime-600 bg-lime-50/30 hover:bg-lime-50/70 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lime-900 group-hover:text-lime-950">Investment Profits Audit</span>
                  <TrendingUp className="w-5 h-5 text-lime-700" />
                </div>
                <p className="text-xs text-gray-600 mt-1">Inspect Murabaha loan profit markup, collected receipts, and balance reconciliation.</p>
              </button>
            </div>
          </div>

          {/* Drilldown Modal */}
          <InvestmentProfitsModal
            isOpen={isProfitModalOpen}
            onClose={() => setIsProfitModalOpen(false)}
            initialDateFilterMode={dateFilterMode}
            initialStartDate={startDate}
            initialEndDate={endDate}
          />
        </>
      )}
    </div>
  );
};
