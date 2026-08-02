import type { SeriesMarker, Time } from "lightweight-charts";
import type { IndicatorResults } from "@/lib/types";

/** Diamond-like flip markers from forever_vwap.series.flip (when overlay is on). */
export function foreverVwapToChartMarkers(
  indicators: IndicatorResults | undefined,
  visible: boolean,
): SeriesMarker<Time>[] {
  if (!visible || !indicators?.indicators.forever_vwap?.series.flip?.length) {
    return [];
  }
  const flips = indicators.indicators.forever_vwap.series.flip;
  const out: SeriesMarker<Time>[] = [];
  for (const p of flips) {
    if (p.value === 0 || Number.isNaN(p.value)) continue;
    const bull = p.value > 0;
    out.push({
      time: p.date as Time,
      position: bull ? "belowBar" : "aboveBar",
      shape: "square",
      color: bull ? "#f97316" : "#a855f7",
      text: "",
      id: `forever-vwap-flip-${p.date}`,
      size: 1.25,
    });
  }
  return out;
}
