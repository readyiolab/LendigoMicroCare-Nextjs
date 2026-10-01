/**
 * Normalize BRE evaluation row fields for the admin BRE tab.
 * Pure — no React state.
 */

import { groupRulesByStatus } from '@/lib/utils/creditDecisionDisplay';

export function parseMaybeJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value && value !== 'null') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function mapFailedBreRules(failed) {
  return (Array.isArray(failed) ? failed : []).map((r) => ({
    ...r,
    status: r.status || 'failed',
    rule_name: r.rule_name || r.rule_code,
    actual_value: r.actual_value ?? r.message ?? '—',
    expected_value: r.expected_value ?? '—',
    operator: r.operator || 'CHECK',
    field_name: r.field_name || 'System Gating',
  }));
}

/**
 * Build the evaluations list shown in BRETab from a latest evaluation row.
 * @returns {{ latest: object|null, evaluations: object[] }}
 */
export function buildBreEvaluationsFromRow(latest) {
  if (!latest) {
    return { latest: null, evaluations: [] };
  }
  const results = parseMaybeJsonArray(latest.evaluation_results, []);
  const failed = parseMaybeJsonArray(latest.failed_rules, []);
  const mappedFailed = mapFailedBreRules(failed);
  return {
    latest,
    evaluations: [...mappedFailed, ...results],
  };
}

const CREDIT_VERDICT_TO_OVERALL = {
  APPROVED: 'auto_approved',
  PRE_APPROVED: 'auto_approved',
  REJECTED: 'rejected',
  MANUAL_REVIEW: 'manual_review',
  AWAITING_AA_CONSENT: 'pending_aa',
  AA_CONSENT_TIMEOUT: 'manual_review',
};

/**
 * Prefer credit-decision run when legacy tbl_bre_evaluations is empty.
 * Shape matches what BRETab expects from latestBreEvaluation + rule rows.
 * Rule lists use the same suggested_terms paths as Feature Risk (groupRulesByStatus).
 */
export function buildBreViewFromCreditRun(creditRun) {
  if (!creditRun) return { latest: null, evaluations: [], source: null };

  const verdict = String(creditRun.finalVerdict || creditRun.final_verdict || '').toUpperCase();
  if (!verdict) return { latest: null, evaluations: [], source: null };

  const engine = creditRun.engineResult || {};
  const scorecard = engine.scorecard || creditRun.scorecard || {};
  const composite =
    scorecard.composite_score ??
    creditRun.compositeScore ??
    scorecard.total ??
    null;

  const trail = Array.isArray(creditRun.reasoningTrail)
    ? creditRun.reasoningTrail
    : Array.isArray(creditRun.reasoning_trail)
      ? creditRun.reasoning_trail
      : [];

  const groups = groupRulesByStatus(creditRun);
  const fired = groups.fired?.length
    ? groups.fired
    : engine.fired_rules || creditRun.firedRules || [];
  const passed = groups.passed?.length
    ? groups.passed
    : engine.passed_rules || creditRun.passedRules || [];
  const waiting = groups.waiting?.length
    ? groups.waiting
    : engine.waiting_aa || creditRun.waitingAaRules || [];

  const mapRule = (r, status) => ({
    status,
    rule_name: r.rule_name || r.name || r.rule_id || r.id || 'Rule',
    rule_code: r.rule_code || r.rule_id || r.id || '',
    actual_value: r.actual_value ?? r.message ?? r.reason ?? '—',
    expected_value: r.expected_value ?? r.threshold ?? '—',
    operator: r.operator || 'CHECK',
    field_name: r.field_name || r.tier_id || 'Credit decision',
  });

  const evaluations = [
    ...passed.map((r) => mapRule(r, 'passed')),
    ...fired.map((r) => mapRule(r, 'failed')),
    ...waiting.map((r) => mapRule(r, 'waiting')),
  ];

  const approvalScore =
    composite != null && Number.isFinite(Number(composite))
      ? Math.max(0, Math.min(100, Math.round(Number(composite))))
      : verdict === 'APPROVED' || verdict === 'PRE_APPROVED'
        ? 80
        : verdict === 'REJECTED'
          ? 20
          : 50;

  const latest = {
    evaluation_id: `credit-run-${creditRun.id || creditRun.applicationId || 'latest'}`,
    source: 'credit_decision',
    overall_decision: CREDIT_VERDICT_TO_OVERALL[verdict] || verdict.toLowerCase(),
    approval_score: approvalScore,
    risk_score: Math.max(0, 100 - approvalScore),
    policy_id: engine.rule_pack_version || creditRun.configVersion || 'CREDIT_DECISION',
    evaluated_at: creditRun.created_at || creditRun.updatedAt || creditRun.updated_at || null,
    manual_review_reason:
      verdict === 'MANUAL_REVIEW' || verdict === 'AA_CONSENT_TIMEOUT'
        ? trail.slice(-1)[0] || 'Manager review required'
        : null,
    explanation: {
      summary: trail.slice(0, 8).join(' '),
      reasoning_trail: trail,
      final_verdict: verdict,
      approved_amount: creditRun.approvedAmount ?? creditRun.approved_amount ?? null,
      cibil_band: creditRun.cibilBand || creditRun.cibil_band || null,
      feature_coverage: engine.feature_coverage || creditRun.featureCoverage || null,
    },
  };

  return { latest, evaluations, source: 'credit_decision' };
}
