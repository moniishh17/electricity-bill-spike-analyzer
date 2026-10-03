/** Core statistics. Pure functions, no DOM, so they are easy to test. */
export const MIN_BILLS = 4;

export const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Flag spikes with a robust z-score (median and MAD), which a single huge
 * month cannot distort the way mean and standard deviation can.
 * If every bill has a day count, usage is compared per day so a 60-day
 * billing cycle is not mistaken for a spike.
 */
export function analyze(rows, { zThreshold = 2, minPct = 20, rateFactor = 1.25 } = {}) {
  if (rows.length < MIN_BILLS) throw new Error(`Add at least ${MIN_BILLS} bills to establish a normal level.`);
  const perDay = rows.every((r) => r.days);
  const measure = (r) => (perDay ? r.units / r.days : r.units);
  const baseline = median(rows.map(measure));
  const mad = median(rows.map((r) => Math.abs(measure(r) - baseline))) || baseline * 0.1;
  const rateMedian = median(rows.map((r) => r.amount / r.units));

  const bills = rows.map((r) => {
    const value = measure(r);
    const rate = r.amount / r.units;
    const pct = ((value - baseline) / baseline) * 100;
    const z = (0.6745 * (value - baseline)) / mad;
    return { ...r, value, rate, pct, z, spike: z > zThreshold && pct > minPct, rateJump: rate > rateMedian * rateFactor };
  });

  const extraCost = bills
    .filter((b) => b.spike)
    .reduce((t, b) => t + (b.value - baseline) * (perDay ? b.days : 1) * b.rate, 0);

  return { bills, baseline, rateMedian, perDay, unit: perDay ? "kWh/day" : "kWh", extraCost };
}
