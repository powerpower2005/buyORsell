import type { OHLCVBar, Timeframe } from "./types";

function utcDay(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00.000Z`);
}

export function gapDays(a: string, b: string): number {
  return Math.round((utcDay(b) - utcDay(a)) / 86_400_000);
}

export function medianGapDays(bars: OHLCVBar[]): number {
  if (bars.length < 2) return 0;
  const gaps: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    gaps.push(gapDays(bars[i - 1].date, bars[i].date));
  }
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)]!;
}

/**
 * For 1d: drop a leading weekly-spaced stretch so only daily-cadence bars remain.
 */
export function dropLeadingWrongCadence(
  bars: OHLCVBar[],
  timeframe: Timeframe,
): OHLCVBar[] {
  if (timeframe !== "1d" || bars.length < 10) return bars;

  const dailyMedianMax = 3;
  if (medianGapDays(bars) <= dailyMedianMax) return bars;

  for (let i = 0; i < bars.length - 10; i++) {
    const suffix = bars.slice(i);
    if (medianGapDays(suffix) <= dailyMedianMax) return suffix;
  }

  return bars;
}

export function weeklyGapRatio(bars: OHLCVBar[]): number {
  if (bars.length < 2) return 0;
  let weekly = 0;
  for (let i = 1; i < bars.length; i++) {
    if (gapDays(bars[i - 1].date, bars[i].date) >= 6) weekly++;
  }
  return weekly / (bars.length - 1);
}

/**
 * Reject bars that are clearly weekly-sampled when timeframe is 1d.
 */
export function assertBarsMatchTimeframe(
  bars: OHLCVBar[],
  timeframe: Timeframe,
  context = "bars",
): void {
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
