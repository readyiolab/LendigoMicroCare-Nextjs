import { useMemo, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DetailTable, DetailRow } from '../common/DetailTable';
import { useApplicationContext } from '../context/ApplicationContext';
import { Button } from '@/components/ui/button';
import CollectionPunchModal from '@/components/admin/collections/CollectionPunchModal';
import EditableDisbursalBankBlock, { canEditLoanBank } from '../common/EditableDisbursalBankBlock';
import {
  FileText,
  ClipboardList,
  DollarSign,
  Calculator,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const inr = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '₹ 0';
  return `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const inrFixed = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '₹0.00';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function hasSection(config, id) {
  return !config?.sections || config.sections.includes(id);
}

function SummaryCards({ summary }) {
  if (!summary) return null;
  const outstandingZero = Number(summary.outstanding) < 0.01;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[12px] font-medium text-slate-500">Loan Amount</p>
        <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{inr(summary.loanAmount)}</p>
        <p className="mt-1 text-[11px] text-slate-400">{summary.principalLabel || 'Principal Disbursed'}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[12px] font-medium text-slate-500">Total Paid</p>
        <p className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">{inr(summary.totalPaid)}</p>
        <p className="mt-1 text-[11px] text-slate-400">{summary.paidLabel || 'Collections Received'}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[12px] font-medium text-slate-500">Outstanding</p>
        <p
          className={cn(
            'mt-1 text-2xl font-bold tabular-nums',
            outstandingZero ? 'text-emerald-600' : 'text-slate-900'
          )}
        >
          {inr(summary.outstanding)}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {summary.outstandingLabel ||
            (outstandingZero ? 'Loan Completed' : 'Balance due on repayment date')}
        </p>
      </div>
    </div>
  );
}

function DisbursementDetailsPanel({ d, fields, bankEdit }) {
  if (!d) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <DetailTable title="Loan & Bank Details">
        <DetailRow label="Loan No">{d.loanNo}</DetailRow>
        <DetailRow label="Approval Amount" mono>{inr(d.approvalAmount)}</DetailRow>
        <DetailRow label="Net Disbursed" mono>{inr(d.netDisbursed)}</DetailRow>
        <DetailRow label="Deduction" mono>{inr(d.deduction)}</DetailRow>
        <EditableDisbursalBankBlock
          bank={d.bank}
          accountNo={d.accountNo}
          ifsc={d.ifsc}
          canEdit={bankEdit?.canEdit}
          updating={bankEdit?.updating}
          onSave={bankEdit?.onSave}
        />
        <DetailRow label="Disbursal Status">{d.disbursalStatus}</DetailRow>
      </DetailTable>
      <DetailTable title="Interest & Tenure">
        <DetailRow label="Disbursed Date">{d.disbursedDate || '—'}</DetailRow>
        <DetailRow label="Repayment Date">{d.repaymentDate || '—'}</DetailRow>
        <DetailRow label="Daily ROI">{`${d.dailyRoi ?? 0}%`}</DetailRow>
        <DetailRow label="Tenure (Days)">{d.tenureDays}</DetailRow>
        {fields?.showActualDaysUsed !== false && (
          <DetailRow label="Actual Days Used">{d.actualDaysUsed}</DetailRow>
        )}
        {fields?.showPenalty !== false && (
          <DetailRow label="Penalty Days">{d.penaltyDays}</DetailRow>
        )}
        <DetailRow label="Expected Interest (No Delay)" mono>
          {inr(d.expectedInterestNoDelay)}
        </DetailRow>
        <DetailRow label="Expected Repayment" mono>{inr(d.expectedRepayment)}</DetailRow>
      </DetailTable>
    </div>
  );
}

function InterestBreakdownPanel({ interest, fields }) {
  if (!interest) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <DetailTable title="Actual Calculation (Till Date)">
        <DetailRow label="Interest till today" mono>{inr(interest.normalInterest)}</DetailRow>
        {fields?.showPenalty !== false && (
          <DetailRow label="Late fee / penalty" mono>
            <span className="text-red-600 font-bold">{inr(interest.penaltyInterest)}</span>
          </DetailRow>
        )}
        <DetailRow label="Total interest till today" mono>
          <span className="text-blue-600 font-bold">{inr(interest.totalInterest)}</span>
        </DetailRow>
        <DetailRow label="Calculated till">{interest.interestCalculatedTill || '—'}</DetailRow>
        <DetailRow label="Early settlement (till today)" mono>
          <span className="font-bold text-slate-900">{inr(interest.earlySettlementAmount)}</span>
        </DetailRow>
      </DetailTable>
      <DetailTable title="Payment Summary">
        <DetailRow label="Total Paid" mono>
          <span className="text-emerald-600 font-bold">{inr(interest.totalPaid)}</span>
        </DetailRow>
        <DetailRow label="Scheduled outstanding" mono>
          <span
            className={cn(
              'font-bold',
              Number(interest.finalOutstanding) < 0.01 ? 'text-emerald-600' : 'text-slate-900'
            )}
          >
            {inr(interest.finalOutstanding)}
          </span>
        </DetailRow>
        <DetailRow label="Loan Status">
          <span className="font-bold">{interest.loanStatus}</span>
        </DetailRow>
        <DetailRow label="Total Discount" mono>{interest.totalDiscount ?? 0}</DetailRow>
      </DetailTable>
    </div>
  );
}

function MetricChip({ label, value, accent, icon: Icon, valueClass }) {
  return (
    <div
      className={cn(
        'relative rounded-lg border border-slate-200 bg-white p-3.5 pl-4 shadow-sm overflow-hidden',
        accent === 'pink' && 'bg-fuchsia-50/40',
        accent === 'cyan' && 'bg-sky-50/50',
        accent === 'orange' && 'bg-amber-50/40',
        accent === 'red' && 'bg-white'
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1',
          accent === 'pink' && 'bg-pink-400',
          accent === 'cyan' && 'bg-cyan-400',
          accent === 'orange' && 'bg-orange-400',
          accent === 'red' && 'bg-red-500'
        )}
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-slate-500">{label}</p>
          <p className={cn('mt-1 text-lg font-bold text-slate-900 tabular-nums', valueClass)}>
            {value}
          </p>
        </div>
        {Icon && (
          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatementOfAccountPanel({ statement, fields }) {
  if (!statement) return null;
  const txs = statement.transactions || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-[#222222]/10 text-[#222222] flex items-center justify-center">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Statement of Account</h3>
            <p className="text-[12px] text-slate-500">
              Loan Account #{statement.loanAccountNumber || '—'}
            </p>
          </div>
        </div>
        {statement.disbursedOnLabel && (
          <div className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600">
            Disbursed on <span className="font-bold text-slate-900">{statement.disbursedOnLabel}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricChip
          label="Principal outstanding"
          value={inrFixed(statement.principalOutstanding)}
          accent="pink"
          icon={DollarSign}
        />
        <MetricChip
          label="Interest due (full tenure)"
          value={inrFixed(statement.interestOutstanding)}
          accent="cyan"
          icon={Calculator}
        />
        {fields?.showBounceCharge !== false && (
          <MetricChip
            label="Bounce Charge"
            value={inrFixed(statement.bounceCharge)}
            accent="orange"
            icon={Calculator}
          />
        )}
        {fields?.showPenalty !== false && (
          <MetricChip
            label="Late fee"
            value={inrFixed(statement.penalInterest)}
            accent="red"
            icon={AlertTriangle}
            valueClass="text-red-600"
          />
        )}
      </div>

      <div className="rounded-lg bg-[#1d4ed8] text-white px-4 py-3 shadow-md max-w-xs">
        <p className="text-[12px] font-medium text-blue-100">Total payable (on repayment date)</p>
        <p className="text-xl font-bold tabular-nums">{inrFixed(statement.totalPayable)}</p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white">
          <ClipboardList className="h-4 w-4 text-slate-600" />
          <h4 className="text-sm font-bold text-slate-900">Transaction History</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium text-right">Debit (₹)</th>
                <th className="px-4 py-2.5 font-medium text-right">Credit (₹)</th>
                <th className="px-4 py-2.5 font-medium text-right">Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No transactions yet
                  </td>
                </tr>
              ) : (
                txs.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{row.date || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-900">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {row.badge && (
                          <span className="inline-flex rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 text-[11px] font-medium">
                            {row.badge}
                          </span>
                        )}
                        <span>{row.description}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-800 tabular-nums">
                      {row.debit != null
                        ? Number(row.debit).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-700 tabular-nums">
                      {row.credit != null
                        ? Number(row.credit).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900 tabular-nums">
                      {row.balance != null
                        ? Number(row.balance).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function LoanAccountViewTab() {
  const {
    loanAccountView: data,
    loadingLoanAccount: loading,
    loanAccountError: error,
    loanApp,
    applicationId,
    fetchLoanAccountView,
    admin,
    updating,
    handleUpdateDisbursalBankDetails,
  } = useApplicationContext();
  const [collectionOpen, setCollectionOpen] = useState(false);
  const canCollect = String(loanApp?.application_status || data?.applicationStatus || '').toLowerCase() === 'disbursed';

  const config = data?.config;
  const fields = config?.fields;

  const bankEdit = useMemo(() => ({
    canEdit: canEditLoanBank(admin, loanApp),
    updating,
    onSave: async (values) => {
      const ok = await handleUpdateDisbursalBankDetails?.({ ...values, viaAdmin: true });
      if (ok) fetchLoanAccountView?.(true);
      return ok;
    },
  }), [admin, loanApp, updating, handleUpdateDisbursalBankDetails, fetchLoanAccountView]);

  const content = useMemo(() => {
    if (!data) return null;
    return (
      <div className="space-y-5">
        {canCollect && (
          <div className="flex justify-end">
            <Button
              type="button"
              className="h-9 px-3 text-sm bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => setCollectionOpen(true)}
            >
              Collection
            </Button>
          </div>
        )}
        {hasSection(config, 'summary') && <SummaryCards summary={data.summary} />}
        {hasSection(config, 'disbursementDetails') && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#222222]">Disbursement Details</h3>
            <DisbursementDetailsPanel d={data.disbursement} fields={fields} bankEdit={bankEdit} />
          </section>
        )}
        {hasSection(config, 'interestBreakdown') && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#222222]">Interest Breakdown</h3>
            <InterestBreakdownPanel interest={data.interest} fields={fields} />
          </section>
        )}
        {hasSection(config, 'statementOfAccount') && (
          <StatementOfAccountPanel statement={data.statement} fields={fields} />
        )}
      </div>
    );
  }, [data, config, fields, canCollect, bankEdit]);

  // Loading → stable data. Never show empty/wrong financial values before fetch completes.
  if (loading || (!data && !error)) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
        <Spinner className="h-5 w-5" />
        <span className="text-sm">Loading loan account…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive" className="rounded-lg">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => fetchLoanAccountView?.(true)}
            disabled={loading}
          >
            {loading ? <Spinner className="h-3.5 w-3.5" /> : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  if (config && config.enabled === false) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Loan account view is disabled for this product.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
        <Info className="h-4 w-4" />
        No loan account data available.
      </div>
    );
  }

  return (
    <>
      {content}
      <CollectionPunchModal
        open={collectionOpen}
        onOpenChange={setCollectionOpen}
        loanApplicationId={loanApp?.id || applicationId}
        onSubmitted={() => fetchLoanAccountView?.(true)}
      />
    </>
  );
}
