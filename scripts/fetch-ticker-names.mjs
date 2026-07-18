#!/usr/bin/env node
/**
 * Fill data/ticker-names.json for tickers listed in data/index.json
 * using Sheets GOOGLEFINANCE(..., "name").
 *
 * Usage:
 *   node scripts/fetch-ticker-names.mjs
 *   FORCE=true node scripts/fetch-ticker-names.mjs
 *   node scripts/fetch-ticker-names.mjs --force --ticker NVDA:NASDAQ
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchTickerDisplayName } from "./lib/sheets-names.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(ROOT, "data/ticker-names.json");
const INDEX_PATH = path.join(ROOT, "data/index.json");
const SHEETS_CFG = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config/sheets.json"), "utf8"),
);

function parseArgs(argv) {
  const out = { force: process.env.FORCE === "true", only: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") out.force = true;
    else if (a === "--ticker" && argv[i + 1]) {
      out.only = argv[++i];
    }
  }
  return out;
}

function loadNamesFile() {
  if (!fs.existsSync(OUT_PATH)) {
    return { schemaVersion: 1, updatedAt: new Date().toISOString(), names: {} };
  }
  return JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
}

function uniqueTickersFromIndex() {
  if (!fs.existsSync(INDEX_PATH)) return [];
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  const set = new Set();
  for (const e of index.entries || []) {
    if (e?.ticker) set.add(String(e.ticker).trim());
  }
  return [...set].sort();
}

async function main() {
  const args = parseArgs(process.argv);
  const store = loadNamesFile();
  store.names = store.names && typeof store.names === "object" ? store.names : {};

  let tickers = uniqueTickersFromIndex();
  if (args.only) {
    tickers = [args.only.trim()];
  }
  if (!tickers.length) {
    console.log("No tickers found in data/index.json");
    process.exit(0);
  }

  const cfg = {
    ...SHEETS_CFG,
    worksheetTickerNames: "TickerNames-v1",
  };

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const ticker of tickers) {
    const key = ticker.toUpperCase();
    const existing =
      store.names[ticker] ||
      store.names[key] ||
      Object.entries(store.names).find(([k]) => k.toUpperCase() === key)?.[1];
    if (existing && !args.force) {
      console.log(`skip ${ticker} (have "${existing}")`);
      skipped += 1;
      continue;
    }

    try {
      const { symbol, name } = await fetchTickerDisplayName(ROOT, cfg, ticker);
      // Keep index ticker string as canonical key (e.g. 000660:KRX).
      store.names[ticker] = name;
      if (key !== ticker && store.names[key]) delete store.names[key];
      console.log(`ok ${ticker} ← ${symbol} → ${name}`);
      updated += 1;
    } catch (e) {
      console.error(`fail ${ticker}: ${e.message || e}`);
      failed += 1;
    }
  }

  store.schemaVersion = 1;
  store.updatedAt = new Date().toISOString();
  // Stable key order
  const ordered = {};
  for (const k of Object.keys(store.names).sort()) {
    ordered[k] = store.names[k];
  }
  store.names = ordered;

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify({ out: "data/ticker-names.json", updated, skipped, failed }, null, 2),
  );
  if (failed && !updated && !skipped) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
