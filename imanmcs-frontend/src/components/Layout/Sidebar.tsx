import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Users, DollarSign, CreditCard, TrendingUp,
  Settings, FileText, ChevronLeft, ChevronRight, Receipt, Upload, UserPlus, Heart, Shield, Bell, X, CheckCircle, Percent, MessageSquare, ShoppingCart
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { cn } from '../../lib/utils';

const navigationItems: Record<string, Array<{ name: string; href: string; icon: any }>> = {
  admin: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Member Applications', href: '/member-applications', icon: UserPlus },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'User Management', href: '/user-management', icon: Shield },
    { name: 'Contributions', href: '/contributions', icon: DollarSign },
    { name: 'Loan Applications', href: '/loan-applications', icon: CreditCard },
    { name: 'Loans', href: '/loans', icon: CreditCard },
    { name: 'Loan Repayments', href: '/loan-repayments', icon: Upload },
    { name: 'Agreements', href: '/agreements', icon: CheckCircle },
<<<<<<< HEAD
    // { name: 'Layyah Management', href: '/admin-layyah', icon: Heart },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Profit Sharing', href: '/profit-sharing', icon: TrendingUp },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Withdrawals', href: '/withdrawals', icon: Percent },
    { name: 'Communication', href: '/communication', icon: MessageSquare },
    { name: 'Settings', href: '/settings', icon: Settings },
  ],
  'super_admin': [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Member Applications', href: '/member-applications', icon: UserPlus },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'User Management', href: '/user-management', icon: Shield },
    { name: 'Contributions', href: '/contributions', icon: DollarSign },
    { name: 'Loan Applications', href: '/loan-applications', icon: CreditCard },
    { name: 'Loans', href: '/loans', icon: CreditCard },
    { name: 'Loan Repayments', href: '/loan-repayments', icon: Upload },
    { name: 'Agreements', href: '/agreements', icon: CheckCircle },
    // { name: 'Layyah Management', href: '/admin-layyah', icon: Heart },
=======
    { name: 'Layyah Management', href: '/admin-layyah', icon: Heart },
    { name: 'Animal Requests', href: '/admin-animal-requests', icon: ShoppingCart },
>>>>>>> c89d2cf068bf46fa699f6d0221ce3e9b0751a166
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Profit Sharing', href: '/profit-sharing', icon: TrendingUp },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Withdrawals', href: '/withdrawals', icon: Percent },
    { name: 'Communication', href: '/communication', icon: MessageSquare },
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

  const rawItems = user ? (navigationItems[user.role] || []) : [];
  const items =
    user && user.role === 'admin' && !user.canCreateAnimalRequests
      ? rawItems.filter((i) => i.href !== '/admin-animal-requests')
      : rawItems;

  if (!user) {
    return (
      <div className="bg-gray-900 w-64 flex items-center justify-center hidden md:flex">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
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
          "fixed inset-y-0 left-0 z-50 bg-gray-900 text-white transition-all duration-300 md:relative",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          {(!isSidebarCollapsed || isSidebarOpen) && (
            <h2 className="text-lg font-semibold text-primary-400 truncate">
              FCNACONSGM Cooperative
            </h2>
          )}

          {/* Desktop Collapse Button */}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden md:block p-1 rounded hover:bg-gray-800"
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
            className="md:hidden p-1 rounded hover:bg-gray-800"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-8 overflow-y-auto h-[calc(100vh-5rem)]">
          {items.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => closeSidebar()} // Close on mobile click
              className={({ isActive }) =>
                cn(
                  "flex items-center px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-600 text-white border-r-2 border-primary-400"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )
              }
              title={isSidebarCollapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className={cn(
                "ml-3 transition-opacity duration-200",
                isSidebarCollapsed ? "hidden md:hidden" : "block",
                // Show text on mobile even if "collapsed" state is true (collapsed concept is desktop only usually, but good to handle)
                isSidebarOpen && "block"
              )}>
                {item.name}
              </span>
              {/* Tooltip for collapsed mode could be added here */}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
};
