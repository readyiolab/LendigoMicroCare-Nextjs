import { useCallback, useEffect, useState } from 'react';
import { collectionAPI } from '@/lib/api/collection';
import { Button } from '@/components/ui/button';
import { formatInr, formatQueueDate } from '@/components/admin/collections/shared/collectionUi';
import { AddRemarkModal } from '@/components/admin/collections/CollectionModals';
import CollectionPunchModal from '@/components/admin/collections/CollectionPunchModal';

const EMPTY_REMARK = { remark: '', remarkType: 'no_answer', nextFollowUpDate: '', promiseAmount: '' };

export default function CollectionCasePanel({ row, onClose, onSaved }) {
  const loanId = row?.loan_application_id;
  const [loan, setLoan] = useState(null);
  const [lastNote, setLastNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [remarkForm, setRemarkForm] = useState(EMPTY_REMARK);
  const [submitting, setSubmitting] = useState(false);
  const [punchOpen, setPunchOpen] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!loanId) return;
    setLoading(true);
    setError('');
    try {
      const [overdueRes, remarkRes] = await Promise.all([
        collectionAPI.getOverdueRepayments({ search: String(loanId), loanLevel: 'true', limit: 5 }),
        collectionAPI.getCollectionRemarks(loanId),
      ]);
      const rows = overdueRes?.data?.repayments || [];
      const match = rows.find((item) => String(item.loan_application_id) === String(loanId)) || rows[0] || null;
      setLoan(match);
      const remarks = Array.isArray(remarkRes?.data) ? remarkRes.data : [];
      const latest = Array.isArray(remarks) ? remarks[0] : null;
      setLastNote(latest?.remarks || latest?.remark || '');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not open this case');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveCall = async () => {
    if (!remarkForm.remark.trim()) {
      setError('Write what happened on the call');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await collectionAPI.addCollectionRemark({
        loanApplicationId: loanId,
        userId: row.user_id || loan?.user_id,
        remark: remarkForm.remark,
        remarkType: remarkForm.remarkType,
        nextFollowUpDate: remarkForm.nextFollowUpDate || undefined,
        promiseAmount: remarkForm.promiseAmount ? parseFloat(remarkForm.promiseAmount) : undefined,
        createPtp: remarkForm.remarkType === 'promise_to_pay',
      });
      setRemarkOpen(false);
      setRemarkForm(EMPTY_REMARK);
      await load();
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not save the call');
    } finally {
      setSubmitting(false);
    }
  };

  const amount = loan?.total_due_with_penalty ?? loan?.principal_due;
  const dpd = loan?.days_overdue ?? row?.max_dpd;

  return (
    <div className="border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {row.borrower_name || 'Borrower'} · {row.loan_account_number || row.application_number || row.lead_id}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Amount due {amount != null ? formatInr(amount) : '—'} · DPD {dpd ?? '—'}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </div>

      {loading ? <p className="text-xs text-slate-500">Loading case…</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Last note</p>
        <p className="text-xs text-slate-700 mt-1">{lastNote || 'No call logged yet'}</p>
        {loan?.next_follow_up_date ? (
          <p className="text-[11px] text-slate-500 mt-1">Next {formatQueueDate(loan.next_follow_up_date)}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => { setError(''); setRemarkOpen(true); }}>
          Log call
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setPunchOpen(true)}>
          Record payment
        </Button>
      </div>
      <p className="text-[11px] text-slate-500">
        Log call saves a note, promise, or visit. Record payment waits for approval and does not mark the EMI paid.
      </p>

      <AddRemarkModal
        notesOnly
        remarkModal={remarkOpen ? { borrower_name: row.borrower_name, application_number: row.application_number || row.loan_account_number } : null}
        remarkForm={remarkForm}
        setRemarkForm={setRemarkForm}
        onSubmit={saveCall}
        submitting={submitting}
        onClose={() => setRemarkOpen(false)}
      />
      {punchOpen && (
        <CollectionPunchModal
          open={punchOpen}
          onOpenChange={setPunchOpen}
          loanApplicationId={loanId}
          onSubmitted={() => {
            setPunchOpen(false);
            load();
            onSaved?.();
          }}
        />
      )}
    </div>
  );
}
