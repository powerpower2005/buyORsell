#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchQuote, tickerToSlug } from "./fetch-quote.mjs";
import {
  assertBarsMatchTimeframe,
  dropLeadingWrongCadence,
} from "./lib/bar-cadence.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function writeJson(rel, data) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + "\n");
}

function barsEqual(a, b) {
  return (
    a.date === b.date &&
    a.open === b.open &&
    a.high === b.high &&
    a.low === b.low &&
    a.close === b.close &&
    a.volume === b.volume
  );
}

export function mergeOhlcv(existing, incoming) {
  const byDate = new Map(existing.map((b) => [b.date, b]));
  let changed = 0;
  for (const bar of incoming) {
    const prev = byDate.get(bar.date);
    if (!prev || !barsEqual(prev, bar)) {
      byDate.set(bar.date, bar);
      changed++;
    }
  }
  const ohlcv = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, b]) => b);
  return { ohlcv, changedBars: changed, hasDiff: changed > 0 };
}

function addUtcDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Drop bars outside the timeframe lookback / maxBars (stops weekly pollution sticking forever). */
export function windowBars(bars, timeframe) {
  if (!bars.length) return bars;
  const timeframes = loadJson("config/timeframes.json").timeframes;
  const cfg = timeframes[timeframe] ?? {};
  let out = bars;

  if (cfg.sheetsLookbackDays != null) {
    const last = bars.at(-1).date;
    const cutoff = addUtcDays(last, -cfg.sheetsLookbackDays);
    out = out.filter((b) => b.date >= cutoff);
  }

  if (cfg.maxBars != null && out.length > cfg.maxBars) {
    out = out.slice(-cfg.maxBars);
  }

  return out;
}

/** Drop leading weekly stretch first, then apply lookback / maxBars. */
export function sanitizeBars(bars, timeframe) {
  let out = dropLeadingWrongCadence(bars, timeframe);
  out = windowBars(out, timeframe);
  return out;
}

import { tradingDayLag, usesTradingDayFreshness } from "./lib/freshness.mjs";

export function validateFreshness(quoteFile, policy, timeframe = quoteFile.timeframe) {
  if (!policy?.freshness?.maxAgeHours) {
    throw new Error("data-policy.json: freshness.maxAgeHours is required");
  }
  if (policy.freshness.minBarCount == null) {
    throw new Error("data-policy.json: freshness.minBarCount is required");
  }
  if (policy.freshness.maxTradingDayLag == null) {
    throw new Error("data-policy.json: freshness.maxTradingDayLag is required");
  }

  if (quoteFile.barCount < policy.freshness.minBarCount) {
    return { status: "stale", reason: "minBarCount" };
  }

  if (usesTradingDayFreshness(timeframe, policy.freshnessByTimeframe)) {
    const lag = tradingDayLag(quoteFile.lastBarDate);
    if (lag > policy.freshness.maxTradingDayLag) {
      return {
        status: "stale",
        reason: `lastBarDate ${lag} trading day(s) behind`,
      };
    }
    return { status: "fresh", reason: "ok" };
  }

  const tfPolicy = policy.freshnessByTimeframe?.[timeframe];
  const maxAgeHours = tfPolicy?.maxAgeHours ?? policy.freshness.maxAgeHours;
  const ageMs = Date.now() - new Date(quoteFile.fetchedAt).getTime();
  if (ageMs > maxAgeHours * 3600 * 1000) {
    return { status: "stale", reason: "maxAgeHours exceeded" };
  }

  return { status: "fresh", reason: "ok" };
}

function quotePath(ticker, timeframe) {
  return `data/${tickerToSlug(ticker)}/${timeframe}.json`;
}

function statusPath(ticker, timeframe) {
  return `data/.meta/${tickerToSlug(ticker)}/${timeframe}.status.json`;
}

function updateIndex(entry) {
  const indexPath = "data/index.json";
  let index = { schemaVersion: 1, updatedAt: new Date().toISOString(), entries: [] };
  if (fs.existsSync(path.join(ROOT, indexPath))) {
    index = loadJson(indexPath);
  }
  index.entries = index.entries.filter(
    (e) => !(e.ticker === entry.ticker && e.timeframe === entry.timeframe),
  );
  index.entries.push(entry);
  index.updatedAt = new Date().toISOString();
  writeJson(indexPath, index);
}

export async function runFetchPipeline({ ticker, timeframe, force = false }) {
  const policy = loadJson("config/data-policy.json");
  const rel = quotePath(ticker, timeframe);
  const full = path.join(ROOT, rel);
  let existing = null;
  if (fs.existsSync(full)) {
    existing = JSON.parse(fs.readFileSync(full, "utf8"));
    if (!force) {
      const v = validateFreshness(existing, policy, timeframe);
      if (v.status === "fresh") {
        const cleaned = sanitizeBars(existing.ohlcv, timeframe);
        if (cleaned.length === existing.ohlcv.length) {
          return { action: "skipped", reason: "already fresh", quote: existing };
        }
        // Fresh but polluted / outside window — rewrite cleaned history without refetch.
        assertBarsMatchTimeframe(cleaned, timeframe, `stored ${ticker} ${timeframe}`);
        const rewritten = {
          ...existing,
          ohlcv: cleaned,
          barCount: cleaned.length,
          lastBarDate: cleaned.at(-1).date,
        };
        writeJson(rel, rewritten);
        updateIndex({
          ticker,
          timeframe,
          path: rel,
          fetchedAt: rewritten.fetchedAt,
          lastBarDate: rewritten.lastBarDate,
          barCount: rewritten.barCount,
        });
        return { action: "cleaned", reason: "trimmed polluted history", quote: rewritten };
      }
    }
  }

  writeJson(statusPath(ticker, timeframe), {
    status: "running",
    startedAt: new Date().toISOString(),
    ticker,
    timeframe,
  });

  const incoming = await fetchQuote(ticker, timeframe);
  // Drop weekly leading stretch from the fetch itself before merge/assert.
  incoming.ohlcv = dropLeadingWrongCadence(incoming.ohlcv, timeframe);
  assertBarsMatchTimeframe(
    incoming.ohlcv,
    timeframe,
    `GOOGLEFINANCE ${ticker} ${timeframe}`,
  );

  let ohlcv = incoming.ohlcv;
  let barsChanged = !existing?.ohlcv?.length;

  if (existing?.ohlcv?.length) {
    const m = mergeOhlcv(existing.ohlcv, incoming.ohlcv);
    ohlcv = m.ohlcv;
    barsChanged = m.hasDiff;
  }

  const beforeSanitize = ohlcv.length;
  ohlcv = sanitizeBars(ohlcv, timeframe);
  if (ohlcv.length !== beforeSanitize) barsChanged = true;

  if (!ohlcv.length) {
    throw new Error(`No bars left after sanitize for ${ticker} ${timeframe}`);
  }

  assertBarsMatchTimeframe(ohlcv, timeframe, `sanitized ${ticker} ${timeframe}`);

  // Successful fetch always stamps fetchedAt so freshness reflects verification time,
  // even when GOOGLEFINANCE returns identical bars.
  const merged = {
    ...(existing || {}),
    ...incoming,
    ohlcv,
    barCount: ohlcv.length,
    lastBarDate: ohlcv.at(-1).date,
    fetchedAt: incoming.fetchedAt,
  };

  writeJson(rel, merged);
  writeJson(statusPath(ticker, timeframe), {
    status: "ready",
    updatedAt: new Date().toISOString(),
    ticker,
    timeframe,
  });

  updateIndex({
    ticker,
    timeframe,
    path: rel,
    fetchedAt: merged.fetchedAt,
    lastBarDate: merged.lastBarDate,
    barCount: merged.barCount,
  });

  return { action: "committed", quote: merged, barsChanged };
}

async function main() {
  const ticker = process.env.TICKER || process.argv[2];
  const timeframe = process.env.TIMEFRAME || process.argv[3] || "1d";
  const force = process.env.FORCE === "true";

  if (!ticker) {
    console.error("Usage: validate-and-merge.mjs TICKER [timeframe]");
    process.exit(1);
  }

  const result = await runFetchPipeline({ ticker, timeframe, force });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1]?.includes("validate-and-merge")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
