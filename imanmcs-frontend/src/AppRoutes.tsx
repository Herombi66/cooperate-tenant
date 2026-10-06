import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { usePermissions } from './contexts/PermissionContext';
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
import { BylawsPage } from './pages/BylawsPage';

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

const ModuleRouteGuard: React.FC<{
  moduleKey?: string;
  allowedRoles?: string[];
  children: React.ReactNode;
}> = ({ moduleKey, allowedRoles, children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { canAccess, isAdmin, isLoading: isPermLoading } = usePermissions();

  if (isAuthLoading || isPermLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins and Super Admins have unrestricted system access
  if (isAdmin || user.role === 'admin' || user.role === 'super_admin') {
    return <>{children}</>;
  }

  // Ordinary members are strictly restricted to personal information and self-service
  if (user.role === 'member') {
    return <Navigate to="/dashboard" replace />;
  }

  // Specific role exemptions (e.g. chairman, auditor)
  if (allowedRoles && allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  // RBAC dynamic module read permission check
  if (moduleKey && canAccess(moduleKey)) {
    return <>{children}</>;
  }

  // Deny access for unauthorized users (redirect to dashboard)
  return <Navigate to="/dashboard" replace />;
};

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === 'member') {
    return <MemberDashboard />;
  }

  // All administrative, leadership, and officer roles view the realtime cooperative statistics overview
  return <DashboardPage />;
};

const WithdrawalsRouter: React.FC = () => {
  const { user } = useAuth();
  const { hasFeature } = useTenant();
  const { canAccess, isAdmin } = usePermissions();

  if (!hasFeature('withdrawals')) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user?.role === 'member') return <WithdrawalsPage />;
  if (isAdmin || user?.role === 'admin' || user?.role === 'super_admin' || canAccess('savings')) {
    return <WithdrawalsAdminPage />;
  }
  return <Navigate to="/dashboard" replace />;
};

const RolesRouter: React.FC = () => {
  const { user } = useAuth();
  const { canAccess, isAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const hasAccess = isAdmin || canAccess('user_management') || user?.role === 'admin' || user?.role === 'super_admin';
  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }
  return <RolesPage />;
};

const LoanApplicationsRouter: React.FC = () => {
  const { user } = useAuth();

  // If ordinary member accesses /loan-applications, direct them to My Loans & Applications
  if (user?.role === 'member') {
    return <Navigate to="/my-loans" replace />;
  }

  return (
    <ModuleRouteGuard moduleKey="loan_applications">
      <LoanApplicationsPage />
    </ModuleRouteGuard>
  );
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
              <ModuleRouteGuard moduleKey="documents">
                <AgreementManagementPage />
              </ModuleRouteGuard>
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
              <ModuleRouteGuard moduleKey="notifications">
                <CommunicationPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/bylaws"
        element={
          <AppLayout>
            <ProtectedRoute>
              <BylawsPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route path="/bylaw" element={<Navigate to="/bylaws" replace />} />
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
              <ModuleRouteGuard moduleKey="expenses">
                <ExpensesPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/members"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="members">
                <MembersPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/contributions"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="contributions">
                <ContributionsPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/loans"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="loans">
                <LoansPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/profit-sharing"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="profit_distribution">
                <ProfitSharingPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/reports"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="reports">
                <ReportsPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="settings">
                <SettingsPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/loan-repayments"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="repayments">
                <LoanRepaymentPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/member-applications"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="member_applications">
                <MemberApplicationsPage />
              </ModuleRouteGuard>
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
              <LoanApplicationsRouter />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/loan-approvals"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="loan_applications" allowedRoles={['chairman', 'admin', 'super_admin']}>
                <LoanApprovalsPage />
              </ModuleRouteGuard>
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
              <ModuleRouteGuard moduleKey="investments">
                <AdminLayyahManagement />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/admin-animal-requests"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="investments">
                <AdminAnimalRequestsPage />
              </ModuleRouteGuard>
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
              <ModuleRouteGuard moduleKey="user_management">
                <UserManagementPage />
              </ModuleRouteGuard>
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
              <ModuleRouteGuard moduleKey="documents">
                <ReceiptDesignerPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/settings/receipt-designer"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="documents">
                <ReceiptDesignerPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/document-designer"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="documents">
                <DocumentDesignerPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/settings/document-designer"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="documents">
                <DocumentDesignerPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/security-center"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit">
                <SecurityCenterPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/transactions"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorTransactionsPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/members"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorMemberAuditPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/member-statements"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorMemberAuditPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/loans"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorLoansPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/contributions"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorContributionsPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/investments"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorInvestmentsPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/profit-distribution"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorProfitPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/income-expenses"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorIncomeExpensesPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/reconciliation"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorReconciliationPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/exceptions"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorExceptionsPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/activity-logs"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorActivityLogsPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/notes"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorNotesPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/auditor/reports"
        element={
          <AppLayout>
            <ProtectedRoute>
              <ModuleRouteGuard moduleKey="audit" allowedRoles={['auditor', 'state_auditor']}>
                <AuditorReportsPage />
              </ModuleRouteGuard>
            </ProtectedRoute>
          </AppLayout>
        }
      />

      {/* Dynamic Tenant Landing Page Route (e.g. /habu, /tafida, /kumo, /al-mansur) */}
      <Route path="/:tenantSlug" element={<TenantLandingPage />} />
    </Routes>
  );
};
