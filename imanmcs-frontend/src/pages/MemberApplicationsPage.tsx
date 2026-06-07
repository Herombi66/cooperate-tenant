import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Eye, CheckCircle, XCircle, Clock,
  User, FileText, Download, Loader
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Application } from '../types';

export const MemberApplicationsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch applications from API
  useEffect(() => {
    fetchApplications();
  }, [page, searchTerm, statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await api.get(`/applications/?${params}`);
      setApplications(response.data.applications || response.data);
      setTotalPages(response.data.pagination.pages);
      setError(null);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to load applications');
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (application: Application) => {
    if (!confirm(`Approve membership application for ${application.name}?\n\nThis will:\n• Create a user account with default password\n• Send welcome email with login credentials\n• Grant access to the cooperative system`)) {
      return;
    }

    try {
      await api.put(`/applications/${application.id}/status`, {
        status: 'approved',
        review_notes: 'Approved by admin - Account created and welcome email sent'
      });

      toast.success(`✅ Application approved! ${application.name} is now a cooperative member with account access.`);

      // Refresh the applications list
      fetchApplications();
    } catch (err: any) {
      console.error('Error approving application:', err);
      const message = err.response?.data?.message || err.response?.data?.detail || 'Failed to approve application';
      toast.error(message);
    }
  };

  const handleReject = async (application: Application) => {
    const reason = prompt(`Reject application for ${application.name}?\n\nPlease provide a detailed reason for rejection:`);
    if (!reason || reason.trim() === '') return;

    try {
      await api.put(`/applications/${application.id}/status`, {
        status: 'rejected',
        review_notes: 'Rejected by admin',
        rejection_reason: reason.trim()
      });

      toast.success(`❌ Application rejected and rejection email sent to ${application.email}`);

      // Refresh the applications list
      fetchApplications();
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      const message = err.response?.data?.message || err.response?.data?.detail || 'Failed to reject application';
      toast.error(message);
    }
  };

  const handleUnderReview = async (application: Application) => {
    if (!confirm(`Mark application for ${application.name} as "Under Review"?\n\nThis will notify the applicant that their application is being reviewed.`)) {
      return;
    }

    try {
      await api.put(`/applications/${application.id}/status`, {
        status: 'under_review',
        review_notes: 'Application marked as under review'
      });

      toast.success(`📋 Application marked as under review and notification email sent to ${application.email}`);

      // Refresh the applications list
      fetchApplications();
    } catch (err: any) {
      console.error('Error updating application status:', err);
      const message = err.response?.data?.message || err.response?.data?.detail || 'Failed to update application status';
      toast.error(message);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toString().toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'under_review': return <Clock className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };


  const totalApplications = applications.length;
  const pendingApplications = applications.filter(app => app.status === 'pending').length;
  const approvedApplications = applications.filter(app => app.status === 'approved').length;
  const rejectedApplications = applications.filter(app => app.status === 'rejected').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Member Applications</h1>
        <p className="text-gray-600">Review and manage new member applications for the cooperative</p>
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
            <XCircle className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{rejectedApplications}</p>
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
                placeholder="Search by name, email, or application ID..."
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
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={() => {
              // Export applications data
              const csvContent = [
                ['Application ID', 'Name', 'Email', 'Phone', 'Facility', 'Position', 'Status', 'Application Date'].join(','),
                ...filteredApplications.map(app => [
                  app.id,
                  `"${app.name}"`,
                  app.email,
                  app.phone,
                  `"${app.facility_name}"`,
                  'Member', // Default position since it's not in the type
                  app.status,
                  app.created_at
                ].join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `member_applications_${new Date().toISOString().split('T')[0]}.csv`;
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-primary-500 mr-2" />
            <span className="text-gray-600">Loading applications...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-2">Error loading applications</div>
            <button
              onClick={fetchApplications}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professional Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initial Contribution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.name}
                          </div>
                          <div className="text-sm text-gray-500">{application.email}</div>
                          <div className="text-sm text-gray-500">{application.phone}</div>
                          <div className="text-sm text-gray-500">PSN: {application.psn}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{application.facility_name}</div>
                        <div className="text-sm text-gray-500">Next of Kin: {application.next_of_kin_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          ₦{((Number(application.savings) || 0) + (Number(application.investment) || 0)).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Savings: ₦{(Number(application.savings) || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Investment: ₦{(Number(application.investment) || 0).toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(application.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        <span className="ml-1 capitalize">{application.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedApplication(application);
                            setShowViewModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {(application.status === 'pending' || application.status === 'under_review') && (
                          <>
                            <button
                              onClick={() => handleApprove(application)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Approve Application - Creates account & sends welcome email"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            {application.status === 'pending' && (
                              <button
                                onClick={() => handleUnderReview(application)}
                                className="text-yellow-600 hover:text-yellow-900 p-1"
                                title="Mark as Under Review - Sends notification email"
                              >
                                <Clock className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleReject(application)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Reject Application - Sends rejection email"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
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

      {/* View Application Details Modal */}
      {showViewModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Application Details</h3>
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
                    <p className="text-sm text-gray-900">{new Date(selectedApplication.created_at).toLocaleDateString()}</p>
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

              {/* Personal Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="text-sm text-gray-900">{selectedApplication.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PSN</label>
                    <p className="text-sm text-gray-900">{selectedApplication.psn}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900">{selectedApplication.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Healthcare Facility</label>
                    <p className="text-sm text-gray-900">{selectedApplication.facility_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Next of Kin</label>
                    <p className="text-sm text-gray-900">{selectedApplication.next_of_kin_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Next of Kin Phone</label>
                    <p className="text-sm text-gray-900">{selectedApplication.next_of_kin_phone}</p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Financial Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Initial Savings</label>
                    <p className="text-sm text-gray-900">₦{selectedApplication.savings.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Initial Investment</label>
                    <p className="text-sm text-gray-900">₦{selectedApplication.investment.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Savings</label>
                    <p className="text-sm text-gray-900">₦{selectedApplication.target_saving.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Period</label>
                    <p className="text-sm text-gray-900">{selectedApplication.target_period} months</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Initial Contribution</label>
                    <p className="text-sm text-gray-900 font-semibold">
                      ₦{(selectedApplication.savings + selectedApplication.investment).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Review Information */}
              {(selectedApplication.approved_by || selectedApplication.status !== 'pending') && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Review Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <p className="text-sm text-gray-900 capitalize">{selectedApplication.status}</p>
                    </div>
                    {selectedApplication.approved_by && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Approved By</label>
                        <p className="text-sm text-gray-900">{selectedApplication.approved_by}</p>
                      </div>
                    )}
                    {selectedApplication.approved_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Approval Date</label>
                        <p className="text-sm text-gray-900">{new Date(selectedApplication.approved_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>


            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between">
              <div className="flex space-x-3">
                {(selectedApplication.status === 'pending' || selectedApplication.status === 'under_review') && (
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
                  Approve & Create Account
                </button>
                {selectedApplication.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleUnderReview(selectedApplication);
                      setShowViewModal(false);
                      setSelectedApplication(null);
                    }}
                    className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Mark Under Review
                  </button>
                )}
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
    </div>
  );
};
