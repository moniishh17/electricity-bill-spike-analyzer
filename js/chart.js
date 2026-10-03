/** SVG charts built with DOM calls only (no innerHTML, so user text is safe). */
import { expectedBill, TARIFF } from "./tariff.js";

const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};
const root = (W, H, label) =>
  svgEl("svg", { viewBox: `0 0 ${W} ${H}`, style: "width:100%;height:auto", role: "img", "aria-label": label });
const grid = (svg, p, W, max, y, fmt) => {
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i;
    svg.append(
      svgEl("line", { x1: p.l, x2: W - p.r, y1: y(v), y2: y(v), stroke: "var(--line)" }),
      svgEl("text", { x: p.l - 8, y: y(v) + 4, "text-anchor": "end" }, fmt(v)),
    );
  }
};

export function renderChart(host, { bills, baseline, unit }) {
  const W = 760, H = 270, p = { l: 44, r: 12, t: 38, b: 30 };
  const dp = baseline < 20 ? 1 : 0;
  const max = Math.max(...bills.map((b) => b.value)) * 1.1;
  const bw = (W - p.l - p.r) / bills.length;
  const y = (v) => p.t + (H - p.t - p.b) * (1 - v / max);
  const svg = root(W, H, `${unit} per bill, spikes highlighted`);
  grid(svg, p, W, max, y, (v) => v.toFixed(dp));
  bills.forEach((b, i) => {
    const x = p.l + i * bw + bw * 0.18, w = bw * 0.64;
    const bar = svgEl("rect", { x, y: y(b.value), width: w, height: H - p.b - y(b.value), rx: 3, fill: b.spike ? "var(--spike)" : "var(--bar)" });
    bar.append(svgEl("title", {}, `${b.month}: ${b.units} units`));
    svg.append(bar, svgEl("text", { x: x + w / 2, y: H - 10, "text-anchor": "middle" }, b.month));
    if (b.spike) svg.append(svgEl("text", { x: x + w / 2, y: y(b.value) - 6, "text-anchor": "middle", class: "flag" }, `+${Math.round(b.pct)}%`));
  });
  svg.append(
    svgEl("line", { x1: p.l, x2: W - p.r, y1: y(baseline), y2: y(baseline), stroke: "var(--ok)", "stroke-width": 2, "stroke-dasharray": "6 4" }),
    svgEl("line", { x1: p.l, x2: p.l + 24, y1: 14, y2: 14, stroke: "var(--ok)", "stroke-width": 2, "stroke-dasharray": "6 4" }),
    svgEl("text", { x: p.l + 32, y: 18 }, `your usual: ${baseline.toFixed(dp)} ${unit}`),
  );
  host.replaceChildren(svg);
}

/** Expected bill against units, with the 500-unit cliff and the user's own bills plotted. */
export function renderCurve(host, bills, kw) {
  const W = 760, H = 290, p = { l: 62, r: 14, t: 22, b: 34 };
  const maxU = Math.max(800, ...bills.map((b) => b.units)) * 1.05;
  const maxY = Math.max(expectedBill(maxU, kw), ...bills.map((b) => b.amount)) * 1.05;
  const x = (u) => p.l + ((W - p.l - p.r) * u) / maxU;
  const y = (v) => p.t + (H - p.t - p.b) * (1 - v / maxY);
  const svg = root(W, H, "Expected bill against units used, with your bills plotted");
  grid(svg, p, W, maxY, y, (v) => "₹" + Math.round(v).toLocaleString("en-IN"));
  const seg = (from, to) => {
    const pts = [];
    for (let u = from; u <= to; u += 5) pts.push(`${x(u)},${y(expectedBill(u, kw))}`);
    return svgEl("polyline", { points: pts.join(" "), fill: "none", stroke: "var(--bar)", "stroke-width": 2.5 });
  };
  svg.append(seg(0, TARIFF.cliff), seg(TARIFF.cliff + 1, maxU));
  for (const u of [0, 200, 400, 600, 800]) svg.append(svgEl("text", { x: x(u), y: H - 10, "text-anchor": "middle" }, u));
  svg.append(
    svgEl("line", { x1: x(TARIFF.cliff), x2: x(TARIFF.cliff), y1: p.t, y2: H - p.b, stroke: "var(--spike)", "stroke-dasharray": "4 4" }),
    svgEl("text", { x: x(TARIFF.cliff) - 6, y: p.t + 10, "text-anchor": "end", class: "flag" }, "500-unit cliff"),
    svgEl("text", { x: W - p.r, y: H - 10, "text-anchor": "end" }, "units per bill"),
  );
  for (const b of bills) {
    const dot = svgEl("circle", { cx: x(b.units), cy: y(b.amount), r: 5.5, fill: b.cliff ? "var(--spike)" : "var(--volt)", stroke: "var(--panel)", "stroke-width": 2 });
    dot.append(svgEl("title", {}, `${b.month}: ${b.units} units, billed ₹${Math.round(b.amount)}`));
    svg.append(dot);
  }
  host.replaceChildren(svg);
}
