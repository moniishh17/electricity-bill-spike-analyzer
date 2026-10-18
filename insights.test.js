import { test } from "node:test";
import assert from "node:assert/strict";
import { explain } from "../js/insights.js";

const bill = (month, extra = {}) => ({ month, spike: false, cliff: null, audit: false, unchecked: false, yoy: null, ...extra });

test("flags bills well above the same period last year", () => {
  const out = explain({ bills: [bill("A"), bill("B", { yoy: { pct: 40 } }), bill("C", { yoy: { pct: 10 } })] });
  assert.equal(out.length, 1);
  assert.match(out[0][1], /B \(\+40%\)/);
  assert.doesNotMatch(out[0][1], /C/);
});
test("ordinary bills give the all-normal note", () => {
  const out = explain({ bills: [bill("A"), bill("B", { yoy: { pct: 5 } })] });
  assert.equal(out[0][0], "All normal");
});
