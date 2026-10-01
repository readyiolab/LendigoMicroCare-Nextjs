import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from '@/lib/router';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthLayout from '@/components/layouts/AuthLayout';
import { cn } from '@/lib/utils';
import { ChevronRight, Mail, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

const AUTH_SMS_OTP_ENABLED = process.env.NEXT_PUBLIC_AUTH_SMS_OTP_ENABLED !== 'false';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [step, setStep] = useState('input');
  const [regMethod, setRegMethod] = useState('mobile');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [otpStatus, setOtpStatus] = useState('idle'); // 'idle', 'success', 'error'
  const [timer, setTimer] = useState(0);

  // Availability Check State
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [isAvailable, setIsAvailable] = useState(null); // null, true, false

  const debouncedMobile = useDebounce(mobile, 500);
  const debouncedEmail = useDebounce(email, 500);

  // Prefill from login redirect (for unregistered users)
  useEffect(() => {
    const prefillData = location.state || JSON.parse(sessionStorage.getItem('registerPrefill') || 'null');
    
    if (prefillData) {
      if (prefillData.mobile && AUTH_SMS_OTP_ENABLED) {
        setMobile(prefillData.mobile);
        setRegMethod('mobile');
      }
      if (prefillData.email) {
        setEmail(prefillData.email);
        if (!prefillData.mobile || !AUTH_SMS_OTP_ENABLED) setRegMethod('email');
      }
      if (prefillData.mobile && !AUTH_SMS_OTP_ENABLED) {
        setMobile(prefillData.mobile);
        setRegMethod('email');
      }
      // Clear sessionStorage after reading
      sessionStorage.removeItem('registerPrefill');
    }

    // Capture referral code from URL query params
    const queryParams = new URLSearchParams(location.search);
    const ref = queryParams.get('ref');
    if (ref) {
      setReferralCode(ref);
    }
  }, [location.state, location.search]);

  // Check Availability Effect - Mobile
  useEffect(() => {
    if (debouncedMobile.length === 10 && regMethod === 'mobile') {
        checkUserAvailability(debouncedMobile);
    } else {
        setIsAvailable(null);
        setAvailabilityError('');
    }
  }, [debouncedMobile, regMethod]);

  // Check Availability Effect - Email
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(debouncedEmail) && regMethod === 'email') {
        checkUserAvailability(debouncedEmail);
    } else {
        setIsAvailable(null);
        setAvailabilityError('');
    }
  }, [debouncedEmail, regMethod]);

  const checkUserAvailability = async (identifier) => {
    setCheckingAvailability(true);
    setAvailabilityError('');
    setIsAvailable(null);
    try {
        const response = await authAPI.checkAvailability(identifier);
        if (response.status === 1) {
            if (response.data.exists) {
                setIsAvailable(false);
                setAvailabilityError(`${regMethod === 'mobile' ? 'Mobile number' : 'Email'} already registered.`);
            } else {
                setIsAvailable(true);
            }
        }
    } catch (err) {
        console.error("Availability check failed:", err);
    } finally {
        setCheckingAvailability(false);
    }
  };

  // Reset OTP status when user types
  useEffect(() => {
    if (otpStatus !== 'idle') setOtpStatus('idle');
  }, [otp]);
  
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-dismiss message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!agreed) {
        setError("Please agree to the Terms and Conditions");
        return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const data = {};
      if (regMethod === 'mobile') {
          data.mobile = mobile;
          if (email) data.email = email; // Optional email
      } else {
          data.email = email;
          if (mobile) data.mobile = mobile; // Optional mobile
      }
      
      if (referralCode) {
          data.referralCode = referralCode;
      }

      const response = await authAPI.register(data);
      if (response.status === 1) {
        setMessage(response.message || 'OTP sent successfully');
        setStep('otp');
        setTimer(120); // 2 minutes timer
      }
    } catch (err) {
      let errorMessage = err.message || 'Failed to send OTP';
      if (err.retryAfter) {
          const seconds = parseInt(err.retryAfter.replace('s', ''));
          const minutes = Math.ceil(seconds / 60);
          errorMessage = `Too many requests. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
      } else if (errorMessage.toLowerCase().includes('too many requests')) {
          errorMessage = "Too many attempts. Please wait a moment and try again.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Send both if present, backend picks identifier
      const response = await authAPI.verifyRegister({ mobile, email, otp });
      if (response.status === 1) {
        setOtpStatus('success');
        const user = response.data.user || response.data;
        
        // Brief delay to show transition
        setTimeout(() => {
          login(user);
          navigate('/dashboard');
        }, 1200);
      }
    } catch (err) {
      setOtpStatus('error');
      let errorMessage = err.message === 'Invalid or expired OTP' 
        ? 'Incorrect OTP or it has expired.' 
        : (err.message || 'Invalid OTP');
        
      if (err.retryAfter) {
          const seconds = parseInt(err.retryAfter.replace('s', ''));
          const minutes = Math.ceil(seconds / 60);
          errorMessage = `Too many attempts. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
      } else if (errorMessage.toLowerCase().includes('too many requests')) {
          errorMessage = "Too many attempts. Please wait a moment and try again.";
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;
    
    setLoading(true);
    setError('');
    try {
      const payload = regMethod === 'mobile' 
        ? { mobile, otpType: 'register' } 
        : { email, otpType: 'register' };

      const response = await authAPI.resendOTP(payload);
      if (response.status === 1) {
        setMessage('OTP resent successfully');
        setTimer(120); // Reset timer
      }
    } catch (err) {
      let errorMessage = err.message || 'Failed to resend OTP';
      if (err.retryAfter) {
          const seconds = parseInt(err.retryAfter.replace('s', ''));
          const minutes = Math.ceil(seconds / 60);
          errorMessage = `Too many requests. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
      } else if (errorMessage.toLowerCase().includes('too many requests')) {
          errorMessage = "Too many attempts. Please wait a moment and try again.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Apply Now" subtitle="Create your account to get started">
        <div className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 rounded-lg animate-in fade-in zoom-in-95 duration-300">
                <AlertDescription className="font-semibold text-sm text-center">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 rounded-lg animate-in fade-in zoom-in-95 duration-300">
                <AlertDescription className="font-semibold text-sm text-center">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {step === 'input' ? (
              <div className="space-y-5">
                <Tabs defaultValue="mobile" value={regMethod} onValueChange={setRegMethod} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 bg-zinc-100/50 p-1 rounded-lg">
                    <TabsTrigger value="mobile" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                        <Smartphone className="w-4 h-4 text-emerald-600" /> Mobile
                    </TabsTrigger>
                    <TabsTrigger value="email" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                        <Mail className="w-4 h-4 text-zinc-600" /> Email
                    </TabsTrigger>
                  </TabsList>
                
                  <form onSubmit={handleSendOTP} className="space-y-5">
                    <TabsContent value="mobile" className="space-y-4 mt-0">
                        <div className="space-y-2">
                          <label htmlFor="mobile" className="block text-sm font-semibold tracking-wide text-zinc-700">
                            Enter Mobile Number <span className="text-red-500">*</span>
                          </label>
                          <Input
                            id="mobile"
                            type="tel"
                            placeholder="Enter 10-digit number"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                            required
                            maxLength={10}
                            className="h-14 rounded-lg text-lg bg-zinc-50 border-zinc-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-zinc-950 transition-all shadow-sm"
                          />
                          {checkingAvailability && mobile.length === 10 && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium animate-pulse mt-1">
                              <Spinner className="size-3" /> Checking availability...
                            </div>
                          )}
                          {isAvailable === true && mobile.length === 10 && !checkingAvailability && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600 font-bold mt-1">
                              <CheckCircle className="size-3" /> Mobile number available
                            </div>
                          )}
                          {isAvailable === false && mobile.length === 10 && !checkingAvailability && (
                            <div className="flex items-center gap-1 text-xs text-red-600 font-bold mt-1">
                              <XCircle className="size-3" /> {availabilityError}
                            </div>
                          )}
                          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            OTP will be delivered to your WhatsApp
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="email-opt" className="block text-sm font-semibold tracking-wide text-zinc-700">
                            Email Address (Optional)
                          </label>
                          <Input
                            id="email-opt"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-14 rounded-lg text-lg bg-zinc-50 border-zinc-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-zinc-950 transition-all shadow-sm"
                          />
                        </div>
                    </TabsContent>

                    <TabsContent value="email" className="space-y-4 mt-0">
                         <div className="space-y-2">
                          <label htmlFor="email" className="block text-sm font-semibold tracking-wide text-zinc-700">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-14 rounded-lg text-lg bg-zinc-50 border-zinc-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-zinc-950 transition-all shadow-sm"
                          />
                          {checkingAvailability && email && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium animate-pulse mt-1">
                              <Spinner className="size-3" /> Checking availability...
                            </div>
                          )}
                          {isAvailable === true && email && !checkingAvailability && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600 font-bold mt-1">
                              <CheckCircle className="size-3" /> Email available
                            </div>
                          )}
                          {isAvailable === false && email && !checkingAvailability && (
                            <div className="flex items-center gap-1 text-xs text-red-600 font-bold mt-1">
                              <XCircle className="size-3" /> {availabilityError}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="mobile-opt" className="block text-sm font-semibold tracking-wide text-zinc-700">
                            Mobile Number (Optional)
                          </label>
                          <Input
                            id="mobile-opt"
                            type="tel"
                            placeholder="Enter 10-digit number"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                            maxLength={10}
                            className="h-14 rounded-lg text-lg bg-zinc-50 border-zinc-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-zinc-950 transition-all shadow-sm"
                          />
                        </div>
                    </TabsContent>

                    <div className="flex items-start gap-3">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={setAgreed} className="mt-1 data-[state=checked]:bg-white border-zinc-300" />
                        <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed font-medium">
                            By continuing, I agree to the <a href="#" className="text-zinc-950 font-bold hover:underline">Terms and Conditions</a> and <a href="#" className="text-zinc-950 font-bold hover:underline">Privacy Policy</a>.
                        </label>
                    </div>

                    <Button 
                        type="submit" 
                        className="w-full h-14 rounded-lg text-base font-bold bg-white hover:bg-slate-50 text-white flex items-center justify-center gap-2 uppercase tracking-wide shadow-lg shadow-zinc-950/20 transition-all" 
                        disabled={loading || checkingAvailability || isAvailable === false || (regMethod === 'mobile' ? mobile.length !== 10 : !email)}
                    >
                      {loading ? <Spinner className="size-5 text-white" /> : (
                          <>
                            GET OTP <ChevronRight className="w-5 h-5" />
                          </>
                      )}
                    </Button>
                  </form>
                </Tabs>
              </div>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6 text-center">
                <div className="space-y-4">
                  <label htmlFor="otp" className="block text-sm font-semibold tracking-wide text-zinc-700">
                    Enter OTP
                  </label>
                  <p className="text-sm text-slate-500 font-medium">
                      We sent a code to <span className="font-bold text-zinc-950">{regMethod === 'mobile' ? `+91 ${mobile}` : email}</span>
                  </p>
                  {regMethod === 'mobile' && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Delivered via WhatsApp
                    </div>
                  )}
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    onComplete={() => handleVerifyOTP()}
                    disabled={loading || otpStatus === 'success'}
                  >
                    <InputOTPGroup className="w-full justify-center gap-2">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                          <InputOTPSlot 
                            key={index} 
                            index={index} 
                            className={cn(
                              "h-14 w-12 border-zinc-200 bg-zinc-50 rounded-lg focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950 transition-all duration-300 text-lg font-bold",
                              otpStatus === 'success' && "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
                              otpStatus === 'error' && "border-red-500 bg-red-50 text-red-700 shadow-[0_0_15px_rgba(239,68,68,0.2)] shadow-sm"
                            )}
                          />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button 
                    type="submit" 
                    className="w-full h-14 rounded-lg text-base font-bold bg-white hover:bg-slate-50 text-white uppercase tracking-wide shadow-lg shadow-zinc-950/20 transition-all" 
                    disabled={loading || otp.length !== 6}
                >
                  {loading ? <Spinner className="size-5 text-white" /> : 'VERIFY & REGISTER'}
                </Button>

                <div className="flex items-center justify-between text-sm px-1 font-semibold">
                    {/* Resend Logic Change: Plain text countdown vs Button when expired */}
                    {timer > 0 ? (
                        <span className="text-slate-500">
                            Resend in {formatTime(timer)}
                        </span>
                    ) : (
                        <button
                            type="button"
                            className="text-slate-500 hover:text-zinc-950 transition-colors"
                            onClick={handleResendOTP}
                            disabled={loading}
                        >
                            Resend OTP
                        </button>
                    )}
                    <button
                        type="button"
                        className="text-zinc-950 hover:underline hover:text-blue-600 transition-colors"
                        onClick={() => {
                            setStep('input');
                            setOtp('');
                        }}
                    >
                        Change {regMethod === 'mobile' ? 'Number' : 'Email'}
                    </button>
                </div>
              </form>
            )}

            <div className="text-center text-sm text-slate-500 pt-6 border-t border-zinc-100 font-medium">
              Already have an account?{' '}
              <Button variant="link" onClick={() => navigate('/login')} className="text-zinc-950 p-0 font-bold hover:text-blue-600 hover:underline transition-colors h-auto">
                Sign in
              </Button>
            </div>
        </div>
    </AuthLayout>
  );
}