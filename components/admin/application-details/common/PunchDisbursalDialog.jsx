import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';

/**
 * Shared Apply Reference dialog (same UX as Disbursal Sheet Update).
 * Mounted once on application detail so Overview / header / Disbursement tab can open it.
 */
export default function PunchDisbursalDialog() {
  const {
    loanApp,
    punchForm,
    setPunchForm,
    showDisburseConfirm,
    setShowDisburseConfirm,
    executePunchDisbursal,
    updating,
  } = useApplicationContext();

  const loanLabel =
    loanApp?.loan_account_number || loanApp?.lead_id || loanApp?.customer_code || 'this loan';
  const refReady = String(punchForm?.bankReferenceNo || '').trim().length >= 5;

  return (
    <Dialog open={showDisburseConfirm} onOpenChange={setShowDisburseConfirm}>
      <DialogContent className="sm:max-w-md rounded-lg border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900">Apply Reference</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Enter the bank reference for {loanLabel}. Disbursement date defaults to today.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Bank reference / UTR</label>
            <Input
              value={punchForm?.bankReferenceNo || ''}
              onChange={(e) =>
                setPunchForm((p) => ({ ...p, bankReferenceNo: e.target.value }))
              }
              className="h-10"
              placeholder="UTR / bank ref"
              disabled={updating}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Disbursal date</label>
            <Input
              type="date"
              value={punchForm?.disbursalDate || ''}
              onChange={(e) =>
                setPunchForm((p) => ({ ...p, disbursalDate: e.target.value }))
              }
              className="h-10"
              disabled={updating}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Remark</label>
            <Textarea
              value={punchForm?.remark || ''}
              onChange={(e) => setPunchForm((p) => ({ ...p, remark: e.target.value }))}
              rows={3}
              disabled={updating}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => setShowDisburseConfirm(false)}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={executePunchDisbursal}
            disabled={updating || !refReady}
          >
            {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Apply Reference
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
