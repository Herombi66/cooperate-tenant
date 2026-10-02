export const safeMap = <T, R>(value: T[] | null | undefined, mapper: (item: T, index: number) => R): R[] => {
  if (!Array.isArray(value)) return [];
  return value.map(mapper);
};

export interface FormatNairaOptions {
  showDecimals?: boolean;
  compact?: boolean;
}

let globalCurrencySymbol = '₦';

export const setGlobalCurrencySymbol = (symbol?: string) => {
  if (symbol && typeof symbol === 'string' && symbol.trim()) {
    globalCurrencySymbol = symbol.trim();
    try {
      localStorage.setItem('tenant_currency_symbol', globalCurrencySymbol);
    } catch {}
  }
};

export const getGlobalCurrencySymbol = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('tenant_currency_symbol');
      if (stored) return stored;
    } catch {}
  }
  return globalCurrencySymbol;
};

export const formatNaira = (
  value: number | string | null | undefined,
  options?: FormatNairaOptions & { symbol?: string }
): string => {
  const sym = options?.symbol || getGlobalCurrencySymbol();
  if (value === null || value === undefined || value === '') return `${sym}0`;
  const n = typeof value === 'string' ? Number(String(value).replace(/[^0-9.-]+/g, '')) : value;
  const amount = Number.isFinite(n as number) ? (n as number) : 0;

  if (options?.compact && Math.abs(amount) >= 1_000_000) {
    return `${sym}${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (options?.compact && Math.abs(amount) >= 1_000) {
    return `${sym}${(amount / 1_000).toFixed(0)}K`;
  }

  const isWhole = Number.isInteger(amount);
  const minDecimals = options?.showDecimals ? 2 : (isWhole ? 0 : 2);
  const maxDecimals = options?.showDecimals ? 2 : 2;

  const formattedNumber = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });

  return amount < 0 ? `-${sym}${formattedNumber}` : `${sym}${formattedNumber}`;
};

export const formatCurrency = formatNaira;

export const toCurrency = (value: number | string | null | undefined, showDecimals?: boolean): string => {
  return formatNaira(value, { showDecimals });
};
