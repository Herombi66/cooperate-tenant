/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import LayyahGroupsHubPage from './LayyahGroupsHubPage';

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

vi.mock('../services/layyahService', () => ({
  default: {
    getGroups: vi.fn(),
    requestToJoinGroup: vi.fn(),
    leaveGroup: vi.fn(),
    canRequestJoin: (group: any) => {
      const role = (group?.user_role || '').toString().toLowerCase();
      const type = (group?.group_type || '').toString().toLowerCase();
      const slots = Number(group?.available_slots ?? 0);
      if (role !== 'guest') return false;
      if (group?.membership) return false;
      if (Number.isFinite(slots) && slots <= 0) return false;
      if (type === 'restricted') return false;
      return true;
    },
    formatJoinOrInviteError: (_e: any, msg: string) => msg
  }
}));

const mockedService = (await import('../services/layyahService')).default as any;

const renderWithProviders = (initialEntry: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LayyahGroupsHubPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('LayyahGroupsHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('loads browse groups and renders cards', async () => {
    mockedService.getGroups.mockResolvedValueOnce({
      groups: [
        {
          id: 1,
          group_name: 'ram Layyah Group',
          description: 'Test group',
          animal_category: 'ram',
          price_min: 100,
          price_max: 200,
          created_at: new Date().toISOString(),
          group_type: 'public',
          member_count: 1,
          pending_count: 0,
          available_slots: 4,
          status: 'approved',
          user_role: 'guest',
          membership: null
        }
      ],
      pagination: { total: 1, page: 1, limit: 12, pages: 1 }
    });

    renderWithProviders('/my-layyah/groups?tab=browse');

    expect(await screen.findByText('ram Layyah Group')).toBeTruthy();
    expect(screen.getByText('Test group')).toBeTruthy();
    expect(mockedService.getGroups).toHaveBeenCalled();
  });

  it('allows requesting to join an open group', async () => {
    mockedService.getGroups.mockResolvedValue({
      groups: [
        {
          id: 2,
          group_name: 'goat Layyah Group',
          description: '',
          animal_category: 'goat',
          price_min: 100,
          price_max: 200,
          created_at: new Date().toISOString(),
          group_type: 'public',
          member_count: 1,
          pending_count: 0,
          available_slots: 4,
          status: 'approved',
          user_role: 'guest',
          membership: null
        }
      ],
      pagination: { total: 1, page: 1, limit: 12, pages: 1 }
    });
    mockedService.requestToJoinGroup.mockResolvedValueOnce({ message: 'ok' });

    renderWithProviders('/my-layyah/groups?tab=browse');

    const joinButton = await screen.findByRole('button', { name: 'Request to Join' });
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(mockedService.requestToJoinGroup).toHaveBeenCalledWith(2);
    });
  });

  it('disables join action for restricted groups', async () => {
    mockedService.getGroups.mockResolvedValueOnce({
      groups: [
        {
          id: 3,
          group_name: 'restricted group',
          description: '',
          animal_category: 'ram',
          price_min: 100,
          price_max: 200,
          created_at: new Date().toISOString(),
          group_type: 'restricted',
          member_count: 1,
          pending_count: 0,
          available_slots: 4,
          status: 'approved',
          user_role: 'guest',
          membership: null
        }
      ],
      pagination: { total: 1, page: 1, limit: 12, pages: 1 }
    });

    renderWithProviders('/my-layyah/groups?tab=browse');

    const joinButton = await screen.findByRole('button', { name: 'Request to Join' });
    expect(joinButton).toHaveProperty('disabled', true);
  });

  it('shows permission message on 403', async () => {
    mockedService.getGroups.mockRejectedValue({ response: { status: 403 } });
    renderWithProviders('/my-layyah/groups?tab=browse');

    expect(await screen.findByText('You do not have permission to view this content.')).toBeTruthy();
  });
});
