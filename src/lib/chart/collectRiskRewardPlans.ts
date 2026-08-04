import type { OHLCVBar } from "../types";
import { computeAtrSeries } from "../evaluation/pivots";
import {
  pickRiskRewardPlans,
  planFromGenericHit,
  planFromPatternHit,
  type RiskRewardPlan,
} from "../evaluation/riskReward";
import type { PatternStrategyResult } from "../evaluation/patternStrategies";
import type { PatternStrategyId } from "../patternStrategyMeta";

type HitBag = {
  recent?: Array<{
    id: string;
    label: string;
    date: string;
    barIndex: number;
    direction: import("../types").TrendLabel;
  }>;
} | null | undefined;

/**
 * Build RR v1 plans for visible strategy hits.
 * Pattern → measured move; other families → ATR×1.5 stop + 2R target.
 */
export function collectVisibleRiskRewardPlans(args: {
  bars: OHLCVBar[];
  patternStrategies?: PatternStrategyResult | null;
  patternVisibility?: Partial<Record<PatternStrategyId, boolean>>;
  bags?: Array<{
    family: string;
    bag: HitBag;
    visibility?: Record<string, boolean> | null;
  }>;
  /** When set, only hits with barIndex >= minBarIndex are included. */
  minBarIndex?: number | null;
}): RiskRewardPlan[] {
  const {
    bars,
    patternStrategies,
    patternVisibility,
    bags = [],
    minBarIndex = null,
  } = args;
  if (!bars.length) return [];

  const atr = computeAtrSeries(bars, 14);
  const plans: RiskRewardPlan[] = [];
  const inWindow = (barIndex: number) =>
    minBarIndex == null || barIndex >= minBarIndex;

  if (patternStrategies?.recent.length && patternVisibility) {
    for (const hit of patternStrategies.recent) {
      if (!patternVisibility[hit.id] || !inWindow(hit.barIndex)) continue;
      const plan = planFromPatternHit(bars, hit);
      if (plan) plans.push(plan);
    }
  }

  for (const { family, bag, visibility } of bags) {
    if (!bag?.recent?.length || !visibility) continue;
    for (const hit of bag.recent) {
      if (!visibility[hit.id] || !inWindow(hit.barIndex)) continue;
      const plan = planFromGenericHit(bars, hit, family, atr);
      if (plan) plans.push(plan);
    }
  }

  return pickRiskRewardPlans(plans);
}
