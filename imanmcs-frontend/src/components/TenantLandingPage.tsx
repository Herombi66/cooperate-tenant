import React, { Suspense, lazy, useMemo, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';

// Automatically index all tenant landing pages using Vite's glob import
const landingPageModules = import.meta.glob('./landing-pages/*.tsx');

// Reserved application routes that should never be treated as tenant slugs
const RESERVED_ROUTES = [
  'login', 'platform', 'agreements', 'change-password', 'dashboard',
  'support', 'communication', 'withdrawals', 'expenses', 'members',
  'contributions', 'loans', 'profit-sharing', 'reports', 'settings',
  'loan-repayments', 'member-applications', 'profile', 'my-contributions',
  'my-loans', 'my-guarantees', 'apply-loan', 'my-profit-share',
  'loan-applications', 'loan-approvals', 'my-layyah', 'browse-layyah',
  'admin-layyah', 'admin-animal-requests', 'my-layyah-groups',
  'notifications', 'user-management', 'roles', 'apply-membership',
  'health', 'api'
];

export const useTenantSlug = () => {
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const queryTenant = searchParams.get('tenant');

  // 1. Explicit path parameter (e.g. /habu, /tenant/habu, /t/habu)
  if (tenantSlug && tenantSlug !== 'default' && !RESERVED_ROUTES.includes(tenantSlug.toLowerCase())) {
    return tenantSlug.toLowerCase();
  }

  // 2. Explicit query parameter (e.g. ?tenant=habu)
  if (queryTenant && queryTenant !== 'default') {
    return queryTenant.toLowerCase();
  }

  // 3. Subdomain on custom domain (e.g. habu.imanmcs.com)
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'www') {
      return parts[0].toLowerCase();
    }
  }

  // 4. Default to 'default' when no specific tenant is requested
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
  const { tenant, setTenantId, refreshTenant } = useTenant();

  // Synchronize tenant context when viewing a tenant's landing page
  useEffect(() => {
    if (slug && slug !== 'default' && tenant?.id !== slug) {
      setTenantId(slug);
      refreshTenant(slug);
    }
  }, [slug, tenant?.id, setTenantId, refreshTenant]);

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
