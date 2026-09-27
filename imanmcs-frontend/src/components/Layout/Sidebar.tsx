import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Users, DollarSign, CreditCard, TrendingUp,
  Settings, FileText, ChevronLeft, ChevronRight, Receipt, Upload, UserPlus, Heart, Shield, Bell, X, CheckCircle, Percent, MessageSquare, ShoppingCart, ShieldAlert, Palette, FileSignature
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useTenant } from '../../contexts/TenantContext';
import { isFmckTenant } from '../../utils/tenantTerminology';
import { API_URL } from '../../config';
import { cn } from '../../lib/utils';

const featureMap: Record<string, string> = {
  '/loans': 'loans',
  '/loan-applications': 'loans',
  '/loan-repayments': 'loans',
  '/apply-loan': 'loans',
  '/my-loans': 'loans',
  '/agreements': 'loans',
  '/my-guarantees': 'loans',
  '/admin-layyah': 'layyah',
  '/admin-animal-requests': 'layyah',
  '/expenses': 'expenses',
  '/profit-sharing': 'profit_sharing',
  '/my-profit-share': 'profit_sharing',
  '/withdrawals': 'withdrawals'
};

const navigationItems: Record<string, Array<{ name: string; href: string; icon: any }>> = {
  admin: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Member Applications', href: '/member-applications', icon: UserPlus },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'User Management', href: '/user-management', icon: Shield },
    { name: 'Roles & Permissions', href: '/roles', icon: Shield },
    { name: 'Contributions', href: '/contributions', icon: DollarSign },
    { name: 'Loan Applications', href: '/loan-applications', icon: CreditCard },
    { name: 'Loans', href: '/loans', icon: CreditCard },
    { name: 'Loan Repayments', href: '/loan-repayments', icon: Upload },
    { name: 'Agreements', href: '/agreements', icon: CheckCircle },
    { name: 'Layyah Management', href: '/admin-layyah', icon: Heart },
    { name: 'Animal Requests', href: '/admin-animal-requests', icon: ShoppingCart },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Profit Sharing', href: '/profit-sharing', icon: TrendingUp },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Withdrawals', href: '/withdrawals', icon: Percent },
    { name: 'Communication', href: '/communication', icon: MessageSquare },
    { name: 'Security Center', href: '/security-center', icon: ShieldAlert },
    { name: 'Receipt Designer', href: '/receipt-designer', icon: Palette },
    { name: 'Document Designer', href: '/document-designer', icon: FileSignature },
    { name: 'Settings', href: '/settings', icon: Settings },
  ],
  'super_admin': [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Member Applications', href: '/member-applications', icon: UserPlus },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'User Management', href: '/user-management', icon: Shield },
    { name: 'Roles & Permissions', href: '/roles', icon: Shield },
    { name: 'Contributions', href: '/contributions', icon: DollarSign },
    { name: 'Loan Applications', href: '/loan-applications', icon: CreditCard },
    { name: 'Loans', href: '/loans', icon: CreditCard },
    { name: 'Loan Repayments', href: '/loan-repayments', icon: Upload },
    { name: 'Agreements', href: '/agreements', icon: CheckCircle },
    { name: 'Layyah Management', href: '/admin-layyah', icon: Heart },
    { name: 'Animal Requests', href: '/admin-animal-requests', icon: ShoppingCart },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Profit Sharing', href: '/profit-sharing', icon: TrendingUp },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Withdrawals', href: '/withdrawals', icon: Percent },
    { name: 'Communication', href: '/communication', icon: MessageSquare },
    { name: 'Security Center', href: '/security-center', icon: ShieldAlert },
    { name: 'Receipt Designer', href: '/receipt-designer', icon: Palette },
    { name: 'Document Designer', href: '/document-designer', icon: FileSignature },
    { name: 'Settings', href: '/settings', icon: Settings },
  ],
  member: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Profile', href: '/profile', icon: Users },
    { name: 'My Contributions', href: '/my-contributions', icon: DollarSign },
    { name: 'My Loans', href: '/my-loans', icon: CreditCard },
    { name: 'My Guarantees', href: '/my-guarantees', icon: Shield },
    { name: 'Apply for Loan', href: '/apply-loan', icon: CreditCard },
    // { name: 'My Layyah', href: '/my-layyah', icon: Heart },
    // { name: 'Browse Groups', href: '/browse-layyah', icon: Users },
    // { name: 'My Layyah Groups', href: '/my-layyah-groups', icon: Users },
    { name: 'Withdrawals', href: '/withdrawals', icon: Percent },
    { name: 'Support', href: '/support', icon: MessageSquare },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'My Profit Share', href: '/my-profit-share', icon: TrendingUp },
  ],
  treasurer: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Contributions', href: '/contributions', icon: DollarSign },
    { name: 'Loan Applications', href: '/loan-applications', icon: CreditCard },
    { name: 'Loans', href: '/loans', icon: CreditCard },
    // { name: 'Layyah Management', href: '/admin-layyah', icon: Heart },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Profit Sharing', href: '/profit-sharing', icon: TrendingUp },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Withdrawals', href: '/withdrawals', icon: Percent },
  ],
  chairman: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Loans', href: '/loans', icon: CreditCard },
    // { name: 'Layyah Management', href: '/admin-layyah', icon: Heart },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Profit Sharing', href: '/profit-sharing', icon: TrendingUp },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Withdrawals', href: '/withdrawals', icon: Percent },
  ],
  state_auditor: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Contributions', href: '/contributions', icon: DollarSign },
    { name: 'Loans', href: '/loans', icon: CreditCard },
    { name: 'Loan Repayments', href: '/loan-repayments', icon: Upload },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Profit Sharing', href: '/profit-sharing', icon: TrendingUp },
    { name: 'Withdrawals', href: '/withdrawals', icon: Percent },
    { name: 'Reports', href: '/reports', icon: FileText },
  ],
};

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { isSidebarOpen, isSidebarCollapsed, toggleSidebarCollapse, closeSidebar } = useLayout();
  const { tenant, hasFeature } = useTenant();

  const isFmcksmcs = isFmckTenant(tenant);

  const rawLogo = tenant?.theme?.logoUrl || (isFmcksmcs ? '/fmck-logo.png' : undefined);
  const logoSrc = rawLogo
    ? (rawLogo.startsWith('http') || rawLogo.startsWith('/') ? rawLogo : `${API_URL}${rawLogo}`)
    : undefined;

  const rawItems = user ? (navigationItems[user.role] || []) : [];
  const items = rawItems.filter(i => {
    // Hide Roles & Permissions for FMCKSMCS tenant
    if (isFmcksmcs && i.href === '/roles') return false;

    // Hide Withdrawals for FMCKSMCS tenant
    if (isFmcksmcs && i.href === '/withdrawals') return false;

    // Role specific overrides
    if (i.href === '/admin-animal-requests' && user.role === 'admin' && !user.canCreateAnimalRequests) return false;
    
    // Feature flag overrides
    const requiredFeature = featureMap[i.href];
    if (requiredFeature && !hasFeature(requiredFeature)) return false;
    
    return true;
  });

  if (!user) {
    return (
      <div
        className={cn(
          "w-64 flex items-center justify-center hidden md:flex",
          isFmcksmcs ? "fmck-white-sidebar bg-white border-r border-gray-200" : "bg-gray-900"
        )}
      >
        <div
          className={cn(
            "animate-spin rounded-full h-8 w-8 border-b-2",
            isFmcksmcs ? "border-primary-600" : "border-primary-400"
          )}
        ></div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-all duration-300",
          isFmcksmcs
            ? "fmck-white-sidebar bg-white dark:bg-card text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-border"
            : "bg-gray-900 text-white",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <div
          className={cn(
            "p-4 flex items-center transition-all",
            isSidebarCollapsed && !isSidebarOpen
              ? "flex-col justify-center space-y-2"
              : "justify-between",
            isFmcksmcs ? "border-b border-gray-100 dark:border-border" : ""
          )}
        >
          {(!isSidebarCollapsed || isSidebarOpen) ? (
            <div className="flex items-center space-x-2.5 min-w-0 mr-2">
              {logoSrc && (
                <img
                  src={logoSrc}
                  alt={tenant?.name || 'FMCK Logo'}
                  className="w-7 h-7 rounded object-contain flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <h2
                className={cn(
                  "text-sm font-bold truncate uppercase tracking-tight",
                  isFmcksmcs ? "fmck-brand-title text-gray-900 dark:text-white" : "text-primary-400 text-lg font-semibold"
                )}
              >
                {tenant?.name || (isFmcksmcs ? 'FMCK SMCS' : 'Cooperative')}
              </h2>
            </div>
          ) : (
            isFmcksmcs && logoSrc && (
              <img
                src={logoSrc}
                alt={tenant?.name || 'FMCK Logo'}
                className="w-7 h-7 rounded object-contain hidden md:block"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )
          )}

          {/* Desktop Collapse Button */}
          <button
            onClick={toggleSidebarCollapse}
            className={cn(
              "hidden md:flex items-center justify-center p-1.5 rounded transition-colors",
              isFmcksmcs
                ? "fmck-sidebar-btn text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10"
                : "hover:bg-gray-800 text-gray-300 hover:text-white"
            )}
            aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={closeSidebar}
            className={cn(
              "md:hidden p-1.5 rounded transition-colors",
              isFmcksmcs
                ? "fmck-sidebar-btn text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10"
                : "hover:bg-gray-800 text-gray-300 hover:text-white"
            )}
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-4 overflow-y-auto h-[calc(100vh-5rem)]">
          {items.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => closeSidebar()} // Close on mobile click
              className={({ isActive }) =>
                cn(
                  "flex items-center px-4 py-3 text-sm font-medium transition-colors group",
                  isFmcksmcs
                    ? cn(
                        "fmck-nav-item border-l-4",
                        isActive
                          ? "fmck-nav-item-active bg-gray-100 text-gray-900 font-semibold border-[#03490b] dark:bg-white/10 dark:text-white dark:border-[#5cd674]"
                          : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
                      )
                    : (isActive
                        ? "bg-primary-600 text-white border-r-2 border-primary-400"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white")
                )
              }
              title={isSidebarCollapsed ? item.name : undefined}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      "w-5 h-5 flex-shrink-0 transition-colors",
                      isFmcksmcs
                        ? (isActive
                            ? "text-[#03490b] dark:text-[#5cd674]"
                            : "text-gray-500 group-hover:text-gray-800 dark:text-gray-400 dark:group-hover:text-gray-200")
                        : ""
                    )}
                  />
                  <span
                    className={cn(
                      "ml-3 transition-opacity duration-200",
                      isSidebarCollapsed ? "hidden md:hidden" : "block",
                      // Show text on mobile even if "collapsed" state is true
                      isSidebarOpen && "block"
                    )}
                  >
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
};
