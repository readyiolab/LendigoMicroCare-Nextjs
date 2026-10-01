/** Build admin selfie check result rows for VerificationTile */

function safeJsonParse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function pickResult(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return obj.result || obj.raw?.result || obj;
}

export function buildSelfieCheckDisplay(selfie, apiFeedback) {
  const livenessParsed = safeJsonParse(selfie?.liveness_response);
  const faceParsed = safeJsonParse(selfie?.face_match_response);
  const liveResult = pickResult(livenessParsed);
  const faceResult = pickResult(faceParsed);
  const digitapLive = apiFeedback?.digitap || apiFeedback?.digio;

  const score =
    selfie?.face_match_score ??
    apiFeedback?.matchScore ??
    faceResult?.match_score ??
    faceResult?.same_face_confidence ??
    faceParsed?.match_score ??
    faceParsed?.score;

  let liveness;
  if (selfie?.liveness_check === 1) {
    liveness = 'PASSED';
  } else if (apiFeedback?.livenessSuccess === true || (apiFeedback?.success === true && apiFeedback?.livenessResult)) {
    liveness = (apiFeedback.livenessResult || 'PASSED').toString();
  } else if (apiFeedback?.livenessSuccess === false) {
    liveness = (apiFeedback.livenessResult || 'FAILED').toString();
  } else {
    const isLiveFlag = liveResult?.is_live === true || liveResult?.is_live === 'true';
    const rawLive = (
      liveResult?.liveness_result ||
      livenessParsed?.liveness_result ||
      livenessParsed?.result ||
      livenessParsed?.raw_digio_result ||
      apiFeedback?.livenessResult ||
      (isLiveFlag ? 'PASS' : '')
    )
      .toString()
      .toUpperCase();
    liveness =
      rawLive === 'PASS' || rawLive === 'SUCCESS' || isLiveFlag
        ? 'PASSED'
        : rawLive === 'FAIL' || rawLive === 'UNKNOWN'
          ? 'FAILED'
          : 'PENDING';
  }

  if (typeof liveness === 'string') {
    liveness = liveness.toUpperCase();
  }

  const rows = {};
  if (score != null && score !== '') {
    const n = Number(score);
    const pct = !Number.isNaN(n) && n >= 0 && n <= 1 ? Math.round(n * 10000) / 100 : n;
    rows.score = `${pct}%`;
  }
  if (liveness) {
    rows.liveness = liveness;
  }
  const liveScore =
    liveResult?.liveness_score ??
    liveResult?.liveness_confidence ??
    livenessParsed?.liveness_score ??
    livenessParsed?.score ??
    digitapLive?.liveness_score ??
    apiFeedback?.livenessScore;
  if (liveScore != null && liveScore !== '') {
    const n = Number(liveScore);
    rows.live_score =
      !Number.isNaN(n) && n >= 0 && n <= 1 ? String(Math.round(n * 10000) / 100) : String(liveScore);
  }
  const digioErrors = liveResult?.liveness_errors || livenessParsed?.liveness_errors || livenessParsed?.errors;
  if (Array.isArray(digioErrors) && digioErrors.length) {
    rows.detail = digioErrors.join('; ');
  } else if (liveResult?.liveness_result_description || livenessParsed?.liveness_result_description) {
    rows.detail = liveResult?.liveness_result_description || livenessParsed.liveness_result_description;
  } else if (liveResult?.is_low_light_image || liveResult?.is_person_image_blurry || liveResult?.multiple_face_detected) {
    const hints = [];
    if (liveResult.is_low_light_image) hints.push('low light');
    if (liveResult.is_person_image_blurry) hints.push('blurry');
    if (liveResult.multiple_face_detected) hints.push('multiple faces');
    if (liveResult.eye_closed) hints.push('eyes closed');
    if (liveResult.has_mask) hints.push('mask detected');
    if (hints.length) rows.detail = hints.join('; ');
  } else if (selfie?.wf_customer_message) {
    rows.detail = selfie.wf_customer_message;
  } else if (apiFeedback?.message) {
    rows.detail = apiFeedback.message;
  }
  if ((faceResult?.match_score != null || faceResult?.same_face_confidence != null) && rows.score == null) {
    const n = Number(faceResult.match_score ?? faceResult.same_face_confidence);
    const pct = !Number.isNaN(n) && n >= 0 && n <= 1 ? Math.round(n * 10000) / 100 : n;
    rows.score = `${pct}%`;
  }

  return Object.keys(rows).length ? rows : null;
}
