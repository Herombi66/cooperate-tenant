import React from 'react';
import { CheckCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  const build = (__BUILD_SHA__ || '').slice(0, 7);
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            © 2026 FCNACONSGM Cooperative Society
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Serving Fellowship of Christian Nurses Alumni, College of Nursing Sciences Gombe Multipurpose Cooperative Society Limited
          </p>
          <div className="flex justify-center items-center space-x-6 text-xs">
            <div className="flex items-center space-x-1 text-primary-600">
              <CheckCircle className="w-4 h-4" />
              <span>Biblical principle</span>
            </div>
            <div className="flex items-center space-x-1 text-primary-600">
              <CheckCircle className="w-4 h-4" />
              <span></span>
            </div>
            <div className="flex items-center space-x-1 text-primary-600">
              <CheckCircle className="w-4 h-4" />
              <span>Profit Sharing</span>
            </div>
          </div>
          {build ? (
            <p className="mt-3 text-[11px] text-gray-400">Build: {build}</p>
          ) : null}
        </div>
      </div>
    </footer>
  );
};
