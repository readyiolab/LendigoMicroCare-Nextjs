import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authAPI } from '@/lib/api';
import { Phone, ShieldCheck, RefreshCw, CheckCircle2, X, ArrowRight } from 'lucide-react';

export default function MobileVerificationDialog({ isOpen, onClose, initialMobile, onSuccess }) {
  const [step, setStep] = useState('entering_number'); // 'entering_number' or 'entering_otp'
  const [mobile, setMobile] = useState(initialMobile || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (initialMobile) {
        setMobile(initialMobile);
      }
      setStep('entering_number');
      setError('');
      setSuccess('');
      setOtp('');
    }
  }, [isOpen]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authAPI.sendMobileOTP({ mobile });
      if (response.status === 1) {
        setStep('entering_otp');
        setCountdown(120); // 2 minutes as per requirement
        setSuccess('OTP sent successfully');
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authAPI.verifyMobileOTP({ otp });
      if (response.status === 1) {
        setSuccess('Mobile number verified successfully!');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        }
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className={`p-6 text-white relative transition-colors duration-500 rounded-t-2xl ${step === 'entering_otp' ? 'bg-white' : 'bg-white'}`}>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="absolute right-4 top-4 text-white/50 hover:text-white hover:bg-white/10"
            >
                <X className="w-4 h-4" />
            </Button>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-3">
                  <Phone className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold">
                {step === 'entering_number' ? 'Verify Mobile' : 'Enter OTP'}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-center text-xs mt-1 px-4">
                {step === 'entering_number' 
                  ? 'Confirm your mobile number for account security.' 
                  : `Verification code sent to ${mobile}`}
              </DialogDescription>
            </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {error && (
            <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-800 py-2">
              <AlertDescription className="text-[10px] font-bold">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <p className="text-[10px] font-bold">{success}</p>
            </div>
          )}

          {step === 'entering_number' ? (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">+91</span>
                  <Input
                    type="text"
                    placeholder="9876543210"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    className="h-12 pl-12 text-lg font-bold border-zinc-100 bg-zinc-50 focus:bg-white transition-all rounded-lg"
                    autoFocus
                  />
                </div>
              </div>

              <Button 
                  type="submit" 
                  className="w-full h-11 bg-white hover:bg-slate-100 text-white rounded-lg font-bold text-sm gap-2"
                  disabled={loading || mobile.length !== 10}
              >
                {loading ? <Spinner className="w-4 h-4" /> : (
                  <>Send OTP <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center block">
                  Verification Code
                </label>
                <Input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="h-12 text-center text-2xl font-bold tracking-[0.5em] border-zinc-100 bg-zinc-50 focus:bg-white transition-all rounded-lg"
                  autoFocus
                />
              </div>

              <Button 
                  type="submit" 
                  className="w-full h-11 bg-white hover:bg-slate-100 text-white rounded-lg font-bold text-sm shadow-lg shadow-zinc-100"
                  disabled={loading || otp.length !== 6}
              >
                {loading ? <Spinner className="w-4 h-4" /> : 'Verify & Continue'}
              </Button>

              <div className="text-center">
                {countdown > 0 ? (
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5 font-medium">
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
                        Resend code in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                    </p>
                ) : (
                    <button 
                        type="button"
                        onClick={handleSendOTP}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-bold underline underline-offset-4 decoration-emerald-200"
                    >
                        Didn't receive code? Send again
                    </button>
                )}
              </div>
              
              <button 
                type="button"
                onClick={() => setStep('entering_number')}
                className="w-full text-xs text-gray-400 hover:text-gray-600 font-medium"
              >
                Change mobile number
              </button>
            </form>
          )}
        </div>

        <div className="bg-zinc-50 p-4 border-t border-zinc-100">
            <div className="flex items-center justify-center gap-2 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Secured by Lendigo Security</span>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
