import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config';
import api from '../services/api';
import { AnimalRequestService } from '../services/animalRequestService';
import type { AnimalAcquisitionRequest, AnimalCatalogItem, PaginationMeta } from '../types';
import { useAuth } from '../contexts/AuthContext';

type MemberRow = {
  id: number;
  psn: string;
  name: string;
  email: string;
  phone?: string;
  facility_name?: string;
  status: string;
};

const MAX_REASON_CHARS = 2000;

const toYmd = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDays = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

const stripHtmlToText = (html: string) => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
};

const RichTextEditor: React.FC<{
  value: string;
  onChange: (nextHtml: string) => void;
  maxChars: number;
}> = ({ value, onChange, maxChars }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);

  const textLen = useMemo(() => stripHtmlToText(value).length, [value]);
  const remaining = maxChars - textLen;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) el.innerHTML = value || '';
  }, [value]);

  const exec = (cmd: string) => {
    try {
      document.execCommand(cmd, false);
      const next = ref.current?.innerHTML || '';
      onChange(next);
    } catch {}
  };

  const onInput = () => {
    const next = ref.current?.innerHTML || '';
    const nextTextLen = stripHtmlToText(next).length;
    if (nextTextLen > maxChars) {
      toast.error(`Reason must be ${maxChars} characters or fewer.`);
      if (ref.current) ref.current.innerHTML = value || '';
      return;
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="px-2 py-1 border rounded text-sm" onClick={() => exec('bold')}>
          Bold
        </button>
        <button type="button" className="px-2 py-1 border rounded text-sm" onClick={() => exec('italic')}>
          Italic
        </button>
        <button type="button" className="px-2 py-1 border rounded text-sm" onClick={() => exec('underline')}>
          Underline
        </button>
        <button type="button" className="px-2 py-1 border rounded text-sm" onClick={() => exec('insertUnorderedList')}>
          Bullets
        </button>
        <button type="button" className="px-2 py-1 border rounded text-sm" onClick={() => exec('insertOrderedList')}>
          Numbered
        </button>
      </div>

      <div
        ref={ref}
        className={`min-h-[140px] rounded border p-3 text-sm bg-white ${focused ? 'ring-2 ring-primary-200 border-primary-400' : 'border-gray-300'}`}
        contentEditable
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInput={onInput}
      />
      <div className={`text-xs ${remaining < 0 ? 'text-red-600' : 'text-gray-500'}`}>
        {remaining} characters remaining
      </div>
    </div>
  );
};

export const AdminAnimalRequestsPage: React.FC = () => {
  const { user } = useAuth();

  const canAccess = user?.role === 'super_admin' || (user?.role === 'admin' && user?.canCreateAnimalRequests);
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;

  const [catalog, setCatalog] = useState<AnimalCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [tab, setTab] = useState<'create' | 'list'>('create');

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [memberPagination, setMemberPagination] = useState<PaginationMeta>({ total: 0, page: 1, limit: 10, pages: 0 });
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatus, setMemberStatus] = useState<'active' | 'inactive' | 'suspended' | 'all'>('active');
  const [memberLoading, setMemberLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);

  const [draftId, setDraftId] = useState<number | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [animalCategory, setAnimalCategory] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryStart, setDeliveryStart] = useState<string>('');
  const [deliveryEnd, setDeliveryEnd] = useState<string>('');
  const [reasonHtml, setReasonHtml] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const minDate = useMemo(() => toYmd(new Date()), []);
  const maxDate = useMemo(() => toYmd(addDays(new Date(), 180)), []);

  const [requests, setRequests] = useState<AnimalAcquisitionRequest[]>([]);
  const [reqPagination, setReqPagination] = useState<PaginationMeta>({ total: 0, page: 1, limit: 20, pages: 0 });
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatus, setReqStatus] = useState<'all' | 'draft' | 'pending' | 'approved' | 'rejected'>('all');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqPage, setReqPage] = useState(1);
  const [rejectModal, setRejectModal] = useState<{ id: number; reason: string } | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const resetWizard = () => {
    setDraftId(null);
    setWizardStep(1);
    setSelectedMember(null);
    setAnimalCategory('');
    setQuantity(1);
    setDeliveryStart('');
    setDeliveryEnd('');
    setReasonHtml('');
  };

  const loadCatalog = async () => {
    try {
      setCatalogLoading(true);
      const items = await AnimalRequestService.getAnimalCatalog();
      setCatalog(items);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load livestock catalog');
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadMembers = async (page = 1) => {
    try {
      setMemberLoading(true);
      const params: any = { page, limit: memberPagination.limit, search: memberSearch || undefined };
      if (memberStatus !== 'all') params.status = memberStatus;
      const res = await api.get('/members', { params });
      const rows = res.data?.members || [];
      setMembers(
        rows.map((r: any) => ({
          id: Number(r.id),
          psn: r.psn || r.membershipApplication?.psn || '',
          name: r.name || r.membershipApplication?.name || '',
          email: r.email || r.membershipApplication?.email || '',
          phone: r.phone || r.membershipApplication?.phone || '',
          facility_name: r.facility_name || r.membershipApplication?.facility_name || '',
          status: r.status || 'active'
        }))
      );
      setMemberPagination(res.data?.pagination || { total: 0, page: 1, limit: memberPagination.limit, pages: 0 });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load members');
    } finally {
      setMemberLoading(false);
    }
  };

  const loadRequests = async (page = reqPage) => {
    try {
      setReqLoading(true);
      const res = await AnimalRequestService.list({ page, limit: reqPagination.limit, status: reqStatus, q: reqSearch || undefined });
      setRequests(res.items);
      setReqPagination(res.pagination);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load requests');
    } finally {
      setReqLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    loadCatalog();
    loadMembers(1);
    loadRequests(1);
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess) return;
    loadRequests(1);
    setReqPage(1);
  }, [reqStatus]);

  useEffect(() => {
    if (!canAccess) return;
    const id = window.setTimeout(() => {
      loadRequests(1);
      setReqPage(1);
    }, 350);
    return () => window.clearTimeout(id);
  }, [reqSearch]);

  useEffect(() => {
    if (!canAccess || !token) return;
    const base = (API_URL || '').replace(/\/$/, '');
    const socket = io(base, { transports: ['websocket'], auth: { token } });
    socketRef.current = socket;

    socket.on('animal_request_changed', () => {
      loadRequests(reqPage);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [canAccess, token, reqPage]);

  const saveDraft = async (): Promise<AnimalAcquisitionRequest | null> => {
    if (!selectedMember) {
      toast.error('Select a member first');
      return null;
    }

    try {
      setSubmitting(true);
      const payload = {
        member_user_id: selectedMember.id,
        animal_category: animalCategory || null,
        quantity: quantity || null,
        delivery_start_date: deliveryStart || null,
        delivery_end_date: deliveryEnd || null,
        reason_html: reasonHtml || null
      };

      const item = draftId
        ? await AnimalRequestService.updateDraft(draftId, payload)
        : await AnimalRequestService.createDraft(payload);

      setDraftId(item.id);
      toast.success('Draft saved');
      await loadRequests(reqPage);
      return item;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data?.errors?.[0]?.msg || 'Failed to save draft');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const validateStep = (step: number): string | null => {
    if (!selectedMember) return 'Member is required';
    if (step >= 2) {
      if (!animalCategory) return 'Animal type is required';
      if (!quantity || quantity < 1) return 'Quantity must be at least 1';
    }
    if (step >= 3) {
      if (!deliveryStart) return 'Delivery start date is required';
      if (!deliveryEnd) return 'Delivery end date is required';
      if (deliveryStart > deliveryEnd) return 'Delivery start date must be before end date';
      if (deliveryStart < minDate) return `Delivery start date cannot be before ${minDate}`;
      if (deliveryEnd > maxDate) return `Delivery end date cannot be after ${maxDate}`;
    }
    if (step >= 4) {
      const text = stripHtmlToText(reasonHtml || '');
      if (!text.trim()) return 'Reason is required';
      if (text.length > MAX_REASON_CHARS) return `Reason must be ${MAX_REASON_CHARS} characters or fewer`;
    }
    return null;
  };

  const goNext = async () => {
    const err = validateStep(wizardStep);
    if (err) return toast.error(err);
    if (wizardStep < 5) setWizardStep((wizardStep + 1) as any);
  };

  const goPrev = () => {
    if (wizardStep > 1) setWizardStep((wizardStep - 1) as any);
  };

  const submit = async () => {
    const err = validateStep(4);
    if (err) return toast.error(err);
    let id = draftId;
    if (!id) {
      const saved = await saveDraft();
      id = saved?.id || null;
    }
    if (!id) return;
    try {
      setSubmitting(true);
      const item = await AnimalRequestService.submit(id);
      toast.custom(
        (t) => (
          <div className="bg-white border border-green-200 shadow rounded p-4">
            <div className="font-semibold text-green-700">Request submitted</div>
            <div className="text-sm text-gray-700 mt-1">Request #{item.id} is now Pending.</div>
            <div className="mt-3 flex gap-2">
              <button
                className="px-3 py-1 text-sm rounded bg-green-600 text-white"
                onClick={() => {
                  toast.dismiss(t.id);
                  setTab('list');
                }}
              >
                View requests
              </button>
              <button className="px-3 py-1 text-sm rounded border" onClick={() => toast.dismiss(t.id)}>
                Dismiss
              </button>
            </div>
          </div>
        ),
        { duration: 8000 }
      );
      resetWizard();
      await loadRequests(reqPage);
      setTab('list');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const loadDraftIntoWizard = (r: AnimalAcquisitionRequest) => {
    setDraftId(r.id);
    setWizardStep(2);
    const m = r.member;
    if (m) setSelectedMember({ id: m.id, psn: m.psn, name: m.name, email: m.email, status: 'active' });
    setAnimalCategory(r.animal_category || '');
    setQuantity(r.quantity || 1);
    setDeliveryStart(r.delivery_start_date || '');
    setDeliveryEnd(r.delivery_end_date || '');
    setReasonHtml(r.reason_html || '');
    setTab('create');
  };

  const approve = async (id: number) => {
    if (!confirm(`Approve request #${id}?`)) return;
    try {
      setSubmitting(true);
      await AnimalRequestService.approve(id);
      toast.success('Request approved');
      await loadRequests(reqPage);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const openReject = (id: number) => setRejectModal({ id, reason: '' });

  const doReject = async () => {
    if (!rejectModal) return;
    const reason = rejectModal.reason.trim();
    if (reason.length < 2) return toast.error('Rejection reason is required');
    try {
      setSubmitting(true);
      await AnimalRequestService.reject(rejectModal.id, reason);
      toast.success('Request rejected');
      setRejectModal(null);
      await loadRequests(reqPage);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDraft = async (id: number) => {
    if (!confirm(`Delete draft request #${id}?`)) return;
    try {
      setSubmitting(true);
      await AnimalRequestService.deleteDraft(id);
      toast.success('Draft deleted');
      if (draftId === id) resetWizard();
      await loadRequests(reqPage);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete draft');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Animal Acquisition Requests</h1>
        <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-4 text-yellow-900">
          Access denied. animal-request-create permission required.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Animal Acquisition Requests</h1>
          <p className="text-sm text-gray-600">Create Layyah purchase requests on behalf of members.</p>
        </div>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded border ${tab === 'create' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white'}`}
            onClick={() => setTab('create')}
          >
            Create
          </button>
          <button
            className={`px-4 py-2 rounded border ${tab === 'list' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white'}`}
            onClick={() => setTab('list')}
          >
            Requests
          </button>
        </div>
      </div>

      {tab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Create Request</h2>
                <div className="text-sm text-gray-600">Step {wizardStep} of 5</div>
              </div>

              <div className="mt-4">
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[220px]">
                        <label className="block text-sm font-medium text-gray-700">Search members</label>
                        <input
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          placeholder="Name, email, PSN..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                          value={memberStatus}
                          onChange={(e) => setMemberStatus(e.target.value as any)}
                          className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                          <option value="all">All</option>
                        </select>
                      </div>
                      <button
                        className="px-4 py-2 rounded bg-gray-900 text-white text-sm"
                        onClick={() => loadMembers(1)}
                        disabled={memberLoading}
                      >
                        {memberLoading ? 'Loading...' : 'Search'}
                      </button>
                    </div>

                    <div className="border rounded overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2">Member</th>
                            <th className="text-left px-3 py-2">PSN</th>
                            <th className="text-left px-3 py-2">Email</th>
                            <th className="text-left px-3 py-2">Facility</th>
                            <th className="text-right px-3 py-2">Select</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                                No members found
                              </td>
                            </tr>
                          ) : (
                            members.map((m) => (
                              <tr key={m.id} className="border-t">
                                <td className="px-3 py-2">{m.name}</td>
                                <td className="px-3 py-2">{m.psn}</td>
                                <td className="px-3 py-2">{m.email}</td>
                                <td className="px-3 py-2">{m.facility_name || '—'}</td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    className="px-3 py-1 rounded border text-sm"
                                    onClick={() => {
                                      setSelectedMember(m);
                                      toast.success(`Selected ${m.name}`);
                                    }}
                                  >
                                    Select
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Page {memberPagination.page} of {memberPagination.pages || 1}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 rounded border text-sm"
                          disabled={memberPagination.page <= 1 || memberLoading}
                          onClick={() => loadMembers(Math.max(1, memberPagination.page - 1))}
                        >
                          Prev
                        </button>
                        <button
                          className="px-3 py-1 rounded border text-sm"
                          disabled={memberPagination.page >= memberPagination.pages || memberLoading}
                          onClick={() => loadMembers(Math.min(memberPagination.pages || 1, memberPagination.page + 1))}
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    {selectedMember && (
                      <div className="rounded border bg-green-50 border-green-200 p-3 text-sm text-green-900">
                        Selected: {selectedMember.name} ({selectedMember.psn})
                      </div>
                    )}
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="animal_category">
                          Animal type
                        </label>
                        <select
                          id="animal_category"
                          value={animalCategory}
                          onChange={(e) => setAnimalCategory(e.target.value)}
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          disabled={catalogLoading}
                        >
                          <option value="">{catalogLoading ? 'Loading...' : 'Select animal type'}</option>
                          {catalog.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.icon ? `${c.icon} ` : ''}
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="animal_quantity">
                          Quantity
                        </label>
                        <input
                          id="animal_quantity"
                          type="number"
                          min={1}
                          max={99}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="delivery_start_date">
                          Delivery start
                        </label>
                        <input
                          id="delivery_start_date"
                          type="date"
                          min={minDate}
                          max={maxDate}
                          value={deliveryStart}
                          onChange={(e) => setDeliveryStart(e.target.value)}
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="delivery_end_date">
                          Delivery end
                        </label>
                        <input
                          id="delivery_end_date"
                          type="date"
                          min={minDate}
                          max={maxDate}
                          value={deliveryEnd}
                          onChange={(e) => setDeliveryEnd(e.target.value)}
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Allowed delivery window: {minDate} to {maxDate}</div>
                  </div>
                )}

                {wizardStep === 4 && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Reason (required)</label>
                    <RichTextEditor value={reasonHtml} onChange={setReasonHtml} maxChars={MAX_REASON_CHARS} />
                  </div>
                )}

                {wizardStep === 5 && (
                  <div className="space-y-4">
                    <div className="rounded border p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-500">Member</div>
                          <div className="font-medium">{selectedMember?.name} ({selectedMember?.psn})</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Animal</div>
                          <div className="font-medium">
                            {animalCategory} × {quantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Delivery window</div>
                          <div className="font-medium">{deliveryStart} to {deliveryEnd}</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-gray-500 text-sm mb-2">Reason</div>
                        <div className="bg-white border rounded p-3 text-sm" dangerouslySetInnerHTML={{ __html: reasonHtml }} />
                      </div>
                    </div>
                    <button
                      className="w-full md:w-auto px-4 py-2 rounded bg-green-600 text-white"
                      onClick={submit}
                      disabled={submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit request'}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded border text-sm" onClick={goPrev} disabled={wizardStep === 1 || submitting}>
                    Back
                  </button>
                  {wizardStep < 5 && (
                    <button className="px-3 py-2 rounded bg-gray-900 text-white text-sm" onClick={goNext} disabled={submitting}>
                      Next
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded border text-sm" onClick={saveDraft} disabled={submitting}>
                    {draftId ? 'Save draft' : 'Save draft'}
                  </button>
                  <button className="px-3 py-2 rounded border text-sm" onClick={resetWizard} disabled={submitting}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded shadow-sm border p-4">
              <h3 className="text-sm font-semibold text-gray-900">Draft status</h3>
              <div className="mt-2 text-sm text-gray-700">
                {draftId ? (
                  <div>
                    Draft ID: <span className="font-medium">#{draftId}</span>
                  </div>
                ) : (
                  <div>No draft created yet</div>
                )}
              </div>
              {draftId && (
                <div className="mt-3">
                  <button className="px-3 py-2 rounded border text-sm" onClick={() => deleteDraft(draftId)} disabled={submitting}>
                    Delete draft
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded shadow-sm border p-4">
              <h3 className="text-sm font-semibold text-gray-900">Quick actions</h3>
              <div className="mt-3 flex flex-col gap-2">
                <button className="px-3 py-2 rounded border text-sm" onClick={() => setTab('list')}>
                  View all requests
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="bg-white rounded shadow-sm border p-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-medium text-gray-700">Search</label>
              <input
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Member name, email, PSN..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select value={reqStatus} onChange={(e) => setReqStatus(e.target.value as any)} className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm">
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <button className="px-4 py-2 rounded bg-gray-900 text-white text-sm" onClick={() => loadRequests(reqPage)} disabled={reqLoading}>
              {reqLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="border rounded overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">Member</th>
                  <th className="text-left px-3 py-2">Animal</th>
                  <th className="text-left px-3 py-2">Delivery</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      No requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">#{r.id}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.member?.name || '—'}</div>
                        <div className="text-xs text-gray-500">{r.member?.psn || ''}</div>
                      </td>
                      <td className="px-3 py-2">
                        {r.animal_category} × {r.quantity}
                      </td>
                      <td className="px-3 py-2">{r.delivery_start_date && r.delivery_end_date ? `${r.delivery_start_date} → ${r.delivery_end_date}` : '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            r.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : r.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : r.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-2 justify-end flex-wrap">
                          {r.status === 'draft' && (
                            <>
                              <button className="px-3 py-1 rounded border text-sm" onClick={() => loadDraftIntoWizard(r)} disabled={submitting}>
                                Edit
                              </button>
                              <button className="px-3 py-1 rounded border text-sm" onClick={() => deleteDraft(r.id)} disabled={submitting}>
                                Delete
                              </button>
                            </>
                          )}
                          {r.status === 'pending' && (
                            <>
                              <button className="px-3 py-1 rounded bg-green-600 text-white text-sm" onClick={() => approve(r.id)} disabled={submitting}>
                                Approve
                              </button>
                              <button className="px-3 py-1 rounded bg-red-600 text-white text-sm" onClick={() => openReject(r.id)} disabled={submitting}>
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {reqPagination.page} of {reqPagination.pages || 1}
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded border text-sm"
                disabled={reqPagination.page <= 1 || reqLoading}
                onClick={async () => {
                  const next = Math.max(1, reqPagination.page - 1);
                  setReqPage(next);
                  await loadRequests(next);
                }}
              >
                Prev
              </button>
              <button
                className="px-3 py-1 rounded border text-sm"
                disabled={reqPagination.page >= reqPagination.pages || reqLoading}
                onClick={async () => {
                  const next = Math.min(reqPagination.pages || 1, reqPagination.page + 1);
                  setReqPage(next);
                  await loadRequests(next);
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-md p-4">
            <h3 className="text-lg font-semibold text-gray-900">Reject Request #{rejectModal.id}</h3>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700" htmlFor="reject_reason">
                Rejection reason
              </label>
              <textarea
                id="reject_reason"
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                rows={4}
                maxLength={1000}
              />
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button className="px-3 py-2 rounded border text-sm" onClick={() => setRejectModal(null)} disabled={submitting}>
                Cancel
              </button>
              <button className="px-3 py-2 rounded bg-red-600 text-white text-sm" onClick={doReject} disabled={submitting}>
                {submitting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
