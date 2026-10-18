import { test } from "node:test";
import assert from "node:assert/strict";
import { energyCharge, expectedBill, cliffReport, fixedCharge } from "../js/tariff.js";

test("200 units are free at or below the 500-unit line", () => {
  assert.equal(energyCharge(200), 0);
  assert.equal(energyCharge(500), 1570);
});
test("above 500 units only 100 are free and higher slabs apply", () => {
  assert.equal(energyCharge(600), 2880);
});
test("fixed charge follows connected load", () => {
  assert.equal(fixedCharge(0.5), 30);
  assert.equal(fixedCharge(1), 45);
  assert.equal(fixedCharge(3), 105);
});
test("cliff report is null at 500 and positive above", () => {
  assert.equal(cliffReport(500), null);
  assert.equal(cliffReport(501).over, 1);
  assert.ok(cliffReport(501).extra > 470);
});
test("expected bill adds fixed charge", () => {
  assert.equal(expectedBill(500, 1), 1715); // 1570 energy + 45 fixed + 100 fuel
});

import { tariffFor, TARIFF } from "../js/tariff.js";
test("tariff is matched by period dates", () => {
  assert.equal(tariffFor("2026-07-01", "2026-08-31").tariff, TARIFF);
  assert.equal(tariffFor("2025-01-01", "2025-02-28").tariff.cliff, Infinity);
  assert.equal(tariffFor(null).applies, true);
  assert.equal(tariffFor("2024-01-01").applies, false); // before the earliest tariff
  assert.equal(tariffFor("2026-05-01", "2026-06-30").applies, false); // spans the 10 May 2026 change
});
test("2024 tariff has no cliff and matches the published example", () => {
  const t = tariffFor("2025-01-01").tariff;
  assert.equal(energyCharge(550, t), 2460);
  assert.equal(cliffReport(900, 1, t), null);
});
test("totals match the reference calculator's examples", () => {
  assert.equal(expectedBill(400, 1), 1065);
  assert.equal(expectedBill(600, 1), 3045);
  assert.equal(expectedBill(300, 1), 575);
});
