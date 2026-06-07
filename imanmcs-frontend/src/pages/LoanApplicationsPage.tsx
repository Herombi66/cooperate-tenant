import React, { useEffect, useRef, useState } from 'react';
import {
  Search, Filter, Eye, CheckCircle, XCircle, Clock,
  User, DollarSign, FileText, Download, CreditCard, AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import type { PaginationMeta } from '../types';

interface LoanAgreement {
  id: number;
  type: 'agent_agreement' | 'murabaha_contract';
  status: 'accepted' | 'rejected' | 'pending';
  created_at: string;
}

interface LoanApplication {
  id: number;
  user_id: number;
  loan_type: 'cash' | 'investment' | 'educational';
  amount_requested: number;
  amount_approved?: number;
  repayment_period_months: number;
  monthly_repayment?: number;
  status: 'pending' | 'waiting_disbursement' | 'approved' | 'rejected' | 'active' | 'disbursed' | 'defaulted' | 'awaiting_admin_review';
  purpose: string;
  application_date: string;
  approval_date?: string;
  disbursement_date?: string;
  notes?: string;
  user?: {
    id: number;
    role?: string;
    membershipApplication?: {
      name?: string;
      psn?: string;
      email?: string;
      phone?: string;
    };
  };
  approvedBy?: {
    id: number;
    name: string;
  };
  agreements?: LoanAgreement[];
  // Frontend computed fields
  amount: number;
  tenure: number;
  loanType: string;
  monthlyIncome: string;
  memberPsn: string;
  memberName: string;
  grantorPsn: string;
  grantorName: string;
  applicationDate: string;
  payslipUrl: string;
  currentInvestment?: number;
  guarantor_status?: 'pending' | 'approved' | 'rejected';
}

const LoanApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, limit: 10, pages: 0 });
  const [showViewModal, setShowViewModal] = useState(false);
  const [showGuarantorModal, setShowGuarantorModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<LoanApplication | null>(null);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const canApprove = ['admin', 'super_admin', 'chairman'].includes(user?.role || '');
  const canDisburse = ['admin', 'super_admin', 'chairman', 'treasurer', 'secretary'].includes(user?.role || '');
  const requestSeqRef = useRef(0);

  useEffect(() => {
    fetchLoanApplications();
  }, [page, pageSize, statusFilter, typeFilter, searchTerm]);

  const fetchLoanApplications = async () => {
    try {
      setLoading(true);
      const requestSeq = ++requestSeqRef.current;
      const response = await api.get('/loans', {
        params: {
          page,
          limit: pageSize,
          status: statusFilter,
          loan_type: typeFilter,
          search: searchTerm.trim() ? searchTerm.trim() : undefined
        }
      });
      if (requestSeq !== requestSeqRef.current) return;

      // Transform backend data to match frontend expectations
      const transformedLoans = (response.data.loans || []).map((loan: any) => ({
        ...loan,
        // Ensure amount field is properly set from amount_requested
        amount: loan.amount_requested || loan.amount || 0,
        tenure: loan.repayment_period_months || loan.tenure || 0,
        loanType: loan.loan_type || loan.loanType || 'cash',
        status: loan.status || 'pending',
        // Map backend fields to frontend expectations
        memberName: loan.memberName || loan.user?.membershipApplication?.name || 'Unknown',
        memberPsn: loan.memberPsn || loan.user?.membershipApplication?.psn || 'Unknown',
        grantorName: loan.guarantor_name || 'Not specified',
        grantorPsn: loan.guarantor_psn || 'Not specified',
        applicationDate: loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A',
        payslipUrl: loan.payslip_url || 'Not uploaded',
        guarantor_status: loan.guarantor_approved === null ? 'pending' :
                         loan.guarantor_approved === true ? 'approved' : 'rejected'
      }));
      setApplications(transformedLoans);
      const nextPagination: PaginationMeta = response.data?.pagination || {
        total: transformedLoans.length,
        page,
        limit: pageSize,
        pages: transformedLoans.length > 0 ? 1 : 0
      };
      setPagination(nextPagination);
      if (nextPagination.pages > 0 && page > nextPagination.pages) {
        setPage(nextPagination.pages);
      }
    } catch (error) {
      console.error('Error fetching loan applications:', error);
      toast.error('Failed to load loan applications');
      setApplications([]);
      setPagination({ total: 0, page: 1, limit: pageSize, pages: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting_disbursement': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'disbursed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'awaiting_admin_review': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting_disbursement': return <CheckCircle className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'disbursed': return <DollarSign className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'awaiting_admin_review': return <AlertTriangle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleApprove = async (application: LoanApplication) => {
    const memberName = application.memberName || 'Unknown User';
    if (!confirm(`Approve loan application for ${memberName}?\n\nRequested: ₦${application.amount.toLocaleString()}\nTenure: ${application.tenure} months`)) return;

    const rawAmount = prompt(
      `Enter approved amount for ${memberName}:`,
      String(application.amount_approved || application.amount)
    );
    if (rawAmount === null) return;
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid approved amount');

    try {
      setActionLoading(true);
      await api.post(`/loans/${application.id}/approve`, { amount_approved: amount });
      toast.success(`Loan approved. You can now disburse the funds.`);
      fetchLoanApplications();
    } catch (error: any) {
      console.error('Error approving loan:', error);
      toast.error(error.response?.data?.message || 'Failed to approve loan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (application: LoanApplication) => {
    const memberName = application.memberName || 'Unknown User';
    const reason = prompt(`Reject loan application for ${memberName}?\n\nPlease provide a reason:`);
    if (!reason || reason.trim() === '') return;

    try {
      setActionLoading(true);
      await api.post(`/loans/${application.id}/reject`, { reason });
      toast.success(`Loan rejected. Reason: ${reason}`);
      fetchLoanApplications();
    } catch (error: any) {
      console.error('Error rejecting loan:', error);
      toast.error(error.response?.data?.message || 'Failed to reject loan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetToPending = async (application: LoanApplication) => {
    const memberName = application.memberName || 'Unknown User';
    if (confirm(`Reset loan status to pending for ${memberName}? This will allow them to view and accept the agreement again.`)) {
      try {
        setActionLoading(true);
        await api.put(`/loans/${application.id}`, {
          status: 'pending',
          notes: 'Status reset by admin to allow agreement retry.'
        });

        setApplications(prev => prev.map(app =>
          app.id === application.id
            ? { ...app, status: 'pending' as const }
            : app
        ));

        toast.success(`Loan reset to pending.`);
        fetchLoanApplications();
      } catch (error: any) {
        console.error('Error resetting loan:', error);
        toast.error(error.response?.data?.message || 'Failed to reset loan');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleDisburse = async (application: LoanApplication) => {
    const memberName = application.memberName || 'Unknown User';
    const confirmAmount = prompt(
      `Disburse loan amount for ${memberName}?\n\nCurrent approved: ₦${application.amount_approved || application.amount}`,
      `${application.amount_approved || application.amount}`
    );

    const amount = Number(confirmAmount);
    if (confirmAmount && Number.isFinite(amount) && amount > 0) {
      try {
        setActionLoading(true);

        // Disburse the loan
        await api.put(`/loans/${application.id}`, {
          status: 'disbursed',
          amount_approved: amount,
          disbursement_date: new Date().toISOString(),
          disbursed_by: user?.id,
        });

        // Update the local state
        setApplications(prev => prev.map(app =>
          app.id === application.id
            ? { ...app, status: 'disbursed' as const, disbursement_date: new Date().toISOString() }
            : app
        ));

        toast.success(`💰 Loan disbursed! ₦${amount} has been transferred to ${memberName}. They will be notified.`);
        fetchLoanApplications(); // Refresh data

      } catch (error: any) {
        console.error('Error disbursing loan:', error);
        toast.error(error.response?.data?.message || 'Failed to disburse loan');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const openPayslip = async (loanId: number) => {
    try {
      const res = await api.get(`/loans/${loanId}/payslip`, { responseType: 'blob' });
      const contentType = (res.headers as any)?.['content-type'] || 'application/octet-stream';
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to open payslip');
    }
  };

  const totalApplications = pagination.total || applications.length;
  const pendingApplications = applications.filter(app => app.status === 'pending').length;
  const approvedApplications = applications.filter(app => app.status === 'waiting_disbursement').length;
  const totalAmount = applications
    .filter(app => app.status === 'waiting_disbursement')
    .reduce((sum, app) => sum + (app.amount_approved || app.amount), 0);
  const totalPages = pagination.pages || 0;
  const isFirstPage = page <= 1;
  const isLastPage = totalPages === 0 ? true : page >= totalPages;
  const showingFrom = pagination.total > 0 ? (page - 1) * pageSize + 1 : 0;
  const showingTo = pagination.total > 0 ? Math.min(pagination.total, (page - 1) * pageSize + applications.length) : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
        <p className="text-gray-600">Review and process member loan applications</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{pendingApplications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{approvedApplications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Approved</p>
              <p className="text-2xl font-bold text-gray-900">₦{totalAmount.toLocaleString()}</p>
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
                placeholder="Search by name, PSN, or loan ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full md:w-80"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="awaiting_admin_review">Agreement Review</option>
                <option value="waiting_disbursement">Approved (Waiting Disbursement)</option>
                <option value="disbursed">Disbursed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="cash">Cash Loan</option>
              <option value="investment">Investment Loan</option>
              <option value="educational">Educational Loan</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              aria-label="Rows per page"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
            </select>
          </div>

          <button
            onClick={() => {
              // Export applications data
              const csvContent = [
                ['Loan ID', 'Member Name', 'PSN', 'Type', 'Amount', 'Tenure', 'Grantor', 'Status', 'Application Date'].join(','),
                ...applications.map(app => [
                  app.id,
                  `"${app.memberName}"`,
                  app.memberPsn,
                  app.loanType,
                  app.amount,
                  app.tenure,
                  `"${app.grantorName}"`,
                  app.status,
                  app.applicationDate
                ].join(','))
              ].join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `loan_applications_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
            className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Applications
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grantor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-600">
                    Loading applications…
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-600">
                    No loan applications found.
                  </td>
                </tr>
              ) : (
                applications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{application.memberName || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{application.memberPsn || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{application.monthlyIncome}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          <CreditCard className="w-4 h-4 inline mr-1" />
                          {application.loanType === 'cash'
                            ? 'Cash Loan'
                            : application.loanType === 'investment'
                              ? 'Investment Loan'
                              : 'Educational Loan'}
                        </div>
                        <div className="text-sm text-gray-900">₦{application.amount.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">{application.tenure} months tenure</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{application.grantorName}</div>
                        <div className="text-sm text-gray-500">{application.grantorPsn}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {application.applicationDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        <span className="ml-1 capitalize">{application.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedApplication(application);
                            setShowViewModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(application.status === 'pending' || application.status === 'awaiting_admin_review') && canApprove && (
                          <>
                            <button
                              onClick={() => handleApprove(application)}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(application)}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {application.status === 'waiting_disbursement' && canDisburse && (
                          <button
                            onClick={() => handleDisburse(application)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Disburse Funds"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
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
            {pagination.total > 0 ? (
              <>Showing {showingFrom}–{showingTo} of {pagination.total}</>
            ) : (
              <>Showing 0 results</>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <div className="text-sm text-gray-600 mr-2">
              Page {page} of {totalPages || 1}
            </div>
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

      {/* View Application Details Modal */}
      {showViewModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Loan Application Details</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedApplication(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Application Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Application ID</label>
                    <p className="text-sm text-gray-900">{selectedApplication.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Application Date</label>
                    <p className="text-sm text-gray-900">{selectedApplication.applicationDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedApplication.status)}`}>
                      {getStatusIcon(selectedApplication.status)}
                      <span className="ml-1 capitalize">{selectedApplication.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Agreement Review Section */}
              {selectedApplication.status === 'awaiting_admin_review' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-orange-900 mb-3 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Agreement Rejected
                  </h4>
                  <p className="text-sm text-orange-800 mb-4">
                    The member has rejected the Agent Agreement. Please review the case.
                  </p>
                  
                  {selectedApplication.agreements && selectedApplication.agreements.length > 0 && (
                     <div className="bg-white p-3 rounded border border-orange-200 mb-4">
                        <p className="text-sm font-medium text-gray-700">Recent Agreement History:</p>
                        <ul className="mt-2 space-y-2">
                            {selectedApplication.agreements.slice(0, 3).map((agreement, idx) => (
                                <li key={idx} className="text-xs text-gray-600 flex justify-between">
                                    <span className="capitalize">{agreement.type.replace('_', ' ')}</span>
                                    <span className={agreement.status === 'rejected' ? 'text-red-600 font-bold' : 'text-green-600'}>
                                        {agreement.status} ({new Date(agreement.created_at).toLocaleDateString()})
                                    </span>
                                </li>
                            ))}
                        </ul>
                     </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                        onClick={() => {
                            handleResetToPending(selectedApplication);
                            setShowViewModal(false);
                            setSelectedApplication(null);
                        }}
                        className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium flex items-center"
                    >
                        <Clock className="w-4 h-4 mr-2" />
                        Reset to Pending (Retry)
                    </button>
                    <button
                        onClick={() => {
                            handleReject(selectedApplication);
                            setShowViewModal(false);
                            setSelectedApplication(null);
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center"
                    >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Application
                    </button>
                  </div>
                </div>
              )}

              {/* Member Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Member Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900">{selectedApplication.memberName || 'Unknown User'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PSN</label>
                    <p className="text-sm text-gray-900">{selectedApplication.memberPsn || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monthly Income</label>
                    <p className="text-sm text-gray-900">{selectedApplication.monthlyIncome}</p>
                  </div>
                  {selectedApplication.currentInvestment && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Investment</label>
                      <p className="text-sm text-gray-900">₦{selectedApplication.currentInvestment.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Loan Details */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Loan Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loan Type</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedApplication.loanType} Loan</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <p className="text-lg font-semibold text-green-600">₦{selectedApplication.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tenure</label>
                    <p className="text-sm text-gray-900">{selectedApplication.tenure} months</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monthly Payment</label>
                    <p className="text-sm text-gray-900">₦{(selectedApplication.amount / selectedApplication.tenure).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Purpose</label>
                  <p className="text-sm text-gray-900 bg-white p-3 rounded border">{selectedApplication.purpose}</p>
                </div>
              </div>

              {/* Grantor Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center justify-between">
                  <span>Grantor Information</span>
                  <button
                    onClick={() => {
                      setShowGuarantorModal(true);
                      setShowViewModal(false);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Guarantor Decision
                  </button>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Grantor Name</label>
                    <p className="text-sm text-gray-900">{selectedApplication.grantorName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Grantor PSN</label>
                    <p className="text-sm text-gray-900">{selectedApplication.grantorPsn}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Guarantee Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedApplication.guarantor_status === 'approved' ? 'text-green-800 bg-green-100' :
                      selectedApplication.guarantor_status === 'rejected' ? 'text-red-800 bg-red-100' :
                      'text-yellow-800 bg-yellow-100'
                    }`}>
                      {selectedApplication.guarantor_status === 'approved' ? 'Approved' :
                       selectedApplication.guarantor_status === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Documents</h4>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm text-blue-700">
                      Payslip: {selectedApplication.payslipUrl === 'Not uploaded' ? 'Not uploaded' : 'Available'}
                    </span>
                    {selectedApplication.payslipUrl !== 'Not uploaded' && (
                      <button
                        onClick={() => {
                          openPayslip(selectedApplication.id);
                        }}
                        className="ml-auto text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between">
              <div className="flex space-x-3">
                {(selectedApplication.status === 'pending' || selectedApplication.status === 'awaiting_admin_review') && canApprove && (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(selectedApplication);
                        setShowViewModal(false);
                        setSelectedApplication(null);
                      }}
                      className="flex items-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedApplication);
                        setShowViewModal(false);
                        setSelectedApplication(null);
                      }}
                      className="flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedApplication(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guarantor Decision Modal */}
      {showGuarantorModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Guarantor Decision Details</h3>
              <button
                onClick={() => {
                  setShowGuarantorModal(false);
                  setSelectedApplication(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Loan Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loan ID</label>
                    <p className="text-sm text-gray-900">{selectedApplication.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Applicant</label>
                    <p className="text-sm text-gray-900">{selectedApplication.memberName || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">PSN: {selectedApplication.memberPsn || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount Requested</label>
                    <p className="text-lg font-semibold text-green-600">₦{selectedApplication.amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Guarantor Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Guarantor Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Guarantor Name</label>
                    <p className="text-sm text-gray-900">{selectedApplication.grantorName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Guarantor PSN</label>
                    <p className="text-sm text-gray-900">{selectedApplication.grantorPsn}</p>
                  </div>
                </div>
              </div>

              {/* Decision Status */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Decision Status</h4>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-700">Current Status:</span>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      selectedApplication.guarantor_status === 'approved' ? 'text-green-800 bg-green-100' :
                      selectedApplication.guarantor_status === 'rejected' ? 'text-red-800 bg-red-100' :
                      'text-yellow-800 bg-yellow-100'
                    }`}>
                      {selectedApplication.guarantor_status === 'approved' ? '✅ Approved' :
                       selectedApplication.guarantor_status === 'rejected' ? '❌ Rejected' : '⏳ Pending Response'}
                    </span>
                  </div>

                  {selectedApplication.guarantor_status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Waiting for Guarantor Response</p>
                          <p className="text-xs text-yellow-700">The guarantor has been notified and is reviewing this guarantee request.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedApplication.guarantor_status === 'approved' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-green-800">Guarantee Approved</p>
                          <p className="text-xs text-green-700">The guarantor has approved this loan application. You can now proceed with the approval process.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedApplication.guarantor_status === 'rejected' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <XCircle className="w-5 h-5 text-red-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Guarantee Rejected</p>
                          <p className="text-xs text-red-700">The guarantor has rejected this loan application. Consider finding an alternative guarantor.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Decision Timeline */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Decision Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Loan Application Submitted</p>
                      <p className="text-xs text-gray-500">{selectedApplication.applicationDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Guarantor Notified</p>
                      <p className="text-xs text-gray-500">Email and in-system notification sent to guarantor</p>
                    </div>
                  </div>

                  {selectedApplication.guarantor_status !== 'pending' && (
                    <div className="flex items-center space-x-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        selectedApplication.guarantor_status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {selectedApplication.guarantor_status === 'approved' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Guarantee {selectedApplication.guarantor_status === 'approved' ? 'Approved' : 'Rejected'}
                        </p>
                        <p className="text-xs text-gray-500">Decision recorded in system</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between">
              <div className="flex space-x-3">
                {selectedApplication.status === 'pending' && selectedApplication.guarantor_status === 'approved' && (
                  <button
                    onClick={() => {
                      handleApprove(selectedApplication);
                      setShowGuarantorModal(false);
                      setSelectedApplication(null);
                    }}
                    className="flex items-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Loan
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowGuarantorModal(false);
                  setSelectedApplication(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
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

export default LoanApplicationsPage;
