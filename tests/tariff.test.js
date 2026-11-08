import { test } from "node:test";
import assert from "node:assert/strict";
import { energyCharge, expectedBill, cliffReport, auditedBill } from "../js/tariff.js";

test("200 units are free at or below the 500-unit line", () => {
  assert.equal(energyCharge(200), 0);
  assert.equal(energyCharge(500), 1570);
});
test("above 500 units only 100 are free and higher slabs apply", () => {
  assert.equal(energyCharge(600), 2880);
});
test("matches the official TNPDCL bill calculator (checked 8 November 2026)", () => {
  assert.equal(expectedBill(100), 0);
  assert.equal(expectedBill(350), 705);
  assert.equal(expectedBill(500), 1570);
  assert.equal(expectedBill(501), 2048); // 2048.4 rounded, as the calculator shows
});
test("cliff report is null at 500 and positive above", () => {
  assert.equal(cliffReport(500), null);
  assert.equal(cliffReport(501).over, 1);
  assert.ok(cliffReport(501).extra > 470);
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
  assert.equal(energyCharge(550, t), 2225); // 100 free, 100 at 2.35, 200 at 4.70, 100 at 6.30, 50 at 8.40
  assert.equal(cliffReport(900, t), null);
});
test("totals at other usage levels follow the same slabs", () => {
  assert.equal(expectedBill(400), 940);
  assert.equal(expectedBill(600), 2880);
  assert.equal(expectedBill(300), 470);
});

test("a bill spanning the 10 May 2026 change is split by days (real bill: 405 units, 15 Apr-15 Jun 2026 = 1062)", () => {
  assert.equal(auditedBill(405, "2026-04-15", "2026-06-15"), 1062);
  assert.equal(auditedBill(405, "2026-01-01", "2026-02-28") > 0, true);
  assert.equal(auditedBill(405, "2024-01-01", "2024-02-28"), null);
});
