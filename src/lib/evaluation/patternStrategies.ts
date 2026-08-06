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
import { levelsFromPattern } from "./riskReward";

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
  /** Signal close (entry reference for RR v1). */
  entryPrice?: number;
  stopPrice?: number | null;
  targetPrice?: number | null;
  /** Reward ÷ risk (e.g. 2 → 1:2). */
  rewardRisk?: number | null;
  rrMethod?: "pattern" | "atr_2r";
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
const FAKE_WINDOW = 15;
const VOL_LOOKBACK = 20;
const VOL_MULT = 1.35;
const RETEST_ATR_FRAC = 0.35;
/** Trap curriculum: panic move often larger than normal measured move. */
const TRAP_TARGET_MULT = 1.35;

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
  stopPrice: number | null,
  targetPrice: number | null,
): PatternStrategyHit {
  const entryPrice = bars[barIndex]!.close;
  const base: PatternStrategyHit = {
    id,
    label: PATTERN_STRATEGY_META[id].labelKo,
    date: bars[barIndex]!.date,
    barIndex,
    direction,
    summary,
    patternId,
    instanceKey,
    entryPrice,
    stopPrice,
    targetPrice,
    rewardRisk: null,
    rrMethod: "pattern",
  };
  if (id === "fake_breakout") return base;
  if (direction !== "bullish" && direction !== "bearish") return base;
  const levels = levelsFromPattern(
    entryPrice,
    direction,
    stopPrice,
    targetPrice,
  );
  if (!levels) return base;
  return {
    ...base,
    stopPrice: levels.stopPrice,
    targetPrice: levels.targetPrice,
    rewardRisk: levels.rewardRisk,
    rrMethod: levels.method,
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
    const stop = inst.stopPrice;
    const target = inst.targetPrice;

    hits.push(
      makeHit(
        "breakout_entry",
        entry,
        bars,
        dir,
        `${inst.summary} · 돌파 진입`,
        inst.id,
        inst.key,
        stop,
        target,
      ),
    );

    const level = breakLevel(inst);
    const band =
      level != null
        ? Math.abs(level) * 0.004 +
          Math.abs((inst.targetPrice ?? level) - level) * 0.02
        : 0;
    const tol =
      level != null
        ? Math.max(band, Math.abs(level) * 0.002) * RETEST_ATR_FRAC * 10
        : 0;

    // Next-bar confirmation (curriculum: do not enter on the breakout candle).
    const confirmIdx = entry + 1;
    if (level != null && confirmIdx < bars.length) {
      const cbar = bars[confirmIdx]!;
      const confirmedNext =
        dir === "bullish"
          ? cbar.close > cbar.open &&
            cbar.close >= level - tol &&
            cbar.low >= level - tol * 2
          : cbar.close < cbar.open &&
            cbar.close <= level + tol &&
            cbar.high <= level + tol * 2;
      if (confirmedNext) {
        // Triple-bottom curriculum: stop at prior (breakout) candle low when confirming.
        const confirmStop =
          inst.id === "triple_bottom" && entry > 0
            ? bars[entry]!.low
            : stop;
        hits.push(
          makeHit(
            "breakout_confirm_entry",
            confirmIdx,
            bars,
            dir,
            `돌파 다음 봉 확인 · ${inst.id} · 레벨 ${level.toFixed(2)}`,
            inst.id,
            inst.key,
            confirmStop,
            target,
          ),
        );
      }
    }

    const avgVol = avgVolume(bars, entry, VOL_LOOKBACK);
    const entryVol = bars[entry].volume ?? 0;
    const volumeOk = avgVol > 0 && entryVol >= avgVol * VOL_MULT;
    if (volumeOk) {
      hits.push(
        makeHit(
          "volume_breakout",
          entry,
          bars,
          dir,
          `거래량 ${(entryVol / avgVol).toFixed(1)}× 평균 · ${inst.id}`,
          inst.id,
          inst.key,
          stop,
          target,
        ),
      );
    }

    if (level == null) continue;

    const retestTo = Math.min(bars.length - 1, entry + RETEST_WINDOW);
    let retestBar: number | null = null;
    for (let i = entry + 1; i <= retestTo; i++) {
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

      retestBar = i;
      hits.push(
        makeHit(
          "retest_entry",
          i,
          bars,
          dir,
          `리테스트 확인 · ${inst.id} · 레벨 ${level.toFixed(2)}`,
          inst.id,
          inst.key,
          stop,
          target,
        ),
      );
      break;
    }

    if (volumeOk && retestBar != null) {
      hits.push(
        makeHit(
          "triple_confirm",
          retestBar,
          bars,
          dir,
          `삼중 확인(종가·거래량·리테스트) · ${inst.id} · 레벨 ${level.toFixed(2)}`,
          inst.id,
          inst.key,
          stop,
          target,
        ),
      );
    }

    const fakeTo = Math.min(bars.length - 1, entry + FAKE_WINDOW);
    for (let i = entry + 1; i <= fakeTo; i++) {
      const bar = bars[i]!;
      const close = bar.close;

      // (1) Close re-penetration → false breakout/breakdown (thesis fail).
      const closeFailed =
        dir === "bullish" ? close < level - tol : close > level + tol;
      if (closeFailed) {
        const failDir: TrendLabel = dir === "bullish" ? "bearish" : "bullish";
        hits.push(
          makeHit(
            "fake_breakout",
            i,
            bars,
            failDir,
            `가짜 돌파(종가 재관통) · ${inst.id} · 레벨 ${level.toFixed(2)}`,
            inst.id,
            inst.key,
            stop,
            target,
          ),
        );
        // Trap entry: opposite side with oversized measured-move target + buffer.
        const height =
          target != null
            ? Math.abs(target - level)
            : Math.max(Math.abs(level) * 0.015, tol * 4);
        const buf = Math.max(Math.abs(level) * 0.003, tol);
        const trapStop =
          failDir === "bearish"
            ? Math.max(bar.high, level) + buf
            : Math.min(bar.low, level) - buf;
        const trapTarget =
          failDir === "bearish"
            ? close - height * TRAP_TARGET_MULT
            : close + height * TRAP_TARGET_MULT;
        hits.push(
          makeHit(
            "trap_entry",
            i,
            bars,
            failDir,
            `트랩 진입(돌파 실패 공황) · ${inst.id} · 목표×${TRAP_TARGET_MULT}`,
            inst.id,
            inst.key,
            trapStop,
            trapTarget,
          ),
        );
        break;
      }

      // (2) Wick pierce + close reclaim → stop-hunt / false breakdown then recover.
      const wickHunt =
        dir === "bullish"
          ? bar.low < level - tol && close >= level
          : bar.high > level + tol && close <= level;
      if (wickHunt) {
        hits.push(
          makeHit(
            "fake_breakout",
            i,
            bars,
            dir,
            `윅 가짜 이탈 후 회복(스탑 헌팅) · ${inst.id} · 레벨 ${level.toFixed(2)}`,
            inst.id,
            inst.key,
            stop,
            target,
          ),
        );
        break;
      }
    }
  }

  hits.sort((a, b) => a.barIndex - b.barIndex);
  const stats = scoreSignalHits(
    bars,
    hits.map((h) => ({
      id: h.id,
      barIndex: h.barIndex,
      direction: h.direction,
      stopPrice: h.stopPrice,
      targetPrice: h.targetPrice,
    })),
  );
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
