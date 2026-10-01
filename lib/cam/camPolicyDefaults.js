/**
 * CAM policy defaults for frontend live calculation.
 * Seed from loanApp / product when available via resolveCamPolicy.
 */

export const CAM_POLICY_DEFAULTS = {
  config_version: 'cam-policy-v1',
  eligible_foir_pct: 80,
  product_max_fallback: 50000,
  risk_max: null,
  appraisal_method: 'max',
  next_pay_method: 'last_plus_avg_interval',
  salary_variance_thresholds: {
    low_max_pct: 20,
    medium_max_pct: 40,
  },
  salary_on_time_thresholds: {
    expected_interval_days: 30,
    high_max_extra_days: 3,
    medium_max_extra_days: 7,
  },
  gst_pct: 18,
  admin_fee_pct_fallback: 10,
  roi_pct: 1,
  roi_frequency: 'daily',
  penal_roi_pct: 2,
  penal_roi_frequency: 'daily',
  rounding: {
    money: 'nearest_rupee',
    foir_pct_decimals: 2,
  },
  risk_scorecard: {
    weights: {
      bureau: 25,
      salary_variance: 20,
      salary_on_time: 15,
      payday_running: 15,
      delay_30d: 15,
      foir: 10,
    },
    bureau: { low_score_below: 650, points: 25, missing_points: 10 },
    salary_variance: { HIGH: 20, MEDIUM: 10, LOW: 0 },
    salary_on_time: { LOW: 15, MEDIUM: 8, HIGH: 0 },
    payday_running_yes: 15,
    delay_30d_yes: 15,
    foir_over_eligible_points: 10,
    profile_thresholds: {
      low_max: 25,
      medium_max: 50,
    },
  },
  decision: {
    reject_zero_foir_income: true,
    refer_if_final_foir_over_eligible: true,
    reject_high_risk_over_foir: true,
  },
};

function deepMerge(base, overlay) {
  if (!overlay || typeof overlay !== 'object') return { ...base };
  const out = { ...base };
  Object.keys(overlay).forEach((k) => {
    if (
      overlay[k] &&
      typeof overlay[k] === 'object' &&
      !Array.isArray(overlay[k]) &&
      base[k] &&
      typeof base[k] === 'object' &&
      !Array.isArray(base[k])
    ) {
      out[k] = deepMerge(base[k], overlay[k]);
    } else if (overlay[k] !== undefined) {
      out[k] = overlay[k];
    }
  });
  return out;
}

export function getCamPolicyDefaults() {
  return { ...CAM_POLICY_DEFAULTS, risk_scorecard: { ...CAM_POLICY_DEFAULTS.risk_scorecard } };
}

function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Product / policy rate keys only — never rupee amount blobs from fee_breakdown. */
const FEE_RATE_KEYS = new Set([
  'process_fee',
  'processing_fee',
  'processing_fee_pct',
  'processing_fee_percent',
  'admin_fee',
  'admin_fee_pct',
  'platform_fee',
  'verification_charges',
  'convenience_charges',
  'onboarding_fee',
  'documentation_fee',
  'documentation_charges',
]);

const FEE_AMOUNT_KEYS = new Set([
  'processingFee',
  'processing_fee_amount',
  'gst',
  'gstAmount',
  'gst_amount',
  'totalFees',
  'total_fees',
  'totalDeductible',
  'total_deductible',
  'netDisbursedAmount',
  'net_disbursed_amount',
  'totalInterest',
  'total_interest',
  'totalRepayable',
  'total_repayable',
  'tenorDays',
  'tenor_days',
  'principal',
  'principalAmount',
  'approvedAmount',
]);

function isPlausibleFeePct(n) {
  return Number.isFinite(n) && n > 0 && n <= 100;
}

function pctFromFeeEntry(entry) {
  if (entry == null || entry === '') return null;
  if (typeof entry === 'object') {
    const n = Number(entry.default_value ?? entry.fee_percent ?? entry.percent ?? entry.rate ?? entry.value);
    return isPlausibleFeePct(n) ? n : null;
  }
  const n = Number(entry);
  return isPlausibleFeePct(n) ? n : null;
}

function sumFeePctArray(list) {
  const sum = (Array.isArray(list) ? list : []).reduce((acc, f) => {
    const pct = pctFromFeeEntry(f);
    return acc + (pct != null ? pct : 0);
  }, 0);
  return sum > 0 ? sum : null;
}

/**
 * Sum active fee rates (%). Ignores bank/offer fee_breakdown rupee amounts
 * (processingFee, totalFees, netDisbursedAmount, …) that previously poisoned CAM net disb.
 */
export function sumActiveFeePct(fees) {
  if (!fees || typeof fees !== 'object') return null;

  const nestedArray =
    (Array.isArray(fees._calculated?.fee_breakdown) && fees._calculated.fee_breakdown) ||
    (Array.isArray(fees.fee_breakdown) && fees.fee_breakdown) ||
    (Array.isArray(fees.fee_details) && fees.fee_details) ||
    null;
  if (nestedArray) {
    return sumFeePctArray(nestedArray);
  }

  if (Array.isArray(fees)) {
    return sumFeePctArray(fees);
  }

  let sum = 0;
  let hasValid = false;
  for (const [k, v] of Object.entries(fees)) {
    if (k.startsWith('_')) continue;
    if (FEE_AMOUNT_KEYS.has(k)) continue;
    if (/^(processingFee|totalFees|netDisbursed|totalRepay|tenorDays)/i.test(k)) continue;
    if (/Amount$|Days$|Repayable$|Deductible$|Interest$/i.test(k) && !FEE_RATE_KEYS.has(k)) {
      continue;
    }

    const looksLikeRateKey =
      FEE_RATE_KEYS.has(k) ||
      /_pct$/i.test(k) ||
      /_percent$/i.test(k) ||
      (/_fee$/i.test(k) && !/_fee_amount$/i.test(k)) ||
      /_charges$/i.test(k);

    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const pct = pctFromFeeEntry(v);
      if (pct != null) {
        sum += pct;
        hasValid = true;
      }
      continue;
    }

    if (!looksLikeRateKey) continue;
    const pct = pctFromFeeEntry(v);
    if (pct != null) {
      sum += pct;
      hasValid = true;
    }
  }
  return hasValid ? sum : null;
}

/**
 * Resolve policy from loanApp / product / particulars already on the case.
 */
export function resolveCamPolicy(opts = {}) {
  const base = getCamPolicyDefaults();
  const product = opts.product || {};
  const fees = opts.fees || {};
  const particulars = opts.particulars || {};
  const loanApp = opts.loanApp || {};

  const processFee =
    fees.process_fee ??
    fees.processing_fee ??
    fees.admin_fee ??
    null;

  const totalProductFeesPct = sumActiveFeePct(fees);

  const productMax = Number(
    product.max_amount ?? loanApp.product_max_amount ?? loanApp.max_amount
  );
  const customerMax = numOrNull(
    opts.customerMax ?? loanApp.max_loan_amount ?? loanApp.customer_max_loan
  );

  const adminFromParticulars = numOrNull(particulars.admin_fee_pct);
  const gstFromParticulars = numOrNull(particulars.gst_pct);
  const roiFromParticulars = numOrNull(particulars.roi_pct);
  const penalFromParticulars = numOrNull(particulars.penal_roi);
  const foirFromParticulars = numOrNull(particulars.eligible_foir_pct);

  const dailyRoi = numOrNull(
    product.default_interest_rate_daily ??
      loanApp.applied_interest_rate_daily ??
      loanApp.default_interest_rate_daily
  );

  return {
    ...base,
    product_max:
      Number.isFinite(productMax) && productMax > 0 ? productMax : base.product_max_fallback,
    customer_max: customerMax != null && customerMax > 0 ? customerMax : null,
    risk_max: base.risk_max != null ? Number(base.risk_max) : null,
    admin_fee_pct:
      adminFromParticulars ??
      totalProductFeesPct ??
      (processFee != null ? Number(processFee) : null) ??
      base.admin_fee_pct_fallback,
    gst_pct: gstFromParticulars ?? base.gst_pct,
    roi_pct: roiFromParticulars ?? dailyRoi ?? base.roi_pct,
    penal_roi_pct: penalFromParticulars ?? base.penal_roi_pct,
    eligible_foir_pct: foirFromParticulars ?? base.eligible_foir_pct,
    product_name: product.product_name || product.name || loanApp.product_name || null,
    product_id: product.id || loanApp.product_id || null,
    fees,
  };
}

export { deepMerge };
