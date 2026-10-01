/**
 * Client-side AA / Digitap bank report → Excel (.xlsx) download.
 */

function safeStr(v) {
  if (v == null || v === '') return '';
  return String(v);
}

function numOrEmpty(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : '';
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeFilePart(value) {
  return (
    String(value || 'report')
      .replace(/[^\w.-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64) || 'report'
  );
}

export function buildAaMetricsRows(normalized = {}, meta = {}) {
  return [
    { Field: 'Lead / App', Value: safeStr(meta.leadId || meta.applicationRef) },
    { Field: 'Customer', Value: safeStr(meta.customerName) },
    { Field: 'Customer code', Value: safeStr(meta.customerCode) },
    { Field: 'Avg balance', Value: numOrEmpty(normalized.avg_balance) },
    { Field: 'Bounce count', Value: numOrEmpty(normalized.bounce_count) },
    { Field: 'Negative balance days', Value: numOrEmpty(normalized.negative_balance_days) },
    { Field: 'Salary credit consistency %', Value: numOrEmpty(normalized.salary_credit_consistency_pct) },
    { Field: 'Estimated monthly income', Value: numOrEmpty(normalized.estimated_monthly_income) },
    {
      Field: 'Flagged categories',
      Value: Array.isArray(normalized.flagged_categories_found)
        ? normalized.flagged_categories_found.join(', ')
        : safeStr(normalized.flagged_categories_found),
    },
    { Field: 'Mapping pending', Value: normalized.mapping_pending ? 'Yes' : 'No' },
    { Field: 'Source shape', Value: safeStr(normalized.source_shape) },
    { Field: 'Exported at', Value: new Date().toISOString() },
  ];
}

export function buildAaAccountRows(accounts = []) {
  return (Array.isArray(accounts) ? accounts : []).map((a) => ({
    Bank: safeStr(a.bank),
    Account: safeStr(a.account_number || a.accountNumber),
    Type: safeStr(a.type || a.account_type),
    Balance: numOrEmpty(a.balance),
    Opened: safeStr(a.opened || a.opened_date),
    Status: safeStr(a.status),
  }));
}

export function buildAaMonthlyRows(monthly = []) {
  return (Array.isArray(monthly) ? monthly : []).map((m) => ({
    Month: safeStr(m.month),
    Credits: numOrEmpty(m.credits),
    Debits: numOrEmpty(m.debits),
    'Avg balance': numOrEmpty(m.avg_balance),
    'Net cash flow': numOrEmpty(m.net_cash_flow),
  }));
}

export function buildAaTransactionRows(transactions = []) {
  return (Array.isArray(transactions) ? transactions : []).map((t) => ({
    Date: safeStr(t.date),
    Amount: numOrEmpty(t.amount),
    Balance: numOrEmpty(t.balance),
    Narration: safeStr(t.narration),
    Bank: safeStr(t.bank),
    Account: safeStr(t.account_number || t.accountNumber),
  }));
}

export function canExportAaBankExcel(bankReport) {
  if (!bankReport?.available && !bankReport?.normalized) return false;
  const ui = bankReport?.normalized?.ui || {};
  return Boolean(
    (ui.recent_transactions && ui.recent_transactions.length) ||
      (ui.accounts && ui.accounts.length) ||
      (ui.monthly && ui.monthly.length) ||
      bankReport?.normalized
  );
}

export async function downloadAaBankExcel({ bankReport, meta = {} } = {}) {
  const XLSX = await import('xlsx');
  const normalized = bankReport?.normalized || {};
  const ui = normalized.ui || {};

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(buildAaMetricsRows(normalized, meta)),
    'Metrics'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(buildAaAccountRows(ui.accounts)),
    'Accounts'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(buildAaMonthlyRows(ui.monthly)),
    'Monthly'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(buildAaTransactionRows(ui.recent_transactions)),
    'Transactions'
  );

  const fileName = `AA_Bank_${sanitizeFilePart(meta.leadId || meta.applicationRef)}_${todayStamp()}.xlsx`;
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

export function buildSalaryHistoryRows(transactions = [], meta = {}) {
  const lead = safeStr(meta.leadId || meta.applicationRef);
  const customer = safeStr(meta.customerName);
  return (Array.isArray(transactions) ? transactions : []).map((t) => ({
    Date: safeStr(t.date),
    Narration: safeStr(t.narration),
    Amount: numOrEmpty(t.amount),
    'Lead / App': lead,
    Customer: customer,
  }));
}

export async function downloadSalaryHistoryExcel({ transactions = [], meta = {} } = {}) {
  const XLSX = await import('xlsx');
  const rows = buildSalaryHistoryRows(transactions, meta);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      rows.length
        ? rows
        : [{ Date: '', Narration: 'No salary credit transactions', Amount: '', 'Lead / App': '', Customer: '' }]
    ),
    'Salary history'
  );

  const fileName = `Salary_History_${sanitizeFilePart(meta.leadId || meta.applicationRef)}_${todayStamp()}.xlsx`;
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

export function buildPaydayHistoryRows(transactions = [], meta = {}) {
  const lead = safeStr(meta.leadId || meta.applicationRef);
  const customer = safeStr(meta.customerName);
  return (Array.isArray(transactions) ? transactions : []).map((t) => ({
    Date: safeStr(t.date),
    Narration: safeStr(t.narration),
    Amount: numOrEmpty(t.amount),
    'Lead / App': lead,
    Customer: customer,
  }));
}

export async function downloadPaydayHistoryExcel({ transactions = [], meta = {} } = {}) {
  const XLSX = await import('xlsx');
  const rows = buildPaydayHistoryRows(transactions, meta);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      rows.length
        ? rows
        : [{ Date: '', Narration: 'No payday transactions', Amount: '', 'Lead / App': '', Customer: '' }]
    ),
    'Payday history'
  );

  const fileName = `Payday_History_${sanitizeFilePart(meta.leadId || meta.applicationRef)}_${todayStamp()}.xlsx`;
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

