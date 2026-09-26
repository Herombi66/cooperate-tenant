import React, { useState, useEffect } from 'react';
import { Bell, Search, Filter, Calendar } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const AuditorActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/dashboard/activity-logs?page=${page}&limit=25`);
      if (res.data.success) {
        setLogs(res.data.data?.logs || []);
        setTotalPages(res.data.data?.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error('Failed to load system activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-lime-700" /> Audit Trail & System Activity Logs
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Permanent audit trail of actions executed by Administrators, Chairmen, Treasurers, and Members.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">Loading activity trail...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">No activity logs recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-lime-50 text-lime-900 uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">#{log.id}</td>
                    <td className="py-3 px-4 text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">{log.user_name || `User #${log.user_id}`}</td>
                    <td className="py-3 px-4 uppercase text-gray-600 font-mono text-[10px]">{log.user_role}</td>
                    <td className="py-3 px-4 font-mono text-lime-800">{log.action}</td>
                    <td className="py-3 px-4 uppercase text-gray-500">{log.resource_type || '-'}</td>
                    <td className="py-3 px-4 text-gray-700">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t flex justify-between items-center text-xs text-gray-600">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border rounded disabled:opacity-40"
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
