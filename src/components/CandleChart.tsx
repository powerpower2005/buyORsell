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
import { patternBarHighlights } from "@/lib/chart/patternBarHighlights";
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
  patternStrategiesToChartMarkers,
  visiblePatternStrategyLegend,
} from "@/lib/chart/patternStrategyMarkers";
import { patternAccentColor } from "@/lib/candlePatternMeta";
import type { PatternStrategyResult } from "@/lib/evaluation/patternStrategies";
import type { PatternStrategyId } from "@/lib/patternStrategyMeta";
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
import type { RsiStrategyResult } from "@/lib/evaluation/rsiStrategies";
import type { RsiStrategyId } from "@/lib/rsiStrategyMeta";
import {
  rsiStrategiesToChartMarkers,
  visibleRsiStrategyLegend,
} from "@/lib/chart/rsiStrategyMarkers";
import type { VolumeStrategyResult } from "@/lib/evaluation/volumeStrategies";
import type { VolumeStrategyId } from "@/lib/volumeStrategyMeta";
import {
  volumeStrategiesToChartMarkers,
  visibleVolumeStrategyLegend,
} from "@/lib/chart/volumeStrategyMarkers";
import {
  macdStrategiesToChartMarkers,
  visibleMacdStrategyLegend,
} from "@/lib/chart/macdStrategyMarkers";
import {
  stochStrategiesToChartMarkers,
  visibleStochStrategyLegend,
} from "@/lib/chart/stochStrategyMarkers";
import {
  ichimokuStrategiesToChartMarkers,
  visibleIchimokuStrategyLegend,
} from "@/lib/chart/ichimokuStrategyMarkers";
import type { IchimokuStrategyResult } from "@/lib/evaluation/ichimokuStrategies";
import type { IchimokuStrategyId } from "@/lib/ichimokuStrategyMeta";
import type { MacdStrategyResult } from "@/lib/evaluation/macdStrategies";
import type { MacdStrategyId } from "@/lib/macdStrategyMeta";
import type { StochStrategyResult } from "@/lib/evaluation/stochStrategies";
import type { StochStrategyId } from "@/lib/stochStrategyMeta";
import {
  ICHIMOKU_LINE_ORDER,
  ICHIMOKU_PART_META,
  ichimokuOverlayKey,
  resolveIchimokuColor,
  type IchimokuPartId,
} from "@/lib/ichimokuOverlay";
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
import type { TradeJournalEntry } from "@/lib/tradeJournalStore";
import { tradeJournalToChartMarkers } from "@/lib/chart/tradeJournalMarkers";
import type { StrategyConfluence } from "@/lib/evaluation/strategyConfluence";
import { strategyConfluencesToChartMarkers } from "@/lib/chart/strategyConfluenceMarkers";
import { Card } from "./ui/Card";

type OscSeries = ISeriesApi<"Line"> | ISeriesApi<"Histogram">;

type OhlcvReadout = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** Previous-close based daily change (%). Null for the first bar. */
  changePct: number | null;
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

function fmtChangePct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function dailyChangePct(
  close: number,
  prevClose: number | undefined,
): number | null {
  if (prevClose == null || prevClose === 0 || !Number.isFinite(close)) {
    return null;
  }
  return ((close - prevClose) / prevClose) * 100;
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
  ichimokuVisibility?: Partial<Record<IchimokuPartId, boolean>>;
  ichimokuStrategies?: IchimokuStrategyResult;
  chartIchimokuStrategyVisibility?: Record<IchimokuStrategyId, boolean>;
  classicalPatterns?: ChartPatternResult;
  chartClassicalPatternVisibility?: Record<ChartPatternId, boolean>;
  patternStrategies?: PatternStrategyResult;
  chartPatternStrategyVisibility?: Record<PatternStrategyId, boolean>;
  rsiStrategies?: RsiStrategyResult;
  chartRsiStrategyVisibility?: Record<RsiStrategyId, boolean>;
  volumeStrategies?: VolumeStrategyResult;
  chartVolumeStrategyVisibility?: Record<VolumeStrategyId, boolean>;
  macdStrategies?: MacdStrategyResult;
  chartMacdStrategyVisibility?: Record<MacdStrategyId, boolean>;
  stochStrategies?: StochStrategyResult;
  chartStochStrategyVisibility?: Record<StochStrategyId, boolean>;
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
  journalEntries?: TradeJournalEntry[];
  strategyConfluences?: StrategyConfluence[];
  showStrategyConfluence?: boolean;
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
  ichimokuVisibility,
  ichimokuStrategies,
  chartIchimokuStrategyVisibility,
  classicalPatterns,
  chartClassicalPatternVisibility,
  patternStrategies,
  chartPatternStrategyVisibility,
  rsiStrategies,
  chartRsiStrategyVisibility,
  volumeStrategies,
  chartVolumeStrategyVisibility,
  macdStrategies,
  chartMacdStrategyVisibility,
  stochStrategies,
  chartStochStrategyVisibility,
  showVolume = false,
  height: heightProp,
  fibDrawMode,
  fibRetracement,
  fibLevelVisibility,
  fibExtraVisibility,
  auxIndicatorVisibility,
  onFibChange,
  journalEntries,
  strategyConfluences,
  showStrategyConfluence = true,
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
    const prev = bars.at(-2);
    return {
      date: last.date,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume,
      changePct: dailyChangePct(last.close, prev?.close),
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
    const patternStratMs = patternStrategiesToChartMarkers(
      patternStrategies,
      chartPatternStrategyVisibility ??
        ({} as Record<PatternStrategyId, boolean>),
    );
    const rsiStratMs = rsiStrategiesToChartMarkers(
      rsiStrategies,
      chartRsiStrategyVisibility ?? ({} as Record<RsiStrategyId, boolean>),
    );
    const volumeStratMs = volumeStrategiesToChartMarkers(
      volumeStrategies,
      chartVolumeStrategyVisibility ??
        ({} as Record<VolumeStrategyId, boolean>),
    );
    const macdStratMs = macdStrategiesToChartMarkers(
      macdStrategies,
      chartMacdStrategyVisibility ?? ({} as Record<MacdStrategyId, boolean>),
    );
    const stochStratMs = stochStrategiesToChartMarkers(
      stochStrategies,
      chartStochStrategyVisibility ?? ({} as Record<StochStrategyId, boolean>),
    );
    const ichiStratMs = ichimokuStrategiesToChartMarkers(
      ichimokuStrategies,
      chartIchimokuStrategyVisibility ??
        ({} as Record<IchimokuStrategyId, boolean>),
    );
    const journalMs = tradeJournalToChartMarkers(journalEntries);
    const confluenceMs = strategyConfluencesToChartMarkers(
      strategyConfluences,
      showStrategyConfluence,
    );
    return [
      ...patternMs,
      ...structureMs,
      ...bbStratMs,
      ...classicalMs,
      ...patternStratMs,
      ...rsiStratMs,
      ...volumeStratMs,
      ...macdStratMs,
      ...stochStratMs,
      ...ichiStratMs,
      ...journalMs,
      ...confluenceMs,
    ].sort((a, b) => {
      const byDate = String(a.time).localeCompare(String(b.time));
      if (byDate !== 0) return byDate;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [
    patterns,
    chartPatternVisibility,
    structure,
    chartStructureVisibility,
    bbStrategies,
    chartBbStrategyVisibility,
    classicalPatterns,
    chartClassicalPatternVisibility,
    patternStrategies,
    chartPatternStrategyVisibility,
    rsiStrategies,
    chartRsiStrategyVisibility,
    volumeStrategies,
    chartVolumeStrategyVisibility,
    macdStrategies,
    chartMacdStrategyVisibility,
    stochStrategies,
    chartStochStrategyVisibility,
    ichimokuStrategies,
    chartIchimokuStrategyVisibility,
    journalEntries,
    strategyConfluences,
    showStrategyConfluence,
  ]);

  const barHighlights = useMemo(
    () =>
      patternBarHighlights(
        patterns,
        chartPatternVisibility,
        classicalPatterns,
        chartClassicalPatternVisibility,
      ),
    [
      patterns,
      chartPatternVisibility,
      classicalPatterns,
      chartClassicalPatternVisibility,
    ],
  );

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

  const kumoCloudRef = useRef<{
    visible: boolean;
    spanA: { date: string; value: number }[];
    spanB: { date: string; value: number }[];
  }>({ visible: false, spanA: [], spanB: [] });

  useEffect(() => {
    const cfg = getIndicatorConfig("ichimoku");
    const out = indicators?.indicators.ichimoku;
    const showCloud =
      (ichimokuVisibility?.cloud ?? false) && !!cfg?.enabled && !!out;
    kumoCloudRef.current = {
      visible: showCloud,
      spanA: out?.series.spanA ?? [],
      spanB: out?.series.spanB ?? [],
    };
  }, [indicators, ichimokuVisibility]);

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
  const patternStrategyLegend = useMemo(
    () =>
      chartPatternStrategyVisibility
        ? visiblePatternStrategyLegend(chartPatternStrategyVisibility)
        : [],
    [chartPatternStrategyVisibility],
  );
  const rsiStrategyLegend = useMemo(
    () =>
      chartRsiStrategyVisibility
        ? visibleRsiStrategyLegend(chartRsiStrategyVisibility)
        : [],
    [chartRsiStrategyVisibility],
  );
  const volumeStrategyLegend = useMemo(
    () =>
      chartVolumeStrategyVisibility
        ? visibleVolumeStrategyLegend(chartVolumeStrategyVisibility)
        : [],
    [chartVolumeStrategyVisibility],
  );
  const macdStrategyLegend = useMemo(
    () =>
      chartMacdStrategyVisibility
        ? visibleMacdStrategyLegend(chartMacdStrategyVisibility)
        : [],
    [chartMacdStrategyVisibility],
  );
  const stochStrategyLegend = useMemo(
    () =>
      chartStochStrategyVisibility
        ? visibleStochStrategyLegend(chartStochStrategyVisibility)
        : [],
    [chartStochStrategyVisibility],
  );
  const ichimokuStrategyLegend = useMemo(
    () =>
      chartIchimokuStrategyVisibility
        ? visibleIchimokuStrategyLegend(chartIchimokuStrategyVisibility)
        : [],
    [chartIchimokuStrategyVisibility],
  );
  const patternStrategyHitLegend = useMemo(() => {
    if (!patternStrategies?.recent.length || !chartPatternStrategyVisibility)
      return [];
    return patternStrategies.recent
      .filter((hit) => chartPatternStrategyVisibility[hit.id])
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.instanceKey}-${hit.barIndex}`,
        text: hit.label,
        detail: `${hit.date} · ${hit.summary}`,
        color: patternAccentColor(hit.direction),
      }));
  }, [patternStrategies, chartPatternStrategyVisibility]);
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

    // ── Ichimoku Kumo (cloud) ────────────────────────────────────────────────
    const kumo = kumoCloudRef.current;
    if (kumo.visible && kumo.spanA.length && kumo.spanB.length) {
      const bMap = new Map(kumo.spanB.map((p) => [p.date, p.value]));
      const pts: { date: string; a: number; b: number }[] = [];
      for (const p of kumo.spanA) {
        const bv = bMap.get(p.date);
        if (bv == null) continue;
        pts.push({ date: p.date, a: p.value, b: bv });
      }
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1]!;
        const p1 = pts[i]!;
        const x0 = chart
          .timeScale()
          .timeToCoordinate(p0.date as `${number}-${number}-${number}`);
        const x1 = chart
          .timeScale()
          .timeToCoordinate(p1.date as `${number}-${number}-${number}`);
        const yA0 = series.priceToCoordinate(p0.a);
        const yB0 = series.priceToCoordinate(p0.b);
        const yA1 = series.priceToCoordinate(p1.a);
        const yB1 = series.priceToCoordinate(p1.b);
        if (
          x0 == null ||
          x1 == null ||
          yA0 == null ||
          yB0 == null ||
          yA1 == null ||
          yB1 == null
        ) {
          continue;
        }
        const bull = p1.a >= p1.b;
        ctx.fillStyle = bull
          ? "rgba(34, 197, 94, 0.16)"
          : "rgba(239, 68, 68, 0.16)";
        ctx.beginPath();
        ctx.moveTo(x0, yA0);
        ctx.lineTo(x1, yA1);
        ctx.lineTo(x1, yB1);
        ctx.lineTo(x0, yB0);
        ctx.closePath();
        ctx.fill();
      }
    }

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
  // Toggle via visible:true/false (do not removeSeries on every click — that can
  // blank the price pane after rapid BB checkbox toggles).

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !indicators) return;

    const wanted = new Set<string>();

    const upsertLine = (
      key: string,
      points: { date: string; value: number }[],
      opts: {
        color: string;
        lineWidth: 1 | 2;
        visible: boolean;
        lineStyle?: LineStyle;
      },
    ) => {
      wanted.add(key);
      let line = overlayRefs.current.get(key);
      if (!line) {
        line = chart.addSeries(LineSeries, {
          color: opts.color,
          lineWidth: opts.lineWidth,
          lineStyle: opts.lineStyle,
          visible: opts.visible,
          title: "",
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
          // Keep candles driving the scale when overlays are hidden/shown.
          autoscaleInfoProvider: () => null,
        });
        overlayRefs.current.set(key, line);
      } else {
        line.applyOptions({
          color: opts.color,
          lineWidth: opts.lineWidth,
          lineStyle: opts.lineStyle,
          visible: opts.visible,
          title: "",
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
          autoscaleInfoProvider: () => null,
        });
      }
      line.setData(
        points.map((p) => ({
          time: p.date as `${number}-${number}-${number}`,
          value: p.value,
        })),
      );
    };

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
        upsertLine(key, points, {
          color: resolvePeriodColor(colors, period, i),
          lineWidth,
          visible: periodVis?.[period] ?? false,
        });
      });
    };

    drawGroup("sma", "sma", 2);
    drawGroup("ema", "ema", 1);

    const bbCfg = getIndicatorConfig("bb");
    const bbOut = indicators.indicators.bb;
    if (bbCfg?.enabled && bbOut) {
      const colors = parsePeriodColors(bbCfg.params.colors);
      for (const band of BB_BAND_ORDER) {
        const meta = BB_BAND_META[band];
        const key = bbOverlayKey(band);
        const points = bbOut.series[meta.seriesKey];
        if (!points?.length) continue;
        const bbWidth: 1 | 2 = band === "middle" ? 2 : 1;
        upsertLine(key, points, {
          color: resolveBbBandColor(colors, band),
          lineWidth: bbWidth,
          visible: bbVisibility?.[band] ?? false,
        });
      }
    }

    const ichiCfg = getIndicatorConfig("ichimoku");
    const ichiOut = indicators.indicators.ichimoku;
    if (ichiCfg?.enabled && ichiOut) {
      const colors = parsePeriodColors(ichiCfg.params.colors);
      for (const part of ICHIMOKU_LINE_ORDER) {
        const meta = ICHIMOKU_PART_META[part];
        const seriesKey = meta.seriesKey;
        if (!seriesKey) continue;
        const key = ichimokuOverlayKey(part);
        const points = ichiOut.series[seriesKey];
        if (!points?.length) continue;
        const lineWidth: 1 | 2 =
          part === "kijun" || part === "tenkan" ? 2 : 1;
        upsertLine(key, points, {
          color: resolveIchimokuColor(colors, part),
          lineWidth,
          visible: ichimokuVisibility?.[part] ?? false,
        });
      }
    }

    const keltnerCfg = getIndicatorConfig("keltner");
    const keltnerOut = indicators.indicators.keltner;
    const keltnerVis = auxIndicatorVisibility?.keltner === true;
    if (keltnerCfg?.enabled && keltnerOut) {
      const colors = parsePeriodColors(keltnerCfg.params.colors);
      if (keltnerOut.series.mid?.length) {
        upsertLine("keltner:mid", keltnerOut.series.mid, {
          color: colors.mid ?? "#06b6d4",
          lineWidth: 2,
          visible: keltnerVis,
        });
      }
      if (keltnerOut.series.upper?.length) {
        upsertLine("keltner:upper", keltnerOut.series.upper, {
          color: colors.upper ?? "#22d3ee",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: keltnerVis,
        });
      }
      if (keltnerOut.series.lower?.length) {
        upsertLine("keltner:lower", keltnerOut.series.lower, {
          color: colors.lower ?? "#67e8f9",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: keltnerVis,
        });
      }
    }

    const vwapCfg = getIndicatorConfig("vwap");
    const vwapOut = indicators.indicators.vwap;
    const vwapVis = auxIndicatorVisibility?.vwap === true;
    if (vwapCfg?.enabled && vwapOut) {
      const colors = parsePeriodColors(vwapCfg.params.colors);
      const vwapColor = colors.vwap ?? "#3b82f6";
      const band1 = colors.band1 ?? "#f97316";
      const band2 = colors.band2 ?? "#fb923c";
      const slope = vwapOut.latest.slope;
      const centerColor =
        slope == null || slope === 0
          ? vwapColor
          : slope > 0
            ? "#00c471"
            : "#f04452";
      if (vwapOut.series.vwap?.length) {
        upsertLine("vwap", vwapOut.series.vwap, {
          color: centerColor,
          lineWidth: 2,
          visible: vwapVis,
        });
      }
      if (vwapOut.series.upper1?.length) {
        upsertLine("vwap:upper1", vwapOut.series.upper1, {
          color: band1,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: vwapVis,
        });
      }
      if (vwapOut.series.lower1?.length) {
        upsertLine("vwap:lower1", vwapOut.series.lower1, {
          color: band1,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: vwapVis,
        });
      }
      if (vwapOut.series.upper2?.length) {
        upsertLine("vwap:upper2", vwapOut.series.upper2, {
          color: band2,
          lineWidth: 1,
          lineStyle: LineStyle.SparseDotted,
          visible: vwapVis,
        });
      }
      if (vwapOut.series.lower2?.length) {
        upsertLine("vwap:lower2", vwapOut.series.lower2, {
          color: band2,
          lineWidth: 1,
          lineStyle: LineStyle.SparseDotted,
          visible: vwapVis,
        });
      }
    }

    const psarCfg = getIndicatorConfig("psar");
    const psarOut = indicators.indicators.psar;
    const psarPoints = psarOut?.series.psar;
    if (psarCfg?.enabled && psarPoints?.length) {
      const bull = (psarOut?.latest.direction ?? 0) > 0;
      upsertLine("psar", psarPoints, {
        color: bull ? "#00c471" : "#f04452",
        lineWidth: 1,
        lineStyle: LineStyle.SparseDotted,
        visible: auxIndicatorVisibility?.psar === true,
      });
    }

    const stCfg = getIndicatorConfig("supertrend");
    const stOut = indicators.indicators.supertrend;
    const stPoints = stOut?.series.supertrend;
    if (stCfg?.enabled && stPoints?.length) {
      const bull = (stOut?.latest.direction ?? 0) > 0;
      upsertLine("supertrend", stPoints, {
        color: bull ? "#00c471" : "#f04452",
        lineWidth: 2,
        visible: auxIndicatorVisibility?.supertrend === true,
      });
    }

    for (const [key, line] of [...overlayRefs.current.entries()]) {
      if (wanted.has(key)) continue;
      try {
        chart.removeSeries(line);
      } catch {
        // Series may already be gone after chart recreate.
      }
      overlayRefs.current.delete(key);
    }
    // Re-read periods/colors from config each run (localStorage may change via modal).
  }, [
    indicators,
    timeframe,
    maVisibility,
    bbVisibility,
    ichimokuVisibility,
    auxIndicatorVisibility,
    bars.length,
  ]);

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
        const volMaWidth: 1 | 2 = avg.period <= 7 ? 2 : 1;
        const line = chart.addSeries(
          LineSeries,
          {
            color: volumeMaColor(avg.period),
            lineWidth: volMaWidth,
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
        const addRsiLine = (
          key: string,
          color: string,
          width: 1 | 2,
          data: ReturnType<typeof toLineData>,
        ) => {
          const series = chart.addSeries(
            LineSeries,
            {
              color,
              lineWidth: width,
              lastValueVisible: false,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
            },
            paneIndex,
          );
          series.setData(data);
          oscSeriesRefs.current.set(key, series);
          return series;
        };

        const line = addRsiLine(
          "rsi",
          "#c084fc",
          2,
          toLineData(out.rsi?.series.rsi),
        );
        const overbought =
          getIndicatorConfig("rsi")?.overbought ?? 70;
        const oversold = getIndicatorConfig("rsi")?.oversold ?? 30;
        line.createPriceLine({
          price: overbought,
          color: "rgba(240, 68, 82, 0.35)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: oversold,
          color: "rgba(0, 196, 113, 0.35)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });

        // Super RSI overlays: weighted + dynamic mid/upper/lower bands.
        if (out.rsi?.series.rsiUpper?.length) {
          addRsiLine(
            "rsiUpper",
            "#f9a8d4",
            1,
            toLineData(out.rsi.series.rsiUpper),
          );
        }
        if (out.rsi?.series.rsiLower?.length) {
          addRsiLine(
            "rsiLower",
            "#86efac",
            1,
            toLineData(out.rsi.series.rsiLower),
          );
        }
        if (out.rsi?.series.rsiMid?.length) {
          addRsiLine(
            "rsiMid",
            "#facc15",
            1,
            toLineData(out.rsi.series.rsiMid),
          );
        }
        if (out.rsi?.series.rsiWeighted?.length) {
          addRsiLine(
            "rsiWeighted",
            "#1f2937",
            2,
            toLineData(out.rsi.series.rsiWeighted),
          );
        }
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
        macdLine.createPriceLine({
          price: 0,
          color: "rgba(148, 163, 184, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });

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

      if (pane.id === "stoch") {
        const kLine = chart.addSeries(
          LineSeries,
          {
            color: "#2dd4bf",
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        kLine.setData(toLineData(out.stoch?.series.stochK));
        oscSeriesRefs.current.set("stochK", kLine);

        const overbought =
          getIndicatorConfig("stoch")?.overbought ?? 80;
        const oversold = getIndicatorConfig("stoch")?.oversold ?? 20;
        kLine.createPriceLine({
          price: overbought,
          color: "rgba(240, 68, 82, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        kLine.createPriceLine({
          price: 50,
          color: "rgba(148, 163, 184, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        kLine.createPriceLine({
          price: oversold,
          color: "rgba(0, 196, 113, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });

        const dLine = chart.addSeries(
          LineSeries,
          {
            color: "#fb923c",
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        dLine.setData(toLineData(out.stoch?.series.stochD));
        oscSeriesRefs.current.set("stochD", dLine);
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

      if (pane.id === "obv") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: "#38bdf8",
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.setData(toLineData(out.obv?.series.obv));
        oscSeriesRefs.current.set("obv", line);
        if (out.obv?.series.obvSignal?.length) {
          const sig = chart.addSeries(
            LineSeries,
            {
              color: "rgba(148, 163, 184, 0.85)",
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              lastValueVisible: false,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
            },
            paneIndex,
          );
          sig.setData(toLineData(out.obv.series.obvSignal));
          oscSeriesRefs.current.set("obvSignal", sig);
        }
        return;
      }

      if (pane.id === "adx") {
        const adxLine = chart.addSeries(
          LineSeries,
          {
            color: "#eab308",
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        adxLine.createPriceLine({
          price: 25,
          color: "rgba(148, 163, 184, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        adxLine.setData(toLineData(out.adx?.series.adx));
        oscSeriesRefs.current.set("adx", adxLine);

        const plusDI = chart.addSeries(
          LineSeries,
          {
            color: "#00c471",
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        plusDI.setData(toLineData(out.adx?.series.plusDI));
        oscSeriesRefs.current.set("adxPlusDI", plusDI);

        const minusDI = chart.addSeries(
          LineSeries,
          {
            color: "#f04452",
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        minusDI.setData(toLineData(out.adx?.series.minusDI));
        oscSeriesRefs.current.set("adxMinusDI", minusDI);
        return;
      }

      if (pane.id === "cci") {
        const cciCfg = getIndicatorConfig("cci");
        const overbought = cciCfg?.overbought ?? 100;
        const oversold = cciCfg?.oversold ?? -100;
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
          price: overbought,
          color: "rgba(240, 68, 82, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: 0,
          color: "rgba(148, 163, 184, 0.4)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: "",
        });
        line.createPriceLine({
          price: oversold,
          color: "rgba(0, 196, 113, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.setData(toLineData(out.cci?.series.cci));
        oscSeriesRefs.current.set("cci", line);
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

    if (
      auxIndicatorVisibility?.keltner === true &&
      getIndicatorConfig("keltner")?.enabled &&
      indicators.indicators.keltner?.series.mid?.length
    ) {
      items.push({
        label: `Keltner · ${fmtLegend(indicators.indicators.keltner.latest.mid)}`,
        color: "#06b6d4",
      });
    }

    if (
      auxIndicatorVisibility?.vwap === true &&
      getIndicatorConfig("vwap")?.enabled &&
      indicators.indicators.vwap?.series.vwap?.length
    ) {
      const slope = indicators.indicators.vwap.latest.slope;
      const color =
        slope == null || slope === 0
          ? "#3b82f6"
          : slope > 0
            ? "#00c471"
            : "#f04452";
      items.push({
        label: `VWAP · ${fmtLegend(indicators.indicators.vwap.latest.vwap)}`,
        color,
      });
      items.push({
        label: "VWAP bands",
        color: "#f97316",
      });
    }

    if (
      auxIndicatorVisibility?.psar === true &&
      getIndicatorConfig("psar")?.enabled &&
      indicators.indicators.psar?.series.psar?.length
    ) {
      const bull = (indicators.indicators.psar.latest.direction ?? 0) > 0;
      items.push({
        label: `PSAR · ${fmtLegend(indicators.indicators.psar.latest.psar)}`,
        color: bull ? "#00c471" : "#f04452",
      });
    }

    if (
      auxIndicatorVisibility?.supertrend === true &&
      getIndicatorConfig("supertrend")?.enabled &&
      indicators.indicators.supertrend?.series.supertrend?.length
    ) {
      const bull =
        (indicators.indicators.supertrend.latest.direction ?? 0) > 0;
      items.push({
        label: `Supertrend · ${fmtLegend(indicators.indicators.supertrend.latest.supertrend)}`,
        color: bull ? "#00c471" : "#f04452",
      });
    }

    return items;
  }, [indicators, maVisibility, bbVisibility, auxIndicatorVisibility]);

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
        color: patternAccentColor(hit.direction),
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

  const rsiStrategyHitLegend = useMemo(() => {
    if (!rsiStrategies?.recent.length || !chartRsiStrategyVisibility) return [];
    return rsiStrategies.recent
      .filter((hit) => chartRsiStrategyVisibility[hit.id])
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
  }, [rsiStrategies, chartRsiStrategyVisibility]);

  const volumeStrategyHitLegend = useMemo(() => {
    if (!volumeStrategies?.recent.length || !chartVolumeStrategyVisibility)
      return [];
    return volumeStrategies.recent
      .filter((hit) => chartVolumeStrategyVisibility[hit.id])
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
  }, [volumeStrategies, chartVolumeStrategyVisibility]);

  const macdStrategyHitLegend = useMemo(() => {
    if (!macdStrategies?.recent.length || !chartMacdStrategyVisibility)
      return [];
    return macdStrategies.recent
      .filter((hit) => chartMacdStrategyVisibility[hit.id])
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
  }, [macdStrategies, chartMacdStrategyVisibility]);

  const stochStrategyHitLegend = useMemo(() => {
    if (!stochStrategies?.recent.length || !chartStochStrategyVisibility)
      return [];
    return stochStrategies.recent
      .filter((hit) => chartStochStrategyVisibility[hit.id])
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
  }, [stochStrategies, chartStochStrategyVisibility]);

  const ichimokuStrategyHitLegend = useMemo(() => {
    if (!ichimokuStrategies?.recent.length || !chartIchimokuStrategyVisibility)
      return [];
    return ichimokuStrategies.recent
      .filter((hit) => chartIchimokuStrategyVisibility[hit.id])
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
  }, [ichimokuStrategies, chartIchimokuStrategyVisibility]);

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
  }, [bars, chartMarkers, barHighlights, timeframe, showVolume, volumeSnapshot]);

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
    ichimokuVisibility,
    indicators,
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
  const visibleFibLevels = FIB_RETRACEMENT_LEVELS.filter(
    (r) => fibLevelVisibility?.[r] === true,
  );
  /** Legend only when something is actually shown (not just a stored anchor). */
  const showFibLegend =
    hasFib && (showFibAnchors || visibleFibLevels.length > 0);

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
                  <span
                    style={{
                      color:
                        ohlcvReadout.changePct == null
                          ? undefined
                          : ohlcvReadout.changePct > 0
                            ? "#00c471"
                            : ohlcvReadout.changePct < 0
                              ? "#f04452"
                              : undefined,
                    }}
                    className={
                      ohlcvReadout.changePct == null ||
                      ohlcvReadout.changePct === 0
                        ? "text-text-primary"
                        : undefined
                    }
                  >
                    {fmtChangePct(ohlcvReadout.changePct)}
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
                  <span
                    className="tabular-nums text-[11px] font-semibold"
                    style={{ color: item.color }}
                  >
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
              {classicalHitLegend.map((item) => {
                const datePart = item.detail.split(" · ")[0] ?? item.detail;
                const rest = item.detail.includes(" · ")
                  ? item.detail.slice(datePart.length)
                  : "";
                return (
                  <span key={item.key} className="flex items-center gap-1.5">
                    <span
                      className="font-mono text-[10px] font-semibold"
                      style={{ color: item.color }}
                    >
                      {item.text}
                    </span>
                    <span
                      className="tabular-nums text-[11px] font-semibold"
                      style={{ color: item.color }}
                    >
                      {datePart}
                    </span>
                    {rest && (
                      <span className="tabular-nums text-text-tertiary">
                        {rest}
                      </span>
                    )}
                  </span>
                );
              })}
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

          {patternStrategyHitLegend.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>패턴 전략:</span>
              {patternStrategyHitLegend.map((item) => (
                <span key={item.key} className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: item.color }}
                  >
                    {item.text}
                  </span>
                  <span
                    className="tabular-nums text-[11px] font-semibold"
                    style={{ color: item.color }}
                  >
                    {item.detail}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            patternStrategyLegend.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                <span>패턴 전략:</span>
                {patternStrategyLegend.map((item) => (
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

          {rsiStrategyHitLegend.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>RSI 전략:</span>
              {rsiStrategyHitLegend.map((item) => (
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
            rsiStrategyLegend.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                <span>RSI 전략:</span>
                {rsiStrategyLegend.map((item) => (
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

          {volumeStrategyHitLegend.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>거래량 전략:</span>
              {volumeStrategyHitLegend.map((item) => (
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
            volumeStrategyLegend.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                <span>거래량 전략:</span>
                {volumeStrategyLegend.map((item) => (
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

          {macdStrategyHitLegend.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>MACD 전략:</span>
              {macdStrategyHitLegend.map((item) => (
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
            macdStrategyLegend.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                <span>MACD 전략:</span>
                {macdStrategyLegend.map((item) => (
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

          {stochStrategyHitLegend.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>스토캐 전략:</span>
              {stochStrategyHitLegend.map((item) => (
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
            stochStrategyLegend.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                <span>스토캐 전략:</span>
                {stochStrategyLegend.map((item) => (
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

          {ichimokuStrategyHitLegend.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>일목 전략:</span>
              {ichimokuStrategyHitLegend.map((item) => (
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
            ichimokuStrategyLegend.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                <span>일목 전략:</span>
                {ichimokuStrategyLegend.map((item) => (
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

          {journalEntries && journalEntries.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <span>매매 기록 ({journalEntries.length}):</span>
              {journalEntries.slice(-8).map((e) => (
                <span key={e.id} className="tabular-nums text-text-tertiary">
                  <span
                    className={
                      e.side === "buy" ? "text-positive" : "text-negative"
                    }
                  >
                    {e.side === "buy" ? "매수" : "매도"}
                  </span>{" "}
                  {e.date} {e.price}
                </span>
              ))}
            </div>
          )}

          {showStrategyConfluence &&
            strategyConfluences &&
            strategyConfluences.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                <span>전략 겹침 ({strategyConfluences.length}):</span>
                {strategyConfluences.slice(-8).map((c) => (
                  <span
                    key={`${c.barIndex}-${c.direction}`}
                    className="tabular-nums text-text-tertiary"
                  >
                    {c.date} ×{c.hits.length}{" "}
                    {c.direction === "bullish" ? "↑" : "↓"} (
                    {c.hits.map((h) => h.label).join(", ")})
                  </span>
                ))}
              </div>
            )}

          {showFibLegend && (
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
              {visibleFibLevels.map((ratio) => (
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
