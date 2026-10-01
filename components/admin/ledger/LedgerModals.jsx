import React from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  Calendar,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function LedgerAdjustmentModal({ open, onClose, data, setData, onSubmit }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose}>
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-white w-full max-w-md rounded-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500"
      >
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-white">
           <div>
              <h3 className="text-sm font-black text-slate-900 tracking-widest uppercase">Post Adjustment</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Manual balanced entry</p>
           </div>
           <button onClick={onClose} className="p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all text-slate-400">
              <X className="w-4 h-4" />
           </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-5 space-y-4">
           <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase tracking-widest ml-1 font-black">Loan ID</label>
                <input 
                  type="text" 
                  value={data.loanId}
                  onChange={e => setData({...data, loanId: e.target.value})}
                  className="h-10 w-full px-4 rounded-lg border border-slate-100 bg-slate-50/50 text-xs font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                  placeholder="LN-1001"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase tracking-widest ml-1 font-black">Type</label>
                <select 
                  value={data.entryType}
                  onChange={e => setData({...data, entryType: e.target.value})}
                  className="h-10 w-full px-4 rounded-lg border border-slate-100 bg-slate-50/50 text-xs font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="ADMIN_ADJUSTMENT">Correction</option>
                  <option value="WRITE_OFF">Write-off</option>
                  <option value="REFUND">Refund</option>
                </select>
              </div>
           </div>

           <div className="space-y-1">
              <label className="text-[9px] text-slate-400 uppercase tracking-widest ml-1 font-black">Amount (INR)</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₹</span>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  value={data.amount || ''}
                  onChange={e => setData({...data, amount: e.target.value, debitAmount: e.target.value, creditAmount: e.target.value})}
                  className="h-11 w-full pl-8 pr-4 rounded-lg border-2 border-slate-100 bg-slate-50 text-lg font-black text-slate-900 focus:border-slate-950 transition-all outline-none"
                />
              </div>
           </div>

           <div className="space-y-3">
              <div className="p-3 bg-red-50/20 border border-red-100/50 rounded-lg">
                 <h4 className="text-[9px] text-red-500 uppercase tracking-widest flex items-center gap-2 font-black mb-2">
                    <TrendingUp size={10} /> From (Debit)
                 </h4>
                 <select 
                   required
                   value={data.debitAccount}
                   onChange={e => setData({...data, debitAccount: e.target.value})}
                   className="h-9 w-full px-3 rounded-lg border border-red-100 bg-white text-[11px] font-bold outline-none"
                 >
                   <option value="">Select account...</option>
                   <option value="Cash">Cash Ledger</option>
                   <option value="Loan_Receivable">Loan Asset</option>
                   <option value="Interest_Income">Interest Revenue</option>
                 </select>
              </div>

              <div className="p-3 bg-emerald-50/20 border border-emerald-100/50 rounded-lg">
                 <h4 className="text-[9px] text-emerald-600 uppercase tracking-widest flex items-center gap-2 font-black mb-2">
                    <TrendingDown size={10} /> To (Credit)
                 </h4>
                 <select 
                   required
                   value={data.creditAccount}
                   onChange={e => setData({...data, creditAccount: e.target.value})}
                   className="h-9 w-full px-3 rounded-lg border border-emerald-100 bg-white text-[11px] font-bold outline-none"
                 >
                   <option value="">Select account...</option>
                   <option value="Cash">Cash Ledger</option>
                   <option value="Loan_Receivable">Loan Asset</option>
                   <option value="Interest_Income">Interest Revenue</option>
                 </select>
              </div>
           </div>

           <div className="space-y-1">
              <label className="text-[9px] text-slate-400 uppercase tracking-widest ml-1 font-black">Description</label>
              <textarea 
                required
                value={data.description}
                onChange={e => setData({...data, description: e.target.value})}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-slate-100 bg-slate-50/50 text-[11px] font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none resize-none"
                placeholder="Audit narrative..."
              />
           </div>

           <div className="flex gap-2 pt-2">
              <Button 
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1 h-11 rounded-lg text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest"
              >
                Discard
              </Button>
              <Button 
                type="submit"
                className="flex-[2] h-11 rounded-lg bg-slate-950 text-white hover:bg-slate-900 transition-all font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-300"
              >
                Post Entry
              </Button>
           </div>
        </form>
      </div>
    </div>
  );
}

export function LedgerDetailSheet({ entry, open, onOpenChange, onOpenLoan }) {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR', 
        maximumFractionDigits: 0 
    }).format(val || 0);
  };

  const InfoRow = ({ label, value, color }) => (
    <div className="p-5 border border-slate-50 bg-slate-50/20 rounded-lg transition-all hover:bg-white hover:shadow-sm">
       <span className="text-[10px] uppercase font-medium tracking-widest text-slate-400 block mb-1">{label}</span>
       <span className={cn(
          "text-[13px] font-medium tracking-tight ",
          color === 'red' ? 'text-red-500 font-semibold' : 
          color === 'emerald' ? 'text-emerald-600 font-semibold' : 
          'text-slate-900'
       )}>{value}</span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-3xl border-l border-slate-100 shadow-2xl p-0 h-full">
        <div className="p-4 space-y-4">
          <SheetHeader className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-slate-950 rounded-lg shadow-xl shadow-slate-200">
                  <Info className="w-6 h-6 text-white" />
               </div>
               <div>
                  <SheetTitle className="text-2xl font-medium text-slate-900 tracking-tighter">Transaction Details</SheetTitle>
                  <SheetDescription className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-1">Full summary of the money movement.</SheetDescription>
               </div>
            </div>
          </SheetHeader>

          {entry && (
            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
              <InfoRow label="Transaction ID" value={entry.transaction_id} />
              <InfoRow label="Date & Time" value={format(new Date(entry.created_at), 'dd MMM yyyy, hh:mm a')} />
              <div className="grid grid-cols-2 gap-4">
                 <InfoRow label="User Name" value={entry.full_name || 'System Entry'} />
                 <InfoRow label="Mobile Number" value={entry.mobile || 'N/A'} />
              </div>
              <InfoRow label="Loan Reference" value={entry.application_number || 'Internal Account'} />
              <div className="grid grid-cols-2 gap-4">
                 <InfoRow label="Type" value={entry.entry_type?.replace(/_/g, ' ')} />
                 <InfoRow label="Account Name" value={entry.account_name?.replace(/_/g, ' ')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <InfoRow label="Money Out" value={entry.debit > 0 ? formatCurrency(entry.debit) : '--'} color={entry.debit > 0 ? 'red' : null} />
                 <InfoRow label="Money In" value={entry.credit > 0 ? formatCurrency(entry.credit) : '--'} color={entry.credit > 0 ? 'emerald' : null} />
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-5 shadow-inner space-y-3">
                 <span className="text-[10px] uppercase font-medium tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <FileText size={12} /> Narrative Description
                 </span>
                 <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    "{entry.description || 'No additional details provided.'}"
                 </p>
              </div>

              <Button
                className={cn(
                  "w-full h-14 rounded-lg font-medium  tracking-wide transition-all",
                  entry.loan_application_id 
                    ? "bg-slate-950 text-white hover:bg-slate-900 shadow-xl shadow-slate-200" 
                    : "bg-slate-50 text-slate-300 cursor-not-allowed"
                )}
                disabled={!entry.loan_application_id}
                onClick={() => onOpenLoan(entry.loan_application_id)}
              >
                {entry.loan_application_id ? 'View Loan Details' : 'Internal Account Entry'}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>

  );
}

function Info({ size, className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  );
}
