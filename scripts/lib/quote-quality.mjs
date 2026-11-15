/** Reject malformed or mixed-range tables before they enter persisted history. */
export function assertFetchedBars(bars, { start, end } = {}) {
  if (!bars.length) throw new Error('GOOGLEFINANCE returned no parseable OHLCV rows');
  const first = start?.toISOString().slice(0, 10);
  const last = end?.toISOString().slice(0, 10);
  let previous = '';
  for (const bar of bars) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bar.date) || !Number.isFinite(Date.parse(bar.date)) || new Date(bar.date).toISOString().slice(0,10) !== bar.date) throw new Error('Invalid OHLCV date');
    if (bar.date <= previous || (first && bar.date < first) || (last && bar.date > last)) throw new Error('OHLCV date order, duplicate or requested-range mismatch');
    if (![bar.open,bar.high,bar.low,bar.close].every(v=>Number.isFinite(v)&&v>0) || bar.low>Math.min(bar.open,bar.close) || bar.high<Math.max(bar.open,bar.close) || bar.low>bar.high) throw new Error('Invalid OHLC price bounds');
    if (bar.volume != null && (!Number.isFinite(bar.volume)||bar.volume<0)) throw new Error('Invalid OHLCV volume');
    previous = bar.date;
  }
}
