import type { SeriesMarker, Time } from "lightweight-charts";
import type { StrategyConfluence } from "@/lib/evaluation/strategyConfluence";
import { DIRECTION } from "@/lib/chart/chartTheme";

/** Larger markers when multiple playbooks agree on the same bar. */
export function strategyConfluencesToChartMarkers(
  items: StrategyConfluence[] | undefined | null,
  enabled: boolean,
): SeriesMarker<Time>[] {
  if (!enabled || !items?.length) return [];
  // Keep chart readable — show newest overlaps only.
  const capped = items.slice(-30);
  return capped.map((c) => {
    const bull = c.direction === "bullish";
    const n = c.hits.length;
    return {
      time: c.date as Time,
      position: bull ? "belowBar" : "aboveBar",
      color: bull ? DIRECTION.up : DIRECTION.down,
      shape: bull ? "arrowUp" : "arrowDown",
      text: `x${n}`,
      id: `sconf-${c.barIndex}-${c.direction}`,
    } as SeriesMarker<Time>;
  });
}
