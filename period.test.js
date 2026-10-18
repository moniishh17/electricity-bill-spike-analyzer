import { test } from "node:test";
import assert from "node:assert/strict";
import { periodDays, periodLabel, parsePeriodLabel, resolveTo } from "../js/period.js";

test("counts days for two-month periods, including leap years", () => {
  assert.equal(periodDays(0, 2025, 1), 59); // Jan-Feb 2025
  assert.equal(periodDays(0, 2024, 1), 60); // Jan-Feb 2024 (leap)
  assert.equal(periodDays(6, 2025, 7), 62); // Jul-Aug
  assert.equal(periodDays(11, 2025, 0), 62); // Dec 2025 - Jan 2026
  assert.equal(periodDays(10, 2025, 0), 92); // Nov-Jan is three months
});
test("period wrapping past December moves to the next year", () => {
  assert.equal(resolveTo(10, 2025, 0), 2026);
  assert.equal(resolveTo(2, 2025, 3), 2025);
});
test("labels read naturally", () => {
  assert.equal(periodLabel(0, 2025, 1), "Jan–Feb 2025");
  assert.equal(periodLabel(11, 2025, 0), "Dec 2025–Jan 2026");
});
test("parses labels back, with and without years", () => {
  assert.deepEqual(parsePeriodLabel("Jan–Feb 2025", 2000), { fromM: 0, fromY: 2025, toM: 1 });
  assert.deepEqual(parsePeriodLabel("Mar-Apr", 2025), { fromM: 2, fromY: 2025, toM: 3 });
  assert.deepEqual(parsePeriodLabel("Dec 2025–Jan 2026", 2000), { fromM: 11, fromY: 2025, toM: 0 });
  assert.equal(parsePeriodLabel("summer bill", 2025), null);
});
