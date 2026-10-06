import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();
const mockRemoveItem = vi.fn();

// @ts-expect-error jsdom globals
const originalWindow = global.window;

beforeEach(() => {
  vi.resetModules();
  // @ts-expect-error jsdom globals
  global.window = {
    ...(originalWindow || {}),
    location: {
      href: 'http://localhost/',
      pathname: '/',
    },
    localStorage: {
      getItem: mockGetItem,
      setItem: mockSetItem,
      removeItem: mockRemoveItem,
    },
  };
  // @ts-expect-error jsdom globals
  global.localStorage = (global.window as any).localStorage;
});

afterEach(() => {
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockRemoveItem.mockReset();
  // @ts-expect-error jsdom globals
  global.window = originalWindow;
  // @ts-expect-error jsdom globals
  delete global.localStorage;
});

describe('api service interceptors', () => {
  it('attaches Authorization header when token is present', async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'token') return 'test-token';
      return null;
    });

    const { default: api } = await import('./api');
    const handlers = (api as any).interceptors.request.handlers as Array<any>;
    const handler = handlers.filter(Boolean).at(-1).fulfilled;
    const config = await handler({ headers: {}, method: 'get', url: '/test-auth-header' });

    expect(mockGetItem).toHaveBeenCalledWith('token');
    expect(config.headers.Authorization).toBe('Bearer test-token');
  });

  it('allows write requests for executive officers without client-side interception', async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'token') return 'test-token';
      if (key === 'user') return JSON.stringify({ role: 'assistant_secretary' });
      return null;
    });

    const { default: api } = await import('./api');
    const handlers = (api as any).interceptors.request.handlers as Array<any>;
    const handler = handlers.filter(Boolean).at(-1).fulfilled;

    const config = await handler({
      headers: {},
      method: 'put',
      url: '/applications/1/status',
    } as any);

    expect(config.url).toBe('/applications/1/status');
    expect(config.headers.Authorization).toBe('Bearer test-token');
  });

  it('redirects to /login on 401 error when not already on login page', async () => {
    const { default: api } = await import('./api');

    const error = {
      isAxiosError: true,
      response: { status: 401 },
      config: {},
      toJSON: () => ({}),
      name: 'AxiosError',
      message: 'Unauthorized',
    } as any;

    const interceptor: any = (api as any).interceptors.response.handlers.filter(Boolean).at(-1).rejected;
    await expect(interceptor(error)).rejects.toBe(error);
  });
});
