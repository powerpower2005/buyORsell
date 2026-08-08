import { useMemo } from "react";
import type { IndicatorResults, OHLCVBar } from "@/lib/types";
import type {
  CandlePatternId,
  CandlePatternResult,
} from "@/lib/evaluation/candlePatterns";
import type { SwingStructureResult } from "@/lib/evaluation/swingStructure";
import type { ElliottWaveResult } from "@/lib/evaluation/elliottWaves";
import { getIndicatorConfig } from "@/lib/configStore";
import { parsePeriodColors, resolvePeriodColor } from "@/lib/indicatorColors";
import {
  BB_BAND_META,
  BB_BAND_ORDER,
  resolveBbBandColor,
  type BbBandId,
} from "@/lib/bbOverlay";
import { visiblePatternLegend } from "@/lib/chart/patternMarkers";
import { visibleStructureLegend } from "@/lib/chart/structureMarkers";
import { visibleBbStrategyLegend } from "@/lib/chart/bbStrategyMarkers";
import { visibleClassicalPatternLegend } from "@/lib/chart/classicalPatternMarkers";
import { visiblePatternStrategyLegend } from "@/lib/chart/patternStrategyMarkers";
import { formatRewardRisk } from "@/lib/evaluation/riskReward";
import { patternAccentColor } from "@/lib/candlePatternMeta";
import type { PatternStrategyResult } from "@/lib/evaluation/patternStrategies";
import type { PatternStrategyId } from "@/lib/patternStrategyMeta";
import {
  CHART_SURFACE,
  DIRECTION,
  SERIES,
  SIGNAL,
} from "@/lib/chart/chartTheme";
import type { BbStrategyResult } from "@/lib/evaluation/bbStrategies";
import type { BbStrategyId } from "@/lib/bbStrategyMeta";
import type { RsiStrategyResult } from "@/lib/evaluation/rsiStrategies";
import type { RsiStrategyId } from "@/lib/rsiStrategyMeta";
import { visibleRsiStrategyLegend } from "@/lib/chart/rsiStrategyMarkers";
import type { VolumeStrategyResult } from "@/lib/evaluation/volumeStrategies";
import type { VolumeStrategyId } from "@/lib/volumeStrategyMeta";
import { visibleVolumeStrategyLegend } from "@/lib/chart/volumeStrategyMarkers";
import type { ComboStrategyResult } from "@/lib/evaluation/comboStrategies";
import type { ComboStrategyId } from "@/lib/comboStrategyMeta";
import { visibleComboStrategyLegend } from "@/lib/chart/comboStrategyMarkers";
import { visibleMacdStrategyLegend } from "@/lib/chart/macdStrategyMarkers";
import { visibleStochStrategyLegend } from "@/lib/chart/stochStrategyMarkers";
import { visibleIchimokuStrategyLegend } from "@/lib/chart/ichimokuStrategyMarkers";
import type { IchimokuStrategyResult } from "@/lib/evaluation/ichimokuStrategies";
import type { IchimokuStrategyId } from "@/lib/ichimokuStrategyMeta";
import type { MacdStrategyResult } from "@/lib/evaluation/macdStrategies";
import type { MacdStrategyId } from "@/lib/macdStrategyMeta";
import type { ClassicStrategyResult } from "@/lib/evaluation/classicStrategies";
import type { ClassicStrategyId } from "@/lib/classicStrategyMeta";
import { visibleClassicStrategyLegend } from "@/lib/chart/classicStrategyMarkers";
import type { StochStrategyResult } from "@/lib/evaluation/stochStrategies";
import type { StochStrategyId } from "@/lib/stochStrategyMeta";
import type { ChartPatternResult } from "@/lib/evaluation/chartPatterns";
import {
  CHART_PATTERN_META,
  type ChartPatternId,
} from "@/lib/chartPatternMeta";
import type { SwingChartToggleId } from "@/lib/swingStructureStore";
import {
  anyElliottWaveVisible,
  type ElliottWaveToggleId,
} from "@/lib/elliottWaveStore";
import type { AuxIndicatorId } from "@/lib/auxIndicatorStore";
import { fmtPrice } from "./ChartReadout";

function fmtLegend(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export type UseChartLegendsArgs = {
  bars: OHLCVBar[];
  indicators?: IndicatorResults;
  patterns?: CandlePatternResult;
  chartPatternVisibility?: Record<CandlePatternId, boolean>;
  structure?: SwingStructureResult;
  chartStructureVisibility?: Record<SwingChartToggleId, boolean>;
  elliottWaves?: ElliottWaveResult;
  chartElliottWaveVisibility?: Record<ElliottWaveToggleId, boolean>;
  maVisibility?: {
    sma?: Record<number, boolean>;
    ema?: Record<number, boolean>;
  };
  bbVisibility?: Partial<Record<BbBandId, boolean>>;
  bbStrategies?: BbStrategyResult;
  chartBbStrategyVisibility?: Record<BbStrategyId, boolean>;
  auxIndicatorVisibility?: Partial<Record<AuxIndicatorId, boolean>>;
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
  recentMinBarIndex: number | null;
};

/** Memoized legend arrays for ChartLegend / SignalSummary. */
export function useChartLegends({
  bars,
  indicators,
  patterns,
  chartPatternVisibility,
  structure,
  chartStructureVisibility,
  elliottWaves,
  chartElliottWaveVisibility,
  maVisibility,
  bbVisibility,
  bbStrategies,
  chartBbStrategyVisibility,
  auxIndicatorVisibility,
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
  recentMinBarIndex,
}: UseChartLegendsArgs) {
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

  return {
    patternLegend,
    structureLegend,
    bbStrategyLegend,
    classicalPatternLegend,
    patternStrategyLegend,
    rsiStrategyLegend,
    volumeStrategyLegend,
    comboStrategyLegend,
    macdStrategyLegend,
    classicStrategyLegend,
    stochStrategyLegend,
    ichimokuStrategyLegend,
    patternStrategyHitLegend,
    elliottWaveLegend,
    overlayLegend,
    patternHitLegend,
    bbStrategyHitLegend,
    rsiStrategyHitLegend,
    volumeStrategyHitLegend,
    comboStrategyHitLegend,
    macdStrategyHitLegend,
    classicStrategyHitLegend,
    stochStrategyHitLegend,
    ichimokuStrategyHitLegend,
    classicalHitLegend,
    structureHitLegend,
  };
}
