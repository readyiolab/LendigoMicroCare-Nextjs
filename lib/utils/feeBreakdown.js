/** Satellite fee codes — never edit/save/show as active product fees. */
export const DEPRECATED_SATELLITE_FEE_CODES = new Set([
  'platform_fee',
  'verification_charges',
  'convenience_charges',
  'processing_fee',
  'other_charges',
]);

export function isActivatableProductFee(fee) {
  const code = typeof fee === 'string' ? fee : fee?.fee_code;
  return Boolean(code) && !DEPRECATED_SATELLITE_FEE_CODES.has(code);
}

export function filterActivatableProductFees(fees) {
  return (fees || []).filter(isActivatableProductFee).map((fee) =>
    fee.fee_code === 'process_fee'
      ? { ...fee, fee_name: fee.fee_name === 'Processing Fee' ? 'Platform Fee' : fee.fee_name || 'Platform Fee' }
      : fee
  );
}

/**
 * Build SanctionLetter-compatible fee_breakdown from customer offer API payload.
 */
export function buildSanctionFeeBreakdown(offer) {
  const fb = offer?.feeBreakdown || offer?.fee_breakdown;
  const principal = Number(
    offer?.approvedAmount || offer?.approved_amount || offer?.principal_amount || offer?.principalAmount || 0
  );

  let feeDetails =
    (Array.isArray(fb?.fee_details) && fb.fee_details.length && fb.fee_details) ||
    (Array.isArray(fb?._calculated?.fee_details) && fb._calculated.fee_details.length && fb._calculated.fee_details) ||
    (Array.isArray(fb?._calculated?.fee_breakdown) && fb._calculated.fee_breakdown.length && fb._calculated.fee_breakdown) ||
    [];

  // Fallback: derive from root-level percent keys on raw fee blob
  if (!feeDetails.length && fb && typeof fb === 'object') {
    const FEE_KEYS = ['process_fee', 'processing_fee', 'platform_fee', 'verification_charges', 'kyc_fee', 'convenience_charges', 'onboarding_fee'];
    feeDetails = Object.entries(fb)
      .filter(([k, v]) => FEE_KEYS.includes(k) && typeof v === 'number' && v > 0)
      .map(([fee_code, fee_percent]) => ({
        fee_code,
        fee_name: fee_code === 'process_fee' || fee_code === 'processing_fee' ? 'Platform Fee' : fee_code,
        fee_percent,
        fee_amount: Math.round(((principal * fee_percent) / 100) * 1000) / 1000,
      }));
  }

  // Prefer single process_fee line for new offers; keep legacy multi-line for historical JSON
  const activeFeeDetails = feeDetails.filter((f) => Number(f.fee_amount || 0) > 0);
  const processOnly = activeFeeDetails.filter((f) =>
    ['process_fee', 'processing_fee'].includes(f.fee_code)
  );
  const satellite = activeFeeDetails.filter(
    (f) => !['process_fee', 'processing_fee'].includes(f.fee_code)
  );
  const displayFeeDetails =
    processOnly.length && !satellite.length
      ? processOnly.map((f) => ({ ...f, fee_name: f.fee_name || 'Platform Fee' }))
      : activeFeeDetails.length
        ? activeFeeDetails
        : feeDetails;

  const totalFees = Number(fb?.totalFees ?? fb?._calculated?.total_fees ?? 0);
  const gstOnFees = Number(fb?.gstOnFees ?? fb?._calculated?.gst_on_fees ?? 0);
  const totalDeductions = Number(
    offer?.totalDeductions ?? offer?.total_deductions ?? fb?.totalDeductions ?? fb?._calculated?.total_deductions ?? 0
  );
  const netDisbursement = Number(
    offer?.disbursementAmount ?? offer?.disbursement_amount ?? fb?.netDisbursement ?? fb?._calculated?.disbursement_amount ?? 0
  );
  const totalRepayment = Number(
    offer?.totalRepayment ?? offer?.total_repayment_amount ?? fb?._calculated?.total_repayment ?? 0
  );

  const calculated = {
    fee_details: displayFeeDetails,
    fee_breakdown: displayFeeDetails,
    total_fees: totalFees || displayFeeDetails.reduce((s, f) => s + Number(f.fee_amount || 0), 0),
    gst_on_fees: gstOnFees || (totalFees ? Math.round(totalFees * 0.18 * 1000) / 1000 : 0),
    total_deductions: totalDeductions,
    disbursement_amount: netDisbursement,
    total_repayment: totalRepayment || undefined,
    interest_amount: fb?._calculated?.interest_amount,
    product_name: fb?._calculated?.product_name,
  };

  const pfAmount =
    displayFeeDetails
      .filter((f) => ['process_fee', 'processing_fee'].includes(f.fee_code))
      .reduce((s, f) => s + Number(f.fee_amount || 0), 0) || calculated.total_fees;

  return {
    _calculated: calculated,
    fee_details: displayFeeDetails,
    processingFee: pfAmount || undefined,
    principal,
  };
}
