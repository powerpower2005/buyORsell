import type {
  SeriesMarker,
  SeriesMarkerBarPosition,
  SeriesMarkerShape,
  Time,
} from "lightweight-charts";
import type {
  StructureTransition,
  SwingLabel,
  SwingStructureResult,
} from "@/lib/evaluation/swingStructure";
import type { SwingChartToggleId } from "@/lib/swingStructureStore";

const LABEL_COLOR: Record<SwingLabel, string> = {
  HH: "#00c471",
  HL: "#00c471",
  LH: "#f04452",
  LL: "#f04452",
};

function swingMarkers(
  structure: SwingStructureResult,
  visibility: Record<SwingChartToggleId, boolean>,
): SeriesMarker<Time>[] {
  const out: SeriesMarker<Time>[] = [];
  for (const s of structure.swings) {
    if (!s.label || !visibility[s.label]) continue;
    out.push({
      time: s.date as Time,
      position: s.kind === "high" ? "aboveBar" : "belowBar",
      shape: s.kind === "high" ? "arrowDown" : "arrowUp",
      color: LABEL_COLOR[s.label],
      // Labels live in the below-chart legend only.
      text: "",
      id: `swing-${s.label}-${s.barIndex}`,
      size: 1,
    });
  }
  return out;
}

function transitionMarkers(
  transitions: StructureTransition[],
  visibility: Record<SwingChartToggleId, boolean>,
): SeriesMarker<Time>[] {
  return transitions
    .filter((t) => {
      if (t.to === "bullish") return visibility.bullish_transition;
      if (t.to === "bearish") return visibility.bearish_transition;
      return false;
    })
    .map((t): SeriesMarker<Time> => {
      const toBull = t.to === "bullish";
      const position: SeriesMarkerBarPosition = toBull
        ? "belowBar"
        : "aboveBar";
      const shape: SeriesMarkerShape = toBull ? "arrowUp" : "arrowDown";
      return {
        time: t.date as Time,
        position,
        shape,
        color: toBull ? "#00c471" : "#f04452",
        text: "",
        id: `transition-${t.to}-${t.barIndex}`,
        size: 2,
      };
    });
}

export function structureToChartMarkers(
  structure: SwingStructureResult | undefined,
  visibility: Record<SwingChartToggleId, boolean>,
): SeriesMarker<Time>[] {
  if (!structure) return [];
  const markers = [
    ...swingMarkers(structure, visibility),
    ...transitionMarkers(structure.transitions, visibility),
  ];
  return markers.sort((a, b) => {
    const ta = String(a.time);
    const tb = String(b.time);
    const byDate = ta.localeCompare(tb);
    if (byDate !== 0) return byDate;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function visibleStructureLegend(
  visibility: Record<SwingChartToggleId, boolean>,
): { text: string; label: string; color: string }[] {
  const items: { text: string; label: string; color: string }[] = [];
  for (const id of ["HH", "HL", "LH", "LL"] as SwingLabel[]) {
    if (!visibility[id]) continue;
    items.push({
      text: id,
      label: id,
      color: LABEL_COLOR[id],
    });
  }
  if (visibility.bullish_transition) {
    items.push({ text: "↑BULL", label: "하락→상승", color: "#00c471" });
  }
  if (visibility.bearish_transition) {
    items.push({ text: "↓BEAR", label: "상승→하락", color: "#f04452" });
  }
  return items;
}
