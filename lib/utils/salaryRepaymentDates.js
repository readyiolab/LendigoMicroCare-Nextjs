/**
 * Repayment date suggestions based on the customer's salary day (local calendar days).
 * Server accepts tenure between 7 and 45 days.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export const MIN_REPAYMENT_TENURE_DAYS = 7;
export const MAX_REPAYMENT_TENURE_DAYS = 45;

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Salary day in the given month, clamped to the month end (31 → 30 Sep, 28/29 Feb). */
function salaryDayInMonth(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/** Day of month (1-31) from a stored salary date, or null. */
export function getSalaryDay(storedSalaryDate) {
  if (!storedSalaryDate) return null;
  if (typeof storedSalaryDate === 'string') {
    const m = storedSalaryDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return Number(m[3]);
  }
  const stored = new Date(storedSalaryDate);
  return Number.isNaN(stored.getTime()) ? null : stored.getDate();
}

export function resolveMaxTenureDays(profileMaxTenure) {
  const n = parseInt(profileMaxTenure, 10);
  if (!Number.isFinite(n) || n < MIN_REPAYMENT_TENURE_DAYS) return MAX_REPAYMENT_TENURE_DAYS;
  return Math.min(n, MAX_REPAYMENT_TENURE_DAYS);
}

export function daysFromToday(date, now = new Date()) {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export function toLocalISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * First salary day at least `minTenureDays` away, never beyond `maxTenureDays`.
 * Returns null when no salary date is on file.
 */
export function getNextSalaryRepaymentDate(
  storedSalaryDate,
  { maxTenureDays = MAX_REPAYMENT_TENURE_DAYS, minTenureDays = MIN_REPAYMENT_TENURE_DAYS, now = new Date() } = {}
) {
  if (!storedSalaryDate) return null;
  const salaryDay = getSalaryDay(storedSalaryDate);
  if (!salaryDay) return null;

  const today = startOfDay(now);
  const maxDate = addDays(today, maxTenureDays);

  for (let offset = 0; offset <= 3; offset++) {
    const candidate = salaryDayInMonth(today.getFullYear(), today.getMonth() + offset, salaryDay);
    if (daysFromToday(candidate, today) >= minTenureDays) {
      return candidate > maxDate ? maxDate : candidate;
    }
  }
  return maxDate;
}

/** Salary date, +1 and +2 days — dropping any that exceed the max tenure. */
export function getRepaymentDateOptions(
  baseDate,
  { maxTenureDays = MAX_REPAYMENT_TENURE_DAYS, now = new Date() } = {}
) {
  const options = [0, 1, 2]
    .map((offset) => addDays(startOfDay(baseDate), offset))
    .filter((d) => daysFromToday(d, now) <= maxTenureDays);
  return options.length ? options : [startOfDay(baseDate)];
}
