import React, { useState, useEffect } from 'react';
import { History, Shield, RefreshCw, ChevronLeft, ChevronRight, User, Calendar, Globe } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface AuditLogItem {
  id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: number;
  description: string;
  metadata: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export const RbacAuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (p: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/rbac/audit-logs?page=${p}&limit=15`);
      if (res.data?.success) {
        setLogs(res.data.logs || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      }
    } catch (err: any) {
      toast.error('Failed to load RBAC audit trail');
    } finally {
      setLoading(false);
    }
  };

  const formatDiff = (metadata: any) => {
    if (!metadata) return null;
    if (metadata.changes && Array.isArray(metadata.changes)) {
      return (
        <div className="mt-2 space-y-1.5 text-[11px] bg-gray-50 p-2.5 rounded-lg border border-gray-200">
          <div className="font-semibold text-gray-700">Detailed Permission Diffs:</div>
          {metadata.changes.map((c: any, idx: number) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-gray-900">{c.module}:</span>
              <span className="text-red-600 line-through">
                [{c.previous?.r ? 'R' : '-'}/{c.previous?.w ? 'W' : '-'}/{c.previous?.e ? 'E' : '-'}/{c.previous?.d ? 'D' : '-'}]
              </span>
              <span>→</span>
              <span className="text-emerald-700 font-bold">
                [{c.updated?.r ? 'R' : '-'}/{c.updated?.w ? 'W' : '-'}/{c.updated?.e ? 'E' : '-'}/{c.updated?.d ? 'D' : '-'}]
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center">
            <History className="w-5 h-5 text-primary-600 mr-2" />
            RBAC Permission Audit Trail
          </h2>
          <p className="text-xs text-gray-500">
            Immutable log of all role permission modifications, executive role assignments, and custom modules.
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-600" />
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            No permission changes recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 text-xs">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50/70 transition">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 flex items-center">
                      <User className="w-3.5 h-3.5 text-primary-600 mr-1" />
                      {log.user_name || 'System Admin'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">
                      {log.user_role || 'ADMIN'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      {log.action}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    {log.ip_address && (
                      <span className="flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        {log.ip_address}
                      </span>
                    )}
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-gray-700 font-medium">{log.description}</p>
                {formatDiff(log.metadata)}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Showing page {page} of {totalPages} ({totalCount} total entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded border border-gray-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded border border-gray-300 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
