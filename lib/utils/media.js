/**
 * Prefer backend-resolved display URLs (selfie_display_url, aadhaar_photo_display_url).
 * Falls back to storage URL for legacy responses.
 */

export function pickDisplayUrl(source, displayKeys = [], storageKeys = []) {
  if (!source) return null;

  if (typeof source === 'string' && source.trim()) {
    return source.trim();
  }

  for (const key of displayKeys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  for (const key of storageKeys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

/** Selfie URL ready for <img src> (from API or nested application payload). */
export function pickSelfieDisplayUrl(source) {
  if (!source) return null;

  const selfie = source.selfie || source;
  return pickDisplayUrl(
    selfie,
    ['selfie_display_url', 'display_url'],
    ['selfie_url', 'url', 'previousSelfieDisplayUrl', 'previousSelfieUrl']
  ) || pickDisplayUrl(source, ['previousSelfieDisplayUrl'], ['previousSelfieUrl']);
}

/** Aadhaar / KYC photo URL ready for <img src>. */
export function pickKycPhotoDisplayUrl(kyc) {
  if (!kyc) return null;
  return pickDisplayUrl(
    kyc,
    ['aadhaar_photo_display_url'],
    ['aadhaar_photo_url', 'aadhaarPhotoUrl']
  );
}

/** @deprecated use pickSelfieDisplayUrl */
export function resolveSelfieUrl(source) {
  return pickSelfieDisplayUrl(source);
}

/** @deprecated backend returns display URLs; kept for rare legacy paths */
export async function getAccessibleImageUrl(storageUrl) {
  if (!storageUrl || typeof storageUrl !== 'string') return null;
  return storageUrl.trim();
}

export const getAccessibleFileUrl = getAccessibleImageUrl;
