import type { CandlePatternId, CandlePatternResult } from "@/lib/evaluation/candlePatterns";
import type { ChartPatternResult } from "@/lib/evaluation/chartPatterns";
import {
  patternAccentColor,
} from "@/lib/candlePatternMeta";
import {
  CHART_PATTERN_META,
  type ChartPatternId,
} from "@/lib/chartPatternMeta";
import type { TrendLabel } from "@/lib/types";

export interface PatternBarHighlight {
  color: string;
  borderColor: string;
  wickColor: string;
}

function accentForDirection(direction: TrendLabel): PatternBarHighlight {
  const accent = patternAccentColor(direction);
  return { color: accent, borderColor: accent, wickColor: accent };
}

/**
 * Per-date candle colors for bars that have a visible pattern hit.
 * Later hits overwrite earlier ones on the same date.
 */
export function patternBarHighlights(
  candlePatterns: CandlePatternResult | undefined,
  candleVisibility: Record<CandlePatternId, boolean> | undefined,
  classicalPatterns: ChartPatternResult | undefined,
  classicalVisibility: Record<ChartPatternId, boolean> | undefined,
): Map<string, PatternBarHighlight> {
  const out = new Map<string, PatternBarHighlight>();

  if (classicalPatterns?.recent.length && classicalVisibility) {
    for (const hit of classicalPatterns.recent) {
      if (!classicalVisibility[hit.id]) continue;
      const accent = CHART_PATTERN_META[hit.id].color;
      out.set(hit.date, {
        color: accent,
        borderColor: accent,
        wickColor: accent,
      });
    }
  }

  if (candlePatterns?.recent.length && candleVisibility) {
    for (const hit of candlePatterns.recent) {
      if (!candleVisibility[hit.id]) continue;
      out.set(hit.date, accentForDirection(hit.direction));
    }
  }

  return out;
}
