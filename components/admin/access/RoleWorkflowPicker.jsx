import React from 'react';
import { CheckCircle2, Ban, ArrowRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkflowCard } from '@/config/workflowRolePresets';

const STAGE_STYLES = {
  credit: 'border-sky-300 bg-sky-50/80 ring-sky-200',
  underwriting: 'border-violet-300 bg-violet-50/80 ring-violet-200',
  operations: 'border-emerald-300 bg-emerald-50/80 ring-emerald-200',
  intake: 'border-amber-300 bg-amber-50/80 ring-amber-200',
  collection: 'border-orange-300 bg-orange-50/80 ring-orange-200',
  system: 'border-slate-400 bg-slate-50 ring-slate-200',
  custom: 'border-slate-300 bg-white ring-slate-200',
};

export default function RoleWorkflowPicker({
  roles = [],
  value,
  onChange,
  className,
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-xs text-slate-500 leading-relaxed">
        Pick the job this person does in the loan journey. Access and stage authority come from the role —
        you do not need to tick every permission manually.
      </p>

      <div className="grid grid-cols-1 gap-3">
        {roles.map((role) => {
          const selected = String(value) === String(role.id);
          const card = getWorkflowCard(role.role_code, role.workflow);
          const stageClass = STAGE_STYLES[card.stage] || STAGE_STYLES.custom;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onChange?.(String(role.id), role)}
              className={cn(
                'text-left rounded-lg border p-4 transition-all',
                stageClass,
                selected
                  ? 'ring-2 shadow-sm'
                  : 'opacity-90 hover:opacity-100 hover:shadow-sm'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {role.role_name}
                    </h3>
                    {card.primary_flow && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-900 text-white">
                        Core flow
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {card.summary || role.description}
                  </p>
                </div>
                <div
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2',
                    selected ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
                  )}
                />
              </div>

              {selected && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {card.receives && (
                    <div className="rounded-lg bg-white/80 border border-slate-200/80 p-2.5">
                      <p className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                        <Inbox className="h-3.5 w-3.5" /> Receives
                      </p>
                      <p className="text-slate-600 leading-relaxed">{card.receives}</p>
                    </div>
                  )}
                  {card.next_handoff && (
                    <div className="rounded-lg bg-white/80 border border-slate-200/80 p-2.5">
                      <p className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                        <ArrowRight className="h-3.5 w-3.5" /> Then hands off to
                      </p>
                      <p className="text-slate-600 leading-relaxed">{card.next_handoff}</p>
                    </div>
                  )}
                  {card.can_do?.length > 0 && (
                    <div className="rounded-lg bg-white/80 border border-slate-200/80 p-2.5 sm:col-span-1">
                      <p className="font-semibold text-teal-800 flex items-center gap-1.5 mb-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Can do
                      </p>
                      <ul className="space-y-1 text-slate-600">
                        {card.can_do.map((item) => (
                          <li key={item} className="leading-snug">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {card.cannot_do?.length > 0 && (
                    <div className="rounded-lg bg-white/80 border border-slate-200/80 p-2.5 sm:col-span-1">
                      <p className="font-semibold text-amber-800 flex items-center gap-1.5 mb-1.5">
                        <Ban className="h-3.5 w-3.5" /> Cannot do
                      </p>
                      <ul className="space-y-1 text-slate-600">
                        {card.cannot_do.map((item) => (
                          <li key={item} className="leading-snug">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
