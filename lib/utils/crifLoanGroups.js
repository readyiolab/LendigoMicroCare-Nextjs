/**
 * Group CRIF tradelines into report-style loan categories with subtotals.
 */

const PERSONAL_ABOVE = 'personal_above_1l';
const PERSONAL_BELOW = 'personal_below_1l';
const CREDIT_CARD = 'credit_card';
const GOLD = 'gold_loan';
const HOME_LAP = 'home_lap';
const VEHICLE = 'vehicle_loan';
const OTHER = 'other';

export const CRIF_LOAN_GROUP_ORDER = [
  PERSONAL_ABOVE,
  PERSONAL_BELOW,
  CREDIT_CARD,
  GOLD,
  HOME_LAP,
  VEHICLE,
  OTHER,
];

export const CRIF_LOAN_GROUP_LABELS = {
  [PERSONAL_ABOVE]: 'Personal Loan Above 1 Lakh',
  [PERSONAL_BELOW]: 'Personal Loan Below 1 Lakh',
  [CREDIT_CARD]: 'Credit Card',
  [GOLD]: 'Gold Loan',
  [HOME_LAP]: 'Home Loan / Loan Against Property',
  [VEHICLE]: 'Vehicle Loan',
  [OTHER]: 'Other',
};

const ONE_LAKH = 100000;

export function parseMoney(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(String(value).replace(/,/g, '').replace(/[^\d.-]/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

/** Extract EMI amount from strings like "3,394/Monthly" or "2,923/null". */
export function parseEmiAmount(installmentAmt) {
  if (installmentAmt == null || installmentAmt === '') return 0;
  if (typeof installmentAmt === 'number' && Number.isFinite(installmentAmt)) return installmentAmt;
  const raw = String(installmentAmt).split('/')[0].trim();
  return parseMoney(raw);
}

function normalizeType(accountType) {
  return String(accountType || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyLoanGroup(tradeline) {
  const type = normalizeType(tradeline?.account_type);
  const sanctioned = parseMoney(tradeline?.sanctioned_amount);

  if (/credit\s*card|\bcc\b/.test(type)) return CREDIT_CARD;
  if (/\bgold\b/.test(type)) return GOLD;
  if (
    /home\s*loan|housing|property|\blap\b|loan\s*against\s*property|microfinance\s*housing/.test(
      type
    )
  ) {
    return HOME_LAP;
  }
  if (
    /vehicle|auto\s*loan|two[\s-]*wheeler|2[\s-]*wheeler|\bcar\b|commercial\s*vehicle|tractor/.test(
      type
    )
  ) {
    return VEHICLE;
  }

  const isPersonalLike =
    /personal|short\s*term\s*personal|consumer\s*loan|microfinance(?!\s*housing)/.test(type) ||
    type === 'consumer';

  if (isPersonalLike) {
    return sanctioned >= ONE_LAKH ? PERSONAL_ABOVE : PERSONAL_BELOW;
  }

  return OTHER;
}

export function isTradelineOpen(tradeline) {
  const status = String(tradeline?.status || tradeline?.account_status || '').toLowerCase();
  if (/closed|inactive|written[\s-]*off|settled|suit/.test(status)) return false;
  if (/active|open|live|current/.test(status)) return true;
  const balance = parseMoney(tradeline?.current_balance ?? tradeline?._balance);
  if (status) return !/closed/.test(status);
  return balance > 0;
}

export function isTradelineOverdue(tradeline) {
  const overdue = parseMoney(tradeline?.overdue_amount ?? tradeline?._overdue);
  if (overdue > 0) return true;
  const dpd = Number(tradeline?.dpd ?? tradeline?.days_past_due ?? 0);
  return Number.isFinite(dpd) && dpd > 0;
}

export function tradelineMatchesSearch(tradeline, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [
    tradeline?.credit_guarantor,
    tradeline?.account_type,
    tradeline?.account_number,
    tradeline?.status,
  ]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');
  return hay.includes(q);
}

/**
 * Filter tradelines then regroup for UI tables.
 * @param {object[]} tradelines
 * @param {{ search?: string, status?: 'all'|'open'|'closed', overdue?: 'all'|'overdue', category?: string }} filters
 */
export function filterTradelines(tradelines, filters = {}) {
  const search = filters.search || '';
  const status = filters.status || 'all';
  const overdue = filters.overdue || 'all';
  const category = filters.category || 'all';

  return (Array.isArray(tradelines) ? tradelines : []).filter((t) => {
    if (!tradelineMatchesSearch(t, search)) return false;
    const open = isTradelineOpen(t);
    if (status === 'open' && !open) return false;
    if (status === 'closed' && open) return false;
    if (overdue === 'overdue' && !isTradelineOverdue(t)) return false;
    if (category && category !== 'all' && classifyLoanGroup(t) !== category) return false;
    return true;
  });
}

function emptyTotals() {
  return { sanctioned: 0, emi: 0, balance: 0, overdue: 0 };
}

function parseOpenDateMs(value) {
  const s = String(value || '').trim();
  if (!s) return 0;
  const m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (m) {
    const t = Date.parse(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`);
    return Number.isFinite(t) ? t : 0;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Live (open) loans first, then highest outstanding, overdue, newest open date.
 */
export function sortTradelinesLiveFirst(loans = []) {
  return [...(Array.isArray(loans) ? loans : [])].sort((a, b) => {
    const aOpen = isTradelineOpen(a) ? 1 : 0;
    const bOpen = isTradelineOpen(b) ? 1 : 0;
    if (bOpen !== aOpen) return bOpen - aOpen;

    const aBal = parseMoney(a._balance ?? a.current_balance);
    const bBal = parseMoney(b._balance ?? b.current_balance);
    if (bBal !== aBal) return bBal - aBal;

    const aOd = parseMoney(a._overdue ?? a.overdue_amount);
    const bOd = parseMoney(b._overdue ?? b.overdue_amount);
    if (bOd !== aOd) return bOd - aOd;

    return parseOpenDateMs(b.open_date) - parseOpenDateMs(a.open_date);
  });
}

/**
 * @param {object[]} tradelines
 * @returns {{ id: string, label: string, totals: object, loans: object[] }[]}
 */
export function groupTradelinesByCategory(tradelines) {
  const buckets = Object.fromEntries(
    CRIF_LOAN_GROUP_ORDER.map((id) => [id, { id, label: CRIF_LOAN_GROUP_LABELS[id], loans: [], totals: emptyTotals() }])
  );

  for (const t of Array.isArray(tradelines) ? tradelines : []) {
    const groupId = classifyLoanGroup(t);
    const sanctioned = parseMoney(t.sanctioned_amount);
    const emi = parseEmiAmount(t.installment_amt);
    const balance = parseMoney(t.current_balance);
    const overdue = parseMoney(t.overdue_amount);
    const loan = {
      ...t,
      _sanctioned: sanctioned,
      _emi: emi,
      _balance: balance,
      _overdue: overdue,
    };
    const bucket = buckets[groupId];
    bucket.loans.push(loan);
    bucket.totals.sanctioned += sanctioned;
    bucket.totals.emi += emi;
    bucket.totals.balance += balance;
    bucket.totals.overdue += overdue;
  }

  const groups = CRIF_LOAN_GROUP_ORDER.map((id) => {
    const g = buckets[id];
    g.loans = sortTradelinesLiveFirst(g.loans);
    return g;
  }).filter((g) => g.loans.length > 0);

  // Groups with any open loans first; preserve category order within each tier
  return groups.sort((a, b) => {
    const aHasOpen = a.loans.some((t) => isTradelineOpen(t)) ? 1 : 0;
    const bHasOpen = b.loans.some((t) => isTradelineOpen(t)) ? 1 : 0;
    if (bHasOpen !== aHasOpen) return bHasOpen - aHasOpen;
    return CRIF_LOAN_GROUP_ORDER.indexOf(a.id) - CRIF_LOAN_GROUP_ORDER.indexOf(b.id);
  });
}

function parseInquiryDate(v) {
  const s = String(v || '').trim();
  const m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`).getTime();
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/**
 * Filter inquiries by rolling window (days). `all` returns full list.
 */
export function filterInquiriesByWindow(inquiries = [], windowDays = 'all') {
  const list = Array.isArray(inquiries) ? inquiries : [];
  if (windowDays === 'all' || windowDays == null || windowDays === '') return list;
  const days = Number(windowDays);
  if (!Number.isFinite(days) || days <= 0) return list;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return list.filter((h) => {
    const t = parseInquiryDate(h.inquiry_date);
    return t != null && t >= cutoff;
  });
}

/**
 * Enquiry counts in last N days from inquiry_history rows.
 */
export function enquiryWindowCounts(inquiries = []) {
  const list = Array.isArray(inquiries) ? inquiries : [];
  return {
    last30: filterInquiriesByWindow(list, 30).length,
    last90: filterInquiriesByWindow(list, 90).length,
    last180: filterInquiriesByWindow(list, 180).length,
    total: list.length,
  };
}
