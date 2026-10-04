import { MONTHS, resolveTo, periodDays, periodLabel, parsePeriodLabel } from "./period.js";
import { parseCSV, validateRows } from "./parser.js";
import { analyze } from "./analysis.js";
import { expectedBill, cliffReport } from "./tariff.js";
import { initLearn } from "./learn.js";
import { plan } from "./planner.js";
import { explain } from "./insights.js";
import { renderChart, renderCurve } from "./chart.js";

const $ = (id) => document.getElementById(id);
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const h = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};

const DRUMS = 5;
function buildDrums() {
  $("drums").replaceChildren(...Array.from({ length: DRUMS }, (_, i) =>
    h("div", { className: "drum" },
      h("div", { className: "strip", style: `transition-delay:${i * 90}ms` },
        ...Array.from({ length: 10 }, (_, d) => h("span", { textContent: d }))))));
}
function setMeter(value, sub) {
  const s = String(Math.min(Math.round(value), 10 ** DRUMS - 1)).padStart(DRUMS, "0");
  [...$("drums").children].forEach((d, i) => { d.firstChild.style.transform = `translateY(${-Number(s[i]) * 10}%)`; });
  $("meterSub").textContent = sub;
  $("meterText").textContent = `${inr(value)}. ${sub}`;
}

/** Add tariff-based fields: expected amount, billing gap, and 500-unit cliff cost. */
function enrich(result, kw) {
  result.bills = result.bills.map((b) => {
    const expected = expectedBill(b.units, kw), gap = b.amount - expected;
    return { ...b, expected, gap, cliff: cliffReport(b.units, kw), audit: Math.abs(gap) > Math.max(100, expected * 0.15) };
  });
  return result;
}

function renderTable(result) {
  const cols = ["Period", "Units", "Usage vs usual", "Billed", "Tariff says", "Gap"];
  const rows = result.bills.map((b) =>
    h("tr", { className: b.spike ? "spike" : "" },
      h("td", {}, b.month, ...(b.spike ? [h("span", { className: "tag", textContent: "spike" })] : []), ...(b.cliff ? [h("span", { className: "tag", textContent: ">500" })] : [])),
      h("td", { textContent: b.units }),
      h("td", { textContent: `${b.pct >= 0 ? "+" : ""}${Math.round(b.pct)}%` }),
      h("td", { textContent: inr(b.amount) }),
      h("td", { textContent: inr(b.expected) }),
      h("td", { className: b.audit ? "gap" : "", textContent: `${b.gap >= 0 ? "+" : "-"}${inr(Math.abs(b.gap))}` })));
  $("table").replaceChildren(h("tr", {}, ...cols.map((t) => h("th", { textContent: t }))), ...rows);
}

function render(result, kw) {
  const spikes = result.bills.filter((b) => b.spike);
  $("summary").textContent = spikes.length
    ? `${spikes.length} spike${spikes.length > 1 ? "s" : ""} found (${spikes.map((b) => b.month).join(", ")}), costing about ${inr(result.extraCost)} more than normal.`
    : "No unusual spikes. Your usage stays close to your normal level.";
  $("mode").textContent = result.perDay ? "Compared per day, so billing length doesn't skew results." : "Compared by total units. Add a days column to compare per day.";
  setMeter(result.extraCost, spikes.length ? `${spikes.length} spike bill${spikes.length > 1 ? "s" : ""}: ${spikes.map((b) => b.month).join(", ")}` : "No spike bills found");
  renderChart($("chart"), result);
  renderCurve($("curve"), result.bills, kw);
  renderTable(result);
  $("reasons").replaceChildren(...explain(result).map(([t, d]) => h("li", {}, h("strong", { textContent: t + ": " }), d)));
  $("out").hidden = false;
}

const list = $("bills");
const thisYear = new Date().getFullYear();
const monthOpts = MONTHS.map((t, i) => [i, t]);
const yearOpts = Array.from({ length: 8 }, (_, i) => [thisYear - 6 + i, thisYear - 6 + i]);
const q = (row, k) => row.querySelector(`[data-f="${k}"]`);

const select = (key, opts, value, label) => {
  const s = h("select", {}, ...opts.map(([v, t]) => h("option", { value: v, textContent: t })));
  s.value = String(value);
  s.dataset.f = key;
  s.setAttribute("aria-label", label);
  return s;
};
const cell = (key, type, val, extra) => {
  const i = h("input", { type, value: val ?? "", ...extra });
  i.dataset.f = key;
  i.setAttribute("aria-label", key);
  return i;
};
const rowPeriod = (row) => ({ fromM: +q(row, "fm").value, fromY: +q(row, "fy").value, toM: +q(row, "tm").value });
const autoDays = (row) => {
  const p = rowPeriod(row);
  q(row, "days").value = periodDays(p.fromM, p.fromY, p.toM);
  delete row.dataset.label;
};

function addRow(d = {}) {
  let p = d.period;
  if (!p) { // continue from the previous bill's period
    const last = list.lastElementChild;
    if (last) {
      const x = rowPeriod(last);
      const fromM = (x.toM + 1) % 12;
      p = { fromM, fromY: x.toM === 11 ? resolveTo(x.fromM, x.fromY, x.toM) + 1 : resolveTo(x.fromM, x.fromY, x.toM), toM: (fromM + 1) % 12 };
    } else p = { fromM: 0, fromY: thisYear - 1, toM: 1 };
  }
  const row = h("div", { className: "bill-row" },
    h("div", { className: "period" },
      h("label", {}, h("span", { textContent: "From" }), select("fm", monthOpts, p.fromM, "From month"), select("fy", yearOpts, p.fromY, "From year")),
      h("label", {}, h("span", { textContent: "To" }), select("tm", monthOpts, p.toM, "To month"))),
    cell("units", "number", d.units, { placeholder: "Units", min: 0, step: 1 }),
    cell("amount", "number", d.amount, { placeholder: "₹ billed", min: 0, step: 1 }),
    cell("days", "number", d.days, { placeholder: "Days (auto)", min: 1, step: 1, title: "Calculated from the months. Edit to override." }),
    h("button", { className: "ghost del", type: "button", textContent: "×", title: "Remove this bill", onclick: () => row.remove() }));
  row.addEventListener("change", (e) => {
    const k = e.target.dataset.f;
    if (k === "fm") q(row, "tm").value = (+e.target.value + 1) % 12; // a bill covers two months by default
    if (["fm", "fy", "tm"].includes(k)) autoDays(row);
  });
  list.append(row);
  if (d.label) row.dataset.label = d.label; // a custom label from an imported file
  else if (d.days == null) autoDays(row);
}
const setRows = (rows) => {
  list.replaceChildren();
  rows.forEach((r) => {
    const period = parsePeriodLabel(r.month, thisYear - 1);
    addRow({ period, label: period ? null : r.month, units: r.units, amount: r.amount, days: r.days });
  });
};
const readRows = () => [...list.children].map((r) => ({
  month: r.dataset.label || (({ fromM, fromY, toM }) => periodLabel(fromM, fromY, toM))(rowPeriod(r)),
  units: q(r, "units").value, amount: q(r, "amount").value, days: q(r, "days").value,
}));

function run() {
  const kw = Math.max(0.1, parseFloat($("kw").value) || 1);
  const { rows, errors } = validateRows(readRows());
  $("err").textContent = errors.join(" ");
  try {
    render(enrich(analyze(rows), kw), kw);
  } catch (e) {
    $("out").hidden = true;
    setMeter(0, "Waiting for your bills");
    $("err").textContent = [...errors, e.message].join(" ");
  }
}

function runPlanner() {
  const kw = Math.max(0.1, parseFloat($("kw").value) || 1);
  const box = $("plan");
  try {
    const p = plan({ used: Number($("used").value), elapsed: Number($("elapsed").value), kw });
    const lines = [`At ${p.rate.toFixed(1)} units/day you are on track for about ${p.projected} units this cycle, a bill of roughly ${inr(p.bill)}.`];
    if (p.alreadyOver) lines.push("You are already past 500 units, so this bill falls in the higher slabs and only 100 units are free.");
    else if (p.crosses) lines.push(`That crosses the 500-unit line and costs about ${inr(p.extra)} more than staying at 500. Keep the remaining ${p.left} days to ${p.budget.toFixed(1)} units/day (${p.cutPerDay.toFixed(1)} less per day than now) to stay under.`);
    else lines.push(p.left > 0 ? `You are under the line. You can use up to ${p.budget.toFixed(1)} units/day for the remaining ${p.left} days and still stay below 500.` : "Cycle complete and under the 500-unit line.");
    box.replaceChildren(...lines.map((t, i) => h("p", { className: i && p.crosses ? "warn" : "", textContent: t })));
  } catch (e) {
    box.replaceChildren(h("p", { className: "err", textContent: e.message }));
  }
}

$("plan-go").addEventListener("click", runPlanner);
$("go").addEventListener("click", run);
$("kw").addEventListener("change", () => validateRows(readRows()).rows.length >= 4 && run());
$("add").addEventListener("click", () => { addRow(); list.lastChild.querySelector("input").focus(); });
$("sample").addEventListener("click", async () => {
  setRows(parseCSV(await (await fetch("data/sample.csv")).text()).rows);
  run();
});
$("file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const { rows, errors } = parseCSV(await f.text());
  setRows(rows);
  if (errors.length) $("err").textContent = errors.join(" ");
  else run();
  e.target.value = "";
});
for (let i = 0; i < 4; i++) addRow();
buildDrums();
setMeter(0, "Waiting for your bills");
initLearn($("kw"));
