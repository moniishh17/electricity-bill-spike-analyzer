/** Cliff Guard: project the current bi-monthly cycle and show how to stay under 500 units. */
import { TARIFF, expectedBill } from "./tariff.js";

export function plan({ used, elapsed, cycle = 60, kw = 1 }) {
  if (!(used >= 0)) throw new Error("Enter the units used so far (0 or more).");
  if (!(elapsed > 0) || elapsed > cycle) throw new Error(`Days elapsed must be between 1 and ${cycle}.`);
  const limit = TARIFF.cliff;
  const rate = used / elapsed;
  const left = cycle - elapsed;
  const projected = Math.round(used + rate * left);
  const alreadyOver = used > limit;
  const crosses = projected > limit;
  const budget = left > 0 && !alreadyOver ? (limit - used) / left : null; // units/day allowed from now
  return {
    rate, left, projected, crosses, alreadyOver, budget,
    bill: expectedBill(projected, kw),
    extra: crosses ? expectedBill(projected, kw) - expectedBill(limit, kw) : 0,
    cutPerDay: crosses && budget !== null ? rate - budget : 0,
  };
}
