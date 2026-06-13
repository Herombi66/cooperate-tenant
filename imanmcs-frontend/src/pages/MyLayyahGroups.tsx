import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, User, DollarSign, Calendar, MessageCircle, Check, X, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { LayyahService } from '../services/layyahService';
import { LayyahApplication } from '../types';

export const MyLayyahGroups: React.FC = () => {
  const [groups, setGroups] = useState<LayyahApplication[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<LayyahApplication | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'groups' | 'members'>('groups');

  useEffect(() => {
    loadMyGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadMyGroups = async () => {
    try {
      setLoading(true);
      // First get all my applications (including group memberships)
      const myApplications = await LayyahService.getMyApplications();

      // Filter for approved individual applications (group memberships) and group leader applications
      const myGroups = myApplications.filter(app => {
        if (app.kind === 'group' && app.status === 'approved') {
          return true; // Group leaders
        }
        if (app.kind === 'individual' && app.status === 'approved' && app.group_id) {
          return true; // Group members
        }
        return false;
      });

      setGroups(myGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load your groups');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupId: number) => {
    try {
      const response = await LayyahService.getGroupMembers(groupId);
      setGroupMembers(response);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load group members');
    }
  };

  const handleApproveMember = async (memberId: number) => {
    try {
      await LayyahService.manageGroupMembership(memberId, 'approve');
      toast.success('Member approved successfully');
      if (selectedGroup) {
        loadGroupMembers(selectedGroup.id);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to approve member');
    }
  };

  const handleRejectMember = async (memberId: number) => {
    try {
      const reason = prompt('Reason for rejection (optional):');
      await LayyahService.manageGroupMembership(memberId, 'reject', reason || undefined);
      toast.success('Member rejected');
      if (selectedGroup) {
        loadGroupMembers(selectedGroup.id);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reject member');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Users className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {view === 'groups' ? 'My Layyah Groups' : 'Group Members'}
            </h1>
            <p className="text-gray-600">
              {view === 'groups'
                ? 'Your Layyah groups and memberships'
                : selectedGroup ? `Members of ${selectedGroup.animal_category} group` : ''
              }
            </p>
          </div>
        </div>
        {view === 'members' && (
          <button
            onClick={() => {
              setView('groups');
              setSelectedGroup(null);
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Groups
          </button>
        )}
      </motion.div>

      {view === 'groups' ? (
        /* Groups View */
        groups.length === 0 ? (
          <motion.div variants={itemVariants} className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Yet</h3>
            <p className="text-gray-600 mb-6">
              You haven't joined any Layyah groups yet. Browse available groups or create your own group!
            </p>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2">
            {groups.map((group) => (
              <div
                key={`group-${group.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-primary-600" />
                    <span className="font-medium">
                      {group.kind === 'group' ? 'Group Leader' : 'Member'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Group ID: {group.group_id || group.id}
                  </span>
                </div>

                {/* Animal Category */}
                <div className="mb-4">
                  <div className="text-2xl mb-2">
                    {group.animal_category === 'ram' && '🐏'}
                    {group.animal_category === 'sheep' && '🐑'}
                    {group.animal_category === 'goat' && '🐐'}
                    {group.animal_category === 'cow' && '🐄'}
                  </div>
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {LayyahService.getAnimalCategoryLabel(group.animal_category)}
                  </h3>
                </div>

                {/* Price Range */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Price Range</span>
                  </div>
                  <div className="font-medium text-green-600">
                    {LayyahService.formatPriceRange(group.price_min, group.price_max)}
                  </div>
                </div>

                {/* Group Role Info */}
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Your Role</div>
                  <div className="font-medium">
                    {group.kind === 'group' ? 'Group Leader' : 'Member'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setSelectedGroup(group);
                      setView('members');
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Members</span>
                  </button>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )
      ) : (
        /* Members View */
        selectedGroup && (
          <motion.div variants={itemVariants}>
            {/* Group Info Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">
                    {selectedGroup.animal_category === 'ram' && '🐏'}
                    {selectedGroup.animal_category === 'sheep' && '🐑'}
                    {selectedGroup.animal_category === 'goat' && '🐐'}
                    {selectedGroup.animal_category === 'cow' && '🐄'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold capitalize">
                      {LayyahService.getAnimalCategoryLabel(selectedGroup.animal_category)} Group
                    </h3>
                    <p className="text-sm text-gray-600">
                      Price Range: {LayyahService.formatPriceRange(selectedGroup.price_min, selectedGroup.price_max)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{groupMembers.length}/5</div>
                  <div className="text-sm text-gray-600">Members</div>
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-4">
              {groupMembers.map((member) => (
                <motion.div
                  key={member.id}
                  variants={itemVariants}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                        {member.is_group_leader ? (
                          <User className="h-5 w-5 text-primary-600" />
                        ) : (
                          <User className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {member.applicant_name}
                          {member.is_group_leader && (
                            <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                              Leader
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600">
                          PSN: {member.user_psn} • Joined: {new Date(member.created_at).toLocaleDateString()}
                        </p>
                        {member.user_email && (
                          <p className="text-sm text-gray-500">{member.user_email}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${LayyahService.getStatusColor(member.status)}`}>
                        {LayyahService.getStatusLabel(member.status)}
                      </span>

                      {/* Group leader actions */}
                      {selectedGroup.group_leader_id &&
                       selectedGroup.group_leader_id === /* current user */ undefined && // TODO: Get current user ID
                       !member.is_group_leader &&
                       member.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveMember(member.id)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRejectMember(member.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )
      )}
    </motion.div>
  );
};
