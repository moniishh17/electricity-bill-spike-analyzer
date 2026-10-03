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
  assert.equal(expectedBill(500, 1), 1615);
});
