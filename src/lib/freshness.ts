import type { Timeframe } from "./types";

import dataPolicy from "../../config/data-policy.json";

/** Most recent US equity session date expected to have a daily bar. */
export function expectedLastTradingDay(now = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dow = d.getUTCDay();
  if (dow === 0) d.setUTCDate(d.getUTCDate() - 2);
  else if (dow === 6) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function countTradingDaysBetween(
  fromExclusive: string,
  toInclusive: string,
): number {
  const start = new Date(fromExclusive + "T12:00:00Z");
  const end = new Date(toInclusive + "T12:00:00Z");
  let count = 0;
  const cur = new Date(start);
  cur.setUTCDate(cur.getUTCDate() + 1);
  while (cur <= end) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

/** Trading sessions between lastBarDate and the latest expected session. */
export function tradingDayLag(lastBarDate: string, now = new Date()): number {
  const expected = expectedLastTradingDay(now);
  if (lastBarDate >= expected) return 0;
  return countTradingDaysBetween(lastBarDate, expected);
}

const TRADING_DAY_TIMEFRAMES = new Set<Timeframe>(["1d", "1w"]);

export function usesTradingDayFreshness(timeframe: Timeframe): boolean {
  const tfPolicy = (
    dataPolicy.freshnessByTimeframe as Record<
      string,
      { freshnessMode?: string }
    >
  )?.[timeframe];
  if (tfPolicy?.freshnessMode === "tradingDay") return true;
  if (tfPolicy?.freshnessMode === "maxAge") return false;
  return TRADING_DAY_TIMEFRAMES.has(timeframe);
}
