import { describe, it, expect } from 'vitest';
import {
  isFmckTenant,
  getMemberIdLabel,
  getIdPlaceholder,
  getLoanTypesForTenant,
  formatLoanType,
  getLoanTypeColor,
} from './tenantTerminology';

describe('tenantTerminology utility functions', () => {
  const fmckTenant = {
    id: 'fmcksmcs',
    name: 'Federal Medical Centre Kumo Staff MPCS Ltd',
    cooperative_type: 'conventional' as const,
    theme: {},
    features: {},
  };

  const genericTenant = {
    id: 'other-coop',
    name: 'Generic Cooperative',
    cooperative_type: 'islamic' as const,
    theme: {},
    features: {},
  };

  describe('isFmckTenant', () => {
    it('returns true for FMCK tenant object', () => {
      expect(isFmckTenant(fmckTenant)).toBe(true);
      expect(isFmckTenant({ ...fmckTenant, id: 'fmck' })).toBe(true);
    });

    it('returns false for generic tenant object', () => {
      expect(isFmckTenant(genericTenant)).toBe(false);
      expect(isFmckTenant(null)).toBe(false);
      expect(isFmckTenant(undefined)).toBe(false);
    });
  });

  describe('getMemberIdLabel', () => {
    it('returns IPPIS Number for FMCK', () => {
      expect(getMemberIdLabel(fmckTenant, 'full')).toBe('IPPIS Number');
      expect(getMemberIdLabel(fmckTenant, 'short')).toBe('IPPIS No.');
      expect(getMemberIdLabel(fmckTenant, 'uppercase')).toBe('IPPIS');
    });

    it('returns PSN for generic tenants', () => {
      expect(getMemberIdLabel(genericTenant, 'full')).toBe('PSN');
      expect(getMemberIdLabel(genericTenant, 'short')).toBe('PSN No.');
      expect(getMemberIdLabel(genericTenant, 'uppercase')).toBe('PSN');
    });
  });

  describe('getIdPlaceholder', () => {
    it('returns IPPIS placeholders for FMCK', () => {
      expect(getIdPlaceholder(fmckTenant, 'enter')).toBe('Enter your IPPIS Number');
      expect(getIdPlaceholder(fmckTenant, 'search')).toBe('Search by IPPIS Number...');
      expect(getIdPlaceholder(fmckTenant, 'type')).toBe('Type IPPIS Number to search...');
    });

    it('returns PSN placeholders for generic tenants', () => {
      expect(getIdPlaceholder(genericTenant, 'enter')).toBe('Enter your PSN');
      expect(getIdPlaceholder(genericTenant, 'search')).toBe('Search by PSN...');
      expect(getIdPlaceholder(genericTenant, 'type')).toBe('Type PSN to search...');
    });
  });

  describe('getLoanTypesForTenant', () => {
    it('includes Investment Loan and Educational Loan for FMCK and excludes Venture Loan', () => {
      const types = getLoanTypesForTenant(fmckTenant);
      const ids = types.map((t) => t.id);
      expect(ids).toContain('investment');
      expect(ids).toContain('educational');
      expect(ids).not.toContain('venture');
    });

    it('includes Venture Loan for generic tenants', () => {
      const types = getLoanTypesForTenant(genericTenant);
      const ids = types.map((t) => t.id);
      expect(ids).toContain('venture');
    });
  });

  describe('formatLoanType', () => {
    it('formats venture as Investment Loan for FMCK', () => {
      expect(formatLoanType('venture', fmckTenant)).toBe('Investment Loan');
      expect(formatLoanType('investment', fmckTenant)).toBe('Investment Loan');
      expect(formatLoanType('educational', fmckTenant)).toBe('Educational Loan');
    });

    it('formats venture as Venture Loan for generic tenants', () => {
      expect(formatLoanType('venture', genericTenant)).toBe('Venture Loan');
    });
  });

  describe('getLoanTypeColor', () => {
    it('returns blue badge for investment on FMCK', () => {
      expect(getLoanTypeColor('investment', fmckTenant)).toBe('bg-blue-100 text-blue-800');
      expect(getLoanTypeColor('venture', fmckTenant)).toBe('bg-blue-100 text-blue-800');
      expect(getLoanTypeColor('educational', fmckTenant)).toBe('bg-indigo-100 text-indigo-800');
    });
  });
});

import { renderHook } from '@testing-library/react';
import { useTenantTerminology } from './tenantTerminology';

describe('useTenantTerminology hook', () => {
  it('provides idPlaceholder function that returns correct placeholders', () => {
    const { result } = renderHook(() => useTenantTerminology());
    expect(typeof result.current.idPlaceholder).toBe('function');
    expect(result.current.idPlaceholder('enter')).toBeDefined();
    expect(result.current.idPlaceholder('search')).toBeDefined();
    expect(result.current.idPlaceholder()).toBe(result.current.idPlaceholder('enter'));
    expect(result.current.idShort).toBeDefined();
    expect(result.current.idLabel).toBeDefined();
  });
});
