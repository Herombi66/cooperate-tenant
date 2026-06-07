import React, { useState, useEffect } from 'react';
import {
  CreditCard, Search, Filter, Download, Upload, PlusCircle,
  DollarSign, Users, AlertCircle, CheckCircle, Clock, Loader
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Loan {
  id: number;
  memberPsn: string;
  memberName: string;
  loan_type?: 'cash' | 'venture' | 'emergency';
  type?: 'cash' | 'venture' | 'emergency';
  amount: number;
  amount_requested?: number;
  amount_approved?: number | null;
  purpose: string;
  status: 'pending' | 'waiting_disbursement' | 'approved' | 'rejected' | 'active' | 'disbursed' | 'defaulted' | 'awaiting_admin_review' | 'completed';
  applicationDate: string;
  approvalDate?: string;
  disbursementDate?: string;
  repaymentPeriod: number;
  monthlyRepayment: number;
  totalRepaid: number;
  remainingBalance: number;
  payslip_url?: string | null;
  guarantor_psn?: string | null;
}

export const LoansPage: React.FC = () => {
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [repayments, setRepayments] = useState<any[]>([]);
  const [repaymentsLoading, setRepaymentsLoading] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [importFile, setImportFile] = useState<File | null>(null);

  const [newLoan, setNewLoan] = useState({
    memberPsn: '',
    loanType: 'cash' as 'cash' | 'venture' | 'emergency',
    amount: '',
    purpose: '',
    tenure: '12',
    guarantorPsn: ''
  });
  const [payslipFile, setPayslipFile] = useState<File | null>(null);
  const [admissionLetterFile, setAdmissionLetterFile] = useState<File | null>(null);
  const [studentIdCardFile, setStudentIdCardFile] = useState<File | null>(null);
  const [otherEducationFiles, setOtherEducationFiles] = useState<File[]>([]);

  useEffect(() => {
    fetchLoans();
  }, [page, searchTerm, typeFilter, statusFilter]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter !== 'all' && { loan_type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await api.get(`/loans/?${params}`);
      setLoans((response.data.loans || []) as Loan[]);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = 
      loan.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.memberPsn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || loan.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate stats
  const totalLoans = loans.length;
  const totalAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
  const pendingLoans = loans.filter(l => l.status === 'pending').length;
  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'disbursed').length;
  const totalRepaid = loans.reduce((sum, loan) => sum + (loan.totalRepaid || 0), 0);
  const totalOutstanding = loans.reduce((sum, loan) => sum + (loan.remainingBalance || 0), 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      case 'disbursed': return <DollarSign className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'disbursed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'cash': return 'bg-blue-100 text-blue-800';
      case 'venture': return 'bg-purple-100 text-purple-800';
      case 'emergency': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canApprove = ['admin', 'super_admin', 'chairman'].includes(user?.role || '');
  const canDisburse = ['admin', 'super_admin', 'chairman', 'treasurer', 'secretary'].includes(user?.role || '');

  const handleApprove = async (loan: Loan) => {
    if (!canApprove) return toast.error('You do not have permission to approve loans');

    const defaultAmount = String(
      loan.amount_approved ?? loan.amount_requested ?? loan.amount ?? 0
    );
    const raw = prompt(
      `Approve loan for ${loan.memberName} (PSN: ${loan.memberPsn})\n\nEnter approved amount:`,
      defaultAmount
    );
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid approved amount');

    try {
      await api.post(`/loans/${loan.id}/approve`, { amount_approved: amount });
      toast.success('Loan approved and moved to waiting disbursement');
      await fetchLoans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve loan');
    }
  };

  const handleReject = async (loan: Loan) => {
    if (!canApprove) return toast.error('You do not have permission to reject loans');
    const reason = prompt(`Reject loan for ${loan.memberName} (PSN: ${loan.memberPsn})\n\nReason:`);
    if (!reason || reason.trim() === '') return;

    try {
      await api.post(`/loans/${loan.id}/reject`, { reason });
      toast.success('Loan rejected');
      await fetchLoans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reject loan');
    }
  };

  const handleDisburse = async (loan: Loan) => {
    if (!canDisburse) return toast.error('You do not have permission to disburse loans');
    if (!confirm(`Disburse loan for ${loan.memberName} (PSN: ${loan.memberPsn})?`)) return;

    try {
      await api.put(`/loans/${loan.id}`, { status: 'disbursed' });
      toast.success('Loan disbursed');
      await fetchLoans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to disburse loan');
    }
  };

  const openLoanDetails = async (loan: Loan) => {
    setSelectedLoan(loan);
    setShowViewModal(true);
    setRepayments([]);

    try {
      setRepaymentsLoading(true);
      const [loanRes, repaymentRes] = await Promise.all([
        api.get(`/loans/${loan.id}`),
        api.get('/loan-repayments', { params: { loan_id: loan.id, page: 1, limit: 200 } })
      ]);

      const loanDetails = loanRes.data?.loan || {};
      setSelectedLoan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          amount: loanDetails.amount_requested || loanDetails.amount || prev.amount,
          amount_requested: loanDetails.amount_requested ?? prev.amount_requested,
          amount_approved: loanDetails.amount_approved ?? prev.amount_approved,
          status: loanDetails.status || prev.status,
          repaymentPeriod: loanDetails.repayment_period_months || prev.repaymentPeriod,
          monthlyRepayment: loanDetails.monthly_repayment || prev.monthlyRepayment,
          payslip_url: loanDetails.payslip_url ?? prev.payslip_url,
          guarantor_psn: loanDetails.guarantor_psn ?? prev.guarantor_psn,
          applicationDate: loanDetails.application_date || prev.applicationDate,
          approvalDate: loanDetails.approval_date || prev.approvalDate,
          disbursementDate: loanDetails.disbursement_date || prev.disbursementDate,
        };
      });

      setRepayments(repaymentRes.data?.repayments || []);
    } catch (err) {
      setRepayments([]);
    } finally {
      setRepaymentsLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!importFile) return toast.error('Please choose a file to import');
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      await api.post('/loans/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Import started');
      setShowImportModal(false);
      setImportFile(null);
      await fetchLoans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to import loans');
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoan.memberPsn.trim()) return toast.error('Member PSN is required');
    if (!newLoan.loanType) return toast.error('Loan type is required');
    const amount = Number(newLoan.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid amount');
    const tenure = Number(newLoan.tenure);
    if (!Number.isFinite(tenure) || tenure <= 0) return toast.error('Select a valid repayment period');
    if (!payslipFile) return toast.error('Payslip attachment is required');

    try {
      const formData = new FormData();
      formData.append('memberPsn', newLoan.memberPsn.trim());
      formData.append('loan_type', newLoan.loanType);
      formData.append('amount_requested', String(amount));
      formData.append('repayment_period_months', String(tenure));
      formData.append('purpose', newLoan.purpose);
      if (newLoan.guarantorPsn.trim()) formData.append('guarantor_psn', newLoan.guarantorPsn.trim());
      formData.append('payslip', payslipFile);

      if (newLoan.loanType === 'educational') {
        if (admissionLetterFile) formData.append('admission_letter', admissionLetterFile);
        if (studentIdCardFile) formData.append('student_id_card', studentIdCardFile);
        for (const f of otherEducationFiles) formData.append('education_other', f);
      }

      await api.post('/loans', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Loan application submitted');
      setShowAddModal(false);
      setNewLoan({ memberPsn: '', loanType: 'cash', amount: '', purpose: '', tenure: '12', guarantorPsn: '' });
      setPayslipFile(null);
      setAdmissionLetterFile(null);
      setStudentIdCardFile(null);
      setOtherEducationFiles([]);
      await fetchLoans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit loan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Management</h1>
          <p className="text-gray-600">Manage cash loans (max ₦100k) and investment loans (3x limit)</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </button>
          <button
            onClick={() => {
              // Create CSV content
              const csvContent = [
                ['PSN', 'Member Name', 'Type', 'Amount', 'Purpose', 'Status', 'Application Date', 'Remaining Balance'].join(','),
                ...loans.map(loan => [
                  loan.memberPsn,
                  `"${loan.memberName}"`,
                  loan.type,
                  loan.amount,
                  `"${loan.purpose}"`,
                  loan.status,
                  loan.applicationDate,
                  loan.remainingBalance
                ].join(','))
              ].join('\n');

              // Create and download file
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `loans_export_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            New Application
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Loans</p>
              <p className="text-2xl font-bold text-gray-900">{totalLoans}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">₦{(totalAmount / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingLoans}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{activeLoans}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Repaid</p>
              <p className="text-2xl font-bold text-gray-900">₦{(totalRepaid / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">₦{(totalOutstanding / 1000).toFixed(0)}K</p>
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
                placeholder="Search loans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="cash">Cash Loan</option>
                <option value="investment">Investment Loan</option>
                <option value="educational">Educational Loan</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="awaiting_admin_review">Awaiting Review</option>
                <option value="waiting_disbursement">Waiting Disbursement</option>
                <option value="rejected">Rejected</option>
                <option value="disbursed">Disbursed</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="defaulted">Defaulted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loans Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-primary-500 mr-2" />
            <span className="text-gray-600">Loading loans...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repayment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{loan.memberName}</div>
                        <div className="text-sm text-gray-500">{loan.memberPsn}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(loan.type || loan.loan_type)}`}>
                        {(loan.type || loan.loan_type || 'cash')} loan
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₦{loan.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {loan.purpose}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center mr-2">
                          {getStatusIcon(loan.status)}
                        </div>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                          {loan.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>₦{(loan.monthlyRepayment || 0).toLocaleString()}/month</div>
                        <div className="text-xs text-gray-400">{loan.repaymentPeriod || 0} months</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₦{(loan.remainingBalance || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {(loan.status === 'pending' || loan.status === 'awaiting_admin_review') && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(loan)}
                            className="text-green-600 hover:text-green-900 font-medium"
                            title="Approve Loan"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(loan)}
                            className="text-red-600 hover:text-red-900 font-medium"
                            title="Reject Loan"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {(loan.status === 'waiting_disbursement' || loan.status === 'approved') && (
                        <button
                          onClick={() => handleDisburse(loan)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                          title="Disburse Loan"
                        >
                          Disburse
                        </button>
                      )}
                      {(loan.status === 'disbursed' || loan.status === 'active' || loan.status === 'completed') && (
                        <button
                          onClick={() => {
                            openLoanDetails(loan);
                          }}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          View
                        </button>
                      )}
                      {(loan.status === 'rejected' || loan.status === 'defaulted') && (
                        <button
                          onClick={() => {
                            openLoanDetails(loan);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          View
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

      {/* New Loan Application Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Loan Application</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateLoan}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member PSN</label>
                <input
                  type="text"
                  placeholder="Enter member PSN"
                  value={newLoan.memberPsn}
                  onChange={(e) => setNewLoan((p) => ({ ...p, memberPsn: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Type</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={newLoan.loanType}
                  onChange={(e) => setNewLoan((p) => ({ ...p, loanType: e.target.value as any }))}
                >
                  <option value="cash">Cash Loan (Max ₦500,000)</option>
                  <option value="venture">Venture Loan (Max ₦1,000,000)</option>
                  <option value="emergency">Emergency Loan (Max ₦20,000)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newLoan.amount}
                  onChange={(e) => setNewLoan((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <textarea
                  placeholder="Describe the purpose of the loan"
                  rows={3}
                  value={newLoan.purpose}
                  onChange={(e) => setNewLoan((p) => ({ ...p, purpose: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repayment Period (months)</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={newLoan.tenure}
                  onChange={(e) => setNewLoan((p) => ({ ...p, tenure: e.target.value }))}
                >
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="9">9 months</option>
                  <option value="12">12 months</option>
                  <option value="15">15 months</option>
                  <option value="18">18 months</option>
                  <option value="21">21 months</option>
                  <option value="24">24 months</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guarantor PSN (optional)</label>
                <input
                  type="text"
                  placeholder="Enter guarantor PSN"
                  value={newLoan.guarantorPsn}
                  onChange={(e) => setNewLoan((p) => ({ ...p, guarantorPsn: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payslip (required)</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setPayslipFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                />
              </div>

              {newLoan.loanType === 'venture' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Plan / Proposal (optional)</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      multiple
                      onChange={(e) => setOtherEducationFiles(Array.from(e.target.files || []))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Loans Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Import Loan Data</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Excel/CSV File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop your file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    id="loan-file-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setImportFile(file || null);
                    }}
                  />
                  <label
                    htmlFor="loan-file-upload"
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
                  PSN, Type, Amount, Purpose, Guarantor1, Guarantor2, Repayment_Period
                </p>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-900 mb-1">Loan Types:</h4>
                <p className="text-xs text-yellow-700">
                  cash (max ₦100,000), investment (3x member investment)
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleBulkImport();
                  }}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Loan Details Modal */}
      {showViewModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Loan Details
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedLoan(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Loan Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Loan Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member PSN</label>
                    <p className="text-sm text-gray-900">{selectedLoan.memberPsn}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member Name</label>
                    <p className="text-sm text-gray-900">{selectedLoan.memberName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loan Type</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedLoan.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <p className="text-sm text-gray-900 font-semibold">₦{selectedLoan.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purpose</label>
                    <p className="text-sm text-gray-900">{selectedLoan.purpose}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedLoan.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedLoan.status === 'disbursed' ? 'bg-blue-100 text-blue-800' :
                      selectedLoan.status === 'approved' ? 'bg-yellow-100 text-yellow-800' :
                      selectedLoan.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedLoan.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Application Date</label>
                    <p className="text-sm text-gray-900">{selectedLoan.applicationDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Remaining Balance</label>
                    <p className="text-sm text-gray-900 font-semibold">₦{selectedLoan.remainingBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Repayment Information (for disbursed loans) */}
              {(selectedLoan.status === 'disbursed' || selectedLoan.status === 'active' || selectedLoan.status === 'completed') && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Repayment Schedule</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Monthly Payment</label>
                        <p className="text-sm text-gray-900 font-semibold">
                          ₦{(selectedLoan.monthlyRepayment || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payments Made</label>
                        <p className="text-sm text-gray-900">
                          ₦{(selectedLoan.totalRepaid || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Progress</label>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${selectedLoan.amount ? ((Math.max(0, selectedLoan.amount - (selectedLoan.remainingBalance || 0))) / selectedLoan.amount) * 100 : 0}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-900">Repayment History</h5>
                        {repaymentsLoading && <span className="text-xs text-gray-500">Loading...</span>}
                      </div>
                      {repayments.length === 0 ? (
                        <p className="text-xs text-gray-600">No repayments recorded yet.</p>
                      ) : (
                        <div className="max-h-56 overflow-auto border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {repayments.map((r: any) => (
                                <tr key={r.id}>
                                  <td className="px-3 py-2 text-xs text-gray-700">{r.repayment_date}</td>
                                  <td className="px-3 py-2 text-xs text-gray-700">₦{Number(r.repayment_amount || 0).toLocaleString()}</td>
                                  <td className="px-3 py-2 text-xs text-gray-700">{r.payment_method}</td>
                                  <td className="px-3 py-2 text-xs text-gray-700">{r.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status-specific information */}
              {selectedLoan.status === 'completed' && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-1">✅ Loan Completed</h4>
                  <p className="text-xs text-green-700">
                    This loan has been fully repaid and closed.
                  </p>
                </div>
              )}

              {selectedLoan.status === 'rejected' && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-red-900 mb-1">❌ Loan Rejected</h4>
                  <p className="text-xs text-red-700">
                    This loan application was rejected and is no longer active.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedLoan(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
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
