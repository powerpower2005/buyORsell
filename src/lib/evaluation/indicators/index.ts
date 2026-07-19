import {
  SMA,
  EMA,
  RSI,
  MACD,
  BollingerBands,
  ATR,
  MFI,
} from "technicalindicators";

import type { SeriesPoint } from "../../types";

import type { IndicatorPlugin } from "../types";

import { alignSeries, closes, dates } from "../types";

import { ConfigError } from "../../errors";

import { requireDefined, requireNumber } from "../../require";

function requirePeriods(params: Record<string, unknown>, label: string): number[] {
  const periods = params.periods;
  if (!Array.isArray(periods) || periods.length === 0) {
    throw new ConfigError(`Missing ${label}.params.periods`);
  }
  return periods.map((p, i) => requireNumber(p, `${label}.params.periods[${i}]`));
}

function optionalLatest(value: number | undefined | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

function hasOutput(out: {
  series: Record<string, SeriesPoint[]>;
  latest: Record<string, number | null>;
}): boolean {
  if (Object.values(out.latest).some((v) => v != null)) return true;
  return Object.values(out.series).some((s) => s.length > 0);
}

export const smaPlugin: IndicatorPlugin = {
  id: "sma",
  minBars: (p) => Math.min(...requirePeriods(p, "sma")),
  compute(bars, params) {
    const periods = requirePeriods(params, "sma");
    const c = closes(bars);
    const d = dates(bars);
    const series: Record<string, SeriesPoint[]> = {};
    const latest: Record<string, number | null> = {};
    const skipped: string[] = [];

    for (const period of periods) {
      const key = `sma:${period}`;
      if (bars.length < period) {
        skipped.push(
          `SMA(${period}): 봉 ${period}개 필요 · 현재 ${bars.length}개라 차트에 그릴 수 없습니다`,
        );
        latest[key] = null;
        continue;
      }
      const vals = SMA.calculate({ period, values: c });
      const pad = c.length - vals.length;
      const aligned = alignSeries(d.slice(pad), vals.map((v) => v));
      series[key] = aligned;
      latest[key] = optionalLatest(aligned.at(-1)?.value);
    }

    return { series, latest, skipped: skipped.length ? skipped : undefined };
  },
};

export const emaPlugin: IndicatorPlugin = {
  id: "ema",
  minBars: (p) => Math.min(...requirePeriods(p, "ema")),
  compute(bars, params) {
    const periods = requirePeriods(params, "ema");
    const c = closes(bars);
    const d = dates(bars);
    const series: Record<string, SeriesPoint[]> = {};
    const latest: Record<string, number | null> = {};
    const skipped: string[] = [];

    for (const period of periods) {
      const key = `ema:${period}`;
      if (bars.length < period) {
        skipped.push(
          `EMA(${period}): 봉 ${period}개 필요 · 현재 ${bars.length}개라 차트에 그릴 수 없습니다`,
        );
        latest[key] = null;
        continue;
      }
      const vals = EMA.calculate({ period, values: c });
      const pad = c.length - vals.length;
      series[key] = alignSeries(d.slice(pad), vals);
      latest[key] = optionalLatest(vals.at(-1));
    }

    return { series, latest, skipped: skipped.length ? skipped : undefined };
  },
};

export const rsiPlugin: IndicatorPlugin = {
  id: "rsi",
  minBars: (p) => requireNumber(p.period, "rsi.period"),
  compute(bars, params) {
    const period = requireNumber(params.period, "rsi.period");
    // Super-RSI style overlays: short weighted RSI + dynamic bands on RSI.
    const weightPeriod = 4;
    const bandPeriod = 20;
    const bandStd = 1.5;
    const need = period + bandPeriod;
    if (bars.length < period) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: {
          rsi: null,
          rsiWeighted: null,
          rsiMid: null,
          rsiUpper: null,
          rsiLower: null,
        },
        skipped: [`rsi requires ${period} bars, got ${bars.length}`],
      };
    }

    const c = closes(bars);
    const d = dates(bars);
    const vals = RSI.calculate({ period, values: c });
    const pad = c.length - vals.length;
    const aligned = alignSeries(d.slice(pad), vals);

    const series: Record<string, SeriesPoint[]> = { rsi: aligned };
    const latest: Record<string, number | null> = {
      rsi: optionalLatest(vals.at(-1)),
      rsiWeighted: null,
      rsiMid: null,
      rsiUpper: null,
      rsiLower: null,
    };

    if (vals.length >= weightPeriod) {
      const weighted = SMA.calculate({ period: weightPeriod, values: vals });
      const wPad = vals.length - weighted.length;
      series.rsiWeighted = alignSeries(
        d.slice(pad + wPad),
        weighted,
      );
      latest.rsiWeighted = optionalLatest(weighted.at(-1));
    }

    if (vals.length >= bandPeriod && bars.length >= need) {
      const bands = BollingerBands.calculate({
        period: bandPeriod,
        stdDev: bandStd,
        values: vals,
      });
      const bPad = vals.length - bands.length;
      const datesBand = d.slice(pad + bPad);
      series.rsiMid = alignSeries(
        datesBand,
        bands.map((b) => b.middle),
      );
      series.rsiUpper = alignSeries(
        datesBand,
        bands.map((b) => b.upper),
      );
      series.rsiLower = alignSeries(
        datesBand,
        bands.map((b) => b.lower),
      );
      const last = bands.at(-1);
      latest.rsiMid = optionalLatest(last?.middle);
      latest.rsiUpper = optionalLatest(last?.upper);
      latest.rsiLower = optionalLatest(last?.lower);
    }

    return { series, latest };
  },
};

export const macdPlugin: IndicatorPlugin = {
  id: "macd",
  minBars: (p) => requireNumber(p.slow, "macd.slow"),
  compute(bars, params) {
    const fast = requireNumber(params.fast, "macd.fast");
    const slow = requireNumber(params.slow, "macd.slow");
    const signal = requireNumber(params.signal, "macd.signal");
    const minBars = slow + signal;

    if (bars.length < minBars) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { macd: null, macdSignal: null, macdHist: null },
        skipped: [`macd requires ${minBars} bars, got ${bars.length}`],
      };
    }

    const c = closes(bars);
    const d = dates(bars);
    const vals = MACD.calculate({
      fastPeriod: fast,
      slowPeriod: slow,
      signalPeriod: signal,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
      values: c,
    });

    if (!vals.length) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { macd: null, macdSignal: null, macdHist: null },
        skipped: [`macd requires ${minBars} bars, got ${bars.length}`],
      };
    }

    const pad = c.length - vals.length;
    const sliceD = d.slice(pad);
    const last = requireDefined(vals.at(-1), "macd last value");

    return {
      series: {
        macd: alignSeries(sliceD, vals.map((v) => v.MACD)),
        macdSignal: alignSeries(sliceD, vals.map((v) => v.signal)),
        macdHist: alignSeries(sliceD, vals.map((v) => v.histogram)),
      },
      latest: {
        macd: optionalLatest(last.MACD),
        macdSignal: optionalLatest(last.signal),
        macdHist: optionalLatest(last.histogram),
      },
    };
  },
};

export const bbPlugin: IndicatorPlugin = {
  id: "bb",
  minBars: (p) => requireNumber(p.period, "bb.period"),
  compute(bars, params) {
    const period = requireNumber(params.period, "bb.period");
    if (bars.length < period) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: {
          bbUpper: null,
          bbMiddle: null,
          bbLower: null,
          bbPercentB: null,
          bbBandwidth: null,
        },
        skipped: [`bb requires ${period} bars, got ${bars.length}`],
      };
    }

    const stdDev = requireNumber(params.stdDev, "bb.stdDev");
    const c = closes(bars);
    const d = dates(bars);
    const vals = BollingerBands.calculate({ period, stdDev, values: c });
    const pad = c.length - vals.length;
    const sliceD = d.slice(pad);
    const last = requireDefined(vals.at(-1), "bb last value");
    const pbVals: number[] = [];
    const bwVals: number[] = [];
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      const width = v.upper - v.lower;
      pbVals.push(width > 0 ? (c[pad + i] - v.lower) / width : NaN);
      bwVals.push(v.middle > 0 ? width / v.middle : NaN);
    }

    return {
      series: {
        bbUpper: alignSeries(sliceD, vals.map((v) => v.upper)),
        bbMiddle: alignSeries(sliceD, vals.map((v) => v.middle)),
        bbLower: alignSeries(sliceD, vals.map((v) => v.lower)),
        bbPercentB: alignSeries(sliceD, pbVals),
        bbBandwidth: alignSeries(sliceD, bwVals),
      },
      latest: {
        bbUpper: optionalLatest(last.upper),
        bbMiddle: optionalLatest(last.middle),
        bbLower: optionalLatest(last.lower),
        bbPercentB: optionalLatest(pbVals.at(-1)),
        bbBandwidth: optionalLatest(bwVals.at(-1)),
      },
    };
  },
};

export const mfiPlugin: IndicatorPlugin = {
  id: "mfi",
  minBars: (p) => requireNumber(p.period, "mfi.period") + 1,
  compute(bars, params) {
    const period = requireNumber(params.period, "mfi.period");
    const minBars = period + 1;
    if (bars.length < minBars) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { mfi: null },
        skipped: [`mfi requires ${minBars} bars, got ${bars.length}`],
      };
    }

    const d = dates(bars);
    const vals = MFI.calculate({
      period,
      high: bars.map((b) => b.high),
      low: bars.map((b) => b.low),
      close: bars.map((b) => b.close),
      volume: bars.map((b) => b.volume),
    });
    const pad = bars.length - vals.length;
    const aligned = alignSeries(d.slice(pad), vals);

    return {
      series: { mfi: aligned },
      latest: { mfi: optionalLatest(vals.at(-1)) },
    };
  },
};

export const atrPlugin: IndicatorPlugin = {
  id: "atr",
  minBars: (p) => requireNumber(p.period, "atr.period"),
  compute(bars, params) {
    const period = requireNumber(params.period, "atr.period");
    if (bars.length < period) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { atr: null },
        skipped: [`atr requires ${period} bars, got ${bars.length}`],
      };
    }

    const d = dates(bars);
    const vals = ATR.calculate({
      period,
      high: bars.map((b) => b.high),
      low: bars.map((b) => b.low),
      close: bars.map((b) => b.close),
    });
    const pad = bars.length - vals.length;
    const aligned = alignSeries(d.slice(pad), vals);

    return {
      series: { atr: aligned },
      latest: { atr: optionalLatest(vals.at(-1)) },
    };
  },
};

export const allPlugins = [
  smaPlugin,
  emaPlugin,
  rsiPlugin,
  macdPlugin,
  bbPlugin,
  mfiPlugin,
  atrPlugin,
];

export { hasOutput as indicatorHasOutput };
