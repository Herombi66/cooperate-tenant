import React, { useState, useEffect } from 'react';
import {
  Users, Search, Filter, Download, Upload, PlusCircle,
  Edit, Eye, MoreHorizontal, UserCheck, UserX, FileText, RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Member {
   id: string;
   psn: string;
   name: string;
   email: string;
   phone?: string;
   facility_name?: string;
   facilityName?: string; // Keep for backward compatibility
   next_of_kin_name?: string;
   next_of_kin_phone?: string;
   savings?: number;
   investment?: number;
   target_saving?: number;
   target_period?: number;
   status: 'active' | 'inactive' | 'suspended';
   role: 'admin' | 'member' | 'treasurer' | 'chairman';
   created_at: string;
   updated_at: string;
   joinDate?: string; // Keep for backward compatibility
   totalContributions?: number;
   totalWithdrawals?: number;
   totalTerminations?: number;
   activeLoans?: number;
   is_default_password?: boolean;
   membershipApplication?: {
     id: number;
     psn: string;
     name: string;
     email: string;
     phone: string | null;
     facility_name: string | null;
     next_of_kin_name: string | null;
     next_of_kin_phone: string | null;
     savings: number;
     investment: number;
     target_saving: number;
     target_period: number;
     status: string;
     application_date: string;
     approved_by: string | null;
     approved_at: string | null;
     created_at: string;
     updated_at: string;
   } | null;
}

interface FinancialContributionTx {
  id: number;
  date: string;
  amount: number;
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
  application_date: string | null;
  approval_date: string | null;
  disbursement_date: string | null;
  first_repayment_date: string | null;
  purpose: string | null;
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

interface MemberFinancialProfile {
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
    history: FinancialContributionTx[];
  };
  loan: FinancialLoan | null;
  repayments: FinancialRepaymentRow[];
}

export const MembersPage: React.FC = () => {
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
const [memberDetails, setMemberDetails] = useState<Member | null>(null);
const [loadingDetails, setLoadingDetails] = useState(false);
  const [financialProfile, setFinancialProfile] = useState<MemberFinancialProfile | null>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [financialError, setFinancialError] = useState<string | null>(null);
  const [financialLastUpdatedAt, setFinancialLastUpdatedAt] = useState<Date | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch members from API
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await api.get(`/members?${params}`);
      setMembers(response.data.members);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed member data by ID
  const fetchMemberDetails = async (memberId: string) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(`/members/${memberId}`);
      setMemberDetails(response.data.member);
      return response.data.member;
    } catch (error: any) {
      console.error('Error fetching member details:', error);
      toast.error(error.response?.data?.message || 'Failed to load member details');
      return null;
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchMemberFinancialProfile = async (memberId: string, silent?: boolean) => {
    try {
      if (!silent) setLoadingFinancial(true);
      setFinancialError(null);
      const response = await api.get(`/members/${memberId}/financial-profile`);
      if (response.data?.success) {
        setFinancialProfile(response.data.profile);
        setFinancialLastUpdatedAt(new Date());
      } else {
        setFinancialProfile(null);
        setFinancialError(response.data?.message || 'Failed to load member financial profile');
      }
    } catch (error: any) {
      setFinancialProfile(null);
      setFinancialError(error.response?.data?.message || 'Failed to load member financial profile');
      if (!silent) toast.error(error.response?.data?.message || 'Failed to load member financial profile');
    } finally {
      if (!silent) setLoadingFinancial(false);
    }
  };

  useEffect(() => {
    if (!showFinancialModal || !selectedMember) return;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      await fetchMemberFinancialProfile(selectedMember.id, true);
    };

    tick();
    const timer = setInterval(tick, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [showFinancialModal, selectedMember?.id]);

  // Create member
  const createMember = async (memberData: any) => {
    try {
      const response = await api.post('/members', memberData);
      toast.success('Member created successfully!');
      fetchMembers(); // Refresh list
      return response.data;
    } catch (error: any) {
      console.error('Error creating member:', error);
      toast.error(error.response?.data?.message || 'Failed to create member');
      throw error;
    }
  };

  // Update member
  const updateMember = async (id: string, memberData: any) => {
    try {
      await api.put(`/members/${id}`, memberData);
      toast.success('Member updated successfully!');
      fetchMembers(); // Refresh list
    } catch (error: any) {
      console.error('Error updating member:', error);
      toast.error(error.response?.data?.message || 'Failed to update member');
      throw error;
    }
  };

  // Delete member
  const deleteMember = async (id: string) => {
    try {
      await api.delete(`/members/${id}`);
      toast.success('Member deleted successfully!');
      fetchMembers(); // Refresh list
    } catch (error: any) {
      console.error('Error deleting member:', error);
      toast.error(error.response?.data?.message || 'Failed to delete member');
      throw error;
    }
  };

  // Suspend/Activate member
  const toggleMemberStatus = async (id: string, action: 'suspend' | 'activate') => {
    try {
      const endpoint = action === 'suspend' ? 'suspend' : 'activate';
      await api.put(`/members/${id}/${endpoint}`);
      toast.success(`Member ${action}d successfully!`);
      fetchMembers(); // Refresh list
    } catch (error: any) {
      console.error(`Error ${action}ing member:`, error);
      toast.error(error.response?.data?.message || `Failed to ${action} member`);
      throw error;
    }
  };

  // Bulk import members through applications
   const importMembers = async (file: File) => {
     try {
       const formData = new FormData();
       formData.append('file', file);

       const response = await api.post('/applications/admin/bulk-import', formData, {
         headers: {
           'Content-Type': 'multipart/form-data',
         },
         timeout: 30000, // 30 second timeout for large files
       });

       toast.success(`Successfully imported ${response.data.imported} members!`);
       if (response.data.errors && response.data.errors.length > 0) {
         toast.error(`${response.data.errors.length} rows had errors during import`);
       }
       fetchMembers(); // Refresh list
       return response.data;
     } catch (error: any) {
       console.error('Error importing members:', error);

       // More specific error handling
       if (error.code === 'ECONNABORTED') {
         toast.error('Upload timed out. Please try with a smaller file.');
       } else if (error.response?.status === 413) {
         toast.error('File too large. Please use a file smaller than 10MB.');
       } else if (error.response?.status === 415) {
         toast.error('Unsupported file format. Please use CSV or Excel files.');
       } else {
         toast.error(error.response?.data?.message || 'Failed to import members');
       }
       throw error;
     }
   };

  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [page, searchTerm, statusFilter]);

  const filteredMembers = members; // API already handles filtering

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  const totalContributions = members.reduce((sum, member) => sum + (member.totalContributions || 0), 0);
  const membersWithLoans = members.filter(m => (m.activeLoans || 0) > 0).length;

  // Calculate stats from API response if available
  const stats = {
    totalMembers: totalMembers,
    activeMembers: activeMembers,
    totalContributions: totalContributions,
    membersWithLoans: membersWithLoans
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
          <p className="text-gray-600">Manage cooperative members and their profiles</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import Members
          </button>
          <button
            onClick={async () => {
              try {
                const params = new URLSearchParams({
                  ...(statusFilter !== 'all' && { status: statusFilter })
                });

                const response = await api.get(`/members/export?${params}`, {
                  responseType: 'blob'
                });

                // Create download link
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `members_export_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);

                toast.success('Members data exported successfully');
              } catch (error) {
                console.error('Export error:', error);
                toast.error('Failed to export members data');
              }
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
            Add Member
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeMembers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Contributions</p>
              <p className="text-2xl font-bold text-gray-900">₦{(stats.totalContributions / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserX className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">With Active Loans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.membersWithLoans}</p>
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
                placeholder="Search members..."
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PSN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Withdrawal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Termination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contributions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Loans
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Join Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-700">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.psn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.facility_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(member.status)}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₦{(member.totalWithdrawals || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₦{(member.totalTerminations || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₦{(member.totalContributions || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.activeLoans || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={async () => {
                          setSelectedMember(member);
                          await fetchMemberDetails(member.id);
                          setShowViewModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          setSelectedMember(member);
                          setFinancialProfile(null);
                          setFinancialError(null);
                          setFinancialLastUpdatedAt(null);
                          setShowFinancialModal(true);
                          await fetchMemberFinancialProfile(member.id);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Member Information"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          setSelectedMember(member);
                          await fetchMemberDetails(member.id);
                          setShowEditModal(true);
                        }}
                        className="text-green-600 hover:text-green-900"
                        title="Edit Member"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowMoreModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                        title="More Options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center">
          <p className="text-sm text-gray-700">
            Showing page <span className="font-medium">{page}</span> of{' '}
            <span className="font-medium">{Math.max(1, totalPages)}</span>
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
          {Array.from({ length: Math.max(5, Math.min(5, totalPages) || 1) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(totalPages || 1, page - 2)) + i;
            if (pageNum > (totalPages || 1)) return null;
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
            onClick={() => setPage(Math.min(totalPages || 1, page + 1))}
            disabled={page === (totalPages || 1)}
            className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Import Members Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Import Members</h3>
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
                    id="file-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-primary-600 hover:text-primary-700"
                  >
                    Choose file
                  </label>
                  {selectedFile && (
                    <div className="mt-2 p-2 bg-primary-50 rounded text-sm text-primary-700">
                      Selected: {selectedFile.name}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: .xlsx, .xls, .csv (Max 10MB)
                </p>
              </div>

              <div className="bg-primary-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-primary-900 mb-1">Required Columns:</h4>
                <p className="text-xs text-primary-700">
                  PSN, Name, Email, Phone, Facility_Name, Next_Of_Kin_Name, Next_Of_Kin_Phone, Savings, Investment, Target_Saving, Target_Period
                </p>
                <p className="text-xs text-primary-700 mt-1">
                  <strong>Note:</strong> Combined Savings + Investment must be at least ₦5,000. All membership application fields are required.
                </p>
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
                      toast.error('Please select a file first');
                      return;
                    }

                    setIsUploading(true);
                    try {
                      await importMembers(selectedFile);
                      setShowImportModal(false);
                      setSelectedFile(null);
                    } catch (error) {
                      // Error already handled in importMembers function
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                  disabled={!selectedFile || isUploading}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Importing...' : 'Import Members'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Member Modal */}
      {showViewModal && memberDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Complete Member Details</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedMember(null);
                  setMemberDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <>
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-primary-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-primary-700 mb-1">PSN</label>
                    <p className="text-lg font-semibold text-primary-900">{memberDetails.membershipApplication?.psn || 'N/A'}</p>
                  </div>
                  <div className="bg-primary-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-primary-700 mb-1">Full Name</label>
                    <p className="text-lg font-semibold text-primary-900">{memberDetails.membershipApplication?.name || 'N/A'}</p>
                  </div>
                  <div className="bg-primary-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-primary-700 mb-1">Email</label>
                    <p className="text-sm text-primary-800">{memberDetails.membershipApplication?.email || 'N/A'}</p>
                  </div>
                  <div className="bg-primary-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-primary-700 mb-1">Phone</label>
                    <p className="text-sm text-primary-800">{memberDetails.membershipApplication?.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-primary-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-primary-700 mb-1">Role</label>
                    <p className="text-sm font-medium text-primary-900 capitalize">{memberDetails.role || 'member'}</p>
                  </div>
                  <div className="bg-primary-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-primary-700 mb-1">Status</label>
                    <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                      memberDetails.status === 'active' ? 'bg-green-100 text-green-800' :
                      memberDetails.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {memberDetails.status}
                    </span>
                  </div>
                </div>

                {/* Detailed Information in Two Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Healthcare Facility</label>
                          <p className="text-sm text-gray-900">{memberDetails.membershipApplication?.facility_name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Next of Kin Name</label>
                          <p className="text-sm text-gray-900">{memberDetails.membershipApplication?.next_of_kin_name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Next of Kin Phone</label>
                          <p className="text-sm text-gray-900">{memberDetails.membershipApplication?.next_of_kin_phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600">User ID</label>
                          <p className="text-sm font-mono text-gray-900">{memberDetails.id}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Join Date</label>
                          <p className="text-sm text-gray-900">{memberDetails.created_at ? new Date(memberDetails.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Last Updated</label>
                          <p className="text-sm text-gray-900">{memberDetails.updated_at ? new Date(memberDetails.updated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Password Status</label>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            memberDetails.is_default_password ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {memberDetails.is_default_password ? 'Default Password' : 'Custom Password'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Savings & Investment</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <span className="text-sm font-medium text-green-700">Initial Savings</span>
                          <span className="text-sm font-semibold text-green-900">₦{(memberDetails.membershipApplication?.savings || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                          <span className="text-sm font-medium text-primary-700">Investment Amount</span>
                          <span className="text-sm font-semibold text-primary-900">₦{(memberDetails.membershipApplication?.investment || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                          <span className="text-sm font-medium text-purple-700">Total Initial Contribution</span>
                          <span className="text-sm font-bold text-purple-900">₦{((memberDetails.membershipApplication?.savings || 0) + (memberDetails.membershipApplication?.investment || 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Savings Goals</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Target Saving Amount</label>
                          <p className="text-lg font-semibold text-gray-900">₦{(memberDetails.membershipApplication?.target_saving || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Target Period</label>
                          <p className="text-sm text-gray-900">{memberDetails.membershipApplication?.target_period || 0} months</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Monthly Target</label>
                          <p className="text-sm text-gray-900">
                            ₦{memberDetails.membershipApplication?.target_period ?
                              Math.round((memberDetails.membershipApplication.target_saving || 0) / memberDetails.membershipApplication.target_period).toLocaleString()
                              : 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Application Status</label>
                          <span className="px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-800">
                            {memberDetails.membershipApplication?.status || 'Unknown'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Application Date</label>
                          <p className="text-sm text-gray-900">{memberDetails.membershipApplication?.application_date ?
                            new Date(memberDetails.membershipApplication.application_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Approved By</label>
                          <p className="text-sm text-gray-900">{memberDetails.membershipApplication?.approved_by || 'System'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedMember(null);
                  setMemberDetails(null);
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Financial Profile Modal */}
      {showFinancialModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Member Financial Profile</h3>
                <div className="text-sm text-gray-600">
                  {financialProfile?.member?.name || selectedMember.name} {financialProfile?.member?.psn ? `(${financialProfile.member.psn})` : `(${selectedMember.psn})`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {financialLastUpdatedAt ? (
                  <div className="text-xs text-gray-500">Updated: {financialLastUpdatedAt.toLocaleTimeString()}</div>
                ) : null}
                <button
                  onClick={async () => {
                    if (!selectedMember) return;
                    await fetchMemberFinancialProfile(selectedMember.id);
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
                <button
                  onClick={() => {
                    setShowFinancialModal(false);
                    setFinancialProfile(null);
                    setFinancialError(null);
                    setFinancialLastUpdatedAt(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 px-2"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {loadingFinancial ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : financialError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{financialError}</div>
              ) : financialProfile ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-xs text-green-700">Total Approved Contributions</div>
                      <div className="text-xl font-semibold text-green-900">₦{Number(financialProfile.contributions.total_approved || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                      <div className="text-xs text-primary-700">Outstanding Loan Balance</div>
                      <div className="text-xl font-semibold text-primary-900">
                        {financialProfile.loan ? `₦${Number(financialProfile.loan.remaining_balance || 0).toLocaleString()}` : '—'}
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-xs text-gray-600">Active Loan</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {financialProfile.loan ? `#${financialProfile.loan.id}` : 'None'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900">Contributions History</h4>
                      </div>
                      <div className="overflow-auto max-h-[55vh]">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {financialProfile.contributions.history.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="px-4 py-6 text-sm text-gray-500">No contributions found.</td>
                              </tr>
                            ) : (
                              financialProfile.contributions.history.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-700">{c.date ? new Date(c.date).toLocaleDateString() : '—'}</td>
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900">₦{Number(c.amount || 0).toLocaleString()}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{c.status}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Current Loan Details</h4>
                        {!financialProfile.loan ? (
                          <div className="text-sm text-gray-600">No active loan found for this member.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div><span className="text-gray-500">Loan Type:</span> <span className="text-gray-900 capitalize">{financialProfile.loan.loan_type}</span></div>
                            <div><span className="text-gray-500">Status:</span> <span className="text-gray-900">{financialProfile.loan.status}</span></div>
                            <div><span className="text-gray-500">Amount Borrowed:</span> <span className="text-gray-900">₦{Number(financialProfile.loan.amount_borrowed || 0).toLocaleString()}</span></div>
                            <div><span className="text-gray-500">Interest Rate:</span> <span className="text-gray-900">{Number(financialProfile.loan.interest_rate || 0)}%</span></div>
                            <div><span className="text-gray-500">Repayment Term:</span> <span className="text-gray-900">{financialProfile.loan.repayment_period_months} months</span></div>
                            <div><span className="text-gray-500">Monthly Repayment:</span> <span className="text-gray-900">₦{Number(financialProfile.loan.monthly_repayment || 0).toLocaleString()}</span></div>
                            <div><span className="text-gray-500">Total Repayment:</span> <span className="text-gray-900">₦{Number(financialProfile.loan.total_repayment || 0).toLocaleString()}</span></div>
                            <div><span className="text-gray-500">Paid (Verified):</span> <span className="text-gray-900">₦{Number(financialProfile.loan.total_paid_verified || 0).toLocaleString()}</span></div>
                            <div className="md:col-span-2"><span className="text-gray-500">Remaining Balance:</span> <span className="text-gray-900 font-semibold">₦{Number(financialProfile.loan.remaining_balance || 0).toLocaleString()}</span></div>
                          </div>
                        )}
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-900">Repayment History</h4>
                        </div>
                        <div className="overflow-auto max-h-[40vh]">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {financialProfile.repayments.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-4 py-6 text-sm text-gray-500">
                                    {financialProfile.loan ? 'No repayments recorded for this loan.' : 'No active loan repayments to display.'}
                                  </td>
                                </tr>
                              ) : (
                                financialProfile.repayments.map((r) => (
                                  <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm text-gray-700">{r.repayment_date ? new Date(r.repayment_date).toLocaleDateString() : '—'}</td>
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">₦{Number(r.repayment_amount || 0).toLocaleString()}</td>
                                    <td className="px-4 py-2 text-sm text-gray-700">{r.payment_method}</td>
                                    <td className="px-4 py-2 text-sm text-gray-700">{r.status}</td>
                                    <td className="px-4 py-2 text-sm text-gray-700">₦{Number(r.remaining_balance_after || 0).toLocaleString()}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600">No data available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form id="addMemberForm" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PSN</label>
                  <input
                    type="text"
                    name="psn"
                    placeholder="Enter PSN"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter full name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter email address"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Enter phone number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Healthcare Facility</label>
                <input
                  type="text"
                  name="facility_name"
                  placeholder="Enter healthcare facility name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Next of Kin Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Name</label>
                  <input
                    type="text"
                    name="next_of_kin_name"
                    placeholder="Enter next of kin name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Phone</label>
                  <input
                    type="tel"
                    name="next_of_kin_phone"
                    placeholder="Enter next of kin phone"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Initial Contributions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Savings (₦)</label>
                  <input
                    type="number"
                    name="savings"
                    min="0"
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Investment/Shares (₦)</label>
                  <input
                    type="number"
                    name="investment"
                    min="0"
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Target Savings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Saving (₦)</label>
                  <input
                    type="number"
                    name="target_saving"
                    min="0"
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Period (Months)</label>
                  <input
                    type="number"
                    name="target_period"
                    min="1"
                    placeholder="12"
                    defaultValue="12"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>


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
                  onClick={async (e) => {
                    e.preventDefault();
                    const form = document.getElementById('addMemberForm') as HTMLFormElement;
                    const formData = new FormData(form);

                    const memberData = {
                      psn: formData.get('psn') as string,
                      name: formData.get('name') as string,
                      email: formData.get('email') as string,
                      phone: formData.get('phone') as string,
                      facility_name: formData.get('facility_name') as string,
                      next_of_kin_name: formData.get('next_of_kin_name') as string,
                      next_of_kin_phone: formData.get('next_of_kin_phone') as string,
                      savings: parseFloat(formData.get('savings') as string || '0'),
                      investment: parseFloat(formData.get('investment') as string || '0'),
                      target_saving: parseFloat(formData.get('target_saving') as string || '0'),
                      target_period: parseInt(formData.get('target_period') as string || '12')
                    };

                    try {
                      // Use applications endpoint for admin member creation
                      const response = await api.post('/applications/admin/create-member', memberData);
                      toast.success('Member created successfully!');
                      setShowAddModal(false);
                      fetchMembers(); // Refresh the members list
                    } catch (error: any) {
                      console.error('Error creating member:', error);
                      toast.error(error.response?.data?.message || 'Failed to create member');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && memberDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Member</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMember(null);
                  setMemberDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PSN</label>
                  <input
                    type="text"
                    defaultValue={memberDetails.membershipApplication?.psn || ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={memberDetails.membershipApplication?.name || ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={memberDetails.membershipApplication?.email || ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={memberDetails.membershipApplication?.phone || ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Healthcare Facility</label>
                <input
                  type="text"
                  name="facility_name"
                  defaultValue={memberDetails.membershipApplication?.facility_name || ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Next of Kin Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Name</label>
                  <input
                    type="text"
                    name="next_of_kin_name"
                    defaultValue={memberDetails.membershipApplication?.next_of_kin_name || ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Phone</label>
                  <input
                    type="tel"
                    name="next_of_kin_phone"
                    defaultValue={memberDetails.membershipApplication?.next_of_kin_phone || ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Initial Contributions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Savings (₦)</label>
                  <input
                    type="number"
                    name="savings"
                    min="0"
                    defaultValue={memberDetails.membershipApplication?.savings || 0}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Investment/Shares (₦)</label>
                  <input
                    type="number"
                    name="investment"
                    min="0"
                    defaultValue={memberDetails.membershipApplication?.investment || 0}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Target Savings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Saving (₦)</label>
                  <input
                    type="number"
                    name="target_saving"
                    min="0"
                    defaultValue={memberDetails.membershipApplication?.target_saving || 0}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Period (Months)</label>
                  <input
                    type="number"
                    name="target_period"
                    min="1"
                    defaultValue={memberDetails.membershipApplication?.target_period || 12}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={memberDetails.status}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                    setMemberDetails(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={async (e) => {
                    e.preventDefault();

                    try {
                      // Get form data properly
                      const form = e.currentTarget.closest('form') as HTMLFormElement;
                      if (!form) {
                        console.error('Form not found');
                        return;
                      }

                      const formData = new FormData(form);

                      // Build member data from form - backend will handle partial updates
                      const memberData: any = {};

                      // Always include these fields from form
                      const fields = ['name', 'email', 'phone', 'facility_name', 'next_of_kin_name', 'next_of_kin_phone', 'status'];
                      fields.forEach(field => {
                        const value = formData.get(field);
                        if (value !== null && value !== undefined && value !== '') {
                          memberData[field] = value;
                        }
                      });

                      // Handle numeric fields
                      ['savings', 'investment', 'target_saving', 'target_period'].forEach(field => {
                        const value = formData.get(field);
                        if (value !== null && value !== undefined && value !== '') {
                          const num = field === 'target_period' ? parseInt(value as string) : parseFloat(value as string);
                          if (!isNaN(num)) {
                            memberData[field] = num;
                          }
                        }
                      });

                      // Only proceed if there are fields to update
                      if (Object.keys(memberData).length > 0) {
                        console.log('Updating member with data:', memberData);
                        await updateMember(memberDetails.id, memberData);

                        // Refresh member details and member list
                        await fetchMemberDetails(memberDetails.id);

                        toast.success('Member updated successfully!');
                      } else {
                        toast('No changes to update');
                      }

                      // Always close modal
                      setShowEditModal(false);
                      setSelectedMember(null);
                      setMemberDetails(null);

                    } catch (error) {
                      console.error('Error updating member:', error);
                      toast.error('Failed to update member');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Update Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* More Options Modal */}
      {showMoreModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">More Options</h3>
              <button
                onClick={() => {
                  setShowMoreModal(false);
                  setSelectedMember(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  if (!confirm(`Reset password for ${selectedMember.name}?`)) return;
                  
                  try {
                    const response = await api.put(`/members/${selectedMember.id}/reset-password`);
                    const newPassword = response.data.newPassword;
                    
                    // Show success with the new password
                    toast.success(
                      `Password reset successfully!\n\nNew Password: ${newPassword}\n\nPlease save this password and share it with the member.`,
                      { duration: 10000 }
                    );
                    
                    // Also show an alert for easy copying
                    alert(
                      `Password Reset Successful!\n\n` +
                      `Member: ${selectedMember.name}\n` +
                      `PSN: ${selectedMember.psn}\n` +
                      `New Password: ${newPassword}\n\n` +
                      `Please save this password and share it securely with the member.\n` +
                      `The member should change this password after their first login.`
                    );
                    
                    setShowMoreModal(false);
                    setSelectedMember(null);
                  } catch (error: any) {
                    console.error('Password reset error:', error);
                    toast.error(error.response?.data?.message || 'Failed to reset password');
                  }
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                  🔑
                </div>
                <div>
                  <div className="font-medium text-gray-900">Reset Password</div>
                  <div className="text-sm text-gray-500">Generate new password for member</div>
                </div>
              </button>

              <button
                onClick={() => {
                  alert(`Viewing contribution history for ${selectedMember.name}`);
                  setShowMoreModal(false);
                  setSelectedMember(null);
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  💰
                </div>
                <div>
                  <div className="font-medium text-gray-900">Contribution History</div>
                  <div className="text-sm text-gray-500">View all contributions</div>
                </div>
              </button>

              <button
                onClick={() => {
                  alert(`Viewing loan history for ${selectedMember.name}`);
                  setShowMoreModal(false);
                  setSelectedMember(null);
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  🏦
                </div>
                <div>
                  <div className="font-medium text-gray-900">Loan History</div>
                  <div className="text-sm text-gray-500">View all loans</div>
                </div>
              </button>

              <button
                onClick={async () => {
                  const action = selectedMember.status === 'active' ? 'suspend' : 'activate';
                  const actionText = action === 'suspend' ? 'suspend' : 'activate';

                  if (confirm(`Are you sure you want to ${actionText} ${selectedMember.name}?`)) {
                    try {
                      await toggleMemberStatus(selectedMember.id, action as 'suspend' | 'activate');
                      setShowMoreModal(false);
                      setSelectedMember(null);
                    } catch (error) {
                      // Error already handled in toggleMemberStatus function
                    }
                  }
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 flex items-center text-red-600"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                  {selectedMember.status === 'active' ? '⚠️' : '✅'}
                </div>
                <div>
                  <div className="font-medium">{selectedMember.status === 'active' ? 'Suspend Member' : 'Activate Member'}</div>
                  <div className="text-sm text-red-500">
                    {selectedMember.status === 'active' ? 'Temporarily disable account' : 'Re-enable account access'}
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setMemberToDelete(selectedMember);
                  setShowDeleteModal(true);
                  setShowMoreModal(false);
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 flex items-center text-red-700"
              >
                <div className="w-8 h-8 bg-red-200 rounded-lg flex items-center justify-center mr-3">
                  🗑️
                </div>
                <div>
                  <div className="font-medium">Delete Member</div>
                  <div className="text-sm text-red-600">Permanently remove member</div>
                </div>
              </button>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowMoreModal(false);
                  setSelectedMember(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {showDeleteModal && memberToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Member</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setMemberToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete <strong>{memberToDelete.name}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone. The member will be permanently removed from the system.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setMemberToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteMember(memberToDelete.id);
                    setShowDeleteModal(false);
                    setMemberToDelete(null);
                  } catch (error) {
                    // Error already handled in deleteMember function
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
