import {
  SMA,
  EMA,
  RSI,
  MACD,
  BollingerBands,
  ATR,
  MFI,
  OBV,
  VWAP,
  ADX,
  PSAR,
  CCI,
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

/** Slow/Fast Stochastic: %K smoothed by `slowing`, %D = SMA(%K, signalPeriod). */
export const stochPlugin: IndicatorPlugin = {
  id: "stoch",
  minBars: (p) =>
    requireNumber(p.period, "stoch.period") +
    requireNumber(p.slowing, "stoch.slowing") +
    requireNumber(p.signalPeriod, "stoch.signalPeriod") -
    2,
  compute(bars, params) {
    const period = requireNumber(params.period, "stoch.period");
    const slowing = requireNumber(params.slowing, "stoch.slowing");
    const signalPeriod = requireNumber(params.signalPeriod, "stoch.signalPeriod");
    const minBars = period + slowing + signalPeriod - 2;

    if (bars.length < minBars) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { stochK: null, stochD: null },
        skipped: [`stoch requires ${minBars} bars, got ${bars.length}`],
      };
    }

    const d = dates(bars);
    const rawK: number[] = [];
    for (let i = 0; i < bars.length; i++) {
      if (i < period - 1) {
        rawK.push(NaN);
        continue;
      }
      let hh = -Infinity;
      let ll = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        hh = Math.max(hh, bars[j]!.high);
        ll = Math.min(ll, bars[j]!.low);
      }
      const range = hh - ll;
      rawK.push(range > 0 ? ((bars[i]!.close - ll) / range) * 100 : 50);
    }

    const smoothK: number[] = [];
    for (let i = 0; i < rawK.length; i++) {
      if (i < period - 1 + slowing - 1 || !Number.isFinite(rawK[i]!)) {
        smoothK.push(NaN);
        continue;
      }
      let sum = 0;
      let ok = true;
      for (let j = i - slowing + 1; j <= i; j++) {
        if (!Number.isFinite(rawK[j]!)) {
          ok = false;
          break;
        }
        sum += rawK[j]!;
      }
      smoothK.push(ok ? sum / slowing : NaN);
    }

    const dLine: number[] = [];
    for (let i = 0; i < smoothK.length; i++) {
      if (
        i < period - 1 + slowing - 1 + signalPeriod - 1 ||
        !Number.isFinite(smoothK[i]!)
      ) {
        dLine.push(NaN);
        continue;
      }
      let sum = 0;
      let ok = true;
      for (let j = i - signalPeriod + 1; j <= i; j++) {
        if (!Number.isFinite(smoothK[j]!)) {
          ok = false;
          break;
        }
        sum += smoothK[j]!;
      }
      dLine.push(ok ? sum / signalPeriod : NaN);
    }

    const kPts: number[] = [];
    const dPts: number[] = [];
    const datesAligned: string[] = [];
    for (let i = 0; i < bars.length; i++) {
      if (!Number.isFinite(smoothK[i]!) || !Number.isFinite(dLine[i]!)) continue;
      datesAligned.push(d[i]!);
      kPts.push(smoothK[i]!);
      dPts.push(dLine[i]!);
    }

    if (!kPts.length) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { stochK: null, stochD: null },
        skipped: [`stoch requires ${minBars} bars, got ${bars.length}`],
      };
    }

    return {
      series: {
        stochK: alignSeries(datesAligned, kPts),
        stochD: alignSeries(datesAligned, dPts),
      },
      latest: {
        stochK: optionalLatest(kPts.at(-1)),
        stochD: optionalLatest(dPts.at(-1)),
      },
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

export const obvPlugin: IndicatorPlugin = {
  id: "obv",
  minBars: () => 2,
  compute(bars, params) {
    if (bars.length < 2) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { obv: null, obvSignal: null, energy: null, slope: null },
        skipped: [`obv requires 2 bars, got ${bars.length}`],
      };
    }
    const signalPeriod = requireNumber(
      params.signalPeriod ?? 10,
      "obv.signalPeriod",
    );
    const energyLookback = requireNumber(
      params.energyLookback ?? 8,
      "obv.energyLookback",
    );
    const d = dates(bars);
    const vals = OBV.calculate({
      close: bars.map((b) => b.close),
      volume: bars.map((b) => b.volume),
    });
    const pad = bars.length - vals.length;
    const aligned = alignSeries(d.slice(pad), vals);

    const signalRaw =
      vals.length >= signalPeriod
        ? EMA.calculate({ period: signalPeriod, values: vals })
        : [];
    const signalPad = vals.length - signalRaw.length;
    const signalAligned = alignSeries(
      d.slice(pad + signalPad),
      signalRaw,
    );

    // Energy 0–100: |ΔOBV| over lookback vs recent max |ΔOBV|.
    const energyVals: Array<number | undefined> = Array(bars.length).fill(
      undefined,
    );
    const slopeVals: Array<number | undefined> = Array(bars.length).fill(
      undefined,
    );
    const absDeltas: number[] = [];
    for (let i = 0; i < vals.length; i++) {
      const bi = pad + i;
      if (i < energyLookback) continue;
      const delta = vals[i]! - vals[i - energyLookback]!;
      absDeltas.push(Math.abs(delta));
      const window = absDeltas.slice(-40);
      const peak = Math.max(...window, 1e-9);
      energyVals[bi] = Math.min(100, (Math.abs(delta) / peak) * 100);
      slopeVals[bi] = delta === 0 ? 0 : delta > 0 ? 1 : -1;
    }

    const last = bars.length - 1;
    return {
      series: {
        obv: aligned,
        obvSignal: signalAligned,
        energy: alignSeries(d, energyVals),
        slope: alignSeries(d, slopeVals),
      },
      latest: {
        obv: optionalLatest(vals.at(-1)),
        obvSignal: optionalLatest(signalRaw.at(-1)),
        energy: optionalLatest(energyVals[last]),
        slope: optionalLatest(slopeVals[last]),
      },
    };
  },
};

/** Keltner Channel: EMA mid ± multiplier * ATR (smoother than Bollinger). */
export const keltnerPlugin: IndicatorPlugin = {
  id: "keltner",
  minBars: (p) =>
    Math.max(
      requireNumber(p.emaPeriod ?? 20, "keltner.emaPeriod"),
      requireNumber(p.atrPeriod ?? 10, "keltner.atrPeriod"),
    ) + 1,
  compute(bars, params) {
    const emaPeriod = requireNumber(params.emaPeriod ?? 20, "keltner.emaPeriod");
    const atrPeriod = requireNumber(params.atrPeriod ?? 10, "keltner.atrPeriod");
    const multiplier = requireNumber(
      params.multiplier ?? 2,
      "keltner.multiplier",
    );
    const need = Math.max(emaPeriod, atrPeriod) + 1;
    if (bars.length < need) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { mid: null, upper: null, lower: null },
        skipped: [`keltner requires ${need} bars, got ${bars.length}`],
      };
    }
    const c = closes(bars);
    const d = dates(bars);
    const ema = EMA.calculate({ period: emaPeriod, values: c });
    const atr = ATR.calculate({
      period: atrPeriod,
      high: bars.map((b) => b.high),
      low: bars.map((b) => b.low),
      close: c,
    });
    const emaPad = bars.length - ema.length;
    const atrPad = bars.length - atr.length;
    const mid: Array<number | undefined> = Array(bars.length).fill(undefined);
    const upper: Array<number | undefined> = Array(bars.length).fill(undefined);
    const lower: Array<number | undefined> = Array(bars.length).fill(undefined);
    for (let i = 0; i < bars.length; i++) {
      const e = i >= emaPad ? ema[i - emaPad] : undefined;
      const a = i >= atrPad ? atr[i - atrPad] : undefined;
      if (e == null || a == null) continue;
      mid[i] = e;
      upper[i] = e + multiplier * a;
      lower[i] = e - multiplier * a;
    }
    const last = bars.length - 1;
    return {
      series: {
        mid: alignSeries(d, mid),
        upper: alignSeries(d, upper),
        lower: alignSeries(d, lower),
      },
      latest: {
        mid: optionalLatest(mid[last]),
        upper: optionalLatest(upper[last]),
        lower: optionalLatest(lower[last]),
      },
    };
  },
};

/**
 * Cumulative VWAP + stdev bands over the visible bar window (price overlay).
 * stdev uses volume-weighted variance of typical price around running VWAP.
 * Defaults match curriculum playbook bands (×2 / ×3).
 */
export const vwapPlugin: IndicatorPlugin = {
  id: "vwap",
  minBars: () => 1,
  compute(bars, params) {
    if (!bars.length) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: {
          vwap: null,
          upper1: null,
          lower1: null,
          upper2: null,
          lower2: null,
          slope: null,
        },
        skipped: ["vwap requires at least 1 bar"],
      };
    }
    const std1 = requireNumber(params.stdDev1 ?? 2, "vwap.stdDev1");
    const std2 = requireNumber(params.stdDev2 ?? 3, "vwap.stdDev2");

    const d = dates(bars);
    const vwapVals: number[] = [];
    const upper1: number[] = [];
    const lower1: number[] = [];
    const upper2: number[] = [];
    const lower2: number[] = [];
    const slopeVals: Array<number | undefined> = [];

    let cumPV = 0;
    let cumV = 0;
    let cumSrc2V = 0;

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i]!;
      const vol = Math.max(0, b.volume);
      const src = (b.high + b.low + b.close) / 3;
      cumPV += src * vol;
      cumV += vol;
      cumSrc2V += src * src * vol;
      if (cumV <= 0) {
        // Fallback when volume is zero: library-style typical average.
        const fallback = VWAP.calculate({
          high: [b.high],
          low: [b.low],
          close: [b.close],
          volume: [1],
        })[0]!;
        vwapVals.push(fallback);
        upper1.push(fallback);
        lower1.push(fallback);
        upper2.push(fallback);
        lower2.push(fallback);
        slopeVals.push(undefined);
        continue;
      }
      const vwap = cumPV / cumV;
      const variance = Math.max(0, cumSrc2V / cumV - vwap * vwap);
      const sd = Math.sqrt(variance);
      vwapVals.push(vwap);
      upper1.push(vwap + std1 * sd);
      lower1.push(vwap - std1 * sd);
      upper2.push(vwap + std2 * sd);
      lower2.push(vwap - std2 * sd);
      if (i > 0) {
        const prev = vwapVals[i - 1]!;
        slopeVals.push(vwap === prev ? 0 : vwap > prev ? 1 : -1);
      } else {
        slopeVals.push(undefined);
      }
    }

    const last = bars.length - 1;
    const slopeLookback = Math.min(5, last);
    let slope: number | null = null;
    if (slopeLookback > 0) {
      const a = vwapVals[last - slopeLookback]!;
      const b = vwapVals[last]!;
      slope = b === a ? 0 : b > a ? 1 : -1;
    }

    return {
      series: {
        vwap: alignSeries(d, vwapVals),
        upper1: alignSeries(d, upper1),
        lower1: alignSeries(d, lower1),
        upper2: alignSeries(d, upper2),
        lower2: alignSeries(d, lower2),
        slope: alignSeries(d, slopeVals),
      },
      latest: {
        vwap: optionalLatest(vwapVals[last]),
        upper1: optionalLatest(upper1[last]),
        lower1: optionalLatest(lower1[last]),
        upper2: optionalLatest(upper2[last]),
        lower2: optionalLatest(lower2[last]),
        slope,
      },
    };
  },
};

export const adxPlugin: IndicatorPlugin = {
  id: "adx",
  minBars: (p) => requireNumber(p.period, "adx.period") * 2,
  compute(bars, params) {
    const period = requireNumber(params.period, "adx.period");
    const minBars = period * 2;
    if (bars.length < minBars) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { adx: null, plusDI: null, minusDI: null },
        skipped: [`adx requires ${minBars} bars, got ${bars.length}`],
      };
    }
    const d = dates(bars);
    const rows = ADX.calculate({
      period,
      high: bars.map((b) => b.high),
      low: bars.map((b) => b.low),
      close: bars.map((b) => b.close),
    });
    const pad = bars.length - rows.length;
    const sliceD = d.slice(pad);
    const adxVals = rows.map((r) => r.adx);
    const pdiVals = rows.map((r) => r.pdi);
    const mdiVals = rows.map((r) => r.mdi);
    const last = rows.at(-1);
    return {
      series: {
        adx: alignSeries(sliceD, adxVals),
        plusDI: alignSeries(sliceD, pdiVals),
        minusDI: alignSeries(sliceD, mdiVals),
      },
      latest: {
        adx: optionalLatest(last?.adx),
        plusDI: optionalLatest(last?.pdi),
        minusDI: optionalLatest(last?.mdi),
      },
    };
  },
};

export const psarPlugin: IndicatorPlugin = {
  id: "psar",
  minBars: () => 2,
  compute(bars, params) {
    const step = requireNumber(params.step ?? 0.02, "psar.step");
    const max = requireNumber(params.max ?? 0.2, "psar.max");
    if (bars.length < 2) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { psar: null, direction: null },
        skipped: [`psar requires 2 bars, got ${bars.length}`],
      };
    }
    const d = dates(bars);
    const vals = PSAR.calculate({
      high: bars.map((b) => b.high),
      low: bars.map((b) => b.low),
      step,
      max,
    });
    const pad = bars.length - vals.length;
    const aligned = alignSeries(d.slice(pad), vals);
    const lastClose = bars.at(-1)?.close;
    const lastPsar = vals.at(-1);
    const direction =
      lastClose != null && lastPsar != null
        ? lastClose > lastPsar
          ? 1
          : -1
        : null;
    return {
      series: { psar: aligned },
      latest: {
        psar: optionalLatest(lastPsar),
        direction,
      },
    };
  },
};

export const cciPlugin: IndicatorPlugin = {
  id: "cci",
  minBars: (p) => requireNumber(p.period, "cci.period"),
  compute(bars, params) {
    const period = requireNumber(params.period, "cci.period");
    if (bars.length < period) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { cci: null },
        skipped: [`cci requires ${period} bars, got ${bars.length}`],
      };
    }
    const d = dates(bars);
    const vals = CCI.calculate({
      period,
      high: bars.map((b) => b.high),
      low: bars.map((b) => b.low),
      close: bars.map((b) => b.close),
    });
    const pad = bars.length - vals.length;
    return {
      series: { cci: alignSeries(d.slice(pad), vals) },
      latest: { cci: optionalLatest(vals.at(-1)) },
    };
  },
};

/**
 * TradingView-style Supertrend (ATR trailing stop + trend direction).
 * Defaults: ATR period 10, multiplier 3.
 */
export const supertrendPlugin: IndicatorPlugin = {
  id: "supertrend",
  minBars: (p) => requireNumber(p.atrPeriod ?? p.period ?? 10, "supertrend.atrPeriod") + 1,
  compute(bars, params) {
    const atrPeriod = requireNumber(
      params.atrPeriod ?? params.period ?? 10,
      "supertrend.atrPeriod",
    );
    const multiplier = requireNumber(
      params.multiplier ?? 3,
      "supertrend.multiplier",
    );
    if (bars.length < atrPeriod + 1) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { supertrend: null, direction: null },
        skipped: [
          `supertrend requires ${atrPeriod + 1} bars, got ${bars.length}`,
        ],
      };
    }

    const highs = bars.map((b) => b.high);
    const lows = bars.map((b) => b.low);
    const closes = bars.map((b) => b.close);
    const atrRaw = ATR.calculate({
      period: atrPeriod,
      high: highs,
      low: lows,
      close: closes,
    });
    const atrPad = bars.length - atrRaw.length;
    const atr: Array<number | null> = Array(bars.length).fill(null);
    for (let i = 0; i < atrRaw.length; i++) atr[atrPad + i] = atrRaw[i]!;

    const stVals: Array<number | undefined> = Array(bars.length).fill(undefined);
    const dirVals: Array<number | undefined> = Array(bars.length).fill(undefined);

    let prevUpper = NaN;
    let prevLower = NaN;
    let prevST = NaN;

    for (let i = 0; i < bars.length; i++) {
      const a = atr[i];
      if (a == null || !Number.isFinite(a)) continue;
      const hl2 = (highs[i]! + lows[i]!) / 2;
      const basicUpper = hl2 + multiplier * a;
      const basicLower = hl2 - multiplier * a;

      let finalUpper: number;
      let finalLower: number;
      if (
        !Number.isFinite(prevUpper) ||
        basicUpper < prevUpper ||
        closes[i - 1]! > prevUpper
      ) {
        finalUpper = basicUpper;
      } else {
        finalUpper = prevUpper;
      }
      if (
        !Number.isFinite(prevLower) ||
        basicLower > prevLower ||
        closes[i - 1]! < prevLower
      ) {
        finalLower = basicLower;
      } else {
        finalLower = prevLower;
      }

      let currST: number;
      let trend: number;
      if (!Number.isFinite(prevST)) {
        trend = closes[i]! >= finalLower ? 1 : -1;
        currST = trend === 1 ? finalLower : finalUpper;
      } else if (prevST === prevUpper) {
        if (closes[i]! > finalUpper) {
          trend = 1;
          currST = finalLower;
        } else {
          trend = -1;
          currST = finalUpper;
        }
      } else if (closes[i]! < finalLower) {
        trend = -1;
        currST = finalUpper;
      } else {
        trend = 1;
        currST = finalLower;
      }

      stVals[i] = currST;
      dirVals[i] = trend;
      prevUpper = finalUpper;
      prevLower = finalLower;
      prevST = currST;
    }

    const d = dates(bars);
    const lastIdx = bars.length - 1;
    return {
      series: {
        supertrend: alignSeries(d, stVals),
        direction: alignSeries(d, dirVals),
      },
      latest: {
        supertrend: optionalLatest(stVals[lastIdx]),
        direction: optionalLatest(dirVals[lastIdx]),
      },
    };
  },
};

function donchianMid(
  highs: number[],
  lows: number[],
  end: number,
  period: number,
): number | null {
  if (end < period - 1) return null;
  let hi = -Infinity;
  let lo = Infinity;
  for (let i = end - period + 1; i <= end; i++) {
    hi = Math.max(hi, highs[i]!);
    lo = Math.min(lo, lows[i]!);
  }
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return null;
  return (hi + lo) / 2;
}

/** Average step between bar timestamps (ms); fallback 1 day. */
function avgBarStepMs(bars: { date: string }[]): number {
  const n = Math.min(bars.length, 40);
  if (n < 2) return 86_400_000;
  let sum = 0;
  let count = 0;
  for (let i = bars.length - n + 1; i < bars.length; i++) {
    const a = Date.parse(bars[i - 1]!.date);
    const b = Date.parse(bars[i]!.date);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue;
    sum += b - a;
    count += 1;
  }
  return count > 0 ? sum / count : 86_400_000;
}

function formatBarDate(ms: number, sample: string): string {
  const d = new Date(ms);
  // Preserve YYYY-MM-DD when sample is date-only (UTC calendar).
  if (/^\d{4}-\d{2}-\d{2}$/.test(sample)) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return d.toISOString().slice(0, 19);
}

function plotDateAt(
  bars: { date: string }[],
  index: number,
  stepMs: number,
): string {
  if (index < bars.length) return bars[index]!.date;
  const last = bars[bars.length - 1]!;
  const lastMs = Date.parse(last.date);
  const ahead = index - (bars.length - 1);
  return formatBarDate(lastMs + ahead * stepMs, last.date);
}

export const ichimokuPlugin: IndicatorPlugin = {
  id: "ichimoku",
  minBars: (p) => {
    const span = requireNumber(p.spanPeriod, "ichimoku.spanPeriod");
    const disp = requireNumber(p.displacement, "ichimoku.displacement");
    return span + disp;
  },
  compute(bars, params) {
    const conversionPeriod = requireNumber(
      params.conversionPeriod,
      "ichimoku.conversionPeriod",
    );
    const basePeriod = requireNumber(params.basePeriod, "ichimoku.basePeriod");
    const spanPeriod = requireNumber(params.spanPeriod, "ichimoku.spanPeriod");
    const displacement = requireNumber(
      params.displacement,
      "ichimoku.displacement",
    );
    const need = spanPeriod;
    if (bars.length < need) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: {
          tenkan: null,
          kijun: null,
          spanA: null,
          spanB: null,
          chikou: null,
          displacement,
        },
        skipped: [`ichimoku requires ${need} bars, got ${bars.length}`],
      };
    }

    const highs = bars.map((b) => b.high);
    const lows = bars.map((b) => b.low);
    const stepMs = avgBarStepMs(bars);

    const tenkan: SeriesPoint[] = [];
    const kijun: SeriesPoint[] = [];
    const spanA: SeriesPoint[] = [];
    const spanB: SeriesPoint[] = [];
    const chikou: SeriesPoint[] = [];

    for (let i = 0; i < bars.length; i++) {
      const t = donchianMid(highs, lows, i, conversionPeriod);
      const k = donchianMid(highs, lows, i, basePeriod);
      if (t != null) tenkan.push({ date: bars[i]!.date, value: t });
      if (k != null) kijun.push({ date: bars[i]!.date, value: k });

      const sB = donchianMid(highs, lows, i, spanPeriod);
      if (t != null && k != null && sB != null) {
        const sA = (t + k) / 2;
        const plotDate = plotDateAt(bars, i + displacement, stepMs);
        spanA.push({ date: plotDate, value: sA });
        spanB.push({ date: plotDate, value: sB });
      }

      if (i >= displacement) {
        chikou.push({
          date: bars[i - displacement]!.date,
          value: bars[i]!.close,
        });
      }
    }

    // Latest cloud at last bar date (displaced values already on that date).
    const lastDate = bars[bars.length - 1]!.date;
    const lastSpanA = [...spanA].reverse().find((p) => p.date <= lastDate);
    const lastSpanB = [...spanB].reverse().find((p) => p.date <= lastDate);

    return {
      series: { tenkan, kijun, spanA, spanB, chikou },
      latest: {
        tenkan: optionalLatest(tenkan.at(-1)?.value),
        kijun: optionalLatest(kijun.at(-1)?.value),
        spanA: optionalLatest(lastSpanA?.value),
        spanB: optionalLatest(lastSpanB?.value),
        chikou: optionalLatest(chikou.at(-1)?.value),
        displacement,
      },
    };
  },
};

export const allPlugins = [
  smaPlugin,
  emaPlugin,
  rsiPlugin,
  macdPlugin,
  stochPlugin,
  bbPlugin,
  mfiPlugin,
  atrPlugin,
  obvPlugin,
  keltnerPlugin,
  vwapPlugin,
  adxPlugin,
  psarPlugin,
  cciPlugin,
  supertrendPlugin,
  ichimokuPlugin,
];

export { hasOutput as indicatorHasOutput };
