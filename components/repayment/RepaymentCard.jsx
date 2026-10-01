import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function RepaymentCard({ emi, onPay, disabled, prepayHint }) {
  const isPayable = emi.status === 'pending' || emi.status === 'overdue';

  const safeFormat = (dateStr) => {
    if (!dateStr || dateStr.startsWith('0000')) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return format(date, 'dd MMM yyyy');
    } catch {
      return null;
    }
  };

  const statusStyles = {
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    overdue: 'bg-red-50 text-red-700 ring-red-600/10',
    pending: 'bg-amber-50 text-amber-800 ring-amber-600/10',
    under_review: 'bg-blue-50 text-blue-700 ring-blue-600/10',
  };

  const statusLabel = {
    paid: 'Paid',
    overdue: 'Overdue',
    pending: 'Due',
    under_review: 'Verifying',
  }[emi.status] || emi.status;

  return (
    <div
      className={cn(
        'rounded-lg border bg-white shadow-sm h-full flex flex-col',
        isPayable ? 'border-slate-200' : 'border-slate-100'
      )}
    >
      <div className="p-3 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">
              {emi.title || `EMI ${emi.emiNumber}`}
            </p>
            <p className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
              ₹{parseFloat(emi.amount || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <span
            className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset shrink-0',
              statusStyles[emi.status] || 'bg-slate-50 text-slate-600'
            )}
          >
            {statusLabel}
          </span>
        </div>

        {safeFormat(emi.dueDate) && (
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            Due {safeFormat(emi.dueDate)}
          </p>
        )}

        {parseFloat(emi.penaltyAmount || 0) > 0 && (
          <p className="text-[11px] text-red-600 font-medium">
            Includes ₹{parseFloat(emi.penaltyAmount).toLocaleString('en-IN')} late fee
          </p>
        )}

        {prepayHint && isPayable && (
          <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-md px-2 py-1.5 leading-snug">
            {prepayHint}
          </p>
        )}

        <div className="mt-auto pt-1">
          {isPayable ? (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => onPay(emi)}
                disabled={disabled}
                className="h-8 px-3 bg-[#1D2B44] hover:bg-[#152238] text-white text-xs font-semibold rounded-lg"
              >
                Pay now
              </Button>
            </div>
          ) : emi.status === 'under_review' ? (
            <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50 rounded-md px-2 py-1.5">
              <Clock className="w-3 h-3 shrink-0" />
              <span>Verification in progress</span>
            </div>
          ) : emi.status === 'paid' ? (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 rounded-md px-2 py-1.5">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>Paid</span>
            </div>
          ) : emi.rejectionReason ? (
            <div className="flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50 rounded-md px-2 py-1.5">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{emi.rejectionReason}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
