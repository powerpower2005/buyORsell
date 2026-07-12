/** @typedef {"1d"|"1w"|"15m"|"1h"|"4h"} Timeframe */

/** Most recent US equity session date expected to have a daily bar. */
export function expectedLastTradingDay(now = new Date()) {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dow = d.getUTCDay();
  if (dow === 0) d.setUTCDate(d.getUTCDate() - 2);
  else if (dow === 6) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function countTradingDaysBetween(fromExclusive, toInclusive) {
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

export function tradingDayLag(lastBarDate, now = new Date()) {
  const expected = expectedLastTradingDay(now);
  if (lastBarDate >= expected) return 0;
  return countTradingDaysBetween(lastBarDate, expected);
}

const TRADING_DAY_TIMEFRAMES = new Set(["1d", "1w"]);

/**
 * @param {Timeframe} timeframe
 * @param {Record<string, { freshnessMode?: string }>} byTf
 */
export function usesTradingDayFreshness(timeframe, byTf = {}) {
  const tfPolicy = byTf[timeframe];
  if (tfPolicy?.freshnessMode === "tradingDay") return true;
  if (tfPolicy?.freshnessMode === "maxAge") return false;
  return TRADING_DAY_TIMEFRAMES.has(timeframe);
}
