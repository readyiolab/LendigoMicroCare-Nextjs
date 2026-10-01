/**
 * Customer-facing loan identity (banking-style).
 * Prefer Loan Account Number; before LAN exists use Lead ID.
 * Never surface application_number to customers or legal docs.
 */
export function customerLoanRef(app) {
  if (!app || typeof app !== 'object') return null;
  return (
    app.loan_account_number ||
    app.loanAccountNumber ||
    app.lead_id ||
    app.leadId ||
    null
  );
}

export function customerLoanRefLabel(app) {
  if (!app || typeof app !== 'object') return 'Reference';
  if (app.loan_account_number || app.loanAccountNumber) return 'Loan account number';
  if (app.lead_id || app.leadId) return 'Lead ID';
  return 'Reference';
}
