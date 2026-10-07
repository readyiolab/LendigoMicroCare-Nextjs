/**
 * Deterministic CAM calculation engine.
 * Pure compute from particulars + resolved policy; returns particulars + audit trail.
 */

import { normalizeParticulars } from '@/components/admin/application-details/camFieldCatalog';
import { resolveCamPolicy, getCamPolicyDefaults } from './camPolicyDefaults';

function toNum(v) {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function roundMoney(n, mode = 'nearest_rupee') {
  if (n == null || !Number.isFinite(n)) return null;
  if (mode === 'floor') return Math.floor(n);
  if (mode === 'ceil') return Math.ceil(n);
  return Math.round(n);
}

function roundPct(n, decimals = 2) {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function strMoney(n) {
  return n == null ? '' : String(n);
}

const IST_OFFSET_MS = 330 * 60 * 1000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const NAIVE_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

function formatIstCivil(date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** India civil date. YYYY-MM-DD stays; instants use Asia/Kolkata (30 Oct 00:00 IST is not 29 Oct). */
function indiaCivilDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return formatIstCivil(value);
  }
  const s = String(value).trim();
  if (DATE_ONLY.test(s)) return s;
  if (NAIVE_DATETIME.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return formatIstCivil(d);
}

function parseDate(v) {
  const iso = indiaCivilDate(v);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function addDays(d, days) {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

/** Today's date in India (IST) as YYYY-MM-DD, independent of the browser timezone. */
export function istTodayISO() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

function formatDateISO(d) {
  if (!d) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function classifyBand(value, lowMax, mediumMax) {
  if (value == null || !Number.isFinite(value)) return '-';
  if (value <= lowMax) return 'LOW';
  if (value <= mediumMax) return 'MEDIUM';
  return 'HIGH';
}

function auditEntry(inputs, formula, result, rule) {
  return { inputs, formula, result, rule };
}

/**
 * @param {object} inputParticulars - CM / prefilled fields
 * @param {object} policy - from resolveCamPolicy
 * @param {object} [options]
 * @param {boolean} [options.honorRecommendedOverride] - keep CM loan_recommended if override reason set
 */
export function calculateCam(inputParticulars = {}, policy = null, options = {}) {
  const pol = policy || resolveCamPolicy({ particulars: inputParticulars });
  const moneyMode = pol.rounding?.money || 'nearest_rupee';
  const foirDecimals = pol.rounding?.foir_pct_decimals ?? 2;
  const particulars = normalizeParticulars(inputParticulars);
  const fields = {};
  const calculated_at = new Date().toISOString();

  // --- Salary credits ---
  const s1 = toNum(particulars.salary_credit_amount_1);
  const s2 = toNum(particulars.salary_credit_amount_2);
  const s3 = toNum(particulars.salary_credit_amount_3);
  const salaries = [s1, s2, s3].filter((n) => n != null && n > 0);
  const d1 = parseDate(particulars.salary_credit_date_1);
  const d2 = parseDate(particulars.salary_credit_date_2);
  const d3 = parseDate(particulars.salary_credit_date_3);
  const dates = [d1, d2, d3].filter(Boolean).sort((a, b) => a - b);

  let avgSalary = null;
  if (salaries.length > 0) {
    avgSalary = roundMoney(
      salaries.reduce((a, b) => a + b, 0) / salaries.length,
      moneyMode
    );
  }
  particulars.avg_salary = strMoney(avgSalary);
  fields.avg_salary = auditEntry(
    { salaries },
    '(sum of valid salary credits) / count',
    avgSalary,
    'average_salary'
  );

  const appraisalMethod = particulars.appraisal_method || pol.appraisal_method || 'max';
  let appraised = null;
  if (appraisalMethod === 'avg' && avgSalary != null) {
    appraised = avgSalary;
  } else if (appraisalMethod === 'median' && salaries.length > 0) {
    const sorted = [...salaries].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    appraised =
      sorted.length % 2 === 0
        ? roundMoney((sorted[mid - 1] + sorted[mid]) / 2, moneyMode)
        : sorted[mid];
  } else if (appraisalMethod === 'declared' || appraisalMethod === 'bank_validated') {
    appraised =
      toNum(particulars.appraised_salary) ??
      (salaries.length ? Math.max(...salaries) : null);
  } else if (appraisalMethod === 'min' && salaries.length > 0) {
    appraised = Math.min(...salaries);
  } else if (salaries.length > 0) {
    // default / max: highest of the three salary credits
    appraised = Math.max(...salaries);
  }
  // Keep CM manual value when method is declared/bank_validated; otherwise write auto value
  if (appraisalMethod !== 'declared' && appraisalMethod !== 'bank_validated') {
    particulars.appraised_salary = strMoney(appraised);
  } else if (!particulars.appraised_salary && appraised != null) {
    particulars.appraised_salary = strMoney(appraised);
  } else {
    appraised = toNum(particulars.appraised_salary) ?? appraised;
  }
  particulars.appraisal_method = appraisalMethod;
  fields.appraised_salary = auditEntry(
    { salaries, method: appraisalMethod },
    appraisalMethod === 'max' || (!appraisalMethod && salaries.length)
      ? 'MAX(valid salary credits) — highest of last 3'
      : appraisalMethod === 'min'
        ? 'MIN(valid salary credits)'
        : `appraisal_method=${appraisalMethod}`,
    appraised,
    `appraisal_${appraisalMethod}`
  );

  // Variance
  let varianceClass = '-';
  let variancePct = null;
  if (salaries.length >= 2 && avgSalary > 0) {
    const maxS = Math.max(...salaries);
    const minS = Math.min(...salaries);
    const amount = maxS - minS;
    variancePct = roundPct((amount / avgSalary) * 100, foirDecimals);
    const ratio = minS > 0 ? roundPct(maxS / minS, 2) : null;
    const th = pol.salary_variance_thresholds || {};
    varianceClass = classifyBand(variancePct, th.low_max_pct ?? 20, th.medium_max_pct ?? 40);
    // Map: LOW variance = good â†’ keep LOW label as LOW (consistency good)
    fields.salary_variance = auditEntry(
      { maxS, minS, avgSalary, variance_amount: amount, variance_pct: variancePct, ratio },
      '((max - min) / avg) Ã— 100 â†’ band by policy thresholds',
      varianceClass,
      'salary_variance_thresholds'
    );
  }
  particulars.salary_variance = varianceClass;

  // Salary on-time
  let onTimeClass = '-';
  const intervals = [];
  for (let i = 1; i < dates.length; i += 1) {
    intervals.push(daysBetween(dates[i - 1], dates[i]));
  }
  if (intervals.length > 0) {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const maxInterval = Math.max(...intervals);
    const minInterval = Math.min(...intervals);
    const expected = pol.salary_on_time_thresholds?.expected_interval_days ?? 30;
    const maxExtra = maxInterval - expected;
    const th = pol.salary_on_time_thresholds || {};
    // HIGH = on-time (small delay), LOW = late
    if (maxExtra <= (th.high_max_extra_days ?? 3)) onTimeClass = 'HIGH';
    else if (maxExtra <= (th.medium_max_extra_days ?? 7)) onTimeClass = 'MEDIUM';
    else onTimeClass = 'LOW';
    fields.salary_on_time = auditEntry(
      { intervals, avgInterval, maxInterval, minInterval, expected, max_extra_days: maxExtra },
      'max(interval) vs expected_interval_days â†’ HIGH/MEDIUM/LOW',
      onTimeClass,
      'salary_on_time_thresholds'
    );
  }
  particulars.salary_on_time = onTimeClass;

  // Next pay date
  let nextPay = '';
  if (dates.length > 0) {
    const last = dates[dates.length - 1];
    const method = pol.next_pay_method || 'last_plus_avg_interval';
    if (method === 'modal_day') {
      const days = dates.map((d) => d.getUTCDate());
      const freq = {};
      days.forEach((day) => {
        freq[day] = (freq[day] || 0) + 1;
      });
      const modal = Number(
        Object.keys(freq).sort((a, b) => freq[b] - freq[a] || Number(b) - Number(a))[0]
      );
      const candidate = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, modal));
      nextPay = formatDateISO(candidate);
    } else {
      const expected = pol.salary_on_time_thresholds?.expected_interval_days ?? 30;
      const avgInt =
        intervals.length > 0
          ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
          : expected;
      nextPay = formatDateISO(addDays(last, avgInt));
    }
    particulars.next_pay_date = nextPay;
    fields.next_pay_date = auditEntry(
      { last: formatDateISO(last), method: pol.next_pay_method },
      'last salary date + average interval (or modal day)',
      nextPay,
      'next_pay_method'
    );
  }

  // FOIR income
  const obligations = toNum(particulars.appraised_obligations) ?? 0;
  const appraisedFinal = toNum(particulars.appraised_salary) ?? appraised ?? 0;
  let foirIncome = Math.max(0, appraisedFinal - obligations);
  foirIncome = roundMoney(foirIncome, moneyMode) ?? 0;
  particulars.foir_income = strMoney(foirIncome);
  fields.foir_income = auditEntry(
    { appraised_salary: appraisedFinal, obligations },
    'MAX(0, appraised_salary - obligations)',
    foirIncome,
    'foir_income'
  );

  const eligibleFoirPct = toNum(particulars.eligible_foir_pct) ?? pol.eligible_foir_pct;
  particulars.eligible_foir_pct = strMoney(eligibleFoirPct);

  let eligibleLoan = 0;
  if (foirIncome > 0 && eligibleFoirPct != null) {
    eligibleLoan = roundMoney(foirIncome * (eligibleFoirPct / 100), moneyMode) ?? 0;
  }
  particulars.eligible_loan = strMoney(eligibleLoan);
  fields.eligible_loan = auditEntry(
    { foir_income: foirIncome, eligible_foir_pct: eligibleFoirPct },
    'foir_income Ã— eligible_foir_pct / 100',
    eligibleLoan,
    'eligible_loan'
  );

  const loanApplied = toNum(particulars.loan_applied) ?? 0;
  const caps = [
    { key: 'loan_applied', value: loanApplied > 0 ? loanApplied : null, label: 'Loan applied' },
    { key: 'eligible_loan', value: eligibleLoan > 0 ? eligibleLoan : null, label: 'Eligible loan' },
    { key: 'product_max', value: pol.product_max, label: `Product maximum â‚¹${pol.product_max}` },
    {
      key: 'risk_max',
      value: pol.risk_max != null && pol.risk_max > 0 ? pol.risk_max : null,
      label: `Risk maximum â‚¹${pol.risk_max}`,
    },
    {
      key: 'customer_max',
      value: pol.customer_max != null && pol.customer_max > 0 ? pol.customer_max : null,
      label: `Customer maximum â‚¹${pol.customer_max}`,
    },
  ].filter((c) => c.value != null && Number.isFinite(c.value));

  let recommended = null;
  let recommendationReason = '';
  const honorOverride =
    options.honorRecommendedOverride &&
    particulars.loan_recommended_override === 'YES' &&
    toNum(particulars.loan_recommended) != null;

  if (honorOverride) {
    recommended = toNum(particulars.loan_recommended);
    recommendationReason =
      particulars.recommendation_reason || 'Credit Manager override';
  } else if (caps.length > 0) {
    recommended = Math.min(...caps.map((c) => c.value));
    recommended = roundMoney(recommended, moneyMode);
    const winner = caps.find((c) => c.value === recommended) || caps[0];
    recommendationReason = winner.label;
  } else {
    recommended = 0;
    recommendationReason = 'No applicable limits';
  }
  particulars.loan_recommended = strMoney(recommended);
  particulars.recommendation_reason = recommendationReason;
  fields.loan_recommended = auditEntry(
    { caps: caps.map((c) => ({ key: c.key, value: c.value })) },
    'MIN(loan_applied, eligible_loan, product_max, risk_max, customer_max)',
    recommended,
    recommendationReason
  );

  // Final FOIR
  let finalFoir = null;
  if (foirIncome > 0 && recommended != null) {
    finalFoir = roundPct((recommended / foirIncome) * 100, foirDecimals);
  }
  particulars.final_foir_pct = strMoney(finalFoir);
  fields.final_foir_pct = auditEntry(
    { recommended, foir_income: foirIncome },
    'recommended / foir_income Ã— 100',
    finalFoir,
    'final_foir'
  );

  const foirDiff =
    finalFoir != null && eligibleFoirPct != null
      ? roundPct(finalFoir - eligibleFoirPct, foirDecimals)
      : null;
  particulars.foir_difference_pct = strMoney(foirDiff);
  particulars.foir_enhanced_by_pct = strMoney(foirDiff); // legacy key
  fields.foir_difference_pct = auditEntry(
    { final_foir_pct: finalFoir, eligible_foir_pct: eligibleFoirPct },
    'final_foir_pct - eligible_foir_pct',
    foirDiff,
    'foir_difference'
  );

  // Fees
  const adminFeePct = toNum(particulars.admin_fee_pct) ?? pol.admin_fee_pct;
  const gstPct = toNum(particulars.gst_pct) ?? pol.gst_pct;
  particulars.admin_fee_pct = strMoney(adminFeePct);
  particulars.gst_pct = strMoney(gstPct);

  const adminFeeAmount =
    recommended != null && adminFeePct != null
      ? roundMoney(recommended * (adminFeePct / 100), moneyMode)
      : 0;
  const gstAmount =
    adminFeeAmount != null && gstPct != null
      ? roundMoney(adminFeeAmount * (gstPct / 100), moneyMode)
      : 0;
  const totalAdminFee = roundMoney((adminFeeAmount || 0) + (gstAmount || 0), moneyMode);
  const netDisb = roundMoney((recommended || 0) - (totalAdminFee || 0), moneyMode);

  particulars.admin_fee_amount = strMoney(adminFeeAmount);
  particulars.gst_amount = strMoney(gstAmount);
  particulars.total_admin_fee = strMoney(totalAdminFee);
  particulars.net_admin_fee = strMoney(totalAdminFee); // alias used in UI
  particulars.net_disb_amount = strMoney(netDisb);

  fields.admin_fee_amount = auditEntry(
    { recommended, admin_fee_pct: adminFeePct },
    'recommended Ã— admin_fee_pct / 100',
    adminFeeAmount,
    'admin_fee'
  );
  fields.gst_amount = auditEntry(
    { admin_fee_amount: adminFeeAmount, gst_pct: gstPct },
    'admin_fee Ã— gst_pct / 100',
    gstAmount,
    'gst'
  );
  fields.total_admin_fee = auditEntry(
    { admin_fee_amount: adminFeeAmount, gst_amount: gstAmount },
    'admin_fee + gst',
    totalAdminFee,
    'total_admin_fee'
  );
  fields.net_disb_amount = auditEntry(
    { recommended, total_admin_fee: totalAdminFee },
    'recommended - total_admin_fee',
    netDisb,
    'net_disbursal'
  );

  // Tenure & interest
  const honorTenureOverride = particulars.tenure_days_override === 'YES';
  const honorRepayOverride = particulars.repay_date_override === 'YES';
  if (!particulars.disbursal_date) particulars.disbursal_date = istTodayISO();
  let disbDate = parseDate(particulars.disbursal_date);
  let repayDate = parseDate(particulars.repay_date);
  let tenureDays = toNum(particulars.tenure_days);

  if (honorTenureOverride) {
    if (tenureDays != null && tenureDays < 0) tenureDays = 0;
    // Manual tenure drives repay unless repay is also manually overridden
    if (!honorRepayOverride && disbDate && tenureDays != null && Number.isFinite(tenureDays)) {
      repayDate = addDays(disbDate, Math.round(tenureDays));
      particulars.repay_date = formatDateISO(repayDate);
    } else if (honorRepayOverride && disbDate && repayDate) {
      // Both manual: keep dates consistent by syncing tenure from the date gap
      tenureDays = daysBetween(disbDate, repayDate);
      if (tenureDays < 0) tenureDays = 0;
    }
    particulars.tenure_days = strMoney(tenureDays);
    fields.tenure_days = auditEntry(
      {
        disbursal_date: particulars.disbursal_date,
        repay_date: particulars.repay_date,
        tenure_days_override: 'YES',
        repay_date_override: honorRepayOverride ? 'YES' : 'NO',
      },
      honorRepayOverride
        ? 'manual tenure + manual repay → sync tenure = calendar days'
        : 'manual tenure → repay_date = disbursal_date + tenure_days',
      tenureDays,
      'tenure_days_override'
    );
  } else {
    if (disbDate && repayDate) {
      tenureDays = daysBetween(disbDate, repayDate);
      if (tenureDays < 0) tenureDays = 0;
    } else if (disbDate && tenureDays != null && Number.isFinite(tenureDays) && tenureDays > 0) {
      repayDate = addDays(disbDate, Math.round(tenureDays));
      particulars.repay_date = formatDateISO(repayDate);
    }
    particulars.tenure_days = strMoney(tenureDays);
    fields.tenure_days = auditEntry(
      { disbursal_date: particulars.disbursal_date, repay_date: particulars.repay_date },
      'calendar days (repay_date - disbursal_date)',
      tenureDays,
      'tenure_days'
    );
  }

  if (disbDate) particulars.disbursal_date = formatDateISO(disbDate);
  if (repayDate) particulars.repay_date = formatDateISO(repayDate);

  const roiPct = toNum(particulars.roi_pct) ?? pol.roi_pct;
  const roiFreq = pol.roi_frequency || 'daily';
  particulars.roi_pct = strMoney(roiPct);
  particulars.roi_frequency = roiFreq;
  particulars.penal_roi = strMoney(toNum(particulars.penal_roi) ?? pol.penal_roi_pct);

  let interest = 0;
  if (recommended != null && roiPct != null && tenureDays != null && tenureDays >= 0) {
    if (roiFreq === 'annual') {
      interest = roundMoney(recommended * (roiPct / 100) * (tenureDays / 365), moneyMode);
    } else if (roiFreq === 'monthly') {
      interest = roundMoney(recommended * (roiPct / 100) * (tenureDays / 30), moneyMode);
    } else {
      // daily
      interest = roundMoney(recommended * (roiPct / 100) * tenureDays, moneyMode);
    }
  }
  const repayAmount = roundMoney((recommended || 0) + (interest || 0), moneyMode);
  particulars.interest_amount = strMoney(interest);
  particulars.repay_amount = strMoney(repayAmount);
  fields.interest_amount = auditEntry(
    { recommended, roi_pct: roiPct, tenure_days: tenureDays, roi_frequency: roiFreq },
    roiFreq === 'daily'
      ? 'recommended Ã— roi_pct/100 Ã— tenure_days'
      : `interest with roi_frequency=${roiFreq}`,
    interest,
    `roi_${roiFreq}`
  );
  fields.repay_amount = auditEntry(
    { recommended, interest },
    'recommended + interest',
    repayAmount,
    'repay_amount'
  );

  // Risk scorecard
  const sc = pol.risk_scorecard || getCamPolicyDefaults().risk_scorecard;
  let riskScore = 0;
  const cibil = toNum(particulars.cibil_score);
  if (cibil == null) riskScore += sc.bureau?.missing_points ?? 10;
  else if (cibil < (sc.bureau?.low_score_below ?? 650)) riskScore += sc.bureau?.points ?? 25;

  riskScore += sc.salary_variance?.[varianceClass] ?? 0;
  riskScore += sc.salary_on_time?.[onTimeClass] ?? 0;
  if (String(particulars.running_other_payday_loan).toUpperCase() === 'YES') {
    riskScore += sc.payday_running_yes ?? 15;
  }
  if (String(particulars.delay_other_loans_30d).toUpperCase() === 'YES') {
    riskScore += sc.delay_30d_yes ?? 15;
  }
  if (foirDiff != null && foirDiff > 0) {
    riskScore += sc.foir_over_eligible_points ?? 10;
  }

  const lowMax = sc.profile_thresholds?.low_max ?? 25;
  const medMax = sc.profile_thresholds?.medium_max ?? 50;
  let riskProfile = 'LOW';
  if (riskScore > medMax) riskProfile = 'HIGH';
  else if (riskScore > lowMax) riskProfile = 'MEDIUM';
  particulars.risk_profile = riskProfile;
  fields.risk_profile = auditEntry(
    { riskScore, varianceClass, onTimeClass, cibil },
    'weighted scorecard â†’ LOW/MEDIUM/HIGH',
    riskProfile,
    'risk_scorecard'
  );

  // Decision
  const dec = pol.decision || {};
  let outcome = 'APPROVE';
  let decisionReason = 'Within FOIR and policy limits';
  if (dec.reject_zero_foir_income && foirIncome <= 0) {
    outcome = 'REJECT';
    decisionReason = 'FOIR income is zero or negative';
  } else if (
    dec.reject_high_risk_over_foir &&
    riskProfile === 'HIGH' &&
    foirDiff != null &&
    foirDiff > 0
  ) {
    outcome = 'REJECT';
    decisionReason = 'High risk with Final FOIR above Eligible FOIR';
  } else if (dec.refer_if_final_foir_over_eligible && foirDiff != null && foirDiff > 0) {
    outcome = 'REFER';
    decisionReason = 'Final FOIR exceeds Eligible FOIR';
  } else if (riskProfile === 'HIGH') {
    outcome = 'REFER';
    decisionReason = 'High risk profile';
  } else if (foirIncome <= 0) {
    outcome = 'REFER';
    decisionReason = 'FOIR income requires review';
  }
  particulars.decision = outcome;
  particulars.decision_reason = decisionReason;
  particulars.calc_config_version = pol.config_version || 'cam-policy-v1';
  fields.decision = auditEntry(
    { foir_income: foirIncome, risk_profile: riskProfile, foir_difference_pct: foirDiff },
    'policy decision rules',
    outcome,
    decisionReason
  );

  if (pol.product_name && !particulars.scheme) {
    particulars.scheme = pol.product_name;
  }

  return {
    particulars: normalizeParticulars(particulars),
    calc_audit: {
      calculated_at,
      config_version: pol.config_version || 'cam-policy-v1',
      policy_snapshot: {
        product_max: pol.product_max,
        customer_max: pol.customer_max,
        risk_max: pol.risk_max,
        eligible_foir_pct: eligibleFoirPct,
        admin_fee_pct: adminFeePct,
        gst_pct: gstPct,
        roi_pct: roiPct,
        roi_frequency: roiFreq,
        appraisal_method: appraisalMethod,
      },
      fields,
    },
    decision: {
      outcome,
      reason: decisionReason,
      recommendation_reason: recommendationReason,
      risk_profile: riskProfile,
    },
  };
}

export { toNum, roundMoney, daysBetween, addDays, formatDateISO };

