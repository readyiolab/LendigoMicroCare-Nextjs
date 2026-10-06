import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { adminAPI } from '@/lib/api/admin';
import { useApplicationContext } from '../context/ApplicationContext';

const OUTCOME_LABELS = {
  APPROVE: 'Approve',
  APPROVE_REDUCED: 'Approve reduced',
  REFER: 'Refer',
  DECLINE: 'Decline',
};

const OUTCOME_CLASS = {
  APPROVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  APPROVE_REDUCED: 'border-amber-200 bg-amber-50 text-amber-800',
  REFER: 'border-sky-200 bg-sky-50 text-sky-800',
  DECLINE: 'border-rose-200 bg-rose-50 text-rose-800',
};

const CAP_LABELS = {
  SALARY_PCT: 'Salary limit',
  OBLIGATION: 'Existing loan payments',
  PRODUCT: 'Product maximum',
  LADDER: 'Repeat-loan ladder',
  BALANCE: 'Bank balance',
  NTC: 'New-to-credit limit',
  TICKET: 'Maximum ticket',
};

const DATA_STATUS_LABELS = {
  ok: 'Fresh enough to decide',
  bureau_unavailable: 'Credit bureau missing',
  bureau_stale: 'Credit bureau is out of date',
  aa_unavailable: 'Bank data missing',
  aa_stale: 'Bank data is out of date',
};

function money(value) {
  if (value == null || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function describeError(err) {
  const status = Number(err?.status);
  const message = String(err?.message || '');
  if (status === 403 || message === 'Forbidden') return 'This role cannot run a payday decision.';
  if (status === 503 || /unavailable/i.test(message)) return 'Payday engine unavailable';
  return message || 'Could not load the payday decision.';
}

function Field({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function PaydayDecisionTab() {
  const { loanApp, applicationId } = useApplicationContext();
  const applicationRef = loanApp?.application_number || applicationId;

  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [showRerun, setShowRerun] = useState(false);
  const [reason, setReason] = useState('');
  const [capsOpen, setCapsOpen] = useState(false);
  const [caps, setCaps] = useState(null);
  const [capsLoading, setCapsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!applicationRef) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getPaydayDecision(applicationRef);
      setDecision(res?.data || null);
      setCaps(null);
      setCapsOpen(false);
    } catch (err) {
      setDecision(null);
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [applicationRef]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(refresh) {
    if (!applicationRef || running) return;
    setRunning(true);
    setError('');
    try {
      const res = await adminAPI.runPaydayDecision(applicationRef, refresh
        ? { refresh: true, refresh_reason: reason.trim() }
        : {});
      setDecision(res?.data?.decision || null);
      setCaps(null);
      setCapsOpen(false);
      setShowRerun(false);
      setReason('');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setRunning(false);
    }
  }

  async function toggleCaps() {
    const next = !capsOpen;
    setCapsOpen(next);
    if (!next || caps || !decision?.id) return;
    setCapsLoading(true);
    try {
      const res = await adminAPI.getPaydayDecisionDetail(decision.id);
      setCaps(res?.data?.caps || {});
    } catch (err) {
      setError(describeError(err));
    } finally {
      setCapsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  const outcome = decision?.outcome;
  const reasonLines = Array.isArray(decision?.reason_codes) ? decision.reason_codes : [];
  const capEntries = caps
    ? Object.entries(CAP_LABELS).filter(([key]) => caps[key] != null)
    : [];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Advisory only. This does not change Final decision.
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {!decision && !/cannot run|unavailable/i.test(error) ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">No payday decision yet</h2>
          <p className="mt-1 text-sm text-slate-600">
            Run the payday rules for this application. The result is saved for review and does not approve or reject the case.
          </p>
          <Button className="mt-4" disabled={running || !applicationRef} onClick={() => run(false)}>
            {running ? 'Running…' : 'Run payday decision'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge className={OUTCOME_CLASS[outcome] || 'border-slate-200 bg-white text-slate-800'}>
                {OUTCOME_LABELS[outcome] || outcome || 'Decision'}
              </Badge>
              <span className="text-xs text-slate-500">Attempt {decision.attempt_no}</span>
            </div>
            <Button variant="outline" disabled={running} onClick={() => setShowRerun((open) => !open)}>
              Re-run
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Sanction limit" value={money(decision.sanction_limit)} />
            <Field label="Requested amount" value={money(decision.requested_amount)} />
            <Field label="Band and score" value={`${decision.band || '—'} · ${decision.score ?? '—'}`} />
            <Field label="Tenure" value={decision.tenure_days != null ? `${decision.tenure_days} days` : '—'} />
            <Field label="ROI per day" value={decision.roi_per_day_pct != null ? `${decision.roi_per_day_pct}%` : '—'} />
            <Field label="Processing fee" value={money(decision.processing_fee_amt)} />
            <Field label="Limiting cap" value={CAP_LABELS[decision.binding_constraint] || decision.binding_constraint || '—'} />
            <Field label="Data status" value={DATA_STATUS_LABELS[decision.data_status] || decision.data_status || '—'} />
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Reasons</p>
            {reasonLines.length ? (
              <ul className="mt-2 space-y-1 text-sm text-slate-800">
                {reasonLines.map((row) => (
                  <li key={row.code}>{row.customer_text || row.code}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No reason codes.</p>
            )}
          </div>

          {showRerun ? (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <label className="text-sm font-medium text-slate-800" htmlFor="payday-rerun-reason">
                Why are you re-running this decision?
              </label>
              <input
                id="payday-rerun-reason"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={reason}
                maxLength={255}
                onChange={(event) => setReason(event.target.value)}
                placeholder="At least 5 characters"
              />
              <Button
                className="mt-3"
                disabled={running || reason.trim().length < 5}
                onClick={() => run(true)}
              >
                {running ? 'Running…' : 'Re-run payday decision'}
              </Button>
            </div>
          ) : null}

          <div>
            <Button variant="outline" onClick={toggleCaps}>
              {capsOpen ? 'Hide how the limit was worked out' : 'How the limit was worked out'}
            </Button>
            {capsOpen ? (
              <div className="mt-3 space-y-2">
                {capsLoading ? <Spinner className="h-5 w-5 text-primary" /> : null}
                {!capsLoading && capEntries.length === 0 ? (
                  <p className="text-sm text-slate-600">No cap amounts were stored.</p>
                ) : null}
                {capEntries.map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    <span className="text-slate-700">
                      {label}
                      {decision.binding_constraint === key ? ' (limiting)' : ''}
                    </span>
                    <span className="font-semibold text-slate-900">{money(caps[key])}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
