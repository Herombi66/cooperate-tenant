/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LayyahGroupDetailsPage from './LayyahGroupDetailsPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => <div {...props} />
  }
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { psn: 'A1' }
  })
}));

vi.mock('../services/layyahService', () => ({
  default: {
    getGroupById: vi.fn(),
    getGroupMembers: vi.fn(),
    manageGroupMembership: vi.fn(),
    addMemberToGroup: vi.fn(),
    canInviteGroupMembers: (group: any) => group?.user_role === 'owner' || group?.user_role === 'admin',
    canManageGroupMembers: (group: any) => group?.user_role === 'owner' || group?.user_role === 'admin',
    formatJoinOrInviteError: (_e: any, msg: string) => msg
  }
}));

const mockedService = (await import('../services/layyahService')).default as any;

const renderWithProviders = (initialEntry: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/my-layyah/groups/:groupId" element={<LayyahGroupDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('LayyahGroupDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders group details and member list', async () => {
    mockedService.getGroupById.mockResolvedValueOnce({
      id: 10,
      group_name: 'ram Layyah Group',
      description: 'Test group',
      animal_category: 'ram',
      price_min: 100,
      price_max: 200,
      created_at: new Date().toISOString(),
      group_type: 'public',
      member_count: 2,
      pending_count: 1,
      available_slots: 2,
      status: 'approved',
      user_role: 'owner',
      membership: null
    });
    mockedService.getGroupMembers.mockResolvedValueOnce([
      { id: 10, applicant_name: 'Leader', status: 'approved', is_group_leader: true },
      { id: 11, applicant_name: 'Member A', status: 'pending', is_group_leader: false }
    ]);

    renderWithProviders('/my-layyah/groups/10');

    expect(await screen.findByText('ram Layyah Group')).toBeTruthy();
    expect((await screen.findAllByText('Members')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Member A')).toBeTruthy();
  });

  it('allows owner to approve a pending member', async () => {
    mockedService.getGroupById.mockResolvedValue({
      id: 10,
      group_name: 'ram Layyah Group',
      description: 'Test group',
      animal_category: 'ram',
      price_min: 100,
      price_max: 200,
      created_at: new Date().toISOString(),
      group_type: 'public',
      member_count: 2,
      pending_count: 1,
      available_slots: 2,
      status: 'approved',
      user_role: 'owner',
      membership: null
    });
    mockedService.getGroupMembers.mockResolvedValue([
      { id: 10, applicant_name: 'Leader', status: 'approved', is_group_leader: true },
      { id: 11, applicant_name: 'Member A', status: 'pending', is_group_leader: false }
    ]);
    mockedService.manageGroupMembership.mockResolvedValueOnce({ success: true });

    renderWithProviders('/my-layyah/groups/10');

    const approveButton = await screen.findByRole('button', { name: 'Approve' });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockedService.manageGroupMembership).toHaveBeenCalledWith(11, 'approve');
    });
  });

  it('allows owner to open invite modal and submit an invite', async () => {
    mockedService.getGroupById.mockResolvedValueOnce({
      id: 10,
      group_name: 'ram Layyah Group',
      description: 'Test group',
      animal_category: 'ram',
      price_min: 100,
      price_max: 200,
      created_at: new Date().toISOString(),
      group_type: 'public',
      member_count: 2,
      pending_count: 0,
      available_slots: 3,
      status: 'approved',
      user_role: 'owner',
      membership: null
    });
    mockedService.getGroupMembers.mockResolvedValueOnce([
      { id: 10, applicant_name: 'Leader', status: 'approved', is_group_leader: true, user_psn: 'A1' }
    ]);
    mockedService.addMemberToGroup.mockResolvedValueOnce({ message: 'ok' });

    renderWithProviders('/my-layyah/groups/10');

    const inviteButton = await screen.findByRole('button', { name: 'Invite member' });
    fireEvent.click(inviteButton);

    const input = await screen.findByPlaceholderText('Enter PSN');
    fireEvent.change(input, { target: { value: 'PSN001' } });

    const send = await screen.findByRole('button', { name: 'Send invite' });
    fireEvent.click(send);

    await waitFor(() => {
      expect(mockedService.addMemberToGroup).toHaveBeenCalledWith(10, 'PSN001');
    });
  });
});
