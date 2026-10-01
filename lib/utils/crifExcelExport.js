/**
 * Client-side CIBIL / CRIF report → Excel (.xlsx) download.
 */
import { enquiryWindowCounts, isTradelineOpen, parseEmiAmount, parseMoney } from '@/lib/utils/crifLoanGroups';

function safeStr(v) {
  if (v == null || v === '') return '';
  return String(v);
}

function moneyNum(v) {
  const n = parseMoney(v);
  return Number.isFinite(n) ? n : '';
}

function yesNo(v) {
  if (v == null || v === '') return '';
  return v ? 'Yes' : 'No';
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeFilePart(value) {
  return String(value || 'report')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'report';
}

/** 102 / incomplete reports have no credit file — zero counts would read as a clean record. */
function hasNoCreditFile(summary) {
  const verification = String(summary?.verificationStatus || '').toLowerCase();
  return (
    Number(summary?.resultCode) === 102 ||
    verification === 'no_record' ||
    verification === 'incomplete_payload'
  );
}

export function buildCrifSummaryRows({ summary, meta = {}, inquiryCounts = {} } = {}) {
  const s = hasNoCreditFile(summary) ? {} : summary?.summary || {};
  return [
    { Field: 'Lead / App', Value: safeStr(meta.leadId || meta.applicationRef) },
    { Field: 'Customer', Value: safeStr(meta.customerName) },
    { Field: 'Customer code', Value: safeStr(meta.customerCode) },
    { Field: 'Loan account', Value: safeStr(meta.loanAccountNumber) },
    { Field: 'Report id', Value: safeStr(summary?.id) },
    { Field: 'Provider', Value: safeStr(summary?.provider) },
    { Field: 'Score', Value: summary?.score ?? '' },
    { Field: 'Bureau result / risk band', Value: safeStr(meta.riskBand) },
    { Field: 'Active accounts', Value: s.activeAccounts ?? '' },
    { Field: 'Overdue accounts', Value: s.overdueAccounts ?? '' },
    { Field: 'Days past due (max)', Value: s.daysPastDue ?? '' },
    { Field: 'Total overdue amount', Value: moneyNum(s.totalOverdueAmount) },
    { Field: 'Inquiries (6m)', Value: s.inquiries6m ?? '' },
    { Field: 'Enquiries last 30d', Value: inquiryCounts.last30 ?? '' },
    { Field: 'Enquiries last 90d', Value: inquiryCounts.last90 ?? '' },
    { Field: 'Enquiries last 180d', Value: inquiryCounts.last180 ?? '' },
    { Field: 'Enquiries total', Value: inquiryCounts.total ?? '' },
    { Field: 'Oldest account', Value: safeStr(s.oldest_account_date || s.oldestAccountDate) },
    { Field: 'Newest account', Value: safeStr(s.newest_account_date || s.newestAccountDate) },
    { Field: 'Result code', Value: summary?.resultCode ?? '' },
    { Field: 'Verification', Value: safeStr(summary?.verificationStatus) },
    { Field: 'Exported at', Value: new Date().toISOString() },
  ];
}

export function buildCrifLoanRows(tradelines = []) {
  return (Array.isArray(tradelines) ? tradelines : []).map((t, i) => {
    const open = isTradelineOpen(t);
    return {
      '#': i + 1,
      Category: safeStr(t._categoryLabel || t._groupLabel),
      'Loan type': safeStr(t.account_type),
      'Bank / lender': safeStr(t.credit_guarantor),
      'Account #': safeStr(t.account_number),
      Status: safeStr(t.status || (open ? 'open' : 'closed')),
      Opened: safeStr(t.open_date),
      Closed: open ? '' : safeStr(t.closed_date),
      Reported: safeStr(t.report_date),
      Sanctioned: moneyNum(t._sanctioned ?? t.sanctioned_amount),
      EMI: moneyNum(t._emi ?? parseEmiAmount(t.installment_amt)),
      Balance: moneyNum(t._balance ?? t.current_balance),
      Overdue: moneyNum(t._overdue ?? t.overdue_amount),
      DPD: t.dpd != null && t.dpd !== '' ? Number(t.dpd) : '',
      Secured: yesNo(t.secured),
      Ownership: safeStr(t.ownership_ind),
      'Write-off': yesNo(t.write_off),
      Settlement: yesNo(t.settlement),
    };
  });
}

export function buildCrifEnquiryRows(inquiries = []) {
  return (Array.isArray(inquiries) ? inquiries : []).map((h, i) => ({
    '#': i + 1,
    Date: safeStr(h.inquiry_date),
    Lender: safeStr(h.member_name),
    Purpose: safeStr(h.purpose),
    Amount: moneyNum(h.amount),
  }));
}

/**
 * Flatten loan groups (UI order) into tradeline list with category label.
 */
export function flattenLoanGroups(loanGroups = []) {
  const rows = [];
  for (const g of Array.isArray(loanGroups) ? loanGroups : []) {
    for (const loan of g.loans || []) {
      rows.push({ ...loan, _categoryLabel: g.label || g.id });
    }
  }
  return rows;
}

export async function downloadCrifExcel({
  summary,
  tradelines,
  inquiries,
  inquiryCounts: inquiryCountsOverride,
  meta = {},
} = {}) {
  const XLSX = await import('xlsx');
  const allInquiries = Array.isArray(inquiries) ? inquiries : [];
  const counts =
    inquiryCountsOverride && typeof inquiryCountsOverride === 'object'
      ? inquiryCountsOverride
      : enquiryWindowCounts(allInquiries);

  const wb = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.json_to_sheet(
    buildCrifSummaryRows({ summary, meta, inquiryCounts: counts })
  );
  const loansSheet = XLSX.utils.json_to_sheet(buildCrifLoanRows(tradelines));
  const enquirySheet = XLSX.utils.json_to_sheet(buildCrifEnquiryRows(allInquiries));

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(wb, loansSheet, 'Loans');
  XLSX.utils.book_append_sheet(wb, enquirySheet, 'Enquiries');

  const fileName = `CIBIL_${sanitizeFilePart(meta.leadId || meta.applicationRef)}_${todayStamp()}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return fileName;
}
