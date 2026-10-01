import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SummaryCard = ({ title, amount, icon, color, subtitle, description }) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR', 
        maximumFractionDigits: 0 
    }).format(val || 0);
  };

  const colorMap = {
    amber: 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/20',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/20',
    blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100/20',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100/20',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100/20',
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 duration-500 group relative">
      <div className="flex items-center justify-between mb-6">
        <div className={cn("p-2.5 rounded-lg border transition-transform group-hover:scale-110 duration-500", colorMap[color])}>
          {icon}
        </div>
        <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-medium opacity-60">
          {subtitle}
        </span>
      </div>
      <div className="space-y-1">
        <h4 className="text-[11px] text-slate-400 uppercase tracking-widest font-medium">{title}</h4>
        <p className="text-2xl font-medium text-slate-900 tracking-tighter">
          {formatCurrency(amount)}
        </p>
      </div>
      
      {/* Non-Tech Explanation */}
      {description && (
        <p className="mt-3 text-[10px] text-slate-400 leading-relaxed font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {description}
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
         <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-1000", 
               color === 'emerald' ? 'bg-emerald-500 w-[70%]' : 
               color === 'amber' ? 'bg-amber-500 w-[85%]' : 
               'bg-slate-300 w-[50%]'
            )} />
         </div>
      </div>
    </div>
  );
};

export default function LedgerSummary({ summary }) {
  if (!summary) return null;

  const nts = summary.non_tech_summary || {};

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      
      {/* Non-Tech Stakeholder Guide */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-6 flex gap-4 items-start shadow-sm">
        <div className="p-2 bg-blue-100 rounded-lg">
           <AlertCircle className="w-5 h-5 text-blue-600" />
        </div>
        <div className="space-y-1">
           <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">Understanding the Money Book</h4>
           <p className="text-xs text-blue-700/70 font-medium leading-relaxed">
             This summary shows the overall health of the business. 
             <strong className="text-blue-900 mx-1">Money Sent</strong> is our investment in customers, 
             <strong className="text-blue-900 mx-1">Money Received</strong> is our recovery (including profit), and 
             <strong className="text-blue-900 mx-1">Outstanding</strong> is what's still pending in the market.
             Hover over any card for a detailed explanation.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SummaryCard 
        title="Total Money Sent" 
        amount={summary.total_disbursed} 
        icon={<TrendingDown className="w-4 h-4" />} 
        color="amber"
        subtitle="Loans Given"
        description={nts.total_disbursed}
      />
      <SummaryCard 
        title="Total Money Received" 
        amount={summary.total_collected} 
        icon={<TrendingUp className="w-4 h-4" />} 
        color="emerald"
        subtitle="Money Collected"
        description={nts.total_collected}
      />
      <SummaryCard 
        title="Outstanding Principal" 
        amount={summary.outstanding_principal} 
        icon={<Wallet className="w-4 h-4" />} 
        color="blue"
        subtitle="Pending Dues"
        description={nts.outstanding_principal}
      />
    </div>
    </div>
  );
}
