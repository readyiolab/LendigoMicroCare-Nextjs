import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const STATUS_BADGE_CONFIG = {
  draft: { variant: 'outline', label: 'Draft', className: 'border-gray-200 text-gray-500' },
  submitted: { variant: 'outline', label: 'Submitted', className: 'border-blue-400 text-blue-700 bg-blue-50/50' },
  under_review: {
    variant: 'outline',
    icon: <Clock className="h-3.5 w-3.5 mr-1.5" />,
    label: 'Under Review',
    className: 'border-amber-200 text-amber-800 bg-amber-50',
  },
  pending_eligibility: {
    variant: 'outline',
    icon: <Clock className="h-3.5 w-3.5 mr-1.5" />,
    label: 'Eligibility Check',
    className: 'border-orange-400 text-orange-700 bg-orange-50/50',
  },
  pending_pd: {
    variant: 'outline',
    icon: <Clock className="h-3.5 w-3.5 mr-1.5" />,
    label: 'PD Pending',
    className: 'border-purple-400 text-purple-700 bg-purple-50/50',
  },
  returned_to_credit_manager: {
    variant: 'outline',
    icon: <Clock className="h-3.5 w-3.5 mr-1.5" />,
    label: 'Returned to CM',
    className: 'border-orange-500 text-orange-800 bg-orange-50',
  },
  recommended: { variant: 'default', label: 'Recommended', className: 'bg-indigo-600 text-white border-indigo-600' },
  approved: {
    variant: 'outline',
    icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />,
    label: 'Sanctioned',
    className: 'border-green-600 text-green-700 bg-green-50/50',
  },
  rejected: {
    variant: 'outline',
    icon: <XCircle className="h-3.5 w-3.5 mr-1.5" />,
    label: 'Rejected',
    className: 'border-red-200 text-red-700 bg-red-50/50',
  },
  offer_rejected: {
    variant: 'outline',
    icon: <XCircle className="h-3.5 w-3.5 mr-1.5" />,
    label: 'Offer Rejected',
    className: 'border-red-400 text-red-700 bg-red-50/50',
  },
  cancelled: {
    variant: 'outline',
    icon: <XCircle className="h-3.5 w-3.5 mr-1.5" />,
    label: 'Cancelled',
    className: 'border-gray-300 text-gray-600 bg-gray-50',
  },
  offer_sent: { variant: 'default', label: 'Offer Sent', className: 'bg-cyan-600 text-white border-cyan-600' },
  offer_revision_requested: {
    variant: 'outline',
    label: 'Changes Requested',
    className: 'border-amber-300 text-amber-800 bg-amber-50',
  },
  offer_accepted: {
    variant: 'default',
    icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />,
    label: 'Offer Accepted',
    className: 'bg-teal-600 text-white border-teal-600',
  },
  video_declaration_pending: {
    variant: 'outline',
    icon: <Clock className="h-3.5 w-3.5 mr-1.5" />,
    label: 'Video Pending',
    className: 'border-orange-400 text-orange-700 bg-orange-50/50',
  },
  video_declaration_submitted: {
    variant: 'default',
    label: 'Video Submitted',
    className: 'bg-amber-500 text-white border-amber-500',
  },
  video_declaration_rejected: {
    variant: 'outline',
    icon: <XCircle className="h-3.5 w-3.5 mr-1.5" />,
    label: 'Video Rejected',
    className: 'border-red-400 text-red-700 bg-red-50/50',
  },
  esign_completed: {
    variant: 'default',
    icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />,
    label: 'E-Sign Done',
    className: 'bg-indigo-600 text-white border-indigo-600',
  },
  esign_pending: {
    variant: 'outline',
    icon: <Clock className="h-3.5 w-3.5 mr-1.5" />,
    label: 'E-Sign Pending',
    className: 'border-pink-400 text-pink-700 bg-pink-50/50',
  },
  mandate_pending: {
    variant: 'outline',
    icon: <Clock className="h-3.5 w-3.5 mr-1.5" />,
    label: 'e-Mandate Pending',
    className: 'border-violet-400 text-violet-700 bg-violet-50/50',
  },
  mandate_failed: {
    variant: 'outline',
    icon: <XCircle className="h-3.5 w-3.5 mr-1.5" />,
    label: 'e-Mandate Failed',
    className: 'border-red-400 text-red-700 bg-red-50/50',
  },
  payment_pending: {
    variant: 'default',
    label: 'Ready for Payout',
    className: 'bg-yellow-500 text-white border-yellow-500',
  },
  disbursed: {
    variant: 'default',
    icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />,
    label: 'Disbursed',
    className: 'bg-green-600 text-white border-green-600',
  },
  closed: { variant: 'secondary', label: 'Loan Closed', className: 'bg-gray-100 text-gray-600' },
  settlement_closed: { variant: 'secondary', label: 'Settlement closed', className: 'bg-gray-100 text-gray-600' },
  defaulted: { variant: 'destructive', label: 'Defaulted', className: 'bg-red-600 text-white' },
};

/**
 * Resolve what ops should see on badges. UW `approved` stays in DB as sanctioned;
 * mandate must be registered before anything looks "ready to pay".
 * Empty/missing mandate on payment_pending does NOT force e-Mandate Pending
 * (avoids wrong badge when payload omits mandate_status after Manual Verify).
 */
export function resolveApplicationDisplayStatus(applicationStatus, mandateStatus) {
  const status = String(applicationStatus || '').toLowerCase();
  const mandate = String(mandateStatus || '').toLowerCase();

  if (status === 'disbursed' || status === 'closed' || status === 'settlement_closed' || status === 'defaulted') {
    return status;
  }

  if (mandate === 'failed') {
    return 'mandate_failed';
  }

  if (status === 'payment_pending') {
    // Explicit pending/failed → still show e-Mandate Pending; registered or missing → Ready for Payout
    if (mandate === 'pending' || mandate === 'initiated' || mandate === 'failed') {
      return 'mandate_pending';
    }
    return 'payment_pending';
  }

  if (status === 'mandate_pending' || status === 'esign_completed') {
    return 'mandate_pending';
  }

  return status;
}

export const STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS_BADGE_CONFIG).map(([code, cfg]) => [code, cfg.label])
);

export const getStatusBadgeConfig = (status) => {
  const key = String(status || '').toLowerCase();
  return STATUS_BADGE_CONFIG[key] || {
    variant: 'secondary',
    label: formatStatusLabel(status),
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  };
};

export const getStatusBadge = (status, mandateStatus) => {
  const displayStatus = resolveApplicationDisplayStatus(status, mandateStatus);
  const item = getStatusBadgeConfig(displayStatus);
  return (
    <Badge
      variant={item.variant}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 h-6 w-fit rounded-md text-[10px] font-semibold uppercase tracking-wide border',
        item.className
      )}
    >
      {item.icon && React.cloneElement(item.icon, { className: 'h-3 w-3' })}
      {item.label}
    </Badge>
  );
};

export function StatusBadge({ status, mandateStatus, className }) {
  const displayStatus = resolveApplicationDisplayStatus(status, mandateStatus);
  const item = getStatusBadgeConfig(displayStatus);
  return (
    <Badge
      variant={item.variant}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 h-6 w-fit rounded-md text-[10px] font-semibold uppercase tracking-wide border',
        item.className,
        className
      )}
    >
      {item.icon && React.cloneElement(item.icon, { className: 'h-3 w-3' })}
      {item.label}
    </Badge>
  );
}

export const formatStatusLabel = (status) => {
  const key = String(status || '').toLowerCase();
  return STATUS_LABELS[key] || status?.replace(/_/g, ' ')?.replace(/\b\w/g, (l) => l.toUpperCase()) || 'Unknown';
};
