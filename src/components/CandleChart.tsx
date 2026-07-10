import { useEffect, useMemo, useRef, useState } from "react";
import { createChart, type IChartApi, type ISeriesApi } from "lightweight-charts";
import type { OHLCVBar, Timeframe } from "@/lib/types";
import type { CandlePatternResult } from "@/lib/evaluation/candlePatterns";
import {
  patternsToChartMarkers,
  PATTERN_MARKER_LEGEND,
} from "@/lib/chart/patternMarkers";
import {
  computeVolumeAverages,
  getVolumeMaPeriods,
  VOLUME_MA_COLORS,
  VOLUME_MA_PERIODS,
} from "@/lib/evaluation/volumeMa";
import { Card } from "./ui/Card";

interface Props {
  bars: OHLCVBar[];
  timeframe: Timeframe;
  patterns?: CandlePatternResult;
  height?: number;
}

function useViewportChartHeight(fixed?: number) {
  const compute = () =>
    Math.min(780, Math.max(540, Math.round(window.innerHeight * 0.62)));

  const [height, setHeight] = useState(fixed ?? 640);

  useEffect(() => {
    if (fixed != null) {
      setHeight(fixed);
      return;
    }
    const update = () => setHeight(compute());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [fixed]);

  return height;
}

export function CandleChart({ bars, timeframe, patterns, height: heightProp }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maRefs = useRef<Map<number, ISeriesApi<"Line">>>(new Map());
  const height = useViewportChartHeight(heightProp);

  const periods = useMemo(() => getVolumeMaPeriods(timeframe), [timeframe]);
  const volumeSnapshot = useMemo(
    () => computeVolumeAverages(bars, periods),
    [bars, periods],
  );
  const patternMarkers = useMemo(
    () => patternsToChartMarkers(patterns),
    [patterns],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: "#252525" },
        textColor: "#8b95a1",
      },
      grid: {
        vertLines: { color: "#3a3a3c" },
        horzLines: { color: "#3a3a3c" },
      },
      rightPriceScale: {
        borderColor: "#3a3a3c",
        scaleMargins: { top: 0.05, bottom: 0.28 },
      },
    });

    const candles = chart.addCandlestickSeries({
      upColor: "#00c471",
      downColor: "#f04452",
      borderVisible: false,
      wickUpColor: "#00c471",
      wickDownColor: "#f04452",
    });

    const volume = chart.addHistogramSeries({
      priceScaleId: "volume",
      priceFormat: { type: "volume" },
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
      borderColor: "#3a3a3c",
    });

    const maLines = new Map<number, ISeriesApi<"Line">>();
    for (const period of VOLUME_MA_PERIODS) {
      const line = chart.addLineSeries({
        priceScaleId: "volume",
        color: VOLUME_MA_COLORS[period],
        lineWidth: period <= 7 ? 2 : 1,
        title: `Vol MA${period}`,
      });
      maLines.set(period, line);
    }

    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = volume;
    maRefs.current = maLines;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      maRefs.current = new Map();
    };
  }, [height]);

  useEffect(() => {
    if (!bars.length || !candleRef.current || !volumeRef.current) return;

    candleRef.current.setData(
      bars.map((b) => ({
        time: b.date as `${number}-${number}-${number}`,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    );

    volumeRef.current.setData(
      bars.map((b) => ({
        time: b.date as `${number}-${number}-${number}`,
        value: b.volume,
        color:
          b.close >= b.open
            ? "rgba(0, 196, 113, 0.45)"
            : "rgba(240, 68, 82, 0.45)",
      })),
    );

    const active = new Set(volumeSnapshot.averages.map((a) => a.period));
    for (const period of VOLUME_MA_PERIODS) {
      const line = maRefs.current.get(period);
      if (!line) continue;
      if (!active.has(period)) {
        line.setData([]);
        line.applyOptions({ visible: false });
        continue;
      }
      line.applyOptions({ visible: true });
    }

    for (const avg of volumeSnapshot.averages) {
      const line = maRefs.current.get(avg.period);
      if (!line) continue;
      line.setData(
        avg.series.map((p) => ({
          time: p.date as `${number}-${number}-${number}`,
          value: p.value,
        })),
      );
    }

    candleRef.current.setMarkers(patternMarkers);
    chartRef.current?.timeScale().fitContent();
  }, [bars, volumeSnapshot, patternMarkers]);

  return (
    <Card className="overflow-hidden p-3 sm:p-4">
      <div className="w-full text-left">
        <div ref={containerRef} className="w-full" />
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
            <span>거래량:</span>
            {periods.map((p) => (
              <span key={p} className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-4 rounded-sm"
                  style={{
                    backgroundColor:
                      VOLUME_MA_COLORS[p as keyof typeof VOLUME_MA_COLORS],
                  }}
                />
                MA{p}
              </span>
            ))}
          </div>
          {patternMarkers.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>캔들 패턴 ({patternMarkers.length}):</span>
              {PATTERN_MARKER_LEGEND.map((item) => (
                <span key={item.text} className="flex items-center gap-1.5">
                  <span
                    className="inline-flex min-w-[1.75rem] justify-center rounded px-1 font-mono text-[10px] font-semibold"
                    style={{ color: item.color }}
                  >
                    {item.text}
                  </span>
                  <span className="text-text-tertiary">{item.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
