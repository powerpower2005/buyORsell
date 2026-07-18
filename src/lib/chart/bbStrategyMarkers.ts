import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  BbStrategyHit,
  BbStrategyResult,
} from "@/lib/evaluation/bbStrategies";
import {
  BB_STRATEGY_META,
  BB_STRATEGY_ORDER,
  type BbStrategyId,
} from "@/lib/bbStrategyMeta";
import { directionColor } from "@/lib/candlePatternMeta";

function hitToMarker(hit: BbStrategyHit): SeriesMarker<Time> {
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
    // Labels live in the below-chart legend only.
    text: "",
    id: `bbstrat-${hit.id}-${hit.barIndex}`,
    size: 1,
  };
}

export function bbStrategiesToChartMarkers(
  strategies: BbStrategyResult | undefined,
  visibility: Record<BbStrategyId, boolean>,
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

export function visibleBbStrategyLegend(
  visibility: Record<BbStrategyId, boolean>,
): { text: string; label: string; color: string }[] {
  return BB_STRATEGY_ORDER.filter((id) => visibility[id]).flatMap((id) => {
    const meta = BB_STRATEGY_META[id];
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
