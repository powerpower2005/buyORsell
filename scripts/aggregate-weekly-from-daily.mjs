#!/usr/bin/env node
/**
 * Rebuild 1w.json for every ticker that already has 1d.json (no network).
 *
 * Usage: node scripts/aggregate-weekly-from-daily.mjs [TICKER]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { persistAggregatesFromDaily } from "./validate-and-merge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");

function listDailyQuotes(onlyTicker) {
  const out = [];
  if (!fs.existsSync(DATA)) return out;
  for (const ent of fs.readdirSync(DATA, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith(".")) continue;
    const rel = `data/${ent.name}/1d.json`;
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const quote = JSON.parse(fs.readFileSync(full, "utf8"));
    if (onlyTicker && quote.ticker !== onlyTicker && ent.name !== onlyTicker) {
      continue;
    }
    out.push(quote);
  }
  return out;
}

function main() {
  const only = process.argv[2] || process.env.TICKER || "";
  const quotes = listDailyQuotes(only || undefined);
  if (!quotes.length) {
    console.error(only ? `No 1d.json for ${only}` : "No 1d.json files under data/");
    process.exit(1);
  }

  let ok = 0;
  for (const q of quotes) {
    const derived = persistAggregatesFromDaily(q);
    if (derived.length) ok += 1;
  }
  console.log(JSON.stringify({ tickers: quotes.length, updated: ok }, null, 2));
}

main();
