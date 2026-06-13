import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, User, Check, X, UserPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import LayyahService from '../services/layyahService';
import { useT } from '../i18n/useT';
import { layyahGroupsMessages } from '../i18n/layyahGroupsMessages';
import { useAuth } from '../contexts/AuthContext';

const formatAnimal = (category: string) => {
  if (category === 'ram') return '🐏';
  if (category === 'sheep') return '🐑';
  if (category === 'goat') return '🐐';
  if (category === 'cow') return '🐄';
  return '🐾';
};

export const LayyahGroupDetailsPage: React.FC = () => {
  const t = useT(layyahGroupsMessages);
  const { user } = useAuth();
  const { groupId } = useParams();
  const id = Number(groupId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [invitePsn, setInvitePsn] = React.useState('');
  const [disqualifyModal, setDisqualifyModal] = React.useState<{ open: boolean; memberId: number | null; name: string }>({
    open: false,
    memberId: null,
    name: ''
  });
  const [disqualifyReason, setDisqualifyReason] = React.useState('');

  const groupQuery = useQuery({
    queryKey: ['layyah-group', id],
    queryFn: () => LayyahService.getGroupById(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 10000,
    refetchInterval: 15000,
    retry: false
  });

  const membersQuery = useQuery({
    queryKey: ['layyah-group-members', id],
    queryFn: () => LayyahService.getGroupMembers(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 10000,
    refetchInterval: 15000,
    retry: false
  });
  const groupErrorMessage =
    (groupQuery.error as any)?.response?.status === 403 ? t('permissionError') : t('loadError');
  const membersErrorMessage =
    (membersQuery.error as any)?.response?.status === 403 ? t('permissionError') : t('loadError');

  const group = groupQuery.data;
  const isLeaderByPsn =
    !!user?.psn &&
    !!group?.user_psn &&
    user.psn.toString().trim().toLowerCase() === group.user_psn.toString().trim().toLowerCase();
  const role = (user?.role || '').toString().trim().toLowerCase();
  const isStaff = ['admin', 'super_admin', 'treasurer', 'chairman', 'secretary'].includes(role);
  const canManageMembers = isStaff || LayyahService.canManageGroupMembers(group) || isLeaderByPsn;
  const canInviteMembers =
    (isStaff || LayyahService.canInviteGroupMembers(group) || isLeaderByPsn) && Number(group?.available_slots ?? 0) !== 0;

  const inviteMutation = useMutation({
    mutationFn: async (psn: string) => {
      return LayyahService.addMemberToGroup(id, psn);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || t('inviteSuccess'));
      setInviteOpen(false);
      setInvitePsn('');
      queryClient.invalidateQueries({ queryKey: ['layyah-group-members', id] });
      queryClient.invalidateQueries({ queryKey: ['layyah-group', id] });
      queryClient.invalidateQueries({ queryKey: ['layyah-groups'] });
    },
    onError: (error: any) => {
      toast.error(LayyahService.formatJoinOrInviteError(error, t('inviteError')));
    }
  });

  const approveRejectMutation = useMutation({
    mutationFn: async (payload: { memberId: number; action: 'approve' | 'reject' }) => {
      return LayyahService.manageGroupMembership(payload.memberId, payload.action);
    },
    onSuccess: () => {
      toast.success(t('updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['layyah-group-members', id] });
      queryClient.invalidateQueries({ queryKey: ['layyah-group', id] });
      queryClient.invalidateQueries({ queryKey: ['layyah-groups'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('loadError'));
    }
  });

  const disqualifyMutation = useMutation({
    mutationFn: async (payload: { memberId: number; reason: string }) => {
      return LayyahService.disqualifyMember(payload.memberId, payload.reason);
    },
    onSuccess: () => {
      toast.success('Member disqualified successfully');
      setDisqualifyModal({ open: false, memberId: null, name: '' });
      setDisqualifyReason('');
      queryClient.invalidateQueries({ queryKey: ['layyah-group-members', id] });
      queryClient.invalidateQueries({ queryKey: ['layyah-group', id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to disqualify member');
    }
  });

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t('back')}</span>
        </button>
        <div className="mt-6 text-gray-700">{t('invalidGroup')}</div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t('back')}</span>
        </button>
      </div>

      {groupQuery.isError ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-700 mb-4">{groupErrorMessage}</p>
          <button
            type="button"
            onClick={() => groupQuery.refetch()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {t('retry')}
          </button>
        </div>
      ) : groupQuery.isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 animate-pulse">
          <div className="h-6 w-64 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-full bg-gray-200 rounded mb-2" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
      ) : !group ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 animate-pulse">
          <div className="h-6 w-64 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-full bg-gray-200 rounded mb-2" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{formatAnimal(group.animal_category)}</div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{group.group_name}</h1>
                <p className="text-sm text-gray-600">{group.description || '—'}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{group.member_count}/5</div>
              <div className="text-sm text-gray-600">{t('membersLabel')}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            <span>{t('membersTitle')}</span>
          </div>
          {group && canInviteMembers && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              disabled={inviteMutation.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
              aria-label={t('invite')}
            >
              <UserPlus className="h-4 w-4" />
              <span>{t('invite')}</span>
            </button>
          )}
        </div>
        {membersQuery.isError ? (
          <div className="p-8 text-center">
            <p className="text-gray-700 mb-4">{membersErrorMessage}</p>
            <button
              type="button"
              onClick={() => membersQuery.refetch()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {t('retry')}
            </button>
          </div>
        ) : membersQuery.isLoading ? (
          <div className="p-6 animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {(membersQuery.data || []).map((m: any) => {
              const isLeader = !!m.is_group_leader;
              const isPending = (m.status || '').toString().toLowerCase() === 'pending';
              const canManage = canManageMembers && !isLeader && isPending;
              return (
                <div key={m.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isLeader ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      <User className={`h-5 w-5 ${isLeader ? 'text-primary-700' : 'text-gray-700'}`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {m.applicant_name || '—'}
                        {isLeader && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700">{t('leader')}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{m.user_psn ? `PSN: ${m.user_psn}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      isPending ? 'bg-yellow-100 text-yellow-800' :
                      (m.status || '').toString().toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {(m.status || '').toString()}
                    </span>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={approveRejectMutation.isPending}
                          onClick={() => approveRejectMutation.mutate({ memberId: Number(m.id), action: 'approve' })}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                          aria-label={t('approve')}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={approveRejectMutation.isPending}
                          onClick={() => approveRejectMutation.mutate({ memberId: Number(m.id), action: 'reject' })}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                          aria-label={t('reject')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {isStaff && !isLeader && (
                      <button
                        type="button"
                        onClick={() => setDisqualifyModal({ open: true, memberId: Number(m.id), name: m.applicant_name })}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Disqualify member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('inviteTitle')}</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (inviteMutation.isPending) return;
                    setInviteOpen(false);
                    setInvitePsn('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={t('close')}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('invitePsnLabel')}</label>
                  <input
                    value={invitePsn}
                    onChange={(e) => setInvitePsn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={t('invitePsnPlaceholder')}
                    disabled={inviteMutation.isPending}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (inviteMutation.isPending) return;
                      setInviteOpen(false);
                      setInvitePsn('');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-60"
                    disabled={inviteMutation.isPending}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const psn = invitePsn.trim();
                      if (!psn) {
                        toast.error(t('invitePsnRequired'));
                        return;
                      }
                      const psnLower = psn.toLowerCase();
                      const alreadyInGroup = (membersQuery.data || []).some((m: any) => {
                        const existing = (m?.user_psn || m?.applicant_psn || '').toString().trim().toLowerCase();
                        return existing && existing === psnLower;
                      });
                      if (alreadyInGroup) {
                        toast.error(t('inviteDuplicate'));
                        return;
                      }
                      inviteMutation.mutate(psn);
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60"
                    disabled={inviteMutation.isPending}
                  >
                    {inviteMutation.isPending ? t('sending') : t('sendInvite')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {disqualifyModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 text-red-600">Disqualify Member</h2>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to disqualify <strong>{disqualifyModal.name}</strong> from this group? This will remove them from the group and reject their application.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Disqualification</label>
                  <textarea
                    value={disqualifyReason}
                    onChange={(e) => setDisqualifyReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter reason..."
                    rows={3}
                    disabled={disqualifyMutation.isPending}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDisqualifyModal({ open: false, memberId: null, name: '' });
                      setDisqualifyReason('');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={disqualifyMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!disqualifyReason.trim()) {
                        toast.error('Please provide a reason');
                        return;
                      }
                      if (disqualifyModal.memberId) {
                        disqualifyMutation.mutate({ memberId: disqualifyModal.memberId, reason: disqualifyReason });
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                    disabled={disqualifyMutation.isPending}
                  >
                    {disqualifyMutation.isPending ? 'Disqualifying...' : 'Disqualify'}
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

export default LayyahGroupDetailsPage;
