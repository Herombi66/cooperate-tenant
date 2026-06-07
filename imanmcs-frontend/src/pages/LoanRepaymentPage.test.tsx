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

import { LoanRepaymentPage } from './LoanRepaymentPage';

describe('LoanRepaymentPage verification and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    (window.confirm as any).mockRestore?.();
  });

  it('preserves bulk selection across pages and submits a single bulk verification request', async () => {
    authMock.user = { role: 'admin', id: 1 };

    apiMock.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          repayments: [
            {
              id: '1',
              loanId: '101',
              memberPsn: 'PSN001',
              memberName: 'Member One',
              loanAmount: 10000,
              repaymentAmount: 1000,
              repaymentDate: '2026-01-01',
              paymentMethod: 'bank_transfer',
              status: 'pending',
              recordedBy: 'Admin',
              uploadDate: '2026-01-01'
            },
            {
              id: '2',
              loanId: '102',
              memberPsn: 'PSN002',
              memberName: 'Member Two',
              loanAmount: 20000,
              repaymentAmount: 2000,
              repaymentDate: '2026-01-02',
              paymentMethod: 'bank_transfer',
              status: 'verified',
              recordedBy: 'Admin',
              uploadDate: '2026-01-02'
            }
          ],
          pagination: { total: 3, page: 1, limit: 20, pages: 2 }
        }
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          repayments: [
            {
              id: '3',
              loanId: '103',
              memberPsn: 'PSN003',
              memberName: 'Member Three',
              loanAmount: 30000,
              repaymentAmount: 3000,
              repaymentDate: '2026-01-03',
              paymentMethod: 'bank_transfer',
              status: 'pending',
              recordedBy: 'Admin',
              uploadDate: '2026-01-03'
            }
          ],
          pagination: { total: 3, page: 2, limit: 20, pages: 2 }
        }
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          repayments: [],
          pagination: { total: 3, page: 2, limit: 20, pages: 2 }
        }
      });

    apiMock.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Bulk verification processed',
        summary: { requested: 2, verified: 2, skipped: 0, failed: 0 }
      }
    });

    render(<LoanRepaymentPage />);

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledWith(
        '/loan-repayments',
        expect.objectContaining({
          params: expect.objectContaining({ page: 1, limit: 20 })
        })
      );
    });

    const select1 = await screen.findByLabelText('Select repayment 1');
    fireEvent.click(select1);

    const next = await screen.findByRole('button', { name: /Next Page/i });
    fireEvent.click(next);

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledWith(
        '/loan-repayments',
        expect.objectContaining({
          params: expect.objectContaining({ page: 2, limit: 20 })
        })
      );
    });

    const select3 = await screen.findByLabelText('Select repayment 3');
    fireEvent.click(select3);

    const bulkBtn = screen.getByRole('button', { name: /Verify Selected \(2\)/i });
    fireEvent.click(bulkBtn);

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith('/loan-repayments/bulk-verify', {
        repayment_ids: expect.arrayContaining(['1', '3'])
      });
    });

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  it('verifies a single pending repayment via the row action button', async () => {
    authMock.user = { role: 'admin', id: 1 };

    apiMock.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          repayments: [
            {
              id: '10',
              loanId: '110',
              memberPsn: 'PSN010',
              memberName: 'Member Ten',
              loanAmount: 10000,
              repaymentAmount: 1000,
              repaymentDate: '2026-02-01',
              paymentMethod: 'bank_transfer',
              status: 'pending',
              recordedBy: 'Admin',
              uploadDate: '2026-02-01'
            }
          ],
          pagination: { total: 1, page: 1, limit: 20, pages: 1 }
        }
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          repayments: [],
          pagination: { total: 1, page: 1, limit: 20, pages: 1 }
        }
      });

    apiMock.put.mockResolvedValueOnce({ data: { success: true } });

    render(<LoanRepaymentPage />);

    const verify = await screen.findByRole('button', { name: /^Verify$/i });
    fireEvent.click(verify);

    await waitFor(() => {
      expect(apiMock.put).toHaveBeenCalledWith('/loan-repayments/10', { status: 'verified' });
    });
  });

  it('hides verification tools for non-admin roles', async () => {
    authMock.user = { role: 'member', id: 2 };

    apiMock.get.mockResolvedValueOnce({
      data: {
        success: true,
        repayments: [
          {
            id: '21',
            loanId: '121',
            memberPsn: 'PSN021',
            memberName: 'Member Twenty One',
            loanAmount: 10000,
            repaymentAmount: 1000,
            repaymentDate: '2026-03-01',
            paymentMethod: 'bank_transfer',
            status: 'pending',
            recordedBy: 'Admin',
            uploadDate: '2026-03-01'
          }
        ],
        pagination: { total: 1, page: 1, limit: 20, pages: 1 }
      }
    });

    render(<LoanRepaymentPage />);

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalled();
    });

    expect(screen.queryByRole('button', { name: /Verify Selected/i })).toBeNull();
    expect(screen.queryByLabelText(/Select all pending on page/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /^Verify$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Reject$/i })).toBeNull();
  });
});
