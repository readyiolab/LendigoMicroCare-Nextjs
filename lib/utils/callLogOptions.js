/** Shared call-log purposes / outcomes for the call logs sheet, tab and history views. */

export const CALL_PURPOSES = [
  'PD call',
  'Document follow-up',
  'Verification',
  'Offer discussion',
  'Collection / repayment',
  'General follow-up',
];

const TONES = {
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pill: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    pill: 'border-amber-300 bg-amber-50 text-amber-900',
    dot: 'bg-amber-500',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    pill: 'border-rose-300 bg-rose-50 text-rose-800',
    dot: 'bg-rose-500',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    pill: 'border-slate-400 bg-slate-100 text-slate-800',
    dot: 'bg-slate-400',
  },
};

export const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected', tone: 'emerald' },
  { value: 'interested', label: 'Interested', tone: 'emerald' },
  { value: 'callback', label: 'Call back later', tone: 'amber' },
  { value: 'busy', label: 'Busy', tone: 'amber' },
  { value: 'not_reachable', label: 'Not reachable / switched off', tone: 'rose' },
  { value: 'wrong_number', label: 'Wrong number', tone: 'rose' },
  { value: 'not_interested', label: 'Not interested', tone: 'slate' },
];

// Values written by older screens or reference verification
const LEGACY_OUTCOMES = {
  not_connected: { label: 'Not connected', tone: 'rose' },
};

export const CONNECTED_OUTCOMES = new Set(['connected', 'interested']);

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function outcomeMeta(status) {
  const key = String(status || '').toLowerCase();
  const known = CALL_OUTCOMES.find((o) => o.value === key) || LEGACY_OUTCOMES[key];
  const tone = known?.tone || 'slate';
  return {
    value: key,
    label: known?.label || (key ? titleCase(key) : 'Remark'),
    tone,
    classes: TONES[tone],
  };
}

export function toneClasses(tone) {
  return TONES[tone] || TONES.slate;
}

/** Remarks are stored as "[Purpose] text" — split them back apart. */
export function parseCallRemarks(remarks) {
  const s = String(remarks || '').trim();
  const m = s.match(/^\[([^\]]{1,60})\]\s*([\s\S]*)$/);
  if (!m) return { purpose: null, text: s };
  return { purpose: m[1].trim(), text: m[2].trim() };
}

export function formatCallWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
