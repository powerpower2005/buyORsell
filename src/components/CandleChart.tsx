import { useMemo, useRef, useState } from "react";
import type { OHLCVBar } from "@/lib/types";
import { recentWindowMinBarIndex } from "@/lib/strategyRecency";
import type { MarkerTooltip } from "@/lib/chart/markerTooltips";
import { FIB_RETRACEMENT_LEVELS } from "@/lib/fibonacciStore";
import { type OhlcvReadout } from "./chart/ChartReadout";
import { CandleChartView } from "./chart/CandleChartView";
import { useFibonacciDraw } from "./chart/useFibonacciDraw";
import { useOverlayCanvas } from "./chart/useOverlayCanvas";
import { usePaneLayout } from "./chart/usePaneLayout";
import { useSeriesMarkers } from "./chart/useSeriesMarkers";
import { dailyChangePct, useChartInstance } from "./chart/useChartInstance";
import { type CandleChartProps } from "./chart/candleChartProps";
import { useIndicatorOverlays } from "./chart/useIndicatorOverlays";
import { useSecondaryPanes } from "./chart/useSecondaryPanes";
import { useChartLegends } from "./chart/useChartLegends";
import { useChartOverlayInputs } from "./chart/useChartOverlayInputs";
import { useBarsDataUpdate } from "./chart/useBarsDataUpdate";
import { useChartPaneModel } from "./chart/useChartPaneModel";
import { useChartShellRefs } from "./chart/useChartShellRefs";

export type { CandleChartProps as Props } from "./chart/candleChartProps";

export function CandleChart(props: CandleChartProps) {
  const {
    bars,
    timeframe,
    chartTrendlineColors,
    indicators,
    maVisibility,
    bbVisibility,
    ichimokuVisibility,
    classicStrategies,
    chartClassicStrategyVisibility,
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
    trendlines,
    elliottWaves,
    chartElliottWaveVisibility,
  } = props;

  const {
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
  } = useChartShellRefs();

  const {
    volumeSnapshot,
    oscPanes,
    mainHeight,
    totalHeight,
    latestVolume,
    secondaryPaneLabelMeta,
  } = useChartPaneModel({
    bars,
    timeframe,
    indicators,
    auxIndicatorVisibility,
    showVolume,
    heightProp,
  });

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

  const { markersRef, markerTooltipsRef, bindMarkers } = useSeriesMarkers({
    ...props,
    showStrategyConfluence,
    recentMinBarIndex,
    recentSignalWindow,
  });

  const overlayInputs = useChartOverlayInputs({
    ...props,
    showRiskReward,
    recentMinBarIndex,
  });

  const legends = useChartLegends({
    ...props,
    recentMinBarIndex,
  });

  const { overlayRef, drawChartOverlays } = useOverlayCanvas({
    chartRef,
    candleRef,
    wrapRef,
    barsRef,
    srZones: overlayInputs.srZones,
    visibleTrendlines: overlayInputs.visibleTrendlines,
    chartTrendlineColors,
    visibleClassicalInstances: overlayInputs.visibleClassicalInstances,
    classicStrategies,
    chartClassicStrategyVisibility,
    fibRetracement,
    fibLevelVisibility,
    fibExtraVisibility,
    elliottWaves,
    chartElliottWaveVisibility,
    riskRewardPlans: overlayInputs.riskRewardPlans,
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

  useIndicatorOverlays({
    chartRef,
    overlayRefs,
    indicators,
    timeframe,
    maVisibility,
    bbVisibility,
    ichimokuVisibility,
    auxIndicatorVisibility,
    barsLength: bars.length,
  });

  useSecondaryPanes({
    chartRef,
    containerRef,
    wrapRef,
    volumeRef,
    volumeMaRefs,
    oscSeriesRefs,
    bars,
    indicators,
    showVolume,
    oscPanes,
    volumeSnapshot,
    timeframe,
    mainHeight,
    totalHeight,
    captureTimeRange,
    restoreTimeRange,
    drawChartOverlays,
  });

  useBarsDataUpdate({
    bars,
    timeframe,
    showVolume,
    volumeSnapshot,
    barHighlights: overlayInputs.barHighlights,
    chartRef,
    candleRef,
    volumeRef,
    volumeMaRefs,
    fittedBarsKeyRef,
    captureTimeRange,
    restoreTimeRange,
    drawChartOverlays,
  });

  const hasFib =
    !!fibRetracement && fibRetracement.high.price > fibRetracement.low.price;
  const visibleFibLevels = FIB_RETRACEMENT_LEVELS.filter(
    (r) => fibLevelVisibility?.[r] === true,
  );
  /** Legend only when something is actually shown (not just a stored anchor). */
  const showFibLegend =
    hasFib &&
    (overlayInputs.showFibAnchors || visibleFibLevels.length > 0);

  const { overlayLegend, ...signalLegends } = legends;

  return (
    <CandleChartView
      pickHint={pickHint}
      fibDrawMode={fibDrawMode}
      totalHeight={totalHeight}
      wrapRef={wrapRef}
      containerRef={containerRef}
      overlayRef={overlayRef}
      ohlcvReadout={ohlcvReadout}
      markerHover={markerHover}
      secondaryPaneLabelMeta={secondaryPaneLabelMeta}
      paneLabelTops={paneLabelTops}
      overlayLegend={overlayLegend}
      showVolume={showVolume}
      latestVolume={latestVolume}
      volumeAverages={volumeSnapshot?.averages ?? []}
      timeframe={timeframe}
      oscPanes={oscPanes}
      showFibLegend={showFibLegend}
      showFibAnchors={overlayInputs.showFibAnchors}
      fibRetracement={fibRetracement}
      visibleFibLevels={visibleFibLevels}
      signalSummaryProps={{
        ...signalLegends,
        visibleTrendlines: overlayInputs.visibleTrendlines,
        trendlines,
        chartTrendlineColors,
        srZones: overlayInputs.srZones,
        journalEntries,
        showStrategyConfluence: !!showStrategyConfluence,
        strategyConfluences,
        showRiskReward: !!showRiskReward,
        riskRewardPlans: overlayInputs.riskRewardPlans,
        fibConfluences: overlayInputs.fibConfluences,
      }}
    />
  );
}
