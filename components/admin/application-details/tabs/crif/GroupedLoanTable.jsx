import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isTradelineOpen } from '@/lib/utils/crifLoanGroups';
import { formatCrifDate, inr } from './formatters';
import TradelineDetailDialog from './TradelineDetailDialog';

function parseOpenDateMs(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function sortLoansByOpened(loans, direction) {
  const list = Array.isArray(loans) ? [...loans] : [];
  const dir = direction === 'asc' ? 1 : -1;
  return list.sort((a, b) => {
    const aOpen = isTradelineOpen(a) ? 1 : 0;
    const bOpen = isTradelineOpen(b) ? 1 : 0;
    if (bOpen !== aOpen) return bOpen - aOpen;
    return dir * (parseOpenDateMs(a.open_date) - parseOpenDateMs(b.open_date));
  });
}

export default function GroupedLoanTable({ group }) {
  const { label, loans, totals } = group;
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [openedSort, setOpenedSort] = useState('desc');

  const sortedLoans = useMemo(
    () => sortLoansByOpened(loans, openedSort),
    [loans, openedSort]
  );

  const toggleOpenedSort = () => {
    setOpenedSort((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const SortIcon =
    openedSort === 'asc' ? ArrowUp : openedSort === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[920px]">
          <thead className="bg-sky-50 text-sky-800 border-b border-sky-100">
            <tr>
              <th className="px-3 py-2.5 font-semibold text-xs">Loan type</th>
              <th className="px-3 py-2.5 font-semibold text-xs">Bank / lender</th>
              <th className="px-3 py-2.5 font-semibold text-xs">Account #</th>
              <th className="px-3 py-2.5 font-semibold text-xs">Status</th>
              <th className="px-3 py-2.5 font-semibold text-xs">
                <button
                  type="button"
                  onClick={toggleOpenedSort}
                  className="inline-flex items-center gap-1 hover:text-sky-950"
                  title={openedSort === 'desc' ? 'Newest first — click for oldest first' : 'Oldest first — click for newest first'}
                >
                  Opened
                  <SortIcon className="w-3.5 h-3.5" />
                </button>
              </th>
              <th className="px-3 py-2.5 font-semibold text-xs">Closed</th>
              <th className="px-3 py-2.5 font-semibold text-xs text-right">Sanctioned</th>
              <th className="px-3 py-2.5 font-semibold text-xs text-right">EMI</th>
              <th className="px-3 py-2.5 font-semibold text-xs text-right">Balance</th>
              <th className="px-3 py-2.5 font-semibold text-xs text-right">Overdue</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200 bg-sky-50/60">
              <td colSpan={6} className="px-3 py-2.5 text-sky-700 font-semibold text-xs">
                {label}
                <span className="ml-2 font-medium text-slate-500">({sortedLoans.length})</span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-xs text-sky-700 font-semibold">
                {inr(totals.sanctioned)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-xs text-sky-700 font-semibold">
                {inr(totals.emi)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-xs text-sky-700 font-semibold">
                {inr(totals.balance)}
              </td>
              <td
                className={cn(
                  'px-3 py-2.5 text-right tabular-nums text-xs font-semibold',
                  totals.overdue > 0 ? 'text-rose-600' : 'text-sky-700'
                )}
              >
                {inr(totals.overdue)}
              </td>
            </tr>
            {sortedLoans.map((t, i) => {
              const open = isTradelineOpen(t);
              return (
                <tr
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedLoan(t)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedLoan(t);
                    }
                  }}
                  className="border-b border-slate-100 last:border-0 hover:bg-sky-50/70 cursor-pointer"
                >
                  <td className="px-3 py-2 text-xs text-slate-800">{t.account_type || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-900 font-medium">
                    <span className="text-slate-400 font-normal mr-1.5 tabular-nums">{i + 1}</span>
                    <span className="text-sky-800 underline-offset-2 hover:underline">
                      {t.credit_guarantor || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] font-mono text-slate-500">{t.account_number || '—'}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1.5 py-0.5 normal-case',
                        open ? 'text-emerald-700 border-emerald-300' : 'text-slate-500 border-slate-200'
                      )}
                    >
                      {t.status || (open ? 'open' : 'closed')}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-slate-600 whitespace-nowrap">
                    {formatCrifDate(t.open_date)}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-slate-600 whitespace-nowrap">
                    {open ? '—' : formatCrifDate(t.closed_date)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs">{inr(t._sanctioned)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs">
                    {t._emi > 0 ? inr(t._emi) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs">{inr(t._balance)}</td>
                  <td
                    className={cn(
                      'px-3 py-2 text-right tabular-nums text-xs',
                      t._overdue > 0 && 'text-rose-600 font-semibold'
                    )}
                  >
                    {inr(t._overdue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TradelineDetailDialog
        loan={selectedLoan}
        open={Boolean(selectedLoan)}
        onOpenChange={(next) => {
          if (!next) setSelectedLoan(null);
        }}
      />
    </div>
  );
}
