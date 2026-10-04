/** Learning tools: slab-by-slab bill calculator, appliance estimator and the tariff reference tables. */
import { breakdown, expectedBill, TARIFF } from "./tariff.js";
import { t } from "./i18n.js";

// [name key, watts, typical hours per day]. Typical values; the fridge compressor runs only part of the day.
export const APPLIANCES = [["ap.0", 75, 10], ["ap.1", 9, 6], ["ap.2", 150, 8], ["ap.3", 100, 5], ["ap.4", 500, 1], ["ap.5", 500, 0.5], ["ap.6", 1400, 6], ["ap.7", 2000, 1]];
export const applianceUnits = ({ watts, hours, days = 60 }) => (watts * hours * days) / 1000;

/** Returns a refresh function to call whenever the language changes. */
export function initLearn(kwInput) {
  const $ = (id) => document.getElementById(id);
  const el = (tag, p = {}, ...k) => { const n = Object.assign(document.createElement(tag), p); n.append(...k); return n; };
  const inr = (n) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const note = (cls, text) => el("p", { className: cls, textContent: text });
  const head = (...cols) => el("tr", {}, ...cols.map((c) => el("th", { textContent: c })));
  const row = (cls, ...cells) => el("tr", { className: cls }, ...cells.map((c) => el("td", { textContent: c })));

  function renderBreakdown() {
    const units = Number($("bd-units").value);
    if (!Number.isInteger(units) || units < 0) return $("bd").replaceChildren(note("err", t("l.err.units")));
    const kw = Math.max(0.1, parseFloat(kwInput.value) || 1);
    const b = breakdown(units, kw);
    const table = el("table", {},
      head(t("th.units"), t("l.count"), t("l.rate"), t("l.amt")),
      ...b.rows.map((r) => row("", `${r.from}–${r.to}`, r.units, r.rate === 0 ? t("l.free") : r.rate.toFixed(2), inr(r.cost))),
      row("", t("l.fixed"), "", "", inr(b.fixed)),
      row("", `${t("l.fuel")} (₹${TARIFF.fsa.toFixed(2)})`, "", "", inr(b.fsa)),
      row("total", t("l.total"), "", "", inr(b.total)));
    const kids = [note("", t("l.intro", { u: units, f: b.freeUnits })), el("div", { className: "scroll" }, table)];
    if (units >= 400 && units <= TARIFF.cliff) kids.push(note("warn", t("l.warn", { x: inr(expectedBill(TARIFF.cliff + 1, kw) - b.total) })));
    $("bd").replaceChildren(...kids);
  }

  const sel = $("ap");
  function fillSelect() {
    const i = sel.value || 0;
    sel.replaceChildren(...APPLIANCES.map(([k, w], j) => el("option", { value: j, textContent: `${t(k)} (${w} W)` })));
    sel.value = i;
  }
  function renderAppliance() {
    const [key, watts] = APPLIANCES[sel.value];
    const hours = Number($("ap-hours").value);
    if (!(hours >= 0 && hours <= 24)) return $("ap-out").replaceChildren(note("err", t("l.err.hours")));
    const u = applianceUnits({ watts, hours });
    $("ap-out").replaceChildren(note("", t("l.ap", { n: t(key), h: hours, u: Math.round(u), p: Math.round((u / TARIFF.cliff) * 100) })));
  }

  function renderReference() {
    const table = (slabs, title) => {
      let prev = 0;
      const rows = slabs.map(([upper, rate]) => {
        const range = upper === Infinity ? `${prev + 1}+` : `${prev + 1}–${upper}`;
        prev = upper;
        return row("", range, rate === 0 ? t("l.free") : `₹${rate.toFixed(2)}`);
      });
      return el("div", {}, el("h3", { textContent: title }), el("table", {}, head(t("th.units"), t("l.rate")), ...rows));
    };
    $("ref").replaceChildren(table(TARIFF.within, t("t.t1")), table(TARIFF.above, t("t.t2")));
  }

  sel.addEventListener("change", () => { $("ap-hours").value = APPLIANCES[sel.value][2]; renderAppliance(); });
  $("ap-hours").addEventListener("input", renderAppliance);
  $("bd-go").addEventListener("click", renderBreakdown);
  kwInput.addEventListener("change", () => $("bd-units").value && renderBreakdown());
  fillSelect();
  $("ap-hours").value = APPLIANCES[0][2];
  return () => { fillSelect(); renderReference(); if ($("bd").children.length) renderBreakdown(); renderAppliance(); };
}
