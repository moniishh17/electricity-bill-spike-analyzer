import { test } from "node:test";
import assert from "node:assert/strict";
import { breakdown } from "../js/tariff.js";
import { applianceUnits } from "../js/learn.js";

test("breakdown above 500 units lists each slab and totals correctly", () => {
  const b = breakdown(600, 1);
  assert.equal(b.rows.length, 4);
  assert.equal(b.freeUnits, 100);
  assert.equal(b.rows.reduce((t, r) => t + r.cost, 0) + b.fixed + b.fsa, b.total);
  assert.equal(b.total, 3045);
});
test("breakdown at or below 500 units has 200 free", () => {
  const b = breakdown(150, 1);
  assert.equal(b.freeUnits, 200);
  assert.equal(b.atOrBelowCliff, true);
  assert.equal(b.total, 75); // 45 fixed + 30 fuel surcharge
});
test("zero units has no slab rows", () => assert.equal(breakdown(0).rows.length, 0));
test("appliance units = watts x hours x days / 1000", () => {
  assert.equal(applianceUnits({ watts: 1000, hours: 1, days: 1 }), 1);
  assert.equal(applianceUnits({ watts: 1400, hours: 6 }), 504);
});

import { applianceTotals } from "../js/learn.js";
test("appliance list totals units, finds the biggest user and shares", () => {
  const { rows, total, top } = applianceTotals([
    { key: "fan", watts: 100, qty: 2, hours: 10 }, // 100*10*60/1000 = 60 each -> 120
    { key: "ac", watts: 1000, qty: 1, hours: 6 },   // 360
  ]);
  assert.equal(rows[0].units, 120);
  assert.equal(total, 480);
  assert.equal(top.key, "ac");
  assert.ok(Math.abs(top.share - 0.75) < 1e-9); // the biggest user carries its own share
  assert.ok(Math.abs(rows[1].share - 0.75) < 1e-9);
});
test("empty appliance list is safe", () => {
  const r = applianceTotals([]);
  assert.equal(r.total, 0);
  assert.equal(r.top, null);
});

import { donutSlices } from "../js/learn.js";
test("donut keeps the five biggest appliances and folds the rest into Other", () => {
  const rows = Array.from({ length: 8 }, (_, i) => ({ key: "ap." + i, units: 8 - i, share: (8 - i) / 36 }));
  const s = donutSlices(rows);
  assert.equal(s.length, 6);
  assert.equal(s[5].key, null);
  assert.equal(s[5].units, 6);
  assert.ok(Math.abs(s.reduce((n, x) => n + x.share, 0) - 1) < 1e-9);
});
