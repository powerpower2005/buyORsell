import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  CandlePatternHit,
  CandlePatternId,
  CandlePatternResult,
} from "@/lib/evaluation/candlePatterns";
import {
  CANDLE_PATTERN_META,
  CANDLE_PATTERN_ORDER,
  PATTERN_MARKER_SIZE,
  patternAccentColor,
} from "@/lib/candlePatternMeta";

function hitToMarker(hit: CandlePatternHit): SeriesMarker<Time> {
  const color = patternAccentColor(hit.direction);

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
    color,
    // Labels live in the below-chart legend only.
    text: "",
    id: `${hit.id}-${hit.barIndex}`,
    size: PATTERN_MARKER_SIZE,
  };
}

export function patternsToChartMarkers(
  patterns: CandlePatternResult | undefined,
  visibility: Record<CandlePatternId, boolean>,
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

export function visiblePatternLegend(
  visibility: Record<CandlePatternId, boolean>,
): { text: string; label: string; color: string }[] {
  return CANDLE_PATTERN_ORDER.filter((id) => visibility[id]).map((id) => {
    const meta = CANDLE_PATTERN_META[id];
    return {
      text: meta.markerText,
      label: meta.labelKo,
      color: patternAccentColor(meta.typicalDirection),
    };
  });
}
