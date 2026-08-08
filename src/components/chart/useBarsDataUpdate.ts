import { useEffect, type MutableRefObject, type RefObject } from "react";
import type { IChartApi, ISeriesApi, LogicalRange } from "lightweight-charts";
import type { OHLCVBar, Timeframe } from "@/lib/types";
import { toVolumeData } from "@/lib/chart/oscillatorPaneSpecs";
import type { VolumeMaSnapshot } from "@/lib/evaluation/volumeMa";
import type { PatternBarHighlight } from "@/lib/chart/patternBarHighlights";

export type UseBarsDataUpdateArgs = {
  bars: OHLCVBar[];
  timeframe: Timeframe;
  showVolume: boolean;
  volumeSnapshot: VolumeMaSnapshot | null;
  barHighlights: Map<string, PatternBarHighlight>;
  chartRef: RefObject<IChartApi | null>;
  candleRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  volumeRef: MutableRefObject<ISeriesApi<"Histogram"> | null>;
  volumeMaRefs: MutableRefObject<Map<number, ISeriesApi<"Line">>>;
  fittedBarsKeyRef: MutableRefObject<string>;
  captureTimeRange: () => LogicalRange | null;
  restoreTimeRange: (range: LogicalRange | null) => void;
  drawChartOverlays: () => void;
};

/** Candle / volume series setData + fitContent when bars change. */
export function useBarsDataUpdate({
  bars,
  timeframe,
  showVolume,
  volumeSnapshot,
  barHighlights,
  chartRef,
  candleRef,
  volumeRef,
  volumeMaRefs,
  fittedBarsKeyRef,
  captureTimeRange,
  restoreTimeRange,
  drawChartOverlays,
}: UseBarsDataUpdateArgs) {
  // ─── Bars data update ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!bars.length || !candleRef.current) return;

    try {
      const barsKey = `${timeframe}:${bars.length}:${bars[0]?.date}:${bars.at(-1)?.date}:${bars.at(-1)?.close}`;
      const shouldFit = fittedBarsKeyRef.current !== barsKey;
      const savedRange = shouldFit ? null : captureTimeRange();

      candleRef.current.setData(
        bars.map((b) => {
          const hl = barHighlights.get(b.date);
          return {
            time: b.date as `${number}-${number}-${number}`,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            ...(hl
              ? {
                  color: hl.color,
                  borderColor: hl.borderColor,
                  wickColor: hl.wickColor,
                }
              : {}),
          };
        }),
      );

      if (volumeRef.current && showVolume) {
        volumeRef.current.setData(toVolumeData(bars));
      }
      if (showVolume && volumeSnapshot) {
        for (const avg of volumeSnapshot.averages) {
          const line = volumeMaRefs.current.get(avg.period);
          if (!line) continue;
          if (!avg.available || !avg.series.length) {
            line.setData([]);
            continue;
          }
          line.setData(
            avg.series.map((p) => ({
              time: p.date as `${number}-${number}-${number}`,
              value: p.value,
            })),
          );
        }
      }

      if (shouldFit) {
        fittedBarsKeyRef.current = barsKey;
        chartRef.current?.timeScale().fitContent();
      } else {
        restoreTimeRange(savedRange);
      }
      requestAnimationFrame(() => drawChartOverlays());
    } catch (err) {
      console.error("CandleChart setData failed:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, barHighlights, timeframe, showVolume, volumeSnapshot]);
}
