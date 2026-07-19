#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchQuote, tickerToSlug } from "./fetch-quote.mjs";
import {
  assertBarsMatchTimeframe,
  dropLeadingWrongCadence,
} from "./lib/bar-cadence.mjs";
import { financeSymbolCandidates } from "./lib/finance-symbol.mjs";

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

function timeframeConfig(timeframe) {
  const timeframes = loadJson("config/timeframes.json").timeframes;
  return timeframes[timeframe] ?? {};
}

function targetBarCount(tfConfig) {
  return tfConfig.maxBars ?? null;
}

function backfillChunkDays(tfConfig) {
  return tfConfig.backfillChunkDays ?? 10;
}

/**
 * After the first fetch, walk backward in chunkDays (default 10) windows
 * and merge until we reach maxBars / target, or a chunk adds nothing.
 */
export async function backfillPastBars({
  ticker,
  timeframe,
  ohlcv,
  resolvedSymbol,
}) {
  const tfConfig = timeframeConfig(timeframe);
  const target = targetBarCount(tfConfig);
  const chunkDays = backfillChunkDays(tfConfig);
  if (target == null || chunkDays <= 0) {
    return { ohlcv, rounds: 0, addedBars: 0, stoppedReason: "disabled" };
  }
  if (ohlcv.length >= target) {
    return { ohlcv, rounds: 0, addedBars: 0, stoppedReason: "already_at_target" };
  }

  const candidates = resolvedSymbol
    ? [resolvedSymbol, ...financeSymbolCandidates(ticker)].filter(
        (v, i, a) => v && a.indexOf(v) === i,
      )
    : undefined;

  let current = ohlcv;
  let rounds = 0;
  let addedBars = 0;
  let emptyStreak = 0;
  const maxRounds = Math.ceil((target * 3) / Math.max(1, chunkDays)) + 5;
  const maxEmptyStreak = 12;
  let stoppedReason = "target_reached";
  // Cursor walks further into the past even when a chunk is empty (holidays / N/A).
  let cursorEnd = addUtcDays(current[0].date, -1);

  while (current.length < target && rounds < maxRounds) {
    rounds += 1;
    const endIso = cursorEnd;
    const startIso = addUtcDays(endIso, -(chunkDays - 1));
    if (endIso < "1990-01-01") {
      stoppedReason = "cursor_floor";
      break;
    }
    console.log(
      `[backfill] ${ticker} ${timeframe} round ${rounds}: ${startIso}..${endIso} (have ${current.length}/${target})`,
    );

    let chunk;
    try {
      chunk = await fetchQuote(ticker, timeframe, {
        start: startIso,
        end: endIso,
        symbolCandidates: candidates,
      });
    } catch (e) {
      console.warn(
        `[backfill] chunk empty/fail, step back: ${e instanceof Error ? e.message : e}`,
      );
      emptyStreak += 1;
      cursorEnd = addUtcDays(startIso, -1);
      if (emptyStreak >= maxEmptyStreak) {
        stoppedReason = "empty_streak";
        break;
      }
      continue;
    }

    let incoming = dropLeadingWrongCadence(chunk.ohlcv, timeframe);
    if (!incoming.length) {
      emptyStreak += 1;
      cursorEnd = addUtcDays(startIso, -1);
      if (emptyStreak >= maxEmptyStreak) {
        stoppedReason = "empty_streak";
        break;
      }
      continue;
    }

    const before = current.length;
    const m = mergeOhlcv(current, incoming);
    current = sanitizeBars(m.ohlcv, timeframe);
    const gained = current.length - before;
    cursorEnd = addUtcDays(current[0].date, -1);
    if (gained <= 0) {
      emptyStreak += 1;
      if (emptyStreak >= maxEmptyStreak) {
        stoppedReason = "no_new_bars";
        break;
      }
      continue;
    }
    emptyStreak = 0;
    addedBars += gained;
  }

  if (rounds >= maxRounds && current.length < target) {
    stoppedReason = "max_rounds";
  }

  console.log(
    `[backfill] ${ticker} ${timeframe} done: ${current.length}/${target} bars (+${addedBars} in ${rounds} rounds, ${stoppedReason})`,
  );
  return { ohlcv: current, rounds, addedBars, stoppedReason };
}

function persistQuote({ ticker, timeframe, rel, quote }) {
  writeJson(rel, quote);
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
    fetchedAt: quote.fetchedAt,
    lastBarDate: quote.lastBarDate,
    barCount: quote.barCount,
  });
}

export async function runFetchPipeline({ ticker, timeframe, force = false }) {
  const policy = loadJson("config/data-policy.json");
  const tfConfig = timeframeConfig(timeframe);
  const target = targetBarCount(tfConfig);
  const rel = quotePath(ticker, timeframe);
  const full = path.join(ROOT, rel);
  let existing = null;
  if (fs.existsSync(full)) {
    existing = JSON.parse(fs.readFileSync(full, "utf8"));
    if (!force) {
      const v = validateFreshness(existing, policy, timeframe);
      if (v.status === "fresh") {
        const cleaned = sanitizeBars(existing.ohlcv, timeframe);
        const wasCleaned = cleaned.length !== existing.ohlcv.length;
        let quote = existing;
        if (wasCleaned) {
          assertBarsMatchTimeframe(cleaned, timeframe, `stored ${ticker} ${timeframe}`);
          quote = {
            ...existing,
            ohlcv: cleaned,
            barCount: cleaned.length,
            lastBarDate: cleaned.at(-1).date,
          };
          persistQuote({ ticker, timeframe, rel, quote });
        }

        if (target == null || quote.ohlcv.length >= target) {
          return {
            action: wasCleaned ? "cleaned" : "skipped",
            reason: wasCleaned
              ? "trimmed polluted history"
              : "already fresh",
            quote,
          };
        }

        // Fresh tip, but history shorter than target — walk backward in chunks.
        writeJson(statusPath(ticker, timeframe), {
          status: "running",
          startedAt: new Date().toISOString(),
          ticker,
          timeframe,
        });
        const filled = await backfillPastBars({
          ticker,
          timeframe,
          ohlcv: quote.ohlcv,
          resolvedSymbol: quote.resolvedSymbol,
        });
        if (filled.addedBars <= 0) {
          writeJson(statusPath(ticker, timeframe), {
            status: "ready",
            updatedAt: new Date().toISOString(),
            ticker,
            timeframe,
          });
          return {
            action: wasCleaned ? "cleaned" : "skipped",
            reason: wasCleaned
              ? `trimmed polluted history; backfill ${filled.stoppedReason}`
              : `already fresh; backfill ${filled.stoppedReason}`,
            quote,
            backfill: filled,
          };
        }
        assertBarsMatchTimeframe(
          filled.ohlcv,
          timeframe,
          `backfill ${ticker} ${timeframe}`,
        );
        const merged = {
          ...quote,
          ohlcv: filled.ohlcv,
          barCount: filled.ohlcv.length,
          lastBarDate: filled.ohlcv.at(-1).date,
        };
        persistQuote({ ticker, timeframe, rel, quote: merged });
        return {
          action: "backfilled",
          reason: filled.stoppedReason,
          quote: merged,
          backfill: filled,
          barsChanged: true,
        };
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

  // After first fetch, extend history backward in 10-day chunks until maxBars.
  const filled = await backfillPastBars({
    ticker,
    timeframe,
    ohlcv,
    resolvedSymbol: incoming.resolvedSymbol || existing?.resolvedSymbol,
  });
  if (filled.addedBars > 0) {
    ohlcv = filled.ohlcv;
    barsChanged = true;
    assertBarsMatchTimeframe(ohlcv, timeframe, `backfill ${ticker} ${timeframe}`);
  }

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

  persistQuote({ ticker, timeframe, rel, quote: merged });

  return {
    action: "committed",
    quote: merged,
    barsChanged,
    backfill: {
      rounds: filled.rounds,
      addedBars: filled.addedBars,
      stoppedReason: filled.stoppedReason,
    },
  };
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
