import { useState } from 'react';
import { useNavigate } from '@/lib/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminAPI } from '@/lib/api';
import { getApiErrorMessage, validateEmail, validateRequired } from '@/lib/apiErrorMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DSA_PARTNER_UI_ENABLED } from '@/config/featureFlags';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { adminLogin } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [error, setError] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'elsewhere') {
      return 'You were logged out because this admin account was signed in elsewhere.';
    }
    if (params.get('error') === 'forbidden') {
      return 'Your session expired or you were signed out. Please sign in again with your admin account.';
    }
    return '';
  });

  const validateForm = () => {
    const next = {};
    const emailError = validateEmail(email);
    const passwordError = validateRequired(password, 'password');
    if (emailError) next.email = emailError;
    if (passwordError) next.password = passwordError;
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      const response = await adminAPI.adminLogin({ email: normalizedEmail, password });
      if (response.status === 1) {
        const adminData = response.data.admin || { role: 'admin' };
        adminLogin(adminData);
        localStorage.setItem('adminData', JSON.stringify(adminData));
        const role = String(adminData.role || adminData.role_code || '').toLowerCase();
        if (
          DSA_PARTNER_UI_ENABLED &&
          (role === 'dsa' || ['sales_manager', 'branch_manager'].includes(role))
        ) {
          navigate('/admin/dsa');
        } else {
          navigate('/admin/dashboard');
        }
      } else {
        setError(response.message || 'Sign in failed. Please check your credentials and try again.');
      }
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Incorrect email or password. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (key) =>
    cn(
      'h-12 rounded-lg border px-4 text-sm font-medium transition-all shadow-none',
      'bg-slate-50/50 focus-visible:bg-white focus-visible:ring-2',
      fieldErrors[key]
        ? 'border-red-300 bg-red-50/50 focus-visible:ring-red-200 focus-visible:border-red-400'
        : 'border-slate-200 focus-visible:border-[#222222] focus-visible:ring-[#222222]/20'
    );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#F7F4EF] via-[#FAF8F3] to-[#FBF6E8] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#FFD56B]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#FFF6D9]/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[440px] z-10">
        <div className="w-full bg-white rounded-lg p-7 sm:p-10 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)] border border-slate-100/90 relative">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#222222] to-[#1A1A1A] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-[#222222]/20">
                ₹
              </div>
              <span className="text-xl font-bold text-[#222222] tracking-tight">
                Lendigo <span className="text-[#222222]">Microcare</span>
              </span>
            </div>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Admin Portal
            </span>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight">Welcome Back</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-normal">
              Login to your admin account to get started.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  if (error) setError('');
                }}
                placeholder="admin@lendigomicrocare.com"
                disabled={loading}
                className={inputClass('email')}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    if (error) setError('');
                  }}
                  placeholder="Enter your password"
                  disabled={loading}
                  className={cn(inputClass('password'), 'pr-12')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-lg bg-[#222222] hover:bg-[#111111] active:scale-[0.99] text-white text-sm font-semibold transition-all shadow-md shadow-[#222222]/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
