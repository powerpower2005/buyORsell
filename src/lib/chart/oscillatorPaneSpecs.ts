import type { IndicatorResults, OHLCVBar, SeriesPoint } from "@/lib/types";
import { getIndicatorConfig } from "@/lib/configStore";
import {
  AUX_INDICATOR_META,
  AUX_INDICATOR_ORDER,
  type AuxIndicatorId,
} from "@/lib/auxIndicatorStore";

export const OSC_PANE_HEIGHT = 120;
export const OSC_MACD_PANE_HEIGHT = 140;
export const VOLUME_PANE_HEIGHT = 100;

export type OscPaneSpec = {
  id: AuxIndicatorId;
  title: string;
  latest: string;
  height: number;
};

function fmt(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function toLineData(points: SeriesPoint[] | undefined) {
  if (!points?.length) return [];
  return points.map((p) => ({
    time: p.date as `${number}-${number}-${number}`,
    value: p.value,
  }));
}

/** Active oscillator panes in display order (only when toggled + data exists). */
export function buildOscPaneSpecs(
  indicators: IndicatorResults | undefined,
  visibility: Partial<Record<AuxIndicatorId, boolean>> | undefined,
): OscPaneSpec[] {
  if (!indicators) return [];
  const panes: OscPaneSpec[] = [];

  for (const id of AUX_INDICATOR_ORDER) {
    if (visibility?.[id] !== true) continue;
    const meta = AUX_INDICATOR_META[id];

    if (id === "rsi") {
      const cfg = getIndicatorConfig("rsi");
      if (!cfg?.enabled) continue;
      const out = indicators.indicators.rsi;
      if (!out?.series.rsi?.length) continue;
      const period = (cfg.params.period as number | undefined) ?? 14;
      const w = out.latest.rsiWeighted;
      panes.push({
        id,
        title: `${meta.labelKo}(${period})`,
        latest:
          w != null
            ? `${fmt(out.latest.rsi)} · W ${fmt(w)}`
            : fmt(out.latest.rsi),
        height: OSC_PANE_HEIGHT,
      });
      continue;
    }

    if (id === "macd") {
      const cfg = getIndicatorConfig("macd");
      if (!cfg?.enabled) continue;
      const out = indicators.indicators.macd;
      if (!out?.series.macd?.length) continue;
      panes.push({
        id,
        title: "MACD",
        latest: `H ${fmt(out.latest.macdHist, 4)}`,
        height: OSC_MACD_PANE_HEIGHT,
      });
      continue;
    }

    if (id === "mfi") {
      const cfg = getIndicatorConfig("mfi");
      if (!cfg?.enabled) continue;
      const out = indicators.indicators.mfi;
      if (!out?.series.mfi?.length) continue;
      const period = (cfg.params.period as number | undefined) ?? 14;
      panes.push({
        id,
        title: `${meta.labelKo}(${period})`,
        latest: fmt(out.latest.mfi),
        height: OSC_PANE_HEIGHT,
      });
      continue;
    }

    if (id === "atr") {
      const cfg = getIndicatorConfig("atr");
      if (!cfg?.enabled) continue;
      const out = indicators.indicators.atr;
      if (!out?.series.atr?.length) continue;
      panes.push({
        id,
        title: meta.labelKo,
        latest: fmt(out.latest.atr),
        height: OSC_PANE_HEIGHT,
      });
      continue;
    }

    if (id === "bbPercentB") {
      const cfg = getIndicatorConfig("bb");
      if (!cfg?.enabled) continue;
      const out = indicators.indicators.bb;
      if (!out?.series.bbPercentB?.length) continue;
      panes.push({
        id,
        title: meta.labelKo,
        latest: fmt(out.latest.bbPercentB, 3),
        height: OSC_PANE_HEIGHT,
      });
    }
  }

  return panes;
}

export function oscExtraHeight(panes: OscPaneSpec[]): number {
  return panes.reduce((sum, p) => sum + p.height, 0);
}

export function toVolumeData(bars: OHLCVBar[]) {
  return bars.map((b) => ({
    time: b.date as `${number}-${number}-${number}`,
    value: b.volume,
    color:
      b.close >= b.open
        ? "rgba(0, 196, 113, 0.55)"
        : "rgba(240, 68, 82, 0.55)",
  }));
}

export function fmtVolume(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}
