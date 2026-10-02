import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';
import { isFmckTenant } from '../utils/tenantTerminology';

interface TourContextType {
  isTourOpen: boolean;
  currentStep: number;
  totalSteps: number;
  startTour: (stepIndex?: number) => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  setTotalSteps: (total: number) => void;
  showWelcomePrompt: boolean;
  dismissWelcomePrompt: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const isFmck = isFmckTenant(tenant);

  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(6);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);

  // Storage key specific to user and tenant
  const storageKey = user?.id ? `fmcksmcs_tour_completed_${user.id}` : null;
  const promptKey = user?.id ? `fmcksmcs_tour_prompt_seen_${user.id}` : null;

  useEffect(() => {
    // Only auto-prompt for FMCKSMCS tenant if user is logged in and hasn't seen it yet
    if (isFmck && user?.id && storageKey && promptKey) {
      const tourCompleted = localStorage.getItem(storageKey);
      const promptSeen = localStorage.getItem(promptKey);

      if (!tourCompleted && !promptSeen) {
        // Show welcome prompt after 1.5 seconds delay on initial visit
        const timer = setTimeout(() => {
          setShowWelcomePrompt(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isFmck, user?.id, storageKey, promptKey]);

  const startTour = useCallback((stepIndex: number = 0) => {
    setCurrentStep(stepIndex);
    setIsTourOpen(true);
    setShowWelcomePrompt(false);
    if (promptKey) {
      localStorage.setItem(promptKey, 'true');
    }
  }, [promptKey]);

  const endTour = useCallback(() => {
    setIsTourOpen(false);
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
    if (promptKey) {
      localStorage.setItem(promptKey, 'true');
    }
  }, [storageKey, promptKey]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((index: number) => {
    setCurrentStep(Math.max(0, Math.min(index, totalSteps - 1)));
  }, [totalSteps]);

  const dismissWelcomePrompt = useCallback(() => {
    setShowWelcomePrompt(false);
    if (promptKey) {
      localStorage.setItem(promptKey, 'true');
    }
  }, [promptKey]);

  return (
    <TourContext.Provider
      value={{
        isTourOpen,
        currentStep,
        totalSteps,
        startTour,
        endTour,
        nextStep,
        prevStep,
        goToStep,
        setTotalSteps,
        showWelcomePrompt,
        dismissWelcomePrompt
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = (): TourContextType => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
