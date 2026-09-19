import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

export const Footer: React.FC = () => {
  const { tenant } = useTenant();
  const build = (__BUILD_SHA__ || '').slice(0, 7);
  return (
    <footer className="bg-card border-t border-border py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm text-foreground font-medium mb-1">
            © {new Date().getFullYear()} {tenant?.name || 'Cooperative Society'}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {tenant?.theme?.landingPage?.heroSubtitle || `Serving members of ${tenant?.name || 'the cooperative'}`}
          </p>
          <div className="flex justify-center items-center flex-wrap gap-4 text-xs">
            <div className="flex items-center space-x-1.5 text-primary-600 dark:text-primary-400">
              <CheckCircle className="w-4 h-4" />
              <span>Financial Integrity</span>
            </div>
            <div className="flex items-center space-x-1.5 text-primary-600 dark:text-primary-400">
              <CheckCircle className="w-4 h-4" />
              <span>Mutual Welfare</span>
            </div>
            <div className="flex items-center space-x-1.5 text-primary-600 dark:text-primary-400">
              <CheckCircle className="w-4 h-4" />
              <span>Profit Sharing</span>
            </div>
          </div>
          {build ? (
            <p className="mt-3 text-[11px] text-muted-foreground">Build: {build}</p>
          ) : null}
        </div>
      </div>
    </footer>
  );
};
