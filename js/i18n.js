/**
 * English / Tamil switching. Static page text lives in index.html (data-i18n="key") and its English is read from
 * the DOM; Tamil comes from lang-ta.js. Strings built in JavaScript use t(key, vars) with English defined here.
 */
import { ta } from "./lang-ta.js";

export const en = {
  "meter.wait": "Waiting for your bills", "meter.none": "No spike bills found", "meter.spikes": "Spike bills ({n}): {names}",
  "sum.spikes": "{n} spike(s) found: {names}. Extra cost about {amt}.", "sum.none": "No unusual spikes. Your usage stays close to normal.",
  "mode.day": "Compared per day, so billing length does not skew results.", "mode.total": "Compared by total units. Add days to compare per day.",
  "th.period": "Period", "th.units": "Units", "th.vs": "Usage vs usual", "th.billed": "Billed", "th.tariff": "Tariff says", "th.gap": "Gap", "tag.spike": "spike",
  "i.cliff.t": "Crossed the 500-unit line", "i.cliff.item": "{m} ({o} units over, about {x} extra)",
  "i.cliff.d": "{list}. Above 500 units only 100 are free and extra units fall in the ₹8.40+ slabs.",
  "i.gap.t": "Bill differs from the tariff", "i.gap.d": "{list}: the billed amount is far from the calculation. Check the meter reading, arrears or a tariff change.",
  "i.use.t": "Heavy appliances", "i.use.d": "An AC, geyser or motor running longer can add 100+ units.",
  "i.season.t": "Season", "i.season.d": "Spikes in hot months usually mean cooling. Otherwise look for a change at home.",
  "i.read.t": "Estimated or wrong reading", "i.read.d": "Compare the bill's reading with your meter.",
  "i.old.t": "Some bills are not audited", "i.old.d": "{list}: before the earliest tariff here, or spanning a tariff change.",
  "i.ok.t": "All normal", "i.ok.d": "Nothing stands out. Re-run with each new bill.",
  "p.track": "At {r} units/day you are on track for about {p} units, a bill of roughly {b}.",
  "p.over": "You are already past 500 units, so this bill uses the higher slabs and only 100 units are free.",
  "p.cross": "That crosses 500 units and costs about {x} more than staying at 500. Keep the remaining {d} days to {u} units/day ({c} less than now).",
  "p.safe": "You are under the line. You can use up to {u} units/day for the remaining {d} days.", "p.done": "Cycle complete and under the 500-unit line.",
  "l.intro": "{u} units: the first {f} units are free.", "l.count": "Count", "l.rate": "₹ per unit", "l.amt": "Amount", "l.free": "Free",
  "l.fixed": "Fixed charge", "l.fuel": "Fuel surcharge", "l.total": "Total estimate (excludes arrears and late fees)",
  "l.warn": "Careful: one more unit past 500 would add about {x}.", "l.ap": "{n} for {h} hours a day over 60 days: about {u} units ({p}% of the 500-unit line).",
  "l.err.units": "Enter a whole number of units, 0 or more.", "l.err.hours": "Hours per day must be between 0 and 24.",
  "ap.0": "Ceiling fan", "ap.1": "LED bulb", "ap.2": "Refrigerator", "ap.3": "Television", "ap.4": "Washing machine", "ap.5": "Mixer grinder", "ap.6": "1.5-ton AC", "ap.7": "Geyser",
  "f.from": "From", "f.to": "To", "ph.units": "Units", "ph.amount": "₹ billed", "ph.days": "Days",
  "c.usual": "your usual: {v} {u}", "c.cliff": "500-unit cliff", "c.units": "units per bill",
  "t.t1": "500 units or fewer (200 free)", "t.t2": "Above 500 units (100 free)",
};

const KEY = "billspike:lang";
let lang = "en";
const base = new WeakMap();

export const getLang = () => lang;
export const t = (k, v = {}) => ((lang === "ta" && ta[k]) || en[k] || k).replace(/\{(\w+)\}/g, (_, n) => v[n] ?? "");

export function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    if (!base.has(el)) base.set(el, en[k] ?? el.textContent);
    el.textContent = lang === "ta" && ta[k] ? ta[k] : base.get(el);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll(".lang-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
}

export function setLang(l) {
  lang = l;
  try { localStorage.setItem(KEY, l); } catch {}
  applyLang();
  document.dispatchEvent(new Event("langchange"));
}

/** Restore the saved language, or ask the visitor to pick one on first visit. */
export function initLang() {
  document.querySelectorAll(".lang-btn").forEach((b) => b.addEventListener("click", () => {
    setLang(b.dataset.lang);
    document.getElementById("lang-gate")?.close();
  }));
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  if (saved === "ta" || saved === "en") { lang = saved; applyLang(); }
  else document.getElementById("lang-gate")?.showModal();
}
