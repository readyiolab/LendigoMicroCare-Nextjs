import { 
  Banknote, 
  Calendar, 
  Percent, 
  CreditCard,
  Info,
  Clock,
  CheckCircle2,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatApplicationAppliedLabel } from '@/lib/utils/applicationDates';

export default function LoanBreakdownInline({ application }) {
  if (!application) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculations
  const principal = parseFloat(application.principal_amount || application.approved_amount || 0);
  const tenure = parseInt(application.tenure_days || 0);
  const interestRate = parseFloat(application.applied_interest_rate_daily || application.interest_rate_per_day || 0.1);

  let processingFee = parseFloat(application.processing_fee_amount || 0);
  let interestAmount = parseFloat(application.interest_amount || 0);
  let totalPayable = parseFloat(application.total_payable || 0);

  // Fallback calculations if DB fields are empty/zero
  if (processingFee === 0 && principal > 0) {
    processingFee = Math.round(principal * 0.08); // standard 8% processing fee
  }
  
  if (interestAmount === 0 && principal > 0 && tenure > 0) {
    interestAmount = Math.round(principal * (interestRate / 100) * tenure);
  }
  
  if (totalPayable === 0 && principal > 0) {
    totalPayable = principal + interestAmount;
  }

  const appliedInfo = formatApplicationAppliedLabel(application);

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300 ease-out space-y-3">
        {/* Row 1: Principal & Tenure */}
        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-normal">Principal Amount</p>
                <div className="flex items-baseline gap-1">
                    <p className="text-lg font-bold text-gray-900 tracking-tight">{formatCurrency(principal)}</p>
                </div>
            </div>
            <div className="space-y-0.5">
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-normal">Loan Tenure</p>
                <div className="flex items-baseline gap-1">
                    <p className="text-lg font-bold text-gray-900 tracking-tight">{application.tenure_days}</p>
                    <span className="text-[9px] font-semibold text-gray-400 uppercase">Days</span>
                </div>
            </div>
        </div>

        {/* Row 2: Interest & Processing Fee */}
        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-normal">Interest</p>
                <p className="text-[9px] text-blue-500 font-semibold">{interestRate}% per day</p>
                <p className="text-sm font-semibold text-gray-900 tracking-tight">{formatCurrency(interestAmount)}</p>
            </div>
            <div className="space-y-0.5">
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-normal">Processing Fee</p>
                <p className="text-[9px] text-purple-500 font-semibold">One-time charge</p>
                <p className="text-sm font-semibold text-gray-900 tracking-tight">{formatCurrency(processingFee)}</p>
            </div>
        </div>

        {/* Row 3: Total Repayment */}
        <div className="bg-gray-900 rounded-lg p-4 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
                <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="relative z-10">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-normal mb-1">Total Repayment</p>
                <p className="text-xl font-bold text-white tracking-tight">{formatCurrency(totalPayable)}</p>
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[8px] font-semibold uppercase tracking-normal text-gray-400">
                    <span>{appliedInfo.label}: {appliedInfo.value || '—'}</span>
                    {application.status === 'closed' && <Badge className="bg-emerald-500/20 text-emerald-400 border-none h-4 px-1.5 text-[7px]">COMPLETED</Badge>}
                </div>
            </div>
        </div>
    </div>
  );
}
