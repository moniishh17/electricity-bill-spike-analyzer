/** Learning tools: slab-by-slab bill calculator and appliance usage estimator. */
import { breakdown, expectedBill, TARIFF } from "./tariff.js";

// [name, watts, typical hours per day]. Typical values; the fridge compressor runs only part of the day.
export const APPLIANCES = [
  ["Ceiling fan", 75, 10], ["LED bulb", 9, 6], ["Refrigerator", 150, 8], ["Television", 100, 5],
  ["Washing machine", 500, 1], ["Mixer grinder", 500, 0.5], ["1.5-ton AC", 1400, 6], ["Geyser", 2000, 1],
];
export const applianceUnits = ({ watts, hours, days = 60 }) => (watts * hours * days) / 1000;

export function initLearn(kwInput) {
  const $ = (id) => document.getElementById(id);
  const el = (t, p = {}, ...k) => { const n = Object.assign(document.createElement(t), p); n.append(...k); return n; };
  const inr = (n) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const note = (cls, text) => el("p", { className: cls, textContent: text });

  function renderBreakdown() {
    const units = Number($("bd-units").value);
    if (!Number.isInteger(units) || units < 0) return $("bd").replaceChildren(note("err", "Enter a whole number of units, 0 or more."));
    const kw = Math.max(0.1, parseFloat(kwInput.value) || 1);
    const b = breakdown(units, kw);
    const row = (cls, ...cells) => el("tr", { className: cls }, ...cells.map((c) => el("td", { textContent: c })));
    const table = el("table", {},
      el("tr", {}, ...["Units", "Count", "₹ per unit", "Amount"].map((t) => el("th", { textContent: t }))),
      ...b.rows.map((r) => row("", `${r.from} to ${r.to}`, r.units, r.rate === 0 ? "Free" : r.rate.toFixed(2), inr(r.cost))),
      row("", "Fixed charge", "", "", inr(b.fixed)),
      row("total", "Total (before taxes and arrears)", "", "", inr(b.total)));
    const kids = [note("", `${units} units is ${b.atOrBelowCliff ? "500 units or less" : "more than 500 units"}, so the first ${b.freeUnits} units are free.`), el("div", { className: "scroll" }, table)];
    if (units >= 400 && units <= TARIFF.cliff) {
      const jump = expectedBill(TARIFF.cliff + 1, kw) - b.total;
      kids.push(note("warn", `Careful: just one more unit past 500 would add about ${inr(jump)} to this bill.`));
    }
    $("bd").replaceChildren(...kids);
  }

  const sel = $("ap");
  APPLIANCES.forEach(([n, w], i) => sel.append(el("option", { value: i, textContent: `${n} (${w} W)` })));
  function renderAppliance() {
    const [name, watts] = APPLIANCES[sel.value];
    const hours = Number($("ap-hours").value);
    if (!(hours >= 0 && hours <= 24)) return $("ap-out").replaceChildren(note("err", "Hours per day must be between 0 and 24."));
    const u = applianceUnits({ watts, hours });
    $("ap-out").replaceChildren(note("", `${name} for ${hours} hours a day over a 60-day bill uses about ${Math.round(u)} units, which is ${Math.round((u / TARIFF.cliff) * 100)}% of the 500-unit line.`));
  }
  sel.addEventListener("change", () => { $("ap-hours").value = APPLIANCES[sel.value][2]; renderAppliance(); });
  $("ap-hours").addEventListener("input", renderAppliance);
  $("bd-go").addEventListener("click", renderBreakdown);
  kwInput.addEventListener("change", () => $("bd-units").value && renderBreakdown());
  $("ap-hours").value = APPLIANCES[0][2];
  renderAppliance();
}
