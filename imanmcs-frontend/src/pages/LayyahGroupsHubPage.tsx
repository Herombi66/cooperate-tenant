import React, { useMemo, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { Users, Search, Filter, RefreshCcw, UserPlus, LogOut, Eye, Calendar } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import LayyahService from '../services/layyahService';
import { AnimalCategory, LayyahGroupSummary } from '../types';
import { useT } from '../i18n/useT';
import { layyahGroupsMessages } from '../i18n/layyahGroupsMessages';

const useDebouncedValue = <T,>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
};

const GroupCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="h-6 w-44 bg-gray-200 rounded mb-3" />
      <div className="h-4 w-full bg-gray-200 rounded mb-2" />
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-6" />
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-gray-200 rounded-lg" />
        <div className="h-10 w-10 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
};

const formatAnimal = (category: string) => {
  if (category === 'ram') return '🐏';
  if (category === 'sheep') return '🐑';
  if (category === 'goat') return '🐐';
  if (category === 'cow') return '🐄';
  return '🐾';
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(value));
  } catch {
    return value;
  }
};

const GroupCard: React.FC<{
  group: LayyahGroupSummary;
  mode: 'browse' | 'my';
  onJoin: (id: number) => void;
  onLeave: (id: number) => void;
  onView: (id: number) => void;
  busy: boolean;
  labels: {
    join: string;
    leave: string;
    view: string;
    members: string;
    created: string;
    type: string;
    slots: string;
    owner: string;
    member: string;
    guest: string;
    pending: string;
    approved: string;
    rejected: string;
    open: string;
    full: string;
  };
}> = ({ group, mode, onJoin, onLeave, onView, busy, labels }) => {
  const isFull = group.available_slots <= 0;
  const membershipStatus = (group.membership?.status || '').toString().toLowerCase();
  const membershipBadge =
    membershipStatus === 'pending' ? labels.pending :
    membershipStatus === 'approved' ? labels.approved :
    membershipStatus === 'rejected' ? labels.rejected :
    null;

  const roleBadge =
    (group.user_role === 'owner' || (group.user_role as any) === 'admin') ? labels.owner :
    group.user_role === 'member' ? labels.member :
    labels.guest;

  const primaryAction =
    mode === 'browse'
      ? {
          label: labels.join,
          icon: <UserPlus className="h-4 w-4" />,
          onClick: () => onJoin(group.id),
          disabled: busy || !LayyahService.canRequestJoin(group)
        }
      : {
          label: labels.leave,
          icon: <LogOut className="h-4 w-4" />,
          onClick: () => onLeave(group.id),
          disabled: busy || group.user_role !== 'member'
        };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">{roleBadge}</span>
        </div>
        <div className="flex items-center gap-2">
          {membershipBadge && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
              {membershipBadge}
            </span>
          )}
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${isFull ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
            {isFull ? labels.full : labels.open}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-3xl mb-2">{formatAnimal(group.animal_category)}</div>
        <h3 className="font-semibold text-gray-900 capitalize">{group.group_name}</h3>
        <p className="text-sm text-gray-600">{group.description || '—'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 mb-4">
        <div>
          <div className="text-xs text-gray-500">{labels.members}</div>
          <div className="font-medium">{group.member_count}/5</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">{labels.slots}</div>
          <div className="font-medium">{group.available_slots}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">{labels.created}</div>
          <div className="font-medium">{formatDate(group.created_at)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">{labels.type}</div>
          <div className="font-medium capitalize">{group.group_type}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={primaryAction.label}
        >
          {primaryAction.icon}
          <span>{primaryAction.label}</span>
        </button>
        <button
          type="button"
          onClick={() => onView(group.id)}
          className="w-10 px-0 inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          aria-label={labels.view}
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const LayyahGroupsHubPage: React.FC<{ defaultTab?: 'browse' | 'my' }> = ({ defaultTab = 'browse' }) => {
  const t = useT(layyahGroupsMessages);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const activeTab = (searchParams.get('tab') || defaultTab) as 'browse' | 'my';
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const debouncedSearch = useDebouncedValue(search, 350);

  const [animal, setAnimal] = useState<AnimalCategory | ''>('');
  const [availability, setAvailability] = useState<'all' | 'open' | 'full'>('all');
  const [sort, setSort] = useState<'created_at' | 'members' | 'price_min' | 'price_max'>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  const queryKey = useMemo(() => {
    return [
      'layyah-groups',
      activeTab,
      {
        q: debouncedSearch || undefined,
        animal_category: animal || undefined,
        availability: availability === 'all' ? undefined : availability,
        sort,
        order,
        page,
        limit
      }
    ];
  }, [activeTab, animal, availability, debouncedSearch, sort, order, page, limit]);

  const groupsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const scope = activeTab === 'browse' ? 'available' : 'my';
      const data = await LayyahService.getGroups({
        scope,
        page,
        limit,
        q: debouncedSearch || undefined,
        animal_category: animal || undefined,
        sort,
        order,
        availability: availability === 'all' ? undefined : availability
      });
      return data;
    },
    staleTime: 10000,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
    retry: false
  });
  const groupsErrorMessage =
    (groupsQuery.error as any)?.response?.status === 403 ? t('permissionError') : t('loadError');

  const joinMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return LayyahService.requestToJoinGroup(groupId);
    },
    onSuccess: () => {
      toast.success(t('joinSuccess'));
      queryClient.invalidateQueries({ queryKey: ['layyah-groups'] });
    },
    onError: (error: any) => {
      toast.error(LayyahService.formatJoinOrInviteError(error, t('loadError')));
    }
  });

  const leaveMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return LayyahService.leaveGroup(groupId);
    },
    onSuccess: () => {
      toast.success(t('leaveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['layyah-groups'] });
    },
    onError: (error: any) => {
      toast.error(LayyahService.formatJoinOrInviteError(error, t('loadError')));
    }
  });

  const busy = joinMutation.isPending || leaveMutation.isPending;

  const labels = {
    join: t('actionsJoin'),
    leave: t('actionsLeave'),
    view: t('actionsView'),
    members: t('membersLabel'),
    created: t('createdLabel'),
    type: t('typeLabel'),
    slots: t('slotsLabel'),
    owner: t('badgeOwner'),
    member: t('badgeMember'),
    guest: t('badgeGuest'),
    pending: t('statusPending'),
    approved: t('statusApproved'),
    rejected: t('statusRejected'),
    open: t('openLabel'),
    full: t('fullLabel')
  };

  const groups = groupsQuery.data?.groups || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-600">{t('subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => groupsQuery.refetch()}
          aria-label={t('retry')}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <RefreshCcw className="h-4 w-4" />
          <span>{t('retry')}</span>
        </button>
      </div>

      <Tabs.Root
        value={activeTab}
        onValueChange={(value) => {
          const next = new URLSearchParams(searchParams);
          next.set('tab', value);
          if (debouncedSearch) next.set('q', debouncedSearch);
          else next.delete('q');
          setSearchParams(next);
          setPage(1);
        }}
        className="w-full"
      >
        <Tabs.List className="inline-flex bg-gray-100 rounded-lg p-1">
          <Tabs.Trigger
            value="browse"
            className="px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t('tabBrowse')}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="my"
            className="px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t('tabMyGroups')}
          </Tabs.Trigger>
        </Tabs.List>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 ps-10 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchPlaceholder')}
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <select
                value={animal}
                onChange={(e) => {
                  setAnimal((e.target.value as AnimalCategory) || '');
                  setPage(1);
                }}
                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus))] focus:ring-offset-2 focus:ring-offset-background"
                aria-label={t('filterAnimalAll')}
              >
                <option value="">{t('filterAnimalAll')}</option>
                <option value="ram">{t('animalRam')}</option>
                <option value="sheep">{t('animalSheep')}</option>
                <option value="goat">{t('animalGoat')}</option>
                <option value="cow">{t('animalCow')}</option>
              </select>
              <select
                value={availability}
                onChange={(e) => {
                  setAvailability(e.target.value as 'all' | 'open' | 'full');
                  setPage(1);
                }}
                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus))] focus:ring-offset-2 focus:ring-offset-background"
                aria-label={t('filterAvailabilityAll')}
              >
                <option value="all">{t('filterAvailabilityAll')}</option>
                <option value="open">{t('filterAvailabilityOpen')}</option>
                <option value="full">{t('filterAvailabilityFull')}</option>
              </select>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as 'created_at' | 'members' | 'price_min' | 'price_max');
                  setPage(1);
                }}
                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus))] focus:ring-offset-2 focus:ring-offset-background"
                aria-label={t('sortCreated')}
              >
                <option value="created_at">{t('sortCreated')}</option>
                <option value="members">{t('sortMembers')}</option>
                <option value="price_min">{t('sortPriceMin')}</option>
                <option value="price_max">{t('sortPriceMax')}</option>
              </select>
              <button
                type="button"
                onClick={() => setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="w-10 px-0 inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 h-10"
                aria-label={t('sortCreated')}
              >
                <Calendar className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <Tabs.Content value="browse" className="mt-6">
          {groupsQuery.isError ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-700 mb-4">{groupsErrorMessage}</p>
              <button
                type="button"
                onClick={() => groupsQuery.refetch()}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                {t('retry')}
              </button>
            </div>
          ) : groupsQuery.isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <GroupCardSkeleton key={`browse-skel-${i}`} />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('emptyBrowseTitle')}</h3>
              <p className="text-gray-600">{t('emptyBrowseBody')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groups.map((g) => (
                  <GroupCard
                    key={`browse-${g.id}`}
                    group={g}
                    mode="browse"
                    busy={busy}
                    labels={labels}
                    onJoin={(id) => joinMutation.mutate(id)}
                    onLeave={(id) => leaveMutation.mutate(id)}
                    onView={(id) => navigate(`/my-layyah/groups/${id}`)}
                  />
                ))}
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-600">
                  {t('pageMeta', {
                    page: groupsQuery.data?.pagination.page || 1,
                    pages: groupsQuery.data?.pagination.pages || 1
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('prev')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= (groupsQuery.data?.pagination.pages || 1)}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('next')}
                  </button>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value));
                      setPage(1);
                    }}
                    className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus))] focus:ring-offset-2 focus:ring-offset-background"
                    aria-label={t('pageSizeLabel')}
                  >
                    {[6, 12, 24].map(v => (
                      <option key={v} value={v}>{t('perPage', { count: v })}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="my" className="mt-6">
          {groupsQuery.isError ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-700 mb-4">{groupsErrorMessage}</p>
              <button
                type="button"
                onClick={() => groupsQuery.refetch()}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                {t('retry')}
              </button>
            </div>
          ) : groupsQuery.isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <GroupCardSkeleton key={`my-skel-${i}`} />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('emptyMyTitle')}</h3>
              <p className="text-gray-600">{t('emptyMyBody')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groups.map((g) => (
                  <GroupCard
                    key={`my-${g.id}`}
                    group={g}
                    mode="my"
                    busy={busy}
                    labels={labels}
                    onJoin={(id) => joinMutation.mutate(id)}
                    onLeave={(id) => leaveMutation.mutate(id)}
                    onView={(id) => navigate(`/my-layyah/groups/${id}`)}
                  />
                ))}
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-600">
                  {t('pageMeta', {
                    page: groupsQuery.data?.pagination.page || 1,
                    pages: groupsQuery.data?.pagination.pages || 1
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('prev')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= (groupsQuery.data?.pagination.pages || 1)}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('next')}
                  </button>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value));
                      setPage(1);
                    }}
                    className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus))] focus:ring-offset-2 focus:ring-offset-background"
                    aria-label={t('pageSizeLabel')}
                  >
                    {[6, 12, 24].map(v => (
                      <option key={v} value={v}>{t('perPage', { count: v })}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </motion.div>
  );
};

export default LayyahGroupsHubPage;
