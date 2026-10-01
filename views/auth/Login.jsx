import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from '@/lib/router';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Checkbox } from '@/components/ui/checkbox';
import { getApiErrorMessage } from '@/lib/apiErrorMessage';
import { cn } from '@/lib/utils';
import {
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

function StatusBanner({ type, message }) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs font-medium',
        isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      )}
      <p className="leading-snug">{message}</p>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const verifyingRef = useRef(false);
  const sendingRef = useRef(false);

  const [step, setStep] = useState('input');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStatus, setOtpStatus] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [timer, setTimer] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(120);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'elsewhere') {
      setError('You were logged out because this account was signed in on another device or browser.');
    }
  }, []);

  useEffect(() => {
    if (otpStatus === 'error' && otp.length > 0) setOtpStatus('idle');
  }, [otp, otpStatus]);

  useEffect(() => {
    if (timer <= 0) return undefined;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const parseRateLimitMessage = (err, fallback) =>
    getApiErrorMessage(err, fallback);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError('Please agree to the Terms and Conditions');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address');
      return;
    }
    if (sendingRef.current || loading) return;
    sendingRef.current = true;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await authAPI.login({ email: cleanEmail });
      if (response.status === 1) {
        const expires = Number(response.data?.expiresIn) || 120;
        setOtpExpiresIn(expires);
        setMessage(
          response.message || 'OTP sent. Check Inbox, Spam and Promotions — email can take 1–5 minutes.'
        );
        setStep('otp');
        setOtp('');
        setOtpStatus('idle');
        // Allow resend a bit before OTP expires (min 45s cooldown)
        setTimer(Math.min(60, Math.max(45, Math.floor(expires / 2))));
      }
    } catch (err) {
      setError(parseRateLimitMessage(err, 'Failed to send OTP'));
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  const handleVerifyOTP = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (loading || verifyingRef.current || otp.length !== 6) return;

      verifyingRef.current = true;
      setLoading(true);
      setError('');
      setOtpStatus('idle');

      try {
        const payload = { email: email.trim().toLowerCase(), otp };
        const response = await authAPI.verifyLogin(payload);

        if (response.status === 1) {
          setOtpStatus('success');
          const user = response.data?.user || response.data;
          if (user?.id) login(user);
          navigate('/dashboard', { replace: true });
          return;
        }
        setOtpStatus('error');
        setError(response.message || 'Verification failed. Please try again.');
      } catch (err) {
        setOtpStatus('error');
        const msg =
          err.message === 'Invalid or expired OTP'
            ? 'Incorrect or expired OTP. Please check and try again.'
            : parseRateLimitMessage(err, 'Invalid OTP');
        setError(msg);
      } finally {
        setLoading(false);
        verifyingRef.current = false;
      }
    },
    [email, otp, loading, login, navigate]
  );

  const handleResendOTP = async () => {
    if (timer > 0 || loading || sendingRef.current) return;
    sendingRef.current = true;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const payload = { email: email.trim().toLowerCase(), otpType: 'login' };
      const response = await authAPI.resendOTP(payload);
      if (response.status === 1) {
        const expires = Number(response.data?.expiresIn) || otpExpiresIn || 120;
        setOtpExpiresIn(expires);
        setMessage(
          'OTP resent. Check Spam/Promotions. Use the latest code when it arrives.'
        );
        setOtp('');
        setOtpStatus('idle');
        setTimer(Math.min(60, Math.max(45, Math.floor(expires / 2))));
      }
    } catch (err) {
      setError(parseRateLimitMessage(err, 'Failed to resend OTP'));
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  const contactLabel = email.trim();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#F7F4EF] via-[#FAF8F3] to-[#FBF6E8] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#FFD56B]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#FFF6D9]/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl flex items-center justify-between gap-8 z-10">
        {/* Left Hero Graphic Section */}
        <div className="hidden lg:flex flex-col items-center justify-center lg:w-1/2 p-8 relative">
          <div className="relative w-full max-w-md flex flex-col items-center justify-center min-h-[460px]">
            {/* Background Glow */}
            <div className="absolute w-72 h-72 bg-[#FFD56B]/15 rounded-full blur-3xl pointer-events-none -top-10 left-10" />
            <div className="absolute w-72 h-72 bg-[#FFD56B]/10 rounded-full blur-3xl pointer-events-none -bottom-10 right-10" />

            <div className="relative z-10 flex items-center justify-center">
              <img
                src="/images/customer_login_hero.png"
                alt="Lendigo Microcare Financial Services"
                width={460}
                height={460}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="w-full max-w-[460px] h-auto object-contain drop-shadow-2xl"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Card Section */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-[440px] bg-white rounded-lg p-7 sm:p-10 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)] border border-slate-100/90 relative">
            {/* Brand Logo */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#222222] to-[#1A1A1A] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-[#222222]/20">
                  ₹
                </div>
                <span className="text-xl font-bold text-[#222222] tracking-tight">
                  Lendigo <span className="text-[#222222]">Microcare</span>
                </span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight">Welcome Back</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-normal">
                Login to your account to get started.
              </p>
            </div>

            <StatusBanner type="error" message={error} />
            <StatusBanner type="success" message={message} />

            {step === 'input' ? (
              <form onSubmit={handleSendOTP} className="mt-4 space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="h-12 pl-10 rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#222222] text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    OTP will be delivered to your Email Address
                  </p>
                </div>

                {/* Checkbox Consent */}
                <div className="flex items-start gap-2.5 pt-1">
                  <Checkbox
                    id="terms"
                    checked={agreed}
                    onCheckedChange={setAgreed}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-[#222222] data-[state=checked]:border-[#222222]"
                  />
                  <label htmlFor="terms" className="text-[11px] leading-relaxed text-slate-500">
                    By continuing, I agree to Lendigo Microcare{' '}
                    <Link to="/privacy-policy" className="font-semibold text-slate-800 underline hover:text-[#222222]">
                      Privacy Policy
                    </Link>
                    ,{' '}
                    <Link to="/terms-and-conditions" className="font-semibold text-slate-800 underline hover:text-[#222222]">
                      Terms & Conditions
                    </Link>{' '}
                    and{' '}
                    <Link to="/loan-agreement" className="font-semibold text-slate-800 underline hover:text-[#222222]">
                      Declaration & Undertaking Policy
                    </Link>{' '}
                    and receive communication via SMS, E-Mail and WhatsApp.
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="h-12 w-full rounded-lg bg-[#222222] hover:bg-[#111111] active:scale-[0.99] text-white text-sm font-semibold transition-all shadow-md shadow-[#222222]/20 flex items-center justify-center gap-2"
                  disabled={loading || !email.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP…
                    </>
                  ) : (
                    <>
                      Get Otp
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              /* OTP Verification Step */
              <div className="mt-4 space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setStep('input');
                    setOtp('');
                    setOtpStatus('idle');
                    setError('');
                    setMessage('');
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change email
                </button>

                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">Enter verification code</h2>
                  <p className="text-xs text-slate-500">
                    6-digit OTP sent to{' '}
                    <span className="font-semibold text-slate-800">{contactLabel}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 pt-1">
                    Email can take 1–2 minutes — please check Inbox, Spam and Promotions folders.
                  </p>
                </div>

                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div className="flex justify-center my-2">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                      onComplete={handleVerifyOTP}
                      disabled={loading || otpStatus === 'success'}
                    >
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <InputOTPSlot
                            key={index}
                            index={index}
                            className={cn(
                              'h-12 w-11 rounded-lg border text-base font-bold transition-colors',
                              otpStatus === 'success' &&
                                'border-emerald-500 bg-emerald-50 text-emerald-700',
                              otpStatus === 'error' &&
                                'border-red-400 bg-red-50 text-red-700'
                            )}
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {otpStatus === 'success' && (
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Verified — redirecting…
                    </div>
                  )}

                  {loading && otpStatus !== 'success' && (
                    <p className="text-center text-xs text-slate-500">Verifying OTP…</p>
                  )}

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-lg bg-[#222222] hover:bg-[#111111] text-white text-sm font-semibold transition-all shadow-md shadow-[#222222]/20 flex items-center justify-center gap-2"
                    disabled={loading || otp.length !== 6 || otpStatus === 'success'}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      <>
                        Verify & Sign In
                        <ArrowRight className="w-4 h-4 ml-0.5" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                  {timer > 0 ? (
                    <span className="text-slate-400">Resend in {formatTime(timer)}</span>
                  ) : (
                    <button
                      type="button"
                      className="font-semibold text-[#222222] hover:underline disabled:opacity-50"
                      onClick={handleResendOTP}
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  )}
                  <span className="text-slate-400">
                    Valid for {Math.max(1, Math.ceil(otpExpiresIn / 60))} min
                  </span>
                </div>
              </div>
            )}

            <p className="mt-8 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              New customer?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-semibold text-[#222222] hover:underline"
              >
                Create account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
