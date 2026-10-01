/**
 * Plain-language Account Aggregator (Digitap bank consent) state for staff screens.
 * Driven by the AA status API: { status, reason, reportReady, linkExpired, hostedUrl }.
 *
 * action: 'start' | 'share_link' | 'generate_link' | 'wait' | 'none'
 */

const TONES = {
  neutral: {
    box: 'border-slate-200 bg-slate-50 text-slate-900',
    badge: 'bg-slate-100 text-slate-700',
    dot: 'bg-slate-400',
  },
  info: {
    box: 'border-sky-200 bg-sky-50 text-sky-950',
    badge: 'bg-sky-100 text-sky-800',
    dot: 'bg-sky-500',
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-amber-950',
    badge: 'bg-amber-100 text-amber-900',
    dot: 'bg-amber-500',
  },
  danger: {
    box: 'border-rose-200 bg-rose-50 text-rose-950',
    badge: 'bg-rose-100 text-rose-800',
    dot: 'bg-rose-500',
  },
  success: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    badge: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-500',
  },
};

const STATES = {
  not_started: {
    tone: 'neutral',
    label: 'Not started',
    title: 'Bank consent not started',
    description: 'No bank link has been created for this application yet.',
    action: 'start',
    showLink: false,
    poll: false,
  },
  waiting: {
    tone: 'warning',
    label: 'Waiting for customer',
    title: 'Link sent — waiting for the customer',
    description:
      'Share the secure bank link with the customer (WhatsApp / SMS). This page updates by itself once they finish.',
    action: 'share_link',
    showLink: true,
    poll: true,
  },
  in_progress: {
    tone: 'info',
    label: 'Customer is on the bank page',
    title: 'Customer is completing bank consent',
    description:
      'The customer opened the link and is approving access with their bank. Give them a few minutes — no action needed.',
    action: 'wait',
    showLink: true,
    poll: true,
  },
  processing: {
    tone: 'info',
    label: 'Preparing bank report',
    title: 'Consent given — preparing bank report',
    description:
      'The customer approved bank access. Digitap is preparing the bank statement; this usually takes a minute or two.',
    action: 'wait',
    showLink: false,
    poll: true,
  },
  report_ready: {
    tone: 'success',
    label: 'Bank report received',
    title: 'Bank report received',
    description: 'The customer shared bank data through Account Aggregator. Bank analysis is shown below.',
    action: 'none',
    showLink: false,
    poll: false,
  },
  cancelled: {
    tone: 'danger',
    label: 'Customer cancelled',
    title: 'Customer cancelled bank consent',
    description:
      'The customer closed or cancelled the bank page before finishing. Call the customer, then generate a new link and share it.',
    action: 'generate_link',
    showLink: false,
    poll: false,
  },
  rejected: {
    tone: 'danger',
    label: 'Customer rejected',
    title: 'Customer rejected bank consent',
    description:
      'The customer declined to share bank data. Confirm with the customer — generate a new link or collect a PDF bank statement.',
    action: 'generate_link',
    showLink: false,
    poll: false,
  },
  expired: {
    tone: 'warning',
    label: 'Link expired',
    title: 'Bank link expired',
    description: 'The customer did not finish before the link expired. Generate a new link and share it.',
    action: 'generate_link',
    showLink: false,
    poll: false,
  },
  failed: {
    tone: 'danger',
    label: 'Consent failed',
    title: 'Bank consent failed',
    description:
      'Digitap reported a failure for this attempt (see technical details). Generate a new link to try again.',
    action: 'generate_link',
    showLink: false,
    poll: false,
  },
};

function resolveStateKey(aaStatus) {
  if (!aaStatus) return 'not_started';
  const status = String(aaStatus.status || '').toLowerCase();
  const reason = String(aaStatus.reason || '').toLowerCase();

  if (aaStatus.reportReady || status === 'report_ready' || reason === 'report_ready') {
    return 'report_ready';
  }
  if (status === 'not_initiated') return 'not_started';
  if (status === 'granted') return 'processing';
  if (status === 'denied') return 'rejected';
  if (status === 'timeout') return 'expired';
  if (status === 'failed') {
    return STATES[reason] && ['cancelled', 'rejected', 'expired'].includes(reason) ? reason : 'failed';
  }

  // pending / in_progress
  if (['cancelled', 'rejected', 'failed'].includes(reason)) return reason;
  if (reason === 'expired' || aaStatus.linkExpired) return 'expired';
  if (reason === 'processing') return 'processing';
  if (reason === 'in_progress') return 'in_progress';
  return 'waiting';
}

export function aaStatusDisplay(aaStatus) {
  const key = resolveStateKey(aaStatus);
  const state = STATES[key];
  return {
    key,
    ...state,
    toneClasses: TONES[state.tone],
    showLink: state.showLink && Boolean(aaStatus?.hostedUrl),
  };
}

/** Short one-line text for workflow banners ("next step"). */
export function aaNextStepMessage(aaStatus) {
  const d = aaStatusDisplay(aaStatus);
  switch (d.key) {
    case 'waiting':
      return 'Waiting for bank consent — share the Digitap link';
    case 'in_progress':
      return 'Customer is completing bank consent — no action needed';
    case 'processing':
      return 'Bank consent given — preparing bank report';
    case 'report_ready':
      return 'Bank report received — re-run credit check';
    case 'cancelled':
      return 'Customer cancelled bank consent — generate a new link';
    case 'rejected':
      return 'Customer rejected bank consent — call the customer';
    case 'expired':
      return 'Bank link expired — generate a new link';
    case 'failed':
      return 'Bank consent failed — generate a new link';
    default:
      return 'Waiting for bank consent — share the Digitap link';
  }
}
