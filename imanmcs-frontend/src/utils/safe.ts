export const safeMap = <T, R>(value: T[] | null | undefined, mapper: (item: T, index: number) => R): R[] => {
  if (!Array.isArray(value)) return [];
  return value.map(mapper);
};

export const toCurrency = (value: number | string | null | undefined): string => {
  const n = typeof value === 'string' ? Number(value) : value;
  const amount = Number.isFinite(n as number) ? (n as number) : 0;
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};
