/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';

let mockUser: any = {
  id: 1,
  role: 'member',
  name: 'Test Member',
  isDefaultPassword: false,
};

let mockPermissions = {
  canAccess: (modKey: string) => false,
  can: (modKey: string) => false,
  isAdmin: false,
  isLoading: false,
  permissions: {},
  roles: ['member'],
  refreshPermissions: vi.fn(),
};

vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: !!mockUser,
  }),
}));

vi.mock('./contexts/PermissionContext', () => ({
  usePermissions: () => mockPermissions,
}));

vi.mock('./contexts/TenantContext', () => ({
  useTenant: () => ({
    tenant: { id: 'fmcksmcs', name: 'FMCKSMCS', features: {} },
    hasFeature: () => true,
  }),
}));

vi.mock('./contexts/LayoutContext', () => ({
  useLayout: () => ({
    isSidebarOpen: false,
    isSidebarCollapsed: false,
    toggleSidebar: vi.fn(),
    toggleSidebarCollapse: vi.fn(),
    closeSidebar: vi.fn(),
  }),
}));

vi.mock('./contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('./components/Tour/FmckTourGuide', () => ({
  FmckTourGuide: () => null,
}));

vi.mock('./components/Layout/AppLayout', () => ({
  AppLayout: ({ children }: any) => <div data-testid="app-layout">{children}</div>,
}));

// Mock page components to verify routing
vi.mock('./pages/MemberDashboard', () => ({
  MemberDashboard: () => <div data-testid="member-dashboard">Member Dashboard</div>,
}));

vi.mock('./pages/DashboardPage', () => ({
  DashboardPage: () => <div data-testid="admin-dashboard">Admin Dashboard</div>,
}));

vi.mock('./pages/MembersPage', () => ({
  MembersPage: () => <div data-testid="members-page">Members Admin Page</div>,
}));

vi.mock('./pages/LoansPage', () => ({
  LoansPage: () => <div data-testid="loans-page">Loans Admin Page</div>,
}));

vi.mock('./pages/MyLoans', () => ({
  MyLoans: () => <div data-testid="my-loans-page">My Personal Loans</div>,
}));

vi.mock('./pages/SettingsPage', () => ({
  SettingsPage: () => <div data-testid="settings-page">Settings Page</div>,
}));

describe('AppRoutes Route Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 1,
      role: 'member',
      name: 'Test Member',
      isDefaultPassword: false,
    };
    mockPermissions = {
      canAccess: () => false,
      can: () => false,
      isAdmin: false,
      isLoading: false,
      permissions: {},
      roles: ['member'],
      refreshPermissions: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects regular member trying to access /members to /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/members']}>
        <AppRoutes />
      </MemoryRouter>
    );

    // Should redirect to dashboard and show MemberDashboard
    expect(screen.queryByTestId('members-page')).toBeNull();
    expect(screen.getByTestId('member-dashboard')).toBeTruthy();
  });

  it('redirects regular member trying to access /loans to /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/loans']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('loans-page')).toBeNull();
    expect(screen.getByTestId('member-dashboard')).toBeTruthy();
  });

  it('redirects regular member trying to access /settings to /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('settings-page')).toBeNull();
    expect(screen.getByTestId('member-dashboard')).toBeTruthy();
  });

  it('allows regular member to access their self-service /my-loans page', () => {
    render(
      <MemoryRouter initialEntries={['/my-loans']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByTestId('my-loans-page')).toBeTruthy();
  });

  it('allows administrator to access /members page', () => {
    mockUser = {
      id: 99,
      role: 'admin',
      name: 'System Admin',
      isDefaultPassword: false,
    };
    mockPermissions = {
      canAccess: () => true,
      can: () => true,
      isAdmin: true,
      isLoading: false,
      permissions: {},
      roles: ['admin'],
      refreshPermissions: vi.fn(),
    };

    render(
      <MemoryRouter initialEntries={['/members']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByTestId('members-page')).toBeTruthy();
  });
});
