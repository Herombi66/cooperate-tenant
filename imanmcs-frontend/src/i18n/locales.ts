export type Locale = 'en' | 'ha' | 'yo' | 'ff';

export const normalizeLocale = (raw: string): Locale => {
  const value = (raw || '').toString().trim().toLowerCase();
  const base = value.split(/[-_]/)[0];

  if (base === 'ha') return 'ha';
  if (base === 'yo') return 'yo';
  if (base === 'ff') return 'ff';
  return 'en';
};

