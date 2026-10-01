import React from 'react';
import { 
  Info, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function AccountSummary({ accounts }) {
  const formatSignedBalance = (amount) => {
    const numeric = Number(amount || 0);
    const abs = Math.abs(numeric);
    const formatted = new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR', 
        maximumFractionDigits: 0 
    }).format(abs);
    return `${formatted} (${numeric >= 0 ? 'Out' : 'In'})`;
  };

  return (
    <Card className="border-slate-100 shadow-sm rounded-lg overflow-hidden animate-in fade-in duration-700">
      <CardHeader className="bg-slate-50/30 border-b border-slate-50 px-5 py-4">
        <div className="flex items-center justify-between">
           <div>
              <CardTitle className="text-lg font-medium text-slate-900 tracking-tight flex items-center gap-2">
                 <Info className="w-4 h-4 text-blue-500" /> Account Totals
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-medium">
                 How much is in each account
              </CardDescription>
           </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.length === 0 ? (
             <div className="col-span-full py-8 text-center text-slate-300 text-xs font-medium uppercase tracking-widest">No accounts found</div>
          ) : accounts.map((acc, idx) => (
            <div 
               key={idx} 
               className="group rounded-lg border border-slate-50 bg-slate-50/30 p-5 transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 hover:border-slate-100 duration-500 overflow-hidden relative"
            >
              <div className="flex items-center justify-between mb-3 relative z-10">
                 <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-medium bg-white/50 px-2 py-0.5 rounded-full border border-slate-100/50">
                    {acc.account_type?.replace(/_/g, ' ') || 'SYSTEM'}
                 </span>
                 {acc.balance >= 0 ? (
                    <TrendingDown className="w-3 h-3 text-emerald-400" />
                 ) : (
                    <TrendingUp className="w-3 h-3 text-amber-400" />
                 )}
              </div>
              <h4 className="text-[13px] font-medium text-slate-900 tracking-tight truncate capitalize relative z-10">
                 {acc.account_name?.replace(/_/g, ' ')}
              </h4>
              <p className={cn(
                "mt-4 text-xl font-medium tracking-tighter relative z-10 ",
                acc.balance >= 0 ? "text-slate-950" : "text-amber-600"
              )}>
                {formatSignedBalance(acc.balance)}
              </p>
              
              {/* Subtle background glow on hover */}
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-50/50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
