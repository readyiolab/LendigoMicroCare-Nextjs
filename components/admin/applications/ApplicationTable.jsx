import React, { memo } from 'react';
import { Phone, FileText, Eye, Pencil, XCircle, ChevronLeft, ChevronRight, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { getApplicationRef } from '@/utils/applicationRef';
import { StatusBadge } from '@/utils/statusUtils';
import { shortLeadLabel, shortLoanLabel } from '@/utils/customerIdentity';

function maskEmail(email) {
  if (!email || !String(email).includes('@')) return '—';
  const [user, domain] = String(email).split('@');
  if (!user) return '—';
  return `${user.slice(0, 1)}****@${domain}`;
}

function createFormatter(options) {
  try {
    return new Intl.DateTimeFormat('en-IN', options);
  } catch {
    return null;
  }
}

// Building Intl formatters is expensive; one instance each instead of two per row per render
const DATE_TIME_FORMAT = createFormatter({
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const DATE_FORMAT = createFormatter({
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  try {
    if (!DATE_TIME_FORMAT) throw new Error('Intl unavailable');
    const parts = DATE_TIME_FORMAT.formatToParts(d);

    let day = '', month = '', year = '', hour = '', minute = '', dayPeriod = '';
    for (const p of parts) {
      if (p.type === 'day') day = p.value;
      else if (p.type === 'month') month = p.value;
      else if (p.type === 'year') year = p.value;
      else if (p.type === 'hour') hour = p.value;
      else if (p.type === 'minute') minute = p.value;
      else if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
    }
    return `${day}-${month}-${year} ${hour}:${minute} ${dayPeriod}`.trim();
  } catch {
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hours}:${min} ${ampm}`;
  }
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    if (!DATE_FORMAT) throw new Error('Intl unavailable');
    const parts = DATE_FORMAT.formatToParts(d);
    let day = '', month = '', year = '';
    for (const p of parts) {
      if (p.type === 'day') day = p.value;
      else if (p.type === 'month') month = p.value;
      else if (p.type === 'year') year = p.value;
    }
    return `${day}-${month}-${year}`;
  } catch {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function StatusPill({ status, mandateStatus }) {
  return <StatusBadge status={status} mandateStatus={mandateStatus} />;
}

const thClass =
  'px-3 py-2.5 text-[12px] font-semibold text-slate-600 whitespace-nowrap border-b border-slate-200 text-left bg-white';
const tdClass = 'px-3 py-2.5 text-[13px] text-slate-900 whitespace-nowrap border-b border-slate-200';

function SortableTh({ field, label, sort, onSortChange }) {
  const order = sort?.field === field ? sort.order : '';
  const Icon = order === 'desc' ? ArrowDown : order === 'asc' ? ArrowUp : ArrowUpDown;
  const nextHint = order === 'desc' ? 'oldest first' : order === 'asc' ? 'default order' : 'newest first';
  if (!onSortChange) return <th className={thClass}>{label}</th>;
  return (
    <th
      className={thClass}
      aria-sort={order === 'desc' ? 'descending' : order === 'asc' ? 'ascending' : 'none'}
    >
      <button
        type="button"
        onClick={() => onSortChange(field)}
        title={`Sort by ${label.toLowerCase()} (${nextHint})`}
        className={cn(
          'inline-flex items-center gap-1 hover:text-slate-900 transition-colors',
          order && 'text-slate-900'
        )}
      >
        {label}
        <Icon className={cn('h-3.5 w-3.5', order ? 'text-sky-600' : 'text-slate-400')} />
      </button>
    </th>
  );
}

const ApplicationTable = memo(function ApplicationTable({
  applications,
  loading,
  currentAdminRole,
  currentAdminId,
  lockingAppId,
  handleLockAndAction,
  openLogCall,
  statusFilter,
  listView,
  pagination,
  onPageChange,
  onPageSizeChange,
  sort,
  onSortChange,
}) {
  const emptyMessage = listView?.emptyMessage || (
    statusFilter !== 'all'
      ? 'Try changing the status filter to see other applications.'
      : 'Wait for new applications to be submitted by users.'
  );

  const hasRows = applications && applications.length > 0;

  if (loading && !hasRows) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <Spinner size="lg" variant="primary" />
        <p className="text-xs text-slate-400">Loading applications…</p>
      </div>
    );
  }

  if (!hasRows) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
          <FileText className="h-6 w-6 text-slate-300" />
        </div>
        <h3 className="text-sm font-medium text-slate-900 mb-1">No applications found</h3>
        <p className="text-sm text-slate-500 max-w-sm">{emptyMessage}</p>
      </div>
    );
  }

  const totalCount = pagination?.totalCount ?? pagination?.total ?? applications?.length ?? 0;
  const limit = pagination?.limit ?? 20;
  const currentPage = pagination?.currentPage ?? pagination?.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const from = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, totalCount);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-sky-100 overflow-hidden">
          <div className="h-full bg-sky-500 animate-pulse w-full" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1780px] border-collapse">
          <thead>
            <tr className="bg-white border-b border-slate-200">
              <th className={thClass}>Assigned CM</th>
              <th className={thClass}>Applied Date/Time</th>
              <SortableTh field="disbursed_at" label="Disbursal Date" sort={sort} onSortChange={onSortChange} />
              <th className={thClass}>Customer Name</th>
              <th className={thClass}>Status</th>
              <SortableTh field="status_updated_at" label="Last Updated" sort={sort} onSortChange={onSortChange} />
              <th className={thClass}>Customer ID</th>
              <th className={thClass}>Lead ID</th>
              <th className={thClass}>Loan Acc</th>
              <th className={thClass}>Email</th>
              <th className={thClass}>Mobile</th>
              <th className={cn(thClass, 'text-right')}>Monthly Income</th>
              <th className={cn(thClass, 'text-right')}>Loan Required</th>
              <th className={thClass}>City</th>
              <th className={thClass}>State</th>
              <th className={thClass}>Pincode</th>
              <th className={thClass}>Source</th>
              <th className={thClass}>Lock</th>
              <th className={thClass}>Case Type</th>
              <th className={cn(thClass, 'text-right pr-4')}>Action</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {applications.map((app) => {
              const appRef = getApplicationRef(app);
              const name = app.full_name || app.user?.full_name || '—';
              const email = app.personal_email || app.email || app.user?.email;
              const mobile = app.mobile || app.profile_mobile || app.user?.mobile || '';
              const lockedByOther = app.locked_by && String(app.locked_by) !== String(currentAdminId);
              const lockBlocksActions = lockedByOther && currentAdminRole === 'telecaller';
              const lockerLabel = app.locked_admin_name || (app.locked_by ? 'Another staff' : null);
              const hideCustomerCall = currentAdminRole === 'credit_manager';
              const income = app.net_monthly_income ?? app.monthly_income;
              const loanAmt = app.principal_amount || app.principalAmount || app.approved_amount;

              return (
                <tr
                  key={app.id || app._id}
                  className="hover:bg-slate-50 transition-colors"
                  onMouseEnter={() => import('@/views/admin/ApplicationDetailsPage').catch(() => {})}
                >
                  <td className={tdClass}>
                    {app.credit_admin_name || '—'}
                  </td>
                  <td className={cn(tdClass, 'font-mono tabular-nums')}>
                    {formatDateTime(app.submitted_at || app.created_at)}
                  </td>
                  <td className={cn(tdClass, 'font-mono tabular-nums')}>
                    {formatDate(app.disbursal_date || app.disbursed_at)}
                  </td>
                  <td className={tdClass}>
                    <button
                      type="button"
                      className="text-[#2563EB] font-medium hover:underline text-left"
                      disabled={lockingAppId === appRef || lockBlocksActions}
                      onClick={() => handleLockAndAction(appRef, 'review')}
                    >
                      {String(name).toUpperCase()}
                    </button>
                  </td>
                  <td className={tdClass}>
                    <StatusPill
                      status={app.application_status || app.status}
                      mandateStatus={app.mandate_status}
                    />
                  </td>
                  <td className={cn(tdClass, 'font-mono tabular-nums')}>
                    {formatDateTime(app.status_updated_at)}
                  </td>
                  <td className={cn(tdClass, 'font-mono text-[12px]')}>{app.customer_code || '—'}</td>
                  <td className={cn(tdClass, 'font-mono text-[12px]')}>{shortLeadLabel(app.lead_id) || app.lead_id || '—'}</td>
                  <td className={cn(tdClass, 'font-mono text-[12px]')}>{shortLoanLabel(app.loan_account_number) || '—'}</td>
                  <td className={tdClass} title={email || undefined}>
                    {maskEmail(email)}
                  </td>
                  <td className={tdClass}>
                    <div className="inline-flex items-center gap-2">
                      <span className="font-mono text-[12px] text-slate-700 tabular-nums">
                        {mobile || '—'}
                      </span>
                      {mobile && !hideCustomerCall && (
                        <button
                          type="button"
                          title="Call logs — add a call or view history"
                          aria-label={`Call logs for ${name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openLogCall({
                              id: app.id,
                              name,
                              mobile,
                              applicationLabel: app.application_number || appRef,
                              followUpDate: app.follow_up_date,
                            });
                          }}
                          className="inline-flex h-6 w-7 items-center justify-center rounded-full bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors shrink-0"
                        >
                          <Phone className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className={cn(tdClass, 'text-right font-mono tabular-nums')}>
                    {formatMoney(income)}
                  </td>
                  <td className={cn(tdClass, 'text-right font-mono tabular-nums')}>
                    {formatMoney(loanAmt)}
                  </td>
                  <td className={tdClass}>{app.city || '—'}</td>
                  <td className={tdClass}>{app.state || '—'}</td>
                  <td className={cn(tdClass, 'font-mono')}>{app.pincode || '—'}</td>
                  <td className={tdClass}>
                    {app.application_type === 'assisted' ? 'Assisted' : 'Website'}
                  </td>
                  <td className={tdClass}>
                    {lockerLabel ? (
                      <span className="text-[11px] font-semibold text-amber-700">
                        {lockBlocksActions ? 'Locked' : 'In progress'} · {lockerLabel}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className={tdClass}>
                    {(Number(app.is_repeat_customer) === 1 || app.is_repeat_customer === true || app.is_repeat_customer === '1' || app.bucket === 'repeat') ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Repeat
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                        New Case
                      </span>
                    )}
                  </td>
                  <td className={cn(tdClass, 'text-right pr-4')}>
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-7 px-2.5 text-[11px] border-slate-200 text-slate-700',
                          lockedByOther && lockBlocksActions && 'bg-red-50 text-red-700 border-red-100'
                        )}
                        disabled={lockingAppId === appRef || lockBlocksActions}
                        onClick={() => handleLockAndAction(appRef, 'review')}
                      >
                        {lockBlocksActions ? (
                          <><XCircle className="h-3 w-3 mr-1" /> Locked</>
                        ) : (
                          <><Eye className="h-3 w-3 mr-1" /> Open</>
                        )}
                      </Button>

                      {currentAdminRole === 'telecaller' &&
                        ['draft', 'pending_eligibility'].includes(app.application_status || app.status) && (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-slate-900 hover:bg-slate-800 text-white"
                            disabled={lockingAppId === appRef || lockBlocksActions}
                            onClick={() => handleLockAndAction(appRef, 'fill', app.lead_id)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Fill
                          </Button>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <div>
            Showing <span className="font-semibold text-slate-700 tabular-nums">{from}</span>
            {to > from ? (
              <>–<span className="font-semibold text-slate-700 tabular-nums">{to}</span></>
            ) : null}
            {' '}of <span className="font-semibold text-slate-700 tabular-nums">{totalCount}</span> application{totalCount === 1 ? '' : 's'}
          </div>

          {onPageSizeChange && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-slate-400">Rows:</span>
              <select
                value={limit}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-7 px-2 py-0.5 text-xs bg-white border border-slate-200 rounded text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                disabled={loading}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>

        {totalPages > 1 && onPageChange && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs border-slate-200 text-slate-600 disabled:opacity-40"
              disabled={currentPage <= 1 || loading}
              onClick={() => onPageChange(currentPage - 1)}
              title="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              Prev
            </Button>

            <div className="hidden sm:flex items-center gap-1">
              {getPageNumbers().map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 select-none">
                    …
                  </span>
                ) : (
                  <Button
                    key={`page-${p}`}
                    type="button"
                    variant={p === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-7 w-7 p-0 text-xs font-medium',
                      p === currentPage
                        ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    )}
                    disabled={loading}
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </Button>
                )
              )}
            </div>

            <span className="sm:hidden text-xs text-slate-600 font-medium px-2">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs border-slate-200 text-slate-600 disabled:opacity-40"
              disabled={currentPage >= totalPages || loading}
              onClick={() => onPageChange(currentPage + 1)}
              title="Next page"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

export default ApplicationTable;
