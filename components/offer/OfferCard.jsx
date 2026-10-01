import React, { useState } from 'react';
import { offerAPI } from '@/lib/api/offer';
import { uploadToCloudinary, UPLOAD_FOLDERS } from '@/lib/services/cloudinaryUpload';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Video,
  AlertCircle,
  Loader2,
  FileText,
  ChevronDown,
  Info,
  Clock,
  PencilLine,
} from 'lucide-react';
import VideoDeclaration from './VideoDeclaration';
import SanctionLetter from '@/components/loans/SanctionLetter';
import { StatusBadge } from '@/utils/statusUtils';
import { customerUi } from '@/config/customerUiTokens';
import { cn } from '@/lib/utils';
import { buildSanctionFeeBreakdown } from '@/lib/utils/feeBreakdown';

const DAY_MS = 24 * 60 * 60 * 1000;

const istTodayISO = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);

const addDaysISO = (iso, days) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const daysFromToday = (iso) =>
  Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${istTodayISO()}T00:00:00Z`)) / DAY_MS);

const formatDateLabel = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';

const OfferCard = ({ offer, applicationMeta, onAccepted, onRejected, onRevisionRequested }) => {
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revAmount, setRevAmount] = useState('');
  const [revTenureMode, setRevTenureMode] = useState('days');
  const [revTenureDays, setRevTenureDays] = useState('');
  const [revDate, setRevDate] = useState('');
  const [revNote, setRevNote] = useState('');
  const [revError, setRevError] = useState('');
  const [revLoading, setRevLoading] = useState(false);
  const [revSuccess, setRevSuccess] = useState('');

  const openRevisionDialog = () => {
    const currentAmount = Number(offer?.approvedAmount || offer?.approved_amount || 0);
    const currentTenure = Number(offer?.tenureDays || offer?.tenure_days || 0);
    setRevAmount(currentAmount > 0 ? String(Math.round(currentAmount)) : '');
    setRevTenureMode('days');
    setRevTenureDays(currentTenure > 0 ? String(currentTenure) : '');
    setRevDate(currentTenure > 0 ? addDaysISO(istTodayISO(), currentTenure) : '');
    setRevNote('');
    setRevError('');
    setShowRevisionDialog(true);
  };

  const handleRequestRevision = async () => {
    const limits = offer?.productLimits || null;
    const currentAmount = Math.round(Number(offer?.approvedAmount || offer?.approved_amount || 0));
    const currentTenure = Number(offer?.tenureDays || offer?.tenure_days || 0);
    const amount = revAmount === '' ? null : Math.round(Number(revAmount));
    const tenure =
      revTenureMode === 'date'
        ? revDate
          ? daysFromToday(revDate)
          : null
        : revTenureDays === ''
          ? null
          : Math.round(Number(revTenureDays));
    const note = revNote.trim();

    if (amount != null && (!Number.isFinite(amount) || amount <= 0)) {
      setRevError('Enter a valid loan amount.');
      return;
    }
    if (tenure != null && (!Number.isFinite(tenure) || tenure <= 0)) {
      setRevError('Tenure must be at least 1 day.');
      return;
    }
    if (limits) {
      if (amount != null && (amount < limits.minAmount || amount > limits.maxAmount)) {
        setRevError(
          `Amount must be between ₹${limits.minAmount.toLocaleString('en-IN')} and ₹${limits.maxAmount.toLocaleString('en-IN')}.`
        );
        return;
      }
      if (tenure != null && (tenure < limits.minTenureDays || tenure > limits.maxTenureDays)) {
        setRevError(`Tenure must be between ${limits.minTenureDays} and ${limits.maxTenureDays} days.`);
        return;
      }
    }
    const amountChanged = amount != null && amount !== currentAmount;
    const tenureChanged = tenure != null && tenure !== currentTenure;
    if (!amountChanged && !tenureChanged && !note) {
      setRevError('Change the amount or tenure, or add a note for our team.');
      return;
    }

    setRevLoading(true);
    setRevError('');
    try {
      const payload = {
        requested_amount: amountChanged ? amount : null,
        customer_note: note || null,
      };
      if (tenureChanged) {
        if (revTenureMode === 'date') payload.requested_repayment_date = revDate;
        else payload.requested_tenure_days = tenure;
      }
      const result = await offerAPI.requestRevision(offer.applicationId, payload);
      if (result.status === 1) {
        setShowRevisionDialog(false);
        setRevSuccess(result.message || 'Your change request has been sent.');
        if (onRevisionRequested) await onRevisionRequested(result.data);
      } else {
        setRevError(result.message || 'Could not send your request');
      }
    } catch (err) {
      setRevError(err.response?.data?.message || err.message || 'Could not send your request');
    } finally {
      setRevLoading(false);
    }
  };

  const handleVideoReady = (file) => {
    setVideoFile(file);
    setError('');
  };

  const handleAcceptOffer = async () => {
    if (!videoFile) {
      setError('Please complete the video steps and tap "Use this video" first.');
      return;
    }

    setLoading(true);
    setError('');
    setUploadProgress('Uploading your video…');

    try {
      const uploadResult = await uploadToCloudinary(videoFile, {
        folder: UPLOAD_FOLDERS.videoDeclaration,
        resourceType: 'video',
        compress: false,
      });

      setUploadProgress('Saving your acceptance…');
      const result = await offerAPI.acceptOfferWithUrl(offer.applicationId, uploadResult.url);
      if (result.status === 1) {
        setShowVideoDialog(false);
        setVideoFile(null);
        setUploadProgress('');
        if (onAccepted) {
          onAccepted({
            ...result.data,
            application_status: result.data?.application_status || 'video_declaration_submitted',
            video_declaration_url: result.data?.video_declaration_url || uploadResult.url,
          });
        }
      } else {
        setError(result.message || 'Could not accept offer');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to accept offer');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const handleRejectOffer = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await offerAPI.rejectOffer(offer.applicationId, rejectionReason);
      if (result.status === 1) {
        setShowRejectDialog(false);
        if (onRejected) onRejected(result.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reject offer');
    } finally {
      setLoading(false);
    }
  };

  if (!offer) return null;

  const sanctionFees = buildSanctionFeeBreakdown(offer);

  const appData = {
    ...offer,
    id: offer.applicationId || offer.id,
    application_number:
      offer.applicationNumber ||
      offer.application_number ||
      applicationMeta?.applicationNumber,
    loan_account_number:
      offer.loanAccountNumber ||
      offer.loan_account_number ||
      applicationMeta?.loanAccountNumber,
    lead_id: offer.leadId || offer.lead_id || applicationMeta?.leadId || null,
    approved_amount: offer.approvedAmount || offer.approved_amount || offer.principal_amount || offer.principalAmount,
    fee_breakdown: sanctionFees,
    approved_at: offer.offerSentAt || offer.offer_sent_at || offer.approved_at || offer.approvedAt || new Date().toISOString(),
    tenure_days: offer.tenureDays || offer.tenure_days,
    applied_interest_rate_daily: offer.interestRateDaily || offer.applied_interest_rate_daily,
    total_deductions: offer.totalDeductions || offer.total_deductions,
    disbursement_amount: offer.disbursementAmount || offer.disbursement_amount,
    total_repayment_amount: offer.totalRepayment || offer.total_repayment_amount,
    due_date: offer.repaymentDate || offer.due_date,
  };

  const userProfileData = {
    fullName: offer.fullName || (offer.first_name ? `${offer.first_name} ${offer.last_name || ''}`.trim() : 'AS PER PAN'),
    address: offer.currentAddress || offer.current_address,
  };

  const amount = Number(appData.approved_amount || 0);
  const tenure = appData.tenure_days || offer.tenureDays;
  const purpose = applicationMeta?.purpose
    ? String(applicationMeta.purpose).replace(/_/g, ' ')
    : null;
  const offerStatus =
    offer.status ||
    offer.customer_status ||
    offer.application_status ||
    appData.status ||
    'offer_sent';
  const leadId = applicationMeta?.leadId || appData.lead_id;
  const loanAccountNumber = applicationMeta?.loanAccountNumber || appData.loan_account_number;
  const revision = offer.revision || null;
  const pendingRevision = revision?.pending || null;
  const limits = offer.productLimits || null;
  const istToday = istTodayISO();
  const revPreviewTenure =
    revTenureMode === 'date' ? (revDate ? daysFromToday(revDate) : null) : revTenureDays === '' ? null : Number(revTenureDays);
  const revPreviewDate =
    revTenureMode === 'date'
      ? revDate
      : Number.isFinite(revPreviewTenure) && revPreviewTenure > 0
        ? addDaysISO(istToday, Math.round(revPreviewTenure))
        : '';

  return (
    <>
      <div className="max-w-4xl mx-auto my-6 print:m-0 print:max-w-none">
        <div className={cn(customerUi.card, 'overflow-hidden print:hidden')}>
          {/* Header */}
          <div className={cn(customerUi.cardHeader, 'flex items-center justify-between gap-4')}>
            <h2 className="text-lg font-semibold text-slate-900">Loan offer</h2>
            <StatusBadge status={offerStatus} />
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Hero metrics */}
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className={customerUi.heroAmount}>₹{amount.toLocaleString('en-IN')}</p>
              {tenure && (
                <p className="text-sm font-medium text-slate-500">
                  {tenure}-day tenure
                </p>
              )}
            </div>

            {/* Application meta grid */}
            {(loanAccountNumber || leadId || purpose || applicationMeta?.appliedAt) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                {loanAccountNumber && (
                  <div>
                    <p className={customerUi.label}>Loan account</p>
                    <p className={cn(customerUi.value, 'text-sm font-mono font-semibold')}>
                      {loanAccountNumber}
                    </p>
                  </div>
                )}
                {leadId && (
                  <div>
                    <p className={customerUi.label}>Lead ID</p>
                    <p className={cn(customerUi.value, 'text-sm font-mono')}>
                      {leadId}
                    </p>
                  </div>
                )}
                {purpose && (
                  <div>
                    <p className={customerUi.label}>Purpose</p>
                    <p className={cn(customerUi.value, 'text-sm capitalize')}>{purpose}</p>
                  </div>
                )}
                {applicationMeta?.appliedAt && (
                  <div>
                    <p className={customerUi.label}>Applied on</p>
                    <p className={cn(customerUi.value, 'text-sm')}>{applicationMeta.appliedAt}</p>
                  </div>
                )}
              </div>
            )}

            {revSuccess && !pendingRevision && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <AlertDescription className="text-emerald-800">{revSuccess}</AlertDescription>
              </Alert>
            )}

            {pendingRevision && (
              <>
                <div className="flex gap-3 items-start rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium">Your change request is with our team</p>
                    <p>
                      {[
                        pendingRevision.requestedAmount != null &&
                          `Amount ₹${Number(pendingRevision.requestedAmount).toLocaleString('en-IN')}`,
                        pendingRevision.requestedTenureDays != null &&
                          (pendingRevision.requestedRepaymentDate
                            ? `Repay by ${formatDateLabel(pendingRevision.requestedRepaymentDate)} (${pendingRevision.requestedTenureDays} days)`
                            : `Tenure ${pendingRevision.requestedTenureDays} days`),
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Note only'}
                    </p>
                    {pendingRevision.customerNote && (
                      <p className="text-amber-800">“{pendingRevision.customerNote}”</p>
                    )}
                    <p className="text-amber-800">
                      We&apos;ll send you an updated offer. You can accept once it arrives, or decline now.
                    </p>
                  </div>
                </div>
                <div className="flex pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    className={cn(customerUi.outlineBtn, 'sm:w-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700')}
                  >
                    Decline offer
                  </Button>
                </div>
              </>
            )}

            {offer.canAccept && (
              <>
                {/* Next step callout */}
                <div className={cn(customerUi.callout, 'flex gap-3 items-start')}>
                  <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  <p>
                    Record a short video declaration to accept this offer. Review the sanction letter below before proceeding.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    className={cn(customerUi.outlineBtn, 'sm:w-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700')}
                  >
                    Decline offer
                  </Button>
                  {offer.canRequestRevision && (
                    <Button
                      variant="outline"
                      onClick={openRevisionDialog}
                      className={cn(customerUi.outlineBtn, 'sm:w-auto')}
                    >
                      <PencilLine className="h-4 w-4 mr-2" />
                      Request changes
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setVideoFile(null);
                      setError('');
                      setShowVideoDialog(true);
                    }}
                    className={cn(customerUi.primaryBtn, 'flex-1')}
                  >
                    Accept offer
                  </Button>
                </div>
                {revision && (
                  <p className="text-xs text-slate-500">
                    {revision.remaining > 0
                      ? `Want a different amount or tenure? ${revision.remaining} of ${revision.maxRequests} change requests left.`
                      : `You've used all ${revision.maxRequests} change requests. Please accept or decline this offer.`}
                  </p>
                )}
              </>
            )}
          </div>

          {/* KFS accordion */}
          <details className="group border-t border-slate-100">
            <summary className="cursor-pointer list-none flex items-center justify-between px-6 py-4 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Sanction letter &amp; key facts (KFS)
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-slate-100">
              <SanctionLetter application={appData} userProfile={userProfileData} />
            </div>
          </details>
        </div>
      </div>

      <Dialog open={showVideoDialog} onOpenChange={(open) => !loading && setShowVideoDialog(open)}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-5 pb-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Video className="w-5 h-5 text-slate-700" />
              Accept your loan offer
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Allow camera access, read the declaration aloud while recording (up to ~90 sec), then confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {uploadProgress && (
              <Alert className="mb-4 border-slate-200 bg-slate-50">
                <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                <AlertDescription className="text-slate-800">{uploadProgress}</AlertDescription>
              </Alert>
            )}
            <VideoDeclaration
              onVideoReady={handleVideoReady}
              onRetry={() => {
                setVideoFile(null);
                setError('');
              }}
              customerName={
                offer.fullName ||
                (offer.first_name
                  ? `${offer.first_name} ${offer.last_name || ''}`.trim()
                  : null)
              }
              sanctionDate={appData.approved_at}
              loanAmount={appData.approved_amount}
              repayAmount={appData.total_repayment_amount}
              repayDate={appData.due_date}
            />
          </div>

          <DialogFooter className="p-5 pt-2 border-t border-slate-100 bg-slate-50 flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto rounded-lg"
              onClick={() => setShowVideoDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAcceptOffer}
              disabled={!videoFile || loading}
              className={cn(customerUi.primaryBtn, 'w-full sm:flex-1')}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Please wait…' : 'Submit & accept offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRevisionDialog} onOpenChange={(open) => !revLoading && setShowRevisionDialog(open)}>
        <DialogContent className="rounded-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Request changes to this offer</DialogTitle>
            <DialogDescription className="text-slate-600">
              Tell us the amount and tenure you need. Our team will review it and send you an updated offer.
              {revision && ` ${revision.remaining} of ${revision.maxRequests} requests left.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {revError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{revError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-800" htmlFor="rev-amount">
                Loan amount (₹)
              </label>
              <Input
                id="rev-amount"
                type="number"
                inputMode="numeric"
                min={limits?.minAmount}
                max={limits?.maxAmount}
                value={revAmount}
                onChange={(e) => setRevAmount(e.target.value)}
              />
              {limits && (
                <p className="text-xs text-slate-500">
                  Between ₹{limits.minAmount.toLocaleString('en-IN')} and ₹{limits.maxAmount.toLocaleString('en-IN')}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">Tenure</span>
                <div className="inline-flex rounded-md border border-slate-200 p-0.5 text-xs">
                  {[
                    { id: 'days', label: 'Days' },
                    { id: 'date', label: 'Repayment date' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (opt.id === revTenureMode) return;
                        if (opt.id === 'date' && Number(revTenureDays) > 0) {
                          setRevDate(addDaysISO(istToday, Math.round(Number(revTenureDays))));
                        }
                        if (opt.id === 'days' && revDate) {
                          const d = daysFromToday(revDate);
                          if (d > 0) setRevTenureDays(String(d));
                        }
                        setRevTenureMode(opt.id);
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded',
                        revTenureMode === opt.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {revTenureMode === 'days' ? (
                <Input
                  type="number"
                  inputMode="numeric"
                  min={limits?.minTenureDays}
                  max={limits?.maxTenureDays}
                  value={revTenureDays}
                  onChange={(e) => setRevTenureDays(e.target.value)}
                />
              ) : (
                <Input
                  type="date"
                  min={limits ? addDaysISO(istToday, limits.minTenureDays) : addDaysISO(istToday, 1)}
                  max={limits ? addDaysISO(istToday, limits.maxTenureDays) : undefined}
                  value={revDate}
                  onChange={(e) => setRevDate(e.target.value)}
                />
              )}
              <p className="text-xs text-slate-500">
                {Number.isFinite(revPreviewTenure) && revPreviewTenure > 0
                  ? `${Math.round(revPreviewTenure)} days · repay by ${formatDateLabel(revPreviewDate)}`
                  : 'Choose days or a repayment date'}
                {limits && ` · allowed ${limits.minTenureDays}–${limits.maxTenureDays} days`}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-800" htmlFor="rev-note">
                Note for our team (optional)
              </label>
              <Textarea
                id="rev-note"
                placeholder="e.g. I need ₹5,000 more for a medical expense"
                value={revNote}
                maxLength={500}
                onChange={(e) => setRevNote(e.target.value)}
                rows={3}
                className="rounded-lg border-slate-200"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevisionDialog(false)}
              disabled={revLoading}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button onClick={handleRequestRevision} disabled={revLoading} className={cn(customerUi.primaryBtn, 'rounded-lg')}>
              {revLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Decline this offer?</DialogTitle>
            <DialogDescription className="text-slate-600">
              You can apply again later if you change your mind.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optional: reason for declining…"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            className="rounded-lg border-slate-200"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="rounded-lg">
              Go back
            </Button>
            <Button onClick={handleRejectOffer} disabled={loading} variant="destructive" className="rounded-lg">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OfferCard;
