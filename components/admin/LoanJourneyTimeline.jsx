import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Circle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminAPI } from '@/lib/api';
import { formatStatusLabel } from '@/utils/statusUtils';
import { DetailTable, DetailRow, EMPTY } from '@/components/admin/application-details/common/DetailTable';

function formatWhen(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StageIcon({ status }) {
  if (status === 'completed' || status === 'exited') return <CheckCircle2 className="w-4 h-4 text-emerald-700" />;
  if (status === 'rejected') return <XCircle className="w-4 h-4 text-rose-700" />;
  if (status === 'skipped') return <Circle className="w-4 h-4 text-slate-400" />;
  if (status === 'current' || status === 'entered' || status === 'assigned' || status === 'reassigned') {
    return <Clock className="w-4 h-4 text-amber-700" />;
  }
  return <Circle className="w-4 h-4 text-slate-300" />;
}

export default function LoanJourneyTimeline({ applicationId }) {
  const [pipeline, setPipeline] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!applicationId) return undefined;
    let cancelled = false;
    adminAPI.getJourneyPipeline(applicationId)
      .then((res) => {
        if (cancelled) return;
        if (res.status === 1) setPipeline(res.data);
        else setError(res.message || 'Unable to load pipeline');
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Unable to load pipeline');
      });
    return () => { cancelled = true; };
  }, [applicationId]);

  if (error) {
    return <p className="text-xs text-slate-500">{error}</p>;
  }
  if (!pipeline) {
    return <p className="text-xs text-slate-400">Loading pipeline…</p>;
  }

  return (
    <div className="space-y-3">
      <DetailTable title="Pipeline status">
        <DetailRow label="Current stage">{pipeline.current_stage_label || pipeline.current_stage}</DetailRow>
        <DetailRow label="Current owner">{pipeline.current_owner || EMPTY}</DetailRow>
        <DetailRow label="Previous owner">{pipeline.previous_owner || EMPTY}</DetailRow>
        <DetailRow label="Status">{formatStatusLabel(pipeline.status)}</DetailRow>
        <DetailRow label="Pending reason">{pipeline.pending_reason || EMPTY}</DetailRow>
        <DetailRow label="Next action">{pipeline.next_action || EMPTY}</DetailRow>
        <DetailRow label="Overall TAT" mono>{`${pipeline.overall_tat_hours || 0} hrs`}</DetailRow>
      </DetailTable>

      <ol className="space-y-0 border border-slate-200 rounded-lg bg-white overflow-hidden">
        {(pipeline.stages || []).map((stage, idx) => (
          <li
            key={stage.stage}
            className={cn(
              'grid grid-cols-[20px_1fr_auto] gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0',
              stage.status === 'current' && 'bg-amber-50/60'
            )}
          >
            <StageIcon status={stage.status} />
            <div>
              <p className="text-[13px] font-semibold text-slate-900">
                {String(idx + 1).padStart(2, '0')} · {stage.label}
                {stage.status === 'skipped' ? ' · Skipped / self-service' : ''}
              </p>
              <p className="text-[11px] text-slate-500">
                Owner: {stage.status === 'skipped' ? (stage.owner_name || 'Self-service') : (stage.owner_name || EMPTY)}
                {stage.previous_owner_name ? ` · Previous: ${stage.previous_owner_name}` : ''}
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-slate-500">
              <p>In {formatWhen(stage.entered_at)}</p>
              <p>Out {formatWhen(stage.completed_at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
