export function inr(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

export function formatCrifDate(value) {
  const s = String(value || '').trim();
  if (!s) return '—';
  const dmy = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return s.slice(0, 10);
  return new Date(t).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function hasValue(v) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

export function scoreBand(score) {
  // Number(null) is 0 — a missing score must never fall into "High risk"
  const n = hasValue(score) ? Number(score) : NaN;
  if (!Number.isFinite(n)) return { label: 'Unknown', tone: 'bg-slate-100 text-slate-700' };
  if (n >= 750) return { label: 'Excellent', tone: 'bg-emerald-100 text-emerald-800' };
  if (n >= 700) return { label: 'Good', tone: 'bg-sky-100 text-sky-800' };
  if (n >= 650) return { label: 'Fair', tone: 'bg-amber-100 text-amber-900' };
  if (n >= 600) return { label: 'Needs attention', tone: 'bg-orange-100 text-orange-900' };
  return { label: 'High risk', tone: 'bg-rose-100 text-rose-800' };
}

function scoreRing(score) {
  const n = Number(score);
  if (n >= 750) return 'border-emerald-400';
  if (n >= 700) return 'border-sky-400';
  if (n >= 650) return 'border-amber-400';
  if (n >= 600) return 'border-orange-400';
  return 'border-rose-400';
}

/**
 * What the stored bureau result means for staff.
 * key: scored | ntc | name_mismatch | no_score | unavailable
 */
export function bureauState(summary) {
  if (!summary) return null;
  const code = Number(summary.resultCode);
  const verification = String(summary.verificationStatus || '').toLowerCase();
  const scored = hasValue(summary.score) && Number.isFinite(Number(summary.score));

  if (verification === 'incomplete_payload' || (verification === 'pending' && !scored)) {
    return {
      key: 'unavailable',
      label: 'Report unavailable',
      tone: 'bg-slate-100 text-slate-700',
      ring: 'border-slate-300',
      ringText: '—',
      title: 'Bureau report unavailable',
      sentence:
        'The bureau response was incomplete, so there is no usable credit report. Re-fetch to try again.',
      showKpis: false,
    };
  }
  if (summary.isNewToCredit === true || code === 102 || verification === 'no_record') {
    return {
      key: 'ntc',
      label: 'No credit history (New to credit)',
      tone: 'bg-sky-100 text-sky-800',
      ring: 'border-sky-300',
      ringText: 'NTC',
      title: 'No credit history found',
      sentence:
        'No credit history found at the bureau for this customer (first-time borrower). Decide using bank statement and income.',
      showKpis: false,
    };
  }
  if (code === 103 || verification === 'name_not_found') {
    return {
      key: 'name_mismatch',
      label: 'Name not matched on bureau',
      tone: 'bg-amber-100 text-amber-900',
      ring: 'border-amber-400',
      ringText: scored ? String(summary.score) : '!',
      title: 'Name did not match the bureau record',
      sentence:
        'The bureau found a record for these details but the name did not match. Check the name against PAN, then re-fetch.',
      showKpis: scored,
    };
  }
  if (!scored) {
    return {
      key: 'no_score',
      label: 'No score (thin file)',
      tone: 'bg-slate-100 text-slate-700',
      ring: 'border-slate-300',
      ringText: '—',
      title: 'No credit score generated',
      sentence:
        'The bureau returned the file without a credit score (too little history). Review the loans below.',
      showKpis: true,
    };
  }
  const band = scoreBand(summary.score);
  return {
    key: 'scored',
    label: band.label,
    tone: band.tone,
    ring: scoreRing(summary.score),
    ringText: String(summary.score),
    title: `Credit score ${summary.score}`,
    sentence: null,
    showKpis: true,
  };
}

export function maskPan(pan) {
  const s = String(pan || '').trim().toUpperCase();
  if (s.length < 6) return s || '—';
  return `${s.slice(0, 3)}XXXX${s.slice(-3)}`;
}

export function maskMobile(mobile) {
  const s = String(mobile || '').replace(/\D/g, '');
  if (s.length < 6) return s || '—';
  return `${s.slice(0, 2)}XXXXXX${s.slice(-2)}`;
}

export function formatWhen(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString('en-IN');
  } catch {
    return String(value);
  }
}

export function firstVar(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const v = list[0]?.value ?? list[0];
  return v != null && String(v).trim() ? String(v).trim() : null;
}

export function allVars(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => (x?.value != null ? String(x.value).trim() : String(x || '').trim()))
    .filter(Boolean);
}

/** Prefer API consumer; fall back to identity_variations. */
export function resolveConsumer(detail) {
  if (detail?.consumer && (detail.consumer.name || detail.consumer.pan || detail.consumer.phones?.length)) {
    return detail.consumer;
  }
  const iv = detail?.identity_variations;
  if (!iv) return detail?.consumer || null;
  return {
    name: firstVar(iv.names),
    pan: firstVar(iv.pans)?.toUpperCase() || null,
    dob: firstVar(iv.dobs),
    gender: null,
    phones: allVars(iv.phones),
    emails: allVars(iv.emails),
    voterId: firstVar(iv.voterIds),
    address: firstVar(iv.addresses),
    addresses: allVars(iv.addresses),
  };
}

export function formatPaymentHistory(history) {
  if (!history) return [];
  if (Array.isArray(history)) return history.map(String).filter(Boolean);
  return String(history)
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);
}
