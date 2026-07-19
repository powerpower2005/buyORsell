import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  IchimokuStrategyHit,
  IchimokuStrategyResult,
} from "@/lib/evaluation/ichimokuStrategies";
import {
  ICHIMOKU_STRATEGY_META,
  ICHIMOKU_STRATEGY_ORDER,
  type IchimokuStrategyId,
} from "@/lib/ichimokuStrategyMeta";
import { directionColor } from "@/lib/candlePatternMeta";

function hitToMarker(hit: IchimokuStrategyHit): SeriesMarker<Time> {
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
    id: `ichistrat-${hit.id}-${hit.barIndex}`,
    size: 1,
  };
}

export function ichimokuStrategiesToChartMarkers(
  strategies: IchimokuStrategyResult | undefined,
  visibility: Record<IchimokuStrategyId, boolean>,
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

export function visibleIchimokuStrategyLegend(
  visibility: Record<IchimokuStrategyId, boolean>,
): { text: string; label: string; color: string }[] {
  return ICHIMOKU_STRATEGY_ORDER.filter((id) => visibility[id]).flatMap(
    (id) => {
      const meta = ICHIMOKU_STRATEGY_META[id];
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
    },
  );
}
