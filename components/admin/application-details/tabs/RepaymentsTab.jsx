import { useEffect } from 'react';
import { Eye, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { DataTable, DataCell, DetailTable, DetailRow, EMPTY, btnPrimary, btnSecondary, btnSuccess, btnDanger } from '../common/DetailTable';

function statusClass(status) {
  switch (status) {
    case 'paid':
      return 'text-emerald-700';
    case 'overdue':
      return 'text-rose-700';
    case 'under_review':
      return 'text-[#222222]';
    default:
      return 'text-slate-600';
  }
}

export default function RepaymentsTab() {
  const {
    repayments,
    partPayments = [],
    loadingRepayments,
    targetEmiId,
    handleVerifyRepayment,
    verifyingEmiId,
    prepaymentData,
    prepaymentDate,
    setPrepaymentDate,
    fetchPrepayment,
    loadingPrepayment,
    handleViewFile,
    loanApp,
    activeTab,
    userData,
    isRepaymentReview,
  } = useApplicationContext();

  // isClosed includes "disbursed" (locks CAM/actions), but EMI verify must stay enabled on active loans
  const verifyBlocked = ['closed', 'rejected', 'offer_rejected'].includes(
    loanApp?.application_status
  );

  useEffect(() => {
    if (activeTab === 'repayments' && targetEmiId && repayments.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`emi-${targetEmiId}`);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [activeTab, targetEmiId, repayments.length]);

  return (
    <div className="space-y-3">
      {isRepaymentReview && (
        <DetailTable title="Loan">
          <DetailRow label="Customer">{userData?.full_name}</DetailRow>
          <DetailRow
            label={
              loanApp?.loan_account_number
                ? 'Loan account no.'
                : loanApp?.lead_id
                  ? 'Lead ID'
                  : 'Reference'
            }
            mono
          >
            {loanApp?.loan_account_number || loanApp?.lead_id || '—'}
          </DetailRow>
          <DetailRow label="Approved amount" mono>
            {`₹${parseInt(loanApp?.approved_amount || 0, 10).toLocaleString('en-IN')}`}
          </DetailRow>
          <DetailRow label="Status">
            <span className="capitalize">
              {(loanApp?.application_status || EMPTY).replace(/_/g, ' ')}
            </span>
          </DetailRow>
        </DetailTable>
      )}

      <DataTable
        title="Payment list"
        action={<span className="text-[11px] text-slate-500">{repayments.length}</span>}
        columns={[
          { key: 'emi', label: 'EMI #' },
          { key: 'amount', label: 'Amount' },
          { key: 'due', label: 'Due date' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Actions', className: 'text-right' },
        ]}
        emptyMessage={loadingRepayments ? 'Loading…' : 'No repayment schedule found'}
      >
        {loadingRepayments
          ? null
          : repayments.length > 0
            ? repayments.map((emi) => (
                <tr
                  key={emi.id}
                  id={`emi-${emi.id}`}
                  className={cn(emi.id === targetEmiId && 'bg-slate-50')}
                >
                  <DataCell mono>{emi.emiNumber}</DataCell>
                  <DataCell mono>{`₹${parseFloat(emi.amount).toLocaleString('en-IN')}`}</DataCell>
                  <DataCell mono>
                    {emi.dueDate
                      ? new Date(emi.dueDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : EMPTY}
                  </DataCell>
                  <DataCell>
                    <span className={cn('text-[12px] font-bold capitalize', statusClass(emi.status))}>
                      {(emi.status || EMPTY).replace(/_/g, ' ')}
                    </span>
                    {emi.status === 'paid' && emi.verifiedBy ? (
                      <span className="block text-[11px] text-slate-500">
                        Verified by #{emi.verifiedBy}
                      </span>
                    ) : null}
                    {emi.status === 'under_review' && emi.utrNumber ? (
                      <span className="block text-[11px] font-mono text-slate-500">
                        UTR {emi.utrNumber}
                      </span>
                    ) : null}
                  </DataCell>
                  <DataCell className="text-right">
                    {emi.status === 'under_review' ? (
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          className={btnSecondary}
                          onClick={() =>
                            handleViewFile(
                              'repayment_evidence',
                              emi.screenshotPath,
                              loanApp.application_number
                            )
                          }
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Proof
                        </Button>
                        <Button
                          size="sm"
                          className={btnSuccess}
                          onClick={() => handleVerifyRepayment(emi.id, 'paid')}
                          disabled={verifyingEmiId === emi.id || verifyBlocked}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          className={btnDanger}
                          onClick={() => {
                            const r = window.prompt('Denial reason:');
                            if (r) handleVerifyRepayment(emi.id, 'pending', r);
                          }}
                          disabled={verifyingEmiId === emi.id || verifyBlocked}
                        >
                          Void
                        </Button>
                      </div>
                    ) : (
                      EMPTY
                    )}
                  </DataCell>
                </tr>
              ))
            : null}
      </DataTable>

      {(partPayments?.length > 0 || (!loadingRepayments && Array.isArray(partPayments))) && (
        <DataTable
          title="Part payments"
          action={<span className="text-[11px] text-slate-500">{partPayments.length}</span>}
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'amount', label: 'Amount' },
            { key: 'ref', label: 'Reference' },
            { key: 'status', label: 'Status' },
            { key: 'by', label: 'Recorded by' },
          ]}
          emptyMessage={loadingRepayments ? 'Loading…' : 'No part payments recorded for this loan'}
        >
          {!loadingRepayments && partPayments.length > 0
            ? partPayments.map((p) => (
                <tr key={p.id}>
                  <DataCell mono>
                    {p.payment_date
                      ? new Date(p.payment_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : EMPTY}
                  </DataCell>
                  <DataCell mono>
                    {`₹${parseFloat(p.amount || 0).toLocaleString('en-IN')}`}
                  </DataCell>
                  <DataCell mono>{p.reference_no || p.utr_number || EMPTY}</DataCell>
                  <DataCell>
                    <span className="text-[12px] font-bold capitalize text-slate-700">
                      {(p.status || 'recorded').replace(/_/g, ' ')}
                    </span>
                  </DataCell>
                  <DataCell>{p.recorded_by_name || EMPTY}</DataCell>
                </tr>
              ))
            : null}
        </DataTable>
      )}

      {loadingRepayments && (
        <div className="py-6 flex justify-center">
          <Spinner className="w-5 h-5" />
        </div>
      )}

      {!isRepaymentReview && loanApp?.application_status === 'disbursed' && (
        <DetailTable title="Prepay & save">
          <DetailRow label="Payoff date">
            <div className="relative max-w-xs">
              <input
                type="date"
                value={prepaymentDate}
                onChange={(e) => setPrepaymentDate(e.target.value)}
                className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-[13px] font-mono"
              />
              <Calendar className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </DetailRow>
          <DetailRow label="Calculate">
            <Button
              size="sm"
              onClick={() => fetchPrepayment(undefined, true)}
              disabled={loadingPrepayment}
              className={btnPrimary}
            >
              {loadingPrepayment ? <Spinner className="w-3.5 h-3.5 border-white" /> : 'Calculate savings'}
            </Button>
          </DetailRow>
          {prepaymentData && (
            <>
              <DetailRow label="Total payoff" mono>
                {`₹${prepaymentData.totalPrepaymentAmount?.toLocaleString('en-IN')}`}
              </DetailRow>
              <DetailRow label="Outstanding principal" mono>
                {`₹${prepaymentData.outstandingPrincipal?.toLocaleString('en-IN')}`}
              </DetailRow>
              <DetailRow label={`Accrued interest (${prepaymentData.daysUsed}d)`} mono>
                {`₹${prepaymentData.proRataInterest?.toLocaleString('en-IN')}`}
              </DetailRow>
              <DetailRow label="Prepayment charges">NIL</DetailRow>
              <DetailRow label="Tenure progress" mono>
                {`${prepaymentData.daysUsed} / ${prepaymentData.originalTenureDays} days`}
              </DetailRow>
              <DetailRow label="Interest waived" mono>
                {`₹${prepaymentData.interestSaved?.toLocaleString('en-IN')}`}
              </DetailRow>
            </>
          )}
        </DetailTable>
      )}
    </div>
  );
}
