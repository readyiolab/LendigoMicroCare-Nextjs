import { Button } from '@/components/ui/button';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { adminAPI } from '@/lib/api';

export default function DigiLockerPanel({
  isAdminMode,
  applicationId,
  digilockerVerified,
  digilockerFailed,
  digilockerInProgress,
  digioLoading,
  setDigioLoading,
  setError,
  setSuccess,
  handleCustomerStartEkyc,
  onAlreadyVerified,
  alerts = null,
}) {
  return (
    <>
      <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg flex gap-3 items-center">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-zinc-100 shrink-0">
          <ShieldCheck className="w-4.5 h-4.5 text-zinc-900" />
        </div>
        <div>
          <p className="text-xs font-black text-zinc-900 uppercase tracking-wide leading-none">Secure Verification</p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
            {isAdminMode
              ? 'Enter Aadhaar and PAN numbers, then upload clear photos of Aadhaar (front & back) and PAN card. Documents are reviewed for RBI/KYC compliance — upload does not mean instant approval.'
              : digilockerVerified
                ? 'DigiLocker is verified. Upload clear photos of Aadhaar (front & back) and PAN so we can store them with your application.'
                : digilockerFailed
                  ? 'Please enter your Aadhaar number and upload your required documents below to proceed.'
                  : 'Complete Aadhaar + PAN consent via DigiLocker for instant eKYC. If DigiLocker fails, you can upload documents instead.'}
          </p>
        </div>
      </div>

      {alerts}

      {!isAdminMode && digilockerVerified && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-900">DigiLocker eKYC verified</p>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              Upload Aadhaar front, Aadhaar back, and PAN card below to finish this step.
            </p>
          </div>
        </div>
      )}

      {!isAdminMode && digilockerFailed && (
        <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wide text-amber-900">DigiLocker unsuccessful</p>
          <p className="text-[10px] text-amber-800 font-medium leading-tight">
            Verification did not complete on DigiLocker. Upload the required documents below to continue, or retry DigiLocker.
          </p>
          <button
            type="button"
            className="text-[10px] font-bold text-amber-900 underline underline-offset-2 hover:text-zinc-900"
            disabled={digioLoading}
            onClick={handleCustomerStartEkyc}
          >
            {digioLoading ? 'Starting DigiLocker…' : 'Retry DigiLocker'}
          </button>
        </div>
      )}

      {!isAdminMode && !digilockerVerified && !digilockerFailed && (
        <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wide text-zinc-900">DigiLocker eKYC</p>
          <p className="text-[10px] text-slate-500 font-medium leading-tight">
            {digilockerInProgress
              ? 'A DigiLocker session is in progress. Continue to finish Aadhaar and PAN consent.'
              : 'Start DigiLocker to verify Aadhaar and provide PAN consent. You will return to your dashboard when done.'}
          </p>
        </div>
      )}

      {isAdminMode && applicationId && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-indigo-900">Digitap KYC</p>
            <p className="text-[10px] text-indigo-700 mt-0.5">Start online Aadhaar verification for this fill. Documents below remain optional backup.</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 text-[11px] bg-indigo-700 hover:bg-indigo-800 text-white"
            disabled={digioLoading}
            onClick={async () => {
              setDigioLoading(true);
              setError('');
              setSuccess('');
              try {
                const response = await adminAPI.initiateDigioKYC(applicationId);
                if (response.status === 1) {
                  setSuccess(response.message || 'Digitap KYC started. Complete the customer ID check.');
                  if (response.data?.alreadyVerified && response.data?.ekycStepCompleted) {
                    onAlreadyVerified?.();
                  }
                } else {
                  setError(response.message || 'Failed to start Digitap KYC');
                }
              } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to start Digitap KYC');
              } finally {
                setDigioLoading(false);
              }
            }}
          >
            {digioLoading ? 'Starting…' : 'Start Digitap KYC'}
          </Button>
        </div>
      )}
    </>
  );
}
