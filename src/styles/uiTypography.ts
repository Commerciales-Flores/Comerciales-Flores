// src/styles/uiTypography.ts

export const uiTypography = {
  pageTitle: 'text-2xl font-bold tracking-tight text-gray-900',
  pageDescription: 'mt-0.5 text-sm text-gray-500',

  sectionTitle: 'text-base font-bold text-slate-900',
  sectionDescription: 'mt-1 text-sm text-slate-500',

  cardTitle: 'text-xl font-bold text-slate-900',
  cardSubtitle: 'text-sm text-slate-500',

  badgeLabel:
    'text-[11px] font-bold uppercase tracking-widest',

  miniStatLabel:
    'text-[10px] font-bold uppercase tracking-widest',
  miniStatValue: 'mt-1 text-sm font-semibold',

  infoBlockLabel:
    'text-[10px] font-bold uppercase tracking-widest text-slate-400',
  infoBlockValue:
    'mt-1 break-words text-sm font-semibold text-slate-900',

  formLabel:
    'ml-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500',
  inputText: 'text-sm text-slate-800',

  helperText: 'text-xs text-slate-500',
  bodyText: 'text-sm leading-relaxed text-slate-500',

  dangerTitle: 'text-sm font-bold text-rose-700',
  dangerLabel:
    'mt-1 text-[11px] font-bold uppercase tracking-widest text-rose-400',

  modalTitle: 'text-lg font-bold text-gray-900',
  modalBody: 'mt-2 text-sm leading-relaxed text-gray-500',

  buttonText: 'text-sm font-semibold',
  buttonTextBold: 'text-sm font-bold',

  statusSuccess: 'text-emerald-700',
  statusError: 'text-rose-700',
  statusWarning: 'text-amber-600',
  statusInfo: 'text-blue-700',
} as const;

export type UITypographyKey = keyof typeof uiTypography;