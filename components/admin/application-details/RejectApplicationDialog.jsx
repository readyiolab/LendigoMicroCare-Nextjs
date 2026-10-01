import { useState } from 'react';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CUSTOMER_REJECTION_INTRO,
  REJECTION_REASONS,
  buildRejectionReasonMessage,
  validateRejectionSelection,
} from '@/config/rejectionReasons';
import { cn } from '@/lib/utils';

export default function RejectApplicationDialog({
  open,
  onOpenChange,
  onConfirm,
  updating = false,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [additionalNote, setAdditionalNote] = useState('');
  const [error, setError] = useState('');

  const toggleReason = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setError('');
  };

  const selectedLabels = REJECTION_REASONS.filter((r) => selectedIds.includes(r.id)).map(
    (r) => r.label
  );

  const handleConfirm = () => {
    const validationError = validateRejectionSelection(selectedIds, additionalNote);
    if (validationError) {
      setError(validationError);
      return;
    }
    const rejectionReason = buildRejectionReasonMessage(selectedIds, additionalNote);
    onConfirm(rejectionReason);
  };

  const handleOpenChange = (next) => {
    if (!next) {
      setSelectedIds([]);
      setAdditionalNote('');
      setError('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col gap-0 overflow-hidden rounded-lg p-0">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-base">
            <XCircle className="w-4 h-4 text-red-500" />
            Confirm rejection
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Select one or more reasons for the internal record. Customers only see
            &quot;Application Not Approved&quot; — these details stay visible to authorized staff.
          </DialogDescription>
        </DialogHeader>

        {/* Single scroll body — avoid nested max-h + overflow (double vertical bars) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 leading-relaxed">
            Customers only see &quot;Application Not Approved&quot;. The text below is stored for staff review only.
            <p className="mt-1.5 text-slate-500 italic">{CUSTOMER_REJECTION_INTRO}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
              Rejection reasons
            </label>
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="p-1.5 space-y-0.5">
                {REJECTION_REASONS.map((reason) => (
                  <label
                    key={reason.id}
                    className={cn(
                      'flex items-start gap-2 rounded-md px-2 py-2 text-xs cursor-pointer hover:bg-slate-50',
                      selectedIds.includes(reason.id) && 'bg-red-50/60'
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.includes(reason.id)}
                      onCheckedChange={() => toggleReason(reason.id)}
                      className="mt-0.5"
                    />
                    <span className="text-slate-700 leading-snug">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {selectedLabels.length > 0 && (
              <p className="text-[11px] text-slate-500">{selectedLabels.join(' · ')}</p>
            )}
          </div>

          <div
            id="rejection-remark-section"
            className={cn(
              'space-y-2 rounded-lg border-2 border-amber-300 bg-amber-50/80 px-3 py-3 ring-2 ring-amber-100',
              selectedIds.includes('other') && 'border-red-400 ring-red-100 bg-red-50/70'
            )}
          >
            <label
              htmlFor="rejection-additional-note"
              className="flex items-center gap-1.5 text-[11px] font-bold text-amber-950 uppercase tracking-wide"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                !
              </span>
              Remark / additional note
              {selectedIds.includes('other') ? (
                <span className="normal-case font-semibold text-red-700">(required for Other)</span>
              ) : (
                <span className="normal-case font-medium text-amber-800/80">(optional)</span>
              )}
            </label>
            <p className="text-[11px] text-amber-900/80 leading-snug">
              Write internal staff remarks here — this is the note section credit managers look for.
            </p>
            <Textarea
              id="rejection-additional-note"
              value={additionalNote}
              onChange={(e) => {
                setAdditionalNote(e.target.value);
                setError('');
              }}
              placeholder="Add internal staff notes / remarks here…"
              className="min-h-[88px] rounded-lg border-amber-200 bg-white text-xs focus-visible:ring-amber-400"
            />
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={updating}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={updating}
            className="rounded-lg"
          >
            {updating ? 'Rejecting…' : 'Confirm rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
