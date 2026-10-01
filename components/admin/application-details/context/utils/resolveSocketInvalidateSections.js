/**
 * Map socket APPLICATION_UPDATED / KYC webhook payloads to which lazy
 * application-detail sections should be invalidated (soft-refetched).
 *
 * Always pair with fetchApplication(true, sections) — core app fields still refresh.
 *
 * @param {object|null|undefined} event
 * @param {{ source?: 'application_updated' | 'kyc_webhook' | 'esign_success' }} [options]
 * @returns {string[]}
 */
export function resolveSocketInvalidateSections(event, options = {}) {
  const DEFAULT = ['documents', 'kyc', 'bank', 'journey'];
  const source = String(options.source || 'application_updated').toLowerCase();

  if (source === 'kyc_webhook') {
    return ['kyc', 'documents'];
  }
  if (source === 'esign_success') {
    return ['documents', 'kyc'];
  }

  const type = String(event?.type || '').toLowerCase().replace(/-/g, '_');
  const status = String(event?.status || '').toLowerCase();
  const message = String(event?.message || '').toLowerCase();

  if (
    type === 'esign_initiated' ||
    type === 'esign_completed' ||
    type === 'esign_error' ||
    status === 'esign_completed' ||
    status.includes('esign')
  ) {
    return ['documents', 'kyc'];
  }

  if (
    type === 'document_uploaded' ||
    type === 'documents_updated' ||
    type === 'document_updated' ||
    type.includes('document')
  ) {
    if (
      type.includes('bank') ||
      type.includes('statement') ||
      message.includes('bank statement')
    ) {
      return ['documents', 'bank'];
    }
    return ['documents'];
  }

  if (type.includes('kyc') || type.includes('digio') || type.includes('digilocker')) {
    return ['kyc', 'documents'];
  }

  if (type.includes('bank') || type.includes('mandate') || type.includes('penny')) {
    return ['bank', 'kyc'];
  }

  return DEFAULT;
}

export const ALL_LAZY_SECTIONS = ['documents', 'kyc', 'bank', 'journey'];
