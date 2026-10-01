import { verdictLabel, type CreditRun } from "./creditDecisionDisplay.ts"
import { aaNextStepMessage } from "./aaStatusDisplay.js"

const FINAL_CREDIT_VERDICTS = new Set(["PRE_APPROVED", "APPROVED", "REJECTED", "MANUAL_REVIEW", "AA_CONSENT_TIMEOUT"])

const DECISION_SAVED_STATUSES = new Set([
  "recommended",
  "approved",
  "offer_sent",
  "rejected",
  "offer_rejected",
  "esign_completed",
  "mandate_pending",
  "disbursed",
  "closed",
])

type MaybeRun = CreditRun | null | undefined

export function isCreditCheckComplete(latestCreditRun: MaybeRun) {
  const verdict = latestCreditRun?.finalVerdict || latestCreditRun?.verdict
  if (!verdict) return false
  return FINAL_CREDIT_VERDICTS.has(verdict)
}

export function isAwaitingAaConsent(latestCreditRun: MaybeRun) {
  const verdict = latestCreditRun?.finalVerdict || latestCreditRun?.verdict
  return verdict === "AWAITING_AA_CONSENT" || Boolean(latestCreditRun?.awaitingAaConsent)
}

export function isCreditHardRejected(latestCreditRun: MaybeRun) {
  const verdict = latestCreditRun?.finalVerdict || latestCreditRun?.verdict
  return verdict === "REJECTED"
}

/**
 * True while credit is still loading and we must not treat null as "never run"
 * (avoids Workflow flashing "Run credit check" before Decision saved).
 */
export function shouldDeferWorkflowCreditCta(creditLoading: unknown, latestCreditRun: MaybeRun) {
  return Boolean(creditLoading) && !latestCreditRun
}

export type NextStepTab = "kyc" | "actions" | "cam" | "history" | null

export interface NextStepAction {
  tab: NextStepTab
  runCreditCheck: boolean
  openDecision: boolean
  openCreditSheet: boolean
}

export interface NextStepInput {
  aadhaarVerified?: boolean
  panVerified?: boolean
  bankVerified?: boolean
  selfieVerified?: boolean
  latestCreditRun?: MaybeRun
  applicationStatus?: string | null
  aaStatus?: unknown
}

/**
 * Compute staff-facing next step for an application detail view.
 * Order: credit (CIBIL), Aadhaar, PAN, Bank, Selfie, final decision.
 */
export function computeApplicationNextStep({
  aadhaarVerified = false,
  panVerified = false,
  bankVerified = false,
  selfieVerified = false,
  latestCreditRun = null,
  applicationStatus = "",
  aaStatus = null,
}: NextStepInput = {}) {
  const statusLower = String(applicationStatus || "").toLowerCase()
  const creditDone = isCreditCheckComplete(latestCreditRun)
  const applicationRejected = statusLower === "rejected"

  const steps = [
    {
      id: "credit",
      label: "Credit check",
      done: creditDone,
      inProgress: isAwaitingAaConsent(latestCreditRun),
    },
    { id: "aadhaar", label: "Aadhaar", done: aadhaarVerified },
    { id: "pan", label: "PAN", done: panVerified },
    { id: "bank", label: "Bank", done: bankVerified },
    { id: "selfie", label: "Selfie", done: selfieVerified },
    {
      id: "decision",
      label: "Final decision",
      done: DECISION_SAVED_STATUSES.has(statusLower),
    },
  ]

  let nextMessage = ""
  let nextAction: NextStepAction = { tab: null, runCreditCheck: false, openDecision: false, openCreditSheet: false }
  let ctaLabel = "Go to step"

  // Only application_status rejected stops the journey; credit REJECTED is advisory.
  if (applicationRejected) {
    nextMessage = "Application rejected — view credit check or history"
    nextAction = { tab: null, runCreditCheck: false, openDecision: false, openCreditSheet: true }
    ctaLabel = "View credit check"
  } else if (!latestCreditRun) {
    nextMessage = "Run credit check (CIBIL) before Digilocker KYC"
    nextAction = { tab: null, runCreditCheck: true, openDecision: false, openCreditSheet: true }
    ctaLabel = "Run credit check"
  } else if (isAwaitingAaConsent(latestCreditRun)) {
    nextMessage = aaStatus ? aaNextStepMessage(aaStatus) : "Waiting for bank consent — share the Digitap link"
    nextAction = { tab: null, runCreditCheck: false, openDecision: false, openCreditSheet: true }
    ctaLabel = "Open credit check"
  } else if (!creditDone) {
    nextMessage = "Re-run credit check for a clear suggestion"
    nextAction = { tab: null, runCreditCheck: true, openDecision: false, openCreditSheet: true }
    ctaLabel = "Run credit check"
  } else if (!aadhaarVerified) {
    nextMessage = "Complete Aadhaar verification"
    nextAction = { tab: "kyc", runCreditCheck: false, openDecision: false, openCreditSheet: false }
    ctaLabel = "Open Digitap KYC"
  } else if (!panVerified) {
    nextMessage = "Verify PAN details"
    nextAction = { tab: "kyc", runCreditCheck: false, openDecision: false, openCreditSheet: false }
    ctaLabel = "Check PAN"
  } else if (!bankVerified) {
    nextMessage = "Verify bank account (₹1)"
    nextAction = { tab: "kyc", runCreditCheck: false, openDecision: false, openCreditSheet: false }
    ctaLabel = "Verify bank"
  } else if (!selfieVerified) {
    nextMessage = "Complete selfie match & liveness"
    nextAction = { tab: "kyc", runCreditCheck: false, openDecision: false, openCreditSheet: false }
    ctaLabel = "Complete selfie"
  } else if (!DECISION_SAVED_STATUSES.has(statusLower)) {
    const verdictLabelText = verdictLabel(latestCreditRun.finalVerdict)
    nextMessage = `Suggestion: ${verdictLabelText} — recommend or reject`
    nextAction = { tab: "actions", runCreditCheck: false, openDecision: true, openCreditSheet: false }
    ctaLabel = "Open final decision"
  } else if (statusLower === "recommended") {
    // CM recommend saved; UW must still Approve & issue LAN on CAM
    nextMessage = "Recommended — Underwriter: Approve & issue LAN on CAM"
    nextAction = { tab: "cam", runCreditCheck: false, openDecision: false, openCreditSheet: false }
    ctaLabel = "Open CAM"
  } else if (statusLower === "approved") {
    nextMessage = "Sanctioned — Send offer to the customer on Actions"
    nextAction = { tab: "actions", runCreditCheck: false, openDecision: true, openCreditSheet: false }
    ctaLabel = "Send offer"
  } else if (statusLower === "offer_sent") {
    nextMessage = "Offer sent — waiting for customer to accept"
    nextAction = { tab: null, runCreditCheck: false, openDecision: false, openCreditSheet: false }
    ctaLabel = "All done"
  } else if (statusLower === "offer_rejected" || statusLower === "rejected") {
    nextMessage = "Decision saved — application closed"
    nextAction = { tab: "history", runCreditCheck: false, openDecision: false, openCreditSheet: false }
    ctaLabel = "View history"
  } else {
    nextMessage = "Decision saved"
    nextAction = { tab: null, runCreditCheck: false, openDecision: false, openCreditSheet: false }
    ctaLabel = "All done"
  }

  const kycComplete = aadhaarVerified && panVerified && bankVerified && selfieVerified
  const completedCount = steps.filter((s) => s.done).length

  return {
    steps,
    nextMessage,
    nextAction,
    ctaLabel,
    kycComplete,
    completedCount,
    totalSteps: steps.length,
  }
}

export function buildCustomerAaConsentMessage(customerName?: string | null, hostedUrl?: string | null) {
  const name = customerName ? `Hi ${customerName}, ` : "Hi, "
  const linkLine = hostedUrl
    ? ` Open this secure link to share your bank statement: ${hostedUrl}`
    : " We will send you a secure Digitap bank link to approve Account Aggregator consent."
  return (
    `${name}please complete one-time RBI-approved bank consent for your loan application.${linkLine} ` +
    "We do not need your bank password. Call us when you have finished."
  )
}
