/** Parse "month,units,amount[,days]" CSV text into rows plus per-line errors. */
export function parseCSV(text) {
  const rows = [];
  const errors = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const p = line.split(",").map((s) => s.trim());
    const units = Number(p[1]);
    if (i === 0 && Number.isNaN(units)) return; // header row
    const amount = Number((p[2] ?? "").replace(/[₹\s]/g, ""));
    const days = p[3] ? Number(p[3]) : null;
    const valid =
      p.length >= 3 && p[0] && units > 0 && amount >= 0 && !Number.isNaN(amount) &&
      (days === null || days > 0);
    if (!valid) return errors.push(`Line ${i + 1}: expected month,units,amount[,days]`);
    rows.push({ month: p[0], units, amount, days });
  });
  return { rows, errors };
}

/** Validate rows typed into the bill form. Blank rows are ignored; errors name the bill number. */
export function validateRows(raw) {
  const rows = [];
  const errors = [];
  raw.forEach((r, i) => {
    const v = [r.month, r.units, r.amount, r.days].map((x) => String(x ?? "").trim());
    if (v.every((x) => !x)) return;
    const units = Number(v[1]);
    const amount = Number(v[2]);
    const days = v[3] ? Number(v[3]) : null;
    const label = `Bill ${i + 1}`;
    if (!v[0]) return errors.push(`${label}: add a period name.`);
    if (!(units > 0)) return errors.push(`${label}: units must be above 0.`);
    if (v[2] === "" || !(amount >= 0)) return errors.push(`${label}: enter the billed amount.`);
    if (days !== null && !(days > 0)) return errors.push(`${label}: days must be above 0.`);
    rows.push({ month: v[0], units, amount, days, start: r.start ?? null, end: r.end ?? null });
  });
  return { rows, errors };
}
