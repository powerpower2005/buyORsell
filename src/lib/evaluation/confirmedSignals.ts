import type { OHLCVBar, Timeframe, TrendLabel } from "../types";
import { versionFor } from "../versions";

export interface SignalTiming {
  /** Geometry/event origin, which can precede detection. */
  originBarIndex?: number;
  confirmedBarIndex?: number;
  confirmedDate?: string;
  version?: string;
}

export interface ReplayHit extends SignalTiming {
  id: string;
  barIndex: number;
  date: string;
  direction: TrendLabel;
  instanceKey?: string;
  entryPrice?: number;
  rewardRisk?: number | null;
  stopPrice?: number | null;
  targetPrice?: number | null;
}

/** Historical bars are accepted only after their calendar period has ended.
 * For legacy files this is deliberately conservative on same-day/session closes.
 */
export function closedBars(
  bars: OHLCVBar[],
  tf: Timeframe,
  asOf: string,
): OHLCVBar[] {
  const cutoff = Date.parse(asOf);
  if (!Number.isFinite(cutoff)) throw new Error("Invalid evaluation asOf");
  return bars.filter((bar) => {
    if (bar.isComplete === false) return false;
    const end = new Date(`${bar.date}T00:00:00Z`);
    if (tf === "1mo") end.setUTCMonth(end.getUTCMonth() + 1, 1);
    else if (tf === "1w") {
      const day = end.getUTCDay();
      end.setUTCDate(end.getUTCDate() + (day === 0 ? 1 : 8 - day));
    } else end.setUTCDate(end.getUTCDate() + 1);
    return end.getTime() <= cutoff;
  });
}

/** Freeze each event at its FIRST observable prefix. Later geometry cannot
 * move an entry backwards, revise its prices, or remove it from statistics.
 */
export function recordConfirmedHits<T extends ReplayHit>(
  hits: T[],
  prefix: OHLCVBar[],
  namespace: string,
  seen: Set<string>,
  out: T[],
): void {
  const index = prefix.length - 1;
  for (const hit of hits) {
    const key = `${hit.id}|${hit.instanceKey ?? ""}|${hit.barIndex}|${hit.direction}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const close = prefix[index].close;
    const sign = hit.direction === "bullish" ? 1 : -1;
    const risk = hit.stopPrice == null ? 0 : sign * (close - hit.stopPrice);
    const reward =
      hit.targetPrice == null ? 0 : sign * (hit.targetPrice - close);
    out.push({
      ...hit,
      ...(hit.entryPrice != null
        ? {
            entryPrice: close,
            rewardRisk: risk > 0 && reward > 0 ? reward / risk : null,
          }
        : {}),
      originBarIndex: hit.barIndex,
      barIndex: index,
      date: prefix[index].date,
      confirmedBarIndex: index,
      confirmedDate: prefix[index].date,
      version: versionFor(namespace, hit.id),
    });
  }
}
