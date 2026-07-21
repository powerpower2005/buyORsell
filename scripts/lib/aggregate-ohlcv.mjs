/**
 * Aggregate lower-timeframe OHLCV into higher buckets (e.g. 1d → 1w).
 */

/** Monday (UTC) of the ISO-style week containing isoDate. */
export function weekStartMonday(isoDate) {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Collapse daily bars into weekly OHLCV.
 * Week = Mon–Sun (UTC). Bar date = last trading day in that week.
 */
export function aggregateWeekly(dailyBars) {
  if (!dailyBars?.length) return [];

  const sorted = [...dailyBars].sort((a, b) => a.date.localeCompare(b.date));
  /** @type {Map<string, typeof sorted>} */
  const groups = new Map();

  for (const bar of sorted) {
    const key = weekStartMonday(bar.date);
    const list = groups.get(key);
    if (list) list.push(bar);
    else groups.set(key, [bar]);
  }

  const weeks = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  return weeks.map((key) => {
    const bars = groups.get(key);
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    for (const b of bars) {
      if (b.high > high) high = b.high;
      if (b.low < low) low = b.low;
      volume += b.volume ?? 0;
    }
    const first = bars[0];
    const last = bars[bars.length - 1];
    return {
      date: last.date,
      open: first.open,
      high,
      low,
      close: last.close,
      volume,
    };
  });
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

/**
 * Build a quote file object from a daily quote + aggregated weekly bars.
 */
export function buildWeeklyQuote(dailyQuote, weeklyBars, tfConfig) {
  if (!weeklyBars.length) {
    throw new Error(`No weekly bars aggregated for ${dailyQuote.ticker}`);
  }
  const last = weeklyBars[weeklyBars.length - 1];
  return {
    ticker: dailyQuote.ticker,
    timeframe: "1w",
    window: dailyQuote.window ?? null,
    schemaVersion: dailyQuote.schemaVersion ?? 1,
    intervalSeconds: tfConfig.intervalSeconds ?? 604800,
    source: "aggregate:1d",
    resolvedSymbol: dailyQuote.resolvedSymbol,
    fetchedAt: dailyQuote.fetchedAt,
    lastBarDate: last.date,
    barCount: weeklyBars.length,
    checksum: hashLastBar(last),
    ohlcv: weeklyBars,
    aggregatedFrom: "1d",
  };
}
