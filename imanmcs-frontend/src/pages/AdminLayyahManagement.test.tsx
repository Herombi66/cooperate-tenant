/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AdminLayyahManagement } from './AdminLayyahManagement';
import type { LayyahAdminApplicantRow } from '../types';

vi.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => <div {...props} />
  }
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      psn: 'ADM001',
      name: 'Admin User',
      email: 'admin@test.local',
      role: 'admin',
      isDefaultPassword: false,
      status: 'active'
    }
  })
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn()
  }
}));

const mockStream = {
  addEventListener: vi.fn(),
  close: vi.fn(),
  onerror: null as any
};

vi.mock('../services/layyahService', () => ({
  LayyahService: {
    getApplicationStats: vi.fn(),
    getCsrfToken: vi.fn(),
    getSeasonalProgramStatus: vi.fn(),
    updateSeasonalProgramStatus: vi.fn(),
    getAdminApplicants: vi.fn(),
    openAdminStream: vi.fn(() => mockStream),
    getStatusColor: vi.fn(() => 'bg-gray-100 text-gray-800'),
    getStatusLabel: vi.fn(() => 'Pending'),
    logAdminClientError: vi.fn(),
    exportApplications: vi.fn()
  }
}));

const mockedService = (await import('../services/layyahService')).LayyahService as any;

const renderWithProviders = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminLayyahManagement />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AdminLayyahManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem('iman.locale', 'en');
    mockedService.getApplicationStats.mockResolvedValueOnce({
      total_applications: 1,
      pending_applications: 1,
      under_review_applications: 0,
      approved_applications: 0,
      rejected_applications: 0,
      disbursed_applications: 0
    });
    mockedService.getCsrfToken.mockResolvedValueOnce('csrf');
    mockedService.getSeasonalProgramStatus.mockResolvedValueOnce({ enabled: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Animal Type and Price Range columns with emoji and formatted range', async () => {
    const rows: LayyahAdminApplicantRow[] = [
      {
        member_id: 1,
        application_id: 10,
        name: 'Test Member',
        psn: '12345',
        email: 'test@example.com',
        phone: '0800',
        kind: 'individual',
        animal_category: 'goat',
        animal_type: 'Goat',
        quantity: 1,
        price_min: 50000,
        price_max: 75000,
        applied_amount: 75000,
        price_range: '50,000 – 75,000 NGN',
        application_date: new Date().toISOString(),
        status: 'pending',
        amount_version: 1
      }
    ];

    mockedService.getAdminApplicants.mockResolvedValueOnce({
      items: rows,
      pagination: { total: 1, page: 1, limit: 25, pages: 1 }
    });

    renderWithProviders();

    expect(await screen.findByRole('button', { name: 'Animal Type' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Price Range' })).toBeTruthy();

    expect((await screen.findAllByText('🐐')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Goat').length).toBeGreaterThan(0);
    expect(screen.getAllByText('50,000 – 75,000 NGN').length).toBeGreaterThan(0);
  });

  it('supports sorting by Animal Type', async () => {
    mockedService.getAdminApplicants
      .mockResolvedValueOnce({ items: [], pagination: { total: 0, page: 1, limit: 25, pages: 1 } })
      .mockResolvedValueOnce({ items: [], pagination: { total: 0, page: 1, limit: 25, pages: 1 } });

    renderWithProviders();

    const animalHeader = await screen.findByRole('button', { name: 'Animal Type' });
    fireEvent.click(animalHeader);

    await waitFor(() => {
      expect(mockedService.getAdminApplicants).toHaveBeenCalledWith(expect.objectContaining({ sort: 'animal_type' }));
    });
  });
});
