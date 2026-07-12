#!/usr/bin/env node
/**
 * Verifies trading-day freshness for daily bars (weekend-aware).
 * Run: node scripts/test-stale-refresh.mjs
 */

import assert from "assert";
import { mergeOhlcv, validateFreshness } from "./validate-and-merge.mjs";
import {
  expectedLastTradingDay,
  tradingDayLag,
} from "./lib/freshness.mjs";

const policy = {
  freshness: {
    maxAgeHours: 24,
    minBarCount: 50,
    maxTradingDayLag: 3,
  },
  freshnessByTimeframe: {
    "1d": { freshnessMode: "tradingDay" },
  },
};

const bars = [
  { date: "2026-07-08", open: 195, high: 205, low: 195, close: 204, volume: 120 },
  { date: "2026-07-09", open: 204, high: 206, low: 203, close: 205, volume: 130 },
  { date: "2026-07-10", open: 205, high: 208, low: 204, close: 207, volume: 140 },
];

// Weekend: last bar Friday, fetchedAt old — still fresh for 1d
const sunday = new Date("2026-07-12T15:00:00.000Z");
assert.strictEqual(expectedLastTradingDay(sunday), "2026-07-10");

const weekendQuote = {
  ticker: "NVDA:NASDAQ",
  timeframe: "1d",
  fetchedAt: "2026-07-09T10:00:00.000Z",
  lastBarDate: "2026-07-10",
  barCount: 60,
  ohlcv: bars,
};

assert.strictEqual(
  validateFreshness(weekendQuote, policy, "1d").status,
  "fresh",
  "Friday close on Sunday should be fresh",
);

// Wednesday bar on Sunday = 2 sessions behind (Thu, Fri) — still within lag 3
const wedQuote = {
  ...weekendQuote,
  lastBarDate: "2026-07-08",
};
assert.strictEqual(tradingDayLag("2026-07-08", sunday), 2);
assert.strictEqual(
  validateFreshness(wedQuote, policy, "1d").status,
  "fresh",
  "2 trading days behind should be fresh when max lag is 3",
);

// fetchedAt age must not stale 1d data
const oldFetch = {
  ...wedQuote,
  fetchedAt: "2026-06-01T00:00:00.000Z",
};
assert.strictEqual(
  validateFreshness(oldFetch, policy, "1d").status,
  "fresh",
  "1d ignores fetchedAt when last bar is recent enough",
);

// Intraday still uses maxAgeHours
const intradayPolicy = {
  ...policy,
  freshnessByTimeframe: {
    "1h": { freshnessMode: "maxAge", maxAgeHours: 4 },
  },
};
const intradayQuote = {
  ticker: "NVDA:NASDAQ",
  timeframe: "1h",
  fetchedAt: "2026-06-01T00:00:00.000Z",
  lastBarDate: "2026-07-10",
  barCount: 60,
};
assert.strictEqual(
  validateFreshness(intradayQuote, intradayPolicy, "1h").status,
  "stale",
  "intraday should still use fetchedAt age",
);

const incoming = { ...wedQuote, fetchedAt: new Date().toISOString(), ohlcv: [...bars] };
const { hasDiff } = mergeOhlcv(wedQuote.ohlcv, incoming.ohlcv);
assert.strictEqual(hasDiff, false);

console.log("OK trading-day freshness (weekend-aware, lag<=3)");
