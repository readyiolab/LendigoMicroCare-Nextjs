import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

const STEPS = [
  { key: 'leads', label: 'Leads', color: 'bg-slate-100 border-slate-200 text-slate-800' },
  { key: 'converted', label: 'Converted', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { key: 'submitted', label: 'Submitted', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  { key: 'underReview', label: 'Under review', color: 'bg-amber-50 border-amber-200 text-amber-800' },
  { key: 'approved', label: 'Approved', color: 'bg-violet-50 border-violet-200 text-violet-800' },
  { key: 'disbursed', label: 'Disbursed', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
];

export default function DsaFunnelDiagram({ funnel = {}, className }) {
  const f = funnel || {};

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Performance funnel</h3>
      <p className="text-xs text-slate-500 mb-4">Lead → application → disbursal (filtered view)</p>

      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={cn(
                'min-w-[88px] rounded-lg border px-3 py-2.5 text-center shadow-sm',
                step.color
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{step.label}</p>
              <p className="text-lg font-bold tabular-nums">{f[step.key] ?? 0}</p>
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600 border-t border-slate-100 pt-3">
        <span>
          <strong className="text-red-600">{f.rejectedLeads ?? 0}</strong> leads rejected
        </span>
        <span>
          <strong className="text-red-600">{f.rejectedApps ?? 0}</strong> applications rejected
        </span>
      </div>
    </div>
  );
}
