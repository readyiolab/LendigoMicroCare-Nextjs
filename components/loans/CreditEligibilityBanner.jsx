import { ShieldAlert, Calendar, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

const CODE_STYLES = {
  BLACKLISTED: 'border-red-300 bg-red-50 text-red-900',
  INTERNAL_DEFAULT: 'border-red-300 bg-red-50 text-red-900',
  BUREAU_SETTLEMENT: 'border-red-300 bg-red-50 text-red-900',
  BUREAU_DEFAULT: 'border-red-300 bg-red-50 text-red-900',
  BUREAU_OVERDUE: 'border-amber-300 bg-amber-50 text-amber-900',
  BUREAU_DPD: 'border-amber-300 bg-amber-50 text-amber-900',
  LOW_CIBIL: 'border-amber-300 bg-amber-50 text-amber-900',
  COOL_OFF: 'border-amber-300 bg-amber-50 text-amber-900',
  REJECT_COOL_OFF: 'border-amber-300 bg-amber-50 text-amber-900',
  INTERNAL_SETTLEMENT: 'border-amber-300 bg-amber-50 text-amber-900',
  CIBIL_STALE: 'border-blue-300 bg-blue-50 text-blue-900',
};

export default function CreditEligibilityBanner({ creditEligibility, className }) {
  if (!creditEligibility || creditEligibility.allowed !== false) return null;

  const code = creditEligibility.code || 'BLOCKED';
  const style = CODE_STYLES[code] || 'border-slate-300 bg-slate-50 text-slate-900';
  const Icon =
    code === 'BLACKLISTED' || code === 'INTERNAL_DEFAULT' ? Ban : ShieldAlert;

  const coolOff = creditEligibility.coolOffUntil
    ? new Date(creditEligibility.coolOffUntil).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-5 mb-6 shadow-sm',
        style,
        className
      )}
      role="alert"
    >
      <div className="flex gap-4">
        <div className="shrink-0 p-2 rounded-lg bg-white/60">
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold">Not eligible for a new loan right now</h3>
          <p className="text-sm mt-1.5 leading-relaxed opacity-90">
            {creditEligibility.userMessage}
          </p>
          {coolOff && (
            <p className="text-xs mt-3 flex items-center gap-1.5 font-semibold opacity-80">
              <Calendar className="w-3.5 h-3.5" />
              You may re-apply after {coolOff}
            </p>
          )}
          <p className="text-[11px] mt-3 opacity-60">
            Reference: {code.replace(/_/g, ' ')}
          </p>
        </div>
      </div>
    </div>
  );
}
