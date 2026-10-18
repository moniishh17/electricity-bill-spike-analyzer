import { test } from "node:test";
import assert from "node:assert/strict";
import { plan } from "../js/planner.js";

test("projects a cycle that will cross 500 units", () => {
  const p = plan({ used: 300, elapsed: 30 });
  assert.equal(p.projected, 600);
  assert.equal(p.crosses, true);
  assert.ok(Math.abs(p.budget - 200 / 30) < 1e-9);
  assert.ok(p.extra > 0 && p.cutPerDay > 0);
});
test("a cycle on track to stay under 500 has no extra cost", () => {
  const p = plan({ used: 200, elapsed: 30 });
  assert.equal(p.projected, 400);
  assert.equal(p.crosses, false);
  assert.equal(p.extra, 0);
});
test("already over 500 has no budget to recover", () => {
  const p = plan({ used: 520, elapsed: 40 });
  assert.equal(p.alreadyOver, true);
  assert.equal(p.budget, null);
});
test("finished cycle projects its actual units", () => {
  assert.equal(plan({ used: 450, elapsed: 60 }).projected, 450);
});
test("rejects invalid input", () => {
  assert.throws(() => plan({ used: -1, elapsed: 10 }));
  assert.throws(() => plan({ used: 100, elapsed: 0 }));
  assert.throws(() => plan({ used: 100, elapsed: 90 }));
});
