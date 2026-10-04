/**
 * Tamil Nadu domestic (LT-IA) tariff, bi-monthly billing.
 * Figures as publicly reported for the scheme effective 10 May 2026.
 * Rates are configuration: confirm against the TNERC / TNPDCL order and edit here if they change.
 * Each slab is [upper bound in units, rupees per unit]; slabs are telescopic.
 */
export const TARIFF = {
  name: "TNPDCL LT-IA Domestic",
  effective: "10 May 2026",
  cliff: 500, // bi-monthly units; above this the free allowance drops from 200 to 100
  within: [[200, 0], [400, 4.7], [500, 6.3]],
  above: [[100, 0], [400, 4.7], [500, 6.3], [600, 8.4], [800, 9.45], [1000, 10.5], [Infinity, 11.55]],
  fixed: { upTo500W: 30, upTo1kW: 45, perExtraKW: 30 }, // rupees per bi-month
};

export const fixedCharge = (kw = 1) =>
  kw <= 0.5 ? TARIFF.fixed.upTo500W
    : kw <= 1 ? TARIFF.fixed.upTo1kW
    : TARIFF.fixed.upTo1kW + Math.ceil(kw - 1) * TARIFF.fixed.perExtraKW;

export function energyCharge(units) {
  const slabs = units <= TARIFF.cliff ? TARIFF.within : TARIFF.above;
  let prev = 0, total = 0;
  for (const [upper, rate] of slabs) {
    if (units <= prev) break;
    total += (Math.min(units, upper) - prev) * rate;
    prev = upper;
  }
  return total;
}

export const expectedBill = (units, kw = 1) => energyCharge(units) + fixedCharge(kw);

/** Extra cost of being over the cliff compared with using exactly 500 units. */
export function cliffReport(units, kw = 1) {
  if (units <= TARIFF.cliff) return null;
  return { over: units - TARIFF.cliff, extra: expectedBill(units, kw) - expectedBill(TARIFF.cliff, kw) };
}

/** Slab-by-slab calculation, for showing how a bill is built. */
export function breakdown(units, kw = 1) {
  const slabs = units <= TARIFF.cliff ? TARIFF.within : TARIFF.above;
  const rows = [];
  let prev = 0;
  for (const [upper, rate] of slabs) {
    if (units <= prev) break;
    const n = Math.min(units, upper) - prev;
    rows.push({ from: prev + 1, to: Math.min(units, upper), units: n, rate, cost: n * rate });
    prev = upper;
  }
  return { rows, freeUnits: slabs[0][0], fixed: fixedCharge(kw), total: expectedBill(units, kw), atOrBelowCliff: units <= TARIFF.cliff };
}
