/** Learning tools: slab-by-slab bill calculator, multi-appliance estimator and the tariff reference tables. */
import { breakdown, expectedBill, TARIFF } from "./tariff.js";
import { t } from "./i18n.js";
import { renderDonut } from "./chart.js";

const SLOTS = 5; // largest appliances get their own colour; the rest fold into "Other"

/** Slices for the donut: the biggest SLOTS appliances, everything else summed as Other. */
export function donutSlices(rows) {
  const sorted = [...rows].sort((a, b) => b.units - a.units);
  const head = sorted.slice(0, SLOTS).map((r, i) => ({ key: r.key, units: r.units, share: r.share, cls: "s" + i }));
  const rest = sorted.slice(SLOTS);
  if (rest.length) head.push({ key: null, units: rest.reduce((n, r) => n + r.units, 0), share: rest.reduce((n, r) => n + r.share, 0), cls: "so" });
  return head;
}

// [name key, watts, typical hours per day]. Typical values; compressors and mixers run only part of the time.
export const APPLIANCES = [
  ["ap.0", 75, 10], ["ap.1", 9, 6], ["ap.2", 150, 8], ["ap.3", 100, 5], ["ap.4", 500, 1], ["ap.5", 500, 0.5], ["ap.6", 1400, 6], ["ap.7", 2000, 1],
  ["ap.8", 900, 6], ["ap.9", 1500, 1.5], ["ap.10", 750, 1], ["ap.11", 1000, 0.5], ["ap.12", 60, 6], ["ap.13", 250, 1], ["ap.14", 1200, 0.3], ["ap.15", 10, 24],
];
export const applianceUnits = ({ watts, hours, days = 60 }) => (watts * hours * days) / 1000;

/** Total a list of { watts, qty, hours } entries. Each row gets its units and its share of the total. */
export function applianceTotals(entries, days = 60) {
  const raw = entries.map((e) => ({ ...e, units: e.qty * applianceUnits({ watts: e.watts, hours: e.hours, days }) }));
  const total = raw.reduce((s, r) => s + r.units, 0);
  const rows = raw.map((r) => ({ ...r, share: total ? r.units / total : 0 }));
  const top = rows.reduce((best, r) => (!best || r.units > best.units ? r : best), null);
  return { rows, total, top };
}

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

  // The visitor's appliance list: [{ idx, qty, hours }]. Kept in memory only.
  const list = [];
  const sel = $("ap");
  function fillSelect() {
    const i = sel.value || 0;
    sel.replaceChildren(...APPLIANCES.map(([k, w], j) => el("option", { value: j, textContent: `${t(k)} (${w} W)` })));
    sel.value = i;
  }
  function renderAppliances(error) {
    const out = [];
    if (error) out.push(note("err", error));
    if (!list.length) out.push(note("hint", t("ap.empty")));
    else {
      const { rows, total, top } = applianceTotals(list.map((e) => ({ ...e, key: APPLIANCES[e.idx][0], watts: APPLIANCES[e.idx][1] })));
      const body = rows.map((r, i) => {
        const rm = el("button", { className: "ghost del", type: "button", textContent: "×", title: t("ap.remove") });
        rm.setAttribute("aria-label", t("ap.remove"));
        rm.addEventListener("click", () => { list.splice(i, 1); renderAppliances(); });
        return el("tr", {}, el("td", { textContent: t(r.key) }), el("td", { textContent: r.qty }), el("td", { textContent: r.hours }), el("td", { textContent: Math.round(r.units) }), el("td", {}, rm));
      });
      if (rows.length > 1) out.push(viz(rows, total));
      out.push(el("div", { className: "scroll" }, el("table", {}, head(t("ap.col.name"), t("ap.col.qty"), t("ap.col.h"), t("ap.col.u"), ""), ...body)));
      out.push(note("", t("ap.total", { u: Math.round(total), p: Math.round((total / TARIFF.cliff) * 100) })));
      if (rows.length > 1 && top) out.push(note("", t("ap.top", { n: t(top.key), s: Math.round(top.share * 100) })));
    }
    $("ap-out").replaceChildren(...out);
  }
  function viz(rows, total) {
    const slices = donutSlices(rows).map((x) => ({ ...x, name: x.key ? t(x.key) : t("ap.other") }));
    const kw = Math.max(0.1, parseFloat(kwInput.value) || 1);
    const pct = (total / TARIFF.cliff) * 100;
    const donut = el("div", { className: "donut" });
    renderDonut(donut, slices, { total, label: t("ap.total", { u: Math.round(total), p: Math.round(pct) }) });
    const legend = el("ul", { className: "legend" }, ...slices.map((x) =>
      el("li", {}, el("span", { className: "sw " + x.cls }), el("span", { className: "lg-n", textContent: x.name }),
        el("span", { className: "lg-v", textContent: `${Math.round(x.units)} · ${Math.round(x.share * 100)}%` }))));
    const level = pct > 100 ? "over" : pct >= 80 ? "near" : "";
    const bar = el("div", { className: "limit " + level, role: "img", "aria-label": t("ap.limit", { p: Math.round(pct) }) },
      el("div", { className: "limit-fill", style: `width:${Math.min(pct, 100)}%` }));
    return el("div", { className: "ap-viz" }, donut, el("div", {}, legend,
      el("p", { className: "limit-l", textContent: t("ap.limit", { p: Math.round(pct) }) }), bar,
      el("p", { className: "hint", textContent: t("ap.bill", { b: inr(expectedBill(total, kw)) }) })));
  }
  function addAppliance() {
    const qty = Number($("ap-qty").value), hours = Number($("ap-hours").value);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return renderAppliances(t("ap.err.qty"));
    if (!(hours >= 0 && hours <= 24)) return renderAppliances(t("l.err.hours"));
    list.push({ idx: Number(sel.value), qty, hours });
    renderAppliances();
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

  sel.addEventListener("change", () => { $("ap-hours").value = APPLIANCES[sel.value][2]; });
  $("ap-add").addEventListener("click", addAppliance);
  $("bd-go").addEventListener("click", renderBreakdown);
  kwInput.addEventListener("change", () => $("bd-units").value && renderBreakdown());
  fillSelect();
  $("ap-hours").value = APPLIANCES[0][2];
  return () => { fillSelect(); renderReference(); if ($("bd").children.length) renderBreakdown(); renderAppliances(); };
}
