import { adminUi } from '@/config/adminUiTokens';

export const collectionUi = {
  ...adminUi,
  page: 'space-y-4',
  kpiGrid: 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3',
  kpiCell: 'border border-slate-200 bg-white px-4 py-3',
  kpiLabel: 'text-[11px] font-medium text-slate-500 uppercase tracking-wide',
  kpiValue: 'text-xl font-semibold tabular-nums text-slate-900 mt-1',
  kpiHint: 'text-[11px] text-slate-400 mt-0.5',
  filterBar: 'flex flex-wrap items-end gap-3 border border-slate-200 bg-white px-4 py-3',
  sectionTitle: 'text-sm font-semibold text-slate-900',
  sectionSubtitle: 'text-xs text-slate-500 mt-0.5',
  segmentGroup: 'inline-flex border border-slate-200 bg-slate-50 p-0.5',
  segmentBtn: 'px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors',
  segmentBtnActive: 'bg-white text-slate-900 border border-slate-200 shadow-sm',
  tabBar: 'flex flex-wrap gap-0 border-b border-slate-200 bg-white',
  tabBtn: 'px-4 py-2.5 text-sm font-medium text-slate-500 border-b-2 border-transparent -mb-px transition-colors hover:text-slate-800',
  tabBtnActive: 'text-slate-900 border-slate-900',
};

export function formatInr(value, options = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: options.decimals ?? 0,
  })}`;
}
