export const CUSTOMER_REJECTION_INTRO =
  "We're sorry, but your loan application could not be approved at this time.";

export const REJECTION_REASONS = [
  { id: 'low_credit_score', label: 'Low credit score' },
  { id: 'insufficient_income', label: 'Insufficient income' },
  { id: 'high_debt_burden', label: 'High debt burden / FOIR exceeded' },
  { id: 'employment_verification_failed', label: 'Employment verification failed' },
  { id: 'bank_income_mismatch', label: 'Bank statement / income mismatch' },
  { id: 'kyc_document_mismatch', label: 'KYC or document mismatch' },
  { id: 'fraud_suspicious', label: 'Fraud or suspicious activity' },
  { id: 'policy_geographic', label: 'Policy / geographic restriction' },
  { id: 'existing_overdue', label: 'Existing overdue with other lenders' },
  { id: 'other', label: 'Other', requiresNote: true },
];

export const REJECTION_REASON_LABELS = REJECTION_REASONS.map((r) => r.label);

export function buildRejectionReasonMessage(selectedIds, additionalNote = '') {
  const labels = REJECTION_REASONS.filter((r) => selectedIds.includes(r.id)).map((r) => r.label);
  const note = String(additionalNote || '').trim();
  let message = `${CUSTOMER_REJECTION_INTRO} Reasons: ${labels.join('; ')}`;
  if (note) {
    message += `. Note: ${note}`;
  }
  return message;
}

export function validateRejectionSelection(selectedIds, additionalNote = '') {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    return 'Select at least one rejection reason.';
  }
  const validIds = new Set(REJECTION_REASONS.map((r) => r.id));
  if (!selectedIds.every((id) => validIds.has(id))) {
    return 'Invalid rejection reason selected.';
  }
  if (selectedIds.includes('other') && !String(additionalNote || '').trim()) {
    return 'Please add a note when selecting Other.';
  }
  return null;
}
