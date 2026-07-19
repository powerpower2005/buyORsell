import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  StochStrategyHit,
  StochStrategyResult,
} from "@/lib/evaluation/stochStrategies";
import {
  STOCH_STRATEGY_META,
  STOCH_STRATEGY_ORDER,
  type StochStrategyId,
} from "@/lib/stochStrategyMeta";
import { directionColor } from "@/lib/candlePatternMeta";

function hitToMarker(hit: StochStrategyHit): SeriesMarker<Time> {
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
    id: `stochstrat-${hit.id}-${hit.barIndex}`,
    size: 1,
  };
}

export function stochStrategiesToChartMarkers(
  strategies: StochStrategyResult | undefined,
  visibility: Record<StochStrategyId, boolean>,
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

export function visibleStochStrategyLegend(
  visibility: Record<StochStrategyId, boolean>,
): { text: string; label: string; color: string }[] {
  return STOCH_STRATEGY_ORDER.filter((id) => visibility[id]).flatMap((id) => {
    const meta = STOCH_STRATEGY_META[id];
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
