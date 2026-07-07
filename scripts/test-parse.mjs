import { parseGoogFinanceAllTable } from "../scripts/lib/goog-finance-parse.mjs";

const sample = [
  ["Date", "Open", "High", "Low", "Close", "Volume"],
  ["2026-07-01", 190, 195, 188, 194, 1000000],
  ["2026-07-02", 194, 196, 192, 195, 800000],
];

const bars = parseGoogFinanceAllTable(sample);
if (bars.length !== 2 || bars[0].open !== 190) {
  console.error("parse test failed", bars);
  process.exit(1);
}
console.log("parse test ok", bars);
