import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import type { OHLCVBar, Timeframe, IndicatorResults } from "@/lib/types";
import type { CandlePatternId, CandlePatternResult } from "@/lib/evaluation/candlePatterns";
import type { SwingStructureResult } from "@/lib/evaluation/swingStructure";
import type { SupportResistanceResult } from "@/lib/evaluation/supportResistance";
import type { TrendlineResult } from "@/lib/evaluation/trendlines";
import { getIndicatorConfig } from "@/lib/configStore";
import { parsePeriodColors, resolvePeriodColor } from "@/lib/indicatorColors";
import {
  patternsToChartMarkers,
  visiblePatternLegend,
} from "@/lib/chart/patternMarkers";
import {
  structureToChartMarkers,
  visibleStructureLegend,
} from "@/lib/chart/structureMarkers";
import { SR_ZONE_COLORS, visibleSrZones } from "@/lib/chart/srZoneOverlay";
import type { SwingChartToggleId } from "@/lib/swingStructureStore";
import type { SrChartToggleId } from "@/lib/srZoneStore";
import {
  TRENDLINE_COLORS,
  type TrendlineChartToggleId,
} from "@/lib/trendlineStore";
import type { Trendline } from "@/lib/evaluation/trendlines";
import {
  FIB_LEVEL_COLORS,
  FIB_CONFLUENCE_COLOR,
  FIB_RETRACEMENT_LEVELS,
  fibLevelLabel,
  fibRetracementPrice,
  findFibConfluences,
  getFibPendingLow,
  setFibDrawMode,
  setFibPendingLow,
  setFibRetracement,
  type FibAnchor,
  type FibLevelRatio,
  type FibRetracement,
} from "@/lib/fibonacciStore";
import { Card } from "./ui/Card";

interface Props {
  bars: OHLCVBar[];
  timeframe: Timeframe;
  patterns?: CandlePatternResult;
  chartPatternVisibility?: Record<CandlePatternId, boolean>;
  structure?: SwingStructureResult;
  chartStructureVisibility?: Record<SwingChartToggleId, boolean>;
  supportResistance?: SupportResistanceResult;
  chartSrVisibility?: Record<SrChartToggleId, boolean>;
  trendlines?: TrendlineResult;
  chartTrendlineVisibility?: Record<TrendlineChartToggleId, boolean>;
  indicators?: IndicatorResults;
  /** Per-period SMA/EMA line visibility. Missing period defaults to true. */
  maVisibility?: {
    sma?: Record<number, boolean>;
    ema?: Record<number, boolean>;
  };
  showVolume?: boolean;
  height?: number;
  fibDrawMode?: boolean;
  fibRetracement?: FibRetracement | null;
  fibLevelVisibility?: Record<FibLevelRatio, boolean>;
  onFibChange?: () => void;
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

export function CandleChart({
  bars,
  timeframe,
  patterns,
  chartPatternVisibility,
  structure,
  chartStructureVisibility,
  supportResistance,
  chartSrVisibility,
  trendlines,
  chartTrendlineVisibility,
  indicators,
  maVisibility,
  showVolume = true,
  height: heightProp,
  fibDrawMode,
  fibRetracement,
  fibLevelVisibility,
  onFibChange,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlayRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const height = useViewportChartHeight(heightProp);

  // Mutable refs so event handlers always read fresh values without re-subscribing
  const barsRef = useRef<OHLCVBar[]>(bars);
  barsRef.current = bars;
  const fibDrawModeRef = useRef<boolean>(fibDrawMode ?? false);
  fibDrawModeRef.current = fibDrawMode ?? false;
  const fibRetRef = useRef<FibRetracement | null>(fibRetracement ?? null);
  fibRetRef.current = fibRetracement ?? null;
  const fibLevelsRef = useRef<Record<FibLevelRatio, boolean> | undefined>(
    fibLevelVisibility,
  );
  fibLevelsRef.current = fibLevelVisibility;
  const onFibChangeRef = useRef<(() => void) | undefined>(onFibChange);
  onFibChangeRef.current = onFibChange;

  const [pickHint, setPickHint] = useState<string | null>(null);

  const chartMarkers = useMemo(() => {
    const patternMs = patternsToChartMarkers(
      patterns,
      chartPatternVisibility ?? ({} as Record<CandlePatternId, boolean>),
    );
    const structureMs = structureToChartMarkers(
      structure,
      chartStructureVisibility ?? ({} as Record<SwingChartToggleId, boolean>),
    );
    return [...patternMs, ...structureMs].sort((a, b) => {
      const byDate = String(a.time).localeCompare(String(b.time));
      if (byDate !== 0) return byDate;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [patterns, chartPatternVisibility, structure, chartStructureVisibility]);

  const srZones = useMemo(
    () =>
      visibleSrZones(
        supportResistance,
        chartSrVisibility ?? ({} as Record<SrChartToggleId, boolean>),
      ),
    [supportResistance, chartSrVisibility],
  );
  const srZonesRef = useRef(srZones);
  srZonesRef.current = srZones;

  const visibleTrendlines = useMemo(() => {
    if (!trendlines) return [] as Trendline[];
    const vis =
      chartTrendlineVisibility ??
      ({ ascending: true, descending: true } as Record<
        TrendlineChartToggleId,
        boolean
      >);
    const out: Trendline[] = [];
    if (vis.ascending) out.push(...trendlines.ascending);
    if (vis.descending) out.push(...trendlines.descending);
    return out;
  }, [trendlines, chartTrendlineVisibility]);
  const trendlinesRef = useRef(visibleTrendlines);
  trendlinesRef.current = visibleTrendlines;

  const patternLegend = useMemo(
    () =>
      chartPatternVisibility
        ? visiblePatternLegend(chartPatternVisibility)
        : [],
    [chartPatternVisibility],
  );
  const structureLegend = useMemo(
    () =>
      chartStructureVisibility
        ? visibleStructureLegend(chartStructureVisibility)
        : [],
    [chartStructureVisibility],
  );

  const fibConfluences = useMemo(() => {
    if (!fibRetracement || fibRetracement.high.price <= fibRetracement.low.price)
      return [];
    return findFibConfluences(fibRetracement, srZones, fibLevelVisibility);
  }, [fibRetracement, srZones, fibLevelVisibility]);

  // ─── Overlay draw ──────────────────────────────────────────────────────────

  const drawChartOverlays = () => {
    const canvas = overlayRef.current;
    const wrap = wrapRef.current;
    const series = candleRef.current;
    const chart = chartRef.current;
    if (!canvas || !wrap || !series || !chart) return;

    const width = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (width <= 0 || h <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, h);

    // ── S/R zone bands ────────────────────────────────────────────────────────
    for (const zone of srZonesRef.current) {
      const y1 = series.priceToCoordinate(zone.high);
      const y2 = series.priceToCoordinate(zone.low);
      if (y1 == null || y2 == null) continue;
      const top = Math.min(y1, y2);
      const bandH = Math.max(2, Math.abs(y2 - y1));
      const colors = SR_ZONE_COLORS[zone.kind];

      ctx.fillStyle = colors.fill;
      ctx.fillRect(0, top, width, bandH);

      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y1);
      ctx.lineTo(width, y1);
      ctx.moveTo(0, y2);
      ctx.lineTo(width, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = colors.label;
      ctx.font = "11px Pretendard, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const label =
        zone.kind === "support"
          ? `S×${zone.quality.touchEvents} ${zone.low.toFixed(2)}-${zone.high.toFixed(2)} [${zone.quality.grade}]`
          : `R×${zone.quality.touchEvents} ${zone.low.toFixed(2)}-${zone.high.toFixed(2)} [${zone.quality.grade}]`;
      ctx.fillText(label, 8, top + bandH / 2);
    }

    // Dynamic trendlines
    for (const line of trendlinesRef.current) {
      const x1 = chart
        .timeScale()
        .timeToCoordinate(line.date1 as `${number}-${number}-${number}`);
      const x2 = chart
        .timeScale()
        .timeToCoordinate(line.date2 as `${number}-${number}-${number}`);
      const endDate = barsRef.current[line.endBarIndex]?.date ?? line.date2;
      const xEnd = chart
        .timeScale()
        .timeToCoordinate(endDate as `${number}-${number}-${number}`);
      const y1 = series.priceToCoordinate(line.y1);
      const y2 = series.priceToCoordinate(line.y2);
      const yEnd = series.priceToCoordinate(line.yAtEnd);
      if (x1 == null || y1 == null || yEnd == null) continue;
      const color = TRENDLINE_COLORS[line.kind];
      ctx.strokeStyle = color;
      ctx.lineWidth = line.broken ? 1 : 2;
      ctx.setLineDash(line.broken ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      if (x2 != null && y2 != null) ctx.lineTo(x2, y2);
      if (xEnd != null) ctx.lineTo(xEnd, yEnd);
      else ctx.lineTo(width, yEnd);
      ctx.stroke();
      ctx.setLineDash([]);

      // Anchor dots
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x1, y1, 3, 0, Math.PI * 2);
      ctx.fill();
      if (x2 != null && y2 != null) {
        ctx.beginPath();
        ctx.arc(x2, y2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = "10px Pretendard, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      const tag =
        line.kind === "ascending"
          ? `TL↑ ${line.touches}t`
          : `TL↓ ${line.touches}t`;
      ctx.fillText(tag, x1 + 4, y1 - 2);
    }

    // ── Fibonacci retracement ─────────────────────────────────────────────────
    const fib = fibRetRef.current;
    const levelVis = fibLevelsRef.current;

    if (fib && fib.high.price > fib.low.price) {
      const xLow = chart
        .timeScale()
        .timeToCoordinate(fib.low.date as `${number}-${number}-${number}`);
      const xHigh = chart
        .timeScale()
        .timeToCoordinate(fib.high.date as `${number}-${number}-${number}`);

      if (xLow != null && xHigh != null) {
        const xStart = Math.min(xLow, xHigh);

        const confluences = findFibConfluences(fib, srZonesRef.current, levelVis);
        const confluenceRatios = new Set(confluences.map((c) => c.ratio));

        // 0% guide at high price
        const y0 = series.priceToCoordinate(fib.high.price);
        if (y0 != null) {
          ctx.save();
          ctx.strokeStyle = "rgba(255,255,255,0.28)";
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(xStart, y0);
          ctx.lineTo(width, y0);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = "rgba(255,255,255,0.45)";
          ctx.font = "10px Pretendard, sans-serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillText(`0%  ${fib.high.price.toFixed(2)}`, width - 4, y0 - 2);
        }

        // 100% guide at low price
        const y100 = series.priceToCoordinate(fib.low.price);
        if (y100 != null) {
          ctx.save();
          ctx.strokeStyle = "rgba(255,255,255,0.28)";
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(xStart, y100);
          ctx.lineTo(width, y100);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = "rgba(255,255,255,0.45)";
          ctx.font = "10px Pretendard, sans-serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "top";
          ctx.fillText(`100%  ${fib.low.price.toFixed(2)}`, width - 4, y100 + 2);
        }

        // Confluence highlight bands (full width, gold/amber)
        for (const hit of confluences) {
          const yTop = series.priceToCoordinate(hit.zoneHigh);
          const yBot = series.priceToCoordinate(hit.zoneLow);
          if (yTop == null || yBot == null) continue;
          const cfTop = Math.min(yTop, yBot);
          const cfH = Math.max(4, Math.abs(yBot - yTop));

          ctx.fillStyle = "rgba(251,191,36,0.22)";
          ctx.fillRect(0, cfTop, width, cfH);

          ctx.save();
          ctx.strokeStyle = FIB_CONFLUENCE_COLOR;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(0, cfTop);
          ctx.lineTo(width, cfTop);
          ctx.moveTo(0, cfTop + cfH);
          ctx.lineTo(width, cfTop + cfH);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = FIB_CONFLUENCE_COLOR;
          ctx.font = "bold 10px Pretendard, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          const srLabel = hit.zoneKind === "support" ? "S" : "R";
          ctx.fillText(
            `CF ${fibLevelLabel(hit.ratio)} + ${srLabel}`,
            8,
            cfTop + cfH / 2,
          );
        }

        // Fib level lines (dashed, from xStart to right edge)
        for (const ratio of FIB_RETRACEMENT_LEVELS) {
          if (levelVis && levelVis[ratio] === false) continue;
          const fibPrice = fibRetracementPrice(
            fib.low.price,
            fib.high.price,
            ratio,
          );
          const yFib = series.priceToCoordinate(fibPrice);
          if (yFib == null) continue;

          const hasConf = confluenceRatios.has(ratio);
          const color = FIB_LEVEL_COLORS[ratio];

          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = hasConf ? 2.5 : 1.5;
          ctx.globalAlpha = hasConf ? 1 : 0.82;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(xStart, yFib);
          ctx.lineTo(width, yFib);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = color;
          ctx.font = `${hasConf ? "bold " : ""}10px Pretendard, sans-serif`;
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillText(
            `${fibLevelLabel(ratio)}  ${fibPrice.toFixed(2)}`,
            width - 4,
            yFib - 2,
          );
        }
      }
    }

    // ── Pending low anchor dot ────────────────────────────────────────────────
    const pending = getFibPendingLow();
    if (pending) {
      const xPend = chart
        .timeScale()
        .timeToCoordinate(pending.date as `${number}-${number}-${number}`);
      const yPend = series.priceToCoordinate(pending.price);
      if (xPend != null && yPend != null) {
        ctx.save();
        ctx.fillStyle = "#22c55e";
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(xPend, yPend, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(xPend, yPend, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  // ─── Chart creation / teardown ─────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width:
        containerRef.current.clientWidth ||
        containerRef.current.parentElement?.clientWidth ||
        600,
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

    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = volume;
    overlayRefs.current = new Map();

    const onRange = () => drawChartOverlays();
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onClickHandler = (param: any) => {
      if (!fibDrawModeRef.current) return;
      if (!param.time) return;

      const timeStr = String(param.time);
      const barsData = barsRef.current;
      const barIdx = barsData.findIndex((b) => b.date === timeStr);
      if (barIdx < 0) return;
      const bar = barsData[barIdx];

      const pending = getFibPendingLow();
      if (!pending) {
        const anchor: FibAnchor = {
          date: bar.date,
          barIndex: barIdx,
          price: bar.low,
        };
        setFibPendingLow(anchor);
        setPickHint("피보나치: 고점(스윙 고) 캔들을 클릭하세요");
        drawChartOverlays();
      } else {
        if (bar.high <= pending.price) {
          setPickHint(
            "피보나치: 고점은 저점보다 위여야 합니다. 다시 고점을 클릭하세요",
          );
          return;
        }
        if (barIdx < pending.barIndex) {
          setPickHint(
            "피보나치: 고점은 저점보다 오른쪽(이후) 봉이어야 합니다",
          );
          return;
        }
        const highAnchor: FibAnchor = {
          date: bar.date,
          barIndex: barIdx,
          price: bar.high,
        };
        const newFib: FibRetracement = { low: pending, high: highAnchor };
        setFibRetracement(newFib);
        setFibPendingLow(null);
        setFibDrawMode(false);
        setPickHint(null);
        onFibChangeRef.current?.();
        drawChartOverlays();
      }
    };
    chart.subscribeClick(onClickHandler);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
        drawChartOverlays();
      }
    });
    ro.observe(containerRef.current);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
      chart.unsubscribeClick(onClickHandler);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      overlayRefs.current = new Map();
    };
    // recreate chart on timeframe only; overlay redraw bound via other deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  useEffect(() => {
    chartRef.current?.applyOptions({ height });
    if (containerRef.current) {
      containerRef.current.style.height = `${height}px`;
    }
    if (wrapRef.current) {
      wrapRef.current.style.height = `${height}px`;
    }
    drawChartOverlays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  // ─── MA overlays ───────────────────────────────────────────────────────────

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !indicators) return;

    const wanted = new Set<string>();

    const drawGroup = (
      pluginId: "sma" | "ema",
      prefix: string,
      lineWidth: 1 | 2,
    ) => {
      const cfg = getIndicatorConfig(pluginId);
      if (!cfg?.enabled) return;
      const out = indicators.indicators[pluginId];
      if (!out) return;
      const periods = (cfg.params.periods as number[]) ?? [];
      const colors = parsePeriodColors(cfg.params.colors);
      const periodVis = maVisibility?.[pluginId];

      periods.forEach((period, i) => {
        const key = `${prefix}:${period}`;
        const points = out.series[key];
        if (!points?.length) return;
        const visible = periodVis?.[period] ?? true;
        if (!visible) return;
        wanted.add(key);

        let line = overlayRefs.current.get(key);
        if (!line) {
          line = chart.addLineSeries({
            color: resolvePeriodColor(colors, period, i),
            lineWidth,
            title: key.toUpperCase(),
          });
          overlayRefs.current.set(key, line);
        } else {
          line.applyOptions({
            color: resolvePeriodColor(colors, period, i),
            visible: true,
            title: key.toUpperCase(),
          });
        }

        line.setData(
          points.map((p) => ({
            time: p.date as `${number}-${number}-${number}`,
            value: p.value,
          })),
        );
      });
    };

    drawGroup("sma", "sma", 2);
    drawGroup("ema", "ema", 1);

    for (const [key, line] of overlayRefs.current) {
      if (!wanted.has(key)) {
        line.setData([]);
        line.applyOptions({ visible: false });
      }
    }
  }, [indicators, timeframe, maVisibility]);

  const overlayLegend = useMemo(() => {
    if (!indicators) return [];
    const items: { label: string; color: string }[] = [];

    for (const pluginId of ["sma", "ema"] as const) {
      const cfg = getIndicatorConfig(pluginId);
      if (!cfg?.enabled) continue;
      const periods = (cfg.params.periods as number[]) ?? [];
      const colors = parsePeriodColors(cfg.params.colors);
      const periodVis = maVisibility?.[pluginId];
      periods.forEach((period, i) => {
        if (!(periodVis?.[period] ?? true)) return;
        const key = `${pluginId}:${period}`;
        if (!indicators.indicators[pluginId]?.series[key]?.length) return;
        items.push({
          label: `${pluginId.toUpperCase()} ${period}`,
          color: resolvePeriodColor(colors, period, i),
        });
      });
    }
    return items;
  }, [indicators, maVisibility]);

  // ─── Bars data update ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!bars.length || !candleRef.current || !volumeRef.current) return;

    try {
      candleRef.current.setData(
        bars.map((b) => ({
          time: b.date as `${number}-${number}-${number}`,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })),
      );

      volumeRef.current.applyOptions({ visible: showVolume });
      volumeRef.current.setData(
        showVolume
          ? bars.map((b) => ({
              time: b.date as `${number}-${number}-${number}`,
              value: b.volume,
              color:
                b.close >= b.open
                  ? "rgba(0, 196, 113, 0.45)"
                  : "rgba(240, 68, 82, 0.45)",
            }))
          : [],
      );

      candleRef.current.setMarkers(chartMarkers);
      chartRef.current?.timeScale().fitContent();
      requestAnimationFrame(() => drawChartOverlays());
    } catch (err) {
      console.error("CandleChart setData failed:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, chartMarkers, timeframe, showVolume]);

  // ─── SR zone redraw ────────────────────────────────────────────────────────

  useEffect(() => {
    drawChartOverlays();
    const chart = chartRef.current;
    if (!chart) return;
    const onRange = () => drawChartOverlays();
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srZones]);

  // ─── Fib retracement / level visibility redraw ────────────────────────────

  useEffect(() => {
    drawChartOverlays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fibRetracement, fibLevelVisibility, visibleTrendlines, srZones]);

  // ─── Fib draw mode lifecycle ───────────────────────────────────────────────

  useEffect(() => {
    if (fibDrawMode) {
      setFibPendingLow(null);
      setPickHint("피보나치: 저점(스윙 저) 캔들을 클릭하세요");
    } else {
      setFibPendingLow(null);
      setPickHint(null);
      drawChartOverlays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fibDrawMode]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const hasFib =
    !!fibRetracement && fibRetracement.high.price > fibRetracement.low.price;

  return (
    <Card className="overflow-hidden p-3 sm:p-4">
      <div className="w-full text-left">
        {/* Pick hint banner */}
        {pickHint && (
          <div className="mb-2 rounded bg-amber-900/60 px-3 py-1.5 text-xs font-medium text-amber-200">
            {pickHint}
          </div>
        )}

        <div
          ref={wrapRef}
          className="relative w-full"
          style={{ height, cursor: fibDrawMode ? "crosshair" : undefined }}
        >
          <div
            ref={containerRef}
            className="absolute inset-0 w-full"
            aria-label="candlestick-chart"
          />
          <canvas
            ref={overlayRef}
            className="pointer-events-none absolute inset-0 z-[1]"
            aria-hidden
          />
        </div>

        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {overlayLegend.length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
              <span>이동평균:</span>
              {overlayLegend.map((item) => (
                <span key={item.label} className="flex items-center gap-1">
                  <span
                    className="inline-block h-0.5 w-4 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          )}

          {patternLegend.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>캔들 패턴 ({patternLegend.length}):</span>
              {patternLegend.map((item) => (
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

          {structureLegend.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>스윙 구조:</span>
              {structureLegend.map((item) => (
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

          {visibleTrendlines.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>동적 추세선 ({visibleTrendlines.length}):</span>
              {visibleTrendlines.map((line) => (
                <span key={line.id} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-0.5 w-4 rounded-sm"
                    style={{ backgroundColor: TRENDLINE_COLORS[line.kind] }}
                  />
                  <span className="tabular-nums text-text-tertiary">
                    {line.kind === "ascending" ? "↑" : "↓"} 터치 {line.touches}{" "}
                    · 점수 {line.score}
                    {line.broken ? " · 이탈" : ""}
                  </span>
                </span>
              ))}
            </div>
          )}
          {srZones.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>지지·저항 가격대 ({srZones.length}):</span>
              {srZones.slice(0, 6).map((z) => (
                <span key={z.id} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-4 rounded-sm"
                    style={{ backgroundColor: SR_ZONE_COLORS[z.kind].stroke }}
                  />
                  <span className="tabular-nums text-text-tertiary">
                    {z.kind === "support" ? "S" : "R"}×{z.quality.touchEvents}{" "}
                    {z.low.toFixed(2)}–{z.high.toFixed(2)} ({z.quality.grade})
                  </span>
                </span>
              ))}
            </div>
          )}

          {hasFib && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>피보나치 되돌림:</span>
              {FIB_RETRACEMENT_LEVELS.filter(
                (r) => fibLevelVisibility?.[r] !== false,
              ).map((ratio) => (
                <span key={ratio} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-0.5 w-4 rounded-sm"
                    style={{ backgroundColor: FIB_LEVEL_COLORS[ratio] }}
                  />
                  <span className="tabular-nums text-text-tertiary">
                    {fibLevelLabel(ratio)}{" "}
                    {fibRetracementPrice(
                      fibRetracement!.low.price,
                      fibRetracement!.high.price,
                      ratio,
                    ).toFixed(2)}
                  </span>
                </span>
              ))}
            </div>
          )}

          {fibConfluences.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>Confluence (피보+지지·저항):</span>
              {fibConfluences.map((hit, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-4 rounded-sm"
                    style={{ backgroundColor: FIB_CONFLUENCE_COLOR }}
                  />
                  <span className="tabular-nums text-text-tertiary">
                    {fibLevelLabel(hit.ratio)} +{" "}
                    {hit.zoneKind === "support" ? "S" : "R"}{" "}
                    {hit.fibPrice.toFixed(2)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
