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
