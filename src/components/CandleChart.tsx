import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type LogicalRange,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import type { OHLCVBar, Timeframe, IndicatorResults } from "@/lib/types";
import type { CandlePatternId, CandlePatternResult } from "@/lib/evaluation/candlePatterns";
import type { SwingStructureResult } from "@/lib/evaluation/swingStructure";
import type { SupportResistanceResult } from "@/lib/evaluation/supportResistance";
import type { TrendlineResult } from "@/lib/evaluation/trendlines";
import { getIndicatorConfig } from "@/lib/configStore";
import { parsePeriodColors, resolvePeriodColor } from "@/lib/indicatorColors";
import {
  BB_BAND_META,
  BB_BAND_ORDER,
  bbOverlayKey,
  resolveBbBandColor,
  type BbBandId,
} from "@/lib/bbOverlay";
import {
  patternsToChartMarkers,
  visiblePatternLegend,
} from "@/lib/chart/patternMarkers";
import {
  structureToChartMarkers,
  visibleStructureLegend,
} from "@/lib/chart/structureMarkers";
import {
  bbStrategiesToChartMarkers,
  visibleBbStrategyLegend,
} from "@/lib/chart/bbStrategyMarkers";
import {
  classicalPatternsToChartMarkers,
  visibleClassicalPatternInstances,
  visibleClassicalPatternLegend,
} from "@/lib/chart/classicalPatternMarkers";
import {
  buildOscPaneSpecs,
  fmtVolume,
  oscExtraHeight,
  toLineData,
  toVolumeData,
  VOLUME_PANE_HEIGHT,
} from "@/lib/chart/oscillatorPaneSpecs";
import {
  computeVolumeAverages,
  formatVolume,
  getVolumeMaPeriods,
  volumeMaColor,
  volumeMaLabel,
} from "@/lib/evaluation/volumeMa";
import type { BbStrategyResult } from "@/lib/evaluation/bbStrategies";
import type { BbStrategyId } from "@/lib/bbStrategyMeta";
import type { ChartPatternResult } from "@/lib/evaluation/chartPatterns";
import {
  CHART_PATTERN_META,
  type ChartPatternId,
} from "@/lib/chartPatternMeta";
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
  type FibExtraId,
  type FibLevelRatio,
  type FibRetracement,
} from "@/lib/fibonacciStore";
import type { AuxIndicatorId } from "@/lib/auxIndicatorStore";
import { Card } from "./ui/Card";

type OscSeries = ISeriesApi<"Line"> | ISeriesApi<"Histogram">;

type OhlcvReadout = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function fmtLegend(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function fmtPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return value.toFixed(2);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

function isCandleData(
  data: unknown,
): data is CandlestickData<Time> {
  return (
    !!data &&
    typeof data === "object" &&
    "open" in data &&
    "high" in data &&
    "low" in data &&
    "close" in data
  );
}

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
  /** Per-line visibility keyed by Trendline.id. Missing id defaults to visible. */
  chartTrendlineLineVisibility?: Record<string, boolean>;
  /** Resolved per-line colors keyed by Trendline.id. */
  chartTrendlineColors?: Record<string, string>;
  indicators?: IndicatorResults;
  /** Per-period SMA/EMA line visibility. Missing period defaults to true. */
  maVisibility?: {
    sma?: Record<number, boolean>;
    ema?: Record<number, boolean>;
  };
  /** Per-band Bollinger visibility. Missing band defaults to true. */
  bbVisibility?: Partial<Record<BbBandId, boolean>>;
  bbStrategies?: BbStrategyResult;
  chartBbStrategyVisibility?: Record<BbStrategyId, boolean>;
  classicalPatterns?: ChartPatternResult;
  chartClassicalPatternVisibility?: Record<ChartPatternId, boolean>;
  showVolume?: boolean;
  height?: number;
  fibDrawMode?: boolean;
  fibRetracement?: FibRetracement | null;
  fibLevelVisibility?: Record<FibLevelRatio, boolean>;
  /** 0%/100% guides and confluence band visibility. Missing defaults to true. */
  fibExtraVisibility?: Partial<Record<FibExtraId, boolean>>;
  /** Below-chart oscillator pane toggles. Missing / false = hidden. */
  auxIndicatorVisibility?: Partial<Record<AuxIndicatorId, boolean>>;
  onFibChange?: () => void;
}

function useViewportChartHeight(fixed?: number) {
  const compute = () =>
    Math.min(920, Math.max(640, Math.round(window.innerHeight * 0.74)));

  const [height, setHeight] = useState(fixed ?? 720);

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
  chartTrendlineLineVisibility,
  chartTrendlineColors,
  indicators,
  maVisibility,
  bbVisibility,
  bbStrategies,
  chartBbStrategyVisibility,
  classicalPatterns,
  chartClassicalPatternVisibility,
  showVolume = false,
  height: heightProp,
  fibDrawMode,
  fibRetracement,
  fibLevelVisibility,
  fibExtraVisibility,
  auxIndicatorVisibility,
  onFibChange,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const volumeMaRefs = useRef<Map<number, ISeriesApi<"Line">>>(new Map());
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const overlayRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const oscSeriesRefs = useRef<Map<string, OscSeries>>(new Map());
  /** Only fit/zoom-reset when candle data or timeframe actually changes. */
  const fittedBarsKeyRef = useRef<string>("");
  const mainHeight = useViewportChartHeight(heightProp);

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
  const volumePaneHeight = showVolume ? VOLUME_PANE_HEIGHT : 0;
  const totalHeight =
    mainHeight + volumePaneHeight + oscExtraHeight(oscPanes);
  const latestVolume = bars.length ? bars[bars.length - 1]!.volume : undefined;

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
  const fibExtrasRef = useRef<Partial<Record<FibExtraId, boolean>> | undefined>(
    fibExtraVisibility,
  );
  fibExtrasRef.current = fibExtraVisibility;
  const onFibChangeRef = useRef<(() => void) | undefined>(onFibChange);
  onFibChangeRef.current = onFibChange;

  const [pickHint, setPickHint] = useState<string | null>(null);
  const [hoverOhlcv, setHoverOhlcv] = useState<OhlcvReadout | null>(null);

  const ohlcvReadout = useMemo((): OhlcvReadout | null => {
    if (hoverOhlcv) return hoverOhlcv;
    const last = bars.at(-1);
    if (!last) return null;
    return {
      date: last.date,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume,
    };
  }, [hoverOhlcv, bars]);

  const chartMarkers = useMemo(() => {
    const patternMs = patternsToChartMarkers(
      patterns,
      chartPatternVisibility ?? ({} as Record<CandlePatternId, boolean>),
    );
    const structureMs = structureToChartMarkers(
      structure,
      chartStructureVisibility ?? ({} as Record<SwingChartToggleId, boolean>),
    );
    const bbStratMs = bbStrategiesToChartMarkers(
      bbStrategies,
      chartBbStrategyVisibility ?? ({} as Record<BbStrategyId, boolean>),
    );
    const classicalMs = classicalPatternsToChartMarkers(
      classicalPatterns,
      chartClassicalPatternVisibility ??
        ({} as Record<ChartPatternId, boolean>),
    );
    return [...patternMs, ...structureMs, ...bbStratMs, ...classicalMs].sort(
      (a, b) => {
        const byDate = String(a.time).localeCompare(String(b.time));
        if (byDate !== 0) return byDate;
        return String(a.id).localeCompare(String(b.id));
      },
    );
  }, [
    patterns,
    chartPatternVisibility,
    structure,
    chartStructureVisibility,
    bbStrategies,
    chartBbStrategyVisibility,
    classicalPatterns,
    chartClassicalPatternVisibility,
  ]);

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
    const lineVis = chartTrendlineLineVisibility ?? {};
    // Missing per-line override defaults to visible when the kind is on.
    const keep = (line: Trendline) => lineVis[line.id] ?? true;
    const out: Trendline[] = [];
    if (vis.ascending) out.push(...trendlines.ascending.filter(keep));
    if (vis.descending) out.push(...trendlines.descending.filter(keep));
    return out;
  }, [trendlines, chartTrendlineVisibility, chartTrendlineLineVisibility]);
  const trendlinesRef = useRef(visibleTrendlines);
  trendlinesRef.current = visibleTrendlines;
  const trendlineColorsRef = useRef(chartTrendlineColors ?? {});
  trendlineColorsRef.current = chartTrendlineColors ?? {};

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
  const bbStrategyLegend = useMemo(
    () =>
      chartBbStrategyVisibility
        ? visibleBbStrategyLegend(chartBbStrategyVisibility)
        : [],
    [chartBbStrategyVisibility],
  );
  const classicalPatternLegend = useMemo(
    () =>
      chartClassicalPatternVisibility
        ? visibleClassicalPatternLegend(chartClassicalPatternVisibility)
        : [],
    [chartClassicalPatternVisibility],
  );
  const visibleClassicalInstances = useMemo(
    () =>
      visibleClassicalPatternInstances(
        classicalPatterns,
        chartClassicalPatternVisibility ??
          ({} as Record<ChartPatternId, boolean>),
      ),
    [classicalPatterns, chartClassicalPatternVisibility],
  );
  const classicalInstancesRef = useRef(visibleClassicalInstances);
  classicalInstancesRef.current = visibleClassicalInstances;

  const showFibAnchors = fibExtraVisibility?.anchors === true;
  const showFibConfluence = fibExtraVisibility?.confluence === true;

  const fibConfluences = useMemo(() => {
    if (
      !showFibConfluence ||
      !fibRetracement ||
      fibRetracement.high.price <= fibRetracement.low.price
    )
      return [];
    return findFibConfluences(fibRetracement, srZones, fibLevelVisibility);
  }, [
    fibRetracement,
    srZones,
    fibLevelVisibility,
    showFibConfluence,
  ]);

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

    // Price overlays belong on pane 0 only (oscillator panes share this canvas).
    const pane0H = chart.panes()[0]?.getHeight() ?? h;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, pane0H);
    ctx.clip();

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
      const color =
        trendlineColorsRef.current[line.id] ?? TRENDLINE_COLORS[line.kind];
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
    }

    // Classical chart pattern geometry
    for (const inst of classicalInstancesRef.current) {
      const color = CHART_PATTERN_META[inst.id].color;
      for (const s of inst.segments) {
        const sx = chart
          .timeScale()
          .timeToCoordinate(s.date1 as `${number}-${number}-${number}`);
        const ex = chart
          .timeScale()
          .timeToCoordinate(s.date2 as `${number}-${number}-${number}`);
        const sy = series.priceToCoordinate(s.y1);
        const ey = series.priceToCoordinate(s.y2);
        if (sx == null || ex == null || sy == null || ey == null) continue;
        ctx.strokeStyle = color;
        ctx.lineWidth = s.role === "neckline" ? 2 : 1.25;
        ctx.globalAlpha = inst.status === "forming" ? 0.55 : 0.9;
        ctx.setLineDash(
          s.role === "neckline" || inst.status === "forming" ? [5, 3] : [],
        );
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      for (const p of inst.pivots) {
        const px = chart
          .timeScale()
          .timeToCoordinate(p.date as `${number}-${number}-${number}`);
        const py = series.priceToCoordinate(p.price);
        if (px == null || py == null) continue;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
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
        const extras = fibExtrasRef.current;
        const drawAnchors = extras?.anchors === true;
        const drawConfluence = extras?.confluence === true;

        const confluences = drawConfluence
          ? findFibConfluences(fib, srZonesRef.current, levelVis)
          : [];
        const confluenceRatios = new Set(confluences.map((c) => c.ratio));

        // 0% / 100% guides (no price text — values live in legend)
        if (drawAnchors) {
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
          }

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
          }
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
        }

        // Fib level lines (dashed, from xStart to right edge)
        for (const ratio of FIB_RETRACEMENT_LEVELS) {
          if (!levelVis || levelVis[ratio] !== true) continue;
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

    ctx.restore();
  };

  // ─── Chart creation / teardown ─────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width:
        containerRef.current.clientWidth ||
        containerRef.current.parentElement?.clientWidth ||
        600,
      height: mainHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#252525" },
        textColor: "#8b95a1",
        attributionLogo: false,
        panes: {
          separatorColor: "#3a3a3c",
          separatorHoverColor: "rgba(139, 149, 161, 0.15)",
        },
      },
      grid: {
        vertLines: { color: "#3a3a3c" },
        horzLines: { color: "#3a3a3c" },
      },
      rightPriceScale: {
        borderColor: "#3a3a3c",
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#00c471",
      downColor: "#f04452",
      borderVisible: false,
      wickUpColor: "#00c471",
      wickDownColor: "#f04452",
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = null;
    volumeMaRefs.current = new Map();
    markersRef.current = createSeriesMarkers(candles, []);
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
        return;
      }
      const candleData = param.seriesData.get(candles);
      if (!isCandleData(candleData)) {
        setHoverOhlcv(null);
        return;
      }
      const timeStr = String(param.time);
      const bar = barsRef.current.find((b) => b.date === timeStr);
      setHoverOhlcv({
        date: timeStr,
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: bar?.volume ?? 0,
      });
    };
    chart.subscribeCrosshairMove(onCrosshairMove);

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
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.unsubscribeClick(onClickHandler);
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
    };
    // recreate chart on timeframe only; overlay redraw bound via other deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const savedRange = captureTimeRange();
    chart.applyOptions({ height: totalHeight });
    if (containerRef.current) {
      containerRef.current.style.height = `${totalHeight}px`;
    }
    if (wrapRef.current) {
      wrapRef.current.style.height = `${totalHeight}px`;
    }
    const panes = chart.panes();
    if (panes[0]) panes[0].setHeight(mainHeight);
    const volOffset = showVolume ? 1 : 0;
    if (showVolume && panes[1]) panes[1].setHeight(VOLUME_PANE_HEIGHT);
    oscPanes.forEach((pane, i) => {
      const api = panes[i + 1 + volOffset];
      if (api) api.setHeight(pane.height);
    });
    restoreTimeRange(savedRange);
    requestAnimationFrame(() => {
      restoreTimeRange(savedRange);
      drawChartOverlays();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalHeight, mainHeight, oscPanes, showVolume]);

  // ─── MA / BB overlays (pane 0) ─────────────────────────────────────────────

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
        const visible = periodVis?.[period] ?? false;
        if (!visible) return;
        wanted.add(key);

        let line = overlayRefs.current.get(key);
        if (!line) {
          line = chart.addSeries(LineSeries, {
            color: resolvePeriodColor(colors, period, i),
            lineWidth,
            title: "",
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          });
          overlayRefs.current.set(key, line);
        } else {
          line.applyOptions({
            color: resolvePeriodColor(colors, period, i),
            visible: true,
            title: "",
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
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

    const bbCfg = getIndicatorConfig("bb");
    const bbOut = indicators.indicators.bb;
    if (bbCfg?.enabled && bbOut) {
      const colors = parsePeriodColors(bbCfg.params.colors);
      for (const band of BB_BAND_ORDER) {
        if (!(bbVisibility?.[band] ?? false)) continue;
        const meta = BB_BAND_META[band];
        const key = bbOverlayKey(band);
        const points = bbOut.series[meta.seriesKey];
        if (!points?.length) continue;
        wanted.add(key);

        const color = resolveBbBandColor(colors, band);
        const lineWidth: 1 | 2 = band === "middle" ? 2 : 1;

        let line = overlayRefs.current.get(key);
        if (!line) {
          line = chart.addSeries(LineSeries, {
            color,
            lineWidth,
            title: "",
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          });
          overlayRefs.current.set(key, line);
        } else {
          line.applyOptions({
            color,
            lineWidth,
            visible: true,
            title: "",
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          });
        }

        line.setData(
          points.map((p) => ({
            time: p.date as `${number}-${number}-${number}`,
            value: p.value,
          })),
        );
      }
    }

    for (const [key, line] of overlayRefs.current) {
      if (!wanted.has(key)) {
        chart.removeSeries(line);
        overlayRefs.current.delete(key);
      }
    }
    // Re-read periods/colors from config each run (localStorage may change via modal).
  }, [indicators, timeframe, maVisibility, bbVisibility, bars.length]);

  // ─── Secondary panes: volume + oscillators (native multi-pane) ─────────────

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const savedRange = captureTimeRange();

    const safeRemove = (series: OscSeries | ISeriesApi<"Histogram">) => {
      try {
        chart.removeSeries(series);
      } catch {
        // Series may already be gone after pane teardown.
      }
    };
    for (const series of oscSeriesRefs.current.values()) {
      safeRemove(series);
    }
    oscSeriesRefs.current = new Map();
    if (volumeRef.current) {
      safeRemove(volumeRef.current);
      volumeRef.current = null;
    }
    for (const line of volumeMaRefs.current.values()) {
      safeRemove(line);
    }
    volumeMaRefs.current = new Map();

    const hasSecondary = showVolume || oscPanes.length > 0;
    if (!hasSecondary) {
      chart.applyOptions({ height: mainHeight });
      if (containerRef.current) {
        containerRef.current.style.height = `${mainHeight}px`;
      }
      if (wrapRef.current) {
        wrapRef.current.style.height = `${mainHeight}px`;
      }
      const panes = chart.panes();
      if (panes[0]) panes[0].setHeight(mainHeight);
      restoreTimeRange(savedRange);
      drawChartOverlays();
      return;
    }

    let nextPane = 1;
    if (showVolume && bars.length && volumeSnapshot) {
      const volumePane = nextPane;
      const volume = chart.addSeries(
        HistogramSeries,
        {
          priceFormat: { type: "volume" },
          lastValueVisible: false,
          priceLineVisible: false,
        },
        volumePane,
      );
      volume.setData(toVolumeData(bars));
      volumeRef.current = volume;

      for (const avg of volumeSnapshot.averages) {
        if (!avg.available || !avg.series.length) continue;
        const line = chart.addSeries(
          LineSeries,
          {
            color: volumeMaColor(avg.period),
            lineWidth: avg.period <= 7 ? 2 : 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          volumePane,
        );
        line.setData(
          avg.series.map((p) => ({
            time: p.date as `${number}-${number}-${number}`,
            value: p.value,
          })),
        );
        volumeMaRefs.current.set(avg.period, line);
      }
      nextPane += 1;
    }

    const volOffset = nextPane - 1;
    oscPanes.forEach((pane, index) => {
      const paneIndex = index + 1 + volOffset;
      const out = indicators?.indicators;
      if (!out) return;

      if (pane.id === "rsi") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: "#c084fc",
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        const overbought =
          getIndicatorConfig("rsi")?.overbought ?? 70;
        const oversold = getIndicatorConfig("rsi")?.oversold ?? 30;
        line.createPriceLine({
          price: overbought,
          color: "rgba(240, 68, 82, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: oversold,
          color: "rgba(0, 196, 113, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.setData(toLineData(out.rsi?.series.rsi));
        oscSeriesRefs.current.set("rsi", line);
        return;
      }

      if (pane.id === "macd") {
        const hist = chart.addSeries(
          HistogramSeries,
          {
            lastValueVisible: false,
            priceLineVisible: false,
          },
          paneIndex,
        );
        hist.setData(
          (out.macd?.series.macdHist ?? []).map((p) => ({
            time: p.date as `${number}-${number}-${number}`,
            value: p.value,
            color:
              p.value >= 0
                ? "rgba(0, 196, 113, 0.55)"
                : "rgba(240, 68, 82, 0.55)",
          })),
        );
        oscSeriesRefs.current.set("macdHist", hist);

        const macdLine = chart.addSeries(
          LineSeries,
          {
            color: "#60a5fa",
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        macdLine.setData(toLineData(out.macd?.series.macd));
        oscSeriesRefs.current.set("macd", macdLine);

        const signal = chart.addSeries(
          LineSeries,
          {
            color: "#fbbf24",
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        signal.setData(toLineData(out.macd?.series.macdSignal));
        oscSeriesRefs.current.set("macdSignal", signal);
        return;
      }

      if (pane.id === "mfi") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: "#22d3ee",
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 80,
          color: "rgba(240, 68, 82, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: 20,
          color: "rgba(0, 196, 113, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.setData(toLineData(out.mfi?.series.mfi));
        oscSeriesRefs.current.set("mfi", line);
        return;
      }

      if (pane.id === "atr") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: "#94a3b8",
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.setData(toLineData(out.atr?.series.atr));
        oscSeriesRefs.current.set("atr", line);
        return;
      }

      if (pane.id === "bbPercentB") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: "#a78bfa",
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 1,
          color: "rgba(240, 68, 82, 0.4)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: 0,
          color: "rgba(0, 196, 113, 0.4)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.setData(toLineData(out.bb?.series.bbPercentB));
        oscSeriesRefs.current.set("bbPercentB", line);
      }
    });

    chart.applyOptions({ height: totalHeight });
    if (containerRef.current) {
      containerRef.current.style.height = `${totalHeight}px`;
    }
    if (wrapRef.current) {
      wrapRef.current.style.height = `${totalHeight}px`;
    }
    const panes = chart.panes();
    if (panes[0]) panes[0].setHeight(mainHeight);
    const heightVolOffset = showVolume ? 1 : 0;
    if (showVolume && panes[1]) panes[1].setHeight(VOLUME_PANE_HEIGHT);
    oscPanes.forEach((pane, i) => {
      const api = panes[i + 1 + heightVolOffset];
      if (api) api.setHeight(pane.height);
    });
    restoreTimeRange(savedRange);
    requestAnimationFrame(() => {
      restoreTimeRange(savedRange);
      drawChartOverlays();
    });
    // Recreate only when pane membership / volume snapshot changes — not on
    // every parent re-render (bars/indicators get new object identities often).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    oscPanes,
    showVolume,
    volumeSnapshot,
    timeframe,
    mainHeight,
    totalHeight,
  ]);

  const overlayLegend = useMemo(() => {
    if (!indicators) return [];
    const items: { label: string; color: string }[] = [];

    for (const pluginId of ["sma", "ema"] as const) {
      const cfg = getIndicatorConfig(pluginId);
      if (!cfg?.enabled) continue;
      const periods = (cfg.params.periods as number[]) ?? [];
      const colors = parsePeriodColors(cfg.params.colors);
      const periodVis = maVisibility?.[pluginId];
      const out = indicators.indicators[pluginId];
      periods.forEach((period, i) => {
        if (!(periodVis?.[period] ?? false)) return;
        const key = `${pluginId}:${period}`;
        if (!out?.series[key]?.length) return;
        const latest = out.latest[key];
        items.push({
          label: `${pluginId.toUpperCase()} ${period} · ${fmtLegend(latest)}`,
          color: resolvePeriodColor(colors, period, i),
        });
      });
    }

    const bbCfg = getIndicatorConfig("bb");
    const bbOut = indicators.indicators.bb;
    if (bbCfg?.enabled && bbOut) {
      const colors = parsePeriodColors(bbCfg.params.colors);
      for (const band of BB_BAND_ORDER) {
        if (!(bbVisibility?.[band] ?? false)) continue;
        const meta = BB_BAND_META[band];
        if (!bbOut.series[meta.seriesKey]?.length) continue;
        const latest = bbOut.latest[meta.seriesKey];
        items.push({
          label: `BB ${meta.labelKo} · ${fmtLegend(latest)}`,
          color: resolveBbBandColor(colors, band),
        });
      }
    }

    return items;
  }, [indicators, maVisibility, bbVisibility]);

  const patternHitLegend = useMemo(() => {
    if (!patterns?.recent.length || !chartPatternVisibility) return [];
    return patterns.recent
      .filter((hit) => chartPatternVisibility[hit.id])
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.barIndex}`,
        text: hit.label,
        detail: hit.date,
        color:
          hit.direction === "bullish"
            ? "#00c471"
            : hit.direction === "bearish"
              ? "#f04452"
              : "#8b95a1",
      }));
  }, [patterns, chartPatternVisibility]);

  const bbStrategyHitLegend = useMemo(() => {
    if (!bbStrategies?.recent.length || !chartBbStrategyVisibility) return [];
    return bbStrategies.recent
      .filter((hit) => chartBbStrategyVisibility[hit.id])
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.barIndex}`,
        text: hit.label,
        detail: `${hit.date} · ${hit.summary}`,
        color:
          hit.direction === "bullish"
            ? "#00c471"
            : hit.direction === "bearish"
              ? "#f04452"
              : "#8b95a1",
      }));
  }, [bbStrategies, chartBbStrategyVisibility]);

  const classicalHitLegend = useMemo(() => {
    if (!classicalPatterns?.recent.length || !chartClassicalPatternVisibility)
      return [];
    return classicalPatterns.recent
      .filter((hit) => chartClassicalPatternVisibility[hit.id])
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: hit.instanceKey,
        text: hit.label,
        detail: `${hit.date} · ${hit.summary}`,
        color: CHART_PATTERN_META[hit.id].color,
      }));
  }, [classicalPatterns, chartClassicalPatternVisibility]);

  const structureHitLegend = useMemo(() => {
    if (!structure || !chartStructureVisibility) return [];
    const items: { key: string; text: string; detail: string; color: string }[] =
      [];
    const swings = structure.swings
      .filter((s) => s.label && chartStructureVisibility[s.label])
      .slice(-6);
    for (const s of swings) {
      if (!s.label) continue;
      const bullish = s.label === "HH" || s.label === "HL";
      items.push({
        key: `swing-${s.label}-${s.barIndex}`,
        text: s.label,
        detail: `${s.date} · ${s.price.toFixed(2)}`,
        color: bullish ? "#00c471" : "#f04452",
      });
    }
    for (const t of structure.transitions.slice(-4)) {
      if (t.to === "bullish" && chartStructureVisibility.bullish_transition) {
        items.push({
          key: `tr-bull-${t.barIndex}`,
          text: "↑BULL",
          detail: t.date,
          color: "#00c471",
        });
      }
      if (t.to === "bearish" && chartStructureVisibility.bearish_transition) {
        items.push({
          key: `tr-bear-${t.barIndex}`,
          text: "↓BEAR",
          detail: t.date,
          color: "#f04452",
        });
      }
    }
    return items;
  }, [structure, chartStructureVisibility]);

  // ─── Bars data update ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!bars.length || !candleRef.current) return;

    try {
      const barsKey = `${timeframe}:${bars.length}:${bars[0]?.date}:${bars.at(-1)?.date}:${bars.at(-1)?.close}`;
      const shouldFit = fittedBarsKeyRef.current !== barsKey;
      const savedRange = shouldFit ? null : captureTimeRange();

      candleRef.current.setData(
        bars.map((b) => ({
          time: b.date as `${number}-${number}-${number}`,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })),
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

      markersRef.current?.setMarkers(chartMarkers);

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
  }, [bars, chartMarkers, timeframe, showVolume, volumeSnapshot]);

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
  }, [
    fibRetracement,
    fibLevelVisibility,
    fibExtraVisibility,
    visibleTrendlines,
    srZones,
    chartTrendlineColors,
    visibleClassicalInstances,
  ]);

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
    <Card className="overflow-hidden p-2 sm:p-3">
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
          style={{
            height: totalHeight,
            cursor: fibDrawMode ? "crosshair" : undefined,
          }}
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
          {ohlcvReadout && (
            <div
              className="pointer-events-none absolute left-2 top-2 z-[2] rounded bg-black/55 px-2.5 py-1.5 text-[11px] leading-relaxed text-text-secondary backdrop-blur-[2px]"
              aria-live="polite"
            >
              <div className="mb-0.5 tabular-nums text-text-tertiary">
                {ohlcvReadout.date}
              </div>
              <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 tabular-nums">
                <span>
                  O{" "}
                  <span className="text-text-primary">
                    {fmtPrice(ohlcvReadout.open)}
                  </span>
                </span>
                <span>
                  H{" "}
                  <span className="text-text-primary">
                    {fmtPrice(ohlcvReadout.high)}
                  </span>
                </span>
                <span>
                  L{" "}
                  <span className="text-text-primary">
                    {fmtPrice(ohlcvReadout.low)}
                  </span>
                </span>
                <span>
                  C{" "}
                  <span
                    style={{
                      color:
                        ohlcvReadout.close >= ohlcvReadout.open
                          ? "#00c471"
                          : "#f04452",
                    }}
                  >
                    {fmtPrice(ohlcvReadout.close)}
                  </span>
                </span>
                <span>
                  V{" "}
                  <span className="text-text-primary">
                    {formatVolume(ohlcvReadout.volume)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {overlayLegend.length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
              <span>지표 오버레이:</span>
              {overlayLegend.map((item) => (
                <span key={item.label} className="flex items-center gap-1">
                  <span
                    className="inline-block h-0.5 w-4 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="tabular-nums">{item.label}</span>
                </span>
              ))}
            </div>
          )}

          {(showVolume || oscPanes.length > 0) && (
            <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
              <span>보조 패널:</span>
              {showVolume && (
                <>
                  <span className="tabular-nums text-text-tertiary">
                    거래량 {fmtVolume(latestVolume)}
                  </span>
                  {volumeSnapshot?.averages.map((avg) => (
                    <span
                      key={avg.period}
                      className="flex items-center gap-1 tabular-nums text-text-tertiary"
                    >
                      <span
                        className="inline-block h-0.5 w-3 rounded-sm"
                        style={{ backgroundColor: volumeMaColor(avg.period) }}
                      />
                      {volumeMaLabel(avg.period, timeframe)}{" "}
                      {avg.available && avg.latest != null
                        ? formatVolume(avg.latest)
                        : "—"}
                    </span>
                  ))}
                </>
              )}
              {oscPanes.map((pane) => (
                <span
                  key={pane.id}
                  className="tabular-nums text-text-tertiary"
                >
                  {pane.title} {pane.latest}
                </span>
              ))}
            </div>
          )}

          {patternHitLegend.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>캔들 패턴 ({patternHitLegend.length}):</span>
              {patternHitLegend.map((item) => (
                <span key={item.key} className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: item.color }}
                  >
                    {item.text}
                  </span>
                  <span className="tabular-nums text-text-tertiary">
                    {item.detail}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            patternLegend.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                <span>캔들 패턴:</span>
                {patternLegend.map((item) => (
                  <span key={item.text} className="text-text-tertiary">
                    {item.label}
                  </span>
                ))}
              </div>
            )
          )}

          {structureHitLegend.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>스윙 구조:</span>
              {structureHitLegend.map((item) => (
                <span key={item.key} className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: item.color }}
                  >
                    {item.text}
                  </span>
                  <span className="tabular-nums text-text-tertiary">
                    {item.detail}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            structureLegend.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                <span>스윙 구조:</span>
                {structureLegend.map((item) => (
                  <span key={item.text} className="text-text-tertiary">
                    {item.label}
                  </span>
                ))}
              </div>
            )
          )}

          {bbStrategyHitLegend.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>BB 전략:</span>
              {bbStrategyHitLegend.map((item) => (
                <span key={item.key} className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: item.color }}
                  >
                    {item.text}
                  </span>
                  <span className="tabular-nums text-text-tertiary">
                    {item.detail}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            bbStrategyLegend.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                <span>BB 전략:</span>
                {bbStrategyLegend.map((item) => (
                  <span
                    key={`${item.text}-${item.label}`}
                    className="text-text-tertiary"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            )
          )}

          {classicalHitLegend.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>차트 패턴:</span>
              {classicalHitLegend.map((item) => (
                <span key={item.key} className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: item.color }}
                  >
                    {item.text}
                  </span>
                  <span className="tabular-nums text-text-tertiary">
                    {item.detail}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            classicalPatternLegend.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                <span>차트 패턴:</span>
                {classicalPatternLegend.map((item) => (
                  <span
                    key={`${item.text}-${item.label}`}
                    className="text-text-tertiary"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            )
          )}

          {visibleTrendlines.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>동적 추세선 ({visibleTrendlines.length}):</span>
              {visibleTrendlines.map((line) => {
                const siblings =
                  line.kind === "ascending"
                    ? (trendlines?.ascending ?? [])
                    : (trendlines?.descending ?? []);
                const index = siblings.findIndex((l) => l.id === line.id);
                const color =
                  chartTrendlineColors?.[line.id] ??
                  TRENDLINE_COLORS[line.kind];
                return (
                  <span key={line.id} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-0.5 w-4 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="tabular-nums text-text-tertiary">
                      {line.kind === "ascending" ? "↑" : "↓"}
                      {index >= 0 ? ` #${index + 1}` : ""} · 터치{" "}
                      {line.touches} · 점수 {line.score}
                      {line.broken ? " · 이탈" : ""}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
          {srZones.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>지지·저항 가격대 ({srZones.length}):</span>
              {srZones.map((z) => (
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
              {showFibAnchors && (
                <>
                  <span className="tabular-nums text-text-tertiary">
                    0% {fibRetracement!.high.price.toFixed(2)} ({fibRetracement!.high.date})
                  </span>
                  <span className="tabular-nums text-text-tertiary">
                    100% {fibRetracement!.low.price.toFixed(2)} ({fibRetracement!.low.date})
                  </span>
                </>
              )}
              {FIB_RETRACEMENT_LEVELS.filter(
                (r) => fibLevelVisibility?.[r] === true,
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
