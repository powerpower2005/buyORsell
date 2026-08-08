import { useRef } from "react";
import {
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
} from "lightweight-charts";
import type { OscSeries } from "./useSecondaryPanes";

/** Shared chart DOM/series refs + visible-range capture helpers. */
export function useChartShellRefs() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const volumeMaRefs = useRef<Map<number, ISeriesApi<"Line">>>(new Map());
  const overlayRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const oscSeriesRefs = useRef<Map<string, OscSeries>>(new Map());
  /** Only fit/zoom-reset when candle data or timeframe actually changes. */
  const fittedBarsKeyRef = useRef<string>("");

  const captureTimeRange = (): LogicalRange | null => {
    try {
      return chartRef.current?.timeScale().getVisibleLogicalRange() ?? null;
    } catch {
      return null;
    }
  };

  const restoreTimeRange = (range: LogicalRange | null) => {
    if (!range || !chartRef.current) return;
    try {
      chartRef.current.timeScale().setVisibleLogicalRange(range);
    } catch {
      // Ignore if the chart was torn down mid-update.
    }
  };

  return {
    wrapRef,
    containerRef,
    chartRef,
    candleRef,
    volumeRef,
    volumeMaRefs,
    overlayRefs,
    oscSeriesRefs,
    fittedBarsKeyRef,
    captureTimeRange,
    restoreTimeRange,
  };
}
