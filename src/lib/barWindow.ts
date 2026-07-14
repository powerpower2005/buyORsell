import type { OHLCVBar, Timeframe } from "./types";
import timeframesConfig from "../../config/timeframes.json";

function addUtcDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Soft trim: keep bars inside lookback / maxBars so merges do not grow forever.
 * Daily history longer than 1Y is fine — only drop what exceeds the configured window.
 */
export function windowBars(bars: OHLCVBar[], timeframe: Timeframe): OHLCVBar[] {
  if (!bars.length) return bars;

  const cfg = (
    timeframesConfig.timeframes as Record<
      string,
      { sheetsLookbackDays?: number; maxBars?: number }
    >
  )[timeframe];

  let out = bars;

  if (cfg?.sheetsLookbackDays != null) {
    const last = bars.at(-1)!.date;
    const cutoff = addUtcDays(last, -cfg.sheetsLookbackDays);
    out = out.filter((b) => b.date >= cutoff);
  }

  if (cfg?.maxBars != null && out.length > cfg.maxBars) {
    out = out.slice(-cfg.maxBars);
  }

  return out;
}
