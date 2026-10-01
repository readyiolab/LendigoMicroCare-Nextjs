import { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { pickSelfieDisplayUrl } from '@/lib/utils/media';
import { getOptimizedUrl } from '@/lib/services/cloudinaryUpload';
import { Button } from '@/components/ui/button';
import { documentsAPI } from '@/lib/api';
import {
  User,
  Building2,
  Users,
  CheckCircle2,
  Pencil,
  Fingerprint,
  Landmark,
  FileText,
  ArrowRight,
  ClipboardCheck,
  Info,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import StepLayout from './StepLayout';

const getVal = (obj, snake, camel) => {
  if (!obj) return null;
  if (obj[snake] !== undefined && obj[snake] !== null && obj[snake] !== '') return obj[snake];
  if (camel && obj[camel] !== undefined && obj[camel] !== null && obj[camel] !== '') return obj[camel];
  return null;
};

function StatusChip({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
        ok
          ? 'bg-teal-50 text-teal-700 border border-teal-100'
          : 'bg-amber-50 text-amber-700 border border-amber-100'
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {label || (ok ? 'Complete' : 'Missing')}
    </span>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm text-slate-900 truncate ${mono ? 'font-mono text-[13px] tracking-tight' : 'font-medium'}`}>
        {value || <span className="text-slate-300 font-normal italic">Not provided</span>}
      </p>
    </div>
  );
}

function ReviewSection({
  icon: Icon,
  title,
  ok,
  statusLabel,
  onModify,
  children,
  actions,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#222222] text-white">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
          </div>
          <StatusChip ok={ok} label={statusLabel} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {onModify && (
            <button
              type="button"
              onClick={onModify}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#222222] hover:bg-slate-50 transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Modify
            </button>
          )}
        </div>
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

function ReviewForm({ onConfirm, onClose, applicationData, onEditStep, onRefresh }) {
  const { profile, kyc, bankDetails, references } = applicationData || {};
  const [removingId, setRemovingId] = useState(null);
  const [gateError, setGateError] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Ensure docs uploaded in the previous step are reflected (stale dashboard skip)
  useEffect(() => {
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
    // intentionally once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selfiePreviewUrl = useMemo(
    () => pickSelfieDisplayUrl(applicationData),
    [applicationData]
  );
  const selfieImgSrc = selfiePreviewUrl
    ? getOptimizedUrl(selfiePreviewUrl, { width: 160 })
    : null;

  const formattedDob = getVal(profile, 'dob')
    ? new Date(getVal(profile, 'dob')).toLocaleDateString('en-IN')
    : null;
  const formattedIncome = getVal(profile, 'net_monthly_income', 'netMonthlyIncome')
    ? `₹${Number(getVal(profile, 'net_monthly_income', 'netMonthlyIncome')).toLocaleString('en-IN')}`
    : null;

  const refs = Array.isArray(references) ? references : [];
  const salaryCount = applicationData?.salarySlips?.length || 0;
  const bs = applicationData?.bankStatement || applicationData?.bank_statement;
  const bankStepCompleted = Boolean(
    applicationData?.steps?.some(
      (s) =>
        (s.name === 'bank_statement' || s.id === 'bank_statement') &&
        String(s.status || '').toLowerCase() === 'completed'
    )
  );
  let aaReturnFlag = false;
  try {
    aaReturnFlag = sessionStorage.getItem('aa_return') === '1';
  } catch {
    /* ignore */
  }
  const hasStatement = !!(
    (bs &&
      (bs.status === 'aa_received' ||
        bs.status === 'aa_syncing' ||
        bs.status === 'uploaded' ||
        bs.statement_url ||
        bs.fetch_type === 'aa_fetch')) ||
    bankStepCompleted ||
    aaReturnFlag
  );
  const statementViaAa =
    hasStatement &&
    (bs?.status === 'aa_received' ||
      bs?.status === 'aa_syncing' ||
      bs?.fetch_type === 'aa_fetch' ||
      (!bs && (bankStepCompleted || aaReturnFlag)));
  const aaStillSyncing =
    statementViaAa &&
    !(
      bs?.status === 'aa_received' ||
      String(bs?.analysis_status || '').toLowerCase() === 'completed'
    );

  const personalOk = !!(getVal(profile, 'full_name', 'fullName') && getVal(profile, 'mobile'));
  const identityOk = !!(selfieImgSrc && (getVal(kyc, 'verification_status', 'verificationStatus') || getVal(profile, 'pancard')));
  const workOk = !!(getVal(profile, 'company_name', 'companyName') || getVal(profile, 'employment_type', 'employmentType'));
  const bankOk = !!(getVal(bankDetails, 'account_number_masked', 'accountNumberMasked') || getVal(bankDetails, 'ifsc_code', 'ifscCode'));
  const refsOk = refs.length >= 2;
  const docsOk = hasStatement;

  const missingParts = useMemo(() => {
    const parts = [];
    if (!personalOk) parts.push('personal details');
    if (!selfieImgSrc) parts.push('selfie');
    if (!bankOk) parts.push('bank account');
    if (!refsOk) parts.push('two references');
    if (!docsOk) parts.push('bank statement');
    return parts;
  }, [personalOk, selfieImgSrc, bankOk, refsOk, docsOk]);

  const canSubmit = missingParts.length === 0;

  const handleRemoveReference = useCallback(
    async (referenceId) => {
      if (!referenceId) return;
      setRemovingId(referenceId);
      setGateError('');
      try {
        await documentsAPI.deleteReference(referenceId);
        if (onRefresh) await onRefresh();
      } catch (err) {
        setGateError(err.message || 'Could not remove reference. Try again.');
      } finally {
        setRemovingId(null);
      }
    },
    [onRefresh]
  );

  const handleConfirm = async () => {
    if (!canSubmit) {
      setGateError(`Please complete: ${missingParts.join(', ')}. Use Modify on each section.`);
      return;
    }
    setGateError('');
    setConfirming(true);
    try {
      await onConfirm?.();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <StepLayout
      title="Application Review"
      description="Check your details, then submit."
      onClose={onClose}
      icon={ClipboardCheck}
      footer={
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={confirming || !canSubmit}
          className="w-full h-11 text-sm font-semibold bg-[#222222] hover:bg-[#111111] text-white rounded-lg shadow-md shadow-[#222222]/15 disabled:opacity-50"
        >
          {confirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Confirm & submit application
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      }
    >
      <div className="space-y-3">
        {(gateError || !canSubmit) && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="leading-snug font-medium">
              {gateError ||
                `Almost there — still need: ${missingParts.join(', ')}. Tap Modify to update.`}
            </p>
          </div>
        )}

        <ReviewSection
          icon={User}
          title="Personal details"
          ok={personalOk}
          onModify={() => onEditStep?.('eligibility')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full name" value={getVal(profile, 'full_name', 'fullName')} />
            <Field label="Mobile" value={getVal(profile, 'mobile')} />
            <Field label="Email" value={getVal(profile, 'personal_email', 'personalEmail')} />
            <Field label="Date of birth" value={formattedDob} />
            <Field label="Gender" value={getVal(profile, 'gender')} />
            <Field label="PAN" value={getVal(profile, 'pancard')} mono />
          </div>
        </ReviewSection>

        <ReviewSection
          icon={Fingerprint}
          title="Identity & selfie"
          ok={identityOk}
          onModify={() => onEditStep?.('selfie')}
          actions={
            <button
              type="button"
              onClick={() => onEditStep?.('ekyc')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              eKYC
            </button>
          }
        >
          <div className="flex items-start gap-3">
            {selfieImgSrc ? (
              <img
                src={selfieImgSrc}
                alt="Selfie"
                className="h-14 w-14 rounded-lg object-cover border border-slate-200"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
                <User className="h-6 w-6 text-slate-300" />
              </div>
            )}
            <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <Field
                label="Aadhaar"
                value={getVal(kyc, 'aadhaar_number_masked', 'aadhaarNumberMasked')}
                mono
              />
              <Field
                label="KYC status"
                value={(getVal(kyc, 'verification_status', 'verificationStatus') || '—').toString()}
              />
            </div>
          </div>
        </ReviewSection>

        <ReviewSection
          icon={Building2}
          title="Work & address"
          ok={workOk}
          onModify={() => onEditStep?.('eligibility')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Employment" value={getVal(profile, 'employment_type', 'employmentType')} />
            <Field label="Company" value={getVal(profile, 'company_name', 'companyName')} />
            <Field label="Monthly income" value={formattedIncome} />
            <Field
              label="Location"
              value={[getVal(profile, 'city'), getVal(profile, 'state'), getVal(profile, 'pincode')]
                .filter(Boolean)
                .join(', ')}
            />
            <div className="sm:col-span-2">
              <Field label="Address" value={getVal(profile, 'current_address', 'currentAddress')} />
            </div>
          </div>
        </ReviewSection>

        <ReviewSection
          icon={Landmark}
          title="Disbursal bank"
          ok={bankOk}
          onModify={() => onEditStep?.('disbursal_bank')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Bank" value={getVal(bankDetails, 'bank_name', 'bankName')} />
            <Field
              label="Account holder"
              value={getVal(bankDetails, 'account_holder_name', 'accountHolderName')}
            />
            <Field
              label="Account"
              value={getVal(bankDetails, 'account_number_masked', 'accountNumberMasked')}
              mono
            />
            <Field label="IFSC" value={getVal(bankDetails, 'ifsc_code', 'ifscCode')} mono />
          </div>
        </ReviewSection>

        <ReviewSection
          icon={Users}
          title="References"
          ok={refsOk}
          statusLabel={refsOk ? 'Complete' : `${refs.length}/2`}
          onModify={() => onEditStep?.('reference')}
        >
          {refs.length > 0 ? (
            <ul className="space-y-2">
              {refs.slice(0, 2).map((ref) => {
                const id = getVal(ref, 'id');
                return (
                  <li
                    key={id || `${getVal(ref, 'reference_mobile', 'referenceMobile')}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {getVal(ref, 'reference_name', 'referenceName')}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {getVal(ref, 'relationship') || 'Contact'} ·{' '}
                        {getVal(ref, 'reference_mobile', 'referenceMobile')}
                      </p>
                    </div>
                    {id && (
                      <button
                        type="button"
                        disabled={removingId === id}
                        onClick={() => handleRemoveReference(id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Remove reference"
                      >
                        {removingId === id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No references added yet.</p>
          )}
        </ReviewSection>

        <ReviewSection
          icon={FileText}
          title="Documents"
          ok={docsOk}
          onModify={() => onEditStep?.('bank_statement')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-900">Bank statement</p>
                <p className={`text-xs mt-0.5 ${hasStatement ? 'text-teal-600' : 'text-amber-600'}`}>
                  {hasStatement
                    ? statementViaAa
                      ? aaStillSyncing
                        ? 'Via Account Aggregator (processing in background)'
                        : 'Via Account Aggregator'
                      : 'Uploaded'
                    : 'Required'}
                </p>
              </div>
              {hasStatement && <CheckCircle2 className="h-4 w-4 text-teal-600" />}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-900">Salary slips</p>
                <p className="text-xs text-slate-500 mt-0.5">{salaryCount} uploaded</p>
              </div>
              {salaryCount > 0 && <CheckCircle2 className="h-4 w-4 text-teal-600" />}
            </div>
          </div>
          {aaStillSyncing && (
            <p className="text-[11px] text-slate-500 mt-2 leading-snug">
              Bank statement is being processed in the background. You can submit without waiting.
            </p>
          )}
        </ReviewSection>

        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="leading-relaxed">
            By submitting, you confirm these details are accurate. Wrong information can delay or
            reject your application.
          </p>
        </div>
      </div>
    </StepLayout>
  );
}

export default memo(ReviewForm);
