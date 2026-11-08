/**
 * Tamil Nadu domestic (LT-IA) tariffs, bi-monthly billing, kept as a dated list.
 * Each bill is matched to the tariff in force when its period began. Add an entry to support another period.
 * Each slab is [upper bound in units, rupees per unit]; slabs are telescopic.
 * The official TNPDCL bill calculator charges energy only for domestic consumers: no fixed charge, no fuel
 * surcharge and no electricity duty, so none are modelled. Arrears and late fees are not included either.
 */
// Above 500 units on the 2026 scheme: 100 free, then ₹4.70 up to 400 (the 101-200 concession is lost).
const ABOVE_500 = [[100, 0], [400, 4.7], [500, 6.3], [600, 8.4], [800, 9.45], [1000, 10.5], [Infinity, 11.55]];
// The earlier scheme: 100 free, then ₹2.35 for 101-200.
const EARLIER = [[100, 0], [200, 2.35], [400, 4.7], [500, 6.3], [600, 8.4], [800, 9.45], [1000, 10.5], [Infinity, 11.55]];

export const TARIFFS = [
  {
    effective: "2026-05-10",
    name: "TNPDCL LT-IA Domestic (200 free units at or below 500)",
    source: "Checked against the official TNPDCL bill calculator on 8 November 2026 (100, 350, 500 and 501 units).",
    cliff: 500, // above this many units the free allowance drops from 200 to 100
    within: [[200, 0], [400, 4.7], [500, 6.3]],
    above: ABOVE_500,
  },
  {
    effective: "2024-07-01",
    name: "TNERC Tariff Order No. 6 of 2024 (100 free units)",
    source: "Rates confirmed against a real bill (rows from August 2024 to April 2025). The official calculator shows the current scheme only.",
    cliff: Infinity, // one ladder for every bill, so no cliff
    within: EARLIER,
    above: EARLIER,
  },
].sort((a, b) => b.effective.localeCompare(a.effective)); // newest first

export const TARIFF = TARIFFS[0];

/**
 * Tariff for a billing period (dates as YYYY-MM-DD). applies=false when the period began before the
 * earliest known tariff or spans a tariff change, because the bill cannot be checked against one tariff.
 */
export function tariffFor(startISO, endISO) {
  if (!startISO) return { tariff: TARIFF, applies: true };
  const t = TARIFFS.find((x) => startISO >= x.effective);
  if (!t) return { tariff: TARIFFS[TARIFFS.length - 1], applies: false, reason: "before" };
  const e = endISO && TARIFFS.find((x) => endISO >= x.effective);
  if (e && e !== t) return { tariff: t, applies: false, reason: "spans" };
  return { tariff: t, applies: true };
}

const DAY = 86400000;
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/**
 * Expected amount for one bill, or null when it cannot be checked. A period that spans a tariff change is split by days:
 * the days from the change date to the end of the period (inclusive) use the new tariff, the rest of a 60-day cycle the
 * old one. This rule matches one real bill exactly (405 units, 15 Apr to 15 Jun 2026 gave Rs 1061.58) and is not from an official source.
 */
export function auditedBill(units, startISO, endISO) {
  const r = tariffFor(startISO, endISO);
  if (r.applies) return expectedBill(units, r.tariff);
  if (r.reason !== "spans") return null;
  const next = TARIFFS.find((x) => endISO >= x.effective);
  const nd = Math.min(60, Math.max(0, daysBetween(next.effective, endISO) + 1));
  return Math.round((energyCharge(units, r.tariff) * (60 - nd) + energyCharge(units, next) * nd) / 60);
}

export function energyCharge(units, t = TARIFF) {
  const slabs = units <= t.cliff ? t.within : t.above;
  let prev = 0, total = 0;
  for (const [upper, rate] of slabs) {
    if (units <= prev) break;
    total += (Math.min(units, upper) - prev) * rate;
    prev = upper;
  }
  return total;
}

/** The amount the official calculator shows: energy charge rounded to the rupee. Arrears and late fees are excluded. */
export const expectedBill = (units, t = TARIFF) => Math.round(energyCharge(units, t));

/** Extra cost of being over the cliff compared with using exactly the cliff number of units. */
export function cliffReport(units, t = TARIFF) {
  if (units <= t.cliff) return null;
  return { over: units - t.cliff, extra: expectedBill(units, t) - expectedBill(t.cliff, t) };
}

/** Slab-by-slab calculation, for showing how a bill is built. */
export function breakdown(units, t = TARIFF) {
  const slabs = units <= t.cliff ? t.within : t.above;
  const rows = [];
  let prev = 0;
  for (const [upper, rate] of slabs) {
    if (units <= prev) break;
    const n = Math.min(units, upper) - prev;
    rows.push({ from: prev + 1, to: Math.min(units, upper), units: n, rate, cost: n * rate });
    prev = upper;
  }
  return { rows, freeUnits: slabs[0][0], total: expectedBill(units, t), atOrBelowCliff: units <= t.cliff };
}
