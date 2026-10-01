/**
 * Credit check can run before Digitap KYC (CIBIL-first).
 * Demographics come from eligibility / profile; missing CRIF fields use the missing-fields dialog.
 */
export function evaluateCreditDecisionGates(): { ready: boolean; missing: string[]; message: string | null } {
  return {
    ready: true,
    missing: [],
    message: null,
  }
}
