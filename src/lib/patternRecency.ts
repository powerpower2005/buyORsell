import type { QuoteEvaluation } from "./evaluation/evaluateQuote";
import type { CandlePatternId } from "./evaluation/candlePatterns";
import type { ChartPatternId } from "./chartPatternMeta";
import type { TrendLabel } from "./types";
import type { StrategyRecency } from "./strategyRecency";

export type PatternRecency = StrategyRecency;

/** Latest candle-pattern hit per pattern id. */
export function buildCandlePatternRecencyMap(
  evaluation: QuoteEvaluation | null | undefined,
): Map<CandlePatternId, PatternRecency> {
  const map = new Map<CandlePatternId, PatternRecency>();
  const bag = evaluation?.patterns;
  if (!evaluation?.bars.length || !bag?.recent.length) return map;
  const lastIdx = evaluation.bars.length - 1;
  for (const h of bag.recent) {
    const prev = map.get(h.id);
    if (!prev || h.barIndex > prev.barIndex) {
      map.set(h.id, {
        date: h.date,
        barIndex: h.barIndex,
        barsAgo: lastIdx - h.barIndex,
        direction: h.direction as TrendLabel,
        close: evaluation.bars[h.barIndex]?.close ?? null,
      });
    }
  }
  return map;
}

/** Latest classical chart-pattern hit per pattern id. */
export function buildChartPatternRecencyMap(
  evaluation: QuoteEvaluation | null | undefined,
): Map<ChartPatternId, PatternRecency> {
  const map = new Map<ChartPatternId, PatternRecency>();
  const bag = evaluation?.classicalPatterns;
  if (!evaluation?.bars.length || !bag?.recent.length) return map;
  const lastIdx = evaluation.bars.length - 1;
  for (const h of bag.recent) {
    const prev = map.get(h.id);
    if (!prev || h.barIndex > prev.barIndex) {
      map.set(h.id, {
        date: h.date,
        barIndex: h.barIndex,
        barsAgo: lastIdx - h.barIndex,
        direction: h.direction as TrendLabel,
        close: evaluation.bars[h.barIndex]?.close ?? null,
      });
    }
  }
  return map;
}
