import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Upload,
  CheckCircle2,
  Copy,
  AlertCircle,
  X,
  Loader2,
  Shield,
  CreditCard,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Customer payment modal:
 * - UPI QR + UTR screenshot (manual)
 * - Easebuzz full payment
 * - Easebuzz part payment (custom amount ≤ outstanding)
 */
export default function PaymentModal({
  isOpen,
  onClose,
  emi,
  companyInfo,
  onSubmit,
  loading,
  applicationId,
  outstandingAmount,
  onEasebuzzPay,
  easebuzzLoading,
}) {
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [partAmount, setPartAmount] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [showManualUpi, setShowManualUpi] = useState(false);

  const upiId = companyInfo?.upiId || '';
  const amount = parseFloat(emi?.amount || 0);
  const maxOutstanding = Number.isFinite(Number(outstandingAmount))
    ? Number(outstandingAmount)
    : amount;
  const canEasebuzz = false; // Online PG checkout removed — EMI via Digitap eNACH auto-debit + ops punches

  const upiString =
    emi?.upiString ||
    (upiId
      ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(companyInfo?.accountName || 'Aarsh Fincon Limited')}&am=${amount.toFixed(2)}&cu=INR${emi?.upiReference ? `&tr=${emi.upiReference}` : ''}`
      : '');

  useEffect(() => {
    if (!isOpen) {
      setUtr('');
      setScreenshot(null);
      setError('');
      setCopied(false);
      setPartAmount('');
      setCheckoutUrl('');
      setShowManualUpi(false);
    }
  }, [isOpen]);

  const handleCopyRef = () => {
    if (!emi?.upiReference) return;
    navigator.clipboard.writeText(emi.upiReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = () => {
    const utrClean = utr.replace(/\s/g, '');
    if (utrClean.length < 12) {
      setError('Enter the 12-digit UTR from your UPI app.');
      return;
    }
    if (!screenshot) {
      setError('Upload a screenshot of your successful payment.');
      return;
    }
    setError('');
    onSubmit({ emiId: emi.id, utr: utrClean, screenshot });
  };

  const openCheckout = (url) => {
    if (!url) return;
    setCheckoutUrl(url);
    window.location.href = url;
  };

  const handleFullEasebuzz = async () => {
    setError('');
    try {
      const result = await onEasebuzzPay({ mode: 'full', repaymentId: emi.id });
      if (result?.paymentUrl) openCheckout(result.paymentUrl);
      else setError(result?.message || 'Could not start Easebuzz payment.');
    } catch (e) {
      setError(e.message || 'Could not start Easebuzz payment.');
    }
  };

  const handlePartEasebuzz = async () => {
    setError('');
    const n = parseFloat(partAmount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a valid part payment amount.');
      return;
    }
    if (n > maxOutstanding + 0.01) {
      setError(`Amount cannot exceed outstanding ₹${maxOutstanding.toLocaleString('en-IN')}.`);
      return;
    }
    try {
      const result = await onEasebuzzPay({ mode: 'part', amount: n });
      if (result?.paymentUrl) openCheckout(result.paymentUrl);
      else setError(result?.message || 'Could not start Easebuzz payment.');
    } catch (e) {
      setError(e.message || 'Could not start Easebuzz payment.');
    }
  };

  const paymentLabel =
    emi?.emiNumber === 'PREPAY'
      ? 'Early closure'
      : emi?.emiNumber === 'SETTLEMENT'
        ? 'Settlement payment'
        : emi?.title || 'Loan payment';

  const busy = loading || easebuzzLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden rounded-lg border-0 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="bg-[#1D2B44] px-5 py-4 text-white shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">{paymentLabel}</p>
              <p className="text-3xl font-semibold tracking-tight mt-0.5">
                ₹{amount.toLocaleString('en-IN')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/80">
          {/* UPI QR */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm p-4 flex flex-col items-center">
            <p className="text-xs font-medium text-slate-500 mb-3">Scan with any UPI app</p>
            <div className="p-2 bg-white rounded-lg border border-slate-100">
              {upiString ? (
                <QRCodeSVG value={upiString} size={160} level="H" includeMargin />
              ) : (
                <div className="w-[160px] h-[160px] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              )}
            </div>
            {upiId && (
              <p className="text-[11px] text-slate-400 mt-2 font-mono">{upiId}</p>
            )}
            {(companyInfo?.accountName ||
              companyInfo?.bankName ||
              companyInfo?.accountNumber ||
              companyInfo?.ifscCode) && (
              <div className="w-full mt-3 pt-3 border-t border-slate-100 text-left space-y-1">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                  Bank transfer (NEFT / IMPS)
                </p>
                {companyInfo?.accountName && (
                  <p className="text-xs text-slate-700">
                    <span className="text-slate-500">Account name: </span>
                    {companyInfo.accountName}
                  </p>
                )}
                {companyInfo?.bankName && (
                  <p className="text-xs text-slate-700">
                    <span className="text-slate-500">Bank: </span>
                    {companyInfo.bankName}
                    {companyInfo?.branchName ? ` · ${companyInfo.branchName}` : ''}
                  </p>
                )}
                {companyInfo?.accountNumber && (
                  <p className="text-xs text-slate-700 font-mono">
                    <span className="text-slate-500 font-sans">A/c no: </span>
                    {companyInfo.accountNumber}
                  </p>
                )}
                {companyInfo?.ifscCode && (
                  <p className="text-xs text-slate-700 font-mono">
                    <span className="text-slate-500 font-sans">IFSC: </span>
                    {companyInfo.ifscCode}
                  </p>
                )}
              </div>
            )}
          </div>

          {emi?.upiReference && (
            <div className="bg-amber-50 rounded-lg border border-amber-100 px-4 py-3">
              <p className="text-[11px] font-medium text-amber-900/80 mb-1.5">
                Add this reference in the payment note
              </p>
              <button
                type="button"
                onClick={handleCopyRef}
                className="w-full flex items-center justify-between gap-2 bg-white rounded-lg border border-amber-200/60 px-3 py-2"
              >
                <span className="font-mono text-sm font-semibold text-slate-900">{emi.upiReference}</span>
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>
            </div>
          )}

          {/* Online PG removed — Digitap eNACH auto-debit + ops punches */}
          <div className="bg-slate-50 rounded-lg border border-slate-200/80 shadow-sm p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CreditCard className="w-4 h-4 text-slate-600" />
              EMI collection
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Online card/UPI checkout is no longer available. EMIs are collected via Digitap eNACH
              auto-debit. For a manual payment, use UPI below or contact operations.
            </p>
          </div>

          {false && canEasebuzz && (
            <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Pay with Easebuzz
              </div>
              <Button
                type="button"
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                onClick={handleFullEasebuzz}
                disabled={busy}
              >
                {easebuzzLoading ? <Spinner className="w-4 h-4 mr-2 border-white" /> : null}
                Pay full with Easebuzz · ₹{amount.toLocaleString('en-IN')}
              </Button>

              <div className="pt-1 border-t border-slate-100 space-y-2">
                <Label className="text-xs font-medium text-slate-600">Part payment amount</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  max={maxOutstanding}
                  placeholder={`Up to ₹${maxOutstanding.toLocaleString('en-IN')}`}
                  value={partAmount}
                  onChange={(e) => setPartAmount(e.target.value)}
                  className="h-10 text-sm border-slate-200"
                  inputMode="decimal"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={handlePartEasebuzz}
                  disabled={busy}
                >
                  Part payment with Easebuzz
                </Button>
              </div>

              {checkoutUrl && (
                <div className="pt-2 flex flex-col items-center gap-2 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500">Or scan to open checkout on another phone</p>
                  <QRCodeSVG value={checkoutUrl} size={120} level="M" includeMargin />
                </div>
              )}
            </div>
          )}

          {/* Manual UPI proof (collapsible) */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm overflow-hidden">
            <button
              type="button"
              className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-between"
              onClick={() => setShowManualUpi((v) => !v)}
            >
              Already paid via UPI? Submit UTR
              <span className="text-slate-400">{showManualUpi ? '−' : '+'}</span>
            </button>
            {showManualUpi && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                <div>
                  <Label className="text-xs font-medium text-slate-600">UTR / transaction ID</Label>
                  <Input
                    placeholder="12-digit UTR number"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 22))}
                    className="mt-1.5 h-10 font-mono text-sm border-slate-200"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600">Payment receipt</Label>
                  <input
                    type="file"
                    id="payment-screenshot"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setScreenshot(e.target.files[0]);
                    }}
                  />
                  {!screenshot ? (
                    <button
                      type="button"
                      onClick={() => document.getElementById('payment-screenshot')?.click()}
                      className="mt-1.5 w-full border border-dashed border-slate-200 rounded-lg py-3 flex items-center justify-center gap-2 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                      Upload screenshot
                    </button>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-3 border border-slate-200 rounded-lg p-2 bg-slate-50">
                      {screenshot.type.startsWith('image/') && (
                        <img
                          src={URL.createObjectURL(screenshot)}
                          alt="Receipt"
                          className="w-11 h-11 rounded-md object-cover border border-slate-200"
                        />
                      )}
                      <span className="text-xs text-slate-700 flex-1 truncate">{screenshot.name}</span>
                      <button type="button" onClick={() => setScreenshot(null)} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full h-11 bg-[#1D2B44] hover:bg-[#152238] text-white font-semibold rounded-lg"
                  onClick={handleSubmit}
                  disabled={busy}
                >
                  {loading ? <Spinner className="w-4 h-4 mr-2 border-white" /> : null}
                  Confirm payment
                </Button>
                <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  Verified within 15–30 minutes
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1.5 px-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
