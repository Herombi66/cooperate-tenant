import React, { Suspense, lazy, useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';

// Automatically index all tenant landing pages using Vite's glob import
const landingPageModules = import.meta.glob('./landing-pages/*.tsx');

export const useTenantSlug = () => {
  const { tenant } = useTenant();
  const searchParams = new URLSearchParams(window.location.search);
  const queryTenant = searchParams.get('tenant');
  
  if (queryTenant) return queryTenant;
  
  const storedTenant = localStorage.getItem('previewTenantId') || localStorage.getItem('tenant_id');
  if (storedTenant && storedTenant !== 'default') return storedTenant;

  if (tenant?.id && tenant.id !== 'default') {
    return tenant.id;
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'default'; 
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return 'default';
};

const LandingPageLoader = () => (
  <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent shadow-md"></div>
    <p className="mt-4 text-sm font-medium text-gray-500 animate-pulse">
      Loading workspace...
    </p>
  </div>
);

export const TenantLandingPage: React.FC = () => {
  const slug = useTenantSlug();

  const LandingPageComponent = useMemo(() => {
    const targetPath = `./landing-pages/${slug}.tsx`;
    const defaultPath = './landing-pages/DefaultLandingPage.tsx';

    const loader = landingPageModules[targetPath] || landingPageModules[defaultPath];

    if (!loader) {
      return lazy(() => import('./landing-pages/DefaultLandingPage.tsx'));
    }

    return lazy(loader as any);
  }, [slug]);

  return (
    <Suspense fallback={<LandingPageLoader />}>
      <LandingPageComponent />
    </Suspense>
  );
};
