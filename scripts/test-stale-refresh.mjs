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

const last = expectedLastTradingDay();
const d = new Date(`${last}T12:00:00.000Z`);
const prev = new Date(d);
prev.setUTCDate(prev.getUTCDate() - 1);
while (prev.getUTCDay() === 0 || prev.getUTCDay() === 6) {
  prev.setUTCDate(prev.getUTCDate() - 1);
}
const prev2 = new Date(prev);
prev2.setUTCDate(prev2.getUTCDate() - 1);
while (prev2.getUTCDay() === 0 || prev2.getUTCDay() === 6) {
  prev2.setUTCDate(prev2.getUTCDate() - 1);
}

const d0 = prev2.toISOString().slice(0, 10);
const d1 = prev.toISOString().slice(0, 10);
const d2 = last;

const bars = [
  { date: d0, open: 195, high: 205, low: 195, close: 204, volume: 120 },
  { date: d1, open: 204, high: 206, low: 203, close: 205, volume: 130 },
  { date: d2, open: 205, high: 208, low: 204, close: 207, volume: 140 },
];

const freshQuote = {
  ticker: "NVDA:NASDAQ",
  timeframe: "1d",
  fetchedAt: "2020-01-01T10:00:00.000Z",
  lastBarDate: last,
  barCount: 60,
  ohlcv: bars,
};

assert.strictEqual(
  validateFreshness(freshQuote, policy, "1d").status,
  "fresh",
  "latest expected trading day should be fresh",
);

// 2 sessions behind — still within lag 3
const lag2Quote = {
  ...freshQuote,
  lastBarDate: d0,
};
assert.ok(tradingDayLag(d0) <= 3);
assert.strictEqual(
  validateFreshness(lag2Quote, policy, "1d").status,
  "fresh",
  "within maxTradingDayLag should be fresh",
);

// fetchedAt age must not stale 1d data under tradingDay mode
const oldFetch = {
  ...freshQuote,
  fetchedAt: "2020-01-01T00:00:00.000Z",
};
assert.strictEqual(
  validateFreshness(oldFetch, policy, "1d").status,
  "fresh",
  "1d ignores fetchedAt when last bar is recent enough",
);

// maxAge freshness still uses fetchedAt age when configured
const maxAgePolicy = {
  ...policy,
  freshnessByTimeframe: {
    "1d": { freshnessMode: "maxAge", maxAgeHours: 4 },
  },
};
const maxAgeQuote = {
  ticker: "NVDA:NASDAQ",
  timeframe: "1d",
  fetchedAt: "2020-01-01T00:00:00.000Z",
  lastBarDate: last,
  barCount: 60,
};
assert.strictEqual(
  validateFreshness(maxAgeQuote, maxAgePolicy, "1d").status,
  "stale",
  "maxAge mode should still use fetchedAt age",
);

const incoming = {
  ...freshQuote,
  fetchedAt: new Date().toISOString(),
  ohlcv: [...bars],
};
const { hasDiff } = mergeOhlcv(freshQuote.ohlcv, incoming.ohlcv);
assert.strictEqual(hasDiff, false);

// Weekend fixture: Friday close on Sunday is still the expected last session
const sunday = new Date("2026-07-12T15:00:00.000Z");
assert.strictEqual(expectedLastTradingDay(sunday), "2026-07-10");
assert.strictEqual(tradingDayLag("2026-07-08", sunday), 2);

console.log("OK trading-day freshness (weekend-aware)");
