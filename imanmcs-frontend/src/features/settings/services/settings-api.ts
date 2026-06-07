
import axios from 'axios';
import type { TenantSettings } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/**
 * Settings API Service
 */
export const settingsApi = {
  /**
   * Get current tenant settings
   */
  async getSettings(): Promise&lt;TenantSettings&gt; {
    const response = await apiClient.get('/settings');
    if (response.data.success) {
      return response.data.settings;
    }
    throw new Error(response.data.message || 'Failed to get settings');
  },

  /**
   * Get default settings
   */
  async getDefaultSettings(): Promise&lt;TenantSettings&gt; {
    const response = await apiClient.get('/settings/defaults');
    if (response.data.success) {
      return response.data.settings;
    }
    throw new Error(response.data.message || 'Failed to get default settings');
  },

  /**
   * Update settings
   */
  async updateSettings(settings: Partial&lt;TenantSettings&gt;): Promise&lt;TenantSettings&gt; {
    const response = await apiClient.put('/settings', settings);
    if (response.data.success) {
      return response.data.settings;
    }
    throw new Error(response.data.message || 'Failed to update settings');
  },

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise&lt;TenantSettings&gt; {
    const response = await apiClient.post('/settings/reset');
    if (response.data.success) {
      return response.data.settings;
    }
    throw new Error(response.data.message || 'Failed to reset settings');
  },
};
