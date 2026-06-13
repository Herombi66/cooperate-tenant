import React, { Suspense, lazy, useMemo } from 'react';

export const useTenantSlug = () => {
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
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent shadow-md"></div>
    <p className="mt-4 text-sm font-medium text-gray-500 animate-pulse">
      Loading workspace...
    </p>
  </div>
);

export const TenantLandingPage: React.FC = () => {
  const slug = useTenantSlug();

  const LandingPageComponent = useMemo(() => {
    return lazy(() => 
      import(`./landing-pages/${slug}.tsx`)
        .catch((error) => {
          if (import.meta.env?.DEV || process.env.NODE_ENV === 'development') {
             console.warn(`[Router] Custom landing page for '${slug}' not found. Loading default template.`);
          }
          return import('./landing-pages/DefaultLandingPage.tsx');
        })
    );
  }, [slug]);

  return (
    <Suspense fallback={<LandingPageLoader />}>
      <LandingPageComponent />
    </Suspense>
  );
};
