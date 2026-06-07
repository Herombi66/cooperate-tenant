/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const toastMock = vi.hoisted(() => {
  const t: any = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn()
  });
  return t;
});

vi.mock('react-hot-toast', () => ({
  toast: toastMock,
  default: toastMock
}));

const socketMock = vi.hoisted(() => ({
  on: vi.fn(),
  removeAllListeners: vi.fn(),
  disconnect: vi.fn()
}));

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socketMock)
}));

const apiMock = vi.hoisted(() => ({
  get: vi.fn()
}));

vi.mock('../services/api', () => ({
  default: apiMock
}));

const animalServiceMock = vi.hoisted(() => ({
  getAnimalCatalog: vi.fn(),
  list: vi.fn(),
  createDraft: vi.fn(),
  updateDraft: vi.fn(),
  submit: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  deleteDraft: vi.fn()
}));

vi.mock('../services/animalRequestService', () => ({
  AnimalRequestService: animalServiceMock
}));

const authMock = vi.hoisted(() => ({
  user: { role: 'admin', canCreateAnimalRequests: false }
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authMock
}));

vi.mock('../config', () => ({
  API_URL: 'http://localhost:3000'
}));

import { AdminAnimalRequestsPage } from './AdminAnimalRequestsPage';

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

describe('AdminAnimalRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    authMock.user = { role: 'admin', canCreateAnimalRequests: false } as any;
    animalServiceMock.getAnimalCatalog.mockResolvedValue([{ value: 'goat', label: 'Goat', icon: '🐐' }]);
    animalServiceMock.list.mockResolvedValue({ items: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } });
    apiMock.get.mockResolvedValue({
      data: {
        members: [
          {
            id: 10,
            psn: 'MBR001',
            name: 'Member User',
            email: 'member@test.local',
            phone: '0800',
            facility_name: 'Clinic',
            status: 'active'
          }
        ],
        pagination: { total: 1, page: 1, limit: 10, pages: 1 }
      }
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows access denied when permission is missing', async () => {
    render(<AdminAnimalRequestsPage />);
    expect(await screen.findByText(/Access denied/i)).toBeTruthy();
  });

  it('runs a basic create flow (select member → preview → submit)', async () => {
    authMock.user = { role: 'admin', canCreateAnimalRequests: true } as any;

    animalServiceMock.createDraft.mockResolvedValue({
      id: 100,
      member_user_id: 10,
      member: { id: 10, psn: 'MBR001', name: 'Member User', email: 'member@test.local' },
      created_by: 1,
      created_by_user: null,
      animal_category: 'goat',
      quantity: 1,
      delivery_start_date: toYmd(new Date()),
      delivery_end_date: toYmd(addDays(new Date(), 1)),
      reason_html: '<p>Need livestock</p>',
      reason_text: 'Need livestock',
      status: 'draft',
      rejection_reason: null,
      submitted_at: null,
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any);

    animalServiceMock.submit.mockResolvedValue({
      id: 100,
      status: 'pending'
    } as any);

    render(<AdminAnimalRequestsPage />);

    expect(await screen.findByText('Member User')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Next' }).at(-1)!);

    const select = await screen.findByLabelText('Animal type');
    fireEvent.change(select, { target: { value: 'goat' } });

    fireEvent.click(screen.getAllByRole('button', { name: 'Next' }).at(-1)!);

    const today = toYmd(new Date());
    const tomorrow = toYmd(addDays(new Date(), 1));

    fireEvent.change(await screen.findByLabelText('Delivery start'), { target: { value: today } });
    fireEvent.change(await screen.findByLabelText('Delivery end'), { target: { value: tomorrow } });

    fireEvent.click(screen.getAllByRole('button', { name: 'Next' }).at(-1)!);

    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    expect(editor).toBeTruthy();
    editor.innerHTML = '<p>Need livestock</p>';
    fireEvent.input(editor);

    fireEvent.click(screen.getAllByRole('button', { name: 'Next' }).at(-1)!);

    fireEvent.click(await screen.findByRole('button', { name: 'Submit request' }));

    await waitFor(() => {
      expect(animalServiceMock.createDraft).toHaveBeenCalled();
      expect(animalServiceMock.submit).toHaveBeenCalledWith(100);
    });
  });
});
