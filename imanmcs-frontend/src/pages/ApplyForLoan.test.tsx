import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ApplyForLoan from './ApplyForLoan';

const toastMock = vi.hoisted(() => {
  const t: any = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn(),
    loading: vi.fn()
  });
  return t;
});

vi.mock('react-hot-toast', () => ({
  toast: toastMock,
  default: toastMock
}));

vi.mock('lucide-react', () => {
  const Icon = () => null;
  return new Proxy(
    {},
    {
      get: () => Icon
    }
  );
});

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}));

vi.mock('../services/api', () => ({
  default: apiMock
}));

const authMock = vi.hoisted(() => ({
  user: { id: '1', role: 'member', psn: 'APPLICANT01', name: 'Applicant User', isDefaultPassword: false }
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authMock
}));

vi.mock('../components/AgentAgreementModal', () => ({
  default: () => null
}));

describe('ApplyForLoan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    apiMock.get.mockImplementation((url: string, config?: any) => {
      if (url === '/auth/me') {
        return Promise.resolve({
          data: {
            user: {
              id: 1,
              created_at: new Date().toISOString(),
              psn: 'APPLICANT01',
              name: 'Applicant User'
            }
          }
        });
      }

      if (url === '/contributions') {
        return Promise.resolve({ data: { contributions: [] } });
      }

      if (url === '/loans') {
        return Promise.resolve({ data: { loans: [] } });
      }

      if (url === '/members/validate-grantor') {
        const psn = String(config?.params?.psn || '').trim();
        if (psn === 'GRANTOR01') {
          return Promise.resolve({ data: { success: true, member: { id: 2, name: 'Valid Grantor' } } });
        }
        return Promise.reject({ response: { data: { message: 'PSN not found in system.' }, status: 404 } });
      }

      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('enables Next only after valid step inputs and progresses sequentially', async () => {
    render(
      <MemoryRouter>
        <ApplyForLoan />
      </MemoryRouter>
    );

    const amountInput = await screen.findByPlaceholderText('Enter loan amount');
    const next1 = screen.getByRole('button', { name: 'Next' });
    expect((next1 as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(amountInput, { target: { value: '20000' } });
    await waitFor(() => expect((next1 as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(next1);

    const grantorInput = await screen.findByPlaceholderText("Enter grantor's PSN");
    const purposeInput = screen.getByPlaceholderText(/Describe the purpose of this loan/i);
    const next2 = screen.getByRole('button', { name: 'Next' });
    expect((next2 as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(grantorInput, { target: { value: 'GRANTOR01' } });
    fireEvent.change(purposeInput, { target: { value: 'This is a detailed purpose for the loan request.' } });
    await waitFor(() => expect((next2 as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(next2);
    await screen.findByText(/Upload Payslip/i);
  });

  it('blocks step progression when grantor validation fails and shows an error', async () => {
    render(
      <MemoryRouter>
        <ApplyForLoan />
      </MemoryRouter>
    );

    const amountInput = await screen.findByPlaceholderText('Enter loan amount');
    fireEvent.change(amountInput, { target: { value: '20000' } });
    const next1 = screen.getByRole('button', { name: 'Next' });
    await waitFor(() => expect((next1 as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(next1);

    const grantorInput = await screen.findByPlaceholderText("Enter grantor's PSN");
    const purposeInput = screen.getByPlaceholderText(/Describe the purpose of this loan/i);
    fireEvent.change(grantorInput, { target: { value: 'UNKNOWN99' } });
    fireEvent.change(purposeInput, { target: { value: 'This is a detailed purpose for the loan request.' } });

    const next2 = screen.getByRole('button', { name: 'Next' });
    await waitFor(() => expect((next2 as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(next2);

    await screen.findByText(/PSN not found in system|Invalid guarantor PSN/i);
    expect(screen.getByPlaceholderText("Enter grantor's PSN")).toBeTruthy();
  });

  it('persists draft data in sessionStorage between remounts', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <ApplyForLoan />
      </MemoryRouter>
    );

    const amountInput = await screen.findByPlaceholderText('Enter loan amount');
    fireEvent.change(amountInput, { target: { value: '25000' } });
    await waitFor(() => {
      const raw = sessionStorage.getItem('loan_application_draft_v1') || '';
      expect(raw).toContain('25000');
    });

    unmount();

    render(
      <MemoryRouter>
        <ApplyForLoan />
      </MemoryRouter>
    );

    const restoredAmount = await screen.findByPlaceholderText('Enter loan amount');
    expect((restoredAmount as HTMLInputElement).value).toBe('25000');
  });
});
