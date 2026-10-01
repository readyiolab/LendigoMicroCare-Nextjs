import { sumActiveFeePct } from '@/lib/cam/camPolicyDefaults';

function istTodayISO() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Structured CAM particulars — mirrors backend camFieldCatalog.js
 */

export const FIELD_DEFS = [
  { key: 'salary_credit_amount_1', label: 'Salary Credit Amount 1 (Rs.)', type: 'number', role: 'input', section: 'salary' },
  { key: 'salary_credit_amount_2', label: 'Salary Credit Amount 2 (Rs.)', type: 'number', role: 'input', section: 'salary' },
  { key: 'salary_credit_amount_3', label: 'Salary Credit Amount 3 (Rs.)', type: 'number', role: 'input', section: 'salary' },
  { key: 'salary_credit_date_1', label: 'Salary Credit Date 1', type: 'date', role: 'input', section: 'salary' },
  { key: 'salary_credit_date_2', label: 'Salary Credit Date 2', type: 'date', role: 'input', section: 'salary' },
  { key: 'salary_credit_date_3', label: 'Salary Credit Date 3', type: 'date', role: 'input', section: 'salary' },
  { key: 'avg_salary', label: 'Average Salary (Rs.)', type: 'number', role: 'calculated', section: 'salary' },
  { key: 'appraised_salary', label: 'Appraised Salary (Rs.)', type: 'number', role: 'input', section: 'salary' },
  { key: 'appraisal_method', label: 'Appraisal Method', type: 'text', role: 'calculated', section: 'salary' },
  { key: 'salary_variance', label: 'Salary Variance', type: 'select', options: ['HIGH', 'MEDIUM', 'LOW', '-'], role: 'calculated', section: 'salary' },
  { key: 'salary_on_time', label: 'Salary on Time', type: 'select', options: ['HIGH', 'MEDIUM', 'LOW', '-'], role: 'calculated', section: 'salary' },
  { key: 'next_pay_date', label: 'Next Pay Date', type: 'date', role: 'calculated', section: 'salary' },

  { key: 'appraised_obligations', label: 'Appraised Obligations (Rs.)', type: 'number', role: 'input', section: 'affordability' },
  { key: 'eligible_foir_pct', label: 'Eligible FOIR (%)', type: 'number', role: 'input', section: 'affordability' },
  { key: 'foir_income', label: 'FOIR Income (Rs.)', type: 'number', role: 'calculated', section: 'affordability' },
  { key: 'eligible_loan', label: 'Eligible Loan (Rs.)', type: 'number', role: 'calculated', section: 'affordability' },

  { key: 'loan_applied', label: 'Loan Applied (Rs.)', type: 'number', role: 'input', section: 'loan' },
  { key: 'loan_recommended', label: 'Loan Recommended (Rs.)', type: 'number', role: 'calculated', section: 'loan' },
  { key: 'loan_recommended_override', label: 'Override recommended amount?', type: 'yesno', role: 'input', section: 'loan' },
  { key: 'recommendation_reason', label: 'Recommendation Reason', type: 'text', role: 'calculated', section: 'loan' },
  { key: 'final_foir_pct', label: 'Final FOIR (%)', type: 'number', role: 'calculated', section: 'loan' },
  { key: 'foir_difference_pct', label: 'FOIR Difference (%)', type: 'number', role: 'calculated', section: 'loan' },
  { key: 'foir_enhanced_by_pct', label: 'FOIR Difference (%)', type: 'number', role: 'calculated', section: 'loan' },

  { key: 'admin_fee_pct', label: 'Platform Fee / PF (%)', type: 'number', role: 'input', section: 'fees' },
  { key: 'gst_pct', label: 'GST (%)', type: 'number', role: 'input', section: 'fees' },
  { key: 'roi_pct', label: 'ROI (%)', type: 'number', role: 'input', section: 'fees' },
  { key: 'roi_frequency', label: 'ROI Frequency', type: 'text', role: 'calculated', section: 'fees' },
  { key: 'penal_roi', label: 'Penal ROI (%)', type: 'number', role: 'input', section: 'fees' },
  { key: 'disbursal_date', label: 'Disbursal Date', type: 'date', role: 'input', section: 'fees' },
  { key: 'repay_date', label: 'Repay Date', type: 'date', role: 'input', section: 'fees' },
  { key: 'repay_date_override', label: 'Override repay date?', type: 'yesno', role: 'input', section: 'fees' },
  { key: 'tenure_days', label: 'Tenure (days)', type: 'number', role: 'calculated', section: 'fees' },
  { key: 'tenure_days_override', label: 'Override tenure?', type: 'yesno', role: 'input', section: 'fees' },
  { key: 'admin_fee_amount', label: 'Platform Fee / PF (Rs.)', type: 'number', role: 'calculated', section: 'fees' },
  { key: 'gst_amount', label: 'GST Amount (Rs.)', type: 'number', role: 'calculated', section: 'fees' },
  { key: 'total_admin_fee', label: 'Total Platform Fee (Rs.)', type: 'number', role: 'calculated', section: 'fees' },
  { key: 'net_admin_fee', label: 'Net Platform Fee (Rs.)', type: 'number', role: 'calculated', section: 'fees' },
  { key: 'net_disb_amount', label: 'Net Disb. Amount (Rs.)', type: 'number', role: 'calculated', section: 'fees' },
  { key: 'interest_amount', label: 'Interest (Rs.)', type: 'number', role: 'calculated', section: 'fees' },
  { key: 'repay_amount', label: 'Repay Amount (Rs.)', type: 'number', role: 'calculated', section: 'fees' },

  { key: 'cibil_score', label: 'CIBIL Score', type: 'text', role: 'input', section: 'risk' },
  { key: 'lw_score', label: 'LW Score', type: 'text', role: 'input', section: 'risk' },
  { key: 'ntc', label: 'NTC', type: 'text', role: 'input', section: 'risk' },
  { key: 'running_other_payday_loan', label: 'Running other Payday loan', type: 'yesno', role: 'input', section: 'risk' },
  { key: 'delay_other_loans_30d', label: 'Delay in other loans in last 30 days', type: 'yesno', role: 'input', section: 'risk' },
  { key: 'city_category', label: 'City category', type: 'select', options: ['A', 'B', 'C', '-'], role: 'input', section: 'risk' },
  { key: 'job_stability', label: 'Job stability', type: 'text', role: 'input', section: 'risk' },
  { key: 'borrower_age', label: 'Borrower Age (years)', type: 'number', role: 'input', section: 'risk' },
  { key: 'end_use', label: 'End Use', type: 'text', role: 'input', section: 'risk' },
  { key: 'scheme', label: 'Scheme', type: 'text', role: 'input', section: 'risk' },
  { key: 'b2b_no', label: 'B2B NO.', type: 'text', role: 'input', section: 'risk' },
  { key: 'b2b_disbursal', label: 'B2B Disbursal', type: 'text', role: 'input', section: 'risk' },
  { key: 'risk_profile', label: 'Risk Profile', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', '-'], role: 'calculated', section: 'risk' },
  { key: 'decision', label: 'Decision', type: 'select', options: ['APPROVE', 'REFER', 'REJECT', '-'], role: 'calculated', section: 'risk' },
  { key: 'decision_reason', label: 'Decision Reason', type: 'text', role: 'calculated', section: 'risk' },
  { key: 'calc_config_version', label: 'Policy Version', type: 'text', role: 'calculated', section: 'risk' },
  { key: 'deviations', label: 'Deviations', type: 'textarea', role: 'input', section: 'risk' },
  { key: 'remark', label: 'Remark', type: 'textarea', role: 'input', section: 'risk' },
];

export const SECTIONS = [
  { id: 'salary', title: '1. Salary', hint: 'Enter last 3 salary credits — Appraised Salary defaults to the highest; you can edit or pick any of the three' },
  { id: 'affordability', title: '2. Affordability (FOIR)', hint: 'Obligations and eligible FOIR % drive how much the customer can borrow' },
  { id: 'loan', title: '3. Loan decision', hint: 'Applied amount vs policy caps → recommended loan' },
  { id: 'fees', title: '4. Fees & repayment', hint: 'Fee % and dates → net disbursal, interest, repay amount' },
  { id: 'risk', title: '5. Risk & remarks', hint: 'Bureau and flags → risk profile and decision' },
];

export const LEFT_FIELDS = FIELD_DEFS.filter((f) =>
  [
    'cibil_score', 'running_other_payday_loan', 'job_stability',
    'salary_credit_date_1', 'salary_credit_date_2', 'salary_credit_date_3',
    'next_pay_date', 'salary_variance', 'appraised_salary', 'borrower_age', 'lw_score',
    'eligible_foir_pct', 'loan_applied', 'final_foir_pct', 'admin_fee_pct', 'total_admin_fee',
    'gst_pct', 'net_admin_fee', 'net_disb_amount', 'penal_roi', 'risk_profile', 'b2b_no', 'remark',
  ].includes(f.key)
);

export const RIGHT_FIELDS = FIELD_DEFS.filter((f) => !LEFT_FIELDS.find((l) => l.key === f.key));

export const ALL_FIELD_KEYS = FIELD_DEFS.map((f) => f.key);

export function emptyParticulars() {
  const out = {};
  ALL_FIELD_KEYS.forEach((k) => {
    out[k] = '';
  });
  return out;
}

export function normalizeParticulars(input = {}) {
  const base = emptyParticulars();
  if (!input || typeof input !== 'object') return base;
  ALL_FIELD_KEYS.forEach((k) => {
    if (input[k] !== undefined && input[k] !== null) {
      base[k] = String(input[k]);
    }
  });
  return base;
}

export function fieldsBySection(sectionId) {
  return FIELD_DEFS.filter((f) => f.section === sectionId);
}

function pickNum(...vals) {
  for (const v of vals) {
    if (v === 0 || v === '0') return String(v);
    if (v != null && v !== '' && !Number.isNaN(Number(v))) return String(v);
  }
  return '';
}

function pickStr(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function ageFromDob(dob) {
  if (!dob) return '';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age > 0 ? String(age) : '';
}

/** Prefill empty CAM cells from case data; never overwrite existing CM values. */
export function buildPrefillParticulars(loanApp, data) {
  const user = data?.user || loanApp || {};
  const profile = data?.profile || user?.profile || {};
  const app = loanApp || {};
  const offer = data?.offer || data?.activeOffer || {};
  // Product fee rates only — never bank/offer fee_breakdown rupee amounts
  const productFees = data?.product?.fees || app.product?.fees || {};
  const crif = data?.crif || data?.bureau || {};
  const aa = data?.accountAggregator || data?.aa || {};

  const score = pickStr(
    crif.score,
    crif.cibil_score,
    app.cibil_score,
    app.crif_score,
    data?.creditScore
  );

  const applied = pickNum(
    app.requested_amount,
    app.principal_amount,
    app.loan_applied,
    app.amount_requested
  );
  const recommended = pickNum(
    offer.approved_amount,
    app.approved_amount,
    app.loan_recommended,
    applied
  );
  const roi = pickNum(offer.interest_rate, app.interest_rate, app.roi, app.applied_interest_rate_daily);
  const tenure = pickNum(offer.tenure_days, app.tenure_days, app.loan_tenure_days);
  const productFeePct = sumActiveFeePct(productFees);
  const adminFeePct = pickNum(
    app.admin_fee_pct,
    productFeePct,
    productFees.admin_fee_pct,
    productFees.processing_fee_pct,
    productFees.process_fee
  );
  const salary = pickNum(
    app.appraised_salary,
    app.monthly_salary,
    aa.avg_salary,
    profile.net_monthly_income,
    profile.monthly_income,
    user.net_monthly_income,
    user.monthly_income
  );

  return normalizeParticulars({
    cibil_score: score,
    appraised_salary: salary,
    borrower_age: ageFromDob(
      profile.date_of_birth || profile.dob || user.date_of_birth || user.dob
    ),
    loan_applied: applied,
    admin_fee_pct: adminFeePct,
    gst_pct: pickNum(productFees.gst_pct) || '18',
    city_category: pickStr(profile.city_category, user.city_category, app.city_category),
    avg_salary: salary,
    end_use: pickStr(app.loan_purpose, app.end_use, 'Personal'),
    scheme: pickStr(offer.product_name, app.product_name, app.scheme),
    loan_recommended: recommended,
    roi_pct: roi,
    tenure_days: tenure,
    disbursal_date: istTodayISO(),
  });
}

export function prefillParticulars(args = {}) {
  if (args.app || args.data) {
    return buildPrefillParticulars(args.app, args.data || args);
  }
  return buildPrefillParticulars(args, args);
}

export function mergeParticulars(saved, prefill) {
  const base = normalizeParticulars(saved);
  const fill = normalizeParticulars(prefill);
  ALL_FIELD_KEYS.forEach((k) => {
    if (!base[k] && fill[k]) base[k] = fill[k];
  });
  return base;
}

export function formatInr(value) {
  if (value === '' || value == null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
