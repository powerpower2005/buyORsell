/**
 * Volume-flow indicators: A/D, Chaikin Oscillator, EOM, Midpoint OBV, EquiVolume.
 */
import { ADL, EMA, SMA } from "technicalindicators";

import type { SeriesPoint } from "../../types";
import type { IndicatorPlugin } from "../types";
import { alignSeries, dates } from "../types";
import { requireNumber } from "../../require";

function optionalLatest(value: number | undefined | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

/** Shape codes: 1=narrow, 2=square, 3=oversquare. */
export const EQUIVOLUME_NARROW = 1;
export const EQUIVOLUME_SQUARE = 2;
export const EQUIVOLUME_OVERSQUARE = 3;

function computeAdLine(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
): number[] {
  return ADL.calculate({ high, low, close, volume });
}

export const adPlugin: IndicatorPlugin = {
  id: "ad",
  minBars: () => 1,
  compute(bars) {
    if (bars.length < 1) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { ad: null },
        skipped: [`ad requires 1 bar, got ${bars.length}`],
      };
    }
    const d = dates(bars);
    const vals = computeAdLine(
      bars.map((b) => b.high),
      bars.map((b) => b.low),
      bars.map((b) => b.close),
      bars.map((b) => b.volume),
    );
    const pad = bars.length - vals.length;
    const aligned = alignSeries(d.slice(pad), vals);
    return {
      series: { ad: aligned },
      latest: { ad: optionalLatest(vals.at(-1)) },
    };
  },
};

/** Chaikin Oscillator = EMA(fast, AD) − EMA(slow, AD). Default 3 / 10. */
export const chaikinPlugin: IndicatorPlugin = {
  id: "chaikin",
  minBars: (p) =>
    requireNumber(p.slow ?? 10, "chaikin.slow") +
    requireNumber(p.fast ?? 3, "chaikin.fast"),
  compute(bars, params) {
    const fast = requireNumber(params.fast ?? 3, "chaikin.fast");
    const slow = requireNumber(params.slow ?? 10, "chaikin.slow");
    const need = slow + 1;
    if (bars.length < need) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { chaikin: null, ad: null },
        skipped: [`chaikin requires ${need} bars, got ${bars.length}`],
      };
    }
    const d = dates(bars);
    const ad = computeAdLine(
      bars.map((b) => b.high),
      bars.map((b) => b.low),
      bars.map((b) => b.close),
      bars.map((b) => b.volume),
    );
    const adPad = bars.length - ad.length;
    const fastEma = EMA.calculate({ period: fast, values: ad });
    const slowEma = EMA.calculate({ period: slow, values: ad });
    const fastPad = ad.length - fastEma.length;
    const slowPad = ad.length - slowEma.length;
    const start = Math.max(fastPad, slowPad);
    const chaikinVals: number[] = [];
    const chaikinDates: string[] = [];
    for (let i = start; i < ad.length; i++) {
      const f = fastEma[i - fastPad];
      const s = slowEma[i - slowPad];
      if (f == null || s == null) continue;
      chaikinVals.push(f - s);
      chaikinDates.push(d[adPad + i]!);
    }
    const adAligned = alignSeries(d.slice(adPad), ad);
    return {
      series: {
        chaikin: alignSeries(chaikinDates, chaikinVals),
        ad: adAligned,
      },
      latest: {
        chaikin: optionalLatest(chaikinVals.at(-1)),
        ad: optionalLatest(ad.at(-1)),
      },
    };
  },
};

/** Ease of Movement (Arms) + optional SMA smooth. */
export const eomPlugin: IndicatorPlugin = {
  id: "eom",
  minBars: (p) =>
    Math.max(2, requireNumber(p.period ?? 14, "eom.period") + 1),
  compute(bars, params) {
    const period = requireNumber(params.period ?? 14, "eom.period");
    const scale = requireNumber(params.scale ?? 10_000, "eom.scale");
    if (bars.length < 2) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { eom: null, eomSmooth: null },
        skipped: [`eom requires 2 bars, got ${bars.length}`],
      };
    }
    const d = dates(bars);
    const raw: Array<number | undefined> = Array(bars.length).fill(undefined);
    for (let i = 1; i < bars.length; i++) {
      const prev = bars[i - 1]!;
      const cur = bars[i]!;
      const range = cur.high - cur.low;
      if (range <= 0 || cur.volume <= 0) {
        raw[i] = 0;
        continue;
      }
      const midMove =
        (cur.high + cur.low) / 2 - (prev.high + prev.low) / 2;
      const boxRatio = cur.volume / scale / range;
      raw[i] = boxRatio === 0 ? 0 : midMove / boxRatio;
    }
    const defined = raw.filter((v): v is number => v != null);
    const smoothRaw =
      defined.length >= period
        ? SMA.calculate({ period, values: defined })
        : [];
    // Align SMA to full bar index (raw starts at bar 1).
    const smooth: Array<number | undefined> = Array(bars.length).fill(
      undefined,
    );
    const rawDefinedIdx: number[] = [];
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] != null) rawDefinedIdx.push(i);
    }
    const smoothPad = rawDefinedIdx.length - smoothRaw.length;
    for (let i = 0; i < smoothRaw.length; i++) {
      const bi = rawDefinedIdx[smoothPad + i];
      if (bi != null) smooth[bi] = smoothRaw[i];
    }
    return {
      series: {
        eom: alignSeries(d, raw),
        eomSmooth: alignSeries(d, smooth),
      },
      latest: {
        eom: optionalLatest(raw.at(-1)),
        eomSmooth: optionalLatest(smooth.at(-1)),
      },
    };
  },
};

/** OBV using (H+L)/2 instead of close. */
export const obvMidPlugin: IndicatorPlugin = {
  id: "obvMid",
  minBars: () => 2,
  compute(bars) {
    if (bars.length < 2) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: { obvMid: null },
        skipped: [`obvMid requires 2 bars, got ${bars.length}`],
      };
    }
    const d = dates(bars);
    const vals: number[] = [];
    let acc = 0;
    for (let i = 0; i < bars.length; i++) {
      if (i === 0) {
        vals.push(0);
        continue;
      }
      const mid = (bars[i]!.high + bars[i]!.low) / 2;
      const prevMid = (bars[i - 1]!.high + bars[i - 1]!.low) / 2;
      if (mid > prevMid) acc += bars[i]!.volume;
      else if (mid < prevMid) acc -= bars[i]!.volume;
      vals.push(acc);
    }
    return {
      series: { obvMid: alignSeries(d, vals) },
      latest: { obvMid: optionalLatest(vals.at(-1)) },
    };
  },
};

/**
 * EquiVolume metrics: box width≈volume, height≈range.
 * shape 1=narrow (easy), 2=square, 3=oversquare (hard / heavy volume).
 */
export const equivolumePlugin: IndicatorPlugin = {
  id: "equivolume",
  minBars: (p) =>
    Math.max(5, requireNumber(p.lookback ?? 20, "equivolume.lookback")),
  compute(bars, params) {
    const lookback = requireNumber(
      params.lookback ?? 20,
      "equivolume.lookback",
    );
    const narrowMax = requireNumber(
      params.narrowMax ?? 0.7,
      "equivolume.narrowMax",
    );
    const oversquareMin = requireNumber(
      params.oversquareMin ?? 1.4,
      "equivolume.oversquareMin",
    );
    if (bars.length < 2) {
      return {
        series: {} as Record<string, SeriesPoint[]>,
        latest: {
          boxRatio: null,
          shape: null,
          widthNorm: null,
        },
        skipped: [`equivolume requires 2 bars, got ${bars.length}`],
      };
    }
    const d = dates(bars);
    const rawAspect: number[] = bars.map((b) => {
      const h = Math.max(b.high - b.low, 1e-9);
      return b.volume / h;
    });
    const boxRatio: Array<number | undefined> = Array(bars.length).fill(
      undefined,
    );
    const shape: Array<number | undefined> = Array(bars.length).fill(
      undefined,
    );
    const widthNorm: Array<number | undefined> = Array(bars.length).fill(
      undefined,
    );

    for (let i = 0; i < bars.length; i++) {
      const from = Math.max(0, i - lookback + 1);
      const window = rawAspect.slice(from, i + 1).slice().sort((a, b) => a - b);
      const mid = window[Math.floor(window.length / 2)] ?? 1;
      const median = mid > 0 ? mid : 1;
      const ratio = rawAspect[i]! / median;
      boxRatio[i] = ratio;
      widthNorm[i] = Math.min(3, ratio);
      if (ratio < narrowMax) shape[i] = EQUIVOLUME_NARROW;
      else if (ratio > oversquareMin) shape[i] = EQUIVOLUME_OVERSQUARE;
      else shape[i] = EQUIVOLUME_SQUARE;
    }

    return {
      series: {
        boxRatio: alignSeries(d, boxRatio),
        shape: alignSeries(d, shape),
        widthNorm: alignSeries(d, widthNorm),
      },
      latest: {
        boxRatio: optionalLatest(boxRatio.at(-1)),
        shape: optionalLatest(shape.at(-1)),
        widthNorm: optionalLatest(widthNorm.at(-1)),
      },
    };
  },
};
