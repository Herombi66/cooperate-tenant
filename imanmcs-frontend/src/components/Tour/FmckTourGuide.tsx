import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  Compass, ChevronRight, ChevronLeft, X, Sparkles, 
  CheckCircle, ArrowRight, Shield, Award, Eye
} from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { isFmckTenant } from '../../utils/tenantTerminology';

interface TourStep {
  id: string;
  target?: string;
  title: string;
  description: string;
  badge?: string;
  position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

export const FmckTourGuide: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const isFmck = isFmckTenant(tenant);

  const {
    isTourOpen,
    currentStep,
    totalSteps,
    setTotalSteps,
    nextStep,
    prevStep,
    goToStep,
    endTour,
    showWelcomePrompt,
    startTour,
    dismissWelcomePrompt
  } = useTour();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const isAdminOrOfficer = useMemo(() => {
    return user && user.role !== 'member';
  }, [user]);

  // Define steps according to role
  const steps: TourStep[] = useMemo(() => {
    if (isAdminOrOfficer) {
      return [
        {
          id: 'welcome',
          title: 'Welcome to FMCKSMCS Management Suite',
          badge: 'Executive Tour',
          description: 'Welcome to the administrative portal for Federal Medical Centre Kumo Staff MPCS Ltd. Here you can oversee loan workflows, member accounts, remittances, and operational finances.',
          position: 'center'
        },
        {
          id: 'sidebar-nav',
          target: '[data-tour="sidebar-nav"]',
          title: 'Navigation & Operational Modules',
          badge: 'Operations',
          description: 'Access all system modules including Member Directory, Member Applications, Contributions, Loan Disbursals, Repayments, Expenses, and Reports.',
          position: 'right'
        },
        {
          id: 'dashboard-stats',
          target: '[data-tour="dashboard-stats"]',
          title: 'Real-Time Financial Metrics',
          badge: 'Analytics',
          description: 'Live figures displaying Total Active Members, Total Contributions, Disbursed Loans, Outstanding Balances, and Operational Reserves.',
          position: 'bottom'
        },
        {
          id: 'header-notifications',
          target: '[data-tour="header-notifications"]',
          title: 'Notifications & Audit Broadcasts',
          badge: 'Communications',
          description: 'Receive real-time alerts on loan applications, member submissions, and system-wide activities needing review or approval.',
          position: 'bottom'
        },
        {
          id: 'header-theme',
          target: '[data-tour="header-theme"]',
          title: 'Theme Preference',
          badge: 'Interface',
          description: 'Toggle easily between clean light mode and high-contrast dark mode to suit your working environment.',
          position: 'bottom'
        },
        {
          id: 'header-profile',
          target: '[data-tour="header-profile"]',
          title: 'IPPIS Identification & Profile',
          badge: 'Account',
          description: 'Your account is linked to your Federal IPPIS Number. Click here to manage your profile or safely log out.',
          position: 'bottom'
        },
        {
          id: 'finish',
          title: 'Management Ready!',
          badge: 'All Done',
          description: 'You are now ready to operate the FMCKSMCS platform. You can re-launch this tour at any time by clicking "Tour" in the top bar.',
          position: 'center'
        }
      ];
    }

    // Member steps
    return [
      {
        id: 'welcome',
        title: 'Welcome to Your FMCKSMCS Portal',
        badge: 'Member Guide',
        description: 'Welcome to Federal Medical Centre Kumo Staff MPCS Ltd! Manage your monthly contributions, request loans, track deductions, and access cooperative bylaws all in one place.',
        position: 'center'
      },
      {
        id: 'sidebar-nav',
        target: '[data-tour="sidebar-nav"]',
        title: 'Quick Access Sidebar',
        badge: 'Navigation',
        description: 'Easily navigate to My Contributions, My Loans, Apply for Loan, Guarantees, Profit Shares, and Cooperative Bylaws.',
        position: 'right'
      },
      {
        id: 'dashboard-stats',
        target: '[data-tour="dashboard-stats"]',
        title: 'Your Financial Summary',
        badge: 'Financials',
        description: 'Track your Total Contributions, Monthly Savings deductions, Active Loans, and Available Loan Limit in real time.',
        position: 'bottom'
      },
      {
        id: 'header-notifications',
        target: '[data-tour="header-notifications"]',
        title: 'Notifications & Status Updates',
        badge: 'Alerts',
        description: 'Stay informed with instant alerts when your loan is approved, remittances are posted, or official announcements are made.',
        position: 'bottom'
      },
      {
        id: 'header-theme',
        target: '[data-tour="header-theme"]',
        title: 'Light & Dark Mode',
        badge: 'Display',
        description: 'Comfortably switch between bright light mode and eye-resting dark mode anytime.',
        position: 'bottom'
      },
      {
        id: 'header-profile',
        target: '[data-tour="header-profile"]',
        title: 'IPPIS Number & Member Account',
        badge: 'IPPIS Verified',
        description: 'Your account is verified and linked to your official IPPIS Number. View your profile or change your password anytime.',
        position: 'bottom'
      },
      {
        id: 'finish',
        title: "You're All Set!",
        badge: 'Complete',
        description: 'You have completed the walkthrough! You can launch this guide again anytime using the "Tour" button in the top navigation bar.',
        position: 'center'
      }
    ];
  }, [isAdminOrOfficer]);

  useEffect(() => {
    setTotalSteps(steps.length);
  }, [steps.length, setTotalSteps]);

  // Update target bounding box
  useEffect(() => {
    if (!isTourOpen) {
      setTargetRect(null);
      return;
    }

    const currentStepObj = steps[currentStep];
    if (!currentStepObj || !currentStepObj.target) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(currentStepObj.target!);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Check if element is visible and has dimensions
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          // Scroll into view if out of viewport
          const isInView = (
            rect.top >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
          );
          if (!isInView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
      }
      setTargetRect(null);
    };

    updateRect();
    const handleScrollOrResize = () => updateRect();

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isTourOpen, currentStep, steps]);

  // Keyboard navigation
  useEffect(() => {
    if (!isTourOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        endTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < steps.length - 1) {
          nextStep();
        } else {
          endTour();
        }
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourOpen, currentStep, steps.length, nextStep, prevStep, endTour]);

  if (!isFmck) return null;

  const activeStep = steps[currentStep] || steps[0];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Calculate popover positioning relative to targetRect
  const getPopoverStyle = (): React.CSSProperties => {
    if (!targetRect || activeStep.position === 'center' || !activeStep.target) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999
      };
    }

    const padding = 16;
    const popoverWidth = 360;

    let top = targetRect.bottom + padding;
    let left = targetRect.left + (targetRect.width / 2) - (popoverWidth / 2);

    // Adjust horizontal boundaries
    if (left < padding) left = padding;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }

    // Adjust vertical boundaries
    if (top + 250 > window.innerHeight && targetRect.top > 250) {
      // Position above target
      top = targetRect.top - 240 - padding;
    }

    return {
      position: 'fixed',
      top: `${Math.max(padding, top)}px`,
      left: `${Math.max(padding, left)}px`,
      width: `${popoverWidth}px`,
      zIndex: 9999
    };
  };

  return (
    <>
      {/* 1. First-Time Welcome Prompt Modal */}
      {showWelcomePrompt && !isTourOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-card border border-emerald-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6 text-gray-900 dark:text-gray-100 relative overflow-hidden">
            {/* Header decor */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600" />
            
            <button
              onClick={dismissWelcomePrompt}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Compass className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  FMCKSMCS Portal
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Welcome to FMC Kumo MPCS!
                </h3>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              Would you like a 1-minute guided tour of your portal to discover where to find your contributions, loan tools, IPPIS profile, and notifications?
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={dismissWelcomePrompt}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-muted rounded-lg transition"
              >
                Maybe Later
              </button>
              <button
                onClick={() => startTour(0)}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition group"
              >
                <span>Start Quick Tour</span>
                <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Active Tour Overlay & Spotlight */}
      {isTourOpen && (
        <div className="fixed inset-0 z-[9998] pointer-events-auto">
          {/* Dimmed backdrop with cutout for targetRect if present */}
          {targetRect ? (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-auto"
              style={{ width: '100vw', height: '100vh' }}
            >
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={targetRect.left - 6}
                    y={targetRect.top - 6}
                    width={targetRect.width + 12}
                    height={targetRect.height + 12}
                    rx="10"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.65)"
                mask="url(#tour-spotlight-mask)"
                onClick={endTour}
              />
            </svg>
          ) : (
            <div
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
              onClick={endTour}
            />
          )}

          {/* Target Element Pulsing Ring */}
          {targetRect && (
            <div
              className="fixed pointer-events-none rounded-xl border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse transition-all duration-300"
              style={{
                top: `${targetRect.top - 6}px`,
                left: `${targetRect.left - 6}px`,
                width: `${targetRect.width + 12}px`,
                height: `${targetRect.height + 12}px`,
                zIndex: 9999
              }}
            />
          )}

          {/* Tour Step Popover Card */}
          <div
            style={getPopoverStyle()}
            className="bg-white dark:bg-card text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl border border-emerald-500/40 p-5 transition-all duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Top Bar: Badge, Step Counter, and Close */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  <Sparkles className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                  {activeStep.badge || 'FMCKSMCS'}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {currentStep + 1} of {steps.length}
                </span>
              </div>

              <button
                onClick={endTour}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition p-1 rounded-md"
                aria-label="Exit tour"
                title="Exit tour (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Description */}
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
              {activeStep.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              {activeStep.description}
            </p>

            {/* Progress Dots Indicator */}
            <div className="flex items-center justify-center space-x-1.5 mb-4">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToStep(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'w-6 bg-emerald-600 dark:bg-emerald-400'
                      : 'w-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-border">
              <button
                onClick={endTour}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                Skip Tour
              </button>

              <div className="flex items-center space-x-2">
                {!isFirstStep && (
                  <button
                    onClick={prevStep}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-muted transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Back
                  </button>
                )}

                <button
                  onClick={isLastStep ? endTour : nextStep}
                  className="inline-flex items-center px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Finish
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
