/** Billing-period helpers: month labels and day counts. Pure functions, easy to test. */
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Year the "to" month falls in: same year, or the next one if it wraps past December. */
export const resolveTo = (fromM, fromY, toM) => (toM >= fromM ? fromY : fromY + 1);

/** Days from the 1st of the from-month to the end of the to-month (leap years included). */
export function periodDays(fromM, fromY, toM) {
  const toY = resolveTo(fromM, fromY, toM);
  return Math.round((Date.UTC(toY, toM + 1, 1) - Date.UTC(fromY, fromM, 1)) / 86400000);
}

export function periodLabel(fromM, fromY, toM) {
  const toY = resolveTo(fromM, fromY, toM);
  return toY === fromY
    ? `${MONTHS[fromM]}–${MONTHS[toM]} ${fromY}`
    : `${MONTHS[fromM]} ${fromY}–${MONTHS[toM]} ${toY}`;
}

/** Read labels like "Jan–Feb", "Jan–Feb 2025" or "Nov 2025–Jan 2026". Returns null if unrecognised. */
export function parsePeriodLabel(label, defaultYear) {
  const m = /^([a-z]+)\s*(\d{4})?\s*[–—-]\s*([a-z]+)\s*(\d{4})?$/i.exec(String(label).trim());
  if (!m) return null;
  const idx = (s) => MONTHS.findIndex((x) => x.toLowerCase() === s.slice(0, 3).toLowerCase());
  const fromM = idx(m[1]), toM = idx(m[3]);
  if (fromM < 0 || toM < 0) return null;
  const fromY = m[2] ? +m[2] : m[4] ? (toM >= fromM ? +m[4] : +m[4] - 1) : defaultYear;
  return { fromM, fromY, toM };
}
