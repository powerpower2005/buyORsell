import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import type { OHLCVBar, Timeframe } from "@/lib/types";
import { candleOptions, chartOptions } from "@/lib/chart/chartTheme";
import type { MarkerTooltip } from "@/lib/chart/markerTooltips";
import type { OhlcvReadout } from "./ChartReadout";

type OscSeries = ISeriesApi<"Line"> | ISeriesApi<"Histogram">;

export function dailyChangePct(
  close: number,
  prevClose: number | undefined,
): number | null {
  if (prevClose == null || prevClose === 0 || !Number.isFinite(close)) {
    return null;
  }
  return ((close - prevClose) / prevClose) * 100;
}

function isCandleData(data: unknown): data is CandlestickData<Time> {
  return (
    !!data &&
    typeof data === "object" &&
    "open" in data &&
    "high" in data &&
    "low" in data &&
    "close" in data
  );
}

export type UseChartInstanceArgs = {
  containerRef: RefObject<HTMLDivElement | null>;
  chartRef: MutableRefObject<IChartApi | null>;
  candleRef: MutableRefObject<ISeriesApi<"Candlestick"> | null>;
  volumeRef: MutableRefObject<ISeriesApi<"Histogram"> | null>;
  volumeMaRefs: MutableRefObject<Map<number, ISeriesApi<"Line">>>;
  markersRef: MutableRefObject<ISeriesMarkersPluginApi<Time> | null>;
  overlayRefs: MutableRefObject<Map<string, ISeriesApi<"Line">>>;
  oscSeriesRefs: MutableRefObject<Map<string, OscSeries>>;
  fittedBarsKeyRef: MutableRefObject<string>;
  barsRef: MutableRefObject<OHLCVBar[]>;
  markerTooltipsRef: MutableRefObject<Map<string, MarkerTooltip>>;
  setMarkerHoverRef: MutableRefObject<
    Dispatch<
      SetStateAction<{ x: number; y: number; tip: MarkerTooltip } | null>
    >
  >;
  setHoverOhlcv: Dispatch<SetStateAction<OhlcvReadout | null>>;
  mainHeight: number;
  timeframe: Timeframe;
  bindMarkers: (candles: ISeriesApi<"Candlestick">) => void;
  drawChartOverlays: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFibClick: (param: any) => void;
};

/** createChart / candle series / crosshair / resize observer lifecycle. */
export function useChartInstance({
  containerRef,
  chartRef,
  candleRef,
  volumeRef,
  volumeMaRefs,
  markersRef,
  overlayRefs,
  oscSeriesRefs,
  fittedBarsKeyRef,
  barsRef,
  markerTooltipsRef,
  setMarkerHoverRef,
  setHoverOhlcv,
  mainHeight,
  timeframe,
  bindMarkers,
  drawChartOverlays,
  onFibClick,
}: UseChartInstanceArgs) {
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(
      containerRef.current,
      chartOptions({
        width:
          containerRef.current.clientWidth ||
          containerRef.current.parentElement?.clientWidth ||
          600,
        height: mainHeight,
      }),
    );

    const candles = chart.addSeries(CandlestickSeries, candleOptions());

    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = null;
    volumeMaRefs.current = new Map();
    bindMarkers(candles);
    overlayRefs.current = new Map();
    oscSeriesRefs.current = new Map();

    const onRange = () => drawChartOverlays();
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      if (
        param.point === undefined ||
        param.time === undefined ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        setHoverOhlcv(null);
        setMarkerHoverRef.current(null);
        return;
      }

      const hovered = param.hoveredInfo;
      if (
        hovered?.objectKind === "series-marker" &&
        hovered.objectId != null
      ) {
        const tip = markerTooltipsRef.current.get(String(hovered.objectId));
        if (tip) {
          setMarkerHoverRef.current({
            x: param.point.x,
            y: param.point.y,
            tip,
          });
        } else {
          setMarkerHoverRef.current(null);
        }
      } else {
        setMarkerHoverRef.current(null);
      }

      const candleData = param.seriesData.get(candles);
      if (!isCandleData(candleData)) {
        setHoverOhlcv(null);
        return;
      }
      const timeStr = String(param.time);
      const barsData = barsRef.current;
      const barIdx = barsData.findIndex((b) => b.date === timeStr);
      const bar = barIdx >= 0 ? barsData[barIdx] : undefined;
      const prev = barIdx > 0 ? barsData[barIdx - 1] : undefined;
      setHoverOhlcv({
        date: timeStr,
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: bar?.volume ?? 0,
        changePct: dailyChangePct(candleData.close, prev?.close),
      });
    };
    chart.subscribeCrosshairMove(onCrosshairMove);

    chart.subscribeClick(onFibClick);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
        drawChartOverlays();
      }
    });
    ro.observe(containerRef.current);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.unsubscribeClick(onFibClick);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      volumeMaRefs.current = new Map();
      markersRef.current = null;
      overlayRefs.current = new Map();
      oscSeriesRefs.current = new Map();
      fittedBarsKeyRef.current = "";
      setHoverOhlcv(null);
      setMarkerHoverRef.current(null);
    };
    // recreate chart on timeframe only; overlay redraw bound via other deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);
}
