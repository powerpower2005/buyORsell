import type { OHLCVBar, Timeframe } from "../types";
import { InsufficientDataError } from "../errors";
import { requireMinBars, requireNonEmptyArray } from "../require";

export const VOLUME_MA_PERIODS = [3, 7, 15, 30] as const;
export const VOLUME_MA_PERIODS_WEEKLY = [3, 7, 15] as const;

export type VolumeMaPeriod = (typeof VOLUME_MA_PERIODS)[number];

export interface VolumeMaPoint {
  date: string;
  value: number;
}

export interface VolumeMaSeries {
  period: VolumeMaPeriod;
  series: VolumeMaPoint[];
  latest: number;
}

export interface VolumeMaSnapshot {
  currentVolume: number;
  currentDate: string;
  averages: VolumeMaSeries[];
}

const TF_UNIT: Record<Timeframe, string> = {
  "15m": "봉",
  "1h": "시간",
  "4h": "봉",
  "1d": "일",
  "1w": "주",
};

export const VOLUME_MA_COLORS: Record<VolumeMaPeriod, string> = {
  3: "#3182f6",
  7: "#fbbf24",
  15: "#c084fc",
  30: "#8b95a1",
};

export function getVolumeMaPeriods(timeframe: Timeframe): readonly number[] {
  return timeframe === "1w" ? VOLUME_MA_PERIODS_WEEKLY : VOLUME_MA_PERIODS;
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

  const maxPeriod = Math.max(...periods);
  requireMinBars(bars.length, maxPeriod, "volume moving average");

  const volumes = bars.map((b) => b.volume);
  const dates = bars.map((b) => b.date);
  const last = bars[bars.length - 1];

  const averages: VolumeMaSeries[] = periods.map((period) => {
    const vals = sma(volumes, period);
    const series: VolumeMaPoint[] = [];
    for (let i = 0; i < dates.length; i++) {
      const v = vals[i];
      if (!Number.isNaN(v)) series.push({ date: dates[i], value: v });
    }
    const latest = vals[vals.length - 1];
    if (Number.isNaN(latest)) {
      throw new InsufficientDataError(
        `volume MA(${period}): insufficient bars (${bars.length})`,
      );
    }
    return {
      period: period as VolumeMaPeriod,
      series,
      latest,
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
