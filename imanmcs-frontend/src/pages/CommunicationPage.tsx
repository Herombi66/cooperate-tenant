import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, Send, FileText, RefreshCw, MessageSquare, Users } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

type ComplaintRow = {
  id: number;
  tracking_id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  attachment_url?: string | null;
  created_at: string;
  user?: {
    id: number;
    name?: string;
    email?: string;
    psn?: string;
  };
};

type DirectMessageRow = {
  id: number;
  subject: string;
  body: string;
  status: string;
  read_at?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  created_at: string;
  sender?: { membershipApplication?: { psn?: string; name?: string } };
  recipient?: { membershipApplication?: { psn?: string; name?: string } };
};

type BroadcastRow = {
  id: number;
  subject: string;
  message: string;
  target_group: string;
  recipient_count: number;
  read_count?: number;
  created_at: string;
};

export const CommunicationPage: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const [broadcastForm, setBroadcastForm] = useState({
    subject: '',
    message: '',
    target_group: 'all'
  });
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastRow[]>([]);

  const [dmForm, setDmForm] = useState({
    recipient_psn: '',
    subject: '',
    body: ''
  });
  const [dmAttachment, setDmAttachment] = useState<File | null>(null);
  const [sentMessages, setSentMessages] = useState<DirectMessageRow[]>([]);
  const [dmLookupPsn, setDmLookupPsn] = useState('');
  const [conversation, setConversation] = useState<DirectMessageRow[]>([]);

  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [complaintStatus, setComplaintStatus] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRow | null>(null);
  const [complaintUpdate, setComplaintUpdate] = useState({
    status: 'in_progress',
    internal_notes: '',
    resolution_notes: ''
  });

  const complaintParams = useMemo(() => {
    const p: any = { page: 1, limit: 50 };
    if (complaintStatus !== 'all') p.status = complaintStatus;
    return p;
  }, [complaintStatus]);

  const openAttachment = (path: string) => {
    window.open(`${API_URL}${path}`, '_blank', 'noopener,noreferrer');
  };

  const fetchBroadcastHistory = async () => {
    const res = await api.get('/communication/history');
    setBroadcastHistory(res.data?.broadcasts || []);
  };

  const fetchComplaints = async () => {
    const res = await api.get('/complaints', { params: complaintParams });
    setComplaints(res.data?.complaints || []);
  };

  const fetchSentMessages = async () => {
    const res = await api.get('/direct-messages', { params: { scope: 'sent', limit: 30, offset: 0 } });
    setSentMessages(res.data?.messages || []);
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchBroadcastHistory(), fetchComplaints(), fetchSentMessages()]);
    } catch (e) {
      toast.error('Failed to refresh communication data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const id = window.setInterval(() => {
      fetchComplaints().catch(() => {});
    }, 25_000);
    return () => window.clearInterval(id);
  }, [complaintParams]);

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.subject.trim()) return toast.error('Subject is required');
    if (!broadcastForm.message.trim()) return toast.error('Message is required');
    try {
      setLoading(true);
      await api.post('/communication/broadcast', {
        subject: broadcastForm.subject.trim(),
        message: broadcastForm.message.trim(),
        target_group: broadcastForm.target_group
      });
      toast.success('Broadcast sent');
      setBroadcastForm({ subject: '', message: '', target_group: broadcastForm.target_group });
      await fetchBroadcastHistory();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  const sendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmForm.recipient_psn.trim()) return toast.error('Recipient PSN is required');
    if (!dmForm.subject.trim()) return toast.error('Subject is required');
    if (!dmForm.body.trim()) return toast.error('Message body is required');

    try {
      setLoading(true);
      const data = new FormData();
      data.append('recipient_psn', dmForm.recipient_psn.trim());
      data.append('subject', dmForm.subject.trim());
      data.append('body', dmForm.body.trim());
      if (dmAttachment) data.append('attachment', dmAttachment);

      await api.post('/direct-messages', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Message sent');
      setDmForm({ recipient_psn: '', subject: '', body: '' });
      setDmAttachment(null);
      await fetchSentMessages();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async () => {
    if (!dmLookupPsn.trim()) return;
    try {
      setLoading(true);
      const res = await api.get('/direct-messages', { params: { scope: 'admin_all', psn: dmLookupPsn.trim(), limit: 100, offset: 0 } });
      setConversation(res.data?.messages || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const updateComplaint = async () => {
    if (!selectedComplaint) return;
    try {
      setLoading(true);
      await api.put(`/complaints/${selectedComplaint.id}`, {
        status: complaintUpdate.status,
        internal_notes: complaintUpdate.internal_notes || null,
        resolution_notes: complaintUpdate.resolution_notes || null
      });
      toast.success('Complaint updated');
      setSelectedComplaint(null);
      await fetchComplaints();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communication</h1>
          <p className="text-gray-600">Complaints, direct messages, and broadcasts</p>
        </div>
        <button
          onClick={refreshAll}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Broadcast</h2>
          </div>
          <form onSubmit={sendBroadcast} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={broadcastForm.subject}
                onChange={(e) => setBroadcastForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Subject"
                className="md:col-span-2 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <select
                value={broadcastForm.target_group}
                onChange={(e) => setBroadcastForm((p) => ({ ...p, target_group: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All users</option>
                <option value="active">Active members</option>
                <option value="admins">Admins</option>
              </select>
            </div>
            <textarea
              value={broadcastForm.message}
              onChange={(e) => setBroadcastForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Announcement message"
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-60" disabled={loading}>
              <Send className="w-4 h-4 mr-2" />
              Send Broadcast
            </button>
          </form>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent Broadcasts</h3>
            {broadcastHistory.length === 0 ? (
              <div className="text-sm text-gray-600">No broadcasts yet.</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {broadcastHistory.slice(0, 10).map((b) => (
                  <div key={b.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">{b.subject}</div>
                      <div className="text-xs text-gray-500">{new Date(b.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-gray-700 line-clamp-2">{b.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Target: {b.target_group} · Sent: {b.recipient_count} · Read: {b.read_count || 0}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Direct Message</h2>
          </div>

          <form onSubmit={sendDirectMessage} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={dmForm.recipient_psn}
                onChange={(e) => setDmForm((p) => ({ ...p, recipient_psn: e.target.value }))}
                placeholder="Recipient PSN"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                value={dmForm.subject}
                onChange={(e) => setDmForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Subject"
                className="md:col-span-2 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <textarea
              value={dmForm.body}
              onChange={(e) => setDmForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="Message"
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer text-sm">
                <FileText className="w-4 h-4 mr-2" />
                {dmAttachment ? dmAttachment.name : 'Attach file (PNG/JPG/PDF)'}
                <input type="file" className="hidden" accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => setDmAttachment(e.target.files?.[0] || null)} />
              </label>
              <button className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-60" disabled={loading}>
                <Send className="w-4 h-4 mr-2" />
                Send
              </button>
            </div>
          </form>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600" />
              <div className="text-sm font-semibold text-gray-900">Conversation Lookup</div>
            </div>
            <div className="flex gap-2">
              <input
                value={dmLookupPsn}
                onChange={(e) => setDmLookupPsn(e.target.value)}
                placeholder="Member PSN"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button onClick={loadConversation} className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50">
                Load
              </button>
            </div>
            {conversation.length > 0 ? (
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {conversation.map((m) => (
                  <div key={m.id} className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{m.status}</div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{m.subject}</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{m.body}</div>
                    {m.attachment_url ? (
                      <button className="text-sm text-blue-600 hover:text-blue-800 mt-1" onClick={() => openAttachment(m.attachment_url!)}>
                        {m.attachment_name || 'View attachment'}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">No conversation loaded.</div>
            )}

            <div className="text-sm font-semibold text-gray-900">Recent Sent</div>
            {sentMessages.length === 0 ? (
              <div className="text-sm text-gray-600">No sent messages yet.</div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {sentMessages.map((m) => (
                  <div key={m.id} className="px-4 py-2 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900 truncate">{m.subject}</div>
                      <div className="text-xs text-gray-500">{new Date(m.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-xs text-gray-600 line-clamp-1">{m.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Complaints</h2>
            <p className="text-sm text-gray-600">View and manage member complaints</p>
          </div>
          <select
            value={complaintStatus}
            onChange={(e) => setComplaintStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attachment</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-600">No complaints found.</td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{c.tracking_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{c.user?.name || 'Unknown'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{c.title}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 capitalize">{c.priority}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 capitalize">{c.status.replace('_', ' ')}</td>
                    <td className="px-4 py-2 text-sm">
                      {c.attachment_url ? (
                        <button className="text-blue-600 hover:text-blue-800" onClick={() => openAttachment(c.attachment_url!)}>
                          View
                        </button>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        className="text-primary-600 hover:text-primary-800"
                        onClick={() => {
                          setSelectedComplaint(c);
                          setComplaintUpdate({
                            status: c.status === 'pending' ? 'in_progress' : c.status,
                            internal_notes: '',
                            resolution_notes: ''
                          });
                        }}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">{selectedComplaint.tracking_id}</div>
                <div className="text-lg font-semibold text-gray-900">{selectedComplaint.title}</div>
              </div>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setSelectedComplaint(null)}>
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{selectedComplaint.description}</div>
              {selectedComplaint.attachment_url ? (
                <button className="text-blue-600 hover:text-blue-800 text-sm" onClick={() => openAttachment(selectedComplaint.attachment_url!)}>
                  View attachment
                </button>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={complaintUpdate.status}
                    onChange={(e) => setComplaintUpdate((p) => ({ ...p, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                <textarea
                  value={complaintUpdate.internal_notes}
                  onChange={(e) => setComplaintUpdate((p) => ({ ...p, internal_notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
                <textarea
                  value={complaintUpdate.resolution_notes}
                  onChange={(e) => setComplaintUpdate((p) => ({ ...p, resolution_notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50" onClick={() => setSelectedComplaint(null)}>
                Cancel
              </button>
              <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-60" onClick={updateComplaint} disabled={loading}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

