import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authAPI } from '@/lib/api';
import { ShieldCheck, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isStrictEmail } from '@/lib/apiErrorMessage';

const isAlreadyVerifiedResponse = (response) => {
  const message = String(response?.message || '').toLowerCase();
  return Boolean(
    response?.data?.alreadyVerified ||
    response?.data?.autoVerified ||
    response?.alreadyVerified ||
    response?.autoVerified ||
    message.includes('already verified') ||
    message.includes('verified automatically')
  );
};

export default function PersonalEmailVerificationDialog({
  isOpen,
  onClose,
  email,
  onSuccess,
  targetUserId = null,
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const sendLockRef = useRef(false);
  const successTimerRef = useRef(null);
  const openedAtRef = useRef(0);

  const completeVerified = (message) => {
    setSuccess(message || 'Email verified successfully!');
    setSending(false);
    setOtpSent(false);
    if (!onSuccess) return;
    successTimerRef.current = setTimeout(() => {
      onSuccess();
      onClose();
    }, 1200);
  };

  const handleSendOTP = async ({ silent = false } = {}) => {
    if (sendLockRef.current) return;
    const trimmed = String(email || '').trim();
    if (!isStrictEmail(trimmed)) {
      setError('Please enter a valid email address.');
      setSending(false);
      return;
    }

    sendLockRef.current = true;
    setSending(true);
    if (!silent) {
      setError('');
      setSuccess('');
    }
    try {
      const response = await authAPI.sendPersonalEmailOTP(trimmed, targetUserId);

      if (response.status === 1 && isAlreadyVerifiedResponse(response)) {
        completeVerified(response.message || 'Email verified successfully!');
        return;
      }

      if (response.status !== 1) {
        setError(response.message || 'Failed to send verification code');
        setOtpSent(false);
        return;
      }

      setOtpSent(true);
      setSuccess('Verification code sent to your email');
      setCountdown(60);
    } catch (err) {
      setOtpSent(false);
      setError(err.message || 'Failed to send verification code');
    } finally {
      setSending(false);
      sendLockRef.current = false;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      sendLockRef.current = false;
      setOtp(['', '', '', '', '', '']);
      setLoading(false);
      setSending(false);
      setOtpSent(false);
      setError('');
      setSuccess('');
      setCountdown(0);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
      return undefined;
    }

    setOtp(['', '', '', '', '', '']);
    setLoading(false);
    setOtpSent(false);
    setError('');
    setSuccess('');
    setCountdown(0);
    setSending(true);
    openedAtRef.current = Date.now();
    handleSendOTP({ silent: true });

    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
    // Send once per open/email; handlers read latest email/targetUserId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, email, targetUserId]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index, value) => {
    if (value.length > 1) {
        const pastedContent = value.slice(0, 6).split('');
        const newOtp = [...otp];
        pastedContent.forEach((char, i) => {
            if (i < 6) newOtp[i] = char;
        });
        setOtp(newOtp);
        const nextIndex = Math.min(pastedContent.length, 5);
        const nextInput = document.getElementById(`otp-${nextIndex}`);
        if (nextInput) nextInput.focus();
        return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authAPI.verifyPersonalEmailOTP({ otp: otpString }, targetUserId);
      if (response.status === 1) {
        completeVerified(response.message || 'Email verified successfully!');
      } else {
        setError(response.message || 'Verification failed. Please check the code.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const showSendingOverlay = sending && !otpSent && !success;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl"
        onPointerDownOutside={(event) => {
          if (Date.now() - openedAtRef.current < 500) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (Date.now() - openedAtRef.current < 500 || sending) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="p-8 pb-4 text-center">
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">Verify Email</DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-2 max-w-[280px] mx-auto leading-relaxed">
                {showSendingOverlay
                  ? 'Sending a 6-digit code to'
                  : "We've sent a 6-digit code to"}
                <br/>
                <span className="font-bold text-gray-900 italic underline decoration-blue-200 decoration-2 underline-offset-4">{email}</span>
            </DialogDescription>
        </DialogHeader>

        <div className="p-8 pt-4 space-y-6 relative min-h-[220px]">
          {showSendingOverlay && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 rounded-xl">
              <Spinner className="w-8 h-8 text-blue-600" />
              <p className="text-sm font-bold text-gray-800">Sending verification code…</p>
              <p className="text-xs text-gray-500">Please wait. This can take a few seconds.</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-800 py-3 rounded-lg">
              <AlertDescription className="text-xs font-bold leading-relaxed">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 p-3.5 rounded-lg border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                <div className="bg-emerald-100 p-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold tracking-tight">{success}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center block">
                Verification Code
              </label>
              <div className="flex justify-between gap-2.5">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    disabled={showSendingOverlay || loading}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={cn(
                        "w-full h-14 text-center text-2xl font-black bg-gray-50 border-2 rounded-lg transition-all outline-none",
                        digit ? "border-blue-600 bg-white ring-4 ring-blue-50" : "border-gray-100 focus:border-blue-200 focus:bg-white"
                    )}
                    autoFocus={index === 0 && otpSent}
                  />
                ))}
              </div>
            </div>

            <Button 
                type="submit" 
                className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-bold text-base shadow-xl shadow-gray-200 transition-all active:scale-[0.98] group"
                disabled={loading || sending || otp.join('').length !== 6}
            >
              {loading ? <Spinner className="w-5 h-5" /> : (
                <span className="flex items-center gap-2">
                    Verify Account
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          <div className="text-center pt-2">
            {countdown > 0 ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-[11px] font-bold text-gray-500">
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                    Resend code in {countdown}s
                </div>
            ) : (
                <button 
                    onClick={() => handleSendOTP()}
                    disabled={sending}
                    className="group relative overflow-hidden text-xs font-bold text-blue-600 hover:text-blue-700 p-1"
                >
                    <span className="relative z-10 flex items-center gap-1.5">
                        <RefreshCw className={cn("w-3 h-3", sending && "animate-spin")} />
                        {sending ? 'Sending code…' : "Didn't receive code? Resend"}
                    </span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-100 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </button>
            )}
          </div>
        </div>

        <div className="bg-gray-50/80 p-6 border-t border-gray-100 flex items-center justify-center gap-3">
            <ShieldCheck className="w-5 h-5 text-gray-400" />
            <div className="text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Secured & Encrypted</p>
                <p className="text-[9px] text-gray-400 font-medium">Authentication powered by Lendigo Security</p>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
