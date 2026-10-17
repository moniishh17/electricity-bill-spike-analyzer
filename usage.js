/** Usage analysis: year-on-year comparison and a next-bill forecast. Pure functions, no DOM. */
import { periodDays, periodDates } from "./period.js";
import { tariffFor, expectedBill } from "./tariff.js";

const parse = (iso) => { const [y, m] = iso.split("-").map(Number); return { y, m: m - 1 }; };
const key = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}-01`;
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

/** Attach { prev, pct } to every bill that has a bill for the same period one year earlier. */
export function yoy(bills) {
  const byStart = new Map(bills.filter((b) => b.start).map((b) => [b.start, b]));
  return bills.map((b) => {
    if (!b.start) return { ...b, yoy: null };
    const { y, m } = parse(b.start);
    const prev = byStart.get(key(y - 1, m));
    return { ...b, yoy: prev ? { prev, pct: ((b.value - prev.value) / prev.value) * 100 } : null };
  });
}

/**
 * Forecast the bill after the latest one (assumes two-month periods).
 * Seasonal when last year's matching period exists: that bill scaled by how this year compares so far.
 * Otherwise the average of the last three normal bills: spike bills are left out so one outlier cannot drag it up
 * (unless fewer than three normal bills exist).
 */
export function forecast(bills, kw = 1, perDay = true) {
  const dated = bills.filter((b) => b.start).sort((a, b) => a.start.localeCompare(b.start));
  if (dated.length < 3) return null;
  const last = dated[dated.length - 1];
  const { y, m } = parse(last.start);
  const fromM = (m + 2) % 12, fromY = y + Math.floor((m + 2) / 12), toM = (fromM + 1) % 12;
  const days = periodDays(fromM, fromY, toM);
  const { start, end } = periodDates(fromM, fromY, toM);

  const lastYear = dated.find((b) => b.start === key(fromY - 1, fromM));
  const ratios = dated.filter((b) => b.yoy ?? false).slice(-3).map((b) => b.yoy.pct / 100 + 1);
  const seasonal = lastYear && ratios.length > 0;
  const ratio = seasonal ? mean(ratios) : null;
  const calm = dated.filter((b) => !b.spike);
  const recent = (calm.length >= 3 ? calm : dated).slice(-3);
  const base = seasonal ? lastYear.value * ratio : mean(recent.map((b) => b.value));
  const units = Math.round(perDay ? base * days : base);

  const { tariff, applies } = tariffFor(start, end);
  return {
    fromM, fromY, toM, days, units, ratio,
    basis: seasonal ? "seasonal" : "recent",
    cliffKnown: applies,
    bill: applies ? expectedBill(units, kw, tariff) : null,
    crosses: units > tariff.cliff,
    budget: Number.isFinite(tariff.cliff) ? Math.floor((tariff.cliff / days) * 10) / 10 : null,
  };
}
