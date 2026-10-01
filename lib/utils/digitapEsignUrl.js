/**
 * Digitap Digi-Sign standalone signing URL (Guide v1.9).
 * Backend stores Digitap docId in application.esign_request_id.
 */
const DEFAULT_SDK_PAGE = 'https://sdk.digitap.ai/e-sign/templateesignprocess.html';

export function buildDigitapEsignStandaloneUrl(docId, options = {}) {
  if (!docId) return null;
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://loan.lendigomicrocare.com';
  const redirect =
    options.redirectUrl ||
    process.env.NEXT_PUBLIC_DIGITAP_ESIGN_REDIRECT_URL ||
    `${origin}/dashboard?esign=success`;
  const errorUrl =
    options.errorUrl ||
    process.env.NEXT_PUBLIC_DIGITAP_ESIGN_ERROR_URL ||
    `${origin}/dashboard?esign=error`;
  const page = String(
    options.sdkPage || process.env.NEXT_PUBLIC_DIGITAP_ESIGN_SDK_PAGE || DEFAULT_SDK_PAGE
  ).replace(/\?.*$/, '');
  const params = new URLSearchParams({
    docId: String(docId),
    redirect_url: redirect,
    error_url: errorUrl,
  });
  return `${page}?${params.toString()}`;
}
