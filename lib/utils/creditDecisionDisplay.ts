/* Credit-run payloads come straight from the backend; fields are read defensively. */
type Loose = Record<string, unknown>
type RuleRow = Loose & { tier_id?: string }

export interface FeatureCoverage {
  bank_mapped?: number
  [key: string]: unknown
}

interface SuggestedTerms {
  fired_rules?: RuleRow[]
  passed_rules?: RuleRow[]
  waiting_aa?: RuleRow[]
  not_in_crif?: RuleRow[]
  all_rules?: RuleRow[]
  rules_total?: number
  feature_coverage?: FeatureCoverage
  income_bureau_eligibility?: EligibilityAssessment
  eligible_amount?: number
}

interface EligibilityAssessment {
  final_eligible_amount?: number
  bureau_eligible_amount?: number
  highest_comparable_bureau_loan?: number
  income_eligible_amount?: number
  product_max_limit?: number
  proposed_loan_amount?: number
  decision?: string
  decision_reason?: string
  salary_verification_status?: string
  flags?: unknown
}

export interface CreditRun {
  finalVerdict?: string
  final_verdict?: string
  verdict?: string
  awaitingAaConsent?: boolean
  aaConsentStatus?: string
  aa_consent_status?: string
  engine_phase?: string
  enginePhase?: string
  _creditView?: string
  fired_rules?: RuleRow[]
  passed_rules?: RuleRow[]
  waiting_aa_rules?: RuleRow[]
  waiting_aa?: RuleRow[]
  not_in_crif_rules?: RuleRow[]
  not_in_crif?: RuleRow[]
  all_rules?: RuleRow[]
  suggested_terms?: SuggestedTerms
  feature_coverage?: FeatureCoverage
  engineResult?: { feature_coverage?: FeatureCoverage }
  eligibilityAssessment?: EligibilityAssessment
  eligibleAmount?: number | null
  approvedAmount?: number | null
  eligibilityDecision?: string
  cibil_snapshot?: { score?: number }
  cibilReport?: { score?: number }
  cibilBand?: string
  staff_summary?: string
  reasoning_summary?: string
  [key: string]: unknown
}

export const VERDICT_LABELS: Record<string, string> = {
  PRE_APPROVED: "Strong credit — suggested approval",
  APPROVED: "Good case — suggested approval",
  REJECTED: "Not eligible",
  MANUAL_REVIEW: "Needs manager review",
  AWAITING_AA_CONSENT: "Waiting for customer bank consent",
  AA_CONSENT_TIMEOUT: "Bank consent not received in time",
}

export const BAND_LABELS: Record<string, string> = {
  excellent: "Strong (750+)",
  medium: "Average",
  low: "Weak",
  ntc: "No credit history yet",
  unavailable: "Bureau report not received",
}

export const AA_CLEANLINESS_LABELS: Record<string, string> = {
  clean: "Bank statement looks good",
  dirty: "Bank statement has problems",
  borderline: "Bank statement unclear",
}

export const RULE_ACTION_LABELS: Record<string, string> = {
  AUTO_DECLINE: "Auto decline",
  AUTO_APPROVE: "Auto approve",
  MANUAL_REVIEW: "Manual review",
  HOLD_FOR_MORE_DATA: "Hold — more data",
  REFRESH_BUREAU_PULL: "Refresh bureau",
  SCORE_BONUS: "Score bonus",
  MANUAL_REVIEW_ALT_SCORECARD: "Alt scorecard review",
}

export function verdictLabel(code?: string | null) {
  return (code && VERDICT_LABELS[code]) || code || "—"
}

export function bandLabel(code?: string | null) {
  return (code && BAND_LABELS[code]) || code || "—"
}

export function aaCleanlinessLabel(code?: string | null) {
  return (code && AA_CLEANLINESS_LABELS[code]) || code || "—"
}

export function ruleActionLabel(code?: string | null) {
  return (code && RULE_ACTION_LABELS[code]) || code || "—"
}

export function ruleStatusLabel(status?: string | null) {
  const map: Record<string, string> = {
    FIRED: "Fired",
    PASSED: "Passed",
    WAITING_AA: "Waiting for AA",
    NOT_IN_CRIF: "Missing in CRIF",
    NOT_EVALUATED: "Not evaluated",
    PARSE_ERROR: "Parse error",
  }
  return (status && map[status]) || status || "—"
}

/** Group fired rules by tier for display */
export function groupFiredRulesByTier(firedRules: RuleRow[] = []) {
  const groups: Record<string, RuleRow[]> = {}
  for (const rule of firedRules) {
    const tier = rule.tier_id || "OTHER"
    if (!groups[tier]) groups[tier] = []
    groups[tier].push(rule)
  }
  return groups
}

export function groupRulesByStatus(result?: CreditRun | null) {
  const fired = result?.fired_rules || result?.suggested_terms?.fired_rules || []
  const passed = result?.passed_rules || result?.suggested_terms?.passed_rules || []
  const waiting = result?.waiting_aa_rules || result?.waiting_aa || result?.suggested_terms?.waiting_aa || []
  const missing = result?.not_in_crif_rules || result?.not_in_crif || result?.suggested_terms?.not_in_crif || []
  const all = result?.all_rules || result?.suggested_terms?.all_rules || []
  const total =
    all.length ||
    fired.length + passed.length + waiting.length + missing.length ||
    result?.suggested_terms?.rules_total ||
    52
  return { fired, passed, waiting, missing, all, total }
}

export function getFeatureCoverage(result?: CreditRun | null): FeatureCoverage | null {
  return (
    result?.feature_coverage ||
    result?.engineResult?.feature_coverage ||
    result?.suggested_terms?.feature_coverage ||
    null
  )
}

export type CreditPhaseKey = "paused" | "full" | "bureau" | null

/** Phase for Feature Risk / Credit sheet copy. */
export function resolveCreditPhase(
  creditRun?: CreditRun | null,
  coverage: FeatureCoverage | null = null
): { key: CreditPhaseKey; text: string | null } {
  if (!creditRun) return { key: null, text: null }
  const cov = coverage || getFeatureCoverage(creditRun)
  const verdict = String(creditRun.finalVerdict || creditRun.final_verdict || "").toUpperCase()
  const awaiting = Boolean(creditRun.awaitingAaConsent) || verdict === "AWAITING_AA_CONSENT"
  const bankMapped = cov?.bank_mapped ?? 0
  const hasBank = bankMapped > 0

  if (awaiting || verdict === "AWAITING_AA_CONSENT") {
    return {
      key: "paused",
      text: "Paused — CRIF done, waiting for bank consent. Bank rules do not affect this verdict yet.",
    }
  }
  if (hasBank) {
    return { key: "full", text: "Finished on CRIF + bank." }
  }
  if (["PRE_APPROVED", "REJECTED", "MANUAL_REVIEW", "AA_CONSENT_TIMEOUT"].includes(verdict)) {
    return { key: "bureau", text: "Finished on bureau only (AA not required)." }
  }
  if (bankMapped === 0) {
    return {
      key: "paused",
      text: "Paused — CRIF done, waiting for bank consent. Bank rules do not affect this verdict yet.",
    }
  }
  return { key: null, text: null }
}

/**
 * Bank coverage badge suffix; never say "remap pending" on bureau-only finals.
 * @returns e.g. " (bureau only)" or ""
 */
export function bankCoverageSuffix(creditRun?: CreditRun | null, coverage: FeatureCoverage | null = null) {
  const cov = coverage || getFeatureCoverage(creditRun)
  const bankMapped = cov?.bank_mapped ?? 0
  if (bankMapped > 0) return ""

  const phase = resolveCreditPhase(creditRun, cov)
  if (phase.key === "paused") return " (AA pending)"

  const aaStatus = String(creditRun?.aaConsentStatus || creditRun?.aa_consent_status || "").toLowerCase()
  const enginePhase = String(creditRun?.engine_phase || creditRun?.enginePhase || "").toLowerCase()
  const aaDone = aaStatus === "granted" || aaStatus === "report_ready" || enginePhase === "full"
  if (aaDone) return " (remap pending)"

  if (phase.key === "bureau") return " (bureau only)"
  return " (AA pending)"
}

/** True when UI must fetch view=detail to show FIRED/WAITING rule rows. */
export function lacksCreditRuleBuckets(result?: CreditRun | null) {
  if (!result) return false
  if (result._creditView === "detail") return false
  if (result._creditView === "summary") return true
  const fired = result.fired_rules || result.suggested_terms?.fired_rules
  const all = result.all_rules || result.suggested_terms?.all_rules
  const waiting = result.waiting_aa || result.waiting_aa_rules || result.suggested_terms?.waiting_aa
  return !Array.isArray(fired) && !Array.isArray(all) && !Array.isArray(waiting)
}

export function getEligibilityBreakdown(result?: CreditRun | null) {
  const assessment = result?.eligibilityAssessment || result?.suggested_terms?.income_bureau_eligibility || null
  if (!assessment && result?.eligibleAmount == null && result?.approvedAmount == null) {
    return null
  }
  return {
    eligible:
      result?.eligibleAmount ??
      result?.suggested_terms?.eligible_amount ??
      assessment?.final_eligible_amount ??
      result?.approvedAmount ??
      null,
    bureau: assessment?.bureau_eligible_amount ?? assessment?.highest_comparable_bureau_loan ?? null,
    income: assessment?.income_eligible_amount ?? null,
    productMax: assessment?.product_max_limit ?? null,
    requested: assessment?.proposed_loan_amount ?? null,
    decision: assessment?.decision || result?.eligibilityDecision || null,
    reason: assessment?.decision_reason || null,
    incomePending:
      assessment?.salary_verification_status === "unverified" ||
      (Array.isArray(assessment?.flags) && assessment.flags.includes("income_pending_aa")),
    cibilScore: result?.cibil_snapshot?.score ?? result?.cibilReport?.score ?? null,
    cibilBand: result?.cibilBand || null,
  }
}

/** Plain-English fallback if API has no staff_summary (older runs). */
export function defaultStaffSummary(result?: CreditRun | null) {
  if (!result) return ""
  if (result.staff_summary) return result.staff_summary

  const verdict = result.finalVerdict || result.verdict
  if (verdict === "AWAITING_AA_CONSENT") {
    return "Ask the customer to complete the Digitap secure bank link (Account Aggregator). When they confirm, click “Check again after customer approves”."
  }
  return result.reasoning_summary || ""
}
