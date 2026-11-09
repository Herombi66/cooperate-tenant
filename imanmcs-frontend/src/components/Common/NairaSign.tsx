import { createLucideIcon } from 'lucide-react';

/**
 * NairaSign icon matching Lucide icon design system.
 * Represents the Nigerian Naira currency symbol (₦).
 */
export const NairaSign = createLucideIcon('NairaSign', [
  ['path', { d: 'M6 3v18', key: 'v1' }],
  ['path', { d: 'M18 3v18', key: 'v2' }],
  ['path', { d: 'M6 3l12 18', key: 'diag' }],
  ['path', { d: 'M4 10h16', key: 'bar1' }],
  ['path', { d: 'M4 14h16', key: 'bar2' }]
]);

export default NairaSign;
