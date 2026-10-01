import { useState, useEffect, useCallback } from 'react';
import { Lock, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { breAPI } from '@/lib/api';
import {
  getBrePolicyVaultToken,
  setBrePolicyVaultToken,
  clearBrePolicyVaultToken,
  getCachedVaultRequired,
  setCachedVaultRequired,
} from '@/lib/services/brePolicyVault';

export default function BrePolicyVaultGate({ children, title = 'Protected area' }) {
  const existingToken = getBrePolicyVaultToken();
  const cachedRequired = getCachedVaultRequired();

  const [checking, setChecking] = useState(
    () => !existingToken && cachedRequired === null
  );
  const [required, setRequired] = useState(
    () => cachedRequired === true || Boolean(existingToken)
  );
  const [unlocked, setUnlocked] = useState(
    () => cachedRequired === false || Boolean(existingToken)
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const applyStatus = useCallback((data) => {
    if (data?.required === false) {
      setCachedVaultRequired(false);
      clearBrePolicyVaultToken();
      setRequired(false);
      setUnlocked(true);
      return;
    }
    setCachedVaultRequired(true);
    setRequired(true);
    const hasToken = Boolean(getBrePolicyVaultToken());
    if (data?.unlocked && hasToken) {
      setUnlocked(true);
    } else if (!hasToken) {
      clearBrePolicyVaultToken();
      setUnlocked(false);
    }
  }, []);

  const checkStatus = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    setError('');
    try {
      const res = await breAPI.getVaultStatus();
      const data = res?.data || res;
      applyStatus(data);
    } catch (err) {
      if (!getBrePolicyVaultToken()) {
        setError(err.message || 'Could not verify vault status');
        setUnlocked(false);
      }
    } finally {
      if (!silent) setChecking(false);
    }
  }, [applyStatus]);

  useEffect(() => {
    const token = getBrePolicyVaultToken();
    if (token) {
      setUnlocked(true);
      setRequired(true);
      setChecking(false);
      checkStatus(true);
      return;
    }

    if (cachedRequired === false) {
      setChecking(false);
      return;
    }

    if (cachedRequired === true) {
      setChecking(false);
      setUnlocked(false);
      checkStatus(true);
      return;
    }

    checkStatus(false);
  }, [cachedRequired, checkStatus]);

  useEffect(() => {
    const onLocked = () => {
      clearBrePolicyVaultToken();
      setUnlocked(false);
      setRequired(true);
    };
    window.addEventListener('bre-vault-locked', onLocked);
    return () => window.removeEventListener('bre-vault-locked', onLocked);
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Enter the vault password');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await breAPI.unlockVault(password);
      const data = res?.data || res;
      if (res?.status === 1 || data?.unlocked) {
        if (data?.vault_token) setBrePolicyVaultToken(data.vault_token);
        setCachedVaultRequired(true);
        setUnlocked(true);
        setPassword('');
      } else {
        setError(res?.message || 'Unlock failed');
      }
    } catch (err) {
      setError(err.message || 'Incorrect password');
      clearBrePolicyVaultToken();
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!required || unlocked) {
    return children;
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-4">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            BRE rules and credit policy are vendor-protected. Enter the vault password to view or edit.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Vault password"
              className="pl-10 pr-10"
              autoComplete="off"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verifying…
              </>
            ) : (
              'Unlock'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
