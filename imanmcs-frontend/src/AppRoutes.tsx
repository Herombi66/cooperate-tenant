import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useTenant } from './contexts/TenantContext';
import { AppLayout } from './components/Layout/AppLayout';
import { TenantLandingPage } from './components/TenantLandingPage';
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
import { RolesPage } from './pages/RolesPage';
import { PlatformLoginPage } from './pages/PlatformLoginPage';
import { PlatformAdminDashboard } from './pages/PlatformAdminDashboard';
import { LandingPageEditor } from './pages/LandingPageEditor';
import { DocumentDesignerPage } from './pages/DocumentDesignerPage';
import { ReceiptDesignerPage } from './pages/ReceiptDesignerPage';
import { SecurityCenterPage } from './pages/SecurityCenterPage';
import { VerifyAgreementPage } from './pages/VerifyAgreementPage';
import { VerifyReceiptPage } from './pages/VerifyReceiptPage';
import { AuditorTransactionsPage } from './pages/auditor/AuditorTransactionsPage';
import { AuditorMemberAuditPage } from './pages/auditor/AuditorMemberAuditPage';
import { AuditorLoansPage } from './pages/auditor/AuditorLoansPage';
import { AuditorContributionsPage } from './pages/auditor/AuditorContributionsPage';
import { AuditorInvestmentsPage } from './pages/auditor/AuditorInvestmentsPage';
import { AuditorProfitPage } from './pages/auditor/AuditorProfitPage';
import { AuditorIncomeExpensesPage } from './pages/auditor/AuditorIncomeExpensesPage';
import { AuditorReconciliationPage } from './pages/auditor/AuditorReconciliationPage';
import { AuditorExceptionsPage } from './pages/auditor/AuditorExceptionsPage';
import { AuditorActivityLogsPage } from './pages/auditor/AuditorActivityLogsPage';
import { AuditorNotesPage } from './pages/auditor/AuditorNotesPage';
import { AuditorReportsPage } from './pages/auditor/AuditorReportsPage';

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
  const { tenant } = useTenant();
  const isFmcksmcs = tenant?.id?.toLowerCase() === 'fmcksmcs' || 
    (typeof window !== 'undefined' && (
      new URLSearchParams(window.location.search).get('tenant')?.toLowerCase() === 'fmcksmcs' || 
      localStorage.getItem('previewTenantId')?.toLowerCase() === 'fmcksmcs'
    )) ||
    (tenant?.name?.toLowerCase().includes('kumo') ?? false);

  if (isFmcksmcs) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user?.role === 'member') return <WithdrawalsPage />;
  return <WithdrawalsAdminPage />;
};

const RolesRouter: React.FC = () => {
  const { tenant } = useTenant();
  const isFmcksmcs = tenant?.id?.toLowerCase() === 'fmcksmcs' || 
    (typeof window !== 'undefined' && (
      new URLSearchParams(window.location.search).get('tenant')?.toLowerCase() === 'fmcksmcs' || 
      localStorage.getItem('previewTenantId')?.toLowerCase() === 'fmcksmcs'
    )) ||
    (tenant?.name?.toLowerCase().includes('kumo') ?? false);

  if (isFmcksmcs) {
    return <Navigate to="/dashboard" replace />;
  }

  return <RolesPage />;
};

export const AppRoutes: React.FC = () => {
  const { hasFeature } = useTenant();

  return (
    <Routes>
      {/* Public routes - no layout */}
      <Route path="/" element={hasFeature('landing_page') ? <TenantLandingPage /> : <Navigate to="/login" replace />} />
      <Route path="/tenant/:tenantSlug" element={<TenantLandingPage />} />
      <Route path="/t/:tenantSlug" element={<TenantLandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/platform/login" element={<PlatformLoginPage />} />
      <Route path="/platform/dashboard" element={<PlatformAdminDashboard />} />
      <Route path="/platform/tenants/:tenantId/landing-page" element={<LandingPageEditor />} />
      <Route path="/apply-membership" element={<MemberApplicationPage />} />
      <Route path="/verify-receipt/:receiptNumber" element={<VerifyReceiptPage />} />
      <Route path="/receipts/verify/:receiptNumber" element={<VerifyReceiptPage />} />
      <Route path="/verify/agreement/:agreementRef" element={<VerifyAgreementPage />} />
      <Route path="/verify-agreement/:agreementRef" element={<VerifyAgreementPage />} />

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
      <Route path="/withdrawal" element={<Navigate to="/withdrawals" replace />} />
      <Route path="/finance/withdrawals" element={<Navigate to="/withdrawals" replace />} />
      <Route path="/member/withdrawals" element={<Navigate to="/withdrawals" replace />} />
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
      <Route
        path="/roles"
        element={
          <AppLayout>
            <ProtectedRoute>
              <RolesRouter />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/receipt-designer"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ReceiptDesignerPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/settings/receipt-designer"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ReceiptDesignerPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/document-designer"
        element={
          <AppLayout>
            <ProtectedRoute>
              <DocumentDesignerPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/settings/document-designer"
        element={
          <AppLayout>
            <ProtectedRoute>
              <DocumentDesignerPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/security-center"
        element={
          <AppLayout>
            <ProtectedRoute>
              <SecurityCenterPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/transactions"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorTransactionsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/members"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorMemberAuditPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/member-statements"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorMemberAuditPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/loans"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorLoansPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/contributions"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorContributionsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/investments"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorInvestmentsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/profit-distribution"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorProfitPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/income-expenses"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorIncomeExpensesPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/reconciliation"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorReconciliationPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/exceptions"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorExceptionsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/activity-logs"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorActivityLogsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/notes"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorNotesPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/reports"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AuditorReportsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />

      {/* Dynamic Tenant Landing Page Route (e.g. /habu, /tafida, /kumo, /al-mansur) */}
      <Route path="/:tenantSlug" element={<TenantLandingPage />} />
    </Routes>
  );
};
