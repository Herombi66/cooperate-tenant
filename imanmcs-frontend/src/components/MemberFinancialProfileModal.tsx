import React, { useState, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  X,
  FileText,
  TrendingUp,
  Target,
  CreditCard,
  Coins,
  ArrowLeftRight,
  AlertCircle,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useTenantTerminology } from '../utils/tenantTerminology';

interface FinancialContributionTx {
  id: number;
  date: string | null;
  amount: number;
  savings?: number;
  investment?: number;
  target_saving?: number;
  status: string;
  payment_method: string;
  month: number;
  year: number;
  notes: string | null;
}

interface FinancialLoan {
  id: number;
  loan_type: string;
  status: string;
  amount_borrowed: number;
  interest_rate: number;
  repayment_period_months: number;
  monthly_repayment: number;
  total_repayment: number;
  application_date?: string;
  approval_date?: string;
  disbursement_date?: string;
  first_repayment_date?: string;
  purpose?: string | null;
  total_paid_verified: number;
  remaining_balance: number;
}

interface FinancialRepaymentRow {
  id: number;
  repayment_amount: number;
  repayment_date: string;
  payment_method: string;
  status: string;
  notes: string | null;
  included_in_balance: boolean;
  remaining_balance_after: number;
}

export interface MemberFinancialProfile {
  member: {
    id: number;
    role: string;
    status: string;
    psn: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    facility_name: string | null;
  };
  contributions: {
    total_approved: number;
    total_savings?: number;
    total_investment?: number;
    total_target_saving?: number;
    total_target_withdrawn?: number;
    net_balance?: number;
    history: FinancialContributionTx[];
  };
  loan: FinancialLoan | null;
  repayments: FinancialRepaymentRow[];
}

export interface StatementLedgerRow {
  id: string;
  date: string;
  reference: string;
  category: string;
  account?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status?: string;
  recorded_by?: string;
}

interface MemberFinancialProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | number;
  fallbackName?: string;
  fallbackPsn?: string;
  initialTab?: 'overview' | 'statement';
}

export const MemberFinancialProfileModal: React.FC<MemberFinancialProfileModalProps> = ({
  isOpen,
  onClose,
  memberId,
  fallbackName,
  fallbackPsn,
  initialTab = 'overview'
}) => {
  const { idLabel } = useTenantTerminology();

  const [activeTab, setActiveTab] = useState<'overview' | 'statement'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [profile, setProfile] = useState<MemberFinancialProfile | null>(null);
  const [statementRows, setStatementRows] = useState<StatementLedgerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Move Funds Modal State
  const [showMoveFunds, setShowMoveFunds] = useState(false);
  const [sourceAccount, setSourceAccount] = useState<'savings' | 'investment' | 'target_saving'>('savings');
  const [destAccount, setDestAccount] = useState<'savings' | 'investment' | 'target_saving'>('target_saving');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Fetch data
  const fetchData = async (silent = false) => {
    if (!memberId) return;
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      // 1. Fetch Profile
      const profRes = await api.get(`/members/${memberId}/financial-profile`);
      if (profRes.data?.success) {
        setProfile(profRes.data.profile);
        setLastUpdated(new Date());
      } else {
        setError(profRes.data?.message || 'Failed to load member financial profile');
      }

      // 2. Fetch Statement Ledger (for Tab 2)
      try {
        const stmtRes = await api.get(`/members/${memberId}/statement`);
        if (stmtRes.data?.success && stmtRes.data?.data?.statement) {
          setStatementRows(stmtRes.data.data.statement);
        } else {
          // Fallback to /reports/member-statement
          const fallbackRes = await api.get(`/reports/member-statement?user_id=${memberId}`);
          if (fallbackRes.data?.success && fallbackRes.data?.report?.statement) {
            setStatementRows(fallbackRes.data.report.statement);
          }
        }
      } catch (stmtErr) {
        console.warn('Could not load running statement ledger:', stmtErr);
      }

    } catch (err: any) {
      console.error('Error fetching financial profile:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load member financial profile';
      setError(msg);
      if (!silent) toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && memberId) {
      fetchData(false);
    }
  }, [isOpen, memberId]);

  if (!isOpen) return null;

  // Numbers breakdown
  const totalApproved = profile?.contributions?.total_approved || 0;
  const totalSavings = profile?.contributions?.total_savings ?? 0;
  const totalInvestment = profile?.contributions?.total_investment ?? 0;
  const totalTargetSaving = profile?.contributions?.total_target_saving ?? 0;
  const netBalance = profile?.contributions?.net_balance ?? (totalSavings + totalInvestment + totalTargetSaving);
  const loanBalance = profile?.loan ? profile.loan.remaining_balance : 0;
  const hasActiveLoan = !!profile?.loan;

  const memberName = profile?.member?.name || fallbackName || 'Member';
  const memberPsn = profile?.member?.psn || fallbackPsn || '';

  // Export Handlers
  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      const res = await api.get(`/reports/member-statement?user_id=${memberId}&format=pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `member_statement_${memberPsn || memberId}_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF Statement downloaded successfully');
    } catch (err: any) {
      console.error('PDF export failed:', err);
      toast.error('Failed to export PDF statement');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const res = await api.get(`/reports/member-statement?user_id=${memberId}&format=csv`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `member_statement_${memberPsn || memberId}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded successfully');
    } catch (err: any) {
      console.error('CSV export failed:', err);
      toast.error('Failed to export CSV statement');
    } finally {
      setExportingCsv(false);
    }
  };

  // Open move funds modal with default source
  const handleOpenMoveFunds = (source: 'savings' | 'investment' | 'target_saving') => {
    setSourceAccount(source);
    if (source === 'savings') setDestAccount('target_saving');
    else if (source === 'target_saving') setDestAccount('savings');
    else setDestAccount('savings');
    setTransferAmount('');
    setTransferNotes('');
    setShowMoveFunds(true);
  };

  // Execute Fund Transfer
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid transfer amount');
      return;
    }

    let available = 0;
    if (sourceAccount === 'savings') available = totalSavings;
    else if (sourceAccount === 'investment') available = totalInvestment;
    else if (sourceAccount === 'target_saving') available = totalTargetSaving;

    if (amt > available) {
      toast.error(`Amount exceeds available ${sourceAccount.replace(/_/g, ' ')} balance (₦${available.toLocaleString()})`);
      return;
    }

    try {
      setTransferLoading(true);
      const res = await api.post(`/members/${memberId}/transfer-funds`, {
        source: sourceAccount,
        destination: destAccount,
        amount: amt,
        notes: transferNotes || undefined
      });

      if (res.data?.success) {
        toast.success(res.data?.message || 'Funds transferred successfully');
        setShowMoveFunds(false);
        fetchData(true);
      } else {
        toast.error(res.data?.message || 'Transfer failed');
      }
    } catch (err: any) {
      console.error('Transfer error:', err);
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  // Quick percent click
  const handleQuickPercent = (percent: number) => {
    let available = 0;
    if (sourceAccount === 'savings') available = totalSavings;
    else if (sourceAccount === 'investment') available = totalInvestment;
    else if (sourceAccount === 'target_saving') available = totalTargetSaving;

    const calc = Math.floor(available * (percent / 100));
    setTransferAmount(calc > 0 ? String(calc) : '');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-7xl mx-auto shadow-2xl flex flex-col max-h-[92vh] my-auto overflow-hidden border border-gray-100">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-white shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Member Financial Profile</h3>
            <div className="text-sm font-medium text-gray-500 mt-0.5">
              {memberName} {memberPsn ? `(${memberPsn})` : ''}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {lastUpdated && (
              <span className="text-xs font-medium text-gray-500 mr-1 hidden sm:inline">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            {/* PDF Statement Button */}
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf || loading}
              className="inline-flex items-center px-3.5 py-1.5 bg-[#5da314] hover:bg-[#4d8810] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {exportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5" />
              )}
              PDF Statement
            </button>

            {/* CSV Button */}
            <button
              onClick={handleExportCsv}
              disabled={exportingCsv || loading}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {exportingCsv ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5" />
              )}
              CSV
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg transition-colors ml-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#fbfcfd]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
              <p className="text-sm font-medium text-gray-500">Loading member financial profile...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Error Loading Profile</h4>
                <p className="text-sm mt-1">{error}</p>
                <button
                  onClick={() => fetchData(false)}
                  className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-md transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : profile ? (
            <>
              {/* Top 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                
                {/* 1. TOTAL SAVINGS */}
                <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#065f46] tracking-wider uppercase">
                        TOTAL SAVINGS
                      </span>
                      <span className="text-[10px] font-semibold bg-[#d1fae5] text-[#065f46] px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-[#065f46] my-2">
                      ₦{Number(totalSavings).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#a7f3d0]/60">
                    <span className="text-[11px] font-medium text-[#047857]">
                      Available to transfer
                    </span>
                    <button
                      onClick={() => handleOpenMoveFunds('savings')}
                      className="px-2.5 py-1 text-xs font-medium bg-[#6ee7b7] text-[#064e3b] hover:bg-[#34d399] rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      Move Funds
                    </button>
                  </div>
                </div>

                {/* 2. TARGET SAVINGS */}
                <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#92400e] tracking-wider uppercase">
                        TARGET SAVINGS
                      </span>
                      <div className="w-5 h-5 rounded-full bg-[#fef3c7] flex items-center justify-center text-[#d97706]">
                        <Target className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[#92400e] my-2">
                      ₦{Number(totalTargetSaving).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#fde68a]/60">
                    <span className="text-[11px] font-medium text-[#b45309]">
                      Available to transfer
                    </span>
                    <button
                      onClick={() => handleOpenMoveFunds('target_saving')}
                      className="px-2.5 py-1 text-xs font-medium bg-[#fcd34d] text-[#78350f] hover:bg-[#fbbf24] rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      Move Funds
                    </button>
                  </div>
                </div>

                {/* 3. TOTAL APPROVED */}
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#475569] tracking-wider uppercase">
                        TOTAL APPROVED
                      </span>
                      <div className="w-5 h-5 rounded-full bg-[#f1f5f9] flex items-center justify-center text-amber-600">
                        <Coins className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[#0f172a] mt-2 mb-0.5">
                      ₦{Number(totalApproved).toLocaleString()}
                    </div>
                    <div className="text-xs font-semibold text-[#16a34a]">
                      Net Balance: ₦{Number(netBalance).toLocaleString()}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#e2e8f0]/60">
                    <span className="text-[11px] font-medium text-[#64748b]">
                      All member contributions
                    </span>
                  </div>
                </div>

                {/* 4. LOAN BALANCE */}
                <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1e40af] tracking-wider uppercase">
                        LOAN BALANCE
                      </span>
                      <div className="w-5 h-5 rounded-full bg-[#dbeafe] flex items-center justify-center text-[#2563eb]">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[#1e40af] my-2">
                      ₦{Number(loanBalance).toLocaleString()}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#bfdbfe]/60">
                    <span className="text-[11px] font-medium text-[#3b82f6]">
                      {hasActiveLoan ? `Loan #${profile.loan?.id} (${profile.loan?.status})` : 'No active loan'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Sub-Header Tabs */}
              <div className="border-b border-gray-200 mt-6">
                <div className="flex items-center space-x-8">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 text-sm font-semibold transition-colors flex items-center relative ${
                      activeTab === 'overview'
                        ? 'text-[#4d7c0f] border-b-2 border-[#4d7c0f]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Overview (Passbook & Loans)
                  </button>
                  <button
                    onClick={() => setActiveTab('statement')}
                    className={`pb-3 text-sm font-semibold transition-colors flex items-center relative ${
                      activeTab === 'statement'
                        ? 'text-[#4d7c0f] border-b-2 border-[#4d7c0f]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    Account Statement (Running Balance)
                  </button>
                </div>
              </div>

              {/* Tab 1: Overview (Passbook & Loans) */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  
                  {/* Left Column: Passbook & Transactions */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
                      <h4 className="text-sm font-bold text-gray-900">Passbook & Transactions</h4>
                      <span className="text-xs font-normal text-gray-500">
                        {profile.contributions.history?.length || 0} records
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-[480px]">
                      <table className="min-w-full divide-y divide-gray-100 text-left">
                        <thead className="bg-[#fcfdfd] text-gray-500 text-[11px] font-bold uppercase tracking-wider sticky top-0 border-b border-gray-100">
                          <tr>
                            <th className="px-5 py-3">DATE</th>
                            <th className="px-5 py-3">BREAKDOWN</th>
                            <th className="px-5 py-3">TOTAL</th>
                            <th className="px-5 py-3 text-center">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                          {(!profile.contributions.history || profile.contributions.history.length === 0) ? (
                            <tr>
                              <td colSpan={4} className="px-5 py-12 text-center text-gray-400 font-normal">
                                No transactions found.
                              </td>
                            </tr>
                          ) : (
                            profile.contributions.history.map((c) => {
                              const parts = [];
                              if (Number(c.savings || 0) !== 0) parts.push(`Sav: ₦${Number(c.savings).toLocaleString()}`);
                              if (Number(c.investment || 0) !== 0) parts.push(`Inv: ₦${Number(c.investment).toLocaleString()}`);
                              if (Number(c.target_saving || 0) !== 0) parts.push(`Tar: ₦${Number(c.target_saving).toLocaleString()}`);
                              const breakdownText = parts.length > 0 ? parts.join(' | ') : (c.notes || c.payment_method?.replace(/_/g, ' ') || 'Contribution');

                              return (
                                <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                                    {c.date ? new Date(c.date).toLocaleDateString() : '—'}
                                  </td>
                                  <td className="px-5 py-3 text-gray-800 max-w-[220px] truncate" title={c.notes || breakdownText}>
                                    {breakdownText}
                                  </td>
                                  <td className="px-5 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                    ₦{Number(c.amount || 0).toLocaleString()}
                                  </td>
                                  <td className="px-5 py-3 text-center whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                      String(c.status).toLowerCase() === 'approved'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {c.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Loan Details & Repayments */}
                  <div className="space-y-6">
                    
                    {/* Current Loan Details Box */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                      <h4 className="text-sm font-bold text-gray-900 mb-3.5">Current Loan Details</h4>
                      {!profile.loan ? (
                        <div className="py-6 text-center text-sm text-gray-500 font-normal">
                          No active loan found for this member.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                          <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-[11px]">Loan Type</span>
                            <span className="font-semibold text-gray-900 capitalize mt-0.5 block">
                              {profile.loan.loan_type}
                            </span>
                          </div>
                          <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-[11px]">Status</span>
                            <span className="font-semibold text-gray-900 capitalize mt-0.5 block">
                              {profile.loan.status}
                            </span>
                          </div>
                          <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-[11px]">Amount Borrowed</span>
                            <span className="font-semibold text-gray-900 mt-0.5 block">
                              ₦{Number(profile.loan.amount_borrowed || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-[11px]">Repayment Term</span>
                            <span className="font-semibold text-gray-900 mt-0.5 block">
                              {profile.loan.repayment_period_months} months
                            </span>
                          </div>
                          <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-[11px]">Monthly Repayment</span>
                            <span className="font-semibold text-gray-900 mt-0.5 block">
                              ₦{Number(profile.loan.monthly_repayment || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-[11px]">Paid (Verified)</span>
                            <span className="font-semibold text-green-700 mt-0.5 block">
                              ₦{Number(profile.loan.total_paid_verified || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="col-span-2 sm:col-span-3 bg-blue-50/60 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                            <span className="text-blue-900 font-medium">Remaining Loan Balance</span>
                            <span className="text-sm font-bold text-blue-900">
                              ₦{Number(profile.loan.remaining_balance || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Repayment History Box */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="px-5 py-3.5 border-b border-gray-100 bg-white">
                        <h4 className="text-sm font-bold text-gray-900">Repayment History</h4>
                      </div>
                      <div className="overflow-x-auto max-h-[300px]">
                        <table className="min-w-full divide-y divide-gray-100 text-left">
                          <thead className="bg-[#fcfdfd] text-gray-500 text-[11px] font-bold uppercase tracking-wider sticky top-0 border-b border-gray-100">
                            <tr>
                              <th className="px-4 py-3">DATE</th>
                              <th className="px-4 py-3">AMOUNT</th>
                              <th className="px-4 py-3">METHOD</th>
                              <th className="px-4 py-3">STATUS</th>
                              <th className="px-4 py-3">REMAINING</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {(!profile.repayments || profile.repayments.length === 0) ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-gray-400 font-normal">
                                  No active loan repayments to display.
                                </td>
                              </tr>
                            ) : (
                              profile.repayments.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                                    {r.repayment_date ? new Date(r.repayment_date).toLocaleDateString() : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 font-semibold text-gray-900 whitespace-nowrap">
                                    ₦{Number(r.repayment_amount || 0).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-600 capitalize whitespace-nowrap">
                                    {r.payment_method?.replace(/_/g, ' ')}
                                  </td>
                                  <td className="px-4 py-2.5 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                      String(r.status).toLowerCase() === 'verified'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {r.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                                    ₦{Number(r.remaining_balance_after || 0).toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* Tab 2: Account Statement (Running Balance) */}
              {activeTab === 'statement' && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs mt-2">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Official Account Statement Ledger</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Chronological sequence of all debits, credits, and continuous running balances.
                      </p>
                    </div>
                    <div className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                      Closing Balance: ₦{Number(netBalance).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="min-w-full divide-y divide-gray-100 text-left">
                      <thead className="bg-[#fcfdfd] text-gray-500 text-[11px] font-bold uppercase tracking-wider sticky top-0 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3">DATE</th>
                          <th className="px-4 py-3">CATEGORY</th>
                          <th className="px-4 py-3">REFERENCE</th>
                          <th className="px-4 py-3">DESCRIPTION</th>
                          <th className="px-4 py-3 text-right">DEBIT (NGN)</th>
                          <th className="px-4 py-3 text-right">CREDIT (NGN)</th>
                          <th className="px-4 py-3 text-right">RUNNING BALANCE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {statementRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-16 text-center text-gray-400 font-normal">
                              No statement entries recorded for this member.
                            </td>
                          </tr>
                        ) : (
                          statementRows.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  row.category === 'Contribution'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : row.category === 'Transfer'
                                    ? 'bg-purple-100 text-purple-800'
                                    : row.category === 'Disbursement' || row.category === 'Withdrawal'
                                    ? 'bg-amber-100 text-amber-800'
                                    : row.category === 'Loan'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {row.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                                {row.reference}
                              </td>
                              <td className="px-4 py-3 text-gray-800 max-w-sm truncate" title={row.description}>
                                {row.description}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-red-600 whitespace-nowrap">
                                {row.debit > 0 ? `-₦${Number(row.debit).toLocaleString()}` : '—'}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                                {row.credit > 0 ? `+₦${Number(row.credit).toLocaleString()}` : '—'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap bg-gray-50/50">
                                ₦{Number(row.balance).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </>
          ) : null}
        </div>

      </div>

      {/* MOVE FUNDS MODAL (INNER POPUP) */}
      {showMoveFunds && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-60 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] my-auto overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <h4 className="text-base font-bold text-gray-900">Move Member Funds</h4>
              </div>
              <button
                onClick={() => setShowMoveFunds(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="mt-4 space-y-4">
              
              {/* Source Account */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Source Account
                </label>
                <select
                  value={sourceAccount}
                  onChange={(e) => {
                    const src = e.target.value as any;
                    setSourceAccount(src);
                    if (src === destAccount) {
                      setDestAccount(src === 'savings' ? 'target_saving' : 'savings');
                    }
                  }}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="savings">Savings Account (Avail: ₦{Number(totalSavings).toLocaleString()})</option>
                  {totalInvestment > 0 && (
                    <option value="investment">Investment Account (Avail: ₦{Number(totalInvestment).toLocaleString()})</option>
                  )}
                  <option value="target_saving">Target Savings (Avail: ₦{Number(totalTargetSaving).toLocaleString()})</option>
                </select>
              </div>

              {/* Destination Account */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Destination Account
                </label>
                <select
                  value={destAccount}
                  onChange={(e) => setDestAccount(e.target.value as any)}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {sourceAccount !== 'savings' && <option value="savings">Savings Account</option>}
                  {sourceAccount !== 'target_saving' && <option value="target_saving">Target Savings</option>}
                  {totalInvestment > 0 && sourceAccount !== 'investment' && <option value="investment">Investment Account</option>}
                </select>
              </div>

              {/* Transfer Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Amount (₦)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(25)}
                      className="text-[10px] font-semibold px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(50)}
                      className="text-[10px] font-semibold px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(100)}
                      className="text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-sm"
                    >
                      Max
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full text-sm font-semibold rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Notes / Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Member requested fund reallocation"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowMoveFunds(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center shadow-xs disabled:opacity-50"
                >
                  {transferLoading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Confirm Transfer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
