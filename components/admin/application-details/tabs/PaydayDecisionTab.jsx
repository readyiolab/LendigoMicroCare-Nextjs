import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { adminAPI } from '@/lib/api/admin';
import { useApplicationContext } from '../context/ApplicationContext';

const OUTCOME_HEADLINE = {
  APPROVE: 'Offer the amount asked.',
  APPROVE_REDUCED: 'Offer a lower amount.',
  REFER: 'A person should review this before anyone offers a loan.',
  DECLINE: 'Do not offer this loan.',
};

const OUTCOME_BADGE = {
  APPROVE: 'Offer',
  APPROVE_REDUCED: 'Lower offer',
  REFER: 'Needs a person',
  DECLINE: 'Do not offer',
};

const OUTCOME_CLASS = {
  APPROVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  APPROVE_REDUCED: 'border-amber-200 bg-amber-50 text-amber-800',
  REFER: 'border-sky-200 bg-sky-50 text-sky-800',
  DECLINE: 'border-rose-200 bg-rose-50 text-rose-800',
};

const STAFF_PLAIN = {
  R_AGE_OUT_OF_RANGE: 'The customer’s age is outside the ages we lend to.',
  R_WRITE_OFF: 'A credit account was written off.',
  R_SEVERE_DELINQUENCY: 'A credit account is 90 or more days late in the last 2 years.',
  R_FRAUD: 'This customer is on a blocked or fraud list.',
  R_DUPLICATE_IDENTITY: 'The PAN, mobile, or device is already linked to another customer.',
  R_NON_SERVICEABLE: 'We do not lend in this location.',
  R_HIGH_ENQUIRIES: 'There are many recent credit enquiries.',
  R_NTC_HIGH_TICKET: 'This customer is new to credit and asked for a high amount.',
  R_INCOME_VARIANCE: 'The salary credits vary more than we allow without a person looking.',
  R_BUREAU_UNAVAILABLE: 'We could not read the credit report.',
  R_BUREAU_STALE: 'The credit report is too old.',
  R_AA_UNAVAILABLE: 'We could not read the bank statement.',
  R_AA_STALE: 'The bank statement is too old.',
  R_PROFILE_INCOMPLETE: 'Age or another required detail is missing.',
  R_POLICY_MISSING: 'We do not have a limit rule for this risk grade.',
  R_BAND_E: 'The risk grade is too weak to offer a loan.',
  R_BAND_D: 'This risk grade needs a person to review it before an offer.',
  R_INSUFFICIENT_CAPACITY: 'The amount we can offer is below the smallest loan we give.',
};

const DATA_STATUS_SENTENCE = {
  ok: 'The credit report and bank statement were fresh enough to decide.',
  bureau_unavailable: 'We could not read the credit report.',
  bureau_stale: 'The credit report is out of date.',
  aa_unavailable: 'We could not read the bank statement.',
  aa_stale: 'The bank statement is out of date.',
};

const CAP_ORDER = ['SALARY_PCT', 'OBLIGATION', 'PRODUCT', 'LADDER', 'BALANCE', 'NTC', 'TICKET'];

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

function staffReason(row) {
  return STAFF_PLAIN[row.code] || row.internal_text || row.customer_text || row.code;
}

function capSentence(key, amount) {
  const shown = money(amount);
  if (key === 'SALARY_PCT') return `From salary: ${shown}`;
  if (key === 'OBLIGATION') return `After existing loan payments: ${shown}`;
  if (key === 'PRODUCT') return `For this risk grade: up to ${shown}`;
  if (key === 'LADDER') return `From loans already repaid with us: up to ${shown}`;
  if (key === 'BALANCE') return `From the average bank balance, not today’s account balance: up to ${shown}`;
  if (key === 'NTC') return `For a customer new to credit: up to ${shown}`;
  if (key === 'TICKET') return `The highest loan we offer: ${shown}`;
  return shown;
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

  useEffect(() => {
    if (!decision?.id) return undefined;
    let cancelled = false;
    setCapsLoading(true);
    adminAPI.getPaydayDecisionDetail(decision.id)
      .then((res) => {
        if (!cancelled) setCaps(res?.data?.caps || {});
      })
      .catch((err) => {
        if (!cancelled) setError(describeError(err));
      })
      .finally(() => {
        if (!cancelled) setCapsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [decision?.id]);

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
      setShowRerun(false);
      setReason('');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setRunning(false);
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
  const stoppedByKnockout = reasonLines.some((row) => row.stage === 'knockout');
  const capEntries = caps
    ? CAP_ORDER.filter((key) => caps[key] != null).map((key) => ({ key, amount: caps[key] }))
    : [];
  const bindingAmount = decision?.binding_constraint && caps
    ? Number(caps[decision.binding_constraint])
    : null;
  const offerWouldBeZero = stoppedByKnockout && outcome === 'DECLINE' && bindingAmount === 0;

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
      ) : decision ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <Badge className={OUTCOME_CLASS[outcome] || 'border-slate-200 bg-white text-slate-800'}>
                {OUTCOME_BADGE[outcome] || outcome || 'Decision'}
              </Badge>
              <h2 className="text-lg font-semibold text-slate-900">
                {OUTCOME_HEADLINE[outcome] || 'Payday decision'}
              </h2>
              <p className="text-xs text-slate-500">Run {decision.attempt_no}</p>
            </div>
            <Button variant="outline" disabled={running} onClick={() => setShowRerun((open) => !open)}>
              Re-run
            </Button>
          </div>

          <div className="space-y-2 text-sm text-slate-800">
            <p className="font-medium text-slate-900">Why</p>
            {reasonLines.length ? reasonLines.map((row) => (
              <div key={row.code} className="space-y-1">
                <p>{staffReason(row)}</p>
                {row.customer_text ? (
                  <p className="text-slate-600">What we would tell the customer: {row.customer_text}</p>
                ) : null}
              </div>
            )) : (
              <p>No extra reason was recorded.</p>
            )}
            {stoppedByKnockout ? (
              <p>That stop happens before any amount is offered.</p>
            ) : null}
          </div>

          <p className="text-sm text-slate-800">
            {DATA_STATUS_SENTENCE[decision.data_status] || 'We used the credit report and bank statement on file.'}
          </p>

          <div className="space-y-2 text-sm text-slate-800">
            <p className="font-medium text-slate-900">What we could have offered</p>
            <p>
              The customer asked for {money(decision.requested_amount)}. We compare several ceilings and keep the lowest.
            </p>
            {capsLoading ? <Spinner className="h-5 w-5 text-primary" /> : null}
            {!capsLoading && capEntries.length === 0 ? (
              <p className="text-slate-600">The amount breakdown is not available.</p>
            ) : null}
            {capEntries.map((entry) => (
              <p key={entry.key}>
                {capSentence(entry.key, entry.amount)}
                {decision.binding_constraint === entry.key
                  ? ' This is the lowest, so this is the amount we can offer.'
                  : ''}
              </p>
            ))}
            {offerWouldBeZero ? (
              <p>The stop declined the loan, and the existing payments would have left ₹0 anyway.</p>
            ) : null}
          </div>

          <p className="text-sm text-slate-800">
            {`Risk grade ${decision.band || '—'}, score ${decision.score ?? '—'}. A is strongest and E is weakest.`}
            {stoppedByKnockout
              ? ' This grade did not decide the case, because the stop above already did.'
              : ''}
          </p>

          <p className="text-sm text-slate-800">
            {outcome === 'DECLINE' ? 'If the amount had been offered: ' : 'Offer terms: '}
            repay in {decision.tenure_days != null ? `${decision.tenure_days} days` : '—'}
            {', interest '}
            {decision.roi_per_day_pct != null ? `${decision.roi_per_day_pct}% per day` : '—'}
            {', fee '}
            {money(decision.processing_fee_amt)}
            .
          </p>

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
        </div>
      ) : null}
    </div>
  );
}
