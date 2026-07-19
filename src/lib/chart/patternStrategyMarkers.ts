import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  PatternStrategyHit,
  PatternStrategyResult,
} from "@/lib/evaluation/patternStrategies";
import {
  PATTERN_STRATEGY_META,
  PATTERN_STRATEGY_ORDER,
  type PatternStrategyId,
} from "@/lib/patternStrategyMeta";
import { PATTERN_MARKER_SIZE, patternAccentColor } from "@/lib/candlePatternMeta";

function hitToMarker(hit: PatternStrategyHit): SeriesMarker<Time> {
  const position =
    hit.direction === "bullish"
      ? "belowBar"
      : hit.direction === "bearish"
        ? "aboveBar"
        : "inBar";
  const shape =
    hit.direction === "bullish"
      ? "arrowUp"
      : hit.direction === "bearish"
        ? "arrowDown"
        : "circle";

  return {
    time: hit.date as Time,
    position,
    shape,
    color: patternAccentColor(hit.direction),
    text: "",
    id: `pstrat-${hit.id}-${hit.instanceKey}-${hit.barIndex}`,
    size: PATTERN_MARKER_SIZE,
  };
}

export function patternStrategiesToChartMarkers(
  strategies: PatternStrategyResult | undefined,
  visibility: Record<PatternStrategyId, boolean>,
): SeriesMarker<Time>[] {
  if (!strategies?.recent.length) return [];
  return [...strategies.recent]
    .filter((hit) => visibility[hit.id])
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      return byDate !== 0 ? byDate : a.barIndex - b.barIndex;
    })
    .map(hitToMarker);
}

export function visiblePatternStrategyLegend(
  visibility: Record<PatternStrategyId, boolean>,
): { text: string; label: string; color: string }[] {
  return PATTERN_STRATEGY_ORDER.filter((id) => visibility[id]).flatMap((id) => {
    const meta = PATTERN_STRATEGY_META[id];
    return [
      {
        text: meta.markerBull,
        label: `${meta.labelKo} 롱`,
        color: patternAccentColor("bullish"),
      },
      {
        text: meta.markerBear,
        label: `${meta.labelKo} 숏`,
        color: patternAccentColor("bearish"),
      },
    ];
  });
}
