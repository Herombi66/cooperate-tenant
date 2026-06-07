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

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}));

vi.mock('../services/api', () => ({
  default: apiMock
}));

const authMock = vi.hoisted(() => ({
  user: { role: 'admin', id: 1 }
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authMock
}));

import LoanApplicationsPage from './LoanApplicationsPage';

describe('LoanApplicationsPage pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('loads next page when clicking "Next Page" and preserves filters/search in requests', async () => {
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          loans: [{ id: 1, status: 'pending', amount_requested: 1000, repayment_period_months: 10, loan_type: 'cash', user: { membershipApplication: { name: 'A', psn: 'PSN1' } } }],
          pagination: { total: 15, page: 1, limit: 10, pages: 2 }
        }
      })
      .mockResolvedValueOnce({
        data: {
          loans: [{ id: 2, status: 'pending', amount_requested: 2000, repayment_period_months: 10, loan_type: 'cash', user: { membershipApplication: { name: 'B', psn: 'PSN2' } } }],
          pagination: { total: 15, page: 2, limit: 10, pages: 2 }
        }
      });

    render(<LoanApplicationsPage />);

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledWith(
        '/loans',
        expect.objectContaining({
          params: expect.objectContaining({ page: 1, limit: 10, status: 'all', loan_type: 'all' })
        })
      );
    });

    const next = await screen.findByRole('button', { name: /Next Page/i });
    fireEvent.click(next);

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledWith(
        '/loans',
        expect.objectContaining({
          params: expect.objectContaining({ page: 2, limit: 10, status: 'all', loan_type: 'all' })
        })
      );
    });

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Next Page/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
  });
});
