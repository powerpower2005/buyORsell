#!/usr/bin/env node
/**
 * Quote fetcher via Google Sheets GOOGLEFINANCE "all" (Hedge-style).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { financeSymbolCandidates } from "./lib/finance-symbol.mjs";
import { fetchBarsWithSymbolCandidates } from "./lib/sheets-bars.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

export function tickerToSlug(ticker) {
  return ticker.replace(/:/g, "-");
}

function utcDate(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function hashLastBar(bar) {
  const s = JSON.stringify({
    date: bar.date,
    o: bar.open,
    h: bar.high,
    l: bar.low,
    c: bar.close,
    v: bar.volume,
  });
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function dateRangeForTimeframe(tfConfig) {
  const end = utcDate(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth() + 1,
    new Date().getUTCDate(),
  );
  if (tfConfig.sheetsLookbackDays == null) {
    throw new Error("timeframes.json: sheetsLookbackDays is required for Sheets fetch");
  }
  const start = addDays(end, -tfConfig.sheetsLookbackDays);
  return { start, end };
}

export async function fetchQuote(ticker, timeframe = "1d") {
  const timeframes = loadJson("config/timeframes.json").timeframes;
  const tfConfig = timeframes[timeframe];
  if (!tfConfig) throw new Error(`Unknown timeframe: ${timeframe}`);
  if (!tfConfig.googleWindow) {
    throw new Error(`timeframes.json: ${timeframe}.googleWindow is required`);
  }
  if (tfConfig.sheetsLookbackDays == null) {
    throw new Error(`timeframes.json: ${timeframe}.sheetsLookbackDays is required`);
  }

  const sheetsCfg = loadJson("config/sheets.json");
  const candidates = financeSymbolCandidates(ticker);
  const { start, end } = dateRangeForTimeframe(tfConfig);

  const { symbol, bars } = await fetchBarsWithSymbolCandidates(
    ROOT,
    sheetsCfg,
    candidates,
    start,
    end,
  );

  if (!bars.length) {
    throw new Error(`GOOGLEFINANCE returned no bars for ${ticker} (resolved ${symbol})`);
  }

  const ohlcv = bars
    .map((b) => ({
      date: b.date,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const last = ohlcv[ohlcv.length - 1];
  return {
    ticker,
    timeframe,
    window: tfConfig.googleWindow,
    schemaVersion: 1,
    intervalSeconds: tfConfig.intervalSeconds,
    source: "google_sheets_googfinance",
    resolvedSymbol: symbol,
    fetchedAt: new Date().toISOString(),
    lastBarDate: last.date,
    barCount: ohlcv.length,
    checksum: hashLastBar(last),
    ohlcv,
  };
}

async function main() {
  const ticker = process.argv[2] || process.env.TICKER;
  const tf = process.argv[3] || process.env.TIMEFRAME || "1d";
  if (!ticker) {
    console.error("Usage: fetch-quote.mjs TICKER [timeframe]");
    process.exit(1);
  }
  const data = await fetchQuote(ticker, tf);
  console.log(
    JSON.stringify(
      {
        source: data.source,
        resolvedSymbol: data.resolvedSymbol,
        barCount: data.barCount,
        last: data.ohlcv.at(-1),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1]?.includes("fetch-quote")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
