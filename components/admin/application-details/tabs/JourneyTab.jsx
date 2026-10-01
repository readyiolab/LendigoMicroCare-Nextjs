import { CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { DataTable, DataCell, DetailTable, DetailRow, EMPTY } from '../common/DetailTable';
import LoanJourneyTimeline from '@/components/admin/LoanJourneyTimeline';

function stepLabel(status, isCurrent) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed' || s === 'complete') return 'Completed';
  if (s === 'failed') return 'Failed';
  if (s === 'in_progress' || isCurrent) return 'In progress';
  return 'Incomplete';
}

function formatStepDate(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CANONICAL_STEPS = [
  { step_name: 'eligibility', step_label: 'Check Eligibility', step_order: 1 },
  { step_name: 'selfie', step_label: 'Selfie Upload', step_order: 2 },
  { step_name: 'ekyc', step_label: 'eKYC Verification', step_order: 3 },
  { step_name: 'reference', step_label: 'Reference Details', step_order: 4 },
  { step_name: 'disbursal_bank', step_label: 'Bank Account Details', step_order: 5 },
  { step_name: 'bank_statement', step_label: 'Bank Statement Upload', step_order: 6 },
  { step_name: 'review', step_label: 'Review Application', step_order: 7 },
  { step_name: 'esign', step_label: 'E-Sign Agreement', step_order: 8 },
];

const INTAKE_DONE_STATUSES = new Set([
  'submitted', 'under_review', 'pending_eligibility', 'pending_pd',
  'recommended', 'approved', 'rejected', 'offer_sent', 'offer_accepted',
  'offer_rejected', 'video_declaration_pending', 'video_declaration_submitted',
  'video_declaration_rejected', 'video_verified', 'esign_pending',
  'esign_completed', 'mandate_pending', 'payment_pending', 'disbursed',
  'closed', 'defaulted', 'settled',
]);

const ESIGN_DONE_STATUSES = new Set([
  'esign_completed', 'mandate_pending', 'payment_pending', 'disbursed',
  'closed', 'defaulted', 'settled',
]);

export default function JourneyTab() {
  const { data, applicationId } = useApplicationContext();
  const rawSteps = data?.steps || [];
  const appStatus = String(data?.application_status || data?.status || '').toLowerCase();
  const isDisbursed = ['disbursed', 'closed', 'settled'].includes(appStatus);
  const isEsignDone = ESIGN_DONE_STATUSES.has(appStatus);
  const isIntakeDone = INTAKE_DONE_STATUSES.has(appStatus);
  const loadingJourney = !data?.sectionsLoaded?.journey && rawSteps.length === 0;

  // Build merged canonical steps so no gaps exist
  const stepsMap = {};
  rawSteps.forEach((s) => {
    if (s.step_name) stepsMap[s.step_name] = s;
  });

  const steps = CANONICAL_STEPS.map((item) => {
    const raw = stepsMap[item.step_name] || {};
    const rawStatus = String(raw.step_status || '').toLowerCase();

    let step_status = 'incomplete';
    if (item.step_name === 'esign') {
      if (isEsignDone || rawStatus === 'completed' || rawStatus === 'complete') step_status = 'completed';
      else if (appStatus === 'esign_pending' || rawStatus === 'in_progress') step_status = 'in_progress';
      else if (rawStatus === 'failed') step_status = 'failed';
    } else {
      if (isDisbursed || (isIntakeDone && rawStatus !== 'failed') || rawStatus === 'completed' || rawStatus === 'complete') {
        step_status = 'completed';
      } else if (rawStatus === 'failed') {
        step_status = 'failed';
      } else if (rawStatus === 'in_progress') {
        step_status = 'in_progress';
      }
    }

    return {
      ...item,
      ...raw,
      step_name: item.step_name,
      step_label: item.step_label,
      step_order: item.step_order,
      step_status,
      completed_at: raw.completed_at || (isDisbursed ? data?.disbursed_at || data?.created_at : null),
    };
  });

  const completed = steps.filter((s) => s.step_status === 'completed').length;

  let currentLabel = EMPTY;
  if (isDisbursed) {
    currentLabel = 'All steps complete (Disbursed)';
  } else if (appStatus === 'payment_pending') {
    currentLabel = 'Bank Transfer Pending';
  } else if (appStatus === 'mandate_pending') {
    currentLabel = 'e-Mandate Setup';
  } else if (appStatus === 'esign_pending') {
    currentLabel = 'E-Sign Agreement';
  } else if (isIntakeDone && !isEsignDone) {
    currentLabel = 'Underwriting / Verification';
  } else {
    const current = steps.find((s) => s.step_status === 'in_progress') || steps.find((s) => s.step_status !== 'completed');
    currentLabel = current?.step_label || (completed === steps.length && steps.length > 0 ? 'All steps complete' : EMPTY);
  }

  if (loadingJourney) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <p className="text-xs font-medium">Loading steps…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <LoanJourneyTimeline applicationId={applicationId || data?.id} />

      <DetailTable title="Journey summary">
        <DetailRow label="Total milestones" mono>{String(steps.length)}</DetailRow>
        <DetailRow label="Completed" mono>{String(completed)}</DetailRow>
        <DetailRow label="Current step">
          {currentLabel}
        </DetailRow>
      </DetailTable>

      <DataTable
        title="Applicant progression"
        action={<span className="text-[11px] text-slate-500">{steps.length} steps</span>}
        columns={[
          { key: 'phase', label: 'Phase' },
          { key: 'step', label: 'Step' },
          { key: 'status', label: 'Status' },
          { key: 'when', label: 'Updated' },
        ]}
        emptyMessage={data?.journeyLoading ? 'Loading…' : 'Journey progression data not found'}
      >
        {steps.length > 0
          ? steps.map((step, idx) => {
              const isCompleted =
                step.step_status === 'completed' || step.step_status === 'complete';
              const isFailed = step.step_status === 'failed';
              const isCurrent = !!step.is_current || step.step_status === 'in_progress';
              const isIncomplete = !isCompleted && !isFailed;
              const label =
                step.step_label || (step.step_name || EMPTY).replace(/_/g, ' ');

              return (
                <tr key={step.step_name || idx}>
                  <DataCell mono>{String(step.step_order || idx + 1).padStart(2, '0')}</DataCell>
                  <DataCell className="capitalize">{label}</DataCell>
                  <DataCell>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-[12px] font-semibold',
                        isCompleted && 'text-emerald-700',
                        isFailed && 'text-rose-700',
                        isCurrent && !isCompleted && 'text-amber-700',
                        isIncomplete && !isCurrent && 'text-slate-500'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : isFailed ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : isCurrent ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                      {stepLabel(step.step_status, isCurrent)}
                    </span>
                  </DataCell>
                  <DataCell mono>
                    {isCompleted
                      ? formatStepDate(step.completed_at || step.updated_at) === EMPTY
                        ? 'Completed'
                        : formatStepDate(step.completed_at || step.updated_at)
                      : isCurrent
                        ? 'In progress'
                        : '—'}
                  </DataCell>
                </tr>
              );
            })
          : null}
      </DataTable>
    </div>
  );
}
