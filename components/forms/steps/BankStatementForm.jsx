import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  Lightbulb,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Landmark,
  ExternalLink,
} from 'lucide-react';
import { documentsAPI, loanAPI } from '@/lib/api';
import { uploadToS3, UPLOAD_CATEGORIES, UPLOAD_MAX_BYTES, UploadAbortedError } from '@/lib/services/cloudinaryUpload';
import { handleFormError } from '@/lib/utils/formErrors';
import StepLayout from './StepLayout';

const EMPTY_UPLOAD = {
  file: null,
  status: 'idle',
  progress: 0,
  error: '',
  result: null,
  isExisting: false,
};

const AA_PENDING = new Set(['pending', 'in_progress', 'AWAITING_AA_CONSENT']);
const AA_HARD_FAIL = new Set(['denied', 'failed', 'timeout', 'expired', 'rejected']);

/** Bank row fully persisted (report saved) — informational only; never gate Continue. */
function isAaBankPersisted(data) {
  if (!data) return false;
  return Boolean(
    data.bankPersisted ||
      data.status === 'aa_received' ||
      (data.bankStatement &&
        (data.bankStatement.status === 'aa_received' ||
          (data.bankStatement.fetch_type === 'aa_fetch' &&
            String(data.bankStatement.analysis_status || '').toLowerCase() === 'completed')))
  );
}

/** Consent accepted / in progress — customer may continue even while report syncs. */
function isAaConsentAccepted(data) {
  if (!data) return false;
  if (isAaBankPersisted(data)) return true;
  const st = String(data.status || '').toLowerCase();
  if (AA_HARD_FAIL.has(st) || st === 'not_initiated') return false;
  if (
    [
      'pending',
      'in_progress',
      'granted',
      'report_ready',
      'aa_syncing',
      'awaiting_aa_consent',
    ].includes(st)
  ) {
    return true;
  }
  if (data.bankStatement?.fetch_type === 'aa_fetch') return true;
  if (data.bankStatement?.status === 'aa_syncing') return true;
  return false;
}

function readAaReturnFlag() {
  try {
    return sessionStorage.getItem('aa_return') === '1';
  } catch {
    return false;
  }
}

function clearAaReturnFlag() {
  try {
    sessionStorage.removeItem('aa_return');
  } catch {
    /* ignore */
  }
}

export default function BankStatementForm({
  onSuccess,
  onClose,
  applicationId,
  reapplicationData,
  isAdminMode = false,
  targetUserId = null,
  applicationData = null,
}) {
  const isReturningUser = reapplicationData?.isReturningUser || false;
  const fromAaReturnInitial = readAaReturnFlag();
  const [bankUpload, setBankUpload] = useState(EMPTY_UPLOAD);
  const [salaryUpload, setSalaryUpload] = useState(EMPTY_UPLOAD);
  const [salarySlips, setSalarySlips] = useState([]);
  const [pdfPassword, setPdfPassword] = useState('');
  const [showPdfFallback, setShowPdfFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aaStarting, setAaStarting] = useState(false);
  const [aaPolling, setAaPolling] = useState(false);
  const [aaHostedUrl, setAaHostedUrl] = useState(null);
  const [aaStatusLabel, setAaStatusLabel] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(
    fromAaReturnInitial ? 'Bank connected. Please upload your salary slip.' : ''
  );
  // Optimistic: AA return → skip Connect bank, show salary slip immediately
  const [aaReceived, setAaReceived] = useState(fromAaReturnInitial);
  // True only when AA bank row is fully persisted (informational; does not block Continue)
  const [aaBankPersisted, setAaBankPersisted] = useState(
    Boolean(
      applicationData?.bankStatement?.status === 'aa_received' ||
        (applicationData?.bankStatement?.fetch_type === 'aa_fetch' &&
          String(applicationData?.bankStatement?.analysis_status || '').toLowerCase() ===
            'completed')
    )
  );
  const abortRefs = useRef({ bank: null, salary: null });
  const genRefs = useRef({ bank: 0, salary: 0 });
  const promiseRefs = useRef({ bank: null, salary: null });
  const stateRefs = useRef({ bank: EMPTY_UPLOAD, salary: EMPTY_UPLOAD });
  const pollRef = useRef(null);
  const salarySectionRef = useRef(null);
  const aaOptimisticRef = useRef(fromAaReturnInitial);
  stateRefs.current.bank = bankUpload;
  stateRefs.current.salary = salaryUpload;

  const stopAaPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setAaPolling(false);
  }, []);

  const refreshAaStatus = useCallback(async () => {
    if (!applicationId) return null;
    try {
      const params = {
        applicationId,
        ...(isAdminMode && targetUserId ? { targetUserId } : {}),
      };
      const res = await documentsAPI.getAaStatus(params);
      const data = res?.data || res;
      if (!data) return null;

      if (data.hostedUrl) setAaHostedUrl(data.hostedUrl);
      setAaStatusLabel(data.status || '');

      const st = String(data.status || '').toLowerCase();
      if (AA_HARD_FAIL.has(st) && !isAaConsentAccepted(data)) {
        aaOptimisticRef.current = false;
        setAaReceived(false);
        setAaBankPersisted(false);
        setShowPdfFallback(true);
        setSuccess('');
        setError('Bank consent was not completed. Connect bank again or upload a PDF statement.');
        clearAaReturnFlag();
        stopAaPoll();
        return data;
      }

      if (isAaBankPersisted(data)) {
        aaOptimisticRef.current = false;
        setAaReceived(true);
        setAaBankPersisted(true);
        setBankUpload(EMPTY_UPLOAD);
        setShowPdfFallback(false);
        setError('');
        setSuccess('Bank connected via Account Aggregator. Please upload your salary slip.');
        clearAaReturnFlag();
        stopAaPoll();
      } else if (isAaConsentAccepted(data) || aaOptimisticRef.current || readAaReturnFlag()) {
        setAaReceived(true);
        setAaBankPersisted(false);
        setBankUpload(EMPTY_UPLOAD);
        setShowPdfFallback(false);
        setError('');
        setSuccess((prev) => prev || 'Bank connected. Please upload your salary slip.');
      }
      return data;
    } catch (err) {
      console.error('AA status failed:', err);
      return null;
    }
  }, [applicationId, isAdminMode, targetUserId, stopAaPoll]);

  useEffect(() => {
    if (applicationData?.salarySlips) {
      setSalarySlips(applicationData.salarySlips);
    } else {
      fetchExistingSlips();
    }

    if (
      applicationData?.bankStatement?.status === 'aa_received' ||
      applicationData?.bankStatement?.status === 'aa_syncing' ||
      applicationData?.bankStatement?.fetch_type === 'aa_fetch'
    ) {
      const fullyPersisted =
        applicationData.bankStatement.status === 'aa_received' ||
        String(applicationData.bankStatement.analysis_status || '').toLowerCase() === 'completed';
      aaOptimisticRef.current = false;
      setAaReceived(true);
      setAaBankPersisted(fullyPersisted);
      setBankUpload(EMPTY_UPLOAD);
      setShowPdfFallback(false);
      clearAaReturnFlag();
      if (!fullyPersisted) {
        setSuccess((prev) => prev || 'Bank connected. Bank statement is being processed in the background.');
      }
    } else if (applicationData?.bankStatement?.status === 'uploaded') {
      aaOptimisticRef.current = false;
      setAaReceived(false);
      setAaBankPersisted(false);
      setShowPdfFallback(true);
      setBankUpload({
        file: {
          name: applicationData.bankStatement.file_name || 'Bank_Statement.pdf',
          size: applicationData.bankStatement.file_size || 0,
        },
        status: 'uploaded',
        progress: 100,
        error: '',
        result: null,
        isExisting: true,
      });
    } else if (aaOptimisticRef.current || readAaReturnFlag()) {
      // Keep optimistic AA-success UI; do not flash Connect bank while report catches up
      aaOptimisticRef.current = true;
      setAaReceived(true);
      setAaBankPersisted(false);
      setBankUpload(EMPTY_UPLOAD);
      setShowPdfFallback(false);
      setSuccess((prev) => prev || 'Bank connected. Please upload your salary slip.');
    } else {
      setAaReceived(false);
      setAaBankPersisted(false);
    }

    return () => {
      abortRefs.current.bank?.abort();
      abortRefs.current.salary?.abort();
      stopAaPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, targetUserId, applicationData]);

  // Background confirm after AA return / pending session — never block salary UI
  useEffect(() => {
    if (!applicationId || bankUpload.isExisting) return undefined;
    let cancelled = false;
    const fromAaReturn = aaOptimisticRef.current || readAaReturnFlag();

    (async () => {
      const data = await refreshAaStatus();
      if (cancelled) return;
      if (isAaBankPersisted(data)) return;
      const st = String(data?.status || '').toLowerCase();
      if (AA_HARD_FAIL.has(st)) return;

      const pending = data && AA_PENDING.has(String(data.status || '')) && data.hostedUrl;
      if (!pending && !fromAaReturn && !isAaConsentAccepted(data)) return;

      stopAaPoll();
      // Quiet poll when optimistic — customer only sees salary slip, not "Waiting for consent"
      if (!fromAaReturn) setAaPolling(true);
      pollRef.current = setInterval(() => {
        refreshAaStatus();
      }, fromAaReturn ? 2000 : 4000);
    })();

    return () => {
      cancelled = true;
    };
  }, [applicationId, bankUpload.isExisting, refreshAaStatus, stopAaPoll]);

  // After AA success, bring salary slip upload into view
  useEffect(() => {
    if (!aaReceived) return;
    const el = salarySectionRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(t);
  }, [aaReceived]);

  const fetchExistingSlips = async () => {
    if (!applicationId && !targetUserId) return;
    try {
      const response = await documentsAPI.getSalarySlips(applicationId, targetUserId);
      if (response.status === 1) {
        setSalarySlips(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch salary slips:', err);
    }
  };

  const handleConnectAa = async () => {
    if (!applicationId) {
      setError('Application id missing — refresh and try again.');
      return;
    }
    setError('');
    setAaStarting(true);
    try {
      const res = await documentsAPI.initiateAa(
        { applicationId },
        isAdminMode ? targetUserId : null
      );
      const data = res?.data || res;
      if (data?.alreadyGranted) {
        await refreshAaStatus();
        setSuccess('Bank consent already completed. Your bank statement is being processed.');
        return;
      }
      const url = data?.hostedUrl;
      if (!url) {
        throw new Error(res?.message || 'Bank connect link was not returned');
      }
      setAaHostedUrl(url);
      setAaStatusLabel(data.status || 'pending');
      setAaPolling(true);
      window.open(url, '_blank', 'noopener,noreferrer');
      stopAaPoll();
      pollRef.current = setInterval(() => {
        refreshAaStatus();
      }, 4000);
      setSuccess('Complete bank consent in the new tab. This page will update when done.');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not start bank connect');
    } finally {
      setAaStarting(false);
    }
  };

  const startUpload = (kind, file, category, compression) => {
    abortRefs.current[kind]?.abort();
    const generation = (genRefs.current[kind] || 0) + 1;
    genRefs.current[kind] = generation;
    const controller = new AbortController();
    abortRefs.current[kind] = controller;
    const setter = kind === 'bank' ? setBankUpload : setSalaryUpload;

    const next = {
      file,
      status: 'uploading',
      progress: 0,
      error: '',
      result: null,
      isExisting: false,
    };
    stateRefs.current[kind] = next;
    setter(next);

    const task = (async () => {
      try {
        const result = await uploadToS3(file, {
          category,
          compress: !!compression,
          compressionOptions: compression || {},
          signal: controller.signal,
          targetUserId: isAdminMode ? targetUserId : undefined,
          onProgress: (percent) => {
            if (genRefs.current[kind] !== generation) return;
            setter((prev) => {
              const updated = { ...prev, status: 'uploading', progress: percent };
              stateRefs.current[kind] = updated;
              return updated;
            });
          },
        });
        if (genRefs.current[kind] !== generation) return null;
        const uploaded = {
          file,
          status: 'uploaded',
          progress: 100,
          error: '',
          result,
          isExisting: false,
        };
        stateRefs.current[kind] = uploaded;
        setter(uploaded);
        return result;
      } catch (err) {
        if (err instanceof UploadAbortedError || err?.name === 'UploadAbortedError') return null;
        if (genRefs.current[kind] !== generation) return null;
        const failed = {
          file,
          status: 'error',
          progress: 0,
          error: err.message || 'Upload failed',
          result: null,
          isExisting: false,
        };
        stateRefs.current[kind] = failed;
        setter(failed);
        throw err;
      }
    })();

    promiseRefs.current[kind] = task;
    return task;
  };

  const handleBankChange = (f) => {
    if (!f) return;
    if (f.size > UPLOAD_MAX_BYTES['bank-statements']) {
      setFieldErrors((prev) => ({ ...prev, bankStatement: 'Bank statement must be less than 15MB' }));
      setError('Bank statement must be less than 15MB');
      return;
    }
    setError('');
    if (fieldErrors.bankStatement) setFieldErrors((prev) => ({ ...prev, bankStatement: '' }));
    startUpload('bank', f, UPLOAD_CATEGORIES.bankStatement, false).catch(() => {});
  };

  const handleSalarySlipChange = (f) => {
    if (!f) return;
    if (f.size > UPLOAD_MAX_BYTES['salary-slips']) {
      setFieldErrors((prev) => ({ ...prev, salarySlip: 'Salary slip size must be less than 10MB' }));
      setError('Salary slip size must be less than 10MB');
      return;
    }
    setError('');
    if (fieldErrors.salarySlip) setFieldErrors((prev) => ({ ...prev, salarySlip: '' }));
    startUpload('salary', f, UPLOAD_CATEGORIES.salarySlip, { maxSizeMB: 2, maxWidthOrHeight: 1920 }).catch(() => {});
  };

  const bankDone =
    aaReceived ||
    bankUpload.isExisting ||
    bankUpload.status === 'uploaded' ||
    Boolean(bankUpload.result);
  const salaryDone =
    salarySlips.length > 0 ||
    salaryUpload.isExisting ||
    salaryUpload.status === 'uploaded' ||
    Boolean(salaryUpload.result);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFieldErrors({});
    setError('');

    if (!bankDone) {
      setFieldErrors({ bankStatement: 'Connect your bank or upload a PDF statement' });
      setError('Connect your bank or upload a PDF statement');
      return;
    }

    if (!salaryDone && salaryUpload.status !== 'uploaded' && !salaryUpload.result && salarySlips.length === 0) {
      setFieldErrors({ salarySlip: 'Salary slip is required' });
      setError('Please upload your salary slip to continue');
      return;
    }

    setLoading(true);
    setSuccess('');

    try {
      await Promise.allSettled([promiseRefs.current.bank, promiseRefs.current.salary].filter(Boolean));

      const bankState = stateRefs.current.bank;
      const salaryState = stateRefs.current.salary;

      if (!bankState.isExisting && !aaReceived && bankState.status !== 'uploaded' && !bankState.result) {
        throw new Error(bankState.error || 'Please wait for the bank statement to finish uploading.');
      }
      if (salaryState.status === 'error') {
        throw new Error(salaryState.error || 'Salary slip upload failed');
      }
      if (!salaryDone && salaryState.status !== 'uploaded' && !salaryState.result) {
        throw new Error('Please upload your salary slip to continue');
      }

      const tasks = [];
      if (!aaReceived && !bankState.isExisting && bankState.result) {
        tasks.push(
          documentsAPI.saveBankStatement(
            {
              url: bankState.result.url,
              publicId: bankState.result.publicId,
              fileFormat: bankState.result.fileFormat,
              loanApplicationId: applicationId,
              statementPassword: pdfPassword || undefined,
              ...(isAdminMode && targetUserId ? { targetUserId } : {}),
            },
            isAdminMode ? targetUserId : null
          )
        );
      }

      if (salaryState.result) {
        tasks.push(
          documentsAPI.saveSalarySlip(
            {
              url: salaryState.result.url,
              publicId: salaryState.result.publicId,
              fileFormat: salaryState.result.fileFormat,
              loanApplicationId: applicationId,
              monthTag: 'latest',
              ...(isAdminMode && targetUserId ? { targetUserId } : {}),
            },
            isAdminMode ? targetUserId : null
          )
        );
      }

      // AA consent accepted is enough — statement sync continues in the background
      if (aaReceived) {
        // Best-effort status refresh for soft UI only; never blocks completeStep
        if (!aaBankPersisted) {
          try {
            await refreshAaStatus();
          } catch {
            /* ignore */
          }
        }
        tasks.push(
          loanAPI.completeStep({
            stepName: 'bank_statement',
            applicationId,
            data: { source: 'aa_with_salary' },
            ...(isAdminMode && targetUserId ? { targetUserId } : {}),
          })
        );
      }

      const results = tasks.length ? await Promise.all(tasks) : [{ status: 1, data: {} }];
      const allSuccess = results.every((res) => res.status === 1);
      if (allSuccess) {
        setSuccess('Documents submitted successfully!');
        const payload = { ...(results.find((res) => res.data?.progress)?.data || results[0]?.data || {}) };
        if (!payload.progress && applicationData?.steps) {
          payload.progress = {
            steps: applicationData.steps,
            completedSteps: applicationData.completedSteps,
            totalSteps: applicationData.totalSteps,
            progressPercent: applicationData.progressPercent,
            currentStep: applicationData.currentStep,
          };
        }

        const bankFromApi = results.find((res) => res.data?.bankStatement)?.data?.bankStatement;
        if (bankFromApi) {
          payload.bankStatement = bankFromApi;
        } else if (aaReceived && applicationData?.bankStatement) {
          payload.bankStatement = applicationData.bankStatement;
        } else if (aaReceived) {
          // Stub / syncing row may arrive from completeStep; otherwise keep AA marker for Review
          payload.bankStatement = applicationData?.bankStatement || {
            status: 'aa_syncing',
            fetch_type: 'aa_fetch',
          };
        } else if (bankState.isExisting && applicationData?.bankStatement) {
          payload.bankStatement = applicationData.bankStatement;
        } else if (bankState.result) {
          payload.bankStatement = {
            status: 'uploaded',
            statement_url: bankState.result.url,
            file_format: bankState.result.fileFormat,
            file_name: bankState.file?.name,
          };
        }

        const salaryFromApi = results.find((res) => res.data?.salarySlip)?.data?.salarySlip;
        let nextSlips = Array.isArray(salarySlips) ? [...salarySlips] : [];
        if (salaryFromApi) {
          nextSlips = [salaryFromApi, ...nextSlips.filter((s) => String(s.id) !== String(salaryFromApi.id))];
        }
        try {
          const slipsRes = await documentsAPI.getSalarySlips(applicationId, isAdminMode ? targetUserId : null);
          if (slipsRes.status === 1 && Array.isArray(slipsRes.data)) {
            nextSlips = slipsRes.data;
          }
        } catch {
          /* keep local merge */
        }
        payload.salarySlips = nextSlips;
        setSalarySlips(nextSlips);

        if (onSuccess) onSuccess(payload);
      } else {
        const firstError = results.find((res) => res.status !== 1);
        setError(firstError?.message || 'One or more uploads failed');
      }
    } catch (err) {
      handleFormError(err, setFieldErrors, setError);
    } finally {
      setLoading(false);
    }
  };

  const uploading = bankUpload.status === 'uploading' || salaryUpload.status === 'uploading';
  const bankBusyOrFailed = ['uploading', 'error'].includes(bankUpload.status);
  const canSubmit = bankDone && salaryDone && !loading && !uploading && !bankBusyOrFailed;

  return (
    <StepLayout
      title="Financial Documents"
      description="Connect your bank securely, then upload your salary slip."
      onClose={onClose}
      icon={FileSpreadsheet}
      footer={
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={loading || uploading}
          className="w-full h-12 text-sm font-black bg-zinc-950 hover:bg-black text-white shadow-xl shadow-zinc-100 rounded-lg transition-all active:scale-[0.98]"
        >
          COMPLETE SUBMISSION
          {uploading ? ` Uploading ${Math.max(bankUpload.progress, salaryUpload.progress)}%` : null}
          {!loading && !uploading && <ArrowRight className="ml-2 w-4 h-4" />}
        </Button>
      }
    >
      <div className="space-y-4">
        {isReturningUser && (
          <div className="p-3.5 bg-zinc-950 text-white rounded-lg flex gap-3 shadow-md shadow-zinc-200">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs font-black tracking-tight leading-tight uppercase">Returning Customer Note</p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
                A fresh bank connect or statement for the last 3 months is required.
              </p>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="py-2 rounded-lg border-red-100 bg-red-50/30">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            <AlertDescription className="text-[10px] font-bold text-red-800 ml-1.5">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="py-2 rounded-lg bg-green-50/50 border-green-100 text-green-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <AlertDescription className="text-[10px] font-bold ml-1.5">{success}</AlertDescription>
          </Alert>
        )}

        {/* Bank: AA primary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">1. Bank statement</p>
            {bankDone && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
          </div>

          {aaReceived ? (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <p className="text-xs font-black uppercase tracking-tight">
                  {aaBankPersisted
                    ? 'Received via Account Aggregator'
                    : 'Connected via Account Aggregator'}
                </p>
              </div>
              <p className="text-[10px] text-emerald-900/80 font-medium leading-relaxed">
                {aaBankPersisted
                  ? 'Your bank data was fetched securely. Continue with salary slip below.'
                  : 'Bank statement is being processed in the background. You can continue with your salary slip.'}
              </p>
            </div>
          ) : bankUpload.isExisting || bankUpload.status === 'uploaded' ? (
            <div className="space-y-2">
              <UploadSlot
                label="Bank Statement"
                id="bank-statement-input"
                file={bankUpload.file}
                status={bankUpload.status}
                progress={bankUpload.progress}
                errorText={bankUpload.error}
                accept=".pdf"
                onFileChange={handleBankChange}
                onRemove={() => {
                  abortRefs.current.bank?.abort();
                  genRefs.current.bank += 1;
                  promiseRefs.current.bank = null;
                  setBankUpload(EMPTY_UPLOAD);
                  setShowPdfFallback(true);
                }}
                hasError={!!fieldErrors.bankStatement || bankUpload.status === 'error'}
              />
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-zinc-200 bg-white space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-950 text-white flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">Connect bank (recommended)</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                    Secure RBI Account Aggregator — no PDF needed. Opens Digitap in a new tab.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleConnectAa}
                disabled={aaStarting || !applicationId}
                loading={aaStarting}
                className="w-full h-11 rounded-lg bg-zinc-950 hover:bg-black text-white text-xs font-black uppercase tracking-widest"
              >
                {aaPolling && !aaStarting ? 'Waiting for consent…' : 'Connect bank'}
              </Button>
              {(aaPolling || aaHostedUrl) && (
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-medium">
                  {aaPolling && (
                    <span className="inline-flex items-center gap-1.5">
                      <Spinner className="w-3 h-3" />
                      Status: {aaStatusLabel || 'pending'}
                    </span>
                  )}
                  {aaHostedUrl && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-zinc-900 font-bold underline"
                      onClick={() => window.open(aaHostedUrl, '_blank', 'noopener,noreferrer')}
                    >
                      Re-open link <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-zinc-900 font-bold underline"
                    onClick={() => refreshAaStatus()}
                  >
                    Refresh status
                  </button>
                </div>
              )}
              {!showPdfFallback ? (
                <button
                  type="button"
                  className="text-[10px] font-bold text-slate-500 underline underline-offset-2"
                  onClick={() => setShowPdfFallback(true)}
                >
                  Prefer to upload a PDF instead?
                </button>
              ) : (
                <div className="space-y-2 pt-1 border-t border-zinc-100">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">PDF upload (fallback)</p>
                  <UploadSlot
                    label="Bank Statement"
                    id="bank-statement-input"
                    file={bankUpload.file}
                    status={bankUpload.status}
                    progress={bankUpload.progress}
                    errorText={bankUpload.error}
                    accept=".pdf"
                    onFileChange={handleBankChange}
                    onRemove={() => {
                      abortRefs.current.bank?.abort();
                      genRefs.current.bank += 1;
                      promiseRefs.current.bank = null;
                      setBankUpload(EMPTY_UPLOAD);
                    }}
                    hasError={!!fieldErrors.bankStatement || bankUpload.status === 'error'}
                  />
                  {fieldErrors.bankStatement && (
                    <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {fieldErrors.bankStatement}
                    </p>
                  )}
                  <div className="space-y-1 px-1 pt-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      PDF password {pdfPassword ? '(entered)' : '(if protected)'}
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      value={pdfPassword}
                      onChange={(e) => setPdfPassword(e.target.value)}
                      placeholder="Enter PDF password if required"
                      className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800"
                    />
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5 text-zinc-900">
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Format Tips</span>
                    </div>
                    <ul className="text-[9px] text-slate-500 font-bold space-y-1 ml-1">
                      <li className="flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-zinc-300 rounded-full" /> Latest 3 months (PDF format)
                      </li>
                      <li className="flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-zinc-300 rounded-full" /> Password-protected allowed
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Salary: required after bank */}
        {bankDone && (
          <div
            ref={salarySectionRef}
            className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex items-center justify-between px-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">2. Salary slip (required)</p>
              {salaryDone && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            </div>
            <UploadSlot
              label="Salary Slip"
              id="salary-slip-input"
              file={salaryUpload.file}
              status={salaryUpload.status}
              progress={salaryUpload.progress}
              errorText={salaryUpload.error}
              isPreExisting={salarySlips.length > 0 && !salaryUpload.file}
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={handleSalarySlipChange}
              onRemove={() => {
                abortRefs.current.salary?.abort();
                genRefs.current.salary += 1;
                promiseRefs.current.salary = null;
                setSalaryUpload(EMPTY_UPLOAD);
              }}
              hasError={!!fieldErrors.salarySlip || salaryUpload.status === 'error'}
            />
            {fieldErrors.salarySlip && (
              <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {fieldErrors.salarySlip}
              </p>
            )}
            <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-sky-900">
                <FileText className="w-3 h-3 text-sky-600" />
                <span className="text-[9px] font-black uppercase tracking-widest">Required to continue</span>
              </div>
              <p className="text-[9px] text-sky-700/80 font-bold leading-normal">
                Upload your latest salary slip, then complete this step to go to Review.
              </p>
              {salarySlips.length > 0 && (
                <div className="pt-1 mt-1 border-t border-sky-100/50">
                  <Badge className="bg-white text-sky-700 border-sky-100 font-black text-[8px] uppercase px-1.5 py-0.5">
                    {salarySlips.length} Saved
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </StepLayout>
  );
}

const UploadSlot = memo(({ label, id, file, status, progress, errorText, isPreExisting, accept, onFileChange, onRemove, hasError }) => {
  const busy = status === 'uploading' || status === 'optimizing';
  const done = status === 'uploaded' || isPreExisting;
  return (
    <div
      className={`group relative h-28 rounded-lg border-2 border-dashed transition-all duration-300 overflow-hidden flex flex-col items-center justify-center gap-1.5 cursor-pointer
            ${done ? 'border-green-200 bg-green-50/20 shadow-inner' : hasError ? 'border-red-500 bg-red-50/5' : 'border-zinc-100 bg-zinc-50/20 hover:border-zinc-300 hover:bg-zinc-50'}
        `}
      onClick={() => !(file || isPreExisting) && document.getElementById(id).click()}
    >
      {(file || isPreExisting) ? (
        <div className="flex flex-col items-center justify-center text-center p-3 animate-in zoom-in-95 duration-200 w-full">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md border border-green-100 mb-1 group-hover:scale-105 transition-transform">
            {busy ? <Spinner className="w-4 h-4 text-zinc-900" /> : <FileText className="w-4 h-4 text-green-600" />}
          </div>
          <p className="text-[10px] font-black text-zinc-900 uppercase tracking-tight truncate max-w-[130px]">
            {file?.name || 'Previous Document'}
          </p>
          <p className="text-[8px] font-black text-green-600 uppercase tracking-widest mt-0.5">
            {busy ? `Uploading ${progress || 0}%` : status === 'error' ? (errorText || 'Failed') : 'Ready for verification'}
          </p>
          {busy && (
            <div className="mt-1 h-1 w-24 rounded-full bg-white overflow-hidden">
              <div className="h-full bg-zinc-900" style={{ width: `${Math.max(progress || 0, 8)}%` }} />
            </div>
          )}
          <button
            className="mt-1.5 flex items-center gap-1 text-[8px] font-black text-slate-500 hover:text-red-500 uppercase tracking-widest transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="w-3 h-3" /> Replace
          </button>
        </div>
      ) : (
        <>
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm border border-zinc-100 group-hover:scale-105 transition-transform">
            <Upload className="w-3.5 h-3.5 text-slate-600 group-hover:text-zinc-900" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Select {label}</p>
            <p className="text-[8px] text-slate-500 font-medium">Tap to browse files</p>
          </div>
        </>
      )}
      <input
        type="file"
        id={id}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files[0])}
        accept={accept}
      />
    </div>
  );
});
