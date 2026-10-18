/** Turn an analysis result into plain-language things to check, in the chosen language. Each item is [title, text, level]; level is "high", "warn", "info" or "ok". */
import { t } from "./i18n.js";

const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

export function explain({ bills }) {
  const spikes = bills.filter((b) => b.spike);
  const crossed = bills.filter((b) => b.cliff);
  const gaps = bills.filter((b) => b.audit);
  const old = bills.filter((b) => b.unchecked);
  const out = [];
  if (crossed.length) {
    const list = crossed.map((b) => t("i.cliff.item", { m: b.month, o: b.cliff.over, x: inr(b.cliff.extra) })).join("; ");
    out.push([t("i.cliff.t"), t("i.cliff.d", { list }), "high"]);
  }
  if (gaps.length) {
    const list = gaps.map((b) => `${b.month} (${b.gap > 0 ? "+" : "-"}${inr(Math.abs(b.gap))})`).join(", ");
    out.push([t("i.gap.t"), t("i.gap.d", { list }), "high"]);
  }
  if (spikes.length) out.push([t("i.use.t"), t("i.use.d"), "warn"], [t("i.season.t"), t("i.season.d"), "info"], [t("i.read.t"), t("i.read.d"), "info"]);
  if (old.length) out.push([t("i.old.t"), t("i.old.d", { list: old.map((b) => b.month).join(", ") }), "info"]);
  const up = bills.filter((b) => b.yoy && b.yoy.pct > 25);
  if (up.length) out.push([t("i.yoy.t"), t("i.yoy.d", { list: up.map((b) => `${b.month} (+${Math.round(b.yoy.pct)}%)`).join(", ") }), "warn"]);
  if (!out.length) out.push([t("i.ok.t"), t("i.ok.d"), "ok"]);
  return out;
}
