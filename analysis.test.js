import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCSV } from "../js/parser.js";
import { analyze, median } from "../js/analysis.js";

const bill = (month, units, days = null) => ({ month, units, amount: units * 4, days });

test("median handles odd and even lengths", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test("parser skips header and reports bad lines", () => {
  const { rows, errors } = parseCSV("month,units,amount\nJan,200,800\nbad line\nFeb,210,₹850");
  assert.equal(rows.length, 2);
  assert.equal(rows[1].amount, 850);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Line 3/);
});

test("flags an obvious spike and nothing else", () => {
  const rows = [bill("A", 200), bill("B", 210), bill("C", 195), bill("D", 205), bill("E", 500)];
  const { bills } = analyze(rows);
  assert.deepEqual(bills.filter((b) => b.spike).map((b) => b.month), ["E"]);
});

test("steady usage has no spikes", () => {
  const { bills } = analyze([200, 205, 198, 202, 207].map((u, i) => bill("M" + i, u)));
  assert.ok(bills.every((b) => !b.spike));
});

test("a 60-day cycle is not a spike when days are given", () => {
  const rows = [bill("A", 200, 30), bill("B", 210, 31), bill("C", 195, 30), bill("D", 205, 31), bill("E", 400, 60)];
  const result = analyze(rows);
  assert.equal(result.perDay, true);
  assert.ok(result.bills.every((b) => !b.spike));
});

test("too few bills throws", () => {
  assert.throws(() => analyze([bill("A", 100)]), /at least 4/);
});
