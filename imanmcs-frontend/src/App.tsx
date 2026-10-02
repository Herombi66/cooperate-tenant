import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TenantProvider } from './contexts/TenantContext';
import { AppRoutes } from './AppRoutes';
import './index.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <ThemeProvider>
          <LoadingProvider>
            <AuthProvider>
              <PermissionProvider>
                <Router>
                  <LayoutProvider>
                    <AppRoutes />
                    <Toaster position="top-right" />
                  </LayoutProvider>
                </Router>
              </PermissionProvider>
            </AuthProvider>
          </LoadingProvider>
        </ThemeProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}

export default App;
