# Electricity Bill Spike Analyzer

Paste or upload your monthly electricity bills and find out which months were unusually high, how much extra they cost, and what to check. Runs fully in the browser with no backend, build step or dependencies.

## Features
- **Tamil Nadu aware:** bi-monthly billing, telescopic LT-IA slabs, fixed charge by connected load, and the 500-unit cliff where the free allowance drops from 200 to 100 units
- Structured bill entry: choose each bill's From and To month from dropdowns and the days are calculated automatically (leap years included, still editable); add/remove rows, validation that names the bill, plus CSV import
- Bill audit: compares what you were billed with what the slab tariff predicts and flags large gaps
- Robust spike detection (median and MAD) with per-day normalization for uneven billing periods
- **Built as a guide:** a plain-language explainer (units, slabs, the 500-unit cliff, fixed charge, how to read a bill), a slab-by-slab bill calculator, and an appliance usage estimator for people new to electricity bills
- **Cliff Guard:** mid-cycle planner that projects your bill and gives a daily unit budget to stay under 500 units
- Tariff curve chart: your bills plotted against the cost curve, with the cliff marked
- Meter-style hero where extra spend rolls onto kWh-meter digit drums; dark mode, keyboard accessible, respects reduced motion
- CSV validation with line-numbered errors; user text is never inserted as HTML

## Input format
```
period,units,amount,days
Jan–Feb,410,1700,59
```
Units per bi-monthly bill, amount in ₹, days optional. See `data/sample.csv`.

## Tariff data
Slab rates live in `js/tariff.js` as plain configuration (effective 10 May 2026, as publicly reported). Verify them against the official TNERC/TNPDCL order and update the file if rates change. Taxes and arrears are not modelled.

## Run it
```
npm start        # serves the folder (ES modules need http, not file://)
npm test         # unit tests with Node's built-in test runner
```

## Project structure
```
index.html          page shell
css/styles.css      theme tokens and layout
js/parser.js        CSV -> rows + errors
js/analysis.js      statistics (pure functions)
js/tariff.js        TN slab tariff, fixed charge, 500-unit cliff
js/learn.js         bill calculator and appliance estimator
js/period.js        month labels and day counts for a billing period
js/planner.js       Cliff Guard cycle projection
js/insights.js      analysis -> plain-language causes
js/chart.js         SVG chart renderer
js/main.js          wires the UI together
tests/              unit tests for parser, analysis and tariff
data/sample.csv     demo data
```

## How detection works
For each bill, `z = 0.6745 × (value − median) / MAD`. A bill is a spike when `z > 2` and it is at least 20% above the median. Median and MAD are used instead of mean and standard deviation because outliers inflate the latter and mask themselves.

## Ideas to extend
Parse bill PDFs, model state tariff slabs to explain cost per slab, compare the same month year over year.

## Deploy
GitHub repo → Settings → Pages → deploy from `main`.
