import { CheckCircle2, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { DetailTable, DetailRow, EMPTY, btnPrimary } from '../common/DetailTable';
import { cn } from '@/lib/utils';

function GateStatus({ ok }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Done
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-700">
      <Clock className="w-3.5 h-3.5" />
      Pending
    </span>
  );
}

export default function DisbursementTab() {
  const {
    loanApp,
    data,
    bankDetails,
    mandateRegistration,
    handleDisburse,
    punchForm,
    setPunchForm,
    updating,
  } = useApplicationContext();

  const isDisbursed = loanApp.application_status === 'disbursed';

  const punch = data?.disbursementPunch || {};

  if (isDisbursed) {
    return (
      <div className="space-y-3">
        <DetailTable title="Payout status">
          <DetailRow label="Status">
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Money sent
            </span>
          </DetailRow>
          <DetailRow label="Disbursed at" mono>
            {loanApp.disbursed_at || punch.punched_at
              ? new Date(loanApp.disbursed_at || punch.punched_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : EMPTY}
          </DetailRow>
          <DetailRow label="Amount" mono>
            {`₹${parseFloat(loanApp.disbursement_amount || loanApp.approved_amount || 0).toLocaleString('en-IN')}`}
          </DetailRow>
          <DetailRow label="Reference / UTR" mono>
            {punch.bank_reference_no || EMPTY}
          </DetailRow>
          <DetailRow label="Punched by">{punch.punched_by_name || EMPTY}</DetailRow>
          <DetailRow label="Remark">{punch.disbursal_remark || EMPTY}</DetailRow>
          <DetailRow label="Note">
            Funds were transmitted to the customer’s verified bank account.
          </DetailRow>
        </DetailTable>
      </div>
    );
  }

  const hasCombinedAgreement = data?.esignDocs?.find(
    (d) =>
      ['loan_agreement', 'combined_agreement'].includes(d.document_type) &&
      (d.document_url || d.signed_document_url)
  );
  const isEsignCompleted =
    loanApp.esign_status === 'completed' ||
    (hasCombinedAgreement &&
      (loanApp.application_status === 'esign_completed' ||
        loanApp.application_status === 'mandate_pending' ||
        loanApp.application_status === 'payment_pending'));
  const isSanctioned = [
    'approved',
    'offer_sent',
    'offer_accepted',
    'video_declaration_pending',
    'video_declaration_submitted',
    'esign_pending',
    'esign_completed',
    'mandate_pending',
    'payment_pending',
  ].includes(loanApp.application_status);
  const isMandateRegistered =
    String(loanApp.mandate_status || '').toLowerCase() === 'registered' ||
    String(mandateRegistration?.status || '').toLowerCase() === 'registered';
  const isReadyForPayout =
    isMandateRegistered && loanApp.application_status === 'payment_pending';

  if (!isSanctioned || !isEsignCompleted || !isReadyForPayout) {
    return (
      <div className="space-y-3">
        <DetailTable title="Payout locked">
          <DetailRow label="Status">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <Lock className="w-3.5 h-3.5" />
              Steps remaining
            </span>
          </DetailRow>
          <DetailRow label="Note">
            Complete e-mandate (Step 6 EMI auto-debit) before applying bank reference / payout.
          </DetailRow>
        </DetailTable>
        <DetailTable title="Gates">
          <DetailRow label="Underwriter sanctioned"><GateStatus ok={isSanctioned} /></DetailRow>
          <DetailRow label="Customer signed (e-sign)"><GateStatus ok={isEsignCompleted} /></DetailRow>
          <DetailRow label="e-Mandate registered"><GateStatus ok={isMandateRegistered} /></DetailRow>
        </DetailTable>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <DetailTable title="Receiving account">
          <DetailRow label="Bank">{bankDetails?.bank_name || EMPTY}</DetailRow>
          <DetailRow label="Account" mono>
            {bankDetails?.account_number_masked || EMPTY}
          </DetailRow>
          <DetailRow label="IFSC" mono>{bankDetails?.ifsc_code || EMPTY}</DetailRow>
          <DetailRow label="Account holder">{bankDetails?.account_holder_name}</DetailRow>
          <DetailRow label="Transfer mode">IMPS / NEFT</DetailRow>
        </DetailTable>

        <DetailTable title="Disbursement">
          <DetailRow label="Net amount" mono>
            {`₹${parseFloat(loanApp.disbursement_amount || loanApp.approved_amount || 0).toLocaleString('en-IN')}`}
          </DetailRow>
          <DetailRow label="e-Mandate">
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Registered
            </span>
          </DetailRow>
          <DetailRow label="Bank reference / UTR">
            <Input
              value={punchForm?.bankReferenceNo || ''}
              onChange={(e) =>
                setPunchForm((prev) => ({ ...prev, bankReferenceNo: e.target.value }))
              }
              placeholder="Enter UTR / bank reference"
              className="h-9 text-[13px]"
              disabled={updating}
            />
          </DetailRow>
          <DetailRow label="Disbursal date">
            <Input
              type="date"
              value={punchForm?.disbursalDate || ''}
              onChange={(e) =>
                setPunchForm((prev) => ({ ...prev, disbursalDate: e.target.value }))
              }
              className="h-9 text-[13px]"
              disabled={updating}
            />
          </DetailRow>
          <DetailRow label="Remark">
            <Textarea
              value={punchForm?.remark || ''}
              onChange={(e) =>
                setPunchForm((prev) => ({ ...prev, remark: e.target.value }))
              }
              placeholder="Optional"
              className="min-h-[64px] text-[13px]"
              disabled={updating}
            />
          </DetailRow>
          <DetailRow label="Action">
            <Button
              onClick={handleDisburse}
              disabled={updating}
              className={cn(btnPrimary, 'h-9 px-4 text-[13px]')}
            >
              Apply bank reference
            </Button>
          </DetailRow>
          <DetailRow label="Note">
            Marks money as disbursed after you enter the bank UTR. Batch bank export still lives on Disbursal Sheet.
          </DetailRow>
        </DetailTable>
      </div>

      <DetailTable title="Manager checklist">
        <DetailRow label="1">
          Final check of bank holder name alignment <GateStatus ok />
        </DetailRow>
        <DetailRow label="2">
          Verify e-sign signature timestamps <GateStatus ok={isEsignCompleted} />
        </DetailRow>
        <DetailRow label="3">
          Confirm mandate registration status <GateStatus ok={isMandateRegistered} />
        </DetailRow>
        <DetailRow label="4">No pending fraud alerts on primary profile</DetailRow>
      </DetailTable>
    </div>
  );
}
