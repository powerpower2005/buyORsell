import type { OHLCVBar, TrendLabel } from "../types";

export interface SignalStat {
  samples: number;
  wins: number;
  ratePct: number | null;
}

export type SignalStatsMap = Record<string, SignalStat>;

export interface SignalStatsBundle {
  candlePattern: SignalStatsMap;
  chartPattern: SignalStatsMap;
  patternStrategy: SignalStatsMap;
  bbStrategy: SignalStatsMap;
  rsiStrategy: SignalStatsMap;
  macdStrategy: SignalStatsMap;
  stochStrategy: SignalStatsMap;
  ichimokuStrategy: SignalStatsMap;
  volumeStrategy: SignalStatsMap;
}

export const EMPTY_SIGNAL_STATS: SignalStatsBundle = {
  candlePattern: {},
  chartPattern: {},
  patternStrategy: {},
  bbStrategy: {},
  rsiStrategy: {},
  macdStrategy: {},
  stochStrategy: {},
  ichimokuStrategy: {},
  volumeStrategy: {},
};

const MIN_SAMPLES = 3;
const DEFAULT_HORIZON = 12;
const DEFAULT_MOVE_PCT = 0.015;

export interface ScoreableHit {
  id: string;
  barIndex: number;
  direction: TrendLabel;
  /** Optional pattern targets override default ±move %. */
  targetPrice?: number | null;
  stopPrice?: number | null;
  horizon?: number;
}

/**
 * Resolve whether a directional signal "played out":
 * target touched before stop within horizon; else end-of-horizon close vs entry.
 */
export function resolveFollowThrough(
  bars: OHLCVBar[],
  hit: ScoreableHit,
): "win" | "loss" | null {
  if (hit.direction !== "bullish" && hit.direction !== "bearish") return null;
  const i = hit.barIndex;
  if (i < 0 || i >= bars.length - 1) return null;

  const entry = bars[i]!.close;
  if (!(entry > 0)) return null;

  const horizon = hit.horizon ?? DEFAULT_HORIZON;
  const end = Math.min(i + horizon, bars.length - 1);
  if (end <= i) return null;

  const bull = hit.direction === "bullish";
  const target =
    hit.targetPrice != null && Number.isFinite(hit.targetPrice)
      ? hit.targetPrice
      : entry * (bull ? 1 + DEFAULT_MOVE_PCT : 1 - DEFAULT_MOVE_PCT);
  const stop =
    hit.stopPrice != null && Number.isFinite(hit.stopPrice)
      ? hit.stopPrice
      : entry * (bull ? 1 - DEFAULT_MOVE_PCT : 1 + DEFAULT_MOVE_PCT);

  for (let j = i + 1; j <= end; j++) {
    const bar = bars[j]!;
    if (bull) {
      if (bar.low <= stop) return "loss";
      if (bar.high >= target) return "win";
    } else {
      if (bar.high >= stop) return "loss";
      if (bar.low <= target) return "win";
    }
  }

  const lastClose = bars[end]!.close;
  if (bull) {
    if (lastClose > entry) return "win";
    if (lastClose < entry) return "loss";
    return null;
  }
  if (lastClose < entry) return "win";
  if (lastClose > entry) return "loss";
  return null;
}

export function scoreSignalHits(
  bars: OHLCVBar[],
  hits: ScoreableHit[],
): SignalStatsMap {
  const wins = new Map<string, number>();
  const samples = new Map<string, number>();

  for (const hit of hits) {
    const outcome = resolveFollowThrough(bars, hit);
    if (outcome == null) continue;
    samples.set(hit.id, (samples.get(hit.id) ?? 0) + 1);
    if (outcome === "win") {
      wins.set(hit.id, (wins.get(hit.id) ?? 0) + 1);
    }
  }

  const out: SignalStatsMap = {};
  for (const [id, n] of samples) {
    const w = wins.get(id) ?? 0;
    out[id] = {
      samples: n,
      wins: w,
      ratePct: n >= MIN_SAMPLES ? Math.round((w / n) * 100) : null,
    };
  }
  return out;
}

export function formatSignalRate(stat: SignalStat | undefined): string | null {
  if (!stat || stat.ratePct == null) return null;
  return `${stat.ratePct}%`;
}

export function signalRateTitle(stat: SignalStat | undefined): string | undefined {
  if (!stat || stat.samples <= 0) return undefined;
  if (stat.ratePct == null) {
    return `표본 ${stat.samples}건 (표시는 ${MIN_SAMPLES}건 이상)`;
  }
  return `이 종목 최근 구간 · ${stat.samples}건 중 ${stat.wins}건이 목표·방향대로 진행`;
}
