import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const VARIANT_STYLES = {
  neutral: 'bg-slate-50 text-slate-700 border-slate-200',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function CollectionStatusBadge({ label, variant = 'neutral', className }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-medium border shadow-none rounded-sm px-2 py-0.5',
        VARIANT_STYLES[variant] || VARIANT_STYLES.neutral,
        className
      )}
    >
      {label}
    </Badge>
  );
}

export function DpdStatusBadge({ repayment }) {
  const days = repayment?.days_overdue ?? 0;
  if (repayment?.collection_stage === 'pre_due' || days < 0) {
    const until = repayment?.days_until_due ?? Math.abs(days);
    return <CollectionStatusBadge label={`Due in ${until}d`} variant="info" />;
  }
  if (days === 0 || repayment?.collection_stage === 'due_today') {
    return <CollectionStatusBadge label="Due today" variant="warning" />;
  }
  if (days <= 7) {
    return <CollectionStatusBadge label={`${days}d overdue`} variant="warning" />;
  }
  if (days <= 30) {
    return <CollectionStatusBadge label={`${days}d overdue`} variant="danger" />;
  }
  return <CollectionStatusBadge label={`${days}d critical`} variant="danger" />;
}

export function PtpStatusBadge({ status }) {
  const map = {
    pending: { label: 'Pending', variant: 'warning' },
    kept: { label: 'Kept', variant: 'success' },
    broken: { label: 'Broken', variant: 'danger' },
  };
  const cfg = map[status] || map.pending;
  return <CollectionStatusBadge label={cfg.label} variant={cfg.variant} />;
}

export function SettlementStatusBadge({ status }) {
  const map = {
    pending_approval: { label: 'Pending approval', variant: 'warning' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'danger' },
    settlement_paid: { label: 'Completed', variant: 'neutral' },
    completed: { label: 'Completed', variant: 'neutral' },
    failed: { label: 'Failed', variant: 'danger' },
  };
  const cfg = map[status] || { label: status, variant: 'neutral' };
  return <CollectionStatusBadge label={cfg.label} variant={cfg.variant} />;
}
