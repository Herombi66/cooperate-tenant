import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Menu, Moon, Sun, Compass } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTenant } from '../../contexts/TenantContext';
import { useTenantTerminology, isFmckTenant } from '../../utils/tenantTerminology';
import { useTour } from '../../contexts/TourContext';
import { NotificationDropdown } from '@/features/notifications/components/NotificationDropdown';
import { API_URL } from '../../config';

export const Header = () => {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const { idShort } = useTenantTerminology();
  const { toggleSidebar } = useLayout();
  const { isDark, toggleTheme } = useTheme();
  const { startTour } = useTour();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isFmck = isFmckTenant(tenant);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout({ tenantId: tenant?.id || user?.tenant_id || user?.tenantId });
  };

  return (
    <header className="bg-card shadow-sm border-b border-border px-4 md:px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-1 rounded hover:bg-muted text-muted-foreground"
            aria-label="Toggle Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          {tenant?.theme?.logoUrl && (
            <img
              src={tenant.theme.logoUrl.startsWith('http') ? tenant.theme.logoUrl : `${API_URL}${tenant.theme.logoUrl}`}
              alt={tenant.name || 'Logo'}
              className="w-7 h-7 rounded object-contain flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">
            {tenant?.name || 'Cooperative System'}
          </h1>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {/* FMCKSMCS System Tour Button */}
          {isFmck && (
            <button
              type="button"
              onClick={() => startTour(0)}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-semibold shadow-sm transition"
              title="Take FMCKSMCS Guided Tour"
              aria-label="Take Guided Tour"
            >
              <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin-slow" />
              <span className="hidden sm:inline">Tour</span>
            </button>
          )}

          {/* Notifications */}
          <div data-tour="header-notifications">
            <NotificationDropdown />
          </div>

          <button
            type="button"
            data-tour="header-theme"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-background hover:bg-muted text-foreground"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="flex items-center space-x-2" data-tour="header-profile">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              {user?.profileImage ? (
                <img
                  src={`${API_URL}${user.profileImage}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to User icon if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <User className={`w-4 h-4 text-white ${user?.profileImage ? 'hidden fallback-icon' : ''}`} />
            </div>
            <span className="hidden md:inline-block text-sm font-medium text-muted-foreground">{user?.psn}</span>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 border border-border"
                >
                  <div className="px-4 py-2 text-sm text-foreground border-b border-border">
                    {user?.name}
                  </div>
                  <div className="px-4 py-2 text-xs text-muted-foreground md:hidden border-b border-border">
                    {idShort}: {user?.psn}
                  </div>
                  {isFmck && (
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        startTour(0);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-muted"
                    >
                      <Compass className="w-4 h-4 mr-2" />
                      Guided Tour
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
