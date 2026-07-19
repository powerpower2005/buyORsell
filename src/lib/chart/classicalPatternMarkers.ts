import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  ChartPatternHit,
  ChartPatternInstance,
  ChartPatternResult,
} from "@/lib/evaluation/chartPatterns";
import {
  CHART_PATTERN_META,
  CHART_PATTERN_ORDER,
  type ChartPatternId,
} from "@/lib/chartPatternMeta";
import { PATTERN_MARKER_SIZE, patternAccentColor } from "@/lib/candlePatternMeta";

function hitToMarker(hit: ChartPatternHit): SeriesMarker<Time> {
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
    color: CHART_PATTERN_META[hit.id]?.color ?? patternAccentColor(hit.direction),
    // Labels live in the below-chart legend only.
    text: "",
    id: `cpat-${hit.instanceKey}`,
    size: PATTERN_MARKER_SIZE,
  };
}

export function classicalPatternsToChartMarkers(
  patterns: ChartPatternResult | undefined,
  visibility: Record<ChartPatternId, boolean>,
): SeriesMarker<Time>[] {
  if (!patterns?.recent.length) return [];
  return [...patterns.recent]
    .filter((hit) => visibility[hit.id])
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      return byDate !== 0 ? byDate : a.barIndex - b.barIndex;
    })
    .map(hitToMarker);
}

export function visibleClassicalPatternLegend(
  visibility: Record<ChartPatternId, boolean>,
): { text: string; label: string; color: string }[] {
  return CHART_PATTERN_ORDER.filter((id) => visibility[id]).map((id) => {
    const meta = CHART_PATTERN_META[id];
    return {
      text: `${meta.markerBull}/${meta.markerBear}`,
      label: meta.labelKo,
      color: meta.color,
    };
  });
}

export function visibleClassicalPatternInstances(
  patterns: ChartPatternResult | undefined,
  visibility: Record<ChartPatternId, boolean>,
): ChartPatternInstance[] {
  if (!patterns?.instances.length) return [];
  return patterns.instances.filter((inst) => visibility[inst.id]);
}
