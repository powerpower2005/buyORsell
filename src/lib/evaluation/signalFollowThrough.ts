import { simulateTrade } from "./execution";
import type { SignalTiming } from "./confirmedSignals";
import type { OHLCVBar, TrendLabel } from "../types";

export interface SignalStat {
  samples: number;
  wins: number;
  ratePct: number | null;
  pending?: number;
  losses?: number;
  breakeven?: number;
  byDirection?: Partial<Record<TrendLabel, { samples: number; wins: number }>>;
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
  comboStrategy: SignalStatsMap;
  classicStrategy: SignalStatsMap;
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
  comboStrategy: {},
  classicStrategy: {},
};

const MIN_SAMPLES = 3;

export interface ScoreableHit extends SignalTiming {
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
  const outcome = simulateTrade(bars, hit, { horizon: hit.horizon ?? 12 });
  if (outcome.status !== "closed" || Math.abs(outcome.trade.returnPct) < 1e-10)
    return null;
  return outcome.trade.returnPct > 0 ? "win" : "loss";
}

export function scoreSignalHits(
  bars: OHLCVBar[],
  hits: ScoreableHit[],
): SignalStatsMap {
  const out: SignalStatsMap = {};
  const seen = new Set<string>();
  for (const hit of hits) {
    if (hit.id === "fake_breakout" || hit.direction === "neutral") continue;
    const key = `${hit.id}|${hit.confirmedBarIndex ?? hit.barIndex}|${hit.direction}|${hit.stopPrice}|${hit.targetPrice}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const outcome = simulateTrade(bars, hit, { horizon: hit.horizon ?? 12 });
    if (outcome.status === "invalid") continue;
    const stat = (out[hit.id] ??= {
      samples: 0,
      wins: 0,
      ratePct: null,
      pending: 0,
      losses: 0,
      breakeven: 0,
      byDirection: {},
    });
    if (outcome.status === "pending") {
      stat.pending!++;
      continue;
    }
    const ret = outcome.trade.returnPct;
    stat.samples++;
    const side = (stat.byDirection![hit.direction] ??= { samples: 0, wins: 0 });
    side.samples++;
    if (ret > 1e-10) {
      stat.wins++;
      side.wins++;
    } else if (ret < -1e-10) stat.losses!++;
    else stat.breakeven!++;
    stat.ratePct =
      stat.samples >= MIN_SAMPLES
        ? Math.round((stat.wins / stat.samples) * 100)
        : null;
  }
  return out;
}

export function formatSignalRate(stat: SignalStat | undefined): string | null {
  if (!stat || stat.ratePct == null) return null;
  return `${stat.ratePct}%`;
}

export function signalRateTitle(
  stat: SignalStat | undefined,
): string | undefined {
  if (!stat) return undefined;
  if (stat.ratePct == null) {
    return `완료 표본 ${stat.samples}건 · 대기 ${stat.pending ?? 0}건 (표시는 ${MIN_SAMPLES}건 이상)`;
  }
  return `확정 후 다음 시가 · 비용 0 가정 · 완료 ${stat.samples}건 / 수익 ${stat.wins}건 / 대기 ${stat.pending ?? 0}건 · 롱 ${stat.byDirection?.bullish?.wins ?? 0}/${stat.byDirection?.bullish?.samples ?? 0} · 숏 ${stat.byDirection?.bearish?.wins ?? 0}/${stat.byDirection?.bearish?.samples ?? 0}`;
}
