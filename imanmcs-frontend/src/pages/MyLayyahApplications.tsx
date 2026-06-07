import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Heart, Users, User, Calendar, DollarSign, Eye, UserPlus, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { LayyahService } from '../services/layyahService';
import { LayyahApplication } from '../types';
import { LayyahApplicationForm } from '../components/Forms/LayyahApplicationForm';

export const MyLayyahApplications: React.FC = () => {
  const [applications, setApplications] = useState<LayyahApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<LayyahApplication | null>(null);
  const [inviteApplication, setInviteApplication] = useState<LayyahApplication | null>(null);
  const [invitePsn, setInvitePsn] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [respondingInvitationId, setRespondingInvitationId] = useState<number | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await LayyahService.getMyApplications();
      setApplications(data);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationSuccess = () => {
    loadApplications();
  };

  const submitInvite = async () => {
    const target = inviteApplication;
    const psn = invitePsn.trim();
    if (!target) return;
    if (!psn) {
      toast.error('PSN is required');
      return;
    }
    const groupId = target.group_id || target.id;
    try {
      setInviteBusy(true);
      const result = await LayyahService.addMemberToGroup(groupId, psn);
      toast.success(result?.message || 'Invitation sent');
      setInviteApplication(null);
      setInvitePsn('');
      await loadApplications();
    } catch (error: any) {
      toast.error(LayyahService.formatJoinOrInviteError(error, 'Failed to send invitation'));
    } finally {
      setInviteBusy(false);
    }
  };

  const respondToInvitation = async (applicationId: number, action: 'accept' | 'decline') => {
    try {
      setRespondingInvitationId(applicationId);
      const result = await LayyahService.respondToGroupInvitation(applicationId, action);
      toast.success(result?.message || (action === 'accept' ? 'Invitation accepted' : 'Invitation declined'));
      await loadApplications();
    } catch (error: any) {
      toast.error(LayyahService.formatJoinOrInviteError(error, 'Failed to update invitation'));
    } finally {
      setRespondingInvitationId(null);
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
          <div className="p-2 bg-green-100 rounded-lg">
            <Heart className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Layyah Applications</h1>
            <p className="text-gray-600">Manage your commodity trading applications</p>
          </div>
        </div>
        <button
          onClick={() => setShowApplicationForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>New Application</span>
        </button>
      </motion.div>

      {/* Applications Grid */}
      {applications.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
          <p className="text-gray-600 mb-6">Start your Layyah journey by creating your first application</p>
          <button
            onClick={() => setShowApplicationForm(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create Application</span>
          </button>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((application) => {
            const isInvitation =
              application.kind === 'individual' &&
              !!application.group_id &&
              (application.status || '').toString().toLowerCase() === 'pending' &&
              (application.purpose || '').toString().toLowerCase().includes('invitation');

            const isResponding = respondingInvitationId === application.id;

            return (
              <div
                key={application.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
              {/* Application Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {application.kind === 'group' ? (
                    <Users className="h-5 w-5 text-blue-600" />
                  ) : (
                    <User className="h-5 w-5 text-green-600" />
                  )}
                  <span className="font-medium capitalize">{isInvitation ? 'Invitation' : application.kind}</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${LayyahService.getStatusColor(application.status)}`}>
                  {LayyahService.getStatusLabel(application.status)}
                </span>
              </div>

              {/* Animal Category */}
              <div className="mb-4">
                <div className="text-2xl mb-2">
                  {application.animal_category === 'ram' && '🐏'}
                  {application.animal_category === 'sheep' && '🐑'}
                  {application.animal_category === 'goat' && '🐐'}
                  {application.animal_category === 'cow' && '🐄'}
                </div>
                <h3 className="font-semibold text-gray-900 capitalize">
                  {LayyahService.getAnimalCategoryLabel(application.animal_category)}
                </h3>
              </div>

              {/* Price Range */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Price Range</span>
                </div>
                <div className="font-medium text-green-600">
                  {LayyahService.formatPriceRange(application.price_min, application.price_max)}
                </div>
              </div>

              {/* Group Info */}
              {application.kind === 'group' && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                    <Users className="h-4 w-4" />
                    <span>Group Members</span>
                  </div>
                  <div className="font-medium">
                    {(application.group_member_count || 0) + 1} / 5 members
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>Applied</span>
                </div>
                <div className="text-sm">
                  {new Date(application.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedApplication(application)}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>View</span>
                </button>
                {isInvitation && (
                  <>
                    <button
                      type="button"
                      onClick={() => respondToInvitation(application.id, 'accept')}
                      disabled={isResponding}
                      className="flex items-center justify-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                      aria-label="Accept invitation"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToInvitation(application.id, 'decline')}
                      disabled={isResponding}
                      className="flex items-center justify-center px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                      aria-label="Decline invitation"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
                {application.kind === 'group' && application.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      setInviteApplication(application);
                      setInvitePsn('');
                    }}
                    disabled={inviteBusy || ((application.group_member_count || 0) + 1) >= 5}
                    className="flex items-center justify-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    aria-label="Invite member"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                )}
              </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Application Form Modal */}
      {showApplicationForm && (
        <LayyahApplicationForm
          onClose={() => setShowApplicationForm(false)}
          onSuccess={handleApplicationSuccess}
        />
      )}

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Application Details</h2>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <div className="mt-1 capitalize">{selectedApplication.kind}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${LayyahService.getStatusColor(selectedApplication.status)}`}>
                        {LayyahService.getStatusLabel(selectedApplication.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Animal Category</label>
                  <div className="mt-1 capitalize">{selectedApplication.animal_category}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Price Range</label>
                  <div className="mt-1 font-medium text-green-600">
                    {LayyahService.formatPriceRange(selectedApplication.price_min, selectedApplication.price_max)}
                  </div>
                </div>

                {selectedApplication.rejection_reason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
                    <div className="mt-1 text-red-600">{selectedApplication.rejection_reason}</div>
                  </div>
                )}

                {selectedApplication.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <div className="mt-1">{selectedApplication.notes}</div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {inviteApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Invite a member</h2>
                <button
                  onClick={() => {
                    if (inviteBusy) return;
                    setInviteApplication(null);
                    setInvitePsn('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Member PSN</label>
                  <input
                    value={invitePsn}
                    onChange={(e) => setInvitePsn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter PSN"
                    disabled={inviteBusy}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (inviteBusy) return;
                      setInviteApplication(null);
                      setInvitePsn('');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-60"
                    disabled={inviteBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitInvite}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                    disabled={inviteBusy}
                  >
                    {inviteBusy ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
