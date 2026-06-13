import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

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

  // Allow access to children even if not logged in? 
  // The previous App.tsx logic was a bit mixed.
  // It wrapped protected routes in <AppLayout><ProtectedRoute>...</ProtectedRoute></AppLayout>
  // So AppLayout itself shouldn't redirect if it's just a layout wrapper, but usually it implies auth.
  // However, the previous code had:
  /*
  if (!user) {
    return <>{children}</>;
  }
  */
  // Which implies if not user, just render children (likely Login page or something, but Login page doesn't use AppLayout).
  // Wait, looking at App.tsx:
  /*
  <Route path="/login" element={<LoginPage />} />
  <Route path="/dashboard" element={<AppLayout><ProtectedRoute>...</ProtectedRoute></AppLayout>} />
  */
  // So AppLayout is ONLY used for protected routes.
  // So checking !user here is actually redundant if ProtectedRoute handles it, or it's a double check.
  // But let's stick to the previous logic but cleaned up.
  
  // Actually, let's make AppLayout enforce auth implicitly or just be a layout.
  // If I want "Holistic Perfection", Layout should just be Layout. Auth checks belong in Auth Guard.
  
  if (!user) {
      // If used on a protected route, user should exist.
      // If we are loading, we handled it.
      // If not loading and no user, we should probably redirect or let ProtectedRoute handle it.
      // But since Sidebar/Header require user, we can't render them without user.
      return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Special layout for change password page - no header/sidebar
  // Exclude admin from forced layout change unless they are explicitly on the change-password page
  if (location.pathname === '/change-password' || (user.isDefaultPassword && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
  return <AppLayoutContent>{children}</AppLayoutContent>;
};
