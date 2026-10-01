import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DetailTable, DetailRow } from '../../common/DetailTable';
import { cn } from '@/lib/utils';
import { isTradelineOpen } from '@/lib/utils/crifLoanGroups';
import { formatCrifDate, formatPaymentHistory, inr } from './formatters';

export default function TradelineDetailDialog({ loan, open, onOpenChange }) {
  if (!loan) return null;
  const isOpen = isTradelineOpen(loan);
  const history = formatPaymentHistory(loan.payment_history);
  const yesNo = (v) => (v ? 'Yes' : 'No');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base pr-6">
            {loan.credit_guarantor || loan.account_type || 'Loan detail'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Full CRIF tradeline details from the stored bureau report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <DetailTable title="Account" compact>
            <DetailRow label="Lender" compact>
              {loan.credit_guarantor || '—'}
            </DetailRow>
            <DetailRow label="Loan type" compact>
              {loan.account_type || '—'}
            </DetailRow>
            <DetailRow label="Account #" mono compact>
              {loan.account_number || '—'}
            </DetailRow>
            <DetailRow label="Status" compact>
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] px-1.5 py-0.5 normal-case',
                  isOpen ? 'text-emerald-700 border-emerald-300' : 'text-slate-500 border-slate-200'
                )}
              >
                {loan.status || (isOpen ? 'open' : 'closed')}
              </Badge>
            </DetailRow>
            <DetailRow label="Ownership" compact>
              {loan.ownership_ind || '—'}
            </DetailRow>
            <DetailRow label="Secured" compact>
              {yesNo(loan.secured)}
            </DetailRow>
          </DetailTable>

          <DetailTable title="Amounts" compact>
            <DetailRow label="Sanctioned" compact>
              {inr(loan._sanctioned ?? loan.sanctioned_amount)}
            </DetailRow>
            <DetailRow label="Balance" compact>
              {inr(loan._balance ?? loan.current_balance)}
            </DetailRow>
            <DetailRow label="Overdue" compact>
              {inr(loan._overdue ?? loan.overdue_amount)}
            </DetailRow>
            <DetailRow label="EMI / installment" compact>
              {loan._emi > 0
                ? inr(loan._emi)
                : loan.installment_amt
                  ? String(loan.installment_amt)
                  : '—'}
            </DetailRow>
            <DetailRow label="Obligation" compact>
              {loan.obligation != null ? inr(loan.obligation) : '—'}
            </DetailRow>
            <DetailRow label="Interest rate" compact>
              {loan.interest_rate != null ? `${loan.interest_rate}%` : '—'}
            </DetailRow>
            <DetailRow label="Tenure" compact>
              {loan.repayment_tenure != null ? `${loan.repayment_tenure}` : '—'}
            </DetailRow>
            <DetailRow label="DPD" compact>
              {loan.dpd != null ? String(loan.dpd) : '—'}
            </DetailRow>
          </DetailTable>

          <DetailTable title="Dates & flags" compact>
            <DetailRow label="Opened" compact>
              {formatCrifDate(loan.open_date)}
            </DetailRow>
            <DetailRow label="Closed" compact>
              {isOpen ? '—' : formatCrifDate(loan.closed_date)}
            </DetailRow>
            <DetailRow label="Reported" compact>
              {formatCrifDate(loan.report_date)}
            </DetailRow>
            <DetailRow label="Write-off" compact>
              {yesNo(loan.write_off)}
            </DetailRow>
            <DetailRow label="Settlement" compact>
              {yesNo(loan.settlement)}
            </DetailRow>
            <DetailRow label="Suit filed" compact>
              {yesNo(loan.suit_filed)}
            </DetailRow>
          </DetailTable>

          {history.length > 0 && (
            <DetailTable title="Payment history" compact>
              <DetailRow label="Combined" compact>
                <div className="max-h-40 overflow-y-auto space-y-0.5 font-mono text-[10px] text-slate-700">
                  {history.map((entry, idx) => (
                    <div key={idx}>{entry}</div>
                  ))}
                </div>
              </DetailRow>
            </DetailTable>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
