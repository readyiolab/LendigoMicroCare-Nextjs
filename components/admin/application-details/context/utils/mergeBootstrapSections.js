/**
 * When a background bootstrap refresh returns empty placeholders for lazy
 * sections, keep previously loaded section data so tabs do not flash empty.
 */

export const SECTION_CACHE_KEYS = [
  'residenceProofs',
  'bankStatements',
  'salarySlips',
  'esignDocs',
  'otherDocuments',
  'documentRemarks',
  'kyc_details',
  'selfie',
  'bankDetails',
  'mandateRegistration',
  'steps',
  'pan_verification',
  'videoDeclaration',
];

export const KEY_TO_SECTION = {
  residenceProofs: 'documents',
  bankStatements: 'documents',
  salarySlips: 'documents',
  esignDocs: 'documents',
  otherDocuments: 'documents',
  documentRemarks: 'documents',
  kyc_details: 'kyc',
  selfie: 'kyc',
  pan_verification: 'kyc',
  bankDetails: 'bank',
  mandateRegistration: 'bank',
  steps: 'journey',
  videoDeclaration: 'kyc',
};

function isIncomingEmpty(key, incoming, cached) {
  return (
    incoming == null ||
    (Array.isArray(incoming) && incoming.length === 0) ||
    (key === 'kyc_details' &&
      incoming &&
      !incoming.aadhaar_photo_url &&
      cached?.aadhaar_photo_url) ||
    (key === 'selfie' &&
      incoming &&
      !(incoming.selfie_display_url || incoming.display_url || incoming.selfie_url) &&
      (cached?.selfie_display_url || cached?.display_url || cached?.selfie_url))
  );
}

/**
 * @param {object|null} prev - previous application detail data
 * @param {object} fullData - fresh bootstrap payload
 * @param {{ isBackground?: boolean, invalidateSections?: string[]|null }} options
 */
export function mergeBootstrapSections(prev, fullData, { isBackground = false, invalidateSections = null } = {}) {
  if (!isBackground || !prev) {
    return fullData;
  }

  const invalidated = new Set(Array.isArray(invalidateSections) ? invalidateSections : []);
  const next = { ...fullData };

  for (const key of SECTION_CACHE_KEYS) {
    const sectionName = KEY_TO_SECTION[key];
    if (sectionName && invalidated.has(sectionName)) continue;
    const incoming = next[key];
    const cached = prev[key];
    if (isIncomingEmpty(key, incoming, cached) && cached != null) {
      next[key] = cached;
    }
  }

  next.sectionsLoaded = {
    ...(prev.sectionsLoaded || {}),
    ...(fullData.sectionsLoaded || {}),
  };
  if (invalidated.has('documents')) next.sectionsLoaded.documents = false;
  if (invalidated.has('kyc')) next.sectionsLoaded.kyc = false;
  if (invalidated.has('bank')) next.sectionsLoaded.bank = false;
  if (invalidated.has('journey')) next.sectionsLoaded.journey = false;
  return next;
}
