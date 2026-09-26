import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, Shield, Eye, MessageSquare, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const AuditorExceptionsPage: React.FC = () => {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedException, setSelectedException] = useState<any | null>(null);

  // Note modal
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');
  const [noteStatus, setNoteStatus] = useState<string>('under_review');
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit/exceptions');
      if (res.data.success) {
        setExceptions(res.data.data?.exceptions || []);
      }
    } catch (err) {
      toast.error('Failed to load audit exceptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedException) return;
    try {
      setSubmittingNote(true);
      const res = await api.post('/audit/notes', {
        entity_type: 'transaction',
        entity_id: selectedException.reference_id,
        note: noteText,
        status: noteStatus
      });
      if (res.data.success) {
        toast.success('Audit note recorded');
        setShowNoteModal(false);
        setNoteText('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save audit note');
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" /> Audit Exceptions & Anomaly Surveillance
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Surveillance of flagged items requiring independent review: reversals, large single entries, missing references, and arrears. Neutral status: "Requires Review".
          </p>
        </div>

        <button
          onClick={fetchExceptions}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg"
        >
          Refresh Surveillance
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">Scanning ledger anomalies...</div>
        ) : exceptions.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            <CheckCircle className="w-10 h-10 text-lime-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-700">Zero exceptions flagged. All records align with normal operating policies.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-50/70 text-amber-900 uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Exception ID</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Subject / Party</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Reason & Indication</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {exceptions.map((exc) => (
                  <tr key={exc.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{exc.id}</td>
                    <td className="py-3 px-4 font-mono text-gray-500">{exc.reference_id}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">{exc.type}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{exc.member_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{exc.member_psn}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-red-600">₦{Number(exc.amount).toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs">{exc.reason}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {exc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => { setSelectedException(exc); setShowNoteModal(true); }}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded flex items-center gap-1 font-semibold text-[11px]"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Note
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-amber-300">
            <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" /> Attach Audit Note to Exception
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Reference: <strong>{selectedException?.reference_id}</strong> ({selectedException?.type})
            </p>

            <form onSubmit={handleAddNote} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Status</label>
                <select
                  value={noteStatus}
                  onChange={(e) => setNoteStatus(e.target.value)}
                  className="w-full text-xs border rounded p-2"
                >
                  <option value="under_review">Under Review</option>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Audit Finding / Note</label>
                <textarea
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record investigation notes..."
                  className="w-full text-xs border rounded p-2"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-gray-900 rounded"
                >
                  {submittingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
