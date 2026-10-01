import React from 'react';
import { 
  FileText, 
  ChevronRight, 
  Search, 
  Plus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/PageLoader';

const getEntryTypeColor = (type) => {
  switch (type) {
    case 'DISBURSEMENT': return 'text-amber-600 bg-amber-50 border-amber-100';
    case 'REPAYMENT': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case 'PENALTY_ACCRUAL': return 'text-rose-600 bg-rose-50 border-rose-100';
    case 'INTEREST_ACCRUAL': return 'text-blue-600 bg-blue-50 border-blue-100';
    default: return 'text-slate-600 bg-slate-50 border-slate-100';
  }
};

const formatAbsoluteCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(Math.abs(amount || 0));
};

export default function LedgerTable({ 
    entries, 
    loading, 
    pagination, 
    onPageChange, 
    onViewDetails 
}) {
  if (loading) {
    return <PageLoader text="Loading money records..." minHeight="min-h-[400px]" />;
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white overflow-hidden min-h-[600px] flex flex-col animate-in fade-in duration-700">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <div>
          <h3 className="text-sm font-medium text-slate-900 tracking-tight">All Transactions</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-medium">Full list of all money movements</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-100 text-[10px] font-medium text-slate-400 uppercase tracking-widest shadow-sm">
          {pagination.total} Entries Found
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white">
              <th className="px-5 py-5 text-[11px] font-medium text-slate-500 uppercase tracking-widest border-b border-slate-50">Date & ID</th>
              <th className="px-5 py-5 text-[11px] font-medium text-slate-500 uppercase tracking-widest border-b border-slate-50">User Details</th>
              <th className="px-5 py-5 text-[11px] font-medium text-slate-500 uppercase tracking-widest border-b border-slate-50 text-center">Type</th>
              <th className="px-5 py-5 text-[11px] font-medium text-slate-500 uppercase tracking-widest border-b border-slate-50 text-right">Money Out</th>
              <th className="px-5 py-5 text-[11px] font-medium text-slate-500 uppercase tracking-widest border-b border-slate-50 text-right">Money In</th>
              <th className="px-5 py-5 text-[11px] font-medium text-slate-500 uppercase tracking-widest border-b border-slate-50 text-right pr-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {entries.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-32 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-30">
                    <div className="p-4 bg-slate-50 rounded-full">
                       <FileText size={48} className="text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium tracking-tight">No entries found for this date range</p>
                  </div>
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={idx} className="group hover:bg-slate-50 transition-colors border-b border-slate-200 last:border-0">
                  <td className="px-5 py-4">
                    <p className="text-[13px] text-slate-900 font-medium mb-1 tracking-tight">{format(new Date(entry.created_at), 'dd MMM, hh:mm a')}</p>
                    <p className="text-[10px] text-slate-300 font-mono tracking-widest uppercase select-all group-hover:text-blue-500 transition-colors cursor-pointer">{entry.transaction_id}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-medium text-[10px] shadow-inner uppercase tracking-widest grayscale group-hover:grayscale-0 transition-all">
                        {entry.full_name?.substring(0, 2).toUpperCase() || 'SYS'}
                      </div>
                      <div>
                          <p className="text-[13px] font-medium text-slate-800 tracking-tight">{entry.full_name || 'Automated System'}</p>
                          <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest mt-0.5">Application: #{entry.application_number || 'INTERNAL_MOVEMENT'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                     <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-medium uppercase tracking-widest border  transition-all group-hover:shadow-sm",
                        getEntryTypeColor(entry.entry_type)
                     )}>
                       {entry.entry_type.replace('_', ' ')}
                     </span>
                     <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest mt-1.5 font-medium">{entry.account_name?.replace(/_/g, ' ')}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {entry.debit > 0 ? (
                       <span className="text-sm text-red-500 tracking-tighter font-semibold">{formatAbsoluteCurrency(entry.debit)} Out</span>
                    ) : (
                       <span className="text-slate-100 tracking-widest">--</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {entry.credit > 0 ? (
                       <span className="text-sm text-emerald-600 tracking-tighter font-semibold">{formatAbsoluteCurrency(entry.credit)} In</span>
                    ) : (
                       <span className="text-slate-100 tracking-widest">--</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right pr-6">
                    <button
                      onClick={() => onViewDetails(entry)}
                      className="h-10 w-10 p-0 rounded-lg bg-white border border-slate-100 shadow-sm text-slate-300 hover:text-slate-900 hover:shadow-md hover:border-slate-200 transition-all transform group-hover:scale-105 active:scale-95 flex items-center justify-center"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* main Pagination */}
      {!loading && entries.length > 0 && (
        <div className="px-4 py-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">
            Showing <span className="text-slate-900 font-medium mx-0.5">{entries.length}</span> of <span className="text-slate-900 font-medium mx-0.5">{pagination.total}</span> Total Transactions
          </p>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              disabled={pagination.page === 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="h-10 px-4 text-xs text-slate-600 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm font-medium tracking-widest uppercase transition-all"
            >
              Previous
            </Button>
            <div className="h-10 px-4 flex items-center justify-center bg-slate-950 text-white rounded-lg shadow-xl shadow-slate-200 text-xs font-medium tracking-widest">
                BATCH #{pagination.page}
            </div>
            <Button 
              variant="outline"
              disabled={pagination.page * pagination.limit >= pagination.total}
              onClick={() => onPageChange(pagination.page + 1)}
              className="h-10 px-4 text-xs text-slate-600 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm font-medium tracking-widest uppercase transition-all"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>

  );
}
