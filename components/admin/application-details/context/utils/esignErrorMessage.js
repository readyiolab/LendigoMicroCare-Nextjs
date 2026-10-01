const FRIENDLY_BY_CODE = {
    VIDEO_NOT_VERIFIED:
        'Video verification is still pending. Complete Step 4 (video KYC) before sending the loan agreement for signing.',
    ALREADY_SIGNED: 'Customer has already e-signed this loan agreement.',
    APPLICATION_NOT_FOUND: 'This application could not be found. Refresh and try again.',
};

/** Turns backend/socket e-sign failures into a sentence staff can act on. */
export function esignErrorMessage(raw, code) {
    if (code && FRIENDLY_BY_CODE[code]) return FRIENDLY_BY_CODE[code];

    const text = String(raw || '').trim();
    if (!text) return 'E-Sign could not be started. Please try again.';

    if (/video must be verified/i.test(text) || /cannot be initiated from/i.test(text)) {
        return FRIENDLY_BY_CODE.VIDEO_NOT_VERIFIED;
    }
    if (/already completed e-sign|already e-signed/i.test(text)) {
        return FRIENDLY_BY_CODE.ALREADY_SIGNED;
    }
    if (/already being generated/i.test(text)) {
        return 'E-Sign is already being generated for this application. Please wait a moment and refresh.';
    }
    return text;
}
