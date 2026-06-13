import React, { useEffect, useMemo, useState } from 'react';
import { FileText, MessageSquare, Upload, RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

type TabKey = 'complaints' | 'messages';

type Complaint = {
  id: number;
  tracking_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  attachment_url?: string | null;
  created_at: string;
};

type DirectMessage = {
  id: number;
  subject: string;
  body: string;
  status: string;
  read_at?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  created_at: string;
  sender?: {
    membershipApplication?: {
      name?: string;
      psn?: string;
    };
  };
};

export const SupportPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('complaints');
  const [loading, setLoading] = useState(false);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<DirectMessage | null>(null);

  const [complaintForm, setComplaintForm] = useState({
    title: '',
    category: 'service',
    priority: 'medium',
    description: ''
  });
  const [complaintAttachment, setComplaintAttachment] = useState<File | null>(null);

  const unreadCount = useMemo(() => messages.filter((m) => !m.read_at && m.status !== 'read').length, [messages]);

  const fetchComplaints = async () => {
    const res = await api.get('/complaints', { params: { limit: 50, page: 1 } });
    setComplaints(res.data?.complaints || []);
  };

  const fetchMessages = async () => {
    const res = await api.get('/direct-messages', { params: { scope: 'received', limit: 50, offset: 0 } });
    setMessages(res.data?.messages || []);
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchComplaints(), fetchMessages()]);
    } catch (e) {
      toast.error('Failed to refresh support data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const id = window.setInterval(() => {
      fetchMessages().catch(() => {});
    }, 25_000);
    return () => window.clearInterval(id);
  }, []);

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintForm.title.trim()) return toast.error('Title is required');
    if (!complaintForm.description.trim()) return toast.error('Description is required');

    try {
      setLoading(true);
      const data = new FormData();
      data.append('title', complaintForm.title.trim());
      data.append('category', complaintForm.category);
      data.append('priority', complaintForm.priority);
      data.append('description', complaintForm.description.trim());
      if (complaintAttachment) data.append('attachment', complaintAttachment);

      const res = await api.post('/complaints', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Complaint submitted. Tracking ID: ${res.data?.complaint?.tracking_id || 'N/A'}`);
      setComplaintForm({ title: '', category: 'service', priority: 'medium', description: '' });
      setComplaintAttachment(null);
      await fetchComplaints();
      setTab('complaints');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.errors?.[0]?.msg || 'Failed to submit complaint';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const openAttachment = (path: string) => {
    const url = `${API_URL}${path}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const markRead = async (message: DirectMessage) => {
    if (message.read_at || message.status === 'read') return;
    try {
      await api.put(`/direct-messages/${message.id}/read`);
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, status: 'read', read_at: new Date().toISOString() } : m)));
    } catch (e) {}
  };

  const getComplaintBadge = (status: string) => {
    if (status === 'resolved') return { icon: <CheckCircle className="w-4 h-4 text-green-600" />, cls: 'bg-green-100 text-green-800', label: 'Resolved' };
    if (status === 'in_progress') return { icon: <Clock className="w-4 h-4 text-primary-600" />, cls: 'bg-primary-100 text-primary-800', label: 'In Progress' };
    if (status === 'rejected') return { icon: <AlertTriangle className="w-4 h-4 text-red-600" />, cls: 'bg-red-100 text-red-800', label: 'Rejected' };
    return { icon: <Clock className="w-4 h-4 text-yellow-600" />, cls: 'bg-yellow-100 text-yellow-800', label: 'Pending' };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-gray-600">Submit complaints and view messages from admins</p>
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

      <div className="flex gap-2">
        <button
          onClick={() => setTab('complaints')}
          className={`inline-flex items-center px-4 py-2 rounded-lg border ${
            tab === 'complaints' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 bg-white hover:bg-gray-50'
          }`}
        >
          <FileText className="w-4 h-4 mr-2" />
          Complaints
        </button>
        <button
          onClick={() => setTab('messages')}
          className={`inline-flex items-center px-4 py-2 rounded-lg border ${
            tab === 'messages' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 bg-white hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Messages
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center text-xs bg-red-500 text-white rounded-full h-5 w-5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'complaints' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Complaint</h2>
            <form onSubmit={submitComplaint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={complaintForm.title}
                  onChange={(e) => setComplaintForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={complaintForm.category}
                    onChange={(e) => setComplaintForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  >
                    <option value="technical">Technical</option>
                    <option value="service">Service</option>
                    <option value="financial">Financial</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={complaintForm.priority}
                    onChange={(e) => setComplaintForm((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={complaintForm.description}
                  onChange={(e) => setComplaintForm((p) => ({ ...p, description: e.target.value }))}
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (optional)</label>
                <label className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg px-3 py-3 bg-white cursor-pointer hover:bg-gray-50">
                  <Upload className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-sm text-gray-600">{complaintAttachment ? complaintAttachment.name : 'Choose file (PNG/JPG/PDF)'}</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    className="hidden"
                    onChange={(e) => setComplaintAttachment(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-60"
                disabled={loading}
              >
                Submit
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Complaints</h2>
            {complaints.length === 0 ? (
              <div className="text-sm text-gray-600">No complaints submitted yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attachment</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {complaints.map((c) => {
                      const b = getComplaintBadge(c.status);
                      return (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{c.tracking_id}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{c.title}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 capitalize">{c.priority}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${b.cls}`}>
                              {b.icon}
                              <span className="ml-1">{b.label}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {c.attachment_url ? (
                              <button className="text-primary-600 hover:text-primary-800" onClick={() => openAttachment(c.attachment_url!)}>
                                View
                              </button>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
          {messages.length === 0 ? (
            <div className="text-sm text-gray-600">No messages yet.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-[560px] overflow-y-auto">
                  {messages.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMessage(m);
                        markRead(m);
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                        !m.read_at && m.status !== 'read' ? 'bg-primary-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900 truncate">{m.subject}</div>
                        <div className="text-xs text-gray-500">{new Date(m.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2">{m.body}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                {selectedMessage ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{selectedMessage.subject}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(selectedMessage.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!selectedMessage.read_at && selectedMessage.status !== 'read' ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-800">Unread</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">Read</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{selectedMessage.body}</div>
                    {selectedMessage.attachment_url ? (
                      <button
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm"
                        onClick={() => openAttachment(selectedMessage.attachment_url!)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {selectedMessage.attachment_name || 'View attachment'}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">Select a message to view details.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

