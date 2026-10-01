import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Save, Send, RotateCcw, ShieldCheck, Eye, X, RefreshCw, HelpCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminAPI } from '@/lib/api';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { DetailTable, DetailRow, EMPTY } from '../common/DetailTable';
import {
  SECTIONS,
  emptyParticulars,
  normalizeParticulars,
  buildPrefillParticulars,
  mergeParticulars,
  fieldsBySection,
  formatInr,
} from '../camFieldCatalog';
import { calculateCam } from '@/lib/cam/camCalculationEngine';
import { resolveCamPolicy } from '@/lib/cam/camPolicyDefaults';
import { scrollToDecisionSubmit } from '@/lib/utils/scrollToDecisionSubmit';

/** Decision-critical CAM fields — shown as key result tiles */
const EMPHASIS_KEYS = new Set([
  'appraised_salary',
  'eligible_loan',
  'loan_recommended',
  'final_foir_pct',
  'net_disb_amount',
  'repay_amount',
  'interest_amount',
  'tenure_days',
  'cibil_score',
  'risk_profile',
  'decision',
]);

/** Override flags are controlled via badges/toggles, not raw grid cells */
const HIDDEN_GRID_KEYS = new Set([
  'foir_enhanced_by_pct',
  'tenure_days_override',
  'repay_date_override',
]);

const FEES_SCHEDULE_KEYS = new Set(['disbursal_date', 'tenure_days', 'repay_date']);

function ModeBadge({ mode }) {
  const isManual = mode === 'manual';
  return (
    <span
      className={`ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
        isManual
          ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      {isManual ? 'Manual' : 'Auto'}
    </span>
  );
}

function formatWhen(value) {
  if (!value) return EMPTY;
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AuditHint({ audit }) {
  if (!audit) return null;
  const title = [
    audit.formula && `Formula: ${audit.formula}`,
    audit.result != null && `Result: ${audit.result}`,
    audit.rule && `Rule: ${audit.rule}`,
    audit.inputs && `Inputs: ${JSON.stringify(audit.inputs)}`,
  ]
    .filter(Boolean)
    .join('\n');
  return (
    <button
      type="button"
      title={title}
      className="ml-1 inline-flex text-slate-400 hover:text-slate-700"
      aria-label="How calculated"
    >
      <HelpCircle className="h-3.5 w-3.5" />
    </button>
  );
}

function FieldCell({ field, value, onChange, disabled, readOnly, audit, emphasize, manual }) {
  const locked = readOnly || field.role === 'calculated' || disabled;
  const common = `h-8 w-full text-xs${emphasize ? ' font-semibold text-slate-900' : ' text-slate-700'}`;
  const ring = manual ? ' ring-1 ring-amber-300 border-amber-200 bg-amber-50/40' : '';

  if (locked) {
    return (
      <span
        className={`flex min-h-[2rem] items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs tabular-nums ${
          emphasize
            ? 'border-slate-200 bg-white text-sm font-bold text-slate-900 shadow-sm'
            : 'border-slate-100 bg-slate-50 text-slate-700'
        }${manual ? ' ring-1 ring-amber-200' : ''}`}
      >
        <span className="flex-1 truncate">{value || '—'}</span>
        <AuditHint audit={audit} />
      </span>
    );
  }
  if (field.type === 'textarea') {
    return (
      <Textarea
        className={`min-h-[4rem] text-xs${ring}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  }
  if (field.type === 'yesno') {
    return (
      <select
        className={`${common} rounded-md border border-slate-200 bg-white px-2${ring}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">—</option>
        <option value="YES">YES</option>
        <option value="NO">NO</option>
      </select>
    );
  }
  if (field.type === 'select') {
    return (
      <select
        className={`${common} rounded-md border border-slate-200 bg-white px-2${ring}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">—</option>
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Input
      className={`${common} ${manual ? 'border-amber-200 bg-amber-50/40 ring-1 ring-amber-200' : ''} ${
        emphasize ? 'h-9 text-sm font-semibold' : ''
      }`}
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

function SectionCard({ section, particulars, onChange, disabled, readOnly, calcAudit, canEditInputs }) {
  const fields = fieldsBySection(section.id).filter((f) => !HIDDEN_GRID_KEYS.has(f.key));
  const isFees = section.id === 'fees';
  const scheduleFields = isFees
    ? ['disbursal_date', 'tenure_days', 'repay_date']
        .map((key) => fields.find((f) => f.key === key))
        .filter(Boolean)
    : [];
  const otherFields = isFees ? fields.filter((f) => !FEES_SCHEDULE_KEYS.has(f.key)) : fields;

  const inputs = otherFields.filter((f) => f.role === 'input');
  const keyCalcs = otherFields.filter((f) => f.role === 'calculated' && EMPHASIS_KEYS.has(f.key));
  const detailCalcs = otherFields.filter((f) => f.role === 'calculated' && !EMPHASIS_KEYS.has(f.key));

  const salaryPickOptions = [1, 2, 3]
    .map((n) => {
      const amt = particulars[`salary_credit_amount_${n}`];
      const num = amt === '' || amt == null ? null : Number(amt);
      if (!Number.isFinite(num) || num <= 0) return null;
      return { n, value: String(Math.round(num)), label: `Salary ${n}: ₹${Math.round(num).toLocaleString('en-IN')}` };
    })
    .filter(Boolean);

  const tenureManual = particulars.tenure_days_override === 'YES';
  const repayManual = particulars.repay_date_override === 'YES';
  const amountManual = particulars.loan_recommended_override === 'YES';

  const fieldMode = (field) => {
    if (field.key === 'tenure_days') return tenureManual ? 'manual' : 'auto';
    if (field.key === 'repay_date') {
      if (repayManual) return 'manual';
      if (tenureManual) return 'auto';
      return null;
    }
    if (field.key === 'loan_recommended') return amountManual ? 'manual' : 'auto';
    if (field.role === 'calculated') return 'auto';
    return null;
  };

  const renderField = (field, { tile = false } = {}) => {
    const isOverrideAmt = field.key === 'loan_recommended' && amountManual;
    const isOverrideTenure = field.key === 'tenure_days' && tenureManual;
    const allowEdit =
      canEditInputs &&
      (field.role === 'input' || isOverrideAmt || isOverrideTenure) &&
      (field.key !== 'loan_recommended' || amountManual);
    const isAppraisedSalary = field.key === 'appraised_salary';
    const emphasize = EMPHASIS_KEYS.has(field.key);
    const fullWidth = field.type === 'textarea';
    const mode = fieldMode(field);
    const manual = mode === 'manual';

    const handleFieldChange = (v) => {
      if (isAppraisedSalary) {
        onChange('appraised_salary', v);
        onChange('appraisal_method', 'declared');
        return;
      }
      onChange(field.key, v);
    };

    return (
      <div
        key={field.key}
        className={`min-w-0 space-y-1.5 ${fullWidth ? 'sm:col-span-2 lg:col-span-3' : ''} ${
          tile ? 'rounded-lg border border-slate-200 bg-slate-50/80 p-2.5' : ''
        }`}
      >
        <label
          className={`flex flex-wrap items-center gap-x-1 text-xs leading-snug ${
            emphasize ? 'font-semibold text-slate-800' : 'font-medium text-slate-500'
          }`}
        >
          {field.label}
          {mode && <ModeBadge mode={mode} />}
          {isAppraisedSalary && (
            <span className="text-[10px] font-normal text-slate-400">(default: highest of 3)</span>
          )}
        </label>
        <FieldCell
          field={isOverrideAmt || isOverrideTenure ? { ...field, role: 'input' } : field}
          value={particulars[field.key] || ''}
          onChange={handleFieldChange}
          disabled={disabled || !allowEdit}
          readOnly={readOnly || ((field.role === 'calculated' && !isOverrideAmt && !isOverrideTenure) || !allowEdit)}
          audit={calcAudit?.fields?.[field.key]}
          emphasize={emphasize}
          manual={manual}
        />
        {field.key === 'tenure_days' && canEditInputs && !readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-600">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300"
                checked={tenureManual}
                disabled={disabled}
                onChange={(e) => onChange('tenure_days_override', e.target.checked ? 'YES' : '')}
              />
              Override tenure
            </label>
            {tenureManual && (
              <span className="text-[10px] text-slate-500">Repay date follows disbursal + tenure</span>
            )}
          </div>
        )}
        {field.key === 'repay_date' && canEditInputs && !readOnly && (
          <p className="text-[10px] text-slate-500">
            {repayManual
              ? 'Manually set — tenure stays in sync with the date gap'
              : tenureManual
                ? 'Derived from disbursal + tenure'
                : 'Edit to override; tenure will follow the date gap'}
          </p>
        )}
        {isAppraisedSalary && allowEdit && !readOnly && salaryPickOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              className="h-7 max-w-full rounded-md border border-slate-200 bg-white px-2 text-[10px] text-slate-700"
              value=""
              disabled={disabled}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                onChange('appraised_salary', v);
                onChange('appraisal_method', 'declared');
              }}
            >
              <option value="">Pick from 3 salaries…</option>
              {salaryPickOptions.map((o) => (
                <option key={o.n} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="h-7 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-medium text-slate-700 hover:bg-slate-100"
              disabled={disabled}
              onClick={() => {
                onChange('appraisal_method', 'max');
                const nums = salaryPickOptions.map((o) => Number(o.value));
                const highest = nums.length ? Math.max(...nums) : '';
                if (highest !== '') onChange('appraised_salary', String(highest));
              }}
            >
              Use highest
            </button>
          </div>
        )}
      </div>
    );
  };

  const fieldGrid = (list, opts) => (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((f) => renderField(f, opts))}
    </div>
  );

  // Key calculated fields that also appear as inputs (e.g. appraised salary) — tile them when emphasized
  const keyInputs = inputs.filter((f) => EMPHASIS_KEYS.has(f.key));
  const detailInputs = inputs.filter((f) => !EMPHASIS_KEYS.has(f.key));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 border-b border-slate-100 pb-2.5">
        <p className="text-sm font-bold text-slate-900">{section.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{section.hint}</p>
      </div>

      {isFees && scheduleFields.length > 0 && (
        <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-indigo-900">Disbursal schedule</p>
            <p className="text-[10px] text-indigo-700/80">
              Override tenure to drive repay date from disbursal + days
            </p>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
            {scheduleFields.map((f) => renderField(f))}
          </div>
        </div>
      )}

      {(keyInputs.length > 0 || keyCalcs.length > 0) && (
        <div className="mb-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Key results
          </p>
          {fieldGrid([...keyInputs, ...keyCalcs], { tile: true })}
        </div>
      )}

      {detailInputs.length > 0 && (
        <div className="mb-1">
          {(keyInputs.length > 0 || keyCalcs.length > 0) && (
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Inputs
            </p>
          )}
          {fieldGrid(detailInputs)}
        </div>
      )}

      {detailCalcs.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Details
          </p>
          {fieldGrid(detailCalcs)}
        </div>
      )}
    </div>
  );
}

function ResultsStrip({ particulars, policy }) {
  const tenureManual = particulars.tenure_days_override === 'YES';
  const chips = [
    { label: 'Recommended', value: formatInr(particulars.loan_recommended) },
    { label: 'Eligible loan', value: formatInr(particulars.eligible_loan) },
    {
      label: tenureManual ? 'Tenure · Manual' : 'Tenure',
      value: particulars.tenure_days ? `${particulars.tenure_days}d` : '—',
    },
    { label: 'Net disb.', value: formatInr(particulars.net_disb_amount) },
    { label: 'Repay', value: formatInr(particulars.repay_amount) },
    { label: 'Final FOIR', value: particulars.final_foir_pct ? `${particulars.final_foir_pct}%` : '—' },
    { label: 'Risk', value: particulars.risk_profile || '—', strong: true },
    { label: 'Decision', value: particulars.decision || '—', strong: true },
  ];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3 text-white shadow-md">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-300">CAM result summary</p>
        {policy?.product_max != null && (
          <p className="text-[11px] text-slate-400">
            Product max ₹{formatInr(policy.product_max)}
            {policy.customer_max ? ` · Customer max ₹${formatInr(policy.customer_max)}` : ''}
            {policy.config_version ? ` · ${policy.config_version}` : ''}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
        {chips.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg px-2 py-1.5 ${
              c.strong ? 'bg-white/20 ring-1 ring-white/30' : 'bg-white/10'
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className={`tabular-nums text-white ${c.strong ? 'text-base font-bold' : 'text-sm font-semibold'}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>
      {particulars.recommendation_reason && (
        <p className="mt-2 text-[11px] text-slate-300">Cap used: {particulars.recommendation_reason}</p>
      )}
      {particulars.decision_reason && (
        <p className="text-[11px] text-slate-300">Decision: {particulars.decision_reason}</p>
      )}
    </div>
  );
}

export default function CamTab() {
  const { admin } = useAdminAuth();
  const {
    applicationId,
    loanApp,
    data,
    fetchApplication,
    setActiveTab,
    setStatusUpdate,
  } = useApplicationContext();
  const [particulars, setParticulars] = useState(emptyParticulars());
  const [calcAudit, setCalcAudit] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [checkerRemarks, setCheckerRemarks] = useState('');
  const [makerRemarks, setMakerRemarks] = useState('');
  const [versions, setVersions] = useState([]);
  const [workflowRows, setWorkflowRows] = useState([]);
  const [viewingVersion, setViewingVersion] = useState(null);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [returning, setReturning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [camLock, setCamLock] = useState(null);
  const [overrideRemark, setOverrideRemark] = useState('');
  const loadedRef = useRef(false);
  const inputsSigRef = useRef('');
  const role = String(admin?.role || admin?.role_code || '').toLowerCase();

  const isOverrideAdmin = role === 'super_admin' || role === 'admin';
  const canEditCamRole = role === 'credit_manager' || isOverrideAdmin;
  const canReturnRole = role === 'underwriter' || isOverrideAdmin;
  const canApproveRole = role === 'underwriter' || isOverrideAdmin;
  const canViewOnly = role === 'operations' || role === 'operations_manager';

  const status = String(loanApp?.application_status || '').toLowerCase();
  const isApproved = status === 'approved';
  const isDisbursed = status === 'disbursed';
  const isTerminalCam = ['disbursed', 'closed', 'defaulted', 'rejected', 'offer_rejected', 'cancelled'].includes(status);
  const isEsignCompleted =
    loanApp?.esign_status === 'completed' ||
    Boolean(loanApp?.esign_completed_at) ||
    ['esign_completed', 'mandate_pending', 'payment_pending', 'disbursed', 'closed', 'defaulted'].includes(status);
  const isMandateDone =
    ['registered', 'completed', 'active', 'success'].includes(String(loanApp?.mandate_status || '').toLowerCase()) ||
    ['mandate_completed', 'payment_pending', 'disbursed', 'closed', 'defaulted'].includes(status);
  const lockKind =
    isMandateDone
      ? 'mandate_completed'
      : isEsignCompleted
        ? 'esign_completed'
        : camLock?.lockKind ||
          (['recommended', 'approved', 'offer_sent'].includes(status)
            ? 'submitted'
            : ['draft', 'submitted', 'under_review', 'pending_eligibility', 'pending_pd', 'returned_to_credit_manager'].includes(status)
              ? null
              : status
                ? 'customer_confirmed'
                : null);
  const isCamLocked = Boolean(lockKind);
  const lockReason =
    isMandateDone
      ? 'Locked permanently: Customer has completed e-mandate registration'
      : isEsignCompleted
        ? 'Locked permanently: Customer has completed e-sign agreement'
        : camLock?.reason ||
          (isDisbursed
            ? 'Loan disbursed — CAM finalized'
            : lockKind === 'submitted'
              ? 'Locked — submitted to underwriter'
              : lockKind === 'customer_confirmed'
                ? 'Locked after customer confirmation'
                : null);
  const canOverrideLock = isOverrideAdmin && isCamLocked && !isTerminalCam && !isEsignCompleted && !isMandateDone;
  const canEditCam = canEditCamRole && (!isCamLocked || canOverrideLock);
  const canSubmitToUw =
    canEditCamRole &&
    ['draft', 'submitted', 'under_review', 'pending_eligibility', 'pending_pd', 'returned_to_credit_manager'].includes(status);
  const canReturn = canReturnRole && ['recommended', 'approved'].includes(status);
  const canApprove = canApproveRole && status === 'recommended';
  const canSendOffer = canApproveRole && isApproved;
  const postOfferStatuses = [
    'offer_sent', 'offer_accepted', 'video_verified', 'esign_pending',
    'esign_completed', 'mandate_pending', 'payment_pending',
  ];
  const showDigioHint =
    !isTerminalCam &&
    (['offer_accepted', 'video_verified', 'esign_pending', 'esign_completed', 'mandate_pending'].includes(status) ||
      (canEditCam && postOfferStatuses.includes(status)));
  const showDecisionActions =
    !viewingVersion &&
    !isTerminalCam &&
    (canEditCam || canSubmitToUw || canReturn || canApprove || canSendOffer || showDigioHint);

  const buildPolicy = useCallback(
    (parts) => {
      const product = data?.product || loanApp?.product || {};
      // Product fee rates only — never pass bank/offer fee_breakdown amount blobs
      const fees = product?.fees || {};
      const sanitizedParts = { ...parts };
      const feePct = Number(sanitizedParts.admin_fee_pct);
      if (Number.isFinite(feePct) && feePct > 100) {
        sanitizedParts.admin_fee_pct = '';
      }
      return resolveCamPolicy({
        product,
        fees,
        loanApp,
        customerMax: data?.user?.max_loan_amount || loanApp?.max_loan_amount,
        particulars: sanitizedParts,
      });
    },
    [data, loanApp]
  );

  const runLocalCalc = useCallback(
    (parts, { silent = false } = {}) => {
      try {
        if (!silent) setCalculating(true);
        const pol = buildPolicy(parts);
        const result = calculateCam(parts, pol, { honorRecommendedOverride: true });
        setParticulars(normalizeParticulars(result.particulars));
        setCalcAudit(result.calc_audit);
        setPolicy({
          config_version: pol.config_version,
          product_max: pol.product_max,
          customer_max: pol.customer_max,
          risk_max: pol.risk_max,
          eligible_foir_pct: pol.eligible_foir_pct,
          admin_fee_pct: pol.admin_fee_pct,
          gst_pct: pol.gst_pct,
          roi_pct: pol.roi_pct,
          roi_frequency: pol.roi_frequency,
          appraisal_method: pol.appraisal_method,
          product_name: pol.product_name,
        });
        if (!silent) setMessage('CAM recalculated');
        return result;
      } catch (err) {
        if (!silent) setError(err.message || 'Calculate failed');
        return null;
      } finally {
        if (!silent) setCalculating(false);
      }
    },
    [buildPolicy]
  );

  const handleRecalculate = useCallback(() => {
    setError('');
    setMessage('');
    runLocalCalc(particulars, { silent: false });
  }, [particulars, runLocalCalc]);

  const calcTimerRef = useRef(null);

  const onPartChange = (key, value) => {
    setParticulars((prev) => {
      const next = { ...prev, [key]: value };

      // Tenure override: user owns tenure → repay follows (unless repay later overridden)
      if (key === 'tenure_days_override') {
        if (value === 'YES') {
          next.repay_date_override = '';
        }
      }
      if (key === 'tenure_days') {
        next.tenure_days_override = 'YES';
        next.repay_date_override = '';
      }
      // Manual repay: mark override; engine keeps tenure in sync with the date gap
      if (key === 'repay_date') {
        next.repay_date_override = 'YES';
      }

      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
      calcTimerRef.current = setTimeout(() => {
        runLocalCalc(next, { silent: true });
      }, 300);
      return next;
    });
  };

  const load = async () => {
    if (!applicationId) return;
    setLoading(true);
    setError('');
    try {
      const [camRes, workflowRes] = await Promise.all([
        adminAPI.getApplicationCam(applicationId),
        adminAPI.getApplicationWorkflowHistory(applicationId, { limit: 50 }).catch(() => null),
      ]);
      const cam = camRes?.data || camRes || {};
      setCamLock(cam.lock || null);
      const prefill = buildPrefillParticulars(loanApp, data);
      const merged = mergeParticulars(cam.particulars || {}, prefill);
      setCheckerRemarks(cam.checker_remarks || '');
      setMakerRemarks(cam.maker_remarks || '');
      setVersions(cam.versions || []);
      setViewingVersion(null);
      if (workflowRes?.status === 1) {
        setWorkflowRows(workflowRes?.data?.rows || []);
      }

      const hasDrivers =
        merged.salary_credit_amount_1 ||
        merged.loan_applied ||
        merged.appraised_salary ||
        merged.salary_credit_amount_2;
      // Policy change: appraised salary = highest of 3 (upgrade legacy min → max unless CM declared)
      if (!merged.appraisal_method || merged.appraisal_method === 'min') {
        merged.appraisal_method = 'max';
      }
      // Drop poisoned fee % baked from fee_breakdown amount blobs on earlier visits
      const feePct = Number(merged.admin_fee_pct);
      if (Number.isFinite(feePct) && feePct > 100) {
        merged.admin_fee_pct = '';
      }
      if (hasDrivers) {
        runLocalCalc(merged, { silent: true });
      } else {
        setParticulars(merged);
        setCalcAudit(cam.calc_audit || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load CAM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadedRef.current = false;
    inputsSigRef.current = '';
  }, [applicationId]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [applicationId]);

  // When salary / product fees arrive after first paint (lazy sections), fill empty cells and re-calc.
  useEffect(() => {
    if (!loadedRef.current || loading) return;
    const income = String(
      data?.profile?.net_monthly_income || data?.profile?.monthly_income || ''
    ).trim();
    const feesObj = data?.product?.fees || loanApp?.product?.fees || null;
    const feesSig = feesObj ? JSON.stringify(feesObj) : '';
    const sig = `${income}|${feesSig}`;
    if (!income && !feesSig) return;
    if (sig === inputsSigRef.current) return;
    inputsSigRef.current = sig;

    setParticulars((prev) => {
      const fill = buildPrefillParticulars(loanApp, data);
      const next = mergeParticulars(prev, fill);
      const feePct = Number(next.admin_fee_pct);
      if (Number.isFinite(feePct) && feePct > 100) next.admin_fee_pct = '';

      const changed =
        next.appraised_salary !== prev.appraised_salary ||
        next.avg_salary !== prev.avg_salary ||
        next.admin_fee_pct !== prev.admin_fee_pct;
      if (!changed) return prev;

      const hasDrivers =
        next.salary_credit_amount_1 ||
        next.loan_applied ||
        next.appraised_salary ||
        next.salary_credit_amount_2;
      if (hasDrivers) {
        if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
        calcTimerRef.current = setTimeout(() => {
          runLocalCalc(next, { silent: true });
        }, 50);
      }
      return next;
    });
  }, [
    data?.profile?.net_monthly_income,
    data?.profile?.monthly_income,
    data?.product?.fees,
    loanApp?.product?.fees,
    loading,
    loanApp,
    data,
    runLocalCalc,
  ]);

  useEffect(() => {
    return () => {
      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    };
  }, []);

  const latestReturn = useMemo(
    () => workflowRows.find((row) => row.action === 'returned_to_credit_manager') || null,
    [workflowRows]
  );

  const handleViewVersion = async (row) => {
    if (!row?.id) return;
    setLoadingVersion(true);
    setError('');
    try {
      const res = await adminAPI.getApplicationCamVersion(applicationId, row.id);
      const detail = res?.data || res || {};
      setViewingVersion({
        ...row,
        particulars: detail.particulars || {},
        checker_remarks: detail.checker_remarks,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load version');
    } finally {
      setLoadingVersion(false);
    }
  };

  const handleSave = async () => {
    if (isCamLocked && canOverrideLock && !overrideRemark.trim()) {
      setError('Enter an override remark before changing a locked CAM.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = runLocalCalc(particulars, { silent: true });
      const nextParticulars = result?.particulars
        ? normalizeParticulars(result.particulars)
        : particulars;
      const nextAudit = result?.calc_audit || calcAudit;
      await adminAPI.saveApplicationCam(applicationId, {
        particulars: nextParticulars,
        calc_audit: nextAudit,
        skipRecalc: true,
        maker_remarks: makerRemarks || nextParticulars.remark || null,
        checker_remarks: checkerRemarks || null,
        decision_summary: nextParticulars.decision_reason || checkerRemarks || makerRemarks || null,
        recommendation: nextParticulars.decision || null,
        risk_assessment: nextParticulars.risk_profile || null,
        override_remark: isCamLocked ? overrideRemark.trim() : undefined,
      });
      setMessage('CAM saved');
      loadedRef.current = false;
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save CAM');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const result = runLocalCalc(particulars, { silent: true });
      const nextParticulars = result?.particulars
        ? normalizeParticulars(result.particulars)
        : particulars;
      const nextAudit = result?.calc_audit || calcAudit;
      await adminAPI.submitApplicationToUnderwriter(applicationId, {
        particulars: nextParticulars,
        calc_audit: nextAudit,
        skipRecalc: true,
        maker_remarks: makerRemarks || nextParticulars.remark || null,
        checker_remarks: checkerRemarks || null,
        decision_summary: nextParticulars.decision_reason || checkerRemarks || makerRemarks || null,
        recommendation: nextParticulars.decision || null,
        risk_assessment: nextParticulars.risk_profile || null,
      });
      setMessage('Recommended to Underwriter');
      loadedRef.current = false;
      await Promise.all([load(), fetchApplication?.(true)]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!checkerRemarks.trim()) {
      setError('Enter underwriter remark before returning');
      return;
    }
    setReturning(true);
    setError('');
    setMessage('');
    try {
      await adminAPI.returnApplicationToCreditManager(applicationId, {
        remark: checkerRemarks,
        checker_remarks: checkerRemarks,
        required_correction: particulars.deviations || null,
        reason_code: 'uw_return',
      });
      setMessage('Returned to Credit Manager');
      loadedRef.current = false;
      await Promise.all([load(), fetchApplication?.(true)]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to return case');
    } finally {
      setReturning(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    setError('');
    setMessage('');
    try {
      const response = await adminAPI.approveApplicationByUnderwriter(applicationId, {
        remark: checkerRemarks || 'Approved by underwriter',
        checker_remarks: checkerRemarks || 'Approved by underwriter',
      });
      const lan = response?.data?.loan_account_number || response?.loan_account_number;
      setMessage(lan ? `Approved. LAN issued: ${lan}` : 'Underwriter approval recorded');
      loadedRef.current = false;
      await Promise.all([load(), fetchApplication?.(true)]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to approve case');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <p className="text-xs font-medium">Loading CAM…</p>
      </div>
    );
  }

  const displayParticulars = viewingVersion
    ? normalizeParticulars(viewingVersion.particulars || {})
    : particulars;
  const editDisabled = Boolean(viewingVersion) || !canEditCam || (isCamLocked && !canOverrideLock);

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {isCamLocked && (
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Lock className="h-4 w-4" />
            {lockReason}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {isDisbursed
              ? 'CAM is final. Critical fields cannot be changed after disbursement.'
              : lockKind === 'submitted'
                ? 'Credit Manager can edit again only after Underwriter returns the case.'
                : 'Critical CAM fields cannot be changed after the customer confirmed the offer.'}
          </p>
          {canOverrideLock && (
            <div className="mt-2.5">
              <label className="text-xs font-semibold text-slate-700">Super Admin override remark (required)</label>
              <Textarea
                className="mt-1.5 min-h-[3rem] text-sm"
                value={overrideRemark}
                onChange={(e) => setOverrideRemark(e.target.value)}
                placeholder="Reason for changing a locked CAM"
              />
            </div>
          )}
        </div>
      )}

      {(latestReturn || checkerRemarks) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-sm font-bold text-amber-900">Underwriter remark</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-amber-950">
            {latestReturn?.remark || checkerRemarks || EMPTY}
          </p>
          {latestReturn && (
            <p className="mt-1 text-xs text-amber-800">
              {latestReturn.actor_name || 'Underwriter'} · {formatWhen(latestReturn.created_at)}
            </p>
          )}
        </div>
      )}

      {!viewingVersion && <ResultsStrip particulars={particulars} policy={policy} />}

      {showDecisionActions && (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-slate-900">Decision actions</p>
            <p className="text-xs text-slate-500">
              Fill salary → Recalculate → Save → Recommend to UW. Grey fields are auto-calculated (hover ? for formula).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEditCam && !viewingVersion && (
              <Button type="button" variant="outline" size="sm" onClick={handleRecalculate} disabled={calculating}>
                {calculating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                Recalculate
              </Button>
            )}
            {canEditCam && !viewingVersion && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saving || calculating || (isCamLocked && canOverrideLock && !overrideRemark.trim())}
              >
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                Save
              </Button>
            )}
            {canSubmitToUw && !viewingVersion && (
              <Button type="button" size="sm" onClick={handleSubmit} disabled={submitting || calculating}>
                {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                Recommend to Underwriter
              </Button>
            )}
            {canReturn && !viewingVersion && (
              <Button type="button" variant="outline" size="sm" onClick={handleReturn} disabled={returning}>
                {returning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
                Return to CM
              </Button>
            )}
            {canApprove && !viewingVersion && (
              <Button type="button" variant="secondary" size="sm" onClick={handleApprove} disabled={approving}>
                {approving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
                Approve & issue LAN
              </Button>
            )}
            {canSendOffer && isApproved && !viewingVersion && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const camAmt = Number(String(particulars.loan_recommended || '').replace(/,/g, ''));
                  const camTenure = Math.round(Number(String(particulars.tenure_days || '').replace(/,/g, '')));
                  setStatusUpdate?.((prev) => {
                    const prevAmt = Number(String(prev.approvedAmount ?? '').replace(/,/g, ''));
                    const next = { ...prev, status: 'offer_sent' };
                    if ((!Number.isFinite(prevAmt) || prevAmt <= 0) && Number.isFinite(camAmt) && camAmt > 0) {
                      next.approvedAmount = camAmt;
                    }
                    if (Number.isFinite(camTenure) && camTenure > 0) {
                      next.tenureDays = camTenure;
                    }
                    return next;
                  });
                  setActiveTab?.('actions');
                  scrollToDecisionSubmit();
                }}
              >
                Continue to send offer
              </Button>
            )}
            {(canEditCam || canViewOnly) && showDigioHint && !viewingVersion && (
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab?.('kyc')}>
                Digitap e-sign / mandate
              </Button>
            )}
          </div>
        </div>
        {canSendOffer && isApproved && !viewingVersion && (
          <p className="text-[11px] text-slate-500">
            Confirm amount on Decision, then save to send the offer to the customer.
          </p>
        )}
      </div>
      )}

      {(canReturn || canApprove) && !viewingVersion && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <label className="text-xs font-semibold text-slate-700">Underwriter remark (required on return)</label>
          <Textarea
            className="mt-1.5 min-h-[4rem] text-sm"
            value={checkerRemarks}
            onChange={(e) => setCheckerRemarks(e.target.value)}
            placeholder="Remarks for Credit Manager / approval note"
          />
        </div>
      )}

      {viewingVersion && (
        <div className="flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm">
          <span className="font-medium text-sky-900">
            Viewing snapshot · Version {viewingVersion.version_no} (read-only)
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setViewingVersion(null)}>
            <X className="mr-1 h-3.5 w-3.5" />
            Back to current
          </Button>
        </div>
      )}

      {loadingVersion ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading version…
        </p>
      ) : (
        <div className="space-y-3">
          {SECTIONS.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              particulars={displayParticulars}
              onChange={onPartChange}
              disabled={editDisabled}
              readOnly={Boolean(viewingVersion)}
              calcAudit={viewingVersion ? null : calcAudit}
              canEditInputs={canEditCam && !viewingVersion}
            />
          ))}
        </div>
      )}

      {canEditCam && !viewingVersion && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <label className="text-xs font-semibold text-slate-700">Maker notes (optional)</label>
          <Textarea
            className="mt-1.5 min-h-[3rem] text-sm"
            value={makerRemarks}
            onChange={(e) => setMakerRemarks(e.target.value)}
            placeholder="Internal CM notes when recommending to UW"
          />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-bold text-slate-900">CAM versions</p>
          {versions.length === 0 ? (
            <p className="text-xs text-slate-500">No saved versions yet.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {versions.map((row) => (
                <div
                  key={row.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-800">Version {row.version_no}</p>
                    <p className="text-slate-500">Saved {formatWhen(row.created_at)}</p>
                    <p className="text-slate-500">Submitted to: {row.submitted_to_role || 'Draft'}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    disabled={loadingVersion}
                    onClick={() => handleViewVersion(row)}
                  >
                    {loadingVersion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <DetailTable title="Case identifiers">
            <DetailRow label="Customer ID">{loanApp?.customer_code || EMPTY}</DetailRow>
            <DetailRow label="Lead ID">{loanApp?.lead_id || EMPTY}</DetailRow>
            <DetailRow label="Status">{loanApp?.application_status || EMPTY}</DetailRow>
            <DetailRow label="Loan Account">{loanApp?.loan_account_number || 'Issued on UW approval'}</DetailRow>
          </DetailTable>

          {workflowRows.length > 0 && (
            <DetailTable title="Maker–checker trail">
              {workflowRows.slice(0, 8).map((row) => (
                <DetailRow
                  key={row.id}
                  label={`${row.action?.replace(/_/g, ' ') || 'action'} · ${formatWhen(row.created_at)}`}
                >
                  {row.remark || row.actor_name || EMPTY}
                </DetailRow>
              ))}
            </DetailTable>
          )}
        </div>
      </div>
    </div>
  );
}
