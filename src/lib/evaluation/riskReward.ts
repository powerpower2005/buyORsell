import type { OHLCVBar, TrendLabel } from "../types";
import { atrAt, computeAtrSeries } from "./pivots";
import type { PatternStrategyHit } from "./patternStrategies";

/** v1 risk/reward plan attached to a directional signal. */
export interface RiskRewardPlan {
  key: string;
  family: string;
  strategyId: string;
  label: string;
  date: string;
  barIndex: number;
  direction: Exclude<TrendLabel, "neutral">;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  /** Reward ÷ risk (e.g. 2 → display "1:2.0"). */
  rewardRisk: number | null;
  /** pattern = measured move; atr_2r = ATR stop + fixed 2R target. */
  method: "pattern" | "atr_2r";
}

/** Default indicator v1: stop = 1.5×ATR, target = 2× risk. */
export const RR_V1_ATR_MULT = 1.5;
export const RR_V1_REWARD_MULT = 2;
export const RR_V1_HORIZON_BARS = 24;
export const RR_V1_MAX_PLANS = 4;

export function rewardRiskRatio(
  entry: number,
  stop: number,
  target: number,
  direction: Exclude<TrendLabel, "neutral">,
): number | null {
  if (!(entry > 0) || !Number.isFinite(stop) || !Number.isFinite(target)) {
    return null;
  }
  const risk =
    direction === "bullish" ? entry - stop : stop - entry;
  const reward =
    direction === "bullish" ? target - entry : entry - target;
  if (!(risk > 0) || !(reward > 0)) return null;
  return reward / risk;
}

export function formatRewardRisk(rr: number | null | undefined): string {
  if (rr == null || !Number.isFinite(rr) || rr <= 0) return "—";
  return `1:${rr.toFixed(1)}`;
}

export function levelsFromPattern(
  entry: number,
  direction: Exclude<TrendLabel, "neutral">,
  stopPrice: number | null | undefined,
  targetPrice: number | null | undefined,
): Omit<RiskRewardPlan, "key" | "family" | "strategyId" | "label" | "date" | "barIndex"> | null {
  if (
    stopPrice == null ||
    targetPrice == null ||
    !Number.isFinite(stopPrice) ||
    !Number.isFinite(targetPrice)
  ) {
    return null;
  }
  const rewardRisk = rewardRiskRatio(entry, stopPrice, targetPrice, direction);
  if (rewardRisk == null) return null;
  return {
    direction,
    entryPrice: entry,
    stopPrice,
    targetPrice,
    rewardRisk,
    method: "pattern",
  };
}

/** Indicator v1: ATR stop + fixed reward multiple of risk. */
export function levelsFromAtr2r(
  bars: OHLCVBar[],
  barIndex: number,
  direction: Exclude<TrendLabel, "neutral">,
  atrSeries?: Array<number | null>,
  atrMult = RR_V1_ATR_MULT,
  rewardMult = RR_V1_REWARD_MULT,
): Omit<RiskRewardPlan, "key" | "family" | "strategyId" | "label" | "date" | "barIndex"> | null {
  if (barIndex < 0 || barIndex >= bars.length) return null;
  const entry = bars[barIndex]!.close;
  if (!(entry > 0)) return null;

  const atr =
    atrSeries != null
      ? atrAt(atrSeries, barIndex, entry * 0.01)
      : atrAt(computeAtrSeries(bars, 14), barIndex, entry * 0.01);
  const risk = atr * atrMult;
  if (!(risk > 0)) return null;

  if (direction === "bullish") {
    const stop = entry - risk;
    const target = entry + risk * rewardMult;
    return {
      direction,
      entryPrice: entry,
      stopPrice: stop,
      targetPrice: target,
      rewardRisk: rewardMult,
      method: "atr_2r",
    };
  }
  const stop = entry + risk;
  const target = entry - risk * rewardMult;
  return {
    direction,
    entryPrice: entry,
    stopPrice: stop,
    targetPrice: target,
    rewardRisk: rewardMult,
    method: "atr_2r",
  };
}

export function planFromPatternHit(
  bars: OHLCVBar[],
  hit: PatternStrategyHit,
): RiskRewardPlan | null {
  if (hit.direction !== "bullish" && hit.direction !== "bearish") return null;
  // Fake-breakout is a warning, not an entry plan.
  if (hit.id === "fake_breakout") return null;
  const entry = bars[hit.barIndex]?.close;
  if (entry == null) return null;

  const levels =
    hit.stopPrice != null && hit.targetPrice != null
      ? levelsFromPattern(entry, hit.direction, hit.stopPrice, hit.targetPrice)
      : null;
  if (!levels) return null;

  return {
    key: `pattern:${hit.id}:${hit.instanceKey}:${hit.barIndex}`,
    family: "pattern",
    strategyId: hit.id,
    label: hit.label,
    date: hit.date,
    barIndex: hit.barIndex,
    ...levels,
  };
}

export function planFromGenericHit(
  bars: OHLCVBar[],
  hit: {
    id: string;
    label: string;
    date: string;
    barIndex: number;
    direction: TrendLabel;
  },
  family: string,
  atrSeries?: Array<number | null>,
): RiskRewardPlan | null {
  if (hit.direction !== "bullish" && hit.direction !== "bearish") return null;
  const levels = levelsFromAtr2r(bars, hit.barIndex, hit.direction, atrSeries);
  if (!levels) return null;
  return {
    key: `${family}:${hit.id}:${hit.barIndex}`,
    family,
    strategyId: hit.id,
    label: hit.label,
    date: hit.date,
    barIndex: hit.barIndex,
    ...levels,
  };
}

/** Prefer newer hits; cap how many RR boxes we draw. */
export function pickRiskRewardPlans(
  plans: RiskRewardPlan[],
  max = RR_V1_MAX_PLANS,
): RiskRewardPlan[] {
  return [...plans]
    .sort((a, b) => b.barIndex - a.barIndex || a.key.localeCompare(b.key))
    .slice(0, max)
    .sort((a, b) => a.barIndex - b.barIndex);
}

export function methodLabelKo(method: RiskRewardPlan["method"]): string {
  return method === "pattern" ? "패턴 측정" : "ATR×1.5 · 2R";
}
