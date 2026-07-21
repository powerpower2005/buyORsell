import type { TrendLabel } from "../types";
import type { QuoteEvaluation } from "./evaluateQuote";

export interface StrategyHitRef {
  family: string;
  id: string;
  label: string;
  barIndex: number;
  date: string;
  direction: TrendLabel;
}

export interface StrategyConfluence {
  barIndex: number;
  date: string;
  direction: TrendLabel;
  hits: StrategyHitRef[];
}

function pushHits(
  out: StrategyHitRef[],
  family: string,
  bag:
    | {
        signals?: Array<{
          id: string;
          label: string;
          barIndex: number;
          date: string;
          direction: TrendLabel;
        }>;
        recent?: Array<{
          id: string;
          label: string;
          barIndex: number;
          date: string;
          direction: TrendLabel;
        }>;
      }
    | undefined
    | null,
): void {
  const list = bag?.signals ?? bag?.recent;
  if (!list?.length) return;
  for (const h of list) {
    if (h.direction !== "bullish" && h.direction !== "bearish") continue;
    out.push({
      family,
      id: h.id,
      label: h.label,
      barIndex: h.barIndex,
      date: h.date,
      direction: h.direction,
    });
  }
}

/** Flatten playbook hits (prefer uncapped signals). */
export function collectStrategyHits(ev: QuoteEvaluation): StrategyHitRef[] {
  const out: StrategyHitRef[] = [];
  pushHits(out, "bb", ev.bbStrategies);
  pushHits(out, "ichimoku", ev.ichimokuStrategies);
  pushHits(out, "volume", ev.volumeStrategies);
  pushHits(out, "rsi", ev.rsiStrategies);
  pushHits(out, "macd", ev.macdStrategies);
  pushHits(out, "stoch", ev.stochStrategies);
  pushHits(out, "pattern", ev.patternStrategies);
  return out;
}

/**
 * Same bar + same direction with hits from ≥ minStrategies distinct strategy ids.
 */
export function findStrategyConfluences(
  hits: StrategyHitRef[],
  minStrategies = 2,
): StrategyConfluence[] {
  const byKey = new Map<string, StrategyHitRef[]>();
  for (const h of hits) {
    const key = `${h.barIndex}|${h.direction}`;
    const list = byKey.get(key) ?? [];
    list.push(h);
    byKey.set(key, list);
  }

  const out: StrategyConfluence[] = [];
  for (const group of byKey.values()) {
    const unique = new Map<string, StrategyHitRef>();
    for (const h of group) {
      unique.set(`${h.family}:${h.id}`, h);
    }
    if (unique.size < minStrategies) continue;
    const hitsUnique = [...unique.values()];
    out.push({
      barIndex: hitsUnique[0].barIndex,
      date: hitsUnique[0].date,
      direction: hitsUnique[0].direction,
      hits: hitsUnique,
    });
  }
  return out.sort((a, b) => a.barIndex - b.barIndex);
}

export function confluencesFromEvaluation(
  ev: QuoteEvaluation,
  minStrategies = 2,
): StrategyConfluence[] {
  return findStrategyConfluences(collectStrategyHits(ev), minStrategies);
}
