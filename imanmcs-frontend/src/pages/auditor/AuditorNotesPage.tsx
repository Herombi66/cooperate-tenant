import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Filter, CheckCircle, Clock, Search } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const AuditorNotesPage: React.FC = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');

  // Create Note Form State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [entityType, setEntityType] = useState<string>('general');
  const [entityId, setEntityId] = useState<string>('');
  const [noteText, setNoteText] = useState<string>('');
  const [noteStatus, setNoteStatus] = useState<string>('open');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (entityTypeFilter) params.append('entity_type', entityTypeFilter);

      const res = await api.get(`/audit/notes?${params.toString()}`);
      if (res.data.success) {
        setNotes(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load audit notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [statusFilter, entityTypeFilter]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.post('/audit/notes', {
        entity_type: entityType,
        entity_id: entityId,
        note: noteText,
        status: noteStatus
      });

      if (res.data.success) {
        toast.success('Audit note recorded');
        setShowCreateModal(false);
        setNoteText('');
        setEntityId('');
        fetchNotes();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create audit note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (noteId: number, newStatus: string) => {
    try {
      const res = await api.put(`/audit/notes/${noteId}`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Note updated to ${newStatus}`);
        fetchNotes();
      }
    } catch (err) {
      toast.error('Failed to update note status');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-amber-600" /> Audit Findings & Notes Register
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Maintain independent audit observations, queries, and investigation notes on transactions, members, loans, and reports.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 text-xs font-bold rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> New Audit Note
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 font-medium"
        >
          <option value="">All Note Statuses</option>
          <option value="open">Open</option>
          <option value="under_review">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 font-medium"
        >
          <option value="">All Categories</option>
          <option value="transaction">Transaction</option>
          <option value="member">Member</option>
          <option value="loan">Loan</option>
          <option value="report">Report</option>
          <option value="general">General</option>
        </select>
      </div>

      {/* Notes List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">Loading audit notes...</div>
        ) : notes.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">No audit notes recorded yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notes.map((n) => (
              <div key={n.id} className="p-5 hover:bg-gray-50/50 transition flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-900">NOTE #{n.id}</span>
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-gray-100 text-gray-700">
                      {n.entity_type} {n.entity_id ? `(${n.entity_id})` : ''}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      n.status === 'resolved' ? 'bg-lime-100 text-lime-800' :
                      n.status === 'under_review' ? 'bg-amber-100 text-amber-800' :
                      n.status === 'closed' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {n.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-800 leading-relaxed font-medium">{n.note}</p>

                  <div className="text-xs text-gray-400 flex items-center gap-3 pt-1">
                    <span>Auditor: <strong className="text-gray-600">{n.auditor_name}</strong></span>
                    <span>•</span>
                    <span>Date: {new Date(n.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Status Toggle Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Status:</span>
                  <select
                    value={n.status}
                    onChange={(e) => handleStatusChange(n.id, e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white font-semibold"
                  >
                    <option value="open">Open</option>
                    <option value="under_review">Under Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-amber-300">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" /> New Audit Observation Note
            </h3>

            <form onSubmit={handleCreateNote} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Target Category</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full text-xs border rounded p-2"
                >
                  <option value="general">General Cooperative Observation</option>
                  <option value="transaction">Transaction</option>
                  <option value="member">Member Account</option>
                  <option value="loan">Loan Facility</option>
                  <option value="report">Audit Report</option>
                  <option value="reconciliation">Reconciliation Item</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Reference ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TX-CTB-10, MEM_001, LN-5"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  className="w-full text-xs border rounded p-2 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Initial Status</label>
                <select
                  value={noteStatus}
                  onChange={(e) => setNoteStatus(e.target.value)}
                  className="w-full text-xs border rounded p-2"
                >
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Observation / Note Content</label>
                <textarea
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Document formal audit findings, questions, or verification results..."
                  className="w-full text-xs border rounded p-2 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-gray-900 rounded disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Audit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
