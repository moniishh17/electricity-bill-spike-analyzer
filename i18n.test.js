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

const jsDir = new URL("../js/", import.meta.url);
const src = fs.readdirSync(jsDir)
  .filter((f) => f.endsWith(".js") && f !== "i18n.js" && f !== "lang-ta.js")
  .map((f) => fs.readFileSync(new URL(f, jsDir), "utf8")).join("\n");

test("every translation key used in the code is defined", () => {
  const used = new Set([...src.matchAll(/\bt\("([\w.]+)"/g)].map((m) => m[1]));
  for (const m of src.matchAll(/\btr\("\w+", "([\w.]+)"\)/g)) used.add(m[1]);
  for (const m of src.matchAll(/\["(ap\.\d+)"/g)) used.add(m[1]);
  assert.deepEqual([...used].filter((k) => !en[k] && !keys.includes(k)), []);
});
test("every element id the scripts look up exists in the page", () => {
  const ids = new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map((m) => m[1]));
  const wanted = new Set([...src.matchAll(/\$\("([\w-]+)"\)/g)].map((m) => m[1]));
  assert.deepEqual([...wanted].filter((i) => !ids.has(i)), []);
});
