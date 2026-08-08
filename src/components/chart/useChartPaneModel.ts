import { useMemo } from "react";
import type { IndicatorResults, OHLCVBar, Timeframe } from "@/lib/types";
import {
  buildOscPaneSpecs,
  fmtVolume,
  oscExtraHeight,
  VOLUME_PANE_HEIGHT,
} from "@/lib/chart/oscillatorPaneSpecs";
import {
  computeVolumeAverages,
  getVolumeMaPeriods,
} from "@/lib/evaluation/volumeMa";
import type { AuxIndicatorId } from "@/lib/auxIndicatorStore";
import { useViewportChartHeight } from "./useViewportChartHeight";

export type UseChartPaneModelArgs = {
  bars: OHLCVBar[];
  timeframe: Timeframe;
  indicators?: IndicatorResults;
  auxIndicatorVisibility?: Partial<Record<AuxIndicatorId, boolean>>;
  showVolume: boolean;
  heightProp: number | undefined;
};

/** Volume snapshot, oscillator pane specs, and chart height totals. */
export function useChartPaneModel({
  bars,
  timeframe,
  indicators,
  auxIndicatorVisibility,
  showVolume,
  heightProp,
}: UseChartPaneModelArgs) {
  const volumeMaPeriods = useMemo(
    () => getVolumeMaPeriods(timeframe),
    [timeframe],
  );
  const volumeSnapshot = useMemo(
    () =>
      bars.length
        ? computeVolumeAverages(bars, volumeMaPeriods)
        : null,
    [bars, volumeMaPeriods],
  );

  const oscPanes = useMemo(
    () => buildOscPaneSpecs(indicators, auxIndicatorVisibility),
    [indicators, auxIndicatorVisibility],
  );
  const auxPaneHeights = useMemo(() => {
    const heights: number[] = [];
    if (showVolume) heights.push(VOLUME_PANE_HEIGHT);
    for (const pane of oscPanes) heights.push(pane.height);
    return heights;
  }, [showVolume, oscPanes]);
  const mainHeight = useViewportChartHeight(heightProp, auxPaneHeights);
  const volumePaneHeight = showVolume ? VOLUME_PANE_HEIGHT : 0;
  const totalHeight =
    mainHeight + volumePaneHeight + oscExtraHeight(oscPanes);
  const latestVolume = bars.length ? bars[bars.length - 1]!.volume : undefined;

  /** Label content for secondary panes (tops measured from live pane DOM). */
  const secondaryPaneLabelMeta = useMemo(() => {
    const labels: { key: string; title: string; detail?: string }[] = [];
    if (showVolume) {
      labels.push({
        key: "volume",
        title: "거래량",
        detail: fmtVolume(latestVolume),
      });
    }
    for (const pane of oscPanes) {
      labels.push({
        key: pane.id,
        title: pane.title,
        detail: pane.latest,
      });
    }
    return labels;
  }, [showVolume, oscPanes, latestVolume]);

  return {
    volumeSnapshot,
    oscPanes,
    mainHeight,
    totalHeight,
    latestVolume,
    secondaryPaneLabelMeta,
  };
}
