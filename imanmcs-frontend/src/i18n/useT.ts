import { useMemo } from 'react';
import { normalizeLocale } from './locales';

type MessageDict = Record<string, Record<string, string>>;

export const useT = <T extends MessageDict>(messages: T) => {
  const raw =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('iman.locale') || window.navigator?.language || 'en'
      : 'en';
  const locale = normalizeLocale(raw);

  return useMemo(() => {
    const dict = (messages as any)[locale] || (messages as any).en || {};

    return (key: keyof typeof dict, vars?: Record<string, string | number>) => {
      const template = dict[key as any] ?? (messages as any).en?.[key as any] ?? String(key);
      if (!vars) return template;
      return Object.keys(vars).reduce((acc, k) => acc.replaceAll(`{${k}}`, String(vars[k])), template);
    };
  }, [locale, messages]);
};

