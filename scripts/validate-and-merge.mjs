#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchQuote, tickerToSlug } from "./fetch-quote.mjs";

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

function parseWeekday(dateStr) {
  return new Date(dateStr + "T12:00:00Z").getUTCDay();
}

export function validateFreshness(quoteFile, policy, timeframe = quoteFile.timeframe) {
  if (!policy?.freshness?.maxAgeHours) {
    throw new Error("data-policy.json: freshness.maxAgeHours is required");
  }
  if (policy.freshness.minBarCount == null) {
    throw new Error("data-policy.json: freshness.minBarCount is required");
  }

  const tfPolicy = policy.freshnessByTimeframe?.[timeframe];
  const maxAgeHours = tfPolicy?.maxAgeHours ?? policy.freshness.maxAgeHours;
  const minBarCount = policy.freshness.minBarCount;

  const ageMs = Date.now() - new Date(quoteFile.fetchedAt).getTime();
  if (ageMs > maxAgeHours * 3600 * 1000) {
    return { status: "stale", reason: "maxAgeHours exceeded" };
  }

  if (quoteFile.barCount < minBarCount) {
    return { status: "stale", reason: "minBarCount" };
  }

  if (policy.freshness.requireLastBarIsRecentTradingDay) {
    const last = new Date(quoteFile.lastBarDate + "T12:00:00Z");
    const now = new Date();
    const lagDays = Math.floor((now - last) / 86400000);
    const maxLag = policy.freshness.maxTradingDayLag + 2;
    if (lagDays > maxLag) {
      return { status: "stale", reason: "lastBarDate too old" };
    }
    const dow = parseWeekday(quoteFile.lastBarDate);
    if (dow === 0 || dow === 6) {
      /* weekend bar ok */
    }
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
        return { action: "skipped", reason: "already fresh", quote: existing };
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
  let merged = incoming;
  let hasDiff = true;

  if (existing?.ohlcv?.length) {
    const m = mergeOhlcv(existing.ohlcv, incoming.ohlcv);
    merged = {
      ...incoming,
      ohlcv: m.ohlcv,
      barCount: m.ohlcv.length,
      lastBarDate: m.ohlcv.at(-1).date,
    };
    hasDiff = m.hasDiff;
  }

  if (policy.update.skipCommitIfNoDiff && existing && !hasDiff) {
    const staleReason = validateFreshness(existing, policy, timeframe);
    if (staleReason.status === "fresh") {
      writeJson(statusPath(ticker, timeframe), {
        status: "skipped",
        updatedAt: new Date().toISOString(),
        ticker,
        timeframe,
      });
      return { action: "skipped", reason: "no diff", quote: existing };
    }
    merged = {
      ...merged,
      fetchedAt: incoming.fetchedAt,
      source: incoming.source ?? merged.source,
      resolvedSymbol: incoming.resolvedSymbol ?? merged.resolvedSymbol,
    };
    hasDiff = true;
  }

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

  return { action: "committed", quote: merged, hasDiff };
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
