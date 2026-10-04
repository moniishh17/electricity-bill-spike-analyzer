import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { en } from "../js/i18n.js";
import { ta } from "../js/lang-ta.js";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const keys = [...html.matchAll(/data-i18n(?:-ph)?="([^"]+)"/g)].map((m) => m[1]);
const holes = (s) => (s.match(/\{\w+\}/g) || []).sort().join();

test("every translatable key in the page has Tamil text", () => {
  assert.ok(keys.length > 50);
  assert.deepEqual(keys.filter((k) => !ta[k]), []);
});
test("every string built in JavaScript has Tamil text", () => {
  assert.deepEqual(Object.keys(en).filter((k) => !ta[k]), []);
});
test("Tamil keeps the same {placeholders} as English", () => {
  for (const [k, v] of Object.entries(en)) assert.equal(holes(ta[k]), holes(v), k);
});
