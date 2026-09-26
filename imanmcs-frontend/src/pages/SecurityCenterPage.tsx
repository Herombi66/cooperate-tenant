import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Key,
  Users,
  CheckCircle,
  Download,
  AlertOctagon,
  RefreshCw,
  Search,
  Sliders,
  X,
  Copy,
  Terminal,
  Clock,
  Eye,
  TrendingUp,
  Activity,
  Ban,
  Radio
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import api from '../services/api';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

interface SecurityMetrics {
  failed_logins: number;
  successful_logins: number;
  suspicious_activities: number;
  new_admin_sessions: number;
  large_transactions: number;
  permission_changes: number;
  data_exports: number;
  system_errors: number;
}

interface Incident {
  id: string;
  category: string;
  action: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  actor_name: string;
  actor_role: string;
  actor_id?: number | null;
  ip_address: string;
  user_agent: string;
  description: string;
  created_at: string;
  metadata?: any;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
}

export const SecurityCenterPage: React.FC = () => {
  const { user } = useAuth();

  // Metrics & Incidents State
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    failed_logins: 0,
    successful_logins: 0,
    suspicious_activities: 0,
    new_admin_sessions: 0,
    large_transactions: 0,
    permission_changes: 0,
    data_exports: 0,
    system_errors: 0
  });

  const [threatLevel, setThreatLevel] = useState<string>('Normal');
  const [blockedIpsCount, setBlockedIpsCount] = useState<number>(0);
  const [timeRange, setTimeRange] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Realtime & Socket State
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [autoRefreshSecs, setAutoRefreshSecs] = useState<number>(5); // default 5s polling
  const [countdown, setCountdown] = useState<number>(5);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [recentLiveIds, setRecentLiveIds] = useState<Set<string>>(new Set());

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Investigation Modal
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Settings / Blocklist Modal
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [newIpToBlock, setNewIpToBlock] = useState<string>('');
  const [largeTxThreshold, setLargeTxThreshold] = useState<number>(500000);

  const socketRef = useRef<Socket | null>(null);

  // Fetch security overview metrics
  const fetchOverview = async (showToast = false) => {
    try {
      const res = await api.get(`/security/overview?timeRange=${timeRange}`);
      if (res.data.success && res.data.data) {
        setMetrics(res.data.data.metrics);
        setThreatLevel(res.data.data.posture?.threatLevel || 'Normal');
        setBlockedIpsCount(res.data.data.posture?.blockedIpsCount || 0);
        if (res.data.data.thresholds?.largeTransaction) {
          setLargeTxThreshold(res.data.data.thresholds.largeTransaction);
        }
        setLastSyncTime(new Date());
        if (showToast) {
          toast.success('Real-time overview synced');
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch security overview:', err.message);
    }
  };

  // Fetch incidents list
  const fetchIncidents = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams({
        category: selectedCategory,
        severity: selectedSeverity,
        status: selectedStatus,
        search: searchQuery,
        page: String(currentPage),
        limit: '12',
        timeRange
      });

      const res = await api.get(`/security/incidents?${params.toString()}`);
      if (res.data.success && res.data.data) {
        setIncidents(res.data.data.incidents || []);
        setTotalPages(res.data.data.pagination?.totalPages || 1);
        setLastSyncTime(new Date());
      }
    } catch (err: any) {
      if (!silent) toast.error('Failed to load security incidents');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch blocked IPs & settings
  const fetchSettings = async () => {
    try {
      const res = await api.get('/security/settings');
      if (res.data.success && res.data.data) {
        setBlockedIps(res.data.data.blockedIps || []);
        if (res.data.data.config?.largeTransactionThreshold) {
          setLargeTxThreshold(res.data.data.config.largeTransactionThreshold);
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch security settings:', err.message);
    }
  };

  // 1. Initial Load & Time Range Change
  useEffect(() => {
    fetchOverview();
    fetchIncidents();
    fetchSettings();
  }, [timeRange]);

  // 2. Incident Filter Changes
  useEffect(() => {
    fetchIncidents();
  }, [selectedCategory, selectedSeverity, selectedStatus, searchQuery, currentPage]);

  // 3. Socket.io Real-time connection
  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (!token) return;

    try {
      const base = (API_URL || '').replace(/\/$/, '');
      const socket: Socket = io(base, {
        transports: ['polling', 'websocket'],
        auth: { token },
        reconnectionAttempts: 10,
        timeout: 10000
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketConnected(true);
      });

      socket.on('connect_error', () => {
        setSocketConnected(false);
      });

      socket.on('disconnect', () => {
        setSocketConnected(false);
      });

      socket.on('security_event', (eventData: any) => {
        // Tag as recent live event
        if (eventData.id) {
          setRecentLiveIds(prev => new Set(prev).add(String(eventData.id)));
        }

        // Show live notification toast
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-sm w-full bg-gray-900 border border-red-500/50 shadow-2xl rounded-xl pointer-events-auto flex p-3 text-white text-xs gap-2.5 items-center`}
            >
              <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                <ShieldAlert className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex-1 truncate">
                <div className="font-bold text-red-400 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  LIVE SECURITY ALERT
                </div>
                <div className="text-gray-300 truncate mt-0.5">{eventData.description || eventData.action}</div>
              </div>
            </div>
          ),
          { duration: 4500 }
        );

        // Instantly refresh data
        fetchOverview();
        fetchIncidents(true);
      });

      socket.on('security_refresh_needed', () => {
        fetchOverview();
        fetchIncidents(true);
      });

      return () => {
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
      };
    } catch (e) {
      console.warn('Socket connection error:', e);
    }
  }, []);

  // 4. Real-time Polling Engine (Countdown Heartbeat)
  useEffect(() => {
    if (autoRefreshSecs <= 0) return;

    setCountdown(autoRefreshSecs);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchOverview();
          fetchIncidents(true);
          return autoRefreshSecs;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshSecs, selectedCategory, selectedSeverity, selectedStatus, searchQuery, currentPage, timeRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOverview(true), fetchIncidents()]);
  };

  // Execute remediation action
  const handleTakeAction = async (actionType: string, options: {
    incidentId?: string;
    targetIp?: string;
    targetUserId?: number | null;
    targetPsn?: string;
    notes?: string;
  }) => {
    try {
      setActionLoading(true);
      const res = await api.post('/security/action', {
        actionType,
        incidentId: options.incidentId,
        targetIp: options.targetIp,
        targetUserId: options.targetUserId,
        targetPsn: options.targetPsn,
        resolutionNotes: options.notes || resolutionNotes
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Action executed successfully');
        await Promise.all([fetchOverview(), fetchIncidents(), fetchSettings()]);
        if (activeIncident && activeIncident.id === options.incidentId) {
          setActiveIncident(prev => prev ? {
            ...prev,
            status: actionType === 'dismiss_incident' ? 'dismissed' : 'resolved',
            resolution_notes: options.notes || resolutionNotes
          } : null);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to execute security action');
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const url = `${api.defaults.baseURL || ''}/security/export?category=${selectedCategory}&timeRange=${timeRange}`;
    window.open(url, '_blank');
    toast.success('Security audit report downloaded');
  };

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      setActionLoading(true);
      const res = await api.post('/security/settings', {
        config: {
          largeTransactionThreshold: Number(largeTxThreshold)
        },
        blockedIps
      });
      if (res.data.success) {
        toast.success('Security configurations updated');
        setShowSettingsModal(false);
        fetchOverview();
      }
    } catch (err: any) {
      toast.error('Failed to update security settings');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddBlockedIp = () => {
    const ip = newIpToBlock.trim();
    if (!ip) return;
    if (blockedIps.includes(ip)) {
      toast.error('IP address is already blocked');
      return;
    }
    setBlockedIps(prev => [...prev, ip]);
    setNewIpToBlock('');
  };

  const handleRemoveBlockedIp = (ipToRemove: string) => {
    setBlockedIps(prev => prev.filter(ip => ip !== ipToRemove));
  };

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copied to clipboard`);
  };

  // Format relative timestamp
  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 10) return 'Just now';
      if (diffSecs < 60) return `${diffSecs}s ago`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return isoString;
    }
  };

  // Metric card definition
  const metricCards = [
    {
      key: 'failed_logins',
      title: 'Failed Logins',
      count: metrics.failed_logins,
      icon: Lock,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      ringColor: 'ring-rose-500',
      badge: 'Auth Risk',
      description: 'Rejected authentication attempts'
    },
    {
      key: 'successful_logins',
      title: 'Successful Logins',
      count: metrics.successful_logins,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      ringColor: 'ring-emerald-500',
      badge: 'Active Access',
      description: 'Authorized session authentications'
    },
    {
      key: 'suspicious_activities',
      title: 'Suspicious Activities',
      count: metrics.suspicious_activities,
      icon: AlertOctagon,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      ringColor: 'ring-amber-500',
      badge: 'Threat Alert',
      description: 'Brute force & anomalous access bursts'
    },
    {
      key: 'new_admin_sessions',
      title: 'New Admin Sessions',
      count: metrics.new_admin_sessions,
      icon: Key,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      ringColor: 'ring-indigo-500',
      badge: 'Privileged',
      description: 'Administrator & leadership sign-ins'
    },
    {
      key: 'large_transactions',
      title: 'Large Transactions',
      count: metrics.large_transactions,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      ringColor: 'ring-blue-500',
      badge: 'AML / Audit',
      description: `Transactions exceeding ₦${(largeTxThreshold || 500000).toLocaleString()}`
    },
    {
      key: 'permission_changes',
      title: 'Permission Changes',
      count: metrics.permission_changes,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      ringColor: 'ring-purple-500',
      badge: 'RBAC Audit',
      description: 'Role grants, elevations & revocations'
    },
    {
      key: 'data_exports',
      title: 'Data Exports',
      count: metrics.data_exports,
      icon: Download,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      ringColor: 'ring-teal-500',
      badge: 'DLP Alert',
      description: 'Bulk CSV, PDF & ledger extractions'
    },
    {
      key: 'system_errors',
      title: 'System Errors',
      count: metrics.system_errors,
      icon: AlertOctagon,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      ringColor: 'ring-red-500',
      badge: 'Stability',
      description: 'Unhandled 500 exceptions & gateway faults'
    }
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Security Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-zinc-950 text-white rounded-2xl p-6 md:p-8 shadow-2xl border border-gray-800 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-primary-500/20 text-primary-400 rounded-xl border border-primary-500/30 flex items-center justify-center">
                <ShieldAlert className="w-7 h-7 text-primary-400" />
              </span>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-wide text-white flex items-center gap-3">
                  SECURITY CENTER
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    LIVE REALTIME
                  </span>
                </h1>
                <p className="text-gray-400 text-xs md:text-sm mt-0.5">
                  Streaming real-time security events, threat signals, audit logs, and instant administrator remediation.
                </p>
              </div>
            </div>

            {/* Posture Bar & Real-time status */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-gray-800/80 text-xs">
              {/* Socket / Stream Status */}
              <div className="flex items-center gap-2 bg-gray-800/90 px-3 py-1.5 rounded-full border border-gray-700">
                <Radio className={`w-3.5 h-3.5 ${socketConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                <span className="text-gray-300 font-medium">Channel:</span>
                <span className={`font-semibold ${socketConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {socketConnected ? 'WebSocket Live' : `Auto-Polling (${autoRefreshSecs}s)`}
                </span>
              </div>

              {/* Threat Posture */}
              <div className="flex items-center gap-2 bg-gray-800/90 px-3 py-1.5 rounded-full border border-gray-700">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    threatLevel === 'Normal' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    threatLevel === 'Normal' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                </span>
                <span className="text-gray-300 font-medium">Threat Level:</span>
                <span className={`font-semibold ${
                  threatLevel === 'Normal' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {threatLevel}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-gray-400 bg-gray-800/90 px-3 py-1.5 rounded-full border border-gray-700">
                <Ban className="w-3.5 h-3.5 text-rose-400" />
                <span>Blocked IPs:</span>
                <strong className="text-white">{blockedIpsCount}</strong>
              </div>

              <div className="flex items-center gap-1.5 text-gray-400 bg-gray-800/90 px-3 py-1.5 rounded-full border border-gray-700">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin Sessions:</span>
                <strong className="text-white">{metrics.new_admin_sessions}</strong>
              </div>

              {/* Heartbeat Sync Indicator */}
              <div className="flex items-center gap-1.5 text-gray-400 text-[11px] ml-auto">
                <Clock className="w-3 h-3 text-gray-500" />
                <span>Last sync: {lastSyncTime.toLocaleTimeString()}</span>
                {autoRefreshSecs > 0 && (
                  <span className="text-primary-400 font-mono">({countdown}s)</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons & Time filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Realtime Stream Rate selector */}
            <div className="flex items-center bg-gray-800/90 border border-gray-700 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-gray-400 mr-1.5 font-medium">Stream:</span>
              <select
                value={autoRefreshSecs}
                onChange={(e) => setAutoRefreshSecs(Number(e.target.value))}
                className="bg-transparent text-primary-400 font-bold focus:outline-none cursor-pointer"
              >
                <option value={3} className="bg-gray-900 text-white">Every 3s</option>
                <option value={5} className="bg-gray-900 text-white">Every 5s</option>
                <option value={10} className="bg-gray-900 text-white">Every 10s</option>
                <option value={30} className="bg-gray-900 text-white">Every 30s</option>
                <option value={0} className="bg-gray-900 text-white">Paused</option>
              </select>
            </div>

            {/* Time range selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="24h">Past 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>

            <button
              onClick={() => {
                fetchSettings();
                setShowSettingsModal(true);
              }}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-gray-700 transition"
              title="Security Parameters & Blocked IPs"
            >
              <Sliders className="w-4 h-4 text-gray-300" />
              <span>Settings</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-gray-700 transition"
              title="Export Incident Log as CSV"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span>Export</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8 Primary Security Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-Time Threat & Audit Metrics (Click to filter live console)
          </h2>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1"
            >
              Clear category filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metricCards.map((card) => {
            const isSelected = selectedCategory === card.key;
            return (
              <div
                key={card.key}
                onClick={() => {
                  setSelectedCategory(isSelected ? 'all' : card.key);
                  setCurrentPage(1);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-white relative overflow-hidden group shadow-sm hover:shadow-md ${
                  isSelected
                    ? `ring-2 ${card.ringColor} border-transparent bg-gradient-to-b from-white to-gray-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-lg ${card.bgColor} ${card.color}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${card.bgColor} ${card.color}`}>
                    {card.badge}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight font-mono transition-transform duration-300 group-hover:scale-105">
                      {card.count}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] text-primary-700 font-bold bg-primary-100 px-1.5 py-0.5 rounded">
                        Filtered
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-gray-800 mt-1 truncate">
                    {card.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Investigation & Action Console */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header & Filter Toolbar */}
        <div className="p-5 border-b border-gray-200 bg-gray-50/50 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-gray-700" />
                Live Incident Investigation & Action Console
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Investigate live security events, inspect payload headers, blacklist malicious IPs, and lock compromised accounts.
              </p>
            </div>

            {/* Category Quick Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full text-xs">
              <button
                onClick={() => { setSelectedCategory('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                All Events
              </button>
              {metricCards.map(c => (
                <button
                  key={c.key}
                  onClick={() => { setSelectedCategory(c.key); setCurrentPage(1); }}
                  className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                    selectedCategory === c.key
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span>{c.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === c.key ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {c.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search & Severity Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
            {/* Search Box */}
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Event ID, IP, PSN, Admin Name, Action, or Description..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Severity Filter */}
            <div>
              <select
                value={selectedSeverity}
                onChange={(e) => { setSelectedSeverity(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open / Unreviewed</option>
                <option value="investigating">Under Investigation</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-600 mb-2" />
            Connecting to real-time incident stream...
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-500">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-gray-700 text-sm">No security incidents found</p>
            <p className="text-gray-400 mt-1">No events match your current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100/70 text-gray-700 uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Event ID & Time</th>
                  <th className="py-3 px-4">Category & Severity</th>
                  <th className="py-3 px-4">Actor / Subject</th>
                  <th className="py-3 px-4">IP Address & Origin</th>
                  <th className="py-3 px-4">Incident Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Investigation & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {incidents.map((incident) => {
                  const isBlocked = blockedIps.includes(incident.ip_address);
                  const isNewlyArrived = recentLiveIds.has(incident.id);
                  return (
                    <tr
                      key={incident.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isNewlyArrived ? 'bg-primary-50/40 border-l-4 border-primary-500' : ''
                      }`}
                    >
                      {/* ID & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-gray-900 text-xs flex items-center gap-1.5">
                          <span>#{incident.id}</span>
                          {isNewlyArrived && (
                            <span className="text-[9px] bg-emerald-500 text-white font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{formatTimeAgo(incident.created_at)}</span>
                        </div>
                      </td>

                      {/* Category & Severity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            incident.severity === 'critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                            incident.severity === 'high' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            incident.severity === 'medium' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {incident.severity}
                          </span>
                          <span className="text-[10px] text-gray-600 font-mono">
                            {incident.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>

                      {/* Actor / Subject */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">
                          {incident.actor_name || 'Anonymous / Target'}
                        </div>
                        <div className="text-[10px] uppercase font-mono text-gray-500">
                          Role: {incident.actor_role}
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-gray-800">
                          <span>{incident.ip_address}</span>
                          <button
                            onClick={() => copyText(incident.ip_address, 'IP address')}
                            className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                            title="Copy IP address"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {isBlocked ? (
                          <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 bg-red-100 text-red-800 rounded">
                            BLOCKED IP
                          </span>
                        ) : (
                          <div className="text-[10px] text-gray-400 truncate max-w-[140px]" title={incident.user_agent}>
                            {incident.user_agent.split(' ')[0] || 'Web Client'}
                          </div>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-gray-800 text-xs font-normal line-clamp-2">
                          {incident.description}
                        </div>
                        {incident.resolution_notes && (
                          <div className="text-[10px] text-emerald-700 italic mt-0.5 truncate">
                            Note: {incident.resolution_notes}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          incident.status === 'open' ? 'bg-red-100 text-red-700' :
                          incident.status === 'investigating' ? 'bg-blue-100 text-blue-700' :
                          incident.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {incident.status === 'open' ? 'Pending Review' : incident.status}
                        </span>
                      </td>

                      {/* Quick Actions & Investigate */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setActiveIncident(incident);
                              setResolutionNotes(incident.resolution_notes || '');
                            }}
                            className="px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Investigate</span>
                          </button>

                          {/* Quick Remediation Actions */}
                          {incident.ip_address && incident.ip_address !== '127.0.0.1' && incident.ip_address !== 'localhost' && (
                            <button
                              onClick={() => {
                                if (isBlocked) {
                                  handleTakeAction('unblock_ip', { targetIp: incident.ip_address, incidentId: incident.id });
                                } else {
                                  if (window.confirm(`Block IP ${incident.ip_address} from accessing login?`)) {
                                    handleTakeAction('block_ip', { targetIp: incident.ip_address, incidentId: incident.id });
                                  }
                                }
                              }}
                              className={`p-1.5 rounded-lg border text-xs transition ${
                                isBlocked
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                              }`}
                              title={isBlocked ? 'Unblock IP' : 'Block IP'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {incident.status === 'open' && (
                            <button
                              onClick={() => handleTakeAction('resolve_incident', { incidentId: incident.id, notes: 'Quick resolved by Admin' })}
                              className="p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs transition"
                              title="Mark as Resolved"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
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

        {/* Pagination Toolbar */}
        <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-600 gap-3">
          <div>
            Showing incidents on page <span className="font-bold text-gray-900">{currentPage}</span> of{' '}
            <span className="font-bold text-gray-900">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 font-medium"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3.5 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* INVESTIGATION DETAIL MODAL */}
      {activeIncident && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-200 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`p-2 rounded-lg ${
                  activeIncident.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                  activeIncident.severity === 'high' ? 'bg-rose-500/20 text-rose-400' :
                  'bg-primary-500/20 text-primary-400'
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Security Investigation: #{activeIncident.id}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Logged {new Date(activeIncident.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveIncident(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Incident Header Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Category</span>
                  <span className="font-bold text-gray-900 capitalize font-mono">
                    {activeIncident.category.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Severity</span>
                  <span className={`font-bold uppercase ${
                    activeIncident.severity === 'critical' ? 'text-red-600' :
                    activeIncident.severity === 'high' ? 'text-rose-600' :
                    activeIncident.severity === 'medium' ? 'text-amber-600' : 'text-gray-700'
                  }`}>
                    {activeIncident.severity}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Status</span>
                  <span className="font-bold capitalize text-gray-900">
                    {activeIncident.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Action Type</span>
                  <span className="font-mono text-gray-800 font-semibold text-[11px] truncate block" title={activeIncident.action}>
                    {activeIncident.action}
                  </span>
                </div>
              </div>

              {/* Event Description */}
              <div>
                <h4 className="font-bold text-gray-900 mb-1 text-xs uppercase tracking-wider">
                  Incident Description
                </h4>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 leading-relaxed font-medium">
                  {activeIncident.description}
                </div>
              </div>

              {/* Subject & Origin Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
                  <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary-600" />
                    Actor & Subject Account
                  </h4>
                  <div className="text-gray-600 space-y-1">
                    <div><span className="text-gray-400">Name / PSN:</span> <strong className="text-gray-900">{activeIncident.actor_name}</strong></div>
                    <div><span className="text-gray-400">User Role:</span> <strong className="text-gray-900 uppercase font-mono">{activeIncident.actor_role}</strong></div>
                    <div><span className="text-gray-400">User ID:</span> <span className="font-mono text-gray-900">{activeIncident.actor_id || 'N/A'}</span></div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
                  <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-primary-600" />
                    Network & Device Origin
                  </h4>
                  <div className="text-gray-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">IP Address:</span>
                      <strong className="font-mono text-gray-900">{activeIncident.ip_address}</strong>
                      {blockedIps.includes(activeIncident.ip_address) && (
                        <span className="bg-red-100 text-red-800 text-[9px] font-bold px-1.5 py-0.2 rounded">BLOCKED</span>
                      )}
                    </div>
                    <div className="truncate" title={activeIncident.user_agent}>
                      <span className="text-gray-400">User Agent:</span> <span className="text-gray-700">{activeIncident.user_agent}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Metadata JSON */}
              {activeIncident.metadata && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-1 text-xs uppercase tracking-wider">
                    Event Technical Payload & Context
                  </h4>
                  <pre className="p-3.5 bg-gray-900 text-gray-100 font-mono text-[11px] rounded-xl overflow-x-auto max-h-48 border border-gray-800">
                    {JSON.stringify(activeIncident.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Investigation Notes & Action Panel */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                  Remediation & Administrative Actions
                </h4>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">
                    Investigation Findings & Resolution Notes
                  </label>
                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Document your investigation findings, root cause, or resolution steps..."
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Block/Unblock IP Button */}
                  {activeIncident.ip_address && activeIncident.ip_address !== '127.0.0.1' && activeIncident.ip_address !== 'localhost' && (
                    <button
                      onClick={() => {
                        const isBlocked = blockedIps.includes(activeIncident.ip_address);
                        handleTakeAction(isBlocked ? 'unblock_ip' : 'block_ip', {
                          targetIp: activeIncident.ip_address,
                          incidentId: activeIncident.id
                        });
                      }}
                      disabled={actionLoading}
                      className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition ${
                        blockedIps.includes(activeIncident.ip_address)
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                    >
                      <Ban className="w-4 h-4" />
                      <span>{blockedIps.includes(activeIncident.ip_address) ? 'Unblock Origin IP' : 'Blacklist Origin IP'}</span>
                    </button>
                  )}

                  {/* Lock/Suspend Account */}
                  <button
                    onClick={() => {
                      if (window.confirm('Suspend this user account immediately?')) {
                        handleTakeAction('lock_user', {
                          targetUserId: activeIncident.actor_id,
                          targetPsn: activeIncident.actor_name.replace('PSN: ', ''),
                          incidentId: activeIncident.id
                        });
                      }
                    }}
                    disabled={actionLoading}
                    className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-bold flex items-center gap-1.5 transition"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Suspend Account</span>
                  </button>

                  {/* Force Password Reset */}
                  <button
                    onClick={() => {
                      handleTakeAction('force_password_reset', {
                        targetUserId: activeIncident.actor_id,
                        targetPsn: activeIncident.actor_name.replace('PSN: ', ''),
                        incidentId: activeIncident.id
                      });
                    }}
                    disabled={actionLoading}
                    className="px-3 py-2 bg-blue-100 hover:bg-blue-900 text-blue-800 rounded-xl font-bold flex items-center gap-1.5 transition"
                  >
                    <Key className="w-4 h-4" />
                    <span>Force Password Reset</span>
                  </button>

                  {/* Mark Resolved */}
                  <button
                    onClick={() => {
                      handleTakeAction('resolve_incident', {
                        incidentId: activeIncident.id,
                        notes: resolutionNotes
                      });
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow ml-auto transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Resolve Incident</span>
                  </button>

                  {/* Dismiss */}
                  <button
                    onClick={() => {
                      handleTakeAction('dismiss_incident', {
                        incidentId: activeIncident.id,
                        notes: resolutionNotes || 'Dismissed as false positive'
                      });
                    }}
                    disabled={actionLoading}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition"
                  >
                    Dismiss Alert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY SETTINGS & BLOCKED IPS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-200 shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-gray-200 bg-gray-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary-400" />
                Security Parameters & IP Blacklist
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Large Transaction Threshold */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Large Transaction Flagging Threshold (₦)
                </label>
                <p className="text-gray-500 text-[11px] mb-2">
                  Loans, withdrawals, and lump-sum deposits equal to or exceeding this value will be flagged in Security Center.
                </p>
                <input
                  type="number"
                  value={largeTxThreshold}
                  onChange={(e) => setLargeTxThreshold(Number(e.target.value))}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* IP Blacklist Manager */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-gray-700 font-bold mb-1">
                  Blocked IP Addresses ({blockedIps.length})
                </label>
                <p className="text-gray-500 text-[11px] mb-2">
                  IP addresses listed here are prohibited from performing authentication against IMAN MCS.
                </p>

                {/* Add new IP */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Enter IP address (e.g. 197.210.55.12)..."
                    value={newIpToBlock}
                    onChange={(e) => setNewIpToBlock(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={handleAddBlockedIp}
                    className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition"
                  >
                    Add IP
                  </button>
                </div>

                {/* Blocked IP List */}
                <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100 bg-gray-50">
                  {blockedIps.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-xs">
                      No IP addresses currently blacklisted
                    </div>
                  ) : (
                    blockedIps.map(ip => (
                      <div key={ip} className="p-2.5 px-3 flex items-center justify-between font-mono text-xs">
                        <span className="text-red-700 font-semibold">{ip}</span>
                        <button
                          onClick={() => handleRemoveBlockedIp(ip)}
                          className="text-xs text-gray-400 hover:text-red-600 transition font-sans font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow transition disabled:opacity-50"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityCenterPage;
