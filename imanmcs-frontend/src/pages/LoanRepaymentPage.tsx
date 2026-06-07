import React, { useEffect, useRef, useState } from 'react';
import {
  Upload, Download, Search, Filter, Calendar, DollarSign,
  CheckCircle, AlertCircle, Clock, FileText, CreditCard, User,
  Eye, Plus, Calculator
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { exportToExcel } from '../utils/excel';

interface LoanRepayment {
  id: string;
  loanId: string;
  memberPsn: string;
  memberName: string;
  loanAmount: number;
  repaymentAmount: number;
  repaymentDate: string;
  paymentMethod: string;
  status: 'pending' | 'verified' | 'rejected';
  recordedBy: string;
  uploadDate: string;
  notes?: string;
  loanType?: string;
  loanStatus?: string;
}

interface LoanDetails {
  id: string;
  loanType: string;
  amountRequested: number;
  amountApproved: number;
  status: string;
  memberPsn: string;
  memberName: string;
  memberEmail: string;
  repaymentPeriod: number;
  monthlyRepayment: number;
  totalRepayment: number;
}

export const LoanRepaymentPage: React.FC = () => {
  const { user } = useAuth();
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const requestSeqRef = useRef(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; pages: number }>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });
  const [selectedRepaymentIds, setSelectedRepaymentIds] = useState<Set<string>>(new Set());
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const [bulkOutcome, setBulkOutcome] = useState<null | { requested: number; verified: number; skipped: number; failed: number }>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkUploadBatchId, setBulkUploadBatchId] = useState<number | null>(null);
  const [bulkUploadReport, setBulkUploadReport] = useState<any>(null);
  const [bulkUploadReportLoading, setBulkUploadReportLoading] = useState(false);
  const [selectedRepayment, setSelectedRepayment] = useState<LoanRepayment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form states for recording repayment
  const [loanId, setLoanId] = useState('');
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [liquidationLookup, setLiquidationLookup] = useState('');
  const [liquidationLoanDetails, setLiquidationLoanDetails] = useState<LoanDetails | null>(null);
  const [liquidationPreview, setLiquidationPreview] = useState<null | {
    remaining_loan_balance: number;
    contribution_balance: number;
    max_deductible: number;
    amount_to_deduct: number;
  }>(null);
  const [liquidationAmount, setLiquidationAmount] = useState('');
  const [liquidationSubmitting, setLiquidationSubmitting] = useState(false);
  const [lastLiquidationId, setLastLiquidationId] = useState<number | null>(null);

  const canVerify = user && ['admin', 'super_admin', 'treasurer', 'chairman'].includes((user as any).role);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, limit]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchRepayments();
    }, 250);
    return () => clearTimeout(t);
  }, [page, limit, searchTerm, statusFilter]);

  useEffect(() => {
    if (!showBulkUploadModal || !bulkUploadBatchId) return;
    let stopped = false;

    const fetchReport = async () => {
      try {
        setBulkUploadReportLoading(true);
        const res = await api.get(`/bulk-uploads/${bulkUploadBatchId}/report`);
        if (res.data?.success) {
          const r = res.data.report;
          setBulkUploadReport(r);
          const status = r?.batch?.status;
          if (status && status !== 'PROCESSING') {
            if (status === 'COMPLETED') {
              fetchRepayments();
            }
            stopped = true;
          }
        }
      } catch (e) {
      } finally {
        setBulkUploadReportLoading(false);
      }
    };

    fetchReport();
    const timer = setInterval(() => {
      if (stopped) return;
      fetchReport();
    }, 1200);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [showBulkUploadModal, bulkUploadBatchId]);

  const fetchRepayments = async () => {
    const requestSeq = ++requestSeqRef.current;
    try {
      setLoading(true);
      const params: any = { page, limit };
      const q = searchTerm.trim();
      if (q) params.search = q;
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await api.get('/loan-repayments', { params });
      if (requestSeq !== requestSeqRef.current) return;
      if (response.data.success) {
        const nextRepayments = (response.data.repayments || []) as LoanRepayment[];
        setRepayments(nextRepayments);
        const nextPagination = response.data.pagination || {
          total: nextRepayments.length,
          page,
          limit,
          pages: nextRepayments.length > 0 ? 1 : 0
        };
        setPagination(nextPagination);
        if (nextPagination.pages > 0 && page > nextPagination.pages) {
          setPage(nextPagination.pages);
        }
      }
    } catch (error) {
      if (requestSeq !== requestSeqRef.current) return;
      console.error('Error fetching repayments:', error);
      toast.error('Failed to load loan repayments');
    } finally {
      if (requestSeq === requestSeqRef.current) setLoading(false);
    }
  };

  const toggleSelectAllOnPage = (checked: boolean) => {
    const pageIds = repayments.filter((r) => r.status === 'pending').map((r) => String(r.id));
    setSelectedRepaymentIds((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedRepaymentIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleUpdateStatus = async (repaymentId: string, nextStatus: 'verified' | 'rejected') => {
    if (!canVerify) {
      toast.error('Access denied. Admin privileges required.');
      return;
    }
    const ok = window.confirm(`Confirm mark this repayment as ${nextStatus}?`);
    if (!ok) return;
    try {
      setRowActionId(repaymentId);
      await api.put(`/loan-repayments/${repaymentId}`, { status: nextStatus });
      toast.success(`Repayment ${nextStatus}`);
      setSelectedRepaymentIds((prev) => {
        const next = new Set(prev);
        next.delete(String(repaymentId));
        return next;
      });
      await fetchRepayments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update repayment status');
    } finally {
      setRowActionId(null);
    }
  };

  const handleBulkVerify = async () => {
    if (!canVerify) {
      toast.error('Access denied. Admin privileges required.');
      return;
    }
    const ids = Array.from(selectedRepaymentIds);
    if (ids.length === 0) return;
    const ok = window.confirm(`Verify ${ids.length} selected repayment(s)?`);
    if (!ok) return;
    try {
      setBulkVerifying(true);
      const res = await api.post('/loan-repayments/bulk-verify', { repayment_ids: ids });
      const summary = res.data?.summary;
      if (summary) {
        toast.success(`Verified: ${summary.verified}. Skipped: ${summary.skipped}. Failed: ${summary.failed}.`);
        setBulkOutcome({
          requested: Number(summary.requested || ids.length),
          verified: Number(summary.verified || 0),
          skipped: Number(summary.skipped || 0),
          failed: Number(summary.failed || 0)
        });
      } else {
        toast.success(res.data?.message || 'Bulk verification processed');
        setBulkOutcome(null);
      }
      setSelectedRepaymentIds(new Set());
      await fetchRepayments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk verification failed');
    } finally {
      setBulkVerifying(false);
    }
  };

  const downloadRepaymentCsvTemplate = () => {
    const csvContent = `Loan_ID,PSN,Repayment_Amount,Repayment_Date,Payment_Method,Notes
123,PSN001,5000,2025-12,cash,Monthly repayment
124,PSN002,6500,2025-12,transfer,Monthly repayment`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'loan_repayments_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadRepaymentXlsxTemplate = () => {
    const rows = [
      { Loan_ID: 123, PSN: 'PSN001', Repayment_Amount: 5000, Repayment_Date: '2025-12', Payment_Method: 'cash', Notes: 'Monthly repayment' },
      { Loan_ID: 124, PSN: 'PSN002', Repayment_Amount: 6500, Repayment_Date: '2025-12', Payment_Method: 'transfer', Notes: 'Monthly repayment' },
    ];
    exportToExcel(rows, 'loan_repayments_template', 'Loan Repayments');
  };

  const downloadBulkUploadReport = async (format: 'csv' | 'pdf') => {
    if (!bulkUploadBatchId) return;
    try {
      const exportDate = new Date().toISOString().slice(0, 10);
      const filename = `loan_repayments_upload_report_${bulkUploadBatchId}_${exportDate}.${format}`;
      const res = await api.get(`/bulk-uploads/${bulkUploadBatchId}/report.${format}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to download ${format.toUpperCase()} report`);
    }
  };
  const handleLoanIdLookup = async () => {
    if (!loanId.trim()) {
      toast.error('Please enter a loan ID');
      return;
    }

    try {
      const response = await api.get(`/loan-repayments/loan/${loanId.trim()}`);
      if (response.data.success) {
        setLoanDetails(response.data.loan);
        toast.success('Loan details loaded successfully');
      }
    } catch (error: any) {
      console.error('Error fetching loan details:', error);
      toast.error(error.response?.data?.message || 'Failed to load loan details');
      setLoanDetails(null);
    }
  };

  const resetLiquidationForm = () => {
    setLiquidationLookup('');
    setLiquidationLoanDetails(null);
    setLiquidationPreview(null);
    setLiquidationAmount('');
    setLiquidationSubmitting(false);
    setLastLiquidationId(null);
  };

  const handleLiquidationLookup = async () => {
    if (!liquidationLookup.trim()) {
      toast.error('Please enter a Loan ID or PSN');
      return;
    }
    try {
      setLiquidationSubmitting(true);
      const response = await api.get(`/loan-repayments/loan/${encodeURIComponent(liquidationLookup.trim())}`);
      if (response.data?.success) {
        const ld = response.data.loan as LoanDetails;
        setLiquidationLoanDetails(ld);
        const previewRes = await api.post(`/loans/${ld.id}/liquidate`, {});
        if (previewRes.data?.success) {
          setLiquidationPreview(previewRes.data);
          setLiquidationAmount(String(previewRes.data.amount_to_deduct || ''));
        } else {
          setLiquidationPreview(null);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load loan liquidation details');
      setLiquidationLoanDetails(null);
      setLiquidationPreview(null);
    } finally {
      setLiquidationSubmitting(false);
    }
  };

  const handleLiquidationPreview = async () => {
    if (!liquidationLoanDetails) {
      toast.error('Please lookup a loan first');
      return;
    }
    const amount = Number(liquidationAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid liquidation amount');
      return;
    }
    try {
      setLiquidationSubmitting(true);
      const res = await api.post(`/loans/${liquidationLoanDetails.id}/liquidate`, { amount });
      if (res.data?.success) {
        setLiquidationPreview(res.data);
      } else {
        toast.error(res.data?.message || 'Unable to preview liquidation');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to preview liquidation');
    } finally {
      setLiquidationSubmitting(false);
    }
  };

  const handleProcessLiquidation = async () => {
    if (!liquidationLoanDetails || !liquidationPreview) {
      toast.error('Please lookup and preview the liquidation first');
      return;
    }
    const amount = Number(liquidationAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid liquidation amount');
      return;
    }
    if (amount > liquidationPreview.max_deductible) {
      toast.error('Liquidation amount exceeds the allowable maximum');
      return;
    }

    const ok = confirm(
      `Confirm loan liquidation?\n\nMember: ${liquidationLoanDetails.memberName} (${liquidationLoanDetails.memberPsn})\nLoan ID: ${liquidationLoanDetails.id}\nAmount: ₦${amount.toLocaleString()}\n\nThis will deduct from contributions and apply as a verified repayment.`
    );
    if (!ok) return;

    try {
      setLiquidationSubmitting(true);
      const res = await api.post(`/loans/${liquidationLoanDetails.id}/liquidate`, { confirm: true, amount });
      if (res.data?.success) {
        toast.success('Loan liquidation processed');
        setLastLiquidationId(res.data.liquidation_id || null);
        await fetchRepayments();
        try {
          const previewRes = await api.post(`/loans/${liquidationLoanDetails.id}/liquidate`, {});
          if (previewRes.data?.success) {
            setLiquidationPreview(previewRes.data);
          }
        } catch {}
      } else {
        toast.error(res.data?.message || 'Failed to process liquidation');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process liquidation');
    } finally {
      setLiquidationSubmitting(false);
    }
  };

  const downloadLiquidationReceipt = async () => {
    if (!lastLiquidationId) return;
    try {
      const exportDate = new Date().toISOString().slice(0, 10);
      const res = await api.get(`/loans/liquidations/${lastLiquidationId}/receipt`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loan_liquidation_receipt_${exportDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to download receipt');
    }
  };

  const handleRecordRepayment = async () => {
    if (!loanDetails) {
      toast.error('Please lookup loan details first');
      return;
    }

    if (!repaymentAmount || parseFloat(repaymentAmount) <= 0) {
      toast.error('Please enter a valid repayment amount');
      return;
    }

    if (!repaymentDate) {
      toast.error('Please select a repayment date');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/loan-repayments', {
        loan_id: loanId.trim(),
        repayment_amount: repaymentAmount,
        repayment_date: repaymentDate,
        payment_method: paymentMethod,
        notes: notes.trim() || null
      });

      if (response.data.success) {
        toast.success('Loan repayment recorded successfully!');
        setShowRecordModal(false);
        resetForm();
        fetchRepayments(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Error recording repayment:', error);
      toast.error(error.response?.data?.message || 'Failed to record repayment');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setLoanId('');
    setLoanDetails(null);
    setRepaymentAmount('');
    setRepaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setNotes('');
  };

  const viewRepaymentDetails = (repayment: LoanRepayment) => {
    setSelectedRepayment(repayment);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const totalRepayments = repayments.reduce((sum, rep) => sum + rep.repaymentAmount, 0);
  const verifiedRepayments = repayments.filter(rep => rep.status === 'verified').reduce((sum, rep) => sum + rep.repaymentAmount, 0);
  const pendingRepayments = repayments.filter(rep => rep.status === 'pending').reduce((sum, rep) => sum + rep.repaymentAmount, 0);
  const totalRecords = pagination.total || repayments.length;
  const totalPages = pagination.pages || 0;
  const isFirstPage = page <= 1;
  const isLastPage = totalPages === 0 ? true : page >= totalPages;
  const showingFrom = totalRecords > 0 ? (page - 1) * limit + 1 : 0;
  const showingTo = totalRecords > 0 ? Math.min(totalRecords, (page - 1) * limit + repayments.length) : 0;

  const pendingIdsOnPage = repayments.filter((r) => r.status === 'pending').map((r) => String(r.id));
  const allPendingSelectedOnPage =
    pendingIdsOnPage.length > 0 && pendingIdsOnPage.every((id) => selectedRepaymentIds.has(id));
  const somePendingSelectedOnPage =
    pendingIdsOnPage.some((id) => selectedRepaymentIds.has(id)) && !allPendingSelectedOnPage;
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = somePendingSelectedOnPage;
  }, [somePendingSelectedOnPage]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Loan Repayment Management</h1>
        <p className="text-gray-600">Upload, track, and verify loan repayments from cooperative members</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Repayments</p>
              <p className="text-2xl font-bold text-gray-900">₦{totalRepayments.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-gray-900">₦{verifiedRepayments.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">₦{pendingRepayments.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by member name, PSN, or loan ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full md:w-80"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {canVerify ? (
              <>
                <button
                  onClick={handleBulkVerify}
                  disabled={selectedRepaymentIds.size === 0 || bulkVerifying || loading}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify Selected ({selectedRepaymentIds.size})
                </button>
                {selectedRepaymentIds.size > 0 ? (
                  <button
                    onClick={() => setSelectedRepaymentIds(new Set())}
                    disabled={bulkVerifying || loading}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Clear Selection
                  </button>
                ) : null}
              </>
            ) : null}
            <button 
              onClick={() => setShowBulkUploadModal(true)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </button>
            <button 
              onClick={() => {
                // Export repayments data
                const csvContent = [
                  ['Loan ID', 'Member PSN', 'Member Name', 'Loan Amount', 'Repayment Amount', 'Repayment Date', 'Payment Method', 'Status', 'Notes'].join(','),
                  ...repayments.map(rep => [
                    rep.loanId,
                    rep.memberPsn,
                    `"${rep.memberName}"`,
                    rep.loanAmount,
                    rep.repaymentAmount,
                    rep.repaymentDate,
                    rep.paymentMethod,
                    rep.status,
                    `"${rep.notes || ''}"`
                  ].join(','))
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `loan_repayments_${new Date().toISOString().split('T')[0]}.csv`;
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
              onClick={() => setShowRecordModal(true)}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Repayment
            </button>
            {user && ['admin', 'super_admin', 'treasurer', 'chairman'].includes((user as any).role) ? (
              <button
                onClick={() => {
                  resetLiquidationForm();
                  setShowLiquidationModal(true);
                }}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Liquidate Loan
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {bulkOutcome ? (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4">
          Bulk verification summary: Requested {bulkOutcome.requested}, Verified {bulkOutcome.verified}, Skipped {bulkOutcome.skipped}, Failed {bulkOutcome.failed}.
        </div>
      ) : null}

      {/* Repayments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {canVerify ? (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allPendingSelectedOnPage}
                      disabled={pendingIdsOnPage.length === 0 || loading || bulkVerifying}
                      onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                      aria-label="Select all pending on page"
                    />
                  </th>
                ) : null}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repayment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    className="px-6 py-10 text-center text-sm text-gray-600"
                    colSpan={canVerify ? 7 : 6}
                  >
                    Loading loan repayments...
                  </td>
                </tr>
              ) : repayments.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-10 text-center text-sm text-gray-600"
                    colSpan={canVerify ? 7 : 6}
                  >
                    No loan repayments found.
                  </td>
                </tr>
              ) : (
                repayments.map((repayment) => (
                  <tr key={repayment.id} className="hover:bg-gray-50">
                    {canVerify ? (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRepaymentIds.has(String(repayment.id))}
                          disabled={repayment.status !== 'pending' || bulkVerifying}
                          onChange={(e) => toggleSelectOne(String(repayment.id), e.target.checked)}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded disabled:opacity-50"
                          aria-label={`Select repayment ${repayment.id}`}
                        />
                      </td>
                    ) : null}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{repayment.loanId}</div>
                      <div className="text-sm text-gray-500">₦{repayment.loanAmount.toLocaleString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{repayment.memberName}</div>
                        <div className="text-sm text-gray-500">{repayment.memberPsn}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">₦{repayment.repaymentAmount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">{repayment.repaymentDate}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">{repayment.paymentMethod.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(repayment.status)}`}>
                      {getStatusIcon(repayment.status)}
                      <span className="ml-1 capitalize">{repayment.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => viewRepaymentDetails(repayment)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                        aria-label="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {repayment.status === 'pending' && canVerify ? (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(String(repayment.id), 'verified')}
                            disabled={rowActionId === String(repayment.id) || bulkVerifying}
                            className="text-green-600 hover:text-green-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                            title="Verify"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(String(repayment.id), 'rejected')}
                            disabled={rowActionId === String(repayment.id) || bulkVerifying}
                            className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                            title="Reject"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-600">
            {totalRecords > 0 ? (
              <>Showing {showingFrom}–{showingTo} of {totalRecords}</>
            ) : (
              <>Showing 0 results</>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <div className="text-sm text-gray-600 mr-2">
              Page {page} of {totalPages || 1}
            </div>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={loading}
              className="px-2 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              aria-label="Records per page"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={isFirstPage || loading}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              aria-label="Previous Page"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p))}
              disabled={isLastPage || loading}
              className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              aria-label="Next Page"
            >
              Next Page
            </button>
          </div>
        </div>
      </div>

      {/* Record Repayment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Record Loan Repayment</h3>
              <p className="text-sm text-gray-600">Enter loan ID to lookup details and record repayment</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Loan ID Lookup */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Step 1: Lookup Loan</h4>
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Enter loan ID (e.g., 1, 2, 3...)"
                      value={loanId}
                      onChange={(e) => setLoanId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleLoanIdLookup}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Lookup
                  </button>
                </div>
              </div>

              {/* Loan Details Display */}
              {loanDetails && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Loan Details Found
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Member PSN:</span>
                      <p className="text-gray-900 font-mono">{loanDetails.memberPsn}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Member Name:</span>
                      <p className="text-gray-900">{loanDetails.memberName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Loan Type:</span>
                      <p className="text-gray-900 capitalize">{loanDetails.loanType}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Loan Amount:</span>
                      <p className="text-gray-900">₦{loanDetails.amountApproved?.toLocaleString() || loanDetails.amountRequested?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <p className="text-gray-900 capitalize">{loanDetails.status}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Monthly Repayment:</span>
                      <p className="text-gray-900">₦{loanDetails.monthlyRepayment?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Repayment Form */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">Step 2: Record Repayment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repayment Amount (₦) *</label>
                    <input
                      type="number"
                      placeholder="Enter repayment amount"
                      value={repaymentAmount}
                      onChange={(e) => setRepaymentAmount(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="1"
                    />
                    {loanDetails && (
                      <p className="text-xs text-gray-600 mt-1">
                        Suggested: ₦{loanDetails.monthlyRepayment?.toLocaleString()} (monthly)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                    <input
                      type="date"
                      value={repaymentDate}
                      onChange={(e) => setRepaymentDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select payment method</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="salary_deduction">Salary Deduction</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <textarea
                      rows={3}
                      placeholder="Additional notes about the repayment"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRecordModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordRepayment}
                disabled={submitting || !loanDetails}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Recording...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Record Repayment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLiquidationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Loan Liquidation (From Contributions)</h3>
              <button
                onClick={() => {
                  setShowLiquidationModal(false);
                  resetLiquidationForm();
                }}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan ID or Member PSN</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={liquidationLookup}
                    onChange={(e) => setLiquidationLookup(e.target.value)}
                    placeholder="e.g., 123 or PSN001"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleLiquidationLookup}
                    disabled={liquidationSubmitting}
                    className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
                  >
                    Lookup
                  </button>
                </div>
              </div>

              {liquidationLoanDetails ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Member:</span> {liquidationLoanDetails.memberName} ({liquidationLoanDetails.memberPsn})
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Loan ID:</span> {liquidationLoanDetails.id} · <span className="font-medium">Status:</span>{' '}
                    {liquidationLoanDetails.status}
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Total Repayment:</span> ₦{Number(liquidationLoanDetails.totalRepayment || 0).toLocaleString()}
                  </div>
                </div>
              ) : null}

              {liquidationPreview ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500">Outstanding Loan Balance</div>
                    <div className="text-lg font-semibold text-gray-900">₦{Number(liquidationPreview.remaining_loan_balance || 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500">Contribution Balance</div>
                    <div className="text-lg font-semibold text-gray-900">₦{Number(liquidationPreview.contribution_balance || 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500">Max Deductible</div>
                    <div className="text-lg font-semibold text-gray-900">₦{Number(liquidationPreview.max_deductible || 0).toLocaleString()}</div>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Liquidation Amount (₦)</label>
                <input
                  type="number"
                  min={0}
                  value={liquidationAmount}
                  onChange={(e) => setLiquidationAmount(e.target.value)}
                  placeholder="Enter amount to deduct"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {liquidationPreview ? (
                  <div className="mt-1 text-xs text-gray-500">
                    Must be ≤ ₦{Number(liquidationPreview.max_deductible || 0).toLocaleString()}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                {lastLiquidationId ? (
                  <button
                    onClick={downloadLiquidationReceipt}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download Receipt
                  </button>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleLiquidationPreview}
                  disabled={liquidationSubmitting || !liquidationLoanDetails}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Preview
                </button>
                <button
                  onClick={handleProcessLiquidation}
                  disabled={liquidationSubmitting || !liquidationLoanDetails || !liquidationPreview}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {liquidationSubmitting ? 'Processing…' : 'Process Liquidation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Upload Loan Repayments</h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Upload Instructions</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Prepare an Excel (.xlsx/.xls) or CSV file</li>
                  <li>• Fill in the repayment data for multiple members</li>
                  <li>• Upload the completed file</li>
                  <li>• All repayments will be marked as pending for verification</li>
                </ul>
              </div>

              {/* Template Download */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Step 1: Download Template</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={downloadRepaymentCsvTemplate}
                    className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </button>
                  <button
                    onClick={downloadRepaymentXlsxTemplate}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download XLSX Template
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Step 2: Upload Completed File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Upload your Excel file (.xlsx/.xls)</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    id="bulk-upload-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBulkFile(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="bulk-upload-file"
                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Choose File
                  </label>
                  {bulkFile && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg inline-flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-900 font-medium">
                        Selected: {bulkFile.name} ({(bulkFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Upload Status</h4>
                {!bulkFile && !bulkUploadBatchId ? <p className="text-sm text-gray-600">No file selected yet.</p> : null}
                {uploadingBulk ? <p className="text-sm text-gray-600">Starting upload…</p> : null}
                {bulkUploadBatchId ? (
                  <>
                    <div className="text-sm text-gray-700 mb-2">Batch #{bulkUploadBatchId}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{
                          width: (() => {
                            const total = Number(bulkUploadReport?.batch?.total_records || 0);
                            const processed = Number(bulkUploadReport?.summary?.processed || 0);
                            if (total <= 0) return '0%';
                            return `${Math.min(100, Math.round((processed / total) * 100))}%`;
                          })()
                        }}
                      />
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-sm text-gray-700">
                        {bulkUploadReportLoading ? 'Loading…' : bulkUploadReport?.batch?.status || 'PROCESSING'} ·{' '}
                        {bulkUploadReport?.summary?.processed ?? 0}/{bulkUploadReport?.batch?.total_records ?? '—'}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadBulkUploadReport('csv')}
                          disabled={!bulkUploadBatchId}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50"
                        >
                          Download CSV
                        </button>
                        <button
                          onClick={() => downloadBulkUploadReport('pdf')}
                          disabled={!bulkUploadBatchId}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50"
                        >
                          Download PDF
                        </button>
                      </div>
                    </div>
                    {Array.isArray(bulkUploadReport?.failed_records) && bulkUploadReport.failed_records.length > 0 ? (
                      <div className="mt-3 text-sm text-red-700">
                        Failed rows: {bulkUploadReport.failed_records.length}. Download the report to see full details.
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setBulkFile(null);
                  setBulkUploadBatchId(null);
                  setBulkUploadReport(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!bulkFile) {
                    toast.error('Please select a file first.');
                    return;
                  }
                  setUploadingBulk(true);
                  try {
                    const formData = new FormData();
                    formData.append('file', bulkFile);
                    const response = await api.post('/loan-repayments/bulk-upload-v2', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    if (response.data.success) {
                      const id = response.data.batch_id;
                      setBulkUploadBatchId(id);
                      toast.success('Upload started. Processing in background…');
                    } else {
                      toast.error(response.data.message || 'Upload failed');
                    }
                  } catch (error: any) {
                    console.error('❌ [LOAN BULK UPLOAD] Error:', error);
                    const message = error.response?.data?.message || 'Bulk upload failed';
                    toast.error(message);
                  } finally {
                    setUploadingBulk(false);
                  }
                }}
                disabled={uploadingBulk || !bulkFile}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-50"
              >
                {uploadingBulk ? 'Uploading...' : 'Process Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
