import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, User, UserPlus, Shield, ShieldCheck, 
  Trash2, Settings, Activity, Clock, AlertTriangle,
  Check, X, ChevronDown, MoreVertical
} from 'lucide-react';
import { LayyahService } from '../../services/layyahService';
import { LayyahAdminApplicantRow, LayyahApplication } from '../../types';
import { toast } from 'react-hot-toast';

interface AdminGroupManagementProps {
  group: LayyahAdminApplicantRow;
  onClose: () => void;
  onUpdate: () => void;
}

export const AdminGroupManagement: React.FC<AdminGroupManagementProps> = ({ group, onClose, onUpdate }) => {
  const [members, setMembers] = useState<LayyahApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'audit'>('members');
  const [disqualifyModal, setDisqualifyModal] = useState<{ open: boolean; member: LayyahApplication | null }>({
    open: false,
    member: null
  });
  const [disqualifyReason, setDisqualifyReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [group.application_id]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await LayyahService.getGroupMembers(group.application_id);
      setMembers(data);
    } catch (error) {
      toast.error('Failed to load group members');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (memberId: number, role: 'leader' | 'member' | 'moderator') => {
    try {
      setIsUpdating(true);
      await LayyahService.updateMemberRole(memberId, role);
      toast.success('Role updated successfully');
      await fetchMembers();
      onUpdate();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisqualify = async () => {
    if (!disqualifyModal.member || !disqualifyReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      setIsUpdating(true);
      await LayyahService.disqualifyMember(disqualifyModal.member.id, disqualifyReason);
      toast.success('Member disqualified successfully');
      setDisqualifyModal({ open: false, member: null });
      setDisqualifyReason('');
      await fetchMembers();
      onUpdate();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to disqualify member');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGroupStatusUpdate = async (status: string) => {
    try {
      setIsUpdating(true);
      await LayyahService.updateGroupSettings(group.application_id, { status });
      toast.success('Group status updated');
      onUpdate();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotesUpdate = async (notes: string) => {
    if (notes === group.notes) return;
    try {
      setIsUpdating(true);
      await LayyahService.updateGroupSettings(group.application_id, { notes });
      toast.success('Notes updated');
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to update notes');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Group Management</h2>
              <p className="text-sm text-gray-500">ID: {group.application_id} • {group.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mt-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'members' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Members ({members.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'settings' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Group Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'audit' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <AnimatePresence mode="wait">
          {activeTab === 'members' && (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                  <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No members found in this group.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {members.map((member) => (
                    <div key={member.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{member.applicant_name}</div>
                          <div className="text-xs text-gray-500 flex flex-col space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span>Joined: {new Date(member.created_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className={`capitalize ${
                                member.group_role === 'leader' ? 'text-primary-600 font-bold' : 
                                member.group_role === 'moderator' ? 'text-purple-600 font-bold' : 'text-gray-500'
                              }`}>
                                {member.group_role || 'Member'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-[10px] text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span>Last active: {new Date(member.updated_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Role Select */}
                        <select
                          value={member.group_role || 'member'}
                          onChange={(e) => handleRoleUpdate(member.id, e.target.value as any)}
                          className="text-xs border-gray-300 rounded-lg focus:ring-primary-500"
                          disabled={isUpdating}
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                          <option value="leader">Leader</option>
                        </select>

                        <button
                          onClick={() => setDisqualifyModal({ open: true, member })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Disqualify Member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Status</label>
                    <select
                      value={group.status}
                      onChange={(e) => handleGroupStatusUpdate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="disbursed">Disbursed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                    <textarea
                      defaultValue={group.notes}
                      onBlur={(e) => handleNotesUpdate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      rows={4}
                      placeholder="Enter administrative notes..."
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Recent Administrative Actions</h3>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
              <div className="divide-y divide-gray-100">
                <div className="p-4 text-center text-sm text-gray-500">
                  Full audit log feature coming soon. Please check Activity Logs for now.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-white flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Disqualify Modal */}
      {disqualifyModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-3 text-red-600 mb-4">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-lg font-bold">Confirm Disqualification</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to disqualify <strong>{disqualifyModal.member?.applicant_name}</strong>? 
                This will remove them from the group and reject their application. This action is recorded in the audit trail.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Disqualification</label>
                  <textarea
                    value={disqualifyReason}
                    onChange={(e) => setDisqualifyReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Ineligible based on criteria..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDisqualifyModal({ open: false, member: null })}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisqualify}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                    disabled={isUpdating || !disqualifyReason.trim()}
                  >
                    {isUpdating ? 'Processing...' : 'Disqualify Member'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};