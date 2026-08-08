import { useEffect, useMemo, useRef } from "react";
import {
  createSeriesMarkers,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Time,
} from "lightweight-charts";
import type { IndicatorResults, OHLCVBar } from "@/lib/types";
import type {
  CandlePatternId,
  CandlePatternResult,
} from "@/lib/evaluation/candlePatterns";
import type { SwingStructureResult } from "@/lib/evaluation/swingStructure";
import type { SwingChartToggleId } from "@/lib/swingStructureStore";
import {
  patternsToChartMarkers,
} from "@/lib/chart/patternMarkers";
import {
  withRecentWindowHits,
} from "@/lib/strategyRecency";
import {
  structureToChartMarkers,
} from "@/lib/chart/structureMarkers";
import {
  bbStrategiesToChartMarkers,
} from "@/lib/chart/bbStrategyMarkers";
import {
  classicalPatternsToChartMarkers,
} from "@/lib/chart/classicalPatternMarkers";
import {
  patternStrategiesToChartMarkers,
} from "@/lib/chart/patternStrategyMarkers";
import type { PatternStrategyResult } from "@/lib/evaluation/patternStrategies";
import type { PatternStrategyId } from "@/lib/patternStrategyMeta";
import type { BbStrategyResult } from "@/lib/evaluation/bbStrategies";
import type { BbStrategyId } from "@/lib/bbStrategyMeta";
import type { RsiStrategyResult } from "@/lib/evaluation/rsiStrategies";
import type { RsiStrategyId } from "@/lib/rsiStrategyMeta";
import {
  rsiStrategiesToChartMarkers,
} from "@/lib/chart/rsiStrategyMarkers";
import type { VolumeStrategyResult } from "@/lib/evaluation/volumeStrategies";
import type { VolumeStrategyId } from "@/lib/volumeStrategyMeta";
import {
  volumeStrategiesToChartMarkers,
} from "@/lib/chart/volumeStrategyMarkers";
import { foreverVwapToChartMarkers } from "@/lib/chart/foreverVwapMarkers";
import type { ComboStrategyResult } from "@/lib/evaluation/comboStrategies";
import type { ComboStrategyId } from "@/lib/comboStrategyMeta";
import {
  comboStrategiesToChartMarkers,
} from "@/lib/chart/comboStrategyMarkers";
import {
  buildStrategyMarkerTooltips,
  type MarkerTooltip,
} from "@/lib/chart/markerTooltips";
import {
  macdStrategiesToChartMarkers,
} from "@/lib/chart/macdStrategyMarkers";
import {
  stochStrategiesToChartMarkers,
} from "@/lib/chart/stochStrategyMarkers";
import {
  ichimokuStrategiesToChartMarkers,
} from "@/lib/chart/ichimokuStrategyMarkers";
import type { IchimokuStrategyResult } from "@/lib/evaluation/ichimokuStrategies";
import type { IchimokuStrategyId } from "@/lib/ichimokuStrategyMeta";
import type { MacdStrategyResult } from "@/lib/evaluation/macdStrategies";
import type { MacdStrategyId } from "@/lib/macdStrategyMeta";
import type { ClassicStrategyResult } from "@/lib/evaluation/classicStrategies";
import type { ClassicStrategyId } from "@/lib/classicStrategyMeta";
import {
  classicStrategiesToChartMarkers,
} from "@/lib/chart/classicStrategyMarkers";
import type { StochStrategyResult } from "@/lib/evaluation/stochStrategies";
import type { StochStrategyId } from "@/lib/stochStrategyMeta";
import type { ChartPatternResult } from "@/lib/evaluation/chartPatterns";
import type { ChartPatternId } from "@/lib/chartPatternMeta";
import type { AuxIndicatorId } from "@/lib/auxIndicatorStore";
import type { TradeJournalEntry } from "@/lib/tradeJournalStore";
import { tradeJournalToChartMarkers } from "@/lib/chart/tradeJournalMarkers";
import type { StrategyConfluence } from "@/lib/evaluation/strategyConfluence";
import { strategyConfluencesToChartMarkers } from "@/lib/chart/strategyConfluenceMarkers";

export type UseSeriesMarkersArgs = {
  bars: OHLCVBar[];
  patterns?: CandlePatternResult;
  chartPatternVisibility?: Record<CandlePatternId, boolean>;
  structure?: SwingStructureResult;
  chartStructureVisibility?: Record<SwingChartToggleId, boolean>;
  bbStrategies?: BbStrategyResult;
  chartBbStrategyVisibility?: Record<BbStrategyId, boolean>;
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
  ichimokuStrategies?: IchimokuStrategyResult;
  chartIchimokuStrategyVisibility?: Record<IchimokuStrategyId, boolean>;
  indicators?: IndicatorResults;
  auxIndicatorVisibility?: Partial<Record<AuxIndicatorId, boolean>>;
  journalEntries?: TradeJournalEntry[];
  strategyConfluences?: StrategyConfluence[];
  showStrategyConfluence?: boolean;
  recentMinBarIndex: number | null;
  recentSignalWindow?: { enabled: boolean; bars: number } | null;
};

/** Collect chart markers, createSeriesMarkers plugin, and apply setMarkers. */
export function useSeriesMarkers({
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
  showStrategyConfluence = true,
  recentMinBarIndex,
  recentSignalWindow,
}: UseSeriesMarkersArgs) {
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const markerTooltipsRef = useRef<Map<string, MarkerTooltip>>(new Map());

  const chartMarkers = useMemo(() => {
    const winOn = recentMinBarIndex != null;
    const barCount = bars.length;
    const winBars = recentSignalWindow?.bars ?? 0;
    const candleFiltered = withRecentWindowHits(
      patterns,
      winOn,
      barCount,
      winBars,
    );
    const classicalFiltered = withRecentWindowHits(
      classicalPatterns,
      winOn,
      barCount,
      winBars,
    );
    const bbFiltered = withRecentWindowHits(bbStrategies, winOn, barCount, winBars);
    const patternStratFiltered = withRecentWindowHits(
      patternStrategies,
      winOn,
      barCount,
      winBars,
    );
    const rsiFiltered = withRecentWindowHits(rsiStrategies, winOn, barCount, winBars);
    const volumeFiltered = withRecentWindowHits(
      volumeStrategies,
      winOn,
      barCount,
      winBars,
    );
    const comboFiltered = withRecentWindowHits(
      comboStrategies,
      winOn,
      barCount,
      winBars,
    );
    const macdFiltered = withRecentWindowHits(
      macdStrategies,
      winOn,
      barCount,
      winBars,
    );
    const classicFiltered = withRecentWindowHits(
      classicStrategies,
      winOn,
      barCount,
      winBars,
    );
    const stochFiltered = withRecentWindowHits(
      stochStrategies,
      winOn,
      barCount,
      winBars,
    );
    const ichiFiltered = withRecentWindowHits(
      ichimokuStrategies,
      winOn,
      barCount,
      winBars,
    );
    const confFiltered =
      winOn && strategyConfluences?.length
        ? strategyConfluences.filter((c) => c.barIndex >= recentMinBarIndex!)
        : strategyConfluences;

    const bbVis =
      chartBbStrategyVisibility ?? ({} as Record<BbStrategyId, boolean>);
    const rsiVis =
      chartRsiStrategyVisibility ?? ({} as Record<RsiStrategyId, boolean>);
    const volumeVisMap =
      chartVolumeStrategyVisibility ??
      ({} as Record<VolumeStrategyId, boolean>);
    const comboVis =
      chartComboStrategyVisibility ?? ({} as Record<ComboStrategyId, boolean>);
    const macdVis =
      chartMacdStrategyVisibility ?? ({} as Record<MacdStrategyId, boolean>);
    const classicVis =
      chartClassicStrategyVisibility ??
      ({} as Record<ClassicStrategyId, boolean>);
    const stochVis =
      chartStochStrategyVisibility ?? ({} as Record<StochStrategyId, boolean>);
    const ichiVis =
      chartIchimokuStrategyVisibility ??
      ({} as Record<IchimokuStrategyId, boolean>);
    const patternVisMap =
      chartPatternStrategyVisibility ??
      ({} as Record<PatternStrategyId, boolean>);

    const patternMs = patternsToChartMarkers(
      candleFiltered,
      chartPatternVisibility ?? ({} as Record<CandlePatternId, boolean>),
    );
    const structureMs = structureToChartMarkers(
      structure,
      chartStructureVisibility ?? ({} as Record<SwingChartToggleId, boolean>),
    );
    const bbStratMs = bbStrategiesToChartMarkers(bbFiltered, bbVis);
    const classicalMs = classicalPatternsToChartMarkers(
      classicalFiltered,
      chartClassicalPatternVisibility ??
        ({} as Record<ChartPatternId, boolean>),
      recentMinBarIndex,
    );
    const patternStratMs = patternStrategiesToChartMarkers(
      patternStratFiltered,
      patternVisMap,
    );
    const rsiStratMs = rsiStrategiesToChartMarkers(rsiFiltered, rsiVis);
    const volumeStratMs = volumeStrategiesToChartMarkers(
      volumeFiltered,
      volumeVisMap,
    );
    const foreverVwapMs = foreverVwapToChartMarkers(
      indicators,
      auxIndicatorVisibility?.forever_vwap === true,
    );
    const comboStratMs = comboStrategiesToChartMarkers(comboFiltered, comboVis);
    const macdStratMs = macdStrategiesToChartMarkers(macdFiltered, macdVis);
    const classicStratMs = classicStrategiesToChartMarkers(
      classicFiltered,
      classicVis,
    );
    const stochStratMs = stochStrategiesToChartMarkers(stochFiltered, stochVis);
    const ichiStratMs = ichimokuStrategiesToChartMarkers(ichiFiltered, ichiVis);
    const journalMs = tradeJournalToChartMarkers(journalEntries);
    const confluenceMs = strategyConfluencesToChartMarkers(
      confFiltered,
      showStrategyConfluence,
    );

    const closeByBar = new Map<number, number>();
    for (let i = 0; i < bars.length; i++) {
      const c = bars[i]?.close;
      if (c != null && Number.isFinite(c)) closeByBar.set(i, c);
    }

    markerTooltipsRef.current = buildStrategyMarkerTooltips({
      bb: { hits: bbFiltered?.recent, visibility: bbVis },
      rsi: { hits: rsiFiltered?.recent, visibility: rsiVis },
      macd: { hits: macdFiltered?.recent, visibility: macdVis },
      classic: { hits: classicFiltered?.recent, visibility: classicVis },
      stoch: { hits: stochFiltered?.recent, visibility: stochVis },
      volume: { hits: volumeFiltered?.recent, visibility: volumeVisMap },
      combo: { hits: comboFiltered?.recent, visibility: comboVis },
      ichimoku: { hits: ichiFiltered?.recent, visibility: ichiVis },
      pattern: { hits: patternStratFiltered?.recent, visibility: patternVisMap },
      confluences: confFiltered,
      showConfluence: showStrategyConfluence,
      closeByBar,
    });

    return [
      ...patternMs,
      ...structureMs,
      ...bbStratMs,
      ...classicalMs,
      ...patternStratMs,
      ...rsiStratMs,
      ...volumeStratMs,
      ...foreverVwapMs,
      ...comboStratMs,
      ...macdStratMs,
      ...classicStratMs,
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
    indicators,
    auxIndicatorVisibility?.forever_vwap,
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
    journalEntries,
    strategyConfluences,
    showStrategyConfluence,
    recentMinBarIndex,
    recentSignalWindow?.bars,
    bars.length,
  ]);

  /** Call from chart create after addSeries(Candlestick) — keeps attach order. */
  const bindMarkers = (candles: ISeriesApi<"Candlestick">) => {
    markersRef.current = createSeriesMarkers(candles, []);
  };

  useEffect(() => {
    markersRef.current?.setMarkers(chartMarkers);
  }, [chartMarkers]);

  return { markersRef, markerTooltipsRef, chartMarkers, bindMarkers };
}
