import type { SeriesMarker, Time } from "lightweight-charts";
import type {
  CandlePatternHit,
  CandlePatternResult,
} from "@/lib/evaluation/candlePatterns";

const MARKER_TEXT: Record<CandlePatternHit["id"], string> = {
  doji: "D",
  hammer: "Ham",
  inverted_hammer: "IH",
  shooting_star: "SS",
  hanging_man: "HM",
  bullish_engulfing: "BE",
  bearish_engulfing: "SE",
  bullish_harami: "BH",
  bearish_harami: "RH",
};

function hitToMarker(hit: CandlePatternHit): SeriesMarker<Time> {
  const color =
    hit.direction === "bullish"
      ? "#00c471"
      : hit.direction === "bearish"
        ? "#f04452"
        : "#8b95a1";

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
    color,
    text: MARKER_TEXT[hit.id],
    id: `${hit.id}-${hit.barIndex}`,
    size: 1,
  };
}

export function patternsToChartMarkers(
  patterns: CandlePatternResult | undefined,
): SeriesMarker<Time>[] {
  if (!patterns?.recent.length) return [];

  return [...patterns.recent]
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      return byDate !== 0 ? byDate : a.barIndex - b.barIndex;
    })
    .map(hitToMarker);
}

export const PATTERN_MARKER_LEGEND: {
  text: string;
  label: string;
  color: string;
}[] = [
  { text: "BE", label: "Bullish Engulfing", color: "#00c471" },
  { text: "SE", label: "Bearish Engulfing", color: "#f04452" },
  { text: "Ham", label: "Hammer / Hanging Man", color: "#00c471" },
  { text: "SS", label: "Shooting Star", color: "#f04452" },
  { text: "D", label: "Doji", color: "#8b95a1" },
];
