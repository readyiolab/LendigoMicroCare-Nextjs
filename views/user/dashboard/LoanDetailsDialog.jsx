import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, Clock, XCircle } from "lucide-react";
import { LOAN_PURPOSES } from "./applicationSteps";

export default function LoanDetailsDialog({
  open,
  onOpenChange,
  error,
  loanDetails,
  setLoanDetails,
  repaymentDateOptions,
  onRepaymentDateSelect,
  submittingFinal,
  onFinalSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden border border-zinc-200 shadow-2xl">
        <DialogHeader className="bg-[#222222] px-5 py-4 text-left space-y-1">
          <DialogTitle className="text-base font-bold tracking-tight text-white leading-tight">
            Complete Application
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs leading-snug">
            Amount & repayment date for instant disbursal
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3.5 bg-white">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
              <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <p className="text-xs font-medium text-red-900 leading-snug">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.1fr] gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-600">Purpose</Label>
              <select
                value={loanDetails.purpose}
                onChange={(e) => setLoanDetails((prev) => ({ ...prev, purpose: e.target.value }))}
                className="w-full h-10 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 text-sm font-semibold text-zinc-900"
              >
                <option value="" disabled>Select purpose</option>
                {LOAN_PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-600">Loan amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">₹</span>
                <Input
                  type="number"
                  placeholder="1,000 – 50,000"
                  value={loanDetails.principalAmount}
                  onChange={(e) => setLoanDetails((prev) => ({ ...prev, principalAmount: e.target.value }))}
                  className="pl-7 h-10 rounded-lg border-zinc-200 bg-zinc-50/80 font-bold text-base tabular-nums"
                  min="1000"
                  max="50000"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold text-zinc-700">Repayment date</Label>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#222222] bg-blue-50 border border-blue-100 rounded-md px-2 py-0.5">
                <Clock className="w-3 h-3" />
                {loanDetails.tenureDays} days
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {repaymentDateOptions.map((dateObj, idx) => {
                const dateStr = format(dateObj, 'yyyy-MM-dd');
                const isSelected = loanDetails.selectedRepaymentDate === dateStr;
                const dayLabels = ['Salary', '+1 day', '+2 days'];

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onRepaymentDateSelect(dateObj)}
                    className={`flex flex-col items-center justify-center min-h-[64px] py-2 px-1 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-[#222222] bg-[#222222] text-white shadow-md'
                        : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                    }`}
                  >
                    <span className={`text-[10px] font-semibold leading-none mb-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {dayLabels[idx]}
                    </span>
                    <span className="text-lg font-bold leading-none tabular-nums">
                      {dateObj.getDate()}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {format(dateObj, 'MMM')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-zinc-50 flex items-center gap-2 border-t border-zinc-100">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-lg border-zinc-200 text-zinc-600 text-sm font-semibold hover:bg-white"
          >
            Back
          </Button>
          <Button
            onClick={onFinalSubmit}
            disabled={submittingFinal}
            className="flex-[1.4] bg-[#222222] hover:bg-[#111111] text-white h-10 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-[0.98]"
          >
            {submittingFinal ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="w-3.5 h-3.5 text-white" />
                Submitting…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                Apply Now
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
