export const safeMap = <T, R>(value: T[] | null | undefined, mapper: (item: T, index: number) => R): R[] => {
  if (!Array.isArray(value)) return [];
  return value.map(mapper);
};

export interface FormatNairaOptions {
  showDecimals?: boolean;
  compact?: boolean;
}

/**
 * Standard Nigerian Naira currency formatter for FMCKSMCS and cooperative platform.
 * Formats numbers into consistent Nigerian Naira currency strings (e.g., ₦5,000, ₦1,250,000, ₦5,000.50).
 */
export const formatNaira = (
  value: number | string | null | undefined,
  options?: FormatNairaOptions
): string => {
  if (value === null || value === undefined || value === '') return '₦0';
  const n = typeof value === 'string' ? Number(String(value).replace(/[^0-9.-]+/g, '')) : value;
  const amount = Number.isFinite(n as number) ? (n as number) : 0;

  if (options?.compact && Math.abs(amount) >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (options?.compact && Math.abs(amount) >= 1_000) {
    return `₦${(amount / 1_000).toFixed(0)}K`;
  }

  const isWhole = Number.isInteger(amount);
  const minDecimals = options?.showDecimals ? 2 : (isWhole ? 0 : 2);
  const maxDecimals = options?.showDecimals ? 2 : 2;

  const formattedNumber = Math.abs(amount).toLocaleString('en-NG', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });

  return amount < 0 ? `-₦${formattedNumber}` : `₦${formattedNumber}`;
};

export const toCurrency = (value: number | string | null | undefined, showDecimals?: boolean): string => {
  return formatNaira(value, { showDecimals });
};
