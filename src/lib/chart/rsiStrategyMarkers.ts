import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  RsiStrategyHit,
  RsiStrategyResult,
} from "@/lib/evaluation/rsiStrategies";
import {
  RSI_STRATEGY_META,
  RSI_STRATEGY_ORDER,
  type RsiStrategyId,
} from "@/lib/rsiStrategyMeta";
import { directionColor } from "@/lib/candlePatternMeta";

function hitToMarker(hit: RsiStrategyHit): SeriesMarker<Time> {
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
    color: directionColor(hit.direction),
    text: "",
    id: `rsistrat-${hit.id}-${hit.barIndex}`,
    size: 1,
  };
}

export function rsiStrategiesToChartMarkers(
  strategies: RsiStrategyResult | undefined,
  visibility: Record<RsiStrategyId, boolean>,
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

export function visibleRsiStrategyLegend(
  visibility: Record<RsiStrategyId, boolean>,
): { text: string; label: string; color: string }[] {
  return RSI_STRATEGY_ORDER.filter((id) => visibility[id]).flatMap((id) => {
    const meta = RSI_STRATEGY_META[id];
    return [
      {
        text: meta.markerBull,
        label: `${meta.labelKo} 롱`,
        color: directionColor("bullish"),
      },
      {
        text: meta.markerBear,
        label: `${meta.labelKo} 숏`,
        color: directionColor("bearish"),
      },
    ];
  });
}
