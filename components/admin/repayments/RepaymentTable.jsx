import React from 'react';
import {
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { PageLoader } from '@/components/ui/PageLoader';
import { cn } from '@/lib/utils';

const StatusBadge = ({ status }) => {
  const styles = {
    under_review: 'bg-blue-50 text-blue-700 border-blue-100',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rejected: 'bg-red-50 text-red-700 border-red-100',
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  const icons = {
    under_review: Clock,
    paid: CheckCircle2,
    rejected: XCircle,
    pending: Calendar,
  };
  const labels = {
    under_review: 'Under Review',
    paid: 'Verified Paid',
    rejected: 'Rejected',
    pending: 'Pending',
  };
  const key = styles[status] ? status : 'pending';
  const Icon = icons[key];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium',
        styles[key]
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {labels[key]}
    </span>
  );
};

export default function RepaymentTable({
  loading,
  repayments,
  filters,
  pagination,
  setFilters,
  openApplication,
  handleViewFile,
  uploading,
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden min-h-[400px]">
      {loading ? (
        <PageLoader text="Loading repayments..." minHeight="min-h-[400px]" />
      ) : repayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Banknote className="w-8 h-8 text-slate-300 mb-3" />
          <h3 className="text-sm text-slate-900 font-medium">No repayments found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            {filters.search
              ? 'Try adjusting your search terms.'
              : 'No repayments match this status.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-2.5 text-xs font-medium text-slate-500">User & Loan</th>
                <th className="px-4 py-2.5 text-xs font-medium text-slate-500">EMI</th>
                <th className="px-4 py-2.5 text-xs font-medium text-slate-500">Payment Proof</th>
                <th className="px-4 py-2.5 text-xs font-medium text-slate-500">Status</th>
                <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {repayments.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                  onClick={() => openApplication(r.loanApplicationId, r.id)}
                >
                  <td className="px-4 py-3 align-top">
                    <p className="text-sm text-slate-900 font-medium leading-snug">
                      {r.fullName || '—'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">{r.mobile || '—'}</p>
                    <p className="text-xs font-mono text-slate-600 mt-0.5">
                      {r.loanAccountNumber || r.leadId || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-sm text-slate-900 font-medium tabular-nums">
                      ₹{parseFloat(r.amount || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">EMI #{r.emiNumber}</p>
                  </td>
                  <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                    {r.utrNumber ? (
                      <div className="space-y-1">
                        <p className="text-xs font-mono text-slate-800 select-all">{r.utrNumber}</p>
                        {r.proofSource === 'staff_collection' && (
                          <p className="text-[11px] text-slate-400">Staff collection</p>
                        )}
                        {r.paymentDate && (
                          <p className="text-xs text-slate-500">
                            {format(
                              new Date(r.paymentDate),
                              r.proofSource === 'staff_collection' ? 'dd MMM yyyy' : 'dd MMM yyyy, h:mm a'
                            )}
                          </p>
                        )}
                        {r.screenshotPath && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
                            onClick={() =>
                              r.proofSource === 'staff_collection'
                                ? window.open(r.screenshotPath, '_blank', 'noopener,noreferrer')
                                : handleViewFile(
                                    'repayment_evidence',
                                    r.screenshotPath,
                                    r.applicationNumber
                                  )
                            }
                            disabled={uploading}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {uploading ? 'Opening…' : 'Receipt'}
                          </button>
                        )}
                      </div>
                    ) : r.status === 'paid' ? (
                      <div>
                        <p className="text-xs text-slate-600 capitalize">
                          {r.paymentMode ? `Paid via ${String(r.paymentMode).replace(/_/g, ' ')}` : 'Paid'}
                        </p>
                        {r.paidAt && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {format(new Date(r.paidAt), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-slate-400">Awaiting submission</p>
                        {r.dueDate && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Due {format(new Date(r.dueDate), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={r.status} />
                    {r.status === 'rejected' && r.rejectionReason && (
                      <p
                        className="text-xs text-red-500 mt-1 max-w-[160px] truncate"
                        title={r.rejectionReason}
                      >
                        {r.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 border-slate-200 text-slate-700 gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        openApplication(r.loanApplicationId, r.id);
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
          <p className="text-sm text-slate-500">
            Page {filters.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-slate-200"
              disabled={filters.page === 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-slate-200"
              disabled={filters.page >= pagination.totalPages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
