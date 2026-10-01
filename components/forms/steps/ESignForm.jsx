import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PenTool, ExternalLink, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { LOAN_AGREEMENT } from '@/data/legalTexts';
import { handleFormError } from '@/lib/utils/formErrors';
import StepLayout from './StepLayout';
import { buildDigitapEsignStandaloneUrl } from '@/lib/utils/digitapEsignUrl';

const PREPARE_POLL_MS = 3000;
const PREPARE_TIMEOUT_MS = 90000;

export default function ESignForm({ applicationId, application, onSuccess, onClose, isAdminMode = false, targetUserId = null }) {
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [prepareTimedOut, setPrepareTimedOut] = useState(false);
  const prepareStartedAt = useRef(Date.now());
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const requestId = application?.esign_request_id || null;
  const isPreparing = !requestId && !prepareTimedOut;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Reset prepare window when a request id arrives or application changes
  useEffect(() => {
    if (requestId) {
      setPrepareTimedOut(false);
      setError('');
      return;
    }
    prepareStartedAt.current = Date.now();
    setPrepareTimedOut(false);
  }, [applicationId, requestId]);

  // Poll parent refresh until esign_request_id is available (async auto-initiate after video verify)
  useEffect(() => {
    if (requestId || prepareTimedOut) return undefined;

    const tick = () => {
      if (Date.now() - prepareStartedAt.current >= PREPARE_TIMEOUT_MS) {
        setPrepareTimedOut(true);
        setError('E-Sign request not found. Please contact support.');
        return;
      }
      onSuccessRef.current?.();
    };

    tick();
    const interval = setInterval(tick, PREPARE_POLL_MS);
    return () => clearInterval(interval);
  }, [requestId, prepareTimedOut]);

  const handleSign = async () => {
    setFieldErrors({});
    setError('');

    if (!agreed) {
       setFieldErrors({ agreed: 'Please agree to the terms and conditions to proceed.' });
       setError('Please agree to the terms and conditions to proceed.');
       return;
    }

    if (!requestId) {
        setError(
          prepareTimedOut
            ? 'E-Sign request not found. Please contact support.'
            : 'Your agreement is still being prepared. Please wait a moment.'
        );
        return;
    }

    setLoading(true);
    
    try {
      const signingUrl = buildDigitapEsignStandaloneUrl(requestId);
      if (!signingUrl) {
        setError('Unable to open signing page. Please contact support.');
        setLoading(false);
        return;
      }
      window.location.href = signingUrl;
    } catch (err) {
      handleFormError(err, setFieldErrors, setError);
      setLoading(false);
    }
  };

  return (
    <StepLayout
        title="E-Sign Agreement"
        description="Digitally sign your loan agreement via Digitap."
        onClose={onClose}
        icon={PenTool}
        footer={
            <Button 
                onClick={handleSign} 
                disabled={!agreed || loading || isPreparing || !requestId}
                className="w-full h-12 text-sm font-black bg-zinc-950 hover:bg-black text-white shadow-xl shadow-zinc-100 rounded-lg transition-all active:scale-[0.98] uppercase tracking-wide"
            >
                {loading ? <Spinner className="w-5 h-5 text-white mr-2" /> : (
                    <span className="flex items-center gap-2">
                        <PenTool className="w-4 h-4" /> SIGN AGREEMENT
                    </span>
                )}
            </Button>
        }
    >
        <div className="space-y-8">
            {isPreparing && (
                <Alert className="py-3 rounded-lg border-slate-200 bg-slate-50">
                    <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                    <AlertDescription className="text-xs font-bold text-slate-700 ml-2">
                        Preparing your agreement… This usually takes a few seconds.
                    </AlertDescription>
                </Alert>
            )}

            {error && (
                <Alert variant="destructive" className="py-3 rounded-lg border-red-100 bg-red-50/30">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-xs font-bold text-red-800 ml-2">{error}</AlertDescription>
                </Alert>
            )}

            <div className="relative group">
                <div className="absolute -top-3 left-6 px-3 py-1 bg-zinc-950 text-white rounded-full text-[9px] font-black uppercase tracking-widest z-10 shadow-lg border border-white/10">
                    Agreement Preview
                </div>
                <div className="border-2 border-zinc-100 rounded-lg bg-zinc-50/50 p-6 max-h-[360px] overflow-y-auto text-[11px] text-zinc-600 font-medium leading-relaxed shadow-inner custom-scrollbar group-hover:border-zinc-200 transition-colors">
                    <div className="whitespace-pre-wrap font-sans">
                        {LOAN_AGREEMENT}...
                    </div>
                </div>
                <div className="absolute bottom-4 left-6 right-6 flex justify-center">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open('/loan-agreement', '_blank')}
                        className="h-9 px-4 bg-white/95 backdrop-blur-md text-[10px] font-black uppercase tracking-wider rounded-lg shadow-2xl border border-zinc-100 hover:bg-white"
                    >
                        <ExternalLink className="w-3.5 h-3.5 mr-2 text-slate-500" />
                        Full Document
                    </Button>
                </div>
            </div>

            <div className={`p-5 bg-zinc-950 text-white rounded-lg space-y-4 shadow-2xl shadow-zinc-200 relative overflow-hidden group border-2 transition-all ${fieldErrors.agreed ? "border-red-500" : "border-transparent"}`}>
                <div className="relative z-10 flex items-start gap-4">
                    <div className="shrink-0 pt-0.5">
                        <Checkbox 
                            id="agree" 
                            checked={agreed}
                            onCheckedChange={(checked) => {
                                setAgreed(checked);
                                if (fieldErrors.agreed) setFieldErrors(prev => ({ ...prev, agreed: '' }));
                            }}
                            className="w-5 h-5 border-2 border-white/40 bg-transparent data-[state=checked]:bg-white data-[state=checked]:text-zinc-950 data-[state=checked]:border-white rounded-md transition-all"
                        />
                    </div>
                    <label htmlFor="agree" className="text-[12px] font-bold text-white/90 leading-relaxed cursor-pointer select-none">
                        I confirm that I have read the complete{' '}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                window.open('/loan-agreement', '_blank');
                            }}
                            className="text-white underline underline-offset-4 decoration-white/40 hover:decoration-white"
                        >
                            Loan Agreement
                        </button>
                        {' '}and I authorize LendigoMicrocare to initiate the digital signing process.
                    </label>
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-white/10 transition-all" />
            </div>
            {fieldErrors.agreed && <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors.agreed}</p>}

            <div className="flex items-center justify-center gap-3 py-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 border border-zinc-100 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Digitap Secured</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 border border-zinc-100 rounded-full">
                    <PenTool className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Digital Sign</span>
                </div>
            </div>
        </div>
    </StepLayout>
  );
}
