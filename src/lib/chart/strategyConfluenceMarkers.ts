import type { SeriesMarker, Time } from "lightweight-charts";
import {
  groupConfluencesByBar,
  type StrategyConfluence,
} from "@/lib/evaluation/strategyConfluence";
import { DIRECTION, SIGNAL } from "@/lib/chart/chartTheme";

/** Larger markers when multiple playbooks agree on the same bar. */
export function strategyConfluencesToChartMarkers(
  items: StrategyConfluence[] | undefined | null,
  enabled: boolean,
): SeriesMarker<Time>[] {
  if (!enabled || !items?.length) return [];
  // Keep chart readable — show newest overlaps only.
  const capped = groupConfluencesByBar(items).slice(-30);
  return capped.map((c) => {
    if (c.kind === "conflict") {
      const ln = c.longHits.length;
      const sn = c.shortHits.length;
      return {
        time: c.date as Time,
        position: "aboveBar",
        color: SIGNAL.neutral,
        shape: "square",
        text: `L${ln}/S${sn}`,
        id: `sconf-${c.barIndex}-conflict`,
      } as SeriesMarker<Time>;
    }
    const bull = c.kind === "long";
    const n = bull ? c.longHits.length : c.shortHits.length;
    return {
      time: c.date as Time,
      position: bull ? "belowBar" : "aboveBar",
      color: bull ? DIRECTION.up : DIRECTION.down,
      shape: bull ? "arrowUp" : "arrowDown",
      text: `x${n}`,
      id: `sconf-${c.barIndex}-${bull ? "bullish" : "bearish"}`,
    } as SeriesMarker<Time>;
  });
}
