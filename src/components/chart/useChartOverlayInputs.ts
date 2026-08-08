import { useMemo } from "react";
import type { IndicatorResults, OHLCVBar } from "@/lib/types";
import type {
  CandlePatternId,
  CandlePatternResult,
} from "@/lib/evaluation/candlePatterns";
import type { SupportResistanceResult } from "@/lib/evaluation/supportResistance";
import type { TrendlineResult } from "@/lib/evaluation/trendlines";
import type { Trendline } from "@/lib/evaluation/trendlines";
import { patternBarHighlights } from "@/lib/chart/patternBarHighlights";
import { visibleClassicalPatternInstances } from "@/lib/chart/classicalPatternMarkers";
import { collectVisibleRiskRewardPlans } from "@/lib/chart/collectRiskRewardPlans";
import type { PatternStrategyResult } from "@/lib/evaluation/patternStrategies";
import type { PatternStrategyId } from "@/lib/patternStrategyMeta";
import { SERIES } from "@/lib/chart/chartTheme";
import type { BbStrategyResult } from "@/lib/evaluation/bbStrategies";
import type { BbStrategyId } from "@/lib/bbStrategyMeta";
import type { RsiStrategyResult } from "@/lib/evaluation/rsiStrategies";
import type { RsiStrategyId } from "@/lib/rsiStrategyMeta";
import type { VolumeStrategyResult } from "@/lib/evaluation/volumeStrategies";
import type { VolumeStrategyId } from "@/lib/volumeStrategyMeta";
import type { ComboStrategyResult } from "@/lib/evaluation/comboStrategies";
import type { ComboStrategyId } from "@/lib/comboStrategyMeta";
import type { IchimokuStrategyResult } from "@/lib/evaluation/ichimokuStrategies";
import type { IchimokuStrategyId } from "@/lib/ichimokuStrategyMeta";
import type { MacdStrategyResult } from "@/lib/evaluation/macdStrategies";
import type { MacdStrategyId } from "@/lib/macdStrategyMeta";
import type { ClassicStrategyResult } from "@/lib/evaluation/classicStrategies";
import type { ClassicStrategyId } from "@/lib/classicStrategyMeta";
import type { StochStrategyResult } from "@/lib/evaluation/stochStrategies";
import type { StochStrategyId } from "@/lib/stochStrategyMeta";
import type { ChartPatternResult } from "@/lib/evaluation/chartPatterns";
import type { ChartPatternId } from "@/lib/chartPatternMeta";
import { visibleSrZones } from "@/lib/chart/srZoneOverlay";
import type { SrChartToggleId } from "@/lib/srZoneStore";
import type { TrendlineChartToggleId } from "@/lib/trendlineStore";
import {
  findFibConfluences,
  type FibExtraId,
  type FibLevelRatio,
  type FibRetracement,
} from "@/lib/fibonacciStore";
import type { AuxIndicatorId } from "@/lib/auxIndicatorStore";

export type UseChartOverlayInputsArgs = {
  bars: OHLCVBar[];
  patterns?: CandlePatternResult;
  chartPatternVisibility?: Record<CandlePatternId, boolean>;
  classicalPatterns?: ChartPatternResult;
  chartClassicalPatternVisibility?: Record<ChartPatternId, boolean>;
  supportResistance?: SupportResistanceResult;
  chartSrVisibility?: Record<SrChartToggleId, boolean>;
  trendlines?: TrendlineResult;
  chartTrendlineVisibility?: Record<TrendlineChartToggleId, boolean>;
  chartTrendlineLineVisibility?: Record<string, boolean>;
  indicators?: IndicatorResults;
  auxIndicatorVisibility?: Partial<Record<AuxIndicatorId, boolean>>;
  patternStrategies?: PatternStrategyResult;
  chartPatternStrategyVisibility?: Record<PatternStrategyId, boolean>;
  bbStrategies?: BbStrategyResult;
  chartBbStrategyVisibility?: Record<BbStrategyId, boolean>;
  ichimokuStrategies?: IchimokuStrategyResult;
  chartIchimokuStrategyVisibility?: Record<IchimokuStrategyId, boolean>;
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
  showRiskReward?: boolean;
  recentMinBarIndex: number | null;
  fibRetracement?: FibRetracement | null;
  fibLevelVisibility?: Record<FibLevelRatio, boolean>;
  fibExtraVisibility?: Partial<Record<FibExtraId, boolean>>;
};

/** Derived inputs for canvas overlays (highlights, zones, RR, fib). */
export function useChartOverlayInputs({
  bars,
  patterns,
  chartPatternVisibility,
  classicalPatterns,
  chartClassicalPatternVisibility,
  supportResistance,
  chartSrVisibility,
  trendlines,
  chartTrendlineVisibility,
  chartTrendlineLineVisibility,
  indicators,
  auxIndicatorVisibility,
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
  showRiskReward = true,
  recentMinBarIndex,
  fibRetracement,
  fibLevelVisibility,
  fibExtraVisibility,
}: UseChartOverlayInputsArgs) {
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

  return {
    barHighlights,
    srZones,
    visibleTrendlines,
    riskRewardPlans,
    visibleClassicalInstances,
    showFibAnchors,
    showFibConfluence,
    fibConfluences,
  };
}
