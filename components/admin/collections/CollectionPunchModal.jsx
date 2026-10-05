import { useEffect, useMemo, useState } from 'react';
import { collectionAPI } from '@/lib/api/collection';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, X } from 'lucide-react';
import { uploadToS3, UPLOAD_CATEGORIES } from '@/lib/services/cloudinaryUpload';
import { formatInr } from '@/components/admin/collections/shared/collectionUi';

const PAYMENT_MODES = [
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'NEFT', label: 'NEFT' },
  { value: 'CASH', label: 'Cash' },
  { value: 'OTHER', label: 'Other' },
];

const COLLECTION_TYPE_LABELS = {
  full_payment: 'Full payment',
  part_payment: 'Part payment',
  prepayment: 'Prepayment / Close account',
  settlement: 'Settlement',
};

function defaultAmountForType(type, prefill) {
  if (!prefill) return '';
  if (type === 'settlement' && prefill.approvedSettlement) {
    return String(prefill.approvedSettlement.proposedAmount);
  }
  if (type === 'prepayment') {
    return String(prefill.amountPayableAsOfToday ?? prefill.totalOutstanding ?? '');
  }
  if (type === 'full_payment') {
    return String(prefill.currentEmiDue ?? prefill.totalOutstanding ?? '');
  }
  return '';
}

export default function CollectionPunchModal({ open, onOpenChange, loanApplicationId, onSubmitted }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [prefill, setPrefill] = useState(null);
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [collectedAmount, setCollectedAmount] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [collectionType, setCollectionType] = useState('full_payment');
  const [remarks, setRemarks] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofPreview, setProofPreview] = useState('');

  const resetForm = () => {
    setReferenceNo('');
    setPaymentMode('UPI');
    setCollectedAmount('');
    setCollectionDate('');
    setCollectionType('full_payment');
    setRemarks('');
    setProofUrl('');
    setProofPreview('');
    setError('');
  };

  useEffect(() => {
    if (!open || !loanApplicationId) return;
    let cancelled = false;
    resetForm();
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await collectionAPI.getCollectionPunchPrefill(loanApplicationId);
        if (!cancelled && res.status === 1) {
          const data = res.data;
          setPrefill(data);
          setCollectionDate(data.collectionDate || '');
          const initialType = data.allowedCollectionTypes?.includes('full_payment')
            ? 'full_payment'
            : data.allowedCollectionTypes?.[0] || 'part_payment';
          setCollectionType(initialType);
          setCollectedAmount(defaultAmountForType(initialType, data));
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loanApplicationId]);

  const typeOptions = useMemo(() => {
    const allowed = prefill?.allowedCollectionTypes || ['full_payment', 'part_payment', 'prepayment', 'settlement'];
    return allowed.map((value) => ({
      value,
      label: COLLECTION_TYPE_LABELS[value] || value,
    }));
  }, [prefill]);

  const handleTypeChange = (type) => {
    setCollectionType(type);
    setCollectedAmount(defaultAmountForType(type, prefill));
  };

  const handleProofSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const localPreview = URL.createObjectURL(file);
      setProofPreview(localPreview);
      const result = await uploadToS3(file, { category: UPLOAD_CATEGORIES.repayment });
      const url = result?.url || result?.secure_url || result?.publicUrl || '';
      if (!url) throw new Error('Upload failed — no URL returned');
      setProofUrl(url);
    } catch (err) {
      setProofPreview('');
      setProofUrl('');
      setError(err.message || 'Screenshot upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!prefill) return;
    if (!referenceNo.trim()) {
      setError('Reference number is required');
      return;
    }
    if (!collectedAmount || Number(collectedAmount) <= 0) {
      setError('Collected amount is required');
      return;
    }
    if (!collectionDate) {
      setError('Collected date is required');
      return;
    }
    if (!proofUrl) {
      setError('Payment screenshot is required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await collectionAPI.submitCollectionPunch({
        loanApplicationId: prefill.loanApplicationId,
        repaymentId: prefill.repaymentId,
        referenceNo: referenceNo.trim(),
        paymentMode,
        collectedAmount: Number(collectedAmount),
        collectionDate,
        collectionType,
        proofUrl,
        settlementRequestId: prefill.approvedSettlement?.id,
        remarks: remarks.trim() || undefined,
      });
      if (res.status === 1) {
        onSubmitted?.(res.data);
        onOpenChange(false);
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] w-[calc(100%-1.5rem)] rounded-lg border-slate-200 p-5 gap-4 sm:max-w-[480px]">
        <DialogHeader className="gap-1 pr-6">
          <DialogTitle className="text-base font-semibold">Record collection</DialogTitle>
          <DialogDescription className="text-xs leading-snug">
            {prefill ? (
              <>
                <span className="font-medium text-slate-700">{prefill.borrowerName || '—'}</span>
                {' · '}
                {prefill.applicationNumber}
                {' · '}
                Due {formatInr(prefill.currentEmiDue)}
                {' · '}
                OS {formatInr(prefill.totalOutstanding)}
                {' · '}
                Part paid {formatInr(prefill.partPaymentBalance?.partPaid ?? prefill.prepaidTotal ?? 0)}
                {' · '}
                Payable today {formatInr(prefill.amountPayableAsOfToday ?? 0)}
                {Number(prefill.partPaymentBalance?.lateCharge) > 0 && (
                  <>
                    {' · '}
                    Late charge {formatInr(prefill.partPaymentBalance.lateCharge)} (2% per day on the unpaid balance)
                  </>
                )}
              </>
            ) : (
              'Submit payment for checker approval.'
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : prefill ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {prefill.customerProof && (
              <div className="col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900">
                <p className="font-semibold">Customer already uploaded payment proof</p>
                <p className="mt-0.5">
                  UTR {prefill.customerProof.utr || '—'}
                  {' · '}
                  {formatInr(prefill.customerProof.amount ?? 0)}
                  {prefill.customerProof.submittedAt && (
                    <>
                      {' · '}
                      {new Date(prefill.customerProof.submittedAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </>
                  )}
                  {/^https?:\/\//i.test(prefill.customerProof.screenshotUrl || '') && (
                    <>
                      {' · '}
                      <a
                        href={prefill.customerProof.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline"
                      >
                        View screenshot
                      </a>
                    </>
                  )}
                </p>
                <p className="mt-0.5">
                  Record here only if this is a different payment. Otherwise verify the customer&apos;s proof so it isn&apos;t counted twice.
                </p>
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-slate-500">Type</Label>
              <Select value={collectionType} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-8 w-full min-w-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="max-w-[220px]">
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {collectionType === 'prepayment' && (
                <p className="text-[10px] text-slate-500 leading-snug">
                  Amount is Payable today (foreclosure). On approval the loan account will be closed.
                </p>
              )}
              {collectionType === 'settlement' && (
                <p className="text-[10px] text-slate-500 leading-snug">
                  On approval the loan is closed as a settlement and a settlement letter is emailed to the customer.
                </p>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-slate-500">Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="h-8 w-full min-w-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="max-w-[220px]">
                  {PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value} className="text-xs">
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-slate-500">Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={collectedAmount}
                onChange={(e) => setCollectedAmount(e.target.value)}
                className="h-8 text-xs tabular-nums"
              />
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-slate-500">Date</Label>
              <Input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-slate-500">Reference / UTR</Label>
              <Input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="UTR no."
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-slate-500">Remarks</Label>
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-slate-500">Screenshot</Label>
              <label className="flex h-8 items-center gap-1.5 px-2 rounded-md border border-slate-200 bg-white text-[11px] font-medium cursor-pointer hover:bg-slate-50 min-w-0">
                <Upload className="w-3 h-3 shrink-0" />
                <span className="truncate">{uploading ? '…' : proofUrl ? 'Done' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading || submitting}
                  onChange={handleProofSelect}
                />
              </label>
            </div>

            <div className="flex items-end gap-1 min-w-0 pb-0.5">
              {proofPreview && (
                <img src={proofPreview} alt="" className="h-8 w-8 rounded border object-cover shrink-0" />
              )}
              {proofUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5 text-[10px] text-red-600"
                  onClick={() => {
                    setProofUrl('');
                    setProofPreview('');
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {error && (
          <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5">{error}</p>
        )}

        <DialogFooter className="gap-2 sm:gap-2 pt-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || loading || uploading || !prefill}>
            {submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
