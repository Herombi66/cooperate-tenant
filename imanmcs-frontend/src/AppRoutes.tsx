import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/Layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { MembersPage } from './pages/MembersPage';
import { ContributionsPage } from './pages/ContributionsPage';
import { LoansPage } from './pages/LoansPage';
import { ProfitSharingPage } from './pages/ProfitSharingPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { MemberApplicationsPage } from './pages/MemberApplicationsPage';
import { LoanRepaymentPage } from './pages/LoanRepaymentPage';
import { MemberDashboard } from './pages/MemberDashboard';
import { MemberProfile } from './pages/MemberProfile';
import { MyContributions } from './pages/MyContributions';
import { MyLoans } from './pages/MyLoans';
import { MyGuarantees } from './pages/MyGuarantees';
import ApplyForLoan from './pages/ApplyForLoan';
import { MyProfitShare } from './pages/MyProfitShare';
import { TreasurerDashboard } from './pages/TreasurerDashboard';
import LoanApplicationsPage from './pages/LoanApplicationsPage';
import { ChairmanDashboard } from './pages/ChairmanDashboard';
import { LoanApprovalsPage } from './pages/LoanApprovalsPage';
import { MyLayyahApplications } from './pages/MyLayyahApplications';
import { AdminLayyahManagement } from './pages/AdminLayyahManagement';
import { AdminAnimalRequestsPage } from './pages/AdminAnimalRequestsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MemberApplicationPage } from './pages/MemberApplicationPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AgreementManagementPage } from './pages/AgreementManagementPage';
import { ChangePassword } from './pages/ChangePassword';
import LayyahGroupsHubPage from './pages/LayyahGroupsHubPage';
import { LayyahGroupDetailsPage } from './pages/LayyahGroupDetailsPage';
import { SupportPage } from './pages/SupportPage';
import { CommunicationPage } from './pages/CommunicationPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { WithdrawalsAdminPage } from './pages/WithdrawalsAdminPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Debug log to ensure location is defined
  // console.log('ProtectedRoute location:', location);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has a default password - redirect to change password first
  // Exclude admin from forced password change
  if (user.isDefaultPassword && location?.pathname !== '/change-password' && user.role !== 'admin') {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
};

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === 'member') {
    return <MemberDashboard />;
  }

  if (user?.role === 'treasurer') {
    return <TreasurerDashboard />;
  }

  if (user?.role === 'chairman') {
    return <ChairmanDashboard />;
  }

  // For admin or super_admin - use the original dashboard
  return <DashboardPage />;
};

const WithdrawalsRouter: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'member') return <WithdrawalsPage />;
  return <WithdrawalsAdminPage />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes - no layout */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/apply-membership" element={<MemberApplicationPage />} />

      {/* Protected routes with layout */}
      <Route
        path="/agreements"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AgreementManagementPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/change-password"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/dashboard"
        element={
          <AppLayout>
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          </AppLayout>
        }
      />

      <Route
        path="/support"
        element={
          <AppLayout>
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/communication"
        element={
          <AppLayout>
            <ProtectedRoute>
              <CommunicationPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/withdrawals"
        element={
          <AppLayout>
            <ProtectedRoute>
              <WithdrawalsRouter />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/expenses"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ExpensesPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/members"
        element={
          <AppLayout>
            <ProtectedRoute>
              <MembersPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/contributions"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ContributionsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/loans"
        element={
          <AppLayout>
            <ProtectedRoute>
              <LoansPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/profit-sharing"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ProfitSharingPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/reports"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <AppLayout>
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/loan-repayments"
        element={
          <AppLayout>
            <ProtectedRoute>
              <LoanRepaymentPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/member-applications"
        element={
          <AppLayout>
            <ProtectedRoute>
              <MemberApplicationsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/profile"
        element={
          <AppLayout>
            <ProtectedRoute>
              <MemberProfile />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/my-contributions"
        element={
          <AppLayout>
            <ProtectedRoute>
              <MyContributions />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/my-loans"
        element={
          <AppLayout>
            <ProtectedRoute>
              <MyLoans />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/my-guarantees"
        element={
          <AppLayout>
            <ProtectedRoute>
              <MyGuarantees />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/apply-loan"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ApplyForLoan />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/my-profit-share"
        element={
          <AppLayout>
            <ProtectedRoute>
              <MyProfitShare />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/loan-applications"
        element={
          <AppLayout>
            <ProtectedRoute>
              <LoanApplicationsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/loan-approvals"
        element={
          <AppLayout>
            <ProtectedRoute>
              <LoanApprovalsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/my-layyah"
        element={
          <AppLayout>
            <ProtectedRoute>
              <MyLayyahApplications />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/browse-layyah"
        element={
          <AppLayout>
            <ProtectedRoute>
              <LayyahGroupsHubPage defaultTab="browse" />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/admin-layyah"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AdminLayyahManagement />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/admin-animal-requests"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AdminAnimalRequestsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/my-layyah-groups"
        element={
          <AppLayout>
            <ProtectedRoute>
              <LayyahGroupsHubPage defaultTab="my" />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/my-layyah/groups/:groupId"
        element={
          <AppLayout>
            <ProtectedRoute>
              <LayyahGroupDetailsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/notifications"
        element={
          <AppLayout>
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/user-management"
        element={
          <AppLayout>
            <ProtectedRoute>
              <UserManagementPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
    </Routes>
  );
};
