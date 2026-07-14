import type { OHLCVBar, SeriesPoint } from "../types";

export interface IndicatorPlugin {
  id: string;
  compute(
    bars: OHLCVBar[],
    params: Record<string, unknown>,
  ): {
    series: Record<string, SeriesPoint[]>;
    latest: Record<string, number | null>;
    skipped?: string[];
  };
  /** Minimum bars before attempting any output for this plugin. */
  minBars(params: Record<string, unknown>): number;
}

export interface IndicatorConfigItem {
  id: string;
  enabled: boolean;
  params: Record<string, unknown>;
  timeframes?: string[];
  overbought?: number;
  oversold?: number;
}

export interface SignalConfig {
  id: string;
  type: string;
  fast?: string;
  slow?: string;
  indicator?: string;
  op?: string;
  value?: number;
  timeframes?: string[];
}

export interface IndicatorsConfig {
  schemaVersion: number;
  indicators: IndicatorConfigItem[];
  signals: SignalConfig[];
}

function alignSeries(dates: string[], values: (number | undefined)[]): SeriesPoint[] {
  return dates
    .map((date, i) => ({ date, value: values[i] }))
    .filter((p): p is SeriesPoint => p.value !== undefined && !Number.isNaN(p.value));
}

export function closes(bars: OHLCVBar[]): number[] {
  return bars.map((b) => b.close);
}

export function dates(bars: OHLCVBar[]): string[] {
  return bars.map((b) => b.date);
}

export { alignSeries };
