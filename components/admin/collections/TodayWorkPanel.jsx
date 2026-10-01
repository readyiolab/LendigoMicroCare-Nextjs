import { useCallback, useEffect, useState } from 'react';
import { HandCoins, MapPin, ClipboardCheck, CalendarClock, ExternalLink } from 'lucide-react';
import { useNavigate } from '@/lib/router';
import { collectionAPI } from '@/lib/api/collection';
import { Button } from '@/components/ui/button';
import { account360Path } from '@/utils/customerIdentity';
import CollectionSection from '@/components/admin/collections/shared/CollectionSection';
import { formatInr } from '@/components/admin/collections/shared/collectionUi';

function WorkList({ title, icon: Icon, rows, empty, onOpenLoan, renderMeta }) {
  return (
    <CollectionSection title={title} subtitle={`${rows.length} item${rows.length === 1 ? '' : 's'}`}>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">{empty}</p>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-100">
          {rows.map((row) => (
            <div key={`${title}-${row.id || row.loan_application_id}`} className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {row.borrower_name || 'Borrower'} · {row.loan_account_number || row.application_number || row.lead_id}
                </div>
                <div className="text-slate-500 mt-0.5">{renderMeta?.(row)}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onOpenLoan(row)}>
                  Open
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => window.open(account360Path(row.user_id || row.loan_application_id), '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollectionSection>
  );
}

export default function TodayWorkPanel({ myQueue = false, onToggleMyQueue, onGoOverdue, onGoApproval, onGoPtp }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await collectionAPI.getTodayWork({ myQueue: myQueue ? 'true' : undefined });
      if (res.status === 1) setData(res.data);
      else setError(res.message || 'Failed to load');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [myQueue]);

  useEffect(() => {
    load();
  }, [load]);

  const openLoan = (row) => {
    const loanId = row.loan_application_id || row.loanApplicationId;
    if (onGoOverdue) onGoOverdue(String(loanId));
    else navigate(`/admin/collection?tab=overdue&loanId=${loanId}`);
  };

  if (loading) {
    return <p className="text-sm text-slate-500 p-4">Loading today’s work…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 p-4">{error}</p>;
  }

  const counts = data?.counts || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Today’s work</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
            {myQueue ? 'My queue only' : 'All agents'} · PTP {counts.ptpDueToday || 0} · Follow-ups{' '}
            {counts.followUpsDue || 0} · Visits {counts.visitRequired || 0} · Approvals{' '}
            {counts.punchesPending || 0}
          </p>
        </div>
        <div className="flex gap-2">
          {onToggleMyQueue && (
            <Button
              type="button"
              size="sm"
              variant={myQueue ? 'default' : 'outline'}
              onClick={onToggleMyQueue}
            >
              My queue
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={load}>
            Refresh
          </Button>
          {onGoApproval && (
            <Button type="button" size="sm" variant="outline" onClick={onGoApproval}>
              Approvals
            </Button>
          )}
          {onGoPtp && (
            <Button type="button" size="sm" variant="outline" onClick={onGoPtp}>
              PTP
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <WorkList
          title="PTP due today"
          icon={HandCoins}
          rows={data?.ptpDueToday || []}
          empty="No promises due today"
          onOpenLoan={openLoan}
          renderMeta={(r) => `${formatInr(r.promise_amount)} · ${r.promise_date}`}
        />
        <WorkList
          title="Follow-ups due"
          icon={CalendarClock}
          rows={data?.followUpsDue || []}
          empty="No follow-ups due"
          onOpenLoan={openLoan}
          renderMeta={(r) => `${r.follow_up_status || 'open'} · ${r.next_follow_up_date || ''}`}
        />
        <WorkList
          title="Visit required"
          icon={MapPin}
          rows={data?.visitRequired || []}
          empty="No visit-required loans"
          onOpenLoan={openLoan}
          renderMeta={(r) => `DPD ${r.max_dpd || 0}`}
        />
        <WorkList
          title="Punches pending approval"
          icon={ClipboardCheck}
          rows={data?.punchesPending || []}
          empty="No pending punches"
          onOpenLoan={(r) => (onGoApproval ? onGoApproval() : openLoan(r))}
          renderMeta={(r) => `${r.collection_type || ''} · ${formatInr(r.collected_amount)}`}
        />
      </div>
    </div>
  );
}
