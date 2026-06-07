import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, UserPlus, Shield, Crown, Calculator, User, CheckCircle, Users, Trash2, Eye, Edit, Lock, X, Copy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';

interface FoundMember {
  id: number;
  psn: string;
  name: string;
  email: string;
  hasUserAccount: boolean;
  currentRole: string | null;
  additionalRole: string | null; // Additional administrative role
  membershipStatus: string; // Core membership status (active/inactive/suspended)
  status: string;
  allAccounts?: Array<{
    id: number;
    role: string;
    status: string;
  }>; // All accounts for this member
}

const roleIcons = {
  admin: Shield,
  chairman: Crown,
  treasurer: Calculator,
  state_auditor: Eye,
  member: User
};

const roleColors = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  chairman: 'bg-purple-100 text-purple-800 border-purple-200',
  treasurer: 'bg-blue-100 text-blue-800 border-blue-200',
  state_auditor: 'bg-amber-100 text-amber-800 border-amber-200',
  member: 'bg-green-100 text-green-800 border-green-200'
};

interface UserData {
  id: number;
  psn: string;
  name: string;
  email: string;
  role: string;
  status: string;
  is_default_password: boolean;
  created_at: string;
  membership_application_id: number;
}

export const UserManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [foundMember, setFoundMember] = useState<FoundMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [assigningRole, setAssigningRole] = useState(false);

  // All users state
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showRoleAssignmentModal, setShowRoleAssignmentModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showResetSuccessModal, setShowResetSuccessModal] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState<{name: string, email: string, password: string} | null>(null);
  const [resettingPasswordId, setResettingPasswordId] = useState<number | null>(null);

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Password copied to clipboard');
  };

  // Reset user password
  const resetUserPassword = async (userId: number, userName?: string) => {
    const confirmMessage = userName 
      ? `Are you sure you want to reset the password for ${userName}? This will generate a temporary password and email it to them.`
      : 'Are you sure you want to reset this user\'s password? This will generate a temporary password and email it to them.';
      
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setResettingPasswordId(userId);
    try {
      const response = await api.post(`/users/${userId}/reset-password`);
      
      if (response.data.success) {
        setResetSuccessData({
          name: response.data.user.name,
          email: response.data.user.email,
          password: response.data.newPassword
        });
        setShowResetSuccessModal(true);
        toast.success('Password reset successfully');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to reset password');
    } finally {
      setResettingPasswordId(null);
    }
  };

  // Search member by PSN
  const searchMember = async (query: string) => {
    if (query.length < 2) {
      setFoundMember(null);
      return;
    }

    setSearching(true);
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);

      const data = response.data;
      if (data.success && data.members.length > 0) {
        setFoundMember(data.members[0]); // Take the first result
      } else {
        setFoundMember(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search member');
    } finally {
      setSearching(false);
    }
  };

  // Assign additional role to member
  const assignRole = async () => {
    if (!foundMember || !selectedRole) return;

    setAssigningRole(true);
    try {
      const membershipApplicationId = (foundMember as any).membershipApplicationId || foundMember.id;
      const memberAccountId =
        foundMember.allAccounts?.find((a) => a.role === 'member')?.id ||
        (foundMember.hasUserAccount ? foundMember.id : null);

      let effectiveMemberAccountId = memberAccountId;
      if (!effectiveMemberAccountId) {
        const createMemberRes = await api.post(`/users/${membershipApplicationId}/role`, { role: 'member' });
        if (!createMemberRes.data?.success || !createMemberRes.data?.member?.id) {
          toast.error(createMemberRes.data?.message || 'Failed to create member account');
          return;
        }
        effectiveMemberAccountId = createMemberRes.data.member.id;
      }

      const response = await api.post(`/users/${effectiveMemberAccountId}/additional-role`, { additionalRole: selectedRole });

      const data = response.data;
      if (data.success) {
        toast.success(`${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} account created successfully for ${foundMember.name}!`);

        // Clear the selected role
        setSelectedRole('');

        // Re-search to update the member information with the new role
        if (searchQuery.length >= 2) {
          searchMember(searchQuery);
        }
      } else {
        toast.error(data.message || 'Failed to assign role');
      }
    } catch (error) {
      console.error('Assign additional role error:', error);
      toast.error('Failed to assign additional role');
    } finally {
      setAssigningRole(false);
    }
  };

  // Remove additional role from member
  const removeAdditionalRole = async () => {
    if (!foundMember) return;

    setAssigningRole(true);
    try {
      const memberAccountId =
        foundMember.allAccounts?.find((a) => a.role === 'member')?.id ||
        (foundMember.hasUserAccount ? foundMember.id : null);

      if (!memberAccountId) {
        toast.error('Member account not found for this user');
        return;
      }

      const response = await api.post(`/users/${memberAccountId}/additional-role`, { additionalRole: null });

      const data = response.data;
      if (data.success) {
        toast.success(`Additional role removed successfully from ${foundMember.name}!`);

        // Re-search to update the member information
        if (searchQuery.length >= 2) {
          searchMember(searchQuery);
        }
      } else {
        toast.error(data.message || 'Failed to remove additional role');
      }
    } catch (error) {
      console.error('Remove additional role error:', error);
      toast.error('Failed to remove additional role');
    } finally {
      setAssigningRole(false);
    }
  };

  // Load all users
  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (userSearch) params.append('search', userSearch);
      if (userRoleFilter) params.append('role', userRoleFilter);

      const response = await api.get(`/users?${params.toString()}`);

      const data = response.data;
      if (data.success) {
        setAllUsers(data.users);
        setTotalPages(data.pagination.pages);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Load users error:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Remove user role
  const removeUserRole = async (userId: number, userName: string, userRole: string) => {
    if (!confirm(`Are you sure you want to remove the ${userRole} role from ${userName}? This will delete their account.`)) {
      return;
    }

    try {
      const response = await api.delete(`/users/${userId}/role`);

      const data = response.data;
      if (data.success) {
        toast.success(data.message);
        loadAllUsers(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to remove role');
      }
    } catch (error) {
      console.error('Remove user role error:', error);
      toast.error('Failed to remove role');
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchMember(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Load users on component mount and when filters/page change
  useEffect(() => {
    loadAllUsers();
  }, [userSearch, userRoleFilter, page]);

  // Only allow admin access
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
              <p className="text-gray-600">Search for a member by PSN and assign roles</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-red-600">
                  {allUsers.filter(u => u.role === 'admin').length}
                </div>
                <div className="text-sm text-gray-500">Admins</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-purple-600">
                  {allUsers.filter(u => u.role === 'chairman').length}
                </div>
                <div className="text-sm text-gray-500">Chairmen</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">
                  {allUsers.filter(u => u.role === 'treasurer').length}
                </div>
                <div className="text-sm text-gray-500">Treasurers</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-green-600">
                  {allUsers.filter(u => u.role === 'member').length}
                </div>
                <div className="text-sm text-gray-500">Members</div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto">
          {/* All Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border p-6"
          >
            <div className="bg-white rounded-lg shadow-sm border p-6 h-fit">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Users className="w-6 h-6 text-primary-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowRoleAssignmentModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
                  >
                    Assign Roles
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Users
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by name, email, or PSN..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Role
                  </label>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="chairman">Chairman</option>
                    <option value="treasurer">Treasurer</option>
                    <option value="state_auditor">State Auditor</option>
                    <option value="member">Member</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading users...</p>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allUsers.map((userData) => {
                        const RoleIcon = roleIcons[userData.role as keyof typeof roleIcons] || User;
                        return (
                          <tr key={userData.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                                    <span className="text-sm font-medium text-white">
                                      {userData.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {userData.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {userData.email}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    PSN: {userData.psn}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <RoleIcon className="w-4 h-4 mr-2 text-gray-400" />
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[userData.role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'}`}>
                                  {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                userData.status === 'active' ? 'bg-green-100 text-green-800' :
                                userData.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {userData.status}
                              </span>
                              {userData.is_default_password && (
                                <div className="text-xs text-amber-600 mt-1">
                                  ⚠️ Default password
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(userData.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {/* View user details */}}
                                  className="text-primary-600 hover:text-primary-900 p-1"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {/* Edit user */}}
                                  className="text-blue-600 hover:text-blue-900 p-1"
                                  title="Edit User"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => resetUserPassword(userData.id, userData.name)}
                                  className="text-amber-600 hover:text-amber-900 p-1"
                                  title="Reset Password"
                                  disabled={resettingPasswordId === userData.id}
                                >
                                  {resettingPasswordId === userData.id ? (
                                    <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Lock className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => removeUserRole(userData.id, userData.name, userData.role)}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  title="Remove Role"
                                  disabled={userData.role === 'admin' && allUsers.filter(u => u.role === 'admin').length === 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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

              {/* Summary Stats */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {allUsers.filter(u => u.role === 'admin').length}
                    </div>
                    <div className="text-sm text-gray-500">Admins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {allUsers.filter(u => u.role === 'chairman').length}
                    </div>
                    <div className="text-sm text-gray-500">Chairmen</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {allUsers.filter(u => u.role === 'treasurer').length}
                    </div>
                    <div className="text-sm text-gray-500">Treasurers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {allUsers.filter(u => u.role === 'member').length}
                    </div>
                    <div className="text-sm text-gray-500">Members</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Role Assignment Modal */}
        {showRoleAssignmentModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <UserPlus className="w-6 h-6 text-primary-600 mr-2" />
                    <h3 className="text-xl font-semibold text-gray-900">Assign Leadership Roles</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowRoleAssignmentModal(false);
                      setFoundMember(null);
                      setSearchQuery('');
                      setSelectedRole('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>

                {/* Policy Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Leadership Role Assignment Policy</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Members can be assigned leadership roles (Chairman, Treasurer, Admin) which creates separate accounts with enhanced privileges.
                        Members maintain their basic membership status while gaining additional responsibilities. Leadership accounts have their own login credentials.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Member by PSN
                  </label>
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type PSN to search for a member..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                    />
                  </div>
                  {searching && (
                    <p className="text-sm text-gray-500 mt-2">Searching...</p>
                  )}
                </div>

                {/* Member Found Display */}
                {foundMember && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50 mb-6"
                  >
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <h3 className="text-lg font-medium text-gray-900">Member Found</h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase">Name</label>
                          <p className="text-lg font-medium text-gray-900">{foundMember.name}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase">PSN</label>
                          <p className="text-lg font-medium text-gray-900">{foundMember.psn}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase">Email</label>
                          <p className="text-sm text-gray-700">{foundMember.email}</p>
                        </div>
                      </div>

                      {/* Status and Role Display */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 rounded-md p-3">
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Membership Status</label>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                              foundMember.membershipStatus === 'active' ? 'bg-green-100 text-green-800' :
                              foundMember.membershipStatus === 'inactive' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {foundMember.membershipStatus || 'active'}
                            </span>
                            <span className="text-xs text-gray-600">Core Membership</span>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-md p-3">
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Administrative Role</label>
                          <div className="flex items-center space-x-2">
                            {foundMember.additionalRole ? (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${roleColors[foundMember.additionalRole as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'}`}>
                                {foundMember.additionalRole} Role
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                No Additional Role
                              </span>
                            )}
                            <span className="text-xs text-gray-600">Additional Responsibilities</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div className="border-t border-gray-200 pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Assign Role
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base"
                          >
                            <option value="">Select a leadership role...</option>
                            <option value="admin">👑 Admin - Full system access</option>
                            <option value="chairman">🎯 Chairman - Executive oversight</option>
                            <option value="treasurer">💰 Treasurer - Financial management</option>
                            <option value="state_auditor">🧾 State Auditor - Read-only audit access</option>
                          </select>
                          <button
                            onClick={assignRole}
                            disabled={!selectedRole || assigningRole}
                            className="px-6 py-3 bg-primary-600 text-white text-base font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                          >
                            {assigningRole ? 'Assigning...' : 'Assign Role'}
                          </button>
                        </div>

                        {/* Remove additional role section */}
                        {foundMember?.additionalRole && (
                          <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-md">
                            <div>
                              <span className="text-sm font-medium text-orange-800">Current Additional Role: {foundMember.additionalRole}</span>
                              <p className="text-xs text-orange-600 mt-1">Click to remove this additional role</p>
                            </div>
                            <button
                              onClick={removeAdditionalRole}
                              disabled={assigningRole}
                              className="px-4 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Remove Role
                            </button>
                          </div>
                        )}
                      </div>

                      {!foundMember.hasUserAccount && (
                        <p className="text-sm text-amber-600 mt-2">
                          ⚠️ This member doesn't have a user account yet. Assigning a leadership role will create a separate account with temporary credentials.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* No Results */}
                {searchQuery.length >= 2 && !searching && !foundMember && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No member found</h3>
                    <p className="text-gray-600">No approved member found with PSN "{searchQuery}"</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Make sure the PSN belongs to an approved membership application.
                    </p>
                  </motion.div>
                )}

                {/* Initial State */}
                {searchQuery.length < 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Search for a member</h3>
                    <p className="text-gray-600">Enter a PSN above to find and assign roles to members</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Success Modal */}
        {showResetSuccessModal && resetSuccessData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-6 h-6 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Password Reset Successful</h3>
                </div>
                <button 
                  onClick={() => setShowResetSuccessModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  The password for <strong>{resetSuccessData.name}</strong> has been reset.
                  An email has also been sent to <strong>{resetSuccessData.email}</strong>.
                </p>
                
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Temporary Password</p>
                  <div className="flex items-center justify-between">
                    <code className="text-xl font-mono font-bold text-primary-700 bg-white px-2 py-1 rounded border border-gray-200">
                      {resetSuccessData.password}
                    </code>
                    <button
                      onClick={() => copyToClipboard(resetSuccessData.password)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-amber-600 mt-3 flex items-start">
                  <Shield className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>The user will be required to change this password upon their first login.</span>
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowResetSuccessModal(false)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
