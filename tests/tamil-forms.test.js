import { test, after } from "node:test";
import assert from "node:assert/strict";
import { setLang, mo, spikeCount, t } from "../js/i18n.js";

after(() => setLang("en"));

test("English counts spikes with a plain number", () => {
  setLang("en");
  assert.equal(spikeCount(1), "1 spike");
  assert.equal(spikeCount(3), "3 spikes");
  assert.equal(mo("May–Jun 2027"), "May–Jun 2027");
});
test("Tamil uses counting words: ஓர் for one, plural noun from two", () => {
  setLang("ta");
  assert.equal(spikeCount(1), "ஓர் அதிகரிப்பு");
  assert.equal(spikeCount(2), "இரு அதிகரிப்புகள்");
  assert.equal(spikeCount(3), "மூன்று அதிகரிப்புகள்");
  assert.equal(spikeCount(10), "பத்து அதிகரிப்புகள்");
  assert.equal(spikeCount(12), "12 அதிகரிப்புகள்");
});
test("Tamil writes out month names in period labels", () => {
  setLang("ta");
  assert.equal(mo("May–Jun 2027"), "மே–ஜூன் 2027");
  assert.equal(mo("Nov 2026–Jan 2027"), "நவம்பர் 2026–ஜனவரி 2027");
});
test("month names inside translated sentences are localised", () => {
  setLang("ta");
  const out = t("sum.spikes", { c: spikeCount(1), names: "May–Jun 2027", amt: "₹1,045" });
  assert.match(out, /^ஓர் அதிகரிப்பு: மே–ஜூன் 2027\./);
});
