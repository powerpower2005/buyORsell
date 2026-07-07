#!/usr/bin/env node
/**
 * Google Finance batchexecute fetcher
 * Usage: node scripts/fetch-google-finance.mjs NVDA:NASDAQ [timeframe]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BATCHEXECUTE_URL =
  "https://www.google.com/finance/_/GoogleFinanceUi/data/batchexecute";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: "CONSENT=YES+",
  "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
};

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

export function tickerToSlug(ticker) {
  return ticker.replace(/:/g, "-");
}

export function tickerTuple(ticker) {
  if (ticker.includes("-") && !ticker.includes(":")) {
    const [base, quote] = ticker.split("-");
    return [null, null, [base, quote]];
  }
  const [sym, exchange] = ticker.split(":");
  return [null, [sym, exchange]];
}

function buildBody(requests) {
  const arr = requests.map((r, i) => [
    r.id,
    JSON.stringify(r.req),
    null,
    String(i + 1),
  ]);
  return `f.req=${encodeURIComponent(JSON.stringify([arr]))}`;
}

export function parseBatchResponse(raw) {
  const stripped = raw.replace(/^\)\]\}'\n\n?/, "");
  const results = [];
  const lines = stripped.split("\n");
  let i = 0;
  while (i < lines.length) {
    if (/^[0-9a-fA-F]+$/.test(lines[i].trim()) && i + 1 < lines.length) {
      try {
        for (const entry of JSON.parse(lines[i + 1])) {
          if (entry[0] === "wrb.fr") {
            results.push({
              id: entry[1],
              data: JSON.parse(entry[2]),
            });
          }
        }
      } catch {
        /* skip malformed chunk */
      }
      i += 2;
    } else {
      i += 1;
    }
  }
  return results;
}

function formatDate(dateArr) {
  const [y, m, d] = dateArr;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseChartToOhlcv(chartData) {
  const chartRaw = chartData?.[0]?.[0];
  if (!chartRaw) return [];

  const bars = [];
  for (const period of chartRaw[3] || []) {
    for (const pt of period?.[1] || []) {
      if (!Array.isArray(pt?.[0]) || !Array.isArray(pt?.[1])) continue;
      const close = pt[1][0];
      if (typeof close !== "number") continue;
      const volume = typeof pt[2] === "number" ? pt[2] : 0;
      bars.push({
        date: formatDate(pt[0]),
        open: close,
        high: close,
        low: close,
        close,
        volume,
      });
    }
  }

  bars.sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 1; i < bars.length; i++) {
    bars[i].open = bars[i - 1].close;
    bars[i].high = Math.max(bars[i].high, bars[i].open, bars[i].close);
    bars[i].low = Math.min(bars[i].low, bars[i].open, bars[i].close);
  }

  return bars;
}

export async function fetchQuote(ticker, timeframe = "1d") {
  const timeframes = loadJson("config/timeframes.json").timeframes;
  const tfConfig = timeframes[timeframe];
  if (!tfConfig) throw new Error(`Unknown timeframe: ${timeframe}`);
  if (tfConfig.googleChartMode == null) {
    throw new Error(`timeframes.json: ${timeframe}.googleChartMode is required`);
  }
  if (!tfConfig.googleWindow) {
    throw new Error(`timeframes.json: ${timeframe}.googleWindow is required`);
  }

  const chartMode = tfConfig.googleChartMode;
  const t = tickerTuple(ticker);
  const requests = [{ id: "AiCwsd", req: [[t], chartMode] }];
  const rpcids = "AiCwsd";
  const url =
    `${BATCHEXECUTE_URL}?rpcids=${rpcids}` +
    `&source-path=/finance/quote/${encodeURIComponent(ticker)}&hl=en&gl=us&rt=c`;

  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: buildBody(requests),
  });

  if (!res.ok) {
    throw new Error(`Google Finance HTTP ${res.status}`);
  }

  const results = parseBatchResponse(await res.text());
  const chart = results.find((r) => r.id === "AiCwsd");
  if (!chart) throw new Error("No chart data in response");

  const ohlcv = parseChartToOhlcv(chart.data);
  if (ohlcv.length === 0) throw new Error("Empty OHLCV series");

  const last = ohlcv[ohlcv.length - 1];
  return {
    ticker,
    timeframe,
    window: tfConfig.googleWindow,
    schemaVersion: 1,
    intervalSeconds: tfConfig.intervalSeconds,
    fetchedAt: new Date().toISOString(),
    lastBarDate: last.date,
    barCount: ohlcv.length,
    checksum: hashLastBar(last),
    ohlcv,
  };
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

async function main() {
  const ticker = process.argv[2] || "NVDA:NASDAQ";
  const tf = process.argv[3] || "1d";
  const data = await fetchQuote(ticker, tf);
  console.log(JSON.stringify({ barCount: data.barCount, last: data.ohlcv.at(-1) }, null, 2));
}

if (process.argv[1]?.includes("fetch-google-finance")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
