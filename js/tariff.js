/**
 * Tamil Nadu domestic (LT-IA) tariffs, bi-monthly billing, kept as a dated list.
 * Each bill is matched to the tariff in force when its period began. Add an entry to support another period.
 * Each slab is [upper bound in units, rupees per unit]; slabs are telescopic.
 * fsa is an indicative fuel surcharge in rupees per unit (TNERC revises it quarterly).
 */
const LADDER = [[100, 0], [400, 4.7], [500, 6.3], [600, 8.4], [800, 9.45], [1000, 10.5], [Infinity, 11.55]];
const FIXED = { upTo500W: 30, upTo1kW: 45, perExtraKW: 30 }; // rupees per bi-month

export const TARIFFS = [
  {
    effective: "2026-05-10",
    name: "TNPDCL LT-IA Domestic (200 free units at or below 500)",
    source: "Publicly reported figures (electricbillcalculate.in, Verified.RealEstate). Confirm against the TNERC/TNPDCL order.",
    cliff: 500, // above this many units the free allowance drops from 200 to 100
    fsa: 0.2,
    within: [[200, 0], [400, 4.7], [500, 6.3]],
    above: LADDER,
    fixed: FIXED,
  },
  {
    effective: "2024-07-01",
    name: "TNERC Tariff Order No. 6 of 2024 (100 free units)",
    source: "Publicly reported figures (electricbillcalculate.in). Confirm against the TNERC order.",
    cliff: Infinity, // one ladder for every bill, so no cliff
    fsa: 0.2,
    within: LADDER,
    above: LADDER,
    fixed: FIXED,
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

export const fixedCharge = (kw = 1, t = TARIFF) =>
  kw <= 0.5 ? t.fixed.upTo500W
    : kw <= 1 ? t.fixed.upTo1kW
    : t.fixed.upTo1kW + Math.ceil(kw - 1) * t.fixed.perExtraKW;

export const fuelCharge = (units, t = TARIFF) => Math.round(units * t.fsa * 100) / 100;

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

/** Energy + fixed + fuel surcharge. Domestic bills carry no electricity duty. Arrears and late fees are excluded. */
export const expectedBill = (units, kw = 1, t = TARIFF) => energyCharge(units, t) + fixedCharge(kw, t) + fuelCharge(units, t);

/** Extra cost of being over the cliff compared with using exactly the cliff number of units. */
export function cliffReport(units, kw = 1, t = TARIFF) {
  if (units <= t.cliff) return null;
  return { over: units - t.cliff, extra: expectedBill(units, kw, t) - expectedBill(t.cliff, kw, t) };
}

/** Slab-by-slab calculation, for showing how a bill is built. */
export function breakdown(units, kw = 1, t = TARIFF) {
  const slabs = units <= t.cliff ? t.within : t.above;
  const rows = [];
  let prev = 0;
  for (const [upper, rate] of slabs) {
    if (units <= prev) break;
    const n = Math.min(units, upper) - prev;
    rows.push({ from: prev + 1, to: Math.min(units, upper), units: n, rate, cost: n * rate });
    prev = upper;
  }
  return { rows, freeUnits: slabs[0][0], fixed: fixedCharge(kw, t), fsa: fuelCharge(units, t), total: expectedBill(units, kw, t), atOrBelowCliff: units <= t.cliff };
}
