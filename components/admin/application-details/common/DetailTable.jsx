import { cn } from '@/lib/utils';
import { adminUi } from '@/config/adminUiTokens';

const EMPTY = '—';

/** Primary CTA — navy fill, easy to spot */
export const btnPrimary =
  'h-8 px-3.5 text-[12px] font-bold rounded-md bg-[#222222] hover:bg-[#111111] text-white shadow-sm border border-[#222222]';

/** Secondary / outline action */
export const btnSecondary =
  'h-8 px-3.5 text-[12px] font-bold rounded-md border-2 border-[#222222]/25 bg-[#FFF6D9] text-[#222222] hover:bg-[#FFE9A8] hover:border-[#222222]/40 shadow-sm';

/** Positive confirm */
export const btnSuccess =
  'h-8 px-3.5 text-[12px] font-bold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-emerald-700';

/** Destructive / void */
export const btnDanger =
  'h-8 px-3.5 text-[12px] font-bold rounded-md border-2 border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 shadow-sm';

/** Inline text link that still reads as an action */
export const linkAction =
  'text-[12px] font-bold text-[#222222] hover:underline underline-offset-2 cursor-pointer';

/**
 * Shared professional table section used across application-detail tabs.
 */
export function DetailTable({ title, action, children, className, compact = false }) {
  return (
    <section
      className={cn(adminUi.tableShell, className)}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-2',
          compact ? 'px-2.5 py-1.5' : 'px-4 py-2.5',
          adminUi.tableHeader
        )}
      >
        <h3
          className={cn(
            'font-semibold text-slate-800 tracking-wide uppercase',
            compact ? 'text-[10px]' : 'text-[12px] font-bold'
          )}
        >
          {title}
        </h3>
        {action}
      </div>
      <table className={cn('w-full text-left border-collapse', compact && 'table-fixed', adminUi.tableBody)}>
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}

export function DetailRow({
  label,
  children,
  mono = false,
  labelWidth = 'w-[36%]',
  emphasize = true,
  compact = false,
  align = 'left',
}) {
  const isEmpty =
    children == null ||
    children === '' ||
    children === EMPTY ||
    (typeof children === 'string' && children.trim() === '');

  return (
    <tr className={cn(adminUi.tableRow, adminUi.tableRowHover)}>
      <th
        scope="row"
        className={cn(
          'align-middle font-medium text-slate-600',
          compact ? 'px-2.5 py-1 text-[10px] leading-snug' : 'max-w-[200px] px-4 py-2.5 align-top text-[12px] font-semibold',
          adminUi.tableLabelCell,
          labelWidth
        )}
      >
        {label}
      </th>
      <td
        className={cn(
          'align-middle break-words min-w-0',
          compact ? 'px-2.5 py-1 text-[10px] leading-snug' : 'px-4 py-2.5 align-top text-[13px]',
          adminUi.tableValueCell,
          emphasize && !isEmpty && (compact ? 'font-semibold' : 'font-bold'),
          mono && !isEmpty && 'font-mono tabular-nums font-semibold',
          mono && compact && 'text-[10px]',
          mono && !compact && 'text-[12.5px]',
          align === 'right' && 'text-right',
          isEmpty && cn(adminUi.tableMuted, 'font-normal italic')
        )}
      >
        {isEmpty ? EMPTY : children}
      </td>
    </tr>
  );
}

/** Full-width data table with column headers (lists: docs, history, EMIs, etc.) */
export function DataTable({ title, action, columns = [], children, className, emptyMessage }) {
  const hasBody = Boolean(children);

  return (
    <section
      className={cn(adminUi.tableShell, className)}
    >
      {(title || action) && (
        <div className={cn('flex items-center justify-between gap-3 px-3 py-2', adminUi.tableHeader)}>
          {title ? (
            <h3 className="text-[12px] font-bold text-slate-800 tracking-wide uppercase">{title}</h3>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className={cn('w-full text-left border-collapse min-w-[480px]', adminUi.tableBody)}>
          {columns.length > 0 && (
            <thead>
              <tr className={adminUi.tableHeader}>
                {columns.map((col) => (
                  <th
                    key={col.key || col.label}
                    className={cn(
                      'px-3 py-2 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap text-slate-600',
                      col.className
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {hasBody ? (
              children
            ) : (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className={cn(
                    'px-3 py-6 text-center text-[13px] font-medium bg-white',
                    adminUi.tableMuted
                  )}
                >
                  {emptyMessage || 'No records'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DataCell({ children, mono = false, className, muted = false, emphasize = true }) {
  const isEmpty = children == null || children === '';
  return (
    <td
      className={cn(
        'px-3 py-2 align-middle text-[13px] border-b border-slate-200 bg-white text-slate-900',
        emphasize && !muted && !isEmpty && 'font-semibold',
        mono && 'font-mono tabular-nums text-[12.5px] font-semibold',
        muted && cn(adminUi.tableMuted, 'font-normal'),
        className
      )}
    >
      {isEmpty ? EMPTY : children}
    </td>
  );
}

export { EMPTY };
