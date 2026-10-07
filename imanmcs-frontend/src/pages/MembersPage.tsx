import React, { useState, useEffect } from 'react';
import {
  Users, Search, Filter, Download, Upload, PlusCircle,
  Edit, Eye, EyeOff, MoreHorizontal, UserCheck, UserX, FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useTenantTerminology } from '../utils/tenantTerminology';
import { MemberFinancialProfileModal } from '../components/MemberFinancialProfileModal';

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
   role: string;
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

export const MembersPage: React.FC = () => {
  const { user } = useAuth();
  const { idLabel, isFmck } = useTenantTerminology();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [financialModalInitialTab, setFinancialModalInitialTab] = useState<'overview' | 'statement'>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showCloseAccountModal, setShowCloseAccountModal] = useState(false);
  const [closePreviewLoading, setClosePreviewLoading] = useState(false);
  const [closePreviewData, setClosePreviewData] = useState<any>(null);
  const [liquidateFromContribution, setLiquidateFromContribution] = useState(true);
  const [closureReason, setClosureReason] = useState('Voluntary Withdrawal');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [closingAccountSubmitting, setClosingAccountSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberDetails, setMemberDetails] = useState<Member | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
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
      const visibleMembers = (response.data.members || []).filter(
        (m: Member) => m.role !== 'super_admin' && m.email !== 'candsngltd@gmail.com'
      );
      setMembers(visibleMembers);
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

  const handleOpenCloseAccount = async (member: Member) => {
    setSelectedMember(member);
    setShowMoreModal(false);
    setShowCloseAccountModal(true);
    setClosePreviewLoading(true);
    setClosePreviewData(null);
    setLiquidateFromContribution(true);
    setClosureReason('Voluntary Withdrawal');
    setSettlementNotes('');
    try {
      const res = await api.get(`/members/${member.id}/close-preview`);
      if (res.data?.success) {
        setClosePreviewData(res.data);
      } else {
        toast.error(res.data?.message || 'Failed to fetch account closure preview');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error fetching closure preview');
    } finally {
      setClosePreviewLoading(false);
    }
  };

  const handleConfirmCloseAccount = async () => {
    if (!selectedMember) return;
    try {
      setClosingAccountSubmitting(true);
      const res = await api.post(`/members/${selectedMember.id}/close-account`, {
        liquidate_from_contribution: liquidateFromContribution,
        closure_reason: closureReason,
        settlement_notes: settlementNotes
      });
      if (res.data?.success) {
        toast.success(
          `Account closed for ${selectedMember.name}. Liquidated: ₦${Number(res.data.closure_summary?.total_liquidated || 0).toLocaleString()}, Refunded: ₦${Number(res.data.closure_summary?.refunded_amount || 0).toLocaleString()}`,
          { duration: 6000 }
        );
        setShowCloseAccountModal(false);
        setSelectedMember(null);
        fetchMembers();
      } else {
        toast.error(res.data?.message || 'Failed to close account');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to close account');
    } finally {
      setClosingAccountSubmitting(false);
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
        <div className="bg-card text-card-foreground border border-border p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalMembers}</p>
            </div>
          </div>
        </div>
        <div className="bg-card text-card-foreground border border-border p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Active Members</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeMembers}</p>
            </div>
          </div>
        </div>
        <div className="bg-card text-card-foreground border border-border p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Contributions</p>
              <p className="text-2xl font-bold text-foreground">₦{(stats.totalContributions / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </div>
        <div className="bg-card text-card-foreground border border-border p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
              <UserX className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">With Active Loans</p>
              <p className="text-2xl font-bold text-foreground">{stats.membersWithLoans}</p>
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
                placeholder={`Search by name, ${idLabel}, email...`}
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
                  {idLabel}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {!isFmck && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Withdrawal
                  </th>
                )}
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
                  {!isFmck && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₦{(member.totalWithdrawals || 0).toLocaleString()}
                    </td>
                  )}
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
                        onClick={() => {
                          setSelectedMember(member);
                          setShowFinancialModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Financial Profile"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto my-auto shadow-xl">
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
                  {idLabel.replace(/\s+/g, '_')}, Name, Email, Phone, Facility_Name, Next_Of_Kin_Name, Next_Of_Kin_Phone, {isFmck ? 'Contribution' : 'Savings, Investment'}, Target_Saving, Target_Period
                </p>
                <p className="text-xs text-primary-700 mt-1">
                  <strong>Note:</strong> {isFmck ? 'Initial Contribution must be at least ₦5,000 (₦2,000 entrance fee will be deducted).' : 'Combined Savings + Investment must be at least ₦5,000.'} All membership application fields are required.
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto my-auto shadow-xl">
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
                    <label className="block text-sm font-medium text-primary-700 mb-1">{idLabel}</label>
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
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">{isFmck ? 'Initial Contribution' : 'Savings & Investment'}</h4>
                      <div className="space-y-3">
                        {isFmck ? (
                          <>
                            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                              <span className="text-sm font-medium text-purple-700">Total Contribution</span>
                              <span className="text-sm font-bold text-purple-900">
                                ₦{(memberDetails.membershipApplication?.contribution || (memberDetails.membershipApplication?.savings || 0) + (memberDetails.membershipApplication?.investment || 0)).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <span className="text-sm font-medium text-gray-600">Entrance Fee (Deducted)</span>
                              <span className="text-sm font-semibold text-gray-700">
                                -₦{(memberDetails.membershipApplication?.metadata?.entrance_fee ? Number(memberDetails.membershipApplication.metadata.entrance_fee) : 2000).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                              <span className="text-sm font-medium text-green-700">Net Credited to Savings</span>
                              <span className="text-sm font-semibold text-green-900">
                                ₦{Math.max(0, (memberDetails.membershipApplication?.contribution ? memberDetails.membershipApplication.contribution - (memberDetails.membershipApplication?.metadata?.entrance_fee ? Number(memberDetails.membershipApplication.metadata.entrance_fee) : 2000) : (memberDetails.membershipApplication?.savings || 0))).toLocaleString()}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
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
      <MemberFinancialProfileModal
        isOpen={showFinancialModal && !!selectedMember}
        onClose={() => {
          setShowFinancialModal(false);
          setSelectedMember(null);
          setFinancialModalInitialTab('overview');
        }}
        memberId={selectedMember?.id || ''}
        fallbackName={selectedMember?.name}
        fallbackPsn={selectedMember?.psn}
        initialTab={financialModalInitialTab}
      />

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto my-auto shadow-xl">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Add New Member</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowAddPassword(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form id="addMemberForm" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{idLabel}</label>
                  <input
                    type="text"
                    name="psn"
                    placeholder={`Enter ${idLabel}`}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Leave blank to auto-generate"
                      className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    If left blank, a secure password is automatically generated and emailed to the member.
                  </p>
                </div>
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
              {isFmck ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contribution (₦) *</label>
                  <input
                    type="number"
                    name="contribution"
                    min="5000"
                    step="500"
                    placeholder="e.g. 5000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum required: ₦5,000. ₦2,000 entrance fee will be deducted from your first contribution.
                  </p>
                </div>
              ) : (
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
              )}

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
                  onClick={() => {
                    setShowAddModal(false);
                    setShowAddPassword(false);
                  }}
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

                    const passwordVal = (formData.get('password') as string || '').trim();

                    const contributionVal = parseFloat(formData.get('contribution') as string || '0');
                    const savingsVal = parseFloat(formData.get('savings') as string || '0');
                    const investmentVal = parseFloat(formData.get('investment') as string || '0');

                    const finalContribution = isFmck ? contributionVal : (savingsVal + investmentVal);
                    const entranceFee = isFmck ? 2000 : 0;
                    const remainingContribution = Math.max(0, finalContribution - entranceFee);

                    if (isFmck && finalContribution < 5000) {
                      toast.error('Minimum initial contribution is ₦5,000. ₦2,000 entrance fee will be deducted from this amount.');
                      return;
                    }

                    const memberData: any = {
                      psn: formData.get('psn') as string,
                      name: formData.get('name') as string,
                      email: formData.get('email') as string,
                      phone: formData.get('phone') as string,
                      facility_name: formData.get('facility_name') as string,
                      next_of_kin_name: formData.get('next_of_kin_name') as string,
                      next_of_kin_phone: formData.get('next_of_kin_phone') as string,
                      contribution: finalContribution,
                      savings: isFmck ? remainingContribution : savingsVal,
                      investment: isFmck ? 0 : investmentVal,
                      target_saving: parseFloat(formData.get('target_saving') as string || '0'),
                      target_period: parseInt(formData.get('target_period') as string || '12'),
                      tenant_id: isFmck ? 'fmcksmcs' : undefined,
                      metadata: isFmck ? {
                        contribution: finalContribution,
                        entrance_fee: entranceFee,
                        remaining_contribution: remainingContribution
                      } : undefined
                    };

                    if (passwordVal) {
                      memberData.password = passwordVal;
                    }

                    try {
                      // Use applications endpoint for admin member creation
                      const response = await api.post('/applications/admin/create-member', memberData);
                      toast.success('Member created successfully!');
                      setShowAddModal(false);
                      setShowAddPassword(false);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto my-auto shadow-xl">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{idLabel}</label>
                  <input
                    type="text"
                    name="psn"
                    defaultValue={memberDetails.membershipApplication?.psn || ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                    placeholder={`Enter ${idLabel}`}
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-0.5">Edit if member registered with an incorrect {idLabel}.</p>
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
              {isFmck ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contribution (₦)</label>
                  <input
                    type="number"
                    name="contribution"
                    min="5000"
                    step="500"
                    defaultValue={memberDetails.membershipApplication?.contribution || ((memberDetails.membershipApplication?.savings || 0) + (memberDetails.membershipApplication?.investment || 0)) || 5000}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum required: ₦5,000. ₦2,000 entrance fee will be deducted from your first contribution.
                  </p>
                </div>
              ) : (
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
              )}

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
                      const fields = ['psn', 'name', 'email', 'phone', 'facility_name', 'next_of_kin_name', 'next_of_kin_phone', 'status'];
                      fields.forEach(field => {
                        const value = formData.get(field);
                        if (value !== null && value !== undefined && value !== '') {
                          memberData[field] = typeof value === 'string' ? value.trim() : value;
                        }
                      });

                      // Handle numeric fields
                      ['contribution', 'savings', 'investment', 'target_saving', 'target_period'].forEach(field => {
                        const value = formData.get(field);
                        if (value !== null && value !== undefined && value !== '') {
                          const num = field === 'target_period' ? parseInt(value as string) : parseFloat(value as string);
                          if (!isNaN(num)) {
                            memberData[field] = num;
                          }
                        }
                      });

                      if (isFmck && memberData.contribution !== undefined) {
                        const fee = memberDetails.membershipApplication?.metadata?.entrance_fee !== undefined
                          ? Number(memberDetails.membershipApplication.metadata.entrance_fee)
                          : 2000;
                        memberData.savings = Math.max(0, memberData.contribution - fee);
                        memberData.investment = 0;
                        memberData.metadata = {
                          ...(memberDetails.membershipApplication?.metadata || {}),
                          contribution: memberData.contribution,
                          entrance_fee: fee,
                          remaining_contribution: memberData.savings
                        };
                      }

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto p-6 transition-all max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-xl font-bold text-gray-900">More Options</h3>
              <button
                onClick={() => {
                  setShowMoreModal(false);
                  setSelectedMember(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 mt-2">
              {/* 1. Reset Password */}
              <button
                onClick={async () => {
                  if (!confirm(`Reset password for ${selectedMember.name}?`)) return;
                  
                  try {
                    const response = await api.put(`/members/${selectedMember.id}/reset-password`);
                    const newPassword = response.data.newPassword;
                    
                    toast.success(
                      `Password reset successfully!\n\nNew Password: ${newPassword}\n\nPlease save this password and share it with the member.`,
                      { duration: 10000 }
                    );
                    
                    alert(
                      `Password Reset Successful!\n\n` +
                      `Member: ${selectedMember.name}\n` +
                      `${idLabel}: ${selectedMember.psn}\n` +
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
                className="w-full text-left p-3 rounded-xl hover:bg-gray-50 flex items-center transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mr-3.5 flex-shrink-0 text-xl">
                  🔑
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-[15px] group-hover:text-primary-700 transition-colors">Reset Password</div>
                  <div className="text-xs text-gray-500">Generate new password for member</div>
                </div>
              </button>

              {/* 2. View Account Statement (Highlight card from mockup) */}
              <button
                onClick={() => {
                  setFinancialModalInitialTab('statement');
                  setShowMoreModal(false);
                  setShowFinancialModal(true);
                }}
                className="w-full text-left p-3 rounded-xl bg-emerald-50/70 border border-emerald-100/90 hover:bg-emerald-100/80 flex items-center transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mr-3.5 flex-shrink-0 text-xl">
                  📜
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-[15px] group-hover:text-emerald-950 transition-colors">View Account Statement</div>
                  <div className="text-xs text-gray-600">Real-time ledger with sequential running balance</div>
                </div>
              </button>

              {/* 3. Contribution & Passbook History */}
              <button
                onClick={() => {
                  setFinancialModalInitialTab('overview');
                  setShowMoreModal(false);
                  setShowFinancialModal(true);
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-gray-50 flex items-center transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mr-3.5 flex-shrink-0 text-xl">
                  💰
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-[15px] group-hover:text-primary-700 transition-colors">Contribution & Passbook History</div>
                  <div className="text-xs text-gray-500">View breakdown and transactions</div>
                </div>
              </button>

              {/* 4. Loan & Repayment History */}
              <button
                onClick={() => {
                  setFinancialModalInitialTab('overview');
                  setShowMoreModal(false);
                  setShowFinancialModal(true);
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-gray-50 flex items-center transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mr-3.5 flex-shrink-0 text-xl">
                  🏛️
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-[15px] group-hover:text-primary-700 transition-colors">Loan & Repayment History</div>
                  <div className="text-xs text-gray-500">View active loans and repayments</div>
                </div>
              </button>

              {/* 5. Suspend Member */}
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
                      // Error already handled
                    }
                  }
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-red-50/50 flex items-center transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center mr-3.5 flex-shrink-0 text-xl text-amber-600">
                  {selectedMember.status === 'active' ? '⚠️' : '✅'}
                </div>
                <div>
                  <div className="font-bold text-red-600 text-[15px] group-hover:text-red-700 transition-colors">
                    {selectedMember.status === 'active' ? 'Suspend Member' : 'Activate Member'}
                  </div>
                  <div className="text-xs text-red-500">
                    {selectedMember.status === 'active' ? 'Temporarily disable account' : 'Re-enable account access'}
                  </div>
                </div>
              </button>

              {/* 6. Close Member Account */}
              <button
                onClick={() => handleOpenCloseAccount(selectedMember)}
                className="w-full text-left p-3 rounded-xl hover:bg-amber-50/50 flex items-center transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mr-3.5 flex-shrink-0 text-xl text-amber-600">
                  🔒
                </div>
                <div>
                  <div className="font-bold text-amber-800 text-[15px] group-hover:text-amber-900 transition-colors">Close Member Account</div>
                  <div className="text-xs text-amber-600">Reconcile loans, liquidate from savings & close</div>
                </div>
              </button>

              {/* 7. Delete Member */}
              <button
                onClick={() => {
                  setMemberToDelete(selectedMember);
                  setShowDeleteModal(true);
                  setShowMoreModal(false);
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-red-50/50 flex items-center transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center mr-3.5 flex-shrink-0 text-xl text-red-600">
                  🗑️
                </div>
                <div>
                  <div className="font-bold text-red-700 text-[15px] group-hover:text-red-800 transition-colors">Delete Member</div>
                  <div className="text-xs text-red-500">Permanently remove member</div>
                </div>
              </button>
            </div>

            <div className="flex justify-end mt-5 pt-1">
              <button
                onClick={() => {
                  setShowMoreModal(false);
                  setSelectedMember(null);
                }}
                className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Member Account Confirmation & Reconciliation Modal */}
      {showCloseAccountModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto p-6 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Close Member Account</h3>
                <div className="text-xs text-gray-500">
                  {selectedMember.name} • {idLabel}: {selectedMember.psn}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCloseAccountModal(false);
                  setSelectedMember(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {closePreviewLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                <div className="text-sm text-gray-500">Calculating ledger balance and loan positions...</div>
              </div>
            ) : closePreviewData ? (
              <div className="py-4 space-y-4">
                {/* 3 Metrics Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                    <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Contributions</div>
                    <div className="text-sm font-bold text-emerald-900 mt-1">
                      ₦{Number(closePreviewData.contribution_balance || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                    <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">Loan Balance</div>
                    <div className="text-sm font-bold text-rose-900 mt-1">
                      ₦{Number(closePreviewData.total_loan_balance || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                    <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Net Refund</div>
                    <div className="text-sm font-bold text-blue-900 mt-1">
                      ₦{Number(closePreviewData.projected_refund_amount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Loan Reconciliation Toggle if loans exist */}
                {closePreviewData.total_loan_balance > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={liquidateFromContribution}
                        onChange={(e) => setLiquidateFromContribution(e.target.checked)}
                        className="mt-0.5 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                      />
                      <div className="text-xs text-amber-900 font-medium">
                        Liquidate outstanding loans from member contribution balance
                      </div>
                    </label>
                    <div className="text-[11px] text-amber-700 pl-6.5">
                      {liquidateFromContribution ? (
                        <span>
                          ₦{Number(closePreviewData.max_liquidatable || 0).toLocaleString()} will be deducted from savings to pay off loan balances. Remaining loans after liquidation: ₦{Number(closePreviewData.projected_remaining_loan || 0).toLocaleString()}.
                        </span>
                      ) : (
                        <span>
                          No loan liquidation will take place. Full contribution balance (₦{Number(closePreviewData.contribution_balance || 0).toLocaleString()}) will be refunded.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Closure Reason */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Closure *</label>
                  <select
                    value={closureReason}
                    onChange={(e) => setClosureReason(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="Voluntary Withdrawal">Voluntary Withdrawal</option>
                    <option value="Retirement from Service">Retirement from Service</option>
                    <option value="Transfer / Relocation">Transfer / Relocation</option>
                    <option value="Deceased Member Settlement">Deceased Member Settlement</option>
                    <option value="Administrative Termination">Administrative Termination</option>
                  </select>
                </div>

                {/* Settlement Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Settlement / Payment Notes (Optional)</label>
                  <input
                    type="text"
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                    placeholder="e.g. Refunded via bank transfer Ref #987654"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Warning notice */}
                <div className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  ⚠️ <strong>Notice:</strong> Closing this account will mark member status as <span className="font-semibold text-gray-700">Closed</span>, finalize all contribution balances to ₦0, and disable member login access.
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCloseAccountModal(false);
                      setSelectedMember(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={closingAccountSubmitting}
                    onClick={handleConfirmCloseAccount}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow-xs transition-colors flex items-center cursor-pointer"
                  >
                    {closingAccountSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Closing Account...
                      </>
                    ) : (
                      'Confirm & Close Account'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-red-600">Failed to load preview data.</div>
            )}
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {showDeleteModal && memberToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto my-auto shadow-xl">
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
