import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config';
import { tSystemStatic } from '../i18n/systemMessages';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  const userRaw = localStorage.getItem('user');
  if (userRaw) {
    try {
      const user = JSON.parse(userRaw) as { role?: string };
      const role = (user.role || (user as any).user_role || '').toString().trim().toLowerCase();
      const method = (config.method || 'get').toLowerCase();
      const isWrite = method !== 'get' && method !== 'head' && method !== 'options';
      const url = config.url || '';
      const isAllowedWrite =
        (method === 'put' && (url.startsWith('/auth/change-password') || url.startsWith('/auth/profile'))) ||
        (method === 'patch' && url.startsWith('/auth/profile'));

      if (role === 'secretary' && isWrite && !isAllowedWrite) {
        return Promise.reject(new Error(tSystemStatic('viewOnlyWriteDisabled')));
      }
    } catch {}
  }

  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on login page to avoid loops or bad UX
      if (!window.location.pathname.includes('/login')) {
          localStorage.removeItem('token');
          window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
