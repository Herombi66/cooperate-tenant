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
  config.headers = config.headers || {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach active tenant ID so backend always accurately scopes templates, documents, and receipts
  const storedTenant = localStorage.getItem('previewTenantId') || localStorage.getItem('tenant_id') || localStorage.getItem('currentTenant');
  if (storedTenant) {
    const cleanTid = storedTenant.toLowerCase().trim();
    config.headers['x-tenant-id'] = (cleanTid === 'fmcksmcs' || cleanTid === 'fmck') ? 'fmcksmcs' : cleanTid;
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
        const tenantParam = localStorage.getItem('previewTenantId') || localStorage.getItem('tenant_id');
        const isFmck = tenantParam?.toLowerCase() === 'fmcksmcs' || tenantParam?.toLowerCase() === 'fmck';
        const resolvedTenant = isFmck ? 'fmcksmcs' : (tenantParam && tenantParam !== 'default' ? tenantParam : '');
        localStorage.removeItem('token');
        const loginUrl = resolvedTenant ? `/login?tenant=${encodeURIComponent(resolvedTenant)}` : '/login';
        window.location.href = loginUrl;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
