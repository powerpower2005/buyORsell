import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  VolumeStrategyHit,
  VolumeStrategyResult,
} from "@/lib/evaluation/volumeStrategies";
import {
  VOLUME_STRATEGY_META,
  VOLUME_STRATEGY_ORDER,
  type VolumeStrategyId,
} from "@/lib/volumeStrategyMeta";
import { directionColor } from "@/lib/candlePatternMeta";

function hitToMarker(hit: VolumeStrategyHit): SeriesMarker<Time> {
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
    id: `volstrat-${hit.id}-${hit.barIndex}`,
    size: 1,
  };
}

export function volumeStrategiesToChartMarkers(
  strategies: VolumeStrategyResult | undefined,
  visibility: Record<VolumeStrategyId, boolean>,
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

export function visibleVolumeStrategyLegend(
  visibility: Record<VolumeStrategyId, boolean>,
): { text: string; label: string; color: string }[] {
  return VOLUME_STRATEGY_ORDER.filter((id) => visibility[id]).flatMap((id) => {
    const meta = VOLUME_STRATEGY_META[id];
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
