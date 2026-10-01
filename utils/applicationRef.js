/**
 * Public application reference for admin URLs (lead_id / LAN, not BL application_number).
 */
export function getApplicationRef(app) {
  if (!app) return '';
  if (typeof app === 'string') return app;
  return (
    app.lead_id ||
    app.leadId ||
    app.loan_account_number ||
    app.loanAccountNumber ||
    String(app.id || '')
  );
}

export function applicationDetailPath(appOrRef) {
  const ref = getApplicationRef(appOrRef);
  return ref ? `/admin/applications/${encodeURIComponent(ref)}` : '/admin/applications';
}
