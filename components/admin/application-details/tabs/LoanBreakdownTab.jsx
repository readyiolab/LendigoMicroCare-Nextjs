import { Banknote } from 'lucide-react';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { DetailTable, DetailRow, EMPTY } from '../common/DetailTable';

export default function LoanBreakdownTab() {
  const { loanApp, bankDetails } = useApplicationContext();

  if (!loanApp.approved_amount) {
    return (
      <DetailTable title="Loan breakdown">
        <DetailRow label="Status">Financials pending approval</DetailRow>
      </DetailTable>
    );
  }

  const P = parseFloat(loanApp.approved_amount);
  const days = parseInt(loanApp.tenure_days, 10);
  const rate =
    parseFloat(
      loanApp.applied_interest_rate_daily ||
        (loanApp.interest_rate_per_day ? loanApp.interest_rate_per_day * 100 : 0) ||
        (loanApp.approved_interest_rate ? loanApp.approved_interest_rate / 365 : 0)
    ) || 0;
  const interest = (P * rate * days) / 100;
  const totalRepayment = P + interest;

  let fees = [];
  let totalDeductions = 0;
  let gst = 0;
  let storedNetDisbursement = 0;

  if (loanApp.fee_breakdown) {
    try {
      const parsed =
        typeof loanApp.fee_breakdown === 'string'
          ? JSON.parse(loanApp.fee_breakdown)
          : loanApp.fee_breakdown;
      if (parsed._calculated) {
        gst = parseFloat(parsed._calculated.gst_on_fees || parsed.gst || 0);
        totalDeductions = parseFloat(
          parsed._calculated.total_deductions || parsed.totalDeductible || 0
        );
        storedNetDisbursement = parseFloat(
          parsed._calculated.disbursement_amount || parsed.netDisbursedAmount || 0
        );
        if (Array.isArray(parsed._calculated.fee_breakdown)) {
          fees = parsed._calculated.fee_breakdown.map((f) => ({
            label: String(f.fee_code || 'fee').replace(/_/g, ' '),
            amount: parseFloat(f.fee_amount) || (P * parseFloat(f.fee_percent || 0)) / 100,
          }));
        }
      }
      if (fees.length === 0) {
        fees = Object.entries(parsed)
          .filter(([k]) => !k.startsWith('_') && typeof parsed[k] !== 'object')
          .map(([k, v]) => ({
            label: k.replace(/_/g, ' '),
            amount: parseFloat(v) < 100 ? (P * parseFloat(v)) / 100 : parseFloat(v),
          }));
      }
    } catch {
      /* ignore parse errors */
    }
  }

  if (fees.length === 0) {
    fees = [
      { label: 'Platform Fee (10%)', amount: P * 0.10 },
    ];
    const sub = fees.reduce((s, f) => s + f.amount, 0);
    gst = sub * 0.18;
    totalDeductions = sub + gst;
  }

  const netDisbursement = storedNetDisbursement || P - totalDeductions;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <DetailTable title="Summary">
          <DetailRow label="Limit approved" mono>{`₹${P.toLocaleString('en-IN')}`}</DetailRow>
          <DetailRow label="Daily rate" mono>{`${rate.toFixed(3)}%`}</DetailRow>
          <DetailRow label="Approx APR" mono>{`~${(rate * 365).toFixed(1)}%`}</DetailRow>
          <DetailRow label="Duration" mono>{`${days} days`}</DetailRow>
          <DetailRow label="Total payable" mono>
            {`₹${Math.round(totalRepayment).toLocaleString('en-IN')}`}
          </DetailRow>
        </DetailTable>

        <DetailTable title="Crediting account">
          {bankDetails ? (
            <>
              <DetailRow label="Bank">{bankDetails.bank_name}</DetailRow>
              <DetailRow label="Account" mono>
                {bankDetails.account_number_masked || EMPTY}
              </DetailRow>
              <DetailRow label="IFSC" mono>{bankDetails.ifsc_code}</DetailRow>
              <DetailRow label="Account holder">{bankDetails.account_holder_name}</DetailRow>
            </>
          ) : (
            <DetailRow label="Bank">Pending bank setup</DetailRow>
          )}
        </DetailTable>
      </div>

      <DetailTable title="Fee architecture">
        {fees.map((fee, i) => (
          <DetailRow key={i} label={fee.label} mono>
            {`₹${Math.round(fee.amount).toLocaleString('en-IN')}`}
          </DetailRow>
        ))}
        <DetailRow label="GST (18%)" mono>{`₹${Math.round(gst).toLocaleString('en-IN')}`}</DetailRow>
        <DetailRow label="Aggregate deductions" mono>
          {`− ₹${Math.round(totalDeductions).toLocaleString('en-IN')}`}
        </DetailRow>
        <DetailRow label="Final disbursal" mono>
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
              <Banknote className="w-3.5 h-3.5" />
              {`₹${Math.round(netDisbursement).toLocaleString('en-IN')}`}
            </span>
        </DetailRow>
      </DetailTable>

      <DetailTable title="Policy note">
        <DetailRow label="Note">
          These figures are the finalized financial agreement. Any deviation needs a Super Admin override.
        </DetailRow>
      </DetailTable>
    </div>
  );
}
