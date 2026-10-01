import React from 'react';
import { cn } from '@/lib/utils';

const SEGMENTS = [
  {
    id: 'PN',
    title: 'Name Segment (PN)',
    cols: [
      { key: 'consumerName', label: 'Consumer Name', sticky: true },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
    ],
  },
  {
    id: 'ID',
    title: 'Identification Segment (ID)',
    cols: [
      { key: 'pan', label: 'Income Tax ID Number' },
      { key: 'passportNumber', label: 'Passport Number' },
      { key: 'passportIssueDate', label: 'Passport Issue Date' },
      { key: 'passportExpiryDate', label: 'Passport Expiry Date' },
      { key: 'voterId', label: 'Voter ID Number' },
      { key: 'drivingLicense', label: 'Driving License Number' },
      { key: 'dlIssueDate', label: 'DL Issue Date' },
      { key: 'dlExpiryDate', label: 'DL Expiry Date' },
      { key: 'rationCard', label: 'Ration Card Number' },
      { key: 'universalId', label: 'Universal ID Number' },
      { key: 'additionalId1', label: 'Additional ID #1' },
      { key: 'additionalId2', label: 'Additional ID #2' },
    ],
  },
  {
    id: 'PT',
    title: 'Telephone Segment (PT)',
    cols: [
      { key: 'mobile', label: 'Telephone No. Mobile' },
      { key: 'residencePhone', label: 'Telephone No. Residence' },
      { key: 'officePhone', label: 'Telephone No. Office' },
    ],
  },
  {
    id: 'EC',
    title: 'Email Contact Segment (EC)',
    cols: [
      { key: 'email1', label: 'Email ID 1' },
      { key: 'email2', label: 'Email ID 2' },
    ],
  },
  {
    id: 'PA',
    title: 'Address Segment (PA)',
    cols: [
      { key: 'addressLine1', label: 'Address Line 1', wide: true },
      { key: 'stateCode1', label: 'State Code 1' },
      { key: 'pinCode1', label: 'PIN Code 1' },
      { key: 'addressCategory1', label: 'Address Category 1' },
      { key: 'residenceCode1', label: 'Residence Code 1' },
      { key: 'addressLine2', label: 'Address Line 2', wide: true },
      { key: 'stateCode2', label: 'State Code 2' },
      { key: 'pinCode2', label: 'PIN Code 2' },
    ],
  },
  {
    id: 'TL',
    title: 'Account Segment (TL)',
    cols: [
      { key: 'accountNumber', label: 'Curr/New Account No.', stickyAcct: true },
      { key: 'accountType', label: 'Account Type' },
      { key: 'ownershipIndicator', label: 'Ownership Indicator' },
      { key: 'dateOpened', label: 'Date Opened/Disbursed' },
      { key: 'dateLastPayment', label: 'Date of Last Payment' },
      { key: 'dateClosed', label: 'Date Closed' },
      { key: 'dateReported', label: 'Date Reported' },
      { key: 'highCredit', label: 'High Credit/Sanctioned Amt' },
      { key: 'currentBalance', label: 'Current Balance' },
      { key: 'amountOverdue', label: 'Amt Overdue' },
      { key: 'dpd', label: 'No of Days Past Due' },
      { key: 'emiAmount', label: 'EMI Amount' },
      { key: 'tenure', label: 'Repayment Tenure' },
      { key: 'interestRate', label: 'Rate of Interest' },
      { key: 'settlementAmount', label: 'Settlement Amt' },
      { key: 'paymentFrequency', label: 'Payment Frequency' },
      { key: 'occupationCode', label: 'Occupation Code' },
      { key: 'income', label: 'Income' },
    ],
  },
];

const flatCols = SEGMENTS.flatMap((s) => s.cols.map((c) => ({ ...c, segment: s.id })));

function cellInvalid(record, key, errorsByLoan) {
  const loanId = record.loanApplicationId;
  const list = errorsByLoan?.[loanId] || [];
  return list.find((e) => {
    const f = String(e.field || '').toLowerCase();
    const k = key.toLowerCase();
    if (k === 'pan' && f.includes('income tax')) return true;
    if (k === 'consumername' && f.includes('consumer name')) return true;
    if (k === 'dob' && f.includes('birth')) return true;
    if (k === 'gender' && f.includes('gender')) return true;
    if (k === 'mobile' && f.includes('mobile')) return true;
    if (k === 'email1' && f.includes('email')) return true;
    if (k === 'addressline1' && f.includes('address line')) return true;
    if (k === 'statecode1' && f.includes('state')) return true;
    if (k === 'pincode1' && f.includes('pin')) return true;
    if (k === 'accountnumber' && f.includes('account no')) return true;
    if (k === 'accounttype' && f.includes('account type')) return true;
    if (k === 'dateopened' && f.includes('opened')) return true;
    return false;
  });
}

export default function CibilSegmentDataGrid({ records = [], errors = [], loading }) {
  const errorsByLoan = React.useMemo(() => {
    const map = {};
    for (const e of errors || []) {
      const id = e.loan_application_id;
      if (!map[id]) map[id] = [];
      map[id].push(e);
    }
    return map;
  }, [errors]);

  if (loading) {
    return (
      <div className="border border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Loading submission rows…
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="border border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No accounts loaded. Create a cycle and click <strong>Load from LOS</strong>.
      </div>
    );
  }

  return (
    <div className="border border-slate-300 bg-white overflow-auto max-h-[62vh]">
      <table className="min-w-max w-full border-collapse text-[11px]">
        <thead className="sticky top-0 z-20">
          <tr>
            <th
              rowSpan={2}
              className="sticky left-0 z-30 bg-slate-100 border border-slate-300 px-2 py-1 text-left font-bold text-slate-700"
            >
              Status
            </th>
            {SEGMENTS.map((seg) => (
              <th
                key={seg.id}
                colSpan={seg.cols.length}
                className="bg-slate-800 text-white border border-slate-600 px-2 py-1.5 text-left font-bold whitespace-nowrap"
              >
                {seg.title}
              </th>
            ))}
          </tr>
          <tr>
            {flatCols.map((col) => (
              <th
                key={`${col.segment}-${col.key}`}
                className={cn(
                  'bg-slate-100 border border-slate-300 px-2 py-1 text-left font-semibold text-slate-700 whitespace-nowrap',
                  col.sticky && 'sticky left-[72px] z-30',
                  col.wide && 'min-w-[220px]'
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((row, idx) => {
            const invalid = row.validationStatus === 'invalid';
            return (
              <tr key={row.loanApplicationId || idx} className={invalid ? 'bg-red-50/40' : 'bg-white'}>
                <td
                  className={cn(
                    'sticky left-0 z-10 border border-slate-200 px-2 py-1 font-semibold whitespace-nowrap',
                    invalid ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                  )}
                >
                  {invalid ? 'Invalid' : 'Valid'}
                </td>
                {flatCols.map((col) => {
                  const bad = cellInvalid(row, col.key, errorsByLoan);
                  const val = row[col.key];
                  return (
                    <td
                      key={`${row.loanApplicationId}-${col.key}`}
                      title={bad ? `${bad.segment}: ${bad.error_message}` : undefined}
                      className={cn(
                        'border border-slate-200 px-2 py-1 font-mono text-slate-800 whitespace-nowrap max-w-[280px] truncate',
                        bad && 'bg-red-100 border-red-300 text-red-800',
                        col.sticky && 'sticky left-[72px] z-10 bg-inherit'
                      )}
                    >
                      {val === null || val === undefined || val === '' ? (
                        <span className="text-slate-300"> </span>
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { SEGMENTS };
