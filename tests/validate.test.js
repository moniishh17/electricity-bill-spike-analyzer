import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRows } from "../js/parser.js";

test("ignores blank rows and keeps valid ones", () => {
  const { rows, errors } = validateRows([
    { month: "Jan–Feb", units: "410", amount: "1048", days: "59" },
    { month: "", units: "", amount: "", days: "" },
    { month: "Mar–Apr", units: "450", amount: "1300", days: "" },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].days, null);
  assert.equal(errors.length, 0);
});
test("reports the bill number for each problem", () => {
  const { rows, errors } = validateRows([
    { month: "A", units: "100", amount: "", days: "" },
    { month: "", units: "100", amount: "500", days: "" },
    { month: "C", units: "0", amount: "500", days: "" },
    { month: "D", units: "100", amount: "500", days: "-3" },
  ]);
  assert.equal(rows.length, 0);
  assert.deepEqual(errors.map((e) => e.slice(0, 6)), ["Bill 1", "Bill 2", "Bill 3", "Bill 4"]);
});
