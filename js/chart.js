/**
 * SVG charts built with DOM calls only (no innerHTML, so user text is safe).
 * Marks follow a quiet spec: thin bars (24px at most) with a rounded data end and a square base, hairline solid grid,
 * round tick values, and a hover/focus tooltip on every mark. Colour carries meaning only: grey is usual, red is a spike.
 */
import { expectedBill, TARIFF } from "./tariff.js";
import { t, mo } from "./i18n.js";

const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};
const root = (W, H, label) =>
  svgEl("svg", { viewBox: `0 0 ${W} ${H}`, style: "width:100%;height:auto", role: "img", "aria-label": label });

/** Round tick values (1, 2, 5 times a power of ten) that cover 0..max. */
export function niceTicks(max, count = 4) {
  if (!(max > 0)) return { ticks: [0, 1], top: 1 };
  const raw = max / count, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 1e6; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { ticks, top };
}
const compact = (v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}K` : String(+v.toFixed(1)));
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

function grid(svg, p, W, ticks, y, fmt) {
  for (const v of ticks) {
    svg.append(
      svgEl("line", { x1: p.l, x2: W - p.r, y1: y(v), y2: y(v), class: v === 0 ? "axis" : "grid" }),
      svgEl("text", { x: p.l - 10, y: y(v) + 4, "text-anchor": "end" }, fmt(v)),
    );
  }
}

/** One tooltip per chart host. lines = [[text, strong?], ...]; text goes in via textContent. */
function tooltip(host) {
  host.style.position = "relative";
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  tip.setAttribute("role", "status");
  host.append(tip);
  return {
    show(target, lines) {
      tip.replaceChildren(...lines.map(([text, strong]) => {
        const d = document.createElement("div");
        d.textContent = text;
        if (strong) d.className = "tip-v";
        return d;
      }));
      tip.hidden = false;
      const a = target.getBoundingClientRect(), h = host.getBoundingClientRect();
      const left = a.left - h.left + host.scrollLeft + a.width / 2;
      tip.style.left = `${Math.max(8, Math.min(left - tip.offsetWidth / 2, host.scrollWidth - tip.offsetWidth - 8))}px`;
      tip.style.top = `${Math.max(0, a.top - h.top - tip.offsetHeight - 8)}px`;
    },
    hide() { tip.hidden = true; },
  };
}
const wire = (el, tip, lines, on, off) => {
  el.setAttribute("tabindex", "0");
  const open = () => { tip.show(el, lines); on?.(); };
  const close = () => { tip.hide(); off?.(); };
  el.addEventListener("pointerenter", open);
  el.addEventListener("focus", open);
  el.addEventListener("pointerleave", close);
  el.addEventListener("blur", close);
};

/** Split a period label into short lines so long (Tamil) month names never collide: "A–", "B", "2027". */
function labelLines(label) {
  const parts = label.split("–");
  if (parts.length !== 2) return [label];
  const [a, b] = parts;
  const m = b.match(/^(.+) (\d{4})$/);
  return !/\d{4}$/.test(a) && m ? [`${a}–`, m[1], m[2]] : [`${a}–`, b];
}

export function renderChart(host, { bills, baseline, unit }) {
  const W = 760, slot0 = (W - 48 - 16) / bills.length;
  const labels = bills.map((b) => mo(b.month));
  const wrap = Math.max(...labels.map((l) => l.length)) * 6.4 > slot0 - 6;
  const H = wrap ? 318 : 290, p = { l: 48, r: 16, t: 30, b: wrap ? 62 : 34 };
  const dp = baseline < 20 ? 1 : 0;
  const { ticks, top } = niceTicks(Math.max(...bills.map((b) => b.value), baseline) * 1.08);
  const slot = (W - p.l - p.r) / bills.length;
  const y = (v) => p.t + (H - p.t - p.b) * (1 - v / top);
  const base = y(0);
  const svg = root(W, H, `${unit} per bill, spikes highlighted`);
  host.replaceChildren(svg);
  const tip = tooltip(host);
  grid(svg, p, W, ticks, y, compact);
  const every = wrap ? 1 : Math.max(1, Math.ceil(64 / slot));
  bills.forEach((b, i) => {
    const w = Math.min(24, slot * 0.6), x = p.l + i * slot + (slot - w) / 2, tipY = y(b.value);
    const r = Math.min(4, w / 2, base - tipY);
    const d = `M${x},${base}V${tipY + r}a${r},${r} 0 0 1 ${r},${-r}H${x + w - r}a${r},${r} 0 0 1 ${r},${r}V${base}Z`;
    const bar = svgEl("path", { d, class: b.spike ? "bar spike" : "bar" });
    const hit = svgEl("rect", { x: p.l + i * slot, y: p.t, width: slot, height: base - p.t, fill: "transparent", class: "hit" });
    wire(hit, tip, [
      [mo(b.month)],
      [`${+b.value.toFixed(dp)} ${unit}`, true],
      [`${t("th.vs")}: ${b.pct >= 0 ? "+" : ""}${Math.round(b.pct)}%`],
      [`${t("th.billed")}: ${inr(b.amount)}`],
    ], () => bar.classList.add("on"), () => bar.classList.remove("on"));
    svg.append(bar, hit);
    if (i % every === 0) {
      const lines = wrap ? labelLines(labels[i]) : [labels[i]];
      const txt = svgEl("text", { x: x + w / 2, y: base + 18, "text-anchor": "middle" });
      lines.forEach((ln, k) => txt.append(svgEl("tspan", { x: x + w / 2, dy: k ? 14 : 0 }, ln)));
      svg.append(txt);
    }
    if (b.spike) svg.append(svgEl("text", { x: x + w / 2, y: tipY - 8, "text-anchor": "middle", class: "flag" }, `+${Math.round(b.pct)}%`));
  });
  // the usual level: one solid line, labelled at its right end
  svg.append(
    svgEl("line", { x1: p.l, x2: W - p.r, y1: y(baseline), y2: y(baseline), class: "usual" }),
    svgEl("text", { x: W - p.r, y: y(baseline) - 7, "text-anchor": "end", class: "usual-t" }, t("c.usual", { v: baseline.toFixed(dp), u: unit })),
  );
}

/** Expected bill against units, with the 500-unit cliff and the user's own bills plotted. */
export function renderCurve(host, bills, kw) {
  const W = 760, H = 300, p = { l: 62, r: 16, t: 26, b: 38 };
  const maxU = Math.max(800, ...bills.map((b) => b.units)) * 1.05;
  const { ticks, top } = niceTicks(Math.max(expectedBill(maxU, kw), ...bills.map((b) => b.amount)) * 1.05);
  const x = (u) => p.l + ((W - p.l - p.r) * u) / maxU;
  const y = (v) => p.t + (H - p.t - p.b) * (1 - v / top);
  const svg = root(W, H, "Expected bill against units used, with your bills plotted");
  host.replaceChildren(svg);
  const tip = tooltip(host);
  grid(svg, p, W, ticks, y, (v) => "₹" + compact(v));
  const seg = (from, to) => {
    const pts = [];
    for (let u = from; u < to; u += 5) pts.push(`${x(u)},${y(expectedBill(u, kw))}`);
    pts.push(`${x(to)},${y(expectedBill(to, kw))}`);
    return svgEl("polyline", { points: pts.join(" "), class: "curve" });
  };
  svg.append(seg(0, TARIFF.cliff), seg(TARIFF.cliff + 1, maxU));
  for (const u of [0, 200, 400, 600, 800]) svg.append(svgEl("text", { x: x(u), y: H - 14, "text-anchor": "middle" }, u));
  svg.append(
    svgEl("line", { x1: x(TARIFF.cliff), x2: x(TARIFF.cliff), y1: p.t, y2: y(0), class: "cliff" }),
    svgEl("text", { x: x(TARIFF.cliff) - 8, y: p.t + 10, "text-anchor": "end", class: "flag" }, t("c.cliff")),
    svgEl("text", { x: W - p.r, y: H - 2, "text-anchor": "end" }, t("c.units")),
  );
  for (const b of bills) {
    const dot = svgEl("circle", { cx: x(b.units), cy: y(b.amount), r: 5, class: b.cliff ? "dot spike" : "dot" });
    const hit = svgEl("circle", { cx: x(b.units), cy: y(b.amount), r: 14, fill: "transparent", class: "hit" });
    const lines = [[mo(b.month)], [`${b.units} ${t("th.units").toLowerCase()}`, true], [`${t("th.billed")}: ${inr(b.amount)}`]];
    if (b.expected != null) lines.push([`${t("th.tariff")}: ${inr(b.expected)}`]);
    wire(hit, tip, lines, () => dot.classList.add("on"), () => dot.classList.remove("on"));
    svg.append(dot, hit);
  }
}

/**
 * Donut of shares. slices = [{ name, units, share, cls }], cls picks the fill colour from CSS (s0..s4, so).
 * The centre shows the total; every ring segment has a hover/focus tooltip and a 2px gap separates neighbours.
 */
export function renderDonut(host, slices, { total, label }) {
  const S = 220, c = S / 2, R = 104, w = 30, r = R - w / 2, gap = 2 / r;
  const svg = root(S, S, label);
  svg.setAttribute("class", "donut-svg");
  host.replaceChildren(svg);
  const tip = tooltip(host);
  let a = -Math.PI / 2;
  const pt = (ang) => [c + r * Math.cos(ang), c + r * Math.sin(ang)];
  for (const s of slices) {
    const sweep = s.share * 2 * Math.PI;
    const a0 = a + gap / 2, a1 = a + sweep - gap / 2;
    a += sweep;
    if (a1 <= a0) continue;
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    const arc = svgEl("path", { d: `M${x0},${y0}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`, class: `seg ${s.cls}`, "stroke-width": w, fill: "none" });
    wire(arc, tip, [[s.name], [`${Math.round(s.units)} ${t("th.units").toLowerCase()}`, true], [`${Math.round(s.share * 100)}%`]], () => arc.classList.add("on"), () => arc.classList.remove("on"));
    svg.append(arc);
  }
  svg.append(
    svgEl("text", { x: c, y: c + 4, "text-anchor": "middle", class: "donut-n" }, Math.round(total).toLocaleString("en-IN")),
    svgEl("text", { x: c, y: c + 24, "text-anchor": "middle" }, t("ap.center")),
  );
}
