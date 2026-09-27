/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';

let mockIsFmck = true;

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin User', role: 'admin' },
    isLoading: false,
  }),
}));

vi.mock('../../utils/tenantTerminology', () => ({
  useTenantTerminology: () => ({
    isFmck: mockIsFmck,
    idLabel: mockIsFmck ? 'IPPIS Number' : 'PSN',
  }),
}));

vi.mock('../../services/dashboardService', () => ({
  DashboardService: {
    getAdminStats: vi.fn().mockResolvedValue({
      totalMembers: 1250,
      totalContributions: 85000000,
      pendingLoans: 14,
      totalProfitShared: 12000000,
      pendingExpenses: 3,
      monthlyExpenses: 450000,
      totalReserves: 25000000,
      activeApplications: 8,
      totalLayyahApplications: 45,
      pendingLayyahApplications: 6,
      activeLayyahGroups: 5,
    }),
    getActivityLogs: vi.fn().mockResolvedValue({
      logs: [],
      pagination: { totalPages: 1 },
    }),
    getExpenses: vi.fn().mockResolvedValue([]),
  },
}));

describe('AdminDashboard Overview Cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders 8 overview cards without decorative icons and without Layyah cards for FMCKSMCS tenant', async () => {
    mockIsFmck = true;

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    // Wait for stats to load
    const memberStat = await screen.findByText('1,250');
    expect(memberStat).toBeTruthy();

    // Verify exactly 8 overview cards are rendered using stats-card-no-icon (2 rows of 4)
    const noIconCards = screen.getAllByTestId('stats-card-no-icon');
    expect(noIconCards.length).toBe(8);

    // Verify none of the 8 overview cards contain decorative svg icons
    noIconCards.forEach((card) => {
      const svgs = card.querySelectorAll('svg');
      expect(svgs.length).toBe(0);
    });

    // Verify expected core financial titles are present
    expect(screen.getByText('Total Members')).toBeTruthy();
    expect(screen.getByText('Total Contributions')).toBeTruthy();
    expect(screen.getByText('Pending Loans')).toBeTruthy();
    expect(screen.getByText('Monthly Expenses')).toBeTruthy();
    expect(screen.getByText('Profit Shared')).toBeTruthy();
    expect(screen.getByText('Total Reserves')).toBeTruthy();
    expect(screen.getByText('Pending Expenses')).toBeTruthy();
    expect(screen.getByText('New Applications')).toBeTruthy();

    // Verify Layyah-related cards are completely removed from the overview
    expect(screen.queryByText('Layyah Applications')).toBeNull();
    expect(screen.queryByText('Pending Layyah')).toBeNull();
    expect(screen.queryByText('Active Groups')).toBeNull();

    // Verify values are displayed correctly
    expect(screen.getByText('₦85.0M')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByText('₦450K')).toBeTruthy();
    expect(screen.getByText('₦12.0M')).toBeTruthy();
    expect(screen.getByText('₦25.0M')).toBeTruthy();
  });

  it('preserves legacy icons on 8 overview cards for non-FMCK tenants and removes Layyah', async () => {
    mockIsFmck = false;

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await screen.findByText('1,250');

    // For non-FMCK, the 8 overview cards render with legacy icon layout
    const withIconCards = screen.getAllByTestId('stats-card-with-icon');
    expect(withIconCards.length).toBe(8);

    // Verify icons exist inside cards
    withIconCards.forEach((card) => {
      const svgs = card.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    // Layyah cards removed
    expect(screen.queryByText('Layyah Applications')).toBeNull();
  });
});
