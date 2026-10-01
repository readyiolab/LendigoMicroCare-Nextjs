/** Plain-language labels for Digitap KYC fields (admin panel). */
export const KYC_FIELD_LABELS = {
  mode: 'Verification method',
  status: 'Status',
  name: 'Customer name',
  father_name: "Father's name",
  dob: 'Date of birth',
  gender: 'Gender',
  aadhaar: 'Aadhaar number',
  district_state: 'District & state',
  pincode: 'PIN code',
  current_address: 'Current address',
  permanent_address: 'Permanent address',
  request_id: 'Reference number',
  pan: 'PAN number',
  bank: 'Bank name',
  account: 'Account number',
  ifsc: 'IFSC code',
  type: 'Document type',
  score: 'Face match score',
  liveness: 'Liveness result',
  live_score: 'Liveness score',
  detail: 'Details',
  uan: 'UAN number',
  moonlighting: 'Other jobs check',
  history_count: 'Past employers',
  last_employer: 'Latest employer',
};

export function labelForKycField(key) {
  return KYC_FIELD_LABELS[key] || String(key).replace(/_/g, ' ');
}

export function isEsignCompleteForApp(esignStatus, esignDocs = [], applicationId) {
  if (['completed', 'signed'].includes(esignStatus)) return true;
  return esignDocs.some(
    (doc) =>
      String(doc.loan_application_id) === String(applicationId) &&
      ['signed', 'completed', 'success'].includes(doc.esign_status || doc.status)
  );
}
