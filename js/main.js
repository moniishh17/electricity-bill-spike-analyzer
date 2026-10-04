import { parseCSV } from "./parser.js";
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

function run() {
  const kw = Math.max(0.1, parseFloat($("kw").value) || 1);
  const { rows, errors } = parseCSV($("input").value);
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
$("kw").addEventListener("change", () => $("input").value.trim() && run());
$("sample").addEventListener("click", async () => {
  $("input").value = await (await fetch("data/sample.csv")).text();
  run();
});
$("file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (f) { $("input").value = await f.text(); run(); }
});
buildDrums();
setMeter(0, "Waiting for your bills");
initLearn($("kw"));
