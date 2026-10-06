/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

let mockUser: any = {
  id: 1,
  role: 'admin',
  name: 'Admin User',
  psn: 'ADM001',
};

let mockTenant: any = {
  id: 'fmcksmcs',
  name: 'Federal Medical Centre Kumo Staff MPCS Ltd',
  theme: {
    logoUrl: '/fmck-logo.png',
  },
  features: {},
};

let mockLayout = {
  isSidebarOpen: false,
  isSidebarCollapsed: false,
  toggleSidebarCollapse: vi.fn(),
  closeSidebar: vi.fn(),
};

let mockPermissionsContext = {
  canAccess: (modKey: string) => true,
  can: (modKey: string, action?: string) => true,
  isAdmin: true,
  isLoading: false,
  permissions: {} as Record<string, any>,
  roles: ['admin'],
  refreshPermissions: vi.fn(),
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../../contexts/LayoutContext', () => ({
  useLayout: () => mockLayout,
}));

vi.mock('../../contexts/TenantContext', () => ({
  useTenant: () => ({
    tenant: mockTenant,
    hasFeature: () => true,
  }),
}));

vi.mock('../../contexts/PermissionContext', () => ({
  usePermissions: () => mockPermissionsContext,
}));

describe('Sidebar Component Theme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUser = {
      id: 1,
      role: 'admin',
      name: 'Admin User',
      psn: 'ADM001',
    };
    mockPermissionsContext = {
      canAccess: (modKey: string) => true,
      can: (modKey: string, action?: string) => true,
      isAdmin: true,
      isLoading: false,
      permissions: {},
      roles: ['admin'],
      refreshPermissions: vi.fn(),
    };
    mockLayout = {
      isSidebarOpen: false,
      isSidebarCollapsed: false,
      toggleSidebarCollapse: vi.fn(),
      closeSidebar: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('renders FMCKSMCS tenant sidebar with clean white theme and logo', () => {
    mockTenant = {
      id: 'fmcksmcs',
      name: 'Federal Medical Centre Kumo Staff MPCS Ltd',
      theme: { logoUrl: '/fmck-logo.png' },
      features: {},
    };

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    // Verify sidebar root container styling
    const sidebarEl = container.querySelector('.fmck-white-sidebar');
    expect(sidebarEl).toBeTruthy();
    expect(sidebarEl?.className).toContain('bg-white');
    expect(sidebarEl?.className).toContain('border-r');
    expect(sidebarEl?.className).toContain('border-gray-200');
    expect(sidebarEl?.className).not.toContain('bg-gray-900');

    // Verify logo and tenant name
    const logoImg = screen.getByAltText(/Federal Medical Centre|FMCK Logo/i);
    expect(logoImg).toBeTruthy();
    expect(screen.getByText('Federal Medical Centre Kumo Staff MPCS Ltd')).toBeTruthy();

    // Verify active link treatment (Dashboard)
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toBeTruthy();
    expect(dashboardLink?.className).toContain('fmck-nav-item-active');
    expect(dashboardLink?.className).toContain('bg-gray-100');
    expect(dashboardLink?.className).toContain('text-gray-900');
    expect(dashboardLink?.className).toContain('border-[#03490b]');
    expect(dashboardLink?.className).toContain('dark:border-[#5cd674]');

    // Verify active icon color matches FMCK brand green & dark mode mint
    const icon = dashboardLink?.querySelector('svg');
    expect(icon?.getAttribute('class')).toContain('text-[#03490b]');
    expect(icon?.getAttribute('class')).toContain('dark:text-[#5cd674]');

    // Verify FMCK admin can access Roles & Permissions, but Withdrawals is hidden
    expect(screen.getByText('Roles & Permissions')).toBeTruthy();
    expect(screen.queryByText('Withdrawals')).toBeNull();
  });

  it('handles collapsed state for FMCKSMCS sidebar', () => {
    mockTenant = {
      id: 'fmcksmcs',
      name: 'Federal Medical Centre Kumo Staff MPCS Ltd',
      theme: { logoUrl: '/fmck-logo.png' },
      features: {},
    };
    mockLayout.isSidebarCollapsed = true;

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    const sidebarEl = container.querySelector('.fmck-white-sidebar');
    expect(sidebarEl?.className).toContain('w-16');

    const expandBtn = screen.getByLabelText('Expand Sidebar');
    expect(expandBtn).toBeTruthy();
    fireEvent.click(expandBtn);
    expect(mockLayout.toggleSidebarCollapse).toHaveBeenCalledTimes(1);
  });

  it('handles mobile open state and triggers closeSidebar on backdrop/close click', () => {
    mockTenant = {
      id: 'fmcksmcs',
      name: 'Federal Medical Centre Kumo Staff MPCS Ltd',
      theme: { logoUrl: '/fmck-logo.png' },
      features: {},
    };
    mockLayout.isSidebarOpen = true;

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    // Sidebar should be translated in
    const sidebarEl = container.querySelector('.fmck-white-sidebar');
    expect(sidebarEl?.className).toContain('translate-x-0');

    // Mobile overlay should be present
    const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay!);
    expect(mockLayout.closeSidebar).toHaveBeenCalled();

    // Mobile close button should work
    const closeBtn = screen.getByLabelText('Close Sidebar');
    fireEvent.click(closeBtn);
    expect(mockLayout.closeSidebar).toHaveBeenCalled();
  });

  it('preserves dark theme for other (non-FMCK) tenants', () => {
    mockTenant = {
      id: 'iman-hq',
      name: 'IMAN Cooperative HQ',
      theme: {},
      features: {},
    };

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    const sidebarEl = container.querySelector('div.fixed.inset-y-0.left-0');
    expect(sidebarEl).toBeTruthy();
    expect(sidebarEl?.className).toContain('bg-gray-900');
    expect(sidebarEl?.className).toContain('text-white');
    expect(sidebarEl?.className).not.toContain('fmck-white-sidebar');
    expect(sidebarEl?.className).not.toContain('bg-white');

    // Active item on dark theme
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.className).toContain('bg-primary-600');
    expect(dashboardLink?.className).toContain('text-white');

    // Non-FMCK includes Roles and Withdrawals for admin
    expect(screen.getByText('Roles & Permissions')).toBeTruthy();
    expect(screen.getByText('Withdrawals')).toBeTruthy();
  });

  it('verifies dark-mode classes on FMCKSMCS sidebar and active items', () => {
    mockTenant = {
      id: 'fmcksmcs',
      name: 'Federal Medical Centre Kumo Staff MPCS Ltd',
      theme: { logoUrl: '/fmck-logo.png' },
      features: {},
    };

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    const sidebarEl = container.querySelector('.fmck-white-sidebar');
    expect(sidebarEl).toBeTruthy();
    // Verify dark mode class bindings
    expect(sidebarEl?.className).toContain('dark:border-border');

    // Header tenant title
    const headerTitle = screen.getByText('Federal Medical Centre Kumo Staff MPCS Ltd');
    expect(headerTitle.className).toContain('dark:text-white');

    // Active item has dark mode styling
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.className).toContain('dark:border-[#5cd674]');
    expect(dashboardLink?.className).toContain('dark:text-white');
  });
});

describe('Sidebar Member Module Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 2,
      role: 'member',
      name: 'Regular Member',
      psn: 'MEM001',
    };
    mockTenant = {
      id: 'fmcksmcs',
      name: 'Federal Medical Centre Kumo Staff MPCS Ltd',
      theme: { logoUrl: '/fmck-logo.png' },
      features: {},
    };
    mockPermissionsContext = {
      canAccess: (modKey: string) => false,
      can: (modKey: string, action?: string) => false,
      isAdmin: false,
      isLoading: false,
      permissions: {
        members: { read: false, write: false, edit: false, delete: false },
        loans: { read: false, write: false, edit: false, delete: false },
        contributions: { read: false, write: false, edit: false, delete: false },
        expenses: { read: false, write: false, edit: false, delete: false },
        settings: { read: false, write: false, edit: false, delete: false },
        reports: { read: false, write: false, edit: false, delete: false },
        user_management: { read: false, write: false, edit: false, delete: false },
      },
      roles: ['member'],
      refreshPermissions: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('renders only self-service items for regular members and strictly hides administrative modules', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    // Self-service member items MUST be visible
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByText('Cooperative Bylaws')).toBeTruthy();
    expect(screen.getByText('My Contributions')).toBeTruthy();
    expect(screen.getByText('My Loans')).toBeTruthy();
    expect(screen.getByText('My Guarantees')).toBeTruthy();
    expect(screen.getByText('Apply for Loan')).toBeTruthy();
    expect(screen.getByText('Support')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('My Profit Share')).toBeTruthy();

    // Administrative & executive modules MUST NOT be visible to regular member
    expect(screen.queryByText('Members')).toBeNull();
    expect(screen.queryByText('Member Applications')).toBeNull();
    expect(screen.queryByText('User Management')).toBeNull();
    expect(screen.queryByText('Roles & Permissions')).toBeNull();
    expect(screen.queryByText('Contributions')).toBeNull();
    expect(screen.queryByText('Loan Applications')).toBeNull();
    expect(screen.queryByText('Loans')).toBeNull();
    expect(screen.queryByText('Loan Repayments')).toBeNull();
    expect(screen.queryByText('Agreements')).toBeNull();
    expect(screen.queryByText('Layyah Management')).toBeNull();
    expect(screen.queryByText('Animal Requests')).toBeNull();
    expect(screen.queryByText('Expenses')).toBeNull();
    expect(screen.queryByText('Profit Sharing')).toBeNull();
    expect(screen.queryByText('Reports')).toBeNull();
    expect(screen.queryByText('Communication')).toBeNull();
    expect(screen.queryByText('Security Center')).toBeNull();
    expect(screen.queryByText('Receipt Designer')).toBeNull();
    expect(screen.queryByText('Document Designer')).toBeNull();
    expect(screen.queryByText('Settings')).toBeNull();
  });
});

