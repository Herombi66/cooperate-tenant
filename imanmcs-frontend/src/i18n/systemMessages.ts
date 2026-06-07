import { Locale, normalizeLocale } from './locales';

export const systemMessages = {
  en: {
    headerTitle: 'IMAN Cooperative System',
    toggleMenu: 'Toggle Menu',
    languageAria: 'Language',
    openUserMenu: 'Open user menu',
    psnLabel: 'PSN',
    logout: 'Logout',
    skipToContent: 'Skip to content',
    viewOnlyBanner: 'View-only mode: changes are disabled for Secretary access.',
    viewOnlyTag: 'View-only',
    viewOnlyWriteDisabled: 'View-only mode: write actions are disabled for Secretary.',
    viewOnlyChangesDisabled: 'View-only mode: changes are disabled',
    viewOnlyApprovalsDisabled: 'View-only mode: approvals are disabled',
    viewOnlyBulkActionsDisabled: 'View-only mode: bulk actions are disabled',
    viewOnlyDeleteDisabled: 'View-only mode: delete is disabled',
    viewOnlyReverseDisbursementDisabled: 'View-only mode: reverse disbursement is disabled',
    viewOnlyReverseApprovalDisabled: 'View-only mode: reverse approval is disabled',
    viewOnlyApproveProfitDisabled: 'View-only mode: approving profit shares is disabled',
    viewOnlyRejectProfitDisabled: 'View-only mode: rejecting profit shares is disabled',
    viewOnlyMarkPaidDisabled: 'View-only mode: marking profit shares as paid is disabled',
    viewOnlyImportProfitDisabled: 'View-only mode: importing profit data is disabled',
    viewOnlyCalculateProfitsDisabled: 'View-only mode: calculating profits is disabled',
    viewOnlyApproveExpensesDisabled: 'View-only mode: approving expenses is disabled',
    viewOnlyProcessPaymentsDisabled: 'View-only mode: processing payments is disabled',
    viewOnlyRejectExpensesDisabled: 'View-only mode: rejecting expenses is disabled'
  },
  ha: {
    headerTitle: 'Tsarin IMAN Cooperative',
    toggleMenu: 'Kunna Menu',
    languageAria: 'Harshe',
    openUserMenu: 'Buɗe menu na mai amfani',
    psnLabel: 'PSN',
    logout: 'Fita',
    skipToContent: 'Tsallaka zuwa abun ciki',
    viewOnlyBanner: 'Yanayin kallo-kawai: an hana canje-canje ga damar Sakatare.',
    viewOnlyTag: 'Kallo-kawai',
    viewOnlyWriteDisabled: 'Yanayin kallo-kawai: an hana ayyukan rubutu ga Sakatare.',
    viewOnlyChangesDisabled: 'Yanayin kallo-kawai: an hana canje-canje',
    viewOnlyApprovalsDisabled: 'Yanayin kallo-kawai: an hana amincewa',
    viewOnlyBulkActionsDisabled: 'Yanayin kallo-kawai: an hana ayyuka na rukuni',
    viewOnlyDeleteDisabled: 'Yanayin kallo-kawai: an hana gogewa',
    viewOnlyReverseDisbursementDisabled: 'Yanayin kallo-kawai: an hana juyar da fitar kuɗi',
    viewOnlyReverseApprovalDisabled: 'Yanayin kallo-kawai: an hana juyar da amincewa',
    viewOnlyApproveProfitDisabled: 'Yanayin kallo-kawai: an hana amincewa da rabon riba',
    viewOnlyRejectProfitDisabled: 'Yanayin kallo-kawai: an hana ƙin rabon riba',
    viewOnlyMarkPaidDisabled: 'Yanayin kallo-kawai: an hana sanya rabon riba a matsayin an biya',
    viewOnlyImportProfitDisabled: 'Yanayin kallo-kawai: an hana shigo da bayanan riba',
    viewOnlyCalculateProfitsDisabled: 'Yanayin kallo-kawai: an hana lissafin riba',
    viewOnlyApproveExpensesDisabled: 'Yanayin kallo-kawai: an hana amincewa da kuɗaɗen kashewa',
    viewOnlyProcessPaymentsDisabled: 'Yanayin kallo-kawai: an hana aiwatar da biyan kuɗi',
    viewOnlyRejectExpensesDisabled: 'Yanayin kallo-kawai: an hana ƙin kuɗaɗen kashewa'
  },
  yo: {
    headerTitle: 'Ẹ̀rọ IMAN Cooperative',
    toggleMenu: 'Yí Menu Padà',
    languageAria: 'Èdè',
    openUserMenu: 'Ṣí akojọ olumulo',
    psnLabel: 'PSN',
    logout: 'Jáde',
    skipToContent: 'Fo sí akoonu',
    viewOnlyBanner: 'Ìpo ìwò-nìkan: a ti di àwọn ayípadà fún Sakátárì.',
    viewOnlyTag: 'Ìwò-nìkan',
    viewOnlyWriteDisabled: 'Ìpo ìwò-nìkan: a ti di àwọn iṣẹ́ ìkọ fún Sakátárì.',
    viewOnlyChangesDisabled: 'Ìpo ìwò-nìkan: a ti di àwọn ayípadà',
    viewOnlyApprovalsDisabled: 'Ìpo ìwò-nìkan: a ti di ìfọwọ́sí',
    viewOnlyBulkActionsDisabled: 'Ìpo ìwò-nìkan: a ti di àwọn iṣẹ́ àpapọ̀',
    viewOnlyDeleteDisabled: 'Ìpo ìwò-nìkan: a ti di piparẹ́',
    viewOnlyReverseDisbursementDisabled: 'Ìpo ìwò-nìkan: a ti di pípadà ìtúsílẹ̀ owó',
    viewOnlyReverseApprovalDisabled: 'Ìpo ìwò-nìkan: a ti di pípadà ìfọwọ́sí',
    viewOnlyApproveProfitDisabled: 'Ìpo ìwò-nìkan: a ti di ìfọwọ́sí pínpín èrè',
    viewOnlyRejectProfitDisabled: 'Ìpo ìwò-nìkan: a ti di ìkọ̀ pínpín èrè',
    viewOnlyMarkPaidDisabled: 'Ìpo ìwò-nìkan: a ti di fífi pínpín èrè sí “tí a san”',
    viewOnlyImportProfitDisabled: 'Ìpo ìwò-nìkan: a ti di ìgbàwọlé data èrè',
    viewOnlyCalculateProfitsDisabled: 'Ìpo ìwò-nìkan: a ti di ìṣírò èrè',
    viewOnlyApproveExpensesDisabled: 'Ìpo ìwò-nìkan: a ti di ìfọwọ́sí ìnáwó',
    viewOnlyProcessPaymentsDisabled: 'Ìpo ìwò-nìkan: a ti di ìṣiṣẹ́ ìsanwó',
    viewOnlyRejectExpensesDisabled: 'Ìpo ìwò-nìkan: a ti di ìkọ̀ ìnáwó'
  },
  ff: {
    headerTitle: 'IMAN Cooperative System',
    toggleMenu: 'Wondude Menu',
    languageAria: 'Ɗemngal',
    openUserMenu: 'Uddit menu huutorɗo',
    psnLabel: 'PSN',
    logout: 'Yaltu',
    skipToContent: 'Doggol to ko eɓɓo',
    viewOnlyBanner: 'Haalata yiyde tan: bayle ɗee a woodaani e jamiroore Sakatare.',
    viewOnlyTag: 'Yiyde tan',
    viewOnlyWriteDisabled: 'Haalata yiyde tan: golle binndol woodaani e jamiroore Sakatare.',
    viewOnlyChangesDisabled: 'Haalata yiyde tan: bayle ɗee woodaani',
    viewOnlyApprovalsDisabled: 'Haalata yiyde tan: jaɓe ɗee woodaani',
    viewOnlyBulkActionsDisabled: 'Haalata yiyde tan: golle ɗee e gootol woodaani',
    viewOnlyDeleteDisabled: 'Haalata yiyde tan: momtude woodaani',
    viewOnlyReverseDisbursementDisabled: 'Haalata yiyde tan: ruttinde ɓurtal ceede woodaani',
    viewOnlyReverseApprovalDisabled: 'Haalata yiyde tan: ruttinde jaɓgol woodaani',
    viewOnlyApproveProfitDisabled: 'Haalata yiyde tan: jaɓgol seŋŋunde jaarama woodaani',
    viewOnlyRejectProfitDisabled: 'Haalata yiyde tan: saliinde seŋŋunde jaarama woodaani',
    viewOnlyMarkPaidDisabled: 'Haalata yiyde tan: teeŋtude “payaa” e seŋŋunde jaarama woodaani',
    viewOnlyImportProfitDisabled: 'Haalata yiyde tan: naatnude bayannde jaarama woodaani',
    viewOnlyCalculateProfitsDisabled: 'Haalata yiyde tan: hisaabude jaarama woodaani',
    viewOnlyApproveExpensesDisabled: 'Haalata yiyde tan: jaɓgol jeyiɗe woodaani',
    viewOnlyProcessPaymentsDisabled: 'Haalata yiyde tan: gollude paymente woodaani',
    viewOnlyRejectExpensesDisabled: 'Haalata yiyde tan: saliinde jeyiɗe woodaani'
  }
} as const;

type SystemKey = keyof typeof systemMessages.en;

export const tSystemStatic = (key: SystemKey, vars?: Record<string, string | number>) => {
  const raw =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('iman.locale') || window.navigator?.language || 'en'
      : 'en';
  const locale = normalizeLocale(raw) as Locale;
  const dict =
    (systemMessages as unknown as Record<string, Record<SystemKey, string>>)[locale] || systemMessages.en;
  const template = dict[key] ?? systemMessages.en[key] ?? String(key);
  if (!vars) return template;
  return Object.keys(vars).reduce((acc, k) => acc.replaceAll(`{${k}}`, String(vars[k])), template);
};
