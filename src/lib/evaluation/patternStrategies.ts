import type { OHLCVBar, TrendLabel } from "../types";
import type { ChartPatternResult } from "./chartPatterns";
import {
  PATTERN_STRATEGY_META,
  type PatternStrategyId,
} from "../patternStrategyMeta";
import {
  scoreSignalHits,
  type SignalStatsMap,
} from "./signalFollowThrough";

export type { PatternStrategyId };

export interface PatternStrategyHit {
  id: PatternStrategyId;
  label: string;
  date: string;
  barIndex: number;
  direction: TrendLabel;
  summary: string;
  patternId: string;
  instanceKey: string;
}

export interface PatternStrategyResult {
  lookbackBars: number;
  latestBarDate: string;
  onLatestBar: PatternStrategyHit[];
  recent: PatternStrategyHit[];
  /** Uncapped hits (backtest / confluence). */
  signals: PatternStrategyHit[];
  stats: SignalStatsMap;
}

const MAX_HITS = 40;
const RETEST_WINDOW = 12;
const VOL_LOOKBACK = 20;
const VOL_MULT = 1.35;
const RETEST_ATR_FRAC = 0.35;

function avgVolume(bars: OHLCVBar[], endIdx: number, n: number): number {
  const from = Math.max(0, endIdx - n);
  let sum = 0;
  let count = 0;
  for (let i = from; i < endIdx; i++) {
    sum += bars[i].volume ?? 0;
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}

function breakLevel(inst: {
  direction: TrendLabel;
  pivots: { role: string; price: number }[];
  stopPrice: number | null;
  targetPrice: number | null;
}): number | null {
  const neck = inst.pivots.find(
    (p) =>
      p.role === "neck" ||
      p.role === "neck1" ||
      p.role === "neck2" ||
      p.role.includes("neck"),
  );
  if (neck) return neck.price;
  const rim = inst.pivots.find(
    (p) => p.role === "rimR" || p.role === "rimL" || p.role === "resistance",
  );
  if (rim) return rim.price;
  if (inst.targetPrice != null && inst.stopPrice != null) {
    return (inst.targetPrice + inst.stopPrice) / 2;
  }
  return null;
}

function makeHit(
  id: PatternStrategyId,
  barIndex: number,
  bars: OHLCVBar[],
  direction: TrendLabel,
  summary: string,
  patternId: string,
  instanceKey: string,
): PatternStrategyHit {
  return {
    id,
    label: PATTERN_STRATEGY_META[id].labelKo,
    date: bars[barIndex].date,
    barIndex,
    direction,
    summary,
    patternId,
    instanceKey,
  };
}

/**
 * Build trading-strategy hits from confirmed classical pattern instances.
 */
export function detectPatternStrategies(
  bars: OHLCVBar[],
  patterns: ChartPatternResult | null | undefined,
): PatternStrategyResult | null {
  if (!bars.length || !patterns?.instances.length) return null;

  const hits: PatternStrategyHit[] = [];
  const confirmed = patterns.instances.filter(
    (inst) => inst.status === "confirmed" && inst.entryBar != null,
  );

  for (const inst of confirmed) {
    const entry = inst.entryBar!;
    if (entry < 0 || entry >= bars.length) continue;
    const dir = inst.direction;
    if (dir !== "bullish" && dir !== "bearish") continue;

    hits.push(
      makeHit(
        "breakout_entry",
        entry,
        bars,
        dir,
        `${inst.summary} · 돌파 진입`,
        inst.id,
        inst.key,
      ),
    );

    const avgVol = avgVolume(bars, entry, VOL_LOOKBACK);
    const entryVol = bars[entry].volume ?? 0;
    if (avgVol > 0 && entryVol >= avgVol * VOL_MULT) {
      hits.push(
        makeHit(
          "volume_breakout",
          entry,
          bars,
          dir,
          `거래량 ${(entryVol / avgVol).toFixed(1)}× 평균 · ${inst.id}`,
          inst.id,
          inst.key,
        ),
      );
    }

    const level = breakLevel(inst);
    if (level == null) continue;
    const band =
      Math.abs(level) * 0.004 +
      Math.abs((inst.targetPrice ?? level) - level) * 0.02;
    const tol = Math.max(band, Math.abs(level) * 0.002) * RETEST_ATR_FRAC * 10;

    const scanTo = Math.min(bars.length - 1, entry + RETEST_WINDOW);
    for (let i = entry + 1; i <= scanTo; i++) {
      const bar = bars[i];
      const touched =
        dir === "bullish"
          ? bar.low <= level + tol && bar.close >= level - tol
          : bar.high >= level - tol && bar.close <= level + tol;
      if (!touched) continue;

      const confirm =
        dir === "bullish"
          ? bar.close > bar.open && bar.close >= level
          : bar.close < bar.open && bar.close <= level;
      if (!confirm) continue;

      hits.push(
        makeHit(
          "retest_entry",
          i,
          bars,
          dir,
          `리테스트 확인 · ${inst.id} · 레벨 ${level.toFixed(2)}`,
          inst.id,
          inst.key,
        ),
      );
      break;
    }
  }

  hits.sort((a, b) => a.barIndex - b.barIndex);
  const stats = scoreSignalHits(bars, hits);
  const recent = hits.slice(-MAX_HITS);
  const lastIdx = bars.length - 1;

  return {
    lookbackBars: patterns.lookbackBars,
    latestBarDate: bars[lastIdx]?.date ?? "",
    onLatestBar: recent.filter((h) => h.barIndex === lastIdx),
    recent,
    signals: hits,
    stats,
  };
}
