import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  MacdStrategyHit,
  MacdStrategyResult,
} from "@/lib/evaluation/macdStrategies";
import {
  MACD_STRATEGY_META,
  MACD_STRATEGY_ORDER,
  type MacdStrategyId,
} from "@/lib/macdStrategyMeta";
import { directionColor } from "@/lib/candlePatternMeta";

function hitToMarker(hit: MacdStrategyHit): SeriesMarker<Time> {
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
    id: `macdstrat-${hit.id}-${hit.barIndex}`,
    size: 1,
  };
}

export function macdStrategiesToChartMarkers(
  strategies: MacdStrategyResult | undefined,
  visibility: Record<MacdStrategyId, boolean>,
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

export function visibleMacdStrategyLegend(
  visibility: Record<MacdStrategyId, boolean>,
): { text: string; label: string; color: string }[] {
  return MACD_STRATEGY_ORDER.filter((id) => visibility[id]).flatMap((id) => {
    const meta = MACD_STRATEGY_META[id];
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
