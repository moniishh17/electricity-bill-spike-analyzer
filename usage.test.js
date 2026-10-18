import { test } from "node:test";
import assert from "node:assert/strict";
import { yoy, forecast } from "../js/usage.js";
import { expectedBill } from "../js/tariff.js";

const starts = ["2026-01-01", "2026-03-01", "2026-05-01", "2026-07-01", "2026-09-01", "2026-11-01", "2027-01-01", "2027-03-01"];
const values = [5, 5, 6, 7, 5, 5, 6, 6];
const fixture = (n = starts.length) => yoy(starts.slice(0, n).map((start, i) => ({ month: start, start, value: values[i] })));

test("year-on-year matches the same period a year earlier", () => {
  const b = fixture();
  assert.equal(b[0].yoy, null);
  assert.ok(Math.abs(b[6].yoy.pct - 20) < 1e-9); // 6 against 5
  assert.equal(b[6].yoy.prev.start, "2026-01-01");
});
test("bills without a date never match", () => {
  assert.equal(yoy([{ month: "x", start: null, value: 3 }])[0].yoy, null);
});
test("seasonal forecast scales last year's matching period", () => {
  const f = forecast(fixture(), 1, true);
  assert.equal(f.basis, "seasonal");
  assert.ok(Math.abs(f.ratio - 1.2) < 1e-9);
  assert.equal(f.days, 61); // May-Jun 2027
  assert.equal(f.units, Math.round(6 * 1.2 * 61)); // 439
  assert.equal(f.crosses, false);
  assert.equal(f.bill, expectedBill(439, 1));
});
test("without a year of data the forecast averages the last three bills", () => {
  const f = forecast(fixture(5), 1, true);
  assert.equal(f.basis, "recent");
  assert.equal(f.units, Math.round(((6 + 7 + 5) / 3) * f.days));
});
test("a forecast over 500 units reports the daily budget", () => {
  const big = yoy(starts.slice(0, 4).map((start, i) => ({ month: start, start, value: [9, 9, 9, 9][i] })));
  const f = forecast(big, 1, true);
  assert.equal(f.crosses, true);
  assert.equal(f.budget, Math.floor((500 / f.days) * 10) / 10);
});
test("fewer than three dated bills gives no forecast", () => {
  assert.equal(forecast(fixture(2), 1, true), null);
});

test("the recent-bills forecast leaves out spike bills", () => {
  const bills = fixture(5).map((b, i) => (i === 3 ? { ...b, spike: true, value: 20 } : b));
  const f = forecast(bills, 1, true);
  assert.equal(f.basis, "recent");
  assert.equal(f.units, Math.round(((5 + 6 + 5) / 3) * f.days)); // 5, 6, 5: the spike is skipped
});
test("if too few calm bills remain, spikes are kept rather than guessing", () => {
  const bills = fixture(4).map((b) => ({ ...b, spike: true }));
  assert.equal(forecast(bills, 1, true).basis, "recent");
});
