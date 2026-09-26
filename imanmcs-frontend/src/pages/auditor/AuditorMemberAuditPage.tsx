import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  FileText,
  Download,
  Printer,
  DollarSign,
  CreditCard,
  TrendingUp,
  Calendar,
  Clock,
  Shield,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const AuditorMemberAuditPage: React.FC = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'statement' | 'timeline'>('profile');

  // Member Audit Data
  const [memberData, setMemberData] = useState<any | null>(null);
  const [statementData, setStatementData] = useState<any | null>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Date filters for statement
  const [statementStartDate, setStatementStartDate] = useState<string>('');
  const [statementEndDate, setStatementEndDate] = useState<string>('');

  // Fetch Member Directory for Selector
  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoadingMembers(true);
        const res = await api.get('/members?limit=100');
        if (res.data.success) {
          const list = res.data.members || res.data.data?.members || [];
          setMembers(list);
          if (list.length > 0) {
            setSelectedMemberId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching members list', err);
        toast.error('Failed to load members list');
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, []);

  // Fetch specific member audit data whenever selectedMemberId changes
  useEffect(() => {
    if (!selectedMemberId) return;

    const fetchMemberAuditDetails = async () => {
      try {
        setLoadingDetails(true);
        const [auditRes, stmtRes, timeRes] = await Promise.all([
          api.get(`/audit/members/${selectedMemberId}`),
          api.get(`/audit/members/${selectedMemberId}/statement?startDate=${statementStartDate}&endDate=${statementEndDate}`),
          api.get(`/audit/members/${selectedMemberId}/timeline`)
        ]);

        if (auditRes.data.success) setMemberData(auditRes.data.data);
        if (stmtRes.data.success) setStatementData(stmtRes.data.data);
        if (timeRes.data.success) setTimelineData(timeRes.data.data?.timeline || []);
      } catch (err) {
        console.error('Error loading member audit details', err);
        toast.error('Could not load member audit records');
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchMemberAuditDetails();
  }, [selectedMemberId, statementStartDate, statementEndDate]);

  const handleExportCsv = async () => {
    if (!selectedMemberId) return;
    try {
      const res = await api.get(`/audit/members/${selectedMemberId}/statement?format=csv`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_statement_${memberData?.profile?.psn || selectedMemberId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Audit statement CSV exported');
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPdf = async () => {
    if (!selectedMemberId) return;
    try {
      const res = await api.get(`/audit/members/${selectedMemberId}/statement?format=pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_statement_${memberData?.profile?.psn || selectedMemberId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Audit statement PDF exported');
    } catch (err) {
      toast.error('Failed to export PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredMembers = members.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.psn && m.psn.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  const profile = memberData?.profile || {};
  const summary = memberData?.financialSummary || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-lime-700" /> Individual Member Account Audit
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Complete member financial trail, bank-style statements with running balance, and activity timeline.
          </p>
        </div>

        {/* Export & Print actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-gray-600" /> Export CSV
          </button>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 text-xs font-semibold rounded-lg transition"
            title="Export Official PDF"
          >
            <Download className="w-4 h-4 text-gray-900" /> Export PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-lime-600 hover:bg-lime-700 text-white text-xs font-semibold rounded-lg transition"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Member Selector, Right Audit View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Member Directory */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter members by Name or PSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500"
            />
          </div>

          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {loadingMembers ? (
              <div className="py-8 text-center text-xs text-gray-500">Loading directory...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">No members found</div>
            ) : (
              filteredMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`w-full text-left p-3 rounded-lg transition flex items-center justify-between ${
                    selectedMemberId === m.id
                      ? 'bg-lime-50 border border-lime-300'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{m.name}</div>
                    <div className="text-xs text-gray-500 font-mono">PSN: {m.psn}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${selectedMemberId === m.id ? 'text-lime-700' : 'text-gray-300'}`} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Member Audit Dossier */}
        <div className="lg:col-span-8 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 bg-white px-4 rounded-t-xl pt-2 gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition ${
                activeTab === 'profile'
                  ? 'border-lime-600 text-lime-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Member Profile & Financial Summary
            </button>
            <button
              onClick={() => setActiveTab('statement')}
              className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition ${
                activeTab === 'statement'
                  ? 'border-lime-600 text-lime-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Member Account Statement
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition ${
                activeTab === 'timeline'
                  ? 'border-lime-600 text-lime-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Transaction Timeline
            </button>
          </div>

          {loadingDetails ? (
            <div className="bg-white p-12 rounded-b-xl border border-gray-200 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-600 mx-auto"></div>
              <p className="text-xs text-gray-500 mt-2">Loading member audit dossier...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: Profile & 13-Point Financial Summary */}
              {activeTab === 'profile' && (
                <div className="space-y-4 bg-white p-6 rounded-b-xl border border-gray-200 shadow-sm">
                  {/* Member Profile Box */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-lime-50/50 p-4 rounded-xl border border-lime-200">
                    <div>
                      <span className="text-xs text-gray-500 block">Full Name:</span>
                      <span className="text-base font-bold text-gray-900">{profile.name}</span>
                      <span className="text-xs text-gray-500 block mt-2">PSN / Member ID:</span>
                      <span className="font-mono text-xs font-semibold text-lime-800">{profile.psn}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-500 block">Phone Number:</span>
                      <span className="text-sm font-medium text-gray-900">{profile.phone}</span>
                      <span className="text-xs text-gray-500 block mt-2">Facility / Ministry:</span>
                      <span className="text-sm text-gray-800">{profile.facility}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-500 block">Membership Status:</span>
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-lime-100 text-lime-800 uppercase">
                        {profile.membershipStatus || 'Active'}
                      </span>
                      <span className="text-xs text-gray-500 block mt-2">Date Joined:</span>
                      <span className="text-xs text-gray-700">
                        {profile.dateJoined ? new Date(profile.dateJoined).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* 13-Metric Member Financial Summary Grid */}
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pt-2">
                    Member Financial Summary (Official Audit Audit Ledger)
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 block">Total Contributions</span>
                      <span className="text-base font-bold text-gray-900">₦{Number(summary.totalContributions || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 block">Total Savings</span>
                      <span className="text-base font-bold text-gray-900">₦{Number(summary.totalSavings || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 block">Total Investments</span>
                      <span className="text-base font-bold text-gray-900">₦{Number(summary.totalInvestments || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 block">Target Savings</span>
                      <span className="text-base font-bold text-gray-900">₦{Number(summary.totalTargetContributions || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 block">Entrance Fees Paid</span>
                      <span className="text-base font-bold text-gray-900">₦{Number(summary.totalEntranceFees || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 block">Administrative Fees</span>
                      <span className="text-base font-bold text-gray-900">₦{Number(summary.totalAdministrativeFees || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 block">Total Loans Disbursed</span>
                      <span className="text-base font-bold text-gray-900">₦{Number(summary.totalLoansReceived || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 block">Total Loan Repayments</span>
                      <span className="text-base font-bold text-lime-700">₦{Number(summary.totalLoanRepayments || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <span className="text-xs text-orange-700 block font-semibold">Outstanding Loan Balance</span>
                      <span className="text-base font-bold text-orange-800">₦{Number(summary.currentOutstandingLoan || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 block">Total Withdrawals</span>
                      <span className="text-base font-bold text-gray-900">₦{Number(summary.totalWithdrawals || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 block">Profit Dividends Received</span>
                      <span className="text-base font-bold text-purple-700">₦{Number(summary.totalProfitReceived || 0).toLocaleString()}</span>
                    </div>

                    <div className="p-3 bg-lime-100 rounded-lg border border-lime-300">
                      <span className="text-xs text-lime-800 block font-bold">Current Net Balance</span>
                      <span className="text-lg font-extrabold text-lime-900">₦{Number(summary.currentBalance || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Bank-Style Account Statement */}
              {activeTab === 'statement' && (
                <div className="space-y-4 bg-white p-6 rounded-b-xl border border-gray-200 shadow-sm">
                  {/* Statement Watermark Alert */}
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center justify-between text-xs text-amber-800">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Shield className="w-4 h-4 text-amber-600" />
                      OFFICIAL AUDIT STATEMENT - Running balance calculated sequentially.
                    </span>
                    <span className="text-gray-500 font-mono">
                      Generated for: {profile.name} ({profile.psn})
                    </span>
                  </div>

                  {/* Statement Table */}
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-100 text-gray-700 text-xs uppercase font-semibold border-b">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Reference</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3 text-right">Debit (₦)</th>
                          <th className="py-2.5 px-3 text-right">Credit (₦)</th>
                          <th className="py-2.5 px-3 text-right">Running Balance (₦)</th>
                          <th className="py-2.5 px-3">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {statementData?.statement?.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-gray-500">
                              No statement entries found for this member
                            </td>
                          </tr>
                        ) : (
                          statementData?.statement?.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50 font-mono">
                              <td className="py-2 px-3">{row.date}</td>
                              <td className="py-2 px-3 text-gray-500">{row.reference}</td>
                              <td className="py-2 px-3 font-sans text-gray-900 font-medium">{row.description}</td>
                              <td className="py-2 px-3 text-right text-red-600">
                                {row.debit > 0 ? Number(row.debit).toLocaleString() : '-'}
                              </td>
                              <td className="py-2 px-3 text-right text-lime-700 font-semibold">
                                {row.credit > 0 ? Number(row.credit).toLocaleString() : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900 bg-gray-50/50">
                                {Number(row.balance).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 font-sans text-gray-500">{row.recorded_by}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: Chronological Transaction Timeline */}
              {activeTab === 'timeline' && (
                <div className="space-y-4 bg-white p-6 rounded-b-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                    Chronological Member Lifecycle & Account History
                  </h3>

                  <div className="relative border-l-2 border-lime-300 ml-4 space-y-6">
                    {timelineData.length === 0 ? (
                      <p className="text-xs text-gray-500 pl-4">No chronological events logged.</p>
                    ) : (
                      timelineData.map((ev, idx) => (
                        <div key={idx} className="relative pl-6">
                          {/* Dot */}
                          <div className="absolute -left-2 top-1.5 w-4 h-4 rounded-full bg-lime-600 border-2 border-white shadow-sm" />
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-sm transition">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-gray-900">{ev.type}</span>
                              <span className="text-xs text-gray-500">{new Date(ev.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{ev.details}</p>
                            <div className="mt-2 text-xs flex justify-between items-center pt-2 border-t border-gray-200">
                              <span className="font-bold text-lime-700">₦{Number(ev.amount || 0).toLocaleString()}</span>
                              <span className="text-gray-400">Recorded by: {ev.recordedBy || 'System'}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
