import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * Shared initiate-settlement fields — used by Account 360.
 * Parent owns API submit via onSubmit.
 */
export default function InitiateSettlementForm({
  form,
  setForm,
  onSubmit,
  submitting,
  onCancel,
  outstandingLabel,
}) {
  return (
    <div className="space-y-2">
      {outstandingLabel != null && (
        <p className="text-xs text-slate-500">Outstanding: {outstandingLabel}</p>
      )}
      <Input
        type="number"
        placeholder="Proposed settlement amount"
        value={form.proposedAmount}
        onChange={(e) => setForm((f) => ({ ...f, proposedAmount: e.target.value }))}
      />
      <Input
        placeholder="Reason"
        value={form.reason}
        onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
      />
      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          className="flex-1"
          onClick={onSubmit}
          disabled={submitting || !form.proposedAmount}
        >
          {submitting ? 'Submitting…' : 'Submit for approval'}
        </Button>
      </div>
    </div>
  );
}
