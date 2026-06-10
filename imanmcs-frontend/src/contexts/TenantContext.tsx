import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

interface TenantTheme {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

interface TenantConfig {
  id: string;
  name?: string;
  cooperative_type: 'islamic' | 'conventional';
  theme: TenantTheme;
  features: Record<string, boolean>;
}

interface TenantContextValue {
  tenant: TenantConfig | null;
  isLoading: boolean;
  error: string | null;
  hasFeature: (featureName: string) => boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  isLoading: true,
  error: null,
  hasFeature: () => true,
});

// Utility to convert HEX to HSL format expected by Tailwind
const hexToHslString = (hex: string) => {
  // Remove hash
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenantConfig = async () => {
      try {
        const apiUrl = API_URL || 'http://localhost:3001';
        const response = await axios.get(`${apiUrl}/tenant/config`, { withCredentials: true });
        
        if (response.data.success && response.data.data) {
          const config = response.data.data;
          setTenant(config);

          // Apply Theme to Document
          if (config.theme?.primaryColor) {
            document.documentElement.style.setProperty('--primary', hexToHslString(config.theme.primaryColor));
          }
          if (config.theme?.secondaryColor) {
            document.documentElement.style.setProperty('--secondary', hexToHslString(config.theme.secondaryColor));
          }
        } else {
          setError('Failed to load tenant configuration');
        }
      } catch (err: any) {
        console.error('Error fetching tenant config:', err);
        setError(err.message || 'Error fetching tenant config');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantConfig();
  }, []);

  const hasFeature = (featureName: string) => {
    if (!tenant || !tenant.features) return true; // Default to true if not configured
    return tenant.features[featureName] !== false; // Only disable if explicitly false
  };

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error, hasFeature }}>
      {/* 
        You might want to show a loading screen while fetching tenant config,
        so the app doesn't render with default colors and then flash to tenant colors.
      */}
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        children
      )}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
