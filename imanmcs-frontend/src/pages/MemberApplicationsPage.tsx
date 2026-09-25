import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Eye, CheckCircle, XCircle, Clock,
  User, FileText, Download, Loader, RefreshCw,
  Building2, Calendar, Phone, Mail, Award, AlertCircle,
  Check, X, Printer
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Application } from '../types';
import { useTenantTerminology } from '../utils/tenantTerminology';

interface StatsState {
  total: number;
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
  this_month: number;
}

export const MemberApplicationsPage: React.FC = () => {
  const { idLabel, isFmck } = useTenantTerminology();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Modals & Selected Application
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingApp, setRejectingApp] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Data & Pagination
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // KPI Stats
  const [stats, setStats] = useState<StatsState>({
    total: 0,
    pending: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    this_month: 0
  });

  const departmentList = [
    'Clinical Services',
    'Nursing',
    'Pharmacy',
    'Laboratory',
    'Administration',
    'Finance & Accounts',
    'Works & Maintenance',
    'Health Information Management',
    'Nutrition & Dietetics',
    'Radiology'
  ];

  // Fetch applications from API
  useEffect(() => {
    fetchApplications();
  }, [page, searchTerm, statusFilter, departmentFilter, genderFilter, sortBy]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(departmentFilter !== 'all' && { department: departmentFilter }),
        ...(genderFilter !== 'all' && { gender: genderFilter }),
        ...(sortBy && { sort: sortBy }),
        ...(searchTerm.trim() && { search: searchTerm.trim() })
      });

      if (isFmck) {
        params.append('tenant_id', 'fmcksmcs');
      }

      const response = await api.get(`/applications/?${params.toString()}`);
      const apps = response.data.applications || response.data || [];
      setApplications(apps);

      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages || 1);
        setTotalCount(response.data.pagination.total || apps.length);
      } else {
        setTotalPages(1);
        setTotalCount(apps.length);
      }

      if (response.data.stats) {
        setStats(response.data.stats);
      } else {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        setStats({
          total: apps.length,
          pending: apps.filter((a: Application) => a.status === 'pending').length,
          under_review: apps.filter((a: Application) => a.status === 'under_review').length,
          approved: apps.filter((a: Application) => a.status === 'approved').length,
          rejected: apps.filter((a: Application) => a.status === 'rejected').length,
          this_month: apps.filter((a: Application) => new Date(a.application_date || a.created_at) >= startOfMonth).length
        });
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setError('Failed to load applications');
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setGenderFilter('all');
    setSortBy('newest');
    setPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || departmentFilter !== 'all' || genderFilter !== 'all' || sortBy !== 'newest';

  // Helper to extract application fields
  const getAppRefNo = (app: Application) => {
    return (
      app.metadata?.reference_number ||
      app.metadata?.refNumber ||
      (isFmck ? `FMCK-APP-${String(app.id).padStart(6, '0')}` : `APP-${app.id}`)
    );
  };

  const getAppDept = (app: Application) => {
    return app.department || app.metadata?.department || (app.facility_name ? app.facility_name.replace(/^FMC Kumo - /i, '') : '—');
  };

  const getAppUnit = (app: Application) => {
    return app.unit || app.metadata?.unit || '—';
  };

  const getAppCadre = (app: Application) => {
    return app.cadre || app.metadata?.cadre || 'Staff Member';
  };

  const getAppDob = (app: Application) => {
    const dob = app.date_of_birth || app.metadata?.date_of_birth;
    if (!dob) return '—';
    try {
      return new Date(dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return String(dob);
    }
  };

  const getAppGender = (app: Application) => {
    return app.gender || app.metadata?.gender || '—';
  };

  const getAppTotalContribution = (app: Application) => {
    if (app.metadata?.total_initial_contribution) {
      return Number(app.metadata.total_initial_contribution);
    }
    return (Number(app.savings) || 0) + (Number(app.investment) || 0);
  };

  // Actions
  const handleApprove = async (application: Application) => {
    const refNo = getAppRefNo(application);
    const confirmMsg = `Approve membership application for ${application.name} (${refNo})?\n\nThis will:\n• Approve the application\n• Create their cooperative member account\n• Record initial approved contribution (₦${getAppTotalContribution(application).toLocaleString()})\n• Send a welcome notification with credentials`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      await api.put(`/applications/${application.id}/status`, {
        status: 'approved',
        review_notes: `Approved by administrator on ${new Date().toLocaleDateString()}`
      });

      toast.success(`Application approved! ${application.name} has been enrolled.`);
      if (showViewModal) setShowViewModal(false);
      fetchApplications();
    } catch (err: any) {
      console.error('Error approving application:', err);
      const msg = err.response?.data?.message || 'Failed to approve application';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnderReview = async (application: Application) => {
    const refNo = getAppRefNo(application);
    if (!window.confirm(`Mark application for ${application.name} (${refNo}) as "Under Review"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await api.put(`/applications/${application.id}/status`, {
        status: 'under_review',
        review_notes: 'Application placed under review'
      });

      toast.success(`Application marked as Under Review.`);
      if (showViewModal) setShowViewModal(false);
      fetchApplications();
    } catch (err: any) {
      console.error('Error updating status:', err);
      const msg = err.response?.data?.message || 'Failed to update status';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (application: Application) => {
    setRejectingApp(application);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const submitRejection = async () => {
    if (!rejectingApp) return;
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }

    setActionLoading(true);
    try {
      await api.put(`/applications/${rejectingApp.id}/status`, {
        status: 'rejected',
        rejection_reason: rejectionReason.trim(),
        review_notes: `Rejected by administrator: ${rejectionReason.trim()}`
      });

      toast.success(`Application rejected. Reason recorded in audit history.`);
      setShowRejectModal(false);
      setRejectingApp(null);
      if (showViewModal) setShowViewModal(false);
      fetchApplications();
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      const msg = err.response?.data?.message || 'Failed to reject application';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Status Styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
            Rejected
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Under Review
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
            Pending Review
          </span>
        );
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (applications.length === 0) {
      toast.error('No applications to export.');
      return;
    }

    const headers = [
      'Reference Number',
      'Applicant Name',
      idLabel,
      'Email',
      'Phone',
      'Department',
      'Unit',
      'Cadre',
      'Initial Savings (NGN)',
      'Initial Investment (NGN)',
      'Total Contribution (NGN)',
      'Status',
      'Application Date'
    ];

    const rows = applications.map(app => [
      `"${getAppRefNo(app)}"`,
      `"${app.name || ''}"`,
      `"${app.psn || ''}"`,
      `"${app.email || ''}"`,
      `"${app.phone || ''}"`,
      `"${getAppDept(app)}"`,
      `"${getAppUnit(app)}"`,
      `"${getAppCadre(app)}"`,
      (Number(app.savings) || 0),
      (Number(app.investment) || 0),
      getAppTotalContribution(app),
      `"${app.status}"`,
      `"${app.application_date || app.created_at || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FMCKSMCS_Applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Membership Applications
            </h1>
            {isFmck && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0F3D3D] text-[#D6A94A]">
                FMCKSMCS
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Review, evaluate, and manage staff membership applications and onboarding workflows
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchApplications()}
            disabled={loading}
            className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition"
            title="Refresh application data"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0F3D3D] hover:bg-[#134e4e] rounded-lg shadow-sm transition"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* 6 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total */}
        <div
          onClick={() => { setStatusFilter('all'); setPage(1); }}
          className={`cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm hover:shadow ${
            statusFilter === 'all' ? 'border-[#0F3D3D] ring-2 ring-[#0F3D3D]/10' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total</span>
            <span className="p-2 rounded-lg bg-gray-100 text-gray-700">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
          <span className="text-[11px] text-gray-500">All submissions</span>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => { setStatusFilter('pending'); setPage(1); }}
          className={`cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm hover:shadow ${
            statusFilter === 'pending' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Pending</span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{stats.pending}</p>
          <span className="text-[11px] text-blue-600/80">Awaiting action</span>
        </div>

        {/* Under Review */}
        <div
          onClick={() => { setStatusFilter('under_review'); setPage(1); }}
          className={`cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm hover:shadow ${
            statusFilter === 'under_review' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">In Review</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Eye className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{stats.under_review}</p>
          <span className="text-[11px] text-amber-600/80">Currently evaluating</span>
        </div>

        {/* Approved */}
        <div
          onClick={() => { setStatusFilter('approved'); setPage(1); }}
          className={`cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm hover:shadow ${
            statusFilter === 'approved' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Approved</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.approved}</p>
          <span className="text-[11px] text-emerald-600/80">Active accounts</span>
        </div>

        {/* Rejected */}
        <div
          onClick={() => { setStatusFilter('rejected'); setPage(1); }}
          className={`cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm hover:shadow ${
            statusFilter === 'rejected' ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Rejected</span>
            <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{stats.rejected}</p>
          <span className="text-[11px] text-rose-600/80">Declined entries</span>
        </div>

        {/* This Month */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F3D3D]">This Month</span>
            <span className="p-2 rounded-lg bg-[#0F3D3D]/10 text-[#0F3D3D]">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-[#0F3D3D] mt-2">{stats.this_month}</p>
          <span className="text-[11px] text-[#0F3D3D]/80">Current period</span>
        </div>
      </div>

      {/* Search & Advanced Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Multi-field search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={`Search by Name, ${idLabel}, Ref No, Email, Phone...`}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D3D] focus:border-transparent transition"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D3D] focus:border-transparent bg-white transition"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="md:col-span-3">
            <select
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D3D] focus:border-transparent bg-white transition"
            >
              <option value="all">All Departments</option>
              {departmentList.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D3D] focus:border-transparent bg-white transition"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="status">Status</option>
              <option value="contribution_desc">Contribution (High to Low)</option>
              <option value="contribution_asc">Contribution (Low to High)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Line: Gender & Filter Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Filter by Gender:</span>
            {['all', 'Male', 'Female'].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => { setGenderFilter(g); setPage(1); }}
                className={`px-2.5 py-1 rounded-md transition font-medium ${
                  genderFilter === g
                    ? 'bg-[#0F3D3D] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {g === 'all' ? 'All' : g}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-[#0F3D3D] hover:underline font-semibold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset all filters
            </button>
          )}
        </div>
      </div>
      {/* Applications Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-9 h-9 animate-spin text-[#0F3D3D] mb-3" />
            <p className="text-sm font-medium text-gray-600">Retrieving membership applications...</p>
            <p className="text-xs text-gray-400 mt-1">Connecting to database</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">Failed to load applications</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">{error}</p>
            <button
              onClick={() => fetchApplications()}
              className="inline-flex items-center px-4 py-2 bg-[#0F3D3D] text-white rounded-lg text-sm hover:bg-[#134e4e] transition"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        ) : applications.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No Membership Applications Found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-5">
              {hasActiveFilters
                ? 'No applications match your selected filters. Try adjusting your query or resetting filters.'
                : 'There are currently no membership applications submitted for this cooperative.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center px-4 py-2 bg-[#0F3D3D] text-white rounded-lg text-sm hover:bg-[#134e4e] transition shadow-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Applicant & Ref
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {idLabel} & Contact
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Department & Cadre
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Initial Contribution
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date & Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-sm">
                {applications.map((app) => {
                  const refNo = getAppRefNo(app);
                  const totalInitial = getAppTotalContribution(app);
                  const dept = getAppDept(app);
                  const cadre = getAppCadre(app);
                  const unit = getAppUnit(app);

                  return (
                    <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Applicant & Ref */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0F3D3D]/10 text-[#0F3D3D] font-bold text-sm flex items-center justify-center shrink-0">
                            {app.name ? app.name.slice(0, 2).toUpperCase() : 'AP'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 leading-snug">{app.name}</div>
                            <div className="text-xs font-mono font-medium text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                              {refNo}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* IPPIS & Contact */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-gray-900 text-xs">
                            <span className="text-gray-400 font-normal">{idLabel}: </span>
                            {app.psn}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {app.email}
                          </div>
                          {app.phone && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {app.phone}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Department & Cadre */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-medium text-gray-900 text-xs">{dept}</div>
                          <div className="text-xs text-gray-500">
                            {cadre} {unit !== '—' && <span className="text-gray-400">• {unit}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Initial Contribution */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-bold text-gray-900 text-sm">
                            ₦{totalInitial.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            Savings: ₦{(Number(app.savings) || 0).toLocaleString()} • Invest: ₦{(Number(app.investment) || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-medium">
                            + ₦1,500 entrance fee
                          </div>
                        </div>
                      </td>

                      {/* Date & Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(app.status)}
                          <div className="text-xs text-gray-400">
                            {new Date(app.application_date || app.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Modal */}
                          <button
                            onClick={() => {
                              setSelectedApplication(app);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-gray-600 hover:text-[#0F3D3D] hover:bg-gray-100 rounded-lg transition"
                            title="View Full Application Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Actions if Pending/Under Review */}
                          {(app.status === 'pending' || app.status === 'under_review') && (
                            <>
                              {app.status === 'pending' && (
                                <button
                                  onClick={() => handleUnderReview(app)}
                                  disabled={actionLoading}
                                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                                  title="Mark as Under Review"
                                >
                                  <Clock className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleApprove(app)}
                                disabled={actionLoading}
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                                title="Approve & Create Account"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openRejectModal(app)}
                                disabled={actionLoading}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                                title="Reject Application"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="px-5 py-3.5 bg-gray-50/70 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <div>
              Showing <span className="font-semibold text-gray-900">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalCount}</span> entries
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const hasGap = prev && p - prev > 1;

                  return (
                    <React.Fragment key={p}>
                      {hasGap && <span className="px-1 text-gray-400">...</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 rounded-md font-semibold transition ${
                          page === p
                            ? 'bg-[#0F3D3D] text-white shadow-xs'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7-Section Application Details Modal */}
      {showViewModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0F3D3D] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 text-[#D6A94A] font-bold flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold leading-tight">{selectedApplication.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-white/80 mt-0.5">
                    <span>{getAppRefNo(selectedApplication)}</span>
                    <span>•</span>
                    <span>{idLabel}: {selectedApplication.psn}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - 7 Sections */}
            <div className="p-6 space-y-6 overflow-y-auto text-sm">
              {/* Section 1: Overview Banner */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase font-semibold text-gray-400">Application Reference</div>
                  <div className="text-base font-mono font-bold text-gray-900 mt-0.5">
                    {getAppRefNo(selectedApplication)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase font-semibold text-gray-400">Submission Date</div>
                  <div className="text-sm font-medium text-gray-900 mt-0.5">
                    {new Date(selectedApplication.application_date || selectedApplication.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase font-semibold text-gray-400">Current Status</div>
                  <div className="mt-1">{getStatusBadge(selectedApplication.status)}</div>
                </div>
              </div>

              {/* Section 2: Personal Information */}
              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="text-xs uppercase font-bold text-[#0F3D3D] tracking-wider mb-3 flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  1. Personal Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">Full Name</span>
                    <span className="font-medium text-gray-900">{selectedApplication.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">{idLabel}</span>
                    <span className="font-medium text-gray-900 font-mono">{selectedApplication.psn}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Date of Birth</span>
                    <span className="font-medium text-gray-900">{getAppDob(selectedApplication)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Gender</span>
                    <span className="font-medium text-gray-900">{getAppGender(selectedApplication)}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Contact Details */}
              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="text-xs uppercase font-bold text-[#0F3D3D] tracking-wider mb-3 flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  2. Contact Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">Email Address</span>
                    <span className="font-medium text-gray-900">{selectedApplication.email}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Phone Number</span>
                    <span className="font-medium text-gray-900">{selectedApplication.phone || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Section 4: Employment Details */}
              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="text-xs uppercase font-bold text-[#0F3D3D] tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  3. Employment & Institutional Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">Department</span>
                    <span className="font-medium text-gray-900">{getAppDept(selectedApplication)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Unit / Section</span>
                    <span className="font-medium text-gray-900">{getAppUnit(selectedApplication)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Cadre / Rank</span>
                    <span className="font-medium text-gray-900">{getAppCadre(selectedApplication)}</span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-xs text-gray-500 block">Healthcare Facility</span>
                    <span className="font-medium text-gray-900">
                      {selectedApplication.facility_name || 'Federal Medical Centre Kumo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 5: Financial Contribution Plan */}
              <div className="border border-emerald-200 bg-emerald-50/30 rounded-xl p-4">
                <h4 className="text-xs uppercase font-bold text-emerald-800 tracking-wider mb-3 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  4. Initial Financial Contributions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-emerald-100">
                    <span className="text-xs text-gray-500 block">Initial Savings</span>
                    <span className="text-base font-bold text-gray-900">
                      ₦{(Number(selectedApplication.savings) || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-100">
                    <span className="text-xs text-gray-500 block">Initial Investment</span>
                    <span className="text-base font-bold text-gray-900">
                      ₦{(Number(selectedApplication.investment) || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-200">
                    <span className="text-xs text-emerald-800 font-semibold block">Total Initial Contribution</span>
                    <span className="text-base font-bold text-emerald-700">
                      ₦{getAppTotalContribution(selectedApplication).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-100">
                  <span>
                    <strong>Target Monthly Savings:</strong> ₦{(Number(selectedApplication.target_saving) || 0).toLocaleString()} / month
                  </span>
                  <span className="text-emerald-800 font-medium">
                    ✓ Mandatory ₦1,500 entrance fee applies to first contribution
                  </span>
                </div>
              </div>

              {/* Section 6: Next of Kin & Reason for Joining */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs uppercase font-bold text-[#0F3D3D] tracking-wider mb-2">
                  5. Next of Kin & Statement of Purpose
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">Next of Kin Name</span>
                    <span className="font-medium text-gray-900">{selectedApplication.next_of_kin_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Next of Kin Phone</span>
                    <span className="font-medium text-gray-900">{selectedApplication.next_of_kin_phone || '—'}</span>
                  </div>
                </div>
                {(selectedApplication.metadata?.reason_for_joining || selectedApplication.metadata?.reason) && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500 block mb-1">Reason for Joining Cooperative</span>
                    <p className="text-xs text-gray-700 italic bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      "{selectedApplication.metadata?.reason_for_joining || selectedApplication.metadata?.reason}"
                    </p>
                  </div>
                )}
              </div>

              {/* Section 7: Audit & Review History */}
              <div className="border border-gray-200 bg-gray-50/50 rounded-xl p-4">
                <h4 className="text-xs uppercase font-bold text-gray-700 tracking-wider mb-3">
                  6. Review & Audit Trail
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block">Approved By:</span>
                    <span className="font-medium text-gray-900">{selectedApplication.approved_by || 'Not yet approved'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Approval Date:</span>
                    <span className="font-medium text-gray-900">
                      {selectedApplication.approved_at
                        ? new Date(selectedApplication.approved_at).toLocaleString()
                        : '—'}
                    </span>
                  </div>
                  {selectedApplication.review_notes && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 block">Review Notes:</span>
                      <span className="font-medium text-gray-800">{selectedApplication.review_notes}</span>
                    </div>
                  )}
                  {selectedApplication.rejection_reason && (
                    <div className="sm:col-span-2 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                      <span className="text-rose-700 font-semibold block">Rejection Reason:</span>
                      <span className="text-rose-900">{selectedApplication.rejection_reason}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print Details
              </button>

              <div className="flex items-center gap-2">
                {(selectedApplication.status === 'pending' || selectedApplication.status === 'under_review') && (
                  <>
                    {selectedApplication.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleUnderReview(selectedApplication)}
                        disabled={actionLoading}
                        className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition"
                      >
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        Mark Under Review
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedApplication)}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Approve & Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => openRejectModal(selectedApplication)}
                      disabled={actionLoading}
                      className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition"
                    >
                      <X className="w-3.5 h-3.5 mr-1.5" />
                      Reject Application
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && rejectingApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Reject Application</h3>
                <p className="text-xs text-gray-500">Applicant: {rejectingApp.name}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Please state the specific reason for declining this membership application. The reason will be permanently archived in the application's audit history and sent to the applicant.
            </p>

            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete verification documents, staff profile mismatch, or invalid cadre designation..."
              className="w-full p-3 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setRejectingApp(null); }}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRejection}
                disabled={actionLoading || !rejectionReason.trim()}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50"
              >
                {actionLoading ? <Loader className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <X className="w-3.5 h-3.5 mr-1.5" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
