/**
 * Shared bar cadence helpers for fetch scripts (mirrors src/lib/barCadence.ts).
 */

function utcDay(isoDate) {
  return Date.parse(`${isoDate}T00:00:00.000Z`);
}

export function gapDays(a, b) {
  return Math.round((utcDay(b) - utcDay(a)) / 86_400_000);
}

export function medianGapDays(bars) {
  if (bars.length < 2) return 0;
  const gaps = [];
  for (let i = 1; i < bars.length; i++) {
    gaps.push(gapDays(bars[i - 1].date, bars[i].date));
  }
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

export function dropLeadingWrongCadence(bars, timeframe) {
  if (timeframe !== "1d" || bars.length < 10) return bars;

  const dailyMedianMax = 3;
  if (medianGapDays(bars) <= dailyMedianMax) return bars;

  // Prefer the longest daily suffix (scan from the end of the series).
  for (let i = 0; i < bars.length - 10; i++) {
    const suffix = bars.slice(i);
    if (medianGapDays(suffix) <= dailyMedianMax) return suffix;
  }

  return bars;
}

/**
 * Count how many adjacent gaps look weekly-like (>= 6 calendar days).
 * Daily series can have long weekends (~3-4d); >=6d is typically weekly sampling.
 */
export function weeklyGapRatio(bars) {
  if (bars.length < 2) return 0;
  let weekly = 0;
  for (let i = 1; i < bars.length; i++) {
    if (gapDays(bars[i - 1].date, bars[i].date) >= 6) weekly++;
  }
  return weekly / (bars.length - 1);
}

export function assertBarsMatchTimeframe(bars, timeframe, context = "bars") {
  if (timeframe !== "1d" || bars.length < 10) return;
  const median = medianGapDays(bars);
  const weeklyShare = weeklyGapRatio(bars);
  if (median >= 6 || weeklyShare >= 0.35) {
    throw new Error(
      `${context}: expected daily bars for 1d, but median gap is ${median} days` +
        ` and weekly-like gaps are ${(weeklyShare * 100).toFixed(0)}%`,
    );
  }
}
