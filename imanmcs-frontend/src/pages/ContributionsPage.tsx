import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign, Search, Filter, Download, Upload, PlusCircle,
  Calendar, TrendingUp, Users, Target, Wallet, Loader, Check, X, FileText
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { exportToExcel } from '../utils/excel';

interface Contribution {
  id: string;
  memberPsn: string;
  memberName: string;
  savings: number;
  investment: number;
  fixedDeposit?: number;
  targetSaving?: number;
  totalAmount: number;
  month: string;
  year: number;
  status: 'pending' | 'approved' | 'rejected';
  paymentMethod: string;
  createdAt: string;
  confirmedAt?: string;
}

interface MemberInfo {
  id: number;
  psn: string;
  name: string;
  email: string;
  hasUserAccount: boolean;
  configurations?: {
    savings: number;
    investment: number;
    targetSaving: number;
  };
}

interface IncreaseRequestRow {
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
  membershipApplication?: {
    id: number;
    psn: string;
    name: string;
    email: string;
  };
}

export const ContributionsPage: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatedMember, setValidatedMember] = useState<MemberInfo | null>(null);
  const [validatingPsn, setValidatingPsn] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [importBatchId, setImportBatchId] = useState<number | null>(null);
  const [showImportReviewModal, setShowImportReviewModal] = useState(false);
  const [importBatch, setImportBatch] = useState<any | null>(null);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importErrorsLoading, setImportErrorsLoading] = useState(false);
  const [importErrorsPage, setImportErrorsPage] = useState(1);
  const [importErrorsTotalPages, setImportErrorsTotalPages] = useState(1);
  const [importReviewError, setImportReviewError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [editingErrorId, setEditingErrorId] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [activeTab, setActiveTab] = useState<'contributions' | 'increase_requests'>('contributions');
  const [increaseRequests, setIncreaseRequests] = useState<IncreaseRequestRow[]>([]);
  const [increaseRequestsLoading, setIncreaseRequestsLoading] = useState(false);
  const [increaseRequestsStatus, setIncreaseRequestsStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'all'>('PENDING');
  const [increaseRequestsSearch, setIncreaseRequestsSearch] = useState('');
  const [reviewingRequest, setReviewingRequest] = useState<IncreaseRequestRow | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const increaseRequestsScrollRef = useRef<HTMLDivElement | null>(null);
  const [increaseRequestsScrollState, setIncreaseRequestsScrollState] = useState({ top: 0, left: 0 });
  const [increaseRequestsScrollPercent, setIncreaseRequestsScrollPercent] = useState(0);
  const [increaseRequestsScrollEdges, setIncreaseRequestsScrollEdges] = useState({
    atTop: true,
    atBottom: true,
    atLeft: true,
    atRight: true
  });

  const importReviewPollTimeoutRef = useRef<number | null>(null);
  const importReviewPollActiveRef = useRef(false);
  const importReviewPollInFlightRef = useRef(false);

  const downloadTotalCsvTemplate = () => {
    const csvContent = `PSN,Total_Amount,Month,Year,Payment_Method
PSN001,5000,12,2025,bank transfer
PSN002,6500,2025-12,salary deduction`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contributions_total_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTypedCsvTemplate = () => {
    const csvContent = `PSN,Type,Amount,Month,Payment_Method
PSN001,savings,3000,2025-12,bank transfer
PSN001,investment,2000,2025-12,bank transfer
PSN002,target_savings,1500,12,2025,salary deduction`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contributions_typed_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTotalXlsxTemplate = () => {
    const rows = [
      { PSN: 'PSN001', Total_Amount: 5000, Month: 12, Year: 2025, Payment_Method: 'bank transfer' },
      { PSN: 'PSN002', Total_Amount: 6500, Month: '2025-12', Payment_Method: 'salary deduction' }
    ];
    exportToExcel(rows, 'contributions_total_template', 'Contributions');
  };

  const downloadTypedXlsxTemplate = () => {
    const rows = [
      { PSN: 'PSN001', Type: 'savings', Amount: 3000, Month: '2025-12', Payment_Method: 'bank transfer' },
      { PSN: 'PSN001', Type: 'investment', Amount: 2000, Month: '2025-12', Payment_Method: 'bank transfer' },
      { PSN: 'PSN002', Type: 'target_savings', Amount: 1500, Month: 12, Year: 2025, Payment_Method: 'salary deduction' }
    ];
    exportToExcel(rows, 'contributions_typed_template', 'Contributions');
  };

  useEffect(() => {
    if (activeTab === 'contributions') {
      fetchContributions();
      return;
    }
    fetchIncreaseRequests();
  }, [page, searchTerm, statusFilter, activeTab, increaseRequestsStatus]);

  const loadImportBatch = async (batchId: number) => {
    try {
      const res = await api.get(`/bulk-uploads/${batchId}`);
      const batch = res.data?.success ? (res.data.batch || null) : null;
      if (batch) {
        setImportBatch(batch);
        setImportReviewError(null);
      }
      return batch;
    } catch (e: any) {
      setImportReviewError(e?.response?.data?.message || 'Failed to load import batch status');
      return null;
    }
  };

  const loadImportErrors = async (batchId: number, pageNum: number) => {
    try {
      setImportErrorsLoading(true);
      const res = await api.get(`/bulk-uploads/${batchId}/errors`, {
        params: { status: 'FAILED', page: pageNum, limit: 50 }
      });
      if (res.data?.success) {
        setImportErrors(res.data.errors || []);
        setImportErrorsTotalPages(res.data.pagination?.pages || 1);
        setImportReviewError(null);
      } else {
        setImportErrors([]);
        setImportErrorsTotalPages(1);
        setImportReviewError(null);
      }
    } catch (e: any) {
      setImportErrors([]);
      setImportErrorsTotalPages(1);
      setImportReviewError(e?.response?.data?.message || 'Failed to load import errors');
      toast.error(e?.response?.data?.message || 'Failed to load import errors');
    } finally {
      setImportErrorsLoading(false);
    }
  };

  const openImportReview = async (batchId: number) => {
    setImportBatchId(batchId);
    setImportErrorsPage(1);
    setEditingErrorId(null);
    setEditingRecord({});
    setImportReviewError(null);
    setShowImportReviewModal(true);
    await Promise.all([loadImportBatch(batchId), loadImportErrors(batchId, 1)]);
  };

  useEffect(() => {
    if (!showImportReviewModal || !importBatchId) return;
    importReviewPollActiveRef.current = true;

    const stop = () => {
      importReviewPollActiveRef.current = false;
      importReviewPollInFlightRef.current = false;
      if (importReviewPollTimeoutRef.current != null) {
        window.clearTimeout(importReviewPollTimeoutRef.current);
        importReviewPollTimeoutRef.current = null;
      }
    };

    const schedule = () => {
      if (!importReviewPollActiveRef.current) return;
      importReviewPollTimeoutRef.current = window.setTimeout(runOnce, 1500);
    };

    const runOnce = async () => {
      if (!importReviewPollActiveRef.current) return;
      if (importReviewPollInFlightRef.current) return schedule();
      importReviewPollInFlightRef.current = true;

      try {
        const batch = await loadImportBatch(importBatchId);
        if (!batch) {
          stop();
          return;
        }
        const status = String(batch?.status || '').toUpperCase();
        const completedAt = batch?.completed_at || batch?.completedAt || null;
        const isProcessing = status === 'PROCESSING' && !completedAt;

        if (!isProcessing) {
          if (editingErrorId == null) {
            await loadImportErrors(importBatchId, importErrorsPage);
          }
          stop();
          return;
        }
      } catch {
        stop();
        return;
      } finally {
        importReviewPollInFlightRef.current = false;
      }

      schedule();
    };

    runOnce();
    return stop;
  }, [showImportReviewModal, importBatchId, importErrorsPage, editingErrorId]);

  const fetchIncreaseRequests = async () => {
    try {
      setIncreaseRequestsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: increaseRequestsStatus
      });
      const res = await api.get(`/contributions/increase-requests?${params}`);
      if (res.data?.success) {
        setIncreaseRequests((res.data.requests || []) as IncreaseRequestRow[]);
        setTotalPages(res.data.pagination?.pages || 1);
      } else {
        setIncreaseRequests([]);
        setTotalPages(1);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load increase requests');
      setIncreaseRequests([]);
      setTotalPages(1);
    } finally {
      setIncreaseRequestsLoading(false);
    }
  };

  const displayedIncreaseRequests = increaseRequests.filter((r) => {
    const q = increaseRequestsSearch.trim().toLowerCase();
    if (!q) return true;
    const name = (r.membershipApplication?.name || '').toLowerCase();
    const psn = (r.membershipApplication?.psn || '').toLowerCase();
    const email = (r.membershipApplication?.email || '').toLowerCase();
    return name.includes(q) || psn.includes(q) || email.includes(q);
  });

  const updateIncreaseRequestsScrollMeta = (el: HTMLDivElement) => {
    const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const top = el.scrollTop;
    const left = el.scrollLeft;
    const percent = maxTop > 0 ? Math.round((top / maxTop) * 100) : 0;

    setIncreaseRequestsScrollPercent(percent);
    setIncreaseRequestsScrollEdges({
      atTop: top <= 0,
      atBottom: top >= maxTop - 1,
      atLeft: left <= 0,
      atRight: left >= maxLeft - 1
    });
  };

  const onIncreaseRequestsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setIncreaseRequestsScrollState({ top: el.scrollTop, left: el.scrollLeft });
    updateIncreaseRequestsScrollMeta(el);
  };

  const onIncreaseRequestsKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = increaseRequestsScrollRef.current;
    if (!el) return;

    const step = 48;
    const pageStep = Math.max(160, Math.floor(el.clientHeight * 0.9));
    const hStep = 64;

    const scrollBy = (opts: { top?: number; left?: number }) => {
      el.scrollBy({ top: opts.top || 0, left: opts.left || 0, behavior: 'smooth' });
    };
    const scrollTo = (opts: { top?: number; left?: number }) => {
      el.scrollTo({ top: opts.top ?? el.scrollTop, left: opts.left ?? el.scrollLeft, behavior: 'smooth' });
    };

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        scrollBy({ top: step });
        return;
      case 'ArrowUp':
        e.preventDefault();
        scrollBy({ top: -step });
        return;
      case 'ArrowRight':
        e.preventDefault();
        scrollBy({ left: hStep });
        return;
      case 'ArrowLeft':
        e.preventDefault();
        scrollBy({ left: -hStep });
        return;
      case 'PageDown':
        e.preventDefault();
        scrollBy({ top: pageStep });
        return;
      case 'PageUp':
        e.preventDefault();
        scrollBy({ top: -pageStep });
        return;
      case 'Home':
        e.preventDefault();
        scrollTo({ top: 0 });
        return;
      case 'End':
        e.preventDefault();
        scrollTo({ top: el.scrollHeight });
        return;
      default:
        return;
    }
  };

  useEffect(() => {
    if (activeTab !== 'increase_requests') return;
    const el = increaseRequestsScrollRef.current;
    if (!el) return;
    el.scrollTop = increaseRequestsScrollState.top;
    el.scrollLeft = increaseRequestsScrollState.left;
    updateIncreaseRequestsScrollMeta(el);
  }, [activeTab, increaseRequestsStatus, increaseRequestsSearch, page, increaseRequests.length]);

  const exportIncreaseRequestsExcel = () => {
    if (displayedIncreaseRequests.length === 0) {
      toast.error('No requests to export');
      return;
    }
    const exportDate = new Date().toISOString().slice(0, 10);
    const rows = displayedIncreaseRequests.map((r) => ({
      'Member Name': r.membershipApplication?.name || 'Unknown',
      PSN: r.membershipApplication?.psn || '',
      'Requested Amount (₦)': Number(r.requested_amount),
      'Request Date': r.requested_at ? new Date(r.requested_at).toLocaleDateString('en-US') : ''
    }));
    exportToExcel(rows, `contribution_increase_requests_${exportDate}`, 'Increase Requests');
  };

  const exportIncreaseRequestsPdf = async () => {
    if (displayedIncreaseRequests.length === 0) {
      toast.error('No requests to export');
      return;
    }
    try {
      const exportDate = new Date().toISOString().slice(0, 10);
      const ids = displayedIncreaseRequests.map((r) => r.id);
      const res = await api.post(
        '/contributions/increase-requests/export/pdf',
        { ids },
        { responseType: 'blob' }
      );

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contribution_increase_requests_${exportDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to export PDF');
    }
  };

  const openReview = (req: IncreaseRequestRow, action: 'approve' | 'reject') => {
    setReviewingRequest(req);
    setReviewAction(action);
    setReviewComment('');
  };

  const submitReview = async () => {
    if (!reviewingRequest) return;
    const comment = reviewComment.trim();
    if (!comment) {
      toast.error('Comment is required');
      return;
    }
    try {
      setSubmittingReview(true);
      const endpoint =
        reviewAction === 'approve'
          ? `/contributions/increase-requests/${reviewingRequest.id}/approve`
          : `/contributions/increase-requests/${reviewingRequest.id}/reject`;
      const res = await api.post(endpoint, { comment });
      if (res.data?.success) {
        toast.success(`Request ${reviewAction}d`);
        setReviewingRequest(null);
        await fetchIncreaseRequests();
      } else {
        toast.error(res.data?.message || 'Failed to update request');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update request');
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await api.get(`/contributions/?${params}`);
      console.log('📊 [DEBUG] Contributions data:', response.data.contributions);
      const contribData = response.data.contributions.map((contrib: any) => {
        const data = {
          id: contrib.id.toString(),
          memberPsn: contrib.user.membershipApplication?.psn || 'Unknown',
          memberName: contrib.user.membershipApplication?.name || 'Unknown Member',
          savings: parseFloat(contrib.savings) || 0,
          investment: parseFloat(contrib.investment) || 0,
          targetSaving: parseFloat(contrib.target_saving) || 0,
          totalAmount: parseFloat(contrib.total_amount) || 0,
          month: `${contrib.month}/${contrib.year}`,
          year: contrib.year,
          status: contrib.status || 'approved',
          paymentMethod: contrib.payment_method || 'bank_transfer',
          createdAt: contrib.created_at ? new Date(contrib.created_at).toISOString().split('T')[0] : '',
          confirmedAt: contrib.approval_date ? new Date(contrib.approval_date).toISOString().split('T')[0] : ''
        };
        console.log('📊 [DEBUG] Processed contribution:', {
          id: data.id,
          savings: data.savings,
          investment: data.investment,
          targetSaving: data.targetSaving,
          totalAmount: data.totalAmount
        });

        // Also show raw backend data to check field names
        console.log('📊 [DEBUG] Raw backend contrib:', JSON.stringify(contrib, null, 2));
        return data;
      });
      setContributions(contribData);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch contributions:', error);
      toast.error('Failed to load contributions');
    } finally {
      setLoading(false);
    }
  };

  const filteredContributions = contributions.filter(contribution => {
    const matchesSearch =
      contribution.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contribution.memberPsn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contribution.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalContributions = contributions.reduce((sum, c) => sum + c.totalAmount, 0);
  const savingsTotal = contributions.reduce((sum, c) => sum + c.savings, 0);
  const investmentTotal = contributions.reduce((sum, c) => sum + c.investment, 0);
  const targetSavingsTotal = contributions.reduce((sum, c) => sum + (c.targetSaving || 0), 0);
  const pendingCount = contributions.filter(c => c.status === 'pending').length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'savings': return <Wallet className="w-4 h-4" />;
      case 'investment': return <TrendingUp className="w-4 h-4" />;
      case 'target_savings': return <Target className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'savings': return 'bg-blue-100 text-blue-800';
      case 'investment': return 'bg-purple-100 text-purple-800';
      case 'target_savings': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const validatePsn = async (psn: string) => {
    if (!psn.trim()) {
      setValidatedMember(null);
      return;
    }

    setValidatingPsn(true);
    try {
      const response = await api.get(`/contributions/validate-psn/${encodeURIComponent(psn.trim())}`);
      if (response.data.success) {
        setValidatedMember({
          ...response.data.member,
          hasUserAccount: true // Assume they have an account if PSN is valid
        });
        console.log('✅ [VALIDATE] PSN valid:', response.data.member);
      }
    } catch (error: any) {
      console.error('❌ [VALIDATE] PSN validation failed:', error);
      setValidatedMember(null);
      if (error.response?.status === 404) {
        toast.error(`No member found with PSN: ${psn}`);
      } else {
        toast.error('Error validating PSN');
      }
    } finally {
      setValidatingPsn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contributions Management</h1>
          <p className="text-gray-600">Track member savings, investments, and target savings</p>
        </div>
        <div className="flex space-x-3">
          {activeTab === 'contributions' ? (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </button>
              <button
                onClick={() => {
                  const csvContent = [
                    ['PSN', 'Member Name', 'Savings', 'Investment', 'Target Saving', 'Total', 'Month', 'Payment Method', 'Status', 'Created At'].join(','),
                    ...filteredContributions.map(contribution => [
                      contribution.memberPsn,
                      `"${contribution.memberName}"`,
                      contribution.savings,
                      contribution.investment,
                      contribution.targetSaving || 0,
                      contribution.totalAmount,
                      contribution.month,
                      contribution.paymentMethod,
                      contribution.status,
                      contribution.createdAt
                    ].join(','))
                  ].join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `contributions_export_${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                }}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Contribution
              </button>
            </>
          ) : (
            <button
              onClick={fetchIncreaseRequests}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Loader className="w-4 h-4 mr-2" />
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('contributions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'contributions' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Contributions
        </button>
        <button
          onClick={() => setActiveTab('increase_requests')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'increase_requests' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Increase Requests
        </button>
      </div>

      {activeTab === 'increase_requests' ? (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Contribution Increase Requests</h2>
                <p className="text-sm text-gray-600">Approve or reject member requests</p>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={increaseRequestsSearch}
                    onChange={(e) => setIncreaseRequestsSearch(e.target.value)}
                    placeholder="Search by name / PSN / email"
                    className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full md:w-72"
                  />
                </div>
                <select
                  value={increaseRequestsStatus}
                  onChange={(e) => {
                    setPage(1);
                    setIncreaseRequestsStatus(e.target.value as any);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="all">All</option>
                </select>
                <button
                  onClick={exportIncreaseRequestsExcel}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </button>
                <button
                  onClick={exportIncreaseRequestsPdf}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="relative">
              {displayedIncreaseRequests.length > 0 && !increaseRequestsLoading ? (
                <div className="pointer-events-none absolute top-2 right-2 z-10 rounded-full bg-gray-900/70 text-white text-xs px-2 py-1">
                  {increaseRequestsScrollPercent}%
                </div>
              ) : null}
              {!increaseRequestsScrollEdges.atTop ? (
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent z-10" />
              ) : null}
              {!increaseRequestsScrollEdges.atBottom ? (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent z-10" />
              ) : null}
              {!increaseRequestsScrollEdges.atLeft ? (
                <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-white to-transparent z-10" />
              ) : null}
              {!increaseRequestsScrollEdges.atRight ? (
                <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-4 bg-gradient-to-l from-white to-transparent z-10" />
              ) : null}

              <div
                ref={increaseRequestsScrollRef}
                tabIndex={0}
                onScroll={onIncreaseRequestsScroll}
                onKeyDown={onIncreaseRequestsKeyDown}
                className="max-h-[70vh] overflow-auto focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{ scrollbarGutter: 'stable both-edges', scrollBehavior: 'smooth' } as any}
                aria-label="Contribution increase requests list"
              >
              <table className="min-w-[1100px] w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Justification</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {increaseRequestsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-6 text-sm text-gray-500">
                        Loading…
                      </td>
                    </tr>
                  ) : displayedIncreaseRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-6 text-sm text-gray-500">
                        No requests found.
                      </td>
                    </tr>
                  ) : (
                    displayedIncreaseRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{r.membershipApplication?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{r.membershipApplication?.psn || '—'}</div>
                          <div className="text-xs text-gray-500">{r.membershipApplication?.email || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          ₦{Number(r.current_amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          ₦{Number(r.requested_amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-[320px]">
                          {r.member_note || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {new Date(r.requested_at).toLocaleString()}
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {r.status === 'PENDING' ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openReview(r, 'approve')}
                                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => openReview(r, 'reject')}
                                className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600">
                              {r.status}
                              {r.review_comment ? <div className="text-xs text-gray-500 mt-1">Comment: {r.review_comment}</div> : null}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {reviewingRequest ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white w-full max-w-lg rounded-lg shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {reviewAction === 'approve' ? 'Approve' : 'Reject'} Request #{reviewingRequest.id}
                  </h3>
                  <button
                    onClick={() => setReviewingRequest(null)}
                    className="p-2 rounded hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="text-sm text-gray-700">
                    <div>
                      Member: <span className="font-medium">{reviewingRequest.membershipApplication?.name || 'Unknown'}</span>
                    </div>
                    <div>
                      Current: ₦{Number(reviewingRequest.current_amount).toLocaleString()} → Requested: ₦{Number(reviewingRequest.requested_amount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Comment (required)</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={4}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Provide a reason / note for audit"
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    onClick={() => setReviewingRequest(null)}
                    className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReview}
                    disabled={submittingReview}
                    className={`px-4 py-2 rounded-lg text-white ${
                      submittingReview
                        ? 'bg-gray-400 cursor-not-allowed'
                        : reviewAction === 'approve'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {submittingReview ? 'Submitting…' : reviewAction === 'approve' ? 'Approve' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Contributions</p>
              <p className="text-2xl font-bold text-gray-900">₦{totalContributions.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Savings</p>
              <p className="text-2xl font-bold text-gray-900">₦{savingsTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Investment</p>
              <p className="text-2xl font-bold text-gray-900">₦{investmentTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Target Savings</p>
              <p className="text-2xl font-bold text-gray-900">₦{targetSavingsTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search contributions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contributions Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-primary-500" />
            <span className="ml-2 text-gray-600">Loading contributions...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContributions.map((contribution) => (
                <tr key={contribution.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{contribution.memberName}</div>
                      <div className="text-sm text-gray-500">{contribution.memberPsn}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>Savings: ₦{contribution.savings.toLocaleString()}</div>
                      <div>Investment: ₦{contribution.investment.toLocaleString()}</div>
                      {contribution.fixedDeposit && contribution.fixedDeposit > 0 && (
                        <div>Fixed Deposit: ₦{contribution.fixedDeposit.toLocaleString()}</div>
                      )}
                      {contribution.targetSaving && contribution.targetSaving > 0 && (
                        <div>Target: ₦{contribution.targetSaving.toLocaleString()}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₦{contribution.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contribution.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {contribution.paymentMethod.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contribution.status)}`}>
                      {contribution.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contribution.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {contribution.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            if (confirm(`Confirm contribution of ₦${contribution.totalAmount.toLocaleString()} from ${contribution.memberName}?`)) {
                              alert(`✅ Contribution from ${contribution.memberName} confirmed and added to their account!`);
                            }
                          }}
                          className="text-green-600 hover:text-green-900 font-medium"
                          title="Confirm Contribution"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Reject contribution of ₦${contribution.totalAmount.toLocaleString()} from ${contribution.memberName}?`)) {
                              alert(`❌ Contribution from ${contribution.memberName} has been rejected.`);
                            }
                          }}
                          className="text-red-600 hover:text-red-900 font-medium"
                          title="Reject Contribution"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {contribution.status === 'approved' && (
                      <button
                        onClick={() => {
                          setSelectedContribution(contribution);
                          setShowViewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
            <div className="flex items-center">
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{page}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      pageNum === page
                        ? 'text-primary-600 bg-primary-50 border border-primary-500'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Contribution Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Contribution</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setValidatedMember(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);

              const psn = (formData.get('psn') as string)?.trim();
              const totalAmount = parseFloat(formData.get('totalAmount') as string);
              const monthYear = formData.get('month') as string;
              const paymentMethod = formData.get('paymentMethod') as string;

              // Validate required fields
              if (!psn || !totalAmount || !monthYear) {
                toast.error('Please fill in all required fields');
                return;
              }

              if (!validatedMember) {
                toast.error('Please validate the PSN first by entering it and waiting for confirmation');
                return;
              }

              try {
                // Parse month-year input (format: "2025-10")
                console.log('🔍 [FORM] Raw monthYear value:', monthYear);

                if (!monthYear || monthYear.trim() === '') {
                  toast.error('Please select a contribution month/year');
                  return;
                }

                const cleanMonthYear = monthYear.trim();
                console.log('🔍 [FORM] Cleaned monthYear value:', cleanMonthYear);

                const parts = cleanMonthYear.split('-');
                if (parts.length !== 2) {
                  toast.error('Invalid month/year format. Please select a valid date.');
                  return;
                }

                const [yearStr, monthStr] = parts;
                const year = parseInt(yearStr, 10);
                const month = parseInt(monthStr, 10);

                console.log('🔍 [FORM] Parsed values:', { year, month });

                if (isNaN(year) || isNaN(month) || year < 2020 || year > 2050 || month < 1 || month > 12) {
                  toast.error('Invalid month/year format. Year must be 2020-2050, month 1-12.');
                  return;
                }

                const data = {
                  psn: psn.toUpperCase(),
                  totalAmount: totalAmount,
                  month: month,
                  year: year,
                  paymentMethod: paymentMethod || 'bank_transfer'
                };

                console.log('🚀 [CONTRIBUTION] Final validated data:', data);

                console.log('🚀 [CONTRIBUTION] Adding contribution:', data);

                const response = await api.post('/contributions/by-psn', data);
                console.log('✅ [CONTRIBUTION] Response:', response.data);

                toast.success(response.data.message || 'Contribution added successfully!');
                setShowAddModal(false);
                setValidatedMember(null);
                fetchContributions(); // Refresh the list
              } catch (error: any) {
                console.error('❌ [CONTRIBUTION] Error:', error);
                const message = error.response?.data?.message || 'Failed to add contribution';
                toast.error(message);
              }
            }}>
              {/* PSN Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member PSN <span className="text-red-500">*</span>
                  {validatingPsn && <span className="ml-2 text-blue-500">Validating...</span>}
                  {validatedMember && !validatingPsn && <span className="ml-2 text-green-500">✓ Found</span>}
                </label>
                <input
                  type="text"
                  name="psn"
                  placeholder="Enter member PSN (e.g., 00003)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                  required
                  onBlur={(e) => validatePsn(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      validatePsn(e.currentTarget.value);
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the exact PSN to validate and load member's configured contribution amounts
                </p>
              </div>

              {/* Member Info Display */}
              {validatedMember && validatedMember.configurations && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="text-sm font-medium text-green-900 mb-3">
                    <Check className="w-4 h-4 inline mr-1" />
                    Member Found: {validatedMember.name}
                  </h4>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Configured Savings</label>
                      <input
                        type="text"
                        value={`₦${validatedMember.configurations.savings.toLocaleString()}`}
                        className="w-full bg-green-100 border border-green-300 rounded px-2 py-1 text-sm font-medium text-green-900 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Configured Investment</label>
                      <input
                        type="text"
                        value={`₦${validatedMember.configurations.investment.toLocaleString()}`}
                        className="w-full bg-green-100 border border-green-300 rounded px-2 py-1 text-sm font-medium text-green-900 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Configured Target Saving</label>
                      <input
                        type="text"
                        value={`₦${validatedMember.configurations.targetSaving.toLocaleString()}`}
                        className="w-full bg-green-100 border border-green-300 rounded px-2 py-1 text-sm font-medium text-green-900 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-green-300">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-green-900">Expected Monthly Total</span>
                      <span className="text-sm font-bold text-green-900">
                        ₦{(validatedMember.configurations.savings + validatedMember.configurations.investment + validatedMember.configurations.targetSaving).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Total Contribution Input - Only show after PSN validation */}
              {validatedMember && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Contribution Amount (₦) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="totalAmount"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Amount will be distributed: configured amounts first, then remaining proportionally among configured categories
                    </p>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">📊 Auto-Distribution Rules</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• First: Deduct exact configured amounts for each category</li>
                      <li>• Remaining: Distributed proportionally among categories with amounts {'>'} 0</li>
                      <li>• Example: If member configured ₦3000 savings + ₦1000 investment, and you enter ₦5000...</li>
                      <li>• Result: ₦3000 savings + ₦1000 investment + ₦750 extra to savings + ₦250 extra to investment</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contribution Month/Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="month"
                      name="month"
                      min="2020-01"
                      max="2050-12"
                      defaultValue={new Date().toISOString().slice(0, 7)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Select the month and year for this contribution (defaults to current month)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      name="paymentMethod"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="salary_deduction">Salary Deduction</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setValidatedMember(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                {validatedMember && (
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Add Contribution
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Contributions Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl flex flex-col max-h-[90vh] shadow-xl">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-lg">
              <h3 className="text-lg font-semibold text-gray-900">Import Contributions</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Excel/CSV File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop your file here, or click to browse
                  </p>
                  {/* Selected File Display */}
                  {selectedFile && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                        <span className="text-sm font-medium text-green-900 truncate">
                          Selected: {selectedFile.name}
                        </span>
                        <span className="ml-2 text-xs text-green-700">
                          ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    id="contribution-file-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validate file type
                        if (!file.name.toLowerCase().endsWith('.csv') &&
                            !file.name.toLowerCase().endsWith('.xlsx') &&
                            !file.name.toLowerCase().endsWith('.xls')) {
                          toast.error('Please select a CSV, XLSX, or XLS file.');
                          setSelectedFile(null);
                          return;
                        }

                        // Validate file size (10MB max)
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error('File size must be less than 10MB.');
                          setSelectedFile(null);
                          return;
                        }

                        console.log('� File selected:', file.name, 'Size:', file.size);
                        setSelectedFile(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="contribution-file-upload"
                    className="cursor-pointer text-primary-600 hover:text-primary-700"
                  >
                    Choose file
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: .xlsx, .xls, .csv (Max 10MB)
                </p>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Required Columns:</h4>
                <p className="text-xs text-blue-700">
                  PSN, Type, Amount, Month, Payment_Method
                </p>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-900 mb-1">Contribution Types:</h4>
                <p className="text-xs text-yellow-700">
                  savings, investment, target_savings
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={downloadTotalCsvTemplate}
                  className="flex items-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Total CSV Template
                </button>
                <button
                  onClick={downloadTypedCsvTemplate}
                  className="flex items-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Typed CSV Template
                </button>
                <button
                  onClick={downloadTotalXlsxTemplate}
                  className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Total XLSX Template
                </button>
                <button
                  onClick={downloadTypedXlsxTemplate}
                  className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Typed XLSX Template
                </button>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!selectedFile) {
                      toast.error('Please select a file first.');
                      return;
                    }

                    setUploadingBulk(true);
                    try {
                      const formData = new FormData();
                      formData.append('file', selectedFile);

                      console.log('� [BULK UPLOAD] Starting upload for:', selectedFile.name);

                      const response = await api.post('/contributions/bulk-upload', formData);

                      console.log('✅ [BULK UPLOAD] Response:', response.data);
                      if (response.data.errors && response.data.errors.length > 0) {
                        console.log('❌ [BULK UPLOAD] Detailed Errors:', JSON.stringify(response.data.errors, null, 2));
                      }

                      if (response.data.success) {
                        const batchId = response.data.batch_id;
                        if (batchId) {
                          toast.success(`Upload received. Batch #${batchId} is processing. Review errors to complete the import.`);
                          setShowImportModal(false);
                          setSelectedFile(null);
                          await openImportReview(Number(batchId));
                        } else {
                          toast.success('Upload received.');
                          setShowImportModal(false);
                          setSelectedFile(null);
                        }
                      } else {
                        toast.error(response.data.message || 'Upload failed');
                      }

                    } catch (error: any) {
                      console.error('❌ [BULK UPLOAD] Error:', error);
                      const message = error.response?.data?.message || 'Bulk upload failed';
                      toast.error(message);
                    } finally {
                      setUploadingBulk(false);
                    }
                  }}
                  disabled={uploadingBulk || !selectedFile}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploadingBulk ? (
                    <>
                      <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload & Import'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Review / Error Fix Modal */}
      {showImportReviewModal && importBatchId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl flex flex-col max-h-[90vh] shadow-xl">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-lg">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Import Review (Batch #{importBatchId})</h3>
                <p className="text-sm text-gray-600">
                  Status: {importBatch?.status || '—'} | Total: {importBatch?.total_records ?? '—'} | Success: {importBatch?.success_count ?? '—'} | Failed: {importBatch?.failure_count ?? '—'}
                </p>
                {String(importBatch?.status || '').toUpperCase() === 'PROCESSING' ? (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <Loader className="w-3 h-3 animate-spin" />
                    Processing import… this will stop automatically when complete.
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => {
                  setShowImportReviewModal(false);
                  setImportBatchId(null);
                  setImportBatch(null);
                  setImportErrors([]);
                  setEditingErrorId(null);
                  setEditingRecord({});
                  setImportReviewError(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setImportReviewError(null);
                      const batch = await loadImportBatch(importBatchId);
                      if (!batch) return;
                      const status = String(batch?.status || '').toUpperCase();
                      const completedAt = batch?.completed_at || batch?.completedAt || null;
                      const isProcessing = status === 'PROCESSING' && !completedAt;
                      if (!isProcessing) {
                        await loadImportErrors(importBatchId, importErrorsPage);
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.get(`/bulk-uploads/${importBatchId}/errors.xlsx`, { responseType: 'blob' });
                        const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `upload_${importBatchId}_failed_records.xlsx`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                      } catch (e: any) {
                        toast.error(e?.response?.data?.message || 'Download failed');
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Download Errors (XLSX)
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.get(`/bulk-uploads/${importBatchId}/errors.csv`, { responseType: 'blob' });
                        const blob = new Blob([res.data], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `upload_${importBatchId}_errors.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                      } catch (e: any) {
                        toast.error(e?.response?.data?.message || 'Download failed');
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Download Errors (CSV)
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setReprocessing(true);
                      try {
                        const res = await api.post(`/bulk-uploads/${importBatchId}/reprocess-failed`);
                        if (res.data?.success) {
                          toast.success(`Reprocess completed: resolved ${res.data.resolved}, still failed ${res.data.still_failed}`);
                        } else {
                          toast.error(res.data?.message || 'Reprocess failed');
                        }
                      } catch (e: any) {
                        toast.error(e?.response?.data?.message || 'Reprocess failed');
                      } finally {
                        setReprocessing(false);
                        await Promise.all([loadImportBatch(importBatchId), loadImportErrors(importBatchId, importErrorsPage)]);
                        fetchContributions();
                      }
                    }}
                    disabled={reprocessing || importErrorsLoading || importErrors.length === 0}
                    className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {reprocessing ? 'Reprocessing...' : 'Reprocess Failed Rows'}
                  </button>
                  <button
                    onClick={() => {
                      setShowImportReviewModal(false);
                      setImportBatchId(null);
                      setImportBatch(null);
                      setImportErrors([]);
                      setEditingErrorId(null);
                      setEditingRecord({});
                      fetchContributions();
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Done
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Fix the failed rows below. Save corrections, then click “Reprocess Failed Rows”. The import is only completed when there are no remaining failed rows.
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 p-3 text-xs font-semibold text-gray-700">
                  <div className="col-span-1">Row</div>
                  <div className="col-span-2">PSN</div>
                  <div className="col-span-2">Period</div>
                  <div className="col-span-2">Amount/Type</div>
                  <div className="col-span-4">Error</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                {importReviewError ? (
                  <div className="p-4 text-sm text-red-700 bg-red-50 border-t border-red-200 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">Unable to load import review</div>
                      <div className="text-xs text-red-700/80 break-words">{importReviewError}</div>
                    </div>
                    <button
                      onClick={async () => {
                        setImportReviewError(null);
                        const batch = await loadImportBatch(importBatchId);
                        if (!batch) return;
                        const status = String(batch?.status || '').toUpperCase();
                        const completedAt = batch?.completed_at || batch?.completedAt || null;
                        const isProcessing = status === 'PROCESSING' && !completedAt;
                        if (!isProcessing) await loadImportErrors(importBatchId, importErrorsPage);
                      }}
                      className="shrink-0 px-3 py-2 border border-red-300 rounded-lg bg-white hover:bg-red-50"
                    >
                      Retry
                    </button>
                  </div>
                ) : importErrorsLoading ? (
                  <div className="p-4 text-sm text-gray-600 border-t">Loading errors...</div>
                ) : importErrors.length === 0 ? (
                  String(importBatch?.status || '').toUpperCase() === 'PROCESSING' ? (
                    <div className="p-4 text-sm text-gray-700 border-t">Import is still processing. Failed rows will appear here when processing completes.</div>
                  ) : (
                    <div className="p-4 text-sm text-green-700 border-t">No failed rows. Import is complete.</div>
                  )
                ) : (
                  importErrors.map((err) => {
                    const raw = (err.corrected_record || err.raw_record || {}) as Record<string, any>;
                    const isEditing = editingErrorId === err.id;
                    const edit = isEditing ? editingRecord : raw;
                    const displayPsn = String(raw.psn || '');
                    const displayPeriod = `${raw.year || ''}-${raw.month || ''}`.replace(/^-/, '');
                    const displayAmount = raw.type ? `${raw.type}: ${raw.total_amount || ''}` : (raw.total_amount || '');

                    return (
                      <div key={err.id} className="border-t">
                        <div className="grid grid-cols-12 p-3 text-sm items-start gap-2">
                          <div className="col-span-1 text-gray-700">{err.row_number ?? '—'}</div>
                          <div className="col-span-2 text-gray-900">{displayPsn || '—'}</div>
                          <div className="col-span-2 text-gray-900">{displayPeriod || '—'}</div>
                          <div className="col-span-2 text-gray-900">{displayAmount || '—'}</div>
                          <div className="col-span-4">
                            <div className="text-gray-900">{err.error_code}: {err.message}</div>
                            {err.fields ? (
                              <div className="text-xs text-gray-600 mt-1 space-y-1">
                                {err.fields.detected_value != null && String(err.fields.detected_value).trim() !== '' ? (
                                  <div>Detected: {String(err.fields.detected_value)}</div>
                                ) : null}
                                {Array.isArray(err.fields.allowed_values) && err.fields.allowed_values.length > 0 ? (
                                  <div>Allowed: {err.fields.allowed_values.join(', ')}</div>
                                ) : null}
                                {err.fields.suggestion ? (
                                  <div>Suggestion: {String(err.fields.suggestion)}</div>
                                ) : (
                                  <div>{JSON.stringify(err.fields)}</div>
                                )}
                              </div>
                            ) : null}
                          </div>
                          <div className="col-span-1 text-right">
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  setEditingErrorId(null);
                                  setEditingRecord({});
                                } else {
                                  setEditingErrorId(err.id);
                                  setEditingRecord({ ...(err.corrected_record || err.raw_record || {}) });
                                }
                              }}
                              className="text-primary-600 hover:text-primary-700 text-sm"
                            >
                              {isEditing ? 'Close' : 'Edit'}
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="bg-gray-50 p-4 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">PSN</label>
                                <input
                                  value={String(edit.psn || '')}
                                  onChange={(e) => setEditingRecord((p) => ({ ...p, psn: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Month (1-12) or YYYY-MM</label>
                                <input
                                  value={String(edit.month || '')}
                                  onChange={(e) => setEditingRecord((p) => ({ ...p, month: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                                <input
                                  value={String(edit.year || '')}
                                  onChange={(e) => setEditingRecord((p) => ({ ...p, year: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Type (optional)</label>
                                <input
                                  value={String(edit.type || '')}
                                  onChange={(e) => setEditingRecord((p) => ({ ...p, type: e.target.value }))}
                                  placeholder="savings | investment | target_savings"
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Total/Amount</label>
                                <input
                                  value={String(edit.total_amount || '')}
                                  onChange={(e) => setEditingRecord((p) => ({ ...p, total_amount: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                                <select
                                  value={String(edit.payment_method || 'bank_transfer')}
                                  onChange={(e) => setEditingRecord((p) => ({ ...p, payment_method: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                >
                                  <option value="bank_transfer">bank transfer</option>
                                  <option value="salary_deduction">salary deduction</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end mt-4">
                              <button
                                onClick={async () => {
                                  try {
                                    await api.put(`/bulk-uploads/${importBatchId}/errors/${err.id}`, { corrected_record: editingRecord });
                                    toast.success('Correction saved');
                                    setEditingErrorId(null);
                                    setEditingRecord({});
                                    await loadImportErrors(importBatchId, importErrorsPage);
                                  } catch (e: any) {
                                    toast.error(e?.response?.data?.message || 'Failed to save correction');
                                  }
                                }}
                                className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                              >
                                Save Correction
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              {importErrorsTotalPages > 1 ? (
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={async () => {
                      const next = Math.max(1, importErrorsPage - 1);
                      setImportErrorsPage(next);
                      await loadImportErrors(importBatchId, next);
                    }}
                    disabled={importErrorsPage <= 1 || importErrorsLoading}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="text-sm text-gray-600">
                    Page {importErrorsPage} / {importErrorsTotalPages}
                  </div>
                  <button
                    onClick={async () => {
                      const next = Math.min(importErrorsTotalPages, importErrorsPage + 1);
                      setImportErrorsPage(next);
                      await loadImportErrors(importBatchId, next);
                    }}
                    disabled={importErrorsPage >= importErrorsTotalPages || importErrorsLoading}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* View Contribution Details Modal */}
      {showViewModal && selectedContribution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Contribution Details</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedContribution(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Member PSN</label>
                  <p className="text-sm text-gray-900">{selectedContribution.memberPsn}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Member Name</label>
                  <p className="text-sm text-gray-900">{selectedContribution.memberName}</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Contribution Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-blue-700">Savings</label>
                    <p className="text-sm font-semibold text-blue-900">₦{selectedContribution.savings.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-blue-700">Investment</label>
                    <p className="text-sm font-semibold text-blue-900">₦{selectedContribution.investment.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-blue-700">Fixed Deposit</label>
                    <p className="text-sm font-semibold text-blue-900">₦{(selectedContribution.fixedDeposit || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-blue-700">Target Saving</label>
                    <p className="text-sm font-semibold text-blue-900">₦{(selectedContribution.targetSaving || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">Total Amount</span>
                    <span className="text-lg font-bold text-blue-900">₦{selectedContribution.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Month</label>
                  <p className="text-sm text-gray-900">{selectedContribution.month}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedContribution.paymentMethod.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    selectedContribution.status === 'approved' ? 'bg-green-100 text-green-800' :
                    selectedContribution.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedContribution.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created Date</label>
                  <p className="text-sm text-gray-900">{selectedContribution.createdAt}</p>
                </div>
              </div>

              {selectedContribution.status === 'approved' && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-1">✅ Contribution Approved</h4>
                  <p className="text-xs text-green-700">
                    This contribution has been verified and added to the member's account.
                  </p>
                </div>
              )}

              {selectedContribution.status === 'pending' && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-900 mb-1">⏳ Pending Approval</h4>
                  <p className="text-xs text-yellow-700">
                    This contribution is awaiting approval by an administrator.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedContribution(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
