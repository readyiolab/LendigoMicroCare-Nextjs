/**
 * Customer-facing status copy for Dashboard application status card.
 * Returns { title, body, tone, showSanctionLetter? }
 * tone: 'neutral' | 'success' | 'warning' | 'info'
 */

const STATUS_MESSAGES = {
  submitted: {
    title: 'Application under review',
    body: 'Our team is verifying your details. This usually takes 24–48 hours.',
    tone: 'neutral',
  },
  under_review: {
    title: 'Application under review',
    body: 'Our team is verifying your details. This usually takes 24–48 hours.',
    tone: 'neutral',
  },
  offer_sent: {
    title: 'Your loan offer is ready',
    body: 'Review the sanction letter, then accept by recording a short video declaration.',
    tone: 'info',
  },
  offer_accepted: {
    title: 'Offer accepted',
    body: 'We are processing the next steps. Disbursement usually takes 2–4 hours.',
    tone: 'success',
    showSanctionLetter: true,
  },
  approved: {
    title: 'Congratulations! Your loan is approved.',
    body: 'We are processing the next steps. Disbursement usually takes 2–4 hours.',
    tone: 'success',
    showSanctionLetter: true,
  },
  mandate_pending: {
    title: 'Action required: complete bank auto-debit',
    body: 'Authorize EMI auto-debit (eNACH) with your bank. Disbursement starts after this step.',
    tone: 'warning',
    showSanctionLetter: true,
    showMandateCta: true,
  },
  payment_pending: {
    title: 'Auto-debit registered',
    body: 'Your amount will be disbursed within 15 minutes.',
    tone: 'success',
    showSanctionLetter: true,
  },
  video_declaration_pending: {
    title: 'Action required: upload video declaration',
    body: 'Please scroll up and upload your video declaration to proceed.',
    tone: 'warning',
  },
  video_declaration_submitted: {
    title: 'Video under review',
    body: 'Your video is being verified. Please wait.',
    tone: 'warning',
  },
  video_declaration_rejected: {
    title: 'Video declaration rejected',
    body: 'Please scroll up and re-record your video declaration.',
    tone: 'warning',
  },
  esign_pending: {
    title: 'Video verified — e-sign required',
    body: 'Your video has been verified. Please scroll up and sign your loan agreement.',
    tone: 'success',
  },
  esign_completed: {
    title: 'Agreement signed',
    body: 'Your amount will be disbursed within 15 minutes.',
    tone: 'success',
    showSanctionLetter: true,
  },
  disbursed: {
    title: 'Loan disbursed',
    body: 'Your loan has been disbursed. Manage repayment from your dashboard.',
    tone: 'success',
  },
};

const TONE_STYLES = {
  neutral: {
    container: 'bg-slate-50 border-slate-200',
    title: 'text-slate-900',
    body: 'text-slate-600',
    icon: 'text-slate-600',
  },
  info: {
    container: 'bg-cyan-50 border-cyan-200',
    title: 'text-cyan-900',
    body: 'text-cyan-800',
    icon: 'text-cyan-700',
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200',
    title: 'text-emerald-900',
    body: 'text-emerald-800',
    icon: 'text-emerald-700',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200',
    title: 'text-amber-900',
    body: 'text-amber-800',
    icon: 'text-amber-700',
  },
};

export function getCustomerStatusMessage(status) {
  const key = String(status || '').toLowerCase();
  const message = STATUS_MESSAGES[key] || {
    title: 'Application received',
    body: 'Our team is reviewing your details. Verification usually takes 24–48 hours.',
    tone: 'neutral',
  };
  const styles = TONE_STYLES[message.tone] || TONE_STYLES.neutral;
  return { ...message, styles };
}

export function getCustomerStatusCardTone(status) {
  const { tone } = getCustomerStatusMessage(status);
  if (tone === 'success') return 'border-emerald-200 bg-white';
  if (tone === 'warning') return 'border-amber-200 bg-white';
  if (tone === 'info') return 'border-cyan-200 bg-white';
  return 'border-slate-200 bg-white';
}
