const getDynamicApiUrl = () => {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    // If we are locally testing a custom domain (e.g. imanabuja.com), use that domain for the API as well
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3001`;
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }
  // Production fallback:
  // If VITE_API_URL is explicitly set, use it. Otherwise, use '/api' for same-origin Nginx reverse proxy.
  return import.meta.env.VITE_API_URL || '/api';
};

export const API_URL = getDynamicApiUrl();
export const APP_NAME = 'IMAN Cooperative System';
