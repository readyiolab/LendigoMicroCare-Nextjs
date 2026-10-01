import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { enquiryWindowCounts, filterInquiriesByWindow } from '@/lib/utils/crifLoanGroups';

export default function EnquirySummary({ inquiries, windowDays, onWindowChange }) {
  const list = useMemo(
    () => (Array.isArray(inquiries) ? inquiries : []),
    [inquiries]
  );
  const counts = useMemo(() => enquiryWindowCounts(list), [list]);
  const filtered = useMemo(
    () => filterInquiriesByWindow(list, windowDays),
    [list, windowDays]
  );
  if (!list.length) return null;

  const chips = [
    { label: '30d', value: counts.last30, days: 30 },
    { label: '90d', value: counts.last90, days: 90 },
    { label: '180d', value: counts.last180, days: 180 },
    { label: 'All', value: counts.total, days: 'all' },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h4 className="text-sm font-semibold text-slate-900">Enquiry summary</h4>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const active = String(windowDays) === String(c.days);
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => onWindowChange?.(c.days)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors',
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                <span className={cn(active ? 'text-slate-300' : 'text-slate-400', 'font-medium')}>
                  {c.label}
                </span>
                <span className="tabular-nums">{c.value}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[560px]">
          <thead className="bg-sky-50 text-sky-800 border-b border-sky-100">
            <tr>
              <th className="px-3 py-2.5 font-semibold text-xs">Date</th>
              <th className="px-3 py-2.5 font-semibold text-xs">Lender</th>
              <th className="px-3 py-2.5 font-semibold text-xs">Purpose</th>
              <th className="px-3 py-2.5 font-semibold text-xs text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-slate-500">
                  No enquiries in this window.
                </td>
              </tr>
            ) : (
              filtered.map((h, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 text-xs tabular-nums text-slate-700">{h.inquiry_date || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-900 font-medium">{h.lender_name || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{h.purpose || h.loan_type || '—'}</td>
                  <td className="px-3 py-2 text-xs text-right tabular-nums">
                    {h.amount != null && h.amount !== '' ? String(h.amount) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
