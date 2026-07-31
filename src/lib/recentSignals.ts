import type { TrendLabel } from "./types";
import type { QuoteEvaluation } from "./evaluation/evaluateQuote";
import { collectStrategyHits } from "./evaluation/strategyConfluence";

export const RECENT_SIGNAL_WINDOW_BARS = 5;

export interface RecentStrategyHit {
  family: string;
  id: string;
  label: string;
  date: string;
  barsAgo: number;
  direction: Exclude<TrendLabel, "neutral">;
}

/** Latest hit per strategy that falls inside the last `windowBars` bars. */
export function recentHitsFromEvaluation(
  evaluation: QuoteEvaluation,
  windowBars = RECENT_SIGNAL_WINDOW_BARS,
): RecentStrategyHit[] {
  if (!evaluation.bars.length || windowBars <= 0) return [];
  const lastIdx = evaluation.bars.length - 1;
  const best = new Map<string, RecentStrategyHit>();

  for (const h of collectStrategyHits(evaluation)) {
    if (h.direction !== "bullish" && h.direction !== "bearish") continue;
    const barsAgo = lastIdx - h.barIndex;
    if (barsAgo < 0 || barsAgo >= windowBars) continue;
    const key = `${h.family}:${h.id}`;
    const prev = best.get(key);
    if (!prev || h.barIndex > prev.barIndex) {
      best.set(key, {
        family: h.family,
        id: h.id,
        label: h.label,
        date: h.date,
        barsAgo,
        direction: h.direction,
      });
    }
  }

  return [...best.values()].sort(
    (a, b) =>
      a.barsAgo - b.barsAgo ||
      a.direction.localeCompare(b.direction) ||
      a.label.localeCompare(b.label),
  );
}
