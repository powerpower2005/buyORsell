import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  ComboStrategyHit,
  ComboStrategyResult,
} from "@/lib/evaluation/comboStrategies";
import {
  COMBO_STRATEGY_META,
  COMBO_STRATEGY_ORDER,
  type ComboStrategyId,
} from "@/lib/comboStrategyMeta";
import { directionColor } from "@/lib/candlePatternMeta";

function hitToMarker(hit: ComboStrategyHit): SeriesMarker<Time> {
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
    id: `combostrat-${hit.id}-${hit.barIndex}`,
    size: 1,
  };
}

export function comboStrategiesToChartMarkers(
  strategies: ComboStrategyResult | undefined,
  visibility: Record<ComboStrategyId, boolean>,
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

export function visibleComboStrategyLegend(
  visibility: Record<ComboStrategyId, boolean>,
): { text: string; label: string; color: string }[] {
  return COMBO_STRATEGY_ORDER.filter((id) => visibility[id]).flatMap((id) => {
    const meta = COMBO_STRATEGY_META[id];
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
