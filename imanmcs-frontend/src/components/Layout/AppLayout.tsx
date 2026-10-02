import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { TourProvider } from '../../contexts/TourContext';
import { FmckTourGuide } from '../Tour/FmckTourGuide';

const AppLayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const { isSidebarCollapsed } = useLayout();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Special layout for change password page - no header/sidebar
  if (location.pathname === '/change-password' || (user.isDefaultPassword && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <FmckTourGuide />
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <TourProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </TourProvider>
  );
};
