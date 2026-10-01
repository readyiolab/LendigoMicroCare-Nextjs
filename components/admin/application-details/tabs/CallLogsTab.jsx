import { CheckCircle2, Phone, RotateCw, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import CallRecordingPlayer from '@/components/admin/CallRecordingPlayer';
import { cn } from '@/lib/utils';
import { formatCallWhen, outcomeMeta, parseCallRemarks } from '@/lib/utils/callLogOptions';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { DataTable, DataCell, DetailTable, DetailRow, EMPTY } from '../common/DetailTable';

export default function CallLogsTab() {
  const {
    callLogs,
    loadingCallLogs,
    isClosed,
    setIsLogCallOpen,
    isReadOnly,
    setStatusUpdate,
    setActiveTab,
  } = useApplicationContext();

  const handleQuickAction = (status, remarks) => {
    setStatusUpdate((prev) => ({ ...prev, status, remarks }));
    setActiveTab('actions');
  };

  return (
    <div className="space-y-3">
      <DataTable
        title="Call logs"
        action={
          <Button
            type="button"
            size="sm"
            onClick={() => setIsLogCallOpen(true)}
            className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5" />
            Add / view call logs
            {callLogs.length > 0 && (
              <span className="ml-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-white/25 text-[10px] font-bold leading-4.5 text-center tabular-nums">
                {callLogs.length}
              </span>
            )}
          </Button>
        }
        columns={[
          { key: 'when', label: 'When' },
          { key: 'by', label: 'Called by' },
          { key: 'outcome', label: 'Outcome' },
          { key: 'purpose', label: 'Purpose' },
          { key: 'remarks', label: 'Remarks' },
        ]}
        emptyMessage={loadingCallLogs ? 'Loading…' : 'No calls logged yet — use "Add / view call logs" to log the first one.'}
      >
        {loadingCallLogs ? null : callLogs.length > 0
          ? callLogs.map((log) => {
              const outcome = outcomeMeta(log.call_status);
              const { purpose, text } = parseCallRemarks(log.remarks);
              return (
                <tr key={log.id}>
                  <DataCell mono>{formatCallWhen(log.created_at)}</DataCell>
                  <DataCell>
                    {log.admin_name || EMPTY}
                    {log.role_name ? (
                      <span className="block text-[11px] text-slate-500">{log.role_name}</span>
                    ) : null}
                  </DataCell>
                  <DataCell>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                        outcome.classes.badge
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', outcome.classes.dot)} />
                      {outcome.label}
                    </span>
                  </DataCell>
                  <DataCell>
                    {purpose ? (
                      <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                        {purpose}
                      </span>
                    ) : EMPTY}
                  </DataCell>
                  <DataCell>
                    <span className="whitespace-pre-wrap">{text || EMPTY}</span>
                    {log.recording_url ? (
                      <CallRecordingPlayer src={log.recording_url} className="mt-1.5 h-8 w-full max-w-xs" />
                    ) : null}
                  </DataCell>
                </tr>
              );
            })
          : null}
      </DataTable>

      {!isClosed && !isReadOnly && (
        <DetailTable title="Quick actions">
          <DetailRow label="Recommend">
            <button
              type="button"
              onClick={() =>
                handleQuickAction(
                  'offer_sent',
                  'Basis profile and verification, application recommended for approval.'
                )
              }
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 hover:underline"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ok to give — go to Decision
            </button>
          </DetailRow>
          <DetailRow label="PD required">
            <button
              type="button"
              onClick={() => handleQuickAction('pending_pd', 'Need more verification (PD required).')}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-700 hover:underline"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Verify more — go to Decision
            </button>
          </DetailRow>
          <DetailRow label="Reject">
            <button
              type="button"
              onClick={() =>
                handleQuickAction('rejected', 'Application rejected due to criteria mismatch.')
              }
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-rose-700 hover:underline"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              Decline lead — go to Decision
            </button>
          </DetailRow>
          <DetailRow label="Note">
            These shortcuts open the Decision tab with a suggested status and remark.
          </DetailRow>
        </DetailTable>
      )}

      {loadingCallLogs && (
        <div className="py-6 flex justify-center">
          <Spinner className="w-5 h-5 text-slate-300" />
        </div>
      )}
    </div>
  );
}
