import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  ClassicStrategyHit,
  ClassicStrategyResult,
} from "@/lib/evaluation/classicStrategies";
import {
  CLASSIC_STRATEGY_META,
  CLASSIC_STRATEGY_ORDER,
  type ClassicStrategyId,
} from "@/lib/classicStrategyMeta";
import { directionColor } from "@/lib/candlePatternMeta";

function hitToMarker(hit: ClassicStrategyHit): SeriesMarker<Time> {
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
    id: `classicstrat-${hit.id}-${hit.barIndex}`,
    size: 1,
  };
}

export function classicStrategiesToChartMarkers(
  strategies: ClassicStrategyResult | undefined,
  visibility: Record<ClassicStrategyId, boolean>,
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

export function visibleClassicStrategyLegend(
  visibility: Record<ClassicStrategyId, boolean>,
): { text: string; label: string; color: string }[] {
  return CLASSIC_STRATEGY_ORDER.filter((id) => visibility[id]).flatMap((id) => {
    const meta = CLASSIC_STRATEGY_META[id];
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
