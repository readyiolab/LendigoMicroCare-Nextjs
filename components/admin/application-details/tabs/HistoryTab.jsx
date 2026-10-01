import { useState, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { adminAPI } from '@/lib/api';
import { formatStatusLabel } from '@/utils/statusUtils';
import { DataTable, DataCell, DetailTable, DetailRow, EMPTY, btnSecondary } from '../common/DetailTable';

function parseNewData(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function formatWhen(value) {
  if (!value) return EMPTY;
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryTab() {
  const {
    history: initialHistory,
    hasFullHistory,
    applicationId,
    statusHistory: embeddedStatusHistory,
  } = useApplicationContext();

  const [fullHistory, setFullHistory] = useState([]);
  const [statusTimeline, setStatusTimeline] = useState([]);
  const [workflowTimeline, setWorkflowTimeline] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (initialHistory?.length) {
      setFullHistory(initialHistory);
      setHasMore(hasFullHistory);
      setPage(1);
    }
  }, [initialHistory, hasFullHistory]);

  useEffect(() => {
    if (embeddedStatusHistory?.length) {
      setStatusTimeline(embeddedStatusHistory);
      setLoadingTimeline(false);
    }
  }, [embeddedStatusHistory]);

  useEffect(() => {
    if (!applicationId) return;
    if (initialHistory?.length && embeddedStatusHistory?.length) return;

    let cancelled = false;
    (async () => {
      const needHistory = !initialHistory?.length;
      const needTimeline = !embeddedStatusHistory?.length;
      const needWorkflow = true;
      if (!needHistory && !needTimeline && !needWorkflow) return;

      if (needHistory) setLoadingMore(true);
      if (needTimeline) setLoadingTimeline(true);
      if (needWorkflow) setLoadingWorkflow(true);
      try {
        const [historyRes, timelineRes, workflowRes] = await Promise.all([
          needHistory
            ? adminAPI.getLoanAuditLogs(applicationId, { page: 1, limit: 12 }).catch(() => null)
            : Promise.resolve(null),
          needTimeline
            ? adminAPI.getApplicationStatusHistory(applicationId, { limit: 20 }).catch(() => null)
            : Promise.resolve(null),
          adminAPI.getApplicationWorkflowHistory(applicationId, { limit: 50 }).catch(() => null),
        ]);
        if (cancelled) return;
        if (historyRes?.status === 1) {
          setFullHistory(historyRes.data.logs || []);
          setHasMore(historyRes.data.pagination?.hasMore ?? false);
          setPage(1);
        }
        if (timelineRes?.status === 1) {
          setStatusTimeline(timelineRes.data?.history || []);
        }
        if (workflowRes?.status === 1) {
          setWorkflowTimeline(workflowRes.data?.rows || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setLoadingMore(false);
          setLoadingTimeline(false);
          setLoadingWorkflow(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applicationId, initialHistory, embeddedStatusHistory]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await adminAPI.getLoanAuditLogs(applicationId, { page: nextPage, limit: 12 });
      if (response.status === 1) {
        const newLogs = response.data.logs || [];
        setFullHistory((prev) => [...prev, ...newLogs]);
        setPage(nextPage);
        setHasMore(response.data.pagination.hasMore);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-3">
      {(loadingMore || loadingTimeline || loadingWorkflow) &&
      !fullHistory.length &&
      !statusTimeline.length &&
      !workflowTimeline.length ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          <p className="text-xs font-medium">Loading activity…</p>
        </div>
      ) : (
        <>
      <DetailTable
        title="Status transitions"
        action={<span className="text-[11px] text-slate-500">{statusTimeline.length}</span>}
      >
        {loadingTimeline ? (
          <DetailRow label="Status">
            <span className="inline-flex items-center gap-2 text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </span>
          </DetailRow>
        ) : statusTimeline.length === 0 ? (
          <DetailRow label="Status">No status changes recorded yet</DetailRow>
        ) : (
          [...statusTimeline].reverse().map((entry, idx) => (
            <DetailRow key={entry.id || idx} label={formatStatusLabel(entry.new_status)}>
              <span className="flex flex-col gap-0.5">
                {entry.previous_status ? (
                  <span className="text-[12px] text-slate-500">
                    From {formatStatusLabel(entry.previous_status)}
                  </span>
                ) : null}
                <span className="font-mono text-[12px] text-slate-600">{formatWhen(entry.created_at)}</span>
                <span className="text-[12px] text-slate-500">
                  {entry.admin_name || 'System'}
                  {entry.change_reason ? ` · ${entry.change_reason}` : ''}
                </span>
              </span>
            </DetailRow>
          ))
        )}
      </DetailTable>

      <DataTable
        title="Maker-checker trail"
        action={<span className="text-[11px] text-slate-500">{workflowTimeline.length} events</span>}
        columns={[
          { key: 'when', label: 'When' },
          { key: 'actor', label: 'User' },
          { key: 'action', label: 'Action' },
          { key: 'remark', label: 'Remark' },
          { key: 'required', label: 'Required action' },
        ]}
        emptyMessage={loadingWorkflow ? 'Loading…' : 'No maker-checker activity recorded'}
      >
        {workflowTimeline.length > 0
          ? workflowTimeline.map((row) => (
              <tr key={row.id}>
                <DataCell mono>{formatWhen(row.created_at)}</DataCell>
                <DataCell>
                  {row.actor_name || 'System'}
                  <span className="block text-[11px] text-slate-500">{row.actor_role_name || row.actor_role || EMPTY}</span>
                </DataCell>
                <DataCell className="capitalize">{String(row.action || EMPTY).replace(/_/g, ' ')}</DataCell>
                <DataCell>{row.remark || EMPTY}</DataCell>
                <DataCell>
                  {row.required_document || row.required_correction
                    ? [row.required_document, row.required_correction].filter(Boolean).join(' · ')
                    : EMPTY}
                </DataCell>
              </tr>
            ))
          : null}
      </DataTable>

      <DataTable
        title="Audit trail"
        action={<span className="text-[11px] text-slate-500">{fullHistory.length} events</span>}
        columns={[
          { key: 'when', label: 'When' },
          { key: 'action', label: 'Action' },
          { key: 'detail', label: 'Detail' },
          { key: 'by', label: 'By' },
        ]}
        emptyMessage={loadingMore ? 'Loading…' : 'No chronological logs found'}
      >
        {fullHistory.length > 0
          ? fullHistory.map((log, idx) => {
              const newData = parseNewData(log.new_data);
              const detail = newData.rejectionReason
                ? `Rejected: ${newData.rejectionReason}`
                : newData.remarks
                  ? newData.remarks
                  : newData.status
                    ? `Status → ${formatStatusLabel(newData.status)}`
                    : log.action_type === 'COMPLETE_ESIGN'
                      ? 'E-Sign completed'
                      : 'Process step executed';

              return (
                <tr key={log.id || `${idx}-${log.created_at}`}>
                  <DataCell mono>{formatWhen(log.created_at)}</DataCell>
                  <DataCell className="capitalize">
                    {(log.action_type || EMPTY).replace(/_/g, ' ')}
                  </DataCell>
                  <DataCell>{detail}</DataCell>
                  <DataCell>
                    {log.admin_name || 'System'}
                    {log.role_name ? (
                      <span className="block text-[11px] text-slate-500">{log.role_name}</span>
                    ) : null}
                  </DataCell>
                </tr>
              );
            })
          : null}
      </DataTable>

      {hasMore && (
        <div className="flex justify-center py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={btnSecondary}
          >
            {loadingMore ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
            )}
            {loadingMore ? 'Loading…' : 'Load older audits'}
          </Button>
        </div>
      )}
        </>
      )}
    </div>
  );
}
