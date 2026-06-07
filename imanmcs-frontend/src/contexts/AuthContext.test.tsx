/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

const toastFn: any = Object.assign(vi.fn(() => 'toast-id'), {
  success: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn()
});

vi.mock('react-hot-toast', () => ({
  toast: toastFn,
  default: toastFn
}));

const mockAxiosInstance = {
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn()
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance)
  }
}));

describe('AuthProvider idle logout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    const hrefState = { value: '/dashboard' };
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/dashboard',
        get href() {
          return hrefState.value;
        },
        set href(v: string) {
          hrefState.value = v;
        }
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('warns near timeout and logs out after 1 minute of inactivity', async () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify({ id: '1', role: 'member' }));

    mockAxiosInstance.get.mockImplementation((url: string) => {
      if (url === '/health') return Promise.resolve({ data: { status: 'OK' } });
      if (url === '/auth/me') {
        return Promise.resolve({
          data: {
            user: {
              id: 1,
              psn: 'PSN001',
              name: 'Member One',
              email: 'm@test.local',
              role: 'member',
              is_default_password: false,
              status: 'active'
            }
          }
        });
      }
      return Promise.reject(new Error('unexpected'));
    });

    const { AuthProvider, useAuth } = await import('./AuthContext');

    const Probe = () => {
      const auth = useAuth();
      return <div>{auth.isAuthenticated ? 'yes' : 'no'}</div>;
    };

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await act(async () => {
      for (let i = 0; i < 8; i++) await Promise.resolve();
    });
    expect(screen.getByText('yes')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(51_000);
    });

    expect(toastFn).toHaveBeenCalled();
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/auth/session-events',
      expect.objectContaining({ event: 'idle_warning' })
    );

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    expect(localStorage.getItem('token')).toBe(null);
    expect(window.location.href).toBe('/login');
    expect(toastFn.error).toHaveBeenCalledWith('You were logged out due to inactivity.');
  });

  it('does not logout while user is active', async () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify({ id: '1', role: 'member' }));

    mockAxiosInstance.get.mockImplementation((url: string) => {
      if (url === '/health') return Promise.resolve({ data: { status: 'OK' } });
      if (url === '/auth/me') {
        return Promise.resolve({
          data: {
            user: {
              id: 1,
              psn: 'PSN001',
              name: 'Member One',
              email: 'm@test.local',
              role: 'member',
              is_default_password: false,
              status: 'active'
            }
          }
        });
      }
      return Promise.reject(new Error('unexpected'));
    });

    const { AuthProvider, useAuth } = await import('./AuthContext');

    const Probe = () => {
      const auth = useAuth();
      return <div>{auth.isAuthenticated ? 'yes' : 'no'}</div>;
    };

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await act(async () => {
      for (let i = 0; i < 8; i++) await Promise.resolve();
    });
    expect(screen.getByText('yes')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(40_000);
    });

    await act(async () => {
      window.dispatchEvent(new Event('mousemove'));
    });

    await act(async () => {
      vi.advanceTimersByTime(40_000);
    });

    expect(localStorage.getItem('token')).toBe('t');
  });
});
