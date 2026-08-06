import type { OHLCVBar, Timeframe } from "../types";
import { requireNonEmptyArray } from "../require";
import { CHART_SURFACE, SERIES } from "@/lib/chart/chartTheme";

export const VOLUME_MA_PERIODS = [3, 7, 15, 30] as const;
export const VOLUME_MA_PERIODS_DAILY = [...VOLUME_MA_PERIODS, 90] as const;
export const VOLUME_MA_PERIODS_WEEKLY = [3, 7, 15] as const;
export const VOLUME_MA_PERIODS_MONTHLY = [3, 6, 12] as const;

export interface VolumeMaPoint {
  date: string;
  value: number;
}

export interface VolumeMaSeries {
  period: number;
  series: VolumeMaPoint[];
  latest: number | null;
  available: boolean;
}

export interface VolumeMaSnapshot {
  currentVolume: number;
  currentDate: string;
  averages: VolumeMaSeries[];
}

const TF_UNIT: Record<Timeframe, string> = {
  "1d": "일",
  "1w": "주",
  "1mo": "월",
};

export const VOLUME_MA_COLORS: Record<number, string> = {
  3: SERIES.accent,
  6: SERIES.teal,
  7: SERIES.amber,
  12: SERIES.blue,
  15: SERIES.purple,
  30: CHART_SURFACE.text,
  90: SERIES.slate,
};

export function getVolumeMaPeriods(timeframe: Timeframe): readonly number[] {
  if (timeframe === "1mo") return VOLUME_MA_PERIODS_MONTHLY;
  if (timeframe === "1w") return VOLUME_MA_PERIODS_WEEKLY;
  if (timeframe === "1d") return VOLUME_MA_PERIODS_DAILY;
  return VOLUME_MA_PERIODS;
}

export function volumeMaColor(period: number): string {
  return VOLUME_MA_COLORS[period] ?? CHART_SURFACE.text;
}

function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    out.push(sum / period);
  }
  return out;
}

export function computeVolumeAverages(
  bars: OHLCVBar[],
  periods: readonly number[] = VOLUME_MA_PERIODS,
): VolumeMaSnapshot {
  requireNonEmptyArray(bars, "OHLCV bars");

  const volumes = bars.map((b) => b.volume);
  const dates = bars.map((b) => b.date);
  const last = bars[bars.length - 1];

  const averages: VolumeMaSeries[] = periods.map((period) => {
    if (bars.length < period) {
      return {
        period,
        series: [],
        latest: null,
        available: false,
      };
    }

    const vals = sma(volumes, period);
    const series: VolumeMaPoint[] = [];
    for (let i = 0; i < dates.length; i++) {
      const v = vals[i];
      if (!Number.isNaN(v)) series.push({ date: dates[i], value: v });
    }
    const latest = vals[vals.length - 1];

    return {
      period,
      series,
      latest: Number.isNaN(latest) ? null : latest,
      available: !Number.isNaN(latest),
    };
  });

  return {
    currentVolume: last.volume,
    currentDate: last.date,
    averages,
  };
}

export function volumeMaLabel(period: number, timeframe: Timeframe): string {
  return `${period}${TF_UNIT[timeframe]} 평균`;
}

export function formatVolume(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function volumeMaUnavailableReason(period: number, timeframe: Timeframe): string {
  return `데이터 부족 (${period}${TF_UNIT[timeframe]}치 미만)`;
}
