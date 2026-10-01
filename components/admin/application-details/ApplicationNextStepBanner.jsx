import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeApplicationNextStep,
  shouldDeferWorkflowCreditCta,
} from '@/lib/utils/applicationNextStep';

function shortNextHint(message) {
  const raw = String(message || '')
    .replace(/^Next:\s*/i, '')
    .trim();
  if (!raw) return '';
  const parts = raw.split(/\s*(?:→|->)\s*|\.\s*Next:\s*/i).map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1] || raw;
  return last.replace(/\.$/, '');
}

const WORKFLOW_STEP_LABELS = [
  'Credit check',
  'Aadhaar',
  'PAN',
  'Bank',
  'Selfie',
  'Final decision',
];

export default function ApplicationNextStepBanner({
  aadhaarVerified,
  panVerified,
  bankVerified,
  selfieVerified,
  latestCreditRun,
  applicationStatus,
  aaStatus = null,
  creditLoading = false,
  onCtaClick,
  disabled = false,
}) {
  const deferCreditCta = shouldDeferWorkflowCreditCta(creditLoading, latestCreditRun);

  const { steps, nextMessage, ctaLabel, completedCount, totalSteps } = deferCreditCta
    ? {
        steps: WORKFLOW_STEP_LABELS.map((label, idx) => ({
          id: `pending_${idx}`,
          label,
          done: false,
          inProgress: false,
        })),
        nextMessage: 'Loading workflow…',
        ctaLabel: 'All done',
        completedCount: 0,
        totalSteps: WORKFLOW_STEP_LABELS.length,
      }
    : computeApplicationNextStep({
        aadhaarVerified,
        panVerified,
        bankVerified,
        selfieVerified,
        latestCreditRun,
        applicationStatus,
        aaStatus,
      });

  const checklistDone = completedCount === totalSteps;
  const journeyFullyDone = !deferCreditCta && checklistDone && ctaLabel === 'All done';
  const currentIndex = steps.findIndex((s) => !s.done);
  const hint = shortNextHint(nextMessage);

  return (
    <div className="px-5 sm:px-6 py-2.5 bg-slate-50/70 border-b border-slate-200/80">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Progress track */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            Progress
          </span>
          <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200/90 rounded px-1.5 py-0.5 shrink-0 mr-2 shadow-2xs">
            {deferCreditCta ? '–/6' : `${completedCount}/${totalSteps}`}
          </span>

          <ol className="flex items-center gap-1.5 shrink-0">
            {steps.map((step, idx) => {
              const isDone = Boolean(step.done);
              const isCurrent = !deferCreditCta && !isDone && (step.inProgress || idx === currentIndex);
              const isUpcoming = !isDone && !isCurrent;

              return (
                <li key={step.id} className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all',
                      isDone && 'text-slate-700 bg-white border border-slate-200/80 font-medium shadow-2xs',
                      isCurrent && 'text-slate-900 bg-white border border-slate-900 shadow-2xs font-semibold ring-1 ring-slate-900/10',
                      isUpcoming && 'text-slate-400 font-normal bg-transparent'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] shrink-0 font-medium',
                        isDone && 'bg-emerald-100 text-emerald-800',
                        isCurrent && 'bg-slate-900 text-white',
                        isUpcoming && 'bg-slate-200 text-slate-500'
                      )}
                    >
                      {isDone ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : idx + 1}
                    </span>
                    <span className="whitespace-nowrap">{step.label}</span>
                  </div>

                  {idx < steps.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Action / Next step CTA */}
        <div className="flex items-center gap-3 shrink-0 lg:justify-end">
          {hint && (
            <p className="text-xs text-slate-500 truncate max-w-[20rem] hidden xl:block" title={hint}>
              {hint}
            </p>
          )}
          {!deferCreditCta && ctaLabel !== 'All done' && (
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={onCtaClick}
              className="shrink-0 h-7.5 rounded-md text-xs px-3 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-2xs inline-flex items-center gap-1"
            >
              <span>{ctaLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          )}
          {journeyFullyDone && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Ready for Decision
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
