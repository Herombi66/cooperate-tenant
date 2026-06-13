import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Users, User, Calendar, Check, X, Eye, BarChart3, Search, Pencil, RefreshCcw, Clock, TrendingUp, Wallet, PieChart, Settings as SettingsIcon } from 'lucide-react';
import { AdminGroupManagement } from '../components/Layyah/AdminGroupManagement';
import toast from 'react-hot-toast';
import { LayyahService } from '../services/layyahService';
import { LayyahAdminApplicantRow, LayyahApplicationStats } from '../types';
import { ToggleSwitch } from '../components/UI/ToggleSwitch';
import { useAuth } from '../contexts/AuthContext';

export const AdminLayyahManagement: React.FC = () => {
  const { user } = useAuth();
  const roleKey = (user?.role || '').toString().trim().toLowerCase();
  const canDisburse = ['super_admin', 'treasurer'].includes(roleKey);
  const canReverse = ['admin', 'super_admin', 'treasurer', 'chairman'].includes(roleKey);
  const [items, setItems] = useState<LayyahAdminApplicantRow[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, pages: 1 });
  const [stats, setStats] = useState<LayyahApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<LayyahAdminApplicantRow | null>(null);
  const [isManagingGroup, setIsManagingGroup] = useState(false);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [exportStatus, setExportStatus] = useState<string>('all');

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [kind, setKind] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');
  const [animalType, setAnimalType] = useState<string>('all');
  const [priceBracket, setPriceBracket] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'created_at' | 'animal_type' | 'price_range'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);

  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingError, setEditingError] = useState<string>('');
  const [confirmEdit, setConfirmEdit] = useState<{
    row: LayyahAdminApplicantRow;
    newAmount: number;
  } | null>(null);
  const [confirmDisburse, setConfirmDisburse] = useState<LayyahAdminApplicantRow | null>(null);
  const [confirmReversal, setConfirmReversal] = useState<{
    row: LayyahAdminApplicantRow;
    to_status: 'approved' | 'under_review' | 'pending';
  } | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');

  const [flashKeys, setFlashKeys] = useState<Set<number>>(new Set());
  const [editedKeys, setEditedKeys] = useState<Set<number>>(new Set());
  const [conflictBanner, setConflictBanner] = useState<string>('');
  const [revisionCounter, setRevisionCounter] = useState<number>(0);
  const [ariaMessage, setAriaMessage] = useState<string>('');
  const refreshTimerRef = React.useRef<number | null>(null);

  const [seasonalProgramEnabled, setSeasonalProgramEnabled] = useState<boolean>(true);
  const [updatingSeasonalProgram, setUpdatingSeasonalProgram] = useState<boolean>(false);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | 'pdf' | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadSeasonalProgramStatus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    loadApplicants();
  }, [debouncedQ, status, kind, dateFrom, dateTo, amountMin, amountMax, animalType, priceBracket, sortKey, sortOrder, page]);

  const rawLocale =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('iman.locale') || window.navigator?.language || 'en'
      : 'en';
  const isUrdu = rawLocale.toString().trim().toLowerCase().startsWith('ur');

  const labels = isUrdu
    ? {
        member: 'رکن',
        contact: 'رابطہ',
        animalType: 'جانور کی قسم',
        priceRange: 'قیمت کی حد',
        date: 'تاریخ',
        status: 'اسٹیٹس',
        actions: 'کارروائیاں',
        all: 'سب',
        sheep: 'بھیڑ',
        goat: 'بکری',
        cow: 'گائے',
        buffalo: 'بھینس',
        bracket_0_25: '۰ – ۲۵ ہزار NGN',
        bracket_25_50: '۲۵ – ۵۰ ہزار NGN',
        bracket_50_75: '۵۰ – ۷۵ ہزار NGN',
        bracket_75_100: '۷۵ – ۱۰۰ ہزار NGN',
        bracket_100_plus: '۱۰۰ ہزار+ NGN'
      }
    : {
        member: 'Member',
        contact: 'Contact',
        animalType: 'Animal Type',
        priceRange: 'Price Range',
        date: 'Date',
        status: 'Status',
        actions: 'Actions',
        all: 'All',
        sheep: 'Sheep',
        goat: 'Goat',
        cow: 'Cow',
        buffalo: 'Buffalo',
        bracket_0_25: '0 – 25k NGN',
        bracket_25_50: '25k – 50k NGN',
        bracket_50_75: '50k – 75k NGN',
        bracket_75_100: '75k – 100k NGN',
        bracket_100_plus: '100k+ NGN'
      };

  const sanitizeCellText = (value: any) => String(value ?? '').replace(/[<>]/g, '').trim();

  const formatRangeLocalized = (min?: number | null, max?: number | null, fallback?: string) => {
    const hasMin = min != null && Number.isFinite(Number(min));
    const hasMax = max != null && Number.isFinite(Number(max));
    if (!hasMin || !hasMax) return fallback || '—';
    const formatter = new Intl.NumberFormat(isUrdu ? 'ur-NG' : 'en-NG', { maximumFractionDigits: 0 });
    return `${formatter.format(Number(min))} – ${formatter.format(Number(max))} NGN`;
  };

  const getAnimalEmoji = (raw?: string | null) => {
    const key = (raw || '').toString().trim().toLowerCase();
    if (key === 'cow') return '🐄';
    if (key === 'buffalo') return '🐃';
    if (key === 'goat') return '🐐';
    if (key === 'sheep' || key === 'ram') return '🐑';
    return '🐾';
  };

  const getAnimalLabel = (row: LayyahAdminApplicantRow) => {
    const raw = (row.animal_type || row.animal_category || '').toString().trim().toLowerCase();
    if (raw === 'sheep' || raw === 'ram') return labels.sheep;
    if (raw === 'goat') return labels.goat;
    if (raw === 'cow') return labels.cow;
    if (raw === 'buffalo') return labels.buffalo;
    return sanitizeCellText(row.animal_type || row.animal_category || '—');
  };

  const toggleSort = (key: 'created_at' | 'animal_type' | 'price_range') => {
    setPage(1);
    if (sortKey !== key) {
      setSortKey(key);
      setSortOrder(key === 'created_at' ? 'desc' : 'asc');
      return;
    }
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, csrf] = await Promise.all([
        LayyahService.getApplicationStats(),
        LayyahService.getCsrfToken()
      ]);
      setStats(statsData);
      setCsrfToken(csrf);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load Layyah data');
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      const statsData = await LayyahService.getApplicationStats();
      setStats(statsData);
    } catch {}
  };

  const scheduleRealtimeRefresh = (mode: 'stats' | 'stats_and_list') => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      refreshStats();
      if (mode === 'stats_and_list') {
        loadApplicants();
      }
    }, 250);
  };

  const loadApplicants = async () => {
    try {
      setLoadingList(true);
      setEditedKeys(new Set());
      const res = await LayyahService.getAdminApplicants({
        page,
        limit: pagination.limit,
        q: debouncedQ || undefined,
        status: status !== 'all' ? status : undefined,
        kind: kind !== 'all' ? kind : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        amount_min: amountMin || undefined,
        amount_max: amountMax || undefined,
        animal_type: animalType !== 'all' ? animalType : undefined,
        price_bracket: priceBracket !== 'all' ? priceBracket : undefined,
        sort: sortKey,
        order: sortOrder
      });
      setItems(res.items || []);
      setPagination(res.pagination || { total: 0, page, limit: pagination.limit, pages: 1 });
      setAriaMessage(`Showing ${res.items?.length || 0} results.`);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to load Layyah applicants';
      const retry = () => loadApplicants();
      toast.custom((t) => (
        <div className="bg-white shadow-lg border border-gray-200 rounded-lg p-4 max-w-md">
          <div className="text-sm text-gray-900">{message}</div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                retry();
              }}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Retry
            </button>
          </div>
        </div>
      ));
      await LayyahService.logAdminClientError({
        error: { message, stack: error?.stack || null },
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoadingList(false);
    }
  };

  const loadSeasonalProgramStatus = async () => {
    try {
      const response = await LayyahService.getSeasonalProgramStatus();
      setSeasonalProgramEnabled(response.enabled);
    } catch (error) {
      console.error('Error loading seasonal program status:', error);
      toast.error('Failed to load seasonal program status');
    }
  };

  const updateSeasonalProgramStatus = async (enabled: boolean) => {
    try {
      setUpdatingSeasonalProgram(true);
      await LayyahService.updateSeasonalProgramStatus(enabled);
      setSeasonalProgramEnabled(enabled);
      toast.success(`Seasonal program ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error updating seasonal program status:', error);
      toast.error('Failed to update seasonal program status');
    } finally {
      setUpdatingSeasonalProgram(false);
    }
  };

  const downloadExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      setExporting(format);
      const result = await LayyahService.exportApplications(format, {
        q: debouncedQ || undefined,
        status: exportStatus !== 'all' ? exportStatus : 'all',
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        amount_min: amountMin || undefined,
        amount_max: amountMax || undefined,
        animal_type: animalType !== 'all' ? animalType : undefined,
        price_bracket: priceBracket !== 'all' ? priceBracket : undefined
      });

      const blob = new Blob([result.blob], { type: result.contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || `layyah_applications.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to download export';
      toast.error(message);
    } finally {
      setExporting(null);
    }
  };

  const handleApproval = async (applicationId: number, status: 'approved' | 'rejected' | 'under_review', reason?: string) => {
    try {
      await LayyahService.approveApplication(applicationId, {
        status,
        rejection_reason: reason,
        notes: adminNotes || (
          status === 'approved'
            ? 'Application approved by admin'
            : status === 'under_review'
              ? 'Application marked under review by admin'
              : undefined
        )
      });
      toast.success(`Application ${status} successfully`);
      setAdminNotes('');
      loadApplicants();
      refreshStats();
      setSelectedApplication(null);
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application');
    }
  };

  const confirmDisbursement = async () => {
    if (!confirmDisburse) return;
    try {
      await LayyahService.approveApplication(confirmDisburse.application_id, {
        status: 'disbursed',
        notes: adminNotes || 'Application disbursed'
      } as any);
      toast.success('Application disbursed successfully');
      setAdminNotes('');
      setConfirmDisburse(null);
      setSelectedApplication(null);
      loadApplicants();
      refreshStats();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to disburse application';
      toast.error(message);
    }
  };

  const confirmReversalAction = async () => {
    if (!confirmReversal) return;
    const reason = reversalReason.trim();
    if (!reason) {
      toast.error('Please provide a reversal reason.');
      return;
    }

    try {
      await LayyahService.reverseApplicationStatus(confirmReversal.row.application_id, {
        to_status: confirmReversal.to_status,
        reason
      });

      toast.success('Status reversal completed');
      setReversalReason('');
      setConfirmReversal(null);
      setSelectedApplication(null);
      loadApplicants();
      refreshStats();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to reverse status';
      toast.error(message);
    }
  };

  useEffect(() => {
    const userRaw = localStorage.getItem('token');
    if (!userRaw) return;

    const stream = LayyahService.openAdminStream(userRaw);
    stream.addEventListener('amount_updated', (evt: any) => {
      try {
        const data = JSON.parse(evt.data || '{}') as {
          member_id?: number;
          application_id?: number;
          applied_amount?: number;
          amount_version?: number;
        };

        if (!data?.application_id) return;
        setRevisionCounter((c) => c + 1);
        scheduleRealtimeRefresh('stats');

        setItems((prev) => {
          const idx = prev.findIndex((r) => r.application_id === data.application_id);
          if (idx === -1) return prev;
          const next = prev.slice();
          const current = next[idx];

          if (editingKey === current.application_id) {
            setConflictBanner('This amount was just updated by another admin; please review.');
          }

          next[idx] = {
            ...current,
            applied_amount: data.applied_amount != null ? Number(data.applied_amount) : current.applied_amount,
            amount_version: data.amount_version != null ? Number(data.amount_version) : current.amount_version
          };
          return next;
        });

        setSelectedApplication((prev) => {
          if (!prev || prev.application_id !== data.application_id) return prev;
          return {
            ...prev,
            applied_amount: data.applied_amount != null ? Number(data.applied_amount) : prev.applied_amount,
            amount_version: data.amount_version != null ? Number(data.amount_version) : prev.amount_version
          };
        });
      } catch {}
    });

    stream.addEventListener('status_updated', (evt: any) => {
      try {
        const data = JSON.parse(evt.data || '{}') as {
          application_id?: number;
          previous_status?: string;
          status?: string;
        };
        if (!data?.application_id || !data?.status) return;
        setRevisionCounter((c) => c + 1);
        scheduleRealtimeRefresh('stats_and_list');

        setSelectedApplication((prev) => {
          if (!prev || prev.application_id !== data.application_id) return prev;
          return { ...prev, status: data.status as any };
        });
      } catch {}
    });

    stream.onerror = () => {
      try {
        stream.close();
      } catch {}
    };

    return () => {
      try {
        stream.close();
      } catch {}
    };
  }, [editingKey]);

  const parseAmountCandidate = (value: string): { ok: boolean; amount?: number; error?: string } => {
    const raw = value.trim();
    if (!raw) return { ok: false, error: 'Amount is required' };
    if (!/^\d+(\.\d{0,2})?$/.test(raw)) return { ok: false, error: 'Use a positive number with up to 2 decimals' };
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return { ok: false, error: 'Amount must be greater than 0' };
    const rounded = Math.round(num * 100) / 100;
    return { ok: true, amount: rounded };
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, row: LayyahAdminApplicantRow) => {
    const allowedNavigationKeys = new Set([
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Tab',
      'Home',
      'End'
    ]);

    if (allowedNavigationKeys.has(e.key)) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      requestSave(row);
      return;
    }

    const isDigit = /^[0-9]$/.test(e.key);
    if (isDigit) return;

    if (e.key === '.') {
      if (editingValue.includes('.')) {
        e.preventDefault();
        setEditingError('Only one decimal point is allowed');
      }
      return;
    }

    e.preventDefault();
    setEditingError('Only numbers are allowed');
  };

  const startEdit = (row: LayyahAdminApplicantRow) => {
    setConflictBanner('');
    setEditingKey(row.application_id);
    setEditingValue(String(row.applied_amount));
    setEditingError('');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditingValue('');
    setEditingError('');
    setConfirmEdit(null);
  };

  const requestSave = (row: LayyahAdminApplicantRow) => {
    const parsed = parseAmountCandidate(editingValue);
    if (!parsed.ok) {
      setEditingError(parsed.error || 'Invalid amount');
      return;
    }
    setEditingError('');
    setConfirmEdit({ row, newAmount: parsed.amount! });
  };

  const confirmSave = async () => {
    const current = confirmEdit;
    if (!current) return;
    const { row, newAmount } = current;
    try {
      setAriaMessage('Saving amount update...');
      const updated = await LayyahService.updateAppliedAmount({
        memberId: row.member_id,
        applicationId: row.application_id,
        appliedAmount: newAmount,
        amountVersion: row.amount_version,
        csrfToken
      });

      setItems((prev) =>
        prev.map((r) =>
          r.application_id === row.application_id
            ? {
                ...r,
                applied_amount: updated.applied_amount,
                amount_version: updated.amount_version
              }
            : r
        )
      );
      setSelectedApplication((prev) => {
        if (!prev || prev.application_id !== row.application_id) return prev;
        return { ...prev, applied_amount: updated.applied_amount, amount_version: updated.amount_version };
      });
      refreshStats();

      setEditedKeys((prev) => new Set(prev).add(row.application_id));
      setFlashKeys((prev) => new Set(prev).add(row.application_id));
      setTimeout(() => {
        setFlashKeys((prev) => {
          const next = new Set(prev);
          next.delete(row.application_id);
          return next;
        });
      }, 3000);

      setAriaMessage('Amount updated successfully.');
      toast.success('Layyah amount updated');
      cancelEdit();
    } catch (error: any) {
      const statusCode = error?.response?.status;
      if (statusCode === 412) {
        setConflictBanner('This amount was just updated by another admin; please review.');
      }
      const message = error?.response?.data?.message || 'Failed to update amount';
      toast.error(message);
      await LayyahService.logAdminClientError({
        member_id: row.member_id,
        application_id: row.application_id,
        old_amount: row.applied_amount,
        new_amount: newAmount,
        admin_id: null,
        timestamp: new Date().toISOString(),
        error: { message, stack: error?.stack || null }
      });
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

  const dir = typeof document !== 'undefined' ? document.documentElement.getAttribute('dir') || 'ltr' : 'ltr';

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
      dir={dir as any}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Heart className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Layyah Management</h1>
            <p className="text-gray-600">Manage all Layyah commodity trading applications</p>
          </div>
        </div>

        {/* Seasonal Program Toggle */}
        <div className="flex items-center space-x-4">
          <ToggleSwitch
            enabled={seasonalProgramEnabled}
            onChange={updateSeasonalProgramStatus}
            label="Seasonal Program"
            description="Enable/disable seasonal trading program"
            disabled={updatingSeasonalProgram}
          />
          {updatingSeasonalProgram && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
              <span className="text-sm text-gray-500">Updating...</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats Cards & Financial Projections */}
      {stats && (
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-600">Total</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total_applications}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-600">Pending</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending_applications}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Approved</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">{stats.approved_applications}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-600">Groups</span>
              </div>
              <div className="text-2xl font-bold text-primary-600 mt-1">{stats.group_applications}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600">Individual</span>
              </div>
              <div className="text-2xl font-bold text-purple-600 mt-1">{stats.individual_applications}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-600">Animals</span>
              </div>
              <div className="text-2xl font-bold text-red-600 mt-1">{stats.total_commodities || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Active Grp</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">{stats.active_groups || 0}</div>
            </div>
          </div>

          {stats.financials && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-md p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider opacity-80">Projected Total</span>
                </div>
                <div className="text-3xl font-bold">₦{stats.financials.projected_total.toLocaleString()}</div>
                <div className="mt-4 flex items-center gap-2 text-sm opacity-90">
                  <PieChart className="h-4 w-4" />
                  <span>Total expenditure if all approved</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Status Breakdown</h3>
                  <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Approved</span>
                      <span className="font-semibold text-gray-900">₦{stats.financials.approved_total.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{ width: `${(stats.financials.approved_total / stats.financials.projected_total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Pending</span>
                      <span className="font-semibold text-gray-900">₦{stats.financials.pending_total.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-yellow-500 h-1.5 rounded-full"
                        style={{ width: `${(stats.financials.pending_total / stats.financials.projected_total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Type Breakdown</h3>
                  <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Individual</span>
                      <span className="font-semibold text-gray-900">₦{stats.financials.individual_total.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full"
                        style={{ width: `${(stats.financials.individual_total / stats.financials.projected_total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Group</span>
                      <span className="font-semibold text-gray-900">₦{stats.financials.group_total.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full"
                        style={{ width: `${(stats.financials.group_total / stats.financials.projected_total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>

      {conflictBanner && (
        <motion.div variants={itemVariants} className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3">
          {conflictBanner}
        </motion.div>
      )}

      <motion.div
        variants={itemVariants}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-3 z-20"
        style={{ WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)' }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
                placeholder="Search by name, email, or phone"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">{labels.all}</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={kind}
                onChange={(e) => {
                  setPage(1);
                  setKind(e.target.value);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                aria-label="Filter by application kind"
              >
                <option value="all">All Types</option>
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </select>

              <select
                value={animalType}
                onChange={(e) => {
                  setPage(1);
                  setAnimalType(e.target.value);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                aria-label="Filter by animal type"
              >
                <option value="all">{labels.all}</option>
                <option value="sheep">{labels.sheep}</option>
                <option value="goat">{labels.goat}</option>
                <option value="cow">{labels.cow}</option>
                <option value="buffalo">{labels.buffalo}</option>
              </select>

              <select
                value={priceBracket}
                onChange={(e) => {
                  setPage(1);
                  setPriceBracket(e.target.value);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                aria-label="Filter by price range"
              >
                <option value="all">{labels.all}</option>
                <option value="0_25">{labels.bracket_0_25}</option>
                <option value="25_50">{labels.bracket_25_50}</option>
                <option value="50_75">{labels.bracket_50_75}</option>
                <option value="75_100">{labels.bracket_75_100}</option>
                <option value="100_plus">{labels.bracket_100_plus}</option>
              </select>

              <button
                onClick={() => loadApplicants()}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                aria-label="Refresh list"
              >
                <RefreshCcw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={exportStatus}
              onChange={(e) => setExportStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              aria-label="Export status filter"
            >
              <option value="all">Export: All statuses</option>
              <option value="approved">Export: Approved</option>
              <option value="rejected">Export: Rejected</option>
              <option value="under_review">Export: Under Review</option>
            </select>
            <button
              type="button"
              onClick={() => downloadExport('csv')}
              disabled={exporting !== null}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              {exporting === 'csv' ? 'Exporting…' : 'Download CSV'}
            </button>
            <button
              type="button"
              onClick={() => downloadExport('xlsx')}
              disabled={exporting !== null}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              {exporting === 'xlsx' ? 'Exporting…' : 'Download Excel'}
            </button>
            <button
              type="button"
              onClick={() => downloadExport('pdf')}
              disabled={exporting !== null}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              {exporting === 'pdf' ? 'Exporting…' : 'Download PDF'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Application Date (from)</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setPage(1);
                  setDateFrom(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Application Date (to)</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setPage(1);
                  setDateTo(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount min</label>
              <input
                inputMode="decimal"
                value={amountMin}
                onChange={(e) => {
                  setPage(1);
                  setAmountMin(e.target.value.replace(/[^\d.]/g, ''));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount max</label>
              <input
                inputMode="decimal"
                value={amountMax}
                onChange={(e) => {
                  setPage(1);
                  setAmountMax(e.target.value.replace(/[^\d.]/g, ''));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <div className="md:hidden">
            {loadingList
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="p-4 border-b border-gray-200 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="mt-2 h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="mt-3 h-10 bg-gray-200 rounded"></div>
                  </div>
                ))
              : items.map((row) => {
                  const isEditing = editingKey === row.application_id;
                  const isFlashing = flashKeys.has(row.application_id);
                  const isEdited = editedKeys.has(row.application_id);
                  return (
                    <div
                      key={row.application_id}
                      className={`p-4 border-b border-gray-200 transition-colors duration-1000 ${isFlashing ? 'bg-green-50' : 'bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{row.name}</div>
                          <div className="text-xs text-gray-500">
                            {row.psn || 'N/A'} • ID {row.member_id}
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            {(row.email || '—') + (row.phone ? ` • ${row.phone}` : '')}
                          </div>
                          <div className="mt-2">
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${row.kind === 'group' ? 'bg-primary-100 text-primary-800' : 'bg-purple-100 text-purple-800'}`}>
                              {row.kind === 'group' ? 'Group' : 'Individual'}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${LayyahService.getStatusColor(row.status)}`}>
                          {LayyahService.getStatusLabel(row.status)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs text-gray-500">{labels.animalType}</div>
                        <div className="mt-1 text-sm text-gray-900">
                          <span className="mr-2" aria-hidden="true">
                            {getAnimalEmoji(row.animal_type || row.animal_category)}
                          </span>
                          {getAnimalLabel(row)}
                        </div>

                        <div className="mt-3 text-xs text-gray-500">{labels.priceRange}</div>
                        <div className="mt-1 font-semibold text-gray-900">
                          {formatRangeLocalized(row.price_min, row.price_max, sanitizeCellText(row.price_range))}
                        </div>

                        <div className="mt-3 text-xs text-gray-500">Applied Amount</div>
                        {!isEditing ? (
                          <div className="mt-1 flex items-center justify-between">
                            <div className="font-semibold text-gray-900">
                              ₦{Number(row.applied_amount).toLocaleString()}
                              {isEdited && <span className="ml-2 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">edited</span>}
                            </div>
                            <button
                              onClick={() => startEdit(row)}
                              className="p-2 text-gray-600 hover:text-gray-900"
                              aria-label="Edit amount"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <input
                              value={editingValue}
                              inputMode="decimal"
                              onChange={(e) => {
                                setEditingValue(e.target.value.replace(/[^\d.]/g, ''));
                                setEditingError('');
                              }}
                              onKeyDown={(e) => handleAmountKeyDown(e, row)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            {editingError && <div className="mt-1 text-xs text-red-600">{editingError}</div>}
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => requestSave(row)}
                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => cancelEdit()}
                                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <details className="mt-3">
                        <summary className="text-sm text-green-700 cursor-pointer">Details</summary>
                        <div className="mt-2 text-sm text-gray-700">
                          <div>Type: {row.kind}</div>
                          <div>Animal: {row.animal_category}</div>
                          <div>Quantity: {row.quantity}</div>
                          <div>Date: {new Date(row.application_date).toLocaleString()}</div>
                        </div>
                      </details>

                      <div className="mt-3 flex items-center gap-2">
                        {row.status === 'pending' && (
                          <button
                            onClick={() => handleApproval(row.application_id, 'under_review')}
                            className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                          >
                            Under Review
                          </button>
                        )}
                        {(row.status === 'pending' || row.status === 'under_review') && (
                          <>
                            <button
                              onClick={() => handleApproval(row.application_id, 'approved')}
                              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproval(row.application_id, 'rejected', 'Rejected by admin')}
                              className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {row.status === 'approved' && row.kind === 'individual' && canDisburse && (
                          <button
                            onClick={() => setConfirmDisburse(row)}
                            className="px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                          >
                            Disburse
                          </button>
                        )}
                        {canReverse && (row.status === 'approved' || row.status === 'disbursed') && (
                          <button
                            onClick={() => {
                              setReversalReason('');
                              setConfirmReversal({
                                row,
                                to_status: row.status === 'disbursed' ? 'approved' : 'pending'
                              });
                            }}
                            className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 inline-flex items-center gap-2"
                          >
                            <RefreshCcw className="h-4 w-4" />
                            Reverse
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{labels.member}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{labels.contact}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button type="button" onClick={() => toggleSort('animal_type')} className="inline-flex items-center gap-1">
                      {labels.animalType}
                      {sortKey === 'animal_type' ? <span aria-hidden="true">{sortOrder === 'asc' ? '↑' : '↓'}</span> : null}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button type="button" onClick={() => toggleSort('price_range')} className="inline-flex items-center gap-1">
                      {labels.priceRange}
                      {sortKey === 'price_range' ? <span aria-hidden="true">{sortOrder === 'asc' ? '↑' : '↓'}</span> : null}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{labels.date}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{labels.status}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{labels.actions}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingList
                  ? Array.from({ length: 10 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-48"></div>
                          <div className="mt-2 h-3 bg-gray-200 rounded w-32"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-56"></div>
                          <div className="mt-2 h-3 bg-gray-200 rounded w-40"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-8 bg-gray-200 rounded w-36"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 bg-gray-200 rounded w-28"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-8 bg-gray-200 rounded w-32"></div>
                        </td>
                      </tr>
                    ))
                  : items.map((row) => {
                      const isEditing = editingKey === row.application_id;
                      const isFlashing = flashKeys.has(row.application_id);
                      const isEdited = editedKeys.has(row.application_id);

                      return (
                        <tr key={row.application_id} className={`transition-colors duration-1000 ${isFlashing ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{row.name}</div>
                            <div className="text-sm text-gray-500">
                              {row.psn || 'N/A'} • ID {row.member_id}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.kind === 'group' ? 'bg-primary-100 text-primary-800' : 'bg-purple-100 text-purple-800'}`}>
                              {row.kind === 'group' ? 'Group' : 'Individual'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <div>{row.email || '—'}</div>
                            <div className="text-gray-500">{row.phone || '—'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              <span className="mr-2" aria-hidden="true">
                                {getAnimalEmoji(row.animal_type || row.animal_category)}
                              </span>
                              {getAnimalLabel(row)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">
                              {formatRangeLocalized(row.price_min, row.price_max, sanitizeCellText(row.price_range))}
                            </div>
                            {!isEditing ? (
                              <div className="mt-1 flex items-center gap-2">
                                <div className="text-xs text-gray-600">{sanitizeCellText(Number(row.applied_amount).toLocaleString())}</div>
                                {isEdited && <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">edited</span>}
                                <button
                                  onClick={() => startEdit(row)}
                                  className="p-2 text-gray-600 hover:text-gray-900"
                                  aria-label="Edit amount"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="mt-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    value={editingValue}
                                    inputMode="decimal"
                                    onChange={(e) => {
                                      setEditingValue(e.target.value.replace(/[^\d.]/g, ''));
                                      setEditingError('');
                                    }}
                                    onKeyDown={(e) => handleAmountKeyDown(e, row)}
                                    className="w-40 px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                  <button
                                    onClick={() => requestSave(row)}
                                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => cancelEdit()}
                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                {editingError && <div className="mt-1 text-xs text-red-600">{editingError}</div>}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(row.application_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${LayyahService.getStatusColor(row.status)}`}>
                              {LayyahService.getStatusLabel(row.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedApplication(row);
                                  setAdminNotes(row.notes || '');
                                }}
                                className="text-primary-600 hover:text-primary-900 transition-colors"
                                aria-label="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {row.status === 'pending' && (
                                <button
                                  onClick={() => handleApproval(row.application_id, 'under_review')}
                                  className="text-primary-600 hover:text-primary-900 transition-colors"
                                  aria-label="Mark under review"
                                >
                                  <Clock className="h-4 w-4" />
                                </button>
                              )}
                              {(row.status === 'pending' || row.status === 'under_review') && (
                                <>
                                  <button
                                    onClick={() => handleApproval(row.application_id, 'approved')}
                                    className="text-green-600 hover:text-green-900 transition-colors"
                                    aria-label="Approve"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleApproval(row.application_id, 'rejected', 'Rejected by admin')}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                    aria-label="Reject"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {row.status === 'approved' && row.kind === 'individual' && canDisburse && (
                                <button
                                  onClick={() => setConfirmDisburse(row)}
                                  className="text-amber-600 hover:text-amber-900 transition-colors"
                                  aria-label="Disburse"
                                >
                                  <Wallet className="h-4 w-4" />
                                </button>
                              )}
                              {canReverse && (row.status === 'approved' || row.status === 'disbursed') && (
                                <button
                                  onClick={() => {
                                    setReversalReason('');
                                    setConfirmReversal({
                                      row,
                                      to_status: row.status === 'disbursed' ? 'approved' : 'pending'
                                    });
                                  }}
                                  className="text-gray-900 hover:text-gray-700 transition-colors"
                                  aria-label="Reverse status"
                                >
                                  <RefreshCcw className="h-4 w-4" />
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
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages} • {pagination.total} total
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-200"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-200"
            >
              Next
            </button>
          </div>
        </div>
      </motion.div>

      {confirmEdit && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm amount update"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setConfirmEdit(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">Confirm update</h2>
              <p className="text-sm text-gray-600 mt-1">Are you sure you want to update this layyah amount?</p>

              <div className="mt-4 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Old amount</span>
                    <span className="font-medium">₦{Number(confirmEdit.row.applied_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-500">New amount</span>
                    <span className="font-medium text-green-700">₦{Number(confirmEdit.newAmount).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmEdit(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmSave()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDisburse && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm disbursement"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setConfirmDisburse(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">Confirm disbursement</h2>
              <p className="text-sm text-gray-600 mt-1">This will create a loan and move the application to disbursed.</p>

              <div className="mt-4 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Application ID</span>
                    <span className="font-medium">{confirmDisburse.application_id}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-500">Member</span>
                    <span className="font-medium">{confirmDisburse.name}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-medium">₦{Number(confirmDisburse.applied_amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDisburse(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDisbursement()}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Disburse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmReversal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm status reversal"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setConfirmReversal(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">Confirm status reversal</h2>
              <p className="text-sm text-gray-600 mt-1">This will change the application status and record an audit log.</p>

              <div className="mt-4 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Application ID</span>
                    <span className="font-medium">{confirmReversal.row.application_id}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-500">Current status</span>
                    <span className="font-medium">{LayyahService.getStatusLabel(confirmReversal.row.status)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Revert to</label>
                  <select
                    value={confirmReversal.to_status}
                    onChange={(e) => {
                      const value = e.target.value as 'approved' | 'under_review' | 'pending';
                      setConfirmReversal((prev) => (prev ? { ...prev, to_status: value } : prev));
                    }}
                    disabled={confirmReversal.row.status === 'disbursed'}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {confirmReversal.row.status === 'disbursed' ? (
                      <option value="approved">Approved</option>
                    ) : (
                      <>
                        <option value="pending">Pending</option>
                        <option value="under_review">Under Review</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Reason</label>
                  <textarea
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Provide a clear reason for the reversal"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmReversal(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmReversalAction()}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  Reverse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-hidden ${isManagingGroup ? 'max-w-4xl' : 'max-w-2xl'}`}>
            {isManagingGroup && selectedApplication.kind === 'group' ? (
              <AdminGroupManagement 
                group={selectedApplication} 
                onClose={() => {
                  setIsManagingGroup(false);
                  setSelectedApplication(null);
                }}
                onUpdate={() => {
                  loadApplicants();
                }}
              />
            ) : (
              <div className="p-6 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Application Details</h2>
                  <div className="flex items-center gap-2">
                    {selectedApplication.kind === 'group' && (
                      <button
                        onClick={() => setIsManagingGroup(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                      >
                        <SettingsIcon className="h-4 w-4" />
                        Manage Group
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedApplication(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Member</label>
                      <div className="mt-1">{selectedApplication.name}</div>
                      <div className="text-sm text-gray-500 mt-1">ID {selectedApplication.member_id}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">PSN</label>
                      <div className="mt-1">{selectedApplication.psn || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <div className="mt-1 capitalize font-medium text-primary-600">{selectedApplication.kind}</div>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact</label>
                      <div className="mt-1 text-sm text-gray-700">{selectedApplication.email || '—'}</div>
                      <div className="mt-1 text-sm text-gray-500">{selectedApplication.phone || '—'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Application</label>
                      <div className="mt-1 text-sm text-gray-700">ID {selectedApplication.application_id}</div>
                      <div className="mt-1 text-sm text-gray-500">{new Date(selectedApplication.application_date).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Animal</label>
                      <div className="mt-1 capitalize">{selectedApplication.animal_category}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <div className="mt-1">{selectedApplication.quantity}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Applied Amount</label>
                    <div className="mt-1 font-medium text-green-700">₦{Number(selectedApplication.applied_amount).toLocaleString()}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Internal Notes</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about this application..."
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  {(selectedApplication.status === 'pending' || selectedApplication.status === 'under_review') && (
                    <div className="flex space-x-3">
                      {selectedApplication.status === 'pending' && (
                        <button
                          onClick={() => handleApproval(selectedApplication.application_id, 'under_review')}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          Under Review
                        </button>
                      )}
                      <button
                        onClick={() => handleApproval(selectedApplication.application_id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(selectedApplication.application_id, 'rejected', 'Rejected by admin')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {selectedApplication.status === 'approved' && selectedApplication.kind === 'individual' && canDisburse && (
                    <button
                      onClick={() => setConfirmDisburse(selectedApplication)}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Disburse
                    </button>
                  )}
                  {canReverse && (selectedApplication.status === 'approved' || selectedApplication.status === 'disbursed') && (
                    <button
                      onClick={() => {
                        setReversalReason('');
                        setConfirmReversal({
                          row: selectedApplication,
                          to_status: selectedApplication.status === 'disbursed' ? 'approved' : 'pending'
                        });
                      }}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Reverse
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors ml-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
