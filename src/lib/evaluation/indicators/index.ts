import { SMA, EMA, RSI, MACD, BollingerBands, ATR } from "technicalindicators";

import type { SeriesPoint } from "../../types";

import type { IndicatorPlugin } from "../types";

import { alignSeries, closes, dates } from "../types";

import { ConfigError, InsufficientDataError } from "../../errors";

import { requireDefined, requireNumber } from "../../require";



function requirePeriods(params: Record<string, unknown>, label: string): number[] {

  const periods = params.periods;

  if (!Array.isArray(periods) || periods.length === 0) {

    throw new ConfigError(`Missing ${label}.params.periods`);

  }

  return periods.map((p, i) => requireNumber(p, `${label}.params.periods[${i}]`));

}



function requireLatest(

  value: number | undefined | null,

  label: string,

): number {

  if (value == null || Number.isNaN(value)) {

    throw new InsufficientDataError(`Indicator latest value missing: ${label}`);

  }

  return value;

}



export const smaPlugin: IndicatorPlugin = {

  id: "sma",

  minBars: (p) => Math.max(...requirePeriods(p, "sma")),

  compute(bars, params) {

    const periods = requirePeriods(params, "sma");

    const c = closes(bars);

    const d = dates(bars);

    const series: Record<string, SeriesPoint[]> = {};

    const latest: Record<string, number | null> = {};

    for (const period of periods) {

      const vals = SMA.calculate({ period, values: c });

      const pad = c.length - vals.length;

      const aligned = alignSeries(d.slice(pad), vals.map((v) => v));

      series[`sma:${period}`] = aligned;

      latest[`sma:${period}`] = requireLatest(

        aligned.at(-1)?.value,

        `sma:${period}`,

      );

    }

    return { series, latest };

  },

};



export const emaPlugin: IndicatorPlugin = {

  id: "ema",

  minBars: (p) => Math.max(...requirePeriods(p, "ema")),

  compute(bars, params) {

    const periods = requirePeriods(params, "ema");

    const c = closes(bars);

    const d = dates(bars);

    const series: Record<string, SeriesPoint[]> = {};

    const latest: Record<string, number | null> = {};

    for (const period of periods) {

      const vals = EMA.calculate({ period, values: c });

      const pad = c.length - vals.length;

      series[`ema:${period}`] = alignSeries(d.slice(pad), vals);

      latest[`ema:${period}`] = requireLatest(vals.at(-1), `ema:${period}`);

    }

    return { series, latest };

  },

};



export const rsiPlugin: IndicatorPlugin = {

  id: "rsi",

  minBars: (p) => requireNumber(p.period, "rsi.period"),

  compute(bars, params) {

    const period = requireNumber(params.period, "rsi.period");

    const c = closes(bars);

    const d = dates(bars);

    const vals = RSI.calculate({ period, values: c });

    const pad = c.length - vals.length;

    const aligned = alignSeries(d.slice(pad), vals);

    return {

      series: { rsi: aligned },

      latest: { rsi: requireLatest(vals.at(-1), "rsi") },

    };

  },

};



export const macdPlugin: IndicatorPlugin = {

  id: "macd",

  minBars: (p) =>

    requireNumber(p.slow, "macd.slow") + requireNumber(p.signal, "macd.signal"),

  compute(bars, params) {

    const fast = requireNumber(params.fast, "macd.fast");

    const slow = requireNumber(params.slow, "macd.slow");

    const signal = requireNumber(params.signal, "macd.signal");

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

        macd: requireLatest(last.MACD, "macd"),

        macdSignal: requireLatest(last.signal, "macdSignal"),

        macdHist: requireLatest(last.histogram, "macdHist"),

      },

    };

  },

};



export const bbPlugin: IndicatorPlugin = {

  id: "bb",

  minBars: (p) => requireNumber(p.period, "bb.period"),

  compute(bars, params) {

    const period = requireNumber(params.period, "bb.period");

    const stdDev = requireNumber(params.stdDev, "bb.stdDev");

    const c = closes(bars);

    const d = dates(bars);

    const vals = BollingerBands.calculate({ period, stdDev, values: c });

    const pad = c.length - vals.length;

    const sliceD = d.slice(pad);

    const last = requireDefined(vals.at(-1), "bb last value");

    return {

      series: {

        bbUpper: alignSeries(sliceD, vals.map((v) => v.upper)),

        bbMiddle: alignSeries(sliceD, vals.map((v) => v.middle)),

        bbLower: alignSeries(sliceD, vals.map((v) => v.lower)),

      },

      latest: {

        bbUpper: requireLatest(last.upper, "bbUpper"),

        bbMiddle: requireLatest(last.middle, "bbMiddle"),

        bbLower: requireLatest(last.lower, "bbLower"),

      },

    };

  },

};



export const atrPlugin: IndicatorPlugin = {

  id: "atr",

  minBars: (p) => requireNumber(p.period, "atr.period"),

  compute(bars, params) {

    const period = requireNumber(params.period, "atr.period");

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

      latest: { atr: requireLatest(vals.at(-1), "atr") },

    };

  },

};



export const allPlugins = [

  smaPlugin,

  emaPlugin,

  rsiPlugin,

  macdPlugin,

  bbPlugin,

  atrPlugin,

];

