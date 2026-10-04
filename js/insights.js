import { TARIFF } from "./tariff.js";

/** Turn an analysis result into plain-language things to check. */
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

export function explain({ bills, perDay }) {
  const spikes = bills.filter((b) => b.spike);
  const crossed = bills.filter((b) => b.cliff);
  const gaps = bills.filter((b) => b.audit);
  const out = [];
  if (crossed.length) {
    out.push(["Crossed the 500-unit line", `${crossed.map((b) => `${b.month} (${b.cliff.over} units over, about ${inr(b.cliff.extra)} extra)`).join("; ")}. Above 500 units in a bill, the free allowance drops from 200 to 100 units and the extra units fall in the ₹8.40 and higher slabs.`]);
  }
  if (gaps.length) {
    out.push(["Bill differs from the tariff", `${gaps.map((b) => `${b.month} (${b.gap > 0 ? "+" : "-"}${inr(Math.abs(b.gap))})`).join(", ")}: the billed amount is far from the slab calculation. Check the meter reading, arrears, or a tariff change. The calculation assumes the connected load you entered.`]);
  }
  if (spikes.length) {
    out.push(["Heavy appliances", "An AC, geyser, water heater or motor running longer than usual can add 100+ units in a bill."]);
    out.push(["Season", "If spikes fall in the hot months, cooling is the likely cause. If not, look for something that changed at home."]);
    if (!perDay) out.push(["Billing period length", "Add a days column so usage is compared per day."]);
    out.push(["Estimated or wrong reading", "Compare the bill's reading with your meter. A catch-up bill often follows an under-estimate."]);
  }
  const old = bills.filter((b) => b.unchecked);
  if (old.length) {
    const since = new Date(TARIFF.effective).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    out.push(["Some bills are not audited", `${old.map((b) => b.month).join(", ")} began before the earliest tariff in this tool or span a tariff change (the latest took effect on ${since}), so they are not compared with one set of rates.`]);
  }
  if (!out.length) out.push(["All normal", "Nothing stands out. Re-run this with each new bill to catch changes early."]);
  return out;
}
