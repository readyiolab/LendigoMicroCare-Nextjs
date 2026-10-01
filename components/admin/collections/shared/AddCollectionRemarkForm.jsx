import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const REMARK_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'promise_to_pay', label: 'Promise to pay' },
  { value: 'payment_received', label: 'Payment received' },
  { value: 'dispute', label: 'Dispute' },
  { value: 'escalation', label: 'Escalation' },
];

/**
 * Shared collection remark fields for Account 360.
 * Parent owns API submit via onSubmit.
 */
export default function AddCollectionRemarkForm({ form, setForm, onSubmit, submitting, onCancel }) {
  return (
    <div className="space-y-2">
      <select
        value={form.remarkType}
        onChange={(e) => setForm((f) => ({ ...f, remarkType: e.target.value }))}
        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
      >
        {REMARK_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Input
        placeholder="Remark"
        value={form.remark}
        onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
      />
      <Input
        type="date"
        value={form.nextFollowUpDate}
        onChange={(e) => setForm((f) => ({ ...f, nextFollowUpDate: e.target.value }))}
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
          disabled={submitting || !String(form.remark || '').trim()}
        >
          {submitting ? 'Saving…' : 'Save remark'}
        </Button>
      </div>
    </div>
  );
}
