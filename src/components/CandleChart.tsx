import { useEffect, useMemo, useRef, useState } from "react";
import {
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
} from "lightweight-charts";
import type { OHLCVBar, Timeframe, IndicatorResults } from "@/lib/types";
import type { CandlePatternId, CandlePatternResult } from "@/lib/evaluation/candlePatterns";
import type { SwingStructureResult } from "@/lib/evaluation/swingStructure";
import type { ElliottWaveResult } from "@/lib/evaluation/elliottWaves";
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
  visiblePatternLegend,
} from "@/lib/chart/patternMarkers";
import { patternBarHighlights } from "@/lib/chart/patternBarHighlights";
import {
  recentWindowMinBarIndex,
} from "@/lib/strategyRecency";
import {
  visibleStructureLegend,
} from "@/lib/chart/structureMarkers";
import {
  visibleBbStrategyLegend,
} from "@/lib/chart/bbStrategyMarkers";
import {
  visibleClassicalPatternInstances,
  visibleClassicalPatternLegend,
} from "@/lib/chart/classicalPatternMarkers";
import {
  visiblePatternStrategyLegend,
} from "@/lib/chart/patternStrategyMarkers";
import { collectVisibleRiskRewardPlans } from "@/lib/chart/collectRiskRewardPlans";
import {
  formatRewardRisk,
} from "@/lib/evaluation/riskReward";
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
  BOLLINGER,
  CHART_SURFACE,
  computeMainPaneHeight,
  DIRECTION,
  OSC_LEVEL,
  SCALE_MARGINS,
  SERIES,
  SIGNAL,
} from "@/lib/chart/chartTheme";
import {
  computeVolumeAverages,
  getVolumeMaPeriods,
  volumeMaColor,
} from "@/lib/evaluation/volumeMa";
import type { BbStrategyResult } from "@/lib/evaluation/bbStrategies";
import type { BbStrategyId } from "@/lib/bbStrategyMeta";
import type { RsiStrategyResult } from "@/lib/evaluation/rsiStrategies";
import type { RsiStrategyId } from "@/lib/rsiStrategyMeta";
import {
  visibleRsiStrategyLegend,
} from "@/lib/chart/rsiStrategyMarkers";
import type { VolumeStrategyResult } from "@/lib/evaluation/volumeStrategies";
import type { VolumeStrategyId } from "@/lib/volumeStrategyMeta";
import {
  visibleVolumeStrategyLegend,
} from "@/lib/chart/volumeStrategyMarkers";
import type { ComboStrategyResult } from "@/lib/evaluation/comboStrategies";
import type { ComboStrategyId } from "@/lib/comboStrategyMeta";
import {
  visibleComboStrategyLegend,
} from "@/lib/chart/comboStrategyMarkers";
import {
  type MarkerTooltip,
} from "@/lib/chart/markerTooltips";
import {
  visibleMacdStrategyLegend,
} from "@/lib/chart/macdStrategyMarkers";
import {
  visibleStochStrategyLegend,
} from "@/lib/chart/stochStrategyMarkers";
import {
  visibleIchimokuStrategyLegend,
} from "@/lib/chart/ichimokuStrategyMarkers";
import type { IchimokuStrategyResult } from "@/lib/evaluation/ichimokuStrategies";
import type { IchimokuStrategyId } from "@/lib/ichimokuStrategyMeta";
import type { MacdStrategyResult } from "@/lib/evaluation/macdStrategies";
import type { MacdStrategyId } from "@/lib/macdStrategyMeta";
import type { ClassicStrategyResult } from "@/lib/evaluation/classicStrategies";
import type { ClassicStrategyId } from "@/lib/classicStrategyMeta";
import {
  visibleClassicStrategyLegend,
} from "@/lib/chart/classicStrategyMarkers";
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
import { visibleSrZones } from "@/lib/chart/srZoneOverlay";
import type { SwingChartToggleId } from "@/lib/swingStructureStore";
import {
  anyElliottWaveVisible,
  type ElliottWaveToggleId,
} from "@/lib/elliottWaveStore";
import type { SrChartToggleId } from "@/lib/srZoneStore";
import {
  type TrendlineChartToggleId,
} from "@/lib/trendlineStore";
import type { Trendline } from "@/lib/evaluation/trendlines";
import {
  FIB_RETRACEMENT_LEVELS,
  findFibConfluences,
  type FibExtraId,
  type FibLevelRatio,
  type FibRetracement,
} from "@/lib/fibonacciStore";
import type { AuxIndicatorId } from "@/lib/auxIndicatorStore";
import type { TradeJournalEntry } from "@/lib/tradeJournalStore";
import type { StrategyConfluence } from "@/lib/evaluation/strategyConfluence";
import { Card } from "./ui/Card";
import { ChartLegend } from "./chart/ChartLegend";
import {
  ChartReadout,
  fmtPrice,
  type OhlcvReadout,
} from "./chart/ChartReadout";
import { useFibonacciDraw } from "./chart/useFibonacciDraw";
import { useOverlayCanvas } from "./chart/useOverlayCanvas";
import { syncPaneLayout, usePaneLayout } from "./chart/usePaneLayout";
import { useSeriesMarkers } from "./chart/useSeriesMarkers";
import { dailyChangePct, useChartInstance } from "./chart/useChartInstance";
import { SignalSummary } from "./chart/SignalSummary";

type OscSeries = ISeriesApi<"Line"> | ISeriesApi<"Histogram">;

function fmtLegend(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

interface Props {
  bars: OHLCVBar[];
  timeframe: Timeframe;
  patterns?: CandlePatternResult;
  chartPatternVisibility?: Record<CandlePatternId, boolean>;
  structure?: SwingStructureResult;
  chartStructureVisibility?: Record<SwingChartToggleId, boolean>;
  elliottWaves?: ElliottWaveResult;
  chartElliottWaveVisibility?: Record<ElliottWaveToggleId, boolean>;
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
  comboStrategies?: ComboStrategyResult;
  chartComboStrategyVisibility?: Record<ComboStrategyId, boolean>;
  macdStrategies?: MacdStrategyResult;
  chartMacdStrategyVisibility?: Record<MacdStrategyId, boolean>;
  classicStrategies?: ClassicStrategyResult;
  chartClassicStrategyVisibility?: Record<ClassicStrategyId, boolean>;
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
  /** Draw entry/stop/target RR boxes for visible strategy hits (v1). */
  showRiskReward?: boolean;
  /**
   * When enabled, only show strategy / candle / chart-pattern markers
   * (and related highlights) inside the last N bars. Persisted in sidebar.
   */
  recentSignalWindow?: { enabled: boolean; bars: number } | null;
}

function useViewportChartHeight(
  fixed: number | undefined,
  auxPaneHeights: number[],
) {
  const auxKey = auxPaneHeights.join(",");
  const compute = () =>
    computeMainPaneHeight({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      auxPaneHeights,
    });

  const [height, setHeight] = useState(fixed ?? 720);

  useEffect(() => {
    if (fixed != null) {
      setHeight(fixed);
      return;
    }
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setHeight(compute()));
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
    };
    // auxKey serializes heights so we don't depend on array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixed, auxKey]);

  return height;
}

export function CandleChart({
  bars,
  timeframe,
  patterns,
  chartPatternVisibility,
  structure,
  chartStructureVisibility,
  elliottWaves,
  chartElliottWaveVisibility,
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
  comboStrategies,
  chartComboStrategyVisibility,
  macdStrategies,
  chartMacdStrategyVisibility,
  classicStrategies,
  chartClassicStrategyVisibility,
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
  showRiskReward = true,
  recentSignalWindow = null,
}: Props) {
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

  // Mutable refs so event handlers always read fresh values without re-subscribing
  const barsRef = useRef<OHLCVBar[]>(bars);
  barsRef.current = bars;
  const [hoverOhlcv, setHoverOhlcv] = useState<OhlcvReadout | null>(null);
  const [markerHover, setMarkerHover] = useState<{
    x: number;
    y: number;
    tip: MarkerTooltip;
  } | null>(null);
  const setMarkerHoverRef = useRef(setMarkerHover);
  setMarkerHoverRef.current = setMarkerHover;

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

  const recentMinBarIndex = useMemo(() => {
    if (!recentSignalWindow?.enabled || !bars.length) return null;
    return recentWindowMinBarIndex(bars.length, recentSignalWindow.bars);
  }, [recentSignalWindow?.enabled, recentSignalWindow?.bars, bars.length]);

  const { markersRef, markerTooltipsRef, bindMarkers } =
    useSeriesMarkers({
      bars,
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
      comboStrategies,
      chartComboStrategyVisibility,
      macdStrategies,
      chartMacdStrategyVisibility,
      classicStrategies,
      chartClassicStrategyVisibility,
      stochStrategies,
      chartStochStrategyVisibility,
      ichimokuStrategies,
      chartIchimokuStrategyVisibility,
      indicators,
      auxIndicatorVisibility,
      journalEntries,
      strategyConfluences,
      showStrategyConfluence,
      recentMinBarIndex,
      recentSignalWindow,
    });

  const barHighlights = useMemo(() => {
    const base = patternBarHighlights(
      patterns,
      chartPatternVisibility,
      classicalPatterns,
      chartClassicalPatternVisibility,
      recentMinBarIndex,
    );
    if (auxIndicatorVisibility?.equivolume !== true) return base;
    const shapePts = indicators?.indicators.equivolume?.series.shape;
    if (!shapePts?.length) return base;
    const out = new Map(base);
    for (const p of shapePts) {
      if (out.has(p.date)) continue; // pattern highlight wins
      if (p.value === 1) {
        out.set(p.date, {
          color: "rgba(34, 211, 238, 0.35)",
          borderColor: SERIES.cyan,
          wickColor: SERIES.cyan,
        });
      } else if (p.value === 3) {
        out.set(p.date, {
          color: "rgba(251, 146, 60, 0.35)",
          borderColor: SERIES.orange,
          wickColor: SERIES.orange,
        });
      }
    }
    return out;
  }, [
    patterns,
    chartPatternVisibility,
    classicalPatterns,
    chartClassicalPatternVisibility,
    auxIndicatorVisibility?.equivolume,
    indicators?.indicators.equivolume?.series.shape,
    recentMinBarIndex,
  ]);

  const srZones = useMemo(
    () =>
      visibleSrZones(
        supportResistance,
        chartSrVisibility ?? ({} as Record<SrChartToggleId, boolean>),
      ),
    [supportResistance, chartSrVisibility],
  );
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
  const comboStrategyLegend = useMemo(
    () =>
      chartComboStrategyVisibility
        ? visibleComboStrategyLegend(chartComboStrategyVisibility)
        : [],
    [chartComboStrategyVisibility],
  );
  const macdStrategyLegend = useMemo(
    () =>
      chartMacdStrategyVisibility
        ? visibleMacdStrategyLegend(chartMacdStrategyVisibility)
        : [],
    [chartMacdStrategyVisibility],
  );
  const classicStrategyLegend = useMemo(
    () =>
      chartClassicStrategyVisibility
        ? visibleClassicStrategyLegend(chartClassicStrategyVisibility)
        : [],
    [chartClassicStrategyVisibility],
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
      .filter((hit) => chartPatternStrategyVisibility[hit.id] && (recentMinBarIndex == null || hit.barIndex >= recentMinBarIndex))
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.instanceKey}-${hit.barIndex}`,
        text: hit.label,
        detail: [
          hit.date,
          hit.rewardRisk != null ? formatRewardRisk(hit.rewardRisk) : null,
          hit.summary,
        ]
          .filter(Boolean)
          .join(" · "),
        color: patternAccentColor(hit.direction),
      }));
  }, [patternStrategies, chartPatternStrategyVisibility, recentMinBarIndex, bars]);

  const riskRewardPlans = useMemo(() => {
    if (!showRiskReward || !bars.length) return [];
    return collectVisibleRiskRewardPlans({
      bars,
      patternStrategies,
      patternVisibility: chartPatternStrategyVisibility,
      minBarIndex: recentMinBarIndex,
      bags: [
        {
          family: "bb",
          bag: bbStrategies,
          visibility: chartBbStrategyVisibility,
        },
        {
          family: "ichimoku",
          bag: ichimokuStrategies,
          visibility: chartIchimokuStrategyVisibility,
        },
        {
          family: "rsi",
          bag: rsiStrategies,
          visibility: chartRsiStrategyVisibility,
        },
        {
          family: "volume",
          bag: volumeStrategies,
          visibility: chartVolumeStrategyVisibility,
        },
        {
          family: "combo",
          bag: comboStrategies,
          visibility: chartComboStrategyVisibility,
        },
        {
          family: "macd",
          bag: macdStrategies,
          visibility: chartMacdStrategyVisibility,
        },
        {
          family: "classic",
          bag: classicStrategies,
          visibility: chartClassicStrategyVisibility,
        },
        {
          family: "stoch",
          bag: stochStrategies,
          visibility: chartStochStrategyVisibility,
        },
      ],
    });
  }, [
    showRiskReward,
    bars,
    patternStrategies,
    chartPatternStrategyVisibility,
    bbStrategies,
    chartBbStrategyVisibility,
    ichimokuStrategies,
    chartIchimokuStrategyVisibility,
    rsiStrategies,
    chartRsiStrategyVisibility,
    volumeStrategies,
    chartVolumeStrategyVisibility,
    comboStrategies,
    chartComboStrategyVisibility,
    macdStrategies,
    chartMacdStrategyVisibility,
    classicStrategies,
    chartClassicStrategyVisibility,
    stochStrategies,
    chartStochStrategyVisibility,
    recentMinBarIndex,
  ]);

  const visibleClassicalInstances = useMemo(
    () =>
      visibleClassicalPatternInstances(
        classicalPatterns,
        chartClassicalPatternVisibility ??
          ({} as Record<ChartPatternId, boolean>),
        recentMinBarIndex,
      ),
    [classicalPatterns, chartClassicalPatternVisibility, recentMinBarIndex, bars],
  );
  const elliottWaveLegend = useMemo(() => {
    if (!elliottWaves || !chartElliottWaveVisibility) return [];
    if (!anyElliottWaveVisible(chartElliottWaveVisibility)) return [];
    const patterns = elliottWaves.primary.length
      ? elliottWaves.primary
      : elliottWaves.patterns.slice(0, 2);
    return patterns
      .filter((p) => {
        if (p.kind === "impulse" && !chartElliottWaveVisibility.impulse)
          return false;
        if (p.kind === "corrective" && !chartElliottWaveVisibility.corrective)
          return false;
        return true;
      })
      .map((p) => ({
        key: p.id,
        text: p.kind === "impulse" ? "추진" : "조정",
        detail: `${p.summary} · 점수 ${p.score}`,
        color: p.direction === "bullish" ? SIGNAL.bullish : SIGNAL.bearish,
      }));
  }, [elliottWaves, chartElliottWaveVisibility]);

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

  const { overlayRef, drawChartOverlays } = useOverlayCanvas({
    chartRef,
    candleRef,
    wrapRef,
    barsRef,
    srZones,
    visibleTrendlines,
    chartTrendlineColors,
    visibleClassicalInstances,
    classicStrategies,
    chartClassicStrategyVisibility,
    fibRetracement,
    fibLevelVisibility,
    fibExtraVisibility,
    elliottWaves,
    chartElliottWaveVisibility,
    riskRewardPlans,
    indicators,
    ichimokuVisibility,
  });

  const { pickHint, onFibClick } = useFibonacciDraw({
    fibDrawMode,
    onFibChange,
    barsRef,
    drawChartOverlays,
  });

  const { paneLabelTops } = usePaneLayout({
    chartRef,
    containerRef,
    wrapRef,
    totalHeight,
    mainHeight,
    showVolume,
    oscPanes,
    timeframe,
    captureTimeRange,
    restoreTimeRange,
    drawChartOverlays,
  });

  useChartInstance({
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
  });

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
          color: colors.mid ?? SERIES.cyan,
          lineWidth: 2,
          visible: keltnerVis,
        });
      }
      if (keltnerOut.series.upper?.length) {
        upsertLine("keltner:upper", keltnerOut.series.upper, {
          color: colors.upper ?? BOLLINGER.upper,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: keltnerVis,
        });
      }
      if (keltnerOut.series.lower?.length) {
        upsertLine("keltner:lower", keltnerOut.series.lower, {
          color: colors.lower ?? BOLLINGER.lower,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: keltnerVis,
        });
      }
    }

    const bbWideCfg = getIndicatorConfig("bbWide");
    const bbWideOut = indicators.indicators.bbWide;
    const bbWideVis = auxIndicatorVisibility?.bbWide === true;
    if (bbWideCfg?.enabled && bbWideOut) {
      const colors = parsePeriodColors(bbWideCfg.params.colors);
      if (bbWideOut.series.middle?.length) {
        upsertLine("bbWide:middle", bbWideOut.series.middle, {
          color: colors.middle ?? BOLLINGER.mid,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: bbWideVis,
        });
      }
      if (bbWideOut.series.upper?.length) {
        upsertLine("bbWide:upper", bbWideOut.series.upper, {
          color: colors.upper ?? SIGNAL.bearish,
          lineWidth: 1,
          visible: bbWideVis,
        });
      }
      if (bbWideOut.series.lower?.length) {
        upsertLine("bbWide:lower", bbWideOut.series.lower, {
          color: colors.lower ?? SIGNAL.bearish,
          lineWidth: 1,
          visible: bbWideVis,
        });
      }
    }

    const vwapCfg = getIndicatorConfig("vwap");
    const vwapOut = indicators.indicators.vwap;
    const vwapVis = auxIndicatorVisibility?.vwap === true;
    if (vwapCfg?.enabled && vwapOut) {
      const colors = parsePeriodColors(vwapCfg.params.colors);
      const vwapColor = colors.vwap ?? SERIES.accent;
      const band1 = colors.band1 ?? SERIES.orangeDeep;
      const band2 = colors.band2 ?? SERIES.orange;
      const slope = vwapOut.latest.slope;
      const centerColor =
        slope == null || slope === 0
          ? vwapColor
          : slope > 0
            ? DIRECTION.up
            : DIRECTION.down;
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

    const foreverCfg = getIndicatorConfig("forever_vwap");
    const foreverOut = indicators.indicators.forever_vwap;
    const foreverVis = auxIndicatorVisibility?.forever_vwap === true;
    if (foreverCfg?.enabled && foreverOut) {
      const colors = parsePeriodColors(foreverCfg.params.colors);
      const up = colors.up ?? SERIES.orangeDeep;
      const down = colors.down ?? SERIES.purple;
      const anchoredColor = colors.anchored ?? SERIES.slate;
      const trend = foreverOut.latest.trend;
      const centerColor =
        trend == null || trend === 0 ? up : trend > 0 ? up : down;
      if (foreverOut.series.vwap?.length) {
        upsertLine("forever_vwap", foreverOut.series.vwap, {
          color: centerColor,
          lineWidth: 2,
          visible: foreverVis,
        });
      }
      if (foreverOut.series.anchored?.length) {
        upsertLine("forever_vwap:anchored", foreverOut.series.anchored, {
          color: anchoredColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: foreverVis,
        });
      }
    }

    const psarCfg = getIndicatorConfig("psar");
    const psarOut = indicators.indicators.psar;
    const psarPoints = psarOut?.series.psar;
    if (psarCfg?.enabled && psarPoints?.length) {
      const bull = (psarOut?.latest.direction ?? 0) > 0;
      upsertLine("psar", psarPoints, {
        color: bull ? DIRECTION.up : DIRECTION.down,
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
        color: bull ? DIRECTION.up : DIRECTION.down,
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
      syncPaneLayout({
        chart,
        container: containerRef.current,
        wrap: wrapRef.current,
        totalHeight,
        mainHeight,
        showVolume,
        oscPanes,
      });
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
      volume.priceScale().applyOptions({
        scaleMargins: { ...SCALE_MARGINS.volume },
      });
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
          series.priceScale().applyOptions({
          scaleMargins: { ...SCALE_MARGINS.oscillator },
        });
          series.setData(data);
          oscSeriesRefs.current.set(key, series);
          return series;
        };

        const line = addRsiLine(
          "rsi",
          SERIES.purple,
          2,
          toLineData(out.rsi?.series.rsi),
        );
        const overbought =
          getIndicatorConfig("rsi")?.overbought ?? 70;
        const oversold = getIndicatorConfig("rsi")?.oversold ?? 30;
        line.createPriceLine({
          price: overbought,
          color: OSC_LEVEL.overbought,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: oversold,
          color: OSC_LEVEL.oversold,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });

        // Super RSI overlays: weighted + dynamic mid/upper/lower bands.
        if (out.rsi?.series.rsiUpper?.length) {
          addRsiLine(
            "rsiUpper",
            SERIES.pink,
            1,
            toLineData(out.rsi.series.rsiUpper),
          );
        }
        if (out.rsi?.series.rsiLower?.length) {
          addRsiLine(
            "rsiLower",
            SERIES.teal,
            1,
            toLineData(out.rsi.series.rsiLower),
          );
        }
        if (out.rsi?.series.rsiMid?.length) {
          addRsiLine(
            "rsiMid",
            SERIES.yellow,
            1,
            toLineData(out.rsi.series.rsiMid),
          );
        }
        if (out.rsi?.series.rsiWeighted?.length) {
          addRsiLine(
            "rsiWeighted",
            SERIES.slateDark,
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
            color: SERIES.blue,
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
            color: SERIES.amber,
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
            color: SERIES.teal,
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
          color: OSC_LEVEL.overboughtStrong,
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
          color: OSC_LEVEL.oversoldStrong,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });

        const dLine = chart.addSeries(
          LineSeries,
          {
            color: SERIES.orange,
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
            color: SERIES.cyan,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 80,
          color: OSC_LEVEL.overboughtStrong,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: 20,
          color: OSC_LEVEL.oversoldStrong,
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
            color: SERIES.slate,
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
            color: SERIES.sky,
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

      if (pane.id === "ad") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.violet,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.setData(toLineData(out.ad?.series.ad));
        oscSeriesRefs.current.set("ad", line);
        return;
      }

      if (pane.id === "chaikin") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.pink,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 0,
          color: "rgba(148, 163, 184, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: "",
        });
        line.setData(toLineData(out.chaikin?.series.chaikin));
        oscSeriesRefs.current.set("chaikin", line);
        return;
      }

      if (pane.id === "eom") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.teal,
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 0,
          color: "rgba(148, 163, 184, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: "",
        });
        line.setData(toLineData(out.eom?.series.eom));
        oscSeriesRefs.current.set("eom", line);
        if (out.eom?.series.eomSmooth?.length) {
          const smooth = chart.addSeries(
            LineSeries,
            {
              color: SERIES.amber,
              lineWidth: 2,
              lastValueVisible: false,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
            },
            paneIndex,
          );
          smooth.setData(toLineData(out.eom.series.eomSmooth));
          oscSeriesRefs.current.set("eomSmooth", smooth);
        }
        return;
      }

      if (pane.id === "obvMid") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.cyan,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.setData(toLineData(out.obvMid?.series.obvMid));
        oscSeriesRefs.current.set("obvMid", line);
        return;
      }

      if (pane.id === "equivolume") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.orange,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 1,
          color: "rgba(148, 163, 184, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: "",
        });
        line.setData(toLineData(out.equivolume?.series.boxRatio));
        oscSeriesRefs.current.set("equivolume", line);
        return;
      }

      if (pane.id === "adx") {
        const adxLine = chart.addSeries(
          LineSeries,
          {
            color: SERIES.yellow,
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
            color: DIRECTION.up,
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
            color: DIRECTION.down,
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
            color: SERIES.violet,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: overbought,
          color: OSC_LEVEL.overboughtStrong,
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
          color: OSC_LEVEL.oversoldStrong,
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
            color: SERIES.violet,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 1,
          color: OSC_LEVEL.overboughtSoft,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: 0,
          color: OSC_LEVEL.oversoldSoft,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.setData(toLineData(out.bb?.series.bbPercentB));
        oscSeriesRefs.current.set("bbPercentB", line);
        return;
      }

      if (pane.id === "disparity") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.pink,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 0,
          color: "rgba(148, 163, 184, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.setData(toLineData(out.disparity?.series.disparity));
        oscSeriesRefs.current.set("disparity", line);
      }
    });

    syncPaneLayout({
      chart,
      container: containerRef.current,
      wrap: wrapRef.current,
      totalHeight,
      mainHeight,
      showVolume,
      oscPanes,
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
        color: SERIES.cyan,
      });
    }

    if (
      auxIndicatorVisibility?.bbWide === true &&
      getIndicatorConfig("bbWide")?.enabled &&
      indicators.indicators.bbWide?.series.middle?.length
    ) {
      items.push({
        label: `WB(44) · ${fmtLegend(indicators.indicators.bbWide.latest.middle)}`,
        color: SIGNAL.bearish,
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
          ? SERIES.accent
          : slope > 0
            ? DIRECTION.up
            : DIRECTION.down;
      items.push({
        label: `VWAP · ${fmtLegend(indicators.indicators.vwap.latest.vwap)}`,
        color,
      });
      items.push({
        label: "VWAP bands",
        color: SERIES.orangeDeep,
      });
    }

    if (
      auxIndicatorVisibility?.forever_vwap === true &&
      getIndicatorConfig("forever_vwap")?.enabled &&
      indicators.indicators.forever_vwap?.series.vwap?.length
    ) {
      const trend = indicators.indicators.forever_vwap.latest.trend;
      const color =
        trend == null || trend === 0
          ? SERIES.orangeDeep
          : trend > 0
            ? SERIES.orangeDeep
            : SERIES.purple;
      items.push({
        label: `포에버 VWAP · ${fmtLegend(indicators.indicators.forever_vwap.latest.vwap)}`,
        color,
      });
      items.push({
        label: "앵커드 VWAP",
        color: SERIES.slate,
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
        color: bull ? DIRECTION.up : DIRECTION.down,
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
        color: bull ? DIRECTION.up : DIRECTION.down,
      });
    }

    return items;
  }, [indicators, maVisibility, bbVisibility, auxIndicatorVisibility]);

  const patternHitLegend = useMemo(() => {
    if (!patterns?.recent.length || !chartPatternVisibility) return [];
    return patterns.recent
      .filter(
        (hit) =>
          chartPatternVisibility[hit.id] &&
          (recentMinBarIndex == null || hit.barIndex >= recentMinBarIndex),
      )
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.barIndex}`,
        text: hit.label,
        detail: hit.date,
        color: patternAccentColor(hit.direction),
      }));
  }, [patterns, chartPatternVisibility, recentMinBarIndex]);

  const bbStrategyHitLegend = useMemo(() => {
    if (!bbStrategies?.recent.length || !chartBbStrategyVisibility) return [];
    return bbStrategies.recent
      .filter((hit) => chartBbStrategyVisibility[hit.id] && (recentMinBarIndex == null || hit.barIndex >= recentMinBarIndex))
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.barIndex}`,
        text: hit.label,
        detail: (() => {
          const c = bars[hit.barIndex]?.close;
          const px = c != null && Number.isFinite(c) ? ` · ${fmtPrice(c)}` : "";
          return `${hit.date}${px} · ${hit.summary}`;
        })(),
        color:
          hit.direction === "bullish"
            ? DIRECTION.up
            : hit.direction === "bearish"
              ? DIRECTION.down
              : CHART_SURFACE.text,
      }));
  }, [bbStrategies, chartBbStrategyVisibility, recentMinBarIndex, bars]);

  const rsiStrategyHitLegend = useMemo(() => {
    if (!rsiStrategies?.recent.length || !chartRsiStrategyVisibility) return [];
    return rsiStrategies.recent
      .filter((hit) => chartRsiStrategyVisibility[hit.id] && (recentMinBarIndex == null || hit.barIndex >= recentMinBarIndex))
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.barIndex}`,
        text: hit.label,
        detail: (() => {
          const c = bars[hit.barIndex]?.close;
          const px = c != null && Number.isFinite(c) ? ` · ${fmtPrice(c)}` : "";
          return `${hit.date}${px} · ${hit.summary}`;
        })(),
        color:
          hit.direction === "bullish"
            ? DIRECTION.up
            : hit.direction === "bearish"
              ? DIRECTION.down
              : CHART_SURFACE.text,
      }));
  }, [rsiStrategies, chartRsiStrategyVisibility, recentMinBarIndex, bars]);

  const volumeStrategyHitLegend = useMemo(() => {
    if (!volumeStrategies?.recent.length || !chartVolumeStrategyVisibility)
      return [];
    return volumeStrategies.recent
      .filter((hit) => chartVolumeStrategyVisibility[hit.id] && (recentMinBarIndex == null || hit.barIndex >= recentMinBarIndex))
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.barIndex}`,
        text: hit.label,
        detail: (() => {
          const c = bars[hit.barIndex]?.close;
          const px = c != null && Number.isFinite(c) ? ` · ${fmtPrice(c)}` : "";
          return `${hit.date}${px} · ${hit.summary}`;
        })(),
        color:
          hit.direction === "bullish"
            ? DIRECTION.up
            : hit.direction === "bearish"
              ? DIRECTION.down
              : CHART_SURFACE.text,
      }));
  }, [volumeStrategies, chartVolumeStrategyVisibility, recentMinBarIndex, bars]);

  const comboStrategyHitLegend = useMemo(() => {
    if (!comboStrategies?.recent.length || !chartComboStrategyVisibility)
      return [];
    return comboStrategies.recent
      .filter((hit) => chartComboStrategyVisibility[hit.id] && (recentMinBarIndex == null || hit.barIndex >= recentMinBarIndex))
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.barIndex}`,
        text: hit.label,
        detail: (() => {
          const c = bars[hit.barIndex]?.close;
          const px = c != null && Number.isFinite(c) ? ` · ${fmtPrice(c)}` : "";
          return `${hit.date}${px} · ${hit.summary}`;
        })(),
        color:
          hit.direction === "bullish"
            ? DIRECTION.up
            : hit.direction === "bearish"
              ? DIRECTION.down
              : CHART_SURFACE.text,
      }));
  }, [comboStrategies, chartComboStrategyVisibility, recentMinBarIndex, bars]);

  const macdStrategyHitLegend = useMemo(() => {
    if (!macdStrategies?.recent.length || !chartMacdStrategyVisibility)
      return [];
    return macdStrategies.recent
      .filter((hit) => chartMacdStrategyVisibility[hit.id] && (recentMinBarIndex == null || hit.barIndex >= recentMinBarIndex))
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.barIndex}`,
        text: hit.label,
        detail: (() => {
          const c = bars[hit.barIndex]?.close;
          const px = c != null && Number.isFinite(c) ? ` · ${fmtPrice(c)}` : "";
          return `${hit.date}${px} · ${hit.summary}`;
        })(),
        color:
          hit.direction === "bullish"
            ? DIRECTION.up
            : hit.direction === "bearish"
              ? DIRECTION.down
              : CHART_SURFACE.text,
      }));
  }, [macdStrategies, chartMacdStrategyVisibility, recentMinBarIndex, bars]);

  const classicStrategyHitLegend = useMemo(() => {
    if (!classicStrategies?.recent.length || !chartClassicStrategyVisibility)
      return [];
    return classicStrategies.recent
      .filter((hit) => chartClassicStrategyVisibility[hit.id] && (recentMinBarIndex == null || hit.barIndex >= recentMinBarIndex))
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.barIndex}`,
        text: hit.label,
        detail: (() => {
          const c = bars[hit.barIndex]?.close;
          const px = c != null && Number.isFinite(c) ? ` · ${fmtPrice(c)}` : "";
          return `${hit.date}${px} · ${hit.summary}`;
        })(),
        color:
          hit.direction === "bullish"
            ? DIRECTION.up
            : hit.direction === "bearish"
              ? DIRECTION.down
              : CHART_SURFACE.text,
      }));
  }, [classicStrategies, chartClassicStrategyVisibility, recentMinBarIndex, bars]);

  const stochStrategyHitLegend = useMemo(() => {
    if (!stochStrategies?.recent.length || !chartStochStrategyVisibility)
      return [];
    return stochStrategies.recent
      .filter((hit) => chartStochStrategyVisibility[hit.id] && (recentMinBarIndex == null || hit.barIndex >= recentMinBarIndex))
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.barIndex}`,
        text: hit.label,
        detail: (() => {
          const c = bars[hit.barIndex]?.close;
          const px = c != null && Number.isFinite(c) ? ` · ${fmtPrice(c)}` : "";
          return `${hit.date}${px} · ${hit.summary}`;
        })(),
        color:
          hit.direction === "bullish"
            ? DIRECTION.up
            : hit.direction === "bearish"
              ? DIRECTION.down
              : CHART_SURFACE.text,
      }));
  }, [stochStrategies, chartStochStrategyVisibility, recentMinBarIndex, bars]);

  const ichimokuStrategyHitLegend = useMemo(() => {
    if (!ichimokuStrategies?.recent.length || !chartIchimokuStrategyVisibility)
      return [];
    return ichimokuStrategies.recent
      .filter((hit) => chartIchimokuStrategyVisibility[hit.id] && (recentMinBarIndex == null || hit.barIndex >= recentMinBarIndex))
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: `${hit.id}-${hit.barIndex}`,
        text: hit.label,
        detail: (() => {
          const c = bars[hit.barIndex]?.close;
          const px = c != null && Number.isFinite(c) ? ` · ${fmtPrice(c)}` : "";
          return `${hit.date}${px} · ${hit.summary}`;
        })(),
        color:
          hit.direction === "bullish"
            ? DIRECTION.up
            : hit.direction === "bearish"
              ? DIRECTION.down
              : CHART_SURFACE.text,
      }));
  }, [ichimokuStrategies, chartIchimokuStrategyVisibility, recentMinBarIndex, bars]);

  const classicalHitLegend = useMemo(() => {
    if (!classicalPatterns?.recent.length || !chartClassicalPatternVisibility)
      return [];
    return classicalPatterns.recent
      .filter((hit) => chartClassicalPatternVisibility[hit.id] && (recentMinBarIndex == null || hit.barIndex >= recentMinBarIndex))
      .slice(-8)
      .reverse()
      .map((hit) => ({
        key: hit.instanceKey,
        text: hit.label,
        detail: (() => {
          const c = bars[hit.barIndex]?.close;
          const px = c != null && Number.isFinite(c) ? ` · ${fmtPrice(c)}` : "";
          return `${hit.date}${px} · ${hit.summary}`;
        })(),
        color: CHART_PATTERN_META[hit.id].color,
      }));
  }, [classicalPatterns, chartClassicalPatternVisibility, recentMinBarIndex, bars]);

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
        color: bullish ? DIRECTION.up : DIRECTION.down,
      });
    }
    for (const t of structure.transitions.slice(-4)) {
      if (t.to === "bullish" && chartStructureVisibility.bullish_transition) {
        items.push({
          key: `tr-bull-${t.barIndex}`,
          text: "↑BULL",
          detail: t.date,
          color: DIRECTION.up,
        });
      }
      if (t.to === "bearish" && chartStructureVisibility.bearish_transition) {
        items.push({
          key: `tr-bear-${t.barIndex}`,
          text: "↓BEAR",
          detail: t.date,
          color: DIRECTION.down,
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
          <ChartReadout
            ohlcvReadout={ohlcvReadout}
            markerHover={markerHover}
            containerRef={wrapRef}
          />
          {secondaryPaneLabelMeta.map((label) => {
            const top = paneLabelTops[label.key];
            if (top == null) return null;
            return (
              <div
                key={label.key}
                className="pointer-events-none absolute left-2 z-[2] max-w-[min(100%,220px)] truncate rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-text-primary backdrop-blur-[2px]"
                style={{ top }}
                title={
                  label.detail
                    ? `${label.title} ${label.detail}`
                    : label.title
                }
              >
                <span>{label.title}</span>
                {label.detail != null && label.detail !== "" && (
                  <span className="ml-1.5 tabular-nums font-normal text-text-tertiary">
                    {label.detail}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <ChartLegend
            overlayLegend={overlayLegend}
            showVolume={showVolume}
            latestVolume={latestVolume}
            volumeAverages={volumeSnapshot?.averages ?? []}
            timeframe={timeframe}
            oscPanes={oscPanes}
            showFibLegend={showFibLegend}
            showFibAnchors={showFibAnchors}
            fibRetracement={fibRetracement}
            visibleFibLevels={visibleFibLevels}
          />
          <SignalSummary
            patternHitLegend={patternHitLegend}
            patternLegend={patternLegend}
            structureHitLegend={structureHitLegend}
            structureLegend={structureLegend}
            elliottWaveLegend={elliottWaveLegend}
            bbStrategyHitLegend={bbStrategyHitLegend}
            bbStrategyLegend={bbStrategyLegend}
            classicalHitLegend={classicalHitLegend}
            classicalPatternLegend={classicalPatternLegend}
            patternStrategyHitLegend={patternStrategyHitLegend}
            patternStrategyLegend={patternStrategyLegend}
            rsiStrategyHitLegend={rsiStrategyHitLegend}
            rsiStrategyLegend={rsiStrategyLegend}
            volumeStrategyHitLegend={volumeStrategyHitLegend}
            volumeStrategyLegend={volumeStrategyLegend}
            comboStrategyHitLegend={comboStrategyHitLegend}
            comboStrategyLegend={comboStrategyLegend}
            macdStrategyHitLegend={macdStrategyHitLegend}
            macdStrategyLegend={macdStrategyLegend}
            classicStrategyHitLegend={classicStrategyHitLegend}
            classicStrategyLegend={classicStrategyLegend}
            stochStrategyHitLegend={stochStrategyHitLegend}
            stochStrategyLegend={stochStrategyLegend}
            ichimokuStrategyHitLegend={ichimokuStrategyHitLegend}
            ichimokuStrategyLegend={ichimokuStrategyLegend}
            visibleTrendlines={visibleTrendlines}
            trendlines={trendlines}
            chartTrendlineColors={chartTrendlineColors}
            srZones={srZones}
            journalEntries={journalEntries}
            showStrategyConfluence={!!showStrategyConfluence}
            strategyConfluences={strategyConfluences}
            showRiskReward={!!showRiskReward}
            riskRewardPlans={riskRewardPlans}
            fibConfluences={fibConfluences}
          />
        </div>
      </div>
    </Card>
  );
}
