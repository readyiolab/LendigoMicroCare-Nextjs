/**
 * Staff verification gates — must match backend breStaffTrigger.getStaffVerificationGates.
 * Digital-only (no manual bypass).
 */

import { isCreditCheckComplete } from './applicationNextStep';

export function getCreditVerdict(latestCreditRun) {
  return String(
    latestCreditRun?.finalVerdict || latestCreditRun?.verdict || latestCreditRun?.final_verdict || ''
  ).toUpperCase();
}

export function isBreRejectVerdict(latestCreditRun) {
  const v = getCreditVerdict(latestCreditRun);
  return v === 'REJECTED' || v === 'AA_CONSENT_TIMEOUT';
}

export function isBrePreApproveVerdict(latestCreditRun) {
  const v = getCreditVerdict(latestCreditRun);
  return v === 'PRE_APPROVED' || v === 'APPROVED';
}

const isFlagOn = (v) => v === true || Number(v) === 1;

/** Profile flag, or the latest PAN record (DigiLocker / manual) marked valid. */
export function isPanVerified({ userData, panVerification } = {}) {
  const panRecord = panVerification ?? userData?.pan_verification;
  return (
    isFlagOn(userData?.profile?.pancard_verified) ||
    isFlagOn(userData?.pancard_verified) ||
    userData?.profile?.pancard_verified === 'valid' ||
    String(panRecord?.verification_status || '').toLowerCase() === 'valid'
  );
}

export function computeStaffVerificationGates({
  userData,
  kycDetails,
  bankDetails,
  selfie,
  breEvaluation,
  latestCreditRun = null,
  panVerification,
} = {}) {
  const panOk = isPanVerified({ userData, panVerification });

  const ekycStatus = String(kycDetails?.verification_status || '').toLowerCase();
  const ekycOk = ['verified', 'success', 'completed'].includes(ekycStatus);

  const bankOk =
    bankDetails?.is_verified === 1 ||
    bankDetails?.is_verified === true ||
    bankDetails?.is_manual_verified === 1 ||
    bankDetails?.is_manual_verified === true ||
    String(bankDetails?.penny_drop_status || '').toLowerCase() === 'success';

  const selfieOk =
    String(selfie?.face_match_status || '').toLowerCase() === 'matched' &&
    (selfie?.liveness_check === 1 || selfie?.liveness_check === true);

  const breOk = Boolean(breEvaluation);

  const creditCheckOk = isCreditCheckComplete(latestCreditRun);
  const breRejectBlocksRecommend = isBreRejectVerdict(latestCreditRun);
  const recommendOk = creditCheckOk && !breRejectBlocksRecommend;

  return {
    panOk,
    ekycOk,
    bankOk,
    selfieOk,
    breOk,
    creditCheckOk,
    recommendOk,
    breRejectBlocksRecommend,
    creditVerdict: getCreditVerdict(latestCreditRun) || null,
    complete: panOk && ekycOk && bankOk && selfieOk && breOk && creditCheckOk,
  };
}

export const STAFF_GATE_ITEMS = [
  {
    key: 'ekycOk',
    label: 'Aadhaar verification',
    tab: 'kyc',
    hint: 'Complete Aadhaar verification in Digitap KYC → Step 1.',
  },
  {
    key: 'panOk',
    label: 'PAN check',
    tab: 'kyc',
    hint: 'Run Check PAN in Digitap KYC → Step 2.',
  },
  {
    key: 'bankOk',
    label: 'Bank account check',
    tab: 'kyc',
    hint: 'Run Verify bank (₹1) in Digitap KYC → Step 3.',
  },
  {
    key: 'selfieOk',
    label: 'Selfie (face + liveness)',
    tab: 'kyc',
    hint: 'In Digitap KYC → Step 4, run Match photo and Check live photo.',
  },
  {
    key: 'creditCheckOk',
    label: 'Credit & bank suggestion',
    tab: null,
    hint: 'Click Run credit check at the top of the page.',
  },
  {
    key: 'breOk',
    label: 'KYC rules check (automatic)',
    tab: 'bre',
    hint: 'Finish steps above — rules run automatically, or open Risk Engine tab.',
  },
];

const STRICT_GATE_PATTERNS = [
  {
    test: /pan (card )?must be verified|pan is not verified/i,
    message: 'PAN is not verified yet. Open Digitap KYC → Step 2 and run Check PAN.',
    tab: 'kyc',
  },
  {
    test: /ekyc must be verified|aadhaar ekyc is not complete/i,
    message: 'Aadhaar is not complete. Open Digitap KYC → Step 1 and finish Aadhaar verification.',
    tab: 'kyc',
  },
  {
    test: /bank account must be verified|bank account is not verified/i,
    message: 'Bank account is not verified. Open Digitap KYC → Step 3 and run Verify bank (₹1).',
    tab: 'kyc',
  },
  {
    test: /selfie verification must be completed|selfie verification is incomplete/i,
    message:
      'Selfie verification is incomplete. Open Digitap KYC → Step 4, then run Match photo and Check live photo.',
    tab: 'kyc',
  },
  {
    test: /bre evaluation must be run|risk engine \(bre\) has not run/i,
    message: 'KYC rules check has not run. Finish PAN, Aadhaar, bank, and selfie first.',
    tab: 'bre',
  },
  {
    test: /credit check has not run|credit check is waiting/i,
    message: 'Credit check has not finished. Click Run credit check at the top of the page.',
    tab: null,
  },
  {
    test: /bre credit check says not eligible|cannot recommend or approve/i,
    message: 'BRE says not eligible — recommend is blocked. Choose Reject instead.',
    tab: 'actions',
  },
  {
    test: /underwriters can only approve/i,
    message: 'This application must be recommended by a Credit Manager before it can be approved.',
    tab: 'actions',
  },
];

export function formatStaffGateError(rawMessage) {
  const msg = String(rawMessage || '').trim();
  if (!msg) return { message: 'Could not save this decision. Please try again.', tab: null };

  const match = STRICT_GATE_PATTERNS.find((p) => p.test.test(msg));
  if (match) {
    return { message: match.message, tab: match.tab };
  }

  if (/strict gate:/i.test(msg)) {
    return {
      message: msg.replace(/^strict gate:\s*/i, '').replace(/\.$/, '') + '.',
      tab: null,
    };
  }

  return { message: msg, tab: null };
}

export function getRecommendBlockers(gates) {
  if (!gates) return [];
  const items = STAFF_GATE_ITEMS.filter((item) => !gates[item.key]);
  if (gates.breRejectBlocksRecommend) {
    items.push({
      key: 'breRejectBlocksRecommend',
      label: 'BRE not eligible',
      tab: 'actions',
      hint: 'BRE credit check says REJECTED — recommend is blocked. Choose Reject.',
    });
  }
  return items;
}
