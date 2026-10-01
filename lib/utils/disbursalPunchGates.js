/**
 * Gates for applying bank UTR / punching disbursement from application profile.
 */

const PUNCH_ROLES = new Set(['operations', 'operations_manager', 'super_admin', 'underwriter']);

export function normalizeStaffRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function canPunchDisbursalRole(role) {
  return PUNCH_ROLES.has(normalizeStaffRole(role));
}

export function isMandateRegisteredForPunch(loanApp, mandateRegistration) {
  return (
    String(loanApp?.mandate_status || '').toLowerCase() === 'registered' ||
    String(mandateRegistration?.status || '').toLowerCase() === 'registered'
  );
}

/**
 * Same readiness as DisbursementTab: payment_pending + mandate registered, not already disbursed.
 */
export function isPunchReady({ loanApp, mandateRegistration } = {}) {
  if (!loanApp) return false;
  if (String(loanApp.application_status || '').toLowerCase() === 'disbursed') return false;
  if (String(loanApp.application_status || '').toLowerCase() !== 'payment_pending') return false;
  return isMandateRegisteredForPunch(loanApp, mandateRegistration);
}

export function canShowPunchUpdateButton({ loanApp, mandateRegistration, role } = {}) {
  return canPunchDisbursalRole(role) && isPunchReady({ loanApp, mandateRegistration });
}
