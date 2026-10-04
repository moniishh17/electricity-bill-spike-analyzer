import { test } from "node:test";
import assert from "node:assert/strict";
import { breakdown } from "../js/tariff.js";
import { applianceUnits } from "../js/learn.js";

test("breakdown above 500 units lists each slab and totals correctly", () => {
  const b = breakdown(600, 1);
  assert.equal(b.rows.length, 4);
  assert.equal(b.freeUnits, 100);
  assert.equal(b.rows.reduce((t, r) => t + r.cost, 0) + b.fixed, b.total);
  assert.equal(b.total, 2925);
});
test("breakdown at or below 500 units has 200 free", () => {
  const b = breakdown(150, 1);
  assert.equal(b.freeUnits, 200);
  assert.equal(b.atOrBelowCliff, true);
  assert.equal(b.total, 45);
});
test("zero units has no slab rows", () => assert.equal(breakdown(0).rows.length, 0));
test("appliance units = watts x hours x days / 1000", () => {
  assert.equal(applianceUnits({ watts: 1000, hours: 1, days: 1 }), 1);
  assert.equal(applianceUnits({ watts: 1400, hours: 6 }), 504);
});
