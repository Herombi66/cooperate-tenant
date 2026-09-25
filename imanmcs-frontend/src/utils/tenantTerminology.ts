import { useTenant, TenantConfig } from '../contexts/TenantContext';

/**
 * Check if the active tenant is FMCKSMCS (Federal Medical Centre Kumo Staff MPCS Ltd)
 */
export const isFmckTenant = (tenant?: TenantConfig | null): boolean => {
  if (!tenant && typeof window === 'undefined') return false;
  
  const tenantId = tenant?.id?.toLowerCase() || '';
  if (tenantId === 'fmcksmcs' || tenantId === 'fmck') return true;

  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const paramTenant = urlParams.get('tenant')?.toLowerCase() || '';
    if (paramTenant === 'fmcksmcs' || paramTenant === 'fmck') return true;

    const storedTenant = localStorage.getItem('previewTenantId')?.toLowerCase() || '';
    if (storedTenant === 'fmcksmcs' || storedTenant === 'fmck') return true;
  }

  const tenantName = tenant?.name?.toLowerCase() || '';
  if (tenantName.includes('kumo') || tenantName.includes('fmck')) return true;

  return false;
};

/**
 * Get member ID label based on tenant: "IPPIS Number" for FMCK, "PSN" for others.
 */
export const getMemberIdLabel = (
  tenant?: TenantConfig | null,
  format: 'full' | 'short' | 'uppercase' = 'full'
): string => {
  const isFmck = isFmckTenant(tenant);
  if (isFmck) {
    if (format === 'short') return 'IPPIS No.';
    if (format === 'uppercase') return 'IPPIS';
    return 'IPPIS Number';
  }

  if (format === 'short') return 'PSN No.';
  if (format === 'uppercase') return 'PSN';
  return 'PSN';
};

/**
 * Get input placeholder based on tenant
 */
export const getIdPlaceholder = (
  tenant?: TenantConfig | null,
  action: 'search' | 'enter' | 'type' = 'enter'
): string => {
  const isFmck = isFmckTenant(tenant);
  if (isFmck) {
    if (action === 'search') return 'Search by IPPIS Number...';
    if (action === 'type') return 'Type IPPIS Number to search...';
    return 'Enter your IPPIS Number';
  }

  if (action === 'search') return 'Search by PSN...';
  if (action === 'type') return 'Type PSN to search...';
  return 'Enter your PSN';
};

export interface LoanTypeOption {
  id: 'cash' | 'investment' | 'educational' | 'emergency' | 'venture';
  label: string;
  badgeColor: string;
  description?: string;
  maxMonths: number;
}

/**
 * Get allowed loan types for the given tenant.
 * For FMCK: Venture Loan is replaced with Investment Loan, and Educational Loan is enabled.
 */
export const getLoanTypesForTenant = (tenant?: TenantConfig | null): LoanTypeOption[] => {
  const isFmck = isFmckTenant(tenant);

  if (isFmck) {
    return [
      {
        id: 'cash',
        label: 'Cash Loan',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        description: 'Standard cash facility for general needs',
        maxMonths: 12
      },
      {
        id: 'investment',
        label: 'Investment Loan',
        badgeColor: 'bg-blue-100 text-blue-800',
        description: 'Asset and enterprise development loan (Up to ₦1,000,000)',
        maxMonths: 24
      },
      {
        id: 'educational',
        label: 'Educational Loan',
        badgeColor: 'bg-indigo-100 text-indigo-800',
        description: 'Academic tuition and study support facility',
        maxMonths: 24
      },
      {
        id: 'emergency',
        label: 'Emergency Loan',
        badgeColor: 'bg-amber-100 text-amber-800',
        description: 'Urgent medical or family emergency assistance (Max ₦20,000)',
        maxMonths: 6
      }
    ];
  }

  // Other tenants: keep existing options
  return [
    {
      id: 'cash',
      label: 'Cash Loan',
      badgeColor: 'bg-primary-100 text-primary-800',
      description: 'Standard cash loan facility',
      maxMonths: 12
    },
    {
      id: 'venture',
      label: 'Venture Loan',
      badgeColor: 'bg-purple-100 text-purple-800',
      description: 'Enterprise venture support',
      maxMonths: 24
    },
    {
      id: 'investment',
      label: 'Investment Loan',
      badgeColor: 'bg-blue-100 text-blue-800',
      description: 'Investment backing loan',
      maxMonths: 24
    },
    {
      id: 'emergency',
      label: 'Emergency Loan',
      badgeColor: 'bg-amber-100 text-amber-800',
      description: 'Short-term emergency relief',
      maxMonths: 6
    }
  ];
};

/**
 * Format loan type string for display.
 * For FMCK: both 'venture' and 'investment' display as 'Investment Loan'.
 */
export const formatLoanType = (type?: string, tenant?: TenantConfig | null): string => {
  if (!type) return 'Cash Loan';
  const normType = type.toLowerCase();
  const isFmck = isFmckTenant(tenant);

  if (normType === 'venture' || normType === 'investment') {
    return isFmck ? 'Investment Loan' : (normType === 'investment' ? 'Investment Loan' : 'Venture Loan');
  }

  if (normType === 'educational') {
    return 'Educational Loan';
  }

  if (normType === 'emergency') {
    return 'Emergency Loan';
  }

  return 'Cash Loan';
};

/**
 * Get badge styling for a loan type
 */
export const getLoanTypeColor = (type?: string, tenant?: TenantConfig | null): string => {
  if (!type) return 'bg-gray-100 text-gray-800';
  const normType = type.toLowerCase();
  const isFmck = isFmckTenant(tenant);

  if (normType === 'venture' || normType === 'investment') {
    return isFmck ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  }
  if (normType === 'educational') {
    return 'bg-indigo-100 text-indigo-800';
  }
  if (normType === 'emergency') {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-primary-100 text-primary-800';
};

export type IdPlaceholderFn = (action?: 'search' | 'enter' | 'type') => string;

export interface TenantTerminology {
  isFmck: boolean;
  hasWithdrawals: boolean;
  idLabel: string;
  idShort: string;
  idShortLabel: string;
  idUppercase: string;
  idPlaceholder: IdPlaceholderFn;
  searchPlaceholder: string;
  typePlaceholder: string;
  enterPlaceholder: string;
  loanTypes: LoanTypeOption[];
  formatLoanType: (type?: string) => string;
  getLoanTypeColor: (type?: string) => string;
}

/**
 * Custom React Hook for accessing tenant-specific terminology easily in any component.
 */
export const useTenantTerminology = (): TenantTerminology => {
  const { tenant } = useTenant();
  const isFmck = isFmckTenant(tenant);

  const idPlaceholderFn: IdPlaceholderFn = (action: 'search' | 'enter' | 'type' = 'enter'): string => {
    return getIdPlaceholder(tenant, action);
  };

  return {
    isFmck,
    hasWithdrawals: !isFmck,
    idLabel: getMemberIdLabel(tenant, 'full'),
    idShort: getMemberIdLabel(tenant, 'short'),
    idShortLabel: getMemberIdLabel(tenant, 'short'),
    idUppercase: getMemberIdLabel(tenant, 'uppercase'),
    idPlaceholder: idPlaceholderFn,
    searchPlaceholder: getIdPlaceholder(tenant, 'search'),
    typePlaceholder: getIdPlaceholder(tenant, 'type'),
    enterPlaceholder: getIdPlaceholder(tenant, 'enter'),
    loanTypes: getLoanTypesForTenant(tenant),
    formatLoanType: (type?: string): string => formatLoanType(type, tenant),
    getLoanTypeColor: (type?: string): string => getLoanTypeColor(type, tenant),
  };
};
