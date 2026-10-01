export function isPanQuery(value) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(String(value || '').trim());
}

export function isCustomerCodeQuery(value) {
  return /^CUS\d{6,}$/i.test(String(value || '').trim());
}

export function isLeadIdQuery(value) {
  return /^(CUS\d{6,}-LM\d{2,}|LM\d{6,})$/i.test(String(value || '').trim());
}

export function isLoanAccountQuery(value) {
  return /^(CUS\d{6,}-LA\d{2,}|LAN\d{6,})$/i.test(String(value || '').trim());
}

export function isCustomerHistoryQuery(value) {
  return isPanQuery(value) || isCustomerCodeQuery(value) || isLeadIdQuery(value);
}

export function customerHistoryPath(query) {
  const q = String(query || '').trim();
  if (!q) return '/admin/customers';
  return `/admin/customers/${encodeURIComponent(q.toUpperCase())}`;
}

export function account360Path(query) {
  const q = String(query || '').trim();
  if (!q) return '/admin/accounts';
  return `/admin/accounts/${encodeURIComponent(q.toUpperCase())}`;
}

export function shortLeadLabel(leadId) {
  const s = String(leadId || '');
  const global = s.match(/^(LM\d+)$/i);
  if (global) return global[1].toUpperCase();
  const legacy = s.match(/-(LM\d+)$/i);
  return legacy ? legacy[1].toUpperCase() : leadId || '—';
}

export function shortLoanLabel(loanAccountNumber) {
  const s = String(loanAccountNumber || '');
  const global = s.match(/^(LAN\d+)$/i);
  if (global) return global[1].toUpperCase();
  const legacy = s.match(/-(LA\d+)$/i);
  return legacy ? legacy[1].toUpperCase() : loanAccountNumber || null;
}
