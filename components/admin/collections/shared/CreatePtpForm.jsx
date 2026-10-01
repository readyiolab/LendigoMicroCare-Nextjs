import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * Shared Create PTP fields — used by Account 360 (and reusable elsewhere).
 * Parent owns API submit via onSubmit.
 */
export default function CreatePtpForm({ form, setForm, onSubmit, submitting, onCancel }) {
  return (
    <div className="space-y-2">
      <Input
        type="date"
        value={form.promiseDate}
        onChange={(e) => setForm((f) => ({ ...f, promiseDate: e.target.value }))}
      />
      <Input
        type="number"
        placeholder="Promise amount"
        value={form.promiseAmount}
        onChange={(e) => setForm((f) => ({ ...f, promiseAmount: e.target.value }))}
      />
      <Input
        placeholder="Remarks"
        value={form.remarks}
        onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
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
          disabled={submitting || !form.promiseDate || !form.promiseAmount}
        >
          {submitting ? 'Saving…' : 'Save PTP'}
        </Button>
      </div>
    </div>
  );
}
